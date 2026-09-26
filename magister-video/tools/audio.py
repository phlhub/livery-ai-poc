"""Generative score for MAGISTER, locked to the picture through the cue sheet exported by the film.

    python3 tools/audio.py out/cues.json out/soundtrack.wav [duration] [offset]

Everything is synthesised here (no samples): additive pads, mallet plucks, inharmonic bells,
soft UI ticks, filtered-noise swells, and a synthetic-impulse convolution reverb.
"""
import json, sys
import numpy as np
from scipy.signal import fftconvolve, butter, sosfilt
from scipy.io import wavfile

SR = 48000
cues = json.load(open(sys.argv[1]))
out_path = sys.argv[2]
DUR = float(sys.argv[3]) if len(sys.argv) > 3 else 108.0
OFFSET = float(sys.argv[4]) if len(sys.argv) > 4 else 0.0
TOTAL = 108.0
N = int(TOTAL * SR) + SR
rng = np.random.default_rng(11)

dry = np.zeros((N, 2))
send = np.zeros((N, 2))     # reverb send
tension = np.zeros((N, 2))  # the overloaded world: hard-gated at the freeze / reversal


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def place(buf, t, sig, pan=0.0, rev=0.3, gain=1.0):
    i = int(t * SR)
    if i >= N or i + len(sig) <= 0:
        return
    j = min(N, i + len(sig))
    s = sig[: j - i] * gain
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[i:j, 0] += s * l
    buf[i:j, 1] += s * r
    if buf is tension:
        rev = 0.0
    send[i:j, 0] += s * l * rev
    send[i:j, 1] += s * r * rev


def env_adsr(n, a, r, sustain_len):
    t = np.arange(n) / SR
    e = np.ones(n)
    e = np.minimum(e, t / max(a, 1e-3))
    rel_start = sustain_len
    e = e * np.exp(-np.maximum(0, t - rel_start) / max(r / 4, 1e-3))
    return np.clip(e, 0, 1)


def pad(freqs, t0, t1, amp=0.06, att=2.0, rel=2.5, bright=6, buf=None, pan_spread=0.5):
    n = int((t1 - t0 + rel) * SR)
    t = np.arange(n) / SR
    e = env_adsr(n, att, rel, t1 - t0)
    for k, f in enumerate(freqs):
        sig = np.zeros(n)
        for v, det in enumerate((-0.12, 0.0, 0.11)):
            ff = f * 2 ** (det / 12)
            ph = rng.random() * 2 * np.pi
            for h in range(1, bright + 1):
                if ff * h > 9000:
                    break
                sig += np.sin(2 * np.pi * ff * h * t + ph * h) / (h ** 1.6)
        lfo = 1 + 0.12 * np.sin(2 * np.pi * (0.07 + 0.03 * k) * t + k)
        sig = sig * e * lfo * amp / 3
        pan = (k / max(1, len(freqs) - 1) - 0.5) * 2 * pan_spread
        place(buf if buf is not None else dry, t0, sig, pan, rev=0.55)


def pluck(f, t0, amp=0.05, decay=0.9, pan=0.0, rev=0.5, buf=None):
    n = int((decay * 5 + 0.05) * SR)
    t = np.arange(n) / SR
    e = np.minimum(1, t / 0.004) * np.exp(-t / decay)
    sig = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / (decay * 0.4))
           + 0.12 * np.sin(2 * np.pi * 3.01 * f * t) * np.exp(-t / (decay * 0.2)))
    place(buf if buf is not None else dry, t0, sig * e * amp, pan, rev)


def bell(f, t0, amp=0.05, decay=2.5, pan=0.0, rev=0.7):
    n = int(decay * 5 * SR)
    t = np.arange(n) / SR
    sig = np.zeros(n)
    for ratio, a, d in ((1, 1, 1), (2.0, 0.45, 0.7), (2.76, 0.3, 0.5), (5.4, 0.12, 0.25), (8.93, 0.05, 0.12)):
        sig += a * np.sin(2 * np.pi * f * ratio * t) * np.exp(-t / (decay * d))
    sig *= np.minimum(1, t / 0.006)
    place(dry, t0, sig * amp, pan, rev)


def tick(t0, amp=0.03, freq=2800, pan=0.0, buf=None):
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    sig = np.sin(2 * np.pi * freq * t) * np.exp(-t / 0.018) + 0.4 * np.sin(2 * np.pi * freq * 1.5 * t) * np.exp(-t / 0.01)
    place(buf if buf is not None else dry, t0, sig * amp, pan, rev=0.25)


def noise_swell(t0, dur, amp=0.05, lo=300, hi=3000, shape='rise', buf=None, pan=0.0):
    n = int(dur * SR)
    x = rng.standard_normal(n)
    sos = butter(2, [lo, hi], btype='band', fs=SR, output='sos')
    y = sosfilt(sos, x)
    u = np.arange(n) / n
    if shape == 'rise':
        e = u ** 2 * (1 - np.clip((u - 0.92) / 0.08, 0, 1))
    elif shape == 'fall':
        e = (1 - u) ** 2 * np.minimum(1, u / 0.05)
    else:
        e = np.sin(np.pi * u) ** 2
    place(buf if buf is not None else dry, t0, y * e * amp, pan, rev=0.6)


def sub(f, t0, dur, amp=0.1):
    n = int(dur * SR)
    t = np.arange(n) / SR
    e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    place(dry, t0, np.sin(2 * np.pi * f * t) * e * amp, 0, rev=0.1)


def click(t0, amp=0.05, body=180):
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    x = rng.standard_normal(n) * np.exp(-t / 0.004)
    sos = butter(2, [1500, 6000], btype='band', fs=SR, output='sos')
    sig = sosfilt(sos, x) * 0.6 + np.sin(2 * np.pi * body * t) * np.exp(-t / 0.05)
    place(dry, t0, sig * amp, 0, rev=0.35)


# ---------------------------------------------------------------- harmony
D2, A2 = 38, 45
CH = {
    'Dmaj9': [38, 45, 54, 61, 64],
    'Bm11': [35, 42, 50, 57, 64],
    'Gmaj9': [31, 38, 47, 54, 57],
    'Aadd9': [33, 40, 49, 59, 64],
    'DF#': [42, 50, 57, 62, 66],
    'Em9': [28, 40, 47, 55, 62],
    'Bm9': [35, 42, 50, 57, 61],
}
SCHED = [
    (22.4, 28.6, 'Dmaj9', 0.05), (28.0, 33.6, 'Bm11', 0.05), (33.0, 38.4, 'Gmaj9', 0.05),
    (44.0, 50.0, 'Dmaj9', 0.045), (49.5, 54.0, 'Dmaj9', 0.05), (53.6, 58.2, 'Bm11', 0.05),
    (57.8, 62.0, 'Gmaj9', 0.05), (61.6, 66.4, 'Aadd9', 0.05), (66.0, 71.2, 'DF#', 0.05),
    (70.8, 76.4, 'Gmaj9', 0.05), (78.4, 83.4, 'Dmaj9', 0.055), (83.0, 88.4, 'Bm11', 0.05),
    (88.0, 94.2, 'Gmaj9', 0.045), (93.8, 98.2, 'Aadd9', 0.045), (97.8, 102.6, 'Bm9', 0.045),
    (102.3, 106.8, 'Dmaj9', 0.055),
]
for t0, t1, name, a in SCHED:
    pad([midi(m) for m in CH[name]], t0, t1, amp=a, att=1.8, rel=3.0 if t1 < 106 else 4.5)


def chord_at(t):
    cur = 'Dmaj9'
    for t0, t1, name, _ in SCHED:
        if t0 <= t < t1:
            cur = name
    return CH[cur]


# opening drone + tension, gated by the freeze
pad([midi(D2), midi(A2)], 0.6, 18.0, amp=0.06, att=4.0, rel=0.05, bright=4, buf=tension)
pad([midi(57), midi(58), midi(64)], 8.0, 18.0, amp=0.03, att=8.0, rel=0.05, bright=5, buf=tension)
noise_swell(7.0, 11.2, amp=0.05, lo=400, hi=5000, shape='rise', buf=tension)
pad([midi(38), midi(63), midi(57), midi(58)], 76.2, 78.4, amp=0.035, att=0.6, rel=0.05, bright=5, buf=tension)
noise_swell(76.2, 2.3, amp=0.04, lo=500, hi=5000, shape='rise', buf=tension)
# recipe: thin, mechanical bed
pad([midi(33), midi(40)], 37.8, 43.2, amp=0.04, att=1.0, rel=1.5, bright=3)

# arpeggios: the living system's pulse
def arps(t0, t1, step, amp, oct=12):
    t = t0
    k = 0
    while t < t1:
        ch = chord_at(t)
        notes = sorted(ch[2:]) + [ch[2] + 12, ch[3] + 12]
        m = notes[[0, 2, 1, 3, 4, 2][k % 6]] + oct
        fade = min(1, (t - t0) / 1.5, (t1 - t) / 1.5)
        pluck(midi(m), t, amp=amp * fade, decay=0.5, pan=0.5 * np.sin(k * 1.7), rev=0.6)
        t += step
        k += 1

arps(27.6, 37.4, 0.3125, 0.018)
arps(49.6, 66.0, 0.3125, 0.02)
arps(66.5, 76.0, 0.625, 0.016)
arps(79.0, 88.2, 0.3125, 0.017)

# ---------------------------------------------------------------- cues
penta = [74, 78, 81, 85, 88, 90, 93, 97]
for c in cues:
    t, ty = c['t'], c['type']
    if ty == 'tick':
        tick(t, amp=0.022 * c.get('v', 0.4) / 0.4, freq=2200 + 1400 * c.get('p', 0.5), pan=(c.get('p', 0.5) - 0.5) * 1.4, buf=tension)
    elif ty == 'hop':
        noise_swell(t, 0.5, amp=0.02, lo=1500, hi=6000, shape='arc', buf=tension, pan=rng.uniform(-0.6, 0.6))
    elif ty == 'breath':
        noise_swell(t, 3.5, amp=0.035, lo=200, hi=1600, shape='arc')
        sub(midi(26), t + 0.5, 4.0, amp=0.06)
    elif ty == 'whoosh':
        noise_swell(t, 2.2, amp=0.05 * c.get('v', 0.5) / 0.5, lo=300, hi=4000, shape='arc')
    elif ty == 'ring':
        for k, m in enumerate([86, 90, 93, 97]):
            pad([midi(m)], t + k * 0.25, t + 2.8, amp=0.012, att=1.2, rel=2.5, bright=1)
        noise_swell(t - 0.5, 2.6, amp=0.03, lo=2000, hi=9000, shape='rise')
        sub(midi(26), t, 3.0, amp=0.07)
    elif ty == 'title':
        bell(midi(62), t, amp=0.05, decay=3.0)
        bell(midi(69), t + 0.02, amp=0.03, decay=3.0, pan=0.2)
    elif ty == 'agent':
        bell(midi(penta[c['i']]), t, amp=0.028, decay=1.6, pan=np.sin(c['i'] * 1.3) * 0.6)
    elif ty == 'dive':
        noise_swell(t, 2.0, amp=0.06, lo=200, hi=6000, shape='rise')
        sub(midi(29), t + 1.6, 1.4, amp=0.06)
    elif ty == 'step':
        click(t, amp=0.05)
    elif ty == 'stop':
        click(t, amp=0.07, body=70)
    elif ty == 'bend':
        noise_swell(t, 1.6, amp=0.03, lo=1200, hi=7000, shape='rise')
    elif ty == 'loopstep':
        pluck(midi([74, 78, 81, 85, 81, 78][c['i']]), t, amp=0.035, decay=0.8, pan=np.sin(c['i']) * 0.5)
    elif ty == 'event':
        pluck(midi(81), t, amp=0.03, decay=0.6, pan=rng.uniform(-0.5, 0.5))
    elif ty == 'resolve':
        pluck(midi(88), t, amp=0.022, decay=0.7, pan=rng.uniform(-0.5, 0.5))
    elif ty == 'opp':
        bell(midi(78), t, amp=0.045, decay=2.5, pan=-0.3)
        bell(midi(81), t + 0.9, amp=0.04, decay=2.5, pan=-0.1)
    elif ty == 'surface':
        for k, m in enumerate([62, 66, 69, 73]):
            bell(midi(m), t + k * 0.05, amp=0.035, decay=3.0, pan=(k - 1.5) * 0.2)
        sub(midi(26), t - 0.3, 2.5, amp=0.06)
    elif ty == 'stake':
        pluck(midi([66, 69, 71, 74, 76][c['i']]), t, amp=0.03, decay=1.2, pan=(c['i'] - 2) * 0.3)
    elif ty == 'callback':
        noise_swell(t - 0.2, 1.6, amp=0.04, lo=300, hi=5000, shape='arc')
    elif ty == 'legend':
        bell(midi([69, 74, 78, 81][c['i']]), t, amp=0.03, decay=2.0)
    elif ty == 'line':
        bell(midi(57), t, amp=0.035, decay=3.5)
    elif ty == 'lockup':
        bell(midi(62), t, amp=0.05, decay=4.5)
        bell(midi(74), t + 0.03, amp=0.025, decay=4.0, pan=0.25)
        sub(midi(26), t - 0.2, 4.5, amp=0.07)

# callback ticks: the overload returns briefly
for k in range(26):
    t = 76.3 + 2.0 * (k / 26) ** 0.8
    tick(t, amp=0.018, freq=rng.uniform(2200, 3600), pan=rng.uniform(-0.7, 0.7), buf=tension)

# gates: the freeze and the callback reversal cut the overloaded world instantly
tt = np.arange(N) / SR
gate = np.ones(N)
for a, b in ((18.0, 19.5), (78.4, 200.0)):
    m = (tt >= a) & (tt < b)
    gate[m] = np.exp(-(tt[m] - a) / 0.03)
gate[(tt >= 19.5) & (tt < 76.0)] = 0
gate[(tt >= 76.0) & (tt < 78.4)] = 1
for ch in range(2):
    tension[:, ch] *= gate
dry += tension
send += tension * 0.4

# ---------------------------------------------------------------- reverb (synthetic IR)
L = int(3.2 * SR)
ti = np.arange(L) / SR
ir = np.zeros((L, 2))
for ch in range(2):
    n = rng.standard_normal(L)
    sos = butter(1, 5500, btype='low', fs=SR, output='sos')
    n = sosfilt(sos, n)
    ir[:, ch] = n * np.exp(-ti / 0.75) * np.minimum(1, ti / 0.01)
ir /= np.sqrt((ir ** 2).sum(axis=0))
wet = np.stack([fftconvolve(send[:, ch], ir[:, ch])[:N] for ch in range(2)], axis=1)

mix = dry + wet * 0.9
# gentle high-pass to remove rumble below 28 Hz
sos = butter(2, 28, btype='high', fs=SR, output='sos')
mix = sosfilt(sos, mix, axis=0)
# master: soft limiter + fades
mix = np.tanh(mix * 1.6) / 1.6
fade_in = np.clip(tt / 1.5, 0, 1)
fade_out = np.clip((TOTAL - tt) / 3.0, 0, 1) ** 1.5
mix *= (fade_in * fade_out)[:, None]
peak = np.max(np.abs(mix))
mix = mix / peak * 10 ** (-1.5 / 20)
a, b = int(OFFSET * SR), int((OFFSET + DUR) * SR)
wavfile.write(out_path, SR, (mix[a:b] * 32767).astype(np.int16))
print('soundtrack', out_path, f'{DUR:.1f}s peak-normalised')
