// Every test here is a claim printed on help.html, word for word. Change one and the other has to change too.
const { test, expect } = require('@playwright/test');
const { open, set, countPixels, GOLD } = require('./lib');

test.use({ deviceScaleFactor: 2, timezoneId: 'UTC' });
test.beforeEach(async ({ page }) => { await open(page); });

const MOON_WATCHES = [
  { name: 'date and moon', config: 'datemoon' },
  { name: 'complete calendar', config: 'complete' },
  { name: 'chronograph', config: 'complete', chrono: true },
];
const dial = (page) => page.locator('#face #dial');

// the share of the moon showing in the aperture at every tooth, split into the moon's right and left halves
function sweep(page) {
  return page.evaluate(() => {
    const W = window.__calibre.watch(), moon = document.querySelector('#dial .dmoonlit'), sky = document.querySelector('#dial .dmoonsky');
    const out = [];
    for (let t = 0; t < 59; t++) {
      W.cal.moon = t; window.__calibre.setTime(6.5 * 3600);
      const [cx, cy, r] = ['cx', 'cy', 'r'].map((k) => +moon.getAttribute(k));
      let total = 0, seen = 0, right = 0, left = 0;
      for (let i = -20; i <= 20; i++) for (let j = -20; j <= 20; j++) {
        const x = i / 20, y = j / 20; if (x * x + y * y > 1) continue;
        total++;
        if (sky.isPointInFill(new DOMPoint(cx + x * r, cy + y * r))) { seen++; if (x > 0) right++; else if (x < 0) left++; }
      }
      out.push({ t, shown: seen / total, right, left });
    }
    return out;
  });
}

test('New moon is hidden', async ({ page }) => {
  await set(page, { config: 'datemoon', teeth: 0 });
  expect((await countPixels(page, dial(page), GOLD)).n).toBeLessThan(4);
  await set(page, { teeth: 29 });
  expect((await countPixels(page, dial(page), GOLD)).n).toBeLessThan(4);
  for (const w of MOON_WATCHES) {
    await set(page, w);
    const s = await sweep(page);
    expect(s[0].shown, w.name).toBe(0);
    expect(s[29].shown, w.name).toBe(0);
  }
});

test('Full moon shows whole', async ({ page }) => {
  await set(page, { config: 'datemoon', teeth: 15 });
  const seen = await countPixels(page, dial(page), GOLD);
  const r = 9.4 * 0.32 / 100 * seen.w;      // the moon's radius in screenshot pixels
  expect(seen.n).toBeGreaterThan((seen.w > 300 ? 0.85 : 0.6) * Math.PI * r * r);   // edge blur is most of a phone-sized moon
  for (const w of MOON_WATCHES) {
    await set(page, w);
    const s = await sweep(page);
    expect(s[15].shown, w.name).toBeGreaterThan(0.99);
  }
});

test('Moon appears and disappears on its right side first', async ({ page }) => {
  for (const w of MOON_WATCHES) {
    await set(page, w);
    const s = await sweep(page);
    for (let t = 1; t <= 15; t++) expect(s[t].shown, `${w.name}: waxing at tooth ${t}`).toBeGreaterThanOrEqual(s[t - 1].shown);
    for (let t = 16; t <= 29; t++) expect(s[t].shown, `${w.name}: waning at tooth ${t}`).toBeLessThanOrEqual(s[t - 1].shown);
    for (let t = 1; t <= 14; t++) if (s[t].shown > 0 && s[t].shown < 0.98) expect(s[t].right, `${w.name}: tooth ${t}`).toBeGreaterThan(s[t].left);
    for (let t = 16; t <= 28; t++) if (s[t].shown > 0 && s[t].shown < 0.98) expect(s[t].left, `${w.name}: tooth ${t}`).toBeGreaterThan(s[t].right);
  }
});

test('Moon wheel sits behind the aperture', async ({ page }) => {
  for (const w of MOON_WATCHES) {
    await set(page, { ...w, side: 'face' });
    const gaps = await page.evaluate(() => {
      const W = window.__calibre.watch(), plan = document.getElementById('plan');
      const mid = (e) => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; };
      const dialMoon = plan.querySelector('#dial .dmoonlit'), bodies = [...plan.querySelectorAll('[data-part="moonDisc"] .moonbody')];
      const out = [];
      for (let t = 0; t < 59; t++) {
        W.cal.moon = t; window.__calibre.setTime(6.5 * 3600);
        const m = mid(dialMoon);
        out.push(Math.min(...bodies.map((b) => { const p = mid(b); return Math.hypot(p[0] - m[0], p[1] - m[1]); })));
      }
      return out;
    });
    for (const [t, gap] of gaps.entries()) expect(gap, `${w.name}: tooth ${t}`).toBeLessThan(2);
  }
});

test('Next date comes up from below', async ({ page }) => {
  for (const side of ['back', 'front']) {
    await set(page, { config: 'datemoon', side, date: 14 });
    const dy = await page.evaluate(() => {
      const nums = [...document.querySelectorAll('#plan .ringnum')].filter((t) => +t.getAttribute('font-size') > 0.6);
      const y = (n) => { const r = nums.find((t) => t.textContent === String(n)).getBoundingClientRect(); return r.y + r.height / 2; };
      return y(16) - y(15);
    });
    expect(dy, side).toBeGreaterThan(0);
  }
});

test('Date ring shows through the date window', async ({ page }) => {
  await set(page, { config: 'datemoon', side: 'face' });
  const misses = await page.evaluate(() => {
    const W = window.__calibre.watch(), plan = document.getElementById('plan'), bad = [];
    const nums = [...plan.querySelectorAll('.ringnum')].filter((t) => +t.getAttribute('font-size') > 0.6);
    const win = plan.querySelector('#dial .dwin').getBoundingClientRect(), mark = plan.querySelector('[data-part="dateRing"] > path.window').getBoundingClientRect();
    const inside = (r) => { const x = r.x + r.width / 2, y = r.y + r.height / 2; return x > win.left && x < win.right && y > win.top && y < win.bottom; };
    if (!inside(mark)) bad.push('marker');
    for (let d = 0; d < 31; d++) {
      W.cal.date = d; window.__calibre.setTime(6.5 * 3600);
      if (!inside(nums.find((t) => t.textContent === String(d + 1)).getBoundingClientRect())) bad.push(d + 1);
    }
    return bad;
  });
  expect(misses).toEqual([]);
});

const printing = (page) => page.evaluate(() => {
  const t = document.querySelector('#plan .ringnum'), m = t.getScreenCTM(), moon = document.querySelector('#plan .moonbody');
  return { mirrored: m.a * m.d - m.b * m.c < 0, text: +getComputedStyle(t).opacity, moon: +getComputedStyle(moon).opacity };
});

test('From the back, printing is mirrored and faded', async ({ page }) => {
  await set(page, { config: 'datemoon', side: 'back' });
  const p = await printing(page);
  expect(p.mirrored).toBe(true);
  expect(p.text).toBeLessThan(0.6);
  expect(p.moon).toBeLessThan(0.6);
});

test('From the front, printing reads normally', async ({ page }) => {
  await set(page, { config: 'datemoon', side: 'front' });
  const p = await printing(page);
  expect(p.mirrored).toBe(false);
  expect(p.text).toBe(1);
  expect(p.moon).toBe(1);
});

test('Face lays the dial over the movement and taps go through', async ({ page }) => {
  await set(page, { config: 'datemoon', side: 'face' });
  const f = await page.evaluate(() => {
    const plan = document.getElementById('plan'), d = plan.querySelector('#dial'), r = d.getBoundingClientRect();
    const ring = plan.querySelector('[data-part="dateRing"]').getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width * 0.3, r.y + r.height * 0.7);
    return { opacity: +getComputedStyle(d).opacity, dx: Math.abs(r.x + r.width / 2 - (ring.x + ring.width / 2)), dy: Math.abs(r.y + r.height / 2 - (ring.y + ring.height / 2)),
      inDial: !!hit.closest('#dial'), inPlan: !!hit.closest('#plan') };
  });
  expect(f.opacity).toBeGreaterThan(0.5);
  expect(f.dx).toBeLessThan(3);
  expect(f.dy).toBeLessThan(3);
  expect(f.inPlan).toBe(true);
  expect(f.inDial).toBe(false);
});

test('Running down shows a Wind button', async ({ page }) => {
  await set(page, { spring: 0 });
  const banner = page.locator('#faceDown');
  await expect(banner).toBeVisible();
  const ink = await countPixels(page, banner, 'Math.abs(r - first[0]) + Math.abs(g - first[1]) + Math.abs(b - first[2]) > 90');
  expect(ink.n).toBeGreaterThan(200);
  await banner.getByRole('button', { name: 'Wind' }).click();
  await expect(banner).toBeHidden();
});

test('Pulling the crown out stops the watch', async ({ page }) => {
  await set(page, { crown: 2 });
  await expect(page.locator('#ampm')).toHaveText('Stopped: crown pulled out');
  expect(await page.evaluate(() => window.__calibre.watch().tick(10))).toBe(0);
});

// ---------- the rest of the watch ----------
const CM = require('../js/model.js'), CX = require('../js/complications.js');
const P = CM.params(), DAY = 86400;
const near = (a, b, tol, msg) => expect(Math.abs(a - b), `${msg || ''} ${a} vs ${b}`).toBeLessThanOrEqual(tol);
function watch(config, opts = {}, init = {}) {
  const w = CX.createWatch(P, { handSeconds: 12 * 3600, date: 1, month: 0, year: 2027, springLeft: P.springTurns, ...init });
  w.setConfig(config);
  for (const [k, v] of Object.entries(opts)) expect(w.setOption(k, v), k).toBe(true);
  return w;
}
const toMidnight = (w) => { w.setMovementTime(DAY - 1); w.tick(2); };
// how the drawn group turned on screen between two moments, in degrees: + is clockwise
const turned = async (page, selectors, t0, t1) => page.evaluate(([selectors, t0, t1]) => {
  const ang = (g) => { const m = g.getScreenCTM(); return Math.atan2(m.b, m.a) * 180 / Math.PI; };
  window.__calibre.setTime(t0); const a = selectors.map((s) => ang(document.querySelector(s)));
  window.__calibre.setTime(t1); const b = selectors.map((s) => ang(document.querySelector(s)));
  return a.map((v, i) => ((b[i] - v + 540) % 360) - 180);
}, [selectors, t0, t1]);
const wheel = (k) => `#plan [data-part="${k}"] > g`;

test('Hands read the time', async () => {
  const w = watch('time');
  for (const s of [0, 3 * 3600 + 25 * 60 + 30, 7.75 * 3600, 11 * 3600 + 59 * 60]) {
    w.setMovementTime(s);
    const r = w.read(), step = 360 / 60 / (P.bph / 3600);
    near(r.minuteHand, (s % 3600) / 10, step + 1e-6, 'minute');
    near(r.hourHand, (s % 43200) / 120, step + 1e-6, 'hour');
    near(r.secondsHand, (s % 60) * 6, step + 1e-6, 'seconds');
  }
});

test('Seen from the front, the hands turn clockwise and each wheel turns against its neighbor', async ({ page }) => {
  await set(page, { side: 'front' });
  const [center, third, fourth, barrel, hour] = await turned(page, ['center', 'third', 'fourth', 'barrel', 'hourWheel'].map(wheel), 7200, 7220);
  expect(center).toBeGreaterThan(0); expect(fourth).toBeGreaterThan(0); expect(hour).toBeGreaterThan(0);
  expect(third).toBeLessThan(0); expect(barrel).toBeLessThan(0);
});

test('Center wheel turns once an hour, fourth wheel once a minute', async () => {
  const per = CM.periods(P);
  near(per.center, 3600, 1e-9); near(per.fourth, 60, 1e-9); near(per.hour, 43200, 1e-9);
});

test('Changing the beat rate alone makes the watch run slow or fast', async ({ page }) => {
  await page.selectOption('#bph', '21600');
  await page.evaluate(() => window.__calibre.setTime(0));
  await expect(page.locator('#rate')).toContainText('slow');
  await page.selectOption('#bph', '36000');
  await page.evaluate(() => window.__calibre.setTime(0));
  await expect(page.locator('#rate')).toContainText('fast');
  near(CM.periods(CM.params({ bph: 21600 })).center, 4800, 1e-6);
});

test('Amplitude changes the swing, not the rate', async () => {
  const peak = (amp) => { const p = CM.params({ amplitude: amp }), G = CM.build(p); let m = 0; for (let t = 100; t < 100.5; t += 0.002) m = Math.max(m, Math.abs(CM.state(p, G, t).theta)); return { m, per: CM.periods(p).center }; };
  const a = peak(220), b = peak(310);
  near(a.m, 220, 6); near(b.m, 310, 8); expect(a.per).toBe(b.per);
});

test('A wrong tooth count shows a rate error', async ({ page }) => {
  await expect(page.locator('#rate')).toHaveText('Train ratios exact');
  await page.fill('#t-thirdW', '76');
  await page.locator('#t-thirdW').dispatchEvent('change');
  await page.evaluate(() => window.__calibre.setTime(0));
  await expect(page.locator('#rate')).toContainText(/runs (fast|slow)/);
});

test('Crown in winds forward and slips back', async () => {
  const w = watch('date', {}, { springLeft: 2 });
  w.turnCrown(1); expect(w.springLeft).toBeGreaterThan(2);
  const s = w.springLeft; expect(w.turnCrown(-1).action).toBe('slip'); expect(w.springLeft).toBe(s);
});

test('Winding stops at full', async () => {
  const w = watch('date', {}, { springLeft: P.springTurns - 0.1 });
  let r; for (let i = 0; i < 20; i++) r = w.turnCrown(1);
  expect(r.full).toBe(true); near(w.springLeft, P.springTurns, 1e-9);
});

test('Crown out moves the hands five minutes a tap', async () => {
  const w = watch('date'); w.setCrown(2);
  const t = w.handTime(); w.turnCrown(1 / 12); near(w.handTime() - t, 300, 1e-6);
  w.turnCrown(-1 / 12); near(w.handTime(), t, 1e-6);
});

test('Setting past midnight moves the date forward only', async () => {
  const w = watch('date', {}, { handSeconds: DAY - 60, date: 10 }); w.setCrown(2);
  w.turnCrown(1 / 12); expect(w.read().dateShown).toBe(11);
  w.turnCrown(-1 / 12); expect(w.read().dateShown).toBe(11);
});

test('First click sets the right thing on each watch', async () => {
  const q = (c, o) => { const { fwd, back } = CX.quickSet(CX.features(c, o)); return [fwd, back]; };
  expect(q('date')).toEqual(['date', null]);
  expect(q('daydate')).toEqual(['date', 'day']);
  expect(q('datemoon')).toEqual(['date', 'moon']);
  expect(q('dategmt')).toEqual(['date', 'gmt']);
  expect(q('complete')).toEqual(['date', 'moon']);
  expect(q('date', { calType: 'annual' })).toEqual(['calday', null]);
  expect(q('complete', { calType: 'perpetual' })).toEqual(['calday', 'moon']);
});

test('Quick-setting near midnight warns', async ({ page }) => {
  await set(page, { config: 'date', crown: 1, time: 23 * 3600 });
  await page.evaluate(() => document.getElementById('turnFwd').dispatchEvent(new MouseEvent('click', { detail: 0, bubbles: true })));
  await expect(page.locator('#crownHint .warn').first()).toContainText('9 pm');
  await set(page, { time: 12 * 3600 });
  await page.evaluate(() => document.getElementById('turnFwd').dispatchEvent(new MouseEvent('click', { detail: 0, bubbles: true })));
  await expect(page.locator('#crownHint .warn')).toHaveCount(0);
});

test('Time only has no first click', async ({ page }) => {
  await set(page, { config: 'time' });
  await expect(page.locator('#crownSeg input[value="1"]')).toBeDisabled();
  await set(page, { config: 'date' });
  await expect(page.locator('#crownSeg input[value="1"]')).toBeEnabled();
});

test('A full wind runs 52 hours', async () => {
  const w = watch('time'); let ran = 0;
  for (let i = 0; i < 400; i++) ran += w.tick(600);
  near(ran, 52 * 3600, 1e-6); expect(w.tick(600)).toBe(0);
});

test('Low reserve turns the bar red', async ({ page }) => {
  await set(page, { spring: 0.5 });
  await expect(page.locator('#reserveBar')).toHaveClass(/low/);
  await set(page, { spring: 5 });
  await expect(page.locator('#reserveBar')).not.toHaveClass(/low/);
});

test('Date changes at midnight', async () => {
  const w = watch('date', {}, { date: 9 });
  w.setMovementTime(DAY - 3); w.tick(1); expect(w.read().dateShown).toBe(9);
  w.tick(4); expect(w.read().dateShown).toBe(10);
});

test('A simple date needs correcting after a 30-day month', async () => {
  const w = watch('date', {}, { date: 30, month: 3 });
  toMidnight(w); expect(w.read().dateShown).toBe(31);
});

test('Retrograde hand climbs the scale, then flies back after the last day', async ({ page }) => {
  await set(page, { config: 'date', retro: true, date: 0 });
  const hand = () => page.evaluate(() => { const L = window.CalibreComplications.dialLayout(window.__calibre.watch().features()).retro, m = /rotate\((-?[\d.]+)\)/.exec(document.querySelector('#dial .dhr').getAttribute('transform')); return { a: +m[1], a0: L.a0, a1: L.a1 }; });
  let h = await hand(); near(h.a, h.a0, 0.5, 'the 1st');
  await set(page, { date: 30 }); h = await hand(); near(h.a, h.a1, 0.5, 'the 31st');
  const w = watch('date', { retro: true, calType: 'annual' }, { date: 30, month: 3 });
  w.setMovementTime(DAY - 2); near(w.read().retroFraction, 29 / 30, 1e-3, 'last day of April, no creep');
  w.tick(4); near(w.read().retroFraction, 0, 1e-3, 'back to the 1st');
});

test('Day changes at midnight', async () => {
  const w = watch('daydate', {}, { weekday: 6 });
  toMidnight(w); expect(w.read().day).toBe(0);
});

test('Day disc prints the dial day at its window', async ({ page }) => {
  await set(page, { config: 'daydate', side: 'front' });
  const bad = await page.evaluate(() => {
    const W = window.__calibre.watch(), DAYS = window.CalibreGlossary.DAYS, part = document.querySelector('#plan [data-part="dayStar"]');
    const mid = (e) => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; };
    const win = mid(part.querySelector(':scope > path.window')), wrong = [];
    for (let d = 0; d < 7; d++) {
      W.cal.day = d; window.__calibre.setTime(6.5 * 3600);
      const near = [...part.querySelectorAll('.ringnum')].map((t) => { const p = mid(t); return [Math.hypot(p[0] - win[0], p[1] - win[1]), t.textContent]; }).sort((a, b) => a[0] - b[0])[0][1];
      if (near !== DAYS[d]) wrong.push([DAYS[d], near]);
    }
    return wrong;
  });
  expect(bad).toEqual([]);
});

test('Day corrector only where the crown has no room for it', async ({ page }) => {
  await set(page, { config: 'complete' });
  await expect(page.locator('#dayRow')).toBeVisible();
  await set(page, { config: 'daydate' });
  await expect(page.locator('#dayRow')).toBeHidden();
});

test('Day star clears the moon wheel', async () => {
  for (const spot of Object.keys(CX.MOON_SPOTS)) {
    const d = CX.buildGeometry(P, CM.build(P), spot).dial;
    expect(Math.hypot(d.dayStar[0] - d.moonDisc[0], d.dayStar[1] - d.moonDisc[1]), spot).toBeGreaterThan(d.moonRa + d.dayDiscR + 0.5);
    near(d.dayPush.vals.at(-1), 180 / 7, 0.01 * 180 / 7, spot);
  }
});

test('GMT hand turns once in 24 hours and shows home time', async () => {
  const w = watch('dategmt', {}, { handSeconds: 0, gmtOffsetH: 5 });
  near(w.read().gmtHand, 75, 1e-6, 'five hours ahead');
  w.setMovementTime(6 * 3600); near(w.read().gmtHand, 165, 1e-6);
});

test('GMT quick-set moves one hour and leaves the hands alone', async () => {
  const w = watch('dategmt', {}, { gmtOffsetH: 0 }); w.setCrown(1);
  const t = w.handTime(); w.turnCrown(-0.5);
  expect(w.cal.gmt).toBe(1); expect(w.handTime()).toBe(t);
});

test('GMT wheel turns with the hour wheel at half speed', async ({ page }) => {
  await set(page, { config: 'dategmt', side: 'front' });
  const [hour, gmt] = await turned(page, ['#plan [data-part="hourWheel"] > g', '#plan [data-part="gmtWheel"] > g'], 7200, 7800);
  expect(hour).toBeGreaterThan(0); near(gmt, hour / 2, 0.1);
});

test('Month disc prints the dial month at the top', async ({ page }) => {
  await set(page, { config: 'complete' });
  const bad = await page.evaluate(() => {
    const W = window.__calibre.watch(), MON = window.CalibreComplications.MONTHS, wrong = [];
    const labels = [...document.querySelectorAll('#plan [data-part="monthStar"] .disclbl')];
    for (let m = 0; m < 12; m++) {
      W.cal.month = m; window.__calibre.setTime(6.5 * 3600);
      const top = labels.map((t) => [t.getBoundingClientRect().top, t.textContent]).sort((a, b) => a[0] - b[0])[0][1];
      if (top !== MON[m]) wrong.push([MON[m], top]);
    }
    return wrong;
  });
  expect(bad).toEqual([]);
});

test('Annual calendar knows 30-day months but not February', async () => {
  let w = watch('date', { calType: 'annual' }, { date: 30, month: 3 });
  toMidnight(w); expect([w.read().dateShown, w.read().month]).toEqual([1, 4]);
  w = watch('date', { calType: 'annual' }, { date: 28, month: 1 });
  toMidnight(w); expect([w.read().dateShown, w.read().month]).toEqual([29, 1]);
});

test('Perpetual calendar knows leap years, up to 2100', async () => {
  expect(CX.monthLength('perpetual', 1, 2027)).toBe(28);
  expect(CX.monthLength('perpetual', 1, 2028)).toBe(29);
  expect(CX.monthLength('perpetual', 1, 2100)).toBe(29);
  const w = watch('date', { calType: 'perpetual' }, { date: 28, month: 1, year: 2027 });
  toMidnight(w); expect([w.read().dateShown, w.read().month]).toEqual([1, 2]);
});

test('Leap dots show the year in the cycle and stay on the dial', async ({ page }) => {
  await set(page, { config: 'date', calType: 'perpetual', chrono: true, year: 2029 });
  expect(await page.evaluate(() => [...document.querySelectorAll('#dial .dleap')].map((c) => c.classList.contains('on')))).toEqual([false, true, false, false]);
  const edge = await page.evaluate(() => { const t = document.querySelector('#dial .dleapt').getBBox(); return Math.hypot(t.x + t.width, t.y + t.height); });
  expect(edge).toBeLessThan(44);
});

test('Correctors come with a month cam', async ({ page }) => {
  await expect(page.locator('#corrRow')).toBeHidden();
  await set(page, { config: 'date', calType: 'annual' });
  await expect(page.locator('#corrRow')).toBeVisible();
  await expect(page.locator('#corrYear')).toBeHidden();
  await set(page, { calType: 'perpetual' });
  await expect(page.locator('#corrYear')).toBeVisible();
});

test('Central seconds replaces the small seconds', async ({ page }) => {
  await set(page, { config: 'date', central: true, time: 7215 });
  const d = await page.evaluate(() => ({ subs: document.querySelectorAll('#dial .dsub').length, hand: document.querySelector('#dial .dhs').getAttribute('transform') }));
  expect(d.subs).toBe(0);
  near(+/rotate\((-?[\d.]+)\)/.exec(d.hand)[1], 90, 1, 'fifteen seconds');
});

test('Stopwatch starts, stops and resets', async () => {
  const w = watch('date', { chrono: 'standard' });
  w.pushStart(); w.tick(10); near(w.chrono.elapsed, 10, 0.3);
  w.pushStart(); w.tick(5); near(w.chrono.elapsed, 10, 0.3);
  expect(w.pushReset()).toBe(true); near(w.chrono.elapsed, 0, 1e-9);
});

test('Standard chronograph ignores reset while running', async () => {
  const w = watch('date', { chrono: 'standard' });
  w.pushStart(); w.tick(5); expect(w.pushReset()).toBe(false); expect(w.chrono.running).toBe(true);
});

test('Flyback restarts from zero in one press', async () => {
  const w = watch('date', { chrono: 'flyback' });
  w.pushStart(); w.tick(8); expect(w.pushReset()).toBe(true);
  expect(w.chrono.running).toBe(true); near(w.chrono.elapsed, 0, 0.2);
  w.tick(3); near(w.chrono.elapsed, 3, 0.3);
});

test('Counters read 30 minutes and 12 hours', async () => {
  const w = watch('date', { chrono: 'standard' });
  w.chrono.elapsed = 15 * 60; near(w.read().chronoMinutes, 180, 1, 'half the minute counter');
  w.chrono.elapsed = 3 * 3600; near(w.read().chronoHours, 90, 1e-6, 'a quarter of the hour counter');
});

test('Minute counter hand turns with its gear', async ({ page }) => {
  await set(page, { config: 'date', chrono: true, side: 'front' });
  const [gear, hand] = await page.evaluate(() => {
    const W = window.__calibre.watch(), part = [...document.querySelectorAll('#plan [data-part="minuteCounter"]')].find((p) => p.querySelectorAll(':scope > g').length >= 2);
    const gs = [...part.querySelectorAll(':scope > g')].slice(0, 2), ang = (g) => { const m = g.getScreenCTM(); return Math.atan2(m.b, m.a) * 180 / Math.PI; };
    W.chrono.elapsed = 90; window.__calibre.setTime(7200); const a = gs.map(ang);
    W.chrono.elapsed = 150; window.__calibre.setTime(7200); const b = gs.map(ang);
    return a.map((v, i) => ((b[i] - v + 540) % 360) - 180);
  });
  near(gear, 12, 0.5, 'clockwise from the front, a minute a tooth'); near(hand, gear, 0.5);
});

test('Running seconds keep going while the stopwatch is stopped', async () => {
  const w = watch('date', { chrono: 'standard' });
  w.pushStart(); w.tick(3); w.pushStart();
  const s = w.read().secondsHand; w.tick(10);
  near(((w.read().secondsHand - s) % 360 + 360) % 360, 60, 1);
});

test('Chronograph rules out date and moon, retrograde, central seconds and the reserve hand', async ({ page }) => {
  await set(page, { config: 'datemoon' });
  await expect(page.locator('#chrOn')).toBeDisabled();
  await set(page, { config: 'date', chrono: true });
  for (const id of ['#optRetro', '#optCentral', '#optPR']) await expect(page.locator(id)).toBeDisabled();
});

test('Rotor winds on both swings', async () => {
  const w = watch('date', { auto: true, wrist: 'walking' }, { springLeft: 1 });
  const gained = { '1': 0, '-1': 0 }; let last = w.read().reduction1;
  w.setCrown(2);   // stop the balance, so only winding moves the spring
  for (let i = 0; i < 400; i++) {
    const dir = w.read().rotorDir, spring = w.springLeft;
    w.tick(0.02);
    const r = w.read();
    expect(r.reduction1, 'the reduction side only goes one way').toBeGreaterThanOrEqual(last);
    last = r.reduction1; gained[dir] += w.springLeft - spring;
  }
  expect(gained['1']).toBeGreaterThan(0); expect(gained['-1']).toBeGreaterThan(0);
});

test('Walking fills the spring and a desk day barely slows the loss', async () => {
  const gain = (wrist) => { const w = watch('date', { auto: true, wrist }, { springLeft: 3 }); for (let i = 0; i < 360; i++) w.tick(10); return w.springLeft - 3; };
  expect(gain('walking')).toBeGreaterThan(0);
  expect(gain('desk')).toBeLessThan(0);
  expect(gain('desk')).toBeGreaterThan(gain('off'));
});

test('Automatic slips at full', async () => {
  const w = watch('date', { auto: true, wrist: 'running' }, { springLeft: P.springTurns - 0.01 });
  for (let i = 0; i < 600; i++) w.tick(1);
  near(w.springLeft, P.springTurns, 0.01); expect(w.slipTurns).toBeGreaterThan(0);
});

test('Wrist choices come with automatic', async ({ page }) => {
  await expect(page.locator('#wristRadios')).toBeHidden();
  await set(page, { auto: true });
  await expect(page.locator('#wristRadios')).toBeVisible();
});

test('Rotor hangs where its label points', async ({ page }) => {
  await set(page, { auto: true, view: 'vAuto' });
  const hit = await page.evaluate(() => {
    const dot = [...document.querySelectorAll('#plan .labels [data-part="rotor"] .leader-dot')][0], r = dot.getBoundingClientRect();
    return [...document.elementsFromPoint(r.x + r.width / 2, r.y + r.height / 2)].some((e) => e.closest && e.closest('#plan > g:not(.labels) [data-part="rotor"]'));
  });
  expect(hit).toBe(true);
});

test('Reserve hand follows the spring', async ({ page }) => {
  await set(page, { config: 'date', pr: true, spring: P.springTurns / 2 });
  const a = await page.evaluate(() => { const L = window.CalibreComplications.dialLayout(window.__calibre.watch().features()).pr, m = /rotate\((-?[\d.]+)\)/.exec(document.querySelector('#dial .dhg').getAttribute('transform')); return { a: +m[1], mid: (L.a0 + L.a1) / 2 }; });
  near(a.a, a.mid, 0.5);
});

test('Nothing on the dial collides, on any combination', async () => {
  const circle = (x, y, r, n = 72) => Array.from({ length: n }, (_, i) => [x + r * Math.cos(i * 2 * Math.PI / n), y + r * Math.sin(i * 2 * Math.PI / n)]);
  const rect = (a) => { const o = []; for (let i = 0; i <= 12; i++) o.push([a.x0 + (a.x1 - a.x0) * i / 12, a.y0], [a.x0 + (a.x1 - a.x0) * i / 12, a.y1], [a.x0, a.y0 + (a.y1 - a.y0) * i / 12], [a.x1, a.y0 + (a.y1 - a.y0) * i / 12]); return o; };
  const arc = (F) => Array.from({ length: 40 }, (_, i) => { const a = (F.a0 + (F.a1 - F.a0) * i / 39) * Math.PI / 180; return [F.x + F.r * Math.cos(a), F.y + F.r * Math.sin(a)]; });
  const gap = (A, B) => { let m = 1e9; for (const a of A) for (const b of B) m = Math.min(m, Math.hypot(a[0] - b[0], a[1] - b[1])); return m; };
  let count = 0; const bad = [];
  for (const c of CX.CONFIGS) for (const chrono of ['off', 'standard']) for (const calType of ['simple', 'annual', 'perpetual']) for (const retro of [false, true]) for (const central of [false, true]) for (const pr of [false, true]) {
    const a = CX.allowed(c.id, chrono !== 'off');
    if ((chrono !== 'off' && !a.chrono) || (calType !== 'simple' && !a.calType) || (retro && !a.retro) || (central && !a.central) || (pr && !a.pr)) continue;
    count++;
    const L = CX.dialLayout(CX.features(c.id, { chrono, calType, retro, central, pr })), S = [];
    L.windows.forEach((w) => S.push([w.content, rect(w)]));
    const subs = [...L.subdials]; if (L.smallSeconds) subs.push({ key: 'small', ...L.smallSeconds });
    subs.forEach((s) => S.push([s.key, circle(s.x, s.y, s.r)]));
    if (L.retro) S.push(['retro', arc(L.retro)]);
    if (L.pr) S.push(['pr', arc(L.pr)]);
    for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) if (gap(S[i][1], S[j][1]) < 0.4) bad.push(`${c.id} ${JSON.stringify({ chrono, calType, retro, central, pr })}: ${S[i][0]} x ${S[j][0]}`);
    if (L.moon) {   // a moon either stands alone or sits wholly inside a subdial
      const m = L.moon, dome = circle(m.x, m.y, m.R).filter((p) => p[1] <= m.y).concat([[m.x - m.R, m.y], [m.x + m.R, m.y]]);
      const host = subs.find((s) => Math.hypot(s.x - m.x, s.y - m.y) < s.r);
      if (host && dome.some((p) => Math.hypot(p[0] - host.x, p[1] - host.y) > host.r - 0.6)) bad.push(`${c.id}: moon pokes out of ${host.key}`);
      for (const [n, pts] of S) if ((!host || n !== (host.key)) && pts.some((p) => p[1] <= m.y && p[1] >= m.y - m.R && Math.hypot(p[0] - m.x, p[1] - m.y) < m.R)) bad.push(`${c.id} ${JSON.stringify({ chrono, calType, retro, central, pr })}: moon x ${n}`);
    }
  }
  expect(count).toBe(137);
  expect(bad).toEqual([]);
});

test('Window text stays inside its window', async ({ page }) => {
  await set(page, { config: 'complete', calType: 'perpetual', chrono: true, date: 27, day: 3, month: 8 });
  const over = await page.evaluate(() => [...document.querySelectorAll('#dial .dwintext')].filter((t) => t.getComputedTextLength() > +t.dataset.fit + 0.5 && !t.hasAttribute('textLength')).map((t) => t.textContent));
  expect(over).toEqual([]);
});

test('Set to now keeps every option', async ({ page }) => {
  await set(page, { config: 'complete', calType: 'perpetual', retro: true, pr: true, central: true, auto: true });
  await page.locator('#now').click();
  await expect(page.locator('#cal-perpetual')).toBeChecked();
  for (const id of ['#optRetro', '#optPR', '#optCentral', '#windAuto']) await expect(page.locator(id)).toBeChecked();
});

test('Match the real moon lands within half a day', async () => {
  const w = watch('datemoon', {}, { date: 8, month: 10, year: 2026, moonAge: 3 });
  w.matchMoon();
  const m = w.moonCheck(), d = Math.abs(m.shown - m.realAge);
  expect(Math.min(d, 29.5 - d)).toBeLessThanOrEqual(0.5 + 1e-6);
});

test('Crown back moves the moon one day', async () => {
  const w = watch('datemoon', {}, { moonAge: 3 }); w.setCrown(1);
  const m = w.cal.moon; w.turnCrown(-0.5); expect(w.cal.moon).toBe(m + 1);
});

test('The tour visits every part on this watch', async ({ page }) => {
  await set(page, { config: 'date', chrono: true });
  await page.locator('#tour').click();
  const n = await page.evaluate(() => window.CalibreGlossary.tourFor(window.__calibre.watch().features()).length);
  for (let i = 1; i < n; i++) await page.locator('#cardNext').click();
  const last = await page.evaluate(() => { const G = window.CalibreGlossary, t = G.tourFor(window.__calibre.watch().features()); return G.PARTS[t[t.length - 1]].name; });
  await expect(page.locator('#cardTitle')).toHaveText(last);
});

test('Explain mode opens a card for a part', async ({ page }) => {
  await page.locator('#helpMode').click();
  await page.locator('#plan g[data-part="escape"][role="button"]').first().click({ force: true });
  await expect(page.locator('#cardTitle')).toHaveText('Escape wheel');
});

test('Zoom buttons and presets frame the drawing', async ({ page }) => {
  const width = () => page.evaluate(() => document.getElementById('plan').viewBox.baseVal.width);
  await page.locator('#vFit').click(); const all = await width();
  await page.locator('#zoomIn').click(); expect(await width()).toBeLessThan(all);
  await page.locator('#vEsc').click(); expect(await width()).toBeLessThan(all / 2);
});

test('A pinch on a panel zooms the drawing and presses nothing', async ({ page }) => {
  const r = await page.evaluate(() => {
    const svg = document.getElementById('plan'), btn = document.getElementById('faster'), b = svg.getBoundingClientRect(), cy = b.top + b.height / 2, x = b.left + b.width / 2;
    const fire = (el, type, id, X) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: id, pointerType: 'touch', clientX: X, clientY: cy }));
    const before = svg.viewBox.baseVal.width, label = document.getElementById('speedLbl').textContent;
    fire(btn, 'pointerdown', 1, x - 40); fire(svg, 'pointerdown', 2, x + 40); fire(svg, 'pointermove', 2, x + 120);
    const after = svg.viewBox.baseVal.width; fire(svg, 'pointerup', 2, x + 120); fire(btn, 'pointerup', 1, x - 40); btn.click();
    return { before, after, same: document.getElementById('speedLbl').textContent === label };
  });
  expect(r.after).toBeLessThan(r.before / 1.5); expect(r.same).toBe(true);
});

const LABEL_WATCHES = [
  { config: 'complete', view: 'vFit' }, { config: 'dategmt', view: 'vFit' }, { config: 'date', calType: 'perpetual', retro: true, view: 'vFit' },
  { config: 'date', chrono: true, view: 'vFit' }, { config: 'date', central: true, view: 'vFit' }, { config: 'date', auto: true, pr: true, view: 'vFit' },
  { config: 'date', central: true, view: 'vChr' }, { config: 'date', chrono: true, view: 'vChr' }, { config: 'date', auto: true, view: 'vAuto' },
];

test('Every label points at its part', async ({ page }) => {
  for (const w of LABEL_WATCHES) for (const side of ['back', 'front']) {
    await open(page);
    await set(page, { ...w, side });
    const lost = await page.evaluate(() => {
      const out = [], grow = 3;
      for (const g of document.querySelectorAll('#plan .labels > g[data-part]')) {
        if (g.getAttribute('display') === 'none') continue;
        const k = g.dataset.part, d = g.querySelector('.leader-dot').getBoundingClientRect(), x = d.x + d.width / 2, y = d.y + d.height / 2;
        const keys = k === 'motionWorks' ? ['cannon', 'minuteWheel', 'hourWheel'] : [k];   // a label for a group of parts
        const hit = keys.flatMap((q) => [...document.querySelectorAll(`#plan > g:not(.labels) [data-part="${q}"]`)]).some((p) => { const r = p.getBoundingClientRect(); return r.width && x > r.left - grow && x < r.right + grow && y > r.top - grow && y < r.bottom + grow; });
        if (!hit) out.push(k);
      }
      return out;
    });
    expect(lost, JSON.stringify({ ...w, side })).toEqual([]);
  }
});

test('No label hides under the floating panel', async ({ page }) => {
  for (const w of [...LABEL_WATCHES, { config: 'date', chrono: true, view: 'vChr' }, { config: 'dategmt', side: 'front', view: 'vMw' }]) {
    await open(page);
    await set(page, w);
    const under = await page.evaluate(() => {
      const f = document.getElementById('face').getBoundingClientRect();
      return [...document.querySelectorAll('#plan .labels > g[data-part]')].filter((g) => g.getAttribute('display') !== 'none' && g.getAttribute('visibility') !== 'hidden').filter((g) => [...g.querySelectorAll('text')].some((t) => { const r = t.getBoundingClientRect(); return r.width && r.left < f.right && r.right > f.left && r.top < f.bottom && r.bottom > f.top; })).map((g) => g.dataset.part);
    });
    expect(under, JSON.stringify(w)).toEqual([]);
  }
});
