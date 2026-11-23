# PixelLab pipeline for a hybrid game

Everything here is the PixelDen-specific procedure. Tool semantics, cost model and tilesets are in `.claude/skills/pixellab/SKILL.md`; this file says which tool for which asset class of a hybrid game, how the output gets into `public/assets/games/<slug>/` and how it is recorded.

## 1. Tool per asset class

| Class | Tool | Notes from use |
|---|---|---|
| Icon pack (spells, items, toolbar) | `create_1_direction_object({ description, size: 18–32, item_descriptions: [...] })` → `review` with 64 candidates → `select_object_frames` for the keepers → `dismiss_review` | One call = one bar. Packs **skew**: Detention Deep's 16-item portrait pack returned 32 Finn, 24 Mira, 8 Oskar, 0 June. Plan one pack per subject that must exist, not one pack for a cast. Names after selection are `index % items`, so pick from a contact sheet, never from names. |
| Portrait / bust / expression | base bust from a pack, then `edit_image_pixen` for every expression and fix (talk, happy, scared, hairband) | Pixen edits are Creator images (`type: image`), **not taggable**: record them in the manifest notes. 32×32 on transparent ground; code adds the halo, grey-out, sparks. |
| Story illustration, menu hero | `create_image_pixen` at 480×272 (API rounds to 8), crop to 480×270 | `story-<id>-v1.png`. Needs a scrim under any text. |
| Monster / creature, side or 3/4 view, few clips | `create_image_pixen` front-view base → `create_character_pro_flash` (legged) or `create_object_pro_flash` (slime, book, armour, ink, mimic, broom) → `animate_*` with `mode: "v3"`, `frame_count: 4` per clip (idle, attack, hurt) | Detention Deep round 2: 4 picked frames (idle0, idle1, attack, hurt) form one strip `m-<kind>-v1.png` at the near-depth scale; code shrinks it for far depths (`art/pl.ts shrink`). |
| Top-down 4/8-dir character | `create_character({ mode: "v3", n_directions: 4|8, view: "low top-down", outline: "lineless" })` → `animate_character` v3 `action_description` per clip, `directions: [...]` | §3 below. |
| Side-view player (platformer, Pang, sky pirates ship crew) | `create_character` v3, take the **east** rotation only, `animate_character(..., directions: ["east"])` | §3 below. |
| Same-style sibling (another card, another enemy colour, a damaged state) | `create_object_state(object_id: parent, edit_description)` / `create_character_state` | Never a fresh `create_*` for a sibling: it reseeds the style (mau-mau deck, Claimer sprites). |
| 8-direction prop or vehicle | `create_8_direction_object` | Size ≥ 171 skips the review gate (single candidate). |
| Painted backdrop plate | `create_image_pixen` / `pixellab.mjs background` within the aspect cap (4:3 ≤ 600×448, 16:9 ≤ 688×384, portrait ≈ 384×680) | §4 below. |
| Button plate, bar, frame | `pixellab.mjs ui` (description only → empty frames) or the web Create UI (bakes text, needs masking) | §5 below. |
| Motion on an existing PixelLab object | `animate_object({ object_id, animation_description, mode: "v3", frame_count })` | Frames at `…/objects/<group>/<id>/animations/<anim>/<dir>/<N>.png`; N+1 frames come back (last is a pop-end). |
| Animated WebP (thumbnail loop) | download frames → `node scripts/pixellab.mjs webp --in-dir <dir> --out <x>.webp --duration 120` | The one step neither MCP nor REST can do. |

Tools that **do not exist**: `create_object`, `vary_object`. Tools that exist but are off-limits for game art: PixelForge (`forge_*`), image generation outside PixelLab.

## 2. Prompt template

PixelLab rewards long, fully specified prompts. Fill every slot; list exclusions explicitly.

```
<subject>, <count/arrangement if a pack>, pixel art, <view: front bust | low top-down | side profile facing right | 3/4 top-down>,
<size> px on a transparent background, lineless (no dark outline), <shading: flat | medium shading>, medium detail,
palette: <5–8 hexes copied from art/palette.ts ramps, name them: skin #…, robe #…, ink #…>,
light from the top left, <material/texture words>, silhouette: <one clause that names the read>,
no text, no border, no frame, no background, no drop shadow, no extra characters, centred, feet on the bottom row
```

- Name the **read** in one clause ("the lantern is the focal point", "hooded, one eye glows"). That is what survives at 1×.
- Paste the game's ramps. A piece generated on its own palette is the first thing the owner calls "pasted in".
- For opaque scenes add "edge to edge, full bleed, no border, no vignette" and "no characters" if none are wanted.
- `seed` for reproducibility; `enhance_prompt` costs 0.05 and rewrites your exclusions, leave it off.
- Keep the final prompt in the manifest `desc` so a sibling can be made months later.

## 3. Characters

**Top-down 4-dir (Frost Hold convention, `app/games/frost-hold/scenes/boot.ts`):**
1. `create_character` v3 (2 gens), `size` is the body, the **canvas is ~40 % larger** (size 48 → 88–92 px, 32 → 56–60). Measure with `sips`; that canvas is `frameWidth/Height` in Boot.
2. Rotations → `enemy-<key>-<dir>.png` stills. Clips → `animate_character` with `action_description` ("walking forward toward the viewer", "idle breathing") per direction, one gen per direction per clip; download per-frame URLs from `get_character` and stitch horizontal strips (`enemy-<key>-walk-<dir>.png`) with PIL/sharp on the host.
3. `keep_first_frame` (default true) adds the reference as frame 0: a 6-frame request stores 7. Read frame counts from the downloaded files, not the parameter.
4. **One mode per character.** Template clips (`walking-4-frames`) render at the body size, v3 at the inflated canvas; mixing makes the sprite jump size on clip change (Dungeon Cast ghoul 80 vs 88, frost warden 80 vs 112). Verify: `file <dir>/*-0.png | sed 's/.*PNG image data, //; s/,.*//' | sort -u` prints **one** size per character.
5. West = east with `setFlipX(true)` when the model is symmetric enough; otherwise request 4 dirs.
6. Arcade bodies: `body.setCircle(r, frame.width/2 - r, frame.height/2 - r)`; the big canvas makes the default corner anchor wildly off.
7. 8 concurrent jobs per account: queue two characters' clips at a time.

**Side view (Spirit Snare, platformers):**
- Never the south rotation. Take **east** stills + east clips (idle breathing, walk, action) and crop **all** frames with one union alpha bbox so the feet line up between clips (Spirit Snare: 92-px canvas → four 32×50 strips, `frameWidth: 32`). Loader `PLAYER_W/H` follows the crop ratio.
- Make the player big and readable (owner: "velká a čitelná"), the surrounding art is sized to it, not the other way round.

**Creatures vs objects:** anything alive is a character (a bat is not a blob). Objects are for props, pickups, signs, cones. Slimes and formless things: object per pose, or draw them in code (the parametric slime is one rule for every frame).

**Code side of the same table:** when the plan says code, the character is a keyframe table (`gloop/art/slime.ts`) or part layers with one outline pass (`gloop/art/enemies.ts compose`, `sandcrown/art/units.ts`); budget 5 passes for an animated code character and redesign the silhouette after pass 2.

## 4. Backdrops and readability

- A busy generated plate drowns text and small sprites. Behind menu/HUD text: plate at ~0.32 alpha **plus** a flat dark scrim (≈0.55) at a lower depth, titles with a dark stroke and a same-hue glow; buttons get a visible panel colour, not near-black. Markers over a plate must be bold, contrasting in hue and nearly cell-sized, with a code glow behind them.
- Level plates: Tumblekin loads one 384×176 PNG per world as `bg:<name>` and draws it at origin 0 behind the code-drawn level; 13–18 KB each after quantization. Keep plates small (the game is 480×270 or less) and let Phaser scale by integers.
- Tileable panoramas (parallax, Mode-7 sky): PixelLab will not make seamless output on request. Pipeline that works (Pixel Kart): composite over a solid sky colour, trim the 2–4 edge rows, crop to the detail band, **mirror-concat** horizontally, `TileSprite`. Forbid central focal points in the prompt.
- PixelLab leaves alpha-0 holes in "opaque" scenes; composite over a solid colour before use or the shader behind shows through.
- When the backdrop must respond to the game (time of day, weather, lightmap, parallax layers with grounding), draw it in code instead (`gloop/art/backgrounds.ts`, Redline `render/textures.ts` sky panoramas).

## 5. UI plates

- Description-only `generate-ui-v2` returns empty frames; the web tool or a `concept_image` bakes English text into them. Baked text is never shipped: nine-slice the frame and cover the interior with a near-opaque dark "screen" (alpha ≈ 0.985), then draw live localized text on top (Ion Rush).
- Detention Deep: the kit's 6-px bezel covered panel content, so panels, minimap and status stayed in code; only the three 31×25 button plates are used, nine-sliced in `art/frames.ts nineSlice(src, w, h, inset)` with corner inset 7 (3 for buttons 24 px wide or narrower: `w > 24 ? PLATE_INSET : PLATE_RIM`). A mottled disabled plate was flattened to one colour.
- The "fully transparent centre" prompt returns an opaque near-white centre; flood-fill it out from the centre (tolerance ~30) before nine-slicing.

## 6. Download, verify, clean, place

```
curl -L "<rotation or frame URL>" -o public/assets/games/<slug>/pl/<key>-v1.png   # public Backblaze URL, no auth
file public/assets/games/<slug>/pl/<key>-v1.png            # must say: PNG image data, WxH, 8-bit/color RGBA
sips -g pixelWidth -g pixelHeight <file>                    # matches the loader's frame maths
```

- Backblaze returns 403 to Python urllib; `curl -L` only. Without `-L` a tileset download is a 0-byte redirect.
- Halo or fringe pixels: `.claude/skills/pixelart-cleanup/` (`scripts/pixelart-cleanup`, start at `--alpha-threshold 32`).
- Compress the new files only: `pngquant --force --quality=60-85 --ext .png <file>` on the host (lossless `--quality=100-100` or `oxipng` for sheets whose exact palette matters, as Detention Deep did). `task assets:optimize -- --game <slug>` (`tools/optimize-assets.ts`) is the scoped alternative; **without `--game` it is repo-wide**. Either way it scans only the top level of the game dir (a `pl/` subdir is untouched), skips files under 10 KB, quantizes `bg*` files and resizes `thumbnail.png` to 400 px wide (`--thumbnail-size N` to keep 480 or 960). After any run: `git status -- public/assets` and `git checkout --` every path outside the new game.
- Never put a generated PNG through `Read`. Visual check = in-game `renderer.snapshot()` crop or a harness preview sheet.

**Naming:** `public/assets/games/<slug>/pl/<key>-v<N>.png` where `<key>` is the texture key with `:` → `-` (`sp:fireWall` → `sp-fireWall-v1.png`), or one atlas `<slug>-atlas-v<N>.png/.json` when the whole PixelLab set is small (Furrowfield, 111 frames in 512×259, 31 KB). Thumbnails and og-cards are `thumbnail.png` / `og-card.jpg` at the top level. A changed file gets the next `-vN` and the version bump goes into `PL_ART` (or the loader path); nginx caches `/assets/` immutable for a year and Vite never hashes `public/`.

## 7. Record it

1. **Manifest** `pixellab-assets.json` → `games["<slug>"] = { tag: "pixelden-<slug>", lookup: "list_objects(tags:pixelden-<slug>)", count, notes, assets: [{ id, type: "object" | "character" | "image", size, desc }] }`. `desc` = what it is + which file (`"Finn bust, hurt wince (frame 26) — p-finn-hurt-v1"`). `notes` = the round's story: packs used, what skewed, what stayed in code and why, generations spent. Detention Deep's entry is the model; Tumblekin, Furrowfield and Pixelopolis have none yet and should get one when touched.
2. **Tags** (objects and characters only; images and iso tiles are not taggable): `node scripts/pixellab.mjs tag --id <uuid> [--type character] --add "pixelden,pixelden-<slug>,<slug>"` (0 generations; `--add` unions, a bare PATCH replaces).
3. **Parent ids** for every family in the notes, so the next sibling is a `*_state` call, not a re-prompt.
4. **Loader assertion:** in `art/art.test.ts` or Boot, check `png.width === frames * frameW && png.height === frameH` for every sheet, and that every key in `PL_ART` has a file on disk (a Node test over `public/assets/games/<slug>/pl/`).

## 8. Budget by calls

The cost model (dual bucket, per-call pricing, the Pro-animation cliff, `confirm_cost`) is in `.claude/skills/pixellab/SKILL.md` §Cost model; `get_balance` before a batch. Reference spend for planning: Detention Deep took 94 generations for 20 portraits + 20 icons + 14 pixen edits + 40 UI kit, and 92 more for the story round with 12 monsters. Write the spend into the manifest notes.
