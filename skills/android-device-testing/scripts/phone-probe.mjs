// First-screen metrics of the page open in Chrome on a real phone, over CDP.
//
//   adb -s <serial> forward tcp:9222 localabstract:chrome_devtools_remote
//   npm i puppeteer-core            (in a scratch folder, not the app under test)
//   node phone-probe.mjs [urlSubstring] [out.json]
//
// Connects with puppeteer.connect({ browserURL }) — no emulation, the phone's real
// viewport and DPR are what gets measured. Prints viewport, whole items on the first
// screen, smallest text, small tap targets, horizontal scroll, LCP/CLS and the rects
// of every visible element on the first screen (diff two runs to prove "unchanged").
import puppeteer from "puppeteer-core";
import fs from "node:fs";

const [, , match = "localhost", out] = process.argv;
const ITEM = process.env.ITEM_SELECTOR || "a[href] img"; // what counts as one item on a listing

const browser = await puppeteer.connect({ browserURL: process.env.CDP_URL || "http://localhost:9222", defaultViewport: null });
const pages = await browser.pages();
const page = pages.find((p) => p.url().includes(match));
if (!page) {
  console.error("no tab matching", match, pages.map((p) => p.url()));
  await browser.disconnect();
  process.exit(1);
}

const vitals = await page.evaluate(
  () =>
    new Promise((resolve) => {
      let lcp = 0, el = "", cls = 0;
      new PerformanceObserver((l) => l.getEntries().forEach((e) => { lcp = e.startTime; el = e.element ? e.element.tagName + " " + (e.url || e.element.textContent.trim().slice(0, 40)) : ""; }))
        .observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) cls += e.value; }))
        .observe({ type: "layout-shift", buffered: true });
      setTimeout(() => resolve({ lcp: Math.round(lcp), lcpElement: el, cls: +cls.toFixed(3) }), 3000);
    }),
);

const metrics = await page.evaluate((itemSel) => {
  const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none"; };
  const items = [...document.querySelectorAll(itemSel)].map((i) => (i.closest("a") || i).getBoundingClientRect());
  const whole = items.filter((r) => r.top >= 0 && r.bottom <= innerHeight && r.width > 0);
  let minFont = 99;
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) {
    const el = w.currentNode.parentElement;
    if (!el || !w.currentNode.textContent.trim() || !el.getClientRects().length || !vis(el)) continue;
    minFont = Math.min(minFont, parseFloat(getComputedStyle(el).fontSize));
  }
  const small = [...document.querySelectorAll("a,button,summary,input,select,[role=button]")]
    .filter((e) => vis(e) && !e.closest("p"))
    .map((e) => ({ e, r: e.getBoundingClientRect() }))
    .filter(({ r }) => r.width < 44 || r.height < 44)
    .map(({ e, r }) => {
      const label = (e.getAttribute("aria-label") || e.textContent || "").trim().slice(0, 24);
      return e.tagName + " " + Math.round(r.width) + "x" + Math.round(r.height) + " " + label;
    });
  const rects = [...document.querySelectorAll("body *")]
    .filter((e) => { const r = e.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0 && r.width > 0 && r.height > 0 && !e.closest("svg"); })
    .map((e) => {
      const r = e.getBoundingClientRect();
      const box = [r.x, r.y, r.width, r.height].map((v) => Math.round(v * 10) / 10);
      return e.tagName + " " + box.join(",");
    });
  return {
    viewport: `${innerWidth}x${innerHeight}`,
    dpr: devicePixelRatio,
    visualViewportHeight: visualViewport?.height,
    wholeItems: whole.length,
    firstItemTop: items.length ? Math.round(Math.min(...items.map((r) => r.top))) : null,
    pageHeight: document.documentElement.scrollHeight,
    hScroll: document.documentElement.scrollWidth - innerWidth,
    minFont,
    smallTargetsN: small.length,
    smallTargets: small.slice(0, 20),
    rects,
  };
}, ITEM);

const result = { url: page.url(), at: new Date().toISOString(), ...vitals, ...metrics };
const { rects, ...summary } = result;
console.log(JSON.stringify(summary, null, 1));
if (out) fs.writeFileSync(out, JSON.stringify(result, null, 1));
await browser.disconnect(); // never close(): that would close Chrome on the phone
