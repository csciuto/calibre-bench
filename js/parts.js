// Calibre Bench complication parts: the extra wheels and levers on the movement, the dial side and the
// chronograph. view.js creates them with the shared drawing helpers; G(), X(), R() and W() return the current geometry
// and watch.
window.CalibreParts = function (ctx) {
  "use strict";
  const { CM, CX, GL, P, el, f4, tagPart, dial, G, X, R, W } = ctx;
  const D2R = CM.D2R;
  // ---------- complications: extra parts on the movement, the dial side, and the chronograph ----------
  const heartPath = (r0, r1) => { let d = ""; for (let i = 0; i <= 48; i++) { const th = -Math.PI + i * 2 * Math.PI / 48, r = r0 + (r1 - r0) * Math.abs(th) / Math.PI; d += (i ? "L" : "M") + f4(r * Math.cos(th)) + " " + f4(r * Math.sin(th)); } return d + "Z"; };
  const rectPath = (x0, y0, x1, y1) => `M${f4(x0)} ${f4(y0)}H${f4(x1)}V${f4(y1)}H${f4(x0)}Z`;
  // a stamped lever arm from a to b, w0 wide at a and w1 wide at b
  const leverPath = (a, b, w0, w1) => { const dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy) || 1, nx = -dy / n, ny = dx / n;
    return `M${f4(a[0] + nx * w0 / 2)} ${f4(a[1] + ny * w0 / 2)}L${f4(b[0] + nx * w1 / 2)} ${f4(b[1] + ny * w1 / 2)}L${f4(b[0] - nx * w1 / 2)} ${f4(b[1] - ny * w1 / 2)}L${f4(a[0] - nx * w0 / 2)} ${f4(a[1] - ny * w0 / 2)}Z`; };
  function needs(node, n) { node.setAttribute("data-needs", n); return node; }

  function drawRatchet(scene) {
    const m = X().move, sw = "0.9";
    const o = tagPart(el("g", { transform: `translate(${f4(G().barrel[0])} ${f4(G().barrel[1])})` }, scene), "ratchet", true);
    R().ratchet = el("g", {}, o);
    const sh = CM.wheelShape(CX.KEYLESS.ratchet, 0.1, 0.1 * CX.KEYLESS.crownWheel / 2);
    el("path", { d: sh.ring, class: "steel", "stroke-width": sw, "fill-rule": "evenodd" }, R().ratchet);
    el("path", { d: sh.arms, class: "steel", "stroke-width": sw }, R().ratchet);
    // the click: a pawl resting in the ratchet teeth, fixed to the bridge
    const ca = 200 * D2R, cr = m.ratchetR + 0.05;
    el("path", { d: `M${f4(cr * Math.cos(ca))} ${f4(cr * Math.sin(ca))}L${f4((cr + 0.9) * Math.cos(ca - 0.25))} ${f4((cr + 0.9) * Math.sin(ca - 0.25))}L${f4((cr + 0.6) * Math.cos(ca + 0.05))} ${f4((cr + 0.6) * Math.sin(ca + 0.05))}Z`, class: "steel", "stroke-width": sw }, o);
  }
  function drawStopLever(scene) {
    const m = X().move;
    const o = tagPart(el("g", {}, scene), "stopLever", true);
    R().stop = el("path", { class: "steel", "stroke-width": "1.4", fill: "none" }, o);
    R().stopTip = el("circle", { r: 0.16, class: "steel", "stroke-width": "0.9" }, o);
    el("path", { d: CM.circ(0.14), class: "hole", "stroke-width": "0.9", transform: `translate(${f4(m.stopPivot[0])} ${f4(m.stopPivot[1])})` }, o);
  }

  function drawDialUnder(scene) {
    const d = X().dial, Cd = G().mc, sw = "0.9", T = P.teeth;
    const at = p => `translate(${f4(p[0])} ${f4(p[1])})`;
    const part = (key, p, need) => { const o = tagPart(el("g", { transform: at(p) }, scene), key, true); if (need) needs(o, need); return o; };
    // date ring: a thin printed ring with 31 teeth on its inside edge. The drawing is the back of the movement, where
    // the ring turns clockwise and its window is on the left; each number sits upright as it reaches the window.
    const ring = part("dateRing", Cd, "date");
    R().dateRing = el("g", {}, ring);
    let teeth = "";
    for (let k = 0; k < 31; k++) {
      const ph = d.ringPhase * D2R, hw = d.ringToothHalf;
      const a0 = (k - hw) * 2 * Math.PI / 31 + ph, a1 = (k + hw) * 2 * Math.PI / 31 + ph, am = k * 2 * Math.PI / 31 + ph;
      teeth += `M${f4(d.ringTeeth * Math.cos(a0))} ${f4(d.ringTeeth * Math.sin(a0))}L${f4(d.ringIn * Math.cos(am))} ${f4(d.ringIn * Math.sin(am))}L${f4(d.ringTeeth * Math.cos(a1))} ${f4(d.ringTeeth * Math.sin(a1))}`;
    }
    el("path", { d: CM.circ(d.ringOut) + CM.circ(d.ringTeeth), class: "wheel", "stroke-width": sw, "fill-rule": "evenodd" }, R().dateRing);
    el("path", { d: teeth, class: "wheel", "stroke-width": sw, fill: "none" }, R().dateRing);
    for (let k = 0; k < 31; k++) {
      const a = 180 - k * 360 / 31, rr = (d.ringTeeth + d.ringOut) / 2;
      const tx = el("text", { class: "ringnum", "font-size": 0.62, "text-anchor": "middle", "dominant-baseline": "central",
        transform: `rotate(${f4(a)}) translate(${f4(rr)} 0) rotate(180)` }, R().dateRing);
      tx.textContent = String(k + 1);
    }
    // fixed date window marker: 3 o'clock from the front, so on the left from the back
    el("path", { d: rectPath(-(d.ringOut + 0.05), -0.55, -(d.ringTeeth - 0.05), 0.55), class: "window", "stroke-width": "1.2" }, ring);

    // GMT intermediate and GMT wheel (on the center, under the hour wheel)
    const gi = part("gmtInter", d.gmtInter, "gmt");
    R().gmtInter = el("g", {}, gi);
    const giw = CM.wheelShape(d.gmtInterZ, G().mpMod, G().mpMod * T.hourW / 2);
    el("path", { d: giw.ring, class: "wheel", "stroke-width": sw }, R().gmtInter);
    el("path", { d: giw.arms, class: "wheel", "stroke-width": sw }, R().gmtInter);
    el("path", { d: CM.pinionShape(d.gmtInterPZ, d.gmtMod).d, class: "pinion", "stroke-width": sw }, R().gmtInter);
    const gw = part("gmtWheel", Cd, "gmt");
    R().gmtWheel = el("g", {}, gw);
    const gws = CM.wheelShape(d.gmtWheelZ, d.gmtMod, d.gmtMod * d.gmtInterPZ / 2);
    el("path", { d: gws.ring, class: "steel", "stroke-width": sw }, R().gmtWheel);
    el("path", { d: gws.arms, class: "steel", "stroke-width": sw }, R().gmtWheel);

    // date driving wheel with its three fingers
    const dv = part("driver24", d.driver24, "calendar");
    R().driver24 = el("g", {}, dv);
    const dws = CM.wheelShape(d.driver24Z, G().mpMod, G().mpMod * T.hourW / 2);
    el("path", { d: dws.ring, class: "wheel", "stroke-width": sw }, R().driver24);
    el("path", { d: dws.arms, class: "wheel", "stroke-width": sw }, R().driver24);
    R().fingers = {};
    for (const [k, len] of [["date", d.dateFinger], ["day", d.dayFinger], ["moon", d.moonFinger]]) {
      const f = needs(el("g", {}, R().driver24), k);
      el("path", { d: `M0 -0.14L${f4(len - 0.15)} -0.1L${f4(len)} 0L${f4(len - 0.15)} 0.1L0 0.14Z`, class: "steel", "stroke-width": sw }, f);
      R().fingers[k] = f;
    }

    // day star with its printed day disc
    const ds = part("dayStar", d.dayStar, "day");
    R().dayStar = el("g", {}, ds);
    el("path", { d: CM.circ(d.dayDiscR + 0.55), class: "disc", "stroke-width": sw }, R().dayStar);
    let star = "";
    for (let k = 0; k < 14; k++) { const a = k * Math.PI / 7 - d.dayPhase * D2R, r = k % 2 ? d.dayStarR * 0.55 : d.dayStarR; star += (k ? "L" : "M") + f4(r * Math.cos(a)) + " " + f4(r * Math.sin(a)); }
    el("path", { d: star + "Z", class: "steel", "stroke-width": sw }, R().dayStar);
    for (let k = 0; k < 7; k++) {
      const tx = el("text", { class: "ringnum", "font-size": 0.42, "text-anchor": "middle", "dominant-baseline": "central",
        transform: `rotate(${f4(-90 + k * 360 / 7)}) translate(${f4(d.dayDiscR + 0.18)} 0) rotate(90)` }, R().dayStar);
      tx.textContent = GL.DAYS[k];
    }
    el("path", { d: rectPath(-0.62, -(d.dayDiscR + 0.5), 0.62, -(d.dayDiscR - 0.15)), class: "window", "stroke-width": "1.2" }, ds);

    // moon disc: 59 teeth, two painted moons, under a window with two humps
    const md = part("moonDisc", d.moonDisc, "moon");
    R().moonDisc = el("g", {}, md);
    const mws = CM.wheelShape(CX.MOON_TEETH, d.moonM, 0.3), ms = d.moonR / 2.36;   // painted moons scale with the disc
    el("path", { d: mws.ring + CM.circ(0.01), class: "moonsky", "stroke-width": sw, "fill-rule": "nonzero", transform: `rotate(${f4(-d.moonPhase)})` }, R().moonDisc);
    for (const a of [0, 180]) el("circle", { cx: f4(1.35 * ms * Math.cos(a * D2R)), cy: f4(1.35 * ms * Math.sin(a * D2R)), r: 0.62 * ms, class: "moonbody" }, R().moonDisc);
    const ap = 1.35 * ms, hr = 0.62 * ms;
    el("path", { d: `M${f4(-ap)} ${f4(-ap + 0.1)}A${hr} ${hr} 0 0 1 0 ${f4(-ap + 0.1)}A${hr} ${hr} 0 0 1 ${f4(ap)} ${f4(-ap + 0.1)}`, class: "window", "stroke-width": "1.2", fill: "none" }, md);

    // keyless works: crown wheel, stem, winding and sliding pinions, setting lever and yoke, quick-set and setting wheels
    const cw = part("crownWheel", d.crownWheel);
    R().crownWheel = el("g", {}, cw);
    const cws = CM.wheelShape(CX.KEYLESS.crownWheel, 0.1, 0.1 * CX.KEYLESS.windPinion / 2);
    el("path", { d: cws.ring, class: "steel", "stroke-width": sw }, R().crownWheel);
    el("path", { d: cws.arms, class: "steel", "stroke-width": sw }, R().crownWheel);
    el("line", { x1: d.crownWheel[0], y1: d.crownWheel[1], x2: G().barrel[0], y2: G().barrel[1], class: "lead", "stroke-width": "1" }, scene);

    const qs = part("quickSet", d.quickSet, "quick");
    R().quickSet = el("g", {}, qs);
    const qws = CM.wheelShape(CX.KEYLESS.quickSetWheel, 0.1, 0.6);
    el("path", { d: qws.ring, class: "steel", "stroke-width": sw }, R().quickSet);
    el("path", { d: qws.arms, class: "steel", "stroke-width": sw }, R().quickSet);
    R().rocker = el("path", { d: "M0 0L1.6 0.25L1.7 0.5", class: "steel", "stroke-width": "1.3", fill: "none" }, qs);

    const sws = part("settingWheel", d.settingWheel);
    R().settingWheel = el("g", {}, sws);
    const sws2 = CM.wheelShape(CX.KEYLESS.settingWheel, 0.1, 0.6);
    el("path", { d: sws2.ring, class: "wheel", "stroke-width": sw }, R().settingWheel);
    el("path", { d: sws2.arms, class: "wheel", "stroke-width": sw }, R().settingWheel);

    // setting lever and yoke: rigid parts turning on their pivots (shapes from the model)
    const K = d.keyless, poly = pts => "M" + pts.map(p => f4(p[0]) + " " + f4(p[1])).join("L") + "Z";
    const sl = tagPart(el("g", {}, scene), "settingLever", true);
    R().settingLever = el("g", {}, el("g", { transform: at(K.S) }, sl));
    el("path", { d: poly(K.lever), class: "steel", "stroke-width": sw }, R().settingLever);
    el("path", { d: CM.circ(0.11), class: "steel", "stroke-width": sw, transform: at(K.pinL) }, R().settingLever);     // pin in the stem's groove
    R().yoke = el("g", {}, el("g", { transform: at(K.Y) }, sl));
    el("path", { d: poly(K.yoke), class: "steel", "stroke-width": sw }, R().yoke);
    // yoke spring: fixed at a screw below, pressing the yoke's tail toward position 0
    el("path", { d: `M${f4(K.Y[0] + 2.2)} ${f4(K.Y[1] + 0.9)}Q${f4(K.Y[0] + 1.4)} ${f4(K.Y[1] + 0.3)} ${f4(K.Y[0] + 0.28)} ${f4(K.Y[1] - 0.6)}`, class: "spring2", "stroke-width": "1" }, sl);
    for (const pv of [K.S, K.Y]) el("path", { d: CM.circ(0.15), class: "hole", "stroke-width": sw, transform: at(pv) }, sl);

    // stem and crown move together when pulled; the winding pinion stays put
    const wp = tagPart(el("g", {}, scene), "windingPinion", true);
    R().windPinion = el("g", {}, wp);
    el("path", { d: rectPath(d.windPinion[0], d.stemY - 0.42, d.windPinion[1], d.stemY + 0.42), class: "steel", "stroke-width": sw }, wp);
    R().windHatch = el("path", { class: "hatch", "stroke-width": "0.7", fill: "none" }, wp);

    const crown = tagPart(el("g", {}, scene), "crown", true);
    crown.classList.add("crownpart");
    R().stem = el("g", {}, crown);
    el("path", { d: rectPath(d.crownX + 1.6, d.stemY - 0.2, d.stemEnd, d.stemY + 0.2), class: "steel", "stroke-width": sw }, R().stem);
    el("path", { d: rectPath(d.crownX, d.stemY - 1.15, d.crownX + 1.6, d.stemY + 1.15), class: "crownbody", "stroke-width": "1.1" }, R().stem);
    el("path", { d: rectPath(d.crownX + 1.6, d.stemY - 0.55, d.crownX + 2.1, d.stemY + 0.55), class: "steel", "stroke-width": sw }, R().stem);
    R().knurl = el("path", { class: "hatch", "stroke-width": "0.7", fill: "none" }, R().stem);
    R().stemGroove = el("path", { d: rectPath(d.crownX + 3.3, d.stemY - 0.12, d.crownX + 3.6, d.stemY + 0.12), class: "hole", "stroke-width": "0.7" }, R().stem);

    const sp = tagPart(el("g", {}, scene), "slidingPinion", true);
    R().slide = el("g", {}, sp);
    el("path", { d: rectPath(-d.slideLen, d.stemY - 0.45, 0, d.stemY + 0.45), class: "steel", "stroke-width": sw }, R().slide);
    el("path", { d: rectPath(-d.slideLen * 0.62, d.stemY - 0.45, -d.slideLen * 0.48, d.stemY + 0.45), class: "hole", "stroke-width": "0.7" }, R().slide);
    R().slideHatch = el("path", { class: "hatch", "stroke-width": "0.7", fill: "none" }, R().slide);
  }

  function drawChrono(scene) {
    const c = X().chrono, sw = "0.9", at = p => `translate(${f4(p[0])} ${f4(p[1])})`;
    const zone = needs(el("g", {}, scene), "chrono");
    R().chronoZone = zone;
    const part = (key, p) => tagPart(el("g", { transform: at(p) }, zone), key, true);
    el("line", { x1: G().center[0], y1: G().center[1], x2: c.runner[0], y2: c.runner[1], class: "lead", "stroke-width": "1" }, zone);
    el("line", { x1: G().fourth[0], y1: G().fourth[1], x2: c.drive[0], y2: c.drive[1], class: "lead", "stroke-width": "1" }, zone);
    const wheel = (g, z, m, mateR, cls) => { const s = CM.wheelShape(z, m, mateR); el("path", { d: s.ring, class: cls || "wheel", "stroke-width": sw }, g); el("path", { d: s.arms, class: cls || "wheel", "stroke-width": sw }, g); };

    // the fourth wheel itself, shown again up here (dashed) because the oscillating pinion meshes it directly
    const fg = tagPart(el("g", { transform: at(c.drive) }, zone), "fourth", false);
    R().chrDrive = el("g", {}, fg); wheel(R().chrDrive, c.fourthZ, c.fourthM, c.lowerR, "ghost");
    const rn = part("chronoRunner", c.runner); R().chrRunner = el("g", {}, rn); wheel(R().chrRunner, c.runnerZ, c.runnerM, c.upperR);
    el("path", { d: heartPath(0.42, 1.0), class: "steel", "stroke-width": sw }, R().chrRunner);
    el("path", { d: CM.circ(0.12), class: "hole", "stroke-width": sw }, rn);
    // oscillating pinion: lower pinion (meshing the fourth wheel) and upper pinion (meshing the runner) on one arbor
    R().chrOscG = part("oscPinion", c.oscIn);
    R().chrOsc = el("g", {}, R().chrOscG);
    R().chrOscUp = el("g", {}, R().chrOscG);
    el("path", { d: CM.pinionShape(c.lowerZ, c.fourthM).d, class: "pinion", "stroke-width": sw }, R().chrOsc);
    el("path", { d: CM.pinionShape(c.upperZ, c.runnerM).d, class: "pinion", "stroke-width": sw, opacity: 0.75 }, R().chrOscUp);
    el("path", { d: CM.circ(0.08), class: "hole", "stroke-width": sw }, R().chrOscG);

    // minute-counter driving wheel (pushed by the finger on the seconds wheel) and the minute-counting wheel it turns
    const ms = tagPart(el("g", { transform: at(c.minStar) }, zone), "minuteCounter", true);
    R().chrMinDrive = el("g", {}, ms); wheel(R().chrMinDrive, c.minDriveZ, c.minM, c.minM * 30 / 2, "steel");
    el("path", { d: CM.circ(0.1), class: "hole", "stroke-width": sw }, ms);
    R().chrFinger = el("path", { d: `M${f4(c.runnerR - 0.25)} -0.12L${f4(c.minFingerL)} -0.03L${f4(c.minFingerL)} 0.03L${f4(c.runnerR - 0.25)} 0.12Z`, class: "steel", "stroke-width": sw, transform: `rotate(${f4(c.minFingerLocal)})` }, R().chrRunner);
    const mc = part("minuteCounter", c.minCounter); R().chrMinGear = el("g", {}, mc); wheel(R().chrMinGear, 30, c.minM, c.minM * c.minDriveZ / 2);
    R().chrMin = el("g", {}, mc);
    el("path", { d: heartPath(0.3, 0.7), class: "steel", "stroke-width": sw }, R().chrMin);
    // hour counter: the barrel (shown again, dashed, as it would sit up here) drives an intermediate wheel whose pinion
    // turns the counter wheel; the counter's heart sits on the same arbor through a slipping clutch
    const bg = tagPart(el("g", { transform: at(c.barrel) }, zone), "barrel", false);
    const ba0 = 150 * D2R, ba1 = 210 * D2R, bRa = c.barrelR + c.barrelM;
    el("path", { d: `M${f4(bRa * Math.cos(ba0))} ${f4(bRa * Math.sin(ba0))}A${f4(bRa)} ${f4(bRa)} 0 0 1 ${f4(bRa * Math.cos(ba1))} ${f4(bRa * Math.sin(ba1))}`, class: "ghost", "stroke-width": sw }, bg);
    el("line", { x1: G().barrel[0], y1: G().barrel[1] - 5.9, x2: c.barrel[0], y2: c.barrel[1] + 5.9, class: "lead", "stroke-width": "1" }, zone);
    const hi = part("hourDrive", c.hourInter); R().chrHourInter = el("g", {}, hi);
    wheel(R().chrHourInter, c.hourInterZ, c.barrelM, c.barrelR);
    el("path", { d: CM.pinionShape(c.hourInterPZ, c.hourM).d, class: "pinion", "stroke-width": sw }, R().chrHourInter);
    el("path", { d: CM.circ(0.12), class: "hole", "stroke-width": sw }, hi);
    const hc = part("hourCounter", c.hourCounter);
    R().chrHourWheel = el("g", {}, hc); wheel(R().chrHourWheel, c.hourWheelZ, c.hourM, c.hourInterPR);
    el("path", { d: CM.circ(0.55), class: "clutch", "stroke-width": sw }, hc);          // the slipping clutch
    R().chrHour = el("g", {}, hc);
    el("path", { d: heartPath(0.3, 0.7), class: "steel", "stroke-width": sw }, R().chrHour);
    el("path", { d: CM.circ(0.1), class: "hole", "stroke-width": sw }, hc);
    // hour counter lock: holds the counter while the chronograph is stopped; the clutch lets the wheel keep turning
    const lk = tagPart(el("g", { transform: at(c.hourLockPivot) }, zone), "hourLock", true);
    R().hourLock = el("g", {}, lk);
    const lt = [c.hourCounter[0] + 0.62 * Math.cos(35 * D2R) - c.hourLockPivot[0], c.hourCounter[1] + 0.62 * Math.sin(35 * D2R) - c.hourLockPivot[1]];
    el("path", { d: leverPath([0, 0], lt, 0.32, 0.18), class: "steel", "stroke-width": sw }, R().hourLock);
    el("path", { d: CM.circ(0.14), class: "hole", "stroke-width": sw }, lk);

    // switching cam: a stamped, oblong plate in two layers, lower for start/stop and upper for reset (Monochrome, Revolution)
    const cl = part("switchCam", c.cam); R().chrColumn = el("g", {}, cl);
    // its outline passes through where each lever's nub must sit in each state (model), so the cam sets the levers
    const CF = c.followers, polyD = pts => "M" + pts.map(p => f4(p[0]) + " " + f4(p[1])).join("L") + "Z";
    el("path", { d: polyD(CF.outline), class: "steel", "stroke-width": sw }, R().chrColumn);
    el("path", { d: CM.circ(CF.baseR * 0.55), class: "steel", "stroke-width": sw, opacity: 0.7 }, R().chrColumn);   // the upper (reset) layer
    el("path", { d: CM.circ(0.14), class: "hole", "stroke-width": sw }, cl);

    // hammers: slim levers with wide heads (SJX). One has two heads, for the seconds and minute hearts; the hour heart
    // has its own hammer (the 7750's "hammer, 2 functions" and "hour hammer")
    const hammer = (key, pivot, hearts, heartR) => {
      const g = tagPart(el("g", { transform: at(pivot) }, zone), key, true);
      const body = el("g", {}, g);
      el("path", { d: CM.circ(0.55), class: "steel", "stroke-width": sw }, body);
      hearts.forEach((h, i) => {
        const dx = h[0] - pivot[0], dy = h[1] - pivot[1], n = Math.hypot(dx, dy), e = n - heartR[i] - 0.22;
        const tip = [dx / n * e, dy / n * e];
        el("path", { d: leverPath([0, 0], tip, 0.42, 0.3), class: "steel", "stroke-width": sw }, body);
        el("path", { d: rectPath(-0.75, -0.2, 0.75, 0.2), class: "steel", "stroke-width": sw, transform: `translate(${f4(tip[0])} ${f4(tip[1])}) rotate(${f4(Math.atan2(dy, dx) / D2R + 90)})` }, body);
      });
      el("path", { d: CM.circ(0.15), class: "hole", "stroke-width": sw }, g);
      return body;
    };
    R().hammer = hammer("hammer", c.hammerPivot, [c.runner, c.minCounter], [1.0, 0.7]);
    R().hourHammer = hammer("hourHammer", c.hourHammerPivot, [c.hourCounter], [0.7]);
    // brake lever: turns on its pivot; its nub rides the cam, its tip comes down on the seconds wheel's rim
    const bk = tagPart(el("g", { transform: at(c.brakePivot) }, zone), "brake", true);
    R().brake = el("g", {}, bk);
    const rel = (p, o) => [p[0] - o[0], p[1] - o[1]];
    const bTip = rel(CF.brake.tip, c.brakePivot), bNub = rel(CF.brake.nub, c.brakePivot);
    el("path", { d: leverPath([0, 0], bTip, 0.34, 0.16), class: "steel", "stroke-width": sw }, R().brake);
    el("path", { d: leverPath([0, 0], bNub, 0.3, 0.2), class: "steel", "stroke-width": sw }, R().brake);
    el("path", { d: CM.circ(0.12), class: "steel", "stroke-width": sw, transform: at(bNub) }, R().brake);
    el("path", { d: CM.circ(0.15), class: "hole", "stroke-width": sw }, bk);
    // coupling lever: carries the oscillating pinion round the fourth wheel's arbor; its nub rides the cam too
    const cp = tagPart(el("g", { transform: at(c.drive) }, zone), "oscPinion", false);
    R().coupling = el("g", {}, cp);
    const cNub = rel(CF.coupling.nub, c.drive), cPin = rel(c.oscOut, c.drive);
    el("path", { d: leverPath([0, 0], cNub, 0.32, 0.2), class: "steel", "stroke-width": sw, opacity: 0.85 }, R().coupling);
    el("path", { d: leverPath([0, 0], cPin, 0.32, 0.32), class: "steel", "stroke-width": sw, opacity: 0.85 }, R().coupling);
    el("path", { d: CM.circ(0.12), class: "steel", "stroke-width": sw, transform: at(cNub) }, R().coupling);

    // pushers, with the operating levers to the switching cam: start/stop to its lower layer, reset to its upper one
    el("line", { x1: c.pushStart[0] - 0.6, y1: c.pushStart[1], x2: c.column[0] + c.columnR, y2: c.column[1], class: "steel", "stroke-width": "1.3" }, zone);
    el("path", { d: `M${f4(c.pushReset[0] - 0.6)} ${f4(c.pushReset[1])}L${f4(c.column[0] + 2.2)} ${f4(c.pushReset[1])}L${f4(c.column[0] + 0.6)} ${f4(c.column[1] + 0.5)}`, class: "rod", "stroke-width": "1.3" }, zone);
    for (const [key, p, lab] of [["startPusher", c.pushStart, "startBody"], ["resetPusher", c.pushReset, "resetBody"]]) {
      const g = tagPart(el("g", { transform: at(p) }, zone), key, true);
      g.classList.add("crownpart");
      R()[lab] = el("g", {}, g);
      el("path", { d: rectPath(-0.6, -0.55, 1.6, 0.55), class: "crownbody", "stroke-width": "1.1" }, R()[lab]);
    }
  }

  // ---------- automatic winding, power reserve differential, central seconds, calendar program ----------
  function drawAuto(scene) {
    const a = X().auto, sw = "0.9", at = p => `translate(${f4(p[0])} ${f4(p[1])})`, A = CX.AUTO;
    const zone = needs(el("g", {}, scene), "auto");
    // rotor: a half disc with a heavy rim, pivoting on its own bearing; a small pinion under it
    const ro = tagPart(el("g", { transform: at(a.rotor) }, zone), "rotor", true);
    R().rotor = el("g", {}, ro);
    const rr = a.rotorR, ri = a.rotorR - 1.3;
    el("path", { d: `M${f4(-rr)} 0A${rr} ${rr} 0 0 0 ${f4(rr)} 0L${f4(ri)} 0A${ri} ${ri} 0 0 1 ${f4(-ri)} 0Z`, class: "rotor", "stroke-width": sw }, R().rotor);
    el("path", { d: `M${f4(-ri)} 0A${ri} ${ri} 0 0 0 ${f4(ri)} 0L1.2 0A1.2 1.2 0 0 1 -1.2 0Z`, class: "rotor", "stroke-width": sw, opacity: 0.35 }, R().rotor);
    R().rotorPinion = el("g", {}, ro);
    el("path", { d: CM.pinionShape(A.rotorPinion, 0.1).d, class: "pinion", "stroke-width": sw }, R().rotorPinion);
    el("path", { d: CM.circ(0.15), class: "hole", "stroke-width": sw }, ro);
    // two reverser wheels, each with a one-way clutch; the gripping one is marked
    const rv = tagPart(el("g", {}, zone), "reverserWheels", true);
    R().rev = [];
    for (const pos of [a.revA, a.revB]) {
      const o = el("g", { transform: at(pos) }, rv), wh = el("g", {}, o), pin = el("g", {}, o);
      const ws = CM.wheelShape(A.reverser, 0.1, a.rotorPinionR);
      el("path", { d: ws.ring, class: "wheel", "stroke-width": sw }, wh); el("path", { d: ws.arms, class: "wheel", "stroke-width": sw }, wh);
      el("path", { d: CM.pinionShape(A.reverserPinion, 0.06).d, class: "pinion", "stroke-width": sw }, pin);
      const clutch = el("circle", { r: 0.42, class: "clutch", "stroke-width": "1.1" }, o);
      R().rev.push({ wh, pin, clutch });
    }
    // reduction: first wheel reached by both reverser pinions, second wheel, then on to the ratchet on the barrel
    const rd = tagPart(el("g", {}, zone), "autoReduction", true);
    R().red1 = el("g", {}, el("g", { transform: at(a.red1) }, rd));
    const w1 = CM.wheelShape(A.red1[1], 0.06, a.revPinionR);
    el("path", { d: w1.ring, class: "wheel", "stroke-width": sw }, R().red1); el("path", { d: w1.arms, class: "wheel", "stroke-width": sw }, R().red1);
    el("path", { d: CM.pinionShape(A.red1[0], 0.05).d, class: "pinion", "stroke-width": sw }, R().red1);
    R().red2 = el("g", {}, el("g", { transform: at(a.red2) }, rd));
    const w2 = CM.wheelShape(A.red2[1], 0.05, a.red1PinionR);
    el("path", { d: w2.ring, class: "wheel", "stroke-width": sw }, R().red2); el("path", { d: w2.arms, class: "wheel", "stroke-width": sw }, R().red2);
    el("line", { x1: a.red2[0], y1: a.red2[1], x2: G().barrel[0], y2: G().barrel[1], class: "lead", "stroke-width": "1" }, zone);
  }
  function drawPRDiff(scene) {
    const a = X().auto, sw = "0.9", at = p => `translate(${f4(p[0])} ${f4(p[1])})`;
    const g = tagPart(needs(el("g", { transform: at(a.diff) }, scene), "pr"), "prDiff", true);
    R().sunA = el("g", {}, g); R().sunB = el("g", {}, g); R().carrier = el("g", {}, g);
    const sA = CM.wheelShape(40, 0.085, 0.2), sB = CM.wheelShape(28, 0.082, 0.2);
    el("path", { d: sA.ring, class: "wheel", "stroke-width": sw }, R().sunA); el("path", { d: sA.arms, class: "wheel", "stroke-width": sw }, R().sunA);
    el("path", { d: sB.ring, class: "steel", "stroke-width": sw }, R().sunB);
    el("path", { d: `M0 0L${f4(a.carrier + 0.9)} 0`, class: "steel", "stroke-width": "1.6" }, R().carrier);
    el("path", { d: CM.pinionShape(10, 0.09).d, class: "pinion", "stroke-width": sw, transform: `translate(${f4(a.carrier)} 0)` }, R().carrier);
    el("path", { d: `M${f4(a.carrier + 0.9)} -0.25L${f4(a.carrier + 1.6)} 0L${f4(a.carrier + 0.9)} 0.25Z`, class: "pointer" }, R().carrier);
    el("path", { d: CM.circ(0.15), class: "hole", "stroke-width": sw }, g);
    // scale for the output arm, empty to full
    let sc = ""; for (let i = 0; i <= 10; i++) { const t = (-150 + i * 12) * D2R; sc += `M${f4(3.2 * Math.cos(t))} ${f4(3.2 * Math.sin(t))}L${f4(3.6 * Math.cos(t))} ${f4(3.6 * Math.sin(t))}`; }
    el("path", { d: sc, class: "steel", "stroke-width": "0.8", fill: "none" }, g);
    el("line", { x1: a.diff[0], y1: a.diff[1], x2: G().barrel[0], y2: G().barrel[1], class: "lead", "stroke-width": "1" }, needs(el("g", {}, scene), "pr"));
  }
  function drawCentral(scene) {
    const c = X().chrono, sw = "0.9", at = p => `translate(${f4(p[0])} ${f4(p[1])})`;
    const zone = needs(el("g", {}, scene), "central");
    el("line", { x1: G().center[0], y1: G().center[1], x2: c.runner[0], y2: c.runner[1], class: "lead", "stroke-width": "1" }, zone);
    el("line", { x1: G().fourth[0], y1: G().fourth[1], x2: c.drive[0], y2: c.drive[1], class: "lead", "stroke-width": "1" }, zone);
    // pinion on the fourth wheel's arbor → large intermediate wheel → pinion on the central seconds arbor
    const dr = tagPart(el("g", {}, zone), "secondsDrive", true);
    R().csDrive = el("g", {}, el("g", { transform: at(c.drive) }, dr));
    el("path", { d: CM.pinionShape(c.csPinionZ, c.csM).d, class: "pinion", "stroke-width": sw }, R().csDrive);
    R().csIdler = el("g", {}, el("g", { transform: at(c.csInter) }, dr));
    const wi = CM.wheelShape(c.csInterZ, c.csM, c.csPinionR);
    el("path", { d: wi.ring, class: "wheel", "stroke-width": sw }, R().csIdler); el("path", { d: wi.arms, class: "wheel", "stroke-width": sw }, R().csIdler);
    const sw2 = tagPart(el("g", { transform: at(c.runner) }, zone), "secondsWheel", true);
    R().csWheel = el("g", {}, sw2);
    el("path", { d: CM.pinionShape(c.csPinionZ, c.csM).d, class: "pinion", "stroke-width": sw }, R().csWheel);
    el("path", { d: CM.circ(0.25), class: "steel", "stroke-width": sw }, sw2);
    // friction spring: a thin curved blade pressing on the seconds arbor
    const ts = [c.tensionSpring[0] - c.runner[0], c.tensionSpring[1] - c.runner[1]];
    el("path", { d: `M${f4(ts[0])} ${f4(ts[1])}Q${f4(ts[0] + 2.2)} ${f4(ts[1] + 0.8)} 0.2 -0.28`, class: "spring2", "stroke-width": "1.4" }, sw2);
    el("path", { d: CM.circ(0.16), class: "hole", "stroke-width": sw, transform: at(ts) }, sw2);
  }
  function drawProgram(scene) {
    const pg = X().prog, sw = "0.9", at = p => `translate(${f4(p[0])} ${f4(p[1])})`;
    // a simple complete calendar has a plain 12-tooth month star where the program cam would be
    const msn = tagPart(needs(el("g", { transform: at(pg.cam) }, scene), "monthStar"), "monthStar", true);
    R().monthStar = el("g", {}, msn);
    el("path", { d: CM.circ(pg.camR - 0.4), class: "disc", "stroke-width": sw }, R().monthStar);
    let mst = ""; for (let k = 0; k < 24; k++) { const a = k * Math.PI / 12, r = k % 2 ? 1.5 : 2.5; mst += (k ? "L" : "M") + f4(r * Math.cos(a)) + " " + f4(r * Math.sin(a)); }
    el("path", { d: mst + "Z", class: "steel", "stroke-width": sw }, R().monthStar);
    CX.MONTHS.forEach((m, k) => el("text", { class: "disclbl", "font-size": "0.75", "text-anchor": "middle",
      transform: `rotate(${f4(-90 + k * 30)}) translate(${f4(pg.camR - 1.15)} 0) rotate(90)` }, R().monthStar).textContent = m);
    el("path", { d: CM.circ(0.3), class: "hole", "stroke-width": sw }, msn);
    const cam = tagPart(needs(el("g", { transform: at(pg.cam) }, scene), "program"), "programCam", true);
    R().cam = el("g", {}, cam);
    R().camPath = el("path", { class: "camfill", "stroke-width": sw }, R().cam);
    R().camMarks = el("path", { class: "hatch", "stroke-width": "0.6", fill: "none" }, R().cam);
    el("path", { d: CM.circ(0.3), class: "hole", "stroke-width": sw }, cam);
    const gl = tagPart(needs(el("g", {}, scene), "program"), "grandLever", true);
    R().grandLever = el("path", { class: "steel", "stroke-width": "1.7", fill: "none" }, gl);
    R().grandTip = el("circle", { r: 0.18, class: "steel", "stroke-width": sw }, gl);
    el("path", { d: CM.circ(0.18), class: "hole", "stroke-width": sw, transform: at(pg.leverPivot) }, gl);
    // date star with the snail cam, rack, and retrograde pinion
    const ds = tagPart(needs(el("g", { transform: at(pg.dateStar) }, scene), "dateStar"), "dateStar", true);
    R().dateStar = el("g", {}, ds);
    let st = ""; for (let k = 0; k < 62; k++) { const a = k * Math.PI / 31, r = k % 2 ? pg.dateStarR * 0.82 : pg.dateStarR; st += (k ? "L" : "M") + f4(r * Math.cos(a)) + " " + f4(r * Math.sin(a)); }
    el("path", { d: st + "Z", class: "steel", "stroke-width": sw }, R().dateStar);
    const sn = tagPart(needs(el("g", {}, R().dateStar), "retro"), "snail", true);
    let sp = ""; const pitch = 360 / 31;
    for (let i = 0; i <= 120; i++) { const ph = i * 3, rr = pg.snailR0 + (pg.snailR1 - pg.snailR0) * Math.min(1, ph / (30 * pitch)); sp += (i ? "L" : "M") + f4(rr * Math.cos(ph * D2R)) + " " + f4(rr * Math.sin(ph * D2R)); }
    el("path", { d: sp + "Z", class: "camfill", "stroke-width": sw }, sn);
    el("path", { d: CM.circ(0.2), class: "hole", "stroke-width": sw }, ds);
    const rk = tagPart(needs(el("g", {}, scene), "retro"), "rack", true);
    R().rack = el("path", { class: "steel", "stroke-width": "1.5", fill: "none" }, rk);
    R().rackTeeth = el("path", { class: "steel", "stroke-width": "0.8", fill: "none" }, rk);
    el("path", { d: CM.circ(0.16), class: "hole", "stroke-width": sw, transform: at(pg.rackPivot) }, rk);
    R().retroPinion = el("g", {}, el("g", { transform: at(pg.retroPinion) }, rk));
    el("path", { d: CM.pinionShape(10, 0.1).d, class: "pinion", "stroke-width": sw }, R().retroPinion);
    el("path", { d: "M0 0L0 -1.6", class: "steel", "stroke-width": "1.2" }, R().retroPinion);
  }
  // program cam outline: one sector per month, cut deeper the fewer days the month has
  function updateCamShape() {
    const f = W().features(); if (!f.program) return;
    const sec = CX.camSectors(f.calType), n = sec.length, pg = X().prog;
    let d = "", marks = "";
    for (let i = 0; i < n; i++) {
      const a0 = i * 2 * Math.PI / n, a1 = (i + 1) * 2 * Math.PI / n, r = pg.camR - (31 - sec[i]) * pg.notch;
      d += `${i ? "L" : "M"}${f4(r * Math.cos(a0))} ${f4(r * Math.sin(a0))}A${f4(r)} ${f4(r)} 0 0 1 ${f4(r * Math.cos(a1))} ${f4(r * Math.sin(a1))}`;
      if (f.perpetual && i % 12 === 0) marks += `M${f4(0.6 * Math.cos(a0))} ${f4(0.6 * Math.sin(a0))}L${f4((r - 0.1) * Math.cos(a0))} ${f4((r - 0.1) * Math.sin(a0))}`;
    }
    R().camPath.setAttribute("d", d + "Z");
    R().camMarks.setAttribute("d", marks);
  }
  const heartPathXY = (r0, r1) => { let d = ""; for (let i = 0; i <= 36; i++) { const th = -Math.PI + i * 2 * Math.PI / 36, r = r0 + (r1 - r0) * Math.abs(th) / Math.PI; d += (i ? "L" : "M") + f4(r * Math.cos(th) + 0.28) + " " + f4(r * Math.sin(th)); } return d + "Z"; };

  // Show only the parts this watch has. Hidden parts also leave the keyboard order.
  return { needs, drawRatchet, drawStopLever, drawDialUnder, drawChrono, drawAuto, drawPRDiff, drawCentral, drawProgram, updateCamShape };
};
