// Records a live <canvas> (a browser game, a WebGL demo, a chart) in headless Chrome: the canvas through
// captureStream plus everything the page plays through WebAudio, driven by a scripted input plan.
//   node scripts/record-canvas.mjs capture/plans/<name>.json [--out capture/raw]   → <out>/<plan.name>.webm
// Record one plan at a time: parallel runs drop frames.
//
// Plan:
//   { "url": "https://example.com/play", "name": "level1", "viewport": [1600, 1000], "dpr": 1, "fps": 60,
//     "canvas": "canvas#game",          optional; default: the largest <canvas> on the page
//     "setup": [ ...steps ],            run before the canvas is located (cookie banner, start screen)
//     "focus": true,                    click the canvas centre once before "steps" (default true)
//     "steps": [ ...steps ] }
// Steps: {"wait": ms} {"press": key} {"down": key} {"up": key} {"tap": [key, ms]}
//        {"click": [fx, fy]} {"move": [fx, fy], "steps": n} {"mdown": true} {"mup": true}   fx/fy = fractions of the canvas box
//        {"clickText": "regex"} {"clickSel": "css"} {"waitFor": "css"}
//        {"rec": "start"|"stop"} {"shot": name} {"repeat": n, "steps": [...]}
// Key names are Puppeteer's (ArrowUp, Space, Enter, KeyW, BracketRight, "1").
import fs from 'node:fs';
import path from 'node:path';
import { launch, sleep, clickText } from './browser.mjs';

const argv = process.argv.slice(2);
const plan = JSON.parse(fs.readFileSync(argv[0], 'utf8'));
const outDir = path.resolve(argv.includes('--out') ? argv[argv.indexOf('--out') + 1] : 'capture/raw');
fs.mkdirSync(outDir, { recursive: true });

const browser = await launch({ args: ['--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
const page = await browser.newPage();
const [vw, vh] = plan.viewport || [1600, 1000];
await page.setViewport({ width: vw, height: vh, deviceScaleFactor: plan.dpr || 1 });
const log = [];
page.on('pageerror', (e) => log.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') log.push('console: ' + m.text().slice(0, 200)); });

// Mirror every WebAudio connection to the speakers into a MediaStream that MediaRecorder can take.
await page.evaluateOnNewDocument(() => {
  const orig = AudioNode.prototype.connect;
  window.__recCtx = [];
  AudioNode.prototype.connect = function (dest, ...rest) {
    const r = orig.call(this, dest, ...rest);
    try {
      if (dest instanceof AudioDestinationNode) {
        const ctx = dest.context;
        if (!ctx.__rec) { ctx.__rec = ctx.createMediaStreamDestination(); window.__recCtx.push(ctx); }
        orig.call(this, ctx.__rec);
      }
    } catch { /* offline contexts and closed contexts cannot be mirrored */ }
    return r;
  };
});

const file = path.join(outDir, plan.name + '.webm');
const out = fs.createWriteStream(file);
await page.exposeFunction('__chunk', (b64) => { out.write(Buffer.from(b64, 'base64')); });
await page.goto(plan.url, { waitUntil: 'networkidle2', timeout: 60000 });

let canvas, bb;
const locate = async () => {
  canvas = plan.canvas
    ? await page.$(plan.canvas)
    : (await page.evaluateHandle(() => [...document.querySelectorAll('canvas')].sort((a, b) => b.width * b.height - a.width * a.height)[0])).asElement();
  if (!canvas) throw new Error('no canvas found (set "canvas" in the plan, or add a "waitFor" setup step)');
  bb = await canvas.boundingBox();
};
const fx = (f) => bb.x + bb.width * f[0];
const fy = (f) => bb.y + bb.height * f[1];

let recording = false;
const startRec = async () => {
  await locate(); // the game may have resized its canvas since setup
  await page.evaluate(async (c, fps) => {
    const stream = c.captureStream(fps);
    // a page can run several AudioContexts (site sounds, music, SFX): mix them into one track
    const audio = window.__recCtx.length > 0;
    if (audio) {
      const mix = new AudioContext();
      const dest = mix.createMediaStreamDestination();
      for (const x of window.__recCtx) mix.createMediaStreamSource(x.__rec.stream).connect(dest);
      dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    }
    const rec = new MediaRecorder(stream, { mimeType: audio ? 'video/webm;codecs=vp9,opus' : 'video/webm;codecs=vp9', videoBitsPerSecond: 16e6, audioBitsPerSecond: 192e3 });
    rec.ondataavailable = async (e) => {
      const buf = new Uint8Array(await e.data.arrayBuffer());
      let s = '';
      for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
      await window.__chunk(btoa(s));
    };
    window.__stopped = new Promise((r) => (rec.onstop = r));
    rec.start(1000);
    window.__rec = rec;
    window.__audio = audio;
  }, canvas, plan.fps || 60);
  recording = true;
};
const stopRec = async () => {
  await page.evaluate(async () => { window.__rec.stop(); await window.__stopped; await new Promise((r) => setTimeout(r, 500)); });
  recording = false;
};

const run = async (steps) => {
  for (const s of steps) {
    if (s.wait) await sleep(s.wait);
    else if (s.press) await page.keyboard.press(s.press);
    else if (s.down) await page.keyboard.down(s.down);
    else if (s.up) await page.keyboard.up(s.up);
    else if (s.tap) { await page.keyboard.down(s.tap[0]); await sleep(s.tap[1]); await page.keyboard.up(s.tap[0]); }
    // a slow click: game UIs (Phaser buttons among them) often ignore a press and release in the same frame
    else if (s.click) await page.mouse.click(fx(s.click), fy(s.click), { delay: s.delay ?? 120 });
    else if (s.move) await page.mouse.move(fx(s.move), fy(s.move), { steps: s.steps || 8 });
    else if (s.mdown) await page.mouse.down();
    else if (s.mup) await page.mouse.up();
    else if (s.clickText) { if (!(await clickText(page, s.clickText))) log.push(`clickText: nothing matched ${s.clickText}`); }
    else if (s.clickSel) await page.click(s.clickSel);
    else if (s.waitFor) await page.waitForSelector(s.waitFor, { timeout: 30000 });
    else if (s.rec === 'start') await startRec();
    else if (s.rec === 'stop') await stopRec();
    else if (s.shot) await canvas.screenshot({ path: path.join(outDir, `${plan.name}-${s.shot}.png`) });
    else if (s.repeat) for (let i = 0; i < s.repeat; i++) await run(s.steps);
  }
};

await run(plan.setup || []);
await locate();
console.log(plan.name, 'canvas', await page.evaluate((c) => [c.width, c.height], canvas), 'box', bb);
if (plan.focus !== false) await page.mouse.click(fx([0.5, 0.5]), fy([0.5, 0.5]));
await run(plan.steps || []);
if (recording) await stopRec();
await new Promise((r) => out.end(r));
console.log(plan.name, '→', path.relative(process.cwd(), file), (fs.statSync(file).size / 1e6).toFixed(1), 'MB, audio:', await page.evaluate(() => window.__audio ?? null));
for (const l of log.slice(0, 8)) console.log('  ', l);
await browser.close();
