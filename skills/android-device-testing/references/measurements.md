# Measurement probes

Each probe is one expression for `node scripts/cdp.mjs eval '…'` (or
`page.evaluate` in puppeteer-core). They read the phone's real layout; adjust
selectors to the app. Run page-load probes **after `load` and before any
touch**, otherwise scrolls and taps count as input and hide layout shifts.
Every eval runs in the page's global scope: keep probes inside an IIFE or a
promise, so a second run does not fail on a redeclared `const`.

## Viewport and chrome

```js
JSON.stringify({ w: innerWidth, h: innerHeight, dpr: devicePixelRatio,
  vvH: visualViewport.height, vvTop: visualViewport.offsetTop,
  screenH: screen.height, standalone: matchMedia("(display-mode: standalone)").matches })
```

The same phone reports different heights with the toolbar shown, hidden, in
fullscreen and with an info bar (offline, translate) — note which one you
measured. `standalone` is only true in a really installed app.

## Whole items on the first screen

```js
(() => {
  const r = [...document.querySelectorAll('a[href] img')].map((i) => i.closest('a').getBoundingClientRect());
  const whole = r.filter((x) => x.top >= 0 && x.bottom <= innerHeight && x.width > 0);
  return JSON.stringify({ whole: whole.length, firstTop: Math.round(Math.min(...r.map((x) => x.top))),
    pageHeight: document.documentElement.scrollHeight });
})()
```

Good numbers to compare against a competitor or the old version on the same
phone: whole items above the fold, top edge of the first item, page height of a
long listing.

## Smallest text and small tap targets

```js
(() => {
  let min = 99;
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) {
    const el = w.currentNode.parentElement;
    if (!w.currentNode.textContent.trim() || !el.getClientRects().length) continue;
    min = Math.min(min, parseFloat(getComputedStyle(el).fontSize));
  }
  const small = [...document.querySelectorAll('a,button,summary,input,select')]
    .filter((e) => !e.closest('p'))
    .map((e) => ({ e, r: e.getBoundingClientRect() }))
    .filter(({ r }) => r.width > 0 && (r.width < 44 || r.height < 44))
    .map(({ e, r }) => `${e.tagName} ${Math.round(r.width)}x${Math.round(r.height)} ${(e.textContent || '').trim().slice(0, 20)}`);
  return JSON.stringify({ minFont: min, smallCount: small.length, small: small.slice(0, 30) });
})()
```

Links inside running text are excluded on purpose (WCAG target-size exempts
inline links); buttons, chips, nav, tiles and form controls are not.

Canvas text (games): CSS size = font size in game pixels × (canvas CSS width ÷
game width). Physical size = CSS size × DPR. A 9 px HUD font in a 540-wide game
shown 384 CSS px wide is 6.4 CSS px — unreadable, though the code says "9px".

## Contrast

Compute from computed colours, not from design tokens: walk up the ancestors,
composite every semi-transparent background onto the first opaque one, and
apply the WCAG formula. Colours in `oklch()`/`color-mix()` come back from
`getComputedStyle` in that syntax — parse them by painting into a 1×1 canvas
(`ctx.fillStyle = c; ctx.fillRect(0,0,1,1); ctx.getImageData(0,0,1,1).data`).
Text over an image or gradient cannot be computed; judge it from a screenshot
and say so.

## Horizontal scroll

```js
document.documentElement.scrollWidth - innerWidth   // must be 0
```

## LCP and CLS (5 reloads, take the median)

```js
new Promise((resolve) => {
  let lcp = 0, cls = 0, el = '';
  new PerformanceObserver((l) => l.getEntries().forEach((e) => { lcp = e.startTime; el = e.element?.tagName + ' ' + (e.url || ''); }))
    .observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) cls += e.value; }))
    .observe({ type: 'layout-shift', buffered: true });
  setTimeout(() => resolve(JSON.stringify({ lcp: Math.round(lcp), el, cls: +cls.toFixed(3) })), 3000);
})
```

Reload with `cdp.mjs eval 'location.reload()'`, wait for `load` plus ~1.5 s,
then run the probe. Over `adb reverse` from localhost these are comparison
numbers (before/after on the same phone), not field data. Lighthouse's
simulated throttling can move the opposite way from real paint timings on the
phone; when they disagree, the phone decides and the report says why.

## FPS while animating

```js
new Promise((resolve) => { let n = 0; const t0 = performance.now();
  const f = () => { n++; if (performance.now() - t0 < 5000) requestAnimationFrame(f); else resolve((n / 5).toFixed(1)); };
  requestAnimationFrame(f); })
```

- Measure during the interaction that matters (gameplay, scrolling a heavy
  list), not on a static menu, and say which screen.
- Results cluster at 60 / 30 / 20 / 15 / 12 / 10: a frame that takes slightly
  over 16.7 ms waits for the next vsync. A game at 30 often needs only a few ms
  saved to reach 60.
- If the engine caps its own frame rate (e.g. a 30 FPS limit), rAF still runs
  at display rate and overstates. Prefer the engine's measured FPS when it is
  reachable (`window.<debugHandle>`), or a measurement mode the app exposes
  behind a URL flag.
- A blank page on the same phone is the ceiling (usually 60); measure it once.
- A locked or dozing screen throttles rAF to nothing — another reason for §0.

## Console and failed requests

`node scripts/cdp.mjs console 10` while you reload or play. Offline phones log
analytics and avatar request failures; list them separately from real errors.

## Flow checks (by hand, with real taps)

- Taps from landing page to the core action (e.g. page → Play → in game).
- Time from the action to usable state (median of 3).
- Fullscreen → back → back: first back should leave fullscreen and stay, the
  second should go to the previous page.
- Rotation prompt and layout in landscape (only if rotation is unlocked — do not
  unlock it yourself).
- One run in the longest UI language for overflowing chips and buttons.
