# Calibre Bench

An interactive plan drawing of a mechanical watch movement, laid flat on millimeter paper. The going train, Swiss lever escapement, keyless works, motion works and calendar run live from a single number, the watch's time, and every part explains itself with sources.

**Live:** [corey.sciu.to/calibre-bench](https://corey.sciu.to/calibre-bench/)

Built with [Claude](https://claude.ai) and [Claude Code](https://claude.com/claude-code).

## What's in it

- **Going train and escapement.** Cycloidal wheels and pinions sized by module, a 15-tooth club-tooth escape wheel and pallet stones whose contact is solved geometrically (the wheel recoils slightly as a stone unlocks, and never passes through one), a balance at 18,000 to 36,000 A/h.
- **Winding and setting.** Crown with three positions, sliding pinion, setting lever and yoke as rigid parts, quick-set, hacking stop lever, power reserve.
- **Complications.** Date, day-date, moon phase, GMT, complete calendar; simple, annual and perpetual calendar types; retrograde date; central seconds; a 7750-style cam-operated chronograph with oscillating pinion (standard or flyback); automatic winding with reversing wheels; power reserve differential.
- **Explanations.** Hover for a part's name, press **?** and tap for the full card, or follow the power from the crown. Every statement is marked: a numbered source, *model value*, *worked out*, or *citation needed*.

Tooth counts and modules are illustrative, not taken from a real calibre. The app says so wherever it uses one.

## Running locally

No build step. Serve the folder over HTTP:

```bash
npm run serve        # python3 -m http.server 8094
```

## Tests

```bash
npm install && npx playwright install chromium
npm test             # unit tests, then browser tests
npm run test:unit    # Node's built-in runner, no install needed
npm run test:e2e     # Playwright
npm run screenshot   # refreshes preview.png
```

The unit tests (`tests/model.test.js`) back the app's "worked out … checked by the tests" claims: exact train ratios, half a tooth per beat, no tooth passing through a pallet stone, the date finger's timing, calendar month lengths, crown, chronograph and automatic-winding behavior, and that every citation in the glossary resolves.

## Layout

```
index.html            page shell and controls
css/style.css         styles (light and dark)
js/model.js           geometry and kinematics of the going train and escapement (pure, no DOM)
js/complications.js   the watch as a state machine, plus geometry for every zone (pure)
js/glossary.js        part and term explanations with sources (pure)
js/view.js            drawing the movement, controls, pan and zoom, info cards
js/parts.js           the complication parts (calendar, chronograph, automatic winding, ...)
js/dial.js            the dial and hands
```

## Deploying and versioning

Pushing to `main` deploys to GitHub Pages through `.github/workflows/deploy.yml`, which stamps `v1.<commit count>` into the header. Locally it reads `dev`.

## Credits

First built in a conversation with Claude on claude.ai, then reviewed, split into modules and tested. The explanations draw on the sources listed at the bottom of the page, including Bartosz Ciechanowski's [Mechanical Watch](https://ciechanow.ski/mechanical-watch/), Horopedia, Watches by SJX, Montres-Passion and Wikipedia. The drawing, model and explanations were written for this app, with each claim cited.

## License

MIT
