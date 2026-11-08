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
    el("rect", { x: -110, y: -60, width: 220, height: 140, fill: "url(#mm5)", "aria-hidden": "true" }, svg);
    const scene = el("g", {}, svg), g = G, s = g.shapes, A = P.angles, sw = "0.9";
    R.scene = scene;
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

    R.dialLayer = el("g", {}, svg);
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
  // The model is drawn from the back. Front is that drawing mirrored; Face is Front with the dial on top.
  let side = "back";
  const mirrored = () => side !== "back";
  function applySide() {
    const m = mirrored(), flip = m ? "scale(-1 1)" : "", dial = $("dial"), onPlan = side === "face";
    R.scene.setAttribute("transform", flip);
    svg.classList.toggle("fromback", !m);
    for (const n of labG.querySelectorAll("line,circle")) n.setAttribute("transform", flip);
    for (const t of labG.querySelectorAll("text")) t.setAttribute("text-anchor", m ? "end" : "start");
    if (onPlan) {
      // sized so the dial's date window lands on the ring's
      const w = (X.dial.ringTeeth + X.dial.ringOut) / 2 / 33.75 * 100;
      for (const [k, v] of Object.entries({ x: -G.mc[0] - w / 2, y: G.mc[1] - w / 2, width: w, height: w })) dial.setAttribute(k, f4(v));
      R.dialLayer.appendChild(dial);
    } else if (dial.parentNode !== $("face")) {
      for (const k of ["x", "y", "width", "height"]) dial.removeAttribute(k);
      $("face").insertBefore(dial, $("ampm"));
    }
    if (onPlan) labG.setAttribute("display", "none"); else labG.removeAttribute("display");
    $("face").classList.toggle("onplan", onPlan);
    for (const [id, v] of [["sideBack", "back"], ["sideFront", "front"], ["sideFace", "face"]]) $(id).setAttribute("aria-pressed", side === v);
    applyView();
  }
  function setSide(next) {
    const was = mirrored();
    side = next;
    if (mirrored() !== was) V.cx = -V.cx;
    applySide();
    if (next === "face") { const r = (X.dial.ringTeeth + X.dial.ringOut) / 2 / 33.75 * 50; fitBox(G.mc[0] - r, G.mc[1] - r, G.mc[0] + r, G.mc[1] + r); }
  }
  function applyView() {
    const w = svg.clientWidth || 800, h = svg.clientHeight || 500;
    svg.setAttribute("viewBox", `${V.cx - w / 2 / V.k} ${V.cy - h / 2 / V.k} ${w / V.k} ${h / V.k}`);
    if (!labG) return;
    const fs = 11.5 / V.k, fs2 = 10 / V.k;
    for (const g of labG.children) {
      const x = (mirrored() ? -1 : 1) * g.dataset.x, y = +g.dataset.y, top = g.dataset.side === "top";
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
    if (mirrored()) [x0, x1] = [-x1, -x0];
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
  $("sideBack").onclick = () => setSide("back"); $("sideFront").onclick = () => setSide("front"); $("sideFace").onclick = () => setSide("face");

  // ---------- pointer: pan, pinch, tap to explain, hover to preview ----------
  const card = $("card");
  // Gestures belong to the whole stage, so a finger landing on a floating panel still counts toward a pinch.
  const stage = svg.closest(".stage");
  const ptrs = new Map(); let pinch = null, press = null, pinched = false;
  function startPinch() {
    if (ptrs.size !== 2) return;
    const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), k: V.k }; pinched = true;
  }
  stage.addEventListener("click", e => { if (pinched) { e.preventDefault(); e.stopPropagation(); } }, true); // lifting a pinch off a button isn't a press
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
  stage.addEventListener("pointerdown", e => {
    if (!svg.contains(e.target)) {
      if (e.pointerType === "touch") { ptrs.set(e.pointerId, [e.clientX, e.clientY]); press = null; startPinch(); }
      return;
    }
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
    startPinch();
  });
  stage.addEventListener("pointermove", e => {
    if (!ptrs.has(e.pointerId)) { if (e.pointerType === "mouse" && svg.contains(e.target)) hoverTip(e); return; }
    const prev = ptrs.get(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (press && press.id === e.pointerId) press.moved = Math.max(press.moved, Math.hypot(e.clientX - press.x, e.clientY - press.y));
    // dragging on the crown rolls it like a thumb would: up turns it forward, down turns it back
    if (ptrs.size === 1 && press && press.part && press.part.dataset.part === "crown") {
      press.roll += prev[1] - e.clientY;
      while (Math.abs(press.roll) >= CROWN_STEP_PX) { const dir = Math.sign(press.roll); press.roll -= dir * CROWN_STEP_PX; doTurn(dir); }
      return;
    }
    if (ptrs.size === 1 && press) { V.cx -= (e.clientX - prev[0]) / V.k; V.cy -= (e.clientY - prev[1]) / V.k; applyView(); }
    else if (ptrs.size === 2 && pinch) {
      const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, pinch.k * d / pinch.d / V.k);
    }
  });
  const up = e => {
    const wasTap = press && press.id === e.pointerId && press.moved < 6 && e.type === "pointerup";
    const part = press && press.part;
    ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (!ptrs.size) svg.classList.remove("dragging");
    if (!ptrs.size && pinched) setTimeout(() => { pinched = false; }, 350);
    if (press && press.id === e.pointerId) press = null;
    if (!wasTap) return;
    // "?" mode: a tap explains the part. Otherwise a tap works the parts you operate and leaves the rest alone.
    if (helpOn) { if (part) openPart(part.dataset.part, { opener: part }); else if (!$("card").hidden) closeCard(false); return; }
    if (part && ACTION_HINT[part.dataset.part] && !(e.target.closest && e.target.closest(".labels"))) actOn(part.dataset.part);
    else if (!part && !$("card").hidden) closeCard(false);
  };
  stage.addEventListener("pointerup", up); stage.addEventListener("pointercancel", up);
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
  stage.addEventListener("wheel", e => {
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

  // ---------- dial and complication parts (js/dial.js, js/parts.js) ----------
  const { dial, hand, buildDial, renderDial } = window.CalibreDial({ CM, CX, GL, P, el, f4, W: () => W });
  const { needs, drawRatchet, drawStopLever, drawDialUnder, drawChrono, drawAuto, drawPRDiff, drawCentral, drawProgram, updateCamShape } =
    window.CalibreParts({ CM, CX, GL, P, el, f4, tagPart, dial, G: () => G, X: () => X, R: () => R, W: () => W });

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
  for (const id of ["chrOff", "chrOn", "chrFly"]) $(id).addEventListener("change", e => { W.setOption("chrono", e.target.value); applyFeatures(); });
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
  // run-down banner: push the crown in and wind to full
  $("windUp").onclick = () => {
    if (W.crownPos !== 0) { W.setCrown(0); syncControls(); }
    while (!W.turnCrown(0.5).full);
    crownHint(""); render();
  };
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
    Object.assign(V, view); applySide();
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
    $("reserveBar").classList.toggle("low", r.springFraction < 0.1);
    $("faceDown").hidden = W.springLeft > 1e-9;
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
