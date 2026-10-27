---
name: phaser-gamedev
description: "PixelDen rules for building and fixing browser games on Phaser 4 (TypeScript): reading order, game folder layout, spritesheet protocol, keyboard and React-wrapper pitfalls, pre-release audit. Phaser API itself comes from the official Phaser skills. Trigger: any work in app/games/**, 'Phaser scene', 'Arcade physics', 'tilemap', 'spritesheet'."
---

# Phaser Game Development (PixelDen)

This skill holds only what is specific to PixelDen. **For any Phaser API question use the official Phaser skills** from [phaserjs/phaser `skills/`](https://github.com/phaserjs/phaser/tree/master/skills), kept locally in `.claude/skills/phaser/<topic>/SKILL.md` (gitignored; refresh by copying the upstream `skills/` folder over it).

The repo runs **Phaser 4** (`package.json`: `"phaser": "^4.0.0"`). Host `node_modules/phaser` may still hold 3.90, so never look APIs up there. Upstream skills track the latest 4.x: if one names an API, check it exists in the version we run before using it.

## Official skill per topic

| Working on…                                   | Official skill (`.claude/skills/phaser/…`)                |
| --------------------------------------------- | --------------------------------------------------------- |
| Game config, boot, renderer                   | `game-setup-and-config`                                   |
| Scenes, lifecycle, transitions, shutdown      | `scenes`, `events-system`                                 |
| Sprites, images, text, graphics               | `sprites-and-images`, `text-and-bitmaptext`, `graphics-and-shapes` |
| Animations, tweens, timers                    | `animations`, `tweens`, `time-and-timers`                 |
| Input (keyboard, pointer, touch)              | `input-keyboard-mouse-touch`                              |
| Arcade / Matter physics                       | `physics-arcade`, `physics-matter`                        |
| Tilemaps                                      | `tilemaps`                                                |
| Loading assets, atlases                       | `loading-assets`                                          |
| Cameras, scaling, resize                      | `cameras`, `scale-and-responsive`                         |
| RenderTexture / DynamicTexture                | `render-textures`                                         |
| Filters, masks, post FX, particles            | `filters-and-postfx`, `particles`                         |
| Groups, containers, pooling                   | `groups-and-containers`                                   |
| Writing v3 habits by mistake                  | `v3-to-v4-migration`, `v4-new-features`                   |

The v4 traps that already bit this repo (all in `v3-to-v4-migration`): `setTintFill` is gone and only logs an error (use `setTint(c).setTintMode(Phaser.TintModes.FILL)`); DynamicTexture/RenderTexture draws do nothing until `render()`, and stamped objects must stay unchanged until then (pattern: `app/games/solitaire/card-textures.ts`); `roundPixels` now defaults to `false`.

---

## Before Starting A New Game Or Touching An Existing One

**Read [read-before-implement.md](references/read-before-implement.md) first**: reading order (skill docs → target game → shared helpers) and the pre-implementation checklist.

**Before merging to main**, run the relevant checks in [pre-release-audit.md](references/pre-release-audit.md): reactive error signatures (R1–R7), consistency checks (P1–P11: asset keys, scene registration, `reloadDocument`, touch-controls cleanup, viewport restart guard, overlay click guard…) and browser verification.

**When reaching for abstraction**, consult [game-patterns.md](references/game-patterns.md) first (FSM, TurnManager, WaveManager, CardManager, DialogueManager, with "when to extract" signals).

## PixelDen Game Layout

Each game lives in `app/games/<slug>/` (see `snake/` or `tumblekin/`):

```
app/games/<slug>/
├── index.ts      # client-only entry: export { getXxxConfig as getConfig } from "./config"
├── config.ts     # getXxxConfig(viewport?) → Phaser.Types.Core.GameConfig, scene: [...]
├── data.ts       # constants (sizes, tuning)
├── scenes/       # boot.ts (all preloads), menu.ts, game.ts, results/game-over...
└── *.test.ts     # Vitest for pure logic (engine, scoring, levels)
```

`app/components/game-canvas.tsx` calls `getConfig(viewport)` and creates the `Phaser.Game`; games never call `new Phaser.Game` themselves. Import Phaser as `import * as Phaser from "phaser";`. Metadata (slug, sizes, viewports) lives in `app/games/registry.ts`, not in the game folder.

**Headless engine, bot and balance adapter (every new or upgraded game).** Gameplay lives in a pure engine (`engine/`: no Phaser, DOM, `Math.random` or `Date.now`, seeded RNG, fixed step or turns; ESLint enforces it). A bot (`engine/bot.ts`, `expert` + `newcomer`) plays it through the same commands as the scene, and `balance.ts` + `balance.run.ts` let `task balance -- <slug>` measure it over many seeds. The scene only renders state, plays FX from engine events and sends input as commands. Every game must also pass `task smoke -- <slug>` (headless Chrome). Twitch arcades on Arcade physics are smoke-only. An upgrade of a game without an adapter adds one. Rules, adapter API and per-game status: [`docs/headless-balance.md`](../../../docs/headless-balance.md).

---

## STOP: Before Loading Any Spritesheet

**Read [spritesheets-nineslice.md](references/spritesheets-nineslice.md) FIRST.** A few pixels off corrupts every frame silently.

1. **Measure the asset** before writing loader code; never guess frame dimensions.
2. **Character sprites use square frames**: if frameWidth is 56, try 56 for height first.
3. **Each animation has its own frame size** (a run or an attack is wider than idle): measure each sheet.
4. **Check for spacing**: gaps between frames need `spacing: N`.
5. **Verify**: `imageWidth = frameWidth × cols + spacing × (cols − 1)`.

## Keyboard Input Inside the React Page

**Read [keyboard-input.md](references/keyboard-input.md).** In short: game config sets `input.keyboard.target: window` (canvas focus is irrelevant), each scene calls `addCapture([...])` for its keys, and **nothing may `preventDefault()` a keydown before Phaser sees it** (Phaser skips `defaultPrevented` events). Discrete `keydown-X` handlers dedupe with a `WeakSet` (below).

---

## Repo Pitfalls (Learned the Hard Way)

- **Clicks through HTML overlays.** Phaser also listens for `mousedown`/`mouseup` on `window`, so a click on a React dialog over the canvas hits the Phaser button underneath. Guard buttons that can sit under an overlay with `pointer.event?.target === game.canvas` ([audit P10](references/pre-release-audit.md)).
- **Replayed keydowns.** When rAF stalls (background tab, headless Chrome) Phaser re-emits the queued keydown events on every new key. Gate discrete handlers with a `WeakSet<KeyboardEvent>` of seen events ([keyboard-input.md](references/keyboard-input.md)).
- **React wrapper teardown.** The `Phaser.Game` init `useEffect` in `app/components/game-canvas.tsx` depends on `[slug]` only; any other dep makes loader revalidation (after game-over) destroy and recreate the game ([audit P11](references/pre-release-audit.md)).
- **Resize restart loops.** Restart or relayout only when the size really changed; layout shifts around the canvas fire resize events with the same size ([audit P8](references/pre-release-audit.md)).
- **Scene cleanup.** A scene method named `shutdown()` is never called; register cleanup with `this.events.once("shutdown", …)` in `create()`.
- **Scaled sprites and Arcade bodies.** PixelLab sprites are larger than their display size, and `body.setSize()` is multiplied by the sprite scale: size bodies from `sprite.frame.width/height`, not the display size. Arcade bodies never rotate with `setAngle()`; use an invisible zone for the collision. For moving platforms or a scrolling world with custom body sizes use an immovable dynamic body, since a static body's `updateFromGameObject()` overwrites a custom size.
- **Assets that may not exist.** Load only files that exist (a missing one is a 404 on every load); check `textures.exists()` and fall back to a texture drawn in code.
- **Effects over sprites.** Crop generated sprites to their pixel edges before positioning brake lights, flames or other Graphics effects relative to the display size (Pixel Racer, Redline Pursuit).
- **Code-drawn vehicles/units.** Drive the spawn count from the quantity the sim actually reports for that mode, not from a proxy. Pixelopolis spawned trains from road traffic, so a metro-only city with zero road traffic showed no trains.
- **Browser tests.** Synthetic pointer input needs `MouseEvent` (a `PointerEvent` alone is ignored) plus `game.scale.updateBounds()`; reach the game instance by walking the React fiber of the canvas's parent ([audit: Browser verification](references/pre-release-audit.md)). Click "Click to load", never "Play now": that is a full page reload.
- **Game links and SPA navigation**: see "Game Navigation" in `CLAUDE.md` (`reloadDocument` is mandatory).

## Reference Files

| When working on…                                                                                     | Read first                                                        |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Starting a new game, or editing a scene you haven't touched recently                                 | [read-before-implement.md](references/read-before-implement.md)   |
| Pre-merge / pre-release audit, diagnosing a runtime error, browser-testing a game                    | [pre-release-audit.md](references/pre-release-audit.md)           |
| Deciding whether to extract an FSM / TurnManager / WaveManager / CardManager / DialogueManager       | [game-patterns.md](references/game-patterns.md)                   |
| Loading any spritesheet, nine-slice UI panels                                                        | [spritesheets-nineslice.md](references/spritesheets-nineslice.md) |
| Keyboard input, SPACE key, `addCapture`, duplicate keydowns                                          | [keyboard-input.md](references/keyboard-input.md)                 |
| Raycasting (Wolf3D-style FPS): doors, billboards, decals, lighting, weapon sprites, level data       | [raycasting.md](references/raycasting.md)                         |
| Procedural dungeon generation: BSP, corridors, door placement, level validation                      | [procedural-dungeon-gen.md](references/procedural-dungeon-gen.md) |
