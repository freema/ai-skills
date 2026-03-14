# Keyboard Input in Phaser 3 (Embedded in React/SPA)

## CRITICAL: Never preventDefault Before Phaser

Phaser 3's `KeyboardManager.onKeyDown` **skips events where `event.defaultPrevented` is true**:

```javascript
// Phaser source — KeyboardManager.js
this.onKeyDown = function (event) {
    if (event.defaultPrevented || !_this.enabled || !_this.manager) {
        return;  // SKIPS THE ENTIRE EVENT
    }
    // ... process key
};
```

**NEVER call `preventDefault()` on keyboard events before Phaser processes them.**
This means NO external `window.addEventListener("keydown", ...)` that calls `preventDefault`.

Source: [Phaser KeyboardManager source](https://github.com/phaserjs/phaser/blob/master/src/input/keyboard/KeyboardManager.js)

---

## How It Works

All games use `keyboard.target: window` in Phaser config. Phaser listens on `window` — canvas focus is irrelevant.

**Scroll prevention** is handled by Phaser's `addCapture()` in each game scene — NOT by external handlers. `addCapture` tells Phaser to call `preventDefault` on those keys AFTER processing them.

The React wrapper (`games.$slug.tsx`) does NOT add any keyboard event listeners.

---

## Game Config (required)

```typescript
input: {
  keyboard: {
    target: window, // listen on window, not canvas
  },
},
```

---

## addCapture — Prevent Browser Defaults

Each scene MUST capture ALL keys it uses (or that could scroll the page):

```typescript
// In scene create():
this.input.keyboard!.addCapture([
  Phaser.Input.Keyboard.KeyCodes.SPACE,
  Phaser.Input.Keyboard.KeyCodes.UP,
  Phaser.Input.Keyboard.KeyCodes.DOWN,
  Phaser.Input.Keyboard.KeyCodes.LEFT,
  Phaser.Input.Keyboard.KeyCodes.RIGHT,
  Phaser.Input.Keyboard.KeyCodes.W,
  Phaser.Input.Keyboard.KeyCodes.A,
  Phaser.Input.Keyboard.KeyCodes.S,
  Phaser.Input.Keyboard.KeyCodes.D,
]);
```

This must be done in EVERY scene (Menu AND Game), because captures are scene-specific.

---

## Game Navigation (reloadDocument)

All links to `/games/$slug` MUST use `reloadDocument` (or `window.location.href`).
Phaser leaks window keyboard listeners on destroy — only hard reload guarantees clean state.
`games.$slug.tsx` has a safety fallback (`activeGameSlug` module-level flag) that forces reload.

---

## SPACE Key

### Never duplicate SPACE Key objects:
```typescript
// BAD — createCursorKeys already creates .space
this.cursors = this.input.keyboard!.createCursorKeys();
this.spaceKey = this.input.keyboard!.addKey(KeyCodes.SPACE); // CONFLICT!

// GOOD — reuse from createCursorKeys
this.cursors = this.input.keyboard!.createCursorKeys();
this.spaceKey = this.cursors.space!;
```

### Use manual rising-edge instead of JustDown:
```typescript
const flapDown = this.spaceKey?.isDown || this.wKey?.isDown;
const flapJustPressed = flapDown && !this.flapWasDown;
this.flapWasDown = !!flapDown;
```

---

## Checklist

1. Game config has `input.keyboard.target: window`
2. **NO external `preventDefault` on keyboard events** (React wrapper, window handlers)
3. Each scene calls `addCapture([...allGameKeys])` in `create()`
4. No duplicate `addKey(SPACE)` when `createCursorKeys()` already creates it
5. All links to `/games/$slug` use `reloadDocument`
6. Use manual rising-edge detection instead of `JustDown`

---

## Anti-patterns

| Anti-pattern | Problem |
|---|---|
| External `window.addEventListener("keydown", e => e.preventDefault())` | Phaser checks `defaultPrevented` and SKIPS the event entirely |
| `game.events.removeAllListeners()` before destroy | Strips Phaser internals, leaks window keyboard listeners |
| `JustDown()` for critical inputs | Misses events in edge cases |
| Duplicate `addKey(SPACE)` + `createCursorKeys()` | Key object conflict |
| SPA navigation between games (no `reloadDocument`) | Ghost keyboard handlers accumulate |
