"use strict";
// Sample data for the Pickleball club. Dates are relative to the day the data is created.
// Real: youth & adult practice days, times and venues (from sports/pickleball.html and
// sports/adultpickleball.html). Fictional (labelled "Sample" in the app): people, messages,
// spotlights, registrations, tournaments, open play and clinics.
const { fmtShortDate, ymd, at, addDays, startOfDay } = require("../format");

const DATA_VERSION = 2;

function seed() {
  const today = startOfDay(new Date());
  const now = new Date();
  const ago = (h) => new Date(now.getTime() - h * 3600e3).toISOString();
  const sunday = addDays(today, -today.getDay()); // start of this week
  const saturday = addDays(today, (6 - today.getDay() + 7) % 7); // this coming Saturday (or today)

  const users = {
    "u-owner": { id: "u-owner", name: "Dana Whitfield", role: "owner", title: "Club Owner" },
    "u-admin": { id: "u-admin", name: "Luis Ortega", role: "admin", title: "Club Admin" },
    "u-jordan": { id: "u-jordan", name: "Jordan Rivera", role: "member", title: "Adult player · Guardian of Mia" },
    "u-renee": { id: "u-renee", name: "Renee Alvarez", role: "member", title: "Parent of Diego" },
    "u-tom": { id: "u-tom", name: "Tom Becker", role: "member", title: "Adult player" },
  };
  const players = [
    { id: "p-jordan", name: "Jordan Rivera", group: "Adult Pickleball (3.0)", adult: true, userId: "u-jordan", guardians: [] },
    { id: "p-mia", name: "Mia Rivera", group: "Youth Pickleball (age 12)", adult: false, userId: null, guardians: ["u-jordan"] },
    { id: "p-diego", name: "Diego Alvarez", group: "Youth Pickleball (age 14)", adult: false, userId: null, guardians: ["u-renee"] },
    { id: "p-tom", name: "Tom Becker", group: "Adult Pickleball (3.5)", adult: true, userId: "u-tom", guardians: [] },
    { id: "p-ana", name: "Ana Lopez", group: "Adult Pickleball (2.5)", adult: true, userId: null, guardians: [] },
  ];

  // Practices — youth and adult schedules from the current pickleball pages.
  const events = [];
  for (let w = -2; w <= 10; w++) {
    const week = addDays(sunday, 7 * w);
    for (const dow of [1, 2, 3, 4]) { // Mon–Thu
      const d = addDays(week, dow);
      events.push({
        id: `pb-youth-${ymd(d)}`, type: "practice", title: "Youth Pickleball Practice",
        start: at(d, "16:00"), end: at(d, "17:30"), location: "Black Mountain Middle School",
        audience: "Elementary, middle and high school students — all skill levels",
        details: "Warm-up, paddle skills and drills (serves, returns, dinking), then game play. Bring a water bottle marked with your name.",
        requiresRegistration: false,
      });
    }
    for (const [dow, start, end] of [[0, "08:00", "10:00"], [1, "17:30", "19:00"], [3, "17:30", "19:00"]]) { // Sun, Mon, Wed
      const d = addDays(week, dow);
      events.push({
        id: `pb-adult-${ymd(d)}`, type: "practice", title: "Adult Pickleball",
        start: at(d, start), end: at(d, end), location: "Ridgewood Park",
        audience: "Adults — all skill levels",
        details: "Coached drills followed by rotating doubles. Paddles available to borrow.",
        requiresRegistration: false,
      });
    }
    const sat = addDays(week, 6);
    events.push({
      id: `pb-open-${ymd(sat)}`, type: "practice", title: "Saturday Open Play", sample: true,
      start: at(sat, "09:00"), end: at(sat, "11:00"), location: "Ridgewood Park",
      audience: "Adults, all skill levels",
      details: "Rotating doubles on four courts using a paddle queue. Sign-up required — 16 spots each week. Balls provided; bring your own paddle.",
      requiresRegistration: true, capacity: 16, baseRegistered: 10,
    });
  }

  // Clinics (sample) — linked to the "Skills Clinics" class with classId.
  events.push(
    {
      id: "pb-clinic-drops", type: "practice", classId: "clinic", title: "Third-Shot Drop Clinic", sample: true,
      start: at(addDays(saturday, 7), "11:30"), end: at(addDays(saturday, 7), "13:00"), location: "Ridgewood Park",
      audience: "Juniors and adults", eligibility: "all",
      details: "Hit a soft third shot that lands in the kitchen so your team can move up to the net. Drills from the baseline, then live play.",
      requiresRegistration: true, capacity: 12, baseRegistered: 7,
    },
    {
      id: "pb-clinic-dinks", type: "practice", classId: "clinic", title: "Dinking & Kitchen Play Clinic", sample: true,
      start: at(addDays(saturday, 28), "11:30"), end: at(addDays(saturday, 28), "13:00"), location: "Ridgewood Park",
      audience: "Juniors and adults", eligibility: "all",
      details: "Cross-court and straight-ahead dinks, staying patient at the kitchen line, and when to speed the ball up.",
      requiresRegistration: true, capacity: 12, baseRegistered: 3,
    },
  );

  const cancelledDay = addDays(sunday, 14 + 4); // Thursday, two weeks from now
  const cancelledId = `pb-youth-${ymd(cancelledDay)}`;
  events.find((e) => e.id === cancelledId).cancelled = true;

  // Tournaments (sample) with pickleball divisions: skill ratings, age groups and formats.
  const t = (o) => Object.assign({ type: "tournament", sample: true, requiresRegistration: true }, o);
  events.push(
    t({
      id: "pb-t-holiday-rr", title: "MK3 Holiday Mixed Doubles Round Robin",
      start: at(addDays(saturday, 8), "10:30"), end: at(addDays(saturday, 8), "14:30"),
      location: "Ridgewood Park Courts", divisions: ["Mixed Doubles 3.0", "Mixed Doubles 3.5", "Mixed Doubles 4.0+"], adultEvent: true,
      deadline: at(addDays(today, -1), "23:59"), capacity: 32, baseRegistered: 28, fee: "$20 per player",
      details: "Social round robin with a new partner every round. Games to 11, win by 2. Pizza after the final round!",
    }),
    t({
      id: "pb-t-junior-classic", title: "MK3 Junior Pickleball Classic",
      start: at(addDays(saturday, 21), "08:00"), end: at(addDays(saturday, 21), "15:00"),
      location: "Black Mountain Middle School Courts", divisions: ["Junior Singles 12U", "Junior Singles 14U", "Junior Doubles 14U", "Junior Doubles 18U"], adultEvent: false,
      deadline: at(addDays(today, 10), "23:59"), capacity: 48, baseRegistered: 27, fee: "$25 per event",
      details: "Our junior tournament: pool play, then a single-elimination bracket. Games to 11, win by 2; medal matches to 15. Players should check in 30 minutes before their first match.",
    }),
    t({
      id: "pb-t-winter-doubles", title: "SoCal Winter Doubles Shootout",
      start: at(addDays(saturday, 36), "09:00"), end: at(addDays(saturday, 36), "17:00"),
      location: "Ridgewood Park Courts", divisions: ["Men's Doubles 3.0", "Men's Doubles 3.5", "Women's Doubles 3.0", "Women's Doubles 3.5", "Mixed Doubles 4.0+"], adultEvent: true,
      deadline: at(addDays(today, 24), "23:59"), capacity: 64, baseRegistered: 30, fee: "$45 per team",
      details: "Skill-rated doubles for adults. No partner? Sign up anyway — we'll pair solo players by rating.",
    }),
    t({
      id: "pb-t-skinny-singles", title: "New Year Skinny Singles Showdown",
      start: at(addDays(saturday, 49), "09:00"), end: at(addDays(saturday, 49), "14:00"),
      location: "Ridgewood Park Courts", divisions: ["Skinny Singles 3.5", "Skinny Singles 4.0+"], adultEvent: true,
      deadline: at(addDays(today, 30), "23:59"), capacity: 24, baseRegistered: 24, fee: "$30",
      details: "Half-court singles — great practice for dinking and placement. Currently full; message an admin to join the waitlist.",
    }),
    t({
      id: "pb-t-senior-classic", title: "Spring Senior Doubles Classic",
      start: at(addDays(saturday, 84), "08:30"), end: at(addDays(saturday, 84), "16:00"),
      location: "Ridgewood Park Courts", divisions: ["Senior Mixed Doubles 50+ 3.5", "Senior Mixed Doubles 50+ 4.0", "Senior Men's Doubles 60+", "Senior Women's Doubles 60+"], adultEvent: true,
      opensAt: at(addDays(today, 40), "09:00"), deadline: at(addDays(today, 70), "23:59"), capacity: 48, baseRegistered: 0, fee: "$40 per team",
      details: "Age-group doubles for players 50 and over.",
    }),
  );

  const announcements = [
    {
      id: "pb-a-junior-classic", category: "reminder", authorId: "u-admin", createdAt: ago(24 * 5),
      title: "Registration is open: MK3 Junior Pickleball Classic",
      body: "Sign-ups for the Junior Pickleball Classic are open on the Tournaments page — 12U and 14U singles, plus 14U and 18U doubles. Spots are limited, so register before the deadline.",
      eventId: "pb-t-junior-classic",
    },
    {
      id: "pb-a-holiday", category: "general", authorId: "u-owner", createdAt: ago(24 * 2),
      title: "Holiday Round Robin — brackets posted Saturday",
      body: "Registration for the Holiday Mixed Doubles Round Robin is closed. Partners and court assignments will be posted at the courts on Saturday. Bring your paddle and a water bottle!",
      eventId: "pb-t-holiday-rr",
    },
    {
      id: "pb-a-cancel", category: "cancellation", authorId: "u-owner", createdAt: ago(3),
      title: `No Youth Pickleball on ${fmtShortDate(at(cancelledDay, "16:00"))}`,
      body: "The Black Mountain Middle School courts are being resurfaced that afternoon, so Youth Pickleball practice is cancelled. Practice is on as usual Monday through Wednesday.",
      eventId: cancelledId,
    },
  ];

  const nextSat = addDays(today, ((6 - today.getDay() + 7) % 7) || 7);
  const registrations = [
    {
      id: "pb-r-seed-1", eventId: "pb-t-junior-classic", playerId: "p-mia", division: "Junior Singles 12U",
      userId: "u-jordan", createdAt: ago(24 * 4), code: "MK3-P4K1",
    },
    {
      id: "pb-r-seed-2", eventId: `pb-open-${ymd(nextSat)}`, playerId: "p-tom", division: null,
      userId: "u-tom", createdAt: ago(24 * 1), code: "MK3-P9Q2",
    },
  ];

  const spotlights = [
    {
      id: "pb-s-mia", playerId: "p-mia", authorId: "u-admin", publishedAt: ago(24 * 6),
      headline: "Mia's soft game is coming together",
      improved: "Dinking — Mia now stays patient at the kitchen line and keeps her dinks low instead of speeding the ball up too early.",
      example: "In Thursday's cross-court dinking drill she hit 18 dinks in a row without popping one up (up from 6 in October).",
      nextSkill: "A consistent third-shot drop from the baseline.",
      coachingNotes: "Mia opens her paddle face on backhand dinks, which floats the ball. Home practice: 10 minutes of wall dinks 3x/week with a continental grip. Re-check at the Junior Classic.",
    },
    {
      id: "pb-s-diego", playerId: "p-diego", authorId: "u-owner", publishedAt: ago(24 * 12),
      headline: "Diego's returns are deep and on target",
      improved: "Return of serve — Diego hits deep returns and gets to the kitchen line right after.",
      example: "In Tuesday's match play he landed 8 of 10 returns deep in the court and won 5 straight points at the net.",
      nextSkill: "Resetting hard drives in the transition zone.",
      coachingNotes: "PRIVATE (Diego / guardian / staff): Diego mentioned wrist soreness after Monday's session — limit overhead smashes for two weeks and check in with his parent before the Junior Classic.",
    },
  ];

  const conversations = [
    {
      id: "pb-c-paddle", memberId: "u-jordan", to: "owner", subject: "Paddle recommendation for Mia?", playerId: "p-mia",
      messages: [
        { id: "m1", from: "u-jordan", at: ago(24 * 6), body: "Hi Dana! Mia loves the Thursday sessions. Should we buy her own paddle, or keep using the loaner paddles for now?" },
        { id: "m2", from: "u-owner", at: ago(24 * 5), body: "Hi Jordan — a lighter, midweight paddle would suit her well. Coach Luis can bring a few for her to try on Thursday." },
        { id: "m3", from: "u-jordan", at: ago(24 * 2), body: "Perfect, thanks! Is she ready for Junior Singles 12U at the Junior Classic?" },
        { id: "m4", from: "u-owner", at: ago(20), body: "Yes — she's already registered for 12U singles, and her dinking has really improved!" },
      ],
      readAt: { member: ago(24 * 2), staff: ago(20) },
    },
    {
      id: "pb-c-schedule", memberId: "u-renee", to: "admin", subject: "Can Diego switch to Thursday sessions?", playerId: "p-diego",
      messages: [
        { id: "m5", from: "u-renee", at: ago(3), body: "Hi Luis, Diego has a conflict on Tuesdays this month. Can he come on Thursdays instead?" },
      ],
      readAt: { member: ago(3), staff: ago(48) },
    },
  ];

  return { version: DATA_VERSION, sport: "pickleball", users, players, events, announcements, registrations, spotlights, conversations };
}

module.exports = { seed, DATA_VERSION };
