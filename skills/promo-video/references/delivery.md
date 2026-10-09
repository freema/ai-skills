# Review, render, delivery

## Review loop

1. `node scripts/probe.mjs` after every scene edit: it prints build errors, 404s and the timeline duration (which
   must match `data-duration`).
2. `node scripts/probe.mjs --shots every:0.5 --out snapshots`, then tile the frames into contact sheets
   (`ffmpeg -i a.png -i b.png -i c.png -filter_complex hstack=3 sheet.png`) and look at them. Look for clipped
   text, stray glyph dots, overlapping UI, captions over controls, framing, cursor jumps between scenes, a video
   that is frozen or missing.
3. `lint` (0 errors) and `check --samples 24 --timeout 15000 --caption-zone "x0=0;y0=.86;x1=1;y1=1"`.
4. Render, then extract frames from the MP4 at every beat (`ffmpeg -ss <t> -i out.mp4 -frames:v 1 …`) and look at
   them again: clips, fonts and audio behave differently in the renderer than in the probe.

## Render

```sh
npx -y hyperframes@0.8.111 render --quality delivery --fps 60 --output renders/<name>.mp4 .
```

- `--video-frame-format png` for pixel art, UI recordings and anything with hard edges.
- `--quality delivery` gave about 6.5 Mbit/s for flat motion graphics, which looked clean. YouTube recommends
  about 12 Mbit/s for 1080p60; `--video-bitrate 12M` is there if an upload looks soft. Busy gameplay at 60 fps needs
  the bitrate: a 30 s trailer master was 37 MB.
- Verify: `ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate:format=duration -of compact out.mp4`
  and `ffmpeg -nostats -i out.mp4 -af ebur128=peak=true -f null -` (integrated loudness and true peak).
- Captioned and clean versions: render twice, toggling `SHOW_CAPTIONS`.

## Platforms

Checked 2026-10. Specs change; re-check before posting.

- **X:** upload short videos natively. A native 33 s captioned MP4 got the whole media card and autoplayed in the
  feed; a YouTube link produced only a link card. Keep the copy on the product.
- **YouTube:** a separate channel of distribution and the source for embeds. Upload the master.
- **LinkedIn:** when posting the captioned file, turn off "Add auto captions", or post the clean file with the
  `.srt`. LinkedIn video ads take less than 30 fps: render a `--fps 30` copy for an ad.
- **DEV.to and similar blogs** have no video upload: post on YouTube and embed it (`{% embed <url> %}` on DEV.to).
- **Your own website:** check the site's Content Security Policy first. With no `media-src`, `default-src 'self'`
  applies and the video must be served from the site itself, not from YouTube or a CDN. Then:
  - `bash scripts/deliver.sh renders/<name>.mp4 <name>-v1 <poster-seconds>` → H.264 MP4 (CRF 23, faststart), VP9
    WebM (two-pass, CRF 33) and a poster JPEG.
  - Put the version in the file name: static files are usually cached as immutable, so a new cut needs a new URL.
  - A section with sound needs a click to play, so use controls and `preload="none"`; nothing downloads until the
    visitor presses play.

    ```html
    <video controls playsinline preload="none" poster="/assets/<name>-v1-poster.jpg" width="1920" height="1080">
      <source src="/assets/<name>-v1.webm" type="video/webm" />
      <source src="/assets/<name>-v1.mp4" type="video/mp4" />
    </video>
    ```

  - For a muted autoplay loop instead, use `autoplay muted loop playsinline` and a much smaller encode (720p or a
    shorter cut).

## Project README and records

Every video project gets a README with:

- **Output:** files, resolution, fps, duration, size, measured loudness.
- **How it was made:** where the footage, screenshots, UI states and audio came from (with dates and runs).
- **Simplified or made up on screen:** example data, names, scores, placeholder text, compressed timing, bot play.
- **Sources and licenses:** every asset with its source and license or permission (fonts OFL, icons ISC, GSAP's
  license, music license terms, the user's OK for generated art and the date).
- **Loudness:** a table of targets and measured values, including the test AAC encode.
- **Rebuild:** the exact commands, in order.
- **Status:** "rendered locally" until the user posts it. After a post, record the platform, date and the verified
  live URL, and keep the post copy next to the project. A render is not a publication, and a platform draft is not a
  published post.
