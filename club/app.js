/*
 * MK3 Sportz – Badminton Club hub (demo)
 * Single-page app using the site's existing stack (Bootstrap 5 + jQuery).
 * All people, messages, registrations and tournaments are FICTIONAL SAMPLE DATA.
 * Demo state is saved in localStorage so changes survive a refresh.
 * NOTE: privacy rules here are enforced in the browser for demo purposes only;
 * a production site must enforce them on a server.
 */
(function () {
  "use strict";

  const STORE_KEY = "mk3-badminton-demo-v1";
  const MEMBER_ID = "u-jordan"; // the demo "Adult Member"
  const ADMIN_ID = "u-admin"; // the demo "Admin"

  // ---------------------------------------------------------------- helpers
  const pad = (n) => String(n).padStart(2, "0");
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const at = (d, hhmm) => `${ymd(d)}T${hhmm}`;
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const parse = (s) => new Date(s);
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const fmtDate = (s) => parse(s).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const fmtShortDate = (s) => parse(s).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const fmtTime = (s) => parse(s).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const fmtStamp = (s) => parse(s).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const isoNow = () => new Date().toISOString();
  const uid = (p) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const escBr = (s) => esc(s).replace(/\n/g, "<br>");
  const sampleTag = '<span class="badge rounded-pill text-bg-light border sample-tag">Sample</span>';

  // ---------------------------------------------------------------- seed data
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

    return {
      version: 1, role: "member", users, players, events, announcements, registrations, spotlights, conversations,
      ui: { calMonth: ymd(today).slice(0, 7), selectedDay: null, filters: { practice: true, tournament: true } },
      spotlightDraft: null,
    };
  }

  // ---------------------------------------------------------------- store
  let state;
  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) { state = JSON.parse(raw); if (state && state.version === 1) return; }
    } catch (e) { /* ignore and reseed */ }
    state = seed();
    save();
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { console.warn("Could not save demo data", e); }
  }

  // ---------------------------------------------------------------- selectors / rules
  const isAdmin = () => state.role === "admin";
  const me = () => state.users[isAdmin() ? ADMIN_ID : MEMBER_ID];
  const user = (id) => state.users[id] || { name: "Club member", title: "" };
  const player = (id) => state.players.find((p) => p.id === id);
  const event = (id) => state.events.find((e) => e.id === id);
  const tournaments = () => state.events.filter((e) => e.type === "tournament").sort(byStart);
  const byStart = (a, b) => parse(a.start) - parse(b.start);
  const upcoming = (e) => parse(e.end) >= new Date();

  // Players the current member may register / see private notes for: themselves + dependants.
  const myPlayers = () => state.players.filter((p) => p.userId === MEMBER_ID || p.guardians.includes(MEMBER_ID));

  function canSeeNotes(spot) {
    if (isAdmin()) return true; // authorised staff
    const p = player(spot.playerId);
    return !!p && (p.userId === me().id || p.guardians.includes(me().id));
  }

  const regsFor = (evId) => state.registrations.filter((r) => r.eventId === evId);
  const regCount = (ev) => (ev.baseRegistered || 0) + regsFor(ev.id).length;

  function regStatus(ev) {
    const now = new Date();
    if (!ev.requiresRegistration) return { key: "none", label: "No sign-up needed", cls: "text-bg-light border", open: false };
    if (ev.cancelled) return { key: "cancelled", label: "Cancelled", cls: "text-bg-dark", open: false };
    if (parse(ev.end) < now) return { key: "past", label: "Event ended", cls: "text-bg-secondary", open: false };
    // Staff can override the registration dates: ev.signups = "open" | "closed" (unset = follow the dates).
    if (ev.signups === "closed") return { key: "closed", label: "Sign-ups closed", cls: "text-bg-secondary", open: false, manual: true };
    const forced = ev.signups === "open";
    if (!forced && ev.opensAt && parse(ev.opensAt) > now) return { key: "soon", label: `Opens ${fmtShortDate(ev.opensAt)}`, cls: "text-bg-info", open: false };
    const deadline = parse(ev.deadline || ev.start);
    if (!forced && deadline < now) return { key: "closed", label: "Registration closed", cls: "text-bg-secondary", open: false };
    const taken = regCount(ev);
    if (ev.capacity && taken >= ev.capacity) return { key: "full", label: "Full – waitlist only", cls: "text-bg-warning", open: false };
    const left = ev.capacity ? ev.capacity - taken : null;
    return { key: "open", label: left != null ? `Open · ${left} spot${left === 1 ? "" : "s"} left` : "Open", cls: "text-bg-success", open: true, manual: forced };
  }
  const statusBadge = (ev) => { const s = regStatus(ev); return `<span class="badge ${s.cls}">${esc(s.label)}</span>`; };
  const typeBadge = (ev) => ev.type === "tournament"
    ? '<span class="badge text-bg-tournament">Tournament</span>'
    : '<span class="badge text-bg-practice">Practice</span>';

  // Conversations
  const visibleConvos = () => state.conversations
    .filter((c) => isAdmin() || c.memberId === MEMBER_ID)
    .sort((a, b) => parse(last(b).at) - parse(last(a).at));
  const last = (c) => c.messages[c.messages.length - 1];
  const isStaffId = (id) => ["owner", "admin"].includes(user(id).role);
  function unreadIn(c) {
    const side = isAdmin() ? "staff" : "member";
    const readAt = parse(c.readAt[side] || 0);
    return c.messages.filter((m) => (isAdmin() ? !isStaffId(m.from) : isStaffId(m.from)) && parse(m.at) > readAt).length;
  }
  const totalUnread = () => visibleConvos().reduce((n, c) => n + unreadIn(c), 0);

  const catMeta = {
    cancellation: { label: "Practice cancellation", cls: "text-bg-danger" },
    change: { label: "Practice change", cls: "text-bg-warning" },
    reminder: { label: "Tournament reminder", cls: "text-bg-primary" },
    general: { label: "Club update", cls: "text-bg-secondary" },
  };

  // ---------------------------------------------------------------- UI helpers
  function toast(msg, kind = "success") {
    const el = $(`<div class="toast align-items-center text-bg-${kind} border-0" role="status" aria-live="polite" aria-atomic="true">
      <div class="d-flex"><div class="toast-body">${msg}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div></div>`);
    $("#toasts").append(el);
    const t = new bootstrap.Toast(el[0], { delay: 4000 });
    el.on("hidden.bs.toast", () => el.remove());
    t.show();
  }
  const modal = () => bootstrap.Modal.getOrCreateInstance(document.getElementById("eventModal"));
  function showModal(title, body) {
    $("#eventModalTitle").html(title);
    $("#eventModalBody").html(body);
    modal().show();
    // keep focus inside the dialog when its content is swapped (Esc to close keeps working)
    const first = document.querySelector("#eventModalBody input, #eventModalBody select, #eventModalBody .btn");
    (first || document.getElementById("eventModal")).focus({ preventScroll: true });
  }
  const go = (hash) => { if (location.hash === hash) render(); else location.hash = hash; };

  function pageHeader(title, sub, actions = "") {
    return `<div class="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-3">
      <div><h1 class="h3 mb-1">${title}</h1>${sub ? `<p class="text-muted mb-0">${sub}</p>` : ""}</div>${actions}</div>`;
  }
  const notFound = (what) => `<div class="alert alert-warning">That ${what} could not be found. <a href="#/">Back to home</a></div>`;

  // ---------------------------------------------------------------- event details (shared by modal & pages)
  function eventDetails(ev) {
    const rows = [
      ["Date", fmtDate(ev.start)],
      ["Time", `${fmtTime(ev.start)} – ${fmtTime(ev.end)}`],
      [ev.type === "tournament" ? "Venue" : "Location", `${esc(ev.location)} <a class="small ms-1" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.location + " San Diego CA")}">Map</a>`],
    ];
    const cls = classOf(ev);
    if (cls) rows.push(["Class", `<a href="#/classes/${esc(cls.id)}" data-action="modal-go">${esc(cls.title)}</a>`]);
    if (ev.audience) rows.push(["Who", esc(ev.audience)]);
    else if (ev.type === "tournament") rows.push(["Who can enter", ev.adultEvent ? "Adults" : "Junior players"]);
    if (ev.divisions) rows.push(["Divisions", ev.divisions.map((d) => `<span class="badge text-bg-light border me-1 mb-1">${esc(d)}</span>`).join("")]);
    if (ev.fee) rows.push(["Entry fee", esc(ev.fee)]);
    if (ev.requiresRegistration) {
      if (ev.opensAt) rows.push(["Registration opens", fmtDate(ev.opensAt)]);
      rows.push(["Registration deadline", ev.deadline ? `${fmtDate(ev.deadline)}, ${fmtTime(ev.deadline)}` : "Day of event"]);
      rows.push(["Registration", `${statusBadge(ev)}${ev.capacity ? ` <span class="small text-muted">${regCount(ev)} / ${ev.capacity} registered</span>` : ""}${isAdmin() && ev.signups ? ' <span class="small text-muted">(set manually by staff)</span>' : ""}`]);
    } else {
      rows.push(["Registration", statusBadge(ev)]);
    }
    return `
      ${ev.cancelled ? `<div class="alert alert-danger py-2"><strong>Cancelled.</strong> ${ev.cancelReason ? esc(ev.cancelReason) : "See announcements for details."}</div>` : ""}
      ${ev.rescheduledFrom && !ev.cancelled ? `<div class="alert alert-warning py-2"><strong>Rescheduled.</strong> Originally ${fmtDate(ev.rescheduledFrom)} at ${fmtTime(ev.rescheduledFrom)}.</div>` : ""}
      <div class="mb-2">${typeBadge(ev)} ${ev.sample ? sampleTag : ""}</div>
      <dl class="row mb-2">${rows.map(([k, v]) => `<dt class="col-sm-4 text-muted fw-normal">${k}</dt><dd class="col-sm-8">${v}</dd>`).join("")}</dl>
      <p class="mb-3 pre-wrap">${esc(ev.details || "")}</p>
      ${regControls(ev)}
      ${adminEventActions(ev)}`;
  }

  function regControls(ev) {
    if (!ev.requiresRegistration) return "";
    const st = regStatus(ev);
    const regs = regsFor(ev.id);
    if (isAdmin()) {
      return `<div class="border rounded p-2 bg-light" id="adminRegBox">
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div class="small"><span class="fw-semibold">Sign-ups:</span> ${regCount(ev)}${ev.capacity ? ` / ${ev.capacity}` : ""} registered</div>
          <div class="d-flex flex-wrap gap-2">${signupToggle(ev)}<a href="#/admin/signups/${esc(ev.id)}" class="btn btn-sm btn-outline-secondary" data-action="modal-go">View registered players</a></div>
        </div>
        <div class="small text-muted mt-1">Switch to <em>Adult Member</em> to test signing up.</div></div>`;
    }
    const mine = regs.filter((r) => r.userId === MEMBER_ID);
    const eligibleLeft = eligiblePlayers(ev).filter((p) => !mine.some((r) => r.playerId === p.id));
    return `
      ${mine.length ? `<div class="alert alert-success py-2 mb-2"><strong>You're registered:</strong> ${mine.map((r) => `${esc(player(r.playerId)?.name)}${r.division ? ` (${esc(r.division)})` : ""}`).join(", ")}</div>` : ""}
      ${st.open && eligibleLeft.length
        ? `<button class="btn btn-brand" data-action="open-register" data-id="${esc(ev.id)}">${mine.length ? "Register another player" : "Register"}</button>`
        : st.open ? "" : `<div class="small text-muted">Online sign-up is not available (${esc(st.label.toLowerCase())}).</div>`}`;
  }

  function eligiblePlayers(ev) {
    const who = eligibilityOf(ev);
    return myPlayers().filter((p) => who === "all" || (who === "adult" ? p.adult : !p.adult));
  }

  function openEventModal(id) {
    const ev = event(id);
    if (!ev) return;
    const link = ev.type === "tournament" ? `<a href="#/tournaments/${esc(ev.id)}" class="btn btn-link px-0" data-action="modal-go">Open full tournament page →</a>` : "";
    showModal(esc(ev.title), eventDetails(ev) + `<div class="mt-2">${link}</div>`);
  }

  function openRegister(id) {
    const ev = event(id);
    if (!ev) return;
    const st = regStatus(ev);
    const mine = regsFor(ev.id).filter((r) => r.userId === MEMBER_ID);
    const options = eligiblePlayers(ev).filter((p) => !mine.some((r) => r.playerId === p.id));
    if (isAdmin()) return showModal("Registration", '<p>Switch to the <strong>Adult Member</strong> role to register.</p>');
    if (!st.open || !options.length) return showModal("Registration unavailable", `<p>Sign-ups for <strong>${esc(ev.title)}</strong> are not available right now.</p>`);
    showModal(`Register: ${esc(ev.title)}`, `
      <p class="small text-muted mb-3">${fmtDate(ev.start)} · ${fmtTime(ev.start)} – ${fmtTime(ev.end)} · ${esc(ev.location)}</p>
      <form data-form="register" data-id="${esc(ev.id)}" novalidate>
        <div class="mb-3">
          <label class="form-label" for="regPlayer">Player</label>
          <select class="form-select" id="regPlayer" name="playerId" required>
            ${options.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}${p.userId === MEMBER_ID ? " (me)" : ""}</option>`).join("")}
          </select>
        </div>
        ${ev.divisions ? `<div class="mb-3">
          <label class="form-label" for="regDivision">Division</label>
          <select class="form-select" id="regDivision" name="division" required>
            <option value="">Choose a division…</option>
            ${ev.divisions.map((d) => `<option>${esc(d)}</option>`).join("")}
          </select>
          <div class="invalid-feedback">Please choose a division.</div>
        </div>` : ""}
        <div class="form-check mb-3">
          <input class="form-check-input" type="checkbox" id="regAgree" name="agree" required>
          <label class="form-check-label" for="regAgree">I agree to the club code of conduct and waiver (sample).</label>
          <div class="invalid-feedback">Please accept to continue.</div>
        </div>
        ${ev.fee ? `<p class="small text-muted">Entry fee ${esc(ev.fee)} is collected separately (demo — no payment is taken).</p>` : ""}
        <div class="d-flex gap-2">
          <button type="submit" class="btn btn-brand">Confirm registration</button>
          <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
        </div>
      </form>`);
  }

  function submitRegister(form) {
    const ev = event(form.dataset.id);
    form.classList.add("was-validated");
    if (!form.checkValidity() || !ev || !regStatus(ev).open) return;
    const fd = new FormData(form);
    const reg = {
      id: uid("r"), eventId: ev.id, playerId: fd.get("playerId"), division: fd.get("division") || null,
      userId: MEMBER_ID, createdAt: isoNow(),
      code: "MK3-" + Math.random().toString(36).slice(2, 6).toUpperCase(),
    };
    state.registrations.push(reg);
    save();
    showModal("Registration confirmed", `
      <div class="text-center py-2">
        <div class="display-6 text-success mb-2" aria-hidden="true">✓</div>
        <h2 class="h5">You're signed up!</h2>
        <p class="mb-1"><strong>${esc(player(reg.playerId).name)}</strong> is registered for <strong>${esc(ev.title)}</strong>${reg.division ? ` in <strong>${esc(reg.division)}</strong>` : ""}.</p>
        <p class="text-muted small mb-1">${fmtDate(ev.start)} · ${fmtTime(ev.start)} – ${fmtTime(ev.end)} · ${esc(ev.location)}</p>
        <p class="mb-3">Confirmation code: <code id="confirmCode">${esc(reg.code)}</code></p>
        <a href="#/registrations" class="btn btn-brand" data-action="modal-go">View My Registrations</a>
        <button class="btn btn-outline-secondary" data-bs-dismiss="modal">Done</button>
      </div>`);
    toast(`Registered ${esc(player(reg.playerId).name)} for ${esc(ev.title)}.`);
    render();
  }

  // ---------------------------------------------------------------- views
  const homeLink = (href, title, sub) => `
        <div class="col-sm-6 col-lg-3">
          <a href="${href}" class="card h-100 text-decoration-none text-body card-hover"><div class="card-body">
            <div class="fw-semibold">${title}</div>
            <div class="text-muted small">${sub}</div>
          </div></a>
        </div>`;

  function viewHome() {
    const now = new Date();
    const nextPractice = state.events.filter((e) => e.type === "practice" && !e.cancelled && parse(e.end) >= now).sort(byStart)[0];
    const nextTournament = tournaments().filter(upcoming)[0];
    const latest = [...state.announcements].sort((a, b) => parse(b.createdAt) - parse(a.createdAt))[0];
    const latestSpot = [...state.spotlights].sort((a, b) => parse(b.publishedAt) - parse(a.publishedAt))[0];
    const myRegs = upcomingMyRegs();
    const unread = totalUnread();
    const upT = tournaments().filter(upcoming);

    const card = (label, href, inner, id) => `
      <div class="col-md-4">
        <div class="card h-100 shadow-sm card-hover position-relative" id="${id}">
          <div class="card-body">
            <div class="text-uppercase small text-muted fw-semibold mb-2">${label}</div>
            ${inner}
            <a href="${href}" class="stretched-link small">View full details →</a>
          </div>
        </div>
      </div>`;

    return `
      ${isAdmin() ? `<div class="alert alert-primary d-flex flex-wrap justify-content-between align-items-center gap-2" id="homeAdminCallout">
        <span>You're in the <strong>Admin</strong> view. Manage tournaments, practices, recognition and messages from the dashboard.</span>
        <a href="#/admin" class="btn btn-sm btn-primary">Open Admin Dashboard</a></div>` : ""}
      <section class="hero p-4 p-md-5 mb-4">
        <h1 class="h2 mb-2">San Diego Badminton Academy</h1>
        <p class="lead mb-1">A non-profit club by MK3 Sportz — fostering a fun, safe and secure environment for players to thrive.</p>
        <p class="mb-3">Where sports and fun come together!</p>
        <div class="d-flex flex-wrap gap-2">
          <a href="#/calendar" class="btn btn-light">See the calendar</a>
          <a href="#/classes" class="btn btn-outline-light">All classes</a>
          <a href="#/tournaments" class="btn btn-outline-light">Upcoming tournaments</a>
        </div>
      </section>

      <div class="row g-3 mb-4">
        ${nextPractice ? card("Next practice", `#/events/${esc(nextPractice.id)}`, `
          <h2 class="h5">${esc(nextPractice.title)}</h2>
          <p class="mb-1">${fmtDate(nextPractice.start)}</p>
          <p class="mb-1">${fmtTime(nextPractice.start)} – ${fmtTime(nextPractice.end)}</p>
          <p class="text-muted mb-2">${esc(nextPractice.location)}</p>`, "homeNextPractice") : ""}
        ${nextTournament ? card("Next tournament", `#/tournaments/${esc(nextTournament.id)}`, `
          <h2 class="h5">${esc(nextTournament.title)} ${nextTournament.sample ? sampleTag : ""}</h2>
          <p class="mb-1">${fmtDate(nextTournament.start)}</p>
          <p class="text-muted mb-1">${esc(nextTournament.location)}</p>
          <p class="mb-2">${statusBadge(nextTournament)}</p>`, "homeNextTournament") : ""}
        ${latest ? card("Latest announcement", `#/announcements/${esc(latest.id)}`, `
          <span class="badge ${catMeta[latest.category].cls} mb-2">${catMeta[latest.category].label}</span>
          <h2 class="h5">${esc(latest.title)}</h2>
          <p class="small text-muted mb-1">${esc(user(latest.authorId).name)} · ${fmtStamp(latest.createdAt)}</p>
          <p class="mb-2 text-truncate">${esc(latest.body)}</p>`, "homeLatestAnnouncement") : ""}
      </div>

      <h2 class="h5 mb-3">Explore the club</h2>
      <div class="row g-3" id="homeSections">
        ${homeLink("#/calendar", "Calendar &amp; Registration", isAdmin()
          ? "Practices and tournaments in one place"
          : `Practices and tournaments in one place · ${myRegs.length} upcoming sign-up${myRegs.length === 1 ? "" : "s"}`)}
        ${homeLink("#/tournaments", "Tournaments", `${upT.length} upcoming · ${upT.filter((e) => regStatus(e).open).length} open for registration`)}
        ${homeLink("#/recognition", "Player Recognition", latestSpot
          ? `Latest spotlight: ${esc(player(latestSpot.playerId)?.name)} — ${esc(latestSpot.headline || latestSpot.improved)}`
          : "Player spotlights")}
        ${homeLink(unread ? "#/messages" : "#/announcements", `Communications ${unread ? `<span class="badge rounded-pill text-bg-danger">${unread} unread</span>` : ""}`,
          "Club announcements and private messages with staff")}
      </div>

      <div class="card mt-4"><div class="card-body small">
        <strong>Programs, enrollment &amp; payments:</strong> see every class, the registration form, payment instructions and discounts on the
        <a href="#/classes">Classes page</a>.
      </div></div>`;
  }

  function viewEventPage(id) {
    const ev = event(id);
    if (!ev) return notFound("event");
    if (ev.type === "tournament") return viewTournament(id);
    return `
      <nav aria-label="breadcrumb"><ol class="breadcrumb small"><li class="breadcrumb-item"><a href="#/classes">Classes</a></li>${classOf(ev) ? `<li class="breadcrumb-item"><a href="#/classes/${esc(classOf(ev).id)}">${esc(classOf(ev).title)}</a></li>` : ""}<li class="breadcrumb-item active">${fmtShortDate(ev.start)}</li></ol></nav>
      <div class="card shadow-sm"><div class="card-body">
        <h1 class="h3">${esc(ev.title)}</h1>
        ${eventDetails(ev)}
        <div class="mt-3"><button class="btn btn-link px-0" data-action="goto-calendar" data-id="${esc(ev.id)}">View on calendar →</button></div>
      </div></div>`;
  }

  // ----- Classes (program catalog; details from the existing badminton programs page)
  // `prefix` links a class to its practice sessions on the shared calendar.
  // Enrollment & payment links from the original badminton programs page.
  const ENROLL_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSeZQzLYxd_PzV2yNkvP3-uByBAQKE4eoQf0tN_MLadq2oUG4A/viewform?usp=sf_link";
  const PAY_URL = "https://square.link/u/pUvQOOjE";

  function enrollmentInfo() {
    return `<section class="card shadow-sm mt-3" id="howToEnroll"><div class="card-body">
      <h2 class="h5">How to enroll</h2>
      <ol class="mb-3">
        <li class="mb-2"><strong>Register:</strong> fill out the club registration form.
          <div class="mt-1"><a href="${ENROLL_FORM_URL}" target="_blank" rel="noopener" class="btn btn-sm btn-brand">Open registration form ↗</a></div></li>
        <li><strong>Pay:</strong> payments are due at the beginning of each month. A 10% late fee applies to payments received after the 5th.
          <ul class="mt-1">
            <li><strong>Online</strong> (Visa, Mastercard, Amex, Discover):
              <a href="${PAY_URL}" target="_blank" rel="noopener" class="fw-semibold">Pay online ↗</a>.
              <span class="text-danger">At checkout, enter the participant's first and last name and program in the “Note to Seller” field.</span></li>
            <li><strong>Cash:</strong> place cash in an envelope with your full name and your children's names.</li>
          </ul>
        </li>
      </ol>
      <h3 class="h6">Discounts &amp; scholarships</h3>
      <ul class="small mb-0">
        <li><strong>Sibling discount:</strong> 10% off for the 2nd and 3rd sibling</li>
        <li><strong>Refer-a-friend:</strong> 10% off — badminton is more fun with friends!</li>
        <li><strong>Scholarships:</strong> available upon request and financial review</li>
      </ul>
    </div></section>`;
  }

  const CLASSES = [
    {
      id: "general", prefix: "pr-gen-", title: "General Group Practice", level: "All levels", enrollment: "enroll",
      days: "Saturdays", time: "4:00 – 6:00 PM", location: "Canyon Crest Academy", who: "Kids of all ages and skill levels",
      details: "Our core youth program: footwork, fundamentals and fun game play. Wear comfortable athletic clothes & shoes and bring plenty of water.",
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
  ];
  const classOf = (ev) => (ev && ev.type === "practice"
    ? CLASSES.find((c) => (ev.classId ? c.id === ev.classId : c.prefix && ev.id.startsWith(c.prefix)))
    : undefined);
  const classSessions = (c) => state.events.filter((e) => classOf(e) === c && upcoming(e)).sort(byStart);

  function classStatus(c) {
    switch (c.enrollment) {
      case "enroll": return { label: "Enrolling now", cls: "text-bg-success", note: "Monthly enrollment through the club registration form — no per-session sign-up." };
      case "qualify": return { label: "By coach invitation", cls: "text-bg-info", note: "Players join once a coach confirms they qualify." };
      case "book": return { label: "Book by message", cls: "text-bg-primary", note: "Send staff a private message to request a lesson time." };
      case "soon": return { label: "Coming soon", cls: "text-bg-secondary", note: "Join the interest list by messaging staff." };
      default: {
        const notYetMine = (e) => isAdmin() || eligiblePlayers(e).some((p) => !regsFor(e.id).some((r) => r.userId === MEMBER_ID && r.playerId === p.id));
        const open = classSessions(c).filter((e) => regStatus(e).open && notYetMine(e));
        return open.length
          ? { label: "Sign up per session", cls: "text-bg-success", note: "Register for each session you plan to attend.", nextOpen: open[0] }
          : { label: "No open sessions", cls: "text-bg-secondary", note: "Check back soon for new sessions." };
      }
    }
  }

  function classActions(c, st, { small = true } = {}) {
    const sz = small ? "btn-sm" : "";
    if (c.enrollment === "session") {
      if (!st.nextOpen) return "";
      return isAdmin()
        ? `<button class="btn ${sz} btn-outline-secondary" data-action="open-event" data-id="${esc(st.nextOpen.id)}">View next session roster</button>`
        : `<button class="btn ${sz} btn-brand" data-action="open-register" data-id="${esc(st.nextOpen.id)}">Register for ${fmtShortDate(st.nextOpen.start)} session</button>`;
    }
    if (c.enrollment === "enroll") return `<a href="${ENROLL_FORM_URL}" target="_blank" rel="noopener" class="btn ${sz} btn-brand">Enroll — registration form ↗</a>`
      + `<a href="${PAY_URL}" target="_blank" rel="noopener" class="btn ${sz} btn-outline-secondary">Pay online ↗</a>`;
    return isAdmin() ? "" : `<a href="#/messages/new" class="btn ${sz} btn-outline-primary">Message staff</a>`;
  }

  function nextSessionText(c) {
    const next = classSessions(c).find((e) => !e.cancelled);
    if (next) return fmtDate(next.start);
    return c.enrollment === "soon" ? "Not scheduled yet" : c.prefix ? "No upcoming sessions" : "Scheduled individually";
  }

  function viewClasses() {
    return pageHeader("Classes", "Every group practice, lesson and open-play program. Class sessions also appear on the club calendar.") + `
      <div class="row g-3" id="classList">
        ${CLASSES.map((c) => { const st = classStatus(c); return `
          <div class="col-12">
            <div class="card shadow-sm class-card" data-class="${esc(c.id)}">
              <div class="card-body">
                <div class="d-flex flex-wrap justify-content-between gap-2">
                  <h2 class="h5 mb-1"><a href="#/classes/${esc(c.id)}" class="text-decoration-none">${esc(c.title)}</a> ${c.sample ? sampleTag : ""}</h2>
                  <div><span class="badge ${st.cls}">${esc(st.label)}</span></div>
                </div>
                <div class="row small g-2 mt-1">
                  <div class="col-6 col-md-3"><div class="text-muted">Days</div>${esc(c.days)}</div>
                  <div class="col-6 col-md-3"><div class="text-muted">Time</div>${esc(c.time)}</div>
                  <div class="col-6 col-md-3"><div class="text-muted">Venue</div>${esc(c.location)}</div>
                  <div class="col-6 col-md-3"><div class="text-muted">Next session</div>${nextSessionText(c)}</div>
                </div>
                <div class="mt-2">
                  <span class="badge text-bg-light border me-1">${esc(c.level)}</span>
                  <span class="small text-muted">${esc(c.who)}</span>
                </div>
                <div class="mt-3 d-flex flex-wrap gap-2">
                  <a href="#/classes/${esc(c.id)}" class="btn btn-sm btn-outline-secondary">Details</a>
                  ${classActions(c, st)}
                </div>
              </div>
            </div>
          </div>`; }).join("")}
      </div>`;
  }

  function viewClass(id) {
    const c = CLASSES.find((x) => x.id === id);
    if (!c) return notFound("class");
    const st = classStatus(c);
    const sessions = classSessions(c).slice(0, 8);
    const rows = [["Days", esc(c.days)], ["Time", esc(c.time)], ["Venue", esc(c.location)], ["Who", esc(c.who)], ["Level", esc(c.level)],
      ["Enrollment", `<span class="badge ${st.cls}">${esc(st.label)}</span> <span class="small text-muted">${esc(st.note)}</span>`]];
    return `
      <nav aria-label="breadcrumb"><ol class="breadcrumb small"><li class="breadcrumb-item"><a href="#/classes">Classes</a></li><li class="breadcrumb-item active">${esc(c.title)}</li></ol></nav>
      <div class="row g-4">
        <div class="col-lg-7">
          <div class="card shadow-sm"><div class="card-body">
            <h1 class="h3">${esc(c.title)} ${c.sample ? sampleTag : ""}</h1>
            <dl class="row mb-2">${rows.map(([k, v]) => `<dt class="col-sm-4 text-muted fw-normal">${k}</dt><dd class="col-sm-8">${v}</dd>`).join("")}</dl>
            <p class="pre-wrap">${esc(c.details)}</p>
            <div class="d-flex flex-wrap gap-2">${classActions(c, st, { small: false })}</div>
          </div></div>
          ${c.enrollment === "enroll" ? enrollmentInfo() : ""}
        </div>
        <div class="col-lg-5">
          <h2 class="h5">Upcoming sessions</h2>
          ${sessions.length
            ? `<div class="d-grid gap-2" id="classSessions">${sessions.map(agendaItem).join("")}</div>
               <button class="btn btn-link px-0 mt-2" data-action="goto-calendar" data-id="${esc(sessions[0].id)}">View all on calendar →</button>`
            : `<p class="text-muted small">${c.enrollment === "soon" ? "Sessions haven't been scheduled yet." : c.prefix ? "No upcoming sessions." : "This class isn't on the public calendar — sessions are arranged with staff."}</p>`}
          ${isAdmin() ? `<div><a href="#/admin/practices/new/${esc(c.id)}" class="btn btn-sm btn-outline-primary mt-2">Schedule a session</a></div>` : ""}
        </div>
      </div>`;
  }

  function viewTournaments() {
    const list = tournaments().filter(upcoming);
    return pageHeader("Upcoming Tournaments", "Tournament data is shared with the club calendar.",
      isAdmin() ? '<a href="#/admin/tournaments" class="btn btn-sm btn-outline-primary">Manage tournaments</a>' : "") + `
      <div class="row g-3">
        ${list.map((ev) => `
          <div class="col-12">
            <div class="card shadow-sm">
              <div class="card-body">
                <div class="d-flex flex-wrap justify-content-between gap-2">
                  <h2 class="h5 mb-1"><a href="#/tournaments/${esc(ev.id)}" class="text-decoration-none">${esc(ev.title)}</a> ${ev.sample ? sampleTag : ""}</h2>
                  <div>${statusBadge(ev)}</div>
                </div>
                <div class="row small g-2 mt-1">
                  <div class="col-6 col-md-3"><div class="text-muted">Date</div>${fmtDate(ev.start)}</div>
                  <div class="col-6 col-md-3"><div class="text-muted">Time</div>${fmtTime(ev.start)} – ${fmtTime(ev.end)}</div>
                  <div class="col-6 col-md-3"><div class="text-muted">Venue</div>${esc(ev.location)}</div>
                  <div class="col-6 col-md-3"><div class="text-muted">Registration deadline</div>${fmtDate(ev.deadline)}</div>
                </div>
                <div class="mt-2">${ev.divisions.map((d) => `<span class="badge text-bg-light border me-1">${esc(d)}</span>`).join("")}</div>
                <div class="mt-3 d-flex flex-wrap gap-2">
                  <a href="#/tournaments/${esc(ev.id)}" class="btn btn-sm btn-outline-secondary">Details</a>
                  ${isAdmin() ? `<a href="#/admin/tournaments/${esc(ev.id)}" class="btn btn-sm btn-outline-primary">Edit</a>` : ""}
                  ${regStatus(ev).open && !isAdmin() ? `<button class="btn btn-sm btn-brand" data-action="open-register" data-id="${esc(ev.id)}">Register</button>` : ""}
                </div>
              </div>
            </div>
          </div>`).join("") || '<p class="text-muted">No upcoming tournaments.</p>'}
      </div>`;
  }

  function viewTournament(id) {
    const ev = event(id);
    if (!ev || ev.type !== "tournament") return notFound("tournament");
    return `
      <nav aria-label="breadcrumb"><ol class="breadcrumb small"><li class="breadcrumb-item"><a href="#/tournaments">Tournaments</a></li><li class="breadcrumb-item active">${esc(ev.title)}</li></ol></nav>
      <div class="card shadow-sm"><div class="card-body">
        <h1 class="h3">${esc(ev.title)}</h1>
        ${eventDetails(ev)}
        <div class="mt-3"><button class="btn btn-link px-0" data-action="goto-calendar" data-id="${esc(ev.id)}">View on calendar →</button></div>
      </div></div>`;
  }

  // ----- Calendar
  function viewCalendar() {
    const [y, m] = state.ui.calMonth.split("-").map(Number);
    const first = new Date(y, m - 1, 1);
    const gridStart = addDays(first, -first.getDay());
    const f = state.ui.filters;
    const shown = state.events.filter((e) => f[e.type]);
    const todayKey = ymd(new Date());
    const byDay = {};
    shown.forEach((e) => { const k = e.start.slice(0, 10); (byDay[k] = byDay[k] || []).push(e); });
    Object.values(byDay).forEach((l) => l.sort(byStart));

    let cells = "";
    for (let i = 0; i < 42; i++) {
      const d = addDays(gridStart, i);
      const k = ymd(d);
      if (i >= 35 && d.getMonth() !== m - 1) break;
      const evs = byDay[k] || [];
      const cls = ["cal-cell", d.getMonth() !== m - 1 ? "other-month" : "", k === todayKey ? "today" : "", state.ui.selectedDay === k ? "selected" : ""].join(" ");
      cells += `<div class="${cls}" data-action="select-day" data-day="${k}" role="button" tabindex="0" aria-label="${d.toDateString()}, ${evs.length} events">
        <span class="cal-daynum">${d.getDate()}</span>
        ${evs.map((e) => `<button type="button" class="cal-chip ${e.type} ${e.cancelled ? "cancelled" : ""}" data-action="open-event" data-id="${esc(e.id)}" title="${esc(e.title)}">${fmtTime(e.start).replace(":00", "")} ${esc(e.title)}</button>`).join("")}
        <span class="cal-dots">${evs.map((e) => `<span class="cal-dot ${e.type} ${e.cancelled ? "cancelled" : ""}"></span>`).join("")}</span>
      </div>`;
    }

    const monthEvents = shown.filter((e) => e.start.startsWith(state.ui.calMonth)).sort(byStart);
    const agenda = state.ui.selectedDay && state.ui.selectedDay.startsWith(state.ui.calMonth)
      ? shown.filter((e) => e.start.startsWith(state.ui.selectedDay)).sort(byStart)
      : monthEvents;
    const agendaTitle = state.ui.selectedDay && state.ui.selectedDay.startsWith(state.ui.calMonth)
      ? `Events on ${fmtDate(state.ui.selectedDay + "T12:00")} <button class="btn btn-sm btn-link" data-action="clear-day">Show whole month</button>`
      : "Events this month";

    return pageHeader("Calendar &amp; Registration", "Practices and tournaments in one place. Tap an event for time, location and sign-up.",
      isAdmin() ? '<a href="#/admin/practices/new" class="btn btn-sm btn-outline-primary">Schedule a practice</a>' : "") + `
      <div class="row g-4">
        <div class="col-lg-8">
          <div class="card shadow-sm">
            <div class="card-body">
              <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                <div class="d-flex align-items-center gap-1">
                  <button class="btn btn-sm btn-outline-secondary" data-action="cal-prev" aria-label="Previous month">‹</button>
                  <h2 class="h5 mb-0 mx-2" id="calMonthLabel" style="min-width: 9.5rem; text-align:center">${first.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h2>
                  <button class="btn btn-sm btn-outline-secondary" data-action="cal-next" aria-label="Next month">›</button>
                  <button class="btn btn-sm btn-link" data-action="cal-today">Today</button>
                </div>
                <div class="d-flex gap-3" role="group" aria-label="Filters">
                  <div class="form-check form-switch mb-0">
                    <input class="form-check-input" type="checkbox" id="fPractice" data-filter="practice" ${f.practice ? "checked" : ""}>
                    <label class="form-check-label" for="fPractice"><span class="cal-dot practice me-1"></span>Practices</label>
                  </div>
                  <div class="form-check form-switch mb-0">
                    <input class="form-check-input" type="checkbox" id="fTournament" data-filter="tournament" ${f.tournament ? "checked" : ""}>
                    <label class="form-check-label" for="fTournament"><span class="cal-dot tournament me-1"></span>Tournaments</label>
                  </div>
                </div>
              </div>
              <div class="cal-grid">
                ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => `<div class="cal-dow">${d}</div>`).join("")}
                ${cells}
              </div>
            </div>
          </div>

          <h3 class="h6 mt-4 mb-2">${agendaTitle}</h3>
          <div class="d-grid gap-2" id="agenda">
            ${agenda.map(agendaItem).join("") || '<p class="text-muted small">No events match your filters.</p>'}
          </div>
        </div>
        <div class="col-lg-4">
          ${registrationsPanel()}
        </div>
      </div>`;
  }

  function agendaItem(e) {
    return `<button type="button" class="card agenda-item ${e.type} ${e.cancelled ? "cancelled" : ""} text-start card-hover" data-action="open-event" data-id="${esc(e.id)}">
      <div class="card-body py-2 w-100">
        <div class="d-flex justify-content-between gap-2 flex-wrap">
          <strong class="${e.cancelled ? "text-decoration-line-through" : ""}">${esc(e.title)}</strong>
          <span>${e.rescheduledFrom && !e.cancelled ? '<span class="badge text-bg-warning me-1">Rescheduled</span>' : ""}${e.cancelled ? '<span class="badge text-bg-dark">Cancelled</span>' : e.requiresRegistration ? statusBadge(e) : ""}</span>
        </div>
        <div class="small text-muted">${fmtDate(e.start)} · ${fmtTime(e.start)} – ${fmtTime(e.end)} · ${esc(e.location)}</div>
      </div></button>`;
  }

  function upcomingMyRegs() {
    return state.registrations.filter((r) => r.userId === MEMBER_ID && event(r.eventId) && upcoming(event(r.eventId)))
      .sort((a, b) => byStart(event(a.eventId), event(b.eventId)));
  }

  function registrationsPanel() {
    if (isAdmin()) {
      const regs = [...state.registrations].sort((a, b) => parse(b.createdAt) - parse(a.createdAt));
      return `<div class="card shadow-sm" id="myRegistrations"><div class="card-body">
        <h2 class="h5">All registrations <span class="small text-muted">(admin view)</span></h2>
        ${regs.length ? `<ul class="list-group list-group-flush">${regs.map((r) => { const e = event(r.eventId); return `
          <li class="list-group-item px-0">
            <div class="fw-semibold">${esc(player(r.playerId)?.name)}</div>
            <div class="small">${e ? `<a href="#" data-action="open-event" data-id="${esc(e.id)}">${esc(e.title)}</a> · ${fmtShortDate(e.start)}` : "Event removed"}${r.division ? ` · ${esc(r.division)}` : ""}</div>
            <div class="small text-muted">${esc(r.code)} · signed up ${fmtStamp(r.createdAt)}</div>
          </li>`; }).join("")}</ul>` : '<p class="text-muted small">No registrations yet.</p>'}
      </div></div>`;
    }
    const regs = upcomingMyRegs();
    return `<div class="card shadow-sm" id="myRegistrations"><div class="card-body">
      <h2 class="h5">My Registrations</h2>
      ${regs.length ? `<ul class="list-group list-group-flush">${regs.map((r) => { const e = event(r.eventId); return `
        <li class="list-group-item px-0 reg-item">
          <div class="d-flex justify-content-between gap-2">
            <div>
              <a href="#" class="fw-semibold" data-action="open-event" data-id="${esc(e.id)}">${esc(e.title)}</a>
              ${e.cancelled ? '<span class="badge text-bg-dark ms-1">Cancelled</span>' : e.rescheduledFrom ? '<span class="badge text-bg-warning ms-1">Rescheduled</span>' : ""}
              <div class="small">${fmtDate(e.start)} · ${fmtTime(e.start)}</div>
              <div class="small text-muted">${esc(player(r.playerId)?.name)}${r.division ? ` · ${esc(r.division)}` : ""} · <code>${esc(r.code)}</code></div>
            </div>
            <button class="btn btn-sm btn-outline-danger align-self-start" data-action="cancel-reg" data-id="${esc(r.id)}">Cancel</button>
          </div>
        </li>`; }).join("")}</ul>` : '<p class="text-muted small mb-0">You have no upcoming sign-ups. Choose an event marked <span class="badge text-bg-success">Open</span> to register.</p>'}
    </div></div>`;
  }

  function viewRegistrations() {
    return pageHeader(isAdmin() ? "All Registrations" : "My Registrations", isAdmin() ? "Every demo sign-up across practices and tournaments." : "Your upcoming sign-ups for you and your family.",
      '<a href="#/calendar" class="btn btn-sm btn-outline-secondary">Open calendar</a>') +
      `<div class="row"><div class="col-lg-7">${registrationsPanel()}</div></div>`;
  }

  // ----- Recognition
  function spotlightCard(s, { full = false, preview = false } = {}) {
    const p = player(s.playerId);
    const notes = canSeeNotes(s);
    return `
      <article class="card h-100 shadow-sm ${preview ? "" : "card-hover"}">
        <div class="card-body">
          <div class="d-flex justify-content-between gap-2 flex-wrap">
            <div>
              <div class="text-uppercase small text-muted fw-semibold">Player spotlight</div>
              <h2 class="h5 mb-0">${esc(p?.name)}</h2>
              <div class="small text-muted mb-2">${esc(p?.group)}</div>
            </div>
            <div class="small text-muted">${preview ? "Not yet published" : fmtDate(s.publishedAt)}</div>
          </div>
          ${s.headline ? `<p class="fw-semibold">${esc(s.headline)}</p>` : ""}
          <h3 class="h6 mb-1">💪 What improved</h3><p class="pre-wrap">${esc(s.improved)}</p>
          <h3 class="h6 mb-1">🎯 A specific example</h3><p class="pre-wrap">${esc(s.example)}</p>
          <h3 class="h6 mb-1">⏭️ Next skill to work on</h3><p class="pre-wrap">${esc(s.nextSkill)}</p>
          ${full ? notesBlock(s, notes) : notes && s.coachingNotes ? '<span class="badge text-bg-warning">🔒 Private coaching notes available to you</span>' : ""}
          ${!full && !preview ? `<a href="#/recognition/${esc(s.id)}" class="stretched-link small d-block mt-2">Read spotlight →</a>` : ""}
        </div>
      </article>`;
  }

  function notesBlock(s, visible) {
    if (!s.coachingNotes) return "";
    const p = player(s.playerId);
    if (!visible) {
      return `<div class="private-box p-3 mt-3 small" id="notesHidden">🔒 Detailed coaching notes for this player are private — visible only to the player, their parent or guardian, and authorised staff.</div>`;
    }
    const who = p.userId ? "the player" : "the player's parent/guardian";
    return `<div class="private-box p-3 mt-3" id="notesVisible">
      <div class="fw-semibold mb-1">🔒 Private coaching notes</div>
      <p class="mb-1 pre-wrap">${esc(s.coachingNotes)}</p>
      <div class="small text-muted">Visible only to ${who} and authorised staff${isAdmin() ? " (you're viewing as staff)" : ""}.</div>
    </div>`;
  }

  function viewRecognition() {
    const list = [...state.spotlights].sort((a, b) => parse(b.publishedAt) - parse(a.publishedAt));
    return pageHeader("Player Recognition", "Celebrating growth: what each player improved, a real example, and what's next.",
      isAdmin() ? '<a href="#/recognition/new" class="btn btn-brand">New spotlight</a>' : "") + `
      ${!isAdmin() ? '<div class="alert alert-light border small">Detailed coaching notes are shared only with the player, their parent or guardian, and authorised staff.</div>' : ""}
      <div class="row g-3">${list.map((s) => `<div class="col-md-6">${spotlightCard(s)}</div>`).join("") || '<p class="text-muted">No spotlights yet.</p>'}</div>`;
  }

  function viewSpotlight(id) {
    const s = state.spotlights.find((x) => x.id === id);
    if (!s) return notFound("spotlight");
    return `
      <nav aria-label="breadcrumb"><ol class="breadcrumb small"><li class="breadcrumb-item"><a href="#/recognition">Player Recognition</a></li><li class="breadcrumb-item active">${esc(player(s.playerId)?.name)}</li></ol></nav>
      <div class="row"><div class="col-lg-8">${spotlightCard(s, { full: true })}
      ${isAdmin() ? `<button class="btn btn-sm btn-outline-danger mt-3" data-action="delete-spotlight" data-id="${esc(s.id)}">Unpublish spotlight</button>` : ""}
      </div></div>`;
  }

  function viewSpotlightNew() {
    if (!isAdmin()) return '<div class="alert alert-warning">Only admins can publish spotlights. Switch to the <strong>Admin</strong> role to try it.</div>';
    const d = state.spotlightDraft || {};
    if (d.previewing) {
      return adminCrumbs(["Player Recognition", "#/recognition"], ["Preview and publish"]) + pageHeader("Preview spotlight", "This is exactly how the spotlight will appear. Coaching notes stay private.") + `
        <div class="row g-4">
          <div class="col-lg-7">
            <div class="preview-frame p-2" id="spotlightPreview">
              <div class="small text-muted px-1 pb-2">Public view (all members)</div>
              ${spotlightCard(Object.assign({}, d, { coachingNotes: "" }), { preview: true })}
            </div>
          </div>
          <div class="col-lg-5">
            ${d.coachingNotes ? `<div class="private-box p-3 mb-3"><div class="fw-semibold mb-1">🔒 Private coaching notes</div>
              <p class="pre-wrap mb-1">${esc(d.coachingNotes)}</p>
              <div class="small text-muted">Shown only to ${esc(player(d.playerId)?.name)}${player(d.playerId)?.adult ? "" : "'s parent/guardian"} and staff.</div></div>` : '<p class="small text-muted">No private coaching notes added.</p>'}
            <div class="d-flex gap-2">
              <button class="btn btn-outline-secondary" data-action="spot-edit">Back to edit</button>
              <button class="btn btn-brand" data-action="spot-publish">Publish spotlight</button>
            </div>
          </div>
        </div>`;
    }
    const field = (name, label, help, rows = 2) => `
      <div class="mb-3">
        <label class="form-label fw-semibold" for="sp-${name}">${label}</label>
        <textarea class="form-control" id="sp-${name}" name="${name}" rows="${rows}" required>${esc(d[name] || "")}</textarea>
        <div class="form-text">${help}</div>
        <div class="invalid-feedback">This field is required.</div>
      </div>`;
    return adminCrumbs(["Player Recognition", "#/recognition"], ["Write a spotlight"]) + pageHeader("New player spotlight", "Explain what improved, give one specific example, and name the next skill.") + `
      <form data-form="spotlight" class="card shadow-sm" novalidate><div class="card-body">
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label fw-semibold" for="sp-playerId">Player</label>
            <select class="form-select" id="sp-playerId" name="playerId" required>
              <option value="">Choose a player…</option>
              ${state.players.map((p) => `<option value="${esc(p.id)}" ${d.playerId === p.id ? "selected" : ""}>${esc(p.name)} — ${esc(p.group)}</option>`).join("")}
            </select>
            <div class="invalid-feedback">Choose a player.</div>
          </div>
          <div class="col-md-6">
            <label class="form-label fw-semibold" for="sp-headline">Headline <span class="text-muted fw-normal">(optional)</span></label>
            <input class="form-control" id="sp-headline" name="headline" maxlength="90" value="${esc(d.headline || "")}">
          </div>
        </div>
        <hr>
        ${field("improved", "What did the player improve?", "e.g. footwork recovery, net play, serve consistency.")}
        ${field("example", "A specific example", "A concrete moment: a drill result, a match point, a before/after number.")}
        ${field("nextSkill", "One skill they'll work on next", "Keep it to one clear, encouraging goal.")}
        <div class="mb-3 private-box p-3">
          <label class="form-label fw-semibold" for="sp-coachingNotes">🔒 Detailed coaching notes <span class="fw-normal">(private)</span></label>
          <textarea class="form-control" id="sp-coachingNotes" name="coachingNotes" rows="3">${esc(d.coachingNotes || "")}</textarea>
          <div class="form-text">Only the player, their parent or guardian, and authorised staff can see these notes.</div>
        </div>
        <div class="d-flex gap-2">
          <button type="submit" class="btn btn-brand">Preview</button>
          <a href="#/recognition" class="btn btn-outline-secondary" data-action="spot-discard">Discard</a>
        </div>
      </div></form>`;
  }

  // ----- Communications
  function commsTabs(active) {
    const unread = totalUnread();
    return `<ul class="nav nav-tabs mb-3">
      <li class="nav-item"><a class="nav-link ${active === "ann" ? "active" : ""}" href="#/announcements">Announcements</a></li>
      <li class="nav-item"><a class="nav-link ${active === "dm" ? "active" : ""}" href="#/messages">Direct Messages ${unread ? `<span class="badge rounded-pill text-bg-danger" id="dmUnread">${unread}</span>` : ""}</a></li>
    </ul>`;
  }

  function announcementItem(a, full) {
    const ev = a.eventId && event(a.eventId);
    return `<article class="card shadow-sm ${full ? "" : "card-hover"}" data-ann-id="${esc(a.id)}"><div class="card-body">
      <div class="d-flex justify-content-between flex-wrap gap-2 mb-1">
        <span class="badge ${catMeta[a.category].cls}">${catMeta[a.category].label}</span>
        <span class="small text-muted">${esc(user(a.authorId).name)} (${esc(user(a.authorId).title)}) · ${fmtStamp(a.createdAt)}</span>
      </div>
      <h2 class="h5">${full ? esc(a.title) : `<a href="#/announcements/${esc(a.id)}" class="text-decoration-none text-body stretched-link">${esc(a.title)}</a>`}</h2>
      <p class="mb-${ev ? 2 : 0}">${full ? escBr(a.body) : esc(a.body)}</p>
      ${ev ? `<div class="small position-relative" style="z-index:2"><a href="#/events/${esc(ev.id)}">Related: ${esc(ev.title)} · ${fmtShortDate(ev.start)}</a></div>` : ""}
    </div></article>`;
  }

  function viewAnnouncements() {
    const list = [...state.announcements].sort((a, b) => parse(b.createdAt) - parse(a.createdAt));
    const upcomingEvents = state.events.filter((e) => upcoming(e) && !e.cancelled).sort(byStart).slice(0, 40);
    const form = isAdmin() ? `
      <form data-form="announcement" class="card shadow-sm mb-4" novalidate><div class="card-body">
        <h2 class="h5">Post a club-wide announcement</h2>
        <div class="row g-3">
          <div class="col-md-8">
            <label class="form-label" for="an-title">Title</label>
            <input class="form-control" id="an-title" name="title" maxlength="120" required>
            <div class="invalid-feedback">Add a title.</div>
          </div>
          <div class="col-md-4">
            <label class="form-label" for="an-category">Type</label>
            <select class="form-select" id="an-category" name="category">
              <option value="general">Club update</option>
              <option value="cancellation">Practice cancellation</option>
              <option value="change">Practice change</option>
              <option value="reminder">Tournament reminder</option>
            </select>
          </div>
          <div class="col-12">
            <label class="form-label" for="an-body">Message</label>
            <textarea class="form-control" id="an-body" name="body" rows="3" required></textarea>
            <div class="invalid-feedback">Write a message.</div>
          </div>
          <div class="col-md-8">
            <label class="form-label" for="an-event">Related event <span class="text-muted">(optional)</span></label>
            <select class="form-select" id="an-event" name="eventId">
              <option value="">None</option>
              ${upcomingEvents.map((e) => `<option value="${esc(e.id)}">${fmtShortDate(e.start)} · ${esc(e.title)}</option>`).join("")}
            </select>
          </div>
          <div class="col-md-4 d-flex align-items-end">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="an-cancel" name="markCancelled">
              <label class="form-check-label small" for="an-cancel">Mark related practice as cancelled on the calendar</label>
            </div>
          </div>
        </div>
        <button type="submit" class="btn btn-brand mt-3">Post announcement</button>
        <span class="small text-muted ms-2">Posting as ${esc(me().name)} (${esc(me().title)})</span>
      </div></form>` : '<p class="small text-muted">Announcements are posted by the club owner or an admin.</p>';
    return pageHeader("Communications", "Club-wide updates and private messages with club staff.") + commsTabs("ann") + form +
      `<div class="d-grid gap-3" id="announcementList">${list.map((a) => announcementItem(a, false)).join("")}</div>`;
  }

  function viewAnnouncement(id) {
    const a = state.announcements.find((x) => x.id === id);
    if (!a) return notFound("announcement");
    return `<nav aria-label="breadcrumb"><ol class="breadcrumb small"><li class="breadcrumb-item"><a href="#/announcements">Announcements</a></li><li class="breadcrumb-item active">Details</li></ol></nav>
      <div class="row"><div class="col-lg-8">${announcementItem(a, true)}</div></div>`;
  }

  function convoTitle(c) {
    if (isAdmin()) {
      const p = player(c.playerId);
      return `${esc(user(c.memberId).name)} <span class="small text-muted fw-normal">· ${esc(user(c.memberId).title)}</span>`;
    }
    return c.to === "owner" ? "Dana Whitfield <span class='small text-muted fw-normal'>· Club Owner</span>" : "Sam Okafor <span class='small text-muted fw-normal'>· Club Admin</span>";
  }

  function convoList(activeId) {
    const list = visibleConvos();
    return `<div class="list-group convo-list shadow-sm">
      ${list.map((c) => { const u = unreadIn(c); return `
        <a href="#/messages/${esc(c.id)}" class="list-group-item list-group-item-action ${u ? "unread" : ""} ${c.id === activeId ? "active" : ""}" data-convo="${esc(c.id)}">
          <div class="d-flex justify-content-between gap-2">
            <div class="text-truncate">${convoTitle(c)}</div>
            ${u ? `<span class="badge rounded-pill text-bg-danger align-self-start unread-badge">${u}</span>` : ""}
          </div>
          <div class="convo-subject text-truncate">${esc(c.subject)}</div>
          <div class="small ${c.id === activeId ? "" : "text-muted"} text-truncate">${esc(last(c).body)}</div>
          <div class="small ${c.id === activeId ? "" : "text-muted"}">${isAdmin() ? `To: ${c.to === "owner" ? "Owner" : "Admin"} · ` : ""}${fmtStamp(last(c).at)}</div>
        </a>`; }).join("") || '<div class="list-group-item text-muted small">No conversations yet.</div>'}
    </div>`;
  }

  function viewMessages(convoId) {
    const newBtn = isAdmin() ? "" : '<a href="#/messages/new" class="btn btn-brand btn-sm mb-3">New message</a>';
    let right = '<div class="card shadow-sm d-none d-lg-block"><div class="card-body text-muted">Select a conversation.</div></div>';
    let c = null;
    if (convoId === "new") right = newMessageForm();
    else if (convoId) {
      c = visibleConvos().find((x) => x.id === convoId);
      if (!c) right = notFound("conversation");
      else {
        // opening a thread marks it read for the current side
        const side = isAdmin() ? "staff" : "member";
        if (unreadIn(c)) { c.readAt[side] = isoNow(); save(); updateNavBadge(); }
        right = threadView(c);
      }
    }
    const hasRight = !!convoId;
    return pageHeader("Communications", "Club-wide updates and private messages with club staff.") + commsTabs("dm") + `
      <div class="row g-3">
        <div class="col-lg-4 ${hasRight ? "d-none d-lg-block" : ""}">${newBtn}${convoList(c && c.id)}
          <p class="small text-muted mt-2">${isAdmin() ? "Staff inbox: conversations sent to the owner or an admin." : "Private between you and club staff (owner or admin)."}</p>
        </div>
        <div class="col-lg-8">${hasRight ? '<a href="#/messages" class="d-lg-none small d-inline-block mb-2">← All conversations</a>' : ""}${right}</div>
      </div>`;
  }

  function threadView(c) {
    const p = player(c.playerId);
    return `<div class="card shadow-sm" id="thread-${esc(c.id)}"><div class="card-body">
      <h2 class="h5 mb-0">${esc(c.subject)}</h2>
      <div class="small text-muted mb-3">${esc(user(c.memberId).name)} ↔ ${c.to === "owner" ? "Club Owner" : "Club Admin"}${p ? ` · About ${esc(p.name)}` : ""} · 🔒 Private</div>
      <div class="thread d-flex flex-column gap-2 mb-3" id="threadMessages">
        ${c.messages.map((m) => {
          const mine = isAdmin() ? isStaffId(m.from) : m.from === MEMBER_ID;
          return `<div class="d-flex flex-column ${mine ? "align-items-end" : "align-items-start"}">
            <div class="bubble ${mine ? "mine" : "theirs"}">${esc(m.body)}</div>
            <div class="bubble-meta">${esc(user(m.from).name)}${isStaffId(m.from) ? ` (${esc(user(m.from).title)})` : ""} · ${fmtStamp(m.at)}</div>
          </div>`;
        }).join("")}
      </div>
      <form data-form="reply" data-id="${esc(c.id)}" class="d-flex gap-2" novalidate>
        <label class="visually-hidden" for="replyBody">Message</label>
        <textarea class="form-control" id="replyBody" name="body" rows="2" placeholder="${isAdmin() ? "Reply as " + esc(me().name) + "…" : "Write a message…"}" required></textarea>
        <button class="btn btn-brand align-self-end" type="submit">Send</button>
      </form>
    </div></div>`;
  }

  function newMessageForm() {
    if (isAdmin()) return '<div class="alert alert-info">Families and adult players start conversations; staff reply in the same thread.</div>';
    return `<form data-form="new-message" class="card shadow-sm" novalidate><div class="card-body">
      <h2 class="h5">New private message</h2>
      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label" for="nm-to">To</label>
          <select class="form-select" id="nm-to" name="to">
            <option value="owner">Dana Whitfield — Club Owner</option>
            <option value="admin">Sam Okafor — Club Admin</option>
          </select>
        </div>
        <div class="col-md-6">
          <label class="form-label" for="nm-player">About</label>
          <select class="form-select" id="nm-player" name="playerId">
            <option value="">General question</option>
            ${myPlayers().map((p) => `<option value="${esc(p.id)}">${esc(p.name)}${p.userId === MEMBER_ID ? " (me)" : ""}</option>`).join("")}
          </select>
        </div>
        <div class="col-12">
          <label class="form-label" for="nm-subject">Subject</label>
          <input class="form-control" id="nm-subject" name="subject" maxlength="120" required>
          <div class="invalid-feedback">Add a subject.</div>
        </div>
        <div class="col-12">
          <label class="form-label" for="nm-body">Message</label>
          <textarea class="form-control" id="nm-body" name="body" rows="4" required></textarea>
          <div class="invalid-feedback">Write a message.</div>
        </div>
      </div>
      <div class="mt-3 d-flex gap-2">
        <button class="btn btn-brand" type="submit">Send message</button>
        <a href="#/messages" class="btn btn-outline-secondary">Cancel</a>
      </div>
    </div></form>`;
  }

  // ---------------------------------------------------------------- admin dashboard (staff only)
  // Admin Dashboard → Tournaments & Practices · Player Recognition · Communications
  const VENUES = ["Canyon Crest Academy", "Canyon Crest Academy Gym", "Oak Valley Middle School", "Oak Valley Middle School Gym"];
  // Defaults used when scheduling a session for a class.
  const CLASS_DEFAULTS = {
    general: { start: "16:00", end: "18:00", location: "Canyon Crest Academy", signup: false, eligibility: "junior" },
    intermediate: { signup: false, eligibility: "junior" },
    elite: { start: "16:00", end: "18:00", location: "Oak Valley Middle School", signup: false, eligibility: "junior" },
    private: { start: "16:00", end: "17:00", location: "Oak Valley Middle School", signup: false, eligibility: "all" },
    "adult-open": { start: "19:00", end: "21:00", location: "Oak Valley Middle School", signup: true, capacity: 16, eligibility: "adult" },
    "adult-lessons": { signup: true, capacity: 12, eligibility: "adult" },
    other: { eligibility: "all" },
  };
  const whoLabel = { junior: "Junior players", adult: "Adults", all: "Anyone (juniors and adults)" };
  // Fictional names used to fill in the sample registrations on rosters.
  const SAMPLE_FIRST = ["Ava", "Ben", "Chloe", "Daniel", "Elena", "Felix", "Grace", "Hiro", "Isla", "Jonah", "Kai", "Lena", "Mateo", "Nora", "Owen",
    "Quinn", "Rosa", "Sami", "Theo", "Uma", "Vera", "Wes", "Yara", "Zane", "Arjun", "Bea", "Cody", "Dara", "Eli", "Farah"];
  const SAMPLE_LAST = ["Nguyen", "Patel", "Kim", "Garcia", "Johnson", "Okoro", "Silva", "Haddad", "Novak", "Chen", "Brooks", "Reyes", "Sato",
    "Iyer", "Walsh", "Moreno", "Fischer", "Adeyemi", "Larsen", "Ortiz"];

  const fld = (form, name) => form.querySelector(`[name="${name}"]`);
  const adminOnly = () => '<div class="alert alert-warning">This area is for club staff. Switch the demo role to <strong>Admin</strong> to use it.</div>';
  function adminCrumbs(...items) {
    return `<nav aria-label="breadcrumb"><ol class="breadcrumb small"><li class="breadcrumb-item"><a href="#/admin">Admin Dashboard</a></li>${items
      .map(([label, href]) => (href ? `<li class="breadcrumb-item"><a href="${href}">${label}</a></li>` : `<li class="breadcrumb-item active" aria-current="page">${label}</li>`))
      .join("")}</ol></nav>`;
  }
  const venueDatalist = () => `<datalist id="venueList">${[...new Set([...VENUES, ...state.events.map((e) => e.location)])]
    .map((v) => `<option value="${esc(v)}"></option>`).join("")}</datalist>`;

  function showFormErrors(form, errs) {
    const box = form.querySelector(".form-errors");
    if (!box) return;
    box.innerHTML = `<div class="alert alert-danger py-2 small" role="alert">${errs.map(esc).join("<br>")}</div>`;
    box.scrollIntoView({ block: "nearest" });
  }

  function postAnnouncement({ category, title, body, eventId = null }) {
    state.announcements.push({ id: uid("a"), category, title, body, eventId, authorId: ADMIN_ID, createdAt: isoNow() });
  }

  // Who may sign up for an event: "junior" | "adult" | "all".
  function eligibilityOf(ev) {
    if (ev.type === "tournament") return ev.adultEvent ? "adult" : "junior";
    return ev.eligibility || CLASS_DEFAULTS[classOf(ev)?.id]?.eligibility || "adult";
  }

  // Deterministic fictional names for an event's sample registrations (same names on every visit).
  function sampleRoster(ev) {
    let s = 0;
    for (const ch of ev.id) s = (Math.imul(s, 31) + ch.charCodeAt(0)) | 0;
    const rnd = () => {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const by = eligibilityOf(ev) === "junior" ? "Parent/guardian" : "Self";
    const used = new Set();
    const out = [];
    for (let i = 0; i < (ev.baseRegistered || 0); i++) {
      let name = "";
      for (let tries = 0; tries < 25 && (!name || used.has(name)); tries++) {
        name = `${SAMPLE_FIRST[Math.floor(rnd() * SAMPLE_FIRST.length)]} ${SAMPLE_LAST[Math.floor(rnd() * SAMPLE_LAST.length)]}`;
      }
      used.add(name);
      out.push({ name, division: ev.divisions ? ev.divisions[i % ev.divisions.length] : null, by, when: "—", code: "—", sample: true });
    }
    return out;
  }

  // ----- Open / close sign-ups
  function signupToggle(ev) {
    if (!isAdmin() || !ev.requiresRegistration) return "";
    const st = regStatus(ev);
    if (["past", "cancelled"].includes(st.key)) return "";
    const id = esc(ev.id);
    let html;
    if (st.open) html = `<button class="btn btn-sm btn-outline-danger" data-action="signups-close" data-id="${id}">Close sign-ups</button>`;
    else if (st.key === "full") {
      html = ev.type === "tournament"
        ? `<a class="btn btn-sm btn-outline-primary" href="#/admin/tournaments/${id}" data-action="modal-go">Full — add spots</a>`
        : `<button class="btn btn-sm btn-outline-primary" data-action="practice-reschedule" data-id="${id}">Full — add spots</button>`;
    } else html = `<button class="btn btn-sm btn-success" data-action="signups-open" data-id="${id}">Open sign-ups</button>`;
    if (ev.signups) html += `<button class="btn btn-sm btn-link" data-action="signups-auto" data-id="${id}">Use registration dates</button>`;
    return html;
  }

  function setSignups(el, value) {
    const ev = event(el.dataset.id);
    if (!ev || !isAdmin()) return;
    if (value) ev.signups = value; else delete ev.signups;
    save();
    const label = value === "closed" ? "sign-ups closed" : value === "open" ? "sign-ups opened" : "following the registration dates";
    toast(`${esc(ev.title)}: ${label} (${esc(regStatus(ev).label)}).`, value === "closed" ? "secondary" : "success");
    render();
    if (el.closest("#eventModal")) openEventModal(ev.id);
  }

  // Staff shortcuts shown inside event details (modal and pages).
  function adminEventActions(ev) {
    if (!isAdmin() || !upcoming(ev)) return "";
    const id = esc(ev.id);
    const btns = ev.type === "tournament"
      ? `<a href="#/admin/tournaments/${id}" class="btn btn-sm btn-outline-primary" data-action="modal-go">Edit tournament</a>`
      : ev.cancelled
        ? `<button class="btn btn-sm btn-outline-success" data-action="practice-restore" data-id="${id}">Restore practice</button>`
        : `<button class="btn btn-sm btn-outline-primary" data-action="practice-reschedule" data-id="${id}">Reschedule</button>
           <button class="btn btn-sm btn-outline-danger" data-action="practice-cancel" data-id="${id}">Cancel practice</button>`;
    return `<div class="admin-actions border-top pt-2 mt-3"><div class="small text-muted mb-1">Staff actions</div><div class="d-flex flex-wrap gap-2">${btns}</div></div>`;
  }

  // ----- Dashboard
  function viewAdminDashboard() {
    if (!isAdmin()) return adminOnly();
    const now = new Date();
    const within = (days) => addDays(now, days);
    const upcomingT = tournaments().filter(upcoming);
    const practices = state.events.filter((e) => e.type === "practice" && upcoming(e));
    const weekPractices = practices.filter((e) => parse(e.start) <= within(7));
    const openSignups = state.events.filter((e) => upcoming(e) && regStatus(e).open);
    const unread = totalUnread();
    const draft = state.spotlightDraft;
    const latestAnn = [...state.announcements].sort((a, b) => parse(b.createdAt) - parse(a.createdAt))[0];

    const item = (id, href, title, sub, meta) => `
      <a href="${href}" id="${id}" class="list-group-item list-group-item-action py-3">
        <div class="d-flex justify-content-between gap-2">
          <div><div class="fw-semibold">${title}</div><div class="small text-muted">${sub}</div></div>
          <div class="text-end small text-nowrap text-muted">${meta}</div>
        </div>
      </a>`;
    const section = (title, desc, items) => `
      <div class="col-lg-4">
        <section class="card shadow-sm h-100 admin-section">
          <div class="card-body pb-2 flex-grow-0"><h2 class="h5 mb-1">${title}</h2><p class="small text-muted mb-0">${desc}</p></div>
          <div class="list-group list-group-flush">${items}</div>
        </section>
      </div>`;

    const attention = [];
    visibleConvos().filter((c) => unreadIn(c)).forEach((c) => attention.push(
      `<li class="list-group-item"><span class="badge text-bg-danger me-2">Unread</span><a href="#/messages/${esc(c.id)}">${esc(user(c.memberId).name)}: ${esc(c.subject)}</a></li>`));
    upcomingT.filter((e) => regStatus(e).open && e.deadline && parse(e.deadline) <= within(14)).forEach((e) => attention.push(
      `<li class="list-group-item"><span class="badge text-bg-primary me-2">Deadline</span><a href="#/admin/signups/${esc(e.id)}">${esc(e.title)}</a> — sign-ups close ${fmtShortDate(e.deadline)}</li>`));
    state.events.filter((e) => upcoming(e) && regStatus(e).key === "full").forEach((e) => attention.push(
      `<li class="list-group-item"><span class="badge text-bg-warning me-2">Full</span><a href="#/admin/signups/${esc(e.id)}">${esc(e.title)}</a> — ${regCount(e)} / ${e.capacity} on ${fmtShortDate(e.start)}</li>`));
    practices.filter((e) => e.cancelled && parse(e.start) <= within(14)).forEach((e) => attention.push(
      `<li class="list-group-item"><span class="badge text-bg-dark me-2">Cancelled</span><a href="#/admin/practices">${esc(e.title)}</a> on ${fmtShortDate(e.start)}</li>`));
    if (draft) attention.push(`<li class="list-group-item"><span class="badge text-bg-info me-2">Draft</span><a href="#/recognition/new">Unpublished spotlight${player(draft.playerId) ? ` for ${esc(player(draft.playerId).name)}` : ""}</a></li>`);

    return pageHeader("Admin Dashboard", "Manage tournaments, practices, player recognition and club communications.") + `
      <div class="row g-3" id="adminDashboard">
        ${section("Tournaments &amp; Practices", "Everything members see on the Tournaments page, Classes and the calendar.",
          item("dashTournaments", "#/admin/tournaments", "Create or edit tournaments", "Set divisions, venue, and registration deadline", `${upcomingT.length} upcoming`)
          + item("dashPractices", "#/admin/practices", "Schedule, reschedule, or cancel practices", "Optionally notify members with an announcement", `${weekPractices.length} in next 7 days`)
          + item("dashSignups", "#/admin/signups", "Open or close sign-ups", "View registered players", `${openSignups.length} open now`))}
        ${section("Player Recognition", "Celebrate growth with player spotlights.",
          item("dashSpotlight", "#/recognition/new", draft ? "Continue your spotlight draft" : "Write a spotlight",
            "Describe what improved and the next skill to work on, then preview and publish", `${state.spotlights.length} published`)
          + item("dashSpotlights", "#/recognition", "View published spotlights", "Coaching notes stay private to the player, guardian and staff", ""))}
        ${section("Communications", "Club-wide updates and private conversations.",
          item("dashAnnouncements", "#/announcements", "Post club-wide announcements", "Practice changes and tournament reminders",
            latestAnn ? `Last: ${fmtShortDate(latestAnn.createdAt)}` : "")
          + item("dashMessages", "#/messages", "Read messages from parents, guardians, and adult players", "Reply privately in the same thread",
            unread ? `<span class="badge rounded-pill text-bg-danger">${unread} unread</span>` : "All read"))}
      </div>
      <section class="card shadow-sm mt-4" id="needsAttention">
        <div class="card-body pb-2"><h2 class="h5 mb-0">Needs attention</h2></div>
        <ul class="list-group list-group-flush">${attention.join("") || '<li class="list-group-item text-muted small">All caught up.</li>'}</ul>
      </section>`;
  }

  // ----- Tournaments: create or edit
  function adminTournamentRow(ev) {
    return `<div class="card shadow-sm" data-admin-tournament="${esc(ev.id)}"><div class="card-body py-3">
      <div class="d-flex flex-wrap justify-content-between gap-2">
        <div>
          <div class="fw-semibold">${esc(ev.title)} ${ev.sample ? sampleTag : ""}</div>
          <div class="small text-muted">${fmtDate(ev.start)} · ${fmtTime(ev.start)} – ${fmtTime(ev.end)} · ${esc(ev.location)}</div>
          <div class="small">Deadline ${fmtDate(ev.deadline)} · ${ev.divisions.length} division${ev.divisions.length === 1 ? "" : "s"} · ${regCount(ev)}${ev.capacity ? ` / ${ev.capacity}` : ""} registered</div>
        </div>
        <div>${statusBadge(ev)}</div>
      </div>
      <div class="d-flex flex-wrap gap-2 mt-2">
        <a class="btn btn-sm btn-outline-primary" href="#/admin/tournaments/${esc(ev.id)}">Edit</a>
        <a class="btn btn-sm btn-outline-secondary" href="#/admin/signups/${esc(ev.id)}">Registered players</a>
        ${signupToggle(ev)}
        <a class="btn btn-sm btn-link" href="#/tournaments/${esc(ev.id)}">View public page</a>
      </div>
    </div></div>`;
  }

  function viewAdminTournaments() {
    if (!isAdmin()) return adminOnly();
    const all = tournaments();
    const next = all.filter(upcoming);
    const past = all.filter((e) => !upcoming(e));
    return adminCrumbs(["Tournaments"]) + pageHeader("Tournaments",
      "Create tournaments and edit their divisions, venue and registration deadline. Members see changes on the Tournaments page and calendar right away.",
      '<a href="#/admin/tournaments/new" class="btn btn-brand">New tournament</a>') + `
      <div class="d-grid gap-2" id="adminTournamentList">${next.map(adminTournamentRow).join("") || '<p class="text-muted">No upcoming tournaments.</p>'}</div>
      ${past.length ? `<h2 class="h6 mt-4 text-muted">Past tournaments</h2><div class="d-grid gap-2">${past.map(adminTournamentRow).join("")}</div>` : ""}`;
  }

  function viewTournamentForm(id) {
    if (!isAdmin()) return adminOnly();
    const ev = id ? event(id) : null;
    if (id && (!ev || ev.type !== "tournament")) return notFound("tournament");
    const v = ev ? {
      title: ev.title, date: ev.start.slice(0, 10), startTime: ev.start.slice(11, 16), endTime: ev.end.slice(11, 16), location: ev.location,
      divisions: (ev.divisions || []).join("\n"), who: ev.adultEvent ? "adult" : "junior", opens: ev.opensAt ? ev.opensAt.slice(0, 10) : "",
      deadline: ev.deadline ? ev.deadline.slice(0, 10) : "", capacity: ev.capacity || "", fee: ev.fee || "", details: ev.details || "",
    } : { title: "", date: "", startTime: "09:00", endTime: "17:00", location: "", divisions: "", who: "junior", opens: "", deadline: "", capacity: "", fee: "", details: "" };
    const locked = ev ? [...new Set(regsFor(ev.id).map((r) => r.division).filter(Boolean))] : [];
    return adminCrumbs(["Tournaments", "#/admin/tournaments"], [ev ? "Edit tournament" : "New tournament"]) +
      pageHeader(ev ? `Edit: ${esc(ev.title)}` : "New tournament", "Members see changes on the Tournaments page and calendar right away.") + `
      <form data-form="tournament" ${ev ? `data-id="${esc(ev.id)}"` : ""} class="card shadow-sm" novalidate><div class="card-body">
        <div class="form-errors"></div>
        <div class="row g-3">
          <div class="col-12">
            <label class="form-label fw-semibold" for="tf-title">Tournament name</label>
            <input class="form-control" id="tf-title" name="title" maxlength="100" required value="${esc(v.title)}">
            <div class="invalid-feedback">Add a name.</div>
          </div>
          <div class="col-md-4">
            <label class="form-label fw-semibold" for="tf-date">Date</label>
            <input type="date" class="form-control" id="tf-date" name="date" required value="${esc(v.date)}">
            <div class="invalid-feedback">Choose a date.</div>
          </div>
          <div class="col-6 col-md-4">
            <label class="form-label fw-semibold" for="tf-start">Start time</label>
            <input type="time" class="form-control" id="tf-start" name="startTime" required value="${esc(v.startTime)}">
          </div>
          <div class="col-6 col-md-4">
            <label class="form-label fw-semibold" for="tf-end">End time</label>
            <input type="time" class="form-control" id="tf-end" name="endTime" required value="${esc(v.endTime)}">
          </div>
          <div class="col-md-8">
            <label class="form-label fw-semibold" for="tf-location">Venue</label>
            <input class="form-control" id="tf-location" name="location" list="venueList" maxlength="120" required value="${esc(v.location)}">
            <div class="invalid-feedback">Add a venue.</div>
          </div>
          <div class="col-md-4">
            <label class="form-label fw-semibold" for="tf-who">Who can enter</label>
            <select class="form-select" id="tf-who" name="who">
              <option value="junior" ${v.who === "junior" ? "selected" : ""}>Junior players</option>
              <option value="adult" ${v.who === "adult" ? "selected" : ""}>Adults</option>
            </select>
          </div>
          <div class="col-12">
            <label class="form-label fw-semibold" for="tf-divisions">Divisions <span class="fw-normal text-muted">(one per line)</span></label>
            <textarea class="form-control" id="tf-divisions" name="divisions" rows="4" required>${esc(v.divisions)}</textarea>
            <div class="form-text">${locked.length ? `Divisions with registered players can't be removed: ${locked.map(esc).join(", ")}.` : "For example: U13 Singles, Mixed Doubles B."}</div>
            <div class="invalid-feedback">Add at least one division.</div>
          </div>
          <div class="col-md-4">
            <label class="form-label fw-semibold" for="tf-opens">Registration opens <span class="fw-normal text-muted">(optional)</span></label>
            <input type="date" class="form-control" id="tf-opens" name="opens" value="${esc(v.opens)}">
          </div>
          <div class="col-md-4">
            <label class="form-label fw-semibold" for="tf-deadline">Registration deadline</label>
            <input type="date" class="form-control" id="tf-deadline" name="deadline" required value="${esc(v.deadline)}">
            <div class="form-text">Sign-ups close at 11:59 PM that day.</div>
            <div class="invalid-feedback">Choose a deadline.</div>
          </div>
          <div class="col-6 col-md-2">
            <label class="form-label fw-semibold" for="tf-capacity">Spots</label>
            <input type="number" class="form-control" id="tf-capacity" name="capacity" min="1" max="999" value="${esc(v.capacity)}">
          </div>
          <div class="col-6 col-md-2">
            <label class="form-label fw-semibold" for="tf-fee">Entry fee</label>
            <input class="form-control" id="tf-fee" name="fee" maxlength="40" placeholder="$30" value="${esc(v.fee)}">
          </div>
          <div class="col-12">
            <label class="form-label fw-semibold" for="tf-details">Details for players</label>
            <textarea class="form-control" id="tf-details" name="details" rows="3">${esc(v.details)}</textarea>
          </div>
        </div>
        <div class="d-flex flex-wrap gap-2 mt-3">
          <button type="submit" class="btn btn-brand">${ev ? "Save changes" : "Create tournament"}</button>
          <a href="#/admin/tournaments" class="btn btn-outline-secondary">Cancel</a>
        </div>
      </div></form>${venueDatalist()}`;
  }

  // ----- Practices: schedule, reschedule, cancel
  function adminPracticeRow(e) {
    const id = esc(e.id);
    return `<div class="list-group-item" data-admin-practice="${id}">
      <div class="d-flex flex-wrap justify-content-between gap-2">
        <div>
          <div class="fw-semibold ${e.cancelled ? "text-decoration-line-through text-muted" : ""}">${esc(e.title)}</div>
          <div class="small">${fmtDate(e.start)} · ${fmtTime(e.start)} – ${fmtTime(e.end)} · ${esc(e.location)}</div>
          <div class="small text-muted">${e.requiresRegistration ? `Sign-up required · ${regCount(e)}${e.capacity ? ` / ${e.capacity}` : ""} registered` : "No sign-up needed"}</div>
        </div>
        <div class="d-flex flex-wrap gap-1 align-items-start">
          ${e.cancelled ? '<span class="badge text-bg-dark">Cancelled</span>' : ""}
          ${e.rescheduledFrom && !e.cancelled ? '<span class="badge text-bg-warning">Rescheduled</span>' : ""}
          ${e.requiresRegistration && !e.cancelled ? statusBadge(e) : ""}
        </div>
      </div>
      <div class="d-flex flex-wrap gap-2 mt-2">
        ${e.cancelled
          ? `<button class="btn btn-sm btn-outline-success" data-action="practice-restore" data-id="${id}">Restore</button>`
          : `<button class="btn btn-sm btn-outline-primary" data-action="practice-reschedule" data-id="${id}">Reschedule</button>
             <button class="btn btn-sm btn-outline-danger" data-action="practice-cancel" data-id="${id}">Cancel</button>`}
        ${e.requiresRegistration ? `<a class="btn btn-sm btn-outline-secondary" href="#/admin/signups/${id}">Registered players</a>` : ""}
      </div>
    </div>`;
  }

  function viewAdminPractices() {
    if (!isAdmin()) return adminOnly();
    const filter = state.ui.adminClass || "all";
    const showAll = !!state.ui.adminShowAll;
    const horizon = addDays(new Date(), 28);
    const sessions = state.events
      .filter((e) => e.type === "practice" && upcoming(e))
      .filter((e) => filter === "all" || (filter === "other" ? !classOf(e) : classOf(e)?.id === filter))
      .filter((e) => showAll || parse(e.start) <= horizon)
      .sort(byStart);
    const weeks = {};
    sessions.forEach((e) => { const d = startOfDay(parse(e.start)); const k = ymd(addDays(d, -d.getDay())); (weeks[k] = weeks[k] || []).push(e); });
    return adminCrumbs(["Practices"]) + pageHeader("Practices",
      "Schedule new sessions, or reschedule and cancel existing ones. Members see changes on the calendar and class pages right away.",
      '<a href="#/admin/practices/new" class="btn btn-brand">Schedule a practice</a>') + `
      <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
        <label class="small text-muted" for="adminClassFilter">Class</label>
        <select class="form-select form-select-sm w-auto" id="adminClassFilter" data-ui="adminClass">
          <option value="all">All classes</option>
          ${CLASSES.map((c) => `<option value="${esc(c.id)}" ${filter === c.id ? "selected" : ""}>${esc(c.title)}</option>`).join("")}
          <option value="other" ${filter === "other" ? "selected" : ""}>Other sessions</option>
        </select>
        <button class="btn btn-sm btn-link" data-action="admin-toggle-all">${showAll ? "Show the next 4 weeks only" : "Show all upcoming"}</button>
      </div>
      <div id="adminPracticeList">
        ${Object.entries(weeks).map(([k, list]) => `
          <h2 class="h6 mt-3 mb-2 text-muted">Week of ${fmtDate(k + "T12:00")}</h2>
          <div class="list-group shadow-sm">${list.map(adminPracticeRow).join("")}</div>`).join("") || '<p class="text-muted">No upcoming practices match this filter.</p>'}
      </div>`;
  }

  function viewPracticeForm(preClass) {
    if (!isAdmin()) return adminOnly();
    const cid = CLASSES.some((c) => c.id === preClass) || preClass === "other" ? preClass : "general";
    const cls = CLASSES.find((c) => c.id === cid);
    const d = CLASS_DEFAULTS[cid] || {};
    return adminCrumbs(["Practices", "#/admin/practices"], ["Schedule a practice"]) +
      pageHeader("Schedule a practice", "New sessions appear on the calendar and the class page right away.") + `
      <form data-form="schedule-practice" class="card shadow-sm" novalidate><div class="card-body">
        <div class="form-errors"></div>
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label fw-semibold" for="pr-class">Class</label>
            <select class="form-select" id="pr-class" name="classId">
              ${CLASSES.map((c) => `<option value="${esc(c.id)}" ${c.id === cid ? "selected" : ""}>${esc(c.title)}</option>`).join("")}
              <option value="other" ${cid === "other" ? "selected" : ""}>Other / one-off session</option>
            </select>
          </div>
          <div class="col-md-6">
            <label class="form-label fw-semibold" for="pr-title">Session title <span class="fw-normal text-muted" id="pr-title-opt">${cls ? "(optional)" : ""}</span></label>
            <input class="form-control" id="pr-title" name="title" maxlength="100" placeholder="${esc(cls ? cls.title : "e.g. Holiday Footwork Clinic")}" ${cls ? "" : "required"}>
            <div class="invalid-feedback">Add a title for this session.</div>
          </div>
          <div class="col-md-4">
            <label class="form-label fw-semibold" for="pr-date">Date</label>
            <input type="date" class="form-control" id="pr-date" name="date" min="${ymd(new Date())}" required>
            <div class="invalid-feedback">Choose a date.</div>
          </div>
          <div class="col-6 col-md-4">
            <label class="form-label fw-semibold" for="pr-start">Start time</label>
            <input type="time" class="form-control" id="pr-start" name="startTime" required value="${d.start || "16:00"}">
          </div>
          <div class="col-6 col-md-4">
            <label class="form-label fw-semibold" for="pr-end">End time</label>
            <input type="time" class="form-control" id="pr-end" name="endTime" required value="${d.end || "18:00"}">
          </div>
          <div class="col-md-8">
            <label class="form-label fw-semibold" for="pr-location">Location</label>
            <input class="form-control" id="pr-location" name="location" list="venueList" maxlength="120" required value="${esc(d.location || "")}">
            <div class="invalid-feedback">Add a location.</div>
          </div>
          <div class="col-md-4">
            <label class="form-label fw-semibold" for="pr-weeks">Repeat weekly</label>
            <select class="form-select" id="pr-weeks" name="weeks">
              ${[1, 2, 4, 6, 8, 12].map((n) => `<option value="${n}">${n === 1 ? "Just this date" : `${n} weeks`}</option>`).join("")}
            </select>
          </div>
          <div class="col-md-4 d-flex align-items-end">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="pr-signup" name="requiresSignup" ${d.signup ? "checked" : ""}>
              <label class="form-check-label" for="pr-signup">Members must sign up</label>
            </div>
          </div>
          <div class="col-6 col-md-4">
            <label class="form-label fw-semibold" for="pr-capacity">Spots</label>
            <input type="number" class="form-control" id="pr-capacity" name="capacity" min="1" max="200" value="${d.capacity || ""}" ${d.signup ? "" : "disabled"}>
          </div>
          <div class="col-6 col-md-4">
            <label class="form-label fw-semibold" for="pr-eligibility">Who can attend</label>
            <select class="form-select" id="pr-eligibility" name="eligibility">
              ${Object.entries(whoLabel).map(([k, l]) => `<option value="${k}" ${k === (d.eligibility || "all") ? "selected" : ""}>${l}</option>`).join("")}
            </select>
          </div>
          <div class="col-12">
            <label class="form-label fw-semibold" for="pr-details">Details for members <span class="fw-normal text-muted">(optional)</span></label>
            <textarea class="form-control" id="pr-details" name="details" rows="2" placeholder="${esc(cls ? cls.details : "")}"></textarea>
          </div>
          <div class="col-12">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="pr-announce" name="announce">
              <label class="form-check-label" for="pr-announce">Post an announcement so members know about the new session</label>
            </div>
          </div>
        </div>
        <div class="d-flex flex-wrap gap-2 mt-3">
          <button type="submit" class="btn btn-brand">Schedule</button>
          <a href="#/admin/practices" class="btn btn-outline-secondary">Cancel</a>
        </div>
      </div></form>${venueDatalist()}`;
  }

  // Prefill the schedule form from the chosen class.
  function applyClassDefaults(sel) {
    const f = sel.form;
    const cls = CLASSES.find((c) => c.id === sel.value);
    const d = CLASS_DEFAULTS[sel.value] || {};
    if (d.start) fld(f, "startTime").value = d.start;
    if (d.end) fld(f, "endTime").value = d.end;
    if (d.location) fld(f, "location").value = d.location;
    fld(f, "requiresSignup").checked = !!d.signup;
    fld(f, "capacity").value = d.capacity || "";
    fld(f, "capacity").disabled = !d.signup;
    fld(f, "eligibility").value = d.eligibility || "all";
    const title = fld(f, "title");
    title.placeholder = cls ? cls.title : "e.g. Holiday Footwork Clinic";
    title.required = !cls;
    const opt = document.getElementById("pr-title-opt");
    if (opt) opt.textContent = cls ? "(optional)" : "";
    fld(f, "details").placeholder = cls ? cls.details : "";
  }

  // Reschedule / cancel / restore forms, shown in the shared modal.
  function openPracticeModal(kind, id) {
    const ev = event(id);
    if (!ev || !isAdmin() || ev.type !== "practice") return;
    const when = `${fmtDate(ev.start)} · ${fmtTime(ev.start)} – ${fmtTime(ev.end)} · ${esc(ev.location)}`;
    const announce = (label = "Post an announcement to members") => `
      <div class="form-check mt-3"><input class="form-check-input" type="checkbox" id="pm-announce" name="announce" checked>
      <label class="form-check-label" for="pm-announce">${label}</label></div>`;
    const signedUp = ev.requiresRegistration ? regCount(ev) : 0;
    const warn = signedUp ? `<div class="alert alert-warning py-2 small">${signedUp} player${signedUp === 1 ? " is" : "s are"} signed up. They'll see this change in My Registrations.</div>` : "";
    const buttons = (label, cls) => `<div class="d-flex flex-wrap gap-2 mt-3"><button type="submit" class="btn ${cls}">${label}</button>
      <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Close</button></div>`;
    if (kind === "reschedule") {
      return showModal(`Reschedule: ${esc(ev.title)}`, `
        <p class="small text-muted mb-2">Currently ${when}</p>
        <form data-form="practice-reschedule" data-id="${esc(ev.id)}" novalidate>
          <div class="form-errors"></div>${warn}
          <div class="row g-2">
            <div class="col-12"><label class="form-label" for="rs-date">Date</label>
              <input type="date" class="form-control" id="rs-date" name="date" required value="${ev.start.slice(0, 10)}"></div>
            <div class="col-6"><label class="form-label" for="rs-start">Start</label>
              <input type="time" class="form-control" id="rs-start" name="startTime" required value="${ev.start.slice(11, 16)}"></div>
            <div class="col-6"><label class="form-label" for="rs-end">End</label>
              <input type="time" class="form-control" id="rs-end" name="endTime" required value="${ev.end.slice(11, 16)}"></div>
            <div class="col-12"><label class="form-label" for="rs-location">Location</label>
              <input class="form-control" id="rs-location" name="location" list="venueList" maxlength="120" required value="${esc(ev.location)}"></div>
            ${ev.requiresRegistration ? `<div class="col-6"><label class="form-label" for="rs-capacity">Spots</label>
              <input type="number" class="form-control" id="rs-capacity" name="capacity" min="1" max="200" value="${ev.capacity || ""}"></div>` : ""}
            <div class="col-12"><label class="form-label" for="rs-note">Note to members <span class="text-muted">(optional)</span></label>
              <textarea class="form-control" id="rs-note" name="note" rows="2"></textarea></div>
          </div>
          ${announce()}
          ${buttons("Save changes", "btn-brand")}
        </form>${venueDatalist()}`);
    }
    if (kind === "cancel") {
      return showModal(`Cancel: ${esc(ev.title)}`, `
        <p class="mb-2">${when}</p>
        <form data-form="practice-cancel" data-id="${esc(ev.id)}" novalidate>
          ${warn}
          <label class="form-label" for="pc-reason">Reason <span class="text-muted">(shown to members)</span></label>
          <textarea class="form-control" id="pc-reason" name="reason" rows="2" maxlength="300" placeholder="e.g. The gym is reserved for a school event."></textarea>
          ${announce()}
          ${buttons("Cancel practice", "btn-danger")}
        </form>`);
    }
    return showModal(`Restore: ${esc(ev.title)}`, `
      <p class="mb-1">Put this practice back on the schedule?</p>
      <p class="small text-muted">${when}</p>
      <form data-form="practice-restore" data-id="${esc(ev.id)}" novalidate>
        ${announce("Post an announcement that it's back on")}
        ${buttons("Restore practice", "btn-success")}
      </form>`);
  }

  // ----- Sign-ups & registered players
  function viewAdminSignups() {
    if (!isAdmin()) return adminOnly();
    const type = state.ui.adminSignupType || "all";
    const list = state.events.filter((e) => e.requiresRegistration && upcoming(e) && (type === "all" || e.type === type)).sort(byStart);
    const tab = (k, label) => `<button class="btn btn-sm ${type === k ? "btn-dark" : "btn-outline-secondary"}" data-action="admin-signup-type" data-type="${k}" aria-pressed="${type === k}">${label}</button>`;
    return adminCrumbs(["Sign-ups"]) + pageHeader("Sign-ups", "Open or close sign-ups and view registered players for every event that needs registration.") + `
      <div class="d-flex flex-wrap gap-2 mb-3" role="group" aria-label="Filter events">${tab("all", "All")}${tab("tournament", "Tournaments")}${tab("practice", "Practices")}</div>
      <div class="list-group shadow-sm" id="adminSignupList">
        ${list.map((e) => `
          <div class="list-group-item" data-admin-signup="${esc(e.id)}">
            <div class="d-flex flex-wrap justify-content-between gap-2">
              <div>
                <div class="fw-semibold">${esc(e.title)} ${typeBadge(e)}</div>
                <div class="small text-muted">${fmtDate(e.start)} · ${fmtTime(e.start)} · ${e.deadline ? `deadline ${fmtShortDate(e.deadline)}` : "sign up until it starts"}</div>
              </div>
              <div class="text-md-end">${statusBadge(e)}<div class="small text-muted">${regCount(e)}${e.capacity ? ` / ${e.capacity}` : ""} registered</div></div>
            </div>
            <div class="d-flex flex-wrap gap-2 mt-2">
              ${signupToggle(e)}
              <a class="btn btn-sm btn-outline-secondary" href="#/admin/signups/${esc(e.id)}">View registered players</a>
            </div>
          </div>`).join("") || '<div class="list-group-item text-muted">No upcoming events need registration.</div>'}
      </div>`;
  }

  function registeredBy(r) {
    const p = player(r.playerId);
    if (r.userId === MEMBER_ID) return p && p.userId === MEMBER_ID ? "Self" : `${user(MEMBER_ID).name} (guardian)`;
    if (state.users[r.userId]) return state.users[r.userId].name;
    return p && p.adult ? "Self" : "Parent/guardian";
  }

  function viewAdminRoster(id) {
    if (!isAdmin()) return adminOnly();
    const ev = event(id);
    if (!ev || !ev.requiresRegistration) return notFound("event");
    const demo = regsFor(ev.id).sort((a, b) => parse(a.createdAt) - parse(b.createdAt)).map((r) => ({
      name: player(r.playerId)?.name || "Unknown player", division: r.division, by: registeredBy(r), when: fmtStamp(r.createdAt), code: r.code, sample: false,
    }));
    const rows = [...demo, ...sampleRoster(ev)];
    const divCounts = ev.divisions ? ev.divisions.map((d) => [d, rows.filter((r) => r.division === d).length]) : [];
    return adminCrumbs(["Sign-ups", "#/admin/signups"], [esc(ev.title)]) +
      pageHeader("Registered players", `${esc(ev.title)} · ${fmtDate(ev.start)} · ${fmtTime(ev.start)} – ${fmtTime(ev.end)}`) + `
      <div class="card shadow-sm mb-3"><div class="card-body d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div>${statusBadge(ev)} <span class="ms-1">${regCount(ev)}${ev.capacity ? ` / ${ev.capacity}` : ""} registered</span>
          ${ev.deadline ? `<span class="small text-muted ms-2">Deadline ${fmtDate(ev.deadline)}</span>` : ""}</div>
        <div class="d-flex flex-wrap gap-2">${signupToggle(ev)}
          ${ev.type === "tournament" ? `<a class="btn btn-sm btn-outline-primary" href="#/admin/tournaments/${esc(ev.id)}">Edit tournament</a>` : ""}
          <button class="btn btn-sm btn-outline-secondary" data-action="open-event" data-id="${esc(ev.id)}">Event details</button></div>
      </div></div>
      ${divCounts.length ? `<div class="mb-3">${divCounts.map(([d, n]) => `<span class="badge text-bg-light border me-1 mb-1">${esc(d)}: ${n}</span>`).join("")}</div>` : ""}
      ${rows.length ? `<div class="card shadow-sm"><div class="table-responsive"><table class="table table-sm align-middle mb-0" id="rosterTable">
        <thead class="table-light"><tr><th scope="col">#</th><th scope="col">Player</th>${ev.divisions ? '<th scope="col">Division</th>' : ""}<th scope="col">Registered by</th><th scope="col">Signed up</th><th scope="col">Code</th></tr></thead>
        <tbody>${rows.map((r, i) => `<tr class="${r.sample ? "text-muted" : ""}"><td>${i + 1}</td><td class="text-nowrap">${esc(r.name)} ${r.sample ? sampleTag : ""}</td>${ev.divisions ? `<td>${esc(r.division || "—")}</td>` : ""}<td>${esc(r.by)}</td><td class="text-nowrap">${esc(r.when)}</td><td><code>${esc(r.code)}</code></td></tr>`).join("")}</tbody>
      </table></div></div>` : '<p class="text-muted">No one has signed up yet.</p>'}`;
  }

  // ---------------------------------------------------------------- router
  function updateNavBadge() {
    const n = totalUnread();
    $("#navUnread").text(n).toggleClass("d-none", !n).attr("aria-label", `${n} unread messages`);
  }

  function render() {
    const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
    const [section, id] = parts;
    let html, nav;
    switch (section) {
      case undefined: case "home": html = viewHome(); nav = "home"; break;
      case "classes": html = id ? viewClass(id) : viewClasses(); nav = "classes"; break;
      case "tournaments": html = id ? viewTournament(id) : viewTournaments(); nav = "tournaments"; break;
      case "events": html = viewEventPage(id); nav = event(id)?.type === "tournament" ? "tournaments" : "classes"; break;
      case "calendar": html = viewCalendar(); nav = "calendar"; break;
      case "registrations": html = viewRegistrations(); nav = "calendar"; break;
      case "recognition":
        html = id === "new" ? viewSpotlightNew() : id ? viewSpotlight(id) : viewRecognition(); nav = "recognition"; break;
      case "announcements": html = id ? viewAnnouncement(id) : viewAnnouncements(); nav = "communications"; break;
      case "messages": html = viewMessages(id); nav = "communications"; break;
      case "admin": {
        const [, sub, subId, extra] = parts;
        nav = "admin";
        if (!sub) html = viewAdminDashboard();
        else if (sub === "tournaments") html = subId === "new" ? viewTournamentForm(null) : subId ? viewTournamentForm(subId) : viewAdminTournaments();
        else if (sub === "practices") html = subId === "new" ? viewPracticeForm(extra) : viewAdminPractices();
        else if (sub === "signups") html = subId ? viewAdminRoster(subId) : viewAdminSignups();
        else html = notFound("page");
        break;
      }
      default: html = notFound("page"); nav = "";
    }
    $("#app").html(html);
    $("#navAdmin").toggleClass("d-none", !isAdmin());
    $(".club-nav .nav-link").removeClass("active").removeAttr("aria-current");
    const activeTab = $(`.club-nav [data-nav="${nav}"]`).addClass("active").attr("aria-current", "page")[0];
    if (activeTab) { const bar = activeTab.parentElement; bar.scrollLeft = activeTab.offsetLeft - (bar.clientWidth - activeTab.offsetWidth) / 2; }
    $("#roleSwitch").val(state.role);
    $("#viewingAs").html(`Viewing as <strong>${esc(me().name)}</strong> — ${esc(me().title)} · <span class="text-danger">Demo with fictional sample data; changes are saved in this browser.</span>`);
    updateNavBadge();
    const thread = document.getElementById("threadMessages");
    if (thread) thread.scrollTop = thread.scrollHeight;
  }

  // ---------------------------------------------------------------- actions
  const actions = {
    "open-event": (el) => openEventModal(el.dataset.id),
    "modal-go": (el, e) => { e.preventDefault(); if (el.closest("#eventModal")) modal().hide(); go(el.getAttribute("href")); },
    "open-register": (el) => openRegister(el.dataset.id),
    "select-day": (el) => { state.ui.selectedDay = state.ui.selectedDay === el.dataset.day ? null : el.dataset.day; save(); render(); },
    "clear-day": () => { state.ui.selectedDay = null; save(); render(); },
    "cal-prev": () => shiftMonth(-1),
    "cal-next": () => shiftMonth(1),
    "cal-today": () => { state.ui.calMonth = ymd(new Date()).slice(0, 7); state.ui.selectedDay = null; save(); render(); },
    "goto-calendar": (el) => {
      const ev = event(el.dataset.id);
      state.ui.calMonth = ev.start.slice(0, 7); state.ui.selectedDay = ev.start.slice(0, 10);
      state.ui.filters[ev.type] = true; save(); go("#/calendar");
    },
    "cancel-reg": (el) => {
      const r = state.registrations.find((x) => x.id === el.dataset.id);
      if (!r || !confirm(`Cancel ${player(r.playerId)?.name}'s registration for ${event(r.eventId)?.title}?`)) return;
      state.registrations = state.registrations.filter((x) => x.id !== r.id);
      save(); toast("Registration cancelled.", "secondary"); render();
    },
    "spot-edit": () => { state.spotlightDraft.previewing = false; save(); render(); },
    "spot-discard": () => { state.spotlightDraft = null; save(); },
    "spot-publish": () => {
      const d = state.spotlightDraft;
      if (!d || !isAdmin()) return;
      const s = { id: uid("s"), playerId: d.playerId, headline: d.headline, improved: d.improved, example: d.example,
        nextSkill: d.nextSkill, coachingNotes: d.coachingNotes, authorId: ADMIN_ID, publishedAt: isoNow() };
      state.spotlights.push(s);
      state.spotlightDraft = null;
      save();
      toast(`Spotlight for ${esc(player(s.playerId).name)} published.`);
      go(`#/recognition/${s.id}`);
    },
    "delete-spotlight": (el) => {
      if (!isAdmin() || !confirm("Unpublish this spotlight?")) return;
      state.spotlights = state.spotlights.filter((s) => s.id !== el.dataset.id);
      save(); toast("Spotlight unpublished.", "secondary"); go("#/recognition");
    },
    "signups-open": (el) => setSignups(el, "open"),
    "signups-close": (el) => setSignups(el, "closed"),
    "signups-auto": (el) => setSignups(el, null),
    "practice-reschedule": (el) => openPracticeModal("reschedule", el.dataset.id),
    "practice-cancel": (el) => openPracticeModal("cancel", el.dataset.id),
    "practice-restore": (el) => openPracticeModal("restore", el.dataset.id),
    "admin-toggle-all": () => { state.ui.adminShowAll = !state.ui.adminShowAll; save(); render(); },
    "admin-signup-type": (el) => { state.ui.adminSignupType = el.dataset.type; save(); render(); },
    "reset-demo": () => {
      if (!confirm("Reset all demo data (registrations, messages, spotlights, announcements)?")) return;
      try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
      load(); toast("Demo data reset."); go("#/");
    },
  };

  function shiftMonth(delta) {
    const [y, m] = state.ui.calMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    state.ui.calMonth = ymd(d).slice(0, 7);
    state.ui.selectedDay = null;
    save(); render();
  }

  const forms = {
    register: submitRegister,
    spotlight(form) {
      form.classList.add("was-validated");
      if (!form.checkValidity()) return;
      const fd = new FormData(form);
      state.spotlightDraft = {
        playerId: fd.get("playerId"), headline: fd.get("headline").trim(), improved: fd.get("improved").trim(),
        example: fd.get("example").trim(), nextSkill: fd.get("nextSkill").trim(), coachingNotes: fd.get("coachingNotes").trim(),
        previewing: true,
      };
      save(); render(); window.scrollTo(0, 0);
    },
    announcement(form) {
      form.classList.add("was-validated");
      if (!form.checkValidity() || !isAdmin()) return;
      const fd = new FormData(form);
      const a = {
        id: uid("a"), title: fd.get("title").trim(), body: fd.get("body").trim(), category: fd.get("category"),
        eventId: fd.get("eventId") || null, authorId: ADMIN_ID, createdAt: isoNow(),
      };
      if (!a.title || !a.body) return;
      state.announcements.push(a);
      const ev = a.eventId && event(a.eventId);
      if (ev && fd.get("markCancelled") && ev.type === "practice") ev.cancelled = true;
      save(); toast("Announcement posted to all members."); render();
    },
    // ----- admin: create or edit a tournament
    tournament(form) {
      if (!isAdmin()) return;
      form.classList.add("was-validated");
      if (!form.checkValidity()) return showFormErrors(form, ["Please fill in the highlighted fields."]);
      const fd = new FormData(form);
      const get = (n) => String(fd.get(n) || "").trim();
      const ev = form.dataset.id ? event(form.dataset.id) : null;
      const divisions = [...new Set(get("divisions").split("\n").map((d) => d.trim()).filter(Boolean))];
      const start = `${get("date")}T${get("startTime")}`;
      const end = `${get("date")}T${get("endTime")}`;
      const errs = [];
      if (!get("title")) errs.push("Add a tournament name.");
      if (!divisions.length) errs.push("Add at least one division.");
      if (get("endTime") <= get("startTime")) errs.push("The end time must be after the start time.");
      if (get("deadline") > get("date")) errs.push("The registration deadline must be on or before the tournament date.");
      if (get("opens") && get("opens") > get("deadline")) errs.push("Registration must open on or before the deadline.");
      if (!ev && parse(start) < new Date()) errs.push("Choose a tournament date in the future.");
      if (ev) {
        const missing = [...new Set(regsFor(ev.id).map((r) => r.division).filter((d) => d && !divisions.includes(d)))];
        if (missing.length) errs.push(`Players are registered in ${missing.join(", ")} — keep ${missing.length > 1 ? "those divisions" : "that division"}.`);
      }
      if (errs.length) return showFormErrors(form, errs);
      const data = {
        title: get("title"), start, end, location: get("location"), divisions, adultEvent: get("who") === "adult",
        opensAt: get("opens") ? `${get("opens")}T00:00` : null, deadline: `${get("deadline")}T23:59`,
        capacity: get("capacity") ? parseInt(get("capacity"), 10) : null, fee: get("fee") || null, details: get("details"),
      };
      let target = ev;
      if (ev) Object.assign(ev, data);
      else {
        target = Object.assign({ id: uid("t"), type: "tournament", requiresRegistration: true, baseRegistered: 0 }, data);
        state.events.push(target);
      }
      save();
      toast(`${ev ? "Saved changes to" : "Created"} ${esc(target.title)}. <a href="#/tournaments/${esc(target.id)}" class="link-light fw-semibold">View public page</a>`);
      go("#/admin/tournaments");
    },
    // ----- admin: schedule practice sessions (optionally weekly)
    "schedule-practice"(form) {
      if (!isAdmin()) return;
      form.classList.add("was-validated");
      if (!form.checkValidity()) return showFormErrors(form, ["Please fill in the highlighted fields."]);
      const fd = new FormData(form);
      const get = (n) => String(fd.get(n) || "").trim();
      const cls = CLASSES.find((c) => c.id === get("classId"));
      const title = get("title") || (cls ? cls.title : "");
      const requires = !!fd.get("requiresSignup");
      const errs = [];
      if (!title) errs.push("Add a title for this session.");
      if (get("endTime") <= get("startTime")) errs.push("The end time must be after the start time.");
      if (parse(`${get("date")}T${get("startTime")}`) < new Date()) errs.push("Choose a date and time in the future.");
      if (requires && !(parseInt(get("capacity"), 10) > 0)) errs.push("Enter how many spots are available.");
      if (errs.length) return showFormErrors(form, errs);
      const weeks = Math.min(12, Math.max(1, parseInt(get("weeks"), 10) || 1));
      const eligibility = whoLabel[get("eligibility")] ? get("eligibility") : "all";
      const base = new Date(`${get("date")}T12:00`);
      const created = [];
      for (let i = 0; i < weeks; i++) {
        const d = addDays(base, 7 * i);
        const ev = {
          id: uid("pr"), type: "practice", classId: cls ? cls.id : null, title,
          start: at(d, get("startTime")), end: at(d, get("endTime")), location: get("location"),
          audience: cls ? cls.who : whoLabel[eligibility], details: get("details") || (cls ? cls.details : ""),
          requiresRegistration: requires, capacity: requires ? parseInt(get("capacity"), 10) : null, baseRegistered: 0, eligibility,
        };
        state.events.push(ev);
        created.push(ev);
      }
      const first = created[0];
      const announce = !!fd.get("announce");
      if (announce) {
        postAnnouncement({
          category: "change", eventId: first.id,
          title: weeks > 1 ? `New: ${title} — ${weeks} weekly sessions` : `New session: ${title} on ${fmtShortDate(first.start)}`,
          body: `${title} ${weeks > 1 ? `starts ${fmtDate(first.start)} and runs weekly for ${weeks} weeks` : `is on ${fmtDate(first.start)}`}, `
            + `${fmtTime(first.start)} – ${fmtTime(first.end)} at ${first.location}.${requires ? " Sign-up is required — register from the calendar." : ""}`,
        });
      }
      save();
      toast(`Scheduled ${weeks} session${weeks > 1 ? "s" : ""} of ${esc(title)}${announce ? " and notified members" : ""}.`);
      go("#/admin/practices");
    },
    // ----- admin: reschedule (date, time, place, spots)
    "practice-reschedule"(form) {
      const ev = event(form.dataset.id);
      if (!ev || !isAdmin()) return;
      form.classList.add("was-validated");
      if (!form.checkValidity()) return showFormErrors(form, ["Please fill in the highlighted fields."]);
      const fd = new FormData(form);
      const get = (n) => String(fd.get(n) || "").trim();
      const start = `${get("date")}T${get("startTime")}`;
      const end = `${get("date")}T${get("endTime")}`;
      const location = get("location");
      const capacity = ev.requiresRegistration && get("capacity") ? parseInt(get("capacity"), 10) : ev.capacity;
      const moved = start !== ev.start || end !== ev.end;
      const relocated = location !== ev.location;
      const resized = capacity !== ev.capacity;
      const errs = [];
      if (get("endTime") <= get("startTime")) errs.push("The end time must be after the start time.");
      if (moved && parse(start) < new Date()) errs.push("Choose a date and time in the future.");
      if (!moved && !relocated && !resized) errs.push("Nothing changed — choose a new date, time, location or number of spots.");
      if (errs.length) return showFormErrors(form, errs);
      const before = { start: ev.start, location: ev.location };
      if (moved) {
        if (!ev.rescheduledFrom) ev.rescheduledFrom = ev.start;
        ev.start = start;
        ev.end = end;
        if (ev.rescheduledFrom === ev.start) delete ev.rescheduledFrom; // moved back to the original time
      }
      ev.location = location;
      ev.capacity = capacity;
      const notify = !!fd.get("announce") && (moved || relocated);
      if (notify) {
        const what = moved ? `is now on ${fmtDate(start)}, ${fmtTime(start)} – ${fmtTime(end)}${relocated ? ` at ${location}` : ""}` : `moves to ${location}`;
        postAnnouncement({
          category: "change", eventId: ev.id,
          title: `${ev.title} on ${fmtShortDate(before.start)} ${moved ? "has been rescheduled" : "has a new location"}`,
          body: `${ev.title} (originally ${fmtDate(before.start)} at ${fmtTime(before.start)}, ${before.location}) ${what}.${get("note") ? `\n\n${get("note")}` : ""}`,
        });
      }
      save();
      modal().hide();
      toast(`${esc(ev.title)} updated${notify ? " and members notified" : ""}.`);
      render();
    },
    // ----- admin: cancel / restore a practice
    "practice-cancel"(form) {
      const ev = event(form.dataset.id);
      if (!ev || !isAdmin()) return;
      const fd = new FormData(form);
      const reason = String(fd.get("reason") || "").trim();
      ev.cancelled = true;
      if (reason) ev.cancelReason = reason; else delete ev.cancelReason;
      const announce = !!fd.get("announce");
      if (announce) {
        postAnnouncement({
          category: "cancellation", eventId: ev.id,
          title: `No ${ev.title} on ${fmtShortDate(ev.start)}`,
          body: `${ev.title} on ${fmtDate(ev.start)} (${fmtTime(ev.start)}, ${ev.location}) is cancelled.${reason ? ` ${reason}` : ""}`,
        });
      }
      save();
      modal().hide();
      toast(`${esc(ev.title)} on ${fmtShortDate(ev.start)} cancelled${announce ? " and members notified" : ""}.`, "secondary");
      render();
    },
    "practice-restore"(form) {
      const ev = event(form.dataset.id);
      if (!ev || !isAdmin()) return;
      const announce = !!new FormData(form).get("announce");
      ev.cancelled = false;
      delete ev.cancelReason;
      if (announce) {
        postAnnouncement({
          category: "change", eventId: ev.id,
          title: `${ev.title} on ${fmtShortDate(ev.start)} is back on`,
          body: `Good news — ${ev.title} on ${fmtDate(ev.start)} at ${fmtTime(ev.start)} (${ev.location}) is back on the schedule.`,
        });
      }
      save();
      modal().hide();
      toast(`${esc(ev.title)} on ${fmtShortDate(ev.start)} is back on${announce ? " and members notified" : ""}.`);
      render();
    },
    "new-message"(form) {
      form.classList.add("was-validated");
      if (!form.checkValidity() || isAdmin()) return;
      const fd = new FormData(form);
      const c = {
        id: uid("c"), memberId: MEMBER_ID, to: fd.get("to"), subject: fd.get("subject").trim(), playerId: fd.get("playerId") || null,
        messages: [{ id: uid("m"), from: MEMBER_ID, at: isoNow(), body: fd.get("body").trim() }],
        readAt: { member: isoNow(), staff: null },
      };
      state.conversations.push(c);
      save(); toast("Message sent privately to club staff."); go(`#/messages/${c.id}`);
    },
    reply(form) {
      const c = state.conversations.find((x) => x.id === form.dataset.id);
      const body = new FormData(form).get("body").trim();
      if (!c || !body) { form.classList.add("was-validated"); return; }
      const from = isAdmin() ? ADMIN_ID : MEMBER_ID;
      c.messages.push({ id: uid("m"), from, at: isoNow(), body });
      c.readAt[isAdmin() ? "staff" : "member"] = isoNow();
      save(); toast(isAdmin() ? "Reply sent." : "Message sent."); render();
    },
  };

  // ---------------------------------------------------------------- boot
  function loadSharedComponents() {
    // Reuse the site's shared navbar and footer. The footer component bundles its own
    // Bootstrap <script>; strip it since this page already loads Bootstrap once.
    $.get("/components/navbar.html", (h) => $("#navbar").html(h));
    $.get("/components/footer.html", (h) => $("#footer").html(h.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<\/?(body|html)>/gi, "")));
  }

  $(function () {
    load();
    loadSharedComponents();

    document.addEventListener("click", (e) => {
      const el = e.target.closest("[data-action]");
      if (!el || !actions[el.dataset.action]) return;
      if (el.tagName === "A" && el.getAttribute("href") === "#") e.preventDefault();
      actions[el.dataset.action](el, e);
    });
    document.addEventListener("submit", (e) => {
      const form = e.target.closest("form[data-form]");
      if (!form) return;
      e.preventDefault();
      forms[form.dataset.form]?.(form);
    });
    document.addEventListener("change", (e) => {
      if (e.target.dataset.filter) {
        state.ui.filters[e.target.dataset.filter] = e.target.checked;
        save(); render();
      }
      if (e.target.id === "pr-class") applyClassDefaults(e.target);
      if (e.target.id === "pr-signup") fld(e.target.form, "capacity").disabled = !e.target.checked;
      if (e.target.dataset.ui) { state.ui[e.target.dataset.ui] = e.target.value; save(); render(); }
    });
    // Keyboard support for calendar day cells
    document.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && e.target.classList?.contains("cal-cell")) { e.preventDefault(); e.target.click(); }
    });

    $("#roleSwitch").on("change", function () {
      state.role = this.value;
      save();
      toast(this.value === "admin"
        ? 'Switched to Admin view. <a href="#/admin" class="link-light fw-semibold">Open the Admin Dashboard</a>'
        : "Switched to Adult Member view.", "dark");
      // Return to the inbox so the new role sees its unread indicators (and never another family's thread).
      if (location.hash.startsWith("#/messages/")) go("#/messages");
      else if (location.hash.startsWith("#/admin") && this.value !== "admin") go("#/");
      else render();
    });

    window.addEventListener("hashchange", () => { render(); window.scrollTo(0, 0); });
    render();
  });
})();
