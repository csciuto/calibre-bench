// Calibre Bench dial: laid out by CalibreComplications.dialLayout for the watch's features, hands driven by
// the watch. view.js creates it with the shared drawing helpers; W() returns the current watch.
window.CalibreDial = function (ctx) {
  "use strict";
  const { CM, CX, GL, P, el, f4, W } = ctx;
  const D2R = CM.D2R, $ = id => document.getElementById(id);
  // ---------- dial: laid out by CX.dialLayout for the watch's features, hands driven by the watch ----------
  const dial = $("dial"); let H = {};
  function dtick(cx, cy, r0, r1, a, w, cls) { const s = Math.sin(a * D2R), c = Math.cos(a * D2R); return el("line", { x1: f4(cx + r0 * s), y1: f4(cy - r0 * c), x2: f4(cx + r1 * s), y2: f4(cy - r1 * c), class: cls || "dtick", "stroke-width": w }, dial); }
  function subdial(cx, cy, r, n, major) {
    el("circle", { cx, cy, r, class: "dsub" }, dial);
    for (let i = 0; i < n; i++) dtick(cx, cy, r - (i % major ? 1.2 : 2.4), r - 0.4, i * 360 / n, i % major ? 0.4 : 0.8);
  }
  const hand = (len, tail, w, cls) => el("path", { d: `M${-w / 2} ${tail}L${-w / 4} ${-len}L${w / 4} ${-len}L${w / 2} ${tail}Z`, class: cls }, dial);
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
    const f = W().features(), L = CX.dialLayout(f); dial.innerHTML = ""; H = { f, L };
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
      // the usual aperture: a dome with two humps along the bottom, and the disc's moon sliding behind them
      const R = m.r * 1.25, o = R / 2, y = m.y + o;
      const d = `M${f4(m.x - R)} ${f4(y)}A${f4(R)} ${f4(R)} 0 0 1 ${f4(m.x + R)} ${f4(y)}A${f4(o)} ${f4(o)} 0 0 0 ${f4(m.x)} ${f4(y)}A${f4(o)} ${f4(o)} 0 0 0 ${f4(m.x - R)} ${f4(y)}Z`;
      el("path", { d, class: "dmoonsky" }, dial);
      el("path", { d }, el("clipPath", { id: "dmoonclip" }, dial));
      H.moon = el("circle", { r: f4(o * 0.85), class: "dmoonlit" }, el("g", { "clip-path": "url(#dmoonclip)" }, dial));
      H.moonAt = { x: m.x, y, o };
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
    if (H.moon) { // new at the left hump, full at the top, new again at the right hump: half a disc turn per lunation
      const a = (180 + 180 * r.moonPhase) * D2R, M = H.moonAt;
      H.moon.setAttribute("cx", f4(M.x + M.o * Math.cos(a))); H.moon.setAttribute("cy", f4(M.y + M.o * Math.sin(a)));
    }
  }
  return { dial, hand, buildDial, renderDial };
};
