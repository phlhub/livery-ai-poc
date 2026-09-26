"""ElevenLabs narration for Magister V2.

Reads the API key from the ELEVENLABS_API_KEY environment variable (never from files, never printed).
The script text and ids come from NARRATION in src/data.js, so the audio always matches the approved plan.

    python3 tools/elevenlabs.py check                     # connectivity + account, no credits used
    python3 tools/elevenlabs.py voices                    # list candidate voices (male, American, mature)
    python3 tools/elevenlabs.py samples [id id id]        # Line 1 in 3 voices -> narration/samples/
    python3 tools/elevenlabs.py lines <voice_id>          # Lines 1-11 -> narration/lineNN.wav (+ voice.json)

Settings are fixed for consistency across all lines (see SETTINGS). Adjacent lines are passed as
previous_text / next_text so the delivery flows as one continuous read.
"""
import io, json, os, re, sys, urllib.error, urllib.request, wave

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
NARR = os.path.join(ROOT, 'narration')
API = 'https://api.elevenlabs.io'
MODEL = 'eleven_multilingual_v2'          # most natural, stable long-form model
SETTINGS = {                               # calm, consistent documentary read
    'stability': 0.55,
    'similarity_boost': 0.78,
    'style': 0.12,
    'use_speaker_boost': True,
    'speed': 0.96,
}
SEED = 1848
# Voices that historically fit the brief (warm, mature American male, not an announcer).
PREFERRED = ['Brian', 'Eric', 'Chris', 'Bill', 'Roger', 'Adam']
# Spoken forms: CSAM is read as letters; everything else as written.
SPOKEN = [(r'\bCSAM’s\b', 'C-S-A-M’s'), (r'\bCSAM\b', 'C-S-A-M')]


def key():
    k = os.environ.get('ELEVENLABS_API_KEY', '').strip()
    if not k:
        sys.exit('ELEVENLABS_API_KEY is not set in this session. Add it as an environment variable in the '
                 'environment settings and start a new session.')
    return k


def call(path, body=None, accept='application/json'):
    req = urllib.request.Request(API + path, method='POST' if body is not None else 'GET',
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={'xi-api-key': key(), 'accept': accept, 'content-type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.read(), r.headers
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors='replace')[:400]
        sys.exit(f'ElevenLabs API error {e.code} on {path}: {detail}')
    except urllib.error.URLError as e:
        sys.exit(f'Cannot reach {API} ({e.reason}). Is api.elevenlabs.io allowed in the environment network settings?')


def script():
    src = open(os.path.join(ROOT, 'src', 'data.js'), encoding='utf-8').read()
    block = src[src.index('const NARRATION = ['):]
    block = block[:block.index('];')]
    rows = re.findall(r"id: '(line\d+)', start: ([\d.]+), dur: ([\d.]+), text: '(.*?)' \}", block)
    return [{'id': i, 'start': float(s), 'dur': float(d), 'text': t} for i, s, d, t in rows]


def spoken(text):
    for pat, rep in SPOKEN:
        text = re.sub(pat, rep, text)
    return text


def tts(voice_id, text, prev=None, nxt=None):
    """Returns (pcm_bytes, sample_rate). Tries 44.1 kHz PCM, falls back to 24 kHz PCM for plans without it."""
    body = {'text': spoken(text), 'model_id': MODEL, 'voice_settings': SETTINGS, 'seed': SEED}
    if prev:
        body['previous_text'] = spoken(prev)
    if nxt:
        body['next_text'] = spoken(nxt)
    for fmt, sr in (('pcm_44100', 44100), ('pcm_24000', 24000)):
        req = urllib.request.Request(f'{API}/v1/text-to-speech/{voice_id}?output_format={fmt}', method='POST',
                                     data=json.dumps(body).encode(),
                                     headers={'xi-api-key': key(), 'accept': 'audio/pcm', 'content-type': 'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                return r.read(), sr
        except urllib.error.HTTPError as e:
            detail = e.read().decode(errors='replace')
            if e.code in (400, 401, 403) and 'output_format' in detail and fmt == 'pcm_44100':
                continue          # plan doesn't include 44.1 kHz PCM
            sys.exit(f'ElevenLabs API error {e.code}: {detail[:400]}')
    sys.exit('No supported PCM output format for this plan.')


def save_wav(path, pcm, sr):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(pcm)
    return len(pcm) / 2 / sr


def voices():
    data, _ = call('/v1/voices')
    out = []
    for v in json.loads(data)['voices']:
        lab = {k: (val or '').lower() for k, val in (v.get('labels') or {}).items()}
        if lab.get('gender') == 'male' and 'american' in lab.get('accent', ''):
            out.append(v)
    rank = lambda v: (PREFERRED.index(v['name'].split(' ')[0]) if v['name'].split(' ')[0] in PREFERRED else 99)
    return sorted(out, key=rank)


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'check'
    if cmd == 'check':
        data, _ = call('/v1/user/subscription')
        s = json.loads(data)
        print(f"Connected. Plan: {s.get('tier')} · characters used {s.get('character_count')} of {s.get('character_limit')}")
        n = sum(len(spoken(l['text'])) for l in script())
        print(f'Full narration is about {n} characters; three Line 1 samples are about {3 * len(script()[0]["text"])}.')
    elif cmd == 'voices':
        for v in voices():
            lab = v.get('labels') or {}
            print(f"{v['voice_id']}  {v['name']:<28} {lab.get('age', ''):<12} {lab.get('description', '') or lab.get('descriptive', '')}  {lab.get('use_case', '')}")
    elif cmd == 'samples':
        ids = sys.argv[2:] or [v['voice_id'] for v in voices()[:3]]
        names = {v['voice_id']: v['name'] for v in voices()}
        line1 = script()[0]
        for vid in ids:
            pcm, sr = tts(vid, line1['text'], nxt=script()[1]['text'])
            nm = re.sub(r'[^A-Za-z0-9]+', '_', names.get(vid, vid)).strip('_')
            d = save_wav(os.path.join(NARR, 'samples', f'line01_{nm}_{vid}.wav'), pcm, sr)
            print(f'{nm}: {d:.1f}s (planned {line1["dur"]}s)')
    elif cmd == 'lines':
        vid = sys.argv[2]
        lines = script()
        report = []
        for k, l in enumerate(lines):
            prev = lines[k - 1]['text'] if k else None
            nxt = lines[k + 1]['text'] if k + 1 < len(lines) else None
            pcm, sr = tts(vid, l['text'], prev, nxt)
            d = save_wav(os.path.join(NARR, f"{l['id']}.wav"), pcm, sr)
            report.append((l['id'], d, l['dur']))
            print(f"{l['id']}: {d:.1f}s (planned {l['dur']:.1f}s){'  <- longer than planned' if d > l['dur'] + 0.8 else ''}")
        json.dump({'voice_id': vid, 'model': MODEL, 'settings': SETTINGS, 'seed': SEED,
                   'lines': [{'id': i, 'seconds': round(d, 2), 'planned': p} for i, d, p in report]},
                  open(os.path.join(NARR, 'voice.json'), 'w'), indent=2)
    else:
        sys.exit(__doc__)


if __name__ == '__main__':
    main()
