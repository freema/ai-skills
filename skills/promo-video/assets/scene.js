// Template scene: 8 s, hook (a metric drops) → the product does one task (type, click, result) → end card.
// Rules this file follows:
//   - one paused GSAP timeline, built after document.fonts.ready, registered as window.__timelines[<composition id>]
//   - everything is a pure function of timeline time: tweens on `tl`, or frame(t) driven by one tween
//     (no clocks, no Math.random, no infinite repeats)
//   - SFX are not placed here; cue() logs them and `node scripts/probe.mjs --cues audio/cues.json` exports the log
// With a voiceover, key beats to word times from window.VO (build_vo.py): word('l2', 0) is the start of line l2's first word.
(() => {
  const $ = (id) => document.getElementById(id);
  // keep in sync with the root's data-composition-id and data-duration; reading them from the DOM at script time
  // broke under `hyperframes check` (the root was not there yet)
  const ID = 'main';
  const DUR = 8;
  const SHOW_CAPTIONS = true; // false renders the clean version for platforms that take an .srt
  const tl = gsap.timeline({ paused: true });

  const cues = [];
  const cue = (t, type, opts = {}) => cues.push({ t: +t.toFixed(3), type, ...opts }); // opts: gain (dB) + generator params
  const word = (line, i = 0) => {
    const l = (window.VO || []).find((x) => x.id === line);
    if (!l) throw new Error(`no voiceover line ${line}`);
    return l.words[i].s;
  };
  // keyframe track, a pure function of time: keys [{t, ...numbers, ease}], ease shapes the move into that key
  const track = (keys) => (t) => {
    if (t <= keys[0].t) return keys[0];
    for (let i = 1; i < keys.length; i++) {
      const a = keys[i - 1], b = keys[i];
      if (t <= b.t) {
        const p = gsap.parseEase(b.ease || 'power2.inOut')((t - a.t) / (b.t - a.t));
        const o = {};
        for (const k in b) if (k !== 't' && typeof b[k] === 'number') o[k] = a[k] + (b[k] - a[k]) * p;
        return o;
      }
    }
    return keys[keys.length - 1];
  };
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  const clamp01 = (k) => Math.max(0, Math.min(1, k));
  void word;

  function build() {
    // ── camera: x, y = world point at the frame centre, z = zoom ──
    const camera = track([
      { t: 0, x: 960, y: 500, z: 1 },
      { t: 2.2, x: 960, y: 500, z: 1.08, ease: 'none' },          // slow push while the metric drops
      { t: 2.7, x: 880, y: 400, z: 1.35, ease: 'power3.inOut' },  // lean in on the input while it is typed into
      { t: 3.55, x: 900, y: 400, z: 1.35, ease: 'none' },
      { t: 4.3, x: 960, y: 540, z: 1, ease: 'power3.inOut' },     // pull back for the answer
    ]);

    // ── 0.0–2.3 hook: the problem in motion, on the product's own surface ──
    tl.fromTo('#metric', { opacity: 0, y: 30, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'power3.out', immediateRender: false }, 0.05);
    cue(0.05, 'pop');
    const line = $('metric-line');
    const len = line.getTotalLength();
    gsap.set(line, { strokeDasharray: `${len} ${len + 2}`, strokeDashoffset: len + 1 });
    tl.to(line, { strokeDashoffset: 0, duration: 0.9, ease: 'power1.inOut' }, 0.25);
    cue(0.85, 'drop');
    tl.fromTo('#metric-delta', { opacity: 0, x: -12 }, { opacity: 1, x: 0, duration: 0.25, ease: 'back.out(2)', immediateRender: false }, 1.35);
    tl.to('#metric', { opacity: 0, y: -30, duration: 0.25, ease: 'power2.in' }, 2.1);

    // ── 2.3–5.4 the product does one task ──
    tl.fromTo('#app', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power3.out', immediateRender: false }, 2.3);
    cue(2.3, 'whoosh', { dur: 0.5, gain: -4 });
    const MSG = 'Why did signups drop?';
    const TYPE0 = 2.75, TYPE1 = 3.45;
    for (let i = 0; i < MSG.length; i += 2) cue(TYPE0 + ((TYPE1 - TYPE0) * i) / MSG.length, 'tick', { gain: -2 });

    // the cursor glides in on an eased path, hovers, clicks
    const ASK = { x: 460 + 820 + 70, y: 230 + 120 + 42 };   // #ask centre in world px
    tl.set('#cursor', { autoAlpha: 1, x: 1500, y: 760, scale: 1, transformOrigin: '4px 2px' }, 3.45);
    tl.to('#cursor', { x: ASK.x - 4, y: ASK.y - 2, duration: 0.45, ease: 'power2.inOut' }, 3.5);
    tl.to('#cursor', { scale: 0.85, duration: 0.06, yoyo: true, repeat: 1, ease: 'none' }, 4.0);
    tl.to('#ask', { scale: 0.95, duration: 0.06, yoyo: true, repeat: 1, ease: 'none' }, 4.0);
    tl.fromTo('#ripple', { left: ASK.x, top: ASK.y, scale: 0.4, opacity: 1 }, { scale: 1.5, opacity: 0, duration: 0.35, ease: 'power2.out', immediateRender: false }, 4.0);
    cue(4.0, 'click');
    tl.to('#cursor', { autoAlpha: 0, duration: 0.15 }, 4.6);
    tl.fromTo('#result', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power3.out', immediateRender: false }, 4.25);
    cue(4.25, 'success');

    // ── 5.4–8.0 end card: logo, claim, one CTA, URL; holds about 2 s ──
    tl.to('#app', { opacity: 0, scale: 0.98, duration: 0.25, ease: 'power2.in' }, 5.2);
    tl.fromTo('#end', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, ease: 'power1.out', immediateRender: false }, 5.4);
    cue(5.3, 'whoosh', { dur: 0.45, gain: -6 });
    tl.fromTo('#end-logo', { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.8)', immediateRender: false }, 5.55);
    cue(5.55, 'sparkle', { gain: -3 });
    [['#end-name', 5.75], ['#end-claim', 5.9], ['#end-cta', 6.05], ['#end-url', 6.2]].forEach(([sel, t]) =>
      tl.fromTo(sel, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power3.out', immediateRender: false }, t));
    cue(6.05, 'pop', { pitch: 1.2, gain: -3 });

    // ── captions (assets/captions.js) ──
    if (SHOW_CAPTIONS) {
      for (const c of (window.CAPTIONS || []).filter((c) => c.burn)) {
        const el = document.createElement('div');
        el.className = 'cap';
        const pill = document.createElement('span');
        pill.className = 'pill';
        el.appendChild(pill);
        c.words.forEach((w, i) => {
          if (i) pill.appendChild(document.createTextNode(' '));
          const span = document.createElement('span');
          span.className = 'w';
          span.textContent = w.w;
          pill.appendChild(span);
          tl.fromTo(span, { opacity: 0.42 }, { opacity: 1, duration: 0.08, ease: 'none', immediateRender: false }, w.s);
        });
        $('captions').appendChild(el);
        tl.fromTo(el, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.16, ease: 'power2.out', immediateRender: false }, c.start);
        tl.to(el, { opacity: 0, duration: 0.12, ease: 'power1.in' }, c.end - 0.12);
      }
    }

    // ── frame(t): camera, counters, typing ──
    const world = $('world'), value = $('metric-value'), typed = $('typed'), ph = $('ph');
    const frame = (t) => {
      const c = camera(t);
      world.style.transform = `translate(${(960 - c.x * c.z).toFixed(2)}px, ${(540 - c.y * c.z).toFixed(2)}px) scale(${c.z.toFixed(5)})`;
      const v = fmt(1240 - 620 * gsap.parseEase('power2.out')(clamp01((t - 0.85) / 0.6)));
      if (value.textContent !== v) value.textContent = v;
      const n = t < TYPE0 ? 0 : Math.min(MSG.length, Math.floor(((t - TYPE0) / (TYPE1 - TYPE0)) * MSG.length) + 1);
      const caret = t >= TYPE0 && t < 4.0 && Math.floor(t / 0.27) % 2 === 0 ? '|' : '';
      const txt = MSG.slice(0, n) + caret;
      if (typed.textContent !== txt) typed.textContent = txt;
      ph.style.opacity = t >= TYPE0 ? 0 : 1;
    };
    const driver = { t: 0 };
    tl.to(driver, { t: DUR, duration: DUR, ease: 'none', onUpdate: () => frame(driver.t) }, 0);
    frame(0);

    window.__cues = cues.sort((a, b) => a.t - b.t);
    window.__timelines[ID] = tl;
  }

  // build only after the fonts are ready: a synchronous build, or one gated on document.fonts.load(), renders blank frames
  document.fonts.ready.then(() => {
    try { build(); } catch (e) { console.error('scene build failed:', (e && e.stack) || e); }
  });
})();
