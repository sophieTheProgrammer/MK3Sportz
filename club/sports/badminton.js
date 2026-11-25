/*
 * Badminton club content (from the original badminton programs page, sports/badminton.html).
 * Shared by the browser app and the server.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("../club-core.js"));
  else root.ClubCore.registerSport(factory(root.ClubCore));
})(typeof self !== "undefined" ? self : this, function (Core) {
  "use strict";
  return {
    id: "badminton",
    name: "Badminton",
    clubName: "San Diego Badminton Academy",
    byline: "by MK3 Sportz",
    pageTitle: "SD Badminton Academy · MK3 Sportz",
    mapArea: "San Diego CA",
    hero: {
      title: "San Diego Badminton Academy",
      lead: "A non-profit club by MK3 Sportz — fostering a fun, safe and secure environment for players to thrive.",
      sub: "Where sports and fun come together!",
      darkText: false,
    },
    // Academy artwork (brand-originals/SD Badminton Academy → images/brand/badminton)
    brand: Core.brandKit({
      sport: "badminton", academy: "SD Badminton Academy", code: "SDBA",
      apparelSizes: [[700, 819], [700, 802], [700, 802], [700, 700]], sheetHeight: 514,
    }),
    venues: ["Canyon Crest Academy", "Canyon Crest Academy Gym", "Oak Valley Middle School", "Oak Valley Middle School Gym"],
    examples: {
      improved: "e.g. footwork recovery, net play, serve consistency.",
      divisions: "For example: U13 Singles, Mixed Doubles B.",
      sessionTitle: "e.g. Holiday Footwork Clinic",
      cancelReason: "e.g. The gym is reserved for a school event.",
    },

    // Class catalog. `prefix` links a class to its seeded practice sessions.
    classes: [
      {
        id: "general", prefix: "pr-gen-", title: "General Group Practice", level: "All levels", enrollment: "enroll",
        days: "Saturdays", time: "4:00 – 6:00 PM", location: "Canyon Crest Academy", who: "Kids of all ages and skill levels",
        details: "Our core youth program: footwork, fundamentals and fun game play. Wear comfortable athletic clothes & shoes and bring plenty of water.",
        enroll: {
          formUrl: "https://docs.google.com/forms/d/e/1FAIpQLSeZQzLYxd_PzV2yNkvP3-uByBAQKE4eoQf0tN_MLadq2oUG4A/viewform?usp=sf_link",
          payUrl: "https://square.link/u/pUvQOOjE",
          payment: "Payments are due at the beginning of each month. A 10% late fee applies to payments received after the 5th.",
          payNote: "At checkout, enter the participant's first and last name and program in the “Note to Seller” field.",
          cash: "Place cash in an envelope with your full name and your children's names.",
          discountsTitle: "Discounts & scholarships",
          discounts: [
            ["Sibling discount", "10% off for the 2nd and 3rd sibling"],
            ["Refer-a-friend", "10% off — badminton is more fun with friends!"],
            ["Scholarships", "available upon request and financial review"],
          ],
        },
      },
      {
        id: "intermediate", prefix: null, title: "Intermediate Group Practice", level: "Intermediate", enrollment: "qualify",
        days: "Shared with qualified players", time: "Shared with qualified players", location: "Shared with qualified players", who: "Qualified 7th, 8th & 9th graders",
        details: "A step up from General Group for players who are ready for more structured drills and match play. Coaches invite players based on progress — message staff to ask about moving up.",
      },
      {
        id: "elite", prefix: "pr-elite-", title: "Elite Group Practice", level: "Advanced", enrollment: "qualify",
        days: "Saturdays & Sundays", time: "4:00 – 6:00 PM", location: "Oak Valley Middle School", who: "Qualified 8th, 9th & varsity-level players",
        details: "High-intensity drills, match play and tournament preparation for our most experienced juniors.",
      },
      {
        id: "private", prefix: null, title: "Private Lessons", level: "All levels", enrollment: "book",
        days: "Saturdays & Sundays", time: "4:00 – 7:00 PM", location: "Oak Valley Middle School", who: "All ages and skill levels",
        details: "One-on-one or small-group coaching tailored to the player's goals. Message the owner or an admin to request a time slot.",
      },
      {
        id: "adult-open", prefix: "pr-adult-", title: "Adult Open Play", level: "All levels", enrollment: "session", sample: true,
        days: "Wednesdays", time: "7:00 – 9:00 PM", location: "Oak Valley Middle School", who: "Adults, all skill levels",
        details: "Coached warm-up followed by rotating doubles. Sign up for each session you plan to attend — limited to 16 spots per week. Shuttles provided.",
      },
      {
        id: "adult-lessons", prefix: null, title: "Adult Group Lessons", level: "All levels", enrollment: "soon",
        days: "Coming soon", time: "To be announced", location: "To be announced", who: "Adults, all skill levels",
        details: "Group lessons for adults are coming soon! Message us to join the interest list and we'll send you the registration link and details.",
      },
    ],

    // Defaults used when staff schedule a session for a class.
    classDefaults: {
      general: { start: "16:00", end: "18:00", location: "Canyon Crest Academy", signup: false, eligibility: "junior" },
      intermediate: { signup: false, eligibility: "junior" },
      elite: { start: "16:00", end: "18:00", location: "Oak Valley Middle School", signup: false, eligibility: "junior" },
      private: { start: "16:00", end: "17:00", location: "Oak Valley Middle School", signup: false, eligibility: "all" },
      "adult-open": { start: "19:00", end: "21:00", location: "Oak Valley Middle School", signup: true, capacity: 16, eligibility: "adult" },
      "adult-lessons": { signup: true, capacity: 12, eligibility: "adult" },
      other: { eligibility: "all" },
    },
  };
});
