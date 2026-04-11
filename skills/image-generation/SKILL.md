# Image Generation & Asset Pipeline

Generuj game assety přes Google Gemini API a zpracuj je do finálních sprite souborů.

## Tool

```bash
GEMINI_API_KEY=$(grep GEMINI_API_KEY .env | cut -d= -f2) \
  node tools/generate-image.mjs "<prompt>" [--out <path>] [--aspect <ratio>] [--model <name>] [--count <n>] [--ref <image>]
```

## Modely

| Model                            | Poznámka                         |
| -------------------------------- | -------------------------------- |
| `gemini-3-pro-image-preview`     | **Default** — nejlepší kvalita   |
| `gemini-3.1-flash-image-preview` | Rychlejší                        |
| `imagen-4.0-generate-001`        | Imagen 4, podporuje `--negative` |

## Aspect ratios

`1:1` | `16:9` | `9:16` | `4:3` | `3:4`

---

## Asset Pipeline (POVINNÝ WORKFLOW)

### Krok 1: Generuj přes Gemini

Pro **sprite sheet** (více assetů najednou):

```bash
node tools/generate-image.mjs \
  "Pixel art sprite sheet of 8 breakout bricks in horizontal row, evenly spaced on pure black background. Colors: pink, red, orange, gold, green, cyan, blue, purple. Each brick ~2.5:1 aspect ratio, neon style, dark outline. No text." \
  --out public/assets/games/breakout/bricks-sheet.png \
  --aspect 4:3
```

Pro **jednotlivý asset**:

```bash
node tools/generate-image.mjs \
  "Pixel art paddle bar for breakout game. Neon cyan, wide flat rectangle, white highlight, dark outline, glow. Pure black background. No text." \
  --out public/assets/games/breakout/paddle-raw.png \
  --aspect 16:9
```

#### Promptovací pravidla

- **Vždy specifikuj pozadí**: `pure black background` (pro tmavé hry) nebo `pure white background` (pro světlé)
- **Vždy `No text, no other elements`** — jinak Gemini přidá random text
- **Specifikuj proporce**: `~2.5:1 aspect ratio`, `7 times wider than tall`
- **Styl**: `pixel art`, `8-bit`, `retro arcade`, `neon glowing`
- **Barvy PixelDen**: cyan `#00FFF2`, magenta `#FF00E4`, dark bg `#0A0E17`
- **Aspect ratio volba**: `4:3` pro sprite sheety, `16:9` pro široké assety (paddle), `1:1` pro čtvercové (ball, ikony)

### Krok 2: Zpracuj přes `process-sprites.mjs`

**VŽDY** po generování zpracuj obrázek. Gemini generuje velké obrázky (~1408x768) s hodně prázdného prostoru.

```bash
node tools/process-sprites.mjs <input> [options]
```

**Options:**
| Flag | Popis |
|------|-------|
| `--out <path>` | Výstupní cesta (default: přepíše input; s `--split`: prefix) |
| `--bg <black\|white>` | Barva pozadí k odstranění (default: auto-detect) |
| `--threshold <n>` | Práh detekce (default: 20) |
| `--split` | Rozřež sheet na jednotlivé sprity |
| `--names <a,b,c>` | Jména pro split sprity (default: 0,1,2...) |
| `--square` | Paduj na čtverec |
| `--pad <n>` | Padding kolem obsahu (default: 2) |
| `--no-crop` | Přeskoč crop |
| `--no-transparent` | Přeskoč odstranění pozadí |

#### Jednotlivý asset

```bash
node tools/process-sprites.mjs raw-paddle.png \
  --out public/assets/games/breakout/paddle.png \
  --bg black
```

#### Sprite sheet → jednotlivé soubory

```bash
node tools/process-sprites.mjs sheet-raw.png \
  --split --names head,body,corner,tail \
  --out public/assets/games/snake/snake \
  --bg white --square
```

#### Dvouprůchodové zpracování (bílý sheet s černým pozadím spritů)

```bash
# 1. Rozřež sheet (odstraní bílé bg)
node tools/process-sprites.mjs sheet-raw.png \
  --split --names head,body,tail \
  --out public/assets/games/snake/snake \
  --bg white --square

# 2. Odstraň černé bg z každého spritu
for name in head body tail; do
  node tools/process-sprites.mjs "public/assets/games/snake/snake-${name}.png" \
    --bg black --threshold 8 --no-crop
done
```

Tool automaticky konvertuje JPEG/WebP na PNG (přes macOS `sips`).

### Krok 3: Cleanup

```bash
# Smaž raw/sheet soubory, nechej jen finální assety
rm -f *-raw.png *-sheet.png *-gen.png *-new.png
```

---

## Kam ukládat finální assety

| Typ                | Cesta                                           |
| ------------------ | ----------------------------------------------- |
| Game sprites       | `public/assets/games/{slug}/{asset}.png`        |
| Game thumbnail     | `public/assets/games/{slug}/thumbnail.png`      |
| Hero banner        | `public/assets/placeholders/hero-banner.png`    |
| Placeholder thumbs | `public/assets/placeholders/game-thumb-{n}.jpg` |

---

## Důležité: Phaser sprite sizing

Gemini generuje velké obrázky (800-1400px). V Phaseru se zobrazují malé (40x16, 80x12, atd).

**VŽDY v kódu:**

```typescript
sprite.setDisplaySize(TARGET_W, TARGET_H);
// Pro dynamic body:
sprite.body!.setSize(TARGET_W, TARGET_H);
// Pro STATIC body (bricks) — POVINNÉ:
(sprite.body as Phaser.Physics.Arcade.StaticBody).setSize(W, H);
(sprite.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
```

Bez `updateFromGameObject()` na static bodies bude physics hitbox na špatné pozici!

---

## Reference images

Pro style-matching přidej `--ref`:

```bash
node tools/generate-image.mjs "new brick style matching reference" \
  --ref public/assets/games/breakout/brick-0.png \
  --out public/assets/games/breakout/brick-new.png
```
