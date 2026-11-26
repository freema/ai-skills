---
name: preview-video
description: "Record, cut and wire a PixelDen game preview clip (the silent square gameplay loop on the big 2×2 tile and the game page poster) with tools/preview-video. Covers which games get a clip, the clip spec, capture.mjs commands, writing a driver in drivers.mjs with the game's own bot, crop and scale rules, the registry field iconAnimatedUrl and its test, playback rules and how to judge quality. Triggers: 'preview video', 'preview clip', 'gameplay loop', 'iconAnimatedUrl', 'tile video', 'náhledové video', 'klip hry', 'video na dlaždici', 'natočit náhled hry'."
---

# Preview video

A preview clip is a 4.5–6 s silent loop of real play, recorded from the game
canvas in muted headless Chrome. Spec and history: `tasks/144-mobile-first-redesign.md`,
chapter 9. Tool: `tools/preview-video/` (`capture.mjs` runs it, `drivers.mjs`
holds per-game behaviour, `page.mjs` is the in-page frame stepper).

## When a game gets a clip

- Only games that are shown on a big **2×2 tile** (pinned or trending games on
  the home page, the batch with `iconBigUrl`). A normal 1×1 or 2×1 tile never
  plays video.
- Never a release condition: tile and game page must work without the clip
  (the icon / poster is always there underneath).
- No clip for a game whose play does not read at 237 CSS px (see pitfalls).

## Clip spec (what capture.mjs produces)

| Property   | Value                                                                               |
| ---------- | ----------------------------------------------------------------------------------- |
| Shape      | square, side = art pixels × largest integer that fits `--size` (default 576)        |
| Frame rate | 30 fps, frames evenly spaced in game time (loop stepped by hand at 60 Hz)           |
| Length     | 4.5–6 s, chosen from a 12 s recording                                               |
| Sound      | none (`-an`; the test rejects an audio track)                                       |
| Files      | `preview-vN.webm` (VP9, listed first) and `preview-vN.mp4` (H.264, `+faststart`)    |
| Budget     | ≤ 500 KB per file: CRF is bisected to the best quality that fits                    |
| Loop point | window whose last frame is closest to its first; if the seam is bigger than half    |
|            | the median frame-to-frame change, the last `--xfade` (10) frames fade into the start |

AV1 is also encoded for comparison only; VP9 beat it on SSIM at the same size
for all six v1 clips, so it is not installed (`PREVIEW_MODERN=av1` would).

## Commands

Needs `task dev` running (localhost:3002), Google Chrome and ffmpeg with
libx264 + libvpx-vp9 (+ libsvtav1) on the host. It runs host-side with plain
`node`, like `task smoke`; it is not a container command.

```bash
node tools/preview-video/capture.mjs <slug> --sheet tasks/<n>-assets/<slug>-sheet.jpg
node tools/preview-video/capture.mjs <slug> --encode-only --target 450   # re-cut, no new recording
node tools/preview-video/capture.mjs <slug> --install                    # copy mp4 + webm to public/assets/games/<slug>/
node tools/preview-video/capture.mjs <slug> --version 2 --install         # new file name for a changed clip
```

Other options: `--record S`, `--min S`, `--max S`, `--fps N` (must divide 60),
`--size PX`, `--xfade N`, `--base URL`. Frames, `master.mkv`, the encodes and
`report.json` land in `preview-out/<slug>/` (gitignored).

A clip that changes gets a new `--version` (new file name): static assets are
cached for a year (immutable), so never overwrite a published `preview-v1`.

## Adding a driver

Without a driver the tool starts the game like the smoke test (centre click,
Enter, Space, the smoke recipe) and records whatever happens, which is usually
a menu or a player standing still. Add an entry to `drivers` in
`tools/preview-video/drivers.mjs`. Every member is optional; the header of the
file lists them (`skipStart`, `start`, `setup`, `warmup`, `ready`, `tick`,
`crop`, `follow`, `ok`, `grid`, `size`, `probe`).

Rules:

- **Use the game's own engine bot** where it has one (`app/games/<slug>/engine/bot.ts`,
  the same `expert` the balance adapter uses). Hand it the player seat in
  `setup` by replacing the scene's input method on the running instance; the
  dev server serves modules by path, so `await import("/app/games/<slug>/...")`
  works. **No game file is changed** for a clip.
- No bot: script the input in `setup` (Gloop replaces its pad reader) or in
  `tick` (Mossback Mahjong calls the scene's own tap handler in solver order).
- `ok` excludes frames you must not loop over (player dead, round over, menu).
- `ready` waits for real action (race started, level loaded) before recording.
- `probe` logs state once a second while you write the driver (Gloop keeps
  one).

Real example (Redline Pursuit, engine bot):

```js
"redline-pursuit": {
  setup: async function (game) {
    const bot = await import("/app/games/redline-pursuit/engine/bot.ts");
    const wait = () => new Promise((r) => window.setTimeout(r, 100));
    while (!game.scene.isActive("Race")) await wait();
    const s = game.scene.getScene("Race");
    while (!s.race) await wait();
    const b = new bot.DriverBot(bot.EXPERT, 5);
    s.controls = () => b.controls(s.race);
  },
  size: 648,      // 384×216 canvas: a 216 square at 3×
  warmup: 8,
  ok: (game) => game.scene.isActive("Race"),
},
```

Find the scene key, the input hook and the state names by reading the scene
(`app/games/<slug>/scenes/`), not by guessing; invoke `phaser-gamedev` first
when you read game code.

## Crop and scale

- `crop` returns `{ cx, cy, size }` in game units; default is the centred
  square of the shorter side. Keep the HUD, score line and tutorial bars out.
- `follow` makes the crop glide after a point (the player) in canvas game
  units; the tool first locks the moving crop to the art grid.
- The art pixel grid is detected from the frames; the clip is rebuilt at one
  art pixel per pixel and scaled up by an integer, nearest neighbour.
- `grid: 1` keeps canvas pixels when detection is wrong: smooth-zoom cameras
  (Pixel Racer, Hollow Moon) and sprites moving off their art grid (Fuseheads)
  have no stable grid.
- `size` caps the output side; pick a multiple of the art side (640, 648, 720).

## Registry and test

- Set `iconAnimatedUrl: "/assets/games/<slug>/preview-v1"` (no extension) in
  `app/games/registry.ts` (invoke `phaser-gamedev` before editing it).
- `app/games/icons.test.ts` checks, for every game with `iconAnimatedUrl`:
  both `.mp4` and `.webm` exist, each ≤ 600 KB, no audio track in the header,
  MP4 has `moov` before `mdat` (faststart). Run `task test -- app/games/icons.test.ts`.

## Where it plays

`PreviewVideo` (`app/components/preview-video.tsx`) renders the clip in two
places only: the **2×2 `GameTile`** and the **game page poster** before Play
(it disappears once the game loads). The `<video>` enters the DOM only after
`load` + idle and once its box is on screen; `poster` is the file the image
underneath already shows, so the image stays the LCP element. Only the most
visible clip (≥ 50 % on screen) plays, others pause. Nothing loads with
`prefers-reduced-motion: reduce` or Save-Data. On desktop the game starts by
itself after idle, so the poster clip is rarely seen there.

## Judging quality

- `report.json`: loop seconds, seam distance vs `motion`, fade frames,
  `identicalCaptureFrames` (game stood still), per codec CRF, bytes, SSIM
  against the lossless master and `duplicates` (mpdecimate drops).
- Targets from v1: SSIM ≥ 0.9 for VP9, 0 duplicate frames in a moving game,
  no page errors.
- Look at the `--sheet` contact sheet (8 frames of the loop): is the action
  readable, is the HUD out, is the player in frame on every tile?
- Check the clip on the real 2×2 tile on a phone (237 CSS px on 384 px
  width). Headless Chrome only proves it plays.

## Pitfalls actually hit

- **Smooth-zoom cameras** (Pixel Racer, Hollow Moon): no art grid to find; the
  clip scales canvas pixels ×2.
- **Sprites off the pixel grid** (Fuseheads moves heads in canvas pixels on a
  3× art grid): grid detection votes wrong, use `grid: 1`.
- **Whole-board games are small**: the full Fuseheads arena or Mossback board
  on a 237 px tile makes heads and tiles ~16 px; crop tighter if the game
  allows it, or judge on the phone before installing.
- **Camera stops at world edges** (Pixel Racer): follow the player itself,
  not the camera centre.
- **Deaths and menus in the loop**: guard with `ok`, or the loop may wrap
  over a respawn (Gloop, Fuseheads).
- **First visit story/menu screens**: page through them in `start`
  (Hollow Moon presses Enter until the `Game` scene runs).
- **SwiftShader is slow**: never record in real time; the stepper already
  handles it, so do not lower `--fps` to "help".

### Learned with the v0.72 batch (pixelopolis, alchemia, pixel-kart, harvest-hollow, flappy)

- **The loop picker prefers the quiet stretch.** It takes the window whose
  last frame is closest to its first, so in a game that grows (a city filling
  up, a gate coming in) it picks the part where least happens. Make `ready`
  wait for the moment you want (Neon Flap: two gates ahead of the bird) and
  record short (`--record 6.2`), so every window starts near it.
- **Scripted input on the scene's `preupdate`** (`s.events.on("preupdate", …)`)
  also runs during warmup, unlike `tick`; the scene's own flags (Flappy's
  `tapQueued`) are read in `update` right after it.
- **Slow sims: fast-forward in `setup`** by calling the scene's own day step
  in a loop (Pixelopolis `dayPassed` wrapped so the balance bot plays each
  new month) instead of a long real-time warmup.
- **Balance bots may assume a test map.** The Pixelopolis bot builds nothing
  useful on a real map with water; call its `clearMap` first, as the tests do.
- **Odd crop sides** (e.g. 7.5 tiles of 66 px = 495) used to break the
  yuv420p encode; capture.mjs now drops one art pixel to keep the side even.
- **Busy clips cost quality**: Alchemia, Pixel Kart and Harvest Hollow hit the
  500 KB budget at VP9 CRF 40–47; `--max 5` buys SSIM back.
