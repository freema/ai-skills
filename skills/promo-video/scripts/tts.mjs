// Voiceover with ElevenLabs: one continuous take with character timestamps, from audio/vo/script.json.
//   node scripts/tts.mjs                the whole script → audio/vo/take.mp3 + take.alignment.json
//   node scripts/tts.mjs --line l8      re-take one line → audio/vo/take.l8.*, read in context of the lines around it;
//                                       then add "take": "take.l8" to that line and rerun build_vo.py
//   node scripts/tts.mjs --dry-run      print what would be sent (no request, no key needed)
// The key comes from ELEVENLABS_API_KEY in the environment or from a .env file in the project or up to three
// directories above it. It is never printed. Keep .env out of git.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
function loadKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY;
  for (let d = root, i = 0; i < 4; i++, d = join(d, '..')) {
    const p = join(d, '.env');
    if (!existsSync(p)) continue;
    const m = readFileSync(p, 'utf8').match(/^ELEVENLABS_API_KEY=(.+)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  throw new Error('ELEVENLABS_API_KEY not found in the environment or a .env file');
}

const cfg = JSON.parse(readFileSync(join(root, 'audio/vo/script.json'), 'utf8'));
// `say` overrides the spoken text where the caption spelling would be misread (brand names, URLs)
const spoken = (l) => l.say ?? l.text;
const li = process.argv.indexOf('--line');
const lineId = li > 0 ? process.argv[li + 1] : null;
const k = lineId ? cfg.lines.findIndex((l) => l.id === lineId) : -1;
if (lineId && k < 0) throw new Error(`no line ${lineId} in script.json`);
const text = lineId ? spoken(cfg.lines[k]) : cfg.lines.map(spoken).join(' ');
const body = { text, model_id: cfg.model_id, voice_settings: cfg.voice_settings };
if (lineId && k > 0) body.previous_text = cfg.lines.slice(0, k).map(spoken).join(' '); // keeps the read continuous
if (lineId && k < cfg.lines.length - 1) body.next_text = cfg.lines.slice(k + 1).map(spoken).join(' ');
const format = cfg.output_format || 'mp3_44100_128';
if (!format.startsWith('mp3_')) throw new Error('use an mp3_* output_format: the takes are saved and read as MP3');
const name = lineId ? `take.${lineId}` : 'take';

if (process.argv.includes('--dry-run')) {
  console.log(JSON.stringify({ voice_id: cfg.voice_id, output_format: format, out: `audio/vo/${name}.mp3`, chars: text.length, ...body }, null, 1));
  process.exit(0);
}
const res = await fetch(
  `https://api.elevenlabs.io/v1/text-to-speech/${cfg.voice_id}/with-timestamps?output_format=${format}`,
  { method: 'POST', headers: { 'xi-api-key': loadKey(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
);
if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 500)}`);
const out = await res.json();
mkdirSync(join(root, 'audio/vo'), { recursive: true });
writeFileSync(join(root, `audio/vo/${name}.mp3`), Buffer.from(out.audio_base64, 'base64'));
writeFileSync(join(root, `audio/vo/${name}.alignment.json`), JSON.stringify({ text, alignment: out.alignment, normalized_alignment: out.normalized_alignment }, null, 1));
console.log('chars:', text.length, `→ audio/vo/${name}.mp3 + ${name}.alignment.json`);
