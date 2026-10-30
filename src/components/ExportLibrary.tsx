import React, { useEffect, useState } from "react";
import { Download, HardDrive, ImageIcon, Loader2, Trash2 } from "lucide-react";
import { clearExports, deleteExport, libraryNote, listExports, type LibraryItem } from "../lib/exportLibrary";
import { saveBlob } from "../lib/export";
import { Button, EmptyState, IconButton, Panel, SectionLabel, Skeleton, useToast } from "./ui";

/**
 * The last 50 image and reel exports, straight out of IndexedDB. Thumbnails are
 * small JPEGs so the grid stays fast; the full file is kept only when it fits
 * under the storage budget, and the card says so when it did not.
 */

const FORMAT_LABEL: Record<string, string> = {
  "ig-post": "IG post",
  "ig-square": "Square",
  "fb-post": "FB post",
  story: "Story",
  print: "A4 print",
  reel: "Video reel",
};

const when = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const bytes = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return "—";
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

interface Props {
  /** Bump to force a reload after a new export. */
  refreshKey: number;
}

export const ExportLibrary: React.FC<Props> = ({ refreshKey }) => {
  const toast = useToast();
  const [items, setItems] = useState<LibraryItem[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listExports().then((next) => {
      if (!cancelled) setItems(next);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const save = (item: LibraryItem) => {
    if (!item.blob) {
      toast("Only the thumbnail was kept for this export — the file was too large to store in full.", "error");
      return;
    }
    saveBlob(item.blob, item.name);
    toast(`Downloaded ${item.name}`);
  };

  const remove = async (item: LibraryItem) => {
    setBusy(item.id);
    await deleteExport(item.id);
    setItems(await listExports());
    setBusy(null);
  };

  const wipe = async () => {
    await clearExports();
    setItems([]);
    toast("Export history cleared.");
  };

  return (
    <Panel>
      <SectionLabel
        eyebrow="On this device"
        description="Only this browser can see these files. Nothing is uploaded."
        right={
          items?.length ? (
            <Button variant="quiet" size="sm" icon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />} onClick={wipe}>
              Clear history
            </Button>
          ) : (
            <HardDrive className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
          )
        }
      >
        Recent exports {items?.length ? <span className="text-[#A2937D]">· {items.length}</span> : null}
      </SectionLabel>

      {items === null ? (
        <div>
          <div className="mb-3 flex items-center gap-2 text-[11.5px] text-[#B4A58F]" role="status">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-gold" aria-hidden="true" />
            Reading this browser&rsquo;s storage…
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[0, 1, 2].map((key) => (
              <div key={key} className="overflow-hidden rounded-xl border border-line-soft">
                <Skeleton className="aspect-[4/5] w-full rounded-none" />
                <div className="space-y-1.5 p-2">
                  <Skeleton className="h-2.5 w-2/3" />
                  <Skeleton className="h-2 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ImageIcon className="h-5 w-5" aria-hidden="true" />}
          title="No exports on this device yet"
          description="Downloaded PNGs and recorded Poster Studio reels appear here when the browser allows local storage, so a recent file can be found again without rendering it twice."
        />
      ) : (
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="group overflow-hidden rounded-xl border border-line bg-[#171113] transition-colors hover:border-line-strong focus-within:border-line-strong"
            >
              <div className="relative overflow-hidden">
                {item.thumb ? (
                  <img
                    src={item.thumb}
                    alt={`${FORMAT_LABEL[item.formatId] ?? "Export"} preview`}
                    className="aspect-[4/5] w-full object-cover transition-transform duration-500 group-hover:scale-[1.025]"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex aspect-[4/5] w-full items-center justify-center bg-wash">
                    <ImageIcon className="h-6 w-6 text-[#948772]" aria-hidden="true" />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-[#100B0C]/95 via-[#100B0C]/45 to-transparent px-1.5 pb-1.5 pt-6 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                  <IconButton
                    size="sm"
                    icon={<Download className="h-3.5 w-3.5" aria-hidden="true" />}
                    label={item.blob ? `Download ${item.name} again` : `Only a thumbnail is stored for ${item.name}`}
                    onClick={() => save(item)}
                  />
                  <IconButton
                    size="sm"
                    variant="quiet"
                    className="text-[#C7B9A3] hover:text-[#F2B7A9]"
                    icon={
                      busy === item.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      )
                    }
                    label={`Delete ${item.name} from this device`}
                    disabled={busy === item.id}
                    onClick={() => void remove(item)}
                  />
                </div>
                {!item.blob ? (
                  <span className="absolute left-1.5 top-1.5 rounded-full border border-[rgba(216,130,111,0.4)] bg-[#100B0C]/85 px-1.5 py-0.5 text-[8.5px] font-semibold uppercase tracking-[0.12em] text-[#F2B7A9]">
                    Thumbnail
                  </span>
                ) : null}
              </div>
              <div className="px-2 py-2">
                <div className="truncate text-[10.5px] font-semibold text-[#DCCFBA]" title={item.name}>
                  {FORMAT_LABEL[item.formatId] ?? `${item.width}×${item.height}`}
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-1 text-[9px] uppercase tracking-[0.08em] text-[#A2937D]">
                  <span className="truncate">{when(item.createdAt)}</span>
                  <span className="shrink-0 font-mono normal-case tracking-normal">{bytes(item.bytes)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3.5 border-t border-line-soft pt-3 text-[10px] leading-relaxed text-[#A2937D]">{libraryNote}</p>
    </Panel>
  );
};
