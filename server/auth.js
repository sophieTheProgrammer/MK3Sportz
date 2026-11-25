"use strict";
// Admin sign-in with Google (OAuth 2.0 authorization-code flow with PKCE, state and nonce).
// The server exchanges the code with Google, verifies the ID token (signature, audience,
// issuer, expiry, nonce), and only then checks the email against the admin allowlist.
// One sign-in covers every sport; the sport the user started from (/<sport>/admin-sign-in.html)
// travels in the signed OAuth cookie so they land back on that sport's dashboard.
const crypto = require("crypto");
const { OAuth2Client, CodeChallengeMethod } = require("google-auth-library");

const SESSION_COOKIE = "mk3_admin";
const OAUTH_COOKIE = "mk3_oauth";
const OAUTH_TTL_MS = 10 * 60 * 1000;
const signInPage = (sport) => `/${sport}/admin-sign-in.html`;
const dashboard = (sport) => `/${sport}/#/admin`;

function parseCookies(header) {
  const out = {};
  for (const part of String(header || "").split(";")) {
    const i = part.indexOf("=");
    if (i < 1) continue;
    const name = part.slice(0, i).trim();
    if (name in out) continue;
    const raw = part.slice(i + 1).trim();
    try { out[name] = decodeURIComponent(raw); } catch { out[name] = raw; }
  }
  return out;
}

/** True only for a Google-verified email address on the allowlist. */
function isAuthorizedAdmin(payload, allowlist) {
  if (!payload || typeof payload.email !== "string") return false;
  const verified = payload.email_verified === true || payload.email_verified === "true";
  return verified && allowlist.has(payload.email.trim().toLowerCase());
}

function createAuth({ config, oauthClient, sports, defaultSport }) {
  const pickSport = (s) => (typeof s === "string" && sports.includes(s) ? s : defaultSport);
  const client = oauthClient || (config.googleConfigured
    ? new OAuth2Client({ clientId: config.clientId, clientSecret: config.clientSecret, redirectUri: config.redirectUri })
    : null);

  // --- signed cookie values: "<value>.<HMAC-SHA256(value)>"
  const sign = (value) => crypto.createHmac("sha256", config.sessionSecret).update(value).digest("base64url");
  const sameText = (a, b) => {
    const x = Buffer.from(String(a));
    const y = Buffer.from(String(b));
    return x.length === y.length && crypto.timingSafeEqual(x, y);
  };
  const seal = (value) => `${value}.${sign(value)}`;
  const unseal = (token) => {
    if (typeof token !== "string") return null;
    const i = token.lastIndexOf(".");
    if (i < 1) return null;
    const value = token.slice(0, i);
    return sameText(token.slice(i + 1), sign(value)) ? value : null;
  };
  const cookieOptions = { httpOnly: true, sameSite: "lax", secure: config.secureCookies, path: "/" };
  const oauthCookieOptions = { ...cookieOptions, path: "/auth/google" };

  // --- server-side sessions (in memory: restarting the server signs everyone out)
  const sessions = new Map(); // id -> { userId, email, name, expiresAt }
  setInterval(() => {
    const now = Date.now();
    for (const [id, s] of sessions) if (s.expiresAt <= now) sessions.delete(id);
  }, 60 * 60 * 1000).unref();

  function readSession(req) {
    const id = unseal(parseCookies(req.headers.cookie)[SESSION_COOKIE]);
    const s = id && sessions.get(id);
    if (!s) return null;
    // Expired, or the email was removed from ADMIN_EMAILS since sign-in.
    if (s.expiresAt <= Date.now() || !config.adminEmails.has(s.email)) {
      sessions.delete(id);
      return null;
    }
    return { id, ...s };
  }

  /** Middleware for every admin API route. */
  function requireAdmin(req, res, next) {
    const s = readSession(req);
    if (!s) {
      return res.status(401).json({ error: "admin_required", errors: ["Your admin session has ended. Please sign in again."] });
    }
    req.admin = s;
    next();
  }

  // GET /auth/google?sport=<sport> — send the browser to Google's consent screen.
  async function start(req, res) {
    const sport = pickSport(req.query.sport);
    if (!client) return res.redirect(`${signInPage(sport)}?error=config`);
    // The temporary OAuth cookie has to live on the host Google redirects back to.
    const canonical = new URL(config.redirectUri);
    if (req.get("host") !== canonical.host) return res.redirect(`${canonical.origin}/auth/google?sport=${sport}`);

    const state = crypto.randomBytes(24).toString("base64url");
    const nonce = crypto.randomBytes(24).toString("base64url");
    const { codeVerifier, codeChallenge } = await client.generateCodeVerifierAsync();
    const pending = Buffer.from(JSON.stringify({ state, nonce, codeVerifier, sport, exp: Date.now() + OAUTH_TTL_MS })).toString("base64url");
    res.cookie(OAUTH_COOKIE, seal(pending), { ...oauthCookieOptions, maxAge: OAUTH_TTL_MS });
    res.redirect(client.generateAuthUrl({
      scope: ["openid", "email", "profile"],
      state,
      nonce,
      code_challenge_method: CodeChallengeMethod.S256,
      code_challenge: codeChallenge,
      prompt: "select_account",
    }));
  }

  // GET /auth/google/callback — Google redirects here with ?code&state.
  async function callback(req, res) {
    let pending = null;
    try {
      const raw = unseal(parseCookies(req.headers.cookie)[OAUTH_COOKIE]);
      pending = raw ? JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) : null;
    } catch { pending = null; }
    const sport = pickSport(pending && pending.sport);
    const fail = (code) => {
      res.clearCookie(OAUTH_COOKIE, oauthCookieOptions);
      return res.redirect(`${signInPage(sport)}?error=${code}`);
    };
    if (!client) return fail("config");
    if (req.query.error) return fail(req.query.error === "access_denied" ? "cancelled" : "failed");
    const { code, state } = req.query;
    if (!pending || pending.exp < Date.now() || typeof state !== "string" || typeof code !== "string" || !sameText(state, pending.state)) {
      return fail("state");
    }

    let payload;
    try {
      const { tokens } = await client.getToken({ code, codeVerifier: pending.codeVerifier });
      if (!tokens || !tokens.id_token) throw new Error("Google did not return an ID token");
      // Checks the signature against Google's keys, plus audience, issuer and expiry.
      const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: config.clientId });
      payload = ticket.getPayload();
    } catch (err) {
      // Log only the reason — the library's message can include the token or its claims.
      console.warn(`Google sign-in failed: ${String(err.message).split(/:\s*(?=eyJ|\{)/)[0].slice(0, 160)}`);
      return fail("failed");
    }
    if (!payload || typeof payload.nonce !== "string" || !sameText(payload.nonce, pending.nonce)) {
      console.warn("Google sign-in failed: nonce mismatch");
      return fail("failed");
    }
    if (!isAuthorizedAdmin(payload, config.adminEmails)) {
      console.info(`Admin access denied for ${payload.email || "an account without an email"} (Google verified: ${payload.email_verified === true})`);
      return fail("denied");
    }

    // Allowed: start a brand-new session (a fresh id on every sign-in).
    const email = payload.email.trim().toLowerCase();
    const s = { userId: `g-${payload.sub}`, email, name: payload.name || email.split("@")[0], expiresAt: Date.now() + config.sessionTtlMs };
    const id = crypto.randomBytes(32).toString("base64url");
    sessions.set(id, s);
    console.info(`Admin signed in: ${email} (${sport})`);
    res.clearCookie(OAUTH_COOKIE, oauthCookieOptions);
    res.cookie(SESSION_COOKIE, seal(id), { ...cookieOptions, maxAge: config.sessionTtlMs });
    res.redirect(dashboard(sport));
  }

  // POST /auth/signout — end the session on the server and clear the cookie.
  function signOut(req, res) {
    const id = unseal(parseCookies(req.headers.cookie)[SESSION_COOKIE]);
    if (id) sessions.delete(id);
    res.clearCookie(SESSION_COOKIE, cookieOptions);
    res.set("Cache-Control", "no-store").json({ ok: true });
  }

  // GET /api/session — who is signed in (used by the pages; never grants anything by itself).
  function sessionInfo(req, res) {
    const s = readSession(req);
    res.set("Cache-Control", "no-store").json(s
      ? { admin: true, email: s.email, name: s.name, userId: s.userId, configured: !!client }
      : { admin: false, configured: !!client });
  }

  // GET /<sport>/admin (and /admin for badminton) — server-side entry point for a dashboard.
  const adminEntry = (sport) => (req, res) => res.redirect(readSession(req) ? dashboard(sport) : signInPage(sport));

  return { start, callback, signOut, sessionInfo, adminEntry, requireAdmin, readSession };
}

module.exports = { createAuth, isAuthorizedAdmin, parseCookies, SESSION_COOKIE, signInPage, dashboard };
