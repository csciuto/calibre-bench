// Calibre Bench model: pure geometry and kinematics for a Swiss lever watch train.
// No DOM access. Every function takes its inputs explicitly so it can be tested in Node.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CalibreModel = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const D2R = Math.PI / 180;

  const DEFAULTS = Object.freeze({
    teeth: { barrel: 80, centerP: 10, centerW: 80, thirdP: 10, thirdW: 75, fourthP: 10, fourthW: 96,
             escP: 6, esc: 15, cannon: 12, minuteW: 36, minuteP: 10, hourW: 40 },
    modules: { bc: 0.14, ct: 0.10, tf: 0.08, fe: 0.07, cm: 0.10 },
    // directions (deg) of each line of centers, driver -> driven; lev = escape -> pallet -> balance
    angles: { bc: -10, ct: 30, tf: 10, fe: -40, lev: -10, mw: 150 },
    escTipR: 2.0, escRootR: 1.45, palletToBalance: 3.5, rollerR: 0.7, balanceR: 3.8,
    springTurns: 6.5, bph: 28800, amplitude: 270, lift: 52, palletSpanDeg: 60,
    // Pallet stones (Abbeyclock, "Drawing the Pallets"): each spans 8 degrees of the escape wheel, centered on the
    // tangent lines 60 degrees apart. Lock, run to banking and draw are model values.
    stoneHalfDeg: 4, lockDeg: 1.5, slideDeg: 0.5, drawDeg: 12, stoneLen: 0.55,
    // Club teeth: the impulse face rises from the toe (on the locking circle) back to the heel (on the tip circle),
    // so part of the lift comes from the tooth. Abbeyclock gives each beat 8 degrees across the stone, 2 across the
    // tooth's face and 2 of drop (12 = half a tooth); the lever degrees of tooth lift are a model value.
    toothLiftDeg: 3, clubDeg: 2
  });

  function params(over) {
    const d = JSON.parse(JSON.stringify(DEFAULTS));
    if (!over) return d;
    for (const k of Object.keys(over)) {
      if (over[k] && typeof over[k] === "object" && !Array.isArray(over[k])) Object.assign(d[k], over[k]);
      else d[k] = over[k];
    }
    return d;
  }

  const polar = (r, a) => [r * Math.cos(a), r * Math.sin(a)];
  const add = (p, q) => [p[0] + q[0], p[1] + q[1]];
  const f4 = n => n.toFixed(4);
  const centerDistance = (m, z1, z2) => m * (z1 + z2) / 2;

  // ---------- cycloidal tooth generation ----------
  // Returns polar points (r, angle rad) of the whole outline plus key radii.
  function gearOutline(z, m, o) {
    const R = m * z / 2, P = 2 * Math.PI / z, half = o.frac * P / 2;
    const Ra = R + o.add * m, Rd = R - o.ded * m, rho = o.rho;
    const k = (R + rho) / rho, fl = [];
    let t = 0, pointed = false;
    for (let i = 0; i < 4000; i++) {
      t += 0.004;
      const x = (R + rho) * Math.cos(t) - rho * Math.cos(k * t);
      const y = (R + rho) * Math.sin(t) - rho * Math.sin(k * t);
      const r = Math.hypot(x, y), ph = Math.atan2(y, x);
      if (ph >= half) { pointed = true; fl.push([Math.min(r, Ra), half]); break; }
      if (r >= Ra) { fl.push([Ra, ph]); break; }
      fl.push([r, ph]);
    }
    const pts = [];
    for (let i = 0; i < z; i++) {
      const c = i * P;
      pts.push([Rd, c - half], [R, c - half]);
      for (const [r, ph] of fl) pts.push([r, c - half + ph]);
      if (!pointed) {
        const end = fl[fl.length - 1][1], a0 = c - half + end, a1 = c + half - end;
        for (let j = 1; j < 4; j++) pts.push([Ra, a0 + (a1 - a0) * j / 4]);
      }
      for (let j = fl.length - 1; j >= 0; j--) pts.push([fl[j][0], c + half - fl[j][1]]);
      pts.push([R, c + half], [Rd, c + half]);
      const g0 = c + half, g1 = c + P - half;
      for (let j = 1; j < 4; j++) pts.push([Rd, g0 + (g1 - g0) * j / 4]);
    }
    return { pts, R, Ra, Rd, pointed };
  }
  const polyPath = pts => "M" + pts.map(([r, a]) => f4(r * Math.cos(a)) + " " + f4(r * Math.sin(a))).join("L") + "Z";
  const circ = r => `M${f4(r)} 0A${f4(r)} ${f4(r)} 0 1 0 ${f4(-r)} 0A${f4(r)} ${f4(r)} 0 1 0 ${f4(r)} 0Z`;
  function armsPath(n, r0, r1, w0, w1, phase) {
    let d = "";
    for (let i = 0; i < n; i++) {
      const a = phase + i * 2 * Math.PI / n, c = Math.cos(a), s = Math.sin(a), nx = -s, ny = c;
      const p = [[r0 * c + nx * w0, r0 * s + ny * w0], [r1 * c + nx * w1, r1 * s + ny * w1],
                 [r1 * c - nx * w1, r1 * s - ny * w1], [r0 * c - nx * w0, r0 * s - ny * w0]];
      d += "M" + p.map(q => f4(q[0]) + " " + f4(q[1])).join("L") + "Z";
    }
    return d;
  }
  function wheelShape(z, m, mateR) {
    const o = gearOutline(z, m, { frac: 0.47, add: 1.35, ded: 1.65, rho: mateR / 2 });
    const rimIn = o.Rd - Math.max(0.14, 0.07 * o.R), hub = Math.max(0.42, 0.17 * o.R);
    const n = o.R > 3 ? 5 : 4;
    return { outline: o, ring: polyPath(o.pts) + circ(rimIn),
             arms: armsPath(n, hub * 0.8, rimIn + 0.05, 0.0385 * o.R, 0.0275 * o.R, 0.3) + circ(hub),
             R: o.R, Ra: o.Ra, Rd: o.Rd };
  }
  function pinionShape(z, m) {
    const o = gearOutline(z, m, { frac: 0.34, add: 0.75, ded: 1.75, rho: m * 0.9 });
    return { outline: o, d: polyPath(o.pts), R: o.R, Ra: o.Ra, Rd: o.Rd };
  }
  // One club tooth, (radius, degrees from its toe), going back from the root behind it, over the club's impulse face
  // to the toe, then down the locking face. The locking face is undercut (leans back) more steeply than the pallet's
  // draw, or the stone's locking corner would dig into the tooth below the toe; 24 degrees here (model value).
  function clubTooth(Rt, Rr, h, clubDeg) {
    const Rl = Rt - (h || 0), under = 24 * D2R, back = r => -((Rl - r) * Math.tan(under)) / r / D2R, w = clubDeg || 3;
    // behind the heel the head falls away steeply into a slim neck, so the exit stone, moving in, clears the tooth
    // that has just left it
    return [[Rr, -15], [Rt * 0.80, -10.5], [Rt * 0.90, -6.2], [Rt * 0.97, -w - 0.9], [Rt, -w], [Rl, 0], [Rt * 0.9, back(Rt * 0.9)], [Rr + 0.02, back(Rr + 0.02)]];
  }
  // Height of the club face: the rise that turns the lever through the tooth's share of the lift, at the stone's
  // distance from the pallet pivot (the tangent length, Rt tan(span/2)).
  const clubHeight = p => p.escTipR * Math.tan(p.palletSpanDeg / 2 * D2R) * p.toothLiftDeg * D2R;
  // Swiss club-tooth escape wheel; forward is +angle, toe of tooth 0 at angle 0.
  function escapeShape(n, Rt, Rr, h, clubDeg) {
    const P = 360 / n, pts = [], tooth = clubTooth(Rt, Rr, h, clubDeg), last = tooth[tooth.length - 1][1];
    for (let i = 0; i < n; i++) {
      const c = i * P;
      for (const [r, a] of tooth) pts.push([r, c + a]);
      for (let j = 1; j < 4; j++) pts.push([Rr, c + last + (P - 17 - last) * j / 4]);
    }
    const rad = pts.map(([r, a]) => [r, a * D2R]);
    return { pts: rad, ring: polyPath(rad) + circ(Rr - 0.22), arms: armsPath(5, 0.32, Rr - 0.18, 0.07, 0.05, 0) + circ(0.36) };
  }

  // ---------- geometry ----------
  function build(p) {
    const T = p.teeth, M = p.modules, A = p.angles;
    const g = { cd: {} };
    g.cd.bc = centerDistance(M.bc, T.barrel, T.centerP);
    g.cd.ct = centerDistance(M.ct, T.centerW, T.thirdP);
    g.cd.tf = centerDistance(M.tf, T.thirdW, T.fourthP);
    g.cd.fe = centerDistance(M.fe, T.fourthW, T.escP);
    g.cd.cm = centerDistance(M.cm, T.cannon, T.minuteW);
    // solve the minute-pinion/hour-wheel module so the hour wheel is coaxial with the cannon pinion
    g.mpMod = 2 * g.cd.cm / (T.minuteP + T.hourW);
    g.cd.mh = centerDistance(g.mpMod, T.minuteP, T.hourW);
    const step = (from, deg, dist) => add(from, polar(dist, deg * D2R));
    g.barrel = [0, 0];
    g.center = step(g.barrel, A.bc, g.cd.bc);
    g.third = step(g.center, A.ct, g.cd.ct);
    g.fourth = step(g.third, A.tf, g.cd.tf);
    g.esc = step(g.fourth, A.fe, g.cd.fe);
    // pallet pivot sits where tangents from the pivot touch the tip circle at +/- half the pallet span
    g.palletPivotDist = p.escTipR / Math.cos(p.palletSpanDeg / 2 * D2R);
    g.pallet = step(g.esc, A.lev, g.palletPivotDist);
    g.balance = step(g.pallet, A.lev, p.palletToBalance);
    // Dial side is drawn as its own zone below the train, centered on the projected center arbor,
    // with room for a date ring around it.
    g.mc = add(g.center, [0, 22.5]);
    g.mw = step(g.mc, A.mw, g.cd.cm);
    // half lever swing set by lift geometry: fork follows the impulse jewel to the edge of the lift angle
    g.L = leverFromBalance(p, p.lift / 2);
    g.stones = buildStones(p, g);
    // the trace depends only on the escapement's own geometry, so builds that only change the train reuse it
    const ek = JSON.stringify([p.teeth.esc, p.escTipR, p.escRootR, p.palletSpanDeg, p.palletToBalance, p.rollerR, p.lift,
      p.stoneHalfDeg, p.lockDeg, p.slideDeg, p.drawDeg, p.stoneLen, p.toothLiftDeg, p.clubDeg]);
    if (!traceCache.has(ek)) traceCache.set(ek, { A: traceBeat(p, g, true), B: traceBeat(p, g, false) });
    g.escTrace = traceCache.get(ek);
    g.shapes = {
      barrelW: wheelShape(T.barrel, M.bc, M.bc * T.centerP / 2),
      centerP: pinionShape(T.centerP, M.bc), centerW: wheelShape(T.centerW, M.ct, M.ct * T.thirdP / 2),
      thirdP: pinionShape(T.thirdP, M.ct), thirdW: wheelShape(T.thirdW, M.tf, M.tf * T.fourthP / 2),
      fourthP: pinionShape(T.fourthP, M.tf), fourthW: wheelShape(T.fourthW, M.fe, M.fe * T.escP / 2),
      escP: pinionShape(T.escP, M.fe), escW: escapeShape(T.esc, p.escTipR, p.escRootR, clubHeight(p), p.clubDeg),
      cannon: pinionShape(T.cannon, M.cm), minuteW: wheelShape(T.minuteW, M.cm, M.cm * T.cannon / 2),
      minuteP: pinionShape(T.minuteP, g.mpMod), hourW: wheelShape(T.hourW, g.mpMod, g.mpMod * T.minuteP / 2)
    };
    return g;
  }

  // ---------- pallet stones ----------
  // Built in the lever's own frame (origin at the pallet pivot, x toward the balance; the escape center is at
  // (-d, 0)). Angles of escape-wheel points are measured from the line of centers, like the lever frame.
  // Entry stone (A) locks at lever -L with a tooth toe at -(span/2 + half width); exit stone (B) locks at +L with
  // a toe at +(span/2 - half width): 60 degrees apart, so the two locks are half a tooth out of phase.
  // Each stone is a parallelogram: locking face (with draw), impulse face across the inner end, back face.
  function buildStones(p, g) {
    const d = g.palletPivotDist, Rt = p.escTipR - clubHeight(p), L = g.L, D = D2R;   // toes lock on the locking circle
    const lockR = p.lockDeg * D, slide = p.slideDeg * D, liftR = 2 * L - lockR - slide - p.toothLiftDeg * D;
    const rot = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
    // a point given relative to the escape center (line-of-centers frame), seen from the lever at angle lam
    const toLever = (q, lam) => rot([q[0] - d, q[1]], -lam);
    const fromLever = (v, lam) => { const w = rot(v, lam); return [w[0] + d, w[1]]; };
    const onTip = a => [Rt * Math.cos(a), Rt * Math.sin(a)];
    const mk = (a1, a2, lamLock, lamUnlock, lamEnd) => {    // lamEnd: the toe leaves the exit corner (pallet lift ends)
      // locking face: through the locked toe, leaning forward (the way the wheel turns) by the draw angle
      const F = toLever(onTip(a1 + 1e-7 * D), lamLock);   // a hair ahead of the toe, so a locked tooth just touches
      const u = rot([Math.cos(a1 + p.drawDeg * D), Math.sin(a1 + p.drawDeg * D)], -lamLock);
      // its inner corner reaches the tip circle exactly when the lever has unlocked
      let lo = 0, hi = 0.4;
      for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2, q = fromLever([F[0] - m * u[0], F[1] - m * u[1]], lamUnlock); if (Math.hypot(q[0], q[1]) > Rt) lo = m; else hi = m; }
      const c1 = [F[0] - lo * u[0], F[1] - lo * u[1]];
      // impulse face: from that corner to the exit corner, which leaves the toe as impulse ends
      const c2 = toLever(onTip(a2), lamEnd);
      const len = p.stoneLen;
      return [c1, [c1[0] + len * u[0], c1[1] + len * u[1]], [c2[0] + len * u[0], c2[1] + len * u[1]], c2];
    };
    const hw = p.stoneHalfDeg * D, sp = p.palletSpanDeg / 2 * D;
    return {
      A: mk(-sp - hw, -sp + hw, -L, -L + lockR, -L + lockR + liftR),
      B: mk(sp - hw, sp + hw, L, L - lockR, L - lockR - liftR),
      lockToe: { A: -(p.palletSpanDeg / 2 + p.stoneHalfDeg), B: p.palletSpanDeg / 2 - p.stoneHalfDeg },
      liftDeg: liftR / D, lockR: Rt
    };
  }
  // Polygon overlap (strict), for the contact solver and the tests.
  function segCross(a, b, c, e) {
    const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
    const d1 = o(c, e, a), d2 = o(c, e, b), d3 = o(a, b, c), d4 = o(a, b, e);
    return ((d1 > 1e-12 && d2 < -1e-12) || (d1 < -1e-12 && d2 > 1e-12)) && ((d3 > 1e-12 && d4 < -1e-12) || (d3 < -1e-12 && d4 > 1e-12));
  }
  function inside(pt, poly) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if (((yi > pt[1]) !== (yj > pt[1])) && (pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi)) c = !c;
    }
    return c;
  }
  function overlap(P1, P2) {
    for (let i = 0; i < P1.length; i++) for (let j = 0; j < P2.length; j++)
      if (segCross(P1[i], P1[(i + 1) % P1.length], P2[j], P2[(j + 1) % P2.length])) return true;
    return P1.some(q => inside(q, P2)) || P2.some(q => inside(q, P1));
  }
  // Escape-wheel tooth outlines (relative to the escape center, line-of-centers frame) at wheel angle psi (deg,
  // toe of tooth 0), keeping only teeth near the pallets.
  function teethAt(p, psi) {
    const n = p.teeth.esc, pitch = 360 / n, out = [];
    const tooth = escapeTooth(p);
    for (let j = 0; j < n; j++) {
      const a0 = psi + j * pitch, rel = ((a0 % 360) + 540) % 360 - 180;
      if (Math.abs(rel) > p.palletSpanDeg / 2 + 22) continue;
      out.push(tooth.map(([r, a]) => [r * Math.cos(a0 * D2R + a), r * Math.sin(a0 * D2R + a)]));
    }
    return out;
  }
  const toothCache = new Map();
  function escapeTooth(p) {
    const key = [p.escTipR, p.escRootR, p.toothLiftDeg, p.clubDeg, p.palletSpanDeg].join("|");
    if (!toothCache.has(key)) {
      toothCache.set(key, clubTooth(p.escTipR, p.escRootR, clubHeight(p), p.clubDeg).map(([r, a]) => [r, a * D2R]));
    }
    return toothCache.get(key);
  }
  // The stones, relative to the escape center, with the lever at lam (rad).
  function stonesAt(p, g, lam) {
    const d = g.palletPivotDist, c = Math.cos(lam), s = Math.sin(lam);
    return [g.stones.A, g.stones.B].map(st => st.map(([x, y]) => [x * c - y * s + d, x * s + y * c]));
  }
  // The mainspring always pushes the escape wheel forward, so it sits at the furthest angle the stones allow from
  // where it already is. Traced once per beat direction as the lever swings bank to bank, then interpolated.
  // x is the wheel's advance (deg) since the beat began: 0 locked on one stone, half a tooth locked on the other.
  function traceBeat(p, g, fromA) {
    const L = g.L, N = 400, off = g.stones.lockToe.A, base = fromA ? 0 : 180 / p.teeth.esc;
    const lam = [], xs = [];
    let x = 0;
    for (let i = 0; i <= N; i++) {
      const l = fromA ? -L + 2 * L * i / N : L - 2 * L * i / N;
      const stones = stonesAt(p, g, l);
      const free = v => !teethAt(p, base + off + v).some(t => stones.some(s => overlap(t, s)));
      if (!free(x)) { let b = x - 0.01; while (!free(b) && b > x - 3) b -= 0.01; let a = b, c = x; for (let k = 0; k < 22; k++) { const m = (a + c) / 2; if (free(m)) a = m; else c = m; } x = a; }
      else {
        let a = x, b = null;
        for (let v = x + 0.05; v <= 13; v += 0.05) { if (free(v)) a = v; else { b = v; break; } }
        if (b === null) x = a; else { for (let k = 0; k < 22; k++) { const m = (a + b) / 2; if (free(m)) a = m; else b = m; } x = a; }
      }
      lam.push(l); xs.push(x);
    }
    return { lam, xs };
  }
  const traceCache = new Map();
  function escapeContact(p, g, lam, fromA) {
    const tb = fromA ? g.escTrace.A : g.escTrace.B, n = tb.lam.length - 1;
    const u = Math.max(0, Math.min(n, (fromA ? lam + g.L : g.L - lam) / (2 * g.L) * n)), i = Math.min(n - 1, Math.floor(u)), f = u - i;
    // linear between traced points, held back a hair so the straight line never cuts into a curved contact
    return tb.xs[i] + (tb.xs[i + 1] - tb.xs[i]) * f - 0.003 * Math.min(1, u, n - u);
  }

  // Lever angle (rad, in the lever frame) that puts the fork slot on the impulse jewel
  // when the balance is thetaDeg away from the line of centers.
  function leverFromBalance(p, thetaDeg) {
    const tr = thetaDeg * D2R;
    return Math.atan2(p.rollerR * Math.sin(tr), p.palletToBalance - p.rollerR * Math.cos(tr));
  }

  // ---------- mesh phasing ----------
  // alpha: direction (deg) from driver center to driven center. A tooth centered on the line of
  // centers on the driver faces a gap on the driven gear; rotation is opposite at ratio zDriver/zDriven.
  function meshDrivenFromDriver(phiDriver, alpha, zDriver, zDriven) {
    return alpha + 180 + 180 / zDriven - (phiDriver - alpha) * zDriver / zDriven;
  }
  function meshDriverFromDriven(phiDriven, alpha, zDriver, zDriven) {
    return alpha + (alpha + 180 + 180 / zDriven - phiDriven) * zDriven / zDriver;
  }

  // ---------- kinematics: every angle from watch time t (seconds) ----------
  function balanceTiming(p) {
    const beatsPerSec = p.bph / 3600, freq = p.bph / 7200, omega = 2 * Math.PI * freq;
    const halfLift = p.lift / 2;
    const liftHalfTime = Math.asin(Math.min(1, halfLift / p.amplitude)) / omega;
    return { beatsPerSec, freq, omega, liftHalfTime };
  }
  function state(p, g, t) {
    const T = p.teeth, A = p.angles, bt = balanceTiming(p);
    const theta = p.amplitude * Math.sin(bt.omega * t); // deg
    const s = t * bt.beatsPerSec, k = Math.round(s);
    const d = (s - k) / (bt.liftHalfTime * bt.beatsPerSec);
    const cd = Math.max(-1, Math.min(1, d));
    const steps = k + (cd + 1) / 2; // escape wheel advances one half-tooth during each lift window
    const lever = Math.abs(theta) < p.lift / 2 ? leverFromBalance(p, theta) : g.L * Math.sign(theta);
    // Inside the lift window the wheel's angle comes from contact with the stones: it recoils a little as the
    // locking stone draws out, follows the impulse face, then drops onto the other stone.
    let esc = (180 / T.esc) * steps;
    const inLift = Math.abs(d) < 1;
    if (inLift && g.escTrace) {
      // even beats swing the lever from the entry stone's bank to the exit stone's, odd beats back again
      const fromA = ((k % 2) + 2) % 2 === 0;
      esc = (180 / T.esc) * k + escapeContact(p, g, lever, fromA);
    }
    const fourth = meshDriverFromDriven(esc, A.fe, T.fourthW, T.escP);
    const third = meshDriverFromDriven(fourth, A.tf, T.thirdW, T.fourthP);
    const center = meshDriverFromDriven(third, A.ct, T.centerW, T.thirdP);
    const barrel = meshDriverFromDriven(center, A.bc, T.barrel, T.centerP);
    const minute = meshDrivenFromDriver(center, A.mw, T.cannon, T.minuteW);
    const hour = meshDrivenFromDriver(minute, A.mw + 180, T.minuteP, T.hourW);
    return { theta, lever, steps, beat: k, inLift,
             esc, escWheelOffset: A.lev + (g.stones ? g.stones.lockToe.A : -p.palletSpanDeg / 2),
             fourth, third, center, barrel, minute, hour };
  }

  // Hand angles (deg, clockwise from 12) relative to the 12:00:00 reference state.
  // The 12:00:00 reference: halfway between the locked states either side of the beat at t = 0, so the hands are
  // centered on true time (half a beat early or late at most) whatever the wheel does during that impulse.
  function refState(p, g) {
    const h = 0.5 / (p.bph / 3600), a = state(p, g, -h), b = state(p, g, h), out = {};
    for (const k of Object.keys(b)) out[k] = typeof b[k] === "number" ? (a[k] + b[k]) / 2 : b[k];
    return out;
  }
  function hands(p, g, t, ref) {
    ref = ref || refState(p, g);
    const s = state(p, g, t), probe = state(p, g, 600);
    const sg = k => Math.sign(probe[k] - ref[k]) || 1;
    return { minute: sg("center") * (s.center - ref.center),
             hour: sg("hour") * (s.hour - ref.hour),
             seconds: sg("fourth") * (s.fourth - ref.fourth) };
  }
  function readHands(h) {
    const w = a => ((a % 360) + 360) % 360;
    return { hour: w(h.hour) / 30, minute: w(h.minute) / 6, second: w(h.seconds) / 6 };
  }

  // Seconds for one turn of each arbor.
  function periods(p) {
    const T = p.teeth, bps = p.bph / 3600;
    const esc = 2 * T.esc / bps, fourth = esc * T.fourthW / T.escP, third = fourth * T.thirdW / T.fourthP;
    const center = third * T.centerW / T.thirdP, barrel = center * T.barrel / T.centerP;
    const minute = center * T.minuteW / T.cannon, hour = minute * T.hourW / T.minuteP;
    return { esc, fourth, third, center, barrel, minute, hour };
  }
  // Seconds per day the center arbor gains (+) or loses (-) against a true hour.
  function rateError(p) { return (3600 / periods(p).center - 1) * 86400; }
  function powerReserveHours(p) { return periods(p).barrel * p.springTurns / 3600; }

  return { D2R, DEFAULTS, params, centerDistance, gearOutline, wheelShape, pinionShape, escapeShape,
           circ, armsPath, build, refState, leverFromBalance, stonesAt, teethAt, overlap, escapeContact, traceBeat, meshDrivenFromDriver, meshDriverFromDriven,
           balanceTiming, state, hands, readHands, periods, rateError, powerReserveHours, polar, add };
});
