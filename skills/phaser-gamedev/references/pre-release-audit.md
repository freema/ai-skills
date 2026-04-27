# Pre-Release Audit Checklist

Phaser + React Router v7 traps that **pass `task lint` and `task build` but break at runtime**. Run through this list before shipping a game, after a significant refactor, or when merging a feature branch that touches scenes/assets.

Adapted from OpenGame's `debug-skill/seed-protocol`. Keys are renamed to match PixelDen conventions (no `main.ts`, no `asset-pack.json`; scenes live in `config.ts`, assets preload in `scenes/boot.ts`).

---

## Reactive rules — patterns that explain a failure

Use these to **diagnose a reported error**. Each row: what you see → where to look → what to fix.

| #   | Stage   | Signal                                                                | Root cause                                                                                                                                                                          | Where to look                                                                                                     |
| --- | ------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| R1  | build   | `TS2307 Cannot find module '...'`                                     | Wrong `../` depth, or path typo. `~/` alias works only where Vite/TSConfig is configured (app/).                                                                                    | Count `../` from importing file; prefer `~/` alias when crossing `app/` subtree                                   |
| R2  | build   | `TS2339 Property 'X' does not exist on type 'Y'`                      | Property removed/renamed in type def, or accessing a member that was never declared.                                                                                                | Open the type/class definition; fix the access or add the declaration                                             |
| R3  | runtime | `TypeError: Cannot read properties of undefined`                      | Object used before construction in `create()`, or scene accessed after `scene.stop()`.                                                                                              | Reorder statements so init happens before access; guard with `this.scene.isActive()` if reading from paused scene |
| R4  | runtime | `Texture key "X" not found` (or blank/pink sprite)                    | Texture key used in `this.add.image(key)` / `this.anims.create({ key })` was never preloaded.                                                                                       | Grep the key in `scenes/boot.ts`; check spelling, missing frame suffix, or asset path typo                        |
| R5  | runtime | `Animation key "X" does not exist`                                    | `.play("X")` called before `anims.create({ key: "X" })`, or anim created in a different scene with a key the current scene can't see (anims are global — check registration order). | Ensure `anims.create()` runs in Boot preload/create before any gameplay scene starts                              |
| R6  | runtime | `Scene key "X" not found` on `scene.start("X")` / `scene.launch("X")` | Target scene not listed in the `scene: [...]` array returned by `getXxxConfig()`.                                                                                                   | Add the import + include the class in the scene array of `config.ts`                                              |
| R7  | runtime | `RangeError: Maximum call stack size exceeded`                        | Infinite recursion or circular scene transition (A starts B, B starts A, neither stops first).                                                                                      | Trace the call chain; add a guard flag or `this.scene.stop()` before `start()`                                    |

---

## Proactive rules — run before tagging a release

Use these as a **walkthrough grep** of the current branch. Each rule has a concrete command to run.

### P1. ASSET_KEY_CONSISTENCY

Every texture/audio/spritesheet key used in code must be preloaded in the same game's Boot scene.

```bash
# Keys the game uses
grep -RhoE "this\.(add|textures|anims)\.[a-z]+\(\s*['\"]([^'\"]+)" app/games/<slug>/ | grep -oE "'[^']+'|\"[^\"]+\"" | sort -u
# Keys the Boot preloads
grep -RhoE "this\.load\.(image|spritesheet|audio|atlas)\(\s*['\"]([^'\"]+)" app/games/<slug>/scenes/boot.ts | grep -oE "'[^']+'|\"[^\"]+\""
```

Any key present in the first list but missing from the second is a bug.

### P2. SCENE_REGISTRATION

Every `scene.start("X")` / `scene.launch("X")` target must be in the `scene: [...]` array of the game's `config.ts`.

```bash
grep -RhoE "scene\.(start|launch)\(\s*['\"]([^'\"]+)" app/games/<slug>/ | grep -oE "'[^']+'|\"[^\"]+\""
```

Cross-check against the class imports listed in `config.ts`'s `scene: [Boot, Menu, Game, ...]`.

### P3. GAME_REGISTRY_SLUG

The game's folder name, its `slug` in `app/games/registry.ts`, and the locale copy key in `app/i18n/en/games.json` (or equivalent) must all match exactly.

```bash
ls app/games                         # folder name
grep -nE "slug:\s*['\"]" app/games/registry.ts  # slug entries
```

A mismatch means the game renders a 404 or falls through to the generic layout.

### P4. LEVEL_MANIFEST (multi-level games only)

For games with `levels/manifest.json` (frost-hold, titan-siege, relic-rush, dungeon-cast):

- `manifest.json[0]` (or the entry marked `isFirst`) must be reachable from the menu — no orphaned first level.
- Every referenced level JSON file exists on disk.
- No duplicate level ids.

```bash
jq -r '.[].id' app/games/<slug>/levels/manifest.json | sort | uniq -d  # should be empty
```

### P5. TYPE_IMPORT_SEPARATION

TypeScript types/interfaces must be imported with the `type` keyword when mixed with runtime imports under `verbatimModuleSyntax`:

```typescript
// correct
import { BasePlayer, type PlayerConfig } from "./base-player";

// wrong — TS build or Vite HMR error
import { BasePlayer, PlayerConfig } from "./base-player";
```

ESLint rule `@typescript-eslint/consistent-type-imports` catches most cases — verify it's enabled in `eslint.config.*`. If not, add it.

### P6. RELOAD_DOCUMENT_LINKS (PixelDen-specific — see CLAUDE.md)

Every `<Link to="/games/...">` or `<NavLink>` pointing into a Phaser game route must carry `reloadDocument`:

```bash
grep -rnE "to=\"/games/" app/ | grep -v "reloadDocument" | grep -v "\.server\."
```

Any match is a bug — Phaser leaks keyboard listeners on SPA nav between games.

### P7. TOUCH_CONTROLS_CLEANUP (per memory `feedback-touch-controls`)

Games using `createTouchControls()` must call `.destroy()` in `shutdown()` or via scene events. Grep:

```bash
grep -rn "createTouchControls" app/games/ | while read L; do
  DIR=$(dirname "${L%%:*}")
  grep -q "touchControls\?\.destroy\|touchControls\.destroy" "$DIR"/*.ts || echo "NO CLEANUP: $L"
done
```

### P8a. SCORE_UPDATE_CHECKPOINTS (roguelite / multi-run games)

Games with roguelite progression (multi-run, accumulated state like towns cleared, waves survived, currency banked) should emit `score-update` at natural checkpoints so React bridge persists progress server-side. The wire name is **`score-update`** (listened to by `app/components/game-canvas.tsx` → `saveProgress` → `POST /api/scores { final: false }`). Final submit uses `game-over`.

```bash
grep -rn "events.emit.*score-update" app/games/<slug>/
```

If the game is roguelite-shaped but has no `score-update` emit, players lose progress on browser close.

Payload shape (same as `game-over`, `GameOverData` in `app/games/types.ts`): `{ score, metadata?, wave?, cause?, durationSec? }`.

### P8. VIEWPORT_RESTART_GUARD (per memory `feedback-responsive-resize`)

Scenes that listen on `VIEWPORT_CHANGED_EVENT` and call `scene.restart()` must compare old vs new size and skip the restart if unchanged — otherwise menu scenes loop-restart on mobile.

```bash
grep -rn "VIEWPORT_CHANGED_EVENT" app/games/ -A 4 | grep -B1 "scene.restart"
```

Review each hit: there must be a size-changed check before `restart()`.

### P9. VIEWPORT_DESKTOP_RATIO (per task 34)

Desktop canvas letterboxes inside `.game-wrapper` when `aspectRatio < 1.10`. The house style is canvas = wrapper (see DMH). Before shipping a new game or touching a game's `registry.ts` entry, check the desktop ratio and align to a preset unless the gameplay genuinely requires a different shape.

```bash
# Show all games with their ratios — anything < 1.10 letterboxes
grep -E "slug:|width:|height:" app/games/registry.ts
```

**Presets** (see `tasks/34-standardize-game-viewports.md`):

| Preset     | Dimensions | Ratio | Use when                                                   |
| ---------- | ---------- | ----- | ---------------------------------------------------------- |
| `STD`      | 960×720    | 1.33  | Default — cards, arcade, action, single-screen puzzles     |
| `WIDE`     | 1280×720   | 1.78  | TD, dungeon crawlers, racing, big-camera games             |
| `PORTRAIT` | 540×960    | 0.56  | Phone-in-hand games; always pair with `mobileWidth/Height` |
| `SQUARE`   | 720×720    | 1.00  | Only when gameplay truly needs square (tight grid puzzles) |

When adding `mobileWidth/mobileHeight` per task 33, **also** check desktop ratio — opting a square game into the viewport helper without promoting desktop to STD/WIDE still letterboxes. Align the mobile variant to `PORTRAIT` (540×960) unless there's a reason not to.

If you promote to STD/WIDE, also scan the game's scenes for hardcoded positions that assume square (`GW/2 + N` where N is a magic number that only worked at 640×640) — grep for uses of `GW` and `GH` to spot them.

---

## Override visibility (when using inheritance)

If you introduce a base class (planned future: `BasePixelDenScene`), TypeScript **cannot narrow** the visibility of an overridden method. `public` method in the base must stay `public` in the override, `protected` cannot be made `private`.

```typescript
// WRONG — build error: Public property 'create' cannot be re-declared as protected
class MyGame extends BasePixelDenScene {
  protected override create(): void { ... }
}

// Correct
class MyGame extends BasePixelDenScene {
  override create(): void { ... }
}
```

We don't have Base scenes yet, but when we do — this rule kicks in immediately.

---

## When to run this checklist

| Situation                                                   | Run                                                                                                                 |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Adding a new game                                           | Full list (all R + P rules) before first merge to main                                                              |
| Touching a game's `config.ts` or `scenes/boot.ts`           | P1, P2                                                                                                              |
| Touching `registry.ts` or adding mobile/fullscreen variants | P9 (desktop ratio) + P8 (restart guard)                                                                             |
| Refactoring shared `app/games/shared/`                      | P2, P7, P8 on every consumer                                                                                        |
| Before `git tag vX.Y.Z`                                     | Full P1–P9 plus `task test` + `task lint` + `task format:check` (per memory `feedback-format-check-before-release`) |
| After receiving a user bug report                           | Scan R1–R7 for the signature, then do the relevant P check                                                          |

Record any novel recurring bug pattern as a new rule here — this file is the project's living debug protocol.
