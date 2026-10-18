---
name: phaser-gamedev
description: "Build and fix PixelDen browser games on Phaser 4 (TypeScript): scenes, sprites, physics (Arcade/Matter), tilemaps, animations, input, the React wrapper. Trigger: any work in app/games/**, 'Phaser scene', 'Arcade physics', 'tilemap', 'spritesheet'."
---

# Phaser Game Development (PixelDen)

The repo runs **Phaser 4** (`package.json`: `"phaser": "^4.0.0"`). Host `node_modules/phaser` may still hold 3.90, so never look APIs up there. Source of truth for any API: `.claude/skills/phaser/<topic>/SKILL.md` (written for v4); for v3 habits read `.claude/skills/phaser/v3-to-v4-migration/SKILL.md`.

## Phaser 4 traps (v3 code that fails quietly)

- **`setTintFill(c)` is removed**: it only logs a console error, applies nothing and returns `undefined`. Use `setTint(c).setTintMode(Phaser.TintModes.FILL)`; `clearTint()` resets both colour and mode.
- **DynamicTexture / RenderTexture buffer commands**: `draw`/`stamp`/`fill`/`clear` do nothing until `render()`. The buffer keeps object _references_, so stamped objects must stay alive and unchanged until after `render()` (don't re-`setText` one shared Text per stamp). Pattern: `app/games/solitaire/card-textures.ts`.
- **FX and masks are Filters**: no `preFX`/`postFX`; `BitmapMask` is gone (`obj.filters.internal.addMask(maskObj)`).
- **`roundPixels` defaults to `false`** (was `true`). Pixel-art games that need it set `roundPixels: true` in config (e.g. Tumblekin).
- **`Phaser.CANVAS` is deprecated**: use `AUTO`; `CanvasTexture` works under WebGL (see [raycasting.md](references/raycasting.md)).
- `Geom.Point` → `Math.Vector2`; `Math.TAU` is now 2π (`Math.PI_OVER_2` for the old value); `Struct.Set`/`Struct.Map` → native `Set`/`Map`.

---

## Before Starting A New Game Or Touching An Existing One

**Read [read-before-implement.md](references/read-before-implement.md) first.** Three-layer reading order (skill docs → target game → shared helpers) and the pre-implementation output checklist. Skipping this is the #1 source of invented APIs and wrong assumptions.

**Before merging to main**, run the relevant checks in [pre-release-audit.md](references/pre-release-audit.md): reactive error signatures (R1–R7), proactive consistency checks (P1–P11: asset keys, scene registration, `reloadDocument`, touch-controls cleanup, viewport restart guard, overlay click guard…) and browser verification.

**When reaching for abstraction**, consult [game-patterns.md](references/game-patterns.md) first — it catalogs composition patterns (BehaviorManager, FSM, TurnManager, WaveManager, CardManager, DialogueManager) with explicit "when to extract" vs "stay ad-hoc" signals.

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

| When working on...                                                                                                 | Read first                                                                    |
| ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Starting a new game, or editing a scene you haven't touched recently                                               | [read-before-implement.md](references/read-before-implement.md)               |
| Pre-merge / pre-release audit, diagnosing a runtime error, browser-testing a game                                  | [pre-release-audit.md](references/pre-release-audit.md)                       |
| Deciding whether to extract an FSM / BehaviorManager / TurnManager / WaveManager / CardManager / DialogueManager   | [game-patterns.md](references/game-patterns.md)                               |
| Loading ANY spritesheet, nine-slice UI panels                                                                      | [spritesheets-nineslice.md](references/spritesheets-nineslice.md)             |
| Config, scenes, objects, input, animations, PixelDen game folder layout                                            | [core-patterns.md](references/core-patterns.md)                               |
| Tiled tilemaps, collision layers                                                                                   | [tilemaps.md](references/tilemaps.md)                                         |
| Physics tuning, groups, pooling                                                                                    | [arcade-physics.md](references/arcade-physics.md)                             |
| Scrolling platforms, custom body sizes                                                                             | [arcade-physics.md](references/arcade-physics.md) (Static vs Dynamic section) |
| Performance issues, object pooling                                                                                 | [performance.md](references/performance.md)                                   |
| Keyboard input, SPACE key, `addCapture`, duplicate keydowns                                                        | [keyboard-input.md](references/keyboard-input.md)                             |
| Raycasting (Wolf3D-style FPS): doors, billboards, decals, lighting, weapon sprites, level data integrity            | [raycasting.md](references/raycasting.md)                                     |
| Procedural dungeon generation: BSP, corridors, door placement, level validation                                    | [procedural-dungeon-gen.md](references/procedural-dungeon-gen.md)             |

---

## Physics Choice (Decide Early)

| System     | Use When                                                               |
| ---------- | ---------------------------------------------------------------------- |
| **Arcade** | Platformers, shooters, most 2D games. Fast AABB collisions             |
| **Matter** | Physics puzzles, ragdolls, realistic collisions. Slower, more accurate |
| **None**   | Menu scenes, visual novels, card games                                 |

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

---

## CRITICAL: Keyboard Input Inside the React Page

**Read [keyboard-input.md](references/keyboard-input.md) for the full rules.** In short: game config sets `input.keyboard.target: window` (canvas focus is irrelevant), each scene calls `addCapture([...])` for its keys, and **nothing may `preventDefault()` a keydown before Phaser sees it** (Phaser skips `defaultPrevented` events). Discrete `keydown-X` handlers dedupe with a `WeakSet` (see below).

---

## Repo Pitfalls (Learned the Hard Way)

- **Clicks through HTML overlays.** Phaser also listens for `mousedown`/`mouseup` on `window`, so a click on a React dialog over the canvas hits the Phaser button underneath. Guard buttons that can sit under an overlay with `pointer.event?.target === game.canvas` ([audit P10](references/pre-release-audit.md)).
- **Replayed keydowns.** When rAF stalls (background tab, headless Chrome) Phaser re-emits the queued keydown events on every new key. Gate discrete handlers with a `WeakSet<KeyboardEvent>` of seen events ([keyboard-input.md](references/keyboard-input.md)).
- **React wrapper teardown.** The `Phaser.Game` init `useEffect` in `app/components/game-canvas.tsx` depends on `[slug]` only; any other dep makes loader revalidation (after game-over) destroy and recreate the game ([audit P11](references/pre-release-audit.md)).
- **Resize restart loops.** Restart or relayout only when the size really changed; layout shifts around the canvas fire resize events with the same size ([audit P8](references/pre-release-audit.md)).
- **Code-drawn vehicles/units.** Drive the spawn count from the quantity the sim actually reports for that mode, not from a proxy. Pixelopolis spawned trains from road traffic, so a metro-only city with zero road traffic showed no trains.
- **Browser tests.** Synthetic pointer input needs `MouseEvent` (a `PointerEvent` alone is ignored) plus `game.scale.updateBounds()`; reach the game instance by walking the React fiber of the canvas's parent ([audit: Browser verification](references/pre-release-audit.md)).
- **Game links and SPA navigation**: see "Game Navigation" in `CLAUDE.md` (`reloadDocument` is mandatory).

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
| 2500 individual `add.image()` for tile grid          | 2500 game objects = slow                                    | Draw all tiles onto one `RenderTexture`, then call `render()` (Phaser 4 buffers draws)                    |
| A scene method named `shutdown()` for cleanup        | Phaser never calls it                                       | `this.events.once("shutdown", …)` in `create()`                                                           |
