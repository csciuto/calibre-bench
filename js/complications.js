// Calibre Bench complications: the watch as a state machine (crown, winding, hacking, setting,
// calendars from simple to perpetual, GMT, moon phase, chronograph with flyback, automatic winding,
// power reserve) plus geometry for every zone and the dial layout.
// Pure: no DOM. Time inside the movement only advances through tick(), driven by the going train.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./model.js"));
  else root.CalibreComplications = factory(root.CalibreModel);
})(typeof self !== "undefined" ? self : this, function (CM) {
  "use strict";
  const D2R = Math.PI / 180, DAY = 86400;

  // ---------- layouts and options ----------
  const CONFIGS = [
    { id: "time", name: "Time only" },
    { id: "date", name: "Date", date: true },
    { id: "daydate", name: "Day-date", day: true, date: true },
    { id: "datemoon", name: "Date + moon phase", date: true, moon: true },
    { id: "dategmt", name: "Date + GMT", date: true, gmt: true },
    // day, date and moon are, in practice, sold together with the month: a "complete" or "triple" calendar
    // (Valjoux 7751, Grail Watch; Union Glashütte 7751 manual; Tissot ETA 255 quartz, Brothers in Watches)
    { id: "complete", name: "Day, date, month + moon", day: true, date: true, month: true, moon: true }
  ];
  // Layouts a 7750-style cam/column-wheel chronograph base is commonly built in.
  const CHRONO_OK = ["time", "date", "daydate", "dategmt", "complete"];
  const CAL_TYPES = [
    { id: "simple", name: "Simple", desc: "31 days every month" },
    { id: "annual", name: "Annual", desc: "knows 30 and 31; set once a year after February" },
    { id: "perpetual", name: "Perpetual", desc: "knows leap years; needs one correction on 1 March 2100" }
  ];
  const DEFAULT_OPTS = { chrono: "off", calType: "simple", retro: false, central: false, auto: false, pr: false, wrist: "off" };

  function config(id) { return CONFIGS.find(c => c.id === id) || CONFIGS[0]; }
  const chronoAllowed = id => CHRONO_OK.includes(config(id).id);
  // Which options a layout + chronograph choice allows.
  function allowed(id, chronoOn) {
    const c = config(id);
    return { chrono: chronoAllowed(c.id), calType: !!c.date, retro: !!c.date && !chronoOn, central: !chronoOn, pr: !chronoOn,
             flyback: chronoAllowed(c.id), auto: true };
  }
  // features(id, chrono) or features(id, opts): everything the watch has, after the rules are applied.
  function features(id, o) {
    const c = config(id);
    const opts = typeof o === "object" && o ? Object.assign({}, DEFAULT_OPTS, o) : Object.assign({}, DEFAULT_OPTS, { chrono: o ? "standard" : "off" });
    const f = { id: c.id, day: !!c.day, date: !!c.date, gmt: !!c.gmt, moon: !!c.moon };
    f.chrono = opts.chrono !== "off" && chronoAllowed(c.id);
    f.flyback = f.chrono && opts.chrono === "flyback";
    const a = allowed(c.id, f.chrono);
    f.calType = a.calType ? opts.calType : "simple";
    f.program = f.date && f.calType !== "simple";       // annual and up read month lengths from a cam
    f.month = f.program || (f.date && !!c.month);       // a month display: from the cam, or a plain month star
    f.monthStar = f.month && !f.program;
    f.perpetual = f.date && f.calType === "perpetual";
    f.retro = a.retro && !!opts.retro;
    f.central = a.central && !!opts.central;
    f.pr = a.pr && !!opts.pr;
    f.auto = !!opts.auto;
    f.calendar = f.day || f.date || f.moon;
    // With date one way and moon the other on the crown, the day gets its own pusher (Union Glashütte 7751 manual).
    f.dayPusher = f.day && f.moon && !f.program;
    return f;
  }

  // ---------- calendars ----------
  const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const GREG = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const leapJulian = y => y % 4 === 0;
  const leapGregorian = y => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  // How long this calendar mechanism thinks month m (0-11) of year y is.
  function monthLength(type, m, y) {
    if (type === "simple") return 31;
    if (m !== 1) return GREG[m];
    if (type === "annual") return 30;            // an annual calendar treats February as 30 days
    return leapJulian(y) ? 29 : 28;             // perpetual: every fourth year, including 2100
  }
  // One midnight. cal.date is 0-based (0 = the 1st). Returns a new object.
  function calendarStep(cal, type) {
    const n = Object.assign({}, cal);
    n.day = (cal.day + 1) % 7;
    n.moon = (cal.moon + 1) % MOON_TEETH;
    const len = monthLength(type, cal.month, cal.year);
    if (cal.date + 1 < len) n.date = cal.date + 1;
    else {
      n.date = 0;
      // a simple 31-day ring doesn't know months; keep the month in step anyway so switching type later makes sense
      n.month = (cal.month + 1) % 12;
      if (n.month === 0) n.year = cal.year + 1;
    }
    if (type === "simple" && cal.date + 1 >= 31) n.date = 0;
    return n;
  }
  // The program cam's sectors: one per month for an annual (12), one per month over four years for a perpetual (48).
  function camSectors(type) {
    if (type === "annual") return GREG.map((d, m) => monthLength("annual", m, 2001));
    const out = [];
    for (let yi = 0; yi < 4; yi++) for (let m = 0; m < 12; m++) out.push(monthLength("perpetual", m, yi === 0 ? 2024 : 2025));
    return out;
  }
  // Which sector the program cam shows for a given month and year.
  function camIndex(type, m, y) { return type === "annual" ? m : (((y % 4) + 4) % 4) * 12 + m; }

  // ---------- crown ----------
  // 0: pushed in, winds. 1: first click, quick-sets. 2: fully out, sets the hands and stops the balance.
  function crownPositions(f) { return (f.date || f.day || f.gmt) ? [0, 1, 2] : [0, 2]; }
  function quickSet(f) {
    // On annual and perpetual calendars the crown advances the whole calendar a day at a time, keeping every display in step.
    // With a moon, turning back sets the moon (Montres-Passion, "How to set a moonphase watch"; Union Glashütte 7751 manual).
    const fwd = f.program ? "calday" : f.date ? "date" : f.day ? "day" : f.gmt ? "gmt" : null;
    const back = f.moon ? "moon" : (f.date && f.day && !f.program) ? "day" : (f.gmt && fwd !== "gmt") ? "gmt" : null;
    return { fwd, back };
  }
  function crownAction(f, pos, dir) {
    if (pos === 0) return dir > 0 ? "wind" : "slip";
    if (pos === 2) return "set";
    const q = quickSet(f);
    return (dir > 0 ? q.fwd : q.back) || "none";
  }

  // Keyless works tooth counts. Crown turns pass through the crown wheel to the ratchet on the barrel arbor.
  const KEYLESS = { windPinion: 16, crownWheel: 32, ratchet: 60, slidingPinion: 12, settingWheel: 20, quickSetWheel: 16 };
  const barrelTurnsPerCrownTurn = () => KEYLESS.windPinion / KEYLESS.ratchet; // crown wheel is an idler
  const hoursPerCrownTurn = P => KEYLESS.slidingPinion / P.teeth.cannon;       // setting wheel is an idler

  // ---------- automatic winding (reverser wheels, as in the common Swiss and Japanese automatics) ----------
  // The rotor pinion turns two reverser wheels. Each has a one-way clutch inside: one passes the rotor's motion on
  // when it swings one way, the other when it swings the other way, so the reduction wheel always turns the same way.
  const AUTO = { rotorPinion: 12, reverser: 36, reverserPinion: 8, red1: [8, 64], red2: [15, 80] };
  // rotor pinion -> reverser (36) -> its pinion (8) drives the first reduction wheel (64) -> its pinion (8) drives the
  // second reduction wheel (80) -> its pinion (15) drives the ratchet (60) on the barrel arbor
  const barrelTurnsPerRotorTurn = () => (AUTO.rotorPinion / AUTO.reverser) * (AUTO.reverserPinion / AUTO.red1[1]) * (AUTO.red1[0] / AUTO.red2[1]) * (AUTO.red2[0] / KEYLESS.ratchet);
  // Rotor motion while worn: a sum of swings (degrees, Hz, phase) plus occasional full turns (turns per second).
  const WRIST = {
    off: { name: "Off the wrist", swings: [], drift: 0 },
    desk: { name: "Desk work", swings: [[5, 0.25, 0], [2.5, 0.6, 1.3]], drift: 0 },
    walking: { name: "Walking", swings: [[40, 0.9, 0], [15, 1.9, 0.7]], drift: 0.02 },
    running: { name: "Running", swings: [[90, 1.4, 0], [40, 2.8, 2.1]], drift: 0.1 }
  };
  const rotorRate = k => { const w = WRIST[k] || WRIST.off; return w.swings.reduce((s, [a, f]) => s + 4 * a * f / 360, 0) + Math.abs(w.drift); };
  const rotorAngle = (k, t) => { const w = WRIST[k] || WRIST.off; return w.swings.reduce((s, [a, f, p]) => s + a * Math.sin(2 * Math.PI * f * t + p), 0) + w.drift * 360 * t; };
  // which way the rotor is swinging right now: +1, -1, or 0 when still
  const rotorDirection = (k, t) => { const w = WRIST[k] || WRIST.off; const v = w.swings.reduce((s, [a, f, p]) => s + a * 2 * Math.PI * f * Math.cos(2 * Math.PI * f * t + p), 0) + w.drift * 360; return Math.abs(v) < 1e-9 ? 0 : Math.sign(v); };

  // ---------- moon ----------
  const SYNODIC = 29.530588853, MOON_TEETH = 59;
  const NEW_MOON_2000 = Date.UTC(2000, 0, 6, 18, 14);
  function moonAgeAt(date) { const d = (date.getTime() - NEW_MOON_2000) / 86400000; return ((d % SYNODIC) + SYNODIC) % SYNODIC; }
  // A 59-tooth disc carries two moons, so one lunation is 29.5 teeth (one tooth per day).
  function moonPhase(teeth) { const a = ((teeth % 29.5) + 29.5) % 29.5; return a / 29.5; } // 0 new, 0.5 full

  // ---------- the watch ----------
  function initFromDate(d) {
    return {
      handSeconds: d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() / 1000,
      date: d.getDate(), weekday: d.getDay(), month: d.getMonth(), year: d.getFullYear(), moonAge: moonAgeAt(d),
      gmtOffsetH: Math.round(d.getTimezoneOffset() / 60) // shows UTC as home time by default
    };
  }

  function createWatch(P, init) {
    init = init || {};
    const per = () => CM.periods(P);
    const handsPerTau = () => 3600 / per().center; // hand-seconds per movement-second (1 when the train is exact)
    const H0 = init.handSeconds || 0;
    const w = {
      config: init.config || "time", opts: Object.assign({}, DEFAULT_OPTS),
      tau: H0,                // movement time: what the balance has counted
      train: H0,              // what the train has turned the hands through, in hand-seconds
      offset: 0,              // hand-setting slip of the cannon pinion, in hand-seconds
      springLeft: init.springLeft != null ? init.springLeft : P.springTurns * 0.8,
      ratchetTurns: 0, drumTurns: 0, slipTurns: 0, crownTurns: 0, quickTurns: 0, crownPos: 0, lastQuick: 0,
      wall: 0, rotorTurnsAbs: 0,
      cal: { date: ((init.date || 1) - 1 + 31) % 31, day: (init.weekday || 0) % 7,
             month: init.month != null ? init.month : 0, year: init.year != null ? init.year : 2026,
             moon: Math.round(init.moonAge || 0) % MOON_TEETH, gmt: ((init.gmtOffsetH || 0) % 24 + 24) % 24 },
      chrono: { running: false, hammer: true, column: 0, phi: 0, k: 0, lastJump: 0, lastJumpSeconds: 0, flybacks: 0 },
      quickAcc: 0
    };
    w.lastDay = Math.floor(H0 / DAY);
    w.springStart = w.springLeft;

    // geometry is needed so the chronograph runner can be driven through its real mesh
    let G = init.G || CM.build(P), X = init.X || buildGeometry(P, G);
    // which way the date driving wheel turns in the drawing: cannon -> minute wheel -> hour wheel -> driving wheel,
    // each mesh reversing it
    w.setGeometry = (g, x) => {
      const E = w.chrono.running ? null : elapsed();
      G = g; X = x; computeMesh();
      if (E != null) w.chrono.phi = RUNNER_BASE + chronoSign * E * 6;
    };
    w.geometry = () => ({ G, X });

    w.features = () => features(w.config, w.opts);
    w.chronoOn = false;
    w.handTime = () => w.train + w.offset;
    w.hacked = () => w.crownPos === 2;
    w.stopped = () => w.hacked() || w.springLeft <= 1e-9;
    w.reserveHours = () => w.springLeft * per().barrel / 3600;

    function syncCalendar() {
      const D = Math.floor(w.handTime() / DAY);
      if (D > w.lastDay) {
        const type = w.features().calType, n = Math.min(D - w.lastDay, 4000);
        for (let i = 0; i < n; i++) w.cal = calendarStep(w.cal, type);
      }
      w.lastDay = D; // going back over midnight: the driving fingers slip back without moving anything
    }

    // ----- options -----
    function sanitize() {
      const a = allowed(w.config, w.opts.chrono !== "off" && chronoAllowed(w.config));
      if (!a.chrono) w.opts.chrono = "off";
      w.chronoOn = w.opts.chrono !== "off";
      if (!a.calType) w.opts.calType = "simple";
      if (!a.retro) w.opts.retro = false;
      if (!a.central) w.opts.central = false;
      if (!a.pr) w.opts.pr = false;
      if (!w.chronoOn && w.chrono.running) { w.chrono.phi = runnerAngle(); w.chrono.running = false; }
      if (!crownPositions(w.features()).includes(w.crownPos)) w.crownPos = 0;
    }
    w.setConfig = (id, chrono) => {
      w.config = config(id).id;
      if (chrono !== undefined) w.opts.chrono = chrono ? (w.opts.chrono === "flyback" ? "flyback" : "standard") : "off";
      sanitize();
    };
    // Set one option; refused (returns false) when the current layout doesn't allow it.
    w.setOption = (key, value) => {
      if (!(key in DEFAULT_OPTS)) return false;
      const on = key === "chrono" ? value !== "off" : key === "wrist" || key === "calType" || !!value;
      if (on && key !== "wrist" && key !== "auto") {
        const a = allowed(w.config, w.opts.chrono !== "off");
        const k = key === "chrono" ? (value === "flyback" ? "flyback" : "chrono") : key;
        if (key === "calType" ? (value !== "simple" && !a.calType) : !a[k]) return false;
      }
      if (key === "calType" && !CAL_TYPES.some(c => c.id === value)) return false;
      if (key === "wrist" && !WRIST[value]) return false;
      w.opts[key] = value;
      sanitize();
      return true;
    };

    // ----- winding -----
    // Add winding to the barrel arbor. A manual watch's crown stops at full; an automatic's slipping bridle lets the excess slip.
    function wind(turns) {
      const room = P.springTurns - w.springLeft, add = Math.min(room, turns);
      w.springLeft += add; w.ratchetTurns += add;
      if (turns > add) w.slipTurns += turns - add;
      return { added: add, full: room - add < 1e-9 };
    }

    // Run for dt seconds of real time. Returns the movement seconds actually run.
    w.tick = dt => {
      if (!(dt > 0)) return 0;
      const f = w.features();
      if (f.auto && w.opts.wrist !== "off") {
        const rt = rotorRate(w.opts.wrist) * dt;
        w.rotorTurnsAbs += rt;
        wind(rt * barrelTurnsPerRotorTurn());
      }
      w.wall += dt;
      if (w.stopped()) return 0;
      const p = per(), run = Math.min(dt, w.springLeft * p.barrel);
      w.tau += run;
      w.train += run * handsPerTau();
      w.springLeft = Math.max(0, w.springLeft - run / p.barrel);
      w.drumTurns += run / p.barrel;
      syncCalendar();
      return run;
    };
    w.rotorAngle = () => rotorAngle(w.opts.wrist, w.wall);

    // Jump the movement to a new time (scrubbing), as if it had always shown it. No calendar jumps.
    w.setMovementTime = v => {
      const E = w.chrono.running ? elapsed() : null;
      w.tau = v; w.train = v * handsPerTau(); w.offset = 0;
      w.lastDay = Math.floor(w.handTime() / DAY);
      if (E != null) w.chrono.k = (RUNNER_BASE + chronoSign * E * 6 - runnerMesh(w.tau)) / RUNNER_PITCH; // keep the stopwatch reading
    };

    w.setCrown = pos => {
      if (!crownPositions(w.features()).includes(pos)) return false;
      w.crownPos = pos; w.quickAcc = 0; return true;
    };
    w.cycleCrown = () => { // a click on the crown: pull out one step, or push home from the last
      const ps = crownPositions(w.features()), i = ps.indexOf(w.crownPos);
      return w.setCrown(ps[(i + 1) % ps.length]);
    };

    // Turn the crown by `turns` (+ clockwise, viewed from the crown end). Returns what happened.
    w.turnCrown = turns => {
      const f = w.features(), action = crownAction(f, w.crownPos, Math.sign(turns));
      w.crownTurns += turns;
      if (action === "wind") {
        const r = wind(turns * barrelTurnsPerCrownTurn());
        return { action, full: r.full, slipping: r.full && f.auto };
      }
      if (action === "set") {
        w.offset += turns * hoursPerCrownTurn(P) * 3600;
        syncCalendar();
        return { action };
      }
      if (["date", "day", "gmt", "calday", "moon"].includes(action)) {
        // the quick-set wheel moves its target one jump per half turn of the crown
        w.quickAcc += Math.abs(turns); w.lastQuick = Math.sign(turns); w.quickTurns += turns;
        let jumps = 0;
        while (w.quickAcc >= 0.5 - 1e-9) { w.quickAcc -= 0.5; jumps++; }
        for (let i = 0; i < jumps; i++) {
          if (action === "date") stepDate();
          if (action === "day") w.cal.day = (w.cal.day + 1) % 7;
          if (action === "gmt") w.cal.gmt = (w.cal.gmt + 1) % 24;
          if (action === "moon") w.cal.moon = (w.cal.moon + 1) % MOON_TEETH;
          if (action === "calday") w.cal = calendarStep(w.cal, f.calType);
        }
        return { action, jumps };
      }
      return { action };
    };
    // Quick-setting while the date fingers are engaged (9 pm to 3 am) can damage a real calendar.
    w.quickSetRisky = () => { const h = ((w.handTime() % DAY) + DAY) % DAY / 3600; return h >= 21 || h < 3; };

    // Advancing the date by hand: each pass from 31 to 1 also moves the month on (Horopedia, "Month").
    function stepDate() {
      w.cal.date = (w.cal.date + 1) % 31;
      if (w.cal.date === 0) { w.cal.month = (w.cal.month + 1) % 12; if (w.cal.month === 0) w.cal.year++; }
    }
    w.moonCorrect = () => { if (!w.features().moon) return false; w.cal.moon = (w.cal.moon + 1) % MOON_TEETH; return true; };
    w.dayCorrect = () => { if (!w.features().dayPusher) return false; w.cal.day = (w.cal.day + 1) % 7; return true; };
    // The real moon for the date and time the watch shows, and how many one-day steps would bring the disc to it.
    w.moonCheck = () => {
      const tod = ((w.handTime() % DAY) + DAY) % DAY;
      const when = new Date(w.cal.year, w.cal.month, w.cal.date + 1, Math.floor(tod / 3600), Math.floor(tod % 3600 / 60));
      const realAge = moonAgeAt(when), shown = moonPhase(w.cal.moon) * 29.5;
      const off = n => { const d = Math.abs(((moonPhase(w.cal.moon + n) * 29.5 - realAge) % 29.5 + 29.5) % 29.5); return Math.min(d, 29.5 - d); };
      let steps = 0;
      for (let n = 0; n < MOON_TEETH; n++) if (off(n) <= 0.5 + 1e-9) { steps = n; break; } else if (off(n) < off(steps)) steps = n;
      return { realAge, shown, steps, when };
    };
    // Turn the crown back (first click) as many times as it takes to match the real moon.
    w.matchMoon = () => {
      const f = w.features(); if (!f.moon) return 0;
      const n = w.moonCheck().steps;
      for (let i = 0; i < n; i++) w.cal.moon = (w.cal.moon + 1) % MOON_TEETH;
      return n;
    };
    // Correctors for annual and perpetual calendars, used to set them up: month or year forward by one.
    w.correct = what => {
      const f = w.features();
      if (!f.program) return false;
      if (what === "month") { w.cal.month = (w.cal.month + 1) % 12; if (w.cal.month === 0) w.cal.year++; return true; }
      if (what === "year" && f.perpetual) { w.cal.year++; return true; }
      if (what === "date") { w.cal.date = (w.cal.date + 1) % 31; return true; }
      return false;
    };

    // ----- chronograph: the runner is driven through the oscillating pinion's real mesh -----
    const RUNNER_BASE = -90;
    let RUNNER_PITCH = 360 / X.chrono.runnerZ;
    let aDO = 0, aOR = 0, chronoSign = 1;
    // fourth wheel → lower pinion → (same arbor) upper pinion → chronograph seconds wheel
    function runnerMesh(tau) {
      const c = X.chrono, fourth = CM.state(P, G, tau).fourth;
      const osc = CM.meshDrivenFromDriver(fourth, aDO, c.fourthZ, c.lowerZ);
      return CM.meshDrivenFromDriver(osc, aOR, c.upperZ, c.runnerZ);
    }
    function computeMesh() {
      const c = X.chrono;
      RUNNER_PITCH = 360 / c.runnerZ; w.runnerPitch = RUNNER_PITCH;
      aDO = Math.atan2(c.oscIn[1] - c.drive[1], c.oscIn[0] - c.drive[0]) / D2R;
      aOR = Math.atan2(c.runner[1] - c.oscIn[1], c.runner[0] - c.oscIn[0]) / D2R;
      chronoSign = Math.sign(runnerMesh(600) - runnerMesh(0)) || 1;
    }
    computeMesh();
    w.chrono.phi = RUNNER_BASE;
    const runnerAngle = () => w.chrono.running ? runnerMesh(w.tau) + w.chrono.k * RUNNER_PITCH : w.chrono.phi;
    const elapsed = () => { const e = chronoSign * (runnerAngle() - RUNNER_BASE) / 6; return e === 0 ? 0 : e; };
    Object.defineProperty(w.chrono, "elapsed", {
      enumerable: true,
      get: elapsed,
      set: v => { if (w.chrono.running) w.chrono.k = (RUNNER_BASE + chronoSign * v * 6 - runnerMesh(w.tau)) / RUNNER_PITCH; else w.chrono.phi = RUNNER_BASE + chronoSign * v * 6; }
    });
    // Tip the oscillating pinion in: the runner turns to the nearest angle where its teeth fit the pinion's.
    function engage() {
      const now = w.chrono.phi, m = runnerMesh(w.tau);
      w.chrono.k = Math.round((now - m) / RUNNER_PITCH);
      w.chrono.lastJump = m + w.chrono.k * RUNNER_PITCH - now;
      w.chrono.lastJumpSeconds = chronoSign * w.chrono.lastJump / 6; // how far the stopwatch reading moved as the teeth met
      w.chrono.running = true;
    }
    w.runnerAngle = runnerAngle;
    w.runnerPitch = RUNNER_PITCH;
    w.oscAngle = () => CM.meshDrivenFromDriver(CM.state(P, G, w.tau).fourth, aDO, X.chrono.fourthZ, X.chrono.lowerZ);

    // Start/stop moves the switching cam. Reset does nothing while running (Gear Patrol), unless it is a flyback.
    w.pushStart = () => {
      if (!w.chronoOn) return false;
      if (w.chrono.running) { w.chrono.phi = runnerAngle(); w.chrono.running = false; }
      else { w.chrono.hammer = false; engage(); }
      w.chrono.column++;
      return true;
    };
    w.pushReset = () => {
      if (!w.chronoOn) return false;
      if (w.chrono.running) {
        if (!w.features().flyback) return false;
        // flyback: the hammer drops, the hands fly to zero, and the clutch re-engages at once
        w.chrono.phi = RUNNER_BASE; w.chrono.running = false; engage(); w.chrono.flybacks++;
        return true;
      }
      w.chrono.phi = RUNNER_BASE; w.chrono.hammer = true; return true;
    };

    // ---------- readouts for drawing ----------
    w.read = () => {
      const f = w.features(), H = w.handTime(), tod = ((H % DAY) + DAY) % DAY;
      // the date finger starts pushing two hours before midnight; the jumper snaps the ring over at 00:00
      // the date ring is pushed by its finger's contact with a tooth (the finger only reaches it in the evening)
      const dX = X.dial, pitch = 360 / 31;
      const datePush = datePushAt(dX.datePush, tod), dayPush = datePushAt(dX.dayPush, tod), moonPush = datePushAt(dX.moonPush, tod);
      const p = per(), bps = P.bph / 3600;
      const E = elapsed(), Epos = Math.max(0, E);
      // minute counter: a finger pushes it for a short period, then the jumper snaps it the rest of the way (AWCI),
      // so it creeps in the last moment of each minute and then jumps; the 1.5 s and 35% here are model values.
      // hour counter: geared to the barrel, so it runs continuously (Watch Repair Talk, Monochrome)
      const mins = Math.floor(Epos / 60), inMin = Epos - mins * 60;
      // the finger on the seconds wheel pushes the driving wheel for the last moments of each minute, then the jumper
      const mp = X.chrono.minPush, mu = (inMin - mp.t0) / mp.dt, mi = Math.max(0, Math.min(mp.vals.length - 2, Math.floor(mu)));
      const minPush = mu < 0 ? 0 : mp.vals[mi] + (mp.vals[mi + 1] - mp.vals[mi]) * Math.min(1, mu - mi);
      const mDrag = minPush / mp.pitch;
      const Hq = Math.floor(H * bps + 1e-9) / bps, Sq = Math.floor(w.train * bps + 1e-9) / bps;
      const len = monthLength(f.calType, w.cal.month, w.cal.year);
      const ret = (w.cal.date + (w.cal.date + 1 < len ? datePush / pitch : 0)) / 30; // retrograde hand creeps toward tomorrow, then flies back after the last day
      return {
        handTime: H, timeOfDay: tod,
        // dial hands, degrees clockwise from 12, stepping once per beat
        hourHand: (((Hq % 43200) + 43200) % 43200) / 43200 * 360,
        minuteHand: (((Hq % 3600) + 3600) % 3600) / 3600 * 360,
        secondsHand: (((Sq % 60) + 60) % 60) * 6,
        dateIndex: w.cal.date, dateShown: w.cal.date + 1, day: w.cal.day, moonTeeth: w.cal.moon,
        month: w.cal.month, year: w.cal.year, monthLength: len, leapIndex: ((w.cal.year % 4) + 4) % 4,
        moonPhase: moonPhase(w.cal.moon), gmtHours: w.cal.gmt,
        dateRing: w.cal.date * 360 / 31 + datePush, datePush, dayStar: w.cal.day * 360 / 7 + dayPush, dayPush, moonDisc: w.cal.moon * 360 / MOON_TEETH + moonPush, moonPush,
        dragging: datePush > 0 || dayPush > 0 || (moonPush > 0 && moonPush < 360 / MOON_TEETH),
        driver24: tod / DAY * 360,
        gmtHand: ((H + w.cal.gmt * 3600) % DAY + DAY) % DAY / DAY * 360,
        retroFraction: Math.min(1, ret),
        camIndex: camIndex(f.calType, w.cal.month, w.cal.year),
        chronoSeconds: ((chronoSign * (runnerAngle() - RUNNER_BASE)) % 360 + 360) % 360,
        chronoMinutes: ((mins % 30) + mDrag) * 12, chronoMinuteSteps: mins + mDrag, chronoHours: (Epos % 43200) / 43200 * 360,
        chronoRunnerAngle: runnerAngle(), chronoElapsed: E,
        reserveHours: w.springLeft * p.barrel / 3600, springFraction: w.springLeft / P.springTurns,
        ratchet: w.ratchetTurns * 360, drum: w.drumTurns * 360, crownAngle: w.crownTurns * 360,
        rotor: rotorAngle(w.opts.wrist, w.wall), rotorDir: rotorDirection(w.opts.wrist, w.wall),
        // the reduction side only ever turns one way, by the total swing of the rotor
        reduction1: w.rotorTurnsAbs * (AUTO.rotorPinion / AUTO.reverser) * (AUTO.reverserPinion / AUTO.red1[1]) * 360
      };
    };
    return w;
  }

  // ---------- geometry for the dial side, chronograph module, automatic and calendar program ----------
  function buildGeometry(P, G) {
    const at = (o, r, deg) => [o[0] + r * Math.cos(deg * D2R), o[1] + r * Math.sin(deg * D2R)];
    const Cd = G.mc, g = { dial: {}, chrono: {}, move: {}, auto: {}, prog: {} }, d = g.dial;
    const T = P.teeth, mHW = G.mpMod;
    // keyless works (dial side)
    d.settingWheel = at(G.mw, CM.centreDistance(P.modules.cm, T.minuteW, KEYLESS.settingWheel), 165);
    d.settingR = P.modules.cm * KEYLESS.settingWheel / 2;
    d.stemY = d.settingWheel[1] + d.settingR;
    d.quickSet = [d.settingWheel[0] - 0.6, d.stemY + 0.1 * KEYLESS.quickSetWheel / 2];
    d.quickSetR = 0.1 * KEYLESS.quickSetWheel / 2;
    // sliding pinion inner end for crown positions 0,1,2 (pulled crown pushes it inward via the yoke)
    d.slideEnd = [d.settingWheel[0] - 1.2, d.quickSet[0], d.settingWheel[0]];
    d.slideLen = 1.3;
    d.windPinion = [d.slideEnd[0] - d.slideLen - 1.32, d.slideEnd[0] - d.slideLen - 0.02]; // x range, fixed on the stem
    d.crownWheelR = 0.1 * KEYLESS.crownWheel / 2;
    d.crownWheel = [(d.windPinion[0] + d.windPinion[1]) / 2, d.stemY - 0.35 - d.crownWheelR];
    d.stemPull = [0, 0.6, 1.2];
    d.crownX = Cd[0] - 14.5;      // outer face of the crown, pushed in
    d.stemEnd = d.settingWheel[0] + 0.15;
    // Setting lever and yoke as rigid parts (Horopedia, "Winding and setting mechanism"): pulling the stem turns the
    // setting lever; its inclined plane pushes the yoke toward the centre, a spring holding the yoke against it; the
    // yoke's end carries the sliding pinion. Pivots, arm lengths and the plane's shape are model values, built so the
    // lever's pin stays in the stem's groove and the yoke's fork in the pinion's groove at every crown position.
    d.keyless = buildKeyless(d);
    d.settingLeverPivot = d.keyless.S; d.yokePivot = d.keyless.Y;
    // calendar works
    d.driver24 = at(Cd, CM.centreDistance(mHW, T.hourW, 2 * T.hourW), -30);
    d.driver24R = mHW * 2 * T.hourW / 2;
    d.driver24Z = 2 * T.hourW;
    d.ringIn = 10.0; d.ringTeeth = 10.5; d.ringOut = 11.6;
    // Date finger, ring teeth and their phase are chosen together so the finger, pushing a tooth's back flank, has
    // carried the ring exactly half a tooth (the jumper's peak) at midnight, then withdraws without touching a tooth
    // after the jumper snaps the ring on. Model values, checked by the tests.
    d.dateFinger = d.ringIn + 0.15 - CM.centreDistance(mHW, T.hourW, 2 * T.hourW);
    d.ringToothHalf = 0.42; d.ringPhase = 6.2;
    // which way the driving wheel turns in the drawing: cannon -> minute wheel -> hour wheel -> it, each mesh reversing
    d.fingerSense = -(Math.sign(CM.state(P, G, 600).center - CM.refState(P, G).center) || 1);
    d.dayStarR = 1.5; d.dayDiscR = 1.75;
    d.dayStar = at(d.driver24, 4.3 + d.dayStarR - 0.4, -125);
    // day finger, like the date one, sized and timed so it has pushed the star half a point by midnight (model values)
    d.dayFinger = Math.hypot(d.dayStar[0] - d.driver24[0], d.dayStar[1] - d.driver24[1]) - d.dayStarR + 0.3;
    d.dayPhase = 360 / 7 / 20;
    // Moon disc: 59 teeth pushed one a day by a finger, then a jumper finishes the step. Its teeth have to be coarse
    // enough, and the finger short enough, that after the snap the finger is clear before it reaches the next tooth;
    // a fine 59-tooth wheel gets pushed several teeth. Module, finger and timing are model values found by search.
    d.moonM = 0.14; d.moonR = d.moonM * MOON_TEETH / 2; d.moonFinger = 3.2; d.moonPhase = 0.76;
    d.moonRa = CM.wheelShape(MOON_TEETH, d.moonM, 0.3).Ra;
    d.moonDisc = at(d.driver24, d.moonFinger + d.moonRa - 0.05, 105);
    d.fingerAngles = { date: -15, day: -110, moon: 109 }; // driving wheel frame, at midnight
    // GMT: hour wheel -> intermediate (reverses) -> GMT wheel on the centre (same direction, half speed)
    d.gmtInter = at(Cd, CM.centreDistance(mHW, T.hourW, 20), 230);
    d.gmtInterZ = 20; d.gmtInterPZ = 10; d.gmtWheelZ = 40;
    d.gmtMod = 2 * CM.centreDistance(mHW, T.hourW, 20) / (d.gmtInterPZ + d.gmtWheelZ);
    d.gmtWheelR = d.gmtMod * d.gmtWheelZ / 2;
    // movement side: ratchet on the barrel arbor, stop lever at the balance
    const m = g.move;
    m.ratchetR = 0.1 * KEYLESS.ratchet / 2;
    // stop lever: touches the balance rim when the crown is pulled out (Montres-Passion, "How a stop-seconds mechanism works")
    m.stopPivot = [G.balance[0] - 4.2, G.balance[1] + 4.0];
    m.stopTipIn = at(G.balance, P.balanceR + 0.02, 125);
    m.stopTipOut = at(G.balance, P.balanceR + 0.7, 125);
    // Chronograph module and indirect central seconds: drawn above the train, shifted so their arbors line up
    // with the centre and fourth wheels below. Tooth counts here are model values, not taken from a real calibre.
    const c = g.chrono, dy = -24;
    c.shift = [0, dy];
    c.runner = [G.center[0], G.center[1] + dy];          // chronograph seconds wheel, on the centre
    c.drive = [G.fourth[0], G.fourth[1] + dy];           // the fourth wheel, projected up into this zone
    c.fourthZ = T.fourthW; c.fourthM = P.modules.fe;     // the fourth wheel's teeth (they also drive the escape pinion, at module fe)
    c.fourthR = c.fourthM * c.fourthZ / 2;
    // Oscillating pinion, as in the Valjoux 7750: one arbor with a pinion at each end. The lower pinion is always in
    // mesh with the fourth wheel; the upper one is tilted into the chronograph seconds wheel to start (Revolution).
    c.lowerZ = 12; c.lowerR = c.fourthM * c.lowerZ / 2;
    c.upperZ = 20; c.runnerZ = 160; c.runnerM = 0.05;    // fine teeth on the chronograph seconds wheel (Revolution: "fine, pointed teeth")
    c.upperR = c.runnerM * c.upperZ / 2; c.runnerR = c.runnerM * c.runnerZ / 2;
    c.wheelR = c.runnerR;                                 // kept for callers that size things off the runner
    const dFO = c.fourthR + c.lowerR, dOR = c.runnerR + c.upperR;
    const base = Math.hypot(c.drive[0] - c.runner[0], c.drive[1] - c.runner[1]);
    // the engaged pinion sits where both meshes are exact: intersection of two circles
    const a = (dFO * dFO - dOR * dOR + base * base) / (2 * base), h = Math.sqrt(Math.max(0, dFO * dFO - a * a));
    const ux = (c.runner[0] - c.drive[0]) / base, uy = (c.runner[1] - c.drive[1]) / base;
    c.oscIn = [c.drive[0] + a * ux - h * uy, c.drive[1] + a * uy + h * ux];
    // disengaged: swung about the fourth wheel's centre so the lower pinion stays in mesh and the upper one clears the runner
    const a0 = Math.atan2(c.oscIn[1] - c.drive[1], c.oscIn[0] - c.drive[0]), off = 6 * D2R;
    const cand = [a0 + off, a0 - off].map(t => [c.drive[0] + dFO * Math.cos(t), c.drive[1] + dFO * Math.sin(t)]);
    const dRun = q => Math.hypot(q[0] - c.runner[0], q[1] - c.runner[1]);
    c.oscOut = dRun(cand[0]) > dRun(cand[1]) ? cand[0] : cand[1];
    // switching cam (the 7750 is cam-operated, not column-wheel: Monochrome); three positions: reset, running, stopped (Revolution)
    c.cam = [c.drive[0] + 0.5, c.runner[1] - 4.8];
    c.camR = 1.1;
    c.column = c.cam; c.columnR = c.camR;
    c.pushStart = [c.drive[0] + 5.2, c.cam[1]];
    c.pushReset = [c.drive[0] + 5.2, c.drive[1] + 0.6];
    // Minute counter: a finger on the chronograph seconds wheel pushes the minute-counter driving wheel a tooth once a
    // minute, and that wheel turns the minute-counting wheel (the 7750's parts, Watch Repair Talk walkthrough); a jumper
    // takes over at half a tooth (AWCI). Tooth counts, module, finger depth and phase are model values, found by
    // search so the jump lands on the minute and the finger is clear of the next tooth afterward.
    c.minDriveZ = 12; c.minM = 0.1; c.minDriveRa = CM.wheelShape(c.minDriveZ, c.minM, 0.3).Ra;
    c.minStar = [c.runner[0] - (c.runnerR + 0.15 + c.minDriveRa), c.runner[1]];
    c.minStarR = c.minM * c.minDriveZ / 2;
    c.minCounterR = c.minM * 30 / 2;
    c.minCounter = [c.minStar[0] - CM.centreDistance(c.minM, c.minDriveZ, 30), c.runner[1]];
    c.minFingerL = c.runnerR + 0.15 + 0.05;            // finger tip radius on the seconds wheel: 0.05 into the teeth
    c.minPhase = 1.25;                                   // the driving wheel's tooth phase (deg)
    c.chronoSense = Math.sign(CM.state(P, G, 1).fourth - CM.state(P, G, 0).fourth) || 1;  // the runner turns with the fourth wheel
    // the finger points 2 degrees short of the driving wheel at the 60 s mark
    c.minFingerAt60 = 178;
    c.minFingerLocal = c.minFingerAt60 + 90;             // on the seconds wheel, which reads zero at -90 (RUNNER_BASE)
    // Hour counter: driven from the barrel, with a slipping clutch on its arbor (Monochrome); the 7750 has an
    // hour-counting wheel, a separate hour hammer with its own operating lever, and an hour counter lock (Watch Repair
    // Talk service walkthrough). Here: barrel 80 -> intermediate 40, its pinion 10 -> counter wheel 30, which makes the
    // counter wheel turn once in 12 hours when the barrel takes 8 (tooth counts are model values).
    c.barrel = [G.barrel[0], G.barrel[1] + dy];
    c.barrelZ = T.barrel; c.barrelM = P.modules.bc; c.barrelR = c.barrelM * c.barrelZ / 2;
    c.hourInterZ = 40; c.hourInterPZ = 10; c.hourWheelZ = 30; c.hourM = 0.08;
    c.hourInterR = c.barrelM * c.hourInterZ / 2;
    c.hourInter = at(c.barrel, c.barrelR + c.hourInterR, 180);
    c.hourInterPR = c.hourM * c.hourInterPZ / 2; c.hourWheelR = c.hourM * c.hourWheelZ / 2;
    c.hourCounter = at(c.hourInter, c.hourInterPR + c.hourWheelR, 90);
    c.hourCounterR = c.hourWheelR;
    c.hourLockPivot = [c.hourCounter[0] + 2.4, c.hourCounter[1] + 1.9];
    // Hammers: a two-headed hammer for the seconds and minute hearts, a separate one for the hour heart (WRT; SJX
    // describes this layout, with "slim levers with wide heads"). Pivots are placed for this drawing.
    c.hammerPivot = [c.runner[0] - 4.2, c.runner[1] + 3.9];
    c.hourHammerPivot = [c.hourCounter[0] - 2.6, c.hourCounter[1] + 2.2];
    // Cam followers. The coupling lever (carrying the oscillating pinion, swinging about the fourth wheel's arbor) and
    // the brake lever each have a nub resting on the switching cam; the cam's outline is made to pass through where
    // each nub must sit in each state, so the cam alone decides what the chronograph does (Revolution: the cam is
    // switched between three positions for start, stop and reset). Positions and shapes are model values.
    c.camStates = { reset: 0, running: 40, stopped: 80 };
    // the brake meets the rim at -35 degrees; its arm lies along the rim's tangent there, so swinging it lifts the tip
    // straight off the rim rather than sliding it along
    c.brakeAt = -35 * D2R;
    c.brakeTip = [c.runner[0] + (c.runnerR + 0.02) * Math.cos(c.brakeAt), c.runner[1] + (c.runnerR + 0.02) * Math.sin(c.brakeAt)];
    c.brakePivot = [c.brakeTip[0] - 2.6 * Math.sin(-c.brakeAt), c.brakeTip[1] - 2.6 * Math.cos(-c.brakeAt)];
    c.followers = buildCamFollowers(c);
    c.minPush = traceMinutePush(c);
    // Indirect central seconds (Hourstriker, "Center Seconds"): a pinion on the fourth wheel's arbor drives a large
    // intermediate wheel, which drives a pinion on the central seconds arbor; a friction spring takes up the backlash.
    c.csPinionZ = 12; c.csInterZ = 88; c.csM = 0.08;
    c.csPinionR = c.csM * c.csPinionZ / 2; c.csInterR = c.csM * c.csInterZ / 2;
    const dc = c.csPinionR + c.csInterR, ac = base / 2, hc = Math.sqrt(Math.max(0, dc * dc - ac * ac));
    c.csInter = [c.drive[0] + ac * ux - hc * uy, c.drive[1] + ac * uy + hc * ux];
    c.tensionSpring = [c.runner[0] - 2.2, c.runner[1] - 4.4];
    // automatic winding: drawn left of the movement
    const au = g.auto;
    au.rotor = [G.barrel[0] - 25, G.barrel[1] + 1];
    au.rotorR = 10.5;
    au.rotorPinionR = 0.1 * AUTO.rotorPinion / 2;
    au.reverserR = 0.1 * AUTO.reverser / 2;
    // Two reversing wheels meshed with each other, as SJX describes for the ETA 2824 and Rolex: the rotor pinion drives
    // the first, the first drives the second, and both their pinions reach the first reduction wheel.
    const rcd = au.rotorPinionR + au.reverserR;
    au.revA = at(au.rotor, rcd, 50);
    au.revB = at(au.revA, 2 * au.reverserR, 180);
    au.revPinionR = 0.06 * AUTO.reverserPinion / 2;
    au.red1R = 0.06 * AUTO.red1[1] / 2;
    const reach = au.red1R + au.revPinionR, mid = [(au.revA[0] + au.revB[0]) / 2, (au.revA[1] + au.revB[1]) / 2];
    const halfAB = au.reverserR, drop = Math.sqrt(Math.max(0, reach * reach - halfAB * halfAB));
    au.red1 = [mid[0], mid[1] + drop];
    au.red1PinionR = 0.06 * AUTO.red1[0] / 2;
    au.red2R = 0.05 * AUTO.red2[1] / 2;
    au.red2 = at(au.red1, au.red2R + au.red1PinionR, 60);
    // power reserve differential, below the rotor
    au.diff = [au.rotor[0] + 1.5, au.rotor[1] + au.rotorR + 5.5];
    au.sunA = 1.7; au.sunB = 1.15; au.planet = 0.45; au.carrier = 1.42;
    // calendar program (annual, perpetual) and retrograde date: right of the dial side
    const pg = g.prog;
    pg.cam = [Cd[0] + 34, Cd[1] + 1.5];
    pg.camR = 4.6; pg.notch = 0.42;     // notch depth per missing day
    pg.leverPivot = [pg.cam[0] - 9.0, pg.cam[1] + 2.6];
    pg.feelerAngle = 180;               // the grand lever reads the cam on its left side
    pg.dateStar = [pg.cam[0] + 0.5, pg.cam[1] - 10.5]; pg.dateStarR = 2.6;
    pg.snailR0 = 0.9; pg.snailR1 = 2.25;
    pg.rackPivot = [pg.dateStar[0] + 7.5, pg.dateStar[1] - 2.2];
    pg.retroPinion = [pg.rackPivot[0] + 0.2, pg.rackPivot[1] + 3.6];
    g.dial.datePush = traceDatePush(g, G, g.dial.fingerSense);
    g.dial.dayPush = traceWheelPush(g, "day", d.dayFinger, d.dayStar, dayStarPoly(d), d.dayPhase, 360 / 7);
    g.dial.moonPush = traceWheelPush(g, "moon", d.moonFinger, d.moonDisc, moonPoly(d), d.moonPhase, 360 / MOON_TEETH);
    return g;
  }

  // ---------- chronograph: levers following the switching cam ----------
  function buildCamFollowers(c) {
    const rot = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1]], add = (a, b) => [a[0] + b[0], a[1] + b[1]];
    const ang = v => Math.atan2(v[1], v[0]);
    // a nub placed so that turning its lever moves it straight toward or away from the cam's centre (on the circle
    // whose diameter joins the pivot and the cam centre)
    const nubFor = (pivot, rho, side) => { const v = sub(pivot, c.cam), L = Math.hypot(v[0], v[1]), g = Math.acos(rho / L) * side; return add(c.cam, rot([v[0] / L * rho, v[1] / L * rho], g)); };
    // coupling lever: pivot on the fourth wheel's arbor; engaged when the pinion sits at oscIn
    const aIn = ang(sub(c.oscIn, c.drive)), aOut = ang(sub(c.oscOut, c.drive));
    const coupling = { pivot: c.drive, nub: nubFor(c.drive, 1.5, -1), angle: { running: aIn - aOut, stopped: 0, reset: 0 } };
    // brake lever: its tip on the seconds wheel's rim when stopped, swung 9 degrees clear otherwise
    const tipOn = c.brakeTip, off = (() => {    // whichever way of turning lifts the tip away from the wheel
      const t = sub(tipOn, c.brakePivot), lift = a => { const q = add(c.brakePivot, rot(t, a)); return Math.hypot(q[0] - c.runner[0], q[1] - c.runner[1]); };
      return lift(8 * D2R) > lift(-8 * D2R) ? 8 * D2R : -8 * D2R; })();
    const brake = { pivot: c.brakePivot, nub: nubFor(c.brakePivot, 1.3, 1), tip: tipOn, angle: { stopped: 0, running: off, reset: off } };
    // samples: where each nub must touch the cam, in the cam's own frame, for each state
    const samples = [];
    for (const [name, L] of [["coupling", coupling], ["brake", brake]]) for (const [st, psi] of Object.entries(c.camStates)) {
      const n = add(L.pivot, rot(sub(L.nub, L.pivot), L.angle[st])), q = rot(sub(n, c.cam), -psi * D2R);
      samples.push({ lever: name, state: st, a: ang(q), r: Math.hypot(q[0], q[1]) });
    }
    // the outline: a short dwell at each sample, straight ramps between, and the base radius elsewhere
    const dwell = 7 * D2R, sorted = samples.slice().sort((x, y) => x.a - y.a), outline = [];
    sorted.forEach((sm, i) => {
      for (const da of [-dwell, 0, dwell]) outline.push([sm.r * Math.cos(sm.a + da), sm.r * Math.sin(sm.a + da)]);
      // ramp to the next dwell, the radius changing evenly with angle
      const nx = sorted[(i + 1) % sorted.length], a0 = sm.a + dwell, a1 = nx.a - dwell + (i + 1 === sorted.length ? 2 * Math.PI : 0);
      const steps = Math.max(1, Math.ceil((a1 - a0) / (6 * D2R)));
      for (let k = 1; k < steps; k++) { const t = k / steps, a = a0 + (a1 - a0) * t, r = sm.r + (nx.r - sm.r) * t; outline.push([r * Math.cos(a), r * Math.sin(a)]); }
    });
    return { coupling, brake, samples, outline, baseR: Math.min(...samples.map(x => x.r)) };
  }

  // The finger's tip, relative to the minute-counter driving wheel, at s seconds into a minute of stopwatch time.
  function minuteFingerTip(c, s) {
    const a = (c.minFingerAt60 + c.chronoSense * 6 * (s - 60)) * D2R;
    return [c.runner[0] + c.minFingerL * Math.cos(a) - c.minStar[0], c.runner[1] + c.minFingerL * Math.sin(a) - c.minStar[1]];
  }
  function minuteDrivePoly(c) { return CM.wheelShape(c.minDriveZ, c.minM, 0.3).outline.pts.map(([r, a]) => [r * Math.cos(a), r * Math.sin(a)]); }
  // The driving wheel turns the way the finger's tip moves at the contact: opposite to the seconds wheel.
  function traceMinutePush(c) {
    const poly = minuteDrivePoly(c), pitch = 360 / c.minDriveZ, t0 = 50, dt = 0.004, n = Math.round(10 / dt), vals = [];
    // the tip seen from the wheel turned by (chronoSense * push + phase): the drawing turns it by minus that
    const blocks = (tip, a) => { const ang = (c.chronoSense * a + c.minPhase) * D2R, q = [tip[0] * Math.cos(ang) - tip[1] * Math.sin(ang), tip[0] * Math.sin(ang) + tip[1] * Math.cos(ang)]; return insidePoly(q, poly); };
    let push = 0;
    for (let i = 0; i <= n; i++) {
      const tip = minuteFingerTip(c, t0 + i * dt), bl = a => blocks(tip, a);
      if (push < pitch && bl(push)) {
        let a = push, b = push + 0.01;
        while (bl(b) && b < pitch) { a = b; b += 0.01; }
        for (let k = 0; k < 30; k++) { const m = (a + b) / 2; if (bl(m)) a = m; else b = m; }
        push = b >= pitch / 2 ? pitch : b;
      }
      vals.push(push);
    }
    return { t0, dt, vals, pitch };
  }

  // ---------- keyless works: setting lever, yoke and its spring ----------
  function buildKeyless(d) {
    const rot = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
    const add = (a, b) => [a[0] + b[0], a[1] + b[1]], sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
    const gx = [0, 1, 2].map(i => d.crownX + 3.45 - d.stemPull[i]);              // stem groove, per crown position
    const sx = d.slideEnd.map(e => e - 0.55 * d.slideLen);                        // sliding pinion groove
    const S = [gx[1], d.stemY + 2.6], Rp = 2.6;                                   // setting lever pivot, pin arm
    const pins = gx.map(x => [x, S[1] - Math.sqrt(Rp * Rp - (x - S[0]) ** 2)]);
    const th = pins.map(p => Math.atan2(p[1] - S[1], p[0] - S[0]));              // lever angle per position
    const Y = [sx[1], d.stemY + 3.4], Rf = 3.02;                                  // yoke pivot, fork arm
    const forks = sx.map(x => [x, Y[1] - Math.sqrt(Rf * Rf - (x - Y[0]) ** 2)]);
    const ph = forks.map(f => Math.atan2(f[1] - Y[1], f[0] - Y[0]));             // yoke angle per position
    // the yoke's follower, on the side facing the lever
    const fl1 = [-1.25, -1.15];                                                   // from the yoke pivot, at position 1
    const fol = ph.map(a => add(Y, rot(fl1, a - ph[1])));
    // lever frame = the lever as it sits at position 1, relative to its pivot
    const toL = (w, i) => rot(sub(w, S), -(th[i] - th[1]));
    const q = fol.map((f, i) => toL(f, i));                                       // where the plane must be at each click
    // the spring turns the yoke back toward position 0, so the lever's material lies on that side of the plane
    const p0 = toL(add(Y, rot(fl1, -0.05)), 1), bv = sub(p0, q[1]), bn = Math.hypot(bv[0], bv[1]), back = [bv[0] / bn, bv[1] / bn];
    const ext = (a, b, k) => [b[0] + (b[0] - a[0]) * k, b[1] + (b[1] - a[1]) * k];
    const edge = [ext(q[1], q[0], 0.6), q[0], q[1], q[2], ext(q[1], q[2], 0.6)];   // the inclined plane, a little beyond
    const thick = 0.4, inner = edge.map(p => [p[0] + back[0] * thick, p[1] + back[1] * thick]);
    const pinL = toL(pins[1], 1);
    // lever outline (lever frame): pivot boss, arm up to the pin, and a plate carrying the plane
    const lever = [[-0.3, 0.3], [-0.22, pinL[1] + 0.12], [0.22, pinL[1] + 0.12], [0.25, -0.35], inner[0], edge[0], edge[1], edge[2], edge[3], edge[4], inner[4], [0.3, 0.45]];
    // yoke outline (yoke frame): pivot boss, arm up to a fork that straddles the pinion's groove, and the follower
    const fy = -Rf, fl = fl1;
    const yoke = [[-0.3, 0.3], [-0.3, -0.85], [fl[0] + 0.12, fl[1] + 0.2], fl, [fl[0] + 0.16, fl[1] - 0.18], [-0.18, -1.6],
      [-0.18, fy + 0.05], [-0.14, fy - 0.22], [-0.07, fy - 0.22], [-0.07, fy + 0.1], [0.07, fy + 0.1], [0.07, fy - 0.22], [0.14, fy - 0.22],
      [0.18, fy + 0.05], [0.18, -1.6], [0.3, 0.3]];
    return { S, Y, Rp, Rf, gx, sx, pins, th, forks, ph, fl1, fol, edge, inner, pinL, back, lever, yoke };
  }

  // ---------- calendar fingers: a point (the finger's tip) pushing a toothed ring forward ----------
  // Internal teeth of a ring centred at the origin: triangles with their base on rBase and tip on rIn.
  function insideTri(pt, a, b, c) {
    const s = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
    const d1 = s(a, b, pt), d2 = s(b, c, pt), d3 = s(c, a, pt);
    return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
  }
  function ringBlocks(tip, ringDeg, n, rIn, rBase, half) {
    const a = ringDeg * D2R, q = [tip[0] * Math.cos(-a) - tip[1] * Math.sin(-a), tip[0] * Math.sin(-a) + tip[1] * Math.cos(-a)];
    const r = Math.hypot(q[0], q[1]); if (r < rIn - 1e-12 || r > rBase + 1e-12) return false;
    const pitch = 2 * Math.PI / n, k0 = Math.round(Math.atan2(q[1], q[0]) / pitch);
    for (const k of [k0 - 1, k0, k0 + 1]) {
      const a0 = (k - half) * pitch, a1 = (k + half) * pitch, am = k * pitch;
      if (insideTri(q, [rBase * Math.cos(a0), rBase * Math.sin(a0)], [rIn * Math.cos(am), rIn * Math.sin(am)], [rBase * Math.cos(a1), rBase * Math.sin(a1)])) return true;
    }
    return false;
  }
  // Follow the finger through the evening (20:00 to midnight): wherever its tip would be inside a tooth, the ring
  // has been pushed forward just far enough to put the tooth's back flank against it. Traced once per geometry.
  function traceDatePush(X, G, sense) {
    const d = X.dial, t0 = DAY - 4 * 3600, dt = 10, n = 4 * 3600 / dt, vals = [];
    let push = 0;
    for (let i = 0; i <= n; i++) {
      const tip = dateFingerTip(X, G, t0 + i * dt, sense);
      const blocked = a => ringBlocks(tip, d.ringPhase + a, 31, d.ringIn, d.ringTeeth, d.ringToothHalf);
      if (blocked(push)) {
        let a = push, b = push + 0.005;
        while (blocked(b) && b < 360 / 31) { a = b; b += 0.005; }
        for (let k = 0; k < 30; k++) { const m = (a + b) / 2; if (blocked(m)) a = m; else b = m; }
        push = b;
      }
      vals.push(push);
    }
    return { t0, dt, vals };
  }
  // The same for a wheel outside the finger's reach (day star, moon disc): it turns the other way to the finger.
  // poly: the wheel's outline in its own frame; the drawing turns it by -(phase + angle).
  function insidePoly(pt, poly) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if (((yi > pt[1]) !== (yj > pt[1])) && (pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi)) c = !c;
    }
    return c;
  }
  function fingerTip(X, key, len, tod) {
    const d = X.dial, phi = (d.fingerAngles[key] + d.fingerSense * tod / DAY * 360) * D2R;
    return [d.driver24[0] + len * Math.cos(phi), d.driver24[1] + len * Math.sin(phi)];
  }
  function wheelBlocks(tip, centre, poly, ang) {
    const a = ang * D2R, x = tip[0] - centre[0], y = tip[1] - centre[1];
    return insidePoly([x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)], poly);
  }
  // snap: once the push reaches half a step the jumper carries the wheel the rest of the way (the value then holds
  // at a whole step until the calendar moves at midnight)
  function traceWheelPush(X, key, len, centre, poly, phase, pitch) {
    const t0 = DAY - 4 * 3600, dt = 10, n = 4 * 3600 / dt, vals = [];
    let push = 0;
    for (let i = 0; i <= n; i++) {
      const tip = fingerTip(X, key, len, t0 + i * dt), blocked = a => wheelBlocks(tip, centre, poly, phase + a);
      if (push < pitch && blocked(push)) {
        let a = push, b = push + 0.01;
        while (blocked(b) && b < pitch) { a = b; b += 0.01; }
        for (let k = 0; k < 30; k++) { const m = (a + b) / 2; if (blocked(m)) a = m; else b = m; }
        push = b >= pitch / 2 ? pitch : b;
      }
      vals.push(push);
    }
    return { t0, dt, vals };
  }
  function moonPoly(d) { return CM.wheelShape(MOON_TEETH, d.moonM, 0.3).outline.pts.map(([r, a]) => [r * Math.cos(a), r * Math.sin(a)]); }
  function dayStarPoly(d) { const p = []; for (let k = 0; k < 14; k++) { const a = k * Math.PI / 7, r = k % 2 ? d.dayStarR * 0.55 : d.dayStarR; p.push([r * Math.cos(a), r * Math.sin(a)]); } return p; }
  const datePushAt = (tb, tod) => {
    if (tod < tb.t0) return 0;
    const u = Math.min(tb.vals.length - 1, (tod - tb.t0) / tb.dt), i = Math.min(tb.vals.length - 2, Math.floor(u)), f = u - i;
    return tb.vals[i] + (tb.vals[i + 1] - tb.vals[i]) * f;
  };
  // The date finger's tip, relative to the dial centre, at time of day tod (s). The driving wheel turns once a day;
  // fingerSense is its direction in the drawing (+1 clockwise), worked out from the motion works.
  function dateFingerTip(X, G, tod, sense) {
    const d = X.dial, off = [d.driver24[0] - G.mc[0], d.driver24[1] - G.mc[1]];
    const phi = (d.fingerAngles.date + sense * tod / DAY * 360) * D2R;
    return [off[0] + d.dateFinger * Math.cos(phi), off[1] + d.dateFinger * Math.sin(phi)];
  }

  // ---------- dial layout: where each display goes for a set of features (dial radius 48, y down) ----------
  function dialLayout(f) {
    const L = { smallSeconds: null, central: f.chrono || f.central, subdials: [], windows: [], moon: null, retro: null, pr: null, leap: null, gmt: f.gmt };
    const right = f.gmt ? 32.5 : 40.5, left = f.gmt ? -32.5 : -40.5;
    if (f.chrono) {
      L.smallSeconds = { x: -21, y: 0, r: 10 };
      L.subdials.push({ key: "chronoMinutes", x: 0, y: -21, r: 10, n: 30, major: 5 }, { key: "chronoHours", x: 0, y: 21, r: 10, n: 12, major: 3 });
    } else if (!f.central) L.smallSeconds = { x: 0, y: 21, r: 10 };
    // windows stack down from 3 o'clock on the right, or from 9 on the left
    // each row keeps inside the dial (or inside the GMT scale), which curves in as rows go down
    const limitR = f.gmt ? 33.5 : 46;
    const col = (side, items) => {
      let y = -4.6;
      for (const it of items) {
        const yMax = Math.max(Math.abs(y), Math.abs(y + 9.2)), edge = Math.min(Math.abs(side > 0 ? right : left), Math.sqrt(limitR * limitR - yMax * yMax) - 0.4);
        L.windows.push(Object.assign({ x0: side > 0 ? edge - it.w : -edge, x1: side > 0 ? edge : -edge + it.w, y0: y, y1: y + 9.2 }, it));
        y += 10.6;
      }
    };
    const rightItems = [], leftItems = [];
    if (!f.retro && (f.day || f.date)) rightItems.push({ content: f.day && f.date ? "daydate" : f.date ? "date" : "day", w: f.day && f.date ? (f.gmt ? 19 : 26.5) : f.date ? 13.5 : 18.5 });
    if (f.retro) {
      L.retro = { x: 9, y: 0, r: 20, a0: -60, a1: 60 };
      if (f.day) leftItems.push({ content: "day", w: 16 });
    }
    if (f.month) {
      // on a chronograph the column at 3 sits between the registers at 12 and 6, so it has to stay narrow
      const item = { content: f.perpetual ? "monthyear" : "month", w: f.perpetual ? (f.chrono ? 19 : 23) : 13.5 };
      if (f.chrono) rightItems.push(item); else leftItems.push(item);
    }
    col(1, rightItems); col(-1, leftItems);
    if (f.perpetual) { const mw = L.windows.find(w => w.content === "monthyear"); L.leap = { x: (mw.x0 + mw.x1) / 2, y: mw.y1 + 2.2 }; }
    if (f.pr) L.pr = { x: 0, y: -8, r: 16, a0: -135, a1: -45 };
    if (f.moon) {
      if (f.chrono) L.moon = { x: 0, y: 13.5, r: 4.6, inside: "chronoHours" };
      else if (f.pr) L.moon = f.central ? { x: 0, y: 21, r: 7.5 } : { x: 0, y: 13.5, r: 4.6, inside: "smallSeconds" };
      else L.moon = { x: 0, y: -21, r: 7.5 };
    }
    return L;
  }

  return { ringBlocks, dateFingerTip, datePushAt, fingerTip, wheelBlocks, dayStarPoly, moonPoly, minuteFingerTip, minuteDrivePoly, insidePoly, CONFIGS, CHRONO_OK, CAL_TYPES, MONTHS, WRIST, AUTO, KEYLESS, MOON_TEETH, SYNODIC, DEFAULT_OPTS,
           config, features, allowed, chronoAllowed, crownPositions, quickSet, crownAction,
           barrelTurnsPerCrownTurn, hoursPerCrownTurn, barrelTurnsPerRotorTurn, rotorRate, rotorAngle, rotorDirection,
           monthLength, calendarStep, camSectors, camIndex, leapGregorian, leapJulian,
           moonAgeAt, moonPhase, initFromDate, createWatch, buildGeometry, dialLayout };
});
