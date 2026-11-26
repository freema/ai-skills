---
name: tile-icons
description: "Make a PixelDen game's catalog tile icons: the square icon (1×1 tile), the big 2×2 and the wide 2×1 art. PixelLab is preferred when credit is available (create_image_pro, the square icon as reference and style, exports by integer nearest-neighbour to lossless WebP); big 2×2 and wide 2×1 art is always PixelLab; code-drawing with tools/tile-icons is the fallback and is fine for simple square icons. Covers the icon spec (sizes, safe zone, motif in the upper 75 %, calm name-strip band, no text), the PixelLab prompt and checks, file names and versioning, the registry fields iconUrl / iconBigUrl / iconWideUrl and how GameTile and the home grid pick a file, the code kit, build and sheet commands, the checklist and the pitfalls already hit. Triggers: 'tile icon', 'game icon', 'icon-big', 'icon-wide', 'big tile art', 'ikona hry', 'dlaždice', 'nová hra ikona', 'ikona na dlaždici', 'nakreslit ikonu'."
---

# Tile icons

Owner's rule (2026-11-26, task 144 chapter 16, point 28): **PixelLab is preferred for tile icons when credit is available** (he tops it up). **Code-drawing with `tools/tile-icons/` is the fallback** and is fine for simple square icons (cards, boards, glyphs). **Big 2×2 and wide 2×1 art is made with PixelLab**: the code-drawn big and wide art was rejected as too flat next to the PixelLab squares.

Owner's icon choice (2026-11-26, chapter 16, point 32): **code-drawn icons are retired**, except Snake (`icon-v1`, `tools/tile-icons/icons/snake.mjs`); the other code icon modules and their unused exports were deleted. 14 games use a **thumbnail crop** `icon-thumb-v1` instead of drawn art: hophazard, dungeon-hamlet, breakout, invaders, titan-siege, ore-merge, pixel-kart, dead-mans-hand, fruit-slice, connect-four, sandcrown, vault-run, tumblekin, marens-light. The review set is `tasks/144-assets/icons-v3/`.

Spec and history: `tasks/144-mobile-first-redesign.md`, chapter 8 (icons) and chapter 16 (decisions).

## Spec

| Kind | Source (1×) | Exports (lossless WebP) | Used by |
| --- | --- | --- | --- |
| Square `icon-vN` | 96×96 | `-192`, `-384`, `-576` | 1×1 tiles everywhere; 2×2 when no big art |
| Big `icon-big-vN` | 192×192 | `-384`, `-576`, `-1152` | 2×2 tile (home trending, catalog) |
| Wide `icon-wide-vN` | 192×96 | `-384`, `-768`, `-1152` | 2×1 tile |
| Crop `icon-thumb-vN` | square crop of the thumbnail | `-192`, `-384`, `-576` (lossy) | like a square icon, but **smooth scaling** |

A crop is mostly not pixel art, so every renderer asks `isPixelIcon(iconUrl)` (`app/lib/game-tile.ts`: false for a path with `/icon-thumb-` or `/icon-anim-`) and drops `image-rendering: pixelated` for it; `tileImage()`, `gameIcon()` and the game page poster do. `icons.test.ts` accepts only `icon-vN`, `icon-thumb-vN` and `icon-anim-vN` as `iconUrl`.

- **Safe zone:** 10 % on every side (rounded corners). Nothing important touches the edge.
- **Motif in the upper 75 %.** The tile lays the game name over the bottom ~20 % on a dark band, so the bottom stays calm: floor, ground, water, a flat dark colour. Never put a face, a hand or the key prop there.
- **One scene, one hero.** Use the same hero and setting as the game (and as the square icon). Big and wide are new drawings with more room and detail, never an upscale of the square. The wide one may add a second element (a rival, a pickup, the next obstacle).
- **Opaque scene, full bleed.** No transparent pixel, no white margin or stripe along an edge.
- **No text, no logos, no letters** (glyph games draw their glyphs as pixel grids, see `glyph-depths.mjs`).
- **Light from the top left**, dark outlines on figures.
- **Read at phone size.** A 1×1 tile is ~113 CSS px on a phone; the silhouette must read there. The hero takes 25–50 % of the width.

## Animated icon from an animated thumbnail

Games whose old 16:9 thumbnail is an animated WebP (`thumbnail-animated.webp`) can use a square crop of it as an animated icon `icon-anim-vN` (owner, 2026-11-26, task 144 ch. 16 point 35; 11 games: alchemia, arcane-spires, claimer, columns, dead-mans-hand, golden-hook, loco-run, ore-merge, terra-claim, vault-run, velvet-spin).

- `node tools/tile-icons/anim-icons.mjs [slug...]` (host node, sharp) writes `icon-anim-v1-192|384|576.webp` (animated, every frame and delay of the source, so the loop is the source's loop; quality steps down from 80 until the file fits 150 KB at 192, 400 KB at 384, 800 KB at 576) and `icon-anim-v1-still-192|384|576.webp` (frame 0, same crop). It refuses to overwrite a file. The crop table `CROPS` is in the script: games that had an `icon-thumb-v1` reuse its window, the rest were picked by the same detail search plus motion and a penalty for busy pixels in the bottom fifth. True pixel art (`scale` > 1) goes through its art size by nearest neighbour.
- `isPixelIcon()` is false for `/icon-anim-` (smooth scaling). `GameTile` plays it in the grid and rows and serves the still through `<picture><source media="(prefers-reduced-motion: reduce)">`; `GameIcon`, the home category cards and the game page poster always show the still (`stillIcon()`), so a game keeps one crop everywhere. `icons.test.ts` also checks the still exports.
- Revert one game: its registry line carries the old value as a comment (`iconUrl: ".../icon-anim-v1", // was icon-v1`); put the old value back. Review set: `tasks/144-assets/v072/anim/`.

## PixelLab (preferred)

How the approved icons were made (task 144 chapter 8: trial batch, PR 7, PR 9 big and wide):

1. `get_balance` first. Plan generations are used before USD credits; `create_image_pro` costs 10 generations per call (≈ 0.08 USD from credits). 96×96 returns 4 candidates; 192×192 and 192×96 return one.
2. Upload the reference with `get_upload_url` (one `curl -F file=@…`), never paste base64. For big and wide art the reference is the game's own square `pl/icon-vN.png`, passed both as `reference_images` (usage: "the same hero, scene, colours and style; redraw as a larger, more detailed full-bleed scene") and as `style_image_url`. For a new square icon the content reference is the game's thumbnail and the style image an approved square icon (PR 7 used `fuseheads`).
3. `create_image_pro`, `no_background: false`, canvas 96×96 / 192×192 / 192×96. Prompt pattern: kind of art and size, the game, the hero from the reference and what it does, the setting; then "full bleed, painted to every edge, absolutely no white or light background, no white margin, no border, no frame, no padding"; "no text, no letters, no numbers, no logo, no UI"; "motif in the upper three quarters, about 10 % from the edges; the bottom fifth a calm low-detail strip that reaches the bottom edge"; "same hero, palette, dark outlines and shading as the reference, redrawn with more room and finer detail (not an upscale)"; "light from the upper left". Say how big the hero is ("about 30 % of the width") or it comes out tiny on wide art.
4. Download `https://api.pixellab.ai/mcp/images/<job>/download` with `curl -L`, then `file` (must be PNG of the canvas size). Machine checks before looking: no transparent pixel, no near-white run along any edge (a white margin of 13–19 px or a 3 px white stripe happened on 4 of 23 calls), colour count.
5. At most two attempts per image; white margins, text or an off-model hero count as failures. A prompt can be refused "against policy" for no clear reason (the word "mahjong" plus "characters" once); reword and retry.
6. Save the 1× source as `pl/<name>.png` and export by integer nearest-neighbour scaling, `cwebp -lossless -z 9 -exact`. Record each image in `pixellab-assets.json` under the game (Creator asset id, job id, files).
7. Never Read a PNG or WebP into the model context. Look at one JPEG contact sheet (≤ 1200 px wide) made with `sheet.mjs`.

PixelLab art is never deleted: a better version is a new `-vN`.

## Code-drawn (fallback, retired except Snake)

Only `snake.mjs` is left in `tools/tile-icons/icons/`; `kit.mjs`, `build.mjs` and `sheet.mjs` stay for it and for a future simple icon.

- **Palette:** named hand-built ramps per module (`const P = {...}`), dark → light, cool shadows, warm lights. 15–100 colours per icon is normal.
- **Outline:** every figure is a `layer(fn, ink)` so it gets a 1 px dark ink outline (never pure black). Background stays unoutlined.
- **Light from the top left:** `ball()` already shades that way; add a light edge on the top/left of boxes and a dark one bottom/right.

## Files and versions

```
public/assets/games/<slug>/pl/icon-v2.png        1× source
public/assets/games/<slug>/icon-v2-192.webp       exports
public/assets/games/<slug>/icon-big-v2-384.webp
public/assets/games/<slug>/icon-wide-v2-768.webp
```

- Published files are cached for a year under their name (nginx immutable). **Never overwrite or delete a committed file.** To change art, draw `-v(N+1)` and point the registry at it. `build.mjs` refuses to overwrite git-tracked files (only `--force` does, for local experiments before the first commit).
- Old versions stay in the repo, with two exceptions: code-drawn big/wide v1 art that was never released and that the owner rejected was removed in PR 9, and on 2026-11-26 every code-drawn square icon and thumbnail crop the registry no longer used was removed (56 bases, 206 files). PixelLab art is never removed, even unused (e.g. the PixelLab `icon-v2`/`icon-v3` of the 14 crop games, Snake's `icon-v2`).

## Registry and how a tile picks its picture

`app/games/registry.ts`, base paths without size or extension:

```ts
iconUrl: "/assets/games/gloop/icon-v1",
iconBigUrl: "/assets/games/gloop/icon-big-v2",
iconWideUrl: "/assets/games/gloop/icon-wide-v2",
```

`tileImage()` in `app/lib/game-tile.ts`:
- 2×1 tile → `iconWideUrl` if set, else the 16:9 thumbnail cropped (a square icon would lose half its motif).
- 2×2 tile → `iconBigUrl` if set, else the square icon at 576 (plus 1152 only when `tile: "2x2"`).
- 1×1 → `iconUrl`, else the thumbnail.

`arrangeTrending()` (`app/lib/home-trending.ts`) never changes which games the home shows; it only gives the 2×2 slot to the best-ranked game with big art and the 2×1 slot to the best-ranked other game with wide art. Setting `iconBigUrl` / `iconWideUrl` is enough; do not set `tile` just for art (`tile: "2x2"` also demands a square `-1152` export).

`app/games/icons.test.ts` fails when any export named by those fields is missing.

## A game is always shown by its tile icon

Anywhere a game appears as a picture (grid, row, list row, picker, card), it is its tile icon, never the 16:9 thumbnail. The owner: the thumbnail "destroys the identity".

- In the grid: `GameTile` (`tileImage()`).
- Anywhere else (a square box of N CSS px): `<GameIcon game={g} size={N} />` from `app/components/game-icon.tsx`, built on `gameIcon()` in `app/lib/game-tile.ts`. It serves `iconUrl` (pixelated unless `isPixelIcon()` says it is a crop) with the 192/384/576 srcset and `sizes="Npx"`, `src` the smallest export sharp at DPR 3, and falls back to `thumbnailUrl` only when the game has no icon. Give the box its size class too (`size-16` …) so a thumbnail fallback stays square.
- The thumbnail stays only for OG/Twitter images, JSON-LD `image`, a blog post's cover and the fallback above.
- A new page or list that shows games: pass `iconUrl` through the loader (not just `thumbnailUrl`) and use `GameIcon`. Places that show games today: home (grid, rows, category cards), `/games` + category/tag/collection, search, game page (header, Related Games, mobile grid, coming-soon suggestions), `/leaderboard` game picker, `/daily` cards, `/profile` Quick Play. Check with `git grep -n thumbnailUrl app/routes app/components`: every hit left must be SEO or a fallback.

## Commands (host node, no Docker)

```bash
node tools/tile-icons/build.mjs snake                    # every drawing in icons/snake.mjs
node tools/tile-icons/build.mjs snake:icon-v1            # one drawing
node tools/tile-icons/sheet.mjs big  out.html [slug...]  # 384 px big tiles + square
node tools/tile-icons/sheet.mjs wide out.html [slug...]  # 384×192 wide tiles + square
node tools/tile-icons/sheet.mjs v2   out.html [slug...]  # new square next to the old one
node tools/tile-icons/sheet.mjs review out.html [slug...] # 2× and phone size with the name strip
```

`build.mjs` prints colours and the three export sizes per drawing; it needs `cwebp` on the PATH. Screenshot a sheet with headless Chrome (`--headless=new --mute-audio --screenshot --window-size=W,H`) and convert it to JPEG with `sips`. Look at the JPEG only, at most ~1200 px wide: reading a PNG or WebP into the model context can crash the session.

## Writing `icons/<slug>.mjs`

A module exports `draw` (the original square `icon-v1`) and/or `art`, a map from file base name to a draw function. Each function gets a fresh `Pix` sized for its kind (`k.w`, `k.h`) and must fill every pixel (an empty pixel throws).

Kit (`tools/tile-icons/kit.mjs`), all on `k`:
- fills: `rect`, `each(x,y,w,h,(x,y)=>colour|null)`, `vbands` (sky bands with a dithered seam), `bricks`, `stars`
- shapes: `ellipse`, `disc`, `ball(cx,cy,r,ramp,ry)` (shaded sphere), `poly`, `line(…, t)`, `bolt` (jagged line), `grid(x,y,rows,legend,scale)` for hand-placed pixel grids
- light: `glow(cx,cy,r,colour,strength)`, `shadow`, `fade`, `recolor`
- figures: `layer(fn, ink)` draws into a fresh layer, outlines it and blits it on top
- helpers: `hash(x,y,seed)` for deterministic noise, `bayer` for ordered dither, `mix`

A minimal module (an example; the code-drawn big and wide art of PR 9 was rejected and removed, so no committed module draws big or wide art today):

```js
const P = {
  wall: ["#2a1a30", "#3a2440", "#4a3050"],
  mortar: "#1a1020",
  slime: ["#1a6a1a", "#3ab83a", "#7aee5a", "#d0ffb0"],
  ink: "#0c0810",
};

function gloop(k, cx, cy, r) {
  k.layer((l) => {
    l.ball(cx, cy, r, P.slime, r * 0.9);
    l.ellipse(cx - r * 0.3, cy - r * 0.2, r * 0.18, r * 0.22, "#ffffff");
  }, P.ink);
}

export const art = {
  "icon-big-v1": (k) => {
    k.bricks(0, 0, 192, 192, 24, 12, P.wall, P.mortar, 5);
    gloop(k, 96, 90, 44);
    k.rect(0, 156, 192, 36, P.mortar); // calm band for the name
  },
  "icon-wide-v1": (k) => {
    k.bricks(0, 0, 192, 96, 16, 8, P.wall, P.mortar, 5);
    gloop(k, 70, 44, 24);
    k.rect(0, 78, 192, 18, P.mortar);
  },
};
```

Write scene parts as functions of position and scale (`hero(k, x, y, s)`), so the big and the wide share them.

## Loop

1. Look at the game first (its square icon, thumbnail, hero sprite) and write one line: what must read (hero, action, setting).
2. Draw, build, make a sheet, screenshot to JPEG, look.
3. Revise the silhouette, not the shading, when something does not read. Expect 2–3 passes per drawing.
4. Do a second pass over all drawings side by side in one sheet: does each read at phone size, is the bottom band calm, do they sit together.
5. Save the final sheets with the work (task 144 keeps them in `tasks/144-assets/pr/<n>/`).

## Checklist

- [ ] Every export exists: `vitest run app/games/icons.test.ts` (inside Docker: `task test -- app/games/icons.test.ts`).
- [ ] Weights: square ~0.5–3.5 KB (code) or 2–7 KB (PixelLab) per export; big and wide 3–15 KB from PixelLab (more colours and texture), 1.5–6 KB in code. Much more means noise or dither everywhere.
- [ ] No committed file overwritten or deleted (`git status` shows only new files under `public/assets/games/`).
- [ ] Registry points to the new version; `tile` unchanged unless the layout really needs it.
- [ ] Looked at the sheet at tile size and at phone size; motif in the upper 75 %; no text.
- [ ] `prettier` and `eslint` on the changed `.mjs` files.

## Pitfalls already hit

- **The hero hidden by a prop:** the Pixel Kart sun disappeared behind the helmet until it got twice the radius. Check what overlaps after each move.
- **Objects floating:** mahjong tiles above the tortoise's shell, a dome that read as an egg. Ground every object: it rests on something, with a contact shadow.
- **Symbols that read as something else:** a `#` drawn upright reads as `H` (slant it); French suits on a German-suit game (Mau-Mau uses hearts, bells, leaves, acorns). Check the game, not memory.
- **A scene that becomes a franchise look-alike:** a wizard student in a robe and a striped scarf. Draw the game's own scene instead.
- **Tiny heroes:** tanks or karts small in a big field read as noise. The hero takes 30–50 % of the width.
- **Blank faces:** at small scale, a face needs one big eye with a highlight and a mouth with contrast; hair as a cap over the top.
- **Thin streams and wires:** pours and beams under 4 px vanish at phone size; give them a dark edge and a light core.
- **Style gap:** big/wide art drawn in code next to a PixelLab square icon of the same game looks flatter; the owner rejected all ten such drawings (PR 9). Big and wide art comes from PixelLab with the square icon as reference.
- **PixelLab white margin:** some 192 px calls come back as a framed card with a white margin, or with a thin white stripe on one edge. Check the edges by script; "painted to every edge, no white margin" in the prompt fixed every retry.
- **Tiny hero on wide art:** PixelLab fills a 2:1 canvas with scenery and shrinks the hero; give the hero's size in the prompt.
- **Calm band forgotten:** a busy floor under the name strip makes the name hard to read; end each drawing with a flat band.
