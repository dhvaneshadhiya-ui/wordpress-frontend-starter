// Deterministic frame-by-frame render of index.html -> showreel.mp4
//   node showreel/render.mjs                 full render (needs audio.wav, see audio.mjs)
//   node showreel/render.mjs --stills 1,4.2  write contact-sheet PNGs at the given seconds
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { execSync } from 'node:child_process';

// Use a local playwright if installed, otherwise the global one.
let pw;
try { pw = await import('playwright'); }
catch { pw = await import(pathToFileURL(path.join(execSync('npm root -g').toString().trim(), 'playwright', 'index.mjs')).href); }
const { chromium } = pw;

const dir = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const stillsArg = args.includes('--stills') ? args[args.indexOf('--stills') + 1] : null;
const outDir = args.includes('--out') ? args[args.indexOf('--out') + 1] : dir;
const WORKERS = 4;

const browser = await chromium.launch({
  args: ['--allow-file-access-from-files', '--disable-web-security'],
});
const url = pathToFileURL(path.join(dir, 'index.html')).href + '?render=1';

async function newPage() {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('pageerror', e));
  page.on('console', m => m.type() === 'error' && console.error('console', m.text()));
  await page.goto(url);
  await page.evaluate(() => window.ready);
  return page;
}
const grab = (page, f) => page.evaluate(f => { window.renderFrame(f); return document.getElementById('c').toDataURL('image/jpeg', 0.97); }, f)
  .then(d => Buffer.from(d.split(',')[1], 'base64'));

if (stillsArg) {
  const page = await newPage();
  const fps = await page.evaluate(() => window.META.FPS);
  fs.mkdirSync(outDir, { recursive: true });
  for (const s of stillsArg.split(',').map(Number)) {
    const buf = await grab(page, Math.round(s * fps));
    fs.writeFileSync(path.join(outDir, `still-${s.toFixed(2)}.jpg`), buf);
  }
  await browser.close();
  process.exit(0);
}

const pages = await Promise.all(Array.from({ length: WORKERS }, newPage));
const { FPS, DUR } = await pages[0].evaluate(() => window.META);
const total = Math.round(FPS * DUR);
const outFile = path.join(outDir, 'showreel.mp4');
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error',
  '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-i', path.join(dir, 'audio.wav'),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p', '-tune', 'grain',
  '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', outFile], { stdio: ['pipe', 'inherit', 'inherit'] });

const done = new Map(); let next = 0, issued = 0; const t0 = Date.now();
const write = buf => new Promise(r => ff.stdin.write(buf) ? r() : ff.stdin.once('drain', r));
async function flush() { while (done.has(next)) { const b = done.get(next); done.delete(next); await write(b); next++;
  if (next % 60 === 0) console.log(`frame ${next}/${total}  ${((Date.now() - t0) / 1000).toFixed(0)}s`); } }
await Promise.all(pages.map(async page => {
  while (issued < total) { const f = issued++; done.set(f, await grab(page, f)); await flush(); }
}));
await flush();
ff.stdin.end();
await new Promise(r => ff.on('close', r));
await browser.close();
console.log('wrote', outFile);
