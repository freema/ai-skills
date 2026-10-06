#!/usr/bin/env python3
"""Cut composition clips from raw screen or canvas recordings, as listed in capture/clips.json.

Each clip: trim → constant frame rate (MediaRecorder output has a variable one) → crop in source pixels → scale →
optional hold of the last good frame. Output: assets/clips/<name>.mp4 (H.264, yuv420p, no audio, short GOP so the
renderer can seek it cheaply).

capture/clips.json:
  {
    "raw": "capture/raw", "out": "assets/clips", "fps": 60, "pad": "0x000000",
    "clips": {
      "hook-level1": {"src": "level1", "start": 16.0, "dur": 0.5, "size": [1920, 1080], "scale": "neighbor"},
      "cell-level1": {"src": "level1", "start": 2.0, "dur": 7.6, "crop": [0, 90, 960, 540], "size": [448, 252], "scale": "area", "hold": 6.0},
      "wide-demo":   {"src": "demo.webm", "start": 9.0, "dur": 0.3, "size": [1920, 1080], "scale": "fit:lanczos"}
    }
  }

scale: an ffmpeg scaler. Use "neighbor" for integer upscales of pixel art (2×, 3×) so pixels stay hard, "area" to
shrink, "lanczos" for other enlargements. "fit:<scaler>" keeps the whole frame and pads the sides with "pad".
hold: seconds into the clip after which the last frame is held (a run that ends early, a game over to hide).
Output width and height must be even for x264.

  python3 scripts/cut_clips.py [name ...]
"""
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def cut(cfg, name):
    c = cfg['clips'][name]
    w, h = c['size']
    if w % 2 or h % 2:
        raise SystemExit(f'{name}: size {w}x{h} must be even for x264')
    src = c['src'] if os.path.splitext(c['src'])[1] else c['src'] + '.webm'
    vf = [f"fps={cfg.get('fps', 60)}"]
    if c.get('crop'):
        x, y, cw, ch = c['crop']
        vf.append(f'crop={cw}:{ch}:{x}:{y}')
    scaler = c.get('scale', 'lanczos')
    if scaler.startswith('fit:'):
        vf.append(f"scale=-2:{h}:flags={scaler[4:]},pad={w}:{h}:(ow-iw)/2:0:color={cfg.get('pad', '0x000000')}")
    else:
        vf.append(f'scale={w}:{h}:flags={scaler}')
    if c.get('hold') is not None:
        vf.append(f"trim=0:{c['hold']},setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration={c['dur'] - c['hold']:.3f}")
    vf.append('format=yuv420p')
    out = os.path.join(ROOT, cfg.get('out', 'assets/clips'), name + '.mp4')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(c['start']), '-t', str(c['dur']),
                    '-i', os.path.join(ROOT, cfg.get('raw', 'capture/raw'), src),
                    '-vf', ','.join(vf), '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', str(c.get('crf', 14)),
                    '-g', '30', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], check=True)
    return out


if __name__ == '__main__':
    cfg = json.load(open(os.path.join(ROOT, 'capture', 'clips.json')))
    for n in sys.argv[1:] or cfg['clips']:
        print(f'{n:28s} {os.path.getsize(cut(cfg, n)) // 1024:6d} KB')
