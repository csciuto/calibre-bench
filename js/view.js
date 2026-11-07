// Calibre Bench view: draws the model into the plan SVG and dial, wires up controls,
// and explains every part and term through hover tooltips and a drill-down info card.
(function () {
  "use strict";
  const CM = window.CalibreModel, GL = window.CalibreGlossary, CX = window.CalibreComplications;
  const D2R = CM.D2R, NS = "http://www.w3.org/2000/svg";
  const el = (t, a, p) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
  const f4 = n => n.toFixed(4);
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  // Sources are numbered in the order they're listed in the glossary, matching the Sources list on the page.
  const SOURCE_NUM = Object.fromEntries(Object.keys(GL.SOURCES).map((k, i) => [k, i + 1]));
  // Turn glossary text with {{markers}} into HTML: numbered source links, [citation needed], [model value], [worked out].
  function marked(str) {
    // an {{app}} marker shows nothing, so drop the space in front of it
    return GL.parse(str.replace(/\s+\{\{app\}\}/g, "{{app}}")).map(seg => {
      if (seg.text != null) return esc(seg.text);
      if (seg.cite) return seg.cite.map(id => { const src = GL.SOURCES[id];
        return `<sup class="cite"><a href="${esc(src.url)}" target="_blank" rel="noopener" title="${esc(src.title)}">[${SOURCE_NUM[id]}]</a></sup>`; }).join("");
      if (seg.kind === "app") return "";
      const k = GL.MARKER_KINDS[seg.kind];
      return `<sup class="mk mk-${seg.kind === "?" ? "cn" : seg.kind}" title="${esc(k.title)}">[${esc(k.label)}]</sup>`;
    }).join("");
  }

  const P = CM.params();
  let G = null, X = null, ref = null, handSign = null, st = null, fingerBase = 0;
  let W = CX.createWatch(P, CX.initFromDate(new Date()));

  // ---------- drawing ----------
  const svg = $("plan"); let R = {}, labG;
  function tagPart(node, key, focusable) {
    const e = GL.PARTS[key];
    node.setAttribute("data-part", key);
    if (focusable) {
      node.setAttribute("tabindex", "0");
      node.setAttribute("role", "button");
      node.setAttribute("aria-label", `${e.name}. ${GL.plain(e.short)}`);
    } else node.setAttribute("aria-hidden", "true");
    return node;
  }
  function draw() {
    svg.innerHTML = ""; R = {};
    const defs = el("defs", {}, svg);
    const pat = el("pattern", { id: "mm", width: 1, height: 1, patternUnits: "userSpaceOnUse" }, defs);
    el("path", { d: "M1 0L0 0 0 1", class: "gl", fill: "none" }, pat);
    const pat5 = el("pattern", { id: "mm5", width: 5, height: 5, patternUnits: "userSpaceOnUse" }, defs);
    el("rect", { width: 5, height: 5, fill: "url(#mm)" }, pat5);
    el("path", { d: "M5 0L0 0 0 5", class: "glm", fill: "none" }, pat5);
    el("rect", { x: -60, y: -60, width: 160, height: 140, fill: "url(#mm5)", "aria-hidden": "true" }, svg);
    const scene = el("g", {}, svg), g = G, s = g.shapes, A = P.angles, sw = "0.9";
    const at = p => `translate(${f4(p[0])} ${f4(p[1])})`;
    const grp = (p, key) => { const o = el("g", { transform: at(p) }, scene); if (key) tagPart(o, key, true); return el("g", {}, o); };

    for (const [a, b] of [[g.barrel, g.center], [g.center, g.third], [g.third, g.fourth], [g.fourth, g.esc], [g.esc, g.balance], [g.mc, g.mw]])
      el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: "center", "stroke-width": "0.6" }, scene);
    el("line", { x1: g.center[0], y1: g.center[1], x2: g.mc[0], y2: g.mc[1], class: "lead", "stroke-width": "1" }, scene);

    // barrel with mainspring
    R.barrel = grp(g.barrel, "barrel");
    el("path", { d: s.barrelW.ring, class: "wheel", "stroke-width": sw }, R.barrel);
    const drumR = s.barrelW.R * 0.80;
    el("path", { d: CM.circ(drumR), class: "wheel", "stroke-width": sw }, R.barrel);
    let sp = "";
    for (let i = 0; i <= 360; i++) { const u = i / 360, a = u * 2 * Math.PI * P.springTurns, r = 0.9 + u * (drumR - 1.05); sp += (i ? "L" : "M") + f4(r * Math.cos(a)) + " " + f4(r * Math.sin(a)); }
    el("path", { d: sp, class: "spring", "stroke-width": "0.8" }, R.barrel);
    el("path", { d: CM.circ(0.75), class: "steel", "stroke-width": sw }, R.barrel);
    el("path", { d: "M-0.25 -0.25H0.25V0.25H-0.25Z", class: "hole", "stroke-width": sw }, R.barrel);
    drawRatchet(scene);

    const arbor = (key, pos, wheel, pin) => {
      R[key] = grp(pos, key);
      if (wheel) { el("path", { d: wheel.ring, class: "wheel", "stroke-width": sw }, R[key]); el("path", { d: wheel.arms, class: "wheel", "stroke-width": sw }, R[key]); }
      if (pin) el("path", { d: pin.d, class: "pinion", "stroke-width": sw }, R[key]);
      el("path", { d: CM.circ(0.12), class: "hole", "stroke-width": sw }, R[key]);
    };
    arbor("center", g.center, s.centerW, s.centerP);
    arbor("third", g.third, s.thirdW, s.thirdP);
    arbor("fourth", g.fourth, s.fourthW, s.fourthP);

    R.esc = grp(g.esc, "escape");
    R.escW = el("g", {}, R.esc);
    el("path", { d: s.escW.ring, class: "wheel", "stroke-width": sw }, R.escW);
    el("path", { d: s.escW.arms, class: "wheel", "stroke-width": sw }, R.escW);
    el("path", { d: s.escP.d, class: "pinion", "stroke-width": sw }, R.esc);
    el("path", { d: CM.circ(0.1), class: "hole", "stroke-width": sw }, R.esc);

    // pallet lever in its own frame: x toward the balance, origin at the pivot
    R.lever = grp(g.pallet, "lever");
    // stones from the model: locking face with draw, impulse face across the inner end (Abbeyclock's construction)
    const stone = q => ({ d: "M" + q.map(v => f4(v[0]) + " " + f4(v[1])).join("L") + "Z",
      base: [(q[1][0] + q[2][0]) / 2, (q[1][1] + q[2][1]) / 2] });
    const sIn = stone(g.stones.A), sOut = stone(g.stones.B), fx = P.palletToBalance - P.rollerR;
    const body = `M${f4(sIn.base[0])} ${f4(sIn.base[1] - 0.12)}L0.05 -0.28 L${f4(fx - 0.45)} -0.17 L${f4(fx + 0.05)} -0.36 L${f4(fx + 0.18)} -0.30 L${f4(fx - 0.05)} -0.13 L${f4(fx - 0.05)} 0.13 L${f4(fx + 0.18)} 0.30 L${f4(fx + 0.05)} 0.36 L${f4(fx - 0.45)} 0.17 L0.05 0.28 L${f4(sOut.base[0])} ${f4(sOut.base[1] + 0.12)} L${f4(sOut.base[0] + 0.2)} ${f4(sOut.base[1] - 0.1)} L-0.1 0 L${f4(sIn.base[0] + 0.2)} ${f4(sIn.base[1] + 0.1)}Z`;
    el("path", { d: body, class: "steel", "stroke-width": sw }, R.lever);
    el("path", { d: sIn.d, class: "jewel" }, R.lever);
    el("path", { d: sOut.d, class: "jewel" }, R.lever);
    el("line", { x1: fx - 0.55, y1: 0, x2: fx - 0.2, y2: 0, stroke: "var(--steel)", "stroke-width": "1.6" }, R.lever);
    el("path", { d: CM.circ(0.12), class: "hole", "stroke-width": sw }, R.lever);
    const lv = A.lev * D2R;
    for (const sg of [-1, 1]) { // banking pins just outside the lever's full swing
      const a = lv + sg * (g.L + 0.175), r = 1.7;
      el("path", { d: CM.circ(0.09), class: "steel", "stroke-width": sw, transform: at(CM.add(g.pallet, [r * Math.cos(a), r * Math.sin(a)])) }, scene);
    }

    // hairspring (its own part, behind the balance) and balance
    const bo = el("g", { transform: at(g.balance) }, scene), BR = P.balanceR;
    const hs = tagPart(el("g", {}, bo), "hairspring", true);
    el("circle", { r: 2.85, class: "hit" }, hs);
    R.spring = el("path", { class: "spring", "stroke-width": "0.9" }, hs);
    R.studA = (A.lev + 60) * D2R;
    el("path", { d: CM.circ(0.16), class: "steel", "stroke-width": sw, transform: at(CM.polar(2.75, R.studA)) }, hs);
    const balPart = tagPart(el("g", {}, bo), "balance", true);
    R.bal = el("g", {}, balPart);
    el("path", { d: CM.circ(BR) + CM.circ(BR - 0.32), class: "wheel", "stroke-width": sw, "fill-rule": "evenodd" }, R.bal);
    el("path", { d: CM.armsPath(3, 0.3, BR - 0.28, 0.13, 0.1, Math.PI / 6), class: "wheel", "stroke-width": sw }, R.bal);
    for (let i = 0; i < 4; i++) el("path", { d: CM.circ(0.24), class: "wheel", "stroke-width": sw, transform: at(CM.polar(BR - 0.5, Math.PI / 4 + i * Math.PI / 2)) }, R.bal);
    el("path", { d: CM.circ(P.rollerR + 0.1), class: "steel", "stroke-width": sw }, R.bal);
    el("path", { d: `M${P.rollerR - 0.08} -0.07H${P.rollerR + 0.16}V0.07H${P.rollerR - 0.08}Z`, class: "jewel" }, R.bal);
    el("path", { d: CM.circ(0.36), class: "steel", "stroke-width": sw }, R.bal);
    el("path", { d: CM.circ(0.08), class: "hole", "stroke-width": sw }, R.bal);

    drawStopLever(scene);
    drawDialUnder(scene);
    // motion works, dial side
    R.hour = grp(g.mc, "hourWheel");
    el("path", { d: s.hourW.ring, class: "wheel", "stroke-width": sw }, R.hour);
    el("path", { d: s.hourW.arms, class: "wheel", "stroke-width": sw }, R.hour);
    R.mw = grp(g.mw, "minuteWheel");
    el("path", { d: s.minuteW.ring, class: "wheel", "stroke-width": sw }, R.mw);
    el("path", { d: s.minuteW.arms, class: "wheel", "stroke-width": sw }, R.mw);
    el("path", { d: s.minuteP.d, class: "pinion", "stroke-width": sw }, R.mw);
    el("path", { d: CM.circ(0.12), class: "hole", "stroke-width": sw }, R.mw);
    R.cannon = grp(g.mc, "cannon");
    el("path", { d: s.cannon.d, class: "pinion", "stroke-width": sw }, R.cannon);
    el("path", { d: CM.circ(0.18), class: "hole", "stroke-width": sw }, R.cannon);
    drawChrono(scene);
    drawCentral(scene);
    drawAuto(scene);
    drawPRDiff(scene);
    drawProgram(scene);

    drawLabels();
  }

  // Callout labels: text in two rows above and below the train, each with a leader to its part.
  function calloutSpecs() {
    const g = G, s = g.shapes, T = P.teeth, top = g.barrel[1] - 7.6;
    return [
      { key: "barrel", at: [g.barrel[0] - 5.5, top], side: "top", sub: `${T.barrel} teeth`, c: g.barrel, r: s.barrelW.Ra },
      { key: "center", at: [g.center[0] - 5.5, top], side: "top", sub: "1 turn an hour", c: g.center, r: s.centerW.Ra },
      { key: "escape", at: [g.esc[0] - 5.0, top], side: "top", sub: `${T.esc} teeth`, c: g.esc, r: P.escTipR },
      { key: "balance", at: [g.balance[0] - 0.6, top], side: "top", sub: `${(P.bph / 7200).toFixed(1)} Hz`, c: g.balance, r: P.balanceR },
      { key: "third", at: [g.third[0] - 2.5, g.third[1] + 4.7], side: "bottom", sub: `${T.thirdW}/${T.thirdP}`, c: g.third, r: s.thirdW.Ra },
      { key: "fourth", at: [g.fourth[0] + 1.1, g.fourth[1] + 5.6], side: "bottom", sub: "1 turn a minute", c: g.fourth, r: s.fourthW.Ra },
      { key: "lever", at: [g.pallet[0] - 1.0, g.balance[1] + 6.3], side: "bottom", sub: "", c: g.pallet, r: 0 },
      { key: "ratchet", at: [g.barrel[0] - 10.6, g.barrel[1] + 4.2], side: "bottom", sub: "wound by the crown", c: g.barrel, r: X.move.ratchetR },
      { key: "stopLever", at: [g.balance[0] + 1.0, g.balance[1] + 8.4], side: "bottom", sub: "stops the balance", c: X.move.stopTipOut, r: 0 },
      { key: "crown", at: [X.dial.crownX - 1.2, X.dial.stemY + 2.6], side: "bottom", sub: "tap to pull · drag to turn", c: [X.dial.crownX + 0.8, X.dial.stemY + 1.15], r: 0 },
      { key: "crownWheel", at: [X.dial.crownX - 1.2, X.dial.crownWheel[1] - 3.4], side: "top", sub: "", c: X.dial.crownWheel, r: X.dial.crownWheelR },
      { key: "motionWorks", at: [g.mc[0] - 3.2, g.mc[1] + X.dial.ringOut + 1.2], side: "bottom", sub: "under the dial", c: g.mc, r: s.hourW.Ra },
      { key: "dateRing", need: "date", at: [g.mc[0] + X.dial.ringOut + 0.9, g.mc[1] + 0.4], side: "bottom", sub: "1 to 31", c: g.mc, r: X.dial.ringOut },
      { key: "driver24", need: "calendar", at: [g.mc[0] + X.dial.ringOut + 0.9, g.mc[1] - 3.6], side: "top", sub: "1 turn a day", c: X.dial.driver24, r: X.dial.driver24R },
      { key: "dayStar", need: "day", at: [g.mc[0] + X.dial.ringOut + 0.9, g.mc[1] - 7.9], side: "top", sub: "", c: X.dial.dayStar, r: X.dial.dayDiscR + 0.5 },
      { key: "moonDisc", need: "moon", at: [g.mc[0] + X.dial.ringOut + 0.9, g.mc[1] + 5.0], side: "bottom", sub: "59 teeth", c: X.dial.moonDisc, r: X.dial.moonR },
      { key: "gmtWheel", need: "gmt", at: [g.mc[0] + X.dial.ringOut + 0.9, g.mc[1] + 8.8], side: "bottom", sub: "1 turn a day", c: g.mc, r: X.dial.gmtWheelR },
      { key: "chronoRunner", need: "chrono", at: [X.chrono.runner[0] - 6.5, X.chrono.runner[1] - 6.2], side: "top", sub: "stopwatch seconds", c: X.chrono.runner, r: X.chrono.wheelR },
      { key: "switchCam", need: "chrono", at: [X.chrono.column[0] - 3.2, X.chrono.runner[1] - 6.2], side: "top", sub: "start, stop, reset", c: X.chrono.column, r: X.chrono.columnR },
      { key: "startPusher", need: "chrono", at: [X.chrono.pushStart[0] + 2.2, X.chrono.pushStart[1] - 0.5], side: "bottom", sub: "tap to press", c: [X.chrono.pushStart[0] + 1.6, X.chrono.pushStart[1]], r: 0 },
      { key: "resetPusher", need: "chrono", at: [X.chrono.pushReset[0] + 2.2, X.chrono.pushReset[1] - 0.5], side: "bottom", sub: "tap to press", c: [X.chrono.pushReset[0] + 1.6, X.chrono.pushReset[1]], r: 0 },
      { key: "minuteCounter", need: "chrono", at: [X.chrono.minCounter[0] - 1.5, X.chrono.minCounter[1] - 3.6], side: "top", sub: "30 minutes", c: X.chrono.minCounter, r: X.chrono.minCounterR },
      { key: "hourCounter", need: "chrono", at: [X.chrono.hourInter[0] - X.chrono.hourInterR - 5.5, X.chrono.hourInter[1] - 2.4], side: "top", sub: "12 hours, from the barrel", c: X.chrono.hourCounter, r: X.chrono.hourCounterR },
      { key: "hammer", need: "chrono", at: [X.chrono.hammerPivot[0] - 2.0, X.chrono.hammerPivot[1] + 2.4], side: "bottom", sub: "seconds and minutes", c: X.chrono.hammerPivot, r: 0.55 },
      { key: "hourHammer", need: "chrono", at: [X.chrono.hourHammerPivot[0] - 1.0, X.chrono.hourHammerPivot[1] + 2.0], side: "bottom", sub: "", c: X.chrono.hourHammerPivot, r: 0.55 },
      { key: "rotor", need: "auto", at: [X.auto.rotor[0] - 8.5, g.barrel[1] - 7.6], side: "top", sub: "automatic winding", c: X.auto.rotor, r: X.auto.rotorR * 0.4 },
      { key: "prDiff", need: "pr", at: [X.auto.diff[0] - 11, X.auto.diff[1] + 2.4], side: "bottom", sub: "drives the reserve hand", c: X.auto.diff, r: X.auto.sunA },
      { key: "secondsWheel", need: "central", at: [X.chrono.runner[0] - 6.5, X.chrono.runner[1] - 6.2], side: "top", sub: "seconds on the center", c: X.chrono.runner, r: X.chrono.wheelR },
      { key: "monthStar", need: "monthStar", at: [X.prog.cam[0] + X.prog.camR + 1.2, X.prog.cam[1] + 0.6], side: "bottom", sub: "12 teeth", c: X.prog.cam, r: X.prog.camR },
      { key: "programCam", need: "program", at: [X.prog.cam[0] + X.prog.camR + 1.2, X.prog.cam[1] + 0.6], side: "bottom", sub: "month lengths", c: X.prog.cam, r: X.prog.camR },
      { key: "grandLever", need: "program", at: [X.prog.leverPivot[0] - 3.2, X.prog.leverPivot[1] + 3.0], side: "bottom", sub: "", c: X.prog.leverPivot, r: 0 },
      { key: "dateStar", need: "dateStar", at: [X.prog.dateStar[0] - 9.5, X.prog.dateStar[1] - 3.6], side: "top", sub: "31 points", c: X.prog.dateStar, r: X.prog.dateStarR },
      { key: "rack", need: "retro", at: [X.prog.rackPivot[0] + 1.2, X.prog.rackPivot[1] - 2.2], side: "top", sub: "retrograde date", c: X.prog.rackPivot, r: 0 }
    ];
  }
  // Most useful labels first: when labels would collide, the later ones wait until you zoom in.
  const LABEL_PRIORITY = ["crown", "barrel", "balance", "escape", "center", "dateRing", "chronoRunner", "secondsWheel", "rotor", "programCam", "monthStar", "motionWorks", "fourth", "third", "lever",
    "prDiff", "dateStar", "rack", "grandLever",
    "dayStar", "moonDisc", "gmtWheel", "startPusher", "resetPusher", "driver24", "switchCam", "stopLever", "ratchet", "crownWheel", "minuteCounter", "hourCounter", "hammer", "hourHammer"];
  function drawLabels() {
    labG = el("g", { class: "labels" }, svg);
    const specs = calloutSpecs().sort((a, b) => LABEL_PRIORITY.indexOf(a.key) - LABEL_PRIORITY.indexOf(b.key));
    for (const L of specs) {
      const gL = tagPart(el("g", { "data-side": L.side, "data-x": L.at[0], "data-y": L.at[1] }, labG), L.key, false);
      if (L.need) needs(gL, L.need);
      const dx = L.at[0] - L.c[0], dy = L.at[1] - L.c[1], n = Math.hypot(dx, dy) || 1;
      const tip = [L.c[0] + dx / n * L.r, L.c[1] + dy / n * L.r];
      el("line", { x1: L.at[0], y1: L.at[1], x2: tip[0], y2: tip[1], class: "leader" }, gL);
      el("circle", { cx: tip[0], cy: tip[1], r: 0.09, class: "leader-dot" }, gL);
      el("text", { class: "lab" }, gL).textContent = GL.PARTS[L.key].name;
      if (L.sub) el("text", { class: "lab2" }, gL).textContent = L.sub;
    }
  }

  // ---------- complications: extra parts on the movement, the dial side, and the chronograph ----------
  const heartPath = (r0, r1) => { let d = ""; for (let i = 0; i <= 48; i++) { const th = -Math.PI + i * 2 * Math.PI / 48, r = r0 + (r1 - r0) * Math.abs(th) / Math.PI; d += (i ? "L" : "M") + f4(r * Math.cos(th)) + " " + f4(r * Math.sin(th)); } return d + "Z"; };
  const rectPath = (x0, y0, x1, y1) => `M${f4(x0)} ${f4(y0)}H${f4(x1)}V${f4(y1)}H${f4(x0)}Z`;
  // a stamped lever arm from a to b, w0 wide at a and w1 wide at b
  const leverPath = (a, b, w0, w1) => { const dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy) || 1, nx = -dy / n, ny = dx / n;
    return `M${f4(a[0] + nx * w0 / 2)} ${f4(a[1] + ny * w0 / 2)}L${f4(b[0] + nx * w1 / 2)} ${f4(b[1] + ny * w1 / 2)}L${f4(b[0] - nx * w1 / 2)} ${f4(b[1] - ny * w1 / 2)}L${f4(a[0] - nx * w0 / 2)} ${f4(a[1] - ny * w0 / 2)}Z`; };
  function needs(node, n) { node.setAttribute("data-needs", n); return node; }

  function drawRatchet(scene) {
    const m = X.move, sw = "0.9";
    const o = tagPart(el("g", { transform: `translate(${f4(G.barrel[0])} ${f4(G.barrel[1])})` }, scene), "ratchet", true);
    R.ratchet = el("g", {}, o);
    const sh = CM.wheelShape(CX.KEYLESS.ratchet, 0.1, 0.1 * CX.KEYLESS.crownWheel / 2);
    el("path", { d: sh.ring, class: "steel", "stroke-width": sw, "fill-rule": "evenodd" }, R.ratchet);
    el("path", { d: sh.arms, class: "steel", "stroke-width": sw }, R.ratchet);
    // the click: a pawl resting in the ratchet teeth, fixed to the bridge
    const ca = 200 * D2R, cr = m.ratchetR + 0.05;
    el("path", { d: `M${f4(cr * Math.cos(ca))} ${f4(cr * Math.sin(ca))}L${f4((cr + 0.9) * Math.cos(ca - 0.25))} ${f4((cr + 0.9) * Math.sin(ca - 0.25))}L${f4((cr + 0.6) * Math.cos(ca + 0.05))} ${f4((cr + 0.6) * Math.sin(ca + 0.05))}Z`, class: "steel", "stroke-width": sw }, o);
  }
  function drawStopLever(scene) {
    const m = X.move;
    const o = tagPart(el("g", {}, scene), "stopLever", true);
    R.stop = el("path", { class: "steel", "stroke-width": "1.4", fill: "none" }, o);
    R.stopTip = el("circle", { r: 0.16, class: "steel", "stroke-width": "0.9" }, o);
    el("path", { d: CM.circ(0.14), class: "hole", "stroke-width": "0.9", transform: `translate(${f4(m.stopPivot[0])} ${f4(m.stopPivot[1])})` }, o);
  }

  function drawDialUnder(scene) {
    const d = X.dial, Cd = G.mc, sw = "0.9", T = P.teeth;
    const at = p => `translate(${f4(p[0])} ${f4(p[1])})`;
    const part = (key, p, need) => { const o = tagPart(el("g", { transform: at(p) }, scene), key, true); if (need) needs(o, need); return o; };
    // date ring: a thin printed ring with 31 teeth on its inside edge. It turns the way its finger pushes it
    // (clockwise in this view), so the dates are printed running the other way round.
    const ring = part("dateRing", Cd, "date");
    R.dateRing = el("g", {}, ring);
    let teeth = "";
    for (let k = 0; k < 31; k++) {
      const ph = d.ringPhase * D2R, hw = d.ringToothHalf;
      const a0 = (k - hw) * 2 * Math.PI / 31 + ph, a1 = (k + hw) * 2 * Math.PI / 31 + ph, am = k * 2 * Math.PI / 31 + ph;
      teeth += `M${f4(d.ringTeeth * Math.cos(a0))} ${f4(d.ringTeeth * Math.sin(a0))}L${f4(d.ringIn * Math.cos(am))} ${f4(d.ringIn * Math.sin(am))}L${f4(d.ringTeeth * Math.cos(a1))} ${f4(d.ringTeeth * Math.sin(a1))}`;
    }
    el("path", { d: CM.circ(d.ringOut) + CM.circ(d.ringTeeth), class: "wheel", "stroke-width": sw, "fill-rule": "evenodd" }, R.dateRing);
    el("path", { d: teeth, class: "wheel", "stroke-width": sw, fill: "none" }, R.dateRing);
    for (let k = 0; k < 31; k++) {
      const a = -k * 360 / 31, rr = (d.ringTeeth + d.ringOut) / 2;
      const tx = el("text", { class: "ringnum", "font-size": 0.62, "text-anchor": "middle", "dominant-baseline": "central",
        transform: `rotate(${f4(a)}) translate(${f4(rr)} 0) rotate(90)` }, R.dateRing);
      tx.textContent = String(k + 1);
    }
    // fixed date window marker at 3 o'clock
    el("path", { d: rectPath(d.ringTeeth - 0.05, -0.55, d.ringOut + 0.05, 0.55), class: "window", "stroke-width": "1.2" }, ring);

    // GMT intermediate and GMT wheel (on the center, under the hour wheel)
    const gi = part("gmtInter", d.gmtInter, "gmt");
    R.gmtInter = el("g", {}, gi);
    const giw = CM.wheelShape(d.gmtInterZ, G.mpMod, G.mpMod * T.hourW / 2);
    el("path", { d: giw.ring, class: "wheel", "stroke-width": sw }, R.gmtInter);
    el("path", { d: giw.arms, class: "wheel", "stroke-width": sw }, R.gmtInter);
    el("path", { d: CM.pinionShape(d.gmtInterPZ, d.gmtMod).d, class: "pinion", "stroke-width": sw }, R.gmtInter);
    const gw = part("gmtWheel", Cd, "gmt");
    R.gmtWheel = el("g", {}, gw);
    const gws = CM.wheelShape(d.gmtWheelZ, d.gmtMod, d.gmtMod * d.gmtInterPZ / 2);
    el("path", { d: gws.ring, class: "steel", "stroke-width": sw }, R.gmtWheel);
    el("path", { d: gws.arms, class: "steel", "stroke-width": sw }, R.gmtWheel);

    // date driving wheel with its three fingers
    const dv = part("driver24", d.driver24, "calendar");
    R.driver24 = el("g", {}, dv);
    const dws = CM.wheelShape(d.driver24Z, G.mpMod, G.mpMod * T.hourW / 2);
    el("path", { d: dws.ring, class: "wheel", "stroke-width": sw }, R.driver24);
    el("path", { d: dws.arms, class: "wheel", "stroke-width": sw }, R.driver24);
    R.fingers = {};
    for (const [k, len] of [["date", d.dateFinger], ["day", d.dayFinger], ["moon", d.moonFinger]]) {
      const f = needs(el("g", {}, R.driver24), k);
      el("path", { d: `M0 -0.14L${f4(len - 0.15)} -0.1L${f4(len)} 0L${f4(len - 0.15)} 0.1L0 0.14Z`, class: "steel", "stroke-width": sw }, f);
      R.fingers[k] = f;
    }

    // day star with its printed day disc
    const ds = part("dayStar", d.dayStar, "day");
    R.dayStar = el("g", {}, ds);
    el("path", { d: CM.circ(d.dayDiscR + 0.55), class: "disc", "stroke-width": sw }, R.dayStar);
    let star = "";
    for (let k = 0; k < 14; k++) { const a = k * Math.PI / 7 - d.dayPhase * D2R, r = k % 2 ? d.dayStarR * 0.55 : d.dayStarR; star += (k ? "L" : "M") + f4(r * Math.cos(a)) + " " + f4(r * Math.sin(a)); }
    el("path", { d: star + "Z", class: "steel", "stroke-width": sw }, R.dayStar);
    for (let k = 0; k < 7; k++) {
      const tx = el("text", { class: "ringnum", "font-size": 0.42, "text-anchor": "middle", "dominant-baseline": "central",
        transform: `rotate(${f4(-90 + k * 360 / 7)}) translate(${f4(d.dayDiscR + 0.18)} 0) rotate(90)` }, R.dayStar);
      tx.textContent = GL.DAYS[k];
    }
    el("path", { d: rectPath(-0.62, -(d.dayDiscR + 0.5), 0.62, -(d.dayDiscR - 0.15)), class: "window", "stroke-width": "1.2" }, ds);

    // moon disc: 59 teeth, two painted moons, under a window with two humps
    const md = part("moonDisc", d.moonDisc, "moon");
    R.moonDisc = el("g", {}, md);
    const mws = CM.wheelShape(CX.MOON_TEETH, d.moonM, 0.3), ms = d.moonR / 2.36;   // painted moons scale with the disc
    el("path", { d: mws.ring + CM.circ(0.01), class: "moonsky", "stroke-width": sw, "fill-rule": "nonzero", transform: `rotate(${f4(-d.moonPhase)})` }, R.moonDisc);
    for (const a of [0, 180]) el("circle", { cx: f4(1.35 * ms * Math.cos(a * D2R)), cy: f4(1.35 * ms * Math.sin(a * D2R)), r: 0.62 * ms, class: "moonbody" }, R.moonDisc);
    const ap = 1.35 * ms, hr = 0.62 * ms;
    el("path", { d: `M${f4(-ap)} ${f4(-ap + 0.1)}A${hr} ${hr} 0 0 1 0 ${f4(-ap + 0.1)}A${hr} ${hr} 0 0 1 ${f4(ap)} ${f4(-ap + 0.1)}`, class: "window", "stroke-width": "1.2", fill: "none" }, md);

    // keyless works: crown wheel, stem, winding and sliding pinions, setting lever and yoke, quick-set and setting wheels
    const cw = part("crownWheel", d.crownWheel);
    R.crownWheel = el("g", {}, cw);
    const cws = CM.wheelShape(CX.KEYLESS.crownWheel, 0.1, 0.1 * CX.KEYLESS.windPinion / 2);
    el("path", { d: cws.ring, class: "steel", "stroke-width": sw }, R.crownWheel);
    el("path", { d: cws.arms, class: "steel", "stroke-width": sw }, R.crownWheel);
    el("line", { x1: d.crownWheel[0], y1: d.crownWheel[1], x2: G.barrel[0], y2: G.barrel[1], class: "lead", "stroke-width": "1" }, scene);

    const qs = part("quickSet", d.quickSet, "quick");
    R.quickSet = el("g", {}, qs);
    const qws = CM.wheelShape(CX.KEYLESS.quickSetWheel, 0.1, 0.6);
    el("path", { d: qws.ring, class: "steel", "stroke-width": sw }, R.quickSet);
    el("path", { d: qws.arms, class: "steel", "stroke-width": sw }, R.quickSet);
    R.rocker = el("path", { d: "M0 0L1.6 0.25L1.7 0.5", class: "steel", "stroke-width": "1.3", fill: "none" }, qs);

    const sws = part("settingWheel", d.settingWheel);
    R.settingWheel = el("g", {}, sws);
    const sws2 = CM.wheelShape(CX.KEYLESS.settingWheel, 0.1, 0.6);
    el("path", { d: sws2.ring, class: "wheel", "stroke-width": sw }, R.settingWheel);
    el("path", { d: sws2.arms, class: "wheel", "stroke-width": sw }, R.settingWheel);

    // setting lever and yoke: rigid parts turning on their pivots (shapes from the model)
    const K = d.keyless, poly = pts => "M" + pts.map(p => f4(p[0]) + " " + f4(p[1])).join("L") + "Z";
    const sl = tagPart(el("g", {}, scene), "settingLever", true);
    R.settingLever = el("g", {}, el("g", { transform: at(K.S) }, sl));
    el("path", { d: poly(K.lever), class: "steel", "stroke-width": sw }, R.settingLever);
    el("path", { d: CM.circ(0.11), class: "steel", "stroke-width": sw, transform: at(K.pinL) }, R.settingLever);     // pin in the stem's groove
    R.yoke = el("g", {}, el("g", { transform: at(K.Y) }, sl));
    el("path", { d: poly(K.yoke), class: "steel", "stroke-width": sw }, R.yoke);
    // yoke spring: fixed at a screw below, pressing the yoke's tail toward position 0
    el("path", { d: `M${f4(K.Y[0] + 2.2)} ${f4(K.Y[1] + 0.9)}Q${f4(K.Y[0] + 1.4)} ${f4(K.Y[1] + 0.3)} ${f4(K.Y[0] + 0.28)} ${f4(K.Y[1] - 0.6)}`, class: "spring2", "stroke-width": "1" }, sl);
    for (const pv of [K.S, K.Y]) el("path", { d: CM.circ(0.15), class: "hole", "stroke-width": sw, transform: at(pv) }, sl);

    // stem and crown move together when pulled; the winding pinion stays put
    const wp = tagPart(el("g", {}, scene), "windingPinion", true);
    R.windPinion = el("g", {}, wp);
    el("path", { d: rectPath(d.windPinion[0], d.stemY - 0.42, d.windPinion[1], d.stemY + 0.42), class: "steel", "stroke-width": sw }, wp);
    R.windHatch = el("path", { class: "hatch", "stroke-width": "0.7", fill: "none" }, wp);

    const crown = tagPart(el("g", {}, scene), "crown", true);
    crown.classList.add("crownpart");
    R.stem = el("g", {}, crown);
    el("path", { d: rectPath(d.crownX + 1.6, d.stemY - 0.2, d.stemEnd, d.stemY + 0.2), class: "steel", "stroke-width": sw }, R.stem);
    el("path", { d: rectPath(d.crownX, d.stemY - 1.15, d.crownX + 1.6, d.stemY + 1.15), class: "crownbody", "stroke-width": "1.1" }, R.stem);
    el("path", { d: rectPath(d.crownX + 1.6, d.stemY - 0.55, d.crownX + 2.1, d.stemY + 0.55), class: "steel", "stroke-width": sw }, R.stem);
    R.knurl = el("path", { class: "hatch", "stroke-width": "0.7", fill: "none" }, R.stem);
    R.stemGroove = el("path", { d: rectPath(d.crownX + 3.3, d.stemY - 0.12, d.crownX + 3.6, d.stemY + 0.12), class: "hole", "stroke-width": "0.7" }, R.stem);

    const sp = tagPart(el("g", {}, scene), "slidingPinion", true);
    R.slide = el("g", {}, sp);
    el("path", { d: rectPath(-d.slideLen, d.stemY - 0.45, 0, d.stemY + 0.45), class: "steel", "stroke-width": sw }, R.slide);
    el("path", { d: rectPath(-d.slideLen * 0.62, d.stemY - 0.45, -d.slideLen * 0.48, d.stemY + 0.45), class: "hole", "stroke-width": "0.7" }, R.slide);
    R.slideHatch = el("path", { class: "hatch", "stroke-width": "0.7", fill: "none" }, R.slide);
  }

  function drawChrono(scene) {
    const c = X.chrono, sw = "0.9", at = p => `translate(${f4(p[0])} ${f4(p[1])})`;
    const zone = needs(el("g", {}, scene), "chrono");
    R.chronoZone = zone;
    const part = (key, p) => tagPart(el("g", { transform: at(p) }, zone), key, true);
    el("line", { x1: G.center[0], y1: G.center[1], x2: c.runner[0], y2: c.runner[1], class: "lead", "stroke-width": "1" }, zone);
    el("line", { x1: G.fourth[0], y1: G.fourth[1], x2: c.drive[0], y2: c.drive[1], class: "lead", "stroke-width": "1" }, zone);
    const wheel = (g, z, m, mateR, cls) => { const s = CM.wheelShape(z, m, mateR); el("path", { d: s.ring, class: cls || "wheel", "stroke-width": sw }, g); el("path", { d: s.arms, class: cls || "wheel", "stroke-width": sw }, g); };

    // the fourth wheel itself, shown again up here (dashed) because the oscillating pinion meshes it directly
    const fg = tagPart(el("g", { transform: at(c.drive) }, zone), "fourth", false);
    R.chrDrive = el("g", {}, fg); wheel(R.chrDrive, c.fourthZ, c.fourthM, c.lowerR, "ghost");
    const rn = part("chronoRunner", c.runner); R.chrRunner = el("g", {}, rn); wheel(R.chrRunner, c.runnerZ, c.runnerM, c.upperR);
    el("path", { d: heartPath(0.42, 1.0), class: "steel", "stroke-width": sw }, R.chrRunner);
    el("path", { d: CM.circ(0.12), class: "hole", "stroke-width": sw }, rn);
    // oscillating pinion: lower pinion (meshing the fourth wheel) and upper pinion (meshing the runner) on one arbor
    R.chrOscG = part("oscPinion", c.oscIn);
    R.chrOsc = el("g", {}, R.chrOscG);
    R.chrOscUp = el("g", {}, R.chrOscG);
    el("path", { d: CM.pinionShape(c.lowerZ, c.fourthM).d, class: "pinion", "stroke-width": sw }, R.chrOsc);
    el("path", { d: CM.pinionShape(c.upperZ, c.runnerM).d, class: "pinion", "stroke-width": sw, opacity: 0.75 }, R.chrOscUp);
    el("path", { d: CM.circ(0.08), class: "hole", "stroke-width": sw }, R.chrOscG);

    // minute-counter driving wheel (pushed by the finger on the seconds wheel) and the minute-counting wheel it turns
    const ms = tagPart(el("g", { transform: at(c.minStar) }, zone), "minuteCounter", true);
    R.chrMinDrive = el("g", {}, ms); wheel(R.chrMinDrive, c.minDriveZ, c.minM, c.minM * 30 / 2, "steel");
    el("path", { d: CM.circ(0.1), class: "hole", "stroke-width": sw }, ms);
    R.chrFinger = el("path", { d: `M${f4(c.runnerR - 0.25)} -0.12L${f4(c.minFingerL)} -0.03L${f4(c.minFingerL)} 0.03L${f4(c.runnerR - 0.25)} 0.12Z`, class: "steel", "stroke-width": sw, transform: `rotate(${f4(c.minFingerLocal)})` }, R.chrRunner);
    const mc = part("minuteCounter", c.minCounter); R.chrMinGear = el("g", {}, mc); wheel(R.chrMinGear, 30, c.minM, c.minM * c.minDriveZ / 2);
    R.chrMin = el("g", {}, mc);
    el("path", { d: heartPath(0.3, 0.7), class: "steel", "stroke-width": sw }, R.chrMin);
    // hour counter: the barrel (shown again, dashed, as it would sit up here) drives an intermediate wheel whose pinion
    // turns the counter wheel; the counter's heart sits on the same arbor through a slipping clutch
    const bg = tagPart(el("g", { transform: at(c.barrel) }, zone), "barrel", false);
    const ba0 = 150 * D2R, ba1 = 210 * D2R, bRa = c.barrelR + c.barrelM;
    el("path", { d: `M${f4(bRa * Math.cos(ba0))} ${f4(bRa * Math.sin(ba0))}A${f4(bRa)} ${f4(bRa)} 0 0 1 ${f4(bRa * Math.cos(ba1))} ${f4(bRa * Math.sin(ba1))}`, class: "ghost", "stroke-width": sw }, bg);
    el("line", { x1: G.barrel[0], y1: G.barrel[1] - 5.9, x2: c.barrel[0], y2: c.barrel[1] + 5.9, class: "lead", "stroke-width": "1" }, zone);
    const hi = part("hourDrive", c.hourInter); R.chrHourInter = el("g", {}, hi);
    wheel(R.chrHourInter, c.hourInterZ, c.barrelM, c.barrelR);
    el("path", { d: CM.pinionShape(c.hourInterPZ, c.hourM).d, class: "pinion", "stroke-width": sw }, R.chrHourInter);
    el("path", { d: CM.circ(0.12), class: "hole", "stroke-width": sw }, hi);
    const hc = part("hourCounter", c.hourCounter);
    R.chrHourWheel = el("g", {}, hc); wheel(R.chrHourWheel, c.hourWheelZ, c.hourM, c.hourInterPR);
    el("path", { d: CM.circ(0.55), class: "clutch", "stroke-width": sw }, hc);          // the slipping clutch
    R.chrHour = el("g", {}, hc);
    el("path", { d: heartPath(0.3, 0.7), class: "steel", "stroke-width": sw }, R.chrHour);
    el("path", { d: CM.circ(0.1), class: "hole", "stroke-width": sw }, hc);
    // hour counter lock: holds the counter while the chronograph is stopped; the clutch lets the wheel keep turning
    const lk = tagPart(el("g", { transform: at(c.hourLockPivot) }, zone), "hourLock", true);
    R.hourLock = el("g", {}, lk);
    const lt = [c.hourCounter[0] + 0.62 * Math.cos(35 * D2R) - c.hourLockPivot[0], c.hourCounter[1] + 0.62 * Math.sin(35 * D2R) - c.hourLockPivot[1]];
    el("path", { d: leverPath([0, 0], lt, 0.32, 0.18), class: "steel", "stroke-width": sw }, R.hourLock);
    el("path", { d: CM.circ(0.14), class: "hole", "stroke-width": sw }, lk);

    // switching cam: a stamped, oblong plate in two layers, lower for start/stop and upper for reset (Monochrome, Revolution)
    const cl = part("switchCam", c.cam); R.chrColumn = el("g", {}, cl);
    // its outline passes through where each lever's nub must sit in each state (model), so the cam sets the levers
    const CF = c.followers, polyD = pts => "M" + pts.map(p => f4(p[0]) + " " + f4(p[1])).join("L") + "Z";
    el("path", { d: polyD(CF.outline), class: "steel", "stroke-width": sw }, R.chrColumn);
    el("path", { d: CM.circ(CF.baseR * 0.55), class: "steel", "stroke-width": sw, opacity: 0.7 }, R.chrColumn);   // the upper (reset) layer
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
    R.hammer = hammer("hammer", c.hammerPivot, [c.runner, c.minCounter], [1.0, 0.7]);
    R.hourHammer = hammer("hourHammer", c.hourHammerPivot, [c.hourCounter], [0.7]);
    // brake lever: turns on its pivot; its nub rides the cam, its tip comes down on the seconds wheel's rim
    const bk = tagPart(el("g", { transform: at(c.brakePivot) }, zone), "brake", true);
    R.brake = el("g", {}, bk);
    const rel = (p, o) => [p[0] - o[0], p[1] - o[1]];
    const bTip = rel(CF.brake.tip, c.brakePivot), bNub = rel(CF.brake.nub, c.brakePivot);
    el("path", { d: leverPath([0, 0], bTip, 0.34, 0.16), class: "steel", "stroke-width": sw }, R.brake);
    el("path", { d: leverPath([0, 0], bNub, 0.3, 0.2), class: "steel", "stroke-width": sw }, R.brake);
    el("path", { d: CM.circ(0.12), class: "steel", "stroke-width": sw, transform: at(bNub) }, R.brake);
    el("path", { d: CM.circ(0.15), class: "hole", "stroke-width": sw }, bk);
    // coupling lever: carries the oscillating pinion round the fourth wheel's arbor; its nub rides the cam too
    const cp = tagPart(el("g", { transform: at(c.drive) }, zone), "oscPinion", false);
    R.coupling = el("g", {}, cp);
    const cNub = rel(CF.coupling.nub, c.drive), cPin = rel(c.oscOut, c.drive);
    el("path", { d: leverPath([0, 0], cNub, 0.32, 0.2), class: "steel", "stroke-width": sw, opacity: 0.85 }, R.coupling);
    el("path", { d: leverPath([0, 0], cPin, 0.32, 0.32), class: "steel", "stroke-width": sw, opacity: 0.85 }, R.coupling);
    el("path", { d: CM.circ(0.12), class: "steel", "stroke-width": sw, transform: at(cNub) }, R.coupling);

    // pushers, with the operating levers to the switching cam: start/stop to its lower layer, reset to its upper one
    el("line", { x1: c.pushStart[0] - 0.6, y1: c.pushStart[1], x2: c.column[0] + c.columnR, y2: c.column[1], class: "steel", "stroke-width": "1.3" }, zone);
    el("path", { d: `M${f4(c.pushReset[0] - 0.6)} ${f4(c.pushReset[1])}L${f4(c.column[0] + 2.2)} ${f4(c.pushReset[1])}L${f4(c.column[0] + 0.6)} ${f4(c.column[1] + 0.5)}`, class: "rod", "stroke-width": "1.3" }, zone);
    for (const [key, p, lab] of [["startPusher", c.pushStart, "startBody"], ["resetPusher", c.pushReset, "resetBody"]]) {
      const g = tagPart(el("g", { transform: at(p) }, zone), key, true);
      g.classList.add("crownpart");
      R[lab] = el("g", {}, g);
      el("path", { d: rectPath(-0.6, -0.55, 1.6, 0.55), class: "crownbody", "stroke-width": "1.1" }, R[lab]);
    }
  }

  // ---------- automatic winding, power reserve differential, central seconds, calendar program ----------
  function drawAuto(scene) {
    const a = X.auto, sw = "0.9", at = p => `translate(${f4(p[0])} ${f4(p[1])})`, A = CX.AUTO;
    const zone = needs(el("g", {}, scene), "auto");
    // rotor: a half disc with a heavy rim, pivoting on its own bearing; a small pinion under it
    const ro = tagPart(el("g", { transform: at(a.rotor) }, zone), "rotor", true);
    R.rotor = el("g", {}, ro);
    const rr = a.rotorR, ri = a.rotorR - 1.3;
    el("path", { d: `M${f4(-rr)} 0A${rr} ${rr} 0 0 0 ${f4(rr)} 0L${f4(ri)} 0A${ri} ${ri} 0 0 1 ${f4(-ri)} 0Z`, class: "rotor", "stroke-width": sw }, R.rotor);
    el("path", { d: `M${f4(-ri)} 0A${ri} ${ri} 0 0 0 ${f4(ri)} 0L1.2 0A1.2 1.2 0 0 1 -1.2 0Z`, class: "rotor", "stroke-width": sw, opacity: 0.35 }, R.rotor);
    R.rotorPinion = el("g", {}, ro);
    el("path", { d: CM.pinionShape(A.rotorPinion, 0.1).d, class: "pinion", "stroke-width": sw }, R.rotorPinion);
    el("path", { d: CM.circ(0.15), class: "hole", "stroke-width": sw }, ro);
    // two reverser wheels, each with a one-way clutch; the gripping one is marked
    const rv = tagPart(el("g", {}, zone), "reverserWheels", true);
    R.rev = [];
    for (const pos of [a.revA, a.revB]) {
      const o = el("g", { transform: at(pos) }, rv), wh = el("g", {}, o), pin = el("g", {}, o);
      const ws = CM.wheelShape(A.reverser, 0.1, a.rotorPinionR);
      el("path", { d: ws.ring, class: "wheel", "stroke-width": sw }, wh); el("path", { d: ws.arms, class: "wheel", "stroke-width": sw }, wh);
      el("path", { d: CM.pinionShape(A.reverserPinion, 0.06).d, class: "pinion", "stroke-width": sw }, pin);
      const clutch = el("circle", { r: 0.42, class: "clutch", "stroke-width": "1.1" }, o);
      R.rev.push({ wh, pin, clutch });
    }
    // reduction: first wheel reached by both reverser pinions, second wheel, then on to the ratchet on the barrel
    const rd = tagPart(el("g", {}, zone), "autoReduction", true);
    R.red1 = el("g", {}, el("g", { transform: at(a.red1) }, rd));
    const w1 = CM.wheelShape(A.red1[1], 0.06, a.revPinionR);
    el("path", { d: w1.ring, class: "wheel", "stroke-width": sw }, R.red1); el("path", { d: w1.arms, class: "wheel", "stroke-width": sw }, R.red1);
    el("path", { d: CM.pinionShape(A.red1[0], 0.05).d, class: "pinion", "stroke-width": sw }, R.red1);
    R.red2 = el("g", {}, el("g", { transform: at(a.red2) }, rd));
    const w2 = CM.wheelShape(A.red2[1], 0.05, a.red1PinionR);
    el("path", { d: w2.ring, class: "wheel", "stroke-width": sw }, R.red2); el("path", { d: w2.arms, class: "wheel", "stroke-width": sw }, R.red2);
    el("line", { x1: a.red2[0], y1: a.red2[1], x2: G.barrel[0], y2: G.barrel[1], class: "lead", "stroke-width": "1" }, zone);
  }
  function drawPRDiff(scene) {
    const a = X.auto, sw = "0.9", at = p => `translate(${f4(p[0])} ${f4(p[1])})`;
    const g = tagPart(needs(el("g", { transform: at(a.diff) }, scene), "pr"), "prDiff", true);
    R.sunA = el("g", {}, g); R.sunB = el("g", {}, g); R.carrier = el("g", {}, g);
    const sA = CM.wheelShape(40, 0.085, 0.2), sB = CM.wheelShape(28, 0.082, 0.2);
    el("path", { d: sA.ring, class: "wheel", "stroke-width": sw }, R.sunA); el("path", { d: sA.arms, class: "wheel", "stroke-width": sw }, R.sunA);
    el("path", { d: sB.ring, class: "steel", "stroke-width": sw }, R.sunB);
    el("path", { d: `M0 0L${f4(a.carrier + 0.9)} 0`, class: "steel", "stroke-width": "1.6" }, R.carrier);
    el("path", { d: CM.pinionShape(10, 0.09).d, class: "pinion", "stroke-width": sw, transform: `translate(${f4(a.carrier)} 0)` }, R.carrier);
    el("path", { d: `M${f4(a.carrier + 0.9)} -0.25L${f4(a.carrier + 1.6)} 0L${f4(a.carrier + 0.9)} 0.25Z`, class: "pointer" }, R.carrier);
    el("path", { d: CM.circ(0.15), class: "hole", "stroke-width": sw }, g);
    // scale for the output arm, empty to full
    let sc = ""; for (let i = 0; i <= 10; i++) { const t = (-150 + i * 12) * D2R; sc += `M${f4(3.2 * Math.cos(t))} ${f4(3.2 * Math.sin(t))}L${f4(3.6 * Math.cos(t))} ${f4(3.6 * Math.sin(t))}`; }
    el("path", { d: sc, class: "steel", "stroke-width": "0.8", fill: "none" }, g);
    el("line", { x1: a.diff[0], y1: a.diff[1], x2: G.barrel[0], y2: G.barrel[1], class: "lead", "stroke-width": "1" }, needs(el("g", {}, scene), "pr"));
  }
  function drawCentral(scene) {
    const c = X.chrono, sw = "0.9", at = p => `translate(${f4(p[0])} ${f4(p[1])})`;
    const zone = needs(el("g", {}, scene), "central");
    el("line", { x1: G.center[0], y1: G.center[1], x2: c.runner[0], y2: c.runner[1], class: "lead", "stroke-width": "1" }, zone);
    el("line", { x1: G.fourth[0], y1: G.fourth[1], x2: c.drive[0], y2: c.drive[1], class: "lead", "stroke-width": "1" }, zone);
    // pinion on the fourth wheel's arbor → large intermediate wheel → pinion on the central seconds arbor
    const dr = tagPart(el("g", {}, zone), "secondsDrive", true);
    R.csDrive = el("g", {}, el("g", { transform: at(c.drive) }, dr));
    el("path", { d: CM.pinionShape(c.csPinionZ, c.csM).d, class: "pinion", "stroke-width": sw }, R.csDrive);
    R.csIdler = el("g", {}, el("g", { transform: at(c.csInter) }, dr));
    const wi = CM.wheelShape(c.csInterZ, c.csM, c.csPinionR);
    el("path", { d: wi.ring, class: "wheel", "stroke-width": sw }, R.csIdler); el("path", { d: wi.arms, class: "wheel", "stroke-width": sw }, R.csIdler);
    const sw2 = tagPart(el("g", { transform: at(c.runner) }, zone), "secondsWheel", true);
    R.csWheel = el("g", {}, sw2);
    el("path", { d: CM.pinionShape(c.csPinionZ, c.csM).d, class: "pinion", "stroke-width": sw }, R.csWheel);
    el("path", { d: CM.circ(0.25), class: "steel", "stroke-width": sw }, sw2);
    // friction spring: a thin curved blade pressing on the seconds arbor
    const ts = [c.tensionSpring[0] - c.runner[0], c.tensionSpring[1] - c.runner[1]];
    el("path", { d: `M${f4(ts[0])} ${f4(ts[1])}Q${f4(ts[0] + 2.2)} ${f4(ts[1] + 0.8)} 0.2 -0.28`, class: "spring2", "stroke-width": "1.4" }, sw2);
    el("path", { d: CM.circ(0.16), class: "hole", "stroke-width": sw, transform: at(ts) }, sw2);
  }
  function drawProgram(scene) {
    const pg = X.prog, sw = "0.9", at = p => `translate(${f4(p[0])} ${f4(p[1])})`;
    // a simple complete calendar has a plain 12-tooth month star where the program cam would be
    const msn = tagPart(needs(el("g", { transform: at(pg.cam) }, scene), "monthStar"), "monthStar", true);
    R.monthStar = el("g", {}, msn);
    el("path", { d: CM.circ(pg.camR - 0.4), class: "disc", "stroke-width": sw }, R.monthStar);
    let mst = ""; for (let k = 0; k < 24; k++) { const a = k * Math.PI / 12, r = k % 2 ? 1.5 : 2.5; mst += (k ? "L" : "M") + f4(r * Math.cos(a)) + " " + f4(r * Math.sin(a)); }
    el("path", { d: mst + "Z", class: "steel", "stroke-width": sw }, R.monthStar);
    CX.MONTHS.forEach((m, k) => el("text", { class: "disclbl", "font-size": "0.75", "text-anchor": "middle",
      transform: `rotate(${f4(-90 + k * 30)}) translate(${f4(pg.camR - 1.15)} 0) rotate(90)` }, R.monthStar).textContent = m);
    el("path", { d: CM.circ(0.3), class: "hole", "stroke-width": sw }, msn);
    const cam = tagPart(needs(el("g", { transform: at(pg.cam) }, scene), "program"), "programCam", true);
    R.cam = el("g", {}, cam);
    R.camPath = el("path", { class: "camfill", "stroke-width": sw }, R.cam);
    R.camMarks = el("path", { class: "hatch", "stroke-width": "0.6", fill: "none" }, R.cam);
    el("path", { d: CM.circ(0.3), class: "hole", "stroke-width": sw }, cam);
    const gl = tagPart(needs(el("g", {}, scene), "program"), "grandLever", true);
    R.grandLever = el("path", { class: "steel", "stroke-width": "1.7", fill: "none" }, gl);
    R.grandTip = el("circle", { r: 0.18, class: "steel", "stroke-width": sw }, gl);
    el("path", { d: CM.circ(0.18), class: "hole", "stroke-width": sw, transform: at(pg.leverPivot) }, gl);
    // date star with the snail cam, rack, and retrograde pinion
    const ds = tagPart(needs(el("g", { transform: at(pg.dateStar) }, scene), "dateStar"), "dateStar", true);
    R.dateStar = el("g", {}, ds);
    let st = ""; for (let k = 0; k < 62; k++) { const a = k * Math.PI / 31, r = k % 2 ? pg.dateStarR * 0.82 : pg.dateStarR; st += (k ? "L" : "M") + f4(r * Math.cos(a)) + " " + f4(r * Math.sin(a)); }
    el("path", { d: st + "Z", class: "steel", "stroke-width": sw }, R.dateStar);
    const sn = tagPart(needs(el("g", {}, R.dateStar), "retro"), "snail", true);
    let sp = ""; const pitch = 360 / 31;
    for (let i = 0; i <= 120; i++) { const ph = i * 3, rr = pg.snailR0 + (pg.snailR1 - pg.snailR0) * Math.min(1, ph / (30 * pitch)); sp += (i ? "L" : "M") + f4(rr * Math.cos(ph * D2R)) + " " + f4(rr * Math.sin(ph * D2R)); }
    el("path", { d: sp + "Z", class: "camfill", "stroke-width": sw }, sn);
    el("path", { d: CM.circ(0.2), class: "hole", "stroke-width": sw }, ds);
    const rk = tagPart(needs(el("g", {}, scene), "retro"), "rack", true);
    R.rack = el("path", { class: "steel", "stroke-width": "1.5", fill: "none" }, rk);
    R.rackTeeth = el("path", { class: "steel", "stroke-width": "0.8", fill: "none" }, rk);
    el("path", { d: CM.circ(0.16), class: "hole", "stroke-width": sw, transform: at(pg.rackPivot) }, rk);
    R.retroPinion = el("g", {}, el("g", { transform: at(pg.retroPinion) }, rk));
    el("path", { d: CM.pinionShape(10, 0.1).d, class: "pinion", "stroke-width": sw }, R.retroPinion);
    el("path", { d: "M0 0L0 -1.6", class: "steel", "stroke-width": "1.2" }, R.retroPinion);
  }
  // program cam outline: one sector per month, cut deeper the fewer days the month has
  function updateCamShape() {
    const f = W.features(); if (!f.program) return;
    const sec = CX.camSectors(f.calType), n = sec.length, pg = X.prog;
    let d = "", marks = "";
    for (let i = 0; i < n; i++) {
      const a0 = i * 2 * Math.PI / n, a1 = (i + 1) * 2 * Math.PI / n, r = pg.camR - (31 - sec[i]) * pg.notch;
      d += `${i ? "L" : "M"}${f4(r * Math.cos(a0))} ${f4(r * Math.sin(a0))}A${f4(r)} ${f4(r)} 0 0 1 ${f4(r * Math.cos(a1))} ${f4(r * Math.sin(a1))}`;
      if (f.perpetual && i % 12 === 0) marks += `M${f4(0.6 * Math.cos(a0))} ${f4(0.6 * Math.sin(a0))}L${f4((r - 0.1) * Math.cos(a0))} ${f4((r - 0.1) * Math.sin(a0))}`;
    }
    R.camPath.setAttribute("d", d + "Z");
    R.camMarks.setAttribute("d", marks);
  }
  const heartPathXY = (r0, r1) => { let d = ""; for (let i = 0; i <= 36; i++) { const th = -Math.PI + i * 2 * Math.PI / 36, r = r0 + (r1 - r0) * Math.abs(th) / Math.PI; d += (i ? "L" : "M") + f4(r * Math.cos(th) + 0.28) + " " + f4(r * Math.sin(th)); } return d + "Z"; };

  // Show only the parts this watch has. Hidden parts also leave the keyboard order.
  function featureOn(n, f) {
    if (n === "quick") return f.date || f.day || f.gmt;
    if (n === "dateStar") return f.month || f.retro;
    if (n === "autoOrPr") return f.auto || f.pr;
    return !!f[n];
  }
  function applyVisibility() {
    const f = W.features();
    svg.querySelectorAll("[data-needs]").forEach(n => {
      const on = featureOn(n.getAttribute("data-needs"), f);
      if (on) n.removeAttribute("display"); else n.setAttribute("display", "none");
      const parts = n.matches("[data-part]") ? [n, ...n.querySelectorAll("[data-part]")] : [...n.querySelectorAll("[data-part]")];
      for (const p of parts) if (p.getAttribute("role") === "button") { if (on) p.setAttribute("tabindex", "0"); else p.removeAttribute("tabindex"); }
    });
  }

  // ---------- view (pan / zoom) ----------
  const V = { cx: 10, cy: 3, k: 20 };
  function applyView() {
    const w = svg.clientWidth || 800, h = svg.clientHeight || 500;
    svg.setAttribute("viewBox", `${V.cx - w / 2 / V.k} ${V.cy - h / 2 / V.k} ${w / V.k} ${h / V.k}`);
    if (!labG) return;
    const fs = 11.5 / V.k, fs2 = 10 / V.k;
    for (const g of labG.children) {
      const x = +g.dataset.x, y = +g.dataset.y, top = g.dataset.side === "top";
      const [a, b] = g.querySelectorAll("text");
      const y1 = top ? y - (b ? fs * 1.35 + fs2 * 0.35 : fs * 0.35) : y + fs * 1.05;
      a.setAttribute("x", x); a.setAttribute("y", y1); a.setAttribute("font-size", fs);
      if (b) { b.setAttribute("x", x); b.setAttribute("y", y1 + fs * 1.15); b.setAttribute("font-size", fs2); }
    }
    cullLabels(fs);
  }
  // Hide labels that would overlap a more important one or run off the drawing. Needs layout (skipped where there is none).
  function cullLabels(fs) {
    const vb = svg.viewBox && svg.viewBox.baseVal, kept = [], pad = fs * 0.25;
    // the toolbar and the readout sit over the drawing; a label under them counts as off the edge
    const tools = document.querySelector(".tools"), ro = document.querySelector(".readout");
    const topIn = ((tools ? tools.offsetHeight : 0) + 10) / V.k, botIn = ((ro ? ro.offsetHeight : 0) + 10) / V.k;
    for (const g of labG.children) {
      g.removeAttribute("visibility");
      if (g.getAttribute("display") === "none") continue;
      let box = null;
      for (const t of g.querySelectorAll("text")) {
        let b; try { b = t.getBBox(); } catch (_) { return; }
        if (!b || (!b.width && !b.height)) continue;
        box = box ? { x0: Math.min(box.x0, b.x), y0: Math.min(box.y0, b.y), x1: Math.max(box.x1, b.x + b.width), y1: Math.max(box.y1, b.y + b.height) }
                  : { x0: b.x, y0: b.y, x1: b.x + b.width, y1: b.y + b.height };
      }
      if (!box) continue;
      const off = vb && vb.width && (box.x1 > vb.x + vb.width || box.x0 < vb.x || box.y0 < vb.y + topIn || box.y1 > vb.y + vb.height - botIn);
      const hit = kept.some(k => box.x0 < k.x1 + pad && box.x1 > k.x0 - pad && box.y0 < k.y1 + pad && box.y1 > k.y0 - pad);
      if (off || hit) g.setAttribute("visibility", "hidden"); else kept.push(box);
    }
  }
  // Fit a box (mm) into the drawing, keeping clear of the toolbar on top and the readout below.
  function fitBox(x0, y0, x1, y1, covered) {
    const w = svg.clientWidth || 800, h = svg.clientHeight || 500;
    const tools = document.querySelector(".tools"), top = (tools ? tools.offsetHeight : 40) + 14, side = 12;
    let bottom = Math.max(38, (covered || 0) + 12);
    // keep the drawing clear of the watch face where there's room to (wide stages)
    // the face's placement follows the same breakpoint as the CSS (window width, not drawing width)
    const wide = !window.matchMedia || window.matchMedia("(min-width: 1000px)").matches;
    const fc = document.getElementById("face"), left = fc && wide ? fc.offsetLeft + fc.offsetWidth + 10 : side;
    if (fc && !wide) bottom = Math.max(bottom, h - fc.offsetTop + 8); // narrow: the face sits along the bottom
    const aw = Math.max(80, w - left - side), ah = Math.max(80, h - top - bottom);
    V.k = Math.min(aw / (x1 - x0), ah / (y1 - y0));
    V.cx = (x0 + x1) / 2 - (left - side) / 2 / V.k;
    V.cy = (y0 + y1) / 2 - (top - bottom) / 2 / V.k;
    applyView();
  }
  // the drawing's extent for the parts this watch has, in mm
  function extent() {
    const f = W.features(), top = (f.chrono || f.central) ? X.chrono.runner[1] - 8.2 : G.barrel[1] - 9.2;
    const left = (f.auto || f.pr) ? X.auto.rotor[0] - X.auto.rotorR - 1.5 : X.dial.crownX - 2.4;
    const right = (f.month || f.retro) ? X.prog.cam[0] + X.prog.camR + 9 : Math.max(G.balance[0] + P.balanceR + 1.6, G.mc[0] + X.dial.ringOut + 8.5);
    const bottom = Math.max(G.mc[1] + X.dial.ringOut + 3.6, f.pr ? X.auto.diff[1] + 5 : -1e9);
    return [left, top, right, bottom];
  }
  const fitAll = () => { const e = extent(); fitBox(e[0], e[1], e[2], e[3]); };
  const fitEsc = () => fitBox(G.esc[0] - 2.8, G.esc[1] - 3.6, G.balance[0] + 1.6, G.balance[1] + 2.4);
  const fitMw = () => { const f = W.features(); fitBox(X.dial.crownX - 2.4, G.mc[1] - X.dial.ringOut - 0.6 - (f.month || f.retro ? 4 : 0), (f.month || f.retro) ? X.prog.cam[0] + X.prog.camR + 9 : G.mc[0] + X.dial.ringOut + 8.5, G.mc[1] + X.dial.ringOut + 3.6); };
  const fitAuto = () => fitBox(X.auto.rotor[0] - X.auto.rotorR - 1.5, X.auto.rotor[1] - X.auto.rotorR - 1, X.auto.rotor[0] + X.auto.rotorR + 1.5, X.auto.diff[1] + 5);
  const fitChr = () => fitBox(X.chrono.hourInter[0] - X.chrono.hourInterR - 4, X.chrono.runner[1] - 8.2, X.chrono.pushStart[0] + 9, X.chrono.hourHammerPivot[1] + 3.6);
  function partFocus(key) { // center and radius (mm) to zoom to for a part
    const g = G, s = g.shapes;
    return ({ barrel: [g.barrel, s.barrelW.Ra], center: [g.center, s.centerW.Ra], third: [g.third, s.thirdW.Ra],
      fourth: [g.fourth, s.fourthW.Ra], escape: [g.esc, P.escTipR + 0.6], lever: [g.pallet, 2.6],
      balance: [g.balance, P.balanceR], hairspring: [g.balance, 3.0], motionWorks: [CM.add(g.mc, [-0.9, 0.5]), 3.6],
      cannon: [g.mc, 1.6], minuteWheel: [g.mw, 2.2], hourWheel: [g.mc, s.hourW.Ra],
      crown: [[X.dial.crownX + 2.5, X.dial.stemY], 3.2], windingPinion: [[X.dial.windPinion[0] + 0.6, X.dial.stemY], 2.0],
      slidingPinion: [[X.dial.slideEnd[1] - 0.6, X.dial.stemY], 2.0], crownWheel: [X.dial.crownWheel, 2.2], ratchet: [g.barrel, X.move.ratchetR + 0.4],
      settingLever: [[X.dial.crownX + 4, X.dial.stemY + 1], 3.2], settingWheel: [X.dial.settingWheel, 1.6], quickSet: [X.dial.quickSet, 1.6],
      stopLever: [X.move.stopTipOut, 2.4], driver24: [X.dial.driver24, X.dial.driver24R + 0.8], dateRing: [g.mc, X.dial.ringOut],
      dayStar: [X.dial.dayStar, 2.4], moonDisc: [X.dial.moonDisc, X.dial.moonR + 0.2], gmtInter: [X.dial.gmtInter, 1.4], gmtWheel: [g.mc, X.dial.gmtWheelR + 0.4],
      oscPinion: [X.chrono.oscIn, 1.4], chronoRunner: [X.chrono.runner, X.chrono.runnerR],
      switchCam: [X.chrono.cam, 1.6], startPusher: [X.chrono.pushStart, 1.8], resetPusher: [X.chrono.pushReset, 1.8],
      hammer: [X.chrono.hammerPivot, 3.2], hourHammer: [X.chrono.hourHammerPivot, 2.4], hourLock: [X.chrono.hourLockPivot, 1.8], hourDrive: [X.chrono.hourInter, X.chrono.hourInterR + 0.3], brake: [X.chrono.brakePivot, 2.4], minuteCounter: [X.chrono.minCounter, 2.0], hourCounter: [X.chrono.hourCounter, 2.0],
      rotor: [X.auto.rotor, X.auto.rotorR], reverserWheels: [CM.add(X.auto.rotor, [0, 1.6]), 4.6],
      autoReduction: [CM.add(X.auto.red1, [0.6, 0.6]), 3.0], prDiff: [X.auto.diff, 3.8], secondsDrive: [X.chrono.oscIn, 4.2], secondsWheel: [X.chrono.runner, X.chrono.wheelR],
      programCam: [X.prog.cam, X.prog.camR], grandLever: [CM.add(X.prog.leverPivot, [4.5, -1.3]), 5],
      dateStar: [X.prog.dateStar, X.prog.dateStarR + 0.3], snail: [X.prog.dateStar, 2.4], rack: [CM.add(X.prog.rackPivot, [-3, 1]), 4.5] })[key];
  }
  function zoomToPart(key) {
    const f = partFocus(key); if (!f) return;
    const r = Math.max(2.4, f[1] * 1.3);
    // on a phone the card sits over the bottom of the drawing: aim for the part of it still showing
    let covered = 0;
    if (!card.hidden) {
      const sr = svg.getBoundingClientRect(), cr = card.getBoundingClientRect();
      if (cr.left < sr.right && cr.right > sr.left && cr.top < sr.bottom) covered = Math.min(sr.height * 0.6, sr.bottom - Math.max(cr.top, sr.top));
    }
    fitBox(f[0][0] - r, f[0][1] - r, f[0][0] + r, f[0][1] + r, covered);
  }
  $("vFit").onclick = fitAll; $("vEsc").onclick = fitEsc; $("vMw").onclick = fitMw; $("vChr").onclick = fitChr; $("vAuto").onclick = fitAuto;

  // ---------- pointer: pan, pinch, tap to explain, hover to preview ----------
  const card = $("card");
  const ptrs = new Map(); let pinch = null, press = null;
  const tip = $("tip");
  function zoomAt(cx, cy, f) {
    const r = svg.getBoundingClientRect(), px = cx - r.left - r.width / 2, py = cy - r.top - r.height / 2;
    const wx = V.cx + px / V.k, wy = V.cy + py / V.k;
    V.k = Math.max(4, Math.min(2000, V.k * f)); V.cx = wx - px / V.k; V.cy = wy - py / V.k; applyView();
  }
  const partOf = t => (t && t.closest) ? t.closest("[data-part]") : null;
  const CROWN_STEP_PX = 14; // screen pixels of drag per crown step
  // Parts you operate. Tapping them works them without opening the explainer; the side panel's (i) buttons open it.
  const ACTION_HINT = { crown: "Tap to pull out a click · drag up or down to turn", startPusher: "Tap to start or stop", resetPusher: "Tap to reset" };
  let tipQuiet = null; // a part you've just used doesn't pop its tooltip until the pointer leaves it
  // "?" mode, like a What's This? button: the cursor becomes a question mark and a tap opens the full explanation.
  let helpOn = false;
  const helpB = $("helpMode");
  let navBase = null;
  function setHelp(on) {
    if (navBase === null) navBase = $("navHint") ? $("navHint").textContent : "";
    helpOn = on; svg.classList.toggle("helpmode", on); helpB.setAttribute("aria-pressed", on);
    flashHint(on ? "Tap a part to explain it · ? or Esc to stop" : navBase);
  }
  helpB.onclick = () => setHelp(!helpOn);
  document.addEventListener("keydown", e => {
    if (e.key === "?" && !/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) { e.preventDefault(); setHelp(!helpOn); }
    else if (e.key === "Escape" && helpOn && $("card").hidden) setHelp(false);
  });
  svg.addEventListener("pointerdown", e => {
    try { svg.setPointerCapture(e.pointerId); } catch (_) {}
    // dragging is for panning and turning the crown, never for selecting label text
    if (e.pointerType === "mouse" && e.button === 0) {
      e.preventDefault(); // this also stops the browser focusing what was clicked, so do that by hand (keys still work)
      svg.classList.add("ptr"); // focused by the mouse: no keyboard focus ring until a key is pressed
      const fp = partOf(e.target); if (fp && fp.getAttribute("tabindex") === "0") try { fp.focus({ preventScroll: true }); } catch (_) {}
    }
    try { const sel = window.getSelection && window.getSelection(); if (sel && sel.rangeCount) sel.removeAllRanges(); } catch (_) {}
    hideTip();
    const pp = partOf(e.target); if (pp && ACTION_HINT[pp.dataset.part]) tipQuiet = pp.dataset.part;
    ptrs.set(e.pointerId, [e.clientX, e.clientY]); svg.classList.add("dragging");
    press = ptrs.size === 1 ? { id: e.pointerId, x: e.clientX, y: e.clientY, part: partOf(e.target), moved: 0, roll: 0 } : null;
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), k: V.k }; }
  });
  svg.addEventListener("pointermove", e => {
    if (!ptrs.has(e.pointerId)) { if (e.pointerType === "mouse") hoverTip(e); return; }
    const prev = ptrs.get(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (press && press.id === e.pointerId) press.moved = Math.max(press.moved, Math.hypot(e.clientX - press.x, e.clientY - press.y));
    // dragging on the crown rolls it like a thumb would: up turns it forward, down turns it back
    if (ptrs.size === 1 && press && press.part && press.part.dataset.part === "crown") {
      press.roll += prev[1] - e.clientY;
      while (Math.abs(press.roll) >= CROWN_STEP_PX) { const dir = Math.sign(press.roll); press.roll -= dir * CROWN_STEP_PX; doTurn(dir); }
      return;
    }
    if (ptrs.size === 1) { V.cx -= (e.clientX - prev[0]) / V.k; V.cy -= (e.clientY - prev[1]) / V.k; applyView(); }
    else if (ptrs.size === 2 && pinch) {
      const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, pinch.k * d / pinch.d / V.k);
    }
  });
  const up = e => {
    const wasTap = press && press.id === e.pointerId && press.moved < 6 && e.type === "pointerup";
    const part = press && press.part;
    ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (!ptrs.size) svg.classList.remove("dragging");
    if (press && press.id === e.pointerId) press = null;
    if (!wasTap) return;
    // "?" mode: a tap explains the part. Otherwise a tap works the parts you operate and leaves the rest alone.
    if (helpOn) { if (part) openPart(part.dataset.part, { opener: part }); else if (!$("card").hidden) closeCard(false); return; }
    if (part && ACTION_HINT[part.dataset.part] && !(e.target.closest && e.target.closest(".labels"))) actOn(part.dataset.part);
    else if (!part && !$("card").hidden) closeCard(false);
  };
  svg.addEventListener("pointerup", up); svg.addEventListener("pointercancel", up);
  svg.addEventListener("pointerleave", hideTip);
  // Wheel: Ctrl/⌘ + wheel (and trackpad pinch, which arrives as ctrl + wheel) zooms. A plain wheel pans when the
  // drawing has its own pane (desktop); when the page itself scrolls (narrow screens) it's left alone so the page scrolls.
  const twoPane = () => !window.matchMedia || window.matchMedia("(min-width: 1000px)").matches;
  const navHint = $("navHint"); let hintTimer = null;
  function flashHint(text) {
    if (!navHint) return;
    if (text) navHint.textContent = text;
    navHint.classList.add("flash"); clearTimeout(hintTimer);
    hintTimer = setTimeout(() => navHint.classList.remove("flash"), 1600);
  }
  let wheelRoll = 0;
  svg.addEventListener("wheel", e => {
    // the wheel over the crown turns it
    const onCrown = partOf(e.target);
    if (onCrown && onCrown.dataset.part === "crown" && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      wheelRoll -= e.deltaY * (e.deltaMode === 1 ? 16 : 1);
      while (Math.abs(wheelRoll) >= CROWN_STEP_PX * 2) { const dir = Math.sign(wheelRoll); wheelRoll -= dir * CROWN_STEP_PX * 2; doTurn(dir); }
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : 1;
      zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * unit * (e.ctrlKey && !e.metaKey && Math.abs(e.deltaY) < 50 ? 0.01 : 0.0015)));
      return;
    }
    if (!twoPane()) return; // let the page scroll
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? svg.clientHeight : 1;
    const dx = (e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX) * unit, dy = (e.shiftKey && !e.deltaX ? 0 : e.deltaY) * unit;
    V.cx += dx / V.k; V.cy += dy / V.k; applyView();
  }, { passive: false });
  function zoomCenter(f) { const r = svg.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, f); }
  $("zoomIn").onclick = () => zoomCenter(1.4);
  $("zoomOut").onclick = () => zoomCenter(1 / 1.4);
  svg.addEventListener("keydown", e => {
    if (e.key === "+" || e.key === "=") { e.preventDefault(); zoomCenter(1.25); }
    else if (e.key === "-" || e.key === "_") { e.preventDefault(); zoomCenter(0.8); }
  });
  if (navHint && window.matchMedia && window.matchMedia("(pointer: coarse)").matches) navHint.textContent = "Drag to pan · pinch to zoom";
  svg.addEventListener("keydown", () => svg.classList.remove("ptr"), true);
  svg.addEventListener("keydown", e => {
    const p = partOf(e.target);
    if (p && p.dataset.part === "crown" && (e.key === "ArrowUp" || e.key === "ArrowDown")) { e.preventDefault(); doTurn(e.key === "ArrowUp" ? 1 : -1); return; }
    if (e.key !== "Enter" && e.key !== " ") return;
    const part = partOf(e.target); if (!part) return;
    e.preventDefault();
    if (ACTION_HINT[part.dataset.part] && !helpOn) actOn(part.dataset.part); else openPart(part.dataset.part, { opener: part, keyboard: true });
  });
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(() => applyView()).observe(svg);

  let tipKey = null;
  function hoverTip(e) {
    const part = partOf(e.target);
    if (!part || part.dataset.part !== tipQuiet) tipQuiet = null;
    if (!part || tipQuiet) return hideTip();
    const key = part.dataset.part, entry = GL.PARTS[key];
    if (tipKey !== key + helpOn) {
      tip.innerHTML = `<b>${esc(entry.name)}</b>${esc(GL.plain(entry.short))}<br><span>${helpOn ? "Click for details and sources"
        : esc((ACTION_HINT[key] ? ACTION_HINT[key] + " · " : "") + "? for details")}</span>`;
      tipKey = key + helpOn;
    }
    tip.hidden = false;
    const pad = 14, w = tip.offsetWidth || 240, h = tip.offsetHeight || 80;
    let x = e.clientX + pad, y = e.clientY + pad;
    if (x + w > window.innerWidth - 8) x = e.clientX - w - pad;
    if (y + h > window.innerHeight - 8) y = e.clientY - h - pad;
    tip.style.left = Math.max(8, x) + "px"; tip.style.top = Math.max(8, y) + "px";
  }
  function hideTip() { tip.hidden = true; tipKey = null; }

  // ---------- info card ----------
  const C = { mode: null, key: null, opener: null, keyboard: false, tour: false, back: null, lastStats: 0 };
  function ctx() { return { P, G, X, CX, w: W, r: W.read(), st: st || CM.state(P, G, 0), per: CM.periods(P), ref }; }
  const presentRel = entry => entry.rel.filter(([, k]) => GL.present(k, W.features()));
  function statsHtml(entry) {
    return entry.stats(ctx()).map(([label, value, term]) =>
      `<dt>${term ? `<button class="stat-term" data-term="${term}">${esc(label)}</button>` : esc(label)}</dt><dd>${esc(value)}</dd>`).join("");
  }
  function highlight(key) {
    svg.querySelectorAll(".sel,.rel").forEach(n => n.classList.remove("sel", "rel"));
    if (!key) { svg.classList.remove("has-sel"); return; }
    const entry = GL.PARTS[key], related = presentRel(entry).map(r => r[1]);
    const selKeys = key === "motionWorks" ? [key, ...related] : [key];
    for (const k of selKeys) svg.querySelectorAll(`[data-part="${k}"]`).forEach(n => n.classList.add("sel"));
    if (key !== "motionWorks") for (const k of related) svg.querySelectorAll(`[data-part="${k}"]`).forEach(n => n.classList.add("rel"));
    svg.classList.add("has-sel");
  }
  function showCard(opts) {
    const wasHidden = card.hidden;
    card.hidden = false; hideTip();
    // remember what opened the card so closing can return focus there; links inside the card don't count
    if (wasHidden || (opts.opener && !card.contains(opts.opener))) { C.opener = opts.opener || null; C.keyboard = !!opts.keyboard; }
    $("cardTitle").focus({ preventScroll: true });
  }
  function setBack(fromKey, fromMode) {
    const kind = card.querySelector(".card-back");
    if (kind) kind.remove();
    C.back = fromKey ? { key: fromKey, mode: fromMode } : null;
    if (!C.back) return;
    const name = (fromMode === "part" ? GL.PARTS : GL.TERMS)[fromKey].name;
    const b = document.createElement("button");
    b.className = "linkish card-back"; b.textContent = `← ${name}`; b.setAttribute("aria-label", `Back to ${name}`);
    b.onclick = () => { const bk = C.back; bk.mode === "part" ? openPart(bk.key, {}) : openTerm(bk.key, {}); };
    $("cardKind").after(b);
  }
  function fillMore(paras) {
    const more = $("cardMore");
    more.hidden = !paras || !paras.length;
    $("cardMoreBody").innerHTML = (paras || []).map(p => `<p>${marked(p)}</p>`).join("");
  }
  function openPart(key, opts) {
    const entry = GL.PARTS[key]; if (!entry) return;
    opts = opts || {};
    const prev = !card.hidden && C.key !== key && opts.from ? { key: C.key, mode: C.mode } : null;
    C.mode = "part"; C.key = key; C.tour = !!opts.tour || (C.tour && !!opts.step);
    $("cardKind").textContent = entry.kind;
    $("cardTitle").textContent = entry.name;
    $("cardShort").innerHTML = marked(entry.short);
    const stats = $("cardStats"); stats.hidden = false; stats.innerHTML = statsHtml(entry); C.lastStats = performance.now();
    const rel = $("cardRel"); rel.hidden = false;
    rel.innerHTML = presentRel(entry).map(([verb, k]) => `<button class="chip" data-part-link="${k}"><em>${esc(verb)}</em>${esc(GL.PARTS[k].name)}</button>`).join("");
    fillMore(entry.more);
    $("cardMore").open = false;
    const tour = GL.tourFor(W.features()), i = tour.indexOf(key);
    $("cardFoot").hidden = false;
    $("cardPrev").disabled = i <= 0; $("cardNext").disabled = i < 0 || i >= tour.length - 1;
    setBack(prev && prev.key, prev && prev.mode);
    highlight(key);
    showCard(opts);
    if (C.tour || opts.zoom) zoomToPart(key);
  }
  function openTerm(key, opts) {
    const entry = GL.TERMS[key]; if (!entry) return;
    opts = opts || {};
    const prev = !card.hidden && opts.from ? { key: C.key, mode: C.mode } : null;
    C.mode = "term"; C.key = key;
    $("cardKind").textContent = "Term";
    $("cardTitle").textContent = entry.name;
    $("cardShort").innerHTML = marked(entry.short);
    $("cardStats").hidden = true; $("cardStats").innerHTML = "";
    $("cardRel").hidden = true; $("cardRel").innerHTML = "";
    fillMore(entry.more);
    $("cardMore").open = !!entry.more;
    $("cardFoot").hidden = true;
    setBack(prev && prev.key, prev && prev.mode);
    if (!prev) highlight(null);
    showCard(opts);
  }
  function closeCard(restoreFocus) {
    card.hidden = true; highlight(null);
    const op = C.opener; C.mode = C.key = null; C.tour = false; C.back = null;
    if (restoreFocus !== false && op && op.isConnected && (C.keyboard || op.tagName === "BUTTON")) op.focus({ preventScroll: true });
  }
  function revealStage() {
    const stage = svg.parentElement, reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!stage || !stage.scrollIntoView) return;
    const r = stage.getBoundingClientRect();
    if (r.top >= 0 && r.bottom <= window.innerHeight) return; // already in view (always, on desktop; sticky on phones)
    stage.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }
  function stepTour(d) {
    const tour = GL.tourFor(W.features()), i = tour.indexOf(C.key) + d;
    if (i >= 0 && i < tour.length) openPart(tour[i], { step: true });
  }
  $("cardClose").onclick = () => closeCard();
  $("cardNext").onclick = () => stepTour(1);
  $("cardPrev").onclick = () => stepTour(-1);
  $("cardShow").onclick = () => { if (C.mode === "part") { zoomToPart(C.key); revealStage(); } };
  $("tour").onclick = e => { openPart(GL.tourFor(W.features())[0], { opener: e.currentTarget, tour: true }); revealStage(); };
  document.addEventListener("click", e => {
    const info = e.target.closest && e.target.closest("[data-term]");
    if (info) { e.preventDefault(); openTerm(info.dataset.term, { opener: info, from: card.contains(info) }); return; }
    const link = e.target.closest && e.target.closest("[data-part-link]");
    if (link) openPart(link.dataset.partLink, { from: true, opener: link });
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !card.hidden) { e.preventDefault(); closeCard(); } });

  // ---------- dial: laid out by CX.dialLayout for the watch's features, hands driven by the watch ----------
  const dial = $("dial"); let H = {};
  function dtick(cx, cy, r0, r1, a, w, cls) { const s = Math.sin(a * D2R), c = Math.cos(a * D2R); return el("line", { x1: f4(cx + r0 * s), y1: f4(cy - r0 * c), x2: f4(cx + r1 * s), y2: f4(cy - r1 * c), class: cls || "dtick", "stroke-width": w }, dial); }
  function subdial(cx, cy, r, n, major) {
    el("circle", { cx, cy, r, class: "dsub" }, dial);
    for (let i = 0; i < n; i++) dtick(cx, cy, r - (i % major ? 1.2 : 2.4), r - 0.4, i * 360 / n, i % major ? 0.4 : 0.8);
  }
  const hand = (len, tail, w, cls) => el("path", { d: `M${-w / 2} ${tail}L${-w / 4} ${-len}L${w / 4} ${-len}L${w / 2} ${tail}Z`, class: cls }, dial);
  function moonPath(cx, cy, r, p) {
    const k = Math.cos(2 * Math.PI * p), waxing = p < 0.5, rx = Math.max(0.01, r * Math.abs(k));
    const outer = waxing ? 1 : 0, term = waxing ? (k > 0 ? 0 : 1) : (k > 0 ? 1 : 0);
    return `M${cx} ${cy - r}A${r} ${r} 0 0 ${outer} ${cx} ${cy + r}A${f4(rx)} ${r} 0 0 ${term} ${cx} ${cy - r}Z`;
  }
  // a fan of ticks around (x, y) between angles a0 and a1 (degrees, 0 = 3 o'clock, y down), with labels at chosen steps
  function fan(F, n, labels) {
    const pt = (r, a) => [F.x + r * Math.cos(a * D2R), F.y + r * Math.sin(a * D2R)];
    const [p0, p1] = [pt(F.r, F.a0), pt(F.r, F.a1)];
    el("path", { d: `M${f4(p0[0])} ${f4(p0[1])}A${F.r} ${F.r} 0 0 1 ${f4(p1[0])} ${f4(p1[1])}`, class: "dfan" }, dial);
    for (let i = 0; i < n; i++) {
      const a = F.a0 + (F.a1 - F.a0) * i / (n - 1), q0 = pt(F.r, a), q1 = pt(F.r - (labels[i] ? 1.8 : 1), a);
      el("line", { x1: f4(q0[0]), y1: f4(q0[1]), x2: f4(q1[0]), y2: f4(q1[1]), class: "dtick", "stroke-width": labels[i] ? 0.6 : 0.35 }, dial);
      if (labels[i]) { const q = pt(F.r - 4, a); const t = el("text", { x: f4(q[0]), y: f4(q[1]), class: "dfannum", "text-anchor": "middle", "dominant-baseline": "central" }, dial); t.textContent = labels[i]; }
    }
  }
  const fanHand = (F, cls) => el("path", { d: `M-0.5 0L${f4(F.r - 1.2)} -0.35L${f4(F.r - 0.2)} 0L${f4(F.r - 1.2)} 0.35L-0.5 0.6Z`, class: cls }, dial);
  function buildDial() {
    const f = W.features(), L = CX.dialLayout(f); dial.innerHTML = ""; H = { f, L };
    el("circle", { r: 48, class: "dface" }, dial);
    for (let i = 0; i < 60; i++) dtick(0, 0, i % 5 ? 45 : 41, 47, i * 6, i % 5 ? 0.5 : 2.2);
    if (L.gmt) for (let h = 0; h < 24; h++) {
      dtick(0, 0, 37.5, h % 2 ? 38.7 : 39.6, h * 15, 0.5, "dgmt");
      if (h % 4 === 0) { const a = h * 15 * D2R; const t = el("text", { x: f4(34.2 * Math.sin(a)), y: f4(-34.2 * Math.cos(a)), class: "dnum dgmtn", "text-anchor": "middle", "dominant-baseline": "central" }, dial); t.textContent = String(h || 24); }
    }
    if (L.smallSeconds) subdial(L.smallSeconds.x, L.smallSeconds.y, L.smallSeconds.r, 60, 5);
    for (const sd of L.subdials) subdial(sd.x, sd.y, sd.r, sd.n, sd.major);
    H.win = {};
    for (const w of L.windows) {
      el("rect", { x: w.x0, y: w.y0, width: w.x1 - w.x0, height: w.y1 - w.y0, rx: 1, class: "dwin" }, dial);
      H.win[w.content] = el("text", { x: (w.x0 + w.x1) / 2, y: (w.y0 + w.y1) / 2 + 0.4, class: "dwintext", "text-anchor": "middle", "dominant-baseline": "central",
        "font-size": w.content === "monthyear" || w.content === "daydate" ? 5.6 : 6.6, "data-fit": (w.x1 - w.x0 - 2.2).toFixed(2) }, dial);
    }
    if (L.leap) {
      H.leap = [];
      for (let k = 0; k < 4; k++) H.leap.push(el("circle", { cx: L.leap.x - 4.5 + k * 3, cy: L.leap.y, r: 0.9, class: "dleap" + (k === 0 ? " leap" : "") }, dial));
      const t = el("text", { x: L.leap.x + 6.6, y: L.leap.y + 0.2, class: "dleapt", "dominant-baseline": "central" }, dial); t.textContent = "LEAP";
    }
    if (L.retro) {
      fan(L.retro, 31, Array.from({ length: 31 }, (_, i) => [0, 9, 19, 30].includes(i) ? String(i + 1) : ""));
      H.retro = fanHand(L.retro, "dhr");
    }
    if (L.pr) {
      fan(L.pr, 11, Array.from({ length: 11 }, (_, i) => i === 0 ? "0" : i === 10 ? Math.round(CM.powerReserveHours(P)) + "h" : ""));
      H.pr = fanHand(L.pr, "dhg");
    }
    if (L.moon) {
      const m = L.moon;
      el("circle", { cx: m.x, cy: m.y, r: m.r + 1.2, class: "dmoonsky" }, dial);
      el("circle", { cx: m.x, cy: m.y, r: m.r, class: "dmoondark" }, dial);
      H.moon = el("path", { class: "dmoonlit" }, dial);
    }
    if (L.smallSeconds) H.ss = hand(8.5, 2.5, 0.9, "dhs");
    if (f.chrono) { H.cm = hand(8.5, 2, 1.1, "dhc"); H.ch = hand(8.5, 2, 1.1, "dhc"); }
    if (L.gmt) H.gmt = el("path", { d: "M-0.5 4L-0.5 -33L-2.6 -33L0 -38.5L2.6 -33L0.5 -33L0.5 4Z", class: "dhg" }, dial);
    H.h = hand(25, 5, 3.4, "dhand"); H.m = hand(39, 6, 2.4, "dhand");
    if (f.chrono) H.cs = el("path", { d: "M-0.35 9L-0.35 -44L0.35 -44L0.35 9Z", class: "dhc" }, dial);
    else if (f.central) H.cs = el("path", { d: "M-0.35 9L-0.35 -44L0.35 -44L0.35 9Z", class: "dhs" }, dial);
    el("circle", { r: 2.4, class: "dcap" }, dial);
    if (L.smallSeconds) el("circle", { cx: L.smallSeconds.x, cy: L.smallSeconds.y, r: 1, class: "dcap" }, dial);
    for (const sd of L.subdials) el("circle", { cx: sd.x, cy: sd.y, r: 1, class: "dcap" }, dial);
    if (L.retro) el("circle", { cx: L.retro.x, cy: L.retro.y, r: 1.1, class: "dcap" }, dial);
    if (L.pr) el("circle", { cx: L.pr.x, cy: L.pr.y, r: 1.1, class: "dcap" }, dial);
    const parts = ["hours", "minutes", f.central || f.chrono ? (f.chrono ? "small seconds" : "central seconds") : "small seconds",
      f.date && (f.retro ? "retrograde date" : "date"), f.day && "day", f.month && "month", f.perpetual && "year and leap-year cycle", f.moon && "moon phase",
      f.gmt && "24-hour GMT hand", f.pr && "power reserve", f.chrono && (f.flyback ? "flyback chronograph" : "chronograph") + " with 30-minute and 12-hour counters"].filter(Boolean);
    dial.setAttribute("aria-label", "Dial: " + parts.join(", "));
  }
  // keep window text inside its window: squeeze it if it would overflow (measured once per new string)
  function fitText(t) {
    if (!t || t.textContent === t.dataset.fitted) return;
    t.dataset.fitted = t.textContent;
    t.removeAttribute("textLength"); t.removeAttribute("lengthAdjust");
    let w = 0; try { w = t.getComputedTextLength(); } catch (_) { return; }
    if (w > +t.dataset.fit) { t.setAttribute("textLength", t.dataset.fit); t.setAttribute("lengthAdjust", "spacingAndGlyphs"); }
  }
  function renderDial(r) {
    const f = H.f, L = H.L, rot = (n, a) => n && n.setAttribute("transform", `rotate(${f4(a % 360)})`);
    rot(H.h, r.hourHand); rot(H.m, r.minuteHand);
    if (H.ss) H.ss.setAttribute("transform", `translate(${L.smallSeconds.x} ${L.smallSeconds.y}) rotate(${f4(r.secondsHand)})`);
    if (H.gmt) rot(H.gmt, r.gmtHand);
    if (f.chrono) {
      rot(H.cs, r.chronoSeconds);
      H.cm.setAttribute("transform", `translate(0 -21) rotate(${f4(r.chronoMinutes)})`);
      H.ch.setAttribute("transform", `translate(0 21) rotate(${f4(r.chronoHours)})`);
    } else if (H.cs) rot(H.cs, r.secondsHand);
    const W2 = H.win, MON = CX.MONTHS[r.month];
    if (W2.daydate) W2.daydate.textContent = `${GL.DAYS[r.day]} ${r.dateShown}`;
    if (W2.date) W2.date.textContent = String(r.dateShown);
    if (W2.day) W2.day.textContent = GL.DAYS[r.day];
    if (W2.month) W2.month.textContent = MON;
    if (W2.monthyear) W2.monthyear.textContent = `${MON} ${r.year}`;
    for (const t of Object.values(W2)) fitText(t);
    if (H.leap) H.leap.forEach((c, k) => c.classList.toggle("on", k === r.leapIndex));
    if (H.retro) H.retro.setAttribute("transform", `translate(${L.retro.x} ${L.retro.y}) rotate(${f4(L.retro.a0 + (L.retro.a1 - L.retro.a0) * r.retroFraction)})`);
    if (H.pr) H.pr.setAttribute("transform", `translate(${L.pr.x} ${L.pr.y}) rotate(${f4(L.pr.a0 + (L.pr.a1 - L.pr.a0) * r.springFraction)})`);
    if (H.moon) H.moon.setAttribute("d", moonPath(L.moon.x, L.moon.y, L.moon.r, r.moonPhase));
  }

  // ---------- train table ----------
  const rows = [
    { grp: "Going train" },
    { name: "Barrel", part: "barrel", w: "barrel", mod: () => P.modules.bc, per: p => p.barrel },
    { name: "Center", part: "center", p: "centerP", w: "centerW", mod: () => P.modules.bc + " / " + P.modules.ct, per: p => p.center, target: 3600 },
    { name: "Third", part: "third", p: "thirdP", w: "thirdW", mod: () => P.modules.ct + " / " + P.modules.tf, per: p => p.third },
    { name: "Fourth", part: "fourth", p: "fourthP", w: "fourthW", mod: () => P.modules.tf + " / " + P.modules.fe, per: p => p.fourth, target: 60 },
    { name: "Escape", part: "escape", p: "escP", fixed: "15 club", mod: () => P.modules.fe, per: p => p.esc },
    { grp: "Motion works", part: "motionWorks" },
    { name: "Cannon", part: "cannon", p: "cannon", mod: () => P.modules.cm, per: p => p.center, target: 3600 },
    { name: "Minute wheel", part: "minuteWheel", p: "minuteP", w: "minuteW", mod: () => P.modules.cm + " / " + G.mpMod.toFixed(3), per: p => p.minute },
    { name: "Hour wheel", part: "hourWheel", w: "hourW", mod: () => G.mpMod.toFixed(3), per: p => p.hour, target: 43200 }
  ];
  const isPinion = k => /P$/.test(k) || k === "cannon";
  const nameBtn = (label, part) => `<button class="linkish" data-part-link="${part}" aria-label="What is the ${esc(GL.PARTS[part].name)}?">${esc(label)}</button>`;
  function renderTable() {
    const p = CM.periods(P), tb = $("train"); tb.innerHTML = "";
    for (const r of rows) {
      const tr = document.createElement("tr");
      if (r.grp) { tr.className = "grp"; tr.innerHTML = `<td colspan="7">${r.part ? nameBtn(r.grp, r.part) : esc(r.grp)}</td>`; tb.appendChild(tr); continue; }
      const inp = k => k ? `<input class="tc" id="t-${k}" type="number" min="5" max="240" step="1" value="${P.teeth[k]}" aria-label="${r.name} ${isPinion(k) ? "pinion" : "wheel"} teeth">` : "";
      const per = r.per(p);
      let pill = '<span class="pill na">—</span>';
      if (r.target) { const ok = Math.abs(per / r.target - 1) < 1e-9; pill = `<span class="pill ${ok ? "ok" : "off"}">${ok ? "exact" : ((per / r.target - 1) * 100).toFixed(2) + "%"}</span>`; }
      tr.innerHTML = `<td>${nameBtn(r.name, r.part)}</td><td>${inp(r.p)}</td><td>${r.fixed ? `<span class="small">${r.fixed}</span>` : inp(r.w)}</td><td class="mono">${r.mod()}</td><td class="mono">${GL.fmtDur(per)}</td><td class="mono">${r.target ? GL.fmtDur(r.target) : ""}</td><td>${pill}</td>`;
      tb.appendChild(tr);
    }
    tb.querySelectorAll("input.tc").forEach(i => i.addEventListener("change", () => {
      const k = i.id.slice(2), v = Math.round(+i.value);
      if (!(v >= 5 && v <= 240)) { i.value = P.teeth[k]; return; }
      P.teeth[k] = v; rebuild();
    }));
    const rate = CM.rateError(P);
    const info = (k, q) => `<button class="info" data-term="${k}" aria-label="${q}">i</button>`;
    $("facts").innerHTML = `<dt>Center → escape ratio${info("ratio", "What is a ratio?")}</dt><dd>${(p.center / p.esc).toFixed(2)} : 1</dd>
      <dt>Beats per center turn${info("beat", "What is a beat?")}</dt><dd>${Math.round(p.center * P.bph / 3600).toLocaleString("en-US")}</dd>
      <dt>Power reserve${info("powerReserve", "What is power reserve?")}</dt><dd>${CM.powerReserveHours(P).toFixed(1)} h on ${P.springTurns} mainspring turns</dd>
      <dt>Lift / lever swing${info("lift", "What is the lift angle?")}</dt><dd>${P.lift}° / ±${(G.L / D2R).toFixed(1)}°</dd>
      <dt>Motion works spacing${info("module", "What is a module?")}</dt><dd>${G.cd.cm.toFixed(3)} mm = ${G.cd.mh.toFixed(3)} mm</dd>
      <dt>Rate from gearing${info("rate", "What is rate?")}</dt><dd>${Math.abs(rate) < 1e-6 ? "0.0" : (rate > 0 ? "+" : "") + rate.toFixed(1)} s/day</dd>`;
  }

  // ---------- time and loop ----------
  let running = true, speed = 1, last = performance.now();
  // speed: a stepper on the watch face, so it's always in reach while you watch
  const SPEEDS = [["1/50×", 0.02], ["1/5×", 0.2], ["1×", 1], ["60×", 60], ["600×", 600], ["3600×", 3600]];
  let speedI = 2;
  function setSpeed(i) {
    speedI = Math.max(0, Math.min(SPEEDS.length - 1, i)); speed = SPEEDS[speedI][1];
    $("speedLbl").textContent = SPEEDS[speedI][0];
    $("slower").disabled = speedI === 0; $("faster").disabled = speedI === SPEEDS.length - 1;
    $("slower").setAttribute("aria-label", speedI > 0 ? `Slower: ${SPEEDS[speedI - 1][0]}` : "Slower");
    $("faster").setAttribute("aria-label", speedI < SPEEDS.length - 1 ? `Faster: ${SPEEDS[speedI + 1][0]}` : "Faster");
  }
  $("slower").onclick = () => setSpeed(speedI - 1); $("faster").onclick = () => setSpeed(speedI + 1);
  setSpeed(speedI);
  const runB = $("run");
  runB.onclick = () => {
    running = !running; runB.textContent = running ? "❚❚" : "▶";
    runB.setAttribute("aria-label", running ? "Pause" : "Run"); runB.title = running ? "Pause" : "Run"; runB.setAttribute("aria-pressed", running);
  };
  // the face can fold down to just the time; remembered per browser
  const face = $("face"), faceMin = $("faceMin");
  function setFaceMin(min) {
    face.classList.toggle("min", min); faceMin.setAttribute("aria-expanded", !min);
    faceMin.textContent = min ? "▸" : "▾"; faceMin.setAttribute("aria-label", min ? "Show the dial" : "Hide the dial"); faceMin.title = faceMin.getAttribute("aria-label");
    try { localStorage.setItem("faceMin", min ? "1" : "0"); } catch (_) {}
  }
  faceMin.onclick = () => setFaceMin(!face.classList.contains("min"));
  try { if (localStorage.getItem("faceMin") === "1") setFaceMin(true); } catch (_) {}
  function setNow() { // start a fresh watch at the current time and date, keeping its layout and wind
    const keep = { config: W.config, chrono: W.chronoOn, spring: W.springLeft, crown: W.crownPos };
    W = CX.createWatch(P, Object.assign(CX.initFromDate(new Date()), { springLeft: keep.spring }));
    W.setConfig(keep.config, keep.chrono); W.setCrown(keep.crown);
    syncControls();
  }
  $("now").onclick = () => { setNow(); render(); };
  const scrub = $("scrub");
  scrub.addEventListener("input", () => { const base = Math.floor(W.handTime() / 86400) * 86400; W.setMovementTime(base + +scrub.value); render(); });
  const ampI = $("amp");
  ampI.addEventListener("input", () => { P.amplitude = +ampI.value; $("ampv").textContent = P.amplitude + "°"; });
  $("bph").addEventListener("change", e => {
    P.bph = +e.target.value;
    document.querySelector(".sub").textContent = `Swiss lever · ${P.bph.toLocaleString("en-US")} A/h · plan view, laid flat`;
    rebuild();
  });

  // ---------- complications and crown controls ----------
  const cfgWrap = $("cfgRadios");
  for (const c of CX.CONFIGS) {
    const lab = document.createElement("label");
    lab.innerHTML = `<input type="radio" name="cfg" value="${c.id}" id="cfg-${c.id}"> ${esc(c.name)}${c.desc ? ` <small class="muted">(${esc(c.desc)})</small>` : ""}${c.id === "complete" ? `<button type="button" class="info" data-term="completeCalendar" aria-label="What is a complete calendar?">i</button>` : ""}`;
    cfgWrap.appendChild(lab);
  }
  cfgWrap.addEventListener("change", e => { if (e.target.name === "cfg") { W.setConfig(e.target.value); applyFeatures(); } });
  for (const id of ["chrOff", "chrOn", "chrFly"]) $(id).addEventListener("change", e => {
    const was = W.features().chrono;
    W.setOption("chrono", e.target.value); applyFeatures();
    const now = W.features().chrono;
    if (now && !was) faceNote(marked("The big center hand is now the stopwatch's, so it waits at 12 until you press Start {{mono7750}}. The running seconds moved to the small dial at 9 {{mono7750}}."));
    else if (!now && was) faceNote("");
  });
  const calWrap = $("calRadios");
  for (const c of CX.CAL_TYPES) {
    const lab = document.createElement("label");
    lab.innerHTML = `<input type="radio" name="caltype" value="${c.id}" id="cal-${c.id}"> ${esc(c.name)}`;
    calWrap.appendChild(lab);
  }
  calWrap.addEventListener("change", e => { W.setOption("calType", e.target.value); applyFeatures(); });
  for (const [id, key] of [["optRetro", "retro"], ["optCentral", "central"], ["optPR", "pr"]]) $(id).addEventListener("change", e => { W.setOption(key, e.target.checked); applyFeatures(); });
  for (const id of ["windManual", "windAuto"]) $(id).addEventListener("change", e => { W.setOption("auto", e.target.value === "auto"); applyFeatures(); });
  const wristWrap = $("wristRadios");
  for (const [k, v] of Object.entries(CX.WRIST)) {
    const lab = document.createElement("label");
    lab.innerHTML = `<input type="radio" name="wrist" value="${k}" id="wrist-${k}"> ${esc(v.name)}`;
    wristWrap.appendChild(lab);
  }
  wristWrap.addEventListener("change", e => { W.setOption("wrist", e.target.value); syncControls(); });
  $("corrMonth").onclick = () => { W.correct("month"); render(); };
  $("corrYear").onclick = () => { W.correct("year"); render(); };
  $("crownSeg").addEventListener("change", e => { W.setCrown(+e.target.value); syncControls(); render(); });
  const QNAMES = { date: "advances the date", day: "advances the day", gmt: "moves the GMT hand an hour", calday: "advances the whole calendar a day", moon: "moves the moon on a day", none: "does nothing" };
  function crownHint(extra) {
    const f = W.features(), q = CX.quickSet(f);
    let h;
    if (W.crownPos === 0) h = `<b>Pushed in.</b> ` + marked(`Forward winds the mainspring {{wsSet}}${W.springLeft >= P.springTurns - 1e-6 ? (f.auto ? " (full; the bridle slips {{wikiAuto}})" : " (fully wound)") : ""}. Back just slips {{sjxKeyless}}.`);
    else if (W.crownPos === 1) h = `<b>First click.</b> ` + marked(`Forward ${QNAMES[q.fwd || "none"]}. Back ${QNAMES[q.back || "none"]}. {{app}}`) + (W.quickSetRisky() ? ` <span class="warn">${marked("Between about 9 pm and 3 am the date wheels are already engaged; quick-setting could damage a real watch {{wsDanger}}.")}</span>` : "");
    else h = `<b>Pulled out.</b> ` + marked(`The stop lever holds the balance {{mpStop}}. Forward and back move the hands five minutes a tap; hold to spin {{app}}.`);
    $("crownHint").innerHTML = h + ` <span class="small muted">${marked("In the drawing, drag the crown up or down, or scroll over it, to turn it {{app}}.")}</span>` + (extra ? ` <span class="warn">${marked(extra)}</span>` : "");
  }
  const setDis = (id, dis) => { const inp = $(id); inp.disabled = dis; inp.closest("label").classList.toggle("dis", dis); };
  function syncControls() {
    const f = W.features(), ps = CX.crownPositions(f), a = CX.allowed(W.config, f.chrono);
    const cfgInput = $("cfg-" + W.config); if (cfgInput) cfgInput.checked = true;
    setDis("chrOn", !a.chrono); setDis("chrFly", !a.flyback);
    $("chrOff").checked = W.opts.chrono === "off"; $("chrOn").checked = W.opts.chrono === "standard"; $("chrFly").checked = W.opts.chrono === "flyback";
    $("chrNote").innerHTML = marked(a.chrono ? (f.flyback ? "Flyback: press reset while running to restart from zero in one press {{wikiFlyback}}." : "Modeled on the Valjoux 7750: running seconds at 9, 30-minute counter at 12, 12-hour counter at 6 {{mono7750}}.")
      : `Not offered with ${CX.config(W.config).name.toLowerCase()} here. The 7750 family covers date {{grail7753}}, day-date and date + GMT {{mono7750}}, and full calendar with moon {{grail7751}}; time only is this app's choice {{?}}.`);
    for (const c of CX.CAL_TYPES) { setDis("cal-" + c.id, c.id !== "simple" && !a.calType); $("cal-" + c.id).checked = f.calType === c.id; }
    const CAL_NOTES = { simple: "Every month gets 31 days, so it needs correcting after shorter months {{wikiAnnual}}.",
      annual: "Knows 30- and 31-day months, and needs correcting only on 1 March {{wikiAnnual}}.",
      perpetual: "Knows leap years too, and won't need adjusting until 2100 {{wikiAnnual}}." };
    $("calNote").innerHTML = marked(a.calType ? CAL_NOTES[f.calType] : "Needs a layout with a date. {{app}}");
    setDis("optRetro", !a.retro); $("optRetro").checked = f.retro;
    setDis("optCentral", !a.central); $("optCentral").checked = f.central;
    setDis("optPR", !a.pr); $("optPR").checked = f.pr;
    $("windAuto").checked = f.auto; $("windManual").checked = !f.auto;
    $("wristRadios").hidden = !f.auto;
    const wr = $("wrist-" + W.opts.wrist); if (wr) wr.checked = true;
    document.querySelectorAll('#crownSeg input').forEach(inp => { inp.disabled = !ps.includes(+inp.value); inp.checked = +inp.value === W.crownPos; });
    $("moonRow").hidden = !f.moon; $("dayRow").hidden = !f.dayPusher; $("chronoRow").hidden = !f.chrono; $("faceChrono").hidden = !f.chrono; $("corrRow").hidden = !f.program; $("corrYear").hidden = !f.perpetual;
    $("vChr").hidden = !(f.chrono || f.central); $("vChr").textContent = f.chrono ? "Chronograph" : "Center seconds";
    $("vAuto").hidden = !(f.auto || f.pr);
    crownHint();
  }
  function applyFeatures() {
    applyVisibility(); updateCamShape(); applyView(); buildDial(); syncControls();
    if (!card.hidden && C.mode === "part" && !GL.present(C.key, W.features())) closeCard(false);
    else if (!card.hidden && C.mode === "part") openPart(C.key, {});
    render();
  }
  function doTurn(dir) {
    const res = W.turnCrown(dir * (W.crownPos === 2 ? 1 / 12 : 0.5));
    crownHint(res.action === "none" ? "Nothing is connected that way in this position. {{app}}" : res.action === "wind" && res.full ? (res.slipping ? "Full: the slipping bridle lets the spring slide along the barrel wall {{wikiAuto}}." : "The mainspring is full; the crown won't turn further {{?}}.") : "");
    render();
  }
  for (const [id, dir] of [["turnFwd", 1], ["turnBack", -1]]) {
    const b = $(id); let hold = null, rep = null;
    const stop = () => { clearTimeout(hold); clearInterval(rep); hold = rep = null; };
    b.addEventListener("pointerdown", e => { e.preventDefault(); doTurn(dir); hold = setTimeout(() => { rep = setInterval(() => doTurn(dir), 90); }, 350); });
    for (const ev of ["pointerup", "pointerleave", "pointercancel"]) b.addEventListener(ev, stop);
    b.addEventListener("click", e => { if (e.detail === 0) doTurn(dir); }); // keyboard
  }
  const pressed = {};
  function pushStart() {
    const starting = !W.chrono.running;
    W.pushStart(); pressed.start = performance.now();
    $("chrMsg").innerHTML = starting ? marked(`Started. The oscillating pinion meshed by turning the seconds wheel ${Math.abs(W.chrono.lastJump).toFixed(2)}° (${W.chrono.lastJumpSeconds >= 0 ? "+" : ""}${W.chrono.lastJumpSeconds.toFixed(3)} s) {{calc}}.`) : "";
    render();
  }
  function pushReset() {
    pressed.reset = performance.now();
    const wasRunning = W.chrono.running, ok = W.pushReset();
    $("chrMsg").innerHTML = !ok ? marked("Reset does nothing while a standard chronograph runs. Stop it first, or choose flyback {{gpChrono}}.")
      : wasRunning ? marked(`Flyback: back to zero and running again {{wikiFlyback}}. The pinion re-meshed ${Math.abs(W.chrono.lastJumpSeconds).toFixed(2)} s off zero {{calc}}.`) : "";
    render();
  }
  $("chrStart").onclick = pushStart; $("chrReset").onclick = pushReset;
  $("fStart").onclick = pushStart; $("fReset").onclick = pushReset;
  // a short note on the face, e.g. when switching the chronograph on moves the seconds
  let faceMsgTimer = null;
  function faceNote(html, ms) {
    const m = $("faceMsg"); clearTimeout(faceMsgTimer);
    if (!html) { m.hidden = true; return; }
    m.innerHTML = html; m.hidden = false;
    faceMsgTimer = setTimeout(() => { m.hidden = true; }, ms || 9000);
  }
  // moon: set it with the crown at the first click, turning back; "Match" does the turning for you
  let moonKey = "";
  const moonKeyNow = () => [W.cal.moon, W.cal.date, W.cal.month, W.cal.year, Math.floor(W.handTime() / 3600)].join("|");
  function moonStatus(msg) {
    moonKey = moonKeyNow();
    const m = W.moonCheck(), nm = GL.phaseName, days = a => a.toFixed(1) + " days";
    const dt = m.when.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
    $("moonText").innerHTML = `Watch: <b>${nm(m.shown / 29.5)}</b>, ${days(m.shown)} old. Real moon on ${esc(dt)}: <b>${nm(m.realAge / 29.5)}</b>, ${days(m.realAge)} old. `
      + (m.steps === 0 ? marked("Within half a day, as close as a one-tooth-a-day disc gets {{calc}}.") : marked(`${m.steps} turn${m.steps === 1 ? "" : "s"} back at the first click would match it {{calc}}.`))
      + (msg ? ` <span class="ok">${msg}</span>` : "");
    $("moonMatch").disabled = m.steps === 0;
  }
  $("moonMatch").onclick = () => {
    const n = W.matchMoon();
    render(); moonStatus(n ? `Moved it ${n} day${n === 1 ? "" : "s"}.` : "");
  };
  $("moonBack").onclick = () => { if (W.crownPos !== 1) { W.setCrown(1); syncControls(); } doTurn(-1); };
  $("dayCorrect").onclick = () => { W.dayCorrect(); render(); };
  // parts that do something when tapped, besides explaining themselves
  function actOn(key) {
    if (key === "crown") { W.cycleCrown(); syncControls(); render(); }
    if (key === "startPusher") pushStart();
    if (key === "resetPusher") pushReset();
  }

  function rebuild() {
    const view = { ...V };
    G = CM.build(P); X = CX.buildGeometry(P, G); draw(); renderTable();
    ref = CM.refState(P, G);
    const probe = CM.state(P, G, 600);
    handSign = { m: Math.sign(probe.center - ref.center) || 1, h: Math.sign(probe.hour - ref.hour) || 1, s: Math.sign(probe.fourth - ref.fourth) || 1 };
    // the date driving wheel's fingers are mounted so each one meets its target at midnight
    const d24At0 = dialAngles(0).driver24;
    for (const [k, a] of Object.entries(X.dial.fingerAngles)) R.fingers[k].setAttribute("transform", `rotate(${f4(a - d24At0)})`);
    applyVisibility();
    Object.assign(V, view); applyView();
    if (!card.hidden && C.mode === "part") { highlight(C.key); $("cardStats").innerHTML = statsHtml(GL.PARTS[C.key]); }
  }
  const pad = n => String(Math.floor(n)).padStart(2, "0");
  // Dial-side wheel angles from hand time: the cannon pinion carries the minute hand, everything else follows by its mesh.
  function dialAngles(Hs) {
    const T = P.teeth, A = P.angles, d = X.dial;
    const cannon = ref.center + handSign.m * Hs / 3600 * 360;
    const minute = CM.meshDrivenFromDriver(cannon, A.mw, T.cannon, T.minuteW);
    const hour = CM.meshDrivenFromDriver(minute, A.mw + 180, T.minuteP, T.hourW);
    const driver24 = CM.meshDrivenFromDriver(hour, -30, T.hourW, d.driver24Z);
    const gmtInter = CM.meshDrivenFromDriver(hour, 230, T.hourW, d.gmtInterZ);
    const gmtWheel = CM.meshDrivenFromDriver(gmtInter, 50, d.gmtInterPZ, d.gmtWheelZ);
    const setting = CM.meshDrivenFromDriver(minute, 165, T.minuteW, CX.KEYLESS.settingWheel);
    return { cannon, minute, hour, driver24, gmtInter, gmtWheel, setting };
  }
  const hatch = (x0, x1, y0, y1, phase, gap, vertical) => {
    let d = "";
    if (vertical) for (let x = x0 + ((phase % 1) + 1) % 1 * gap; x < x1; x += gap) d += `M${f4(x)} ${f4(y0)}V${f4(y1)}`;
    else for (let y = y0 + ((phase % 1) + 1) % 1 * gap; y < y1; y += gap) d += `M${f4(x0)} ${f4(y)}H${f4(x1)}`;
    return d;
  };
  function render() {
    st = CM.state(P, G, W.tau);
    const r = W.read(), f = W.features(), dx = X.dial;
    if (f.moon && moonKeyNow() !== moonKey) moonStatus();
    const A = P.angles;
    const rot = (n, a) => R[n].setAttribute("transform", `rotate(${(a % 360).toFixed(4)})`);
    rot("barrel", st.barrel); rot("center", st.center); rot("third", st.third); rot("fourth", st.fourth); rot("esc", st.esc);
    R.escW.setAttribute("transform", `rotate(${(st.escWheelOffset % 360).toFixed(4)})`);
    R.lever.setAttribute("transform", `rotate(${(A.lev + st.lever / D2R).toFixed(4)})`);
    R.bal.setAttribute("transform", `rotate(${(A.lev + 180 - st.theta).toFixed(3)})`);
    const da = dialAngles(r.handTime);
    rot("cannon", da.cannon); rot("mw", da.minute); rot("hour", da.hour);
    R.driver24.setAttribute("transform", `rotate(${f4(da.driver24 % 360)})`);
    R.gmtInter.setAttribute("transform", `rotate(${f4(da.gmtInter % 360)})`);
    R.gmtWheel.setAttribute("transform", `rotate(${f4((da.gmtWheel + handSign.h * r.gmtHours * 15) % 360)})`);
    R.settingWheel.setAttribute("transform", `rotate(${f4(da.setting % 360)})`);
    R.dateRing.setAttribute("transform", `rotate(${f4(r.dateRing)})`);
    R.dayStar.setAttribute("transform", `rotate(${f4(-r.dayStar)})`);
    R.moonDisc.setAttribute("transform", `rotate(${f4(-r.moonDisc)})`);
    // winding and setting
    const pull = dx.stemPull[W.crownPos];
    R.ratchet.setAttribute("transform", `rotate(${f4(r.ratchet % 360)})`);
    R.crownWheel.setAttribute("transform", `rotate(${f4(-r.ratchet * CX.KEYLESS.ratchet / CX.KEYLESS.crownWheel % 360)})`);
    R.quickSet.setAttribute("transform", `rotate(${f4(W.quickTurns * 360 * CX.KEYLESS.slidingPinion / CX.KEYLESS.quickSetWheel % 360)})`);
    R.rocker.setAttribute("transform", `rotate(${W.crownPos === 1 ? W.lastQuick * 25 : 0})`);
    R.stem.setAttribute("transform", `translate(${-pull} 0)`);
    R.knurl.setAttribute("d", hatch(dx.crownX - pull, dx.crownX + 1.6 - pull, dx.stemY - 1.1, dx.stemY + 1.1, -r.crownAngle / 360 * 3, 0.36, false));
    R.windHatch.setAttribute("d", hatch(dx.windPinion[0], dx.windPinion[1], dx.stemY - 0.4, dx.stemY + 0.4, r.ratchet / 360 * CX.KEYLESS.ratchet / CX.KEYLESS.windPinion * 3, 0.22, false));
    R.slide.setAttribute("transform", `translate(${f4(dx.slideEnd[W.crownPos])} 0)`);
    R.slideHatch.setAttribute("d", hatch(-dx.slideLen, -dx.slideLen * 0.62, dx.stemY - 0.42, dx.stemY + 0.42, -r.crownAngle / 360 * 3, 0.22, false));
    const K = dx.keyless, ci = W.crownPos;
    R.settingLever.setAttribute("transform", `rotate(${f4((K.th[ci] - K.th[1]) / D2R)})`);
    R.yoke.setAttribute("transform", `rotate(${f4((K.ph[ci] - K.ph[1]) / D2R)})`);
    const tip = W.hacked() ? X.move.stopTipIn : X.move.stopTipOut, hp = X.move.stopPivot;
    R.stop.setAttribute("d", `M${f4(hp[0])} ${f4(hp[1])}L${f4(tip[0])} ${f4(tip[1])}`);
    R.stopTip.setAttribute("cx", f4(tip[0])); R.stopTip.setAttribute("cy", f4(tip[1]));
    // automatic winding: the rotor swings with the wrist; both reverser wheels follow it, but only the one whose
    // clutch grips passes the motion on, so the reduction wheels only ever turn one way
    if (f.auto) {
      const A = CX.AUTO;
      R.rotor.setAttribute("transform", `rotate(${f4(r.rotor % 360)})`);
      R.rotorPinion.setAttribute("transform", `rotate(${f4(r.rotor % 360)})`);
      const revAng = -r.rotor * A.rotorPinion / A.reverser, pinAng = -r.reduction1 * A.red1[1] / A.reverserPinion;
      R.rev.forEach((v, i) => {
        v.wh.setAttribute("transform", `rotate(${f4((i === 0 ? revAng : -revAng) % 360)})`);
        v.pin.setAttribute("transform", `rotate(${f4(pinAng % 360)})`);
        v.clutch.classList.toggle("on", r.rotorDir === (i === 0 ? 1 : -1));
      });
      R.red1.setAttribute("transform", `rotate(${f4(r.reduction1 % 360)})`);
      R.red2.setAttribute("transform", `rotate(${f4(-r.reduction1 * A.red1[0] / A.red2[1] % 360)})`);
    }
    // power reserve differential: one sun follows the ratchet, the other the barrel drum; the carrier turns by half the difference
    if (f.pr) {
      R.sunA.setAttribute("transform", `rotate(${f4(r.ratchet % 360)})`);
      R.sunB.setAttribute("transform", `rotate(${f4(-r.drum % 360)})`);
      R.carrier.setAttribute("transform", `rotate(${f4(-150 + 120 * r.springFraction)})`);
    }
    // indirect central seconds: pinion on the fourth arbor, large intermediate wheel, pinion on the center
    if (f.central) {
      const c = X.chrono, aFI = Math.atan2(c.csInter[1] - c.drive[1], c.csInter[0] - c.drive[0]) / D2R, aIC = Math.atan2(c.runner[1] - c.csInter[1], c.runner[0] - c.csInter[0]) / D2R;
      const inter = CM.meshDrivenFromDriver(st.fourth, aFI, c.csPinionZ, c.csInterZ);
      R.csDrive.setAttribute("transform", `rotate(${f4(st.fourth % 360)})`);
      R.csIdler.setAttribute("transform", `rotate(${f4(inter % 360)})`);
      R.csWheel.setAttribute("transform", `rotate(${f4(CM.meshDrivenFromDriver(inter, aIC, c.csInterZ, c.csPinionZ) % 360)})`);
    }
    // calendar program: cam shows this month's sector to the grand lever; snail and rack drive the retrograde hand
    if (f.month || f.retro) {
      const pg = X.prog;
      R.dateStar.setAttribute("transform", `rotate(${f4(-r.dateRing)})`);
      if (f.monthStar) R.monthStar.setAttribute("transform", `rotate(${f4(-r.month * 30)})`);
      if (f.program) {
        const n = CX.camSectors(f.calType).length;
        R.cam.setAttribute("transform", `rotate(${f4(-(r.camIndex + 0.5) * 360 / n + 180)})`);
        const tipR = pg.camR - (31 - r.monthLength) * pg.notch, tip = [pg.cam[0] - tipR - 0.15, pg.cam[1]];
        R.grandLever.setAttribute("d", `M${f4(pg.leverPivot[0])} ${f4(pg.leverPivot[1])}L${f4(tip[0] - 0.6)} ${f4(tip[1] + 0.6)}L${f4(tip[0])} ${f4(tip[1])}M${f4(pg.leverPivot[0])} ${f4(pg.leverPivot[1])}L${f4(pg.dateStar[0] - pg.dateStarR - 0.3)} ${f4(pg.dateStar[1] + 1.2)}`);
        R.grandTip.setAttribute("cx", f4(tip[0])); R.grandTip.setAttribute("cy", f4(tip[1]));
      }
      if (f.retro) {
        const fr = pg.snailR0 + (pg.snailR1 - pg.snailR0) * r.retroFraction, fol = [pg.dateStar[0] + fr, pg.dateStar[1]];
        const pv = pg.rackPivot, ang = Math.atan2(fol[1] - pv[1], fol[0] - pv[0]);
        const back = ang + Math.PI, rr = 3.2, s0 = back - 0.35, s1 = back + 0.35;
        R.rack.setAttribute("d", `M${f4(fol[0])} ${f4(fol[1])}L${f4(pv[0])} ${f4(pv[1])}L${f4(pv[0] + rr * Math.cos(back))} ${f4(pv[1] + rr * Math.sin(back))}`);
        let teeth = ""; for (let i = 0; i <= 8; i++) { const a = s0 + (s1 - s0) * i / 8; teeth += `M${f4(pv[0] + rr * Math.cos(a))} ${f4(pv[1] + rr * Math.sin(a))}L${f4(pv[0] + (rr + 0.3) * Math.cos(a))} ${f4(pv[1] + (rr + 0.3) * Math.sin(a))}`; }
        R.rackTeeth.setAttribute("d", teeth);
        R.retroPinion.setAttribute("transform", `rotate(${f4(-120 + 240 * r.retroFraction)})`);
      }
    }
    // chronograph
    if (f.chrono) {
      const c = X.chrono, sgn = handSign.s, osc = W.chrono.running ? c.oscIn : c.oscOut;
      R.chrDrive.setAttribute("transform", `rotate(${f4(st.fourth % 360)})`);
      R.chrOscG.setAttribute("transform", `translate(${f4(osc[0])} ${f4(osc[1])})`);
      // the lower pinion always meshes the fourth wheel; when engaged the upper pinion turns the runner, tooth for tooth
      const aDO = Math.atan2(osc[1] - c.drive[1], osc[0] - c.drive[0]) / D2R, oscA = CM.meshDrivenFromDriver(st.fourth, aDO, c.fourthZ, c.lowerZ) % 360;
      R.chrOsc.setAttribute("transform", `rotate(${f4(oscA)})`);
      R.chrOscUp.setAttribute("transform", `rotate(${f4(oscA)})`);
      R.chrRunner.setAttribute("transform", `rotate(${f4(r.chronoRunnerAngle % 360)})`);
      R.chrMin.setAttribute("transform", `rotate(${f4(-90 - sgn * r.chronoMinutes)})`);
      // the driving wheel turns a tooth per minute (finger, then jumper); the counting wheel follows through the mesh
      const dAng = -(c.chronoSense * (r.chronoMinuteSteps * 360 / c.minDriveZ) + c.minPhase);
      R.chrMinDrive.setAttribute("transform", `rotate(${f4(dAng % 360)})`);
      R.chrMinGear.setAttribute("transform", `rotate(${f4(CM.meshDrivenFromDriver(dAng, 180, c.minDriveZ, 30) % 360)})`);
      R.chrHour.setAttribute("transform", `rotate(${f4(-90 + sgn * r.chronoHours)})`);
      // the hour drive turns with the barrel all the time; the counter only follows it while the chronograph runs
      const aBI = 180, aIH = 90, bAng = -st.barrel;
      const iAng = CM.meshDrivenFromDriver(bAng, aBI, c.barrelZ, c.hourInterZ);
      R.chrHourInter.setAttribute("transform", `rotate(${f4(iAng % 360)})`);
      R.chrHourWheel.setAttribute("transform", `rotate(${f4(CM.meshDrivenFromDriver(iAng, aIH, c.hourInterPZ, c.hourWheelZ) % 360)})`);
      R.hourLock.setAttribute("transform", `rotate(${W.chrono.running || W.chrono.hammer ? 8 : 0})`);
      // three cam positions: reset, running, stopped
      R.chrColumn.setAttribute("transform", `rotate(${X.chrono.camStates[W.chrono.running ? "running" : W.chrono.hammer ? "reset" : "stopped"]})`);
      R.hammer.setAttribute("transform", `rotate(${W.chrono.hammer ? 0 : -7})`);
      R.hourHammer.setAttribute("transform", `rotate(${W.chrono.hammer ? 0 : 8})`);
      const cst = W.chrono.running ? "running" : W.chrono.hammer ? "reset" : "stopped", CFr = X.chrono.followers;
      R.brake.setAttribute("transform", `rotate(${f4(CFr.brake.angle[cst] / D2R)})`);
      R.coupling.setAttribute("transform", `rotate(${f4(CFr.coupling.angle[cst] / D2R)})`);
      const now = performance.now();
      R.startBody.setAttribute("transform", `translate(${now - (pressed.start || -1e9) < 200 ? -0.45 : 0} 0)`);
      R.resetBody.setAttribute("transform", `translate(${now - (pressed.reset || -1e9) < 200 ? -0.45 : 0} 0)`);
      $("chrRead").textContent = $("fChrRead").textContent = GL.fmtChrono(Math.max(0, W.chrono.elapsed));
      $("fStart").textContent = W.chrono.running ? "Stop" : "Start";
      if (W.features().flyback && now - (pressed.reset || -1e9) < 250) { R.hammer.setAttribute("transform", "rotate(0)"); R.hourHammer.setAttribute("transform", "rotate(0)"); }
    }
    // hairspring: inner end turns with the balance, outer end held at the stud
    const N = 11, r0 = 0.42, r1 = 2.75, tw = -st.theta * D2R, base = R.studA - 2 * Math.PI * N; let d = "";
    for (let i = 0; i <= N * 40; i++) { const u = i / (N * 40), a = base + 2 * Math.PI * N * u + tw * (1 - u), r = r0 + (r1 - r0) * u; d += (i ? "L" : "M") + f4(r * Math.cos(a)) + " " + f4(r * Math.sin(a)); }
    R.spring.setAttribute("d", d);
    renderDial(r);
    // The hands only go round 12 hours; the date driving wheel turns once in 24, so the movement knows morning from afternoon.
    const hh = Math.floor(r.hourHand / 30) % 12 + (r.timeOfDay >= 43200 ? 12 : 0);
    $("handsRead").textContent = `${pad(hh)}:${pad(r.minuteHand / 6)}:${pad(r.secondsHand / 6)}`;
    const toMid = 86400 - r.timeOfDay, part = r.timeOfDay < 43200 ? "Morning" : r.timeOfDay < 64800 ? "Afternoon" : "Evening";
    // say plainly when the watch isn't running, so a stopped watch never looks like a frozen page
    const stopped = W.hacked() ? "Stopped: crown pulled out" : W.springLeft <= 1e-9 ? "Stopped: mainspring run down" : "";
    $("ampm").textContent = stopped || (W.features().calendar ? `${part} · date changes in ${Math.floor(toMid / 3600)} h ${pad(toMid % 3600 / 60)} m` : part);
    $("ampm").classList.toggle("stopped", !!stopped);
    const tt = (((W.tau + W.offset) % 86400) + 86400) % 86400;
    $("elapsed").textContent = `True time ${pad(Math.floor(tt / 3600))}:${pad(tt % 3600 / 60)}:${pad(tt % 60)}`;
    const rate = CM.rateError(P);
    $("rate").textContent = Math.abs(rate) < 1e-6 ? "Train ratios exact" : `Train runs ${rate > 0 ? "fast" : "slow"} ${Math.abs(rate).toFixed(0)} s/day`;
    if (document.activeElement !== scrub) scrub.value = Math.floor(((r.handTime % 86400) + 86400) % 86400);
    const state = W.hacked() ? "· stopped by the crown" : W.springLeft <= 1e-9 ? "· out of power" : st.inLift ? "· impulse" : "· locked";
    $("readout").textContent = `beat ${st.beat.toLocaleString("en-US")} · balance ${st.theta.toFixed(0).padStart(4)}° · lever ${(st.lever / D2R).toFixed(1)}° ${state}`;
    $("reserveFill").style.width = (r.springFraction * 100).toFixed(1) + "%";
    $("reserveBar").setAttribute("aria-valuenow", r.reserveHours.toFixed(0)); $("reserveBar").setAttribute("aria-valuemax", (P.springTurns * CM.periods(P).barrel / 3600).toFixed(0));
    $("reserveText").textContent = r.reserveHours.toFixed(1) + " h";
    // live numbers in an open part card, ~8 times a second, skipped while the reader is selecting text
    if (!card.hidden && C.mode === "part" && performance.now() - C.lastStats > 120) {
      const sel = window.getSelection && window.getSelection();
      if (!(sel && !sel.isCollapsed && card.contains(sel.anchorNode)) && !card.contains(document.activeElement && document.activeElement.closest && document.activeElement.closest("#cardStats"))) {
        $("cardStats").innerHTML = statsHtml(GL.PARTS[C.key]);
      }
      C.lastStats = performance.now();
    }
  }
  function frame(now) {
    const dt = Math.min(0.25, (now - last) / 1000); last = now;
    if (running) W.tick(dt * speed);
    render();
    requestAnimationFrame(frame);
  }

  // page notes and the full list of sources
  const NOTES = [
    "Every angle on the drawing is computed from one number, the watch's time {{app}}. The balance swings as a harmonic oscillator {{wikiBalWheel}}; while it's within the lift angle its impulse pin works the lever {{ccLift,wikiLever}}, which lets the escape wheel turn half a tooth {{wikiLever}}. Everything upstream turns by exact tooth ratios, and each mesh is phased so the teeth interleave {{calc}}.",
    "Watch teeth have long been cycloidal {{sjxGears}}. Here wheel tips are epicycloids rolled by a circle half the mating pinion's radius, and pinion flanks are radial {{model}}. Sizes are in millimeters, but the tooth counts and modules are illustrative, not taken from a real calibre {{model}}. Pinch or scroll to zoom, drag to pan, and edit tooth counts to break things {{app}}.",
    "How we know: the numbers in brackets link to the sources below. [citation needed] marks statements we couldn't find a source for. [model value] marks numbers chosen for this simulator. [worked out] marks things calculated here and checked by the tests. [owner's observation] marks things seen first-hand on the author's Valjoux 7750. {{app}}"
  ];
  $("notesBody").innerHTML = NOTES.map(n => `<p>${marked(n)}</p>`).join("");
  $("sourceList").innerHTML = Object.entries(GL.SOURCES).map(([id, src]) =>
    `<li id="src-${esc(id)}" value="${SOURCE_NUM[id]}"><a href="${esc(src.url)}" target="_blank" rel="noopener">${esc(src.title)}</a></li>`).join("");

  W.setConfig("date", false);
  rebuild(); applyFeatures(); fitAll(); render();
  requestAnimationFrame(frame);
  // hook for the smoke test; harmless in the viewer
  window.__calibre = { setTime: v => { W.setMovementTime(v); render(); }, pause: () => { if (running) runB.click(); }, params: P, card: C, watch: () => W };
})();
