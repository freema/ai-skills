// Voice test: reads the same lines of the real script with several ElevenLabs voices, so the user picks by ear.
//   node scripts/voice-test.mjs                         lines l1 and the last line, four premade voices
//   node scripts/voice-test.mjs --lines l1,l5,l7        which lines of audio/vo/script.json to read
//   node scripts/voice-test.mjs --voices jan:KIDKfqJyZ6ASuyzsKfh5,anet:MpbYQvoTmXjHkaxtLiSh
//   node scripts/voice-test.mjs --dry-run               print voices, text and credits (no request, no key needed)
// Writes audio/voice-test/<name>.mp3 and report.json. Model and settings come from script.json, so the sample
// sounds like the final take. The key is read like tts.mjs reads it and never printed.
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
const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };

// premade voices work with a free-tier key; see references/audio.md for what each was used for
const PREMADE = [
  { name: 'sarah', id: 'EXAVITQu4vr4xnSDxMaL' },
  { name: 'jessica', id: 'cgSgspJ2msm6clMCkdW9' },
  { name: 'daniel', id: 'onwK4e9ZLuTAKqWW03F9' },
  { name: 'george', id: 'JBFqnCBsd6RMkjVDRZzb' },
];
const voices = arg('--voices')
  ? arg('--voices').split(',').map((s) => { const [name, id] = s.split(':'); return { name, id }; })
  : PREMADE;
for (const v of voices) if (!/^[a-z0-9-]+$/i.test(v.name || '') || !v.id) throw new Error(`bad voice "${v.name}:${v.id}", use name:id`);

const cfg = JSON.parse(readFileSync(join(root, 'audio/vo/script.json'), 'utf8'));
const spoken = (l) => l.say ?? l.text;
const ids = arg('--lines') ? arg('--lines').split(',') : [cfg.lines[0].id, cfg.lines.at(-1).id];
const lines = ids.map((id) => cfg.lines.find((l) => l.id === id) ?? (() => { throw new Error(`no line ${id} in script.json`); })());
const text = [...new Set(lines)].map(spoken).join(' ');
const body = { text, model_id: cfg.model_id, voice_settings: cfg.voice_settings };
const format = cfg.output_format || 'mp3_44100_128';

// eleven_multilingual_v2 and eleven_v3 bill one credit per character, Flash and Turbo half of that
const perChar = /flash|turbo/.test(cfg.model_id) ? 0.5 : 1;
const credits = Math.ceil(text.length * perChar) * voices.length;
console.log(`${voices.length} voices × ${text.length} chars ≈ ${credits} credits (${cfg.model_id})`);
if (process.argv.includes('--dry-run')) {
  console.log(JSON.stringify({ voices, output_format: format, ...body }, null, 1));
  process.exit(0);
}

const key = loadKey();
const dir = join(root, 'audio/voice-test');
mkdirSync(dir, { recursive: true });
const report = [];
for (const v of voices) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${v.id}?output_format=${format}`, {
    method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) {
    // 402 on a library voice means a free-tier key: those voices need a paid plan through the API
    const error = `${res.status} ${(await res.text()).slice(0, 200)}`;
    console.log(v.name, 'failed:', error);
    report.push({ ...v, error });
    continue;
  }
  writeFileSync(join(dir, `${v.name}.mp3`), Buffer.from(await res.arrayBuffer()));
  console.log(v.name, `→ audio/voice-test/${v.name}.mp3`);
  report.push({ ...v, file: `${v.name}.mp3` });
}
writeFileSync(join(dir, 'report.json'), JSON.stringify({ text, model_id: cfg.model_id, voice_settings: cfg.voice_settings, voices: report }, null, 1));
