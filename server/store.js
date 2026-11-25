"use strict";
// Each sport's club data lives in its own JSON file (server/data/<sport>.json), so events,
// registrations, spotlights, announcements and messages never mix between sports.
// Writes are atomic (temp file + rename) so a crash can't leave a half-written file.
const fs = require("fs");
const path = require("path");

function createStore(file, { seed, version, upgrade = (d) => d, legacyFile } = {}) {
  let data;

  function persist() {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { mode: 0o600 });
    fs.renameSync(tmp, file);
  }

  // Keep data saved under an older file name (e.g. server/data/club-data.json for badminton).
  if (legacyFile && !fs.existsSync(file) && fs.existsSync(legacyFile)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.renameSync(legacyFile, file);
    console.info(`Moved ${path.basename(legacyFile)} to ${path.basename(file)}`);
  }

  try {
    const stored = JSON.parse(fs.readFileSync(file, "utf8"));
    data = upgrade(stored);
    if (!data || data.version !== version) throw new Error(`unsupported data version ${data && data.version}`);
    if (stored.version !== data.version) {
      persist();
      console.info(`Updated ${path.basename(file)} from data version ${stored.version} to ${data.version}`);
    }
  } catch (err) {
    if (err.code !== "ENOENT") console.warn(`Could not use ${file} (${err.message}); starting from sample data.`);
    data = seed();
    persist();
  }

  return {
    get data() { return data; },
    /** Apply a change and save it. Validate before calling so a failed request changes nothing. */
    update(fn) {
      const result = fn(data);
      persist();
      return result;
    },
    reset() {
      data = seed();
      persist();
    },
  };
}

module.exports = { createStore };
