/**
 * A browser copy of the last exports.
 *
 * localStorage is the wrong shape for this — thumbnails and export blobs blow
 * through the ~5 MB string quota after a handful of posters — so the library
 * lives in IndexedDB, capped at 50 entries and ~40 MB, oldest evicted first.
 *
 * Everything here fails soft: a private-mode browser with IndexedDB disabled
 * should still be able to export a poster.
 */

export interface LibraryItem {
  id: string;
  createdAt: string;
  name: string;
  formatId: string;
  width: number;
  height: number;
  /** The caption that was live when the export was made. */
  caption: string;
  /** Small JPEG data URL — the card in the library grid. */
  thumb: string;
  /** The full-resolution PNG or reel video, kept only when it fits the storage budget. */
  blob?: Blob;
  bytes: number;
}

export const LIBRARY_LIMIT = 50;
export const LIBRARY_BUDGET = 40 * 1024 * 1024;
const DB_NAME = "astrosivam-studio";
const DB_VERSION = 1;
const STORE = "exports";
const KEEP_BLOB_UNDER = 20 * 1024 * 1024;

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    let settled = false;
    let request: IDBOpenDBRequest;
    const finish = (db: IDBDatabase | null) => {
      if (settled) {
        db?.close();
        return;
      }
      settled = true;
      window.clearTimeout(timeout);
      resolve(db);
    };
    const timeout = window.setTimeout(() => finish(null), 4000);
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      finish(null);
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
      }
    };
    request.onsuccess = () => finish(request.result);
    request.onerror = () => finish(null);
    request.onblocked = () => finish(null);
  });
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  return openDb().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) return resolve(null);
        let settled = false;
        const finish = (value: T | null) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timeout);
          resolve(value);
        };
        const timeout = window.setTimeout(() => finish(null), 4000);
        try {
          const transaction = db.transaction(STORE, mode);
          transaction.onabort = () => finish(null);
          transaction.onerror = () => finish(null);
          const request = run(transaction.objectStore(STORE));
          request.onsuccess = () => finish(request.result);
          request.onerror = () => finish(null);
        } catch {
          finish(null);
        }
      }),
  );
}

export const listExports = async (): Promise<LibraryItem[]> => {
  const items = (await tx<LibraryItem[]>("readonly", (store) => store.getAll() as IDBRequest<LibraryItem[]>)) ?? [];
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const deleteExport = async (id: string): Promise<void> => {
  await tx("readwrite", (store) => store.delete(id) as unknown as IDBRequest<undefined>);
};

export const clearExports = async (): Promise<void> => {
  await tx("readwrite", (store) => store.clear() as unknown as IDBRequest<undefined>);
};

/** Downscale to a card-sized JPEG — a 2480 px A4 thumbnail in a 300 px cell is waste. */
export async function makeThumb(canvas: HTMLCanvasElement, width = 360): Promise<string> {
  const ratio = canvas.height / canvas.width;
  const w = Math.min(width, canvas.width);
  const h = Math.round(w * ratio);
  const small = document.createElement("canvas");
  small.width = w;
  small.height = h;
  const ctx = small.getContext("2d");
  if (!ctx) return "";
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(canvas, 0, 0, w, h);
  try {
    return small.toDataURL("image/jpeg", 0.72);
  } catch {
    return "";
  }
}

export const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob | null> =>
  new Promise((resolve) => {
    try {
      if (typeof canvas.toBlob === "function") {
        canvas.toBlob((blob) => resolve(blob), "image/png");
        return;
      }
      resolve(null);
    } catch {
      resolve(null);
    }
  });

/** Trim to the 50 newest / 40 MB budget, oldest first. */
async function evict(): Promise<void> {
  const items = await listExports();
  let total = items.reduce((sum, item) => sum + (item.blob?.size ?? 0), 0);
  const doomed: LibraryItem[] = [];
  const keep: LibraryItem[] = [];
  // items are newest-first, so everything past the limit goes
  items.forEach((item, index) => {
    if (index >= LIBRARY_LIMIT) {
      doomed.push(item);
      return;
    }
    keep.push(item);
  });
  for (let i = keep.length - 1; i >= 0 && total > LIBRARY_BUDGET; i -= 1) {
    total -= keep[i].blob?.size ?? 0;
    doomed.push(keep[i]);
  }
  await Promise.all(doomed.map((item) => deleteExport(item.id)));
}

export interface RecordExportInput {
  canvas: HTMLCanvasElement;
  name: string;
  formatId: string;
  width: number;
  height: number;
  caption: string;
  /** Reuse the already-encoded download Blob, or supply a video Blob for reels. */
  blob?: Blob;
}

/** Save one export. Returns the stored item, or null if IndexedDB is unavailable. */
export async function recordExport(input: RecordExportInput): Promise<LibraryItem | null> {
  const thumb = await makeThumb(input.canvas);
  const blob = input.blob ?? await canvasToBlob(input.canvas);
  const keepBlob = blob && blob.size <= KEEP_BLOB_UNDER ? blob : undefined;
  const item: LibraryItem = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    name: input.name,
    formatId: input.formatId,
    width: input.width,
    height: input.height,
    caption: input.caption,
    thumb,
    blob: keepBlob,
    bytes: keepBlob?.size ?? 0,
  };
  const stored = await tx<IDBValidKey>("readwrite", (store) => store.add(item));
  if (stored === null) return null;
  await evict();
  return item;
}

export const libraryNote =
  "Saved in this browser only — last 50 exports / 40 MB. Files over 20 MB keep a thumbnail only; clearing site data clears the library.";
