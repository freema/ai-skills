// Rects of every visible element on the first screen, per page, for a before/after diff.
//
//   npm i puppeteer-core            (in a scratch folder, not the app under test)
//   CHROME=/path/to/chrome node first-screen-rects.mjs <baseUrl> <out.json> /path1 /path2 ...
//   CDP_URL=http://localhost:9222 node first-screen-rects.mjs ...   # a connected phone instead
//
// Headless: a muted Chrome at a phone viewport (override with VW, VH, DPR). Phone: connects
// with puppeteer.connect({ browserURL }) and measures its real viewport (no emulation).
// Output: { "<path>": { viewport, docH, rects: ["TAG x,y,w,h", ...] } }. Compare two
// outputs with rect-diff.mjs.
import puppeteer from "puppeteer-core";
import fs from "node:fs";

const [, , base, out, ...paths] = process.argv;
if (!base || !out || !paths.length) {
  console.error("usage: node first-screen-rects.mjs <baseUrl> <out.json> <path> [path ...]");
  process.exit(2);
}

const remote = process.env.CDP_URL;
const browser = remote
  ? await puppeteer.connect({ browserURL: remote, defaultViewport: null })
  : await puppeteer.launch({
      executablePath: process.env.CHROME,
      headless: true,
      args: ["--mute-audio", "--hide-scrollbars", "--no-first-run"],
    });

const page = await browser.newPage();
if (!remote) {
  await page.setViewport({
    width: Number(process.env.VW || 384),
    height: Number(process.env.VH || 727),
    deviceScaleFactor: Number(process.env.DPR || 2.8125),
    isMobile: true,
    hasTouch: true,
  });
}
// Media must not play during measurements.
await page.evaluateOnNewDocument(() => {
  HTMLMediaElement.prototype.play = function () {
    return Promise.resolve();
  };
});

const result = {};
for (const p of paths) {
  await page.goto(base + p, { waitUntil: "networkidle2", timeout: 45_000 });
  await new Promise((r) => setTimeout(r, Number(process.env.SETTLE_MS || 1200)));
  result[p] = await page.evaluate(() => {
    const skip = (e) => e.closest("svg, [data-ignore-rects]");
    const rects = [...document.querySelectorAll("body *")]
      .filter((e) => {
        const r = e.getBoundingClientRect();
        return r.top < innerHeight && r.bottom > 0 && r.width > 0 && r.height > 0 && !skip(e);
      })
      .map((e) => {
        const r = e.getBoundingClientRect();
        const id = e.id ? "#" + e.id : "";
        return `${e.tagName}${id} ${[r.x, r.y, r.width, r.height].map((v) => Math.round(v * 10) / 10).join(",")}`;
      });
    return { viewport: `${innerWidth}x${innerHeight}@${devicePixelRatio}`, docH: document.documentElement.scrollHeight, rects };
  });
  console.error(p, result[p].viewport, result[p].rects.length, "rects");
}

fs.writeFileSync(out, JSON.stringify(result, null, 1));
await page.close();
if (remote) await browser.disconnect();
else await browser.close();
