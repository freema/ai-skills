# Procedural Dungeon Generation (BSP + Wolf3D Grid)

Patterns for generating Wolf3D-style grid dungeon levels using Binary Space Partitioning.

---

## BSP Pipeline Overview

```
1. Fill grid with primary wall type
2. BSP split → recursive tree of rectangular leaves
3. Carve rooms inside leaves (floor = 0)
4. Paint wall rings around rooms (themed wall types)
5. Connect sibling rooms (direct doors or corridors)
6. Scan for door positions
7. Apply progression (exit, locked doors, keys, secrets)
8. Validate (flood fill reachability)
9. Populate entities (enemies, items, props, torches)
```

---

## Critical Rules

### 1. Wall Types — One Style Per Room, Not Random Per Cell

**WRONG:** `grid[r][c] = rng.pick(wallThemes)` — creates psychedelic noise.

**RIGHT:** Each room gets ONE wall type from the theme palette. The wall ring around the room is painted consistently with that type.

```typescript
// Fill grid with primary wall type first
grid[r] = new Array(mapW).fill(primaryWall);

// Then per room: carve floor, paint ring
for (let i = 0; i < rooms.length; i++) {
  const wallType = wallThemes[i % wallThemes.length];
  // Carve interior as floor
  // Paint ring as wallType (don't overwrite existing floor)
}
```

### 2. Corridor Carving — NEVER Overwrite Wall Types

**BUG:** Corridor carving paints walls alongside the carved floor to ensure 3-wide tunnel. This overwrites room wall rings with the corridor's wall type → mismatched wall colors next to doors.

**FIX:** Corridor carving should ONLY set floor cells (0). The grid starts filled with walls, so walls already exist around any carved path. Never `grid[y-1][x] = wallType` during carving.

```typescript
// WRONG — overwrites room wall rings:
grid[y][x] = 0;
if (grid[y - 1][x] !== 0) grid[y - 1][x] = wallType; // ← DESTROYS room style

// RIGHT — just carve floor, walls are already there:
grid[y][x] = 0;
```

### 3. Room Interior Snapshot — Take BEFORE Corridor Carving

Door placement needs to know which cells are room interior vs corridor. Since corridors carve through walls (destroying the boundary), snapshot the room grid BEFORE carving begins.

```typescript
const roomGrid = new Uint8Array(mapH * mapW);
for (const room of rooms) {
  for (r/c in room interior) roomGrid[r * mapW + c] = 1;
}
// THEN carve corridors
// THEN scan for doors using roomGrid
```

### 4. Wall Ring Painting Order

1. Carve ALL room interiors first (set to floor)
2. THEN paint wall rings (skip cells that are already floor — don't overwrite neighbor rooms)

If you paint ring before carving all rooms, one room's ring overwrites a neighbor's floor.

---

## Three-Tier Room Connection

BSP siblings should be connected with minimal corridor length:

### Tier 1: Direct Door (gap ≤ 2 cells, rooms overlap on one axis)

- Punch floor through the wall cells between rooms
- Door scanner finds the gap cell (wall-door-wall satisfied by room walls)
- Zero corridor length

### Tier 2: Edge-to-Edge Corridor

- Find nearest edges of both rooms (not centers!)
- Carve L-shaped path between nearest edge midpoints
- Much shorter than center-to-center corridors

### Tier 3: Center-to-Center (avoid)

- Only as last resort — creates unnecessarily long corridors
- The original BSP tutorials use this but it's suboptimal

### BSP ROOM_MARGIN affects connection type

- `ROOM_MARGIN = 1` → rooms can nearly touch → more Tier 1 direct connections
- `ROOM_MARGIN = 2+` → guaranteed gap → more corridors

---

## Door Placement (Post-Carving Scan)

Doors go at **room entrances only**, never inside corridors or rooms.

A valid door cell must satisfy ALL:

1. Floor tile (0)
2. NOT in roomGrid (not room interior — sits in corridor/gap)
3. Walls on two opposite sides: `isWall(N) && isWall(S)` or `isWall(E) && isWall(W)`
4. Floor on the other two sides
5. At least one floor neighbor is room interior (confirms it's a room entrance)

```typescript
// Horizontal passage: walls N+S, floor E+W, one side is room
if (isWall(n) && isWall(s) && isFloor(w) && isFloor(e)) {
  if (isRoom(r, c+1) !== isRoom(r, c-1)) → PLACE DOOR
}
```

**Why the roomGrid check matters:** Without it, every corridor chokepoint looks like a valid door → corridors filled with doors.

---

## Wolf3D Constraints

- **Wall-door-wall:** Every door MUST have solid walls (types 1-5) on two opposite sides. The raycaster renders door slices assuming perpendicular walls exist.
- **No diagonal movement:** Grid is strictly 4-directional.
- **Door types:** DOOR_SLIDE (9), DOOR_GATE (8), DOOR_SPLIT (7), DOOR_SECRET (6), DOOR_LOCKED_GOLD (10), DOOR_LOCKED_SILVER (11), DOOR_EXIT (12).

---

## Validation Checklist

After generation, verify:

1. **Flood fill** from player start reaches ALL floor + door cells
2. **Wall-door-wall** on every door tile
3. **Exit door exists** (DOOR_EXIT = 12) — findOrCreateRoomEntrance with 3 fallback strategies
4. **Player start** is on a floor cell
5. On failure: retry with `seed + 1` (BSP rarely fails, but progression/validation can)
