# Reusable Game Patterns

Building blocks that recur across 2D games. Each pattern includes **when to extract** (signal that a one-off implementation has paid off) and **when to stay ad-hoc** (extraction would be premature abstraction).

Patterns catalogued from the OpenGame reference repo (`/tmp/OpenGame/agent-test/templates/modules/`). We don't have these implemented yet — this is a menu, not an inventory. Pick one and extract it only when a concrete game needs it for the second or third time.

---

## Composition over inheritance: BehaviorManager

**What it is.** A map of named behaviors attached to one owner entity. Each behavior implements `attach(owner)`, `detach()`, `update()` and an `enabled` flag. The owner's `update()` just calls `behaviors.update()`, which iterates and calls each enabled behavior's `update()`.

```typescript
interface IBehavior {
  enabled: boolean;
  attach(owner: unknown): void;
  detach(): void;
  update(): void;
}

class BehaviorManager {
  add<T extends IBehavior>(name: string, b: T): T;
  get<T extends IBehavior>(name: string): T | undefined;
  remove(name: string): boolean;
  update(): void; // iterates enabled behaviors
}
```

**Why bother.** Instead of `class Player extends Phaser.Sprite with 12 mixed-in methods`, you get `player.behaviors.add('movement', new EightWayMovement()).add('combat', new MeleeAttack())`. Swap `EightWayMovement` for `PlatformerMovement` without touching the Player class. Disable combat while in a cutscene via `player.behaviors.disable('combat')`.

**Extract when.** Two or more entity types (Player + Enemy, or Hero + Companion) share a movement or combat routine **and** at least one needs to swap it at runtime (dash→fly, walking→swimming).

**Stay ad-hoc when.** Single entity, fixed control scheme. Dungeon Cast's raycasting player is custom enough it would gain nothing from this abstraction.

**Candidates in our codebase.** Relic Rush (platformer player vs. enemies both moving), Frost Hold (wizard + summons), Dungeon Cast (player + multiple enemy types — though the raycaster is its own beast).

---

## Generic state machine (FSM)

**What it is.** A map of named states, each with `onEnter()`, `onUpdate()`, `onExit()` hooks. `setState(name)` runs exit on the old, enter on the new. `update()` delegates to the current state.

```typescript
class StateMachine<TContext> {
  addState(name: string, config: { onEnter?; onUpdate?; onExit? }): this;
  setState(name: string): void;
  isState(name: string): boolean;
  update(time: number, delta: number): void;
}
```

**Why bother.** Player logic in a scene's `update()` becomes 300 lines of `if (isJumping) ... else if (isHurting) ... else if (isDashing)`. An FSM factors those into named states with clean transitions. Debugging: log `machine.currentState` to see what's active.

**Extract when.** Entity has 4+ meaningful states with transition rules (idle / walk / jump / fall / hurt / dash). Once you're writing `if (jumping && !hurting && canDash)` trees, FSM pays for itself.

**Stay ad-hoc when.** 2–3 states (menu-open / menu-closed, running / paused). A boolean is clearer.

**Candidates.** Relic Rush player (idle/run/jump/fall/dash), DMH AI opponent turn phases, Pixel Racer car states (boost/normal/spun-out).

---

## TurnManager

**What it is.** Drives turn-based or phase-based games with configurable **modes**:

- `step` — one actor acts, then control returns to input
- `turn` — all actors on a side act, then switch sides
- `realtime` — no turns, just time-gated batched updates
- `freeform` — caller controls advancement

And **phases** that form a loop: `WAITING → PROCESSING → ANIMATING → CHECKING → WAITING`. Each phase fires events; systems listen. ANIMATING blocks until tweens finish.

**Why bother.** Card games, match-3, and tactical games all need "input locked while animation plays, then check for game over, then advance". Reimplementing that per-scene leads to race conditions.

**Extract when.** Second turn-based game. First time, do it ad-hoc and learn the pain.

**Stay ad-hoc when.** Realtime games. A `this.awaitingAnim` flag is plenty.

**Candidates.** Dead Man's Hand (blackjack phases: deal, player, dealer, resolve). Any future chess/checkers/sokoban.

---

## WaveManager (tower defense)

**What it is.** Consumes a declarative wave schedule, spawns enemies on a timer respecting `minSpawnInterval` and `timeBetweenWaves`:

```typescript
type Wave = { groups: Array<{ enemyType: string; count: number; interval: number }> };
new WaveManager(scene, waves: Wave[], config);
```

Emits `wave-start`, `wave-end`, `all-waves-done`. Pause/resume from UI.

**Extract when.** Second tower-defense-like game. Crystal TD, Titan Siege, and Frost Hold all spawn enemies in waves — if we unify, each new TD-adjacent game drops to hours of content.

**Signal to extract now.** If we touch waves in two of those three games in the same PR.

---

## CardManager (card games)

**What it is.** Managed deck + hand + discard pile with `shuffle`, `draw(n)`, `discard(card)`, `reshuffle` events. Cards are data (`{ id, suit, rank, metadata }`), rendered by a separate `Card` UI component.

**Extract when.** DMH expansion (Gallows End boss with special rules) plus any future card game.

**Stay ad-hoc when.** Current DMH single-game scope — an array + a couple of methods is enough.

---

## Dialogue UI — two distinct patterns

"Dialogue" is too broad. Audit of existing code (2026-04-24) showed two **structurally different** UI contracts that should not share a single helper:

**Pattern A — Narrative-reveal scene** (Dungeon Cast `briefing.ts`). Full-screen scene, canvas-based typewriter that paints characters one by one onto a texture, wait-to-dismiss on tap/space. Used for level intros.

**Pattern B — Character popup overlay** (DMH `showDialogue()` in game.ts). In-scene overlay container, portrait + name + quoted line, slide-up 200 ms, progress-bar auto-dismiss (~2.5 s), tap-to-skip. Used for one-line AI reactions during gameplay.

**Extract pattern A when.** Second narrative-reveal scene (typewriter, level intro). Two consumers justify a shared `NarrativeRevealScene` base or helper.

**Extract pattern B when.** Second character-popup overlay. Good candidate for `app/games/shared/ui/character-popup.ts` that takes `{ portrait, name, line, durationMs }`.

**Stay ad-hoc when.** Single consumer. One-off intro screens don't earn an abstraction.

Do not try to unify A and B under one "DialogueManager" — the contracts differ (full-screen typewriter vs. inline popup; passive vs. auto-dismiss; text-only vs. portrait-driven).

---

## Scene skeleton: Boot / Menu / Game / GameOver / Pause

**What it is.** Five roles every non-trivial game fills:

- **Boot** — preload assets, create animations, start Menu
- **Menu** — title + play/settings buttons, emits `game-start`
- **Game** — gameplay loop, emits `progress-save` + `game-over`
- **GameOver** (overlay) — final score, retry / back buttons
- **Pause** (overlay) — resume / restart / quit

Today each PixelDen game rolls its own Menu and GameOver from scratch. That's 20× duplicated UI code.

**Extract when.** We decide to unify art style for game-over screens (same score panel, same button row). Candidate for a shared `app/games/shared/ui/` module with `GameOverPanel` React component or Phaser Scene class.

**Risk.** Heterogeneity of current games (raycaster, card game, puzzle, platformer) means a one-size fits-all GameOver scene will fight every game's aesthetic. Start with the data contract (`GameOverData` is already in `app/games/types.ts`) and let each game render it.

---

## Asset manifest per game

**What it is.** Instead of ad-hoc `this.load.image("wall-bricks", "/games/dmh/wall-bricks.png")` scattered across Boot scenes, a single `app/games/<slug>/assets.ts` exports a typed map:

```typescript
export const ASSETS = {
  textures: [
    { key: "wall-bricks", path: "/games/dmh/wall-bricks.png" },
    // ...
  ],
  spritesheets: [...],
  audio: [...],
} as const;
```

Boot just iterates. Audit rule `ASSET_KEY_CONSISTENCY` (see `pre-release-audit.md`) then becomes trivial: the manifest **is** the source of truth.

**Extract when.** Writing a new game from scratch — do it in the initial skeleton. Retrofitting 20 existing games is not worth the churn.

---

## What we deliberately do NOT copy from OpenGame

- **`gameConfig.json` with `{ value, type, description }` wrappers.** OpenGame does this because their LLM needs inline type hints at generation time. We have TypeScript. Plain TS config modules win.
- **Global `LEVEL_ORDER` array + `LevelManager` class.** Our multi-level games (frost-hold, titan-siege, relic-rush, dungeon-cast) already handle level sequencing per game; no cross-game scheduler needed.
- **Whole `asset-pack.json` + `animations.json` ecosystem.** Too much indirection for our size. The per-game `assets.ts` pattern above captures 80% of the value with 20% of the ceremony.
- **`_Template*` copy-and-rename blueprints.** They need these because an LLM agent is scaffolding whole games. For us, creating a new game from a similar existing one via `cp -r app/games/snake app/games/new-game` and search-and-replace is faster.
