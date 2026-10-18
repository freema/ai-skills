---
name: hybrid-pixel-art
description: "Art plan and pipelines for a PixelDen game whose pixel art is drawn in code by default, with PixelLab for the pieces code art can't carry (animated creatures, portraits, painted backdrops, icon packs, UI plates, illustrations). Decision table per asset class, the Boot stitch pattern (PNG → Pix → composite → canvas texture, code fallback per key), PixelLab prompt/download/verify/version/manifest rules, animated-character pipelines, the art-plan template and the pre-ship checklist. Trigger: 'generovaná grafika s podporou PixelLab', 'grafika jako u novějších her', 'hybrid art', 'hybridní grafika', 'art plan for a new game', 'plán grafiky', 'which assets go to PixelLab', 'co nakreslit kódem a co přes PixelLab', new-game art step. Not for pure code-art games (code-pixel-game) or for a game that is PixelLab end to end (pixellab)."
---

# Hybrid pixel art: code first, PixelLab where it pays

**v1 (2026-10-16).** Written from how the newer PixelDen games split their art: **Detention Deep** (faces, icons, button plates, illustrations and monster sheets from PixelLab; walls, FX, font and frames in code), **Tumblekin** (all code, two painted backdrops), **Furrowfield** (one PixelLab atlas for cows, buildings and vehicles; tiles, crops, chrome and font in code), **Pixelopolis** (toolbar icons from PixelLab; buildings tried on PixelLab, rejected, redrawn in code) and the all-code games **Gloop, Sandcrown, Redline Pursuit, Scrapwing, Liftwell**. The owner's words for the next batch: "generated graphics the way our newer projects did it, with PixelLab support."

This skill is the **decision procedure and the stitch**. The craft lives elsewhere: drawing in code is `~/.claude/skills/code-pixel-game/` (art kit, style, review loop, failures, harness), generating is `.claude/skills/pixellab/` (MCP tools, prompts, cost). Read those for the how; read this for the what-goes-where and how the two meet in Boot.

## When to use

- A new game's art plan (the `new-game` art step), or an owner ask for "generated graphics with PixelLab support".
- Adding an asset group to a hybrid game: decide the side first, then follow that side's pipeline.
- **Not** for `/game-upgrade` runs (no new PixelLab generations there; the art triage in `.claude/commands/game-upgrade.md` applies) and not when the owner says "kreslím vše sám" (then `code-pixel-game` alone).

## Non-negotiables (both sides)

1. **Code is the default.** PixelLab is the exception you justify per asset class in the art plan. Owner, 2026-10-14: code-drawn art (Gloop, Redline, Scrapwing) beats weak PixelLab sprites; "not excessively" cuts both ways.
2. **One pixel density, one light (top left), one palette per game.** A PixelLab piece must sit beside code art without looking pasted in: same outline weight (`lineless` for PixelLab, 1-px ink for code), palette sampled from `art/palette.ts`, no mixels (never scale a sprite by a non-integer).
3. **Every PixelLab key has a code fallback or an explicit "missing = dark".** Boot must not 404 its way into a broken scene.
4. **Never `Read` a generated PNG** (API 400 crashes the turn). Verify with `ls -la`, `file`, `sips -g pixelWidth -g pixelHeight`; judge the look from an in-game `renderer.snapshot()` or a 6× preview sheet rendered by the harness (those are safe to `Read` only when the long edge is ≤ 2576 px; crop or montage first, see `code-pixel-game/references/review-loop.md`).
5. **Never `Write` binary.** `curl -L` the public Backblaze URL, then `file` must say `PNG image data … RGBA`.
6. **Filenames carry a version (`-v1`, `-v2`)**; a replaced file gets the next number. `public/assets/**` is cached immutable for a year (nginx), and Vite does not hash `public/`.
7. **Tests before eyes:** a headless `art/art.test.ts` bakes every code builder; every PixelLab sheet gets a size assertion in the loader (frame count × frame size = PNG size).

## The decision table

| Asset class | Default | Why, and the exception |
|---|---|---|
| Terrain tiles, autotiles, floors, walls | **Code** | Seeded variants, seamless by construction, palette-tied, zero bytes. Sandcrown `art/terrain.ts`, Pixelopolis roads/shore/power from a 4-bit neighbour mask (`engine/world.ts links()`, painted by `art/paint.ts paintGround`), Gloop `art/tiles.ts`. PixelLab Wang tilesets only if the whole look is PixelLab (older games). |
| Buildings, structures on a grid, many variants | **Code** | Pixelopolis lesson: PixelLab strips came cropped at the top and "one picture per level" made every street identical; the 3/4 kit (`art/kit.ts` class `Lot`: `box`, `flatRoof`, `cyl`, `dome`, `windows`, `tree`) gave 2–3 layouts × seeded colours. **PixelLab** for a handful of distinct landmarks packed in one atlas (Furrowfield `ff-atlas-v1`, 15 buildings). |
| Backdrops, parallax, sky | **Code** when they interact: parallax layers, atmosphere keyframes, lightmap, weather (Gloop `art/backgrounds.ts`, Rooftop Rush strips, Redline sky panoramas). **PixelLab** when one painted plate per level is enough (Tumblekin `bg-hollow` / `bg-deep`, 384×176, 13–18 KB) — then the readability rules in [references/pixellab-pipeline.md](references/pixellab-pipeline.md) §Backdrops apply. |
| Player / creatures with a **parametric or simple body**, ≤ 32 px, few clips | **Code** | Rule beats frames: Gloop's slime (keyframe table → 40+ frames), Tumblekin kins, Sandcrown infantry and hulls, Scrapwing ships (`shape.ts` bevel painter). |
| Living creatures with **many drawings** (4–8 dirs × idle/walk/attack/hurt), 40 px and up, or where identity must be pictorial | **PixelLab** `create_character` + `animate_character` v3 | Characters with props at 24–40 px were code art's weakest kind (Gloop heroes needed 3–5 passes). Detention Deep moved all 12 monsters to PixelLab in round 2; Furrowfield's cow is a 4-dir atlas walk; Frost Hold's roster is the full 4-dir convention. |
| Portraits, busts, faces, expressions | **PixelLab** (pack + pixen edits) | Faces at 32 px did not read in code; the owner swapped them after the first Detention Deep playtest. Code still composites the halo, grey-out and the "z" (`art/portraits.ts`). |
| Icons: spells, items, toolbar, pictorial | **PixelLab pack** (18–32 px, `create_1_direction_object` with `item_descriptions`, 64 candidates per call) | One call fills a whole bar (Detention Deep 24 icons, Pixelopolis 59-frame toolbar). Keep a code fallback per key; draw any icon that carries **live state** (numbers, tint, lock) in code. |
| UI glyphs, arrows, pads, keycaps, cursors | **Code** | Tiny symbolic shapes, locale-free, need exact pixels (Tumblekin `uiIcon`, Detention Deep `GLYPHS`). |
| UI frames, panels, buttons | **Code**, with PixelLab **plates** nine-sliced for buttons | PixelLab UI kits bake English text and a 6-px bezel that eats content; Detention Deep kept panels/minimap/status in code and nine-slices only the 31×25 button plates (`art/frames.ts nineSlice`). Never ship baked text. |
| Props, decor, pickups, signs | **Code** when seeded or palette-tied (Gloop `art/props.ts`, Tumblekin `art/props.ts`, Sandcrown `art/fauna.ts`) | **PixelLab** `create_1_direction_object` for a pictorial prop set (one pack, `select_object_frames`), and then animated by default: `animate_object` v3 4–8 frame loop (owner, 2026-05-08: static PixelLab props look flat). |
| FX: bursts, bolts, smoke, sparks, glows, particles | **Code** for small, parametric or state-tied FX; **consider PixelLab VFX** for showpiece effects | Code: parametric per size/depth/school, palette-tied, cheap (Detention Deep `art/fx.ts`, Pixelopolis `fxart.ts`, Sandcrown `fx.ts`). Owner, 2026-10-17: FX may also come from PixelLab (`create_vfx` / `vfx_workbench`, start with `vfx_workbench(argv=['describe','start'])`) **where it makes sense**: big hand-drawn-looking one-shots (explosions, spell casts, impacts, magic auras, weather bursts) that would take many drawings in code. Every art plan decides FX per effect, says why, and keeps a code fallback per key. PixelLab `animate_object` animates an **existing** PixelLab object (Bubble Shooter `anim-<colour>-pop/`). |
| Font, logo, lettering | **Code** | 5×7 proportional bitmap font with a per-locale coverage test; logo from the font + dilation. Every hybrid game has `art/font.ts`. |
| Story illustrations, menu hero, key art | **PixelLab** `create_image_pixen` 480×272 → crop 480×270 | Detention Deep `story-<id>-v1`. Scrim + stroke for any text over it. |
| Vehicles / units in 4–8 directions | **Code** when stylised and few (Sandcrown `HULL_DIRS`/`TURRET_DIRS`, Redline low-poly); **PixelLab** `create_8_direction_object` or a character for pictorial detail (Furrowfield tractor/combine 4-dir). |
| Thumbnail, og-card | **Composed from the real game** | 480×270 (or 960×540) `renderer.snapshot` or in-page canvas; `scripts/og-cards.mjs` builds the 1200×630 card. Never generated. |

**Tie-breakers** when a class is on the fence:
- Count drawings: frames × directions × states. Over ~12 distinct hand drawings of one body → PixelLab; a body a rule can produce → code.
- Live state (numbers, locale text, tint by owner, damage level, depth scale) → code, or PixelLab base + code composite (Detention Deep `shrink()` for far depths, `portrait()` halo).
- Many instances with seeded variation on a grid → code.
- Must survive a palette swap / lightmap multiply / weather → code.
- Generations: budget by **calls** (`get_balance`), 2000 per period; a 4-dir v3 character with 4 v3 clips is ~18 generations (2 + 1 per direction per clip); a 64-candidate icon pack is 1 call (~20–40 generations by size). Only Pro-mode animation is a cost cliff.

**"Doesn't hold up"** (owner's triage, used both for upgrades and for rejecting a fresh generation): unreadable at 1× in the running game; AI artefacts, cropped frames, resampled look, wrong facing, jitter; clashes with the set (outline, palette, density); a static sprite where the action needs a state. Fail one → regenerate as a state of the parent, or move the class to code. Don't patch a cropped PNG in code.

## Code side in PixelDen terms

- Layout: `app/games/<slug>/art/` holds pure modules (`raster.ts`, `palette.ts`, `font.ts`, one file per asset group) and **`bake.ts`, the only art file that imports Phaser**. Copy `raster.ts` + `bake.ts` from `app/games/gloop/art/` (identical in Tumblekin, Sandcrown, Redline, Detention Deep); `shape.ts` (bevel painter) from Sandcrown or Scrapwing for hard surfaces; `sketch.ts` from Detention Deep for vector-ish strokes.
- `bake.ts` API: `addImage(scene, key, pix)`, `addSheet(scene, key, frames[])` (uniform frames, numeric frame ids, wraps at 1024 px), `addAnimSet(scene, sheetKey, [{key, fps, repeat, frames}])` → animations named `${sheetKey}:${clip}`. All use `textures.createCanvas` + `putImageData` + `refresh()`; a key that exists is removed first, so re-bakes are safe.
- **Texture keys** are namespaced strings decided in the art plan and shared by both sides: `p:<id>:<state>`, `sp:<spell>`, `it:<item>`, `m:<kind>`, `ui:btn:<state>`, `bg:<level>`, `pxo-icons`. Scenes only ever see the final key, never where it came from.
- **Phaser 4 rules:** canvas textures need `refresh()`; a `DynamicTexture`/`RenderTexture` draws nothing until `render()` and its command buffer holds object references (keep stamps alive and unmutated until the flush; pattern in `app/games/solitaire/card-textures.ts`, doc in `.claude/skills/phaser/render-textures/`). Flash = `setTint(c).setTintMode(Phaser.TintModes.FILL)` (ADD for tanky enemies under sustained fire). Use `putImageData` canvases for pixel buffers, DynamicTexture only when stamping existing game objects.
- Palette discipline: hand-built hue-shifted ramps in `palette.ts`, legend names in grids, never raw hex in a sprite; the same ramps are what you quote to PixelLab (`color_palette`, prompt text) so generated pieces land in the family.
- Review: `code-pixel-game/references/review-loop.md` + `harness.md` (6× group sheets, silhouette row, 1× in-game snapshot, luminance numbers). Preview imports through Vite from a page without HMR churn (`/robots.txt` on the dev origin).

## PixelLab side, short form

Full procedure in [references/pixellab-pipeline.md](references/pixellab-pipeline.md). The spine: **MCP first** → long exact prompt with exclusions, `outline: "lineless"`, palette from the game → review gate (`select_object_frames`) → `curl -L` + `file` → `pixelart-cleanup` if halos → `public/assets/games/<slug>/<area>/<key>-v1.png` → `pixellab-assets.json` entry + `pixellab.mjs tag` → loader size assertion → in-game snapshot. Siblings via `create_object_state` / `create_character_state` on the parent, never a cold re-prompt.

## The stitch: Boot loads, code composites, scenes see one key

Canonical: `app/games/detention-deep/art/pl.ts` + `scenes/boot.ts`.

```ts
// art/pl.ts — texture key → file version; the only place that knows a PNG exists
export const PL_DIR = "/assets/games/<slug>/pl";
export const PL_ART: Record<string, number> = { "p:finn:normal": 1, "sp:fireball": 1, "m:rat": 1 };
export const plFile = (key: string) => `${key.replaceAll(":", "-")}-v${PL_ART[key]}.png`;

// scenes/boot.ts — artKeys() lists every key that may have art, built from game data (students × states, spells, kinds…)
preload() { for (const key of artKeys()) if (PL_ART[key]) this.load.image(`pl:${key}`, `${PL_DIR}/${plFile(key)}`); }
private pl(key: string): Pix | undefined {           // pixels of a loaded PNG, or nothing
  return this.textures.exists(`pl:${key}`) ? pixOf(this, `pl:${key}`) : undefined;
}
create() {
  addImage(this, "p:finn:normal", portrait("finn", "normal", this.pl("p:finn:normal"))); // composite over code halo
  addImage(this, "sp:fireball", this.pl("sp:fireball") ?? spellIcon("fireball"));       // fallback per key
  const sheet = this.pl("m:rat");                                                        // 4-frame strip → per-depth
  if (sheet) sheetFrames(sheet, MONSTER_FRAMES).forEach((f, i) => sprites.set(`m:rat:2:${MONSTER_ANIMS[i]}`, toCanvas(shrink(f, 0.5)))); // DD billboard map; a sprite game would addSheet()
}
```

Rules of the stitch:
- `pixOf(scene, key)` (`art/bake.ts` in Detention Deep) turns the loaded image into a `Pix`, so every PixelLab piece goes through the same `raster.ts` tools as code art: `nineSlice`, `shrink`, `recolor`, `outline`, `stamp` onto code grounds.
- Plain sheets with no compositing load directly: Tumblekin `this.load.image("bg:hollow", "/assets/games/tumblekin/bg-hollow.png")`; Pixelopolis `this.load.spritesheet("pxo-icons", icons.png, {frameWidth: 32, frameHeight: 32})` with the one code-drawn icon painted into the sheet's free frame; Furrowfield `this.load.atlas(ATLAS, "ff-atlas-v1.png", "ff-atlas-v1.json")`.
- Sized textures that depend on layout are cached by key at first use (`scenes/ui.ts buttonKey` → `btn:${w}x${h}:${state}:${accent}` nine-sliced from `pl:ui:btn:<state>` or a code bevel).
- A fallback must be a real drawing, not a magenta box: the code icon/portrait that shipped before the PixelLab round stays in the repo as the fallback.

## Animated characters

Detail in [references/pixellab-pipeline.md](references/pixellab-pipeline.md) §Characters. The rules that bit us:
- Living things are `create_character`, never `create_1_direction_object` (bats included); formless blobs are objects or code.
- **One mode per character.** Template clips render on the requested size, v3 inflates the canvas (size 80 → 88 or 112) and the sprite pops size on clip change. All clips v3 with `action_description`, then `file` every frame: one size per character.
- Side-view games use the **east** profile + `setFlipX(dir < 0)`; south is a front view and "walks on the spot". Crop all clips with one union alpha bbox so feet align (Spirit Snare: 4 × 32×50 strips from a 92-px canvas).
- 4-dir top-down: `enemy-<key>-<dir>.png` stills + `enemy-<key>-walk-<dir>.png` strips, frame size measured with `sips` (canvas, not the requested size), `frameSize` per enemy in Boot (Frost Hold `scenes/boot.ts`), Arcade circle bodies offset to the canvas centre.
- Code parametric bodies: keyframe table → rasteriser (`gloop/art/slime.ts`), part layers + one outline pass for humanoids (`gloop/art/enemies.ts compose`), thin details after the outline.

## The art plan

Fill [references/art-plan-template.md](references/art-plan-template.md) before any generation or drawing. Columns: group · class · side (code / PixelLab / PL + code composite) · texture keys · size & frames · PixelLab tool + parent · fallback · file name + version · test. The plan also fixes the size table (native resolution, tile, sprite frames) and the palette; changing a frame size later breaks every pose and every nine-slice.

## Pre-ship checklist (short)

Full list in [references/art-plan-template.md](references/art-plan-template.md) §Pre-ship. Thumbnail 16:9 from the real render; every PixelLab key has a fallback and a size assertion; no 404 under `/assets/games/<slug>/`; text over busy art has a scrim; mobile viewport screenshot at 1×; `pngquant` on the new files only (`task assets:optimize -- --game <slug>` is the scoped form; without `--game` it is repo-wide, and either way it shrinks `thumbnail.png` to 400 px and ignores subdirs like `pl/`), `git status -- public/assets` clean outside the game; `-vN` names; manifest + tags; nothing in the top-right 32 px of the canvas (fullscreen button).

## References

| File | Read when |
|---|---|
| [references/pixellab-pipeline.md](references/pixellab-pipeline.md) | Before any PixelLab call: tool per class, prompt template, review gate, download/verify, post-process, naming, manifest, characters, backdrops, UI plates, cost |
| [references/art-plan-template.md](references/art-plan-template.md) | Writing the plan, and before shipping: template, worked example, canonical code paths, pre-ship checklist |
| `~/.claude/skills/code-pixel-game/` | Drawing anything in code: art-kit, style, review-loop, failures, harness, lessons-log (append after every session) |
| `.claude/skills/pixellab/SKILL.md` | MCP tool reality check, cost model, tilesets, `pixellab.mjs` fallback and `webp` |
| `.claude/skills/pixelart-cleanup/SKILL.md` | Halo / alpha fringe cleanup on downloaded sprites |
| `.claude/skills/phaser/render-textures/` | DynamicTexture / RenderTexture in Phaser 4 |
