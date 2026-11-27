# Sweep of all pages

Run after every larger visual change and before the release PR. All public
pages in the main language, home and one entity page in a second language,
signed-in pages with a test account. Viewports: phone (e.g. 384×727, DPR ~2.8,
`isMobile`, `hasTouch`, a phone user agent), 1024×768, 1440×900, 1920×1080.
Headless Chrome launched with `--mute-audio` (and `HTMLMediaElement.prototype.play`
stubbed) so no page or game makes sound on the machine.

## Checklist

- [ ] Each entity is shown the same way everywhere (its tile icon, not an old
      thumbnail) — old images only where a wide image is required (OG, JSON-LD,
      article covers) or as a fallback.
- [ ] No old effects: glow, neon, `backdrop-filter`, coloured shadows,
      gradients, scanlines, old accent colours outside content.
- [ ] Text ≥ 12 px; display/pixel font ≥ 18 px; targets ≥ 44 px on phone
      (inline links in running text excluded).
- [ ] Contrast ≥ 4.5:1 from computed colours (parse `oklch()` through a canvas).
- [ ] No horizontal scroll; desktop column ≤ max width and left edges aligned
      with the top bar.
- [ ] Controls in one row have the same height and baseline (filters, toggles).
- [ ] Hover and focus-visible states present.
- [ ] Console clean: no errors, no hydration warnings, no 4xx/5xx, no broken
      images (`complete && naturalWidth === 0`).
- [ ] One h1 per page, no skipped heading levels, headings use the type roles.
- [ ] CLS ≤ 0.05; LCP and CLS of home, a listing and an entity page compared
      with main on a production build (median of 5).
- [ ] SEO output (title, meta, canonical, hreflang, JSON-LD, sitemap) identical
      to main (`seo-snapshot.mjs` + `diff`).
- [ ] Home at phone size shows the target number of whole items.
- [ ] Real phone over `adb reverse`: home, entity page, the two most used
      secondary pages — in every state of SKILL.md §5 (resting scroll, URL bar
      shown and hidden, consent bar up, 360 px, 130 % root font, keyboard open).
- [ ] With the keyboard open: the field and its send button are inside
      `visualViewport`; sending keeps the keyboard up; board and controls move
      0 px when a message, hint or error appears.
- [ ] Fixed bars cover no control the player needs next; the last control
      scrolls clear of them.
- [ ] Overlays: modals, toasts, prompts, cookie bar (fake the trigger if needed,
      and say so).

## In-page probe (excerpt)

Run per page × viewport with puppeteer `page.evaluate`; collect into one JSON
and print a table of failures only.

```js
(() => {
  const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity !== 0; };
  const out = {};
  const small = [], pixel = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) {
    const el = w.currentNode.parentElement;
    if (!el || !w.currentNode.textContent.trim() || !vis(el)) continue;
    if (el.closest('script,style,noscript,.sr-only,details:not([open]) > :not(summary)')) continue;
    const cs = getComputedStyle(el), px = parseFloat(cs.fontSize), t = w.currentNode.textContent.trim().slice(0, 30);
    if (px < 12) small.push(px + 'px ' + t);
    if (/DISPLAY_FONT_NAME/i.test(cs.fontFamily.split(',')[0]) && px < 18) pixel.push(px + 'px ' + t);
  }
  out.smallText = small.slice(0, 12);
  out.smallDisplayFont = pixel.slice(0, 12);
  out.hScroll = document.documentElement.scrollWidth - innerWidth;
  out.broken = [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.getAttribute('src')).map((i) => i.getAttribute('src'));
  // Entity images that are not the canonical icon (adjust both patterns to your naming).
  out.oldImages = [...document.images].filter((i) => /\/assets\/entities\//.test(i.currentSrc) && !/\/icon-v\d/.test(i.currentSrc) && vis(i))
    .map((i) => i.currentSrc.replace(location.origin, ''));
  const fx = new Set();
  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el)) continue;
    const cs = getComputedStyle(el), tag = el.tagName.toLowerCase();
    if (cs.boxShadow !== 'none') fx.add('shadow ' + tag);
    if (cs.textShadow !== 'none') fx.add('text-shadow ' + tag);
    if (cs.backdropFilter && cs.backdropFilter !== 'none') fx.add('backdrop ' + tag);
    if (/gradient/.test(cs.backgroundImage)) fx.add('gradient ' + tag);
  }
  out.effects = [...fx].slice(0, 15);
  out.h1 = document.querySelectorAll('h1').length;
  const lv = [...document.querySelectorAll('main :is(h1,h2,h3,h4,h5,h6)')].map((h) => +h.tagName[1]);
  out.skips = lv.flatMap((l, i) => (i && l > lv[i - 1] + 1 ? [lv[i - 1] + '>' + l] : []));
  return out;
})()
```

Also record per page: HTTP status, console errors and failed requests
(`page.on('console' | 'pageerror' | 'requestfailed' | 'response')`), LCP/CLS
(probe in the android-device-testing skill), and a JPEG screenshot (scroll
through first so lazy images load).

## Reading the results

- An empty failure list is not "looks good". It means the measurable rules
  hold. Someone still has to look at the screenshots, and the report says
  whether anyone did.
- Desktop failures hide in averages: check 1024 (the narrowest desktop) and
  1920 (where max-width and alignment show) separately.
- Signed-in pages and states (empty, error, loading, locked items) need their
  own entries in the page list; the anonymous sweep never sees them.
