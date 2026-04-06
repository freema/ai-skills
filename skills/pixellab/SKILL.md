# PixelLab MCP Skills

## Reference Files

Read these BEFORE working on the relevant feature:

| When working on... | Read first |
|--------------------|------------|
| Sidescroller platform tiles (2D platformer) | [sidescroller-tilesets.md](references/sidescroller-tilesets.md) |
| Top-down Wang tilesets (strategy/RPG maps) | See Wang section below |

---

## Sidescroller Tileset (2D Platformers)

### When to use
- Side-view platform tiles for platformer/runner games
- Ground, floating platforms, crumbling platforms
- **Read [sidescroller-tilesets.md](references/sidescroller-tilesets.md) for full reference**

### Quick summary
- `create_sidescroller_tileset` → 16 Wang tiles, 32×32, transparent bg
- `lower_description` = material, `transition_description` = surface decoration
- `transition_size`: 0.25 (light) or 0.5 (heavy surface)
- Chain with `base_tile_id` + high `tileset_adherence` (300–400) for matching sets
- Always `outline: "lineless"`

---

## Wang Tileset (Top-Down Maps) — PREFERRED for terrain

### When to use
- Path/road vs terrain transitions (dirt↔stone, grass↔water, etc.)
- Any two-terrain autotiling system
- Replaces ALL manual corner/T-junction/straight tile work

### Workflow
1. **Generate**: `create_topdown_tileset`
   - `lower_description` = ground terrain (e.g. "dark brown dirt path")
   - `upper_description` = elevated terrain (e.g. "dark grey stone floor")
   - `transition_description` = edge blend (e.g. "crumbling edge")
   - `tile_size: {width: 32, height: 32}`
   - `outline: "lineless"` (user preference!)
   - `transition_size: 0.25` (small transition) or `0.5` (larger)
   - `view: "high top-down"` for flat tiles
   - Takes ~100 seconds

2. **Download**: PNG (4×4 spritesheet, 128×128) + metadata JSON
   ```bash
   curl --fail -o wang-tileset.png "https://api.pixellab.ai/mcp/tilesets/{id}/image"
   curl --fail -o wang-tileset.json "https://api.pixellab.ai/mcp/tilesets/{id}/metadata"
   ```

3. **Build frame lookup** from JSON:
   - Each tile has `corners: {NW, NE, SW, SE}` = "upper" | "lower"
   - Wang index = NW×8 + NE×4 + SW×2 + SE×1 (upper=1, lower=0)
   - Frame = (bounding_box.y/32)*4 + (bounding_box.x/32)
   - Build array: `WANG_FRAME[wangIdx] = frame`

4. **Render in Phaser**:
   ```typescript
   // boot.ts
   this.load.spritesheet("wang-tileset", url, { frameWidth: 32, frameHeight: 32 });

   // game.ts — vertex terrain algorithm
   // Vertex (vr,vc) sits between cells (vr-1,vc-1), (vr-1,vc), (vr,vc-1), (vr,vc)
   // Vertex = 0 (lower) if ANY surrounding cell is target terrain, else 1 (upper)
   const vertex = (vr, vc) => {
     return (isPath(vr-1,vc-1) || isPath(vr-1,vc) || isPath(vr,vc-1) || isPath(vr,vc)) ? 0 : 1;
   };

   // For each grid cell:
   const nw = vertex(r, c);
   const ne = vertex(r, c + 1);
   const sw = vertex(r + 1, c);
   const se = vertex(r + 1, c + 1);
   const wangIdx = nw * 8 + ne * 4 + sw * 2 + se;
   this.add.image(x, y, "wang-tileset", WANG_FRAME[wangIdx]);
   ```

### Chaining tilesets
- Response includes `base_tile_ids.upper` and `.lower`
- Use upper ID as `lower_base_tile_id` in next tileset for seamless multi-terrain:
  - Tileset 1: dirt → stone (get stone base ID)
  - Tileset 2: stone → grass (use stone ID as lower_base_tile_id)
- **Note**: Chaining via `lower_base_tile_id` param may error — generate independently with matching descriptions instead

### Multi-tileset layering (terrain variety)
- All PixelLab Wang tilesets use **identical tile layout** → same `WANG_FRAME` lookup for all
- **Layer 1 (base)**: render full grid (e.g., void → snow for arena border)
- **Layer 2+ (overlay)**: generate random blob shapes, render with second tileset, **skip `wangIdx === 0`** (all-lower = base shows through)
- Use `RenderTexture` to composite all layers into one texture (performance)
- Describe overlay tileset lower terrain to MATCH base tileset upper terrain for seamless blending

### Download gotcha
- Wang tileset PNG download: always `curl -L --fail` (API returns 302 redirect, without `-L` you get 0 bytes)

---

## Tiles Pro (Individual Tiles)

### When to use
- UI elements, decorations, standalone objects
- When you need specific tile variants (NOT terrain transitions)

### Key settings
- `tile_type: "square_topdown"`, `tile_view: "top-down"`, `tile_size: 32`
- **Always `outline: "lineless"`** — user hates borders
- Number each tile in description: `"1). tile A 2). tile B 3). tile C"`
- `n_tiles` must match description count

### Gotcha: Small pickups/projectiles look BAD as tiles
- 16×16 tile squares look blocky when used as tiny in-game pickups (xp gems, health orbs) or projectiles
- **Programmatic shapes** (circles, triangles via Graphics API) look BETTER for small game objects
- Only use Tiles Pro for objects that are displayed at actual tile size (32×32+) like decorations, UI elements

### Gotcha: Corner tile orientation
- PixelLab corner tiles often have WRONG orientation vs their name
- "corner south to east" may actually show path going west→south
- **Always verify visually** at 10× zoom before using
- Prefer Wang tileset over manual corner tiles — avoids this problem entirely

---

## Characters & Enemies

### Humanoid/Quadruped — use `create_character`
- `body_type: "humanoid"` — bipedal (people, robots, knights)
- `body_type: "quadruped"` + `template` — 4-legged (bear, cat, dog, horse, lion)
- South = default facing, East = side view, North = back view
- West = East sprite with `setFlipX(true)` in Phaser
- `animate_character` for walk/run/attack frames

### Non-humanoid creatures (blobs, slimes, mushrooms) — use `create_map_object`
- **NEVER use `create_character` for blobs/slimes** — humanoid template forces legs!
- Generate each direction as separate map object (south, east, north)
- Generate walk frames as separate map objects with pose variations (squished, stretched, tilted)
- Describe explicitly: "no legs, no arms, no human features, blob body"
- Walk animation = 4 map objects with different squish/stretch states

---

## Map Objects

### `create_map_object`
- Generates objects with transparent background
- Can style-match against existing map (provide background_image)
- Good for: barrels, torches, chests, decorations
- Supports inpainting (oval/rectangle/custom mask)

---

## PixelLab API v2 — Direct Endpoints (NOT in MCP)

For tools not available through MCP, call the REST API directly via `curl`.
API key: `PIXELLAB_API_KEY` from `.env`

**Full reference:** [api-v2-extra.md](references/api-v2-extra.md)

### When to use API v2 instead of MCP

| Need | Use |
|------|-----|
| Animate existing sprite (walk/attack/idle) | **API: `animate-with-text-v3`** (sync, 4-16 frames) |
| UI elements (buttons, bars, frames) | **API: `generate-ui-v2`** (async) |
| General pixel art from text | **API: `generate-image-v2`** (async, multi-result) |
| Match style of existing assets | **API: `generate-with-style-v2`** (async) |
| Edit/modify existing sprite | **API: `edit-images-v2`** (async) |
| Remove background from sprite | **API: `remove-background`** (sync) |
| Convert photo to pixel art | **API: `image-to-pixelart`** (sync) |
| Region-based editing with mask | **API: `inpaint-v3`** (async) |
| Smart resize pixel art | **API: `resize`** (sync) |
| Rotate sprite direction | **API: `rotate`** (sync) |
| Characters with animations | MCP: `create_character` + `animate_character` |
| Wang tilesets | MCP: `create_topdown_tileset` |
| Platformer tilesets | MCP: `create_sidescroller_tileset` |
| Map objects (barrels, chests) | MCP: `create_map_object` |

### Quick animate-with-text example (most useful for games)

```bash
source .env
FRAME=$(base64 -i public/assets/games/mygame/character-south.png)

curl -s -X POST https://api.pixellab.ai/v2/animate-with-text-v3 \
  -H "Authorization: Bearer $PIXELLAB_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"first_frame\": {\"base64\":\"$FRAME\", \"format\":\"png\"},
    \"action\": \"walking forward\",
    \"frame_count\": 8,
    \"no_background\": true
  }" | python3 -c "
import sys, json, base64
data = json.load(sys.stdin)
for i, img in enumerate(data['images']):
    with open(f'frame_{i}.png', 'wb') as f:
        f.write(base64.b64decode(img['base64']))
print(f'Saved {len(data[\"images\"])} frames')
"
```

---

## General Tips
- Always check generation status with `get_*` before downloading
- Use `seed` parameter for reproducible results
- B2 storage URLs are permanent — can reference directly
- `detail: "medium detail"` is usually best balance
- `shading: "medium shading"` for most game tiles
