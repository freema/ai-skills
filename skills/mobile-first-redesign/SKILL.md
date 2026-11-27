---
name: mobile-first-redesign
description: "Run a mobile-first redesign of a live site with AI agents without losing traffic, search rankings or the details people liked. It starts from an analytics and real-phone baseline and keeps one spec file as the source of truth with numbered dated decisions and an unverified chapter. Work ships as small PRs behind a cookie switch and then as one release, checked by a sweep of every page at phone and desktop widths, rect diffs that prove the phone layout did not move and SEO byte-diffs against main. It also covers a deliberate desktop pass, visual choices on one review page, identity assets, orphan cleanup and how to orchestrate the agents. Use it for \"redesign\", \"mobile-first\", \"new look\" or \"restyle the site\", or in Czech \"redesign webu\", \"nový vzhled\", \"předělat vzhled\" or \"mobil napřed\"."
---

# Mobile-first redesign of a live site

A redesign of a site that already has visitors and search traffic is a
migration, not a mock-up. The look is the easy part; what goes wrong is
traffic you did not measure, text search engines relied on, pages nobody
opened, a desktop that became a stretched phone, and things the owner liked
that were deleted as "the old look". This skill is the process that held up on
a real portal (a games site, ~75 entities, three languages), with the mistakes
it made marked as such.

## 1. Start from data, write it down before touching code

1. **Who visits on what.** Users, sessions, engaged sessions, pages per
   session, share of visitors who start the core action (play, buy, sign up),
   and search clicks / impressions / CTR / position — **per device**, for a
   fixed window (28 days). Which page types carry search clicks (here: entity
   pages 62 %, so they were changed last and most carefully).
2. **Know the blind spots.** With consent denied by default, analytics
   undercounts (here 92 organic sessions vs 315 search clicks). With few mobile
   users an A/B test says nothing. Then the verdict comes from phone
   measurements and search data, not from analytics alone.
3. **Measure the current site on a real phone** (skill `android-device-testing`)
   and, with the same script, the category leader(s): whole items on the first
   screen, top edge of the first item, page height of a long listing, smallest
   text, smallest tap target, contrast, taps to the core action, time to usable,
   LCP/CLS. These become the targets table (§2). Take principles from the
   leader, never its images, colours, fonts, text or code.
4. **At release:** a dated analytics annotation, notify search engines of the
   changed URLs if you use IndexNow or similar, and a fixed comparison date
   (release + 28 days) with the metrics named in advance: one or two goal
   metrics (mobile core-action share, mobile pages/session) and guard metrics
   that must not get worse (search clicks and position, desktop numbers).

## 2. One spec file is the source of truth

Template: `references/spec-template.md`. The parts that earned their place:

- **Start here**: reading order, repo rules in short, how to run it, and
  "done means" per PR (gates green, verified on the phone on a production
  build, before/after numbers, server HTML text kept, desktop not broken).
- **Targets table**: measurement | today | leader | target | result per PR.
  Filled in as PRs land, so the table is the progress report.
- **Inventory** of every page and component (a separate file is fine: code map
  with `file:line`, data, constraints). Where it disagrees with the spec, the
  spec wins and a "deviations" chapter says so.
- **Tokens and type roles**: semantic colour tokens with their measured
  contrast, radii, spacing (tap 44, gutter, gap), and named heading roles
  (page title, entity title, section, subsection, card title) with phone /
  desktop sizes. One h1 per page, no skipped levels, never raw sizes on
  headings. Minimum text 12 px (16 px for an older audience, §6); a
  decorative display font only from 18 px.
- **Numbered decisions with dates** and who decided. Superseded decisions stay,
  struck through, with "replaced by N". Agents decide what can be derived from
  code and the spec and write it down; they ask the owner only what only the
  owner can decide (visual taste, merge, release).
- **"Unverified" chapter**: everything measured only in emulation, only by
  script, never looked at, or not tested on iPhone/tablet/real monitor. It
  shrinks as checks happen; items are struck through, not deleted.

## 3. Small steps behind a switch, then one release

- **Switch**: a cookie (e.g. `ui=v2`) set by `?ui=v2`, which immediately
  redirects (302, `Cache-Control: no-store`) to the clean URL — no URL variant
  can be indexed. A per-route defaults map makes "turn route X on" a one-line
  change. Check that no shared cache serves HTML regardless of the cookie (or
  add `Vary: Cookie`).
- **PR order by risk**: foundations (tokens, switch, baseline) → shared pieces
  (tile, grid) with a trial batch of assets → shell and home → listings → the
  page that carries search traffic → remaining pages and app mode → assets at
  scale → make it default, delete the switch and the old look → finishing
  (overlays, docs). Each PR: what, why, metric, baseline, phone screenshots.
- **Stacked PRs, one combined release PR** into main. Do not ship everything at
  once and do not ship each step to production either: release once, so the
  28-day comparison has one date.
- **Removing the old look**: list CSS/JS size before and after and every file
  deleted. **Before deleting, inventory what people value** — ask the owner
  "what of the old look do you want to keep?" and list decorative details,
  animations and easter eggs explicitly. Here the floating decorative sprites
  beside the column and animated thumbnails were deleted wholesale with the
  "old look" and the owner wanted them back; restoring them meant digging them
  out of git history afterwards.

## 4. Search engines: nothing is deleted

- Every text, heading and internal link in the server HTML stays. Move it
  below the content or collapse it in `<details>` (still in server HTML);
  keep the first paragraph of the entity description visible.
- One h1 per page with the same text; `meta`, JSON-LD, canonical, hreflang,
  sitemap and robots unchanged. **Prove it**: snapshot the `<head>` tags and
  JSON-LD of the key pages and the sitemap on main and on the branch, replace
  the host, and diff (`scripts/seo-snapshot.mjs`). The PR says "byte-identical
  except X".
- No URL changes inside the redesign. If one is unavoidable: its own PR, 301,
  impact written down. Find out how pagination works before a denser grid
  changes page counts.
- Mobile navigation keeps links to categories (indexing is mobile-first).
- Content that only renders on a tab click is not in the HTML; a redesign that
  renders it always is a gain — note it.

## 5. Verification that catches things

Measuring five pages by numbers passed every target and still missed that list
views elsewhere showed the old thumbnails and that desktop alignment broke.
What caught it was a **sweep of every page**:

- All public pages in the main language, home and one entity page in another
  language, signed-in pages with a test account — at phone (e.g. 384×727 DPR
  ~2.8 with touch), 1024, 1440 and 1920, in a **muted** headless browser.
- Scripted checks, not eyeballing: the checklist and probe in
  `references/sweep-checklist.md` (same entity shown the same way everywhere,
  no old effects, min text and display-font sizes, targets ≥ 44 px, contrast
  ≥ 4.5:1 computed, no horizontal scroll, column width and left edges aligned
  with the top bar, equal heights in one control row, hover and focus visible,
  console and hydration errors, broken images, one h1 and no skipped levels).
- **Overlays are pages too**: modals, toasts, install prompts, rotate prompts,
  cookie bar. Some only appear with a faked API response or event — say so
  when that is how they were measured.
- **"Phone unchanged" by rects**: when a change is meant for desktop only,
  record every visible element's rect on the first screen at phone width
  before and after (`scripts/first-screen-rects.mjs`, `scripts/rect-diff.mjs`).
  Differences must be explained element by element (a wrapper that moved is
  fine if all children and the page height match).
- **LCP/CLS** medians of 5 loads on a **production build**, before and after,
  for home, a listing and an entity page; CLS on first visit too (tours and
  consent bars shift layouts).
- **Real phone for anything with a keyboard, a fixed bar or touch.** Emulation
  and unit tests passed every keyboard, toolbar and font-size bug the first
  device pass found. Mechanics are in `android-device-testing`: dev server via
  `adb reverse`, Chrome via `adb forward tcp:9222 localabstract:chrome_devtools_remote`,
  rects over CDP against `visualViewport` (not `innerHeight`, which ignores the
  keyboard), and every tap a real `adb shell input tap` — a scripted click
  skips the pointer and focus events that close keyboards. Keep the screen awake
  for the session (`svc power stayon usb`, after reading the old
  `settings get global stay_on_while_plugged_in` and putting it back at the
  end); that is the only device setting you touch.
- **Every state a player is in**: the resting scroll position they actually
  reach (not the top of the page), URL bar shown and hidden, consent bar still
  up, 360 px wide, root font at 130 % (`documentElement.style.fontSize`), soft
  keyboard open. A bug usually lives in exactly one of them.
- **Criteria are numbers**: "nothing moves" = rects of board and controls
  before, during and after the event, 0 px apart; "visible" = rect inside the
  visual viewport with the keyboard up. The tester reports px and screenshots.
- **Write device quirks down instead of fighting them**: e.g. soft-keyboard
  typing may not reach the page under USB debugging — insert the text over CDP
  (`Input.insertText`) and report real typing as unproven.
- **Tests pin the rule, not the layout model**: "fits one screen", "wraps on
  whole words", "target ≥ 48 px", computed from the real classes. A test that
  repeats the implementation's numbers goes stale with the next fix and proves
  nothing.
- Screenshots go into the PR or a review page, small JPEGs (phone 540 px wide,
  desktop ≤ 1400 px).

## 6. Rules a real phone taught

Each was missed by emulation and caught on a device. They apply wherever the
page takes input (games, forms, quizzes).

- **Keep the keyboard up.** A send button beside a text field must not take
  focus: `preventDefault()` on its `pointerdown`/`mousedown` while the field is
  focused, refocus after sending — otherwise the keyboard closes after every
  answer. Enter in an autocomplete field picks the suggestion, it does not
  send. Set `enterKeyHint`.
- **Place once, absolutely.** To bring a field into the band above the
  keyboard, compute one `scrollTo` target after the keyboard has settled
  (`visualViewport` resize; seconds on a slow phone). Never relative
  `scrollBy`: a second placement during a smooth scroll overshoots.
- **Nothing jumps.** Messages, hints and errors get a fixed-height slot reserved
  in the layout (scroll inside it if long). A panel that appears must not push
  the board or the controls.
- **Fixed bars** (offline notice, toasts) are positioned against the visual
  viewport, stacked above other fixed bars and above controls marked
  "keep clear", never over the control the player needs next; the page gets
  matching bottom scroll padding.
- **A move that did not reach the server consumes nothing.** Selection, picked
  piece and typed text stay; one sentence says it did not arrive; the notice
  clears only when a retry succeeds.
- **One screen.** Board, input pad and actions fit at the resting position.
  When labels at 16 px do not fit one row, design a fixed two-line row or
  re-flow the pad — never shrink the text, never go icon-only.
- **Sizes for an older audience**: text ≥ 16 px (never < 14), targets ≥ 48 px,
  primary action colour ≥ 7:1, disabled = a readable grey treatment, not
  opacity. Small targets on a map get invisible enlarged hit areas that never
  take a neighbour's own area.
- **Every language is its own layout.** Measure the longest label per language
  at each width from real font advances; wrap on whole words, never mid-word;
  check letters with diacritics against marks drawn over them.
- **Tap does what drag does**; no gesture-only control. Tutorials and dialogs
  on a phone: one scroller, opened at its top, with a back button.
- **Phone-only changes leave wider screens provably unchanged**: pin the
  desktop render (rect diff at 1024 and up) in the same PR.

## 7. Desktop is not a stretched phone

Plan a deliberate desktop pass **before release**, not after complaints:

- A column grid shared by grids and rows (e.g. six columns in a 1200 px
  column from 1024 px), full rows instead of a phone carousel, last row full.
- Running text capped near 75 characters (`max-width: ~57ch` on `p, li, dd` in
  main); numbers right-aligned in tables.
- The main object (a game canvas, a product image) capped by viewport height so
  it fits with the header; sidebars start level with it.
- Hover and `:focus-visible` states on everything focusable; pointer cursors;
  a search shortcut that does not steal keys from the content (Ctrl/Cmd+K, not
  `/` on a site where games read the keyboard).
- Preload the text font if late swaps shift layout (one docs page went from
  CLS 0.19 to 0.001).
- Nothing below the desktop breakpoint changes — prove it with the rect diff.

## 8. Visual decisions belong to a human, on one page

Measurements cannot judge looks. Every visual choice (icon style, layout
variant, accent colour) goes to the owner as **one review page**: images and
clips inline, a recommendation per item, choices to tap, before/after toggles,
and a "copy answers" button that pastes into chat. Not links to folders, PRs or
"it's open on the phone" — the owner refused to hunt for them and answered a
nine-item page in minutes.

- **An unanswered review page is not approval.** Here code-drawn icons were
  published on a review page, got no answer, shipped, and were called ugly the
  same day; most were redone the same day in a follow-up release.
- Start with a **trial batch** (6 of 74 icons) and get the style approved on the
  phone before producing the rest.
- In reports and PRs say plainly what nobody has looked at: "measured by
  script; neither I nor the owner has looked at these screenshots".

## 9. Identity assets

- **One icon per entity, used everywhere** (tiles, related lists, leaderboards,
  profile, daily cards) through one component; the old 16:9 thumbnail survives
  only where a wide image is required (OG cards, JSON-LD, article covers) and
  as a fallback.
- **Versioned file names** (`icon-v2-384.webp`) because static assets are
  cached immutable for a year; a changed file under the same name is never
  seen. A test checks every referenced export exists.
- **Never delete source art** (generated or drawn originals); a rejected
  version stays on disk, the registry points at the chosen one.
- **Orphan cleanup** with a reference grep over code, scripts and content, and
  a kept-list with a reason per kept file (manifest entries, script outputs, a
  draft article that references it). Dynamically built names are invisible to
  grep — say so.

## 10. Orchestrating the agents

- The orchestrator does not write code: it briefs, checks results against the
  spec, runs or delegates phone checks, and reports to the owner. One PR = one
  subagent brief that cites spec chapters and line ranges instead of pasting
  the spec.
- One checkout mounted into Docker means agents that need the toolchain (build,
  tests, dev server) run **one at a time**. Asset-only agents (icons, clips)
  can run alongside with strict path limits ("write only under
  `public/assets/<slug>/` and `tools/<x>/`").
- Commits with explicit paths, never `git add -A` (the owner's untracked drafts
  live in the same tree). Re-run gates after the last agent stops writing.
- One agent on the phone at a time; tell the owner beforehand to keep it
  unlocked and plugged in.
- **Code, tests and the device pass are three different agents.** The device
  tester is blind: it gets the rule and the acceptance criteria, never the
  diff, and it reports numbers and screenshots without fixing anything. An
  agent proving its own work checks what its code already does.
- **One combined device pass per branch, after the gates** — not a pass per
  fix. Leftovers that do not block play go into a notes file, not another
  round.
- Agent reports separate **measured** (with conditions), **derived from code**
  and **unverified**. No extra verification agents beyond what "done means"
  requires.
- Merge and release only on the owner's explicit word; everything else
  (branches, commits, PRs) without asking.

## Files

- `references/spec-template.md` — skeleton of the spec file with the chapters above.
- `references/sweep-checklist.md` — the all-pages checklist and the in-page probe.
- `scripts/seo-snapshot.mjs` — head tags, JSON-LD and sitemap of key paths for a diff.
- `scripts/first-screen-rects.mjs` — rects of every visible element on the first screen (headless or a connected phone).
- `scripts/rect-diff.mjs` — compares two rect snapshots and lists what moved.
