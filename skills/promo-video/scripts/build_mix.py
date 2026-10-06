"""Build the soundtrack: voice stem (optional) + back-timed music (optional) + sound effects from the scene's cue log.

Inputs
  index.html               the root's data-duration sets the length
  audio/stems/voice.wav    from build_vo.py; when it exists the spot is a voiceover spot
  MUSIC below              a licensed track or a bed rendered for the video
  audio/cues.json          from `node scripts/probe.mjs --cues audio/cues.json`: [{t, type, gain?, ...params}]
  audio/sfx/<name>.wav     optional samples (a game's own SFX); otherwise `type` must be a generator in sfx.py

Targets (integrated loudness, measured with ffmpeg ebur128)
  voiceover spot:  voice -14 LUFS (build_vo.py), music bed -36, SFX stem -26, mix -12
  music-led spot:  music -16, SFX stem -22, mix -14
  true peak <= -1.5 dBTP in the WAV and <= -1 dBTP after a test AAC encode

HyperFrames measures the true peak after its own AAC encode and turns the whole track down when it is above -1 dBTP.
AAC drops the content above about 16 kHz, and on sharp sibilants or square waves that leaves overshoots of a few dB,
so the mix is low-passed at 16 kHz before the limiter and the build fails when the test encode still peaks too high.

  python3 scripts/build_mix.py
"""
import inspect
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
import audiolib as A
import sfx

ROOT = Path(__file__).resolve().parent.parent

# ── per project ──────────────────────────────────────────────────────────────────────────────────────────────
# Back-time the track so its final hit (track_hit, seconds into the file) lands on a strong end-card moment
# (spot_hit, seconds into the video). A bed rendered for the video from 0 s uses track_hit = spot_hit = 0.
MUSIC = None
# MUSIC = {'file': 'audio/music/track.mp3', 'track_hit': 94.81, 'spot_hit': 31.2}
ALIAS = {}            # cue type → sample name in audio/sfx/ (e.g. {'click': 'ui-select'})
CEILING = -1.5        # dBTP for the WAV mix
# relative level of each generator before the SFX stem is normalized (cue `gain` adds dB on top)
BASE = dict(scribble=0.55, pop=0.75, click=0.7, tick=0.35, whoosh=0.6, error=0.55, success=0.7, stamp=1.0,
            blip=0.5, hop=0.7, lock=0.8, sparkle=0.6, riser=0.45, sweep=0.5, drop=0.9, chirp=0.55, ding=0.8)
# ─────────────────────────────────────────────────────────────────────────────────────────────────────────────

root_tag = re.search(r'<[^>]*data-composition-id="[^"]+"[^>]*>', (ROOT / 'index.html').read_text()).group(0)
DUR = float(re.search(r'data-duration="([\d.]+)"', root_tag).group(1))
N = int(round(DUR * A.SR))
VOICE = ROOT / 'audio' / 'stems' / 'voice.wav'
HAS_VOICE = VOICE.exists()
T = dict(music=-36.0, sfx=-26.0, mix=-12.0) if HAS_VOICE else dict(music=-16.0, sfx=-22.0, mix=-14.0)
STEMS = ROOT / 'audio' / 'stems'


def fit(x, offset=0):
    """Place x at `offset` samples on the video timeline (negative = skip the start of x), cut to N."""
    out = np.zeros((N, 2), np.float32)
    src = x[max(0, -offset):]
    a = max(0, offset)
    n = max(0, min(N - a, len(src)))
    out[a:a + n] = src[:n]
    return out


def music_stem():
    m = A.load(ROOT / MUSIC['file'])
    start = MUSIC['track_hit'] - MUSIC['spot_hit']          # seconds into the file at video time 0
    x = fit(m, -int(round(start * A.SR)))
    x = A.fade(x, fin=1.0 if start > 0 else 0.0, fout=0.6)  # fade in only when entering the track mid-way
    return A.normalize(x, T['music']), start


def sample(name):
    y = A.load(ROOT / 'audio' / 'sfx' / f'{name}.wav', channels=1)[:, 0]
    nz = np.nonzero(np.abs(y) > 1e-4)[0]
    y = y[:nz[-1] + 1] if len(nz) else y                   # trim the silent tail
    return (y / max(1e-9, np.abs(y).max()) * 0.5).astype(np.float32)


def effect(c, i):
    kind = c['type']
    name = ALIAS.get(kind, kind)
    if (ROOT / 'audio' / 'sfx' / f'{name}.wav').exists():
        return sample(name)
    if kind not in sfx.GENERATORS:
        raise SystemExit(f'cue {c}: no audio/sfx/{name}.wav and no generator "{kind}" in sfx.py')
    params = inspect.signature(sfx.GENERATORS[kind]).parameters
    kw = {k: c[k] for k in params if k in c and k != 'seed'}  # pass the cue fields the generator accepts
    if 'seed' in params:
        kw['seed'] = 100 + i                                  # every hit sounds slightly different, reproducibly
    if 'dur' in kw:
        kw['dur'] = max(0.05, float(kw['dur']))
    return sfx.render(kind, **kw) * BASE.get(kind, 0.6)


def sfx_stem(cues):
    out = np.zeros((N, 2), np.float32)
    for i, c in enumerate(cues):
        y = effect(c, i) * A.db(c.get('gain', 0))
        pan = ((i * 37) % 21 - 10) / 10 * 0.25                # small deterministic spread so hits don't stack dead centre
        st = np.stack([y * np.sqrt(0.5 - pan / 2), y * np.sqrt(0.5 + pan / 2)], 1) * np.sqrt(2)
        a = int(round(c['t'] * A.SR))
        b = min(N, a + len(st))
        if a < N:
            out[a:b] += st[:b - a]
    return A.normalize(A.fade(out, fout=0.05), T['sfx']) if np.abs(out).max() > 0 else out


def aac_loudness(path):
    """Loudness and true peak after an AAC encode like the one in the rendered MP4."""
    with tempfile.TemporaryDirectory() as tmp:
        m4a = Path(tmp) / 'mix.m4a'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(path), '-c:a', 'aac', '-b:a', '192k', str(m4a)], check=True)
        return A.loudness(m4a)


def main():
    cues = json.loads((ROOT / 'audio' / 'cues.json').read_text()) if (ROOT / 'audio' / 'cues.json').exists() else []
    STEMS.mkdir(parents=True, exist_ok=True)
    layers, report = [], {}
    if HAS_VOICE:
        voice = fit(A.load(VOICE))
        layers.append(voice); report['voice'] = A.loudness(voice)
    if MUSIC:
        music, start = music_stem()
        A.save(STEMS / 'music.wav', music)
        layers.append(music); report['music'] = A.loudness(music); report['music_start_s'] = round(start, 3)
    fx = sfx_stem(cues)
    A.save(STEMS / 'sfx.wav', fx)
    layers.append(fx)
    if np.abs(fx).max() > 0:
        report['sfx'] = A.loudness(fx)
    if not (HAS_VOICE or MUSIC):
        print('note: no voice and no music, so the SFX stem is the whole mix (left at its own level)')
    target = T['mix'] if (HAS_VOICE or MUSIC) else T['sfx']
    mix = A.master(A.ffilter(sum(layers), 'lowpass=f=16000:poles=2'), target, CEILING)
    mix = A.fade(mix, fout=0.02)
    A.save(ROOT / 'audio' / 'mix.wav', mix)
    report['mix'] = A.loudness(mix)
    report['mix_aac'] = aac_loudness(ROOT / 'audio' / 'mix.wav')
    report['targets'] = T
    report['cues'] = len(cues)
    (ROOT / 'audio' / 'loudness.json').write_text(json.dumps(report, indent=2))
    for k, v in report.items():
        print(f'{k:>14}: {v}')
    if report['mix_aac'][1] is None or report['mix_aac'][1] > -1.0:
        raise SystemExit(f"AAC true peak {report['mix_aac'][1]} dBTP is above -1: the renderer would turn the mix down")


if __name__ == '__main__':
    main()
