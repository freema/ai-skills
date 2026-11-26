---
name: android-device-testing
description: "Test a web app or browser game on a real Android phone over adb instead of trusting DevTools emulation. The agent reaches the local build through adb reverse and drives Chrome over the DevTools protocol for rects, console output, LCP/CLS and FPS. It taps with real touches in physical pixels, checks that the phone is awake and unlocked first, treats a personal phone with care and reports what was measured and what was not. Use it when someone says \"test on the phone\", \"real device\", \"on my Android\" or \"adb\", or in Czech \"otestuj na telefonu\", \"na skutečném telefonu\", \"přes adb\" or \"zkus to na mobilu\"."
---

# Android device testing over adb

Emulation lies about the things that break on phones. DevTools device mode and
headless Chrome with a phone viewport give you the right CSS width, but not:

- the real **device pixel ratio** and how pixel art or thin text rasterises at it;
- the real **CPU and GPU** (a budget phone renders a "60 FPS" game at 10–30);
- the real **browser chrome**: toolbar height, the toolbar hiding on scroll,
  system bars, an "offline" or "translate this page?" strip eating 20+ px;
- **touch**: where a finger actually lands, hit areas, double-tap zoom,
  fullscreen and the back button;
- **installed-app mode** (PWA/TWA, `display-mode: standalone`) — Chrome ignores
  `Emulation.setEmulatedMedia` for `display-mode`, so it cannot be faked.

So: build the layout in emulation, **decide on the phone**. If a check matters
for the verdict and the phone was not available, say so in the report.

## 0. Before anything: is the phone usable?

```bash
adb devices -l                       # note the serial of the physical phone
S=<serial>                           # always scope every command: adb -s "$S" ...
adb -s "$S" shell dumpsys power | grep -E 'mWakefulness='          # Awake / Asleep / Dozing
adb -s "$S" shell dumpsys window | grep -E 'isKeyguardShowing|mDreamingLockscreen|mShowingLockscreen'
```

- **Always pass `-s <serial>`.** A stale or offline emulator left in the list
  makes every unscoped command fail with `more than one device/emulator`.
- **Asleep, dozing or keyguard showing → stop and tell the human.** A locked or
  dozing phone gives black screenshots that look exactly like a rendering bug,
  and throttles `requestAnimationFrame`, so FPS and paint timings are garbage.
  DevTools `eval` may still answer with layout numbers; screenshots will not.
- **Never unlock the phone, never wake it with key events, never change a
  setting.** Ask the owner to unlock it, keep it plugged in and keep the screen
  on for the session. Field names differ between Android versions; if none of
  the greps prints anything, treat the state as unknown and check the first
  screenshot for an all-black frame (§5) before trusting it.

Record the conditions you find and do not "fix" them: battery saver, dark
mode, rotation lock (`settings get system accelerometer_rotation` reads it;
`0` = locked), no network. They change results — put them in the report.

## 1. Connect

```bash
PORT=5173                                       # your dev or preview server port
adb -s "$S" reverse tcp:$PORT tcp:$PORT         # phone's localhost:$PORT -> your machine
adb -s "$S" forward tcp:9222 localabstract:chrome_devtools_remote
curl -s http://localhost:9222/json/version      # Chrome on the phone answers
curl -s http://localhost:9222/json/list         # its tabs (type, url, webSocketDebuggerUrl)
```

Open the page in a tab **you** own, so you can close it afterwards:

```bash
curl -s -X PUT "http://localhost:9222/json/new?http://localhost:$PORT/"   # returns the new target's id
# or through Android itself (may reuse the current tab):
adb -s "$S" shell am start -a android.intent.action.VIEW -d "http://localhost:$PORT/" com.android.chrome
```

Measure a **production build** served locally (`build` + `preview`/`start`),
not the dev server: dev mode ships unminified modules and its timings mean
nothing. Through `adb reverse` there is no real network, so LCP is only valid
as a before/after comparison on the same phone, not as a field number.

Mark the phone's viewport once per session — it is not the spec sheet value:

```bash
node scripts/cdp.mjs eval 'innerWidth+"x"+innerHeight+" dpr "+devicePixelRatio+" vv "+visualViewport.height'
```

Repeat after anything that changes the browser chrome (scroll that hides the
toolbar, rotation, fullscreen, an info bar appearing).

## 2. Drive Chrome over the DevTools protocol

`scripts/cdp.mjs` is a dependency-free client (Node 22+, global `WebSocket`):

```bash
node scripts/cdp.mjs targets                       # list tabs
node scripts/cdp.mjs eval '<js expression>'        # in the first tab whose URL matches $CDP_MATCH (default "localhost")
node scripts/cdp.mjs console 10                    # print console + exceptions for 10 s
node scripts/cdp.mjs center 'button.play'          # element centre in CSS px + DPR
node scripts/cdp.mjs close                         # close the matched tab
```

For richer runs use puppeteer-core against the same endpoint —
`puppeteer.connect({ browserURL: "http://localhost:9222" })`; see
`scripts/phone-probe.mjs`, which prints the first-screen metrics of §4 as JSON.
Do not call `page.setViewport` or emulation on the phone: you would be
emulating on a real device and lose the point of it.

Typing: `adb shell input text` does not reach inputs in Chrome reliably. Focus
the field and use CDP `Input.insertText` instead (puppeteer: `page.keyboard.sendCharacter`).

## 3. Real touches in physical pixels

`adb shell input tap X Y` and `input swipe X1 Y1 X2 Y2 MS` take **physical
screen pixels**, origin at the top-left of the display (status bar included):

```
x = cssX × DPR + offsetX        (offsetX is 0 in portrait)
y = cssY × DPR + offsetY        (offsetY = status bar + browser toolbar + any info bar)
```

Do not guess `offsetY` from a spec — **calibrate it**:

```bash
node scripts/cdp.mjs eval 'window.__tap=null; addEventListener("pointerdown", e => window.__tap = {x: e.clientX, y: e.clientY}, {capture: true, once: true}); "armed"'
adb -s "$S" shell input tap 540 1400               # anywhere on page content
node scripts/cdp.mjs eval 'JSON.stringify(window.__tap)'
# offsetY = 1400 - tap.y × DPR ; offsetX = 540 - tap.x × DPR
```

Recalibrate whenever the toolbar hides, the phone rotates or fullscreen starts.
Tap the arming point on something inert (page background), not a link.

Then tap an element by its rect:

```bash
OX=0; OY=<calibrated offsetY>
read CX CY DPR < <(node scripts/cdp.mjs center '[data-testid=play]')
adb -s "$S" shell input tap $(node -e "console.log(Math.round($CX*$DPR+$OX), Math.round($CY*$DPR+$OY))")
```

Limits to report, not hide: `adb input` is **one finger**, and each command
takes a few hundred ms. Two-finger play (move + jump) and fast rhythm input
cannot be verified this way; CDP `Input.dispatchTouchEvent` can send several
touch points, but that is synthetic input, not a finger on glass. Say which
one you used.

## 4. What to measure

Probes are in `references/measurements.md` (copy-paste JS for `cdp.mjs eval`
or `phone-probe.mjs`). Typical set for a page:

- **First screen**: how many whole items (tiles, cards, products) fit, and the
  top edge of the first one — the number that tells whether the page "works"
  on a phone.
- **Smallest text** in CSS px, and text height in **physical** px (CSS × DPR)
  for anything drawn on a canvas (game HUDs scale with the canvas: 9 px in a
  540-wide canvas shown 384 wide is 6.4 CSS px).
- **Tap targets** under 44×44 CSS px (skip inline links inside running text).
- **Horizontal scroll**: `scrollWidth - innerWidth` must be 0.
- **LCP and CLS** via `PerformanceObserver`, before any touch, 5 reloads,
  report median and range, plus the LCP element.
- **FPS** while it animates: count `requestAnimationFrame` callbacks over 5 s.
  Values cluster at 60/30/20/15 (vsync halving). If the engine caps its own
  frame rate, rAF overstates — read the engine's own counter if it exposes one.
- **Console errors and failed requests** for the whole visit (`cdp.mjs console`).
- **Flows**: taps from landing to the core action, fullscreen → back → back,
  rotation, the page in a longer language (German/Spanish run ~5 % longer).

Write every number with its conditions: phone model class, browser version,
viewport, DPR, build, network state, battery saver.

## 5. Screenshots

```bash
adb -s "$S" exec-out screencap -p > shot.png        # exec-out, not shell: no CRLF mangling
```

If you must not load images into your own context (some agent setups crash or
waste tokens on large PNGs), analyse them by script and hand the files to a
human or a review page:

```bash
magick shot.png -format '%[fx:mean] %[fx:standard_deviation]\n' info:   # ~0 0 => all black: phone asleep, not a bug
magick shot.png -resize 540x shot-s.jpg                                 # small copy for a PR or review page
```

CDP `Page.captureScreenshot` captures only the page (no browser chrome) and is
the better choice for "what does the layout look like"; `screencap` shows what
the user sees, toolbar and system bars included.

## 6. Etiquette on a personal phone

The phone usually belongs to a person who will pick it up after you.

- No settings changes — not Wi-Fi, not rotation, not battery saver, not
  developer options. If the test needs network or rotation, ask.
- Nothing installed or uninstalled without explicit permission (installing the
  PWA to test standalone mode is a permission question; say in the report that
  it is installed).
- Back key (`input keyevent KEYCODE_BACK`) only while your page is in front;
  never navigate the launcher, other apps, notifications or the lock screen.
- Keep audio off: mute in the page (`HTMLMediaElement.prototype.play` stub or
  the app's mute) before starting a game; never leave a game running.
- When done: close your own tabs, `adb -s "$S" reverse --remove-all`,
  `adb -s "$S" forward --remove-all`.

## 7. Report honestly

A report has three kinds of statements; keep them apart:

1. **Measured on the phone** — with the number and conditions.
2. **Derived** — from code, or from headless emulation (say which).
3. **Not checked** — and why ("phone was locked; layout numbers via DevTools
   only, no screenshots, nobody looked at it").

Never silently replace a phone check with emulation. "Not tested on the phone,
it was locked" is a useful sentence; a green checkmark from device mode is not.

## 8. From an orchestrator with subagents

- **One agent on the phone at a time.** Two agents fighting over the same tab,
  port forward or touch stream produce nonsense.
- Tell the owner **in advance** when the phone will be needed: unlocked, screen
  timeout long, plugged in, USB debugging allowed for this machine.
- Put §0, §6 and §7 verbatim into every subagent brief that touches the phone,
  plus the serial, the port and the measured `offsetY`.
- If the phone is not connected, the agent says so and continues with what
  does not need it; the PR or report lists the phone checks as open.

## Files

- `scripts/cdp.mjs` — minimal DevTools client: targets, eval, console, centre, close.
- `scripts/phone-probe.mjs` — puppeteer-core `connect({browserURL})`, first-screen
  metrics and rects of the matched tab as JSON (diff two runs to prove "unchanged").
- `references/measurements.md` — the JS probes and how to read them.
