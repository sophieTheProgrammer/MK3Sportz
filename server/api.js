"use strict";
// Club data API, one instance per sport (each with its own store):
//   /api/<sport>/...        public actions — visitors have no accounts. Things a visitor creates
//                           (a registration, a message thread) come back with a secret key that
//                           stays in their browser or private link; only that key can open them.
//   /api/<sport>/admin/...  staff actions — mounted behind requireAdmin in app.js
// All rules are enforced here; the browser only displays what these endpoints return.
const crypto = require("crypto");
const express = require("express");
const Core = require("../club/club-core.js");
const { fmtDate, fmtShortDate, fmtTime, at, addDays } = require("./format");
const { newKey, hashKey } = require("./migrate");

const { WHO_LABEL } = Core;
const CATEGORIES = ["general", "cancellation", "change", "reminder"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LOOKUP = 50;

const uid = (prefix) => `${prefix}-${Date.now().toString(36)}${crypto.randomBytes(3).toString("hex")}`;
const isoNow = () => new Date().toISOString();

class ApiError extends Error {
  constructor(status, errors) { super(errors[0]); this.status = status; this.errors = errors; }
}
const fail = (...errors) => { throw new ApiError(400, errors); };
const missing = (what) => { throw new ApiError(404, [`That ${what} could not be found.`]); };
const str = (v) => (typeof v === "string" ? v.trim() : "");
const flag = (v) => v === true || v === "on" || v === "true";

/** Read a text field: trimmed, optionally required, with a length limit. */
function textField(body, name, label, { required = false, max = 4000 } = {}, errs) {
  const v = str(body[name]);
  if (required && !v) errs.push(`${label} is required.`);
  else if (v.length > max) errs.push(`${label} must be ${max} characters or fewer.`);
  return v;
}
function intField(value, label, min, max, errs) {
  if (value === "" || value == null) return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) { errs.push(`${label} must be a whole number from ${min} to ${max}.`); return null; }
  return n;
}
/** Contact details a visitor gives instead of an account. */
function contactFields(b, errs, { nameField, nameLabel }) {
  const name = textField(b, nameField, nameLabel, { required: true, max: 80 }, errs);
  const email = textField(b, "email", "Email", { required: true, max: 120 }, errs);
  if (email && !EMAIL_RE.test(email)) errs.push("Enter a valid email address.");
  const phone = textField(b, "phone", "Phone", { max: 30 }, errs);
  return { name, email, phone: phone || null };
}
const done = (errs) => { if (errs.length) throw new ApiError(400, errs); };

/** Does `key` open a record whose key hash is `stored`? (constant-time; sample records have no key) */
function keyOpens(stored, key) {
  if (typeof stored !== "string" || typeof key !== "string" || key.length < 16 || key.length > 200) return false;
  const a = Buffer.from(stored, "hex");
  const b = Buffer.from(hashKey(key), "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
/** [{id, key}, …] from a lookup request (anything malformed is ignored). */
const lookupItems = (b) => (Array.isArray(b && b.items) ? b.items : [])
  .slice(0, MAX_LOOKUP).filter((x) => x && typeof x.id === "string" && typeof x.key === "string");

// ---------------------------------------------------------------- shared helpers
const regsFor = (data, evId) => data.registrations.filter((r) => r.eventId === evId);
const registeredCount = (data, ev) => (ev.baseRegistered || 0) + regsFor(data, ev.id).length;
const statusOf = (data, ev) => Core.regStatus(ev, { count: registeredCount(data, ev), fmtShortDate });
const upcoming = (ev) => new Date(ev.end) >= new Date();
const withCounts = (data) => data.events.map((e) => ({ ...e, registeredCount: registeredCount(data, e) }));
const withoutKey = ({ keyHash, ...rest }) => rest; // eslint-disable-line no-unused-vars

/** Everything — only ever sent to a signed-in admin (key hashes stay on the server). */
function adminView(data) {
  const { version, ...rest } = data;
  return {
    ...rest,
    events: withCounts(data),
    registrations: data.registrations.map(withoutKey),
    conversations: data.conversations.map(withoutKey),
  };
}

/** What any visitor may see: no registrations, messages, contact details or coaching notes. */
function publicView(data) {
  const users = {};
  for (const u of Object.values(data.users)) users[u.id] = { id: u.id, name: u.name, role: u.role, title: u.title };
  return {
    users,
    players: data.players.map(({ id, name, group, adult }) => ({ id, name, group, adult })),
    events: withCounts(data),
    announcements: data.announcements,
    spotlights: data.spotlights.map(({ coachingNotes, notesKey, ...rest }) => ({ ...rest, hasPrivateNotes: !!coachingNotes })), // eslint-disable-line no-unused-vars
    registrations: [],
    conversations: [],
  };
}

function findEvent(data, id, type) {
  const ev = data.events.find((e) => e.id === id);
  if (!ev || (type && ev.type !== type)) missing(type || "event");
  return ev;
}
const announcement = (authorId, { category, title, body, eventId = null }) =>
  ({ id: uid("a"), category, title, body, eventId, authorId, createdAt: isoNow() });

/** Wrap a handler: JSON in, JSON out, ApiErrors become 4xx responses. */
const handle = (fn) => (req, res) => {
  try {
    const out = fn(req, res) || {};
    res.json({ ok: true, ...out });
  } catch (err) {
    if (err instanceof ApiError) return res.status(err.status).json({ error: err.errors[0], errors: err.errors });
    console.error(err);
    res.status(500).json({ errors: ["Something went wrong on the server. Please try again."] });
  }
};

// ---------------------------------------------------------------- public routes (no accounts)
function memberRoutes(store, sport) {
  const r = express.Router();

  r.get("/state", (req, res) => res.json(publicView(store.data)));

  // ----- registrations: anyone can sign up; the returned key lets this browser see / cancel it
  r.post("/registrations", handle((req) => {
    const b = req.body || {};
    const data = store.data;
    const ev = findEvent(data, b.eventId);
    if (!ev.requiresRegistration) fail("This event doesn't need a sign-up.");
    if (!statusOf(data, ev).open) fail("Sign-ups for this event aren't open right now.");
    const errs = [];
    const participantName = textField(b, "participantName", "Participant's name", { required: true, max: 80 }, errs);
    const adult = b.participantType === "adult" ? true : b.participantType === "junior" ? false : null;
    if (adult === null) errs.push("Choose whether the participant is an adult or a junior.");
    const guardianName = adult === false ? textField(b, "guardianName", "Parent or guardian's name", { required: true, max: 80 }, errs) : null;
    const contact = contactFields(b, errs, { nameField: adult === false ? "guardianName" : "participantName", nameLabel: "Name" });
    let division = null;
    if (ev.divisions) {
      division = str(b.division);
      if (!ev.divisions.includes(division)) errs.push("Please choose a division.");
    }
    if (b.agree !== true) errs.push("Please accept the code of conduct and waiver.");
    done(errs);
    const who = Core.eligibilityOf(sport, ev);
    if (!(who === "all" || (who === "adult") === adult)) fail(`This event is for ${WHO_LABEL[who].toLowerCase()} only.`);
    const sameName = (x) => x.participant.name.toLowerCase() === participantName.toLowerCase();
    if (regsFor(data, ev.id).some(sameName)) fail(`${participantName} is already registered for this event.`);
    const key = newKey();
    const reg = {
      id: uid("r"), eventId: ev.id, division, createdAt: isoNow(),
      code: `MK3-${crypto.randomBytes(2).toString("hex").toUpperCase()}`,
      participant: { name: participantName, adult }, guardianName, contact, keyHash: hashKey(key),
    };
    store.update((d) => d.registrations.push(reg));
    return { registration: withoutKey(reg), key };
  }));

  r.post("/registrations/lookup", handle((req) => {
    const items = lookupItems(req.body);
    return {
      registrations: items.map(({ id, key }) => store.data.registrations.find((x) => x.id === id && keyOpens(x.keyHash, key)))
        .filter(Boolean).map(withoutKey),
    };
  }));

  r.post("/registrations/:id/cancel", handle((req) => {
    const reg = store.data.registrations.find((x) => x.id === req.params.id && keyOpens(x.keyHash, (req.body || {}).key));
    if (!reg) missing("registration");
    store.update((d) => { d.registrations = d.registrations.filter((x) => x.id !== reg.id); });
  }));

  // ----- private messages: a visitor starts a thread; the returned key opens it later
  r.post("/conversations", handle((req) => {
    const b = req.body || {};
    const errs = [];
    const contact = contactFields(b, errs, { nameField: "name", nameLabel: "Your name" });
    const role = b.role === "parent" ? "parent" : b.role === "adult" ? "adult" : null;
    if (!role) errs.push("Choose whether you're a parent/guardian or an adult player.");
    if (!["owner", "admin"].includes(b.to)) errs.push("Choose who to message.");
    const about = textField(b, "about", "Player's name", { max: 80 }, errs);
    const subject = textField(b, "subject", "Subject", { required: true, max: 120 }, errs);
    const body = textField(b, "body", "Message", { required: true, max: 4000 }, errs);
    done(errs);
    const now = isoNow();
    const key = newKey();
    const c = {
      id: uid("c"), to: b.to, subject, about: about || null, contact: { ...contact, role },
      messages: [{ id: uid("m"), from: "visitor", at: now, body }], readAt: { visitor: now, staff: null }, keyHash: hashKey(key),
    };
    store.update((d) => d.conversations.push(c));
    return { conversation: { id: c.id }, key };
  }));

  r.post("/conversations/lookup", handle((req) => {
    const items = lookupItems(req.body);
    return {
      conversations: items.map(({ id, key }) => store.data.conversations.find((x) => x.id === id && keyOpens(x.keyHash, key)))
        .filter(Boolean).map(withoutKey),
    };
  }));

  const openConvo = (req) => store.data.conversations.find((c) => c.id === req.params.id && keyOpens(c.keyHash, (req.body || {}).key)) || missing("conversation");

  r.post("/conversations/:id/messages", handle((req) => {
    const c = openConvo(req);
    const errs = [];
    const body = textField(req.body || {}, "body", "Message", { required: true, max: 4000 }, errs);
    done(errs);
    store.update(() => {
      const now = isoNow();
      c.messages.push({ id: uid("m"), from: "visitor", at: now, body });
      c.readAt.visitor = now;
    });
  }));

  r.post("/conversations/:id/read", handle((req) => {
    const c = openConvo(req);
    store.update(() => { c.readAt.visitor = isoNow(); });
  }));

  // ----- coaching notes: staff share a private link with the family
  r.post("/spotlights/:id/notes", handle((req) => {
    const key = (req.body || {}).key;
    const s = store.data.spotlights.find((x) => x.id === req.params.id);
    const ok = s && s.notesKey && typeof key === "string" && key.length === s.notesKey.length
      && crypto.timingSafeEqual(Buffer.from(key), Buffer.from(s.notesKey));
    if (!ok) missing("coaching note");
    return { coachingNotes: s.coachingNotes };
  }));

  return r;
}

// ---------------------------------------------------------------- admin routes (behind requireAdmin)
function tournamentInput(b, existing, data) {
  const errs = [];
  const title = textField(b, "title", "Tournament name", { required: true, max: 100 }, errs);
  const date = str(b.date), startTime = str(b.startTime), endTime = str(b.endTime);
  const deadline = str(b.deadline), opens = str(b.opens);
  if (!DATE_RE.test(date)) errs.push("Choose a tournament date.");
  if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) errs.push("Enter a start and end time.");
  else if (endTime <= startTime) errs.push("The end time must be after the start time.");
  const location = textField(b, "location", "Venue", { required: true, max: 120 }, errs);
  const divisions = [...new Set(str(b.divisions).split("\n").map((d) => d.trim()).filter(Boolean))];
  if (!divisions.length) errs.push("Add at least one division.");
  if (divisions.some((d) => d.length > 60)) errs.push("Division names must be 60 characters or fewer.");
  if (!DATE_RE.test(deadline)) errs.push("Choose a registration deadline.");
  else if (DATE_RE.test(date) && deadline > date) errs.push("The registration deadline must be on or before the tournament date.");
  if (opens && !DATE_RE.test(opens)) errs.push("The registration opening date isn't valid.");
  else if (opens && DATE_RE.test(deadline) && opens > deadline) errs.push("Registration must open on or before the deadline.");
  const capacity = intField(b.capacity, "Spots", 1, 999, errs);
  const fee = textField(b, "fee", "Entry fee", { max: 40 }, errs);
  const details = textField(b, "details", "Details", { max: 4000 }, errs);
  const start = `${date}T${startTime}`;
  if (!existing && DATE_RE.test(date) && TIME_RE.test(startTime) && new Date(start) < new Date()) errs.push("Choose a tournament date in the future.");
  if (existing) {
    const locked = [...new Set(regsFor(data, existing.id).map((r) => r.division).filter((d) => d && !divisions.includes(d)))];
    if (locked.length) errs.push(`Players are registered in ${locked.join(", ")} — keep ${locked.length > 1 ? "those divisions" : "that division"}.`);
  }
  done(errs);
  return {
    title, start, end: `${date}T${endTime}`, location, divisions, adultEvent: b.who === "adult",
    opensAt: opens ? `${opens}T00:00` : null, deadline: `${deadline}T23:59`, capacity, fee: fee || null, details,
  };
}

function adminRoutes(store, sport) {
  const r = express.Router();
  const me = (req) => req.admin.userId;

  // Record the signed-in Google admin in this sport's data so posts and replies show their name.
  r.use((req, res, next) => {
    const a = req.admin;
    if (!store.data.users[a.userId]) store.update((d) => { d.users[a.userId] = { id: a.userId, name: a.name, role: "admin", title: "Club Admin" }; });
    next();
  });

  r.get("/state", (req, res) => res.json(adminView(store.data)));

  // ----- tournaments
  r.post("/tournaments", handle((req) => {
    const fields = tournamentInput(req.body || {}, null, store.data);
    const ev = { id: uid("t"), type: "tournament", requiresRegistration: true, baseRegistered: 0, ...fields };
    store.update((d) => d.events.push(ev));
    return { event: { id: ev.id, title: ev.title } };
  }));

  r.put("/tournaments/:id", handle((req) => {
    const ev = findEvent(store.data, req.params.id, "tournament");
    const fields = tournamentInput(req.body || {}, ev, store.data);
    store.update(() => Object.assign(ev, fields));
    return { event: { id: ev.id, title: ev.title } };
  }));

  // ----- practices
  r.post("/practices", handle((req) => {
    const b = req.body || {};
    const errs = [];
    const cls = sport.classes.find((c) => c.id === b.classId);
    if (!cls && b.classId !== "other") errs.push("Choose a class.");
    const title = textField(b, "title", "Session title", { max: 100 }, errs) || (cls ? cls.title : "");
    if (!title) errs.push("Add a title for this session.");
    const date = str(b.date), startTime = str(b.startTime), endTime = str(b.endTime);
    if (!DATE_RE.test(date)) errs.push("Choose a date.");
    if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) errs.push("Enter a start and end time.");
    else if (endTime <= startTime) errs.push("The end time must be after the start time.");
    else if (DATE_RE.test(date) && new Date(`${date}T${startTime}`) < new Date()) errs.push("Choose a date and time in the future.");
    const location = textField(b, "location", "Location", { required: true, max: 120 }, errs);
    const details = textField(b, "details", "Details", { max: 4000 }, errs);
    const requires = flag(b.requiresSignup);
    const capacity = requires ? intField(b.capacity, "Spots", 1, 200, errs) : null;
    if (requires && capacity == null && !errs.some((e) => e.startsWith("Spots"))) errs.push("Enter how many spots are available.");
    const weeks = intField(b.weeks == null ? 1 : b.weeks, "Weeks", 1, 12, errs) || 1;
    const eligibility = WHO_LABEL[b.eligibility] ? b.eligibility : "all";
    done(errs);

    const base = new Date(`${date}T12:00`);
    const created = [];
    for (let i = 0; i < weeks; i++) {
      const d = addDays(base, 7 * i);
      created.push({
        id: uid("pr"), type: "practice", classId: cls ? cls.id : null, title,
        start: at(d, startTime), end: at(d, endTime), location,
        audience: cls ? cls.who : WHO_LABEL[eligibility], details: details || (cls ? cls.details : ""),
        requiresRegistration: requires, capacity, baseRegistered: 0, eligibility,
      });
    }
    const first = created[0];
    store.update((d) => {
      d.events.push(...created);
      if (flag(b.announce)) {
        d.announcements.push(announcement(me(req), {
          category: "change", eventId: first.id,
          title: weeks > 1 ? `New: ${title} — ${weeks} weekly sessions` : `New session: ${title} on ${fmtShortDate(first.start)}`,
          body: `${title} ${weeks > 1 ? `starts ${fmtDate(first.start)} and runs weekly for ${weeks} weeks` : `is on ${fmtDate(first.start)}`}, `
            + `${fmtTime(first.start)} – ${fmtTime(first.end)} at ${location}.${requires ? " Sign-up is required — register from the calendar." : ""}`,
        }));
      }
    });
    return { created: created.length, title, announced: flag(b.announce) };
  }));

  r.post("/practices/:id/reschedule", handle((req) => {
    const b = req.body || {};
    const ev = findEvent(store.data, req.params.id, "practice");
    const errs = [];
    const date = str(b.date), startTime = str(b.startTime), endTime = str(b.endTime);
    if (!DATE_RE.test(date)) errs.push("Choose a date.");
    if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) errs.push("Enter a start and end time.");
    else if (endTime <= startTime) errs.push("The end time must be after the start time.");
    const location = textField(b, "location", "Location", { required: true, max: 120 }, errs);
    const note = textField(b, "note", "Note", { max: 1000 }, errs);
    const capacity = ev.requiresRegistration && b.capacity !== "" && b.capacity != null ? intField(b.capacity, "Spots", 1, 200, errs) : ev.capacity;
    done(errs);
    const start = `${date}T${startTime}`, end = `${date}T${endTime}`;
    const moved = start !== ev.start || end !== ev.end;
    const relocated = location !== ev.location;
    const resized = capacity !== ev.capacity;
    if (moved && new Date(start) < new Date()) fail("Choose a date and time in the future.");
    if (!moved && !relocated && !resized) fail("Nothing changed — choose a new date, time, location or number of spots.");
    const before = { start: ev.start, location: ev.location };
    const notify = flag(b.announce) && (moved || relocated);
    store.update((d) => {
      if (moved) {
        if (!ev.rescheduledFrom) ev.rescheduledFrom = ev.start;
        ev.start = start;
        ev.end = end;
        if (ev.rescheduledFrom === ev.start) delete ev.rescheduledFrom; // moved back to the original time
      }
      ev.location = location;
      ev.capacity = capacity;
      if (notify) {
        const what = moved ? `is now on ${fmtDate(start)}, ${fmtTime(start)} – ${fmtTime(end)}${relocated ? ` at ${location}` : ""}` : `moves to ${location}`;
        d.announcements.push(announcement(me(req), {
          category: "change", eventId: ev.id,
          title: `${ev.title} on ${fmtShortDate(before.start)} ${moved ? "has been rescheduled" : "has a new location"}`,
          body: `${ev.title} (originally ${fmtDate(before.start)} at ${fmtTime(before.start)}, ${before.location}) ${what}.${note ? `\n\n${note}` : ""}`,
        }));
      }
    });
    return { notified: notify };
  }));

  r.post("/practices/:id/cancel", handle((req) => {
    const b = req.body || {};
    const ev = findEvent(store.data, req.params.id, "practice");
    const errs = [];
    const reason = textField(b, "reason", "Reason", { max: 300 }, errs);
    done(errs);
    store.update((d) => {
      ev.cancelled = true;
      if (reason) ev.cancelReason = reason; else delete ev.cancelReason;
      if (flag(b.announce)) {
        d.announcements.push(announcement(me(req), {
          category: "cancellation", eventId: ev.id,
          title: `No ${ev.title} on ${fmtShortDate(ev.start)}`,
          body: `${ev.title} on ${fmtDate(ev.start)} (${fmtTime(ev.start)}, ${ev.location}) is cancelled.${reason ? ` ${reason}` : ""}`,
        }));
      }
    });
    return { notified: flag(b.announce) };
  }));

  r.post("/practices/:id/restore", handle((req) => {
    const b = req.body || {};
    const ev = findEvent(store.data, req.params.id, "practice");
    store.update((d) => {
      ev.cancelled = false;
      delete ev.cancelReason;
      if (flag(b.announce)) {
        d.announcements.push(announcement(me(req), {
          category: "change", eventId: ev.id,
          title: `${ev.title} on ${fmtShortDate(ev.start)} is back on`,
          body: `Good news — ${ev.title} on ${fmtDate(ev.start)} at ${fmtTime(ev.start)} (${ev.location}) is back on the schedule.`,
        }));
      }
    });
    return { notified: flag(b.announce) };
  }));

  // ----- sign-ups (open / close / follow the dates)
  r.put("/events/:id/signups", handle((req) => {
    const mode = (req.body || {}).mode;
    if (![null, "open", "closed"].includes(mode)) fail("Unknown sign-up setting.");
    const ev = findEvent(store.data, req.params.id);
    if (!ev.requiresRegistration) fail("This event doesn't use sign-ups.");
    store.update(() => { if (mode) ev.signups = mode; else delete ev.signups; });
    return { status: statusOf(store.data, ev).label };
  }));

  // ----- player spotlights
  r.post("/spotlights", handle((req) => {
    const b = req.body || {};
    const errs = [];
    const p = store.data.players.find((x) => x.id === b.playerId);
    if (!p) errs.push("Choose a player.");
    const headline = textField(b, "headline", "Headline", { max: 90 }, errs);
    const improved = textField(b, "improved", "What improved", { required: true, max: 2000 }, errs);
    const example = textField(b, "example", "A specific example", { required: true, max: 2000 }, errs);
    const nextSkill = textField(b, "nextSkill", "Next skill", { required: true, max: 2000 }, errs);
    const coachingNotes = textField(b, "coachingNotes", "Coaching notes", { max: 4000 }, errs);
    done(errs);
    const s = {
      id: uid("s"), playerId: p.id, headline, improved, example, nextSkill, coachingNotes, authorId: me(req), publishedAt: isoNow(),
      notesKey: coachingNotes ? newKey() : null, // private link for the player's family
    };
    store.update((d) => d.spotlights.push(s));
    return { spotlight: { id: s.id } };
  }));

  r.delete("/spotlights/:id", handle((req) => {
    if (!store.data.spotlights.some((s) => s.id === req.params.id)) missing("spotlight");
    store.update((d) => { d.spotlights = d.spotlights.filter((s) => s.id !== req.params.id); });
  }));

  // ----- announcements
  r.post("/announcements", handle((req) => {
    const b = req.body || {};
    const errs = [];
    const title = textField(b, "title", "Title", { required: true, max: 120 }, errs);
    const body = textField(b, "body", "Message", { required: true, max: 4000 }, errs);
    if (!CATEGORIES.includes(b.category)) errs.push("Choose an announcement type.");
    const ev = b.eventId ? store.data.events.find((e) => e.id === b.eventId) : null;
    if (b.eventId && !ev) errs.push("The related event could not be found.");
    done(errs);
    store.update((d) => {
      d.announcements.push(announcement(me(req), { category: b.category, title, body, eventId: ev ? ev.id : null }));
      if (ev && ev.type === "practice" && flag(b.markCancelled)) ev.cancelled = true;
    });
  }));

  // ----- private messages (staff side)
  const convo = (id) => store.data.conversations.find((c) => c.id === id) || missing("conversation");
  r.post("/conversations/:id/messages", handle((req) => {
    const c = convo(req.params.id);
    const errs = [];
    const body = textField(req.body || {}, "body", "Message", { required: true, max: 4000 }, errs);
    done(errs);
    store.update(() => {
      const now = isoNow();
      c.messages.push({ id: uid("m"), from: me(req), at: now, body });
      c.readAt.staff = now;
    });
  }));
  r.post("/conversations/:id/read", handle((req) => {
    const c = convo(req.params.id);
    store.update(() => { c.readAt.staff = isoNow(); });
  }));

  // ----- reset the demo data (staff only)
  r.post("/reset", handle((req) => {
    store.reset();
    store.update((d) => { d.users[req.admin.userId] = { id: req.admin.userId, name: req.admin.name, role: "admin", title: "Club Admin" }; });
  }));

  return r;
}

module.exports = { memberRoutes, adminRoutes, publicView, adminView, upcoming };
