"use strict";
// The sports that have a club hub. Each one gets its own data file, its own API under
// /api/<sport>/ and its own pages under /<sport>/. Content lives in club/sports/<sport>.js.
const badminton = require("./seeds/badminton");
const pickleball = require("./seeds/pickleball");
const { CURRENT_VERSION, upgrade } = require("./migrate");

// Seeds are written in the v2 shape; upgrade() turns them into the current format.
const SPORTS = {
  badminton: { config: require("../club/sports/badminton.js"), seed: () => upgrade(badminton.seed()), version: CURRENT_VERSION, upgrade },
  pickleball: { config: require("../club/sports/pickleball.js"), seed: () => upgrade(pickleball.seed()), version: CURRENT_VERSION, upgrade },
};
const DEFAULT_SPORT = "badminton";

module.exports = { SPORTS, SPORT_IDS: Object.keys(SPORTS), DEFAULT_SPORT };
