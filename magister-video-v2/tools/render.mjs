// Frame-exact render: N headless Chromium workers each encode a contiguous range of frames,
// then segments are concatenated and muxed with the generated soundtrack (+ narration, if present).
//   node tools/render.mjs [--workers 4] [--from 0] [--to <end>] [--out <file>] [--guide]
// Output name: out/magister_v2_narrated.mp4 when all narration/lineNN.wav files exist,
// otherwise out/magister_v2_no_voice.mp4 (music + sound only). The narration plan is written to out/narration_plan.srt.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { serve, openFilm, ffmpegPath, ROOT } from './lib.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? [...a, [v.slice(2), arr[i + 1]]] : a), []));
const FPS = 30;
const workers = +(args.workers || 4);
const guide = process.argv.includes('--guide');
const query = guide ? 'render&guide' : 'render';
const tmp = path.join(ROOT, 'out', 'segments');
fs.mkdirSync(tmp, { recursive: true });
const FF = ffmpegPath();
const srv = await serve();
// cue sheet + pacing + narration plan for the soundtrack
let meta;
{
  const { browser, page } = await openFilm(srv);
  meta = await page.evaluate(() => window.audioMeta());
  fs.writeFileSync(path.join(ROOT, 'out', 'cues.json'), JSON.stringify(meta));
  await browser.close();
}
const from = +(args.from || 0), to = +(args.to || meta.duration);
const voiced = meta.narration.every((n) => fs.existsSync(path.join(ROOT, 'narration', `${n.id}.wav`)));
const out = path.resolve(ROOT, args.out || (voiced ? 'out/magister_v2_narrated.mp4' : guide ? 'out/magister_v2_narration_guide.mp4' : 'out/magister_v2_no_voice.mp4'));
// narration plan as subtitles
const ts = (x) => { const ms = Math.round(x * 1000); const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
const srt = path.join(ROOT, 'out', 'narration_plan.srt');
fs.writeFileSync(srt, meta.narration.map((n, i) => `${i + 1}\n${ts(n.start - from)} --> ${ts(n.start + n.dur - from)}\n${n.text}\n`).join('\n'));
const f0 = Math.round(from * FPS), f1 = Math.round(to * FPS);
const total = f1 - f0;
const per = Math.ceil(total / workers);

let done = 0; const t0 = Date.now();
async function worker(k) {
  const a = f0 + k * per, b = Math.min(f1, a + per);
  if (a >= b) return null;
  const seg = path.join(tmp, `seg_${String(k).padStart(2, '0')}.mp4`);
  const ff = spawn(FF, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-r', String(FPS), seg], { stdio: ['pipe', 'inherit', 'inherit'] });
  const { browser, frame } = await openFilm(srv, query);
  for (let f = a; f < b; f++) {
    const buf = await frame(f / FPS);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    done++;
    if (done % 90 === 0) {
      const el = (Date.now() - t0) / 1000;
      console.log(`${done}/${total} frames  ${el.toFixed(0)}s elapsed  ~${(el / done * (total - done)).toFixed(0)}s left`);
    }
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  await browser.close();
  return seg;
}
const segs = (await Promise.all([...Array(workers).keys()].map(worker))).filter(Boolean);
srv.close();
const list = path.join(tmp, 'list.txt');
fs.writeFileSync(list, segs.map((s) => `file '${s}'`).join('\n'));
const video = path.join(tmp, 'video.mp4');
spawnSync(FF, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', video], { stdio: 'inherit' });
// soundtrack
const wav = path.join(ROOT, 'out', 'soundtrack.wav');
const py = spawnSync('python3', [path.join(ROOT, 'tools', 'audio.py'), path.join(ROOT, 'out', 'cues.json'), wav, String(to - from), String(from)], { stdio: 'inherit' });
if (py.status === 0 && fs.existsSync(wav)) {
  spawnSync(FF, ['-y', '-loglevel', 'error', '-i', video, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', out], { stdio: 'inherit' });
} else {
  fs.copyFileSync(video, out);
}
console.log('wrote', out, ((Date.now() - t0) / 1000).toFixed(0) + 's');
