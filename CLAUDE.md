# Calibre Bench

An interactive plan drawing of a mechanical watch movement. See README.md for what's in it.

Follows the app standards in [csciuto/app-template STANDARDS.md](https://github.com/csciuto/app-template/blob/main/STANDARDS.md).
Commit and push freely once tests pass.

## This app

- `js/model.js` and `js/complications.js` are the model (unit-tested in `tests/`); `js/view.js` draws, with `js/parts.js` (complication parts) and `js/dial.js` (dial and hands);
  `js/glossary.js` holds the part explanations and sources.
- Every statement in the app is marked: a numbered source, *model value*, *worked out*, or *citation needed*.
  Keep it that way. Tooth counts and modules are illustrative and the app says so.
- `.github/workflows/deploy.yml` runs the unit tests and the browser tests (desktop and phone, axe) and only
  then deploys, stamping `dev` in `#version`.
