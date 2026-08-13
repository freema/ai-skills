---
name: html-slide-deck
description: >
  Build self-contained HTML slide decks — one file, fixed 1920×1080 auto-scaling
  stage, keyboard/click navigation, progress bar, dark/light themes, speaker
  notes as HTML comments, and a token-based tech-editorial design system. Use
  when the user wants a presentation, slide deck, pitch deck, talk slides, or a
  slideshow that opens from a file:// URL in any browser with no build step and
  no framework. Covers the deck shell, a slide component catalog (terminal
  windows, compare cards, flow diagrams, stat tiles), per-deck accent colors,
  video/asset conventions, and content rules.
---

# Self-contained HTML slide deck

A deck is **one HTML file**: styles, markup, and a ~100-line navigation engine
inline. No reveal.js, no CDN, no build step — it opens from `file://`, survives
offline conference Wi-Fi, and diffs cleanly in git. Start every deck from
`references/deck-template.html` and replace the content; the design intent
behind it is documented in `references/design-system.md`.

## Workflow

1. **Collect source material first.** Real numbers, real command output, real
   screenshots. A deck written before its facts exists twice.
2. **Outline before markup.** Agree the slide list with the user (10–15 slides
   for a 30-minute talk): title → context/problem → the thing itself → demo →
   numbers → takeaways → Q&A. One idea per slide.
3. **Copy the template**, set `<title>`, the footer wordmark, and pick the
   deck's `--accent` color — one line, everything else derives from it.
4. **Fill the slides** using the component catalog (see reference). Reuse the
   example slides as starting points; delete what you don't need.
5. **Write speaker notes as you go**, not at the end (convention below).
6. **Check both themes** (`T` key) and a resized window before calling it done.

## Conventions

**Speaker notes** live in an HTML comment *immediately after* each
`</section>`:

```html
<!--
  WHAT TO SAY (slide 4):
  Walk through the output top to bottom. Expected question: "does it scale?"
  → yes, N calls/day since March, zero incidents.
-->
```

They never render, they travel with the file, and they keep the narrative — and
prepared answers to expected questions — next to the slide they belong to.

**Slide numbering is automatic.** The engine numbers `.idx` counters and the
`NN —` kicker prefixes from DOM order at load. Insert or reorder slides freely;
never hand-number anything. Give each `<section>` a short `data-label`.

**Repo layout** for a deck collection (one deck = one folder):

```
decks/
└── my-talk/
    ├── index.html      # the whole deck
    ├── assets/         # images, poster JPGs — small files only
    └── sources/        # outline, raw notes, data the slides were built from
```

**Videos never go into git.** Keep MP4s outside the repo; commit only a poster
JPG and wire the video with `<video poster="assets/demo-poster.jpg">` and a
relative path. A repo with committed videos bloats within weeks.

## Content rules

- **Real data or no data.** Never lorem ipsum, never invented numbers. If a
  number is on a slide, it has a source and a date; missing facts are asked
  for, not made up.
- **Nothing confidential in a shareable deck** — no internal hostnames,
  customer names, tokens, or PII in screenshots. Blur or rebuild examples.
- Bullets: 3–5 per slide, one line each. If a bullet wraps twice, it's prose —
  cut it or split the slide.
- Terminal slides show **trimmed real output** — keep the interesting lines,
  mark cuts with a `# …` comment line.
- Bold (`<b>`) is for the words the audience should retain; `.ac` accent spans
  are for the deck's key terms. If everything is bold, nothing is.

## Anti-patterns

- Pulling in reveal.js / a CDN / a framework — kills the single-file property.
- Hand-numbering slides or hard-coding "slide 7 of 14" in content.
- Inline hex colors instead of tokens — breaks the light theme and per-deck
  re-accenting (one `--accent` change must re-skin the whole deck).
- Responsive thinking — the stage is a fixed 1920×1080 canvas that scales as a
  whole; design at that size.
- A demo slide with no fallback — always keep a terminal/screenshot slide next
  to a live demo.

## References

- `references/deck-template.html` — runnable 7-slide skeleton: shell, engine,
  full component CSS, example slides with speaker-note comments.
- `references/design-system.md` — tokens, typography, component catalog,
  accent and light-theme rules, how to extend without breaking the system.
