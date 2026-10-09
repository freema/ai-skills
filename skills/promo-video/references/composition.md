# Composition (HyperFrames + GSAP)

Checked with HyperFrames 0.8.111 and GSAP 3.14.2. Re-check the CLI's `--help` after an upgrade.

## Structure

```html
<div id="root" data-composition-id="main" data-start="0" data-width="1920" data-height="1080" data-duration="30" data-fps="60">
  <div id="stage" class="clip" data-start="0" data-duration="30" data-track-index="0" data-layout-allow-overflow>
    … scenes, world layers, videos, captions …
  </div>
  <audio id="mix" src="audio/mix.wav" data-start="0" data-duration="30" data-track-index="1" data-volume="1"></audio>
</div>
<script src="assets/js/scene.js"></script>
```

- Add `<script>window.__timelines = window.__timelines || {};</script>` in the head so `lint` finds the registry.
- One paused timeline, registered at the end of the build: `window.__timelines['main'] = tl`.
- Keep the composition id and duration as constants in `scene.js`; reading them from the root at script time
  threw under `check`.
- `lint` warns `nested_structure_needs_subcomposition` for a single-file video with a nested stage. That warning is
  fine; splitting into sub-compositions buys nothing for a 30 s piece.
- Run the CLI pinned: `npx -y hyperframes@<version>`, with `HYPERFRAMES_NO_TELEMETRY=1` and
  `HYPERFRAMES_SKIP_SKILLS=1` (skips the GitHub skills update check).

## Time

- Build inside `document.fonts.ready.then(build)` and catch errors to the console (`probe.mjs` prints them).
- Everything is a pure function of time. Discrete state changes are `tl.set` calls; continuous ones are tweens or
  `frame(t)`. One driver tween calls `frame(t)` for counters, typing, the camera, sprite cycles, shimmer:

  ```js
  const driver = { t: 0 };
  tl.to(driver, { t: DUR, duration: DUR, ease: 'none', onUpdate: () => frame(driver.t) }, 0);
  frame(0);
  ```

  In `frame(t)`, write to the DOM only when a value changed (`if (el.textContent !== s) el.textContent = s`).
- Keyframe tracks (`track([{t, x, y, z, ease}])` in the template) give a value at any time; the ease on a key
  shapes the move into it. Derive a scrolling value as a sum of eased increments, not as overlapping track keys,
  which go non-monotonic.
- No `Math.random`, no `Date`, no `requestAnimationFrame` loops, only finite `repeat`s. A seeded RNG (mulberry32)
  covers particles and jitter.
- `fromTo` after the first on the same property needs `immediateRender: false`.
- Scenes: `tl.set('#scene', {autoAlpha: 1}, t0)` and `{autoAlpha: 0}` at `t1`. One DOM per UI state, toggled with
  `autoAlpha`, is simpler and more robust than mutating one DOM through states.
- Beat grids: for a music-led piece, derive every time from the tempo (`B = 60 / bpm`, a bar = 4 B) and write times
  as `5 * B`, so a re-time is one constant.

## Camera

One camera for the whole world: every world layer (an SVG back layer, the HTML middle, an SVG front layer) gets the
same transform, `translate(960 − x·z, 540 − y·z) scale(z)` with `transform-origin: 0 0`, where (x, y) is the world
point at the frame centre and z the zoom.

- Frame each beat so its subject fills the picture; keep motion away from the focal element small.
- Lean in when something is typed (zoom on the input while text appears), pull back for the answer.
- Measure the geometry of real UI once at build time (`getBoundingClientRect` of elements that do not depend on
  web fonts, or fixed layout) and feed it to the camera and cursor. Never guess coordinates for a click target.

## Motion

- Eases (Material's rule): entrances decelerate (`power3.out`, `back.out` for pops), exits accelerate (`.in`),
  on-screen and camera moves use `.inOut`, constant drift uses `none`. GSAP's default is `power1.out`.
- Durations grow with distance and size: 0.15–0.3 s for UI ticks, 0.3–0.5 s for camera moves and scene changes, up
  to about 1 s for the big move into the end card. One main transition style plus one accent at the climax.
- Music-led cuts: a small scale punch (1.07 → 1 over 0.34 s) and a short low-opacity flash on each cut; a slam
  (scale 1.5–1.9 → 1, 0.15 s, `power3.out`) plus a 5-step shake for a title. Count flashes: at most 3 per second.
- The cursor never jumps between scenes. Move it along an eased path, let it hover, press (scale 0.82–0.85 yoyo
  over 0.05–0.06 s), and show a ripple on the target. Clicks are cues too.

## Video clips

```html
<div class="clip-wrap"><video id="v-hook-1" src="assets/clips/hook-1.mp4" data-start="0" data-duration="0.375" data-track-index="3" muted playsinline></video></div>
```

- Every video needs a unique `id` (lint `media_missing_id`; without it the renderer froze the clip).
- Write videos as static markup. Videos created from JS may not be discovered by the runtime.
- The runtime sets the opacity of active clips, so fade, scale or move the wrapper, not the `<video>`.
- Clips that overlap in time need different `data-track-index` values (a 4×3 wall used tracks 10–21).
- Cut clips to their exact on-screen duration with a short GOP (`cut_clips.py` uses `-g 30`), muted.
- Render with `--video-frame-format png` when the footage is pixel art, UI or text: the default JPEG extraction
  softens hard edges.
- `probe.mjs --shots` seeks every visible `<video>` to the timeline time, so review frames match the render.

## Fonts and glyphs

- Vendor every font as woff2 with `font-display: block`; `lint` fails on a family without `@font-face`
  (`font_family_without_font_face`). For an OS font with no file, `src: local('Exact Name')` satisfies it, but the
  render then depends on the machine.
- Subset fonts miss glyphs: Google's `latin` subset has no → or ✓; some bundled subsets have → but no ✓ or ·.
  Draw them as SVG icons (Lucide, ISC) or strokes instead of letting a system font fill in.
- Pixel and display fonts can have very wide punctuation (DotGothic16's comma and period). Set numbers in the UI
  font, or pull the glyph in with a negative margin (`margin-right: -.3em` on a `<span>` around the dot).
- Text built from one `<span>` or `<tspan>` per character (for typing) collapses spaces; use `white-space: pre`.
- Do not measure text during the build. Give text explicit absolute layout, or bake metrics once in real Chrome
  and re-bake after a text change.

## SVG gotchas

- Transform SVG with `svgOrigin`; a `transformOrigin` in px is relative to the element's bbox.
- Stroke draw-on: `strokeDasharray: L, L+2` and `strokeDashoffset: L+1`, or round caps leave a dot before the pen
  arrives. A dashed stroke animated through `stroke-dasharray` ends up solid: reveal it through a mask of solid
  copies instead.
- Inline `<span>`s ignore transforms; make them `display: block` or `inline-block`.
- A `clip-path` on an element moves with its transform: wrap the element in a `<g>` and clip the wrapper.

## Captions layer

The template builds captions from `window.CAPTIONS` (written by `build_captions.py`): one chunk at a time in a dark
pill at the bottom centre, 38 px semibold in the brand's UI font, each word going from 42% to full opacity at its
spoken time. `SHOW_CAPTIONS = false` renders the clean version. Keep the pill clear of UI: move the camera, not the
captions, when a control would sit behind it.

## Checks

- `lint`: 0 errors. `check --samples 24 --timeout 15000 --caption-zone "x0=0;y0=.86;x1=1;y1=1"`: runtime errors,
  layout overlaps and overflow, motion, WCAG AA contrast on sampled text, and UI inside the caption band.
- Intended overlaps: `data-layout-allow-occlusion` (a label over a video, a thread scrolling under a header) and
  `data-layout-allow-overlap` (two states crossfading); world layers get `data-layout-allow-overflow`.
- Never put `data-layout-ignore` on content layers to get a green check. Captions and cursor layers may carry it.
- `check` samples. It can pass with a broken shot in between, so always look at the frames.
