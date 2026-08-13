# Deck design system — reference

Everything here refers to `deck-template.html` in this directory. The template is
the source of truth; this file explains the intent behind each piece so you can
extend it without breaking the system.

## Tokens

All colors flow from CSS custom properties on `:root`. Per deck you change
**one token**: `--accent`.

| Token | Dark | Role |
|---|---|---|
| `--bg` / `--bg-1` / `--bg-2` | `#0A0C11` / `#11141B` / `#161A22` | page ground / cards / raised chips |
| `--term` / `--term-bar` | `#0D1016` / `#181C25` | terminal window body / title bar |
| `--line` / `--line-2` | white @ 8 % / 15 % | hairline / stronger borders |
| `--text` / `--dim` / `--faint` | `#E9EBEF` / `#9AA1AE` / `#5A626F` | headings + bold / body / labels |
| `--accent` | per deck | THE brand color of this deck |
| `--soft` / `--soft-2` / `--hair` | `color-mix` of accent @ 14/22/40 % | tinted fills and borders — derive, never hand-pick |
| `--ok` / `--warn` / `--err` | `#5FD08A` / `#F2B53D` / `#F2685A` | terminal + status semantics |
| `--key` / `--str` / `--num` / `--kw` | blue/green/amber/purple | code-highlight semantics |

**Accent rules**

- One accent per deck. A series of related decks should use *different* accents
  (e.g. orange, teal, azure, brand-blue) so the audience can tell them apart.
- Never hand-pick tinted variants — `--soft`, `--soft-2`, `--hair` derive from
  `--accent` via `color-mix()`, so a single-line change re-skins the whole deck.
- `--accent-text` exists because light mode needs a darker accent for contrast;
  the light block derives it with `color-mix(in srgb, var(--accent) 58%, #06253f)`.

## Typography

| Var | Font | Used for |
|---|---|---|
| `--fd` | Space Grotesk | display: wordmark, `.h1`, `.h2`, big stat numbers |
| `--fb` | Hanken Grotesk | body text, bullets, cards |
| `--fm` | JetBrains Mono | kicker, counters, terminal, pills, labels |

Fonts load via one Google Fonts `@import`; system fallbacks
(`system-ui`, `ui-monospace`) keep the deck presentable offline. Base sizes are
tuned for a 1920×1080 stage viewed from a distance — body text 28 px, don't go
below ~18 px for anything the audience must read.

## Deck shell

- `#stage` is a fixed **1920×1080** canvas; `fit()` scales it with a CSS
  transform to any viewport. Design at that size, never think responsive.
- Slides are absolutely stacked `<section class="slide">` elements; `.active`
  fades/slides in, `.prev` parks left. Navigation: arrows / space / PageUp/Down /
  Home / End, click (left third = back), `T` theme, `F` fullscreen, `#N` hash
  deep-links.
- Slide numbers are **computed at runtime** from DOM order (`.idx` counter and
  the `NN —` prefix in `.kicker`), so inserting a slide never triggers manual
  renumbering. The title slide (index 0) is skipped — it shows the date.
- `render()` pauses `<video>` elements on non-active slides.

## Component catalog

Every slide starts with the same skeleton:

```html
<section class="slide" data-label="Short label">
  <div class="chrome"><span class="kicker">01 — Section</span><span class="idx"></span></div>
  <h2 class="h2">Headline <span class="sub">· qualifier</span></h2>
  <div class="body col gap-l" style="margin-top:40px; justify-content:center;">
    …content…
  </div>
  <div class="foot">Project Name · project.example.com</div>
</section>
```

| Component | Classes | Use for |
|---|---|---|
| Title hero | `.hero`, `.wordmark`, `.hero-sub`, `.hero-lead`, `.meta`, `.hero-stack` | slide 1: big name left, mini-diagram right |
| Bullets | `ul.b` | 3–5 statements; `<b>` for emphasis, `.ac` for accent terms |
| Callout | `.callout` (+ `.warnbox`) | the one sentence to remember / a caveat |
| Terminal | `.term` + `.term-bar` + `pre` with `.cmd/.ok/.wn/.er/.c` spans | real command output, trimmed |
| Compare | `.cmp2` + `.card` (+ `.hl` on the winner) + `.vsarrow` | before/after, option A vs B |
| Flow diagram | `.node` (+ `.hub`) + `.arrow` in `.row`/`.col` | architecture in ≤5 boxes |
| Big stats | `.stats4` + `.stat` (`.big` + `.lab`) | 3–4 headline numbers |
| Feature cards | `.ucs` + `.uc` | numbered use cases / features, 3-up |
| Takeaways | `.takes` + `.take` | closing "remember three things" |
| Link cards | `.links` + `.lk` | Q&A slide: docs, repo, contact |
| Media frame | `.shot` (img/video), `.vids` + `.vidbox` | screenshots and demo videos |
| Chips | `.tool`, `.pill` | inline tool/command names, status pills |
| Layout | `.row`, `.col`, `.gap-s/m/l`, `.grow`, `.center`, `.between`, `.jc` | compose everything above |

Need a new component? Build it from the tokens (`--bg-1` fill, `--line-2`
border, radius 12–16 px, `--fm` for labels) and add it to the `<style>` block —
never inline hex colors.

## Light theme

`:root[data-theme="light"]` re-maps only the tokens; components need no changes.
When adding a component, check it in both themes (`T` key) — the usual bug is a
hard-coded dark hex instead of a token.
