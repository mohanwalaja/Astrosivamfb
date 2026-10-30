import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import { createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === "production";
const COOKIE_NAME = "astrosivam_session";
const SESSION_DURATION_SECONDS = 8 * 60 * 60;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 8;
const activeSessions = new Map<string, { expiresAt: number; csrf: string }>();

const username = process.env.AUTH_USERNAME ?? "";
const password = process.env.AUTH_PASSWORD ?? "";
const sessionSecret = process.env.AUTH_SESSION_SECRET ?? "";
const authRequired = Boolean(username && password && sessionSecret && sessionSecret.length >= 32);

if (!authRequired) {
  console.log(
    "Notice: AUTH_USERNAME, AUTH_PASSWORD, or AUTH_SESSION_SECRET not configured. App running in open mode (auth bypassed).",
  );
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

function signature(payload: string): string {
  const secret = sessionSecret || "astrosivam-default-development-session-secret-key-32";
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function cookieValue(req: Request, name: string): string | null {
  const cookie = (req.headers.cookie ?? "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!cookie) return null;
  try { return decodeURIComponent(cookie.slice(name.length + 1)); } catch { return null; }
}

function sessionNonce(req: Request): string | null {
  const token = cookieValue(req, COOKIE_NAME);
  if (!token) return null;
  const [expiresAt, nonce, suppliedSignature, extra] = token.split(".");
  const expiry = Number(expiresAt);
  if (!expiresAt || !nonce || !suppliedSignature || extra !== undefined || !Number.isSafeInteger(expiry) || expiry <= Math.floor(Date.now() / 1000)) return null;
  const session = activeSessions.get(nonce);
  if (!session || session.expiresAt !== expiry) return null;
  if (!constantTimeEqual(suppliedSignature, signature(`${expiresAt}.${nonce}`))) return null;
  return nonce;
}

function isAuthenticated(req: Request): boolean {
  if (!authRequired) return true;
  return sessionNonce(req) !== null;
}

function csrfMatches(req: Request): boolean {
  if (!authRequired) return true;
  const nonce = sessionNonce(req);
  const session = nonce ? activeSessions.get(nonce) : undefined;
  const supplied = req.get("X-CSRF-Token") ?? "";
  const cookie = cookieValue(req, "astrosivam_csrf") ?? "";
  return Boolean(session && supplied && cookie && constantTimeEqual(supplied, session.csrf) && constantTimeEqual(cookie, session.csrf));
}

function setSessionCookie(res: Response): void {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS;
  const nonce = randomBytes(24).toString("base64url");
  const csrf = randomBytes(32).toString("base64url");
  activeSessions.set(nonce, { expiresAt, csrf });
  for (const [key, value] of activeSessions) if (value.expiresAt <= Math.floor(Date.now() / 1000)) activeSessions.delete(key);
  const expiryText = String(expiresAt);
  res.cookie(COOKIE_NAME, `${expiryText}.${nonce}.${signature(`${expiryText}.${nonce}`)}`, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS * 1000,
  });
  res.cookie("astrosivam_csrf", csrf, {
    httpOnly: false,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS * 1000,
  });
}

/** The sign-in screen shows the real mark, inlined so it is available before auth. */
let loginLogo = "";
try {
  const logoPath = path.join(__dirname, isProd ? "dist" : "public", "astrosivam_logo.png");
  loginLogo = `data:image/png;base64,${readFileSync(logoPath).toString("base64")}`;
} catch {
  loginLogo = "";
}

const loginPage = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="theme-color" content="#161011">
  <title>Sign in · Astro Sivam Creative Studio</title>
  <style>
    * { box-sizing: border-box; }
    :root { color-scheme: dark; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      color: #f7f1e4;
      background-color: #161011;
      background-image:
        radial-gradient(900px 540px at 10% -10%, rgba(77,16,35,.72), transparent 64%),
        radial-gradient(700px 460px at 100% 0%, rgba(199,154,60,.09), transparent 60%);
      font: 15px/1.55 "Plus Jakarta Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    main {
      width: min(100%, 430px);
      padding: 34px;
      border: 1px solid rgba(231,206,164,.22);
      border-radius: 22px;
      background: #1d1618;
      box-shadow: inset 0 1px 0 rgba(250,242,226,.06), 0 40px 110px -40px #000;
    }
    .seal {
      display: grid;
      place-items: center;
      width: 62px;
      height: 62px;
      margin-bottom: 24px;
      border: 1px solid rgba(199,154,60,.62);
      border-radius: 15px;
      background: radial-gradient(120% 120% at 28% 18%, #fffdf7 0%, #f7f1e4 58%, #e9dcc4 100%);
      box-shadow: inset 0 0 0 1px rgba(255,252,245,.75), 0 0 0 1px rgba(77,16,35,.45), 0 8px 18px -14px #000;
    }
    .seal img { width: 40px; height: 40px; object-fit: contain; mix-blend-mode: multiply; }
    .seal .fallback { color: #a87c2c; font-size: 26px; line-height: 1; }
    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: #e3ca99;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: .22em;
      text-transform: uppercase;
    }
    .eyebrow::before { content: ""; width: 5px; height: 5px; transform: rotate(45deg); background: #c79a3c; }
    h1 {
      margin: 9px 0 6px;
      font-family: "Cinzel", Georgia, serif;
      font-size: 29px;
      font-weight: 600;
      letter-spacing: -.01em;
      line-height: 1.15;
    }
    .lede { margin: 0 0 26px; color: #b4a58f; font-size: 13px; line-height: 1.6; }
    label { display: block; margin: 16px 0 7px; color: #b4a58f; font-size: 10.5px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; }
    input {
      width: 100%;
      min-height: 46px;
      padding: 0 13px;
      border: 1px solid rgba(231,206,164,.16);
      border-radius: 10px;
      outline: none;
      background: #140f10;
      color: #f7f1e4;
      font: inherit;
      font-size: 14px;
      transition: border-color .15s ease, box-shadow .15s ease;
    }
    input::placeholder { color: #948772; }
    input:focus { border-color: rgba(216,177,100,.72); box-shadow: 0 0 0 3px rgba(199,154,60,.16); }
    button {
      width: 100%;
      min-height: 48px;
      margin-top: 24px;
      border: 1px solid rgba(255,241,208,.36);
      border-radius: 10px;
      background: linear-gradient(180deg,#e8ce96,#d2aa5a 44%,#bd9138);
      color: #241706;
      font: 700 13px "Plus Jakarta Sans", system-ui, sans-serif;
      letter-spacing: .02em;
      cursor: pointer;
      box-shadow: inset 0 1px 0 rgba(255,248,231,.6), 0 12px 26px -16px rgba(199,154,60,.8);
    }
    button:hover { filter: brightness(1.05); }
    button:focus-visible { outline: 2px solid #f0dcb2; outline-offset: 3px; }
    button:disabled { opacity: .6; cursor: wait; }
    #error { min-height: 20px; margin: 13px 0 0; color: #f2b7a9; font-size: 12px; line-height: 1.5; }
    .foot {
      display: flex;
      align-items: center;
      gap: 7px;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid rgba(231,206,164,.1);
      color: #948772;
      font-size: 10px;
      line-height: 1.5;
    }
    .foot svg { flex: none; color: #c79a3c; }
    .foot a { color: #e3ca99; text-decoration: none; border-bottom: 1px solid rgba(199,154,60,.35); }
    @media (max-width: 480px) { main { padding: 27px 23px; } h1 { font-size: 26px; } }
    @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
  </style>
</head>
<body>
  <main>
    <div class="seal" aria-hidden="true">
      ${loginLogo ? `<img src="${loginLogo}" alt="">` : `<span class="fallback">✦</span>`}
    </div>
    <div class="eyebrow">Astro Sivam · Creative studio</div>
    <h1>Welcome back</h1>
    <p class="lede">Sign in to the private studio — brand kit, poster and asset tools, panchangam, festival cards and the publishing desk.</p>
    <form id="login-form">
      <label for="username">Username</label>
      <input id="username" name="username" autocomplete="username" required autofocus>
      <label for="password">Password</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required>
      <button id="submit" type="submit">Sign in</button>
      <div id="error" role="alert" aria-live="polite"></div>
    </form>
    <div class="foot">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
      <span>Private studio · Vedic astrology content for <a href="https://astrosivam.com" target="_blank" rel="noopener noreferrer">astrosivam.com</a></span>
    </div>
  </main>
  <script>
    const form = document.getElementById('login-form');
    const button = document.getElementById('submit');
    const error = document.getElementById('error');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      error.textContent = '';
      button.disabled = true;
      button.textContent = 'Signing in…';
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: form.username.value, password: form.password.value })
        });
        if (!response.ok) {
          error.textContent = response.status === 429 ? 'Too many attempts. Please wait 15 minutes and try again.' : 'Username or password is incorrect.';
          return;
        }
        window.location.replace('/');
      } catch (_) {
        error.textContent = 'Unable to sign in. Please try again.';
      } finally {
        button.disabled = false;
        button.textContent = 'Sign in';
      }
    });
  </script>
</body>
</html>`;

async function startServer() {
  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "same-origin");
    res.setHeader("Cache-Control", "private, no-store");
    next();
  });
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", app: "astrosivam-creative-studio", version: "2.1.0", metaPublishing: false });
  });

  const loginAttempts = new Map<string, { count: number; resetAt: number }>();
  app.get("/login", (req, res) => {
    if (!authRequired || isAuthenticated(req)) return res.redirect("/");
    res.type("html").send(loginPage);
  });

  app.post("/api/auth/login", (req, res) => {
    if (!authRequired) {
      setSessionCookie(res);
      return res.status(200).json({ authenticated: true });
    }

    const ip = req.ip || "unknown";
    const now = Date.now();
    for (const [address, record] of loginAttempts) {
      if (record.resetAt <= now) loginAttempts.delete(address);
    }
    if (loginAttempts.size >= 5_000 && !loginAttempts.has(ip)) {
      const oldestAddress = loginAttempts.keys().next().value;
      if (oldestAddress) loginAttempts.delete(oldestAddress);
    }
    const attempts = loginAttempts.get(ip);
    if (attempts && attempts.resetAt > now && attempts.count >= MAX_LOGIN_ATTEMPTS) {
      return res.status(429).json({ error: "Too many login attempts" });
    }

    const submittedUsername = typeof req.body?.username === "string" ? req.body.username : "";
    const submittedPassword = typeof req.body?.password === "string" ? req.body.password : "";
    const userMatches = constantTimeEqual(submittedUsername, username);
    const passwordMatches = constantTimeEqual(submittedPassword, password);
    if (!userMatches || !passwordMatches) {
      const count = attempts && attempts.resetAt > now ? attempts.count + 1 : 1;
      loginAttempts.set(ip, { count, resetAt: now + LOGIN_WINDOW_MS });
      return res.status(401).json({ error: "Invalid username or password" });
    }

    loginAttempts.delete(ip);
    setSessionCookie(res);
    return res.status(200).json({ authenticated: true });
  });

  app.post("/api/auth/logout", (req, res) => {
    if (!authRequired) {
      res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: isProd, sameSite: "lax", path: "/" });
      res.clearCookie("astrosivam_csrf", { httpOnly: false, secure: isProd, sameSite: "lax", path: "/" });
      return res.status(200).json({ authenticated: false });
    }

    const nonce = sessionNonce(req);
    if (!nonce) return res.status(401).json({ error: "Authentication required" });
    if (!csrfMatches(req)) return res.status(403).json({ error: "Security token expired. Refresh the page and try again." });
    activeSessions.delete(nonce);
    res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: isProd, sameSite: "lax", path: "/" });
    res.clearCookie("astrosivam_csrf", { httpOnly: false, secure: isProd, sameSite: "lax", path: "/" });
    return res.status(200).json({ authenticated: false });
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!authRequired || isAuthenticated(req)) return next();
    if (req.path.startsWith("/api/")) {
      return res.status(401).json({ error: "Authentication required" });
    }
    return res.redirect(302, "/login");
  });

  if (isProd) {
    const dist = path.join(__dirname, "dist");
    app.use(
      express.static(dist, {
        index: false,
        setHeaders: (res) => res.setHeader("Cache-Control", "private, no-store"),
      }),
    );
    app.get("*", (_req, res) => {
      res.sendFile(path.join(dist, "index.html"), {
        headers: { "Cache-Control": "private, no-store" },
      });
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: "0.0.0.0" },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Astro Sivam Creative Studio running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
