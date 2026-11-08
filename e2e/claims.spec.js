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
