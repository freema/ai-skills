"""Procedural UI sound effects, synthesized with numpy (no samples, no licenses to track).

Each generator returns a mono float32 array at 48 kHz and is deterministic: noise comes from a seeded RNG.
build_mix.py calls render(type, **params) for every cue in audio/cues.json whose type is a key of GENERATORS.
Add a generator for each new kind of hit rather than downloading effects, and keep render()'s declick.

  python3 scripts/sfx.py            # writes audio/sfx-preview/<name>.wav for every generator, to audition them
"""
import numpy as np

SR = 48000

def _t(dur):
    return np.arange(int(dur * SR)) / SR

def _rng(seed):
    return np.random.default_rng(seed)

def _bandpass(x, lo, hi):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    # smooth (raised-cosine) band edges to avoid ringing
    w = np.clip((f - lo * 0.7) / (lo * 0.3 + 1e-9), 0, 1) * np.clip((hi * 1.3 - f) / (hi * 0.3 + 1e-9), 0, 1)
    return np.fft.irfft(X * (0.5 - 0.5 * np.cos(np.pi * w)), len(x))

def _norm(x, peak):
    m = np.abs(x).max()
    return (x / m * peak).astype(np.float32) if m > 0 else x.astype(np.float32)

def _env(n, attack, release, shape=2.0):
    e = np.ones(n)
    a, r = int(attack * SR), int(release * SR)
    if a: e[:a] = np.linspace(0, 1, a) ** shape
    if r: e[-r:] *= np.linspace(1, 0, r) ** shape
    return e

def scribble(dur=0.6, seed=1, bright=1.0):
    """Felt marker on paper: band-limited noise with irregular stroke pressure."""
    rng = _rng(seed)
    n = int(dur * SR)
    x = _bandpass(rng.standard_normal(n), 1400 * bright, 6500 * bright)
    t = _t(dur)
    lfo = sum(np.abs(np.sin(2 * np.pi * f * t + p)) ** 1.5 for f, p in zip(rng.uniform(5, 13, 3), rng.uniform(0, 6, 3)))
    grain = _bandpass(rng.standard_normal(n), 30, 120); grain = 0.6 + 0.4 * grain / (np.abs(grain).max() + 1e-9)
    y = x * (lfo / 3) * grain * _env(n, 0.03, min(0.08, dur / 3))
    return _norm(y, 0.30)

def pop(seed=2, pitch=1.0):
    """Soft bubbly pop for elements appearing."""
    dur = 0.16
    t = _t(dur)
    f = 300 * pitch + (1100 * pitch - 300 * pitch) * np.exp(-t / 0.018)
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.sin(ph) * np.exp(-t / 0.045)
    y[:int(0.002 * SR)] *= np.linspace(0, 1, int(0.002 * SR))
    return _norm(y, 0.55)

def click(seed=3, pitch=1.0):
    """UI click: tiny noise transient + short sine tick."""
    rng = _rng(seed)
    dur = 0.05
    t = _t(dur)
    n = len(t)
    noise = _bandpass(rng.standard_normal(n), 2500, 9000) * np.exp(-t / 0.003)
    tone = np.sin(2 * np.pi * 3100 * pitch * t) * np.exp(-t / 0.008) * 0.6
    return _norm(noise + tone, 0.40)

def tick(seed=4):
    """Keyboard tick for typing."""
    rng = _rng(seed)
    dur = 0.035
    t = _t(dur)
    c = rng.uniform(1800, 3600)
    y = _bandpass(rng.standard_normal(len(t)), c * 0.7, c * 1.4) * np.exp(-t / 0.004)
    y += 0.25 * np.sin(2 * np.pi * rng.uniform(140, 200) * t) * np.exp(-t / 0.006)
    return _norm(y, rng.uniform(0.18, 0.26))

def whoosh(dur=0.6, seed=5, up=True):
    """Air movement for camera moves; a band sweeps across the spectrum."""
    rng = _rng(seed)
    n = int(dur * SR)
    noise = rng.standard_normal(n)
    hop = 256
    out = np.zeros(n)
    win = np.hanning(1024)
    pos = np.linspace(0, 1, n)
    for i in range(0, n - 1024, hop):
        p = pos[i + 512]
        c = (350 + 2600 * np.sin(np.pi * p) ** 1.5) if up else (2400 - 1800 * p)
        seg = _bandpass(noise[i:i + 1024] * win, c * 0.6, c * 1.5)
        out[i:i + 1024] += seg
    e = np.sin(np.pi * pos) ** 1.8
    return _norm(out * e, 0.32)

def error(seed=6):
    """Gentle 'nope': two falling soft square tones."""
    out = []
    for f, d in [(392, 0.11), (311, 0.18)]:
        t = _t(d)
        sq = np.tanh(3 * np.sin(2 * np.pi * f * t)) * np.exp(-t / (d * 0.6))
        out.append(_bandpass(sq, 120, 2500)); out.append(np.zeros(int(0.025 * SR)))
    return _norm(np.concatenate(out), 0.32)

def success(seed=7):
    """Two-note bell chime."""
    dur = 0.9
    t = _t(dur)
    y = np.zeros(len(t))
    for start, f in [(0.0, 1318.5), (0.085, 1975.5)]:
        tt = np.clip(t - start, 0, None)
        on = np.clip((t - start) / 0.003, 0, 1)   # 3 ms attack: a hard onset clicks
        for mult, amp, dec in [(1, 1.0, 0.35), (2.01, 0.35, 0.18), (3.02, 0.15, 0.09)]:
            y += on * amp * np.sin(2 * np.pi * f * mult * tt) * np.exp(-tt / dec)
    return _norm(y, 0.30)

def stamp(seed=8):
    """Rubber stamp thunk: low punch + paper slap."""
    rng = _rng(seed)
    dur = 0.35
    t = _t(dur)
    f = 55 + 95 * np.exp(-t / 0.03)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.08)
    slap = _bandpass(rng.standard_normal(len(t)), 600, 5000) * np.exp(-t / 0.012)
    return _norm(body + 0.5 * slap, 0.70)

def blip(seed=9, note=72, dur=0.075, slide=1.03):
    """8-bit square blip. note = MIDI number."""
    t = _t(dur)
    f0 = 440 * 2 ** ((note - 69) / 12)
    f = f0 * (1 + (slide - 1) * t / dur)
    ph = np.cumsum(f) / SR
    sq = np.where((ph % 1) < 0.5, 1.0, -1.0)
    y = sq * _env(len(t), 0.002, dur * 0.5, 1.0)
    return _norm(y, 0.16)

def hop(seed=10):
    """Rising 8-bit arpeggio (a jump, a level-up)."""
    return np.concatenate([blip(seed, n, 0.045, 1.0) for n in (72, 76, 79, 84)]).astype(np.float32)

def lock(seed=11):
    """Small metallic lock click-clack."""
    rng = _rng(seed)
    parts = []
    for f, gap in [(2400, 0.07), (3600, 0.0)]:
        t = _t(0.06)
        y = (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.51 * t)) * np.exp(-t / 0.012)
        y += _bandpass(rng.standard_normal(len(t)), 3000, 9000) * np.exp(-t / 0.004)
        parts += [y, np.zeros(int(gap * SR))]
    return _norm(np.concatenate(parts), 0.35)

def sparkle(seed=12, dur=0.9):
    """Pentatonic glitter for a logo reveal."""
    rng = _rng(seed)
    t = _t(dur)
    y = np.zeros(len(t))
    scale = [0, 2, 4, 7, 9]
    for k in range(9):
        st = k * dur / 11 + rng.uniform(0, 0.02)
        note = 84 + scale[rng.integers(0, 5)] + 12 * rng.integers(0, 2)
        f = 440 * 2 ** ((note - 69) / 12)
        tt = np.clip(t - st, 0, None); on = (t >= st)
        y += on * np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.12) * (1 - k / 12)
    return _norm(y, 0.22)

def riser(dur=0.8, seed=13):
    """Short noise + tone riser into a reveal."""
    rng = _rng(seed)
    t = _t(dur)
    f = 300 + 900 * (t / dur) ** 2
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.3
    noise = _bandpass(rng.standard_normal(len(t)), 2000, 8000) * (t / dur) ** 2
    y = (tone + noise) * (t / dur) ** 1.5
    y[-int(0.02 * SR):] *= np.linspace(1, 0, int(0.02 * SR))
    return _norm(y, 0.25)

def sweep(dur=0.8, seed=14, f0=420.0, f1=700.0):
    """Soft rising sine glide under a line being drawn (a chart plotting itself)."""
    t = _t(dur)
    f = f0 * (f1 / f0) ** (t / dur)
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = (np.sin(ph) + 0.25 * np.sin(2 * ph)) * _env(len(t), min(0.12, dur / 3), min(0.2, dur / 3), 1.5)
    return _norm(y, 0.16)

def drop(seed=15):
    """A falling glide into a soft low thump (a metric dropping, an error state)."""
    dur = 0.55
    t = _t(dur)
    f = 900 * (110 / 900) ** (np.clip(t / 0.38, 0, 1) ** 1.3)
    ph = 2 * np.pi * np.cumsum(f) / SR
    glide = np.tanh(1.6 * np.sin(ph)) * np.exp(-np.clip(t - 0.3, 0, None) / 0.08)
    th = np.clip(t - 0.34, 0, None)
    thump = np.sin(2 * np.pi * (48 + 60 * np.exp(-th / 0.03)) * th) * np.exp(-th / 0.09) * (t >= 0.34)
    return _norm(_bandpass(glide, 80, 4000) * 0.6 + thump, 0.5)

def chirp(seed=16, note=84, dur=0.07):
    """A data packet: a short sine chirp with a little upward bend (softer than the 8-bit blip)."""
    t = _t(dur)
    f0 = 440 * 2 ** ((note - 69) / 12)
    f = f0 * (1 + 0.06 * t / dur)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * _env(len(t), 0.003, dur * 0.6, 1.5)
    return _norm(y, 0.2)

def ding(seed=17):
    """A notification: one bright bell strike with a fifth on top."""
    dur = 1.1
    t = _t(dur)
    y = np.zeros(len(t))
    for f, amp, dec in [(1567.98, 1.0, 0.42), (2349.3, 0.45, 0.3), (3135.96, 0.18, 0.15), (1567.98 * 2.76, 0.08, 0.06)]:
        y += amp * np.sin(2 * np.pi * f * t) * np.exp(-t / dec)
    y *= np.clip(t / 0.002, 0, 1)
    return _norm(y, 0.30)

GENERATORS = dict(scribble=scribble, pop=pop, click=click, tick=tick, whoosh=whoosh, error=error, success=success,
                  stamp=stamp, blip=blip, hop=hop, lock=lock, sparkle=sparkle, riser=riser,
                  sweep=sweep, drop=drop, chirp=chirp, ding=ding)

def _declick(y, fin=0.0015, fout=0.008):
    y = np.asarray(y, dtype=np.float32).copy()
    a, b = int(fin * SR), int(fout * SR)
    if len(y) > a + b:
        y[:a] *= np.linspace(0, 1, a)
        y[-b:] *= np.linspace(1, 0, b)
    return y

def render(name, **kw):
    """Generate one effect with click-free edges."""
    return _declick(GENERATORS[name](**kw))


if __name__ == '__main__':
    import subprocess
    from pathlib import Path
    out = Path(__file__).resolve().parent.parent / 'audio' / 'sfx-preview'
    out.mkdir(parents=True, exist_ok=True)
    for name in GENERATORS:
        y = render(name)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', str(out / f'{name}.wav')],
                       input=y.astype(np.float32).tobytes(), check=True)
        print(f'{name:10s} {len(y) / SR:5.2f} s  peak {np.abs(y).max():.2f}')
