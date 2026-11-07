// Unit tests for the pure model, complications and glossary modules. These back the app's "[worked out]
// ... checked by the tests" claims. Run with `npm run test:unit` (Node's built-in test runner, no install).
const test = require('node:test');
const assert = require('node:assert/strict');
const CM = require('../js/model.js');
const CX = require('../js/complications.js');
const GL = require('../js/glossary.js');

const P = CM.params(), G = CM.build(P), X = CX.buildGeometry(P, G);
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ''} ${a} not within ${tol} of ${b}`);

test('going train: center once an hour, fourth once a minute, hour wheel in 12 h, no rate error', () => {
  const per = CM.periods(P);
  near(per.center, 3600, 1e-9); near(per.fourth, 60, 1e-9); near(per.hour, 43200, 1e-9);
  near(CM.rateError(P), 0, 1e-6);
  near(per.center / per.esc, 960, 1e-9, 'center to escape ratio 8 x 7.5 x 16');
});

test('changing a tooth count shows up as a rate error', () => {
  const p = CM.params({ teeth: { thirdW: 76 } });
  assert.ok(CM.rateError(p) < -1000);
});

test('power reserve is barrel turn time x spring turns', () => {
  near(CM.powerReserveHours(P), 8 * 6.5, 1e-9);
});

test('motion works: both pairs span the same center distance (hour wheel coaxial)', () => {
  near(G.cd.cm, G.cd.mh, 1e-12);
});

test('escapement: the wheel advances exactly half a tooth per beat', () => {
  for (const k of ['A', 'B']) near(G.escTrace[k].xs.at(-1), 180 / P.teeth.esc, 1e-6, k);
});

test('escapement: unlocking recoil is small (0.05 to about 0.2 degrees)', () => {
  const rA = -Math.min(...G.escTrace.A.xs), rB = -Math.min(...G.escTrace.B.xs);
  for (const r of [rA, rB]) assert.ok(r > 0.02 && r < 0.25, `recoil ${r}`);
});

test('escapement: no tooth ever passes through a pallet stone', () => {
  const off = G.stones.lockToe.A;
  for (const fromA of [true, false]) {
    const base = fromA ? 0 : 180 / P.teeth.esc;
    for (let i = 0; i <= 60; i++) {
      const lam = -G.L + 2 * G.L * i / 60;
      const x = CM.escapeContact(P, G, lam, fromA);
      const teeth = CM.teethAt(P, base + off + x), stones = CM.stonesAt(P, G, lam);
      assert.ok(!teeth.some(t => stones.some(s => CM.overlap(t, s))), `overlap at lever ${lam} (${fromA ? 'A' : 'B'})`);
    }
  }
});

test('hands read the time they were set to', () => {
  const ref = CM.refState(P, G);
  const t = 3 * 3600 + 25 * 60 + 30; // 03:25:30
  const h = CM.readHands(CM.hands(P, G, t, ref));
  near(h.minute, 25.5, 0.01); near(h.hour, 3 + 25.5 / 60, 0.01); near(h.second, 30, 0.2);
});

test('date finger meets the ring just before 23:00 and has pushed it half a tooth by midnight', () => {
  const dp = X.dial.datePush, first = dp.t0 + dp.vals.findIndex(v => v > 0) * dp.dt;
  assert.ok(first > 22 * 3600 && first < 23 * 3600, `first contact at ${first / 3600} h`);
  assert.ok(dp.vals.at(-1) >= 180 / 31, 'half a tooth by midnight');
  assert.ok(dp.vals.at(-1) < 360 / 31, 'never more than a tooth');
});

test('moon finger moves the disc exactly one tooth a day; day finger gets the star to the jumper', () => {
  near(X.dial.moonPush.vals.at(-1), 360 / CX.MOON_TEETH, 1e-9);
  // the day finger is designed to reach half a point by midnight; it gets within 1% of it
  near(X.dial.dayPush.vals.at(-1), 180 / 7, 0.01 * 180 / 7);
});

test('calendar month lengths by type', () => {
  assert.equal(CX.monthLength('simple', 1, 2027), 31);
  assert.equal(CX.monthLength('annual', 1, 2028), 30);
  assert.equal(CX.monthLength('annual', 3, 2027), 30);
  assert.equal(CX.monthLength('perpetual', 1, 2028), 29);
  assert.equal(CX.monthLength('perpetual', 1, 2027), 28);
  assert.equal(CX.monthLength('perpetual', 1, 2100), 29, 'a 4-year cam gets 2100 wrong, as the app says');
  assert.equal(CX.leapGregorian(2100), false);
});

test('perpetual calendar jumps from 28 Feb straight to 1 Mar', () => {
  let cal = { date: 27, day: 0, month: 1, year: 2027, moon: 0, gmt: 0 };
  cal = CX.calendarStep(cal, 'perpetual');
  assert.deepEqual([cal.date, cal.month], [0, 2]);
});

test('moon: 59-tooth disc drifts a day in about 2.6 years', () => {
  const daysPerLunationError = CX.SYNODIC - 29.5, years = CX.SYNODIC / daysPerLunationError / 365.25;
  near(years, 2.64, 0.05);
  near(CX.moonAgeAt(new Date(Date.UTC(2000, 0, 6, 18, 14))), 0, 1e-9);
});

test('crown: winding stops at full on a manual watch; setting moves the hands 5 min per twelfth of a turn', () => {
  const w = CX.createWatch(P, { handSeconds: 0, springLeft: 0 });
  let r; for (let i = 0; i < 200 && !(r && r.full); i++) r = w.turnCrown(1);
  assert.ok(r.full); near(w.springLeft, P.springTurns, 1e-9);
  w.setCrown(2); assert.ok(w.hacked()); assert.equal(w.tick(10), 0, 'stopped while hacked');
  const before = w.handTime(); w.turnCrown(1 / 12); near(w.handTime() - before, 300, 1e-6);
});

test('crown: first click quick-sets the date one per half turn', () => {
  const w = CX.createWatch(P, { handSeconds: 12 * 3600, date: 10 }); w.setConfig('date');
  w.setCrown(1); w.turnCrown(0.5); w.turnCrown(0.5);
  assert.equal(w.read().dateShown, 12);
});

test('chronograph: start, stop, reset; reset refused while running unless flyback', () => {
  const w = CX.createWatch(P, { handSeconds: 0 }); w.setConfig('date', true);
  w.tick(3); assert.ok(w.pushStart());
  assert.ok(Math.abs(w.chrono.lastJumpSeconds) < 0.2, 'start jump under 0.2 s');
  w.tick(10); near(w.chrono.elapsed, 10, 0.3);
  assert.equal(w.pushReset(), false, 'standard chronograph ignores reset while running');
  w.pushStart(); w.tick(5); const stopped = w.chrono.elapsed; near(stopped, 10, 0.3);
  assert.ok(w.pushReset()); near(w.chrono.elapsed, 0, 1e-9);
  w.setOption('chrono', 'flyback'); w.pushStart(); w.tick(4);
  assert.ok(w.pushReset()); assert.ok(w.chrono.running); assert.ok(Math.abs(w.chrono.elapsed) < 0.2);
});

test('automatic winding fills the spring and the bridle slips', () => {
  const w = CX.createWatch(P, { handSeconds: 0, springLeft: P.springTurns - 0.01 });
  w.setOption('auto', true); w.setOption('wrist', 'running');
  for (let i = 0; i < 600; i++) w.tick(1);
  near(w.springLeft, P.springTurns, 0.01); assert.ok(w.slipTurns > 0);
});

test('glossary: every citation, related part, stat term and tour stop resolves', () => {
  const ids = new Set(Object.keys(GL.SOURCES));
  const strings = [];
  for (const e of [...Object.values(GL.PARTS), ...Object.values(GL.TERMS)]) strings.push(e.short, ...(e.more || []));
  for (const s of strings) for (const seg of GL.parse(s)) if (seg.cite) for (const id of seg.cite) assert.ok(ids.has(id), `unknown source ${id}`);
  for (const [k, e] of Object.entries(GL.PARTS)) for (const [, rel] of e.rel) assert.ok(GL.PARTS[rel], `${k} -> ${rel}`);
  for (const k of GL.TOUR) assert.ok(GL.PARTS[k], k);
  const w = CX.createWatch(P, { handSeconds: 0 }); w.setConfig('complete', true);
  const ctx = { P, G, X, CX, w, r: w.read(), st: CM.state(P, G, 0), per: CM.periods(P), ref: CM.refState(P, G) };
  for (const [k, e] of Object.entries(GL.PARTS)) for (const [, , term] of e.stats(ctx)) if (term) assert.ok(GL.TERMS[term], `${k} stat term ${term}`);
});
