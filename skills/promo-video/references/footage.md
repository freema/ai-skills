# Footage: recorded gameplay, page screenshots, rebuilt UI

## Recording a canvas (games, WebGL, live charts)

`scripts/record-canvas.mjs` drives a live page in headless Chrome and records the largest `<canvas>` (or a
selector) through `captureStream(fps)`, plus the page's sound: it patches `AudioNode.prototype.connect` before any
page script runs, so every connection to the speakers is mirrored into a `MediaStreamDestination`, and mixes all
AudioContexts into one track. `MediaRecorder` writes VP9/Opus WebM.

A plan per take, in `capture/plans/<name>.json`:

```json
{ "url": "https://example.com/games/runner", "name": "runner", "viewport": [1600, 1000],
  "setup": [ {"clickText": "^essential only$"}, {"wait": 300}, {"clickText": "^skip$"},
             {"clickText": "click to load"}, {"waitFor": "canvas"}, {"wait": 4000} ],
  "steps": [ {"rec": "start"}, {"wait": 3600}, {"down": "ArrowRight"},
             {"repeat": 8, "steps": [ {"wait": 420}, {"tap": ["ArrowUp", 260]}, {"wait": 520} ]},
             {"up": "ArrowRight"}, {"wait": 500}, {"rec": "stop"} ] }
```

- `setup` runs before the canvas is located (cookie banner, onboarding, a "load" button); `steps` run after one
  focus click in the canvas centre. Click positions are fractions of the canvas box, so a plan survives a layout
  change.
- Steps: `wait`, `press`, `down`/`up`, `tap: [key, ms]`, `click: [fx, fy]`, `move: [fx, fy]` with `steps`,
  `mdown`/`mup` (drawing), `clickText` (regex on button/link text), `clickSel`, `waitFor`, `rec: start|stop`,
  `shot` (a PNG of the canvas, to find coordinates), `repeat`.
- Record one plan at a time; parallel runs dropped frames.
- **Clicks need a delay.** Game UIs (Phaser buttons among them) ignored a press and release in the same frame; the
  recorder clicks with a 120 ms hold. If a button still does nothing, take a `shot` and re-measure: a y off by 4% of
  the canvas missed a row of buttons.
- **Read the game's own prompts.** One game launched with "PRESS W OR ↑", not Space. Look at a `shot` of the
  start screen before writing the plan.
- A scripted player is a bad player. Plan the input to reach the interesting moment, record more than you need,
  and pick the clip offsets later. If the run dies early, hold the last good frame (`hold` in `cut_clips.py`) rather
  than showing a game over. A game whose first seconds look empty does not belong in a 0.375 s shot: drop it.
- Gameplay is the product's own; generated art inside it is covered by whatever license the user has for it. Ask
  before using it, and say so in the README.

## Cutting clips

`scripts/cut_clips.py` reads `capture/clips.json` and writes one H.264 clip per entry (no audio, `-g 30`):

```json
{ "raw": "capture/raw", "out": "assets/clips", "fps": 60, "pad": "0x0b0f1c",
  "clips": {
    "hook-runner": {"src": "runner", "start": 16.0, "dur": 0.5, "size": [1920, 1080], "scale": "neighbor"},
    "cell-runner": {"src": "runner", "start": 2.0, "dur": 7.6, "crop": [0, 90, 960, 540], "size": [448, 252], "scale": "area", "hold": 6.0},
    "wide-break":  {"src": "breakout", "start": 9.0, "dur": 0.3, "size": [1920, 1080], "scale": "fit:lanczos"} } }
```

- MediaRecorder output has a variable frame rate (the WebM often reports no duration at all). The cutter forces a
  constant rate (`fps=60`) before anything else, so the clip's frames map one to one onto a 60 fps composition.
- Crop in source pixels to 16:9 before scaling. Check the source size first (`ffprobe`): a canvas often renders
  at a small internal resolution (480×270) and is upscaled by CSS.
- Scaling pixel art: integer upscales with `neighbor` keep pixels hard (480×270 → 1920×1080 is 4×); `area` for
  downscales; `lanczos` for non-integer enlargements. `fit:<scaler>` keeps the whole frame and pillarboxes it in the
  game's own background colour, for a game whose aspect does not crop well.
- x264 needs even dimensions: a 432×243 cell failed; 448×252 worked.
- Cut each clip to its exact on-screen duration (plus a frame or two), and choose offsets so the best moment of
  each clip lands on its beat.

## Clean screenshots of the real page

For a beat that shows the product's page (a game page, a dashboard), take a 2× screenshot of the live page and
clean it in the DOM first rather than in an image editor:

```js
// in page.evaluate, after dismissing banners with clickText
const leaves = [...document.querySelectorAll('body *')].filter((el) =>
  el.children.length === 0 && !/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(el.tagName) && el.getBoundingClientRect().width > 0);
for (const el of leaves) if (/^\d[\d,.]*\s*plays?$|^\d+\s+playing now$/i.test(el.textContent.trim())) el.parentElement.style.visibility = 'hidden';
```

- Hide what you will not claim (live counters, view counts), ad slots and anything personal. Match exact text
  with anchored regexes and only visible leaves: a loose `plays?` also matched "play" and hid the play button.
- Guard size-based hiding (an ad card is the ancestor taller than 200 px and narrower than 450 px), or a match in
  `<body>` hides the page.
- Print the boxes of the elements the camera or cursor will target (`getBoundingClientRect`) and use those numbers
  in the scene; at DPR 2 the image is twice the CSS size.

## Rebuilding a product's UI

When the video needs the product's UI in motion (a chat widget, a dashboard card), rebuild it in the composition
from the product's own source instead of screen-recording it:

- Copy the component's CSS from the repository, scope it under one class (`.pd-widget …`), and scale it with
  `zoom` for video (1.6× for a widget that is small on a 1080p frame).
- Port the render function to plain DOM in `scene.js` and feed it **real states**: capture the server's actual
  responses from a real run (save them to `research/<run>.json`) and build one DOM per state. Toggle states with
  `autoAlpha` on the beat.
- Around it, keep third-party chrome generic: a neutral "New chat" frame with an input, no assistant brand, no
  logos. Show the assistant's narration as grey placeholder lines rather than inventing text.
- Measure positions at build time from elements that do not depend on loading fonts, and scroll the view with
  eased increments keyed to the clicks.
- Compress timing honestly: state in the README that the real interaction is slower or split into more steps.
