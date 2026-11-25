"use strict";
// Fictional sample data for the Badminton club. Dates are relative to the day the data is created.
const { fmtShortDate, ymd, at, addDays, startOfDay } = require("../format");

const DATA_VERSION = 2;

function seed() {
  const today = startOfDay(new Date());
  const now = new Date();
  const ago = (h) => new Date(now.getTime() - h * 3600e3).toISOString();
  const saturday = addDays(today, (6 - today.getDay() + 7) % 7);

  const users = {
    "u-owner": { id: "u-owner", name: "Dana Whitfield", role: "owner", title: "Club Owner" },
    "u-admin": { id: "u-admin", name: "Sam Okafor", role: "admin", title: "Club Admin" },
    "u-jordan": { id: "u-jordan", name: "Jordan Rivera", role: "member", title: "Adult player · Guardian of Mia" },
    "u-priya": { id: "u-priya", name: "Priya Shah", role: "member", title: "Parent of Leo" },
    "u-ken": { id: "u-ken", name: "Ken Morales", role: "member", title: "Parent of Ava" },
  };
  const players = [
    { id: "p-jordan", name: "Jordan Rivera", group: "Adult Open Play", adult: true, userId: "u-jordan", guardians: [] },
    { id: "p-mia", name: "Mia Rivera", group: "General Group (age 12)", adult: false, userId: null, guardians: ["u-jordan"] },
    { id: "p-leo", name: "Leo Shah", group: "Elite Group (age 14)", adult: false, userId: null, guardians: ["u-priya"] },
    { id: "p-ava", name: "Ava Morales", group: "General Group (age 10)", adult: false, userId: null, guardians: ["u-ken"] },
    { id: "p-marcus", name: "Marcus Tran", group: "Adult Open Play", adult: true, userId: null, guardians: [] },
  ];

  // Practices – times & venues come from the current badminton page.
  const events = [];
  for (let w = -2; w <= 10; w++) {
    const sat = addDays(saturday, 7 * w);
    const sun = addDays(sat, 1);
    const wed = addDays(sat, -3);
    events.push({
      id: `pr-gen-${ymd(sat)}`, type: "practice", title: "General Group Practice",
      start: at(sat, "16:00"), end: at(sat, "18:00"), location: "Canyon Crest Academy",
      audience: "Open to kids of all ages and skill levels",
      details: "Footwork, fundamentals and fun game play. Wear comfortable athletic clothes & shoes and bring plenty of water.",
      requiresRegistration: false,
    });
    [sat, sun].forEach((d) => events.push({
      id: `pr-elite-${ymd(d)}`, type: "practice", title: "Elite Group Practice",
      start: at(d, "16:00"), end: at(d, "18:00"), location: "Oak Valley Middle School",
      audience: "Qualified 8th, 9th & varsity-level players",
      details: "High-intensity drills, match play and tournament preparation.",
      requiresRegistration: false,
    }));
    events.push({
      id: `pr-adult-${ymd(wed)}`, type: "practice", title: "Adult Open Play", sample: true,
      start: at(wed, "19:00"), end: at(wed, "21:00"), location: "Oak Valley Middle School",
      audience: "Adults, all skill levels",
      details: "Coached warm-up followed by rotating doubles. Sign-up required — limited to 16 courts spots each week. Shuttles provided.",
      requiresRegistration: true, capacity: 16, baseRegistered: 9,
    });
  }

  const cancelledSat = addDays(saturday, 14);
  const cancelledId = `pr-gen-${ymd(cancelledSat)}`;
  events.find((e) => e.id === cancelledId).cancelled = true;

  const t = (o) => Object.assign({ type: "tournament", sample: true, requiresRegistration: true }, o);
  events.push(
    t({
      id: "t-holiday-rr", title: "Holiday Club Round Robin",
      start: at(addDays(saturday, 7), "09:00"), end: at(addDays(saturday, 7), "13:00"),
      location: "Canyon Crest Academy Gym", divisions: ["Junior Singles", "Junior Doubles"], adultEvent: false,
      deadline: at(addDays(today, -1), "23:59"), capacity: 40, baseRegistered: 34, fee: "$15",
      details: "Friendly in-club round robin to close out the year. Every player gets at least 4 matches. Hot cocoa provided!",
    }),
    t({
      id: "t-winter-open", title: "MK3 Winter Junior Open",
      start: at(addDays(saturday, 21), "08:00"), end: at(addDays(saturday, 21), "18:00"),
      location: "Canyon Crest Academy Gym", divisions: ["U11 Singles", "U13 Singles", "U15 Singles", "U15 Doubles"], adultEvent: false,
      deadline: at(addDays(today, 10), "23:59"), capacity: 64, baseRegistered: 41, fee: "$35 per event",
      details: "Our flagship junior tournament. Group stage followed by single-elimination knockouts. Players should arrive 45 minutes before their first match. Feather shuttles provided for knockout rounds.",
    }),
    t({
      id: "t-adult-doubles", title: "SoCal Adult Doubles Classic",
      start: at(addDays(saturday, 36), "09:00"), end: at(addDays(saturday, 36), "17:00"),
      location: "Oak Valley Middle School Gym", divisions: ["Men's Doubles B", "Women's Doubles B", "Mixed Doubles A", "Mixed Doubles B"], adultEvent: true,
      deadline: at(addDays(today, 24), "23:59"), capacity: 48, baseRegistered: 22, fee: "$40 per team",
      details: "Recreational-to-intermediate doubles for adults. Partner not required — we'll pair solo sign-ups by level.",
    }),
    t({
      id: "t-new-year", title: "New Year Shuttle Showdown",
      start: at(addDays(saturday, 49), "08:30"), end: at(addDays(saturday, 49), "16:00"),
      location: "Canyon Crest Academy Gym", divisions: ["U13 Singles", "U15 Singles", "U17 Singles"], adultEvent: false,
      deadline: at(addDays(today, 30), "23:59"), capacity: 32, baseRegistered: 32, fee: "$30",
      details: "Competitive singles event for intermediate and elite juniors. Currently full — contact an admin to be added to the waitlist.",
    }),
    t({
      id: "t-spring-invite", title: "Spring Varsity Prep Invitational",
      start: at(addDays(saturday, 84), "08:00"), end: at(addDays(saturday, 84), "17:00"),
      location: "Oak Valley Middle School Gym", divisions: ["Varsity Singles", "Varsity Doubles", "JV Singles"], adultEvent: false,
      opensAt: at(addDays(today, 40), "09:00"), deadline: at(addDays(today, 70), "23:59"), capacity: 48, baseRegistered: 0, fee: "$40",
      details: "Invitation-style event to prepare high school players for the spring season.",
    })
  );

  const announcements = [
    {
      id: "a-winter-open", category: "reminder", authorId: "u-admin", createdAt: ago(24 * 5),
      title: "Registration is open: MK3 Winter Junior Open",
      body: "Sign-ups for the Winter Junior Open are now open on the Tournaments page. Divisions: U11, U13 and U15 singles plus U15 doubles. Spots are limited, so please register before the deadline.",
      eventId: "t-winter-open",
    },
    {
      id: "a-holiday", category: "general", authorId: "u-owner", createdAt: ago(24 * 2),
      title: "Holiday Round Robin — see you there!",
      body: "Registration for the Holiday Club Round Robin is now closed. Brackets will be posted at the gym. Thank you to all our volunteer coaches!",
      eventId: "t-holiday-rr",
    },
    {
      id: "a-cancel", category: "cancellation", authorId: "u-owner", createdAt: ago(3),
      title: `No General Group practice on ${fmtShortDate(at(cancelledSat, "16:00"))}`,
      body: "Canyon Crest Academy's gym is reserved for a school event that afternoon, so General Group practice is cancelled. Elite Group practice at Oak Valley is still on.",
      eventId: cancelledId,
    },
  ];

  const nextWed = addDays(saturday, 4); // the Wednesday after this Saturday
  const registrations = [
    {
      id: "r-seed-1", eventId: "t-winter-open", playerId: "p-mia", division: "U13 Singles",
      userId: "u-jordan", createdAt: ago(24 * 4), code: "MK3-7Q2D",
    },
    {
      id: "r-seed-2", eventId: `pr-adult-${ymd(nextWed)}`, playerId: "p-marcus", division: null,
      userId: "u-marcus", createdAt: ago(24 * 1), code: "MK3-K8TR",
    },
  ];

  const spotlights = [
    {
      id: "s-mia", playerId: "p-mia", authorId: "u-admin", publishedAt: ago(24 * 6),
      headline: "Mia's quick recovery is paying off",
      improved: "Footwork recovery — Mia now returns to her base position after every rear-court shot instead of watching the shuttle.",
      example: "In last Saturday's clear-and-recover drill she got back to center within two steps on 8 out of 10 rallies (up from 3 out of 10 in October).",
      nextSkill: "A consistent backhand clear from the rear court.",
      coachingNotes: "Mia drops her racket head after the overhead which delays her backhand prep. Home practice: 10 minutes of shadow footwork 3x/week, focusing on a 'racket-up' ready position. Re-assess at the Winter Junior Open.",
    },
    {
      id: "s-leo", playerId: "p-leo", authorId: "u-owner", publishedAt: ago(24 * 12),
      headline: "Leo's net game took a big step forward",
      improved: "Net play — Leo is taking the shuttle much earlier at the net and creating attacking chances.",
      example: "In his Elite Group match vs. a varsity partner pair, he won 6 points directly from tight net kills.",
      nextSkill: "Deceptive drop shots from the rear court.",
      coachingNotes: "PRIVATE (Leo / guardian / staff): Leo's left knee was sore after Sunday's session — keep lunges limited for 2 weeks and check in with his parent before tournament play.",
    },
  ];

  const conversations = [
    {
      id: "c-mia-group", memberId: "u-jordan", to: "owner", subject: "Is Mia ready for the intermediate group?", playerId: "p-mia",
      messages: [
        { id: "m1", from: "u-jordan", at: ago(24 * 6), body: "Hi Dana! Mia has been loving Saturdays. Do you think she's ready to try the intermediate group next season?" },
        { id: "m2", from: "u-owner", at: ago(24 * 5), body: "Hi Jordan — she's made great progress on footwork. Let's have her play a tournament first and we'll re-evaluate in January." },
        { id: "m3", from: "u-jordan", at: ago(24 * 2), body: "Sounds good. Is the Winter Junior Open U13 Singles a good fit for her?" },
        { id: "m4", from: "u-owner", at: ago(20), body: "Yes, U13 Singles is perfect. I see she's already registered — great! Coach Sam will share a warm-up plan the week before." },
      ],
      readAt: { member: ago(24 * 2), staff: ago(20) },
    },
    {
      id: "c-carpool", memberId: "u-priya", to: "admin", subject: "Carpool to Oak Valley on Sundays", playerId: "p-leo",
      messages: [
        { id: "m5", from: "u-priya", at: ago(3), body: "Hi Sam, are there other Elite families near Carmel Valley interested in a Sunday carpool to Oak Valley?" },
      ],
      readAt: { member: ago(3), staff: ago(48) },
    },
  ];

  return { version: DATA_VERSION, users, players, events, announcements, registrations, spotlights, conversations };
}

module.exports = { seed, DATA_VERSION };
