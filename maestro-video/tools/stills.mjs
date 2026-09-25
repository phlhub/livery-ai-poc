// Render individual QC frames:  node tools/stills.mjs out/qc 3.5 10 22.4 ...
import fs from 'node:fs';
import path from 'node:path';
import { serve, openFilm } from './lib.mjs';
const [dir, ...times] = process.argv.slice(2);
fs.mkdirSync(dir, { recursive: true });
const srv = await serve();
const { browser, frame } = await openFilm(srv);
for (const t of times) {
  const t0 = Date.now();
  const buf = await frame(parseFloat(t));
  fs.writeFileSync(path.join(dir, `f_${String(parseFloat(t).toFixed(2)).padStart(6, '0')}.png`), buf);
  console.log(t, Date.now() - t0, 'ms');
}
await browser.close(); srv.close();
