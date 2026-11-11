// Calibre Bench sound: the tick, built from the three things that happen in the escapement each beat.
//
// Each sound is a few milliseconds of struck metal, made here from decaying tones and a little noise:
//   unlock   the impulse pin meets the fork and the locking stone starts to slide out: the faintest
//   impulse  the escape tooth lands on the stone's impulse face and pushes: louder
//   drop     the tooth leaves, and the next one falls onto the other stone: the loudest, the "tick"
// When they happen comes from the model (CalibreModel.tickSounds), so slowing the watch down pulls the
// three apart exactly as the drawing shows them.
//
// samples() is pure (no audio objects), so the tests can look at the waveforms.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CalibreSound = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  // [frequency Hz, level, time to fade to a third (ms)] for each ringing part; then noise level and its fade
  const RECIPES = {
    unlock:  { level: 0.22, tones: [[6900, 1.0, 0.7], [9800, 0.5, 0.4]], noise: [0.5, 0.35] },
    impulse: { level: 0.45, tones: [[4700, 1.0, 1.1], [7300, 0.5, 0.6], [2900, 0.3, 1.3]], noise: [0.5, 0.5] },
    drop:    { level: 1.00, tones: [[3300, 1.0, 1.9], [5600, 0.6, 1.0], [1750, 0.5, 2.6], [8900, 0.25, 0.5]], noise: [0.7, 0.7] },
  };
  const KINDS = Object.keys(RECIPES);
  const LENGTH_MS = 14;

  function random(seed) {        // small seeded generator: the same click every time
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  /** The waveform of one sound, as numbers between -1 and 1. */
  function samples(kind, sampleRate) {
    const r = RECIPES[kind], n = Math.round(sampleRate * LENGTH_MS / 1000), out = new Float32Array(n);
    const rand = random(KINDS.indexOf(kind) + 11);
    let peak = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate, ms = t * 1000;
      let v = (rand() * 2 - 1) * r.noise[0] * Math.exp(-ms / r.noise[1]);
      for (const [f, a, fade] of r.tones) v += a * Math.sin(2 * Math.PI * f * t) * Math.exp(-ms / fade);
      v *= Math.min(1, ms / 0.08);                       // a 0.08 ms rise: no click from the sample edge itself
      out[i] = v; peak = Math.max(peak, Math.abs(v));
    }
    for (let i = 0; i < n; i++) out[i] *= r.level / peak;
    return out;
  }

  /** A player on an AudioContext. play(kind, when) schedules one sound at audio time `when`. */
  function createPlayer(ctx, volume) {
    const out = ctx.createGain();
    out.gain.value = volume === undefined ? 0.6 : volume;
    out.connect(ctx.destination);
    const buffers = {};
    for (const kind of KINDS) {
      const data = samples(kind, ctx.sampleRate), buf = ctx.createBuffer(1, data.length, ctx.sampleRate);
      buf.copyToChannel(data, 0);
      buffers[kind] = buf;
    }
    return {
      play(kind, when) {
        const src = ctx.createBufferSource();
        src.buffer = buffers[kind];
        src.connect(out);
        src.start(Math.max(when, ctx.currentTime));
      },
    };
  }

  /**
   * Which sounds fall in the next stretch of watch time. Pure.
   * @param times     {unlock, impulse, drop}: seconds from the middle of a beat (CalibreModel.tickSounds)
   * @param beatsPerSec
   * @param from, to  watch time (s): sounds after `from`, up to and including `to`
   * @returns [{kind, at}] in time order; `at` is watch time
   */
  function due(times, beatsPerSec, from, to) {
    const list = [], reach = Math.max(Math.abs(times.unlock), Math.abs(times.drop));
    for (let k = Math.floor((from - reach) * beatsPerSec); k <= Math.ceil((to + reach) * beatsPerSec); k++) {
      for (const kind of KINDS) {
        const at = k / beatsPerSec + times[kind];
        if (at > from && at <= to) list.push({ kind, at });
      }
    }
    return list.sort((a, b) => a.at - b.at);
  }

  return { KINDS, LENGTH_MS, samples, createPlayer, due };
});
