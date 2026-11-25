"use strict";
// Event times are stored as club-local wall-clock strings, e.g. "2026-12-05T16:00".
// Text written by the server (announcements) is formatted from those parts so it reads
// the same no matter which time zone the server runs in.
function wall(s) {
  const [d, t = "00:00"] = String(s).split("T");
  const [y, m, day] = d.split("-").map(Number);
  const [h, mi] = t.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, day, h || 0, mi || 0));
}
const tidy = (s) => s.replace(/ /g, " ");
const fmtDate = (s) => tidy(wall(s).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric", year: "numeric" }));
const fmtShortDate = (s) => tidy(wall(s).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" }));
const fmtTime = (s) => tidy(wall(s).toLocaleTimeString("en-US", { timeZone: "UTC", hour: "numeric", minute: "2-digit" }));

// Calendar helpers in the server's local time (set TZ in .env to the club's time zone).
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const at = (d, hhmm) => `${ymd(d)}T${hhmm}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

module.exports = { fmtDate, fmtShortDate, fmtTime, ymd, at, addDays, startOfDay };
