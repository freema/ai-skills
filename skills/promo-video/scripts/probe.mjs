// Dev helper: serve the composition, load it in headless Chrome, report errors, dump the SFX cue log and
// save review frames. Each <video data-start> is seeked to the timeline the way the HyperFrames runtime would.
//   node scripts/probe.mjs                                   errors + timeline duration
//   node scripts/probe.mjs --cues audio/cues.json            write window.__cues for build_mix.py
//   node scripts/probe.mjs --shots 0.5,1,1.5 --out snapshots review frames (t000.500.png, …)
//   node scripts/probe.mjs --shots every:0.5 --out snapshots a frame every 0.5 s
// Run from the project directory (the one with index.html).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { launch, sleep } from './browser.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argv = process.argv.slice(2);
const args = Object.fromEntries(argv.flatMap((v, i) => (v.startsWith('--') ? [[v.slice(2), argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true]] : [])));

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json',
  '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webm': 'video/webm' };
// range requests matter: Chrome will not seek a <video> served without them
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  const size = fs.statSync(p).size;
  const type = types[path.extname(p)] || 'application/octet-stream';
  const range = /bytes=(\d+)-(\d*)/.exec(req.headers.range || '');
  if (range) {
    const a = +range[1], b = range[2] ? +range[2] : size - 1;
    res.writeHead(206, { 'content-type': type, 'content-range': `bytes ${a}-${b}/${size}`, 'accept-ranges': 'bytes', 'content-length': b - a + 1 });
    return fs.createReadStream(p, { start: a, end: b }).pipe(res);
  }
  res.writeHead(200, { 'content-type': type, 'accept-ranges': 'bytes', 'content-length': size });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));

const browser = await launch();
const page = await browser.newPage();
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const tag = html.match(/<[^>]*data-composition-id="([^"]+)"[^>]*>/);
const id = tag ? tag[1] : 'main';
const attr = (name, dflt) => { const m = tag && tag[0].match(new RegExp(`data-${name}="([^"]+)"`)); return m ? +m[1] : dflt; };
await page.setViewport({ width: attr('width', 1920), height: attr('height', 1080) });
const errors = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => errors.push('pageerror: ' + (e.stack || e.message)));
page.on('response', (r) => { if (r.status() >= 400) errors.push(r.status() + ' ' + r.url()); });
await page.goto(`http://localhost:${server.address().port}/index.html`, { waitUntil: 'load' });
const ok = await page.waitForFunction((id) => !!(window.__timelines && window.__timelines[id]), { timeout: 20000, polling: 100 }, id).then(() => true, () => false);
const dur = ok ? await page.evaluate((id) => window.__timelines[id].duration(), id) : null;
console.log(`timeline "${id}" registered:`, ok, ok ? `${dur.toFixed(3)} s (data-duration ${attr('duration', '?')})` : '');
for (const e of errors) console.log(e);

if (ok && args.cues) {
  const cues = await page.evaluate(() => (window.__cues || []).slice().sort((a, b) => a.t - b.t));
  fs.mkdirSync(path.dirname(path.resolve(root, args.cues)), { recursive: true });
  fs.writeFileSync(path.resolve(root, args.cues), JSON.stringify(cues, null, 1));
  console.log('cues:', cues.length, '→', args.cues);
}

if (ok && args.shots) {
  const out = path.resolve(root, typeof args.out === 'string' ? args.out : 'snapshots');
  fs.mkdirSync(out, { recursive: true });
  let times = String(args.shots).startsWith('every:')
    ? Array.from({ length: Math.floor(dur / +String(args.shots).slice(6)) + 1 }, (_, i) => +(i * +String(args.shots).slice(6)).toFixed(3))
    : String(args.shots).split(',').map(Number);
  times = times.filter((t) => t <= dur);
  for (const t of times) {
    await page.evaluate(async (id, t) => {
      window.__timelines[id].seek(t, false);
      const seeks = [];
      for (const v of document.querySelectorAll('video[data-start]')) {
        const s = +v.dataset.start, d = +v.dataset.duration;
        const on = t >= s && t < s + d;
        v.style.visibility = on ? 'visible' : 'hidden';
        if (on) {
          v.pause();
          seeks.push(new Promise((r) => { v.addEventListener('seeked', r, { once: true }); setTimeout(r, 1500); }));
          v.currentTime = Math.max(0, t - s);
        }
      }
      await Promise.all(seeks);
    }, id, t);
    await sleep(60);
    await page.screenshot({ path: path.join(out, `t${t.toFixed(3).padStart(7, '0')}.png`) });
  }
  console.log('shots:', times.length, '→', out);
}
await browser.close();
server.close();
