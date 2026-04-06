# PixelLab API v2 — Game Dev Workflows

Practical workflows for common game development scenarios using PixelLab API v2.

---

## Workflow 1: Add animations to existing game

**Problem**: Game has static sprites but no walk/attack/idle animations.

```bash
# 1. Generate walk animation for all directions
for dir in south east north; do
  ./scripts/pixellab.sh animate \
    "public/assets/games/mygame/player-${dir}.png" \
    "walking forward" 8 \
    "public/assets/games/mygame/player-walk-${dir}"
done

# 2. Generate attack animation
./scripts/pixellab.sh animate \
  "public/assets/games/mygame/player-south.png" \
  "sword slash attack" 8 \
  "public/assets/games/mygame/player-attack"

# 3. Generate idle breathing
./scripts/pixellab.sh animate \
  "public/assets/games/mygame/player-south.png" \
  "idle breathing, subtle movement" 4 \
  "public/assets/games/mygame/player-idle"
```

**In Phaser** — load frames as individual images or combine into spritesheet:
```typescript
// Load individual frames
for (let i = 0; i < 8; i++) {
  this.load.image(`walk-${i}`, `assets/games/mygame/player-walk-south/frame-${i}.png`);
}

// Create animation
this.anims.create({
  key: 'walk-south',
  frames: Array.from({ length: 8 }, (_, i) => ({ key: `walk-${i}` })),
  frameRate: 10,
  repeat: -1,
});
```

---

## Workflow 2: Fill missing enemy directions (Crystal TD pattern)

**Problem**: Enemies only have south + east sprites, need all 4 directions.

```bash
ENEMIES="golem ironclad slime specter spore"
GAME="public/assets/games/crystal-td"

for enemy in $ENEMIES; do
  # Rotate south → north
  ./scripts/pixellab.sh rotate \
    "$GAME/${enemy}.png" south north \
    "$GAME/${enemy}-north.png"

  # Rotate south → west (or flip east in Phaser)
  ./scripts/pixellab.sh rotate \
    "$GAME/${enemy}.png" south west \
    "$GAME/${enemy}-west.png"
done
```

**In Phaser** — use flipX for west if east exists:
```typescript
// Cheaper alternative: flip east sprite for west
if (direction === 'west') {
  sprite.setTexture(`${enemy}-east`);
  sprite.setFlipX(true);
} else {
  sprite.setTexture(`${enemy}-${direction}`);
  sprite.setFlipX(false);
}
```

---

## Workflow 3: Generate game UI set

**Problem**: Need consistent UI elements for a game.

```bash
GAME="public/assets/games/mygame"
PALETTE="dark grey and cyan"  # match PixelDen theme

# Button (normal state)
./scripts/pixellab.sh generate-ui \
  "pixel art game button, dark stone with cyan glow border, flat, clean" \
  192x64 "$PALETTE" "$GAME/ui/button"

# Health bar frame
./scripts/pixellab.sh generate-ui \
  "pixel art health bar frame, horizontal, ornate metal border, dark interior" \
  256x48 "red and dark metal" "$GAME/ui/healthbar"

# Inventory slot
./scripts/pixellab.sh generate-ui \
  "pixel art inventory slot, square, dark stone, subtle inner border" \
  64x64 "$PALETTE" "$GAME/ui/inv-slot"

# Dialog box frame
./scripts/pixellab.sh generate-ui \
  "pixel art dialog box frame, rectangular, dark background, decorated corners" \
  320x192 "$PALETTE" "$GAME/ui/dialog"

# Coin/currency icon
./scripts/pixellab.sh generate "pixel art gold coin, shiny, game currency icon" 32x32 "$GAME/ui/coin"
```

---

## Workflow 4: Style-consistent asset expansion

**Problem**: Need new enemies/items that match the existing game's art style.

```bash
GAME="public/assets/games/frost-hold"
REF="$GAME/player-south.png"  # use as style reference

# New enemy types matching player's style
./scripts/pixellab.sh style "$REF" "frost golem, large, icy blue" 48x48 "$GAME/frost-golem"
./scripts/pixellab.sh style "$REF" "ice spirit, floating, translucent" 48x48 "$GAME/ice-spirit"
./scripts/pixellab.sh style "$REF" "snow imp, small, mischievous" 32x32 "$GAME/snow-imp"

# New items
./scripts/pixellab.sh style "$REF" "frozen key, magical, glowing" 32x32 "$GAME/frozen-key"
./scripts/pixellab.sh style "$REF" "ice potion bottle, blue liquid" 32x32 "$GAME/ice-potion"
```

---

## Workflow 5: Sprite editing pipeline

**Problem**: Need to modify existing sprites (add equipment, recolor, etc.)

```bash
# Add equipment variations
./scripts/pixellab.sh edit player.png "add iron helmet and red cape" "player-armored"
./scripts/pixellab.sh edit player.png "add wizard hat and blue robe" "player-wizard"
./scripts/pixellab.sh edit player.png "add golden crown and royal cape" "player-king"

# Recolor enemies for difficulty tiers
./scripts/pixellab.sh edit slime.png "recolor to red, angry expression" "slime-red"
./scripts/pixellab.sh edit slime.png "recolor to gold, glowing aura" "slime-gold"

# Remove backgrounds if needed
./scripts/pixellab.sh remove-bg sprite-with-bg.png sprite-clean.png
```

---

## Workflow 6: Resize assets between games/contexts

**Problem**: Sprite is 32px but game needs 64px (or vice versa).

```bash
# Upscale (max 2x per call)
./scripts/pixellab.sh resize small-knight.png 64x64 "pixel art knight character"

# Downscale
./scripts/pixellab.sh resize large-dragon.png 48x48 "pixel art dragon enemy"
```

**Important**: Max 2x increase or 50% decrease per call. For bigger changes, chain:
```bash
# 32px → 64px → 128px (two steps)
./scripts/pixellab.sh resize sprite-32.png 64x64 "wizard" sprite-64.png
./scripts/pixellab.sh resize sprite-64.png 128x128 "wizard" sprite-128.png
```

---

## Tips for all workflows

1. **Check results visually** before integrating — AI generation isn't perfect
2. **Use seed** (edit script) when you need reproducible results across directions
3. **Generate multiple and pick best** — generate at smaller size for more variants
4. **Style matching** produces most consistent results when reference image is clean and clear
5. **Animation actions** — describe the movement, not the pose ("walking" not "left foot forward")
6. **Output goes to test-api/ by default** — move to game assets dir after review
