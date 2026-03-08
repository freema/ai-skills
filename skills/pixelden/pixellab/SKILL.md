# PixelLab MCP Skills

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

### Gotcha: Corner tile orientation
- PixelLab corner tiles often have WRONG orientation vs their name
- "corner south to east" may actually show path going west→south
- **Always verify visually** at 10× zoom before using
- Prefer Wang tileset over manual corner tiles — avoids this problem entirely

---

## Characters & Enemies

### Directional sprites
- `create_character` for base + `animate_character` for frames
- South = default facing, East = side view, North = back view
- West = East sprite with `setFlipX(true)` in Phaser
- Walk frames: 4 frames per direction at ~200ms interval

---

## Map Objects

### `create_map_object`
- Generates objects with transparent background
- Can style-match against existing map (provide background_image)
- Good for: barrels, torches, chests, decorations
- Supports inpainting (oval/rectangle/custom mask)

---

## General Tips
- Always check generation status with `get_*` before downloading
- Use `seed` parameter for reproducible results
- B2 storage URLs are permanent — can reference directly
- `detail: "medium detail"` is usually best balance
- `shading: "medium shading"` for most game tiles
