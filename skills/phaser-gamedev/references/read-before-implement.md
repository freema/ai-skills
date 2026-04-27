# Read Before Implement

When picking up a game task (new feature, bug fix, or a whole new game), do this order **every time**. Skipping any layer is the #1 source of invented API names and wrong assumptions.

Adapted from OpenGame's `prompts/custom.md`. Same principle PixelDen `CLAUDE.md` states as "Think Before Coding" — this file makes it concrete for Phaser work.

---

## Three reading layers

Read broad context first, specific source last. Specific source stays freshest in working memory when you start typing.

### Layer 1 — Skill + reference docs

- This skill's [SKILL.md](../SKILL.md) — architecture decisions, physics choice
- Relevant reference per the table in SKILL.md (spritesheets, tilemaps, raycasting, keyboard, performance)
- [game-patterns.md](game-patterns.md) — before reaching for a one-off, check if a pattern already fits

### Layer 2 — The game you're touching

- `app/games/<slug>/config.ts` — scene list, resolution, scale mode
- `app/games/<slug>/data.ts` — constants (tile sizes, HUD offsets, RENDER_W/H)
- `app/games/<slug>/scenes/boot.ts` — every texture/audio key this game loads
- The **specific scene file** you will edit — its full current source, not a skim

### Layer 3 — Shared helpers you'll touch

- `app/games/shared/` — every file relevant to your change (viewport, touch-controls, responsive-scale, i18n, hud, rng)
- Read the **function signature and JSDoc** for each helper you call, not just the name

**Anti-pattern.** Reading only the scene you're editing. You'll miss that `enableResponsiveScale()` already handles what you're about to reimplement.

---

## Pre-implementation output

Before writing any code, output a short plan that names:

1. **Files to modify** — each file + which function/hook you'll change
2. **Files to create** — purpose of each
3. **Asset keys you'll add** — must also land in the game's Boot preload
4. **Scene keys you'll add** — must also land in the game's `config.ts` scene array
5. **Shared helpers you'll use** — and the signature you already read

If you can't list these concretely, you haven't read enough yet. Go back to Layer 2 or 3.

---

## Hard rules while coding

- **Never invent type names or method signatures.** If you don't remember, re-read. `Phaser.Physics.Arcade.Sprite` vs `Phaser.Physics.Arcade.Image` is a common silent trap.
- **Never write `// Assuming X works like Y`.** Stop and verify.
- **Never copy a pattern from another game without reading the source.** Games here are heterogeneous (raycaster, card game, match, platformer) — what works in Snake may be wrong in Dungeon Cast.
- **Follow the audit.** Before declaring the work done, run the relevant proactive checks in [pre-release-audit.md](pre-release-audit.md) (P1 asset keys, P2 scene registration at minimum).

---

## When to break these rules

When the user asks for a throwaway experiment or a 5-minute prototype, skip Layer 1/3 and just read the single scene you're changing. But if the change is merging to main, full protocol.
