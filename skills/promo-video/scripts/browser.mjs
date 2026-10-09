// Shared helper for the headless-Chrome scripts (probe.mjs, record-canvas.mjs, your own capture scripts).
// Finds puppeteer-core and a chrome-headless-shell without adding a package.json to the video project:
//   puppeteer-core: PUPPETEER_CORE (a puppeteer-core directory), else one resolvable from the project
//     (npm i -D puppeteer-core), else the copy that `npx hyperframes` installed into the npx cache
//   browser: CHROME_PATH or HYPERFRAMES_BROWSER_PATH, else the newest chrome-headless-shell in HyperFrames' cache
//     (~/.cache/hyperframes/chrome, filled by `npx hyperframes browser ensure`), else in ~/.cache/puppeteer
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const vnum = (s) => (s.match(/\d+/g) || []).map(Number);
const newer = (a, b) => {
  const x = vnum(a), y = vnum(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] || 0) !== (y[i] || 0)) return (y[i] || 0) - (x[i] || 0);
  return 0;
};

function findPuppeteer() {
  if (process.env.PUPPETEER_CORE) return createRequire(path.join(process.env.PUPPETEER_CORE, 'package.json'))('.');
  try {
    return createRequire(path.join(process.cwd(), 'noop.js'))('puppeteer-core');
  } catch { /* not installed in the project */ }
  const npx = path.join(os.homedir(), '.npm', '_npx');
  const dirs = fs.existsSync(npx) ? fs.readdirSync(npx).map((d) => path.join(npx, d, 'node_modules')) : [];
  const withPpt = dirs.filter((d) => fs.existsSync(path.join(d, 'puppeteer-core', 'package.json')));
  // prefer the hyperframes install, then the newest puppeteer-core
  const version = (d) => JSON.parse(fs.readFileSync(path.join(d, 'puppeteer-core', 'package.json'), 'utf8')).version;
  withPpt.sort((a, b) => (fs.existsSync(path.join(b, 'hyperframes')) - fs.existsSync(path.join(a, 'hyperframes'))) || newer(version(a), version(b)));
  if (!withPpt.length) throw new Error('puppeteer-core not found: run `npx hyperframes@<version> --help` once, `npm i -D puppeteer-core`, or set PUPPETEER_CORE');
  return createRequire(path.join(withPpt[0], 'noop.js'))('puppeteer-core');
}

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  if (process.env.HYPERFRAMES_BROWSER_PATH) return process.env.HYPERFRAMES_BROWSER_PATH;
  const caches = [['hyperframes', 'chrome'], ['puppeteer']].map((p) => path.join(os.homedir(), '.cache', ...p, 'chrome-headless-shell'));
  for (const base of caches) {
    const builds = fs.existsSync(base) ? fs.readdirSync(base).sort(newer) : [];
    for (const b of builds) {
      for (const sub of fs.readdirSync(path.join(base, b))) {
        for (const exe of ['chrome-headless-shell', 'chrome-headless-shell.exe']) {
          const p = path.join(base, b, sub, exe);
          if (fs.existsSync(p)) return p;
        }
      }
    }
  }
  throw new Error('chrome-headless-shell not found: run `npx hyperframes browser ensure`, or set CHROME_PATH');
}

export const chromePath = () => findChrome();

export async function launch({ args = [], ...opts } = {}) {
  const puppeteer = findPuppeteer();
  return puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    args: ['--force-color-profile=srgb', '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required', ...args],
    ...opts,
  });
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Click the first visible button or link whose trimmed text matches a regex source (cookie banners, "Skip", "Play").
export const clickText = (page, re) =>
  page.evaluate((src) => {
    const r = new RegExp(src, 'i');
    const el = [...document.querySelectorAll('button, a, [role="button"]')].find((x) => r.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0);
    if (el) el.click();
    return !!el;
  }, re);
