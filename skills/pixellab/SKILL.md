---
name: pixellab
description: >
  Pixel-art asset generation for game projects, MCP-first via the connected pixellab
  MCP server (mcp__pixellab__* tools). Triggers on: "generate pixel art", "make a pixel
  sprite/tile/character", "animate this sprite", or any pixel-art asset request for
  app/games/**. Falls back to scripts/pixellab.mjs only for animated WebP assembly or
  as a REST emergency path.
---

# PixelLab Skills (MCP-first)

Pixel-art asset generation for `app/games/**`. **The PixelLab MCP server is the default
path** — it is connected this session as `mcp__pixellab__*` tools, lands every asset in the
PixelLab dashboard (reusable, style-chainable), and bills against our subscription. Use the
local `scripts/pixellab.mjs` only for the one thing the MCP can't do (assemble an animated
WebP) and as an emergency REST fallback.

**Official docs / disambiguation:** `mcp__pixellab__agent_help` (a docs-search agent — ask it
≤500-char questions). MCP tool reference: https://api.pixellab.ai/mcp/docs · REST reference:
https://api.pixellab.ai/v2/llms.txt (+ full param/cost detail in `…/v2/openapi.json`).

---

## Golden rules

1. **MCP-first.** Generate through `mcp__pixellab__*`. Reach for `scripts/pixellab.mjs` only for
   `webp` assembly or if the MCP server is unreachable.
2. **Write BIG, exact descriptions.** PixelLab rewards long, fully-specified prompts: subject,
   view angle, palette, lighting, material, silhouette, and an explicit list of what to EXCLUDE.
   Vague prompts waste generations. (See "Writing prompts".)
3. **Style-lock related assets** with `create_object_state` / `create_character_state` on a
   completed parent — never cold-generate siblings (loses palette/identity). See [[feedback-pixellab-card-state-parent]], [[feedback-claimer-sprite-refs]].
4. **Never save binary with the Write tool** — it corrupts PNGs to zero-filled garbage.
   `curl -L` the rotation URL, then `file`-verify.
5. **Bump the filename on any asset replacement** (`-v3` → `-v4`) — `public/assets/**` is
   immutable-cached 1y + 30d nginx. See [[feedback-nginx-static-cache]].
6. **PixelLab only — no PixelForge fallback** for game sprites. See [[feedback-pixellab-only-for-games]].

---

## ⚠️ Tool-name reality check

There is **NO** `create_object` and **NO** `vary_object` tool — those names (in older memory) were
never real. The actual primitives on the connected server are:

| You want…                                  | Real MCP tool                                                  |
| ------------------------------------------ | -------------------------------------------------------------- |
| One static sprite / prop / icon            | `create_1_direction_object`                                    |
| Same object from 8 angles (rotations)      | `create_8_direction_object`                                    |
| A variant **in the same style** as an object | `create_object_state` (source `object_id` + `edit_description`) |
| Throwaway object (auto-deletes 8h) + inpaint | `create_map_object`                                            |
| Rigged character (4/8 dir, walk cycles)    | `create_character` → `create_character_state` → `animate_character` |
| Motion on an existing object               | `animate_object` (mode `v3` = cheap default)                   |
| Terrain autotiling                         | `create_topdown_tileset` / `create_sidescroller_tileset`       |
| Tile variants / isometric                  | `create_tiles_pro` / `create_isometric_tile`                   |
| Poll any of the above                      | `get_object` / `get_character` / `get_*_tileset`               |
| Pick from a `review` candidate grid        | `select_object_frames` / `dismiss_review`                      |
| Balance                                    | `get_balance`                                                  |

---

## Canonical flow: create → poll → download (verified)

Generation is **asynchronous**. The create call returns an id immediately; you poll until
`completed`, then download the PNG from a **public** URL.

```
1. create_1_direction_object({ description, size }) → returns object_id
2. get_object({ object_id, include_preview: false })   # poll every ~10–30s
     status: processing  → progress + ETA, keep polling
     status: review      → candidate grid (see "Review gate") — select or dismiss
     status: completed   → has `rotations:` + `download:`
     status: failed      → error + retry hint
3. Download the PNG. `get_object` (completed) returns, exactly:
     rotations:
       <dir>: https://backblaze.pixellab.ai/file/pixellab-characters/objects/<grp>/<id>/rotations/<dir>.png
     download: https://api.pixellab.ai/mcp/objects/<id>/download   # zip archive of all frames
   For a 1-direction object the rotation key is literally `unknown`.
4. curl -L "<rotation-url>" -o public/assets/games/<game>/<name>-v1.png   # NO auth header needed
5. file public/assets/games/<game>/<name>-v1.png   # MUST say "PNG image data, WxH, 8-bit/color RGBA"
```

**Download facts (verified live):** rotation URLs are public Backblaze links — a plain
`curl -L` with **no `Authorization` header** returns the real PNG (HTTP 200). The MCP never
returns raw bytes and never writes files; it only hands back URLs (+ an optional inline
preview when `include_preview` is true — for eyeballing, not for saving). Poll budgets:
1-dir/tiles ~15–90s, 8-dir/characters ~2–4 min, tilesets ~100s.

### Review-status gate (don't lose your asset)

`create_1_direction_object` with `size ≤ 170` returns **multiple candidates** in `review`
status (≤42→64 candidates, ≤85→16, ≤170→4). `get_object` shows them inline; you **must** then
call `select_object_frames({ object_id, indices: [n] })` to promote the good one(s) into their
own completed objects, or `dismiss_review` to discard. Leave it and the asset never finalizes.
Use `size ≥ 171` to get a single candidate with no review step.

---

## Style consistency: object-states & style-refs

Build a family of related sprites by editing a **completed parent**, not by re-prompting:

```
create_1_direction_object({ description: "<the first/base sprite>", size: 48 })  → parentId
create_object_state({ object_id: parentId, edit_description: "make it a green shell instead" })
create_object_state({ object_id: parentId, edit_description: "make it a lightning bolt instead" })
```

All variants share palette/outline/identity via an automatic `group_id`. This is the
proven pattern for the mau-mau card faces (parent `06f843eb-abc3-4b2e-a7ee-c2974acbebb1` —
`create_object_state` ONLY, never a fresh `create_*`) and the claimer directional sprites.
For style-matching across a totally new object, pass `style_images` to `create_1_direction_object`
(largest style image's size sets output size — don't also pass `size`).

---

## Writing prompts (the single biggest quality lever)

PixelLab interprets a long, exact description far better than a terse one. Always specify:
**subject + view + palette + lighting/shading + material/texture + silhouette + EXCLUSIONS.**

✅ Good: *"Single top-down pixel-art banana-peel power-up icon, 48×48, lineless flat shading,
transparent background. Glossy yellow curved peel lying flat as if dropped on a track, small
brown bruise tip, soft inner neon-yellow rim glow, dark drop-shadow blob beneath. Centered,
no text, no border, no frame."*

❌ Bad: *"a banana item"* — model guesses size, view, palette, adds a background/border.

- `outline: "lineless"` almost always (user hates borders).
- For opaque scenes add *"edge to edge, full bleed, no border, no frame, no padding"* or you get a
  white-canvas vignette. For "no characters" say so explicitly — models populate scenes by default.
- `detail: "medium detail"`, `shading: "medium shading"` are good defaults. Use `seed` for reproducibility.

---

## Cost model (dual bucket — the old "16 credits/call" rule is WRONG)

`get_balance` shows **two separate buckets**:

- **Subscription generations** — the primary bucket (Tier 1 = **2000 per billing period**).
  Each call decrements this first.
- **USD credits** — a *fallback only*, used when generations are exhausted.

Cost is **per call, by endpoint + size — NOT per image.** One v2 call can return a grid of up to
64 images for the *same* generation cost. So:

- Standard object/character = **1 generation**. v3 character = **2–9**.
- `create_1_direction_object` / `create_8_direction_object` use Pro Tools = **~20–40 generations** per call by size.
- **The only real cost cliff is Pro-mode animation: 20–40 generations PER DIRECTION** (a full
  8-dir Pro animation = 160–320 = ~6–12 of those empties the monthly allowance). **Prefer
  `mode: "v3"`** (the cheap default, often higher quality). For Pro `animate_*`, call **without**
  `confirm_cost` first to get the quote, surface it, then re-call with `confirm_cost: true`.
- `enhance_prompt` silently adds 0.05 generations.

Check `get_balance` before a big batch; budget by *calls*, not by samples.

---

## File-saving rules

1. **Never** use the Write tool for image data (corrupts binary → zero-filled file).
2. Download via `curl -L "<rotations.<dir>>" -o <path>` (no auth header). The `download:` URL is a
   **zip archive** of all frames — use it only when you want every rotation/frame at once.
3. **Always** `file <path>` — must report `PNG image data, …, RGBA`. If it says `data`/`JPEG`/`RIFF`,
   it's broken; regenerate, don't patch in place.
4. Optimize after: `pngquant --force --quality=60-85 --ext .png <path>` (60–85% is indistinguishable
   for pixel art; a 256×384 bg drops ~130KB → ~50KB).
5. Replacing an existing asset? **Bump the filename suffix** and update the loader key (nginx cache).

---

## Animation & animated thumbnails

- **In-engine motion:** `animate_object({ object_id, animation_description, mode: "v3" })` (1 gen/dir,
  `frame_count` 4–16, default 8 → stores 9 incl. a ref frame). Poll `get_object`; completed response
  lists `animations:` with downloadable frame URLs (Backblaze, same as rotations).
- **Animated thumbnails / menu loops:** download the frames, then assemble locally with
  `scripts/pixellab.mjs webp --in-dir <frames> --out <x>.webp --duration 120`. **The MCP/REST cannot
  assemble a WebP — this is the one irreplaceable local step.** See [[feedback-pixellab-animate-webp]].
- **Pixel-exact thumbnails** (compose the game's REAL sprites with overlay sparkle/pulse, then WebP):
  prefer this when identity must be preserved — generative `animate-with-text-v3` reinterprets the
  concept and will NOT keep your exact pixels. (The reason is pixel-identity, not cost.) Full PIL recipe in
  [[feedback-pixellab-animate-webp]] / the api-v2-extra reference.

---

## `scripts/pixellab.mjs` — fallback + WebP assembler (NOT broken)

The audit confirmed its commands are valid REST calls; it is **superseded for static work**, not
broken. Keep it. Reads `PIXELLAB_API_KEY` from `.env` (already set).

| Command                        | Status                                                                 |
| ------------------------------ | ---------------------------------------------------------------------- |
| `webp`                         | **LOAD-BEARING** — local `img2webp` (libwebp); no MCP/REST equivalent. |
| `sprite` / `background` / `style` | Valid `generate-image-v2`/`generate-with-style-v2` fallback. Default to MCP `create_1_direction_object` / `create_object_state` instead (dashboard + style-lock). |
| `animate`                      | Generative (breaks pixel identity) — prefer MCP `animate_object` v3.   |
| `balance`                      | Redundant with MCP `get_balance`.                                      |

Hard host prerequisite for `webp`: `img2webp` from libwebp (`brew install webp`). One genuine use
where the script wins: a **wide panoramic banner** (e.g. a skybox strip) — MCP object tools pad
toward square, so `pixellab.mjs sprite` with an explicit wide `--size` is the right tool there.
⚠️ But `generate-image-v2` caps aspect at ~688×384 (16:9) — extreme strips (e.g. 1024×192) exceed it;
generate a seamless tile within the cap and let the engine `TileSprite` repeat it.

---

## Tilesets — Wang (top-down) PREFERRED for terrain

`create_topdown_tileset` → 16 Wang tiles (23 if `transition_size: 1.0`), 32×32, `outline: "lineless"`.
`lower_description` = ground, `upper_description` = elevated, `transition_description` = edge blend.
~100s. Chain seamless multi-terrain via the returned base tile IDs.

**Download:** `curl -L --fail` (302 redirect → 0 bytes without `-L`).

**Wang index + Phaser integration** (vertex-terrain algorithm, frame lookup, RenderTexture layering)
— unchanged and correct; see the detailed recipe in the **api-v2-extra** reference and below.

```
Wang index = NW×8 + NE×4 + SW×2 + SE×1   (upper=1, lower=0)
Frame      = (bbox.y/32)*4 + (bbox.x/32)
Vertex(vr,vc) = 0 if ANY surrounding cell is target terrain, else 1
```

- **Sidescroller platform tiles:** `create_sidescroller_tileset` — see [sidescroller-tilesets.md](references/sidescroller-tilesets.md).
- **Tiles Pro / isometric:** `create_tiles_pro` (number each variant: `"1). grass 2). dirt …"`,
  `n` must match) / `create_isometric_tile` (`tile_shape` thin/thick/block). Small pickups look
  BAD as tiles — use Graphics primitives for tiny in-game objects; reserve tiles for 32×32+ decor.
- **Corner-tile orientation** is often mislabeled — verify at 10× zoom, or just use Wang.

---

## Characters & enemies

- **Humanoid / quadruped:** `create_character` (`body_type`, `mode: standard|v3|pro`, `n_directions` 4|8).
  Standard = 1 gen; v3 = 2–9 (always 8-dir, top quality); pro = 20–40. Canvas is ~40% larger than the
  requested size (leaves animation room) — slice sheets accordingly.
- **Variants** (armor color, sitting, damaged): `create_character_state` (consistent across all rotations).
- **Animate:** `animate_character` — `template_animation_id` (walk/run/idle… 1 gen/dir) or
  `action_description` (custom, v3). South = default facing; West = East with `setFlipX(true)`.
- **Blobs / slimes / non-humanoid:** NOT `create_character` (forces legs). Use `create_1_direction_object`
  / `create_map_object` per pose, describe "no legs, no arms, blob body".

---

## Gotchas

- **Base64 image inputs** use `{ "type": "base64", "base64": "<png-bytes-b64>", "format": "png" }` —
  base64-encoded **PNG**, not raw RGBA, not a data URL.
- **Size limits vary per endpoint:** generic min 16×16; animation/rotation max 256×256;
  generate-image-v2/style/ui square ≤512 (16:9 ≤688×384); animate-with-text v1 locked to 64×64;
  tiles-pro 16–128. Let the API's 400 error tell you the real max for your aspect ratio.
- **One v2 image call returns a GRID** (up to 64 tiny images), not a single file — parse accordingly.
- **`no_background`** defaults FALSE on legacy `create-image-*`, TRUE on the v2 Pro endpoints.
- **Raw-RGBA vs PNG:** some REST responses are base64 raw-RGBA, not PNG; `pixellab.mjs` auto-wraps
  these. MCP rotation URLs are always real PNGs (verified). Always `file`-check.
- **Destructive deletes** (`delete_object`/`_character`/`_animation`) need a `confirm=false`-then-`true`
  two-step; tileset/tile deletes take just the id.
- `create_map_object` auto-deletes after 8h — download immediately.

---

## General

- `get_balance` is the live source of truth for budget (not the REST `balance` command).
- Backblaze rotation/B2 URLs are permanent and public — safe to reference while iterating.
- Always check status with `get_*` before downloading; jobs are auto-cleaned after completion (404).
