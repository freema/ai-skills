# Sound: voiceover, music, effects, mix

All levels below are integrated loudness measured with ffmpeg `ebur128` (`audiolib.loudness`). Report the measured
values in the README, not the targets.

## Voiceover (ElevenLabs)

- The key lives only in `.env` (`ELEVENLABS_API_KEY=…`, mode 600, git-ignored) or the environment. `tts.mjs` looks
  in the environment, then in `.env` in the project and up to three directories above it, and never prints it.
- `audio/vo/script.json` holds the voice and the lines:

  ```json
  { "voice_id": "EXAVITQu4vr4xnSDxMaL", "model_id": "eleven_multilingual_v2", "output_format": "mp3_44100_128",
    "voice_settings": { "stability": 0.45, "similarity_boost": 0.8, "style": 0.3, "use_speaker_boost": true, "speed": 1.08 },
    "head": 0.45, "tail": 2.0,
    "lines": [
      { "id": "l1", "text": "Signups dropped by half overnight.", "gap_after": 0.4 },
      { "id": "l4", "text": "Try it free at example.com.", "say": "Try it free at example dot com.", "group": [1, 1, 1, 1, 3], "burn": false }
    ] }
  ```

  `text` is what the captions show; `say` is what the voice reads when the spelling would be misread (a brand, a
  URL); `group` maps each caption word to its number of spoken words, so timings come out in caption words.
  Tell the user which pronunciation you assumed.
- `tts.mjs` calls `POST /v1/text-to-speech/{voice}/with-timestamps` once for the whole script, so the read is
  continuous, and saves the MP3 plus character timings. `--dry-run` shows the request without sending it.
- A free-tier key (observed 2026-10) returned only `mp3_44100_128` and could not list voices or models: pass a
  premade voice ID directly. Premade voices used so far: Jessica `cgSgspJ2msm6clMCkdW9` (speed 1.1), Sarah
  `EXAVITQu4vr4xnSDxMaL` (speed 1.08). Ask the user whether they want a female or male voice.
- `build_vo.py` assigns spoken words to lines, cuts each line out of the take with a little pre-roll and decay,
  re-spaces the lines (`head`, per-line `gap_after`, `tail`), runs a light chain (75 Hz high-pass, gentle
  compression) and masters the stem to −14 LUFS / −1 dBTP. It writes `audio/vo/timing.json` and
  `assets/timing.js` (`window.VO`), and prints the total: that is the composition's `data-duration`.
- Key every visual beat to word times (`word('l2', 0)` in the template). When a caption reads too fast, widen the
  gap after that line instead of cutting words.
- **Re-take one line** (a changed URL, a misread word): `node scripts/tts.mjs --line l8` sends the lines around it
  as `previous_text`/`next_text` and writes `audio/vo/take.l8.*`. Add `"take": "take.l8"` to the line; `build_vo.py`
  skips that line's old words in the main take, so every other line keeps its sound and timing. Compare the
  re-take's loudness with the rest before using it.

## Music

- Licensed tracks: Pixabay blocked scripted downloads (403); Mixkit worked. Record track, author, URL and license
  terms in the README. The Mixkit Stock Music Free License allows online ads and social video without attribution,
  but not broadcast TV or radio. Use a different track per product.
- **Back-time the track** so its final hit lands on a strong end-card moment (the URL highlight, the spoken URL):
  in `build_mix.py`, `MUSIC = {'file': …, 'track_hit': <s into the file>, 'spot_hit': <s into the video>}`. Then
  check that the beat grid also falls on a key visual hit; nudge the visual, not the music.
- Music under a voice sits at −36 LUFS: a bed, not a song. A music-led trailer puts it at −16.

### Rendering a game's own music and SFX offline

When the product has its own audio code (a WebAudio chiptune sequencer, an SFX table), render it instead of
licensing music: it is on-brand and needs no license. The pattern, used for a 30 s game trailer:

1. Write a small entry file that imports the game's sequencer and SFX modules unchanged and exposes two functions
   on `window`. Bundle it with the product repo's own esbuild (`esbuild entry.ts --bundle --format=iife`).
2. Load the bundle into headless Chrome (`browser.mjs` → `page.addScriptTag({content})`).
3. **Music:** create an `OfflineAudioContext(1, seconds * 48000, 48000)`, rebuild the player's output graph (bus
   gain, lead, echo/delay) on it, and call the sequencer's per-step scheduling function for every step at
   `step * stepSeconds`. Then `startRendering()`.
4. **SFX:** if the SFX code creates its own `AudioContext`, swap `window.AudioContext` for a function that returns
   your offline context while you call it, then restore it.
5. Return the float samples as base64 and write a 32-bit float WAV in Node.
6. **Arrange from the song's own bars.** Build a new song object bar by bar from the original's bars: drop the lead
   for a breakdown, add a drum fill, end on a held tonic chord. The edit then sits on the song's grid by
   construction.

Put the result in `audio/stems/` and point `MUSIC` at it with `track_hit = spot_hit = 0`; put rendered SFX in
`audio/sfx/<name>.wav` and map cue types to them with `ALIAS`.

## Sound effects

- The scene logs cues, `cue(t, type, {gain, …params})`; `probe.mjs --cues audio/cues.json` exports them and
  `build_mix.py` places them. Never place sounds by hand in an editor: a re-time would desync them.
- `type` is a sample in `audio/sfx/<type>.wav` (or `ALIAS[type]`), or a generator in `sfx.py`: scribble, pop,
  click, tick, whoosh, error, success, stamp, blip, hop, lock, sparkle, riser, sweep, drop, chirp, ding. Generator
  parameters ride on the cue (`{dur: 0.5}`, `{pitch: 1.2}`, `{note: 76}`); `gain` is in dB.
- Add a generator for each new kind of hit rather than downloading effects. Keep `render()`'s declick and seed any
  noise. Audition everything with `python3 scripts/sfx.py` (writes `audio/sfx-preview/`).
- Typing: the template logs a quiet `tick` on every second character; at typing speed that already reads as typing.
- Each cue gets a small deterministic pan, so stacked hits do not all sit dead centre.

## The mix

`build_mix.py` reads the duration from the root's `data-duration`, then:

1. voice stem (if `audio/stems/voice.wav` exists) as mastered by `build_vo.py`;
2. music: back-timed, faded in if it enters mid-track, faded out, normalized to its target;
3. SFX stem: all cues summed, normalized to its target;
4. sum → 16 kHz low-pass → gain plus a true-peak-safe limiter, iterated until the mix is on target with a true peak
   at or below −1.5 dBTP;
5. a test AAC encode (192 kbit/s) of the mix; **the build fails if its true peak is above −1 dBTP**.

Why step 5: HyperFrames measures the true peak after its own AAC encode and turns the whole track down when it is
above −1 dBTP. One render came out 4.4 dB quiet from a single sibilant whose AAC overshoot reached +1.5 dBTP while
the WAV peaked at −1.5. A lower limiter ceiling did not fix it; the low-pass before the limiter did, because AAC
drops the content above about 16 kHz and the limiter then sees the peaks the encoder will produce.

Targets: voiceover spot −12 LUFS (YouTube turns loud uploads down to about −14 and never turns quiet ones up, so
−12 loses 2 dB there; no platform publishes an official target); music-led web video −14 LUFS. Measure the rendered
MP4 too (`ffmpeg -nostats -i out.mp4 -af ebur128=peak=true -f null -`): AAC moves the result by about 0.1 LU.
