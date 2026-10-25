---
name: kairo-games
description: "Building or upgrading a PixelDen Kairosoft-style management sim (Gamedev Stories, Dungeon Hamlet, any future 'Kairo' game): the Kairosoft formula, the shared Kairo kit (app/games/shared/kairo-kit/), the step-by-step build and upgrade process, the measurable visual bar and the pitfalls that made the first two games look poor. Trigger: 'Kairosoft', 'Kairo hra', 'Kairo kit', 'Game Dev Story', 'Dungeon Village', 'Gamedev Stories', 'Dungeon Hamlet', 'Pocket Academy / Mega Mall / Hot Springs style', 'management sim like Kairosoft', 'další Kairo hra', 'vylepšit Kairo hru', 'hustota jako Kairosoft'. Use together with phaser-gamedev (any work in app/games/**) and hybrid-pixel-art (art plan)."
---

# Kairo games: build and upgrade

**v1 (2026-10-25).** Written after the owner's verdict on Gamedev Stories and Dungeon Hamlet
("naprostý nedostatek detailu", "strašně odporná kopie"). Their engines were rich and every gate
passed, but no gate measured how full and alive the screen is, and that is half the genre. This
skill is the short version. The long versions are:

- `docs/KAIRO-GAMES-PLAYBOOK.md`: the process, step by step, with the visual bar and templates;
- `docs/KAIRO-KIT.md`: what the shared kit has, what Kit 2 adds, public APIs, move order and the
  PixelLab plan;
- `tasks/123-kairosoft-genre-kit-analysis.md` (Czech): the genre analysis, gap tables per game
  and the backlog.

## When to use

- A new Kairosoft-style game: a brief, a build, an art plan.
- An upgrade or detail round on Gamedev Stories, Dungeon Hamlet or a later Kairo game.
- Any change to `app/games/shared/kairo-kit/`.

Not for other management games without the Kairosoft loop (Pixelopolis, Furrowfield, Spire
Tycoon). Use `phaser-gamedev` and their own briefs for those.

## Read order

1. This file.
2. `phaser-gamedev` skill, which is mandatory before touching `app/games/**`.
3. `docs/KAIRO-GAMES-PLAYBOOK.md`: the section for your job (new game or upgrade round).
4. `docs/KAIRO-KIT.md`: the inventory and the API you will call or move.
5. The game's brief and its latest rework task:
   - Gamedev Stories: `tasks/107-…`, then `tasks/117-…`;
   - Dungeon Hamlet: `tasks/108-…`, then `tasks/118-…`.
6. `tasks/123-…` §2 for the gaps still open, §7 for the backlog IDs (KK-, GS3-, DH3-).
7. `hybrid-pixel-art` skill before any art plan or PixelLab call.

## The formula (what must be on screen)

1. A small place that fills up. The player builds, hires, trains and schedules. Named little
   people then act on their own, and the player watches it happen.
2. A calendar with a yearly rhythm (wages, a fair or festival, awards, medals). A run lasts 10–20
   game years, then free play.
3. People with 4–6 stats, levels and jobs. Mastering one job unlocks the next.
4. A grid and synergies, in three families: an aura in a radius, a **named** set within a
   radius, and trait sums judged once a year.
5. Money plus a second currency. Popularity brings visitors and unlocks; a rank checklist gives
   the short goal.
6. Outside judgement once or twice a year, as an illustrated ritual. The final score is a
   weighted sum of money **and breadth**, followed by a thin New Game+.
7. A dense screen that is always alive. Bubbles, tags, "+N" floaters, "Level Up" banners,
   confetti, dozens of walkers. The HUD is compact: date top-left, money top-right, actions on
   the right, news at the bottom.
8. Same engine, new costume. That is why the kit exists.

## Owner rules (never break)

- **Own code and art only.** Study mechanics and visual language; never trace, port or copy
  names.
- **Saves never block a change.** Bump `SAVE_VERSION` and drop old saves, local and cloud. Never
  migrate. A test proves an old save cannot crash the game.
- **Compact HUD, controls on the right**, no permanent badge tags. Show progress through the
  world (dressing tiers, building looks) and transient banners.
- **PixelLab is the default for detail**, and every key has a code fallback. Never replace
  PixelLab art with code: improve it as `-vN` from the original. Inspect a contact sheet of every
  direction before stitching (the `long` north view lost its hair, GS-12).
- **Cut breadth, never the visual layer.** Fewer years, people or buildings is fine. Thinner
  rooms, missing life, flat panels or text-only events are not.
- **Pick the projection from the reference game**, not from the pipeline: iso 2:1 for maps (as
  in 118), oblique 3/4 for rooms.
- **Browser tests are silent:**
  - headless puppeteer-core with `--mute-audio`;
  - stubs for `AudioContext` and `HTMLMediaElement.prototype.play`;
  - the `vite-hmr` socket blocked;
  - never a visible Chrome.

## Kit quick reference

Import from `~/games/shared/kairo-kit/<file>`.

**v1 today:**

| File                        | Use it for                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| `palette.ts`, `raster.ts`   | `KAIRO_PAL`, ramps, `Pix` drawing (`grid`, `stamp`, `outline`, `dither`, `recolor`)        |
| `bake.ts`                   | `addImage`, `addSheet`, `addAnimSet`, `addFont`: `Pix` to Phaser textures                  |
| `sheets.ts`                 | `kairoPreload` / `kairoBake`, `CharSpec`, `CLIP_TIMING`, `chibiKey`: PixelLab chibi strips |
| `chibi.ts`, `chibi-code.ts` | hue-band look swap (hair #FF00FF, tunic #00FF00); code rig fallback                        |
| `outfits.ts`                | `registerOutfit`, anchors per frame: hats, tools, armour overlays                          |
| `actor.ts`                  | `KairoActor`: walk on a BFS path or be driven by the engine; clips and shadow              |
| `bubble.ts`, `fx.ts`        | `showEmote` (14 emotes), `floatNumber`, `sparkle`, `levelUpBurst`, `confetti`, `coinPop`   |
| `ui.ts`, `font.ts`          | flat window, button, `statBar`, `tabBar`, `listRow`, `toast`; 5×7 font for EN/ES/DE        |
| `room.ts`, `tiles.ts`       | `roomToScreen`, `walkGrid`, `bfsPath`; `autotile4`, `wang16`, `hashVariant`                |
| `cast.ts`, `names.ts`       | the 10 shared people; `personName`                                                         |

**Kit 2 (planned, check `docs/KAIRO-KIT.md` before assuming a module exists):**

- `engine/`: `dice`, `calendar`, `schedule`, `progress`, `placement`, `goals`, `save`, `bot`.
- `ui/`: `frames`, `topbar`, `dialog`, `unitbar`, `actions`, `panel`, `assistant`, `audit`.
- `feedback/`: `say`, `tag`, `floatStat`, `banner`, `cadence`.
- `scene/`: `clock`, `camera`, `viewport`.
- `art/`: `portrait`, `interior`, `structures`, `ambient`, `projection`.
- `audio/`: `sequencer`, `sfx`.

Until a piece moves to the kit, the chrome built by 117 and 118 lives in each game folder
(`gds:ui:*`, `dh:ui:*`). Do not build a third copy: harvest it (KK-01).

## Build order (new game)

These are steps 0–11 of the playbook. Each phase gets its own commit.

0. Reference sheet: 6–10 described screenshots of the source game, with density counts. The
   counts become the visual-bar targets.
1. Brief `tasks/1NN-<slug>-kairosoft-analysis.md`, using the template in the playbook.
2. Owner decisions, then rewrite the brief. Cut breadth here, never visuals.
3. Engine with no Phaser, plus an **expert bot and a newcomer bot**, and thresholds in the brief.
4. Visual checkpoint 1: a grey box at full density (all props, walkers and pops).
5. Art plan and PixelLab, with the budget reserved up front.
6. Life and chrome pass: construction, tags, bubbles, ambient, illustrated events.
7. Visual checkpoint 2: self-review against the bar.
8. Gate: checks, a silent full run, phone, `auditLayout`, screenshots.
9. Independent playtest on a frozen tree, played to the end.
10. Fix rounds in ID packages.
11. The owner sees the look **before** release and before cloud saves.

## Upgrade round

1. Silent pass and bar numbers before you start.
2. Gap table: "what the original shows | what we show | fix".
3. ID plan.
4. Kit first: shared pieces go to the kit, then into both games.
5. Bar numbers after, and screenshots side by side.

Never redo an item a previous round closed. Read the round's task file first.

## Visual bar (short)

The full table is in the playbook §Visual bar (VB-01…VB-14). The ones that failed most:

| ID    | Check                                               | Bar                          |
| ----- | --------------------------------------------------- | ---------------------------- |
| VB-01 | world share of the canvas                           | ≥ 55 % desktop, ≥ 45 % phone |
| VB-03 | dominant 4-bit colour in the world crop             | ≤ 0.20, ≥ 250 colours        |
| VB-04 | edge share in the world crop                        | ≥ 0.18                       |
| VB-06 | moving sprites                                      | map ≥ 20, room ≥ 8           |
| VB-07 | pops per minute; longest silence of a working actor | 30–120; ≤ 12 s               |
| VB-10 | events with an illustration                         | ≥ 80 %                       |

To measure VB-03 and VB-04, run this on a `renderer.snapshot()` PNG (not a JPEG), cropped to the
world:

```bash
node scripts/kairo-pipeline/visual-bar.mjs shot.png <x> <y> <w> <h>
```

The before shots scored between 0.27 and 0.38 dominant and between 0.08 and 0.16 edges.

## Pitfalls

- **An overnight batch build with bulk commits**, and a release before anyone looked. That is
  how the first two games shipped.
- **A playtest broken by HMR reloads and concurrent edits.** Freeze the tree and block
  `vite-hmr`.
- **The brief named the genre's signature** ("information density and pop-ups") **but no gate
  checked it.** Write the targets into the brief as VB numbers.
- **An expert bot hides the newcomer's death spiral.** Gamedev Stories had 95 bankruptcies in
  100 newcomer runs before the second bot existed.
- **PixelLab spend dropped round by round** (180 → 30 → 15 generations). Reserve the art budget
  at the brief.
- **Text size 1 and 26 px targets on phone.** Use size 2 and targets of 44 CSS px or more.
- **A Phaser game leaks keyboard listeners.** Links to a game always use `reloadDocument`.
