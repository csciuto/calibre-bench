const { test, expect } = require('@playwright/test');

// Smoke test: the app loads and draws the movement without JavaScript errors, in light and dark.
// `npm run screenshot` also saves preview.png, used for link previews and on https://corey.sciu.to/projects/.
for (const scheme of ['light', 'dark']) {
  test(`app loads without errors (${scheme})`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width: 1200, height: 630 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#plan [data-part="balance"]').first()).toBeVisible();
    await expect(page.locator('#handsRead')).not.toHaveText('--:--:--');
    expect(errors).toEqual([]);
    if (process.env.UPDATE_PREVIEW && scheme === 'light') {
      await page.evaluate(() => { window.__calibre.pause(); window.__calibre.setTime(10 * 3600 + 10 * 60 + 30); });
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'preview.png' });
    }
  });
}

test('contact and a link back to the projects page', async ({ page }) => {
  for (const p of ['/']) {
    await page.goto(p);
    await expect(page.getByText(/corey\.sciuto\+\w+@gmail\.com/).first()).toBeAttached();
    await expect(page.locator('a[href="https://corey.sciu.to/projects/"]').first()).toBeAttached();
  }
});
