# Story, facts and captions

## Facts sheet first

Keep `research/<product>-facts.md` next to the project before the script exists:

- **Verified claims**: every on-screen claim with its source (page URL, doc, file path in the product's repo) and
  the date checked. Product names, feature names, tool names, prices, counts, URLs.
- **Made up on screen**: example data, handles and names, scores, compressed timing, a generic chat frame, a typed
  message that stands in for a real request. Label these in the README as well.
- **Don't claim**: anything the sources do not support or that would age badly: user or player counts, "ultimate",
  "hand-drawn", "ad-free", rankings, endorsements, competitor comparisons, unreleased features, a third party's
  logo or UI.

Rules of thumb:

- When the brief names something that does not exist, tell the user and use the real product.
- When sources disagree (a tool count on the site and in the docs), leave the number out or round down to a floor
  that stays true ("40+ games" rather than "46").
- `curl -L` every URL of the product that will appear on screen, including bare domains with paths. A root that
  redirects to `www` while deeper paths 404 is common; show the URL that works. The product's domains are the ones
  in the brief or on its own site; anything else on screen is a third party's.
- Never open a third-party URL just because it is on screen: a competitor in a monitoring demo, a customer's shop, a
  link in example data. If its existence matters, check headers only (`curl -sI --max-redirs 3 --max-time 10`) and
  never load it in a browser; if the domain is unknown to you or the user, ask before touching it.
- Made-up addresses use reserved names only (RFC 2606/6761): `example.com`, `example.org`, `example.net`, or a
  `.example` / `.test` domain (`shop.example`, `acme.test`). Never invent a plausible real domain (`mujshop.cz`,
  `bestdeals.com`): it is usually registered by someone, often a parked page with ad redirects or malware, and the
  check above, a viewer or a scanner will hit it. The same goes for e-mails (`anna@example.com`). List every made-up
  address under *made up on screen* in the facts file, so nobody verifies or opens it later.
- Real output beats invented output: copy the product's real formats (an alert email subject, a widget's states
  from a real run, a leaderboard's columns). Record the run or the request that produced them.
- Use a real person's name or face only when the user asks for it.

## Concepts before production (client work)

When the video is for a client, nothing gets scripted, voiced or built until the client has picked a direction.

1. **Walk the product with the user first.** Capture the live site (screenshots plus computed fonts and colours),
   write the facts sheet, and summarize: what the product does, its own claim and CTA, its hero output (the report,
   the alert, the ranking), and the facts the sources disagree on.
2. **Draft 3–4 concepts that differ in story, not in styling.** A set that worked: the product's own output as the
   story (the default recommendation, since it follows the voiceover shape below), problem-first, a feature
   explainer, and an onboarding demo. Give each 4–5 storyboard beats with a timecode and a voiceover line, plus what
   it suits, its strengths and its weaknesses. Mark any concept that needs more than 30 s.
3. **Pick with the user**, together with length and format, voice, and whether the client should choose.
4. **Client page.** A single page in the client's language: the shared spec (length, format, voice, captions, look,
   example data, end card), the concepts with storyboard frames drawn in the client's own tokens, the recommendation,
   and a form whose answers compose a reply the client copies and sends back. Put every conflicting fact into the
   form as a question that defaults to "leave it out". The user shares the page; never send it yourself.
5. **Record the choice** in the project README: who chose what, and when. The user may answer for the client and
   start right away; record those answers and keep the page for a later confirmation. Only then write
   `script.json`, and send the script with a voice sample for approval before building the composition.

## Shape of a 30-second voiceover spot

Built on Google's ABCD checklist for video ads (attention, branding, connection, direction), adapted to a demo.
Design for sound off: the captions and on-screen text carry the story.

- **0–3 s, the hook.** Open on a problem in motion, on the product's own surface (a metric dropping, an error
  appearing), not on a logo or a title card. Meta found most of an ad's value comes in the first seconds; LinkedIn
  asks for the key content in the first 10 s.
- **By 5 s, the brand.** Say the product name and show it on the product (the app's header, its icon), not as a
  floating title. Early branding helps recall but also skips, so keep it brief and inside the story.
- **Middle, one task end to end.** The product does one real job with its real names and output. Lean the camera in
  on input, pull back for the result.
- **End, one CTA.** The product's own CTA wording, spoken and shown with the URL. Hold the end card about 2 s after
  the last word.
- **Length.** 15–30 s works in every LinkedIn ad placement; organic posts can run 30–35 s. For a cut-down, cut whole
  beats, never the end card.

A how-to for one feature uses the same frame: problem → the request (a prompt, a command) → setup and the one rule
that matters → the code or the click → result and what the user never has to see → end card.

## Shape of a music-led trailer

- Pick the music first and put the whole edit on its grid. At 160 bpm a beat is 0.375 s and a bar 1.5 s; a 30 s
  trailer is 20 bars. Every cut, super and chip lands on a beat; section changes land on bars.
- Hook: one shot per beat for 4–5 beats, then a faster flicker (8th notes) behind the title slam.
- One super per bar, short and in capitals for display fonts ("FREE" / "IN YOUR BROWSER" / "NO DOWNLOAD").
- A breakdown (drop the lead) under any beat that needs reading, then a fill into the end card, and the song's
  final chord on the end card's first frame.
- Write the beat table with time, picture, super and sound, and keep it updated as built (`script.md`, "as built").

## Captions (voice spots)

- Burn captions in as their own layer, generated from word timings by `build_captions.py`.
- One short chunk at a time, broken after punctuation, never splitting an article or adjective from its noun.
  Set chunk sizes per line in `script.json` (`"chunks": [5, 4]`).
- The build enforces the Netflix English rules: at most 42 characters per line, at most 20 characters per second,
  5/6 s to 7 s on screen, gaps of either 2 frames or at least 0.5 s. Fix a failure by merging chunks or widening the
  line's `gap_after`, not by cutting words.
- Skip burning in lines the end card already writes in sync (`"burn": false`); the `.srt`/`.vtt` keep every line.
- Write the brand in its own casing.
- Render two versions: captioned, and `-clean` (`SHOW_CAPTIONS = false`) for platforms that take a caption
  file.
- Size: BBC guidance asks for a line height of 7–8% of the frame height and a line width of at most 68% of the
  frame. A 38 px pill (about 3.5%) suits a 16:9 video watched full screen; a vertical variant needs larger type.

## Accessibility

- No more than 3 flashes in any one second (WCAG 2.3.1) and no saturated red flashes. A white-out, a strobe or a
  fast blink counts. For a piece with real flashes, run EA's IRIS checker on the final MP4.
- Quick luma check, the largest frame-to-frame jump in mean brightness (0–255):

  ```sh
  ffmpeg -v error -i out.mp4 -vf signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=- -f null - \
    | awk -F= '/YAVG/{if(n++){d=$2-p; if(d<0)d=-d; if(d>m)m=d} p=$2} END{print "frames", n, "max luma jump", m+0}'
  ```

  A light UI spot measured jumps under 2; hard cuts between dark and light shots are what to look at.
- `hyperframes check` measures WCAG AA contrast on every sampled text element.

## Other aspect ratios

`render --resolution` only supersamples; it cannot reshape a composition. Author 9:16 (1080×1920) and 4:5
(1080×1350) as their own compositions that reuse the scene logic with their own framing. Keep text and logos out of
Meta's Reels margins: 14% at the top, 35% at the bottom, 6% at each side.

## Sources

Checked 2026-10. Platform guidance changes; re-check before an ad buy.

- Google Ads, ABCD for video: https://support.google.com/google-ads/answer/14783551
- Think with Google, branding in skippable ads: https://business.google.com/ca-en/think/marketing-strategies/creating-youtube-ads-that-break-through-in-a-skippable-world/
- Meta, sound-off design and the first seconds: https://www.facebook.com/business/news/updated-features-for-video-ads
- LinkedIn video ad tips: https://business.linkedin.com/marketing-solutions/success/best-practices/video-ad-tips
- Meta Reels safe zones: https://www.facebook.com/business/ads-guide/update/video/instagram-reels
- Netflix timed text, English: https://partnerhelp.netflixstudios.com/hc/en-us/articles/217350977 ; duration: https://partnerhelp.netflixstudios.com/hc/en-us/articles/215758617 ; gaps: https://partnerhelp.netflixstudios.com/hc/en-us/articles/360051554394
- BBC subtitle guidelines: https://www.bbc.co.uk/accessibility/forproducts/guides/subtitles/
- WCAG 2.3.1: https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html ; EA IRIS: https://github.com/electronicarts/IRIS
