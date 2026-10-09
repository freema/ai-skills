---
name: promo-video
description: >
  Make short promotional videos as code — product spots, feature demos, launch
  and game trailers — with HyperFrames (HTML + GSAP rendered to MP4). Covers the
  brief and facts check, a 15–35 s story shape, a runnable template with one
  camera and a pure frame(t) driver, ElevenLabs voiceover with word timings,
  burned-in captions checked against Netflix rules, synthesized or engine-rendered
  sound effects placed from a cue log, a loudness-checked mix that survives the
  AAC encode, recorded browser/canvas gameplay, recreated product UI, review
  frames, and web/social delivery. Use when the user asks for a promo, spot,
  teaser, trailer, demo or explainer video, or a social video of a product or game.
---

# Promo video as code

A video is a web page that HyperFrames renders frame by frame: an `index.html` composition, one paused GSAP
timeline, and a soundtrack built from stems. Everything is a pure function of time, so a render is reproducible and
a one-word change is a re-render, not a re-edit.

The method comes from four finished videos: two 30–33 s product spots with voiceover, a 36 s how-to for one module of
a product, and a 30 s music-led game trailer with recorded gameplay. Pick the shape that fits:

| Shape | Carried by | Mix targets (integrated) |
|---|---|---|
| **Voiceover spot**: one story told by a voice, product UI doing the work, captions | voice | voice −14 LUFS, music bed −36, SFX −26, mix −12 |
| **Music-led trailer**: supers on a beat grid, footage, no voice | music | music −16, SFX −22, mix −14 |

Both: true peak ≤ −1 dBTP after a test AAC encode, 1920×1080, 60 fps, an end card held about 2 s.

## What ships with the skill

| Path | Does |
|---|---|
| `scripts/new-project.sh <dir>` | copies the template and scripts, vendors GSAP 3.14.2 and Inter, writes `.gitignore` |
| `assets/index.html`, `assets/scene.js` | the template: an 8 s working composition, hook → product does one task (typing, cursor, click, result) → end card, with one camera, `frame(t)`, a cue log and a caption layer |
| `assets/script.json` | example voiceover script (`say`, `group`, `chunks`, `gap_after`, `burn`) |
| `scripts/probe.mjs` | serves the project, reports errors, `--cues` exports the SFX cue log, `--shots` saves review frames (videos seeked) |
| `scripts/tts.mjs` | ElevenLabs take with character timestamps; `--line` re-takes one line; `--dry-run` |
| `scripts/build_vo.py` | splits the take into lines, re-spaces them, masters the voice, writes word timings |
| `scripts/build_captions.py` | caption chunks + `.srt`/`.vtt`; fails the build on Netflix rule breaks |
| `scripts/sfx.py` | 17 deterministic synthesized UI sounds (pop, click, tick, whoosh, ding, …) |
| `scripts/build_mix.py` | voice + back-timed music + SFX from cues → `audio/mix.wav`; fails if the AAC true peak is above −1 dBTP |
| `scripts/record-canvas.mjs` | records a live canvas + its WebAudio from a scripted input plan |
| `scripts/cut_clips.py` | trims, fixes the frame rate, crops and scales recordings into composition clips |
| `scripts/deliver.sh` | versioned web encodes (H.264 MP4, VP9 WebM, poster) |
| `scripts/audiolib.py`, `scripts/browser.mjs` | shared helpers (ffmpeg/numpy audio, headless Chrome lookup) |

Requirements: Node 22+, Python 3 with numpy, ffmpeg with libx264, libvpx and libopus. HyperFrames runs through
`npx`; the browser scripts reuse the puppeteer-core it installs and its chrome-headless-shell
(`npx hyperframes browser ensure` downloads one). Tested with HyperFrames 0.8.111, GSAP 3.14.2, ffmpeg 8.1,
Python 3.9, numpy 2.0.

## Workflow

1. **Brief and facts.** Before writing a word of script, check every product name, number and claim against the
   product's own sources (site, docs, code) and keep a facts file next to the project: claim → source, a
   *made up on screen* list (example data, names, compressed timing), and a *don't claim* list. When sources
   disagree, leave the number out or round it to something that stays true ("40+ games"). Open every URL that will
   appear on screen with `curl -L`. See `references/story.md`.
2. **Ask only the decisions that are the user's**: where the video will live (homepage with sound, feed autoplay,
   ad), voice or music-led, which claims to make, permission to use generated or third-party assets, any real person's
   name on screen. Decide the rest yourself and write the decisions down.
3. **Script as a beat table**: time, picture, super/caption, sound. Hook in the first 3 s on the product's own
   surface, brand by 5 s, one task end to end, one CTA. Keep it working with the sound off.
4. **Start the project** with `bash <skill>/scripts/new-project.sh <dir>` and run the build loop once on the
   untouched template, so a broken toolchain shows up before your content does.
5. **Assets**: record footage (`references/footage.md`), take clean screenshots, rebuild UI from the product's
   CSS and real data, vendor fonts and the official logo. Draw illustrations yourself.
6. **Voiceover** (voice spots): write `audio/vo/script.json`, `tts.mjs`, `build_vo.py`, `build_captions.py`. The
   printed total becomes `data-duration`. Key every visual beat to word times (`references/audio.md`).
7. **Compose**: replace the template's beats in the project's `index.html` and `scene.js`, following
   `references/composition.md`. Log a cue for every sound with `cue(t, type, {gain})`.
8. **Sound**: `probe.mjs --cues`, then `build_mix.py`. Report the measured loudness, not the targets.
9. **Review**: frames every 0.5–1 s with `probe.mjs --shots`, then `lint` and `check`, then the render, then
   frames extracted from the final MP4. Look at them; `check` samples and can miss a shot.
10. **Deliver and document**: render, verify with ffprobe and ebur128, encode for the destination
    (`references/delivery.md`), and write the project README: sources and licenses, what is made up, measured
    loudness, posting notes, rebuild steps.

## Build loop

```sh
export HYPERFRAMES_NO_TELEMETRY=1 HYPERFRAMES_SKIP_SKILLS=1   # no telemetry, no skills update check
HF="npx -y hyperframes@0.8.111"                                # pin the version you tested with

node scripts/tts.mjs && python3 scripts/build_vo.py && python3 scripts/build_captions.py   # voice spots only
node scripts/probe.mjs --cues audio/cues.json        # SFX cue log from the scene
python3 scripts/build_mix.py                         # → audio/mix.wav, audio/loudness.json
node scripts/probe.mjs --shots every:0.5 --out snapshots
$HF lint .                                           # 0 errors
$HF check --samples 24 --timeout 15000 --caption-zone "x0=0;y0=.86;x1=1;y1=1" .
$HF render --quality delivery --fps 60 --output renders/<name>.mp4 .   # add --video-frame-format png for pixel art / UI footage
```

Rerun from the step you changed: a scene edit that moves a cue needs `--cues` and `build_mix.py` again; a script
edit needs the whole voice chain. The render embeds `audio/mix.wav` as it is on disk.

## Rules that are not negotiable

- **Keys stay in `.env`.** `tts.mjs` reads `ELEVENLABS_API_KEY` from the environment or a `.env` file and never
  prints it. Never put a key in a prompt, a script, a log or a README. Do not read `.env*`, credentials or keys in
  the product's repository while researching it.
- **A local render is not a publication.** Never run `hyperframes publish`, upload, or post without the user's
  explicit go-ahead for that destination. Record a platform, date and URL only after the post is live and you
  have opened it.
- **No invented facts.** No player counts, revenue, ratings, testimonials, endorsements or competitor claims you
  cannot source. Example data is labelled as made up in the README. Do not put words in a third party's mouth
  (an AI assistant's answer, a customer quote); show placeholders instead.
- **Other brands.** When a scene borrows another product's look (a chat, an editor), take tokens and layout from
  real screenshots and source, but leave out its logo, name and UI chrome unless the user has the rights. Keep
  legal disclaimers out of the picture unless asked; put them in the README and the post text.
- **Determinism.** No `Math.random`, no clocks, no infinite repeats, no network at render time. Seed every RNG.
- **Accessibility.** At most 3 flashes in any one second (WCAG 2.3.1), no saturated red flashes; captions or
  supers carry the story for viewers without sound.

## Gotchas that cost the most time

- Build the timeline inside `document.fonts.ready.then(build)`. A synchronous build, or one gated on
  `document.fonts.load()`, rendered blank frames.
- Every font family needs an `@font-face` with a vendored file, or `lint` fails with `font_family_without_font_face`.
  Subset fonts miss glyphs (Google's `latin` subset has no → or ✓): draw those as SVG.
- Every `<video>` needs an `id`, or the renderer freezes it (`media_missing_id`). Write videos as static markup:
  ones created from JS may not be discovered. HyperFrames controls the opacity of active clips, so animate a
  wrapper `<div>`. Overlapping clips need different `data-track-index` values.
- Hard-code the composition id and duration in `scene.js`. Reading them from the root at script time threw under
  `check`.
- Do not measure text during the build: fonts may still be settling. Give elements explicit absolute layout.
- Pass `immediateRender: false` to every `fromTo` after the first one on the same element and property. Otherwise
  its `from` values are applied when the timeline is built and show before the tween starts.
- HyperFrames turns the whole soundtrack down when the true peak after its AAC encode is above −1 dBTP. One sibilant
  cost a render 4.4 dB. A 16 kHz low-pass before the limiter fixes it; `build_mix.py` does that and checks.
- `render --resolution` only supersamples. A 9:16 or 4:5 version is its own composition with its own framing.
- Do not silence `check` with `data-layout-ignore` on content layers: with everything ignored it reports
  "Timeline did not advance" and checks nothing. Use `data-layout-allow-overflow` and
  `data-layout-allow-occlusion` where an overlap is intended.
- `snapshot` sends frames to Gemini when `GEMINI_API_KEY` is set; pass `--describe false` unless the user wants that.

## References

- `references/story.md`: facts sheet, story shapes for voice spots and music-led trailers, beat grids, captions rules, accessibility, other aspect ratios.
- `references/composition.md`: HyperFrames structure, the timeline and `frame(t)`, one camera, motion and easing, cursor, video clips, fonts, SVG and text gotchas, checks.
- `references/audio.md`: ElevenLabs voiceover and re-takes, music licensing and back-timing, synthesized SFX, rendering a game's own audio offline, the mix and the AAC guard.
- `references/footage.md`: recording canvas gameplay with input plans, cutting clips, clean page screenshots, rebuilding a product's UI from its CSS and real states.
- `references/delivery.md`: the review loop, render settings, platform notes (X, YouTube, LinkedIn, DEV.to, self-hosted website), the project README and publication records.
