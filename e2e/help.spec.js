// help.html shows pictures of the app. Each one is fingerprinted from exactly what was drawn, so if the app's drawing
// changes the picture is out of date and this fails until `npm run help:update` is run and the page looked at again.
const { test, expect } = require('@playwright/test');
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { open, set } = require('./lib');

const ROOT = path.join(__dirname, '..'), IMG = path.join(ROOT, 'help/img'), MANIFEST = path.join(ROOT, 'help/frames.json');
const UPDATE = !!process.env.UPDATE_HELP;
const WATCH = { config: 'datemoon', date: 7, time: 10 * 3600 + 8 * 60 + 30, spring: 5.2 };
const MOON_TEETH = [0, 4, 8, 11, 15, 19, 22, 26];
const DISC = '#plan [data-part="moonDisc"]';
const WINDOW = '#plan [data-part="dateRing"] > path.window';

const FRAMES = [
  { id: 'view-back', state: { ...WATCH, side: 'back', view: 'vFit' }, shots: [{ file: 'view-back', sel: '.stage' }] },
  { id: 'view-front', state: { ...WATCH, side: 'front', view: 'vFit' }, shots: [{ file: 'view-front', sel: '.stage' }] },
  { id: 'view-face', state: { ...WATCH, side: 'face' }, shots: [{ file: 'view-face', sel: '.stage' }] },
  ...MOON_TEETH.map((t) => ({ id: `moon-${t}`, state: { ...WATCH, side: 'front', view: 'vMw', teeth: t },
    shots: [{ file: `moon-dial-${t}`, sel: '#face #dial' }, { file: `moon-disc-${t}`, sel: DISC }] })),
  { id: 'moon-face', state: { ...WATCH, side: 'face', teeth: 15 }, shots: [{ file: 'moon-face', sel: '.stage' }] },
  { id: 'date-1', state: { ...WATCH, side: 'front', view: 'vMw', date: 14, time: 21 * 3600 }, shots: [{ file: 'date-1', around: WINDOW }] },
  { id: 'date-2', state: { ...WATCH, side: 'front', view: 'vMw', date: 14, time: 23.7 * 3600 }, shots: [{ file: 'date-2', around: WINDOW }] },
  { id: 'date-3', state: { ...WATCH, side: 'front', view: 'vMw', date: 15, time: 1200 }, shots: [{ file: 'date-3', around: WINDOW }] },
  { id: 'power-down', state: { ...WATCH, spring: 0 }, shots: [{ file: 'power-down', sel: '#face' }] },
  { id: 'crown-out', state: { ...WATCH, crown: 2 }, shots: [{ file: 'crown-out', sel: '#face' }] },
  ...Object.entries({
    time: { config: 'time' }, date: { config: 'date' }, daydate: { config: 'daydate', day: 3 }, dategmt: { config: 'dategmt' }, datemoon: { config: 'datemoon', teeth: 15 },
    complete: { config: 'complete', day: 3, month: 8, teeth: 11 }, annual: { config: 'date', calType: 'annual', month: 8 }, perpetual: { config: 'date', calType: 'perpetual', month: 8, year: 2028 },
    central: { config: 'date', central: true }, pr: { config: 'date', pr: true }, chrono: { config: 'date', chrono: true, running: true, elapsed: 754 },
    perpchrono: { config: 'complete', chrono: true, calType: 'perpetual', day: 3, month: 8, teeth: 11, year: 2028 },
  }).map(([k, st]) => ({ id: `dial-${k}`, state: { ...WATCH, ...st }, shots: [{ file: `dial-${k}`, sel: '#face #dial' }] })),
  ...[0, 9, 19, 30].map((d) => ({ id: `retro-${d}`, state: { ...WATCH, config: 'date', retro: true, date: d }, shots: [{ file: `retro-${d}`, sel: '#face #dial' }] })),
  { id: 'train', state: { ...WATCH, view: 'vEsc' }, shots: [{ file: 'train', sel: '.stage' }] },
  ...[0, 1, 2].map((c) => ({ id: `crown-${c}`, state: { ...WATCH, config: 'date', view: 'vMw', crown: c }, shots: [{ file: `crown-${c}`, around: '#plan > g [data-part="crown"]', pad: 150 }] })),
  { id: 'mech-gmt', state: { ...WATCH, config: 'dategmt', side: 'front', view: 'vMw' }, shots: [{ file: 'mech-gmt', sel: '.stage' }] },
  { id: 'mech-day', state: { ...WATCH, config: 'complete', day: 3, month: 8, teeth: 11, side: 'front', view: 'vMw' }, shots: [{ file: 'mech-day', sel: '.stage' }] },
  { id: 'mech-perpetual', state: { ...WATCH, config: 'date', calType: 'perpetual', retro: true, month: 8, year: 2028, view: 'vFit' }, shots: [{ file: 'mech-perpetual', sel: '.stage' }] },
  { id: 'mech-central', state: { ...WATCH, config: 'date', central: true, view: 'vChr' }, shots: [{ file: 'mech-central', sel: '.stage' }] },
  { id: 'chrono-reset', state: { ...WATCH, config: 'date', chrono: true, view: 'vChr' }, shots: [{ file: 'chrono-reset', sel: '.stage' }] },
  { id: 'chrono-running', state: { ...WATCH, config: 'date', chrono: true, running: true, elapsed: 754, view: 'vChr' }, shots: [{ file: 'chrono-running', sel: '.stage' }] },
  { id: 'chrono-stopped', state: { ...WATCH, config: 'date', chrono: true, stopped: true, elapsed: 754, view: 'vChr' }, shots: [{ file: 'chrono-stopped', sel: '.stage' }] },
  { id: 'mech-auto', state: { ...WATCH, auto: true, view: 'vAuto' }, shots: [{ file: 'mech-auto', sel: '.stage' }] },
  { id: 'mech-pr', state: { ...WATCH, config: 'date', pr: true, view: 'vAuto' }, shots: [{ file: 'mech-pr', sel: '.stage' }] },
];

// What was drawn, minus the few things that depend on the machine's fonts and window size.
const fingerprint = async (page) => {
  const drawn = await page.evaluate(() => {
    const plan = document.getElementById('plan').cloneNode(true);
    plan.removeAttribute('viewBox');
    for (const t of plan.querySelectorAll('.labels text')) for (const a of ['x', 'y', 'font-size']) t.removeAttribute(a);
    for (const g of plan.querySelectorAll('.labels g')) g.removeAttribute('visibility');
    const dial = document.getElementById('dial');
    return [plan.outerHTML, plan.contains(dial) ? '' : dial.outerHTML, document.getElementById('ampm').textContent, document.getElementById('faceDown').hidden].join('\n');
  });
  return crypto.createHash('sha256').update(drawn).update(fs.readFileSync(path.join(ROOT, 'css/style.css'))).digest('hex').slice(0, 16);
};

test.use({ deviceScaleFactor: 2, timezoneId: 'UTC', viewport: { width: 1280, height: 800 } });
const manifest = UPDATE ? {} : JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));

test.describe.configure({ mode: 'serial' });
for (const f of FRAMES) {
  test(`help images: ${f.id} @desktop`, async ({ page }) => {
    await open(page);
    await set(page, f.state);
    const print = await fingerprint(page);
    if (UPDATE) {
      for (const s of f.shots) {
        const file = path.join(IMG, s.file + '.png');
        if (s.sel) await page.locator(s.sel).first().screenshot({ path: file, scale: s.sel === '.stage' ? 'css' : 'device' });
        else {
          const b = await page.locator(s.around).first().boundingBox(), pad = s.pad || 90;
          await page.screenshot({ path: file, clip: { x: b.x + b.width / 2 - pad, y: b.y + b.height / 2 - pad, width: 2 * pad, height: 2 * pad } });
        }
      }
      manifest[f.id] = print;
      fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + '\n');
      return;
    }
    expect(print, `${f.id} no longer matches help.html. Run npm run help:update and look at the page again.`).toBe(manifest[f.id]);
    for (const s of f.shots) expect(fs.existsSync(path.join(IMG, s.file + '.png')), s.file).toBe(true);
  });
}

test('help page: every claim has a test and every picture exists @desktop', async () => {
  const html = fs.readFileSync(path.join(ROOT, 'help.html'), 'utf8'), spec = fs.readFileSync(path.join(__dirname, 'claims.spec.js'), 'utf8');
  const onPage = [...html.matchAll(/<li data-claim>([^<]+)<\/li>/g)].map((m) => m[1]).sort();
  const tested = [...spec.matchAll(/^test\('([^']+)'/gm)].map((m) => m[1]).sort();
  expect(onPage).toEqual(tested);
  for (const m of html.matchAll(/help\/img\/([\w-]+)\.png/g)) expect(fs.existsSync(path.join(IMG, m[1] + '.png')), m[1]).toBe(true);
  for (const m of html.matchAll(/data-frames="([^"]+)"/g)) for (const n of m[1].split(',')) expect(fs.existsSync(path.join(IMG, n + '.png')), n).toBe(true);
});
