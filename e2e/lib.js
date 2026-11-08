// Shared by the claims and help specs: a frozen watch in a known state, and a look at what actually got painted.
const NOON = new Date('2026-11-08T12:00:00Z');

async function open(page) {
  await page.clock.setFixedTime(NOON);
  await page.goto('/');
  await page.locator('#plan [data-part]').first().waitFor({ state: 'attached' });
  await page.evaluate(() => window.__calibre.pause());
}

// config, chrono, pr, side, view, then the watch's own state; time last, because setting it redraws
async function set(page, s) {
  await page.evaluate((s) => {
    const W = window.__calibre.watch(), click = (id) => document.getElementById(id).click();
    if (s.config) click('cfg-' + s.config);
    if (s.chrono) click('chrOn');
    if (s.pr) click('optPR');
    if (s.side) click('side' + s.side[0].toUpperCase() + s.side.slice(1));
    if (s.view) click(s.view);
    if (s.teeth != null) W.cal.moon = s.teeth;
    if (s.date != null) W.cal.date = s.date;
    if (s.spring != null) W.springLeft = s.spring;
    if (s.crown != null) document.querySelector(`#crownSeg input[value="${s.crown}"]`).click();
    window.__calibre.setTime(s.time != null ? s.time : 6.5 * 3600);
  }, s);
}

// Counts pixels in a screenshot of the locator: what a person would see, not what the DOM says.
async function countPixels(page, locator, test) {
  const png = (await locator.screenshot()).toString('base64');
  return page.evaluate(async ([png, test]) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + png; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data, f = new Function('r', 'g', 'b', 'first', 'return ' + test);
    const first = [d[0], d[1], d[2]]; let n = 0;
    for (let i = 0; i < d.length; i += 4) if (f(d[i], d[i + 1], d[i + 2], first)) n++;
    return { n, w: c.width, h: c.height };
  }, [png, test]);
}
const GOLD = 'r > 215 && g > 180 && g < 215 && b > 80 && b < 130';

module.exports = { open, set, countPixels, GOLD, NOON };
