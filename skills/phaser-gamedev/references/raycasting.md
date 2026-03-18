# Raycasting Engine in Phaser (Wolf3D-style)

Build a 2.5D first-person raycasting engine inside Phaser using `CanvasTexture` for per-pixel rendering.

## Contents

- CanvasTexture rendering approach
- DDA raycasting algorithm
- Wall rendering with distance fog
- Door system (center-plane intersection)
- Door types: slide, split, transparent gate
- Transparent doors (see-through with painter's algorithm)
- Doorjamb face detection
- Wall-sliding collision
- Pointer lock (mouse look)
- HUD + minimap in canvas
- Weapon sprite rendering

---

## Architecture Overview

Phaser doesn't have a built-in raycasting renderer. The approach:

1. Create a low-res `CanvasTexture` (e.g. 320x240)
2. Get its 2D context (`ctx`)
3. Every frame: clear → raycast → draw columns → draw HUD → call `refresh()`
4. Display as a single `Phaser.GameObjects.Image` upscaled to game size via `setDisplaySize()`

```typescript
// config.ts — MUST use Phaser.CANVAS (not AUTO/WEBGL)
type: Phaser.CANVAS

// create()
const canvasTex = this.textures.createCanvas("view", RENDER_W, RENDER_H);
this.ctx = canvasTex!.getContext();
this.view = this.add.image(GW / 2, GH / 2, "view");
this.view.setDisplaySize(GW, GH);

// update()
this.renderRaycast();   // draw to ctx
this.renderHUD();       // draw to ctx
(this.textures.get("view") as Phaser.Textures.CanvasTexture).refresh();
```

**Why CANVAS mode**: `CanvasTexture.getContext()` returns a real `CanvasRenderingContext2D`. In WebGL mode, Phaser uses a different rendering path and `getContext()` may not work as expected.

**Why low resolution**: Raycasting renders per-column (320 columns = 320 rays). Upscaling via Phaser's `setDisplaySize()` with `pixelArt: true` gives the chunky retro look for free.

---

## DDA Raycasting Algorithm

Digital Differential Analyzer — casts one ray per screen column through a 2D grid map.

### Core loop

```typescript
for (let col = 0; col < RENDER_W; col++) {
  // Camera plane position (-1 to +1)
  const cameraX = (2 * col) / RENDER_W - 1;
  const rayAngle = playerAngle + Math.atan(cameraX * Math.tan(FOV / 2));
  const rayDirX = Math.cos(rayAngle);
  const rayDirY = Math.sin(rayAngle);

  let mapX = Math.floor(px);
  let mapY = Math.floor(py);

  // Distance ray must travel to cross one full cell in X or Y
  const deltaDistX = Math.abs(1 / rayDirX);
  const deltaDistY = Math.abs(1 / rayDirY);

  // Step direction and initial side distances
  let stepX: number, sideDistX: number;
  if (rayDirX < 0) { stepX = -1; sideDistX = (px - mapX) * deltaDistX; }
  else             { stepX = 1;  sideDistX = (mapX + 1 - px) * deltaDistX; }

  let stepY: number, sideDistY: number;
  if (rayDirY < 0) { stepY = -1; sideDistY = (py - mapY) * deltaDistY; }
  else             { stepY = 1;  sideDistY = (mapY + 1 - py) * deltaDistY; }

  let hit = 0, side = 0;
  while (hit === 0) {
    // Step to next cell boundary
    if (sideDistX < sideDistY) {
      sideDistX += deltaDistX; mapX += stepX; side = 0;
    } else {
      sideDistY += deltaDistY; mapY += stepY; side = 1;
    }
    if (outOfBounds(mapX, mapY)) { hit = 1; break; }

    const tile = MAP[mapY][mapX];
    if (tile > 0) { hit = tile; break; }
  }

  // PERPENDICULAR distance (not Euclidean — avoids fisheye!)
  let perpDist: number;
  if (side === 0) perpDist = (mapX - px + (1 - stepX) / 2) / rayDirX;
  else            perpDist = (mapY - py + (1 - stepY) / 2) / rayDirY;

  const lineHeight = Math.floor(RENDER_H / perpDist);
  const drawStart = Math.max(0, Math.floor((RENDER_H - lineHeight) / 2));
  const drawEnd = Math.min(RENDER_H, Math.floor((RENDER_H + lineHeight) / 2));
}
```

### Key concepts

- **`side`**: 0 = ray crossed a vertical (NS) boundary, 1 = horizontal (EW). Used for wall shading — EW walls are darker.
- **Perpendicular distance**: Must use `(mapX - px + ...) / rayDirX`, NOT `sqrt(dx² + dy²)`. Euclidean distance causes fisheye distortion.
- **`stepX/stepY`**: Direction of ray travel (+1 or -1). Combined with `side`, tells you which face of the wall was hit.

---

## Wall Rendering with Distance Fog

```typescript
const fogFactor = Math.min(1, perpDist / 12);

// Different shading for NS vs EW faces
const colors = WALL_COLORS[hit];
ctx.fillStyle = applyFog(side === 0 ? colors.ns : colors.ew, fogFactor);
ctx.fillRect(col, drawStart, 1, sliceH);

function applyFog(hex: string, fog: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const m = 1 - fog * 0.8; // 0.8 = max darkness (never fully black)
  return `rgb(${Math.floor(r * m)},${Math.floor(g * m)},${Math.floor(b * m)})`;
}
```

---

## Door System — Center-Plane Intersection

Doors sit at the CENTER of their cell (0.5 offset from boundary), not at the cell edge like walls.

### Map rule: wall-door-wall

Every door MUST have walls on two opposite sides. The door slides INTO the adjacent wall.

```
1 1 1 1 1
1 0 0 0 1
1 0 0 0 1
1 1 9 1 1   ← door (9) between walls (1)
1 0 0 0 1
1 1 1 1 1
```

### DDA door intersection

When the ray enters a door cell, compute intersection with the center plane:

```typescript
if (isDoorTile(tile)) {
  const door = getDoor(mapY, mapX);

  // Center plane distance = half a cell further than the boundary hit
  let centerDist: number;
  if (side === 0) centerDist = sideDistX - deltaDistX * 0.5;
  else            centerDist = sideDistY - deltaDistY * 0.5;

  // Check: does the ray exit the cell before reaching the center?
  if (side === 0 && sideDistY < centerDist) continue; // missed
  if (side === 1 && sideDistX < centerDist) continue; // missed

  // Where along the door surface (0 to 1)
  let doorX: number;
  if (side === 0) doorX = py + centerDist * rayDirY;
  else            doorX = px + centerDist * rayDirX;
  doorX -= Math.floor(doorX);

  // ... check door type for open/closed logic ...

  perpDist = centerDist; // use center-plane distance
}
```

### Why `sideDistY < centerDist` check?

If the ray entered via an X-boundary (side=0) but would exit via a Y-boundary before reaching the center plane, it means the ray grazes the corner of the door cell without actually hitting the door. In that case, skip this cell (`continue`).

---

## Door Opening Types

### DOOR_SLIDE — Wolf3D horizontal slide

Door slides sideways into the adjacent wall. Check if `doorX < openAmount` — if so, the ray passes through the open gap.

```typescript
if (doorX < door.openAmount) continue; // ray passes through gap
doorTexX = doorX - door.openAmount;    // texture slides with door
```

### DOOR_SPLIT — Star Trek two-halves

Two halves slide apart from center. The gap grows from the middle outward.

```typescript
const halfOpen = door.openAmount * 0.5;
if (doorX > 0.5 - halfOpen && doorX < 0.5 + halfOpen) {
  continue; // ray passes through center gap
}
doorTexX = doorX;
```

### DOOR_GATE — Transparent portcullis (see-through, rises into ceiling)

This is fundamentally different from other doors. The ray ALWAYS passes through (recording the hit for later overlay). See **Transparent Doors** section below.

---

## Transparent Doors (See-Through Gate)

A portcullis/iron gate where you can see the corridor behind it through the bars.

### The problem

Normal raycasting stops at the first hit. For transparent doors, we need to:
1. Record the gate hit
2. Continue the ray to find what's BEHIND the gate
3. Render the background wall first
4. Overlay the gate bars on top (gaps show the background)

### Implementation: Painter's algorithm

```typescript
// Extra variables for gate overlay
let gateHit = false;
let gatePerpDist = 0;
let gateTexX = 0;
let gateOpenAmt = 0;

// In the DDA loop, when hitting a gate tile:
if (tile === DOOR_GATE) {
  if (door.openAmount < 1) {
    gateHit = true;
    gatePerpDist = centerDist;
    gateTexX = doorX;
    gateOpenAmt = door.openAmount;
  }
  continue; // ray ALWAYS passes through — find the wall behind
}

// After the DDA loop:

// 1) Render background (the wall/door the ray ultimately hit)
renderWallColumn(col, ...);

// 2) Overlay gate bars on top
if (gateHit) {
  const gLineH = Math.floor(RENDER_H / gatePerpDist);
  const gStart = Math.max(0, Math.floor((RENDER_H - gLineH) / 2));
  const gSliceH = /* ... */;
  const gFog = Math.min(1, gatePerpDist / 12);

  // Rising animation — gate rises into ceiling, bottom disappears
  const visibleH = Math.floor(gSliceH * (1 - gateOpenAmt));
  if (visibleH > 0) {
    renderGateColumn(ctx, col, gStart, visibleH, gateTexX, gFog);
  }
}
```

### Gate bar rendering (column-level transparency)

For programmatic bars: check if the current texX coordinate falls on a vertical bar. If yes, draw solid. If no (gap between bars), skip — the background shows through.

```typescript
private renderGateColumn(ctx, col, drawStart, sliceH, texX, fog) {
  // Frame edges — solid
  if (texX < 0.03 || texX > 0.97) {
    ctx.fillStyle = applyFog("#6a6a6a", fog);
    ctx.fillRect(col, drawStart, 1, sliceH);
    return;
  }

  // Vertical bars: 7 across the gate
  const barPhase = (texX * 7) % 1;
  const isBar = barPhase < 0.18 || barPhase > 0.82;

  if (isBar) {
    ctx.fillStyle = applyFog("#8a8a8a", fog);
    ctx.fillRect(col, drawStart, 1, sliceH);
  }

  // Horizontal crossbars on ALL columns (bars + gaps = grid pattern)
  if (sliceH > 4) {
    ctx.fillStyle = applyFog("#7a7a7a", fog);
    ctx.fillRect(col, drawStart, 1, 2);
    ctx.fillRect(col, drawStart + sliceH - 2, 1, 2);
    if (sliceH > 12) {
      ctx.fillRect(col, drawStart + Math.floor(sliceH * 0.33), 1, 2);
      ctx.fillRect(col, drawStart + Math.floor(sliceH * 0.67), 1, 2);
    }
  }
}
```

### Rising animation

The gate rises INTO the ceiling. Visually: the visible portion shrinks from the bottom upward.

- `visibleH = totalH * (1 - openAmount)` — how much of the gate is still visible
- Draw from `drawStart` to `drawStart + visibleH` — the top portion
- Below that, the background wall is already visible (drawn in step 1)

---

## Doorjamb — Face-Specific Detection

The wall faces directly adjacent to a door should have a different color/texture (doorjamb/futra). The key insight: only the specific FACE of the wall that faces the door gets the jamb treatment, not the entire wall block.

### Which face was hit?

```
side=0, stepX=1  → ray going right, hit WEST face  → neighbor at (c-1, r)
side=0, stepX=-1 → ray going left,  hit EAST face  → neighbor at (c+1, r)
side=1, stepY=1  → ray going down,  hit NORTH face → neighbor at (c, r-1)
side=1, stepY=-1 → ray going up,    hit SOUTH face → neighbor at (c, r+1)
```

### Check if the face's neighbor is a door

```typescript
private isDoorjambFace(c: number, r: number, side: number, stepX: number, stepY: number): boolean {
  let nc: number, nr: number;
  if (side === 0) { nc = stepX === 1 ? c - 1 : c + 1; nr = r; }
  else            { nc = c; nr = stepY === 1 ? r - 1 : r + 1; }
  if (outOfBounds(nc, nr)) return false;
  return isDoorTile(MAP[nr][nc]);
}
```

**Why face-specific?** If you check ALL neighbors (any direction), a wall block adjacent to a door gets jamb color on ALL faces — even the face visible from a corridor that has nothing to do with the door. The player sees a weirdly colored wall for no reason.

---

## Wall-Sliding Collision

Check X and Y movement independently with a margin. This lets the player slide along walls smoothly.

```typescript
const margin = 0.2;
const nx = px + dx;
const ny = py + dy;

// Check X movement separately
if (isPassable(Math.floor(nx + margin * Math.sign(dx)), Math.floor(py))) {
  px = nx;
}
// Check Y movement separately
if (isPassable(Math.floor(px), Math.floor(ny + margin * Math.sign(dy)))) {
  py = ny;
}
```

For doors: `isPassable()` should check door state. A door cell is passable only when `openAmount >= 1`.

---

## Pointer Lock (Mouse Look)

```typescript
// Request lock on click
this.input.on("pointerdown", () => {
  if (!this.pointerLocked) this.input.mouse!.requestPointerLock();
});
this.input.on("pointerlockchange", (_event: unknown, locked: boolean) => {
  this.pointerLocked = locked;
});

// In update — use movementX for rotation
if (this.pointerLocked) {
  const pointer = this.input.activePointer;
  this.pAngle += (pointer as any).movementX * MOUSE_SENSITIVITY;
}
```

**Note**: `pointer.movementX` isn't typed in Phaser's types — cast to `any` or use `as unknown as { movementX: number }`.

---

## HUD Rendering in Canvas

The HUD is drawn directly into the same CanvasTexture, below the 3D viewport.

```typescript
const RENDER_H = 200; // 3D viewport
const HUD_H = 40;     // HUD bar
const FULL_H = RENDER_H + HUD_H; // total canvas height

// Create canvas at full height
this.textures.createCanvas("view", RENDER_W, FULL_H);

// In renderHUD():
ctx.fillRect(0, RENDER_H, RENDER_W, HUD_H); // HUD background
// Draw HP/MP bars, face, score at y = RENDER_H + offset
```

---

## Minimap

Draw a small overhead map showing walls, doors, player position, and FOV cone.

```typescript
private renderMinimap() {
  const s = MINIMAP_SCALE; // pixels per cell (e.g. 6)
  const ox = RENDER_W - MAP_W * s - MINIMAP_PADDING;
  const oy = MINIMAP_PADDING;

  // Background
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(ox - 1, oy - 1, MAP_W * s + 2, MAP_H * s + 2);

  // Tiles
  for (let r = 0; r < MAP_H; r++) {
    for (let c = 0; c < MAP_W; c++) {
      const tile = MAP[r][c];
      if (isDoorTile(tile)) {
        const door = getDoor(r, c);
        ctx.fillStyle = door?.openAmount >= 1 ? "#222" : DOOR_MAP_COLORS[tile];
      } else if (tile > 0) {
        ctx.fillStyle = WALL_COLORS[tile].ns;
      } else {
        ctx.fillStyle = "#222";
      }
      ctx.fillRect(ox + c * s, oy + r * s, s, s);
    }
  }

  // Player dot + direction line + FOV cone
  const psx = ox + px * s, psy = oy + py * s;
  ctx.fillStyle = "#0f0";
  ctx.beginPath(); ctx.arc(psx, psy, 2, 0, Math.PI * 2); ctx.fill();
  // ... direction line and FOV cone lines ...
}
```

---

## Programmatic Weapon Sprite

Draw the weapon using canvas 2D drawing primitives. Use `ctx.save/translate/rotate/restore` for attack animation frames.

```typescript
private drawSword(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  // Draw handle, crossguard, blade using fillRect
  ctx.restore();
}
```

Attack animation: cycle through 4 positions (wind-up, swing, impact, recovery) based on a timer. Add an arc trail effect on the impact frame.

---

## Summary: Data Architecture

```typescript
// data.ts — all constants in one file
export const RENDER_W = 320;
export const RENDER_H = 200;
export const HUD_H = 40;
export const FOV = Math.PI / 3;

// Door types (map tile values)
export const DOOR_SLIDE = 9;  // slides sideways
export const DOOR_GATE  = 8;  // transparent, rises up
export const DOOR_SPLIT = 7;  // two halves apart
export const DOOR_TILES = [DOOR_SLIDE, DOOR_GATE, DOOR_SPLIT];

// Map: 0 = empty, 1-5 = wall types, 7-9 = door types
export const MAP: number[][] = [ /* ... */ ];

// Colors per wall type (NS and EW for directional shading)
export const WALL_COLORS: Record<number, { ns: string; ew: string }> = { ... };
export const DOOR_BODY = { ns: "#7B5236", ew: "#6B4226" };
export const JAMB_COLOR = { ns: "#8a7a60", ew: "#706050" };
```
