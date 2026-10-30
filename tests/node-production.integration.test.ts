import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const TSX = path.join(ROOT, "node_modules/tsx/dist/cli.mjs");

async function freePort(): Promise<number> {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

async function ready(base: string, child: ChildProcess, output: () => string): Promise<void> {
  const deadline = Date.now() + 25_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Production Node host exited: ${output()}`);
    try {
      if ((await fetch(`${base}/api/health`)).ok) return;
    } catch { /* wait for listen */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Production Node host did not start: ${output()}`);
}

test("Node production mode serves the built app behind auth with secure cookies", async (t) => {
  if (!existsSync(path.join(ROOT, "dist/index.html"))) {
    t.skip("run npm run build first to exercise the production static host");
    return;
  }
  const port = await freePort();
  const child = spawn(process.execPath, [TSX, "server.ts"], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(port),
      AUTH_USERNAME: "arena-production-test",
      AUTH_PASSWORD: "test-only-password-2026",
      AUTH_SESSION_SECRET: "test-only-production-secret-0123456789abcdef-0123456789abcdef",
      NODE_ENV: "production",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout?.on("data", (chunk: Buffer) => { output = `${output}${chunk}`.slice(-4000); });
  child.stderr?.on("data", (chunk: Buffer) => { output = `${output}${chunk}`.slice(-4000); });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 5_000);
        child.once("exit", () => { clearTimeout(timer); resolve(); });
        child.kill("SIGTERM");
      });
    }
  });

  const base = `http://127.0.0.1:${port}`;
  await ready(base, child, () => output);
  const unauthenticated = await fetch(`${base}/`, { redirect: "manual" });
  assert.equal(unauthenticated.status, 302);
  assert.equal(unauthenticated.headers.get("location"), "/login");

  const loginPage = await fetch(`${base}/login`);
  assert.equal(loginPage.status, 200);
  assert.match(await loginPage.text(), /Sign in/);
  const login = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "arena-production-test", password: "test-only-password-2026" }),
  });
  assert.equal(login.status, 200);
  assert.match(login.headers.getSetCookie().join("\n"), /Secure/);
  assert.match(login.headers.getSetCookie().join("\n"), /HttpOnly/);
  assert.match(login.headers.getSetCookie().join("\n"), /SameSite=Strict/);
  const cookies = login.headers.getSetCookie().map((value) => value.split(";", 1)[0]);
  const session = cookies.find((cookie) => cookie.startsWith("astrosivam_session="));
  const csrf = cookies.find((cookie) => cookie.startsWith("astrosivam_csrf="));
  assert.ok(session && csrf);
  const cookieHeader = `${session}; ${csrf}`;

  const app = await fetch(`${base}/`, { headers: { Cookie: cookieHeader } });
  assert.equal(app.status, 200);
  assert.equal(app.headers.get("cache-control"), "private, no-store");
  const html = await app.text();
  const script = html.match(/src="([^"]+\.js)"/);
  assert.ok(script, "production HTML references a built JavaScript asset");
  const bundle = await fetch(new URL(script[1], base), { headers: { Cookie: cookieHeader } });
  assert.equal(bundle.status, 200);
  const javascript = await bundle.text();
  assert.doesNotMatch(javascript, /test-only-production-secret|test-only-password-2026/);
  const health = await fetch(`${base}/api/health`);
  assert.deepEqual(await health.json(), { status: "ok", app: "astrosivam-creative-studio", version: "2.1.0", metaPublishing: false });
});
