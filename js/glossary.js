// Glossary: plain-language explanations for every part and term, in two layers, with sources.
// `short` is for someone who has never opened a watch; `more` is for someone who wants to learn.
//
// Every statement carries a marker that says how we know it:
//   {{id,id}}   cited: ids are keys of SOURCES below
//   {{?}}       citation needed: we couldn't find a source, so treat it as unverified
//   {{model}}   a value chosen for this simulator (tooth counts, timings); not taken from a real calibre
//   {{calc}}    worked out from other facts here (arithmetic or geometry), and checked by the tests
//   {{app}}     a statement about this app, not about watches
//   {{obs}}     seen on a real watch by the project's author (a Sinn with a Valjoux 7750); first-hand, not published
// Part entries also carry live stats and links to the parts they touch. No DOM access.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CalibreGlossary = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const D2R = Math.PI / 180;

  const SOURCES = {
    ciech: { title: "Bartosz Ciechanowski, Mechanical Watch", url: "https://ciechanow.ski/mechanical-watch/" },
    eta28: { title: "ETA 2801-2 / 2836-2 parts catalogue (Cousins UK)", url: "https://www.cousinsuk.com/PDF/categories/29_ETA2801.2-ETA2836.2.pdf" },
    horoKeyless: { title: "Horopedia: Setting lever", url: "https://horopedia.org/setting-lever/" },
    horoDays: { title: "Horopedia: Days", url: "https://horopedia.org/days/" },
    horoBarrel: { title: "Horopedia: Power source (motor organ)", url: "https://horopedia.org/motor-organ-power-source/" },
    horoCenter: { title: "Horopedia: The centre wheel", url: "https://horopedia.org/centre-wheel/" },
    horoRetro: { title: "Horopedia: Retrograde display", url: "https://horopedia.org/?p=68989" },
    wikiLever: { title: "Wikipedia: Lever escapement", url: "https://en.wikipedia.org/wiki/Lever_escapement" },
    wikiBalSpring: { title: "Wikipedia: Balance spring", url: "https://en.wikipedia.org/wiki/Balance_spring" },
    wikiBalWheel: { title: "Wikipedia: Balance wheel", url: "https://en.wikipedia.org/wiki/Balance_wheel" },
    wikiTrain: { title: "Wikipedia: Wheel train", url: "https://en.wikipedia.org/wiki/Wheel_train" },
    wikiGear: { title: "Wikipedia: Gear", url: "https://en.wikipedia.org/wiki/Gear" },
    wikiAnnual: { title: "Wikipedia: Annual calendar", url: "https://en.wikipedia.org/wiki/Annual_calendar" },
    wikiAuto: { title: "Wikipedia: Automatic watch", url: "https://en.wikipedia.org/wiki/Automatic_watch" },
    wikiFlyback: { title: "Wikipedia: Flyback chronograph", url: "https://en.wikipedia.org/wiki/Flyback_chronograph" },
    wikiPR: { title: "Wikipedia: Power reserve indicator", url: "https://en.wikipedia.org/wiki/Power_reserve_indicator" },
    wikiDiff: { title: "Wikipedia: Differential (mechanical device)", url: "https://en.wikipedia.org/wiki/Differential_(mechanical_device)" },
    sjxGears: { title: "SJX: The science of gear tooth profiles", url: "https://watchesbysjx.com/2026/08/insight-watch-gears-and-profiles.html" },
    sjxKeyless: { title: "SJX: The keyless works", url: "https://watchesbysjx.com/2026/08/31" },
    sjxPerp: { title: "SJX: The MB&F LM Perpetual explained", url: "https://watchesbysjx.com/2024/06/mbf-legacy-machine-perpetual-lm-qp-explained.html" },
    sjxReset: { title: "SJX: The chronograph reset mechanism", url: "https://watchesbysjx.com/2025/02/chronograph-reset-mechanism-explained.html" },
    sjxWinding: { title: "SJX: Bidirectional versus unidirectional winding", url: "https://watchesbysjx.com/2026/07/automatic-winding-efficiency.html" },
    revOsc: { title: "Revolution: The oscillating pinion", url: "https://revolutionwatch.com/oscillating-pinion-the-unsung-chronograph-coupling-solution/" },
    revCam: { title: "Revolution: Column wheel and cam chronographs", url: "https://revolutionwatch.com/pocket-guide-column-cam-wheel-chronographs/" },
    mono7750: { title: "Monochrome: The Valjoux 7750", url: "https://monochrome-watches.com/valjoux-7750-chronograph-history-50-years-technical-explanation-evolution-clones-in-depth-review" },
    grail7753: { title: "Grail Watch Reference: ETA 7753", url: "https://reference.grail-watch.com/movement/eta-7753/" },
    grail7751: { title: "Grail Watch wiki: Valjoux 7751", url: "https://wiki.grail-watch.com/index.php/Valjoux_7751" },
    grailRef7751: { title: "Grail Watch Reference: ETA 7751", url: "https://reference.grail-watch.com/movement/eta-7751/" },
    union7751: { title: "Union Glashütte: Instructions for calibre U7751 (7751-based)", url: "https://www.union-glashuette.com/media/assets/usermanuals/U-7751-en.pdf" },
    horoMonth: { title: "Horopedia: Month", url: "https://horopedia.org/month/" },
    mpMoonSet: { title: "Montres-Passion: How to set a moonphase watch", url: "https://www.montres-passion.fr/?p=12555" },
    biwTissot: { title: "Brothers in Watches: Tissot moon phase model F356", url: "https://brothersinwatches.com/blogs/watch-reviews/deep-search-tissot-moon-phase-model-f356" },
    wwAtlantic: { title: "Worn & Wound: Atlantic Worldmaster Moonphase Chronograph", url: "https://wornandwound.com/quick-release/the-atlantic-worldmaster-moonphase-chronograph-is-a-celebration-of-classic-complications/" },
    grail2893: { title: "Grail Watch Reference: ETA 2893", url: "https://reference.grail-watch.com/2020/05/12/travel-time-trio-etas-calibre-2893/" },
    ccLift: { title: "Caliber Corner: Lift angle", url: "https://calibercorner.com/lift-angle/" },
    ccAmp: { title: "Caliber Corner: Amplitude", url: "https://calibercorner.com/amplitude/" },
    mpMoon: { title: "Montres-Passion: How a moon phase works", url: "https://www.montres-passion.fr/?p=12657" },
    mpPR: { title: "Montres-Passion: How a power reserve indicator works", url: "https://www.montres-passion.fr/?p=14433" },
    mpStop: { title: "Montres-Passion: How a stop-seconds mechanism works", url: "https://www.montres-passion.fr/?p=14762" },
    mpFly: { title: "Montres-Passion: How a flyback chronograph works", url: "https://www.montres-passion.fr/?p=12595" },
    wsDanger: { title: "Watchscanning: The date change danger zone", url: "https://www.watchscanning.com/guides/watch-date-change-danger-zone/" },
    wsSet: { title: "Watchscanning: How to set a watch", url: "https://www.watchscanning.com/guides/how-to-set-a-watch/" },
    hsCentral: { title: "Hourstriker: Center seconds gear train architectures", url: "https://www.hourstriker.com/learn/center-seconds-engineering-gear-train-architectures" },
    hsLever: { title: "Hourstriker: Lever escapement", url: "https://www.hourstriker.com/learn/lever-escapement-engineering-architecture-and-kinetic-cycles" },
    hsGMT: { title: "Hourstriker: GMT complication gear reduction", url: "https://www.hourstriker.com/learn/gmt-complication-kinematic-architecture-and-gear-reduction" },
    gpChrono: { title: "Gear Patrol: How to use a chronograph", url: "https://www.gearpatrol.com/watches/a33532749/how-to-use-a-chronograph-watch/" },
    wnwSZ01: { title: "WatchProSite: Worn & Wound on the SZ01 (7750-based)", url: "https://www.watchprosite.com/page-wf.forumpost/fi-17/ti-1151776/dv-true/wf.responses.open_bLoB_s-0/" },
    awciMinute: { title: "AWCI: Minute counter jumper springs", url: "https://www.awci.com/watchmaking-excellen/minute-counter-jumper-springs/" },
    abbeyPallets: { title: "Abbeyclock: Drawing the pallets (club-tooth escapement)", url: "https://www.abbeyclock.com/wxeb13.html" },
    horoSwissLever: { title: "Horopedia: Swiss lever escapement", url: "https://horopedia.org/swiss-lever-escapement/" },
    wrt7750walk: { title: "Watch Repair Talk: ETA 7750 service walkthrough", url: "https://www.watchrepairtalk.com/topic/2309-eta-7750-service-walkthrough-the-industry-standard-chronograph/" },
    wrt7750: { title: "Watch Repair Talk: The hour counter of an ETA 7750", url: "https://watchrepairtalk.com/topic/14731-the-inaccurate-alignment-of-the-hour-counter-of-an-eta-7750" },
    qpPerp: { title: "Quill & Pad: Perpetual calendars, what most don't do", url: "https://quillandpad.com/2024/03/10/perpetual-calendars-what-they-do-and-what-most-dont-do/" }
  };
  const MARKER_KINDS = {
    "?": { label: "citation needed", title: "We couldn't find a source for this. Treat it as unverified." },
    model: { label: "model value", title: "A value chosen for this simulator, not taken from a real calibre." },
    calc: { label: "worked out", title: "Calculated from other facts here (arithmetic or geometry) and checked by the tests." },
    app: { label: "about this app", title: "Describes this app, not watches in general." },
    obs: { label: "owner's observation", title: "Seen on a real watch (a Sinn with a Valjoux 7750) by the project's author. First-hand, not published." }
  };
  const MARKER_RE = /\{\{([^}]*)\}\}/g;
  // Split a glossary string into text and markers: [{ text }, { cite: [ids] } | { kind: "?" | "model" | "calc" | "app" }]
  function parse(str) {
    const out = []; let last = 0, m;
    MARKER_RE.lastIndex = 0;
    while ((m = MARKER_RE.exec(str))) {
      if (m.index > last) out.push({ text: str.slice(last, m.index) });
      // a marker can mix sources and kinds, e.g. {{awciMinute,obs}}: sources first, then the kinds
      const ids = m[1].split(",").map(s => s.trim()).filter(Boolean);
      const cites = ids.filter(id => !MARKER_KINDS[id]), kinds = ids.filter(id => MARKER_KINDS[id]);
      if (cites.length) out.push({ cite: cites });
      for (const k of kinds) out.push({ kind: k });
      last = MARKER_RE.lastIndex;
    }
    if (last < str.length) out.push({ text: str.slice(last) });
    return out;
  }
  // The same string with the markers taken out (for tooltips and screen-reader labels)
  const plain = str => str.replace(MARKER_RE, "").replace(/\s+([.,;:])/g, "$1").replace(/\s{2,}/g, " ").trim();

  function fmtDur(s) {
    if (s < 120) return (s < 10 ? s.toFixed(2) : s.toFixed(1)) + " s";
    if (s < 7200) return (s / 60).toFixed(Math.abs(s % 60) < 1e-9 ? 0 : 2) + " min";
    const h = s / 3600;
    return h.toFixed(Math.abs(h - Math.round(h)) < 1e-9 ? 0 : 2) + " h";
  }
  const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const pad2 = n => String(Math.floor(n)).padStart(2, "0");
  const fmtClock = s => `${pad2(s / 3600)}:${pad2(s % 3600 / 60)}`;
  const fmtChrono = s => `${pad2(s / 3600)}:${pad2(s % 3600 / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
  function phaseName(p) {
    const names = ["New moon", "Waxing crescent", "First quarter", "Waxing gibbous", "Full moon", "Waning gibbous", "Last quarter", "Waning crescent"];
    return names[Math.round(p * 8) % 8];
  }
  const wrap = a => ((a % 360) + 360) % 360;
  const deg = (a, dp = 0) => a.toFixed(dp) + "°";

  // ctx = { P, G, X, CX, w, r, st, per, ref }. Stats are live numbers from the model; tooth counts are model values.
  const PARTS = {
    barrel: {
      name: "Barrel", kind: "Power",
      short: "A drum holding the coiled mainspring {{horoBarrel}}. As the spring unwinds it turns the drum, and the drum's teeth drive the rest of the watch {{horoBarrel}}.",
      more: [
        "The inner end of the mainspring hooks onto the barrel's central arbor, and the outer end is fixed to the inside wall of the drum {{horoBarrel,ciech}}. Winding turns the arbor through the ratchet wheel on top {{horoBarrel}}.",
        "The train speeds up the slow, strong turning of the mainspring {{wikiTrain}}, so the barrel is the slowest wheel and each mesh after it trades force for speed {{calc}}.",
        "Power reserve here is one barrel turn's time multiplied by the turns the spring can unwind {{calc}}; the 6.5 turns are a model value {{model}}."
      ],
      rel: [["drives", "center"], ["wound through", "ratchet"], ["read by", "prDiff"]],
      stats: ({ P, per }) => [["Teeth", P.teeth.barrel, "wheel"], ["Module", P.modules.bc + " mm", "module"],
        ["One turn", fmtDur(per.barrel), "period"], ["Power reserve", (per.barrel * P.springTurns / 3600).toFixed(1) + " h", "powerReserve"]]
    },
    center: {
      name: "Center wheel", kind: "Going train",
      short: "Turns exactly once an hour, and the minute hand rides on it {{horoCenter,wikiTrain}}.",
      more: [
        "It usually sits in the middle of the main plate, so its axle can pass through the movement to the dial {{horoCenter}}. The barrel's teeth drive its pinion {{horoBarrel}}; its wheel drives the third wheel {{wikiTrain}}.",
        "Because one turn must take exactly an hour {{horoCenter}}, every ratio between here and the escapement has to make that true {{calc}}. Change any tooth count and the table flags it {{app}}."
      ],
      rel: [["driven by", "barrel"], ["drives", "third"], ["carries", "cannon"]],
      stats: ({ P, G, per }) => [["Pinion / wheel", `${P.teeth.centerP} / ${P.teeth.centerW}`, "pinion"],
        ["One turn", fmtDur(per.center), "period"], ["Speed-up from barrel", (P.teeth.barrel / P.teeth.centerP).toFixed(1) + "×", "ratio"],
        ["Distance to barrel", G.cd.bc.toFixed(3) + " mm", "module"]]
    },
    third: {
      name: "Third wheel", kind: "Going train",
      short: "A middle step between the center wheel and the fourth wheel {{wikiTrain}}.",
      more: [
        "Each time a wheel drives a smaller pinion, the speed goes up {{ciech}}. Center wheel to fourth wheel needs a 60× speed-up {{calc}}, and here the third wheel splits it: 80 ÷ 10 = 8×, then 75 ÷ 10 = 7.5× {{model}}.",
        "It's called the third wheel because the barrel counts as the first {{wikiTrain}}."
      ],
      rel: [["driven by", "center"], ["drives", "fourth"]],
      stats: ({ P, per }) => [["Pinion / wheel", `${P.teeth.thirdP} / ${P.teeth.thirdW}`, "pinion"],
        ["One turn", fmtDur(per.third), "period"], ["Speed-up from center", (P.teeth.centerW / P.teeth.thirdP).toFixed(2) + "×", "ratio"]]
    },
    fourth: {
      name: "Fourth wheel", kind: "Going train",
      short: "Turns once a minute, so the small seconds hand is mounted on it {{ciech,wikiTrain}}.",
      more: [
        "A seconds hand in the middle of the dial needs either extra wheels to carry this motion to the center, or a train laid out with the fourth wheel in the center {{wikiTrain,hsCentral}}.",
        "Its wheel drives the escape wheel's pinion {{wikiTrain}}. On a 7750-style chronograph, the oscillating pinion also meshes it directly {{revOsc}}."
      ],
      rel: [["driven by", "third"], ["drives", "escape"], ["drives", "oscPinion"], ["carries", "secondsDrive"]],
      stats: ({ P, per, st, ref }) => [["Pinion / wheel", `${P.teeth.fourthP} / ${P.teeth.fourthW}`, "pinion"],
        ["One turn", fmtDur(per.fourth), "period"], ["Seconds hand at", (wrap(Math.abs(st.fourth - ref.fourth)) / 6).toFixed(3) + " s"]]
    },
    escape: {
      name: "Escape wheel", kind: "Escapement",
      short: "The wheel with oddly shaped teeth that lets the spring's energy out one tooth at a time {{ciech,wikiTrain}}.",
      more: [
        "In the Swiss lever escapement its teeth are club-shaped {{wikiLever,hsLever}}. Two ruby pallet stones on the lever catch them in turn {{ciech,wikiLever}}. With 15 teeth, 24° apart, each beat lets the wheel turn half that: 12° {{wikiLever}}.",
        "As a tooth slides over a pallet's slanted face it gives the lever a push, which the lever passes to the balance {{wikiLever}}. That push is what keeps the balance swinging {{wikiTrain}}.",
        "Each 12° beat splits into 8° across the pallet stone, 2° across the tooth's own sloping face, and 2° of drop {{abbeyPallets}}. On the club tooth that face rises from the toe, which locks, back to the heel {{abbeyPallets,model}}; the front of the tooth is cut back steeply so the stone can lock against the toe {{model}}.",
        "The wheel's angle here comes from contact: the mainspring pushes it as far as the stones let it, traced as the lever swings {{app}}. So it recoils slightly as a stone unlocks: 0.05 to 0.2° here {{calc}}, against the 0.25° or so Horopedia gives as typical {{horoSwissLever}}. Tests check that no tooth ever passes through a stone {{calc}}."
      ],
      rel: [["driven by", "fourth"], ["held by", "lever"]],
      stats: ({ P, per, st }) => [["Teeth / pinion", `${P.teeth.esc} / ${P.teeth.escP}`, "pinion"],
        ["One turn", fmtDur(per.esc), "period"], ["Moves per beat", deg(180 / P.teeth.esc), "beat"],
        ["State now", st.inLift ? "moving (impulse)" : "locked", "beat"]]
    },
    lever: {
      name: "Pallet lever", kind: "Escapement",
      short: "A rocking lever that holds the escape wheel still, lets one tooth go each beat, and passes a small push to the balance {{wikiLever,ciech}}.",
      more: [
        "Its two ruby stones, the entrance and exit pallets, take turns locking a tooth {{wikiLever}}. As the balance swings through the middle, the ruby impulse pin on its roller enters the lever's fork and flips it {{wikiLever,ciech}}.",
        "The lever rocks between two banking pins {{wikiLever}}. The balance only touches it briefly and swings free for most of its swing, which is what 'detached' means {{wikiLever}}.",
        "The pallet pivot sits where lines from it touch the escape wheel's tip circle 60° apart, so the stones span 2½ teeth {{abbeyPallets}}; there, swinging the lever moves the stones straight in and out of the teeth {{calc}}. Each stone covers 8° of the wheel {{abbeyPallets}}.",
        "Each stone's locking face leans so the tooth pulls it deeper into lock, which is called draw {{abbeyPallets}}; 12° here {{model}}. Of the lever's swing, 1.5° is lock and about 7° is lift on the stone {{model}}."
      ],
      rel: [["holds", "escape"], ["flipped by", "balance"]],
      stats: ({ G, st }) => [["Swing", "±" + (G.L / D2R).toFixed(1) + "°", "lift"],
        ["Angle now", (st.lever / D2R).toFixed(2) + "°"],
        ["Holding", st.inLift ? "nothing, tooth passing" : (Math.round(st.steps) % 2 === 0 ? "entry stone" : "exit stone"), "beat"]]
    },
    balance: {
      name: "Balance", kind: "Regulator",
      short: "The watch's timekeeper {{wikiBalWheel}}. A weighted wheel that, with its hairspring, swings back and forth at a steady rate {{wikiBalWheel}}.",
      more: [
        "The balance and hairspring form a harmonic oscillator {{wikiBalWheel}}, and ideally its period doesn't depend on how far it swings {{wikiBalSpring}}. Everything else in the watch counts its swings {{ciech}}.",
        "At 28,800 beats an hour it makes 4 full back-and-forth swings a second, which is 8 beats {{ciech}}. Weight screws on the rim can adjust its poise and rate {{wikiBalWheel}}.",
        "The ruby pin on its roller is what flips the lever each time the balance passes through the middle {{ciech,wikiLever}}."
      ],
      rel: [["kept in step by", "hairspring"], ["flips", "lever"], ["stopped by", "stopLever"]],
      stats: ({ P, st }) => [["Frequency", (P.bph / 7200).toFixed(1) + " Hz", "bph"], ["Beats per hour", P.bph.toLocaleString("en-US"), "bph"],
        ["Amplitude", deg(P.amplitude), "amplitude"], ["Angle now", deg(st.theta)], ["Beats so far", st.beat.toLocaleString("en-US"), "beat"]]
    },
    hairspring: {
      name: "Hairspring", kind: "Regulator",
      short: "A thin spiral spring, also called the balance spring, that keeps pulling the balance back to center {{ciech,wikiBalSpring}}.",
      more: [
        "The period of the swing is set by the spring's stiffness together with the balance's moment of inertia {{wikiBalSpring}}. For an ideal torsion oscillator that's T = 2π√(I/κ) {{?}}.",
        "The outer end is held by a stud on the balance cock {{wikiBalSpring}}, and the inner end turns with the balance {{ciech}}, so you can watch the coils open and close {{app}}."
      ],
      rel: [["regulates", "balance"]],
      stats: ({ P }) => [["One swing", (1 / (P.bph / 7200)).toFixed(3) + " s", "bph"], ["Coils drawn", "11"]]
    },
    motionWorks: {
      name: "Motion works", kind: "Dial side",
      short: "The small gears under the dial that turn the minute hand's hourly turn into the hour hand's 12-hour turn {{ciech}}.",
      more: [
        "The cannon pinion drives the minute wheel, and the minute wheel's pinion drives the hour wheel {{ciech}}. Here that's 12 into 36 (3:1), then 10 into 40 (4:1) {{model}}, and 3 × 4 = 12 {{calc}}.",
        "The hour wheel sits on the same center as the cannon pinion, so both pairs must span the same distance; that's why the second pair uses a slightly different tooth size here {{calc}}."
      ],
      rel: [["includes", "cannon"], ["includes", "minuteWheel"], ["includes", "hourWheel"]],
      stats: ({ P, G }) => [["Reduction", `${P.teeth.minuteW / P.teeth.cannon} × ${P.teeth.hourW / P.teeth.minuteP} = ${(P.teeth.minuteW / P.teeth.cannon * P.teeth.hourW / P.teeth.minuteP).toFixed(2)} : 1`, "ratio"],
        ["Pair spacing", `${G.cd.cm.toFixed(3)} mm = ${G.cd.mh.toFixed(3)} mm`, "module"]]
    },
    cannon: {
      name: "Cannon pinion", kind: "Dial side",
      short: "A small gear on the center wheel's axle that carries the minute hand {{wikiTrain,ciech}}.",
      more: [
        "It's held by friction, so when you set the time it can slip instead of forcing the whole train round {{ciech,wikiTrain}}.",
        "It drives the minute wheel, the first step down toward the hour hand {{ciech}}."
      ],
      rel: [["rides on", "center"], ["drives", "minuteWheel"]],
      stats: ({ P, per }) => [["Leaves", P.teeth.cannon, "pinion"], ["Module", P.modules.cm + " mm", "module"], ["One turn", fmtDur(per.center), "period"]]
    },
    minuteWheel: {
      name: "Minute wheel", kind: "Dial side",
      short: "Slows the motion down on its way to the hour hand {{ciech}}.",
      more: [
        "The cannon pinion drives it, and its own pinion drives the hour wheel {{ciech}}. When the crown is pulled out, the setting wheel turns it {{ciech}}.",
        "Its pinion's tooth size is solved so the hour wheel lands exactly on the center {{calc}}."
      ],
      rel: [["driven by", "cannon"], ["drives", "hourWheel"], ["set by", "settingWheel"]],
      stats: ({ P, G, per }) => [["Pinion / wheel", `${P.teeth.minuteP} / ${P.teeth.minuteW}`, "pinion"],
        ["Pinion module", G.mpMod.toFixed(4) + " mm", "module"], ["One turn", fmtDur(per.minute), "period"]]
    },
    hourWheel: {
      name: "Hour wheel", kind: "Dial side",
      short: "Turns 12 times slower than the minute hand, and carries the hour hand {{ciech}}.",
      more: ["It shares the center with the cannon pinion, so the hour and minute hands turn about the same point {{ciech}}. On calendar and GMT watches it also drives the wheels that work them {{horoDays,hsGMT}}."],
      rel: [["driven by", "minuteWheel"], ["drives", "driver24"], ["drives", "gmtInter"]],
      stats: ({ P, per }) => [["Teeth", P.teeth.hourW, "wheel"], ["One turn", fmtDur(per.hour), "period"]]
    },
    // ---------- winding and setting ----------
    crown: {
      name: "Crown", kind: "Winding and setting",
      short: "The knob on the side of the case {{wsSet}}. Turn it to wind; pull it out a click or two to set the date and time {{wsSet,horoKeyless}}.",
      more: [
        "Pushed in, turning it clockwise winds the mainspring {{wsSet}}. Turning it the other way slips, because the sliding pinion ratchets over the teeth it drives {{sjxKeyless}}.",
        "At the first click it sets the date, and the day if there is one {{wsSet}}; on a GMT watch like the ETA 2893-2 it quick-sets the 24-hour hand {{grail2893}}. On many moon-phase watches one direction sets the date and the other the moon {{mpMoonSet,union7751}}.",
        "Pulled all the way out it sets the hands {{wsSet,horoKeyless}}, and on many watches it also stops the seconds, which is called hacking {{wsSet}}.",
        "Tap the crown in the drawing to pull it out one click; tap it at the last click to push it home {{app}}. Drag it up or down, or scroll over it, to turn it {{app}}."
      ],
      rel: [["turns", "slidingPinion"], ["positions", "settingLever"]],
      stats: ({ w, CX, P }) => {
        const f = w.features(), q = CX.quickSet(f), names = { date: "date +1", day: "day +1", gmt: "GMT hand +1 h", calday: "calendar +1 day", moon: "moon +1 day", none: "nothing" };
        const now = w.crownPos === 0 ? "winds / slips back" : w.crownPos === 1 ? `${names[q.fwd] || "nothing"} / ${names[q.back] || "nothing"}` : "moves the hands";
        return [["Position", ["pushed in", "first click", "pulled out"][w.crownPos], "crownPositions"], ["Turn forward / back", now],
          ["Turns for a full wind", (P.springTurns / CX.barrelTurnsPerCrownTurn()).toFixed(1)], ["Time per turn when setting", CX.hoursPerCrownTurn(P).toFixed(2) + " h"]];
      }
    },
    windingPinion: {
      name: "Winding pinion", kind: "Winding and setting",
      short: "A toothed collar that turns freely on the stem {{ciech}}. When you wind, it turns the crown wheel {{ciech}}.",
      more: [
        "Its hole is round, so it can spin on the stem {{ciech}}. In winding position the sliding pinion engages it {{horoKeyless}} through angled teeth on their facing ends {{sjxKeyless}}.",
        "Those teeth only grip one way: turned backwards, the sliding pinion ratchets over them {{sjxKeyless}}."
      ],
      rel: [["turned by", "slidingPinion"], ["drives", "crownWheel"]],
      stats: ({ CX, w }) => [["Teeth", CX.KEYLESS.windPinion, "pinion"], ["Turning now", w.crownPos === 0 ? "when you wind" : "no, disconnected"]]
    },
    slidingPinion: {
      name: "Sliding pinion", kind: "Winding and setting",
      short: "A sleeve that turns with the stem and slides along it {{ciech}}. Where it sits decides whether the crown winds or sets {{ciech,horoKeyless}}.",
      more: [
        "Its square hole fits the stem's square section, so it always turns with the crown {{ciech,horoKeyless}}.",
        "Pulling the crown pivots the setting lever, which pushes the yoke, which slides the pinion from the winding pinion to the setting train {{horoKeyless,ciech}}. Its position at the middle click, for the quick-set, follows the same idea {{?}}."
      ],
      rel: [["turned by", "crown"], ["turns", "windingPinion"], ["moved by", "settingLever"], ["drives", "settingWheel"], ["drives", "quickSet"]],
      stats: ({ w, CX }) => [["Meshing with", ["winding pinion", "quick-set wheel", "setting wheel"][w.crownPos]], ["Teeth", CX.KEYLESS.slidingPinion, "pinion"]]
    },
    crownWheel: {
      name: "Crown wheel", kind: "Winding and setting",
      short: "When you wind, it passes the crown's turning on to the ratchet wheel on the barrel {{ciech,horoKeyless}}.",
      more: [
        "It's drawn here beside the stem so you can see it mesh; the dashed line shows that it really drives the ratchet on the barrel {{app}}. Where it sits in a real movement varies {{?}}.",
        "It changes the direction of the motion but, as an idler, not the overall ratio {{calc}}."
      ],
      rel: [["driven by", "windingPinion"], ["drives", "ratchet"]],
      stats: ({ CX }) => [["Teeth", CX.KEYLESS.crownWheel, "wheel"], ["Turns", "only while winding"]]
    },
    ratchet: {
      name: "Ratchet wheel", kind: "Power",
      short: "Sits on top of the barrel {{horoBarrel}}. Winding turns it, which tightens the mainspring, and a click stops it turning back {{horoBarrel,ciech}}.",
      more: [
        "It fits on a square at the end of the barrel arbor {{horoBarrel}}, which holds the inner end of the mainspring {{horoBarrel}}.",
        "The click is the part that lets it turn only one way; it's named for the sound it makes {{ciech}}."
      ],
      rel: [["turned by", "crownWheel"], ["winds", "barrel"], ["turned by", "autoReduction"], ["read by", "prDiff"]],
      stats: ({ CX, P, w }) => [["Teeth", CX.KEYLESS.ratchet, "wheel"], ["Barrel turns per crown turn", CX.barrelTurnsPerCrownTurn().toFixed(3)],
        ["Spring wound", (w.springLeft / P.springTurns * 100).toFixed(0) + "%", "powerReserve"]]
    },
    settingLever: {
      name: "Setting lever", kind: "Winding and setting",
      short: "A lever that pivots when you pull the crown, and moves the parts that decide what the crown turns {{horoKeyless,ciech}}.",
      more: [
        "The yoke rides in a groove on the sliding pinion, so moving the yoke moves the pinion {{ciech,horoKeyless}}. ETA lists a combined setting lever jumper among the parts {{eta28}}; that's what gives the clicks you feel {{?}}.",
        "Pulling the stem turns the lever; an inclined plane on it pushes the yoke toward the center, and a spring keeps the yoke pressed against that plane {{horoKeyless}}. Here both are drawn as rigid parts on their pivots: the lever's pin stays in the stem's groove, the yoke's fork in the pinion's groove, and the plane is shaped so the yoke's follower rests on it at each click {{model}}. The tests check all three contacts {{calc}}."
      ],
      rel: [["moved by", "crown"], ["shifts", "slidingPinion"], ["selects", "settingWheel"], ["selects", "quickSet"]],
      stats: ({ w, CX }) => [["Crown position", ["pushed in", "first click", "pulled out"][w.crownPos], "crownPositions"], ["Clicks on this watch", String(CX.crownPositions(w.features()).length)]]
    },
    settingWheel: {
      name: "Setting wheel", kind: "Winding and setting",
      short: "With the crown pulled out, it connects the crown to the hands {{ciech}}.",
      more: [
        "It engages the minute works, so turning the crown turns the minute and hour hands {{ciech}}, while the cannon pinion slips on its friction fit {{ciech}}.",
        "One turn of the crown moves the hands one hour here {{model}}."
      ],
      rel: [["driven by", "slidingPinion"], ["turns", "minuteWheel"]],
      stats: ({ CX, w }) => [["Teeth", CX.KEYLESS.settingWheel, "wheel"], ["Engaged", w.crownPos === 2 ? "yes" : "no"]]
    },
    quickSet: {
      name: "Quick-set (corrector)", kind: "Winding and setting", needs: "quick",
      short: "At the crown's first click, it jumps the date, the day or the GMT hand without moving the hands {{wsSet,grail2893}}. On a moon-phase watch, turning the other way moves the moon {{mpMoonSet,union7751}}.",
      more: [
        "ETA's calendar movements list date and day correctors and a double corrector {{eta28}}. On many day-dates, clockwise sets the date and counterclockwise the day, though it varies by movement {{wsSet}}.",
        "Avoid quick-setting from about 9 pm to 3 am, when the date-change wheels are already engaged; forcing them can damage teeth {{wsDanger}}. For the Valjoux 7750, Monochrome gives 8 pm to 2 am {{mono7750}}."
      ],
      rel: [["driven by", "slidingPinion"], ["jumps", "dateRing"], ["jumps", "dayStar"], ["jumps", "moonDisc"], ["jumps", "gmtWheel"]],
      stats: ({ CX, w }) => { const q = CX.quickSet(w.features()), n = { date: "date", day: "day", gmt: "GMT hand", calday: "whole calendar", moon: "moon" };
        return [["Turn forward", n[q.fwd] || "—"], ["Turn back", n[q.back] || "—"], ["Safe to use now", w.quickSetRisky() ? "no (9 pm–3 am)" : "yes"]]; }
    },
    stopLever: {
      name: "Stop lever (hacking)", kind: "Regulator",
      short: "A lever that touches the balance and stops it when the crown is pulled out to set the time {{mpStop}}.",
      more: [
        "With the crown in the time-setting position, a lever blocks the balance, sometimes through an intermediate part {{mpStop}}. With the balance held, the train and the seconds hand stop {{wsSet}}.",
        "Not every movement has one: some older movements and budget automatics don't hack {{wsSet}}."
      ],
      rel: [["stops", "balance"]],
      stats: ({ w }) => [["Touching the balance", w.hacked() ? "yes, stopped" : "no"], ["Watch running", w.stopped() ? "no" : "yes"]]
    },
    // ---------- calendar and GMT ----------
    driver24: {
      name: "Date indicator driving wheel", kind: "Calendar", needs: "calendar",
      short: "Turns once a day {{horoDays}}. A finger on it pushes the date forward around midnight {{horoDays,eta28}}.",
      more: [
        "It's driven from the motion works and makes one turn in 24 hours {{horoDays}}; here the hour wheel drives it, 40 teeth into 80 {{model}}.",
        "The date changes around midnight {{ciech}}. In the usual semi-instantaneous design the wheels mesh gradually over several hours {{wsDanger}}, then a jumper spring snaps the ring to the next date {{ciech}}. Here the finger meets a tooth just before 23:00 and has pushed the ring half a tooth, the jumper's peak, by midnight {{model,calc}}. The finger and ring were sized so it pushes the tooth's back flank and never cuts into a tooth; the tests check that {{calc}}."
      ],
      rel: [["driven by", "hourWheel"], ["pushes", "dateRing"], ["pushes", "dayStar"], ["pushes", "moonDisc"]],
      stats: ({ X, r }) => [["Teeth", X.dial.driver24Z, "wheel"], ["One turn", "24 h", "period"], ["Hand time now", fmtClock(r.timeOfDay)],
        ["Fingers", r.dragging ? "pushing" : "clear"]]
    },
    dateRing: {
      name: "Date ring", kind: "Calendar", needs: "date",
      short: "A ring printed with all 31 dates {{ciech}}. One number shows through the date window {{ciech}}.",
      more: [
        "The driving finger catches a tooth on the ring and the jumper snaps it to the next position {{ciech}}. It has one tooth per date {{?}}.",
        "A simple date can't tell how long a month is, so after shorter months you correct it {{wikiAnnual}}. Annual and perpetual calendars do it for you {{wikiAnnual}}.",
        "Setting the hands back past midnight doesn't take the date back here, and rocking the hands across midnight walks it forward {{?}}."
      ],
      rel: [["pushed by", "driver24"], ["corrected by", "quickSet"], ["counted by", "dateStar"]],
      stats: ({ r }) => [["Showing", String(r.dateShown)], ["Teeth", "31"], ["Moving now", r.dragging ? "yes" : "no"]]
    },
    dayStar: {
      name: "Day star wheel", kind: "Calendar", needs: "day",
      short: "A seven-pointed star wheel that carries the day of the week, moved one point a day {{horoDays}}.",
      more: [
        "A finger on the once-a-day driving wheel pushes each point in turn, so the star turns a seventh of a turn per day {{horoDays}}. ETA calls the printed disc the day indicator {{eta28}}.",
        "On many day-dates the crown's first click sets the date one way and the day the other {{wsSet}}."
      ],
      rel: [["pushed by", "driver24"], ["corrected by", "quickSet"]],
      stats: ({ r }) => [["Showing", DAYS[r.day]], ["Points", "7"]]
    },
    moonDisc: {
      name: "Moon disc", kind: "Calendar", needs: "moon",
      short: "A disc with two moons painted on it, under a curved window {{mpMoon}}. It's advanced one tooth a day, so the visible moon grows and shrinks over a month {{mpMoon}}.",
      more: [
        "It's driven by a 59-tooth wheel that a finger advances once every 24 hours {{mpMoon}}, so two moons take 59 days and one lunation reads as 29.5 days {{mpMoon}}. The real average is 29.53059 days {{mpMoon}}.",
        "That gap makes it drift about a day every two and a half years {{mpMoon}}; the exact figure works out to about 2.6 years {{calc}}.",
        "A finger pushes one tooth a day and a jumper spring finishes the step {{mpMoon,model}}. For one pass of the finger to move exactly one tooth, the teeth must be coarse enough and the finger short enough that it is clear before the next tooth arrives; a fine wheel gets pushed several teeth {{calc}}. So the disc here is about 8.5 mm across, and it sits a level above the motion works, under the dial {{model}}.",
        "To set it, some watches have a small pusher in the case side and others use the crown at its middle position, turning the opposite way to the date {{mpMoonSet}}. Union Glashütte's 7751 manual says to turn the crown backwards while checking a moon phase chart {{union7751}}.",
        "Here it works the 7751 way: crown at the first click, turned back {{union7751,app}}. The Crown panel compares the disc with the real moon for the date on the dial and can do the turning for you {{app}}."
      ],
      rel: [["pushed by", "driver24"], ["set by", "quickSet"]],
      stats: ({ r, CX }) => [["Teeth", String(CX.MOON_TEETH)], ["Moon age", (r.moonPhase * 29.5).toFixed(1) + " days"], ["Phase", phaseName(r.moonPhase)]]
    },
    gmtInter: {
      name: "GMT intermediate wheel", kind: "GMT", needs: "gmt",
      short: "Part of the 2:1 reduction from the hour wheel to the 24-hour wheel {{hsGMT}}.",
      more: ["The hour wheel drives an intermediate wheel, which drives a larger 24-hour wheel {{hsGMT}}. Here: 20 teeth with a 10-tooth pinion into 40 {{model}}, which halves the speed {{calc}}.",
             "Passing through one extra wheel keeps the 24-hour hand turning the same way as the hour hand {{calc}}."],
      rel: [["driven by", "hourWheel"], ["drives", "gmtWheel"]],
      stats: ({ X, per }) => [["Wheel / pinion", `${X.dial.gmtInterZ} / ${X.dial.gmtInterPZ}`, "pinion"], ["One turn", fmtDur(per.hour * X.dial.gmtInterZ / 40), "period"]]
    },
    gmtWheel: {
      name: "24-hour (GMT) wheel", kind: "GMT", needs: "gmt",
      short: "Carries a hand that goes round once a day, so you can read a second time zone on a 24-hour scale {{hsGMT}}.",
      more: [
        "On the ETA 2893-2 the 24-hour hand is quick-set with the crown at its middle position, independently of the hour hand {{grail2893}}. Here it moves an hour per click {{?}}.",
        "Here it starts on UTC {{app}}."
      ],
      rel: [["driven by", "gmtInter"], ["corrected by", "quickSet"]],
      stats: ({ r, X }) => [["Teeth", String(X.dial.gmtWheelZ), "wheel"], ["Module", X.dial.gmtMod.toFixed(4) + " mm", "module"],
        ["Second zone", fmtClock(((r.handTime + r.gmtHours * 3600) % 86400 + 86400) % 86400)], ["Offset", "+" + r.gmtHours + " h"]]
    },
    // ---------- chronograph (modeled on the Valjoux 7750: cam-operated, oscillating pinion) ----------
    oscPinion: {
      name: "Oscillating pinion", kind: "Chronograph", needs: "chrono",
      short: "A tiny double gear on a tilting mount {{revOsc}}. Tilted in, it connects the stopwatch to the running watch {{revOsc}}.",
      more: [
        "In the 7750 the lower pinion stays in mesh with the fourth wheel; starting the chronograph tilts the upper pinion into the chronograph seconds wheel {{revOsc}}. The idea goes back to Edouard Heuer's 1887 patent {{mono7750}}.",
        "Its small gear engages more neatly than a wheel would, so the hand jumps less at the start {{revOsc}}. In this model the hand can jump at most half a tooth of the seconds wheel when the teeth meet {{calc}}; with 160 fine teeth {{model}}, that's under 0.2 s {{calc}}.",
        "Its fine, pointed teeth are made to avoid collisions as they mesh, not to transmit much power {{revOsc}}."
      ],
      rel: [["driven by", "fourth"], ["drives", "chronoRunner"], ["tilted by", "switchCam"]],
      stats: ({ w, X }) => [["Engaged", w.chrono.running ? "yes" : "no"], ["Lower / upper pinion", `${X.chrono.lowerZ} / ${X.chrono.upperZ}`, "pinion"],
        ["Last start jump", (Math.abs(w.chrono.lastJumpSeconds || 0)).toFixed(3) + " s"]]
    },
    chronoRunner: {
      name: "Chronograph seconds wheel", kind: "Chronograph", needs: "chrono",
      short: "Carries the stopwatch seconds hand in the center of the dial {{grail7753,revOsc}}.",
      more: [
        "When engaged it turns once a minute, stepping with the balance {{calc}}. A heart-shaped cam on it is what the reset hammer strikes to send the hand back to zero {{sjxReset}}.",
        "Once a minute a finger advances the minute counter {{awciMinute}}; here the finger is on this wheel {{?}}."
      ],
      rel: [["driven by", "oscPinion"], ["advances", "minuteCounter"], ["reset by", "hammer"], ["held by", "brake"]],
      stats: ({ w, X }) => [["Teeth", String(X.chrono.runnerZ), "wheel"], ["Elapsed", fmtChrono(Math.max(0, w.chrono.elapsed))], ["State", w.chrono.running ? "running" : w.chrono.hammer ? "reset" : "stopped"]]
    },
    switchCam: {
      name: "Switching cam", kind: "Chronograph", needs: "chrono",
      short: "A stamped, oblong cam that steps between start, stop and reset, and through levers decides what the chronograph does {{mono7750,revCam}}.",
      more: [
        "Unlike column-wheel chronographs, the 7750 works its levers with a stamped, oblong cam {{mono7750}}. It's two parts fixed together and switches between three positions for start, stop and reset; the lower cam handles start and stop, the upper cam reset {{revCam}}.",
        "Both pushers work it through levers here {{app}}. The brake lever and the coupling lever that carries the oscillating pinion each rest a nub on it, pressed there by a spring; the outline was made to pass through where each nub must sit in each position, so turning the cam is what engages the pinion and drops the brake {{model,calc}}. That outline is this model's, not the 7750's real profile {{model}}, and the hammers are still set directly rather than by a follower {{app}}.",
        "It moves the oscillating pinion in and out {{revOsc}} and works the brake and the reset hammer {{revCam,sjxReset}}."
      ],
      rel: [["moved by", "startPusher"], ["moved by", "resetPusher"], ["tilts", "oscPinion"], ["works", "brake"], ["works", "hammer"]],
      stats: ({ w }) => [["Position", w.chrono.running ? "running" : w.chrono.hammer ? "reset" : "stopped"], ["Presses so far", String(w.chrono.column)]]
    },
    startPusher: {
      name: "Start/stop pusher", kind: "Chronograph", needs: "chrono",
      short: "The pusher at 2 o'clock {{gpChrono}}. Press to start the stopwatch, press again to stop it {{gpChrono}}.",
      more: ["Stopping doesn't reset; press start again and timing carries on {{gpChrono}}. Tap it in the drawing or use the Start/stop button {{app}}."],
      rel: [["moves", "switchCam"]],
      stats: ({ w }) => [["Next press", w.chrono.running ? "stops" : "starts"], ["Presses so far", String(w.chrono.column)]]
    },
    resetPusher: {
      name: "Reset pusher", kind: "Chronograph", needs: "chrono",
      short: "The pusher at about 4 o'clock {{gpChrono}}. Sends the stopwatch hands back to zero {{gpChrono}}.",
      more: [
        "On a chronograph that isn't a flyback, pressing it while running does nothing, though pressing very hard could break something {{gpChrono}}. The normal sequence is start, stop, then reset {{mpFly}}.",
        "On a flyback, one press while running resets and restarts it {{wikiFlyback,mpFly}}."
      ],
      rel: [["turns", "switchCam"], ["drops", "hammer"], ["drops", "hourHammer"]],
      stats: ({ w }) => [["Works now", w.chrono.running && !w.features().flyback ? "no, stop first" : "yes"], ["Stopwatch at", fmtChrono(Math.max(0, w.chrono.elapsed))]]
    },
    hammer: {
      name: "Reset hammer", kind: "Chronograph", needs: "chrono",
      short: "A slim lever with two wide heads that strike the heart cams of the seconds and minute counters, sending both hands back to zero {{sjxReset,wrt7750walk}}.",
      more: [
        "The 7750 has a two-function hammer for seconds and minutes and a separate hour hammer {{wrt7750walk}}. That's the older arrangement; most modern chronographs use one hammer with three heads {{sjxReset}}.",
        "The heads are wide to make good contact with the hearts, and springs arm the hammer so it resets quickly and consistently {{sjxReset}}. A heart cam always takes the shortest way back to zero, turning either direction {{sjxReset}}. At zero, the hammer also holds the hands still until the next start {{sjxReset}}.",
        "The hammer's shape and pivot here are drawn for this layout, not traced from the 7750 {{model}}."
      ],
      rel: [["dropped by", "resetPusher"], ["resets", "chronoRunner"], ["resets", "minuteCounter"], ["works with", "hourHammer"]],
      stats: ({ w }) => [["Down on the hearts", w.chrono.hammer ? "yes" : "no"], ["Heads", "2", "heartCam"]]
    },
    hourHammer: {
      name: "Hour hammer", kind: "Chronograph", needs: "chrono",
      short: "A separate hammer for the hour counter's heart cam {{wrt7750walk}}.",
      more: [
        "In the 7750 it has its own spring and operating lever {{wrt7750walk}}. On older designs like this, the hour counter's reset lever is separate because of how the movement is built {{sjxReset}}.",
        "It drops at the same moment as the main hammer here {{app}}; its shape and pivot are drawn for this layout {{model}}."
      ],
      rel: [["resets", "hourCounter"], ["works with", "hammer"]],
      stats: ({ w }) => [["Down on the heart", w.chrono.hammer ? "yes" : "no"], ["Heads", "1", "heartCam"]]
    },
    hourDrive: {
      name: "Hour counter driving wheel", kind: "Chronograph", needs: "chrono",
      short: "Takes the hour counter's motion from the mainspring barrel {{mono7750}}. It turns whenever the watch runs, whether or not the chronograph is on {{mono7750}}.",
      more: [
        "The 7750 drives its hour counter from the barrel {{mono7750,wrt7750}}, through an hour-counting wheel {{wrt7750walk}}. Here an intermediate wheel does it: barrel 80 into 40, then its pinion 10 into the counter wheel's 30 {{model}}, one turn in 12 hours with an 8-hour barrel {{calc}}.",
        "The barrel is drawn dashed up here because it really sits in the going train below {{app}}."
      ],
      rel: [["driven by", "barrel"], ["drives", "hourCounter"]],
      stats: ({ X }) => [["Teeth", `${X.chrono.hourInterZ} / ${X.chrono.hourInterPZ}`, "wheel"], ["One turn", "4 h", "period"]]
    },
    hourLock: {
      name: "Hour counter lock", kind: "Chronograph", needs: "chrono",
      short: "Holds the hour counter still while the chronograph is stopped {{wrt7750walk,mono7750}}.",
      more: [
        "The wheel underneath keeps turning with the barrel; a slipping clutch on the counter's arbor lets it, and starting the chronograph lets the counter follow {{mono7750}}. The 7750 calls this part the hour counter lock {{wrt7750walk}}.",
        "Where it touches and how it's worked are drawn for this layout {{model}}."
      ],
      rel: [["holds", "hourCounter"], ["holds against", "hourDrive"]],
      stats: ({ w }) => [["Holding", w.chrono.running ? "no" : "yes"], ["Counter", w.chrono.running ? "following the barrel" : "slipping on its clutch"]]
    },
    brake: {
      name: "Brake", kind: "Chronograph", needs: "chrono",
      short: "Clamps the chronograph seconds wheel when the stopwatch is stopped {{revCam}}.",
      more: ["Press stop and the brake comes down on the wheel, so the seconds hand stops {{revCam}}. It lifts when the stopwatch starts again {{?}}."],
      rel: [["holds", "chronoRunner"], ["worked by", "switchCam"]],
      stats: ({ w }) => [["On", !w.chrono.running && !w.chrono.hammer ? "yes" : "no"], ["Stopwatch", w.chrono.running ? "running" : "stopped"]]
    },
    minuteCounter: {
      name: "Minute counter", kind: "Chronograph", needs: "chrono",
      short: "Counts stopwatch minutes up to 30, on the register at 12 o'clock {{mono7750}}. It moves a minute at a time, creeping just before each jump {{awciMinute,obs}}.",
      more: ["A minute-counter finger advances it for a short period, and a jumper limits each advance to a single tooth {{awciMinute}}. So the hand creeps a little as the finger starts pushing, then snaps over {{obs}}. The 7750 has a minute-counter driving wheel between the seconds wheel's finger and the minute-counting wheel {{wrt7750walk}}. Here the finger meets the driving wheel's tooth about half a second before the minute, pushes it half a tooth, and the jumper takes over on the minute {{model,calc}}; the tooth sizes and finger were chosen so the finger never touches the next tooth {{model}}.",
             "Not every chronograph does this: on the Lemania 5100 the minute hand moves continuously {{wnwSZ01}}."],
      rel: [["advanced by", "chronoRunner"], ["reset by", "hammer"]],
      stats: ({ w }) => [["Counted", Math.floor(Math.max(0, w.chrono.elapsed) / 60) % 30 + " min"], ["Turn", "30 min", "period"]]
    },
    hourCounter: {
      name: "Hour counter", kind: "Chronograph", needs: "chrono",
      short: "Counts stopwatch hours up to 12, on the register at 6 o'clock {{mono7750}}. It moves continuously, not in steps {{wrt7750}}.",
      more: ["In the 7750 the hour counter is driven from the barrel; it slips when the chronograph is stopped and runs when it's engaged {{wrt7750,mono7750}}. The ring drawn around its arbor is that slipping clutch {{app}}.",
             "At 30° an hour it moves half a degree a minute, slow enough to look still {{calc}}."],
      rel: [["driven by", "hourDrive"], ["held by", "hourLock"], ["reset by", "hourHammer"]],
      stats: ({ w }) => [["Counted", (Math.max(0, w.chrono.elapsed) / 3600 % 12).toFixed(2) + " h"], ["Turn", "12 h", "period"]]
    },
    // ---------- automatic winding and power reserve ----------
    rotor: {
      name: "Rotor", kind: "Automatic winding", needs: "auto",
      short: "A weight that turns on a pivot as you move {{wikiAuto}}. Its swinging winds the mainspring {{wikiAuto,ciech}}.",
      more: [
        "A rotor weight can turn a full 360° {{wikiAuto}}. Its motion goes through reverser and reducing gears to wind the mainspring {{wikiAuto}}.",
        "Choose a wrist activity to wear the watch {{app}}. How much each activity winds is a model value {{model}}."
      ],
      rel: [["turns", "reverserWheels"]],
      stats: ({ w, CX }) => [["Wrist", CX.WRIST[w.opts.wrist].name], ["Average swing", (CX.rotorRate(w.opts.wrist) * 60).toFixed(1) + " turns/min"]]
    },
    reverserWheels: {
      name: "Reversing wheels", kind: "Automatic winding", needs: "auto",
      short: "Two meshed wheels that turn the rotor's back-and-forth swinging into winding in one direction {{sjxWinding,ciech}}.",
      more: [
        "Inside each, pawls catch the teeth in one direction and glide over them in the other; one wheel declutches while the other engages, so the energy always flows one way {{sjxWinding}}. Rolex and the ETA 2824 use two simple reversers meshed together {{sjxWinding}}, and ETA lists a reversing wheel and an auxiliary reversing wheel {{eta28}}.",
        "Reversers are the most widespread system today {{sjxWinding}}. IWC's Pellaton system (1946) uses a heart-shaped cam and pawls instead, and Seiko's Magic Lever a one-piece lever {{sjxWinding}}."
      ],
      rel: [["turned by", "rotor"], ["drive", "autoReduction"]],
      stats: ({ CX, r }) => [["Teeth", `${CX.AUTO.reverser}, pinion ${CX.AUTO.reverserPinion}`, "wheel"], ["Gripping now", r.rotorDir > 0 ? "first wheel" : r.rotorDir < 0 ? "second wheel" : "neither, rotor still"]]
    },
    autoReduction: {
      name: "Reduction wheels", kind: "Automatic winding", needs: "auto",
      short: "Gears that slow the rotor's motion a lot before it reaches the barrel {{ciech,wikiAuto}}.",
      more: ["ETA lists a reduction wheel and a ratchet wheel driving wheel {{eta28}}. The last wheel turns the same ratchet wheel the crown winds {{app}}; here it takes 960 rotor turns for one barrel turn {{model}}.",
             "When the spring is full, a slipping bridle lets it slide along the barrel wall instead of winding further {{wikiAuto}}."],
      rel: [["driven by", "reverserWheels"], ["winds", "ratchet"]],
      stats: ({ CX, w }) => [["Rotor turns per barrel turn", (1 / CX.barrelTurnsPerRotorTurn()).toFixed(0), "ratio"], ["Slipped at full", (w.slipTurns).toFixed(2) + " turns", "bridle"]]
    },
    prDiff: {
      name: "Power reserve differential", kind: "Power reserve", needs: "pr",
      short: "A differential that compares winding with unwinding and shows the difference with a hand {{mpPR,wikiPR}}.",
      more: [
        "One side of the differential is driven from the ratchet wheel or barrel arbor, the other from the barrel's teeth {{wikiPR}}. A differential's output turns at the average of its two inputs {{wikiDiff}}, so the hand follows the difference between winding in and running out {{calc}}.",
        "The hand shows how long the watch will keep running {{wikiPR}}."
      ],
      rel: [["follows", "ratchet"], ["follows", "barrel"]],
      stats: ({ r }) => [["Wound in", (r.ratchet / 360).toFixed(2) + " turns"], ["Run out", (r.drum / 360).toFixed(2) + " turns"], ["Reserve", r.reserveHours.toFixed(1) + " h", "powerReserve"]]
    },
    // ---------- central seconds ----------
    secondsDrive: {
      name: "Central seconds drive", kind: "Central seconds", needs: "central",
      short: "Carries the fourth wheel's once-a-minute turn across to the center of the dial {{hsCentral}}.",
      more: [
        "A fine pinion on the fourth wheel's arbor drives a large, thin intermediate wheel, which drives a pinion on the central seconds arbor {{hsCentral}}. Here: 12 → 88 → 12 {{model}}, which gives exactly one turn a minute {{calc}}."
      ],
      rel: [["turns with", "fourth"], ["drives", "secondsWheel"]],
      stats: ({ X }) => [["Teeth", `${X.chrono.csPinionZ} → ${X.chrono.csInterZ} → ${X.chrono.csPinionZ}`, "wheel"], ["One turn", "60 s", "period"]]
    },
    secondsWheel: {
      name: "Central seconds pinion", kind: "Central seconds", needs: "central",
      short: "Carries the seconds hand in the middle of the dial, turning once a minute {{hsCentral}}.",
      more: ["A friction spring, also called a tension spring, presses on this extra train to take up the gear play that would otherwise make the hand stutter {{hsCentral}}."],
      rel: [["driven by", "secondsDrive"]],
      stats: ({ r }) => [["Seconds hand", (r.secondsHand / 6).toFixed(3) + " s"], ["Friction spring", "on"]]
    },
    // ---------- calendar program ----------
    monthStar: {
      name: "Month star wheel", kind: "Calendar", needs: "monthStar",
      short: "A 12-tooth star wheel carrying the month disc, held by a jumper spring {{horoMonth}}. It steps once each time the date goes to the 1st {{horoMonth}}.",
      more: [
        "A simple calendar doesn't know how long months are, so you correct the date at the end of each short month {{horoMonth,union7751}}. There's usually no month corrector: run the date forward past the 31st and the month comes with it {{horoMonth,union7751}}.",
        "Here it sits where an annual or perpetual calendar keeps its month cam, and the finger that pushes it isn't drawn {{app}}."
      ],
      rel: [["pushed by", "dateStar"]],
      stats: ({ r, CX }) => [["Teeth", "12"], ["Showing", CX.MONTHS[r.month]]]
    },
    programCam: {
      name: "Month cam", kind: "Calendar", needs: "program",
      short: "A disc with notches of different depths that stores how long each month is {{sjxPerp}}.",
      more: [
        "A perpetual calendar's cam has 48 notches, one for each month of a four-year cycle, and steps once a month {{sjxPerp}}. An annual calendar needs only to know 30 and 31 {{wikiAnnual}}; giving it 12 positions here is a model choice {{model}}.",
        "The deeper the notch, the more days are skipped at the end of the month: one for 30 days, up to three for a 28-day February {{sjxPerp}}."
      ],
      rel: [["read by", "grandLever"]],
      stats: ({ r, w, CX }) => { const f = w.features(); return [["Positions", String(CX.camSectors(f.calType).length)], ["This month", CX.MONTHS[r.month] + " " + r.year], ["Days this month", String(r.monthLength)]]; }
    },
    grandLever: {
      name: "Grand lever", kind: "Calendar", needs: "program",
      short: "A lever whose beak reads the depth of a notch on the month cam at the end of each month {{sjxPerp}}.",
      more: ["The movement works it once every 24 hours {{sjxPerp}}. At a month's end the notch depth lets a pawl skip one, two or three teeth of a 31-tooth wheel, so the date jumps straight to the 1st {{sjxPerp}}. The drawing shows the lever resting at this month's depth rather than animating the drop {{app}}."],
      rel: [["reads", "programCam"], ["advances", "dateStar"]],
      stats: ({ r }) => [["Notch depth", (31 - r.monthLength) + " day" + (31 - r.monthLength === 1 ? "" : "s")], ["Last day this month", String(r.monthLength)]]
    },
    dateStar: {
      name: "Date star wheel", kind: "Calendar", needs: "dateStar",
      short: "A 31-tooth star wheel that makes one turn a month {{horoRetro,sjxPerp}}.",
      more: ["On a perpetual it's the 31-tooth wheel whose teeth the grand lever skips at the end of short months {{sjxPerp}}. On a retrograde date it carries the snail cam {{horoRetro}}. On a simple complete calendar its job here is to push the month star once a turn {{horoMonth,model}}."],
      rel: [["advanced by", "grandLever"], ["carries", "snail"], ["pushes", "monthStar"]],
      stats: ({ r }) => [["Showing", String(r.dateShown)], ["Points", "31"]]
    },
    snail: {
      name: "Snail cam", kind: "Retrograde date", needs: "retro",
      short: "A cam shaped like a snail shell {{horoRetro}}. As it turns, its profile moves a lever, and the lever moves the hand along its arc {{horoRetro}}.",
      more: ["At the cam's step the lever falls from the highest point to the lowest, and the hand returns almost instantly {{horoRetro}}."],
      rel: [["turns with", "dateStar"], ["lifts", "rack"]],
      stats: ({ r }) => [["Radius under the rack", (0.9 + (2.25 - 0.9) * r.retroFraction).toFixed(2) + " mm"], ["Date", String(r.dateShown)]]
    },
    rack: {
      name: "Rack", kind: "Retrograde date", needs: "retro",
      short: "A toothed lever whose feeler rides on the snail cam; its teeth turn the hand {{horoRetro}}.",
      more: ["A leaf spring or hairspring keeps the feeler on the cam {{horoRetro}}. When the step comes round, the rack falls and turns the hand back to the start of its scale {{horoRetro}}."],
      rel: [["lifted by", "snail"]],
      stats: ({ r }) => [["Hand position", (r.retroFraction * 100).toFixed(0) + "% along"], ["Back to 1 after", String(r.monthLength)]]
    }
  };

  const TERMS = {
    completeCalendar: { name: "Complete calendar", short: "Day, date, month and moon phase together, also called a triple calendar {{grail7751,biwTissot}}. It's a simple calendar: 31 days every month {{union7751}}.",
      more: ["Mechanical ones are mostly built on the Valjoux 7751, used by Ball, Longines, Omega, Sinn and Maurice Lacroix among others {{grailRef7751}}. They aren't cheap: Atlantic's 7751 chronograph is 3,350 CHF {{wwAtlantic}}.",
             "Cheap ones tend to be quartz, like Tissot's on the ETA 255 quartz movement, which sells used for about $200 to $300 when running {{biwTissot}}.",
             "Day, date and moon without the month is rare; when a watch drops something to make room for the moon, it's usually the day, leaving date and moon {{?}}."] },
    bph: { name: "Beat rate", short: "How many beats the balance makes an hour {{wikiBalWheel}}. A beat is one swing between reversals, so a full cycle is two beats {{wikiBalWheel}}.",
      more: ["Before the 1970s watches typically ran at 18,000 an hour; today 21,600 and 28,800 are common, and a few run at 36,000 {{wikiBalWheel}}. 28,800 is 8 beats a second {{ciech}}.",
             "Watchmakers write it A/h, alternations per hour {{?}}."] },
    amplitude: { name: "Amplitude", short: "How far the balance swings, measured in degrees {{ccAmp}}.",
      more: ["Excellent amplitude on a modern watch is about 270–315°, measured fully wound; it's usually higher dial-up than in vertical positions {{ccAmp}}. Low amplitude can point to a mainspring problem, and such watches generally lose time {{ccAmp}}.",
             "Here it changes how long each push lasts, because the balance only touches the lever over a fixed angle {{app}}."] },
    lift: { name: "Lift angle", short: "The number of degrees the balance turns while it's in contact with the lever's fork {{ccLift}}.",
      more: ["Most lift angles are between 48° and 54°; 52° is the usual default on timing machines {{ccLift}}. This model uses 52° {{model}}, and the lever's ±6° swing follows from it and the model's geometry {{calc}}."] },
    beat: { name: "Beat", short: "One tick: the escape wheel drops one tooth as the balance swings once {{wikiLever}}.",
      more: ["Locked means a pallet is holding the escape wheel still; impulse means a tooth is pushing the lever {{wikiLever}}. Each beat the wheel turns half the angle between two teeth {{wikiLever}}.",
             "At 1/50 speed you can watch every beat {{app}}."] },
    module: { name: "Module", short: "The size of a gear's teeth: pitch diameter in millimeters divided by the number of teeth {{wikiGear}}.",
      more: ["From that definition, two meshing gears sit m × (z₁ + z₂) ÷ 2 apart {{calc}}. Every distance in the drawing comes from this {{app}}.",
             "Meshing gears need matching tooth sizes {{?}}. The modules here, 0.05–0.14 mm, are model values {{model}}."] },
    pinion: { name: "Pinion", short: "A small gear driven by a bigger wheel; its teeth are called leaves {{ciech,sjxGears}}.",
      more: ["Each wheel driving a pinion raises the speed {{ciech}}. Watch pinions can have as few as six to ten leaves {{sjxGears}}, and are made of hardened steel {{horoCenter}}."] },
    wheel: { name: "Wheel", short: "A larger gear that drives the next, smaller gear in line {{ciech}}; the center wheel, for instance, is traditionally gilded brass {{horoCenter}}." },
    period: { name: "One turn", short: "How long this part takes to go all the way round once {{app}}." },
    target: { name: "Target", short: "How long that turn has to take for the hands to show the right time {{app}}." },
    ratio: { name: "Ratio", short: "How many times faster one part turns than another {{app}}.",
      more: ["For a wheel driving a pinion it's wheel teeth ÷ pinion leaves, and ratios multiply down the train: center to escape here is 8 × 7.5 × 16 = 960 {{calc}}."] },
    powerReserve: { name: "Power reserve", short: "How long the watch keeps running before it needs winding {{wikiPR}}.",
      more: ["Here it's one barrel turn's time × the turns the mainspring can unwind {{calc}}; 6.5 turns is a model value {{model}}."] },
    rate: { name: "Rate", short: "How many seconds a day the watch gains or loses {{app}}.",
      more: ["Here it counts only the gear ratios {{app}}. In a real watch temperature affects the balance spring and so the rate {{wikiBalSpring}}; so does position {{?}}."] },
    profile: { name: "Tooth shape", short: "For a long time watches used cycloidal tooth profiles {{sjxGears}}.",
      more: ["An epicycloid is the curve traced by a circle rolling around another without slipping {{sjxGears}}. Cycloidal gears give smooth transmission with little contact pressure {{sjxGears}}.",
             "The trade-off: cycloidal gears only work properly if the center spacing is exactly right {{wikiGear}}, while involute gears are much less sensitive to it {{sjxGears}}. Here the wheel tooth tips are rolled by a circle half the mating pinion's radius {{model}}."] },
    crownPositions: { name: "Crown positions", short: "Most watches have two or three crown positions {{wsSet}}.",
      more: ["Pushed in for winding, first click for the date (and day), second click for the hands {{wsSet}}. Watches with nothing to quick-set have two positions here {{model}}."] },
    hacking: { name: "Hacking", short: "Stopping the seconds hand when the crown is pulled out to set the time {{wsSet}}.",
      more: ["A lever blocks the balance in the time-setting position {{mpStop}}. Many mechanical watches hack, but some older and budget movements don't {{wsSet}}."] },
    jumper: { name: "Jumper", short: "A spring that holds a wheel in position and snaps it to the next one {{ciech,awciMinute}}.",
      more: ["The date jumper is why the date flips quickly around midnight {{ciech}}. On a chronograph minute counter, a jumper limits each advance to one tooth {{awciMinute}}."] },
    heartCam: { name: "Heart cam", short: "A heart-shaped cam made of two symmetrical spirals; it's how a stopwatch resets to zero {{sjxReset}}.",
      more: ["When the reset hammer strikes it, the cam takes the shortest way back to zero, turning in either direction {{sjxReset}}."] },
    chronograph: { name: "Chronograph", short: "A stopwatch built into the watch: one pusher starts and stops it, another resets it {{gpChrono}}.",
      more: ["This one follows the Valjoux 7750: cam-operated with an oscillating pinion {{mono7750,revOsc}}, running seconds at 9, 30-minute counter at 12, 12-hour counter at 6 {{mono7750}}.",
             "The 7750 family includes day-date {{mono7750}}, date (7753) {{grail7753}}, GMT with date (7754) {{mono7750}} and full calendar with moon phase (7751) {{grail7751,mono7750}}. A time-only version and leaving out date + moon are this app's choices {{?}}."] },
    calType: { name: "Calendar type", short: "How much the date mechanism knows about the calendar {{app}}.",
      more: ["Simple: 31 days every month, so you correct it after each shorter month, five times a year {{calc}}. Annual: handles 30 and 31 days and needs correcting only on 1 March {{wikiAnnual}}, an idea Patek Philippe patented in 1996 {{wikiAnnual}}.",
             "Perpetual: also handles leap years, and won't need adjusting until 2100, which isn't a leap year {{wikiAnnual}}. Very few watches handle that rule too {{qpPerp}}. At 3600× you can watch the date jump from 28 straight to 1 at the end of February {{app}}."] },
    retrograde: { name: "Retrograde", short: "A hand that moves along an arc, then jumps back to the start {{horoRetro}}.",
      more: ["For a date it starts from a 31-tooth star wheel making one turn a month, and jumps back to the 1st at the end of its scale {{horoRetro}}."] },
    flyback: { name: "Flyback", short: "A chronograph you can reset and restart with one press, without stopping it first {{wikiFlyback}}.",
      more: ["Pilots needed it to time successive legs of a flight {{wikiFlyback}}. Pressing the flyback pusher drops the hammer onto the heart cams, briefly disengaging the clutch {{mpFly}}."] },
    automatic: { name: "Automatic winding", short: "Winding by a weight that swings as you move {{wikiAuto}}.",
      more: ["Some designs wind only in one swing direction; others wind in both {{wikiAuto}}. Here it uses reversing wheels, the most widespread system {{sjxWinding}}."] },
    bridle: { name: "Slipping bridle", short: "Holds the mainspring to the barrel wall by friction until it's fully wound, then lets it slide, so it can't be overwound {{wikiAuto}}.",
      more: ["A hand-wound watch's crown simply stops turning when the spring is full {{?}}."] },
    differential: { name: "Differential", short: "Gears with three shafts, where one turns at the average of the other two {{wikiDiff}}.",
      more: ["Used for arithmetic, the third shaft's angle is the sum or difference of the other two {{wikiDiff}}. Joseph Williamson's 1720 clock used one {{wikiDiff}}."] },
    centralSeconds: { name: "Central seconds", short: "The seconds hand on the center of the dial instead of on its own small dial {{hsCentral}}.",
      more: ["Indirect central seconds carry the fourth wheel's motion to the center through an extra train with a friction spring; direct designs put the fourth wheel in the center {{hsCentral}}. A chronograph uses the center for its stopwatch hand {{grail7753}}."] },
    lunation: { name: "Lunation", short: "One cycle of the moon's phases {{mpMoon}}. The synodic month averages 29.53059 days {{mpMoon}}.",
      more: ["That's 29 days, 12 hours, 44 minutes {{calc}}. A 59-tooth moon wheel counts 29.5, about 44 minutes short per lunation {{mpMoon}}."] }
  };

  // Follow the power from the crown to the balance, then the dial side and the chronograph.
  const TOUR = ["crown", "slidingPinion", "windingPinion", "crownWheel",
    "rotor", "reverserWheels", "autoReduction", "ratchet", "prDiff", "barrel", "center", "third", "fourth", "escape", "lever", "balance", "hairspring",
    "stopLever", "settingLever", "settingWheel", "motionWorks", "cannon", "minuteWheel", "hourWheel",
    "driver24", "dateRing", "dateStar", "monthStar", "snail", "rack", "grandLever", "programCam",
    "gmtInter", "gmtWheel", "quickSet", "dayStar", "moonDisc", "secondsDrive", "secondsWheel",
    "oscPinion", "chronoRunner", "minuteCounter", "switchCam", "startPusher", "brake", "resetPusher", "hammer",
    "hourHammer", "hourCounter", "hourLock", "hourDrive"];
  // Steps that open a new section of the movement rather than following a mesh from the step before.
  const SECTION_STARTS = ["stopLever", "settingLever", "motionWorks", "secondsDrive", "rotor", "grandLever", "gmtInter"];

  // Is this part present in a watch with features f?
  function present(key, f) {
    const n = PARTS[key] && PARTS[key].needs;
    if (!n) return true;
    if (n === "quick") return f.date || f.day || f.gmt;
    if (n === "dateStar") return f.month || f.retro;
    return !!f[n];
  }
  const tourFor = f => TOUR.filter(k => present(k, f));

  return { PARTS, TERMS, TOUR, SECTION_STARTS, SOURCES, MARKER_KINDS, parse, plain, DAYS, present, tourFor, fmtDur, fmtClock, fmtChrono, phaseName };
});
