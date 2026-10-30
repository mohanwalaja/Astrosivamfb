import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
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

async function waitForHealth(base: string, child: ChildProcess, logs: () => string): Promise<Response> {
  const deadline = Date.now() + 25_000;
  let lastError = "server has not responded";
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Node server exited before startup: ${logs()}`);
    try {
      const response = await fetch(`${base}/api/health`);
      if (response.ok) return response;
      lastError = `health returned HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Node server did not become ready: ${lastError}; ${logs()}`);
}

test("Node host enforces login, throttles failures, and revokes logout sessions", async (t) => {
  const port = await freePort();
  const username = "arena-node-auth-test";
  const password = "not-a-production-password-2026";
  const child = spawn(process.execPath, [TSX, "server.ts"], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(port),
      AUTH_USERNAME: username,
      AUTH_PASSWORD: password,
      AUTH_SESSION_SECRET: "test-only-session-secret-0123456789abcdef-0123456789abcdef",
      NODE_ENV: "development",
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
        child.once("exit", () => {
          clearTimeout(timer);
          resolve();
        });
        child.kill("SIGTERM");
      });
    }
  });

  const base = `http://127.0.0.1:${port}`;
  const health = await waitForHealth(base, child, () => output);
  const healthBody = await health.json() as { status: string; metaPublishing: boolean };
  assert.deepEqual(healthBody, { status: "ok", app: "astrosivam-creative-studio", version: "2.1.0", metaPublishing: false });
  assert.equal(health.headers.get("x-content-type-options"), "nosniff");
  assert.equal(health.headers.get("cache-control"), "private, no-store");

  const unauthenticatedPage = await fetch(`${base}/`, { redirect: "manual" });
  assert.equal(unauthenticatedPage.status, 302, "unauthenticated app routes redirect to login");
  assert.equal(unauthenticatedPage.headers.get("location"), "/login");
  assert.equal((await fetch(`${base}/api/meta/status`)).status, 401, "protected API routes reject unauthenticated callers");
  assert.equal((await fetch(`${base}/login`)).status, 200);

  const login = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  assert.equal(login.status, 200, "valid credentials create a session");
  assert.deepEqual(await login.json(), { authenticated: true });
  const cookies = login.headers.getSetCookie().map((value) => value.split(";", 1)[0]);
  const session = cookies.find((cookie) => cookie.startsWith("astrosivam_session="));
  const csrf = cookies.find((cookie) => cookie.startsWith("astrosivam_csrf="));
  assert.ok(session, "login issues a signed HttpOnly session cookie");
  assert.ok(csrf, "login issues a CSRF cookie");
  assert.match(login.headers.getSetCookie().join("\n"), /HttpOnly/);
  assert.match(login.headers.getSetCookie().join("\n"), /SameSite=Strict/);
  const cookieHeader = `${session}; ${csrf}`;
  const csrfValue = decodeURIComponent(csrf.slice("astrosivam_csrf=".length));

  assert.equal((await fetch(`${base}/`, { headers: { Cookie: cookieHeader } })).status, 200, "authenticated app routes are served");
  const noCsrf = await fetch(`${base}/api/auth/logout`, { method: "POST", headers: { Cookie: cookieHeader } });
  assert.equal(noCsrf.status, 403, "logout requires a matching CSRF value");

  const logout = await fetch(`${base}/api/auth/logout`, {
    method: "POST",
    headers: { Cookie: cookieHeader, "X-CSRF-Token": csrfValue },
  });
  assert.equal(logout.status, 200);
  assert.deepEqual(await logout.json(), { authenticated: false });
  const replay = await fetch(`${base}/api/auth/logout`, { method: "POST", headers: { Cookie: cookieHeader } });
  assert.equal(replay.status, 401, "logout revokes the server-side session, not only the browser cookie");

  for (let attempt = 1; attempt <= 8; attempt += 1) {
    const rejected = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password: "wrong-password" }),
    });
    assert.equal(rejected.status, 401, `bad credentials attempt ${attempt}`);
  }
  const limited = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password: "wrong-password" }),
  });
  assert.equal(limited.status, 429, "the ninth bad attempt is throttled");
});
