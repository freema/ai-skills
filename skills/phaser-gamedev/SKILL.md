---
name: phaser-gamedev
description: "Build 2D browser games with Phaser 3 (JS/TS): scenes, sprites, physics (Arcade/Matter), tilemaps (Tiled), animations, input. Trigger: 'Phaser scene', 'Arcade physics', 'tilemap', 'Phaser 3 game'."
---

# Phaser Game Development

Build 2D browser games using Phaser 3's scene-based architecture and physics systems.

---

## STOP: Before Loading Any Spritesheet

**Read [spritesheets-nineslice.md](references/spritesheets-nineslice.md) FIRST.**

Spritesheet loading is fragile—a few pixels off causes silent corruption that compounds into broken visuals. The reference file contains the mandatory inspection protocol.

**Quick rules** (details in reference):

1. **Measure the asset** before writing loader code—never guess frame dimensions
2. **Character sprites use SQUARE frames**: If you calculate frameWidth=56, try 56 for height first
3. **Different animations have different frame sizes**: A run cycle needs wider frames than idle; an attack needs extra width for weapon swing. Measure EACH spritesheet independently
4. **Check for spacing**: Gaps between frames require `spacing: N` in loader config
5. **Verify the math**: `imageWidth = (frameWidth × cols) + (spacing × (cols - 1))`

---

## Reference Files

Read these BEFORE working on the relevant feature:

| When working on...                                                                                                                                                                                                                   | Read first                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Loading ANY spritesheet                                                                                                                                                                                                              | [spritesheets-nineslice.md](references/spritesheets-nineslice.md)             |
| Nine-slice UI panels                                                                                                                                                                                                                 | [spritesheets-nineslice.md](references/spritesheets-nineslice.md)             |
| Config, scenes, objects, input, animations                                                                                                                                                                                           | [core-patterns.md](references/core-patterns.md)                               |
| Tiled tilemaps, collision layers                                                                                                                                                                                                     | [tilemaps.md](references/tilemaps.md)                                         |
| Physics tuning, groups, pooling                                                                                                                                                                                                      | [arcade-physics.md](references/arcade-physics.md)                             |
| Scrolling platforms, custom body sizes                                                                                                                                                                                               | [arcade-physics.md](references/arcade-physics.md) (Static vs Dynamic section) |
| Performance issues, object pooling                                                                                                                                                                                                   | [performance.md](references/performance.md)                                   |
| Keyboard input, SPACE key, canvas focus                                                                                                                                                                                              | [keyboard-input.md](references/keyboard-input.md)                             |
| Raycasting (Wolf3D-style FPS), doors, transparent gates, billboard sprites, enemy collision, secret walls, wall-mounted decals, torch lighting, fisheye fix, texture clipping, weapon sprites, enemy animation, level data integrity | [raycasting.md](references/raycasting.md)                                     |
| Procedural dungeon generation, BSP splitting, corridor carving, door placement, wall-door-wall, level validation                                                                                                                     | [procedural-dungeon-gen.md](references/procedural-dungeon-gen.md)             |

---

## Architecture Decisions (Make Early)

**Before building, decide**:

- What **scenes** does this game need? (Boot, Menu, Game, UI overlay, GameOver)
- What are the **core entities** and how do they interact?
- What **physics** model fits? (Arcade for speed, Matter for realism, None for menus)
- What **input methods**? (keyboard/gamepad/touch)

### Physics System Choice

| System     | Use When                                                               |
| ---------- | ---------------------------------------------------------------------- |
| **Arcade** | Platformers, shooters, most 2D games. Fast AABB collisions             |
| **Matter** | Physics puzzles, ragdolls, realistic collisions. Slower, more accurate |
| **None**   | Menu scenes, visual novels, card games                                 |

---

## Core Principles

1. **Scene-first architecture**: Organize code around scene lifecycle and transitions
2. **Composition over inheritance**: Build entities from sprite/body/controllers, not deep class trees
3. **Physics-aware design**: Choose collision model early; don't retrofit physics late
4. **Asset pipeline discipline**: Preload everything; reference by keys; keep loading deterministic
5. **Frame-rate independence**: Use `delta` for motion and timers; avoid frame counting

---

## CRITICAL: Scaled Sprites + Physics Bodies

When textures are larger than display size (e.g. AI-generated assets), `body.setSize()` is multiplied by sprite scale!

**WRONG** — body becomes tiny (5px instead of 80px):

```typescript
sprite.setDisplaySize(80, 12); // scale = 80/1200 = 0.067
sprite.body.setSize(80, 12); // actual body = 80 * 0.067 = 5px!
```

**CORRECT** — use FRAME (texture) size, scale applies automatically:

```typescript
sprite.setDisplaySize(80, 12);
const body = sprite.body as Phaser.Physics.Arcade.Body;
body.setSize(sprite.frame.width, sprite.frame.height); // body = 1200 * 0.067 = 80px ✓
```

For **static bodies** (bricks, platforms), also call `updateFromGameObject()`:

```typescript
brick.setDisplaySize(40, 16);
const body = brick.body as Phaser.Physics.Arcade.StaticBody;
body.setSize(brick.frame.width, brick.frame.height);
body.updateFromGameObject(); // REQUIRED for static bodies!
```

### CRITICAL: Arcade physics bodies CANNOT rotate

`setAngle()` / `setRotation()` rotates the VISUAL sprite only. The physics body stays axis-aligned (AABB). This means rotated wall sprites have wrong collision shapes.

**WRONG** — body stays 64×32 horizontal even though sprite is rotated 90°:

```typescript
wall.setAngle(90);
wall.body.setSize(64, 32); // still horizontal!
```

**CORRECT** — separate visual from collision:

```typescript
// Visual only (no physics)
this.add.image(x, y, "wall").setAngle(90);

// Invisible collision zone
const zone = this.add.zone(x, y, 16, span);
this.physics.add.existing(zone, true); // static body
wallGroup.add(zone);
```

### Obstacle collision groups pattern

Split obstacles into separate StaticGroups when different entities need different collision rules:

```typescript
this.walls = this.physics.add.staticGroup(); // invisible zones
this.trees = this.physics.add.staticGroup(); // visible + physics

// Walls block player only (enemies walk through to enter arena)
this.physics.add.collider(this.player, this.walls);
// Trees block everyone
this.physics.add.collider(this.player, this.trees);
this.physics.add.collider(this.enemyPool, this.trees);
```

### CRITICAL: Keyboard input — canvas focus problem

**Read [keyboard-input.md](references/keyboard-input.md) for the full solution.**

Phaser's keyboard only works when canvas has focus. When embedded in a React page, canvas loses focus constantly (user clicks tabs, buttons, scrolls). `keyboard.target: window` alone does NOT fix this.

**Required**: Window-level capture-phase listener that re-focuses canvas + re-dispatches the event. Plus `addCapture(SPACE)` in each scene that uses SPACE.

---

## Graphics Overlays on Sprites (Brake Lights, Flames, Effects)

When drawing Graphics effects (brake lights, nitro flames, etc.) on top of sprite-based game objects:

### Sprite canvas ≠ car body

AI-generated sprites have transparent padding — the visible content is smaller than the PNG canvas. Always **crop sprites first** (`process_sprite` with auto-crop) so the PNG edges match the pixel art edges. Otherwise, effects positioned at `halfW`/`halfH` will float outside the visible car.

### Coordinate alignment

After `g.translateCanvas(x, y)` + `g.rotateCanvas(angle)`, the local coordinate origin is the sprite center. Position effects relative to the **display size** (which maps to cropped sprite edges):

```typescript
const halfW = CAR_DRAW_W / 2;
const halfH = CAR_DRAW_H / 2;
// Brake lights at rear corners (car body is ~55% of canvas width)
const sideX = halfW * 0.38; // actual car edge, NOT halfW
const rearY = halfH - 4; // just inside rear edge
```

### Multi-layer effects look better

- **Brake lights**: outer glow circle (large, low alpha) + inner 2×2px rect (bright)
- **Nitro flame**: 3 layers — outer (orange), mid (yellow), core (white-yellow) with sin-based flicker
- **Dual exhaust**: 2 separate small flames with independent flicker phases

### Sprite rotation offset

If a sprite faces south but `angle=0` means north: add `Math.PI` to sprite rotation, but keep Graphics `rotateCanvas(car.angle)` as-is (Graphics follow physics convention, sprite gets the visual flip).

---

## Anti-Patterns

| Anti-Pattern                                         | Problem                                                     | Solution                                                                                                  |
| ---------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Global state on `window`                             | Scene transitions break state                               | Use scene data, registries                                                                                |
| Loading in `create()`                                | Assets not ready when referenced                            | Load in `preload()`, use Boot scene                                                                       |
| Frame counting                                       | Game speed varies with FPS                                  | Use `delta / 1000`                                                                                        |
| Matter for simple collisions                         | Unnecessary complexity                                      | Arcade handles most 2D games                                                                              |
| One giant scene                                      | Hard to extend                                              | Separate gameplay/UI/menus                                                                                |
| Magic numbers                                        | Impossible to balance                                       | Config objects, constants                                                                                 |
| No object pooling                                    | GC stutters                                                 | Groups with `setActive(false)`                                                                            |
| `body.setSize(displayW, displayH)` on scaled sprites | Body is multiplied by scale → tiny                          | Use `body.setSize(frame.width, frame.height)`                                                             |
| StaticBody + `setSize()` + `updateFromGameObject()`  | `updateFromGameObject()` overwrites custom size every frame | Use immovable dynamic body (`setImmovable(true)`) — see [arcade-physics.md](references/arcade-physics.md) |
| `setAngle()` on physics sprites                      | Visual rotates but body stays axis-aligned (AABB)           | Use invisible zones for collision, sprites for visual only                                                |
| Constant `setAlpha(0.5)` for invincibility           | Character looks broken/ghostly                              | Use blink tween (`alpha 1↔0.3, duration 80, yoyo`)                                                        |
| Loading non-existent sprites in `preload()`          | Silent 404 errors on every game load                        | Only load files that exist; use `!textures.exists()` + programmatic fallback in `create()`                |
| 2500 individual `add.image()` for tile grid          | 2500 game objects = slow                                    | Use `RenderTexture` — draw all tiles onto one texture                                                     |

---

## Variation Guidance

Outputs should vary based on:

- **Genre** (platformer vs top-down vs shmup)
- **Target platform** (mobile touch, desktop keyboard, gamepad)
- **Art style** (pixel art scaling vs HD smoothing)
- **Performance envelope** (many sprites → pooling; few sprites → simpler code)

---

## Remember

Phaser provides powerful primitives—scenes, sprites, physics, input—but **architecture is your responsibility**.

Think in systems: define the scenes, define the entities, define their interactions—then implement.

**Codex can build complete, polished Phaser games. These guidelines illuminate the path—they don't fence it.**
