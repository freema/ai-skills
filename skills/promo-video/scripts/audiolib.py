"""Small audio helpers on top of ffmpeg + numpy (48 kHz float32 stereo)."""
import json, re, subprocess, wave
import numpy as np

SR = 48000

def load(path, sr=SR, channels=2):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', str(channels), '-ar', str(sr), '-f', 'f32le', '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, channels).copy()

def save(path, x, sr=SR):
    x = np.asarray(x, dtype=np.float32)
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(sr), '-ac', str(x.shape[1]), '-i', '-',
                    '-c:a', 'pcm_s24le', str(path)], input=x.tobytes(), check=True)

def loudness(path_or_array, sr=SR):
    """Integrated loudness (LUFS) and true peak (dBTP) via ffmpeg ebur128."""
    if isinstance(path_or_array, np.ndarray):
        x = path_or_array.astype(np.float32)
        args = ['ffmpeg', '-nostats', '-v', 'info', '-f', 'f32le', '-ar', str(sr), '-ac', str(x.shape[1]), '-i', '-']
        inp = x.tobytes()
    else:
        args = ['ffmpeg', '-nostats', '-v', 'info', '-i', str(path_or_array)]
        inp = None
    r = subprocess.run(args + ['-af', 'ebur128=peak=true', '-f', 'null', '-'], input=inp, capture_output=True)
    err = r.stderr.decode('utf-8', 'replace')
    summary = err[err.rfind('Summary:'):]
    I = float(re.search(r'I:\s+(-?[\d.]+|-inf) LUFS', summary).group(1))
    tp = re.search(r'Peak:\s+(-?[\d.]+|-inf) dBFS', summary)
    return I, (float(tp.group(1)) if tp else None)

def db(g):
    return 10 ** (g / 20)

def normalize(x, target, tolerance=0.05, max_iter=4):
    """Pure gain normalization to an integrated LUFS target (iterative, gating aware)."""
    for _ in range(max_iter):
        I, tp = loudness(x)
        if abs(I - target) <= tolerance:
            break
        x = x * db(target - I)
    return x.astype(np.float32)

def fade(x, fin=0.0, fout=0.0, sr=SR):
    x = x.copy()
    n_in, n_out = int(fin * sr), int(fout * sr)
    if n_in:
        x[:n_in] *= np.linspace(0, 1, n_in)[:, None] ** 2
    if n_out:
        x[-n_out:] *= np.linspace(1, 0, n_out)[:, None] ** 2
    return x

def ffilter(x, af, sr=SR):
    """Run a float32 stereo buffer through an ffmpeg audio filter chain."""
    x = np.asarray(x, dtype=np.float32)
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(sr), '-ac', str(x.shape[1]), '-i', '-',
                          '-af', af, '-f', 'f32le', '-ar', str(sr), '-ac', str(x.shape[1]), '-'],
                         input=x.tobytes(), check=True, capture_output=True).stdout
    y = np.frombuffer(raw, dtype=np.float32).reshape(-1, x.shape[1]).copy()
    if len(y) < len(x):
        y = np.concatenate([y, np.zeros((len(x) - len(y), x.shape[1]), np.float32)])
    return y[:len(x)]

def master(x, target, ceiling_db=-1.0, iters=8, tol=0.05):
    """Gain to an integrated LUFS target with a true-peak-safe limiter; iterate until both hold."""
    lim = db(ceiling_db - 1.0)          # sample-peak ceiling 1 dB under the true-peak ceiling
    for _ in range(iters):
        I, _ = loudness(x)
        x = x * db(target - I)
        x = ffilter(x, f'alimiter=limit={lim:.4f}:attack=4:release=60:level=false:latency=true')
        I2, tp = loudness(x)
        if abs(I2 - target) <= tol and tp is not None and tp <= ceiling_db:
            break
    return x.astype(np.float32)
