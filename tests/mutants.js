// Breaks a copy of the app one way at a time and checks a test notices. Run with `npm run test:mutants`.
// Only the claims and unit tests count: the help-picture fingerprints only say something changed, and these have to say what.
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
  ['chronograph minute hand backwards', 'js/view.js', '`rotate(${f4(-90 + sgn * r.chronoMinutes)})`', '`rotate(${f4(-90 - sgn * r.chronoMinutes)})`'],
  ['leap row runs off the dial', 'js/complications.js', '/ 2 - 3.8, y: mw.y1', '/ 2 + 6, y: mw.y1'],
  ['small moon pokes out of its subdial', 'js/complications.js', 'bottom: { y: 17, R: 5.2 }', 'bottom: { y: 15, R: 5.75 }'],
  ['day star on top of the moon wheel', 'js/complications.js', 'const dayTurn = 190;', 'const dayTurn = 0;'],
  ['Set to now drops options', 'js/view.js', '    for (const [k, v] of Object.entries(keep.opts)) W.setOption(k, v);\n', ''],
  ['retrograde scale wrong', 'js/complications.js', '/ 30; // retrograde', '/ 31; // retrograde'],
  ['retrograde hand reversed', 'js/dial.js', 'L.retro.a0 + (L.retro.a1 - L.retro.a0) * r.retroFraction', 'L.retro.a1 + (L.retro.a0 - L.retro.a1) * r.retroFraction'],
  ['annual calendar thinks February has 29', 'js/complications.js', 'if (type === "annual") return 30;', 'if (type === "annual") return 29;'],
  ['perpetual leap years wrong', 'js/complications.js', 'const leapJulian = y => y % 4 === 0;', 'const leapJulian = y => y % 4 === 1;'],
  ['simple date knows 30-day months', 'js/complications.js', 'if (type === "simple") return 31;', 'if (type === "simple") return GREG[m];'],
  ['standard chronograph resets while running', 'js/complications.js', '        if (!w.features().flyback) return false;\n', ''],
  ['flyback does not restart', 'js/complications.js', 'w.chrono.phi = RUNNER_BASE; w.chrono.running = false; engage(); w.chrono.flybacks++;', 'w.chrono.phi = RUNNER_BASE; w.chrono.running = false; w.chrono.flybacks++;'],
  ['minute counter too slow', 'js/complications.js', 'chronoMinutes: ((mins % 30) + mDrag) * 12,', 'chronoMinutes: ((mins % 30) + mDrag) * 6,'],
  ['hour counter runs 1 hour round', 'js/complications.js', 'chronoHours: (Epos % 43200) / 43200 * 360,', 'chronoHours: (Epos % 3600) / 3600 * 360,'],
  ['chronograph allowed with date and moon', 'js/complications.js', 'const CHRONO_OK = ["time", "date", "daydate", "dategmt", "complete"];', 'const CHRONO_OK = ["time", "date", "daydate", "datemoon", "dategmt", "complete"];'],
  ['retrograde allowed on a chronograph', 'js/complications.js', 'retro: !!c.date && !chronoOn,', 'retro: !!c.date,'],
  ['reserve hand reversed', 'js/dial.js', 'L.pr.a0 + (L.pr.a1 - L.pr.a0) * r.springFraction', 'L.pr.a1 + (L.pr.a0 - L.pr.a1) * r.springFraction * 0.5'],
  ['central seconds hand frozen', 'js/dial.js', '} else if (H.cs) rot(H.cs, r.secondsHand);', '} else if (H.cs) rot(H.cs, 0);'],
  ['small seconds kept with central seconds', 'js/complications.js', '} else if (!f.central) L.smallSeconds = { x: 0, y: 21, r: 10 };', '} else L.smallSeconds = { x: 0, y: 21, r: 10 };'],
  ['GMT hand turns twice a day', 'js/complications.js', '((H + w.cal.gmt * 3600) % DAY + DAY) % DAY / DAY * 360', '((H + w.cal.gmt * 3600) % DAY + DAY) % DAY / 43200 * 360'],
  ['GMT quick-set jumps two hours', 'js/complications.js', 'if (action === "gmt") w.cal.gmt = (w.cal.gmt + 1) % 24;', 'if (action === "gmt") w.cal.gmt = (w.cal.gmt + 2) % 24;'],
  ['rotor winds one way only', 'js/complications.js', 'wind(rt * barrelTurnsPerRotorTurn());', 'if (rotorDirection(w.opts.wrist, w.wall) > 0) wind(rt * barrelTurnsPerRotorTurn());'],
  ['desk work winds too much', 'js/complications.js', 'desk: { name: "Desk work", swings: [[5, 0.25, 0]', 'desk: { name: "Desk work", swings: [[50, 0.25, 0]'],
  ['bridle never slips', 'js/complications.js', '      if (turns > add) w.slipTurns += turns - add;\n', ''],
  ['rotor label points at nothing', 'js/view.js', 'X.auto.rotor[1] + X.auto.rotorR * 0.75]', 'X.auto.rotor[1] - X.auto.rotorR * 0.75]'],
  ['crown winds past full', 'js/complications.js', 'add = Math.min(room, turns);', 'add = turns;'],
  ['crown winds when turned back', 'js/complications.js', 'if (pos === 0) return dir > 0 ? "wind" : "slip";', 'if (pos === 0) return "wind";'],
  ['hands set ten minutes a tap', 'js/complications.js', 'w.offset += turns * hoursPerCrownTurn(P) * 3600;', 'w.offset += turns * hoursPerCrownTurn(P) * 7200;'],
  ['setting past midnight skips the date', 'js/complications.js', '        w.offset += turns * hoursPerCrownTurn(P) * 3600;\n        syncCalendar();', '        w.offset += turns * hoursPerCrownTurn(P) * 3600;'],
  ['no warning near midnight', 'js/complications.js', 'return h >= 21 || h < 3; };', 'return false; };'],
  ['time only gets a first click', 'js/complications.js', 'return (f.date || f.day || f.gmt) ? [0, 1, 2] : [0, 2];', 'return [0, 1, 2];'],
  ['week has six days', 'js/complications.js', 'n.day = (cal.day + 1) % 7;', 'n.day = (cal.day + 1) % 6;'],
  ['day disc printed backwards', 'js/parts.js', 'transform: `rotate(${f4(-90 + k * 360 / 7)})', 'transform: `rotate(${f4(-90 - k * 360 / 7)})'],
  ['month disc turns the wrong way', 'js/view.js', '`rotate(${f4(-r.month * 30)})`', '`rotate(${f4(r.month * 30)})`'],
  ['day corrector everywhere', 'js/complications.js', 'f.dayPusher = f.day && f.moon && !f.program;', 'f.dayPusher = f.day;'],
  ['correctors only on perpetual', 'js/view.js', '$("corrRow").hidden = !f.program;', '$("corrRow").hidden = !f.perpetual;'],
  ['rate always says exact', 'js/view.js', '$("rate").textContent = Math.abs(rate) < 1e-6 ?', '$("rate").textContent = Math.abs(rate) < 1e9 ?'],
  ['low-reserve bar never red', 'js/view.js', 'r.springFraction < 0.1', 'r.springFraction < 0'],
  ['spring lasts twice as long', 'js/complications.js', 'w.springLeft = Math.max(0, w.springLeft - run / p.barrel);', 'w.springLeft = Math.max(0, w.springLeft - run / p.barrel / 2);'],
  ['window text overflows', 'js/dial.js', 'if (w > +t.dataset.fit) {', 'if (false) {'],
  ['Match the real moon overshoots', 'js/complications.js', 'const n = w.moonCheck().steps;', 'const n = w.moonCheck().steps + 7;'],
  ['seconds label stops short of its part', 'js/view.js', 'c: X.chrono.runner, r: 0.6 },', 'c: X.chrono.runner, r: X.chrono.wheelR },'],
  ['labels hide under the panel', 'js/view.js', '        || (panel && box.x0 < panel.x1 && box.x1 > panel.x0 && box.y0 < panel.y1 && box.y1 > panel.y0));', '        );'],
  ['moon back moves two days', 'js/complications.js', 'if (action === "moon") w.cal.moon = (w.cal.moon + 1) % MOON_TEETH;', 'if (action === "moon") w.cal.moon = (w.cal.moon + 2) % MOON_TEETH;'],
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
  for (const cmd of ["node --test 'tests/*.test.js'", 'npx playwright test e2e/claims.spec.js --project=desktop --reporter=line']) {
    try { execSync(cmd, { cwd: dir, stdio: 'pipe', timeout: 180000 }); } catch (_) { caught = true; break; }
  }
  console.log(`${caught ? 'caught ' : 'MISSED '} ${name}`);
  if (!caught) missed++;
  fs.rmSync(dir, { recursive: true, force: true });
}
if (missed) { console.log(`\n${missed} not caught`); process.exit(1); }
console.log('\nall caught');
