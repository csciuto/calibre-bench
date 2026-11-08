const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (e) => { throw e; });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await expect(page.locator('#plan [data-part]').first()).toBeAttached();
});

test('the watch runs and the hands read the time it was set to', async ({ page }) => {
  await page.evaluate(() => { window.__calibre.pause(); window.__calibre.setTime(3 * 3600 + 25 * 60 + 30); });
  await expect(page.locator('#handsRead')).toHaveText(/^03:25:3[01]$/);
});

test('explain mode: tapping a part opens its card with numbered sources', async ({ page }) => {
  await page.locator('#helpMode').click();
  await page.locator('#plan g[data-part="balance"][role="button"]').first().click({ force: true });
  await expect(page.locator('#card')).toBeVisible();
  await expect(page.locator('#cardTitle')).toHaveText('Balance');
  await expect(page.locator('#cardShort sup.cite a').first()).toHaveAttribute('href', /^https:/);
  await page.locator('#cardNext').click();
  await expect(page.locator('#cardTitle')).toHaveText('Hairspring');
  await page.keyboard.press('Escape');
  await expect(page.locator('#card')).toBeHidden();
});

test('pulling the crown out stops the watch', async ({ page }) => {
  await page.locator('#crownSeg label').filter({ hasText: 'Out' }).click();
  await expect(page.locator('#ampm')).toHaveText('Stopped: crown pulled out');
  await expect(page.locator('#crownHint')).toContainText('Pulled out');
});

test('a run-down watch says so, and Wind pushes the crown in and fills the spring', async ({ page }) => {
  const banner = page.locator('#faceDown');
  await expect(banner).toBeHidden();
  await page.locator('#crownSeg label').filter({ hasText: 'Out' }).click();
  await page.evaluate(() => { window.__calibre.watch().springLeft = 0.05; });
  await expect(page.locator('#reserveBar')).toHaveClass(/low/);
  await page.evaluate(() => { window.__calibre.watch().springLeft = 0; });
  await expect(banner).toBeVisible();
  await expect(banner).toContainText('Run down');
  await banner.getByRole('button', { name: 'Wind' }).click();
  await expect(banner).toBeHidden();
  await expect(page.locator('#crownSeg input[value="0"]')).toBeChecked();
  await expect(page.locator('#reserveBar')).not.toHaveClass(/low/);
  expect(await page.evaluate(() => window.__calibre.watch().springLeft)).toBeCloseTo(await page.evaluate(() => window.__calibre.params.springTurns), 5);
});

test('date and moon move the right way, and Front mirrors the moon', async ({ page }) => {
  await page.locator('label').filter({ hasText: 'Date + moon phase' }).first().click();
  const measure = () => page.evaluate(async () => {
    const W = window.__calibre.watch(), frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const mid = e => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; };
    const plan = document.getElementById('plan'), nums = [...plan.querySelectorAll('.ringnum')].filter(t => +t.getAttribute('font-size') > 0.6);
    const num = n => mid(nums.find(t => t.textContent === String(n)));
    const ring = mid(plan.querySelector('[data-part="dateRing"]'));
    W.cal.date = 14; await frame();
    const disc = plan.querySelector('[data-part="moonDisc"]'), hub = mid(disc.querySelector('.moonsky'));
    const topMoon = () => [...disc.querySelectorAll('.moonbody')].map(mid).sort((a, b) => a[1] - b[1])[0][0] - hub[0];
    const lit = document.querySelector('#dial .dmoonlit'), sky = document.querySelector('#dial .dmoondark');
    const [cx, cy, r] = ['cx', 'cy', 'r'].map(k => +sky.getAttribute(k));
    const sides = () => [lit.isPointInFill(new DOMPoint(cx + 0.7 * r, cy)), lit.isPointInFill(new DOMPoint(cx - 0.7 * r, cy))];
    W.cal.moon = 8; await frame(); const waxing = { x: topMoon(), lit: sides() };
    W.cal.moon = 22; await frame(); const waning = { x: topMoon(), lit: sides() };
    return { next: num(16)[1] - num(15)[1], windowX: num(15)[0] - ring[0], waxing, waning };
  });
  const back = await measure();
  expect(back.next, 'next date is below').toBeGreaterThan(0);
  expect(back.windowX, 'window on the left from the back').toBeLessThan(0);
  expect(back.waxing.x, 'the moon comes in from the right, seen from the back').toBeGreaterThan(0);
  await page.locator('#sideFront').click();
  const front = await measure();
  expect(front.next, 'next date is below').toBeGreaterThan(0);
  expect(front.windowX, 'window at 3 o\'clock').toBeGreaterThan(0);
  expect(front.waxing.x, 'the moon comes in from the left').toBeLessThan(0);
  expect(front.waning.x, 'and leaves on the right').toBeGreaterThan(0);
  expect(front.waxing.lit, 'lit on the right while waxing').toEqual([true, false]);
  expect(front.waning.lit, 'dark on the right while waning').toEqual([false, true]);
});

test('Face puts the dial on the drawing and Back returns it to the panel', async ({ page }) => {
  await expect(page.locator('#face #dial')).toBeAttached();
  await page.locator('#sideFace').click();
  await expect(page.locator('#plan #dial')).toBeVisible();
  await expect(page.locator('#face #dial')).toHaveCount(0);
  await expect(page.locator('#plan .labels')).toBeHidden();
  await expect(page.locator('#sideFace')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#sideBack').click();
  await expect(page.locator('#face #dial')).toBeVisible();
  await expect(page.locator('#plan #dial')).toHaveCount(0);
  await expect(page.locator('#plan .labels')).toBeVisible();
});

test('a pinch with one finger on a panel zooms the drawing and does not press the button', async ({ page }) => {
  const result = await page.evaluate(() => {
    const svg = document.getElementById('plan'), btn = document.getElementById('faster'), r = svg.getBoundingClientRect();
    const fire = (el, type, id, x, y) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: id, pointerType: 'touch', clientX: x, clientY: y }));
    const width = () => svg.viewBox.baseVal.width, before = width(), cy = r.top + r.height / 2;
    fire(btn, 'pointerdown', 1, r.left + r.width / 2 - 40, cy);
    fire(svg, 'pointerdown', 2, r.left + r.width / 2 + 40, cy);
    fire(svg, 'pointermove', 2, r.left + r.width / 2 + 120, cy);
    const zoomed = width();
    fire(svg, 'pointerup', 2, r.left + r.width / 2 + 120, cy);
    fire(btn, 'pointerup', 1, r.left + r.width / 2 - 40, cy);
    const speed = document.getElementById('speedLbl').textContent;
    btn.click();
    return { before, zoomed, same: document.getElementById('speedLbl').textContent === speed };
  });
  expect(result.zoomed).toBeLessThan(result.before / 1.5);
  expect(result.same).toBe(true);
});

test('chronograph: start, stop, reset', async ({ page }) => {
  await page.locator('label').filter({ hasText: 'Three-register' }).click();
  await expect(page.locator('#chronoRow')).toBeVisible();
  await page.locator('#chrStart').click();
  await page.waitForTimeout(1200);
  await page.locator('#chrStart').click();
  await expect(page.locator('#chrRead')).not.toHaveText('00:00:00.0');
  await page.locator('#chrReset').click();
  await expect(page.locator('#chrRead')).toHaveText('00:00:00.0');
});

test('perpetual calendar shows month correctors and a month-and-year window', async ({ page }) => {
  await page.locator('label').filter({ hasText: 'Perpetual' }).click();
  await expect(page.locator('#corrRow')).toBeVisible();
  await expect(page.locator('#corrYear')).toBeVisible();
  await expect(page.locator('#dial')).toHaveAttribute('aria-label', /year and leap-year cycle/);
});

test('every complication layout draws without errors', async ({ page }) => {
  const ids = await page.locator('#cfgRadios input').evaluateAll(els => els.map(e => e.id));
  for (const id of ids) {
    await page.locator('#' + id).check();
    await expect(page.locator('#dial circle').first()).toBeAttached();
  }
  await page.locator('#windAuto').check();
  await page.locator('#wrist-running').check();
  await page.locator('#optPR').check();
  await expect(page.locator('#plan [data-part="rotor"]').first()).toBeVisible();
});

test('sources list matches the glossary', async ({ page }) => {
  const n = await page.evaluate(() => Object.keys(window.CalibreGlossary.SOURCES).length);
  await expect(page.locator('#sourceList li')).toHaveCount(n);
});

test('version label is present', async ({ page }) => {
  await expect(page.locator('#version')).toHaveText(/^(dev|v1\.\d+)$/);
});

// Regression: between 1000 and ~1170 px wide the fit used the drawing's width to guess where the watch face
// sits, disagreed with the CSS breakpoint, and squeezed the movement into a strip at the top.
for (const width of [400, 1050, 1200, 1600]) {
  test(`the whole movement fills the drawing at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    await page.locator('#vFit').click();
    const fill = await page.evaluate(() => {
      const s = document.getElementById('plan').getBoundingClientRect();
      const b = document.querySelector('#plan [data-part="barrel"]').getBoundingClientRect();
      const bal = document.querySelector('#plan [data-part="balance"]').getBoundingClientRect();
      return (Math.max(b.right, bal.right) - Math.min(b.left, bal.left)) / s.width;
    });
    expect(fill).toBeGreaterThan(0.35);
  });
}
