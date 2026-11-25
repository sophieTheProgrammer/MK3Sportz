"use strict";
// Data format versions.
//   v2: members were a fictional logged-in persona (users with role "member", registrations and
//       conversations tied to a member user id).
//   v3: members have no accounts. Registrations and conversations carry the visitor's own contact
//       details plus a hashed secret key; the key stays in the visitor's browser (or private link).
//       Coaching notes are staff-only, shared with a family through a private link (notesKey).
const crypto = require("crypto");

const CURRENT_VERSION = 3;
const newKey = () => crypto.randomBytes(24).toString("base64url");
const hashKey = (key) => crypto.createHash("sha256").update(String(key)).digest("hex");

function v2to3(d) {
  const users = d.users || {};
  const players = d.players || [];
  const player = (id) => players.find((p) => p.id === id);
  const slug = (name) => String(name || "member").toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "");
  const contactOf = (name) => ({ name, email: `${slug(name)}@example.com`, phone: null }); // fictional sample addresses

  const registrations = (d.registrations || []).map((r) => {
    const p = player(r.playerId) || { name: "Participant", adult: true, guardians: [] };
    const guardian = !p.adult && p.guardians && p.guardians.length ? users[p.guardians[0]] : null;
    const registrant = users[r.userId] || guardian;
    return {
      id: r.id, eventId: r.eventId, division: r.division || null, code: r.code, createdAt: r.createdAt,
      participant: { name: p.name, adult: !!p.adult },
      guardianName: p.adult ? null : (guardian || registrant || { name: "Parent/guardian" }).name,
      contact: contactOf(registrant ? registrant.name : p.name),
      keyHash: null, // sample data: not linked to anyone's browser
    };
  });

  const conversations = (d.conversations || []).map((c) => {
    const u = users[c.memberId] || { name: "Club member", title: "" };
    return {
      id: c.id, to: c.to, subject: c.subject,
      about: c.playerId && player(c.playerId) ? player(c.playerId).name : null,
      contact: { ...contactOf(u.name), role: /parent|guardian/i.test(u.title || "") ? "parent" : "adult" },
      messages: (c.messages || []).map((m) => ({ ...m, from: m.from === c.memberId ? "visitor" : m.from })),
      readAt: { visitor: c.readAt ? c.readAt.member : null, staff: c.readAt ? c.readAt.staff : null },
      keyHash: null,
    };
  });

  const staff = {};
  for (const [id, u] of Object.entries(users)) if (u.role !== "member") staff[id] = u;

  return {
    ...d,
    version: 3,
    users: staff,
    players: players.map(({ id, name, group, adult }) => ({ id, name, group, adult })),
    registrations,
    conversations,
    spotlights: (d.spotlights || []).map((s) => (s.coachingNotes && !s.notesKey ? { ...s, notesKey: newKey() } : s)),
  };
}

/** Bring stored data up to the current format (returns the same object if already current). */
function upgrade(data) {
  if (data && data.version === 2) data = v2to3(data);
  return data;
}

module.exports = { CURRENT_VERSION, upgrade, newKey, hashKey };
