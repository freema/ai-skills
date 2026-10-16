# Art plan template, canonical examples, pre-ship checklist

## 1. The art plan

Written into the game's task file (`tasks/<n>-<slug>.md` § Assets) before the first grid or generation. It is the contract between the analysis agent, the implementation agent and the owner: when a row changes side later (Pixelopolis buildings, Detention Deep faces and monsters), the row is edited and the reason logged, not silently redone.

### Header

| Field | Value |
|---|---|
| Native resolution / viewport | e.g. 480×270 desktop, 270×480 mobile portrait; integer zoom only |
| Tile size | e.g. 16, 24 or 32 px |
| Light | top left, both sides |
| Palette | `art/palette.ts` ramps (name them: stone, moss, steel, skin ×3, house ×4, inks) |
| Outline | code: 1-px named ink, darker on the shadow rim; PixelLab: `lineless` |
| PixelLab budget | calls planned / `get_balance` now |
| Thumbnail plan | which scene, which pose, 480×270 from the real render |

### Asset table

| Group | Class | Side | Texture keys | Size, frames, dirs | Tool and parent | Fallback / composite | File (version) | Test |
|---|---|---|---|---|---|---|---|---|
| Portraits | bust | PL + code composite | `p:<id>:<state>` | 32×32, 7 states × 4 kids | pack `create_1_direction_object` 32 px, pixen edits off the normal bust | code `portrait()` draws halo + grey-out; code face if PNG missing | `pl/p-<id>-<state>-v1.png` | key has file; 32×32 |
| Spell icons | icon | PL pack | `sp:<id>` | 18×18, 21 | one pack, `item_descriptions` | code `spellIcon(id)` | `pl/sp-<id>-v1.png` | key has file |
| Monsters | creature | PL + code shrink | `m:<kind>` → `m:<kind>:<depth>:<anim>` | 4-frame strip at depth-1 scale | pixen base → `*_pro_flash` → `animate_*` v3 ×3 | code `monsterFrame(kind, depth, anim)` | `pl/m-<kind>-v1.png` | strip width = 4 × frame |
| Walls, floor, ceiling | tiles | code | per theme in `art/walls.ts` | 3 mips | — | — | — | `art.test.ts` bakes every theme |
| FX | fx | code | `bolt:<school>:<z>`, `smoke:<d>` | 2–4 frames | — | — | — | uniform frames, non-blank |
| Font, logo | lettering | code | `font`, `font-o`, `logo` | 5×7 | — | — | — | glyph coverage per locale |
| Buttons | ui | code, PL plates | `ui:btn:<state>` → `btn:<w>x<h>:<state>` | 31×25 plates, nine-sliced | `pixellab.mjs ui` or kit | code bevel | `pl/ui-btn-<state>-v1.png` | 31×25 |
| Backdrop | plate | PL | `bg:<level>` | 384×176 | `create_image_pixen` | none; dark level if missing | `bg-<level>-v1.png` (Tumblekin shipped `bg-hollow.png` without a suffix; its next change → `-v2`) | size |
| Thumbnail | — | composed | — | 480×270 | `renderer.snapshot` | — | `thumbnail.png`, `og-card.jpg` | 16:9, ≤ 50 KB |

Fill one row per **group** (all spells, all monsters), not per sprite. "Side" is one of `code`, `PL`, `PL + code composite`; the composite column names the code function that finishes the piece. Every PL row needs a fallback or an explicit "missing = X" note.

### Decisions log (under the table)

One line per row that changed side, with the trigger and the date: `2026-10-15 buildings PL → code: strips cropped at the top, one picture per level made streets identical (owner)`.

## 2. Canonical examples in the repo

| Pattern | Where |
|---|---|
| PNG → `Pix` → composite → canvas texture, fallback per key | `app/games/detention-deep/scenes/boot.ts` (`preload`, `pl()`, `create`), `art/pl.ts` (`PL_ART`, `plFile`, `sheetFrames`, `shrink`), `art/bake.ts pixOf` |
| Code art bake API (copy into a new game) | `app/games/gloop/art/raster.ts`, `art/bake.ts` (`addImage`, `addSheet`, `addAnimSet`); same files in tumblekin, sandcrown, redline-pursuit, detention-deep |
| Bitmap font from grids registered as a BitmapFont | `addFont` in `app/games/tumblekin/scenes/boot.ts` (also sandcrown, detention-deep) |
| Portrait composite over a code halo | `app/games/detention-deep/art/portraits.ts portrait(id, state, bust?)` |
| Nine-sliced PixelLab plate with code bevel fallback | `app/games/detention-deep/art/frames.ts nineSlice/button`, `scenes/ui.ts buttonKey` |
| Pixel-art shrink that keeps the outline (far depths) | `app/games/detention-deep/art/pl.ts shrink` |
| One painted plate per level | `app/games/tumblekin/scenes/boot.ts` (`bg:<name>`), `scenes/game.ts` `this.add.image(0, 0, \`bg:${LEVELS[li].bg}\`)` |
| PixelLab atlas beside code tiles | `app/games/furrowfield/scenes/boot.ts` `this.load.atlas(ATLAS, ff-atlas-v1.png, .json)`; 111 frames: `cow-<dir>-<n>`, `b-*`/`t-*` buildings, `v-<vehicle>-<dir>` |
| Icon spritesheet with one code-drawn frame | `app/games/pixelopolis/scenes/boot.ts` (`pxo-icons`, `ICON.O = 55`) |
| Code buildings kit, seeded variants, art test over seeds | `app/games/pixelopolis/art/kit.ts`, `art/zones.ts`, `art/specials.ts`, `art/art.test.ts` (40 seeds, nothing touches the top edge) |
| Hard-surface bevel painter (ships, vehicles, turrets) | `app/games/sandcrown/art/shape.ts`, `app/games/scrapwing/art/shape.ts` |
| Parametric creature from a keyframe table | `app/games/gloop/art/slime.ts` |
| Part layers + one outline pass (humanoids) | `app/games/gloop/art/enemies.ts compose`, `heroes.ts` |
| Procedural backdrops, atmosphere, lightmap | `app/games/gloop/art/backgrounds.ts`, `engine/atmosphere.ts` |
| Full 4-dir PixelLab roster loader (stills + walk strips, per-enemy frame size, cache-bumped file) | `app/games/frost-hold/scenes/boot.ts` |
| Side-view PixelLab player, east profile, cropped strips | `app/games/spirit-snare/scenes/boot.ts` (`player-idle.png` 128×50 = 4 × 32×50) |
| Code art baked under old PixelLab keys (upgrade swap) | `app/games/crystal-td/scenes/boot.ts` (`addSheet(this, \`enemy-${id}\`, enemyFrames(id))`), `app/games/snake/art.ts` |
| DynamicTexture stamping with the render() flush | `app/games/solitaire/card-textures.ts` |
| Thumbnail from the running renderer / in-page canvas | Redline and Pixelopolis task notes (`renderer.snapshot`, zoom 2, HUD hidden), `~/.claude/skills/code-pixel-game/references/harness.md` §Staged shots |
| og-card for every game (regenerates all; checkout the others) | `scripts/og-cards.mjs` via `echo "node scripts/og-cards.mjs" \| task dev:shell` |
| Manifest entry to copy | `pixellab-assets.json` → `games["detention-deep"]` |

## 3. Pre-ship checklist

Art-specific; run it after `phaser-gamedev/references/pre-release-audit.md`.

**Files and cache**
- [ ] Every file under `public/assets/games/<slug>/` is referenced by a loader; every loader path exists (`grep -n "load\.\(image\|spritesheet\|atlas\)"` vs `find`). No 404 on `/assets/games/<slug>/` in the browser network log.
- [ ] `file` on every PNG says `PNG image data … RGBA`; no JPEG-as-PNG, no 0-byte file.
- [ ] Replaced files got a new `-vN` name and the old name is gone from the repo and from the loader (grep the old filename).
- [ ] `pngquant` ran on the new files only, or `task assets:optimize -- --game <slug>` (it still resizes `thumbnail.png` to 400 px unless `--thumbnail-size` says otherwise); `git status -- public/assets` shows nothing outside this game (revert collateral with `git checkout --`).
- [ ] Total new asset weight noted in the task file (Tumblekin: 31 KB of plates; Furrowfield: 31 KB atlas; Detention Deep: 75 files, 220 KB). Anything over ~150 KB per game needs a reason.

**Stitch and fallbacks**
- [ ] Every `PL_ART` key has a file, a size assertion and a code fallback (or an explicit "missing = dark" with the scene still playable). Delete the file locally once and load the game: no exception, no blank.
- [ ] One pixel density on screen: no sprite scaled by a non-integer, PixelLab canvases cropped to content where the layout needs it, far depths via `shrink`, not `setScale(0.5)`.
- [ ] Palette check: a 6× sheet of the PixelLab group next to the code group reads as one family (outline weight, saturation, ink).
- [ ] Characters: one canvas size per character across all clips (`file … | sort -u`), feet aligned between clips, west = flipped east with the weapon hand accepted or 4 real dirs loaded.

**Readability**
- [ ] 1× in-game screenshot of every scene with a PixelLab plate: text has a scrim + stroke, markers read, buttons look like buttons.
- [ ] Mean luminance of a gameplay snapshot is not "moody dark" (owner flagged Gloop level 1); player bbox contrasts with its surroundings.
- [ ] Nothing informative in the top-right ~32 native px of the canvas (page fullscreen button sits there).
- [ ] Mobile viewport (registry `mobileWidth/Height`) screenshot at 1×: icons ≥ 16 px on screen, plates not cropped at the edges, touch controls not covering the PixelLab art that carries state.

**Thumbnail and card**
- [ ] `thumbnail.png` is 16:9 (480×270 or 960×540) from the real game (snapshot or in-page compose), pixel-sharp (`imageSmoothingEnabled = false`, integer upscale), quantized, under ~50 KB; registry `thumbnailUrl` points at it.
- [ ] `og-card.jpg` 1200×630 regenerated with `scripts/og-cards.mjs`, other games' cards reverted.
- [ ] An animated `thumbnail.webp`, if wanted, is assembled with `pixellab.mjs webp` from real frames, never a generative reinterpretation.

**Records**
- [ ] `pixellab-assets.json` entry: tag, parent ids, pack ids, pixen images, spend, what stayed in code and why.
- [ ] Objects and characters tagged `pixelden`, `pixelden-<slug>`, `<slug>`.
- [ ] `~/.claude/skills/code-pixel-game/references/lessons-log.md` gets one entry for the session (what took more than one pass, on either side, and the check that would have caught it).
- [ ] Art rows that changed side are logged under the plan with the trigger.
