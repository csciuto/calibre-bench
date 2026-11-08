// Breaks a copy of the app one way at a time and checks a test notices. Run with `npm run test:mutants`.
// The help-image fingerprints are left out on purpose: those only say something changed, and these have to say what.
const { execSync } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const ROOT = path.join(__dirname, '..');
const BREAKS = [
  ['dial moon has no size', 'js/dial.js', 'r: f4(m.R * CX.MOON_SIZE), class: "dmoonlit"', 'r: 0, class: "dmoonlit"'],
  ['dial moon not clipped to the aperture', 'js/dial.js', '"clip-path": "url(#dmoonclip)"', '"clip-path": "url(#nope)"'],
  ['aperture painted off the moon', 'js/dial.js', 'CX.moonAperture(m.R, m.x, m.y)', 'CX.moonAperture(m.R, m.x, m.y + 80)'],
  ['moon runs twice too fast', 'js/dial.js', '(180 + 180 * r.moonPhase)', '(180 + 360 * r.moonPhase)'],
  ['moon too big for the humps', 'js/complications.js', 'const MOON_ORBIT = 0.6, MOON_SIZE = 0.32;', 'const MOON_ORBIT = 0.6, MOON_SIZE = 0.55;'],
  ['moon orbit too small', 'js/complications.js', 'const MOON_ORBIT = 0.6, MOON_SIZE = 0.32;', 'const MOON_ORBIT = 0.4, MOON_SIZE = 0.32;'],
  ['moon wheel away from the aperture', 'js/complications.js', 'd.moonDisc = [G.mc[0], G.mc[1] + spot.y * d.dialScale];', 'd.moonDisc = [G.mc[0] + 2, G.mc[1] + spot.y * d.dialScale + 1];'],
  ['moon wheel turns backwards', 'js/view.js', 'R.moonDisc.setAttribute("transform", `rotate(${f4(-r.moonDisc)})`)', 'R.moonDisc.setAttribute("transform", `rotate(${f4(r.moonDisc)})`)'],
  ['moon wheel never rebuilt for the chronograph', 'js/view.js', 'if (spot && spot !== X.dial.moonSpot) rebuild();', ''],
  ['Face layer on the wrong side', 'js/view.js', 'x: -G.mc[0] - w / 2', 'x: G.mc[0] - w / 2'],
  ['Face layer invisible', 'css/style.css', '#plan #dial{pointer-events:none;opacity:.85}', '#plan #dial{pointer-events:none;opacity:0}'],
  ['Face layer blocks taps', 'css/style.css', '#plan #dial{pointer-events:none;', '#plan #dial{'],
  ['Front view not mirrored', 'js/view.js', 'R.scene.setAttribute("transform", flip);', 'R.scene.setAttribute("transform", "");'],
  ['run-down banner invisible', 'css/style.css', '.facedown{grid-area:msg;display:flex;', '.facedown{grid-area:msg;display:flex;opacity:0;'],
  ['dial date off by one', 'js/complications.js', 'dateShown: w.cal.date + 1', 'dateShown: w.cal.date + 2'],
  ['date window on the wrong side', 'js/parts.js', 'rectPath(-(d.ringOut + 0.05), -0.55, -(d.ringTeeth - 0.05), 0.55)', 'rectPath(d.ringTeeth - 0.05, -0.55, d.ringOut + 0.05, 0.55)'],
  ['dates printed the wrong way round', 'js/parts.js', 'const a = 180 - k * 360 / 31,', 'const a = 180 + k * 360 / 31,'],
  ['printing not mirrored from the back', 'js/parts.js', 'translate(${f4(rr)} 0) rotate(180) scale(-1 1)`', 'translate(${f4(rr)} 0) rotate(180)`'],
  ['printing not faded from the back', 'css/style.css', '#plan.fromback .moonbody{opacity:.45}', '#plan.fromback .moonbody{opacity:1}'],
  ['crown no longer stops the watch', 'js/complications.js', 'w.stopped = () => w.hacked() || w.springLeft <= 1e-9;', 'w.stopped = () => w.springLeft <= 1e-9;'],
];
const only = process.argv[2];
let missed = 0;
for (const [name, file, from, to] of BREAKS) {
  if (only && !name.includes(only)) continue;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'calibre-mutant-'));
  fs.cpSync(ROOT, dir, { recursive: true, filter: (p) => !/(^|\/)(node_modules|\.git|test-results|playwright-report)$/.test(p) });
  fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(dir, 'node_modules'));
  const f = path.join(dir, file), src = fs.readFileSync(f, 'utf8');
  if (src.split(from).length !== 2) { console.log(`STALE   ${name}: the code it breaks has moved`); missed++; continue; }
  fs.writeFileSync(f, src.replace(from, () => to));
  let caught = false;
  for (const cmd of ["node --test 'tests/*.test.js'", 'npx playwright test --project=desktop --grep-invert "help images" --reporter=line']) {
    try { execSync(cmd, { cwd: dir, stdio: 'pipe', timeout: 180000 }); } catch (_) { caught = true; break; }
  }
  console.log(`${caught ? 'caught ' : 'MISSED '} ${name}`);
  if (!caught) missed++;
  fs.rmSync(dir, { recursive: true, force: true });
}
if (missed) { console.log(`\n${missed} not caught`); process.exit(1); }
console.log('\nall caught');
