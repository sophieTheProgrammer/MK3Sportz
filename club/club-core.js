/*
 * MK3 Sportz – shared club rules for every sport.
 * Used by the browser app (window.ClubCore) and by the server (require), so the sign-up
 * eligibility and registration-status rules are defined once and the server enforces
 * exactly what members see. Each sport's catalog lives in club/sports/<sport>.js.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ClubCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const WHO_LABEL = { junior: "Junior players", adult: "Adults", all: "Anyone (juniors and adults)" };
  const parse = (s) => new Date(s);

  // ----- sport registry (club/sports/<sport>.js register themselves in the browser)
  const sports = {};
  const registerSport = (config) => { sports[config.id] = config; return config; };
  const sport = (id) => sports[id];

  /** The class a practice belongs to: staff-scheduled sessions carry `classId`; seeded ones use an id prefix. */
  function classOf(sportConfig, ev) {
    if (!ev || ev.type !== "practice") return undefined;
    return sportConfig.classes.find((c) => (ev.classId ? c.id === ev.classId : c.prefix && ev.id.startsWith(c.prefix)));
  }

  /** Who may sign up for an event: "junior" | "adult" | "all". */
  function eligibilityOf(sportConfig, ev) {
    if (ev.type === "tournament") return ev.adultEvent ? "adult" : "junior";
    const cls = classOf(sportConfig, ev);
    return ev.eligibility || (cls && sportConfig.classDefaults[cls.id] && sportConfig.classDefaults[cls.id].eligibility) || "adult";
  }

  /** Registration status shown to members and enforced by the server. */
  function regStatus(ev, { count = ev.registeredCount || 0, now = new Date(), fmtShortDate = (x) => x.slice(0, 10) } = {}) {
    if (!ev.requiresRegistration) return { key: "none", label: "No sign-up needed", cls: "text-bg-light border", open: false };
    if (ev.cancelled) return { key: "cancelled", label: "Cancelled", cls: "text-bg-dark", open: false };
    if (parse(ev.end) < now) return { key: "past", label: "Event ended", cls: "text-bg-secondary", open: false };
    // Staff can override the registration dates: ev.signups = "open" | "closed" (unset = follow the dates).
    if (ev.signups === "closed") return { key: "closed", label: "Sign-ups closed", cls: "text-bg-secondary", open: false, manual: true };
    const forced = ev.signups === "open";
    if (!forced && ev.opensAt && parse(ev.opensAt) > now) return { key: "soon", label: `Opens ${fmtShortDate(ev.opensAt)}`, cls: "text-bg-info", open: false };
    const deadline = parse(ev.deadline || ev.start);
    if (!forced && deadline < now) return { key: "closed", label: "Registration closed", cls: "text-bg-secondary", open: false };
    if (ev.capacity && count >= ev.capacity) return { key: "full", label: "Full – waitlist only", cls: "text-bg-warning", open: false };
    const left = ev.capacity ? ev.capacity - count : null;
    return { key: "open", label: left != null ? `Open · ${left} spot${left === 1 ? "" : "s"} left` : "Open", cls: "text-bg-success", open: true, manual: forced };
  }

  /**
   * Web versions of an academy's artwork, built from brand-originals/ by `npm run build:brand`
   * into /images/brand/<sport>/. `original` names the source file inside the academy folder.
   */
  function brandKit({ sport, academy, code, apparelSizes, sheetHeight }) {
    const dir = `/images/brand/${sport}/`;
    const clear = "CLEAR Background (PNG Files)/";
    const art = (file, width, height, extra) => Object.assign({ src: dir + file, width, height }, extra);
    const apparel = [
      ["apparel-1-one-color-dark.png", "dark", "One-color print", "White ink · for dark shirts", "ONE Color (Dark BKGD)"],
      ["apparel-2-one-color-light.png", "light", "One-color print", "Black ink · for light shirts", "ONE Color (Light BKGD)"],
      ["apparel-3-full-color-light.png", "light", "Full-color print", "For white and light shirts", "Light Color BKGD"],
      ["apparel-4-full-color-dark.png", "dark", "Full-color print", "For black and dark shirts", "Dark Color BKGD"],
    ];
    return {
      academy,
      designer: "NACU",
      favicon: dir + "favicon-64.png",
      logo: art("crest-light-160.png", 160, 194, { srcset: `${dir}crest-light-160.png 160w, ${dir}crest-light-400.png 400w`, alt: `${academy} crest` }),
      signInLogo: art("crest-light-400.png", 400, 486, { alt: `${academy} crest` }),
      heroLogo: art("crest-dark-480.png", 480, 583, { alt: `${academy} crest` }),
      logos: [
        art("crest-light-800.png", 800, 972, { tile: "light", title: "Crest · full color", use: "For white and light backgrounds", original: `${clear}${code}-White-BKGD-by-NACU.png` }),
        art("crest-dark-800.png", 800, 972, { tile: "dark", title: "Crest · full color", use: "For black and dark backgrounds", original: `${clear}${code}-Black-BKGD-by-NACU.png` }),
        art("crest-dark-v2-800.png", 800, 972, { tile: "dark", title: "Crest · alternate (v2)", use: "Grey shield, for dark backgrounds", original: `${clear}${code}-Black-BKGD-v2-by-NACU.png` }),
        art("circle-white-600.png", 600, 622, { tile: "muted", title: "Profile badge · white", use: "Round profile picture", original: `${code}-White-Circle-Profile.png` }),
        art("circle-black-600.png", 600, 622, { tile: "muted", title: "Profile badge · black", use: "Round profile picture", original: `${code}-Black-Circle-Profile.png` }),
      ],
      apparel: apparel.map(([file, tile, title, use, label], i) => art(file, apparelSizes[i][0], apparelSizes[i][1],
        { tile, title, use, original: `Shirt Vendor Files/${code}-Seperations by-NACU.svg — “${label}”` })),
      sheet: art("apparel-sheet-1600.png", 1600, sheetHeight, { original: `Shirt Vendor Files/${code}-Seperations by-NACU.svg (.ai and .eps are the same artwork)` }),
    };
  }

  return { WHO_LABEL, registerSport, sport, classOf, eligibilityOf, regStatus, brandKit };
});
