// Synthesizes the 15 s, 128 BPM soundtrack (audio.wav), cue-locked to the picture.
//   node showreel/audio.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 48000, DUR = 15, LEN = SR * DUR, B = 60 / 128, BAR = 4 * B, CUT = B / 2;
const L = new Float32Array(LEN), R = new Float32Array(LEN);       // dry bus
const RL = new Float32Array(LEN), RR = new Float32Array(LEN);     // reverb send
let seed = 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647 * 2 - 1;
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

function add(t0, dur, fn, { gain = 1, pan = 0, rev = 0 } = {}) {
  const s0 = Math.max(0, Math.round(t0 * SR)), n = Math.min(LEN - s0, Math.round(dur * SR));
  const gl = gain * Math.cos((pan + 1) * Math.PI / 4), gr = gain * Math.sin((pan + 1) * Math.PI / 4);
  for (let i = 0; i < n; i++) {
    const v = fn(i / SR, i);
    L[s0 + i] += v * gl; R[s0 + i] += v * gr;
    if (rev) { RL[s0 + i] += v * gl * rev; RR[s0 + i] += v * gr * rev; }
  }
}
const lp = () => { let y = 0; return (x, c) => (y += c * (x - y)); };          // one-pole lowpass, c in 0..1
const cut = hz => 1 - Math.exp(-2 * Math.PI * hz / SR);

/* ---------- instruments ---------- */
function kick(t, g = 1) { let ph = 0;
  add(t, 0.45, (u, i) => { const f = 44 + 120 * Math.exp(-u * 32); ph += 2 * Math.PI * f / SR;
    return Math.sin(ph) * Math.exp(-u * 7) + (i < 120 ? rnd() * 0.3 * (1 - i / 120) : 0); }, { gain: 0.9 * g }); }
function clap(t, g = 1) { const f = lp(), h = lp();
  add(t, 0.3, u => { const env = (u < 0.03 ? (Math.floor(u / 0.01) % 1 === 0 ? Math.exp(-(u % 0.01) * 300) : 0) : 0) + Math.exp(-u * 18) * 0.6;
    const n = rnd(), bp = f(n, cut(2400)) - h(n, cut(800)); return bp * env * 2.2; }, { gain: 0.5 * g, rev: 0.5, pan: 0.05 }); }
function hat(t, open = false, g = 1, pan = 0.2) { const f = lp();
  add(t, open ? 0.25 : 0.06, u => { const n = rnd(); return (n - f(n, cut(7000))) * Math.exp(-u * (open ? 14 : 70)); }, { gain: 0.22 * g, pan, rev: 0.1 }); }
function bass(t, m, d = CUT * 0.9, g = 1) { const f = lp(); let ph = 0; const hz = mtof(m);
  add(t, d, u => { ph = (ph + hz / SR) % 1; const saw = 2 * ph - 1, env = Math.min(1, u * 300) * Math.exp(-u * 5) * Math.min(1, (d - u) * 80);
    return (f(saw, cut(180 + 1400 * Math.exp(-u * 18))) * 0.8 + Math.sin(2 * Math.PI * hz * u) * 0.6) * env; }, { gain: 0.5 * g }); }
function pluck(t, m, g = 1, pan = 0) { const hz = mtof(m);
  add(t, 0.5, u => { const p = 2 * Math.PI * hz * u; return (Math.sin(p) + 0.35 * Math.sin(2 * p) * Math.exp(-u * 20) + 0.15 * Math.sin(3 * p) * Math.exp(-u * 30)) * Math.exp(-u * 9) * Math.min(1, u * 800); },
    { gain: 0.16 * g, pan, rev: 0.45 }); }
function bell(t, m, g = 1, pan = 0) { const hz = mtof(m);
  add(t, 1.6, u => { const p = 2 * Math.PI * hz * u; return (Math.sin(p + 1.8 * Math.sin(p * 3.5) * Math.exp(-u * 6)) * Math.exp(-u * 3.2)) * Math.min(1, u * 600); },
    { gain: 0.09 * g, pan, rev: 0.7 }); }
function whoosh(tEnd, dur, g = 1, up = true) { const f = lp(), f2 = lp();
  add(tEnd - dur, dur + 0.05, u => { const p = Math.min(1, u / dur), c = up ? 300 * Math.pow(30, p) : 9000 * Math.pow(1 / 30, p);
    const n = rnd(); const v = f(n, cut(c)) - f2(n, cut(c * 0.3)); return v * Math.pow(p, 2) * (u > dur ? Math.exp(-(u - dur) * 80) : 1) * 2.4; },
    { gain: 0.5 * g, rev: 0.4, pan: up ? -0.2 : 0.2 }); }
function impact(t, g = 1) { let ph = 0; const f = lp();
  add(t, 1.8, u => { const hz = 30 + 60 * Math.exp(-u * 9); ph += 2 * Math.PI * hz / SR;
    return Math.sin(ph) * Math.exp(-u * 2.6) * 1.1 + f(rnd(), cut(2500 * Math.exp(-u * 3) + 200)) * Math.exp(-u * 4) * 1.2; }, { gain: 0.8 * g, rev: 0.6 }); }
function thud(t, g = 1) { let ph = 0;
  add(t, 0.35, u => { const hz = 60 + 140 * Math.exp(-u * 25); ph += 2 * Math.PI * hz / SR; return Math.sin(ph) * Math.exp(-u * 10); }, { gain: 0.9 * g, rev: 0.2 }); }
function glitch(t, d = 0.05, g = 1) { let hold = 0, v = 0;
  add(t, d, (u, i) => { if (i % 40 === 0) { hold = rnd() > 0 ? 1 : -1; v = rnd(); } return Math.round(v * 4) / 4 * Math.exp(-u * 30) * hold; },
    { gain: 0.25 * g, pan: rnd() * 0.6 }); }
function pad(t, notes, d, g = 1) {   notes.forEach((m, k) => [-0.12, 0, 0.12].forEach((det, j) => { let ph = (rnd() + 1) / 2; const hz = mtof(m + det), f = lp();
    add(t, d, u => { ph = (ph + hz / SR) % 1; const env = Math.min(1, u / 0.25) * Math.min(1, (d - u) / 1.2);
      return f(2 * ph - 1, cut(500 + 1600 * Math.min(1, u / 1.5))) * env; }, { gain: 0.035 * g, pan: (j - 1) * 0.6, rev: 0.6 }); })); }
function riser(t0, t1, g = 1) { let ph = 0;
  add(t0, t1 - t0, u => { const p = u / (t1 - t0), hz = 200 * Math.pow(8, p * p); ph += 2 * Math.PI * hz / SR; return Math.sin(ph) * p * p * 0.5; }, { gain: 0.35 * g, rev: 0.5 }); }

/* ---------- arrangement (one scene per bar) ---------- */
const S = k => k * BAR;
// Scene 1 — drop
thud(B, 1.1); pluck(B, 45, 1.2);
[57, 60, 64, 69].forEach((m, i) => pluck(2 * B + i * 0.045, m, 1.1, (i - 1.5) * 0.4));
whoosh(S(1), 3.2 * B * 0.62, 1.1); riser(2 * B, S(1), 0.8);
// Scenes 2–7 — groove
const roots = [null, 45, 41, 48, 43, 41, 43];                 // A F C G F G
const chords = [null, [57, 60, 64, 69], [53, 57, 60, 65], [60, 64, 67, 72], [55, 59, 62, 67], [53, 57, 60, 65], [55, 59, 62, 67]];
for (let bar = 1; bar <= 6; bar++) {
  const t0 = S(bar), root = roots[bar];
  impact(t0, bar === 1 ? 0.9 : 0.45);
  for (let b = 0; b < 4; b++) {
    const tb = t0 + b * B;
    kick(tb, b === 0 ? 1.1 : 1);
    if (b % 2 === 1) clap(tb);
    hat(tb + B / 2, bar >= 3 && b === 3, 1, 0.25);
    if (bar === 6 || bar === 5) for (const o of [0.25, 0.75]) hat(tb + o * B, false, 0.6, -0.3);
    [0, 12].forEach((iv, j) => bass(tb + j * B / 2, root + iv - 12 * (iv && b % 2), B / 2 * 0.85));
  }
  if (bar >= 3) for (let s = 0; s < 16; s++) { const ch = chords[bar]; pluck(t0 + s * B / 4, ch[[0, 1, 2, 3, 2, 1][s % 6]] + (s % 8 === 7 ? 12 : 0), 0.7, Math.sin(s) * 0.5); }
  if (bar < 6) whoosh(S(bar + 1), 0.35, 0.6);
}
// Scene 2 extras: letter ticks
for (let li = 0; li < 3; li++) for (let i = 0; i < 6; i++) glitch(S(1) + li * B + i * 0.035, 0.012, 0.35);
// Scene 3: shape morphs
for (let k = 1; k < 4; k++) bell(S(2) + k * B, [76, 79, 81][k - 1], 1, (k - 2) * 0.5);
// Scene 4: wave & flip ticks
for (let i = 0; i < 12; i++) hat(S(3) + 2 * B + i * 0.025, false, 0.5, (i / 12 - 0.5));
// Scene 6: type slam
[0, 0.155, 0.31].forEach((o, i) => { thud(S(5) + 3 * B + o, 0.8); bell(S(5) + 3 * B + o, [81, 84, 88][i], 0.8); });
// Scene 7: eighth-note cuts
for (let k = 0; k < 8; k++) { const t = S(6) + k * CUT; glitch(t, 0.05, 1); if (k === 7) { impact(t, 1); kick(t, 1.2); } }
for (let k = 0; k < 4; k++) kick(S(6) + 3 * B + k * B / 8, 0.6);
whoosh(S(7) + B, B * 0.95, 1.2);
// Scene 8: resolve
impact(S(7) + B, 1.5); kick(S(7) + B, 1.3);
pad(S(7) + B, [45, 52, 57, 60, 64, 71], DUR - S(7) - B + 0.2, 1);
'CLAUDE.'.split('').forEach((_, i) => bell(S(7) + B + 0.12 + i * 0.05, [69, 72, 76, 79, 81, 84, 88][i], 0.7, (i - 3) * 0.25));
for (let i = 0; i < 31; i++) hat(S(7) + 2 * B + i * (0.9 * B / 31), false, 0.25, 0.4);
bell(S(7) + 3 * B, 93, 0.6);

/* ---------- reverb (Schroeder) + master ---------- */
function reverb(inp, combs, aps) {
  const out = new Float32Array(LEN);
  combs.forEach(d => { const buf = new Float32Array(d); let i = 0, lpv = 0;
    for (let n = 0; n < LEN; n++) { const y = buf[i]; lpv = y * 0.7 + lpv * 0.3; buf[i] = inp[n] + lpv * 0.82; out[n] += y / combs.length; i = (i + 1) % d; } });
  aps.forEach(d => { const buf = new Float32Array(d); let i = 0;
    for (let n = 0; n < LEN; n++) { const b = buf[i], x = out[n]; const y = -x + b; buf[i] = x + b * 0.5; out[n] = y; i = (i + 1) % d; } });
  return out;
}
const wl = reverb(RL, [1557, 1617, 1491, 1422], [225, 556]), wr = reverb(RR, [1580, 1640, 1514, 1445], [248, 579]);
let peak = 0;
for (let n = 0; n < LEN; n++) { L[n] = Math.tanh((L[n] + wl[n] * 0.6) * 1.2); R[n] = Math.tanh((R[n] + wr[n] * 0.6) * 1.2); peak = Math.max(peak, Math.abs(L[n]), Math.abs(R[n])); }
const g = 0.89 / peak, fadeN = Math.round(0.12 * SR);
const wav = Buffer.alloc(44 + LEN * 4);
wav.write('RIFF', 0); wav.writeUInt32LE(36 + LEN * 4, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22);
wav.writeUInt32LE(SR, 24); wav.writeUInt32LE(SR * 4, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(LEN * 4, 40);
for (let n = 0; n < LEN; n++) { const f = n > LEN - fadeN ? (LEN - n) / fadeN : 1;
  wav.writeInt16LE(Math.round(L[n] * g * f * 32767), 44 + n * 4); wav.writeInt16LE(Math.round(R[n] * g * f * 32767), 46 + n * 4); }
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), 'audio.wav');
fs.writeFileSync(out, wav); console.log('wrote', out);
