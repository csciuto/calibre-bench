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
    const moon = document.querySelector('#dial .dmoonlit'), sky = document.querySelector('#dial .dmoonsky');
    const sides = () => {   // is more of the moon's right half showing than its left?
      const [cx, cy, r] = ['cx', 'cy', 'r'].map(k => +moon.getAttribute(k));
      let right = 0, left = 0;
      for (let i = 1; i <= 20; i++) for (let j = -20; j <= 20; j++) {
        const x = i / 20, y = j / 20; if (x * x + y * y > 1) continue;
        if (sky.isPointInFill(new DOMPoint(cx + x * r, cy + y * r))) right++;
        if (sky.isPointInFill(new DOMPoint(cx - x * r, cy + y * r))) left++;
      }
      return right > left;
    };
    W.cal.moon = 8; await frame(); const waxing = { x: topMoon(), lit: sides() };
    W.cal.moon = 22; await frame(); const waning = { x: topMoon(), lit: sides() };
    const m = nums[0].getScreenCTM();
    return { printMirrored: m.a * m.d - m.b * m.c < 0, next: num(16)[1] - num(15)[1], windowX: num(15)[0] - ring[0], waxing, waning };
  });
  const back = await measure();
  expect(back.printMirrored, 'dial-side printing reads backwards from the back').toBe(true);
  expect(back.next, 'next date is below').toBeGreaterThan(0);
  expect(back.windowX, 'window on the left from the back').toBeLessThan(0);
  expect(back.waxing.x, 'the moon comes in from the right, seen from the back').toBeGreaterThan(0);
  await page.locator('#sideFront').click();
  const front = await measure();
  expect(front.printMirrored, 'and reads true from the front').toBe(false);
  expect(front.next, 'next date is below').toBeGreaterThan(0);
  expect(front.windowX, 'window at 3 o\'clock').toBeGreaterThan(0);
  expect(front.waxing.x, 'the moon comes in from the left').toBeLessThan(0);
  expect(front.waning.x, 'and leaves on the right').toBeGreaterThan(0);
  expect(front.waxing.lit, 'right side shows first while waxing').toBe(true);
  expect(front.waning.lit, 'right side is covered first while waning').toBe(false);
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

test('the address follows the setup, and opening it restores the same watch @desktop', async ({ page, context }) => {
  await page.goto('/');
  await page.locator('#plan [data-part]').first().waitFor({ state: 'attached' });
  expect(new URL(page.url()).hash).toBe('');                       // the plain watch: a clean address
  await page.locator('#sideFront').click();
  await page.locator('#cfg-complete').check();
  await page.locator('#chrFly').check();
  await page.locator('#cal-perpetual').check();
  await page.locator('#windAuto').check();
  await page.locator('#bph').selectOption('36000');
  await expect.poll(() => new URL(page.url()).hash).toBe('#w=complete&chrono=flyback&cal=perpetual&auto&bph=36000&side=front');

  const other = await context.newPage();
  await other.goto(page.url());
  await other.locator('#plan [data-part]').first().waitFor({ state: 'attached' });
  await expect(other.locator('#cfg-complete')).toBeChecked();
  await expect(other.locator('#chrFly')).toBeChecked();
  await expect(other.locator('#cal-perpetual')).toBeChecked();
  await expect(other.locator('#windAuto')).toBeChecked();
  await expect(other.locator('#bph')).toHaveValue('36000');
  await expect(other.locator('#sideFront')).toHaveAttribute('aria-pressed', 'true');
  await expect(other.locator('.sub')).toContainText('36,000');
  expect(await other.evaluate(() => window.__calibre.params.bph)).toBe(36000);

  // back to the plain watch: a clean address again
  await other.locator('#sideBack').click();
  await other.locator('#cfg-date').check();
  await other.locator('#chrOff').check();
  await other.locator('#cal-simple').check();
  await other.locator('#windManual').check();
  await other.locator('#bph').selectOption('28800');
  await expect.poll(() => new URL(other.url()).hash).toBe('');
});

test('a link asking for something a layout cannot have opens as the nearest real watch @desktop', async ({ page }) => {
  await page.goto('/#w=time&retro&cal=perpetual&bph=1&side=upside-down');
  await page.locator('#plan [data-part]').first().waitFor({ state: 'attached' });
  await expect(page.locator('#cfg-time')).toBeChecked();
  await expect(page.locator('#optRetro')).not.toBeChecked();
  await expect(page.locator('#cal-simple')).toBeChecked();
  await expect(page.locator('#bph')).toHaveValue('28800');
  await expect.poll(() => new URL(page.url()).hash).toBe('#w=time');
});

test('the Back / Front / Face buttons stay clear of the watch face when the toolbar wraps @desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/#w=complete&chrono=flyback&auto');          // Chronograph and Winding buttons both showing
  await expect(page.locator('#vChr')).toBeVisible();
  await expect(page.locator('#vAuto')).toBeVisible();
  const box = async sel => page.locator(sel).boundingBox();
  const face = await box('#face');
  for (const id of ['#sideBack', '#sideFront', '#sideFace']) expect((await box(id)).y + (await box(id)).height, id).toBeLessThanOrEqual(face.y);
  await page.locator('#sideFront').click();
  await expect(page.locator('#sideFront')).toHaveAttribute('aria-pressed', 'true');
  // one row again: the face moves back up
  await page.goto('/#w=time');
  await expect.poll(async () => (await box('#face')).y).toBeLessThan(face.y);
});

test('the tick sound: off until asked for, three sounds a beat, quiet when the watch is stopped or run fast @desktop', async ({ page }) => {
  await page.goto('/');
  await page.locator('#plan [data-part]').first().waitFor({ state: 'attached' });
  const tick = page.locator('#tick'), count = () => page.evaluate(() => window.__calibre.sound.count);
  await expect(tick).toHaveAttribute('aria-pressed', 'false');
  await page.waitForTimeout(300);
  expect(await count()).toBe(0);
  await tick.click();
  await expect(tick).toHaveAttribute('aria-pressed', 'true');
  const before = await count();
  await page.waitForTimeout(1000);
  const perSecond = (await count()) - before;                  // 28,800 A/h: 8 beats a second, three sounds each
  expect(perSecond).toBeGreaterThan(18);
  expect(perSecond).toBeLessThan(30);
  // pulled crown: the watch stops, and so does the sound
  await page.locator('#crownSeg input[value="2"]').check({ force: true });
  await page.waitForTimeout(200);
  const stopped = await count();
  await page.waitForTimeout(400);
  expect(await count()).toBe(stopped);
  await page.locator('#crownSeg input[value="0"]').check({ force: true });
  // 60x: too fast to be ticks
  await page.locator('#faster').click();
  await page.waitForTimeout(200);
  const fast = await count();
  await page.waitForTimeout(400);
  expect(await count()).toBe(fast);
  // 1/5x: slower beats, still three sounds each
  await page.locator('#slower').click(); await page.locator('#slower').click();
  const slowFrom = await count();
  await page.waitForTimeout(1500);
  const slow = (await count()) - slowFrom;                     // 1.6 beats a second: about 7 sounds in 1.5 s
  expect(slow).toBeGreaterThan(3);
  expect(slow).toBeLessThan(12);
  await tick.click();
  await expect(tick).toHaveAttribute('aria-pressed', 'false');
});
