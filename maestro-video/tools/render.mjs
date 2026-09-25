// Frame-exact render: N headless Chromium workers each encode a contiguous range of frames,
// then segments are concatenated and muxed with the generated soundtrack.
//   node tools/render.mjs [--workers 4] [--from 0] [--to 108] [--out out/maestro.mp4]
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { serve, openFilm, ffmpegPath, ROOT } from './lib.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? [...a, [v.slice(2), arr[i + 1]]] : a), []));
const FPS = 30;
const workers = +(args.workers || 4);
const from = +(args.from || 0), to = +(args.to || 108);
const out = path.resolve(ROOT, args.out || 'out/maestro.mp4');
const tmp = path.join(ROOT, 'out', 'segments');
fs.mkdirSync(tmp, { recursive: true });
const FF = ffmpegPath();
const f0 = Math.round(from * FPS), f1 = Math.round(to * FPS);
const total = f1 - f0;
const per = Math.ceil(total / workers);

const srv = await serve();
// write cue sheet for the soundtrack
{
  const { browser, page } = await openFilm(srv);
  const cues = await page.evaluate(() => window.audioCues());
  fs.writeFileSync(path.join(ROOT, 'out', 'cues.json'), JSON.stringify(cues));
  await browser.close();
}
let done = 0; const t0 = Date.now();
async function worker(k) {
  const a = f0 + k * per, b = Math.min(f1, a + per);
  if (a >= b) return null;
  const seg = path.join(tmp, `seg_${String(k).padStart(2, '0')}.mp4`);
  const ff = spawn(FF, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-tune', 'grain', '-pix_fmt', 'yuv420p',
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-r', String(FPS), seg], { stdio: ['pipe', 'inherit', 'inherit'] });
  const { browser, frame } = await openFilm(srv);
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
  spawnSync(FF, ['-y', '-loglevel', 'error', '-i', video, '-i', wav, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', out], { stdio: 'inherit' });
} else {
  fs.copyFileSync(video, out);
}
console.log('wrote', out, ((Date.now() - t0) / 1000).toFixed(0) + 's');
