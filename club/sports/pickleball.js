/*
 * Pickleball club content. Youth and adult program details come from the original pages
 * (sports/pickleball.html and sports/adultpickleball.html); classes marked `sample: true`
 * are fictional placeholders until real details exist. Shared by the browser app and the server.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("../club-core.js"));
  else root.ClubCore.registerSport(factory(root.ClubCore));
})(typeof self !== "undefined" ? self : this, function (Core) {
  "use strict";
  return {
    id: "pickleball",
    name: "Pickleball",
    clubName: "San Diego Pickleball Academy",
    byline: "by MK3 Sportz",
    pageTitle: "SD Pickleball Academy · MK3 Sportz",
    mapArea: "San Diego CA",
    hero: {
      title: "San Diego Pickleball Academy",
      lead: "Youth pickleball with the San Diego Pickleball Academy and adult pickleball for every skill level — run by MK3 Sportz, a non-profit fostering a fun, safe and secure environment for players to thrive.",
      sub: "Where sports and fun come together!",
      darkText: false,
    },
    // Academy artwork (brand-originals/SD Pickleball Academy → images/brand/pickleball)
    brand: Core.brandKit({
      sport: "pickleball", academy: "SD Pickleball Academy", code: "SDPA",
      apparelSizes: [[700, 830], [700, 799], [700, 798], [700, 700]], sheetHeight: 488,
    }),
    venues: ["Black Mountain Middle School", "Black Mountain Middle School Courts", "Ridgewood Park", "Ridgewood Park Courts"],
    examples: {
      improved: "e.g. third-shot drops, patient dinking at the kitchen line, deep serves and returns.",
      divisions: "For example: Mixed Doubles 3.5, Junior Doubles 14U, Senior Mixed Doubles 50+.",
      sessionTitle: "e.g. Third-Shot Drop Clinic",
      cancelReason: "e.g. The courts are being resurfaced.",
    },

    // Class catalog. `prefix` links a class to its seeded practice sessions.
    classes: [
      {
        id: "youth", prefix: "pb-youth-", title: "Youth Pickleball – San Diego Pickleball Academy", level: "All levels", enrollment: "enroll",
        days: "Mondays – Thursdays", time: "4:00 – 5:30 PM", location: "Black Mountain Middle School",
        who: "Elementary, middle and high school students — open to all skill levels",
        details: "After-school pickleball four days a week: paddle skills, serves and returns, dinking at the kitchen line, the third-shot drop and plenty of game play.",
        enroll: {
          formUrl: "https://docs.google.com/forms/d/e/1FAIpQLScpKxwfzSAwJ_6ZS44UJ_BA5TXCdolLHvLL-iOIgbhMAQe56A/viewform",
          payUrl: null,
          pricing: ["$200 per month (non-refundable)"],
          discountsTitle: "Discounts",
          discounts: [["Sibling discount", "10% off for the second and third sibling"]],
          bring: "Comfortable, athletic clothing and shoes, and a water bottle clearly marked with your child's name.",
        },
      },
      {
        id: "adult", prefix: "pb-adult-", title: "Adult Pickleball", level: "All levels", enrollment: "enroll",
        days: "Mondays, Wednesdays & Sundays", time: "Mon & Wed 5:30 – 7:00 PM · Sun 8:00 – 10:00 AM", location: "Ridgewood Park",
        who: "Adults — open to all skill levels",
        details: "Coached adult sessions with drills and rotating doubles, from first-time players to tournament regulars.",
        enroll: {
          formUrl: "https://forms.gle/PncBwLH6Am1zgh278",
          payUrl: "https://square.link/u/pUvQOOjE",
          pricing: ["$100/month (non-refundable)", "$150/month per couple", "Drop-in (non-members): $15 cash only — must be accompanied by a current member"],
          discountsTitle: "Discounts",
          discounts: [["Family discount", "15% off"], ["Refer-a-friend", "10% off (applied once your friend signs up)"]],
        },
      },
      {
        id: "open-play", prefix: "pb-open-", title: "Saturday Open Play", level: "All levels", enrollment: "session", sample: true,
        days: "Saturdays", time: "9:00 – 11:00 AM", location: "Ridgewood Park", who: "Adults, all skill levels",
        details: "Rotating doubles on four courts using a paddle queue, so everyone keeps playing. Sign up for each session you plan to attend — 16 spots per week. Balls provided; bring your own paddle.",
      },
      {
        id: "clinic", prefix: null, title: "Skills Clinics", level: "All levels", enrollment: "session", sample: true,
        days: "About twice a month", time: "Saturdays after open play", location: "Ridgewood Park", who: "Juniors and adults",
        details: "Small-group clinics on one skill at a time — third-shot drops, dinking, resets in the transition zone, and stacking with a partner. Sign up for each clinic.",
      },
      {
        id: "private", prefix: null, title: "Private Lessons", level: "All levels", enrollment: "book", sample: true,
        days: "By appointment", time: "By appointment", location: "Ridgewood Park", who: "All ages and skill levels",
        details: "One-on-one or two-on-one coaching on a specific shot or strategy. Message the owner or an admin to request a time.",
      },
    ],

    // Defaults used when staff schedule a session for a class.
    classDefaults: {
      youth: { start: "16:00", end: "17:30", location: "Black Mountain Middle School", signup: false, eligibility: "junior" },
      adult: { start: "17:30", end: "19:00", location: "Ridgewood Park", signup: false, eligibility: "adult" },
      "open-play": { start: "09:00", end: "11:00", location: "Ridgewood Park", signup: true, capacity: 16, eligibility: "adult" },
      clinic: { start: "11:30", end: "13:00", location: "Ridgewood Park", signup: true, capacity: 12, eligibility: "all" },
      private: { start: "09:00", end: "10:00", location: "Ridgewood Park", signup: false, eligibility: "all" },
      other: { eligibility: "all" },
    },
  };
});
