"""Split the ElevenLabs take into its lines, re-space them on the video timeline, master the voice stem to
-14 LUFS and write word timings for the composition (assets/timing.js) and for build_captions.py.

audio/vo/script.json, per line:
  text        what the captions show
  say         what the voice reads, when the caption spelling would be misread ("Metrifier dot com")
  group       spoken words per caption word, e.g. [1, 1, 3] when "example.com" is read as three words
  take        a single-line re-take ("take.l8" from `node scripts/tts.mjs --line l8`); that line's words in the
              main take are skipped, so one line can change without touching the timing of the others
  gap_after   seconds of silence after the line (default 0.4); widen it when a caption reads too fast
and top-level `head` (silence before the first word, default 0.45) and `tail` (end-card hold after the last
word, default 2.0). The printed total is the composition length: set it as the root's data-duration.

  python3 scripts/build_vo.py
"""
import json, sys
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).parent))
from audiolib import SR, load, save, loudness, normalize, fade, ffilter, master

ROOT = Path(__file__).resolve().parent.parent
VOICE_LUFS = -14.0

cfg = json.loads((ROOT / 'audio/vo/script.json').read_text())
HEAD = cfg.get('head', 0.45)
TAIL = cfg.get('tail', 2.0)
GAPS = [l.get('gap_after', 0.4) for l in cfg['lines'][:-1]]   # speech end → next speech start


def spoken_words(name):
    """Spoken words with timings from a take's character alignment."""
    al = json.loads((ROOT / f'audio/vo/{name}.alignment.json').read_text())['alignment']
    out, cur, s, prev = [], '', None, 0
    for c, t0, t1 in zip(al['characters'], al['character_start_times_seconds'], al['character_end_times_seconds']):
        if c == ' ':
            if cur: out.append({'w': cur, 's': s, 'e': prev}); cur = ''
            continue
        if not cur: s = t0
        cur += c; prev = t1
    if cur: out.append({'w': cur, 's': s, 'e': prev})
    return out


takes = {'take': {'words': spoken_words('take'), 'audio': load(ROOT / 'audio/vo/take.mp3')}}
for line in cfg['lines']:
    if 'take' in line:
        takes[line['take']] = {'words': spoken_words(line['take']), 'audio': load(ROOT / f"audio/vo/{line['take']}.mp3")}

# assign spoken words to lines, then fold them into caption words
lines, i, skipping = [], 0, False
main = takes['take']['words']
for line in cfg['lines']:
    said = line.get('say', line['text']).split()
    shown = line['text'].split()
    group = line.get('group', [1] * len(shown))
    assert len(group) == len(shown) and sum(group) == len(said), (line['id'], group)
    if 'take' in line:                          # re-taken line: its own file, skip its old words in the main take
        src, ws, j = line['take'], takes[line['take']]['words'], 0
        assert len(ws) == len(said), (line['id'], 're-take does not match the script')
        skipping = True
    else:
        src, ws = 'take', main
        j = next((j for j in range(i, len(main) - len(said) + 1) if [w['w'] for w in main[j:j + len(said)]] == said), None)
        assert j is not None and (j == i or skipping), (line['id'], said, [w['w'] for w in main[i:i + len(said)]])
        i, skipping = j + len(said), False
    lw = ws[j:j + len(said)]
    assert [w['w'] for w in lw] == said, (line['id'], said, [w['w'] for w in lw])
    after = ws[j + len(said)] if j + len(said) < len(ws) else None   # next word in the same file, if any
    cw, k = [], 0
    for word, n in zip(shown, group):
        cw.append({'w': word, 's': lw[k]['s'], 'e': lw[k + n - 1]['e']}); k += n
    lines.append({'id': line['id'], 'text': line['text'], 'words': cw, 's': cw[0]['s'], 'e': cw[-1]['e'],
                  'src': src, 'next_s': after['s'] if after else None})
assert i == len(main) or skipping, 'take has more words than the script'

lay, t = [], HEAD
for k, L in enumerate(lines):
    offset = t - L['s']
    lay.append(offset)
    if k < len(GAPS):
        t = L['e'] + offset + GAPS[k]
TOTAL = round(lines[-1]['e'] + lay[-1] + TAIL, 1)

out = np.zeros((int(round(TOTAL * SR)), 2), dtype=np.float32)
timing = []
for k, L in enumerate(lines):
    pre, post = 0.06, 0.14                      # keep the consonant attack and the natural decay
    take = takes[L['src']]['audio']
    a = max(0.0, L['s'] - pre)
    b = min(len(take) / SR, L['e'] + post)
    if L['next_s'] is not None:                 # never bleed into the next sentence of the same take
        b = min(b, (L['e'] + L['next_s']) / 2)
    seg = fade(take[int(a * SR):int(b * SR)], 0.012, 0.04)
    offset = lay[k]
    p = int((a + offset) * SR)
    out[p:p + len(seg)] += seg
    timing.append({'id': L['id'], 'text': L['text'], 'start': round(L['s'] + offset, 3), 'end': round(L['e'] + offset, 3),
                   'words': [{'w': w['w'], 's': round(w['s'] + offset, 3), 'e': round(w['e'] + offset, 3)} for w in L['words']]})

print('last speech ends at', timing[-1]['end'], f's; total {TOTAL} s → set data-duration="{TOTAL}" on the root')
# light voice chain: rumble cut, gentle compression, then gain + limiter to -14 LUFS / -1 dBTP
out = ffilter(out, 'highpass=f=75,acompressor=threshold=0.08:ratio=3:attack=4:release=90:makeup=1:knee=4')
out = master(out, VOICE_LUFS, ceiling_db=-1.0)
I, tp = loudness(out)
print(f'voice stem: {I:.2f} LUFS, true peak {tp} dBTP')
(ROOT / 'audio/stems').mkdir(parents=True, exist_ok=True)
save(ROOT / 'audio/stems/voice.wav', out)
(ROOT / 'audio/vo/timing.json').write_text(json.dumps(timing, indent=1))
(ROOT / 'assets/timing.js').write_text('// generated by scripts/build_vo.py\nwindow.VO = ' + json.dumps(timing) + ';\nwindow.VO_TOTAL = ' + json.dumps(TOTAL) + ';\n')
for L in timing:
    print(f"{L['id']}  {L['start']:6.2f} - {L['end']:6.2f}  {L['text']}")
