---
name: pixelart-cleanup
description: Use when the user wants to clean halo fragments or
  imperfect alpha from native-resolution pixel art sprites (PixelLab,
  Aseprite, or handmade). Invokes the Node/TypeScript CLI at
  scripts/pixelart-cleanup. Do NOT trigger for upscaled AI pixel art
  where one logical pixel spans many real pixels — that needs grid
  detection instead.
---

## When to trigger

- User mentions "halo", "ghost pixels", "semi-transparent fringing", or "alpha cleanup"
- User ran PixelLab and wants to post-process the output before committing assets
- User says sprites look blurry or have faint artifacts around edges

## Invocation examples

**Single file:**

```bash
cd scripts/pixelart-cleanup
pnpm start -- -i ../../public/assets/games/my-game/sprite.png -o ./test-samples/output --verbose
```

**Batch folder:**

```bash
cd scripts/pixelart-cleanup
pnpm start -- -i ../../public/assets/games/my-game/ -o ../../public/assets/games/my-game/ --verbose
```

_(When output == input dir, the cleaned files overwrite in place)_

## Tuning order

1. **Default** (`--alpha-threshold 32`, orphans on, min-size 1) — try this first
2. Specks remain → raise `--alpha-threshold 48` or `64`
3. Silhouette degraded → lower `--alpha-threshold 16`
4. Stray clumps remain → `--min-orphan-size 3`
5. Details disappearing → `--no-remove-orphans` as last resort

## Test samples

- Input: `scripts/pixelart-cleanup/test-samples/input/`
- Output: `scripts/pixelart-cleanup/test-samples/output/`
- Reference sprite: `bust-1.png` (64×96 PixelLab portrait)
  - Expected: `halo:~177  orphans:~23`

## Reading the report

```
bust-1.png  64x96  visible 3697 -> 3343  halo:177  orphans:23  12ms
```

- `visible before -> after` — sanity check; large drop means threshold is too aggressive
- `halo` — pixels killed by the alpha-threshold pass
- `orphans` — isolated pixels killed by connected-components pass
- If `halo` is 0 but you still see artifacts, the specks have alpha ≥ threshold — raise it
