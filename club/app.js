/*
 * MK3 Sportz – club hub, shared by every sport (Badminton, Pickleball, ...).
 * Single-page app using the site's existing stack (Bootstrap 5 + jQuery). The sport comes
 * from the URL (/badminton/, /pickleball/) and its content from club/sports/<sport>.js.
 * All people, messages, registrations and tournaments are FICTIONAL SAMPLE DATA.
 * Club data is stored on the server (server/). Visitors have no accounts: what they create
 * (registrations, message threads) is opened by a secret key kept in their browser.
 * Only admins sign in (Google, allowlisted accounts); the server enforces that, not this file.
 */
(function () {
  "use strict";


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
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const escBr = (s) => esc(s).replace(/\n/g, "<br>");
  const sampleTag = '<span class="badge rounded-pill text-bg-light border sample-tag">Sample</span>';

  // ---------------------------------------------------------------- sport
  // Which sport this page is for comes from the URL; rules and content are shared with the
  // server (club/club-core.js, club/sports/<sport>.js). Every API call is scoped to the sport.
  const Core = window.ClubCore;
  const SPORT = Core.sport(location.pathname.split("/")[1]) || Core.sport("badminton");
  const API = `/api/${SPORT.id}`;
  const CLASSES = SPORT.classes;
  const CLASS_DEFAULTS = SPORT.classDefaults;
  const whoLabel = Core.WHO_LABEL;
  const classOf = (ev) => Core.classOf(SPORT, ev);
  const eligibilityOf = (ev) => Core.eligibilityOf(SPORT, ev);
  document.title = SPORT.pageTitle;
  document.documentElement.dataset.sport = SPORT.id;
  $("#clubName").text(SPORT.clubName);
  $("#clubByline").text(SPORT.byline);
  // Academy artwork in the page chrome: crest next to the name (decorative there) and the tab icon.
  const BRAND = SPORT.brand;
  $("#clubLogo").attr({ src: BRAND.logo.src, srcset: BRAND.logo.srcset, sizes: "37px", alt: "" }).prop("hidden", false);
  $("#favicon").attr({ href: BRAND.favicon, type: "image/png" });
  const regStatus = (ev) => window.ClubCore.regStatus(ev, { count: regCount(ev), fmtShortDate });

  // ---------------------------------------------------------------- data (server) + view preferences (browser)
  // Club data lives on the server, separately for each sport: /api/<sport>/state for members and
  // visitors, /api/<sport>/admin/state only for a signed-in admin. This browser just remembers
  // view preferences.
  const PREFS_KEY = `mk3-${SPORT.id}-prefs-v2`;
  const DRAFT_KEY = `mk3-${SPORT.id}-spotlight-draft`;
  const SIGN_IN_URL = `/${SPORT.id}/admin-sign-in.html`;
  const DATA_KEYS = ["users", "players", "events", "announcements", "registrations", "spotlights", "conversations"];
  const state = {
    role: "member", // "member" = the public site; "admin" only while the server reports an admin session
    spotlightDraft: null,
    ui: { calMonth: ymd(new Date()).slice(0, 7), selectedDay: null, filters: { practice: true, tournament: true } },
    users: {}, players: [], events: [], announcements: [], registrations: [], spotlights: [], conversations: [],
  };
  let session = { admin: false, configured: false };
  let loaded = false;

  // Visitors have no accounts. What they create (registrations, message threads) comes back with a
  // secret key; this browser keeps the keys, so "My Registrations" and "Messages" show only their own.
  const DEVICE_KEY = `mk3-${SPORT.id}-device-v1`;
  const LOOKUP_LIMIT = 50;
  const device = { registrations: [], conversations: [] };
  function loadDevice() {
    try {
      const d = JSON.parse(localStorage.getItem(DEVICE_KEY) || "{}");
      for (const kind of ["registrations", "conversations"]) {
        device[kind] = (Array.isArray(d[kind]) ? d[kind] : []).filter((x) => x && typeof x.id === "string" && typeof x.key === "string");
      }
    } catch (e) { /* storage unavailable: remember things for this visit only */ }
  }
  function saveDevice() { try { localStorage.setItem(DEVICE_KEY, JSON.stringify(device)); } catch (e) { /* ignore */ } }
  function remember(kind, id, key) {
    if (!device[kind].some((x) => x.id === id)) device[kind].push({ id, key });
    saveDevice();
  }
  const keyFor = (kind, id) => (device[kind].find((x) => x.id === id) || {}).key;
  const notesCache = {}; // spotlight id → coaching notes opened with a private family link

  function loadPrefs() {
    try {
      localStorage.removeItem("mk3-badminton-demo-v1"); // data from the old browser-only demo
      const p = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
      if (p.role === "admin" || p.role === "member") state.role = p.role;
      if (p.ui && typeof p.ui === "object") Object.assign(state.ui, p.ui);
    } catch (e) { /* storage unavailable: use defaults */ }
    try { state.spotlightDraft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null"); } catch (e) { state.spotlightDraft = null; }
    loadDevice();
  }
  function save() {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify({ role: state.role, ui: state.ui })); } catch (e) { /* ignore */ }
    try {
      if (state.spotlightDraft) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(state.spotlightDraft));
      else sessionStorage.removeItem(DRAFT_KEY);
    } catch (e) { /* ignore */ }
  }

  class ApiError extends Error {
    constructor(status, errors) { super(errors[0]); this.status = status; this.errors = errors; }
  }
  async function api(method, url, body) {
    const opts = { method, credentials: "same-origin", headers: { Accept: "application/json" } };
    if (method !== "GET" && method !== "DELETE") {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body || {});
    }
    let res;
    try { res = await fetch(url, opts); } catch (e) { throw new ApiError(0, ["Can't reach the club server. Check that it's running, then try again."]); }
    let data = {};
    try { data = await res.json(); } catch (e) { /* no body */ }
    if (res.status === 401 && url.startsWith(`${API}/admin`)) adminSessionEnded();
    if (!res.ok) throw new ApiError(res.status, data.errors || [data.error || "Something went wrong. Please try again."]);
    return data;
  }
  async function refreshSession() {
    try { session = await api("GET", "/api/session"); } catch (e) { session = { admin: false, configured: false }; }
    if (!session.admin && state.role === "admin") { state.role = "member"; save(); }
  }
  async function loadState() {
    const data = await api("GET", isAdmin() ? `${API}/admin/state` : `${API}/state`);
    for (const k of DATA_KEYS) state[k] = data[k] || (k === "users" ? {} : []);
    if (!isAdmin()) await loadDeviceItems();
    loaded = true;
  }
  /** This browser's own registrations and message threads, opened with their keys. */
  async function loadDeviceItems() {
    const fetchKind = async (kind) => {
      const sent = device[kind].slice(0, LOOKUP_LIMIT);
      if (!sent.length) return [];
      const found = (await api("POST", `${API}/${kind}/lookup`, { items: sent }))[kind] || [];
      // Forget anything the club no longer has (cancelled, or the demo data was reset).
      const ids = new Set(found.map((x) => x.id));
      if (found.length < sent.length) { device[kind] = device[kind].filter((x, i) => i >= LOOKUP_LIMIT || ids.has(x.id)); saveDevice(); }
      return found;
    };
    [state.registrations, state.conversations] = await Promise.all([fetchKind("registrations"), fetchKind("conversations")]);
  }
  /** Make a change on the server, then reload the data this viewer may see. */
  async function change(method, url, body) {
    const out = await api(method, url, body);
    await loadState();
    return out;
  }
  /** For forms: run the change, or show the server's validation errors in the form. */
  async function submitForm(form, method, url, body) {
    const btn = form.querySelector("[type=submit]");
    if (btn) btn.disabled = true;
    try { return await change(method, url, body); }
    catch (err) { showFormErrors(form, err.errors); return null; }
    finally { if (btn) btn.disabled = false; }
  }
  function adminSessionEnded() {
    if (!session.admin) return;
    session = { admin: false, configured: session.configured };
    state.role = "member";
    save();
    location.href = `${SIGN_IN_URL}?error=expired`;
  }

  // ---------------------------------------------------------------- selectors / rules
  // Admin view = the server says this browser has an admin session AND the admin chose the Admin view.
  const isAdmin = () => state.role === "admin" && session.admin === true;
  const me = () => state.users[session.userId] || { id: session.userId, name: session.name, title: "Club Admin" }; // the signed-in admin
  const user = (id) => state.users[id] || { name: "Club member", title: "" };
  const player = (id) => state.players.find((p) => p.id === id);
  const event = (id) => state.events.find((e) => e.id === id);
  const tournaments = () => state.events.filter((e) => e.type === "tournament").sort(byStart);
  const byStart = (a, b) => parse(a.start) - parse(b.start);
  const upcoming = (e) => parse(e.end) >= new Date();

  // Coaching notes: staff see them; a family sees them only through the private link staff send.
  const notesFor = (spot) => (isAdmin() ? spot.coachingNotes : notesCache[spot.id]);

  // Admin view: every registration. Public view: only the ones made in this browser.
  const regsFor = (evId) => state.registrations.filter((r) => r.eventId === evId);
  // The server sends the total count (visitors never receive other people's registrations).
  const regCount = (ev) => (ev.registeredCount != null ? ev.registeredCount : (ev.baseRegistered || 0) + regsFor(ev.id).length);

  const statusBadge = (ev) => { const s = regStatus(ev); return `<span class="badge ${s.cls}">${esc(s.label)}</span>`; };
  const typeBadge = (ev) => ev.type === "tournament"
    ? '<span class="badge text-bg-tournament">Tournament</span>'
    : '<span class="badge text-bg-practice">Practice</span>';

  // Conversations
  // Admin view: the whole staff inbox. Public view: threads started in this browser (or opened by private link).
  const visibleConvos = () => [...state.conversations].sort((a, b) => parse(last(b).at) - parse(last(a).at));
  const last = (c) => c.messages[c.messages.length - 1];
  const isStaffId = (id) => ["owner", "admin"].includes(user(id).role);
  const fromVisitor = (m) => m.from === "visitor";
  function unreadIn(c) {
    const side = isAdmin() ? "staff" : "visitor";
    const readAt = parse(c.readAt[side] || 0);
    return c.messages.filter((m) => (isAdmin() ? fromVisitor(m) : !fromVisitor(m)) && parse(m.at) > readAt).length;
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
      [ev.type === "tournament" ? "Venue" : "Location", `${esc(ev.location)} <a class="small ms-1" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${ev.location} ${SPORT.mapArea}`)}">Map</a>`],
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
        <div class="small text-muted mt-1">Visitors sign up here without an account — switch the view to <em>Public site</em> to try it.</div></div>`;
    }
    const mine = regs; // sign-ups made in this browser
    return `
      ${mine.length ? `<div class="alert alert-success py-2 mb-2"><strong>Registered from this device:</strong> ${mine.map((r) => `${esc(r.participant.name)}${r.division ? ` (${esc(r.division)})` : ""}`).join(", ")}</div>` : ""}
      ${st.open
        ? `<button class="btn btn-brand" data-action="open-register" data-id="${esc(ev.id)}">${mine.length ? "Register someone else" : "Register"}</button>
           <span class="small text-muted ms-2">No account needed.</span>`
        : `<div class="small text-muted">Online sign-up is not available (${esc(st.label.toLowerCase())}).</div>`}`;
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
    if (isAdmin()) return showModal("Registration", '<p>Visitors register here without an account. Switch the view to <strong>Public site</strong> to try it.</p>');
    if (!regStatus(ev).open) return showModal("Registration unavailable", `<p>Sign-ups for <strong>${esc(ev.title)}</strong> are not available right now.</p>`);
    const who = eligibilityOf(ev);
    const types = [["adult", "An adult (18+)"], ["junior", "A junior (under 18)"]].filter(([t]) => who === "all" || who === t);
    const juniorOnly = who === "junior";
    showModal(`Register: ${esc(ev.title)}`, `
      <p class="small text-muted mb-1">${fmtDate(ev.start)} · ${fmtTime(ev.start)} – ${fmtTime(ev.end)} · ${esc(ev.location)}</p>
      <p class="small mb-3">Open to ${esc(whoLabel[who].toLowerCase())}. No account needed.</p>
      <form data-form="register" data-id="${esc(ev.id)}" novalidate>
        <div class="form-errors"></div>
        <div class="mb-3">
          <label class="form-label" for="regName">Participant's full name</label>
          <input class="form-control" id="regName" name="participantName" maxlength="80" required>
          <div class="invalid-feedback">Enter the participant's name.</div>
        </div>
        <div class="mb-3">
          <label class="form-label" for="regType">The participant is</label>
          <select class="form-select" id="regType" name="participantType" required>
            ${types.length > 1 ? '<option value="">Choose…</option>' : ""}
            ${types.map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}
          </select>
          <div class="invalid-feedback">Choose one.</div>
        </div>
        <div class="mb-3 ${juniorOnly ? "" : "d-none"}" id="regGuardianGroup">
          <label class="form-label" for="regGuardian">Parent or guardian's name</label>
          <input class="form-control" id="regGuardian" name="guardianName" maxlength="80" autocomplete="name" ${juniorOnly ? "required" : ""}>
          <div class="invalid-feedback">Enter a parent or guardian's name.</div>
        </div>
        <div class="row g-2 mb-3">
          <div class="col-sm-7">
            <label class="form-label" for="regEmail">Contact email</label>
            <input type="email" class="form-control" id="regEmail" name="email" maxlength="120" autocomplete="email" required>
            <div class="invalid-feedback">Enter an email address.</div>
          </div>
          <div class="col-sm-5">
            <label class="form-label" for="regPhone">Phone <span class="text-muted">(optional)</span></label>
            <input type="tel" class="form-control" id="regPhone" name="phone" maxlength="30" autocomplete="tel">
          </div>
          <div class="col-12 form-text mt-1">Only club staff see contact details.</div>
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

  async function submitRegister(form) {
    const ev = event(form.dataset.id);
    form.classList.add("was-validated");
    if (!form.checkValidity() || !ev) return;
    const fd = new FormData(form);
    const btn = form.querySelector("[type=submit]");
    btn.disabled = true;
    let out;
    try {
      out = await api("POST", `${API}/registrations`, {
        eventId: ev.id, participantName: fd.get("participantName"), participantType: fd.get("participantType"),
        guardianName: fd.get("guardianName") || "", email: fd.get("email"), phone: fd.get("phone") || "",
        division: fd.get("division") || null, agree: !!fd.get("agree"),
      });
    } catch (err) { btn.disabled = false; return showFormErrors(form, err.errors); }
    remember("registrations", out.registration.id, out.key); // this browser can now see and cancel it
    await loadState();
    const reg = out.registration;
    showModal("Registration confirmed", `
      <div class="text-center py-2">
        <div class="display-6 text-success mb-2" aria-hidden="true">✓</div>
        <h2 class="h5">You're signed up!</h2>
        <p class="mb-1"><strong>${esc(reg.participant.name)}</strong> is registered for <strong>${esc(ev.title)}</strong>${reg.division ? ` in <strong>${esc(reg.division)}</strong>` : ""}.</p>
        <p class="text-muted small mb-1">${fmtDate(ev.start)} · ${fmtTime(ev.start)} – ${fmtTime(ev.end)} · ${esc(ev.location)}</p>
        <p class="mb-1">Confirmation code: <code id="confirmCode">${esc(reg.code)}</code></p>
        <p class="small text-muted mb-3">Saved on this device under My Registrations. Keep the code — club staff can look it up if you need help.</p>
        <a href="#/registrations" class="btn btn-brand" data-action="modal-go">View My Registrations</a>
        <button class="btn btn-outline-secondary" data-bs-dismiss="modal">Done</button>
      </div>`);
    toast(`Registered ${esc(reg.participant.name)} for ${esc(ev.title)}.`);
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
    const [heroSolid, heroOutline] = SPORT.hero.darkText ? ["btn-dark", "btn-outline-dark"] : ["btn-brand", "btn-outline-light"];
    const crest = BRAND.heroLogo;

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
        <div class="d-flex flex-column flex-md-row align-items-center gap-4">
          <img class="hero-crest order-md-2" id="heroCrest" src="${esc(crest.src)}" width="${crest.width}" height="${crest.height}" alt="${esc(crest.alt)}" fetchpriority="high">
          <div class="flex-grow-1 text-center text-md-start">
            <h1 class="h2 mb-2">${esc(SPORT.hero.title)}</h1>
            <p class="lead mb-1">${esc(SPORT.hero.lead)}</p>
            <p class="mb-3">${esc(SPORT.hero.sub)}</p>
            <div class="d-flex flex-wrap gap-2 justify-content-center justify-content-md-start">
              <a href="#/calendar" class="btn ${heroSolid}">See the calendar</a>
              <a href="#/classes" class="btn ${heroOutline}">All classes</a>
              <a href="#/tournaments" class="btn ${heroOutline}">Upcoming tournaments</a>
            </div>
          </div>
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
          : `Practices and tournaments in one place · ${myRegs.length} sign-up${myRegs.length === 1 ? "" : "s"} on this device`)}
        ${homeLink("#/tournaments", "Tournaments", `${upT.length} upcoming · ${upT.filter((e) => regStatus(e).open).length} open for registration`)}
        ${homeLink("#/recognition", "Player Recognition", latestSpot
          ? `Latest spotlight: ${esc(player(latestSpot.playerId)?.name)} — ${esc(latestSpot.headline || latestSpot.improved)}`
          : "Player spotlights")}
        ${homeLink(unread ? "#/messages" : "#/announcements", `Communications ${unread ? `<span class="badge rounded-pill text-bg-danger">${unread} unread</span>` : ""}`,
          "Club announcements and private messages with staff")}
      </div>

      <div class="card mt-4"><div class="card-body small">
        <strong>Programs, enrollment &amp; payments:</strong> see every class, the registration form, payment instructions and discounts on the
        <a href="#/classes">Classes page</a>. <strong class="ms-1">Academy logos &amp; shirt designs:</strong> see <a href="#/brand">Logos &amp; Apparel</a>.
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

  // ----- Classes (catalog and enrollment details come from club/sports/<sport>.js)
  function enrollmentInfo(c) {
    const e = c.enroll;
    const list = (items) => items.map(([k, v]) => `<li><strong>${esc(k)}:</strong> ${esc(v)}</li>`).join("");
    return `<section class="card shadow-sm mt-3" id="howToEnroll"><div class="card-body">
      <h2 class="h5">How to enroll</h2>
      <ol class="mb-3">
        <li class="mb-2"><strong>Register:</strong> fill out the registration form.
          <div class="mt-1"><a href="${esc(e.formUrl)}" target="_blank" rel="noopener" class="btn btn-sm btn-brand">Open registration form ↗</a></div></li>
        ${e.pricing ? `<li class="mb-2"><strong>Pricing:</strong><ul class="mt-1">${e.pricing.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></li>` : ""}
        ${e.payUrl || e.payment ? `<li><strong>Pay:</strong> ${esc(e.payment || "")}
          <ul class="mt-1">
            ${e.payUrl ? `<li><strong>Online</strong> (Visa, Mastercard, Amex, Discover):
              <a href="${esc(e.payUrl)}" target="_blank" rel="noopener" class="fw-semibold">Pay online ↗</a>.
              ${e.payNote ? `<span class="text-danger">${esc(e.payNote)}</span>` : ""}</li>` : ""}
            ${e.cash ? `<li><strong>Cash:</strong> ${esc(e.cash)}</li>` : ""}
          </ul>
        </li>` : ""}
      </ol>
      ${e.bring ? `<p class="small"><strong>What to bring:</strong> ${esc(e.bring)}</p>` : ""}
      ${e.discounts ? `<h3 class="h6">${esc(e.discountsTitle || "Discounts")}</h3><ul class="small mb-0">${list(e.discounts)}</ul>` : ""}
    </div></section>`;
  }

  const classSessions = (c) => state.events.filter((e) => classOf(e) === c && upcoming(e)).sort(byStart);

  function classStatus(c) {
    switch (c.enrollment) {
      case "enroll": return { label: "Enrolling now", cls: "text-bg-success", note: "Monthly enrollment through the club registration form — no per-session sign-up." };
      case "qualify": return { label: "By coach invitation", cls: "text-bg-info", note: "Players join once a coach confirms they qualify." };
      case "book": return { label: "Book by message", cls: "text-bg-primary", note: "Send staff a private message to request a lesson time." };
      case "soon": return { label: "Coming soon", cls: "text-bg-secondary", note: "Join the interest list by messaging staff." };
      default: {
        const notYetMine = (e) => isAdmin() || !regsFor(e.id).length; // skip sessions this device already signed up for
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
    if (c.enrollment === "enroll" && c.enroll) {
      return `<a href="${esc(c.enroll.formUrl)}" target="_blank" rel="noopener" class="btn ${sz} btn-brand">Enroll — registration form ↗</a>`
        + (c.enroll.payUrl ? `<a href="${esc(c.enroll.payUrl)}" target="_blank" rel="noopener" class="btn ${sz} btn-outline-secondary">Pay online ↗</a>` : "");
    }
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
          ${c.enroll ? enrollmentInfo(c) : ""}
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

  // ----- Logos & Apparel (academy artwork by NACU; web versions built from brand-originals/)
  function artCard(item) {
    const label = `${BRAND.academy} — ${item.title} (${item.use})`;
    return `<figure class="card shadow-sm h-100 mb-0 art-card">
      <a href="${esc(item.src)}" target="_blank" rel="noopener" class="art-tile art-${esc(item.tile)}" title="Open full size">
        <img src="${esc(item.src)}" width="${item.width}" height="${item.height}" alt="${esc(label)}" loading="lazy" decoding="async">
      </a>
      <figcaption class="card-body py-2">
        <div class="fw-semibold small">${esc(item.title)}</div>
        <div class="small text-muted">${esc(item.use)}</div>
        ${isAdmin() ? `<div class="small text-muted text-break mt-1">Original: ${esc(item.original)}</div>` : ""}
      </figcaption>
    </figure>`;
  }

  function viewBrand() {
    const sheet = BRAND.sheet;
    return pageHeader("Logos &amp; Apparel", `Official ${esc(BRAND.academy)} artwork, designed by ${esc(BRAND.designer)}.`) + `
      <section class="mb-4" id="brandLogos">
        <h2 class="h5">Academy crest &amp; profile badges</h2>
        <p class="small text-muted">Each version is shown on the background it was designed for. Select an image to open it full size.</p>
        <div class="row g-3">${BRAND.logos.map((l) => `<div class="col-6 col-md-4 col-lg">${artCard(l)}</div>`).join("")}</div>
      </section>
      <section class="mb-4" id="brandApparel">
        <h2 class="h5">Apparel artwork</h2>
        <p class="small text-muted">Shirt print designs from the academy's screen-print separations.</p>
        <div class="row g-3">${BRAND.apparel.map((a) => `<div class="col-6 col-lg-3">${artCard(a)}</div>`).join("")}</div>
        <figure class="card shadow-sm mt-3 mb-0 art-card" id="apparelSheet">
          <a href="${esc(sheet.src)}" target="_blank" rel="noopener" class="art-tile art-sheet art-light" title="Open full size">
            <img src="${esc(sheet.src)}" width="${sheet.width}" height="${sheet.height}" alt="${esc(BRAND.academy)} shirt print separations sheet with all four designs" loading="lazy" decoding="async">
          </a>
          <figcaption class="card-body py-2 small text-muted">
            Printer's separations sheet (preview). Print-ready vendor files (.ai, .eps and .svg) are kept by the club${isAdmin()
              ? ` in <code>brand-originals/${esc(BRAND.academy)}/Shirt Vendor Files</code>.`
              : ` — <a href="#/messages/new">message staff</a> about shirt orders.`}
          </figcaption>
        </figure>
      </section>`;
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
    return state.registrations.filter((r) => event(r.eventId) && upcoming(event(r.eventId)))
      .sort((a, b) => byStart(event(a.eventId), event(b.eventId)));
  }

  function registrationsPanel() {
    if (isAdmin()) {
      const regs = [...state.registrations].sort((a, b) => parse(b.createdAt) - parse(a.createdAt));
      return `<div class="card shadow-sm" id="myRegistrations"><div class="card-body">
        <h2 class="h5">All registrations <span class="small text-muted">(admin view)</span></h2>
        ${regs.length ? `<ul class="list-group list-group-flush">${regs.map((r) => { const e = event(r.eventId); return `
          <li class="list-group-item px-0">
            <div class="fw-semibold">${esc(r.participant.name)} <span class="small text-muted fw-normal">${r.participant.adult ? "adult" : `junior · guardian ${esc(r.guardianName || "")}`}</span></div>
            <div class="small">${e ? `<a href="#" data-action="open-event" data-id="${esc(e.id)}">${esc(e.title)}</a> · ${fmtShortDate(e.start)}` : "Event removed"}${r.division ? ` · ${esc(r.division)}` : ""}</div>
            <div class="small text-muted text-break">${esc(r.contact.email)}${r.contact.phone ? ` · ${esc(r.contact.phone)}` : ""} · ${esc(r.code)} · ${fmtStamp(r.createdAt)}</div>
          </li>`; }).join("")}</ul>` : '<p class="text-muted small">No registrations yet.</p>'}
      </div></div>`;
    }
    const regs = upcomingMyRegs();
    return `<div class="card shadow-sm" id="myRegistrations"><div class="card-body">
      <h2 class="h5">My Registrations</h2>
      <p class="small text-muted mb-2">Sign-ups made on this device — no account needed.</p>
      ${regs.length ? `<ul class="list-group list-group-flush">${regs.map((r) => { const e = event(r.eventId); return `
        <li class="list-group-item px-0 reg-item">
          <div class="d-flex justify-content-between gap-2">
            <div>
              <a href="#" class="fw-semibold" data-action="open-event" data-id="${esc(e.id)}">${esc(e.title)}</a>
              ${e.cancelled ? '<span class="badge text-bg-dark ms-1">Cancelled</span>' : e.rescheduledFrom ? '<span class="badge text-bg-warning ms-1">Rescheduled</span>' : ""}
              <div class="small">${fmtDate(e.start)} · ${fmtTime(e.start)}</div>
              <div class="small text-muted">${esc(r.participant.name)}${r.division ? ` · ${esc(r.division)}` : ""} · <code>${esc(r.code)}</code></div>
            </div>
            <button class="btn btn-sm btn-outline-danger align-self-start" data-action="cancel-reg" data-id="${esc(r.id)}">Cancel</button>
          </div>
        </li>`; }).join("")}</ul>` : '<p class="text-muted small mb-0">No upcoming sign-ups on this device. Choose an event marked <span class="badge text-bg-success">Open</span> to register.</p>'}
    </div></div>`;
  }

  function viewRegistrations() {
    return pageHeader(isAdmin() ? "All Registrations" : "My Registrations", isAdmin() ? "Every sign-up across practices and tournaments, with contact details." : "Sign-ups made on this device. No account needed.",
      '<a href="#/calendar" class="btn btn-sm btn-outline-secondary">Open calendar</a>') +
      `<div class="row"><div class="col-lg-7">${registrationsPanel()}</div></div>`;
  }

  // ----- Recognition
  function spotlightCard(s, { full = false, preview = false } = {}) {
    const p = player(s.playerId);
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
          ${full ? notesBlock(s) : isAdmin() && s.coachingNotes ? '<span class="badge text-bg-warning">🔒 Has private coaching notes</span>' : ""}
          ${!full && !preview ? `<a href="#/recognition/${esc(s.id)}" class="stretched-link small d-block mt-2">Read spotlight →</a>` : ""}
        </div>
      </article>`;
  }

  const familyLink = (s) => `${location.origin}/${SPORT.id}/#/recognition/${encodeURIComponent(s.id)}/notes/${encodeURIComponent(s.notesKey)}`;

  function notesBlock(s) {
    if (!s.coachingNotes && !s.hasPrivateNotes) return "";
    const notes = notesFor(s);
    if (!notes) {
      return `<div class="private-box p-3 mt-3 small" id="notesHidden">🔒 Detailed coaching notes are private. Club staff share them directly with the player or their parent or guardian.</div>`;
    }
    return `<div class="private-box p-3 mt-3" id="notesVisible">
      <div class="fw-semibold mb-1">🔒 Private coaching notes</div>
      <p class="mb-1 pre-wrap">${esc(notes)}</p>
      ${isAdmin() && s.notesKey ? `<div class="small text-muted">Only staff can see these. To share them with the player's family, send them this private link:</div>
        <div class="input-group input-group-sm mt-1">
          <input class="form-control" id="familyLink" readonly value="${esc(familyLink(s))}" aria-label="Private link to these coaching notes">
          <button class="btn btn-outline-secondary" type="button" data-action="copy-input" data-target="familyLink">Copy link</button>
        </div>` : `<div class="small text-muted">Shared privately with you by club staff. Please don't forward this link.</div>`}
    </div>`;
  }

  function viewRecognition() {
    const list = [...state.spotlights].sort((a, b) => parse(b.publishedAt) - parse(a.publishedAt));
    return pageHeader("Player Recognition", "Celebrating growth: what each player improved, a real example, and what's next.",
      isAdmin() ? '<a href="#/recognition/new" class="btn btn-brand">New spotlight</a>' : "") + `
      ${!isAdmin() ? '<div class="alert alert-light border small">Detailed coaching notes are private — club staff share them directly with the player or their parent or guardian.</div>' : ""}
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
              <div class="small text-muted px-1 pb-2">Public view (everyone)</div>
              ${spotlightCard(Object.assign({}, d, { coachingNotes: "" }), { preview: true })}
            </div>
          </div>
          <div class="col-lg-5">
            ${d.coachingNotes ? `<div class="private-box p-3 mb-3"><div class="fw-semibold mb-1">🔒 Private coaching notes</div>
              <p class="pre-wrap mb-1">${esc(d.coachingNotes)}</p>
              <div class="small text-muted">Only staff can see these. After publishing you'll get a private link to send ${esc(player(d.playerId)?.name)}${player(d.playerId)?.adult ? "" : "'s family"}.</div></div>` : '<p class="small text-muted">No private coaching notes added.</p>'}
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
        ${field("improved", "What did the player improve?", SPORT.examples.improved)}
        ${field("example", "A specific example", "A concrete moment: a drill result, a match point, a before/after number.")}
        ${field("nextSkill", "One skill they'll work on next", "Keep it to one clear, encouraging goal.")}
        <div class="mb-3 private-box p-3">
          <label class="form-label fw-semibold" for="sp-coachingNotes">🔒 Detailed coaching notes <span class="fw-normal">(private)</span></label>
          <textarea class="form-control" id="sp-coachingNotes" name="coachingNotes" rows="3">${esc(d.coachingNotes || "")}</textarea>
          <div class="form-text">Only staff can see these notes. After publishing, you can send the family a private link to them.</div>
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
        <div class="form-errors"></div>
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

  // The club owner/admin personas members can message (from this sport's data).
  const staffName = (role) => (state.users[`u-${role}`] || {}).name || (role === "owner" ? "Club Owner" : "Club Admin");

  const roleLabel = (c) => (c.contact.role === "parent" ? "Parent/guardian" : "Adult player");
  const convoLink = (c) => `${location.origin}/${SPORT.id}/#/messages/${encodeURIComponent(c.id)}/${encodeURIComponent(keyFor("conversations", c.id) || "")}`;

  function convoTitle(c) {
    if (isAdmin()) {
      return `${esc(c.contact.name)} <span class="small text-muted fw-normal">· ${roleLabel(c)}</span>`;
    }
    return `${esc(staffName(c.to))} <span class='small text-muted fw-normal'>· ${c.to === "owner" ? "Club Owner" : "Club Admin"}</span>`;
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
        const side = isAdmin() ? "staff" : "visitor";
        if (unreadIn(c)) {
          c.readAt[side] = isoNow(); // show it as read right away; the server records it
          const id = encodeURIComponent(c.id);
          (isAdmin() ? api("POST", `${API}/admin/conversations/${id}/read`) : api("POST", `${API}/conversations/${id}/read`, { key: keyFor("conversations", c.id) }))
            .catch(() => {});
          updateNavBadge();
        }
        right = threadView(c);
      }
    }
    const hasRight = !!convoId;
    return pageHeader("Communications", "Club-wide updates and private messages with club staff.") + commsTabs("dm") + `
      <div class="row g-3">
        <div class="col-lg-4 ${hasRight ? "d-none d-lg-block" : ""}">${newBtn}${convoList(c && c.id)}
          <p class="small text-muted mt-2">${isAdmin() ? "Staff inbox: conversations sent to the owner or an admin." : "No account needed. Conversations started on this device appear here, and each one has a private link you can open on another device."}</p>
        </div>
        <div class="col-lg-8">${hasRight ? '<a href="#/messages" class="d-lg-none small d-inline-block mb-2">← All conversations</a>' : ""}${right}</div>
      </div>`;
  }

  function threadView(c) {
    const who = isAdmin()
      ? `${esc(c.contact.name)} (${roleLabel(c)} · <a href="mailto:${esc(c.contact.email)}">${esc(c.contact.email)}</a>${c.contact.phone ? ` · ${esc(c.contact.phone)}` : ""})`
      : "You";
    return `<div class="card shadow-sm" id="thread-${esc(c.id)}"><div class="card-body">
      <h2 class="h5 mb-0">${esc(c.subject)}</h2>
      <div class="small text-muted mb-3">${who} ↔ ${c.to === "owner" ? "Club Owner" : "Club Admin"}${c.about ? ` · About ${esc(c.about)}` : ""} · 🔒 Private</div>
      <div class="thread d-flex flex-column gap-2 mb-3" id="threadMessages">
        ${c.messages.map((m) => {
          const mine = isAdmin() ? !fromVisitor(m) : fromVisitor(m);
          const name = fromVisitor(m) ? c.contact.name : `${user(m.from).name}${isStaffId(m.from) ? ` (${user(m.from).title})` : ""}`;
          return `<div class="d-flex flex-column ${mine ? "align-items-end" : "align-items-start"}">
            <div class="bubble ${mine ? "mine" : "theirs"}">${esc(m.body)}</div>
            <div class="bubble-meta">${esc(name)} · ${fmtStamp(m.at)}</div>
          </div>`;
        }).join("")}
      </div>
      <form data-form="reply" data-id="${esc(c.id)}" novalidate>
        <div class="form-errors"></div>
        <div class="d-flex gap-2">
          <label class="visually-hidden" for="replyBody">Message</label>
          <textarea class="form-control" id="replyBody" name="body" rows="2" maxlength="4000" placeholder="${isAdmin() ? "Reply as " + esc(me().name) + "…" : "Write a message…"}" required></textarea>
          <button class="btn btn-brand align-self-end" type="submit">Send</button>
        </div>
      </form>
      ${!isAdmin() && keyFor("conversations", c.id) ? `<div class="small text-muted mt-3">Private link to this conversation — open it on another device to see replies there. Keep it to yourself.</div>
        <div class="input-group input-group-sm mt-1">
          <input class="form-control" id="convoLink" readonly value="${esc(convoLink(c))}" aria-label="Private link to this conversation">
          <button class="btn btn-outline-secondary" type="button" data-action="copy-input" data-target="convoLink">Copy link</button>
        </div>` : ""}
    </div></div>`;
  }

  function newMessageForm() {
    if (isAdmin()) return '<div class="alert alert-info">Families and adult players start conversations; staff reply in the same thread.</div>';
    return `<form data-form="new-message" class="card shadow-sm" novalidate><div class="card-body">
      <h2 class="h5">New private message</h2>
      <p class="small text-muted">No account needed. Only club staff see your message and contact details; replies appear here on this device.</p>
      <div class="form-errors"></div>
      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label" for="nm-name">Your name</label>
          <input class="form-control" id="nm-name" name="name" maxlength="80" autocomplete="name" required>
          <div class="invalid-feedback">Enter your name.</div>
        </div>
        <div class="col-md-6">
          <label class="form-label" for="nm-role">I am</label>
          <select class="form-select" id="nm-role" name="role" required>
            <option value="">Choose…</option>
            <option value="parent">A parent or guardian</option>
            <option value="adult">An adult player</option>
          </select>
          <div class="invalid-feedback">Choose one.</div>
        </div>
        <div class="col-md-6">
          <label class="form-label" for="nm-email">Email</label>
          <input type="email" class="form-control" id="nm-email" name="email" maxlength="120" autocomplete="email" required>
          <div class="invalid-feedback">Enter an email address.</div>
        </div>
        <div class="col-md-6">
          <label class="form-label" for="nm-phone">Phone <span class="text-muted">(optional)</span></label>
          <input type="tel" class="form-control" id="nm-phone" name="phone" maxlength="30" autocomplete="tel">
        </div>
        <div class="col-md-6">
          <label class="form-label" for="nm-to">To</label>
          <select class="form-select" id="nm-to" name="to">
            <option value="owner">${esc(staffName("owner"))} — Club Owner</option>
            <option value="admin">${esc(staffName("admin"))} — Club Admin</option>
          </select>
        </div>
        <div class="col-md-6">
          <label class="form-label" for="nm-about">Player's name <span class="text-muted">(optional)</span></label>
          <input class="form-control" id="nm-about" name="about" maxlength="80" placeholder="Leave blank for a general question">
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
  const VENUES = SPORT.venues;
  // Fictional names used to fill in the sample registrations on rosters.
  const SAMPLE_FIRST = ["Ava", "Ben", "Chloe", "Daniel", "Elena", "Felix", "Grace", "Hiro", "Isla", "Jonah", "Kai", "Lena", "Mateo", "Nora", "Owen",
    "Quinn", "Rosa", "Sami", "Theo", "Uma", "Vera", "Wes", "Yara", "Zane", "Arjun", "Bea", "Cody", "Dara", "Eli", "Farah"];
  const SAMPLE_LAST = ["Nguyen", "Patel", "Kim", "Garcia", "Johnson", "Okoro", "Silva", "Haddad", "Novak", "Chen", "Brooks", "Reyes", "Sato",
    "Iyer", "Walsh", "Moreno", "Fischer", "Adeyemi", "Larsen", "Ortiz"];

  const fld = (form, name) => form.querySelector(`[name="${name}"]`);
  const adminOnly = () => `<div class="alert alert-warning">This area is for club staff. <a href="${SIGN_IN_URL}">Sign in</a> with an authorized Google account.</div>`;
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
      out.push({ name, division: ev.divisions ? ev.divisions[i % ev.divisions.length] : null, by, contact: "—", when: "—", code: "—", sample: true });
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

  async function setSignups(el, value) {
    const ev = event(el.dataset.id);
    if (!ev || !isAdmin()) return;
    el.disabled = true;
    let out;
    try { out = await change("PUT", `${API}/admin/events/${encodeURIComponent(ev.id)}/signups`, { mode: value }); }
    catch (err) { el.disabled = false; return toast(esc(err.errors[0]), "danger"); }
    const label = value === "closed" ? "sign-ups closed" : value === "open" ? "sign-ups opened" : "following the registration dates";
    toast(`${esc(ev.title)}: ${label} (${esc(out.status)}).`, value === "closed" ? "secondary" : "success");
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
      `<li class="list-group-item"><span class="badge text-bg-danger me-2">Unread</span><a href="#/messages/${esc(c.id)}">${esc(c.contact.name)}: ${esc(c.subject)}</a></li>`));
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
            <div class="form-text">${locked.length ? `Divisions with registered players can't be removed: ${locked.map(esc).join(", ")}.` : esc(SPORT.examples.divisions)}</div>
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
            <input class="form-control" id="pr-title" name="title" maxlength="100" placeholder="${esc(cls ? cls.title : SPORT.examples.sessionTitle)}" ${cls ? "" : "required"}>
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
    title.placeholder = cls ? cls.title : SPORT.examples.sessionTitle;
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
          <textarea class="form-control" id="pc-reason" name="reason" rows="2" maxlength="300" placeholder="${esc(SPORT.examples.cancelReason)}"></textarea>
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

  const registeredBy = (r) => (r.participant.adult ? "Self" : `${r.guardianName || r.contact.name} (parent/guardian)`);

  function viewAdminRoster(id) {
    if (!isAdmin()) return adminOnly();
    const ev = event(id);
    if (!ev || !ev.requiresRegistration) return notFound("event");
    const demo = regsFor(ev.id).sort((a, b) => parse(a.createdAt) - parse(b.createdAt)).map((r) => ({
      name: r.participant.name, division: r.division, by: registeredBy(r), contact: [r.contact.email, r.contact.phone].filter(Boolean).join(" · "),
      when: fmtStamp(r.createdAt), code: r.code, sample: false,
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
        <thead class="table-light"><tr><th scope="col">#</th><th scope="col">Player</th>${ev.divisions ? '<th scope="col">Division</th>' : ""}<th scope="col">Registered by</th><th scope="col">Contact</th><th scope="col">Signed up</th><th scope="col">Code</th></tr></thead>
        <tbody>${rows.map((r, i) => `<tr class="${r.sample ? "text-muted" : ""}"><td>${i + 1}</td><td class="text-nowrap">${esc(r.name)} ${r.sample ? sampleTag : ""}</td>${ev.divisions ? `<td>${esc(r.division || "—")}</td>` : ""}<td>${esc(r.by)}</td><td class="text-break small">${esc(r.contact || "—")}</td><td class="text-nowrap">${esc(r.when)}</td><td><code>${esc(r.code)}</code></td></tr>`).join("")}</tbody>
      </table></div></div>` : '<p class="text-muted">No one has signed up yet.</p>'}`;
  }

  // ---------------------------------------------------------------- router
  function updateNavBadge() {
    const n = totalUnread();
    $("#navUnread").text(n).toggleClass("d-none", !n).attr("aria-label", `${n} unread messages`);
  }

  function updateAuthControls() {
    $("#viewSwitch").toggleClass("d-none", !session.admin);
    $("#roleSwitch").val(isAdmin() ? "admin" : "member");
    $("#adminSignInBtn").toggleClass("d-none", !!session.admin);
    $("#signOutBtn").toggleClass("d-none", !session.admin);
    $("#resetBtn").toggleClass("d-none", !isAdmin());
  }

  /** Private links: remember a conversation key, or open coaching notes shared with a family. */
  function openPrivateLink([section, id, third, fourth]) {
    if (section === "messages" && id && id !== "new" && third) {
      remember("conversations", id, third);
      $("#app").html('<p class="text-muted text-center py-5">Opening your conversation…</p>');
      loadState().then(() => location.replace(`#/messages/${encodeURIComponent(id)}`), (err) => toast(esc(err.errors[0]), "danger"));
      return true;
    }
    if (section === "recognition" && id && third === "notes" && fourth && notesCache[id] === undefined) {
      $("#app").html('<p class="text-muted text-center py-5">Opening coaching notes…</p>');
      api("POST", `${API}/spotlights/${encodeURIComponent(id)}/notes`, { key: fourth })
        .then((out) => { notesCache[id] = out.coachingNotes; }, () => { notesCache[id] = null; toast("That private link isn't valid any more.", "secondary"); })
        .then(render);
      return true;
    }
    return false;
  }

  function render() {
    updateAuthControls();
    if (!loaded) { $("#app").html('<p class="text-muted text-center py-5" id="loading">Loading club data…</p>'); return; }
    const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
    const [section, id] = parts;
    if (!isAdmin() && openPrivateLink(parts)) return;
    // Admin pages: signed-out visitors go to the sign-in page. (The data and actions behind
    // these pages are protected on the server as well.)
    if (section === "admin" && !isAdmin()) {
      if (!session.admin) { location.replace(`${SIGN_IN_URL}?notice=signin`); return; }
      state.role = "admin"; // signed-in admin who was previewing the member view
      save();
      $("#app").html('<p class="text-muted text-center py-5">Loading…</p>');
      loadState().then(render, (err) => toast(esc(err.errors[0]), "danger"));
      return;
    }
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
      case "brand": html = viewBrand(); nav = "brand"; break;
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
    $("#viewingAs").html(isAdmin()
      ? `Signed in as <strong>${esc(session.name)}</strong> <span class="d-none d-sm-inline">(${esc(session.email)})</span> — Club Admin`
      : `${session.admin ? "<strong>Previewing the public site</strong> (what visitors see) · " : ""}No account needed — anyone can register and message staff. Only admins sign in. · <span class="text-danger">Fictional sample data.</span>`);
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
    "cancel-reg": async (el) => {
      const r = state.registrations.find((x) => x.id === el.dataset.id);
      if (!r || !confirm(`Cancel ${r.participant.name}'s registration for ${event(r.eventId)?.title}?`)) return;
      try { await change("POST", `${API}/registrations/${encodeURIComponent(r.id)}/cancel`, { key: keyFor("registrations", r.id) }); }
      catch (err) { return toast(esc(err.errors[0]), "danger"); }
      toast("Registration cancelled.", "secondary");
      render();
    },
    "copy-input": async (el) => {
      const input = document.getElementById(el.dataset.target);
      if (!input) return;
      input.select();
      try { await navigator.clipboard.writeText(input.value); toast("Link copied."); }
      catch (e) { toast("Select the link and copy it.", "secondary"); }
    },
    "spot-edit": () => { state.spotlightDraft.previewing = false; save(); render(); },
    "spot-discard": () => { state.spotlightDraft = null; save(); },
    "spot-publish": async (el) => {
      const d = state.spotlightDraft;
      if (!d || !isAdmin()) return;
      el.disabled = true;
      let out;
      try {
        out = await change("POST", `${API}/admin/spotlights`, {
          playerId: d.playerId, headline: d.headline, improved: d.improved, example: d.example, nextSkill: d.nextSkill, coachingNotes: d.coachingNotes,
        });
      } catch (err) { el.disabled = false; return toast(esc(err.errors.join(" ")), "danger"); }
      state.spotlightDraft = null;
      save();
      toast(`Spotlight for ${esc(player(d.playerId)?.name)} published.`);
      go(`#/recognition/${out.spotlight.id}`);
    },
    "delete-spotlight": async (el) => {
      if (!isAdmin() || !confirm("Unpublish this spotlight?")) return;
      try { await change("DELETE", `${API}/admin/spotlights/${encodeURIComponent(el.dataset.id)}`); } catch (err) { return toast(esc(err.errors[0]), "danger"); }
      toast("Spotlight unpublished.", "secondary");
      go("#/recognition");
    },
    "signups-open": (el) => setSignups(el, "open"),
    "signups-close": (el) => setSignups(el, "closed"),
    "signups-auto": (el) => setSignups(el, null),
    "practice-reschedule": (el) => openPracticeModal("reschedule", el.dataset.id),
    "practice-cancel": (el) => openPracticeModal("cancel", el.dataset.id),
    "practice-restore": (el) => openPracticeModal("restore", el.dataset.id),
    "admin-toggle-all": () => { state.ui.adminShowAll = !state.ui.adminShowAll; save(); render(); },
    "admin-signup-type": (el) => { state.ui.adminSignupType = el.dataset.type; save(); render(); },
    "reset-demo": async () => {
      if (!isAdmin() || !confirm("Reset all club data on the server back to the sample data? Every change made in the demo will be lost.")) return;
      try { await change("POST", `${API}/admin/reset`); } catch (err) { return toast(esc(err.errors[0]), "danger"); }
      toast("Demo data reset.");
      go("#/admin");
    },
    "sign-out": async () => {
      try {
        await fetch("/auth/signout", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: "{}" });
      } catch (e) { /* the redirect below still clears the view */ }
      session = { admin: false, configured: session.configured };
      state.role = "member";
      state.spotlightDraft = null;
      save();
      location.replace(`${SIGN_IN_URL}?notice=signedout`);
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
    async announcement(form) {
      form.classList.add("was-validated");
      if (!form.checkValidity() || !isAdmin()) return;
      const fd = new FormData(form);
      const ok = await submitForm(form, "POST", `${API}/admin/announcements`, {
        title: fd.get("title"), body: fd.get("body"), category: fd.get("category"),
        eventId: fd.get("eventId") || null, markCancelled: !!fd.get("markCancelled"),
      });
      if (!ok) return;
      toast("Announcement posted to all members.");
      render();
    },
    async "new-message"(form) {
      form.classList.add("was-validated");
      if (!form.checkValidity() || isAdmin()) return;
      const fd = new FormData(form);
      const btn = form.querySelector("[type=submit]");
      btn.disabled = true;
      let out;
      try {
        out = await api("POST", `${API}/conversations`, {
          name: fd.get("name"), role: fd.get("role"), email: fd.get("email"), phone: fd.get("phone") || "",
          to: fd.get("to"), about: fd.get("about") || "", subject: fd.get("subject"), body: fd.get("body"),
        });
      } catch (err) { btn.disabled = false; return showFormErrors(form, err.errors); }
      remember("conversations", out.conversation.id, out.key); // this browser can now see replies
      await loadState();
      toast("Message sent privately to club staff.");
      go(`#/messages/${out.conversation.id}`);
    },
    async reply(form) {
      const body = String(new FormData(form).get("body") || "").trim();
      if (!body) { form.classList.add("was-validated"); return; }
      const id = encodeURIComponent(form.dataset.id);
      const ok = await submitForm(form, "POST", isAdmin() ? `${API}/admin/conversations/${id}/messages` : `${API}/conversations/${id}/messages`,
        isAdmin() ? { body } : { body, key: keyFor("conversations", form.dataset.id) });
      if (!ok) return;
      toast(isAdmin() ? "Reply sent." : "Message sent.");
      render();
    },
    // ----- admin: create or edit a tournament (validated on the server)
    async tournament(form) {
      if (!isAdmin()) return;
      form.classList.add("was-validated");
      if (!form.checkValidity()) return showFormErrors(form, ["Please fill in the highlighted fields."]);
      const id = form.dataset.id;
      const out = await submitForm(form, id ? "PUT" : "POST", id ? `${API}/admin/tournaments/${encodeURIComponent(id)}` : `${API}/admin/tournaments`,
        Object.fromEntries(new FormData(form)));
      if (!out) return;
      toast(`${id ? "Saved changes to" : "Created"} ${esc(out.event.title)}. <a href="#/tournaments/${esc(out.event.id)}" class="link-light fw-semibold">View public page</a>`);
      go("#/admin/tournaments");
    },
    // ----- admin: schedule practice sessions
    async "schedule-practice"(form) {
      if (!isAdmin()) return;
      form.classList.add("was-validated");
      if (!form.checkValidity()) return showFormErrors(form, ["Please fill in the highlighted fields."]);
      const fd = new FormData(form);
      const body = { ...Object.fromEntries(fd), requiresSignup: !!fd.get("requiresSignup"), announce: !!fd.get("announce") };
      const out = await submitForm(form, "POST", `${API}/admin/practices`, body);
      if (!out) return;
      toast(`Scheduled ${out.created} session${out.created > 1 ? "s" : ""} of ${esc(out.title)}${out.announced ? " and notified members" : ""}.`);
      go("#/admin/practices");
    },
    // ----- admin: reschedule / cancel / restore a practice
    async "practice-reschedule"(form) {
      if (!isAdmin()) return;
      form.classList.add("was-validated");
      if (!form.checkValidity()) return showFormErrors(form, ["Please fill in the highlighted fields."]);
      const fd = new FormData(form);
      const title = event(form.dataset.id)?.title || "Practice";
      const out = await submitForm(form, "POST", `${API}/admin/practices/${encodeURIComponent(form.dataset.id)}/reschedule`,
        { ...Object.fromEntries(fd), announce: !!fd.get("announce") });
      if (!out) return;
      modal().hide();
      toast(`${esc(title)} updated${out.notified ? " and members notified" : ""}.`);
      render();
    },
    async "practice-cancel"(form) {
      if (!isAdmin()) return;
      const fd = new FormData(form);
      const ev = event(form.dataset.id);
      const label = ev ? `${ev.title} on ${fmtShortDate(ev.start)}` : "Practice";
      const out = await submitForm(form, "POST", `${API}/admin/practices/${encodeURIComponent(form.dataset.id)}/cancel`,
        { reason: fd.get("reason") || "", announce: !!fd.get("announce") });
      if (!out) return;
      modal().hide();
      toast(`${esc(label)} cancelled${out.notified ? " and members notified" : ""}.`, "secondary");
      render();
    },
    async "practice-restore"(form) {
      if (!isAdmin()) return;
      const ev = event(form.dataset.id);
      const label = ev ? `${ev.title} on ${fmtShortDate(ev.start)}` : "Practice";
      const out = await submitForm(form, "POST", `${API}/admin/practices/${encodeURIComponent(form.dataset.id)}/restore`,
        { announce: !!new FormData(form).get("announce") });
      if (!out) return;
      modal().hide();
      toast(`${esc(label)} is back on${out.notified ? " and members notified" : ""}.`);
      render();
    },
  };

  // ---------------------------------------------------------------- boot
  function loadSharedComponents() {
    // Reuse the site's shared navbar and footer. The footer component bundles its own
    // Bootstrap <script>; strip it since this page already loads Bootstrap once.
    $.get("/components/navbar.html", (h) => $("#navbar").html(h));
    $.get("/components/footer.html", (h) => $("#footer").html(h.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<\/?(body|html)>/gi, "")));
  }

  $(async function () {
    loadPrefs();
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
      if (e.target.id === "regType") {
        const junior = e.target.value === "junior";
        $("#regGuardianGroup").toggleClass("d-none", !junior);
        $("#regGuardian").prop("required", junior);
      }
      if (e.target.id === "pr-signup") fld(e.target.form, "capacity").disabled = !e.target.checked;
      if (e.target.dataset.ui) { state.ui[e.target.dataset.ui] = e.target.value; save(); render(); }
    });
    // Keyboard support for calendar day cells
    document.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && e.target.classList?.contains("cal-cell")) { e.preventDefault(); e.target.click(); }
    });

    // View switch (only shown to a signed-in admin): it can switch to the member preview,
    // but the Admin view needs the server-side session — the switch can't grant access.
    $("#roleSwitch").on("change", async function () {
      const want = this.value === "admin" ? "admin" : "member";
      if (want === "admin" && !session.admin) { location.href = SIGN_IN_URL; return; }
      state.role = want;
      save();
      try { await loadState(); } catch (err) { return toast(esc(err.errors[0]), "danger"); }
      toast(want === "admin"
        ? 'Showing the Admin view. <a href="#/admin" class="link-light fw-semibold">Open the Admin Dashboard</a>'
        : "Previewing the public site, as visitors see it.", "dark");
      // Return to the inbox so the new view sees its unread indicators (and never another family's thread).
      if (location.hash.startsWith("#/messages/")) go("#/messages");
      else if (location.hash.startsWith("#/admin") && want !== "admin") go("#/");
      else render();
    });

    window.addEventListener("hashchange", () => { render(); window.scrollTo(0, 0); });
    render(); // loading state
    await refreshSession();
    if (session.admin && location.hash.startsWith("#/admin")) state.role = "admin";
    try { await loadState(); } catch (err) {
      $("#app").html(`<div class="alert alert-danger">${esc(err.errors[0])}</div>`);
      return;
    }
    render();
  });
})();
