"use strict";
// MK3 Sportz web server: serves the public site, each sport's club hub (/badminton/,
// /pickleball/), the per-sport club data API and Google admin sign-in.
const crypto = require("crypto");
const path = require("path");
const express = require("express");
const { createStore } = require("./store");
const { createAuth } = require("./auth");
const { memberRoutes, adminRoutes } = require("./api");
const { SPORTS, SPORT_IDS, DEFAULT_SPORT } = require("./sports");

const ROOT = path.join(__dirname, "..");
const CLUB = path.join(ROOT, "club");
const PLACEHOLDER = /^(your-|replace|change-?me|xxx)/i;

/** Read settings from environment variables (see .env.example). */
function loadConfig(env = process.env) {
  const port = Number(env.PORT) || 8000;
  const clientId = String(env.GOOGLE_CLIENT_ID || "").trim();
  const clientSecret = String(env.GOOGLE_CLIENT_SECRET || "").trim();
  const redirectUri = String(env.GOOGLE_REDIRECT_URI || `http://localhost:${port}/auth/google/callback`).trim();
  let sessionSecret = String(env.SESSION_SECRET || "").trim();
  if (sessionSecret.length < 32 || PLACEHOLDER.test(sessionSecret)) {
    console.warn("SESSION_SECRET is missing or too short (min 32 characters); using a temporary secret for this run.");
    sessionSecret = crypto.randomBytes(32).toString("hex");
  }
  return {
    port,
    host: env.HOST || "127.0.0.1",
    clientId,
    clientSecret,
    redirectUri,
    googleConfigured: !!clientId && !!clientSecret && !PLACEHOLDER.test(clientId) && !PLACEHOLDER.test(clientSecret),
    sessionSecret,
    adminEmails: new Set(String(env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)),
    sessionTtlMs: (Number(env.SESSION_TTL_HOURS) || 8) * 60 * 60 * 1000,
    secureCookies: redirectUri.startsWith("https://"),
    trustProxy: env.TRUST_PROXY === "1",
    dataDir: env.DATA_DIR ? path.resolve(ROOT, env.DATA_DIR) : path.join(ROOT, "server", "data"),
  };
}

function createApp({ config = loadConfig(), stores = {}, oauthClient } = {}) {
  const app = express();
  app.disable("x-powered-by");
  if (config.trustProxy) app.set("trust proxy", 1);

  // One data file per sport. (Badminton data saved before Pickleball existed is in club-data.json.)
  for (const [id, sport] of Object.entries(SPORTS)) {
    stores[id] = stores[id] || createStore(path.join(config.dataDir, `${id}.json`), {
      seed: sport.seed, version: sport.version, upgrade: sport.upgrade,
      legacyFile: id === "badminton" ? path.join(config.dataDir, "club-data.json") : null,
    });
  }
  const auth = createAuth({ config, oauthClient, sports: SPORT_IDS, defaultSport: DEFAULT_SPORT });
  const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

  app.use((req, res, next) => {
    res.set({ "X-Content-Type-Options": "nosniff", "Referrer-Policy": "same-origin", "X-Frame-Options": "SAMEORIGIN" });
    next();
  });

  // Anything that changes data must come from this site (blocks cross-site form posts / CSRF).
  app.use(["/api", "/auth/signout"], (req, res, next) => {
    if (req.method === "GET" || req.method === "HEAD") return next();
    const origin = req.get("origin");
    if (origin && origin !== `${req.protocol}://${req.get("host")}`) {
      return res.status(403).json({ errors: ["Cross-site request blocked."] });
    }
    if (req.method !== "DELETE" && !req.is("application/json")) {
      return res.status(415).json({ errors: ["Requests must be sent as JSON."] });
    }
    next();
  });
  app.use(["/api", "/auth"], express.json({ limit: "64kb" }));
  app.use("/api", (req, res, next) => { res.set("Cache-Control", "no-store"); next(); });

  // ----- Google admin sign-in (one sign-in for every sport)
  app.get("/auth/google", wrap(auth.start));
  app.get("/auth/google/callback", wrap(auth.callback));
  app.post("/auth/signout", auth.signOut);
  app.get("/api/session", auth.sessionInfo);
  app.get("/admin", auth.adminEntry(DEFAULT_SPORT));

  // ----- data API per sport: every /api/<sport>/admin route requires a valid admin session
  for (const [id, sport] of Object.entries(SPORTS)) {
    app.use(`/api/${id}/admin`, auth.requireAdmin, adminRoutes(stores[id], sport.config));
    app.use(`/api/${id}`, memberRoutes(stores[id], sport.config));
  }
  app.use("/api", (req, res) => res.status(404).json({ errors: ["Not found."] }));

  // ----- club hub pages: one shared page for every sport, served at /<sport>/
  const sendClubPage = (file) => (req, res) => res.sendFile(path.join(CLUB, file));
  for (const id of SPORT_IDS) {
    app.get(`/${id}`, (req, res, next) => (req.path.endsWith("/") ? sendClubPage("index.html")(req, res, next) : res.redirect(301, `/${id}/`)));
    app.get(`/${id}/index.html`, sendClubPage("index.html"));
    app.get(`/${id}/admin-sign-in.html`, sendClubPage("admin-sign-in.html"));
    app.get(`/${id}/admin`, auth.adminEntry(id));
  }

  // ----- static site: only the public folders/files (never .env, server/ or the data files)
  const staticOptions = { dotfiles: "ignore", index: ["index.html"] };
  // Club scripts and styles; the club's HTML pages are only served through /<sport>/ above.
  app.use("/club", (req, res, next) => (/\.html?$|\/$/.test(req.path) ? res.status(404).end() : next()),
    express.static(CLUB, { dotfiles: "ignore", index: false }));
  for (const dir of ["components", "images", "sports"]) {
    app.use(`/${dir}`, express.static(path.join(ROOT, dir), staticOptions));
  }
  for (const file of ["index.html", "styles.css", "script.js"]) {
    app.get(`/${file}`, (req, res) => res.sendFile(path.join(ROOT, file)));
  }
  app.get("/", (req, res) => res.sendFile(path.join(ROOT, "index.html")));

  app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    if (err.type === "entity.parse.failed") return res.status(400).json({ errors: ["Invalid JSON."] });
    console.error(err);
    res.status(500).json({ errors: ["Something went wrong on the server."] });
  });
  return app;
}

module.exports = { createApp, loadConfig };
