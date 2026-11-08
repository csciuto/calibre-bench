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
