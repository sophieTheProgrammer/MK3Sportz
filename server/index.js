"use strict";
// Start the MK3 Sportz site:  npm start   (settings come from .env — see .env.example)
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });
const { createApp, loadConfig } = require("./app");
const { SPORT_IDS } = require("./sports");

const config = loadConfig();
if (!config.googleConfigured) {
  console.warn("Google sign-in is not set up yet: add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env, then restart.");
}
if (!config.adminEmails.size) {
  console.warn("ADMIN_EMAILS is empty, so nobody can open the Admin Dashboard.");
}

createApp({ config }).listen(config.port, config.host, () => {
  const base = `http://localhost:${config.port}`;
  console.log(`MK3 Sportz is running at ${base}/`);
  for (const id of SPORT_IDS) {
    console.log(`  ${id.padEnd(11)} ${base}/${id}/   ·   admin sign-in: ${base}/${id}/admin-sign-in.html`);
  }
  console.log(`Google redirect URI:     ${config.redirectUri}`);
  console.log(`Admin accounts allowed:  ${config.adminEmails.size}`);
});
