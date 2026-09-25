// Core utilities: math, easing, deterministic randomness, colour, camera projection.
// Everything in the film is a pure function of time t, so any frame can be rendered
// independently (this is what makes parallel, frame-exact rendering possible).

const W = 1920, H = 1080, FPS = 30, DURATION = 108;
const TAU = Math.PI * 2;

const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, x) => clamp((x - a) / (b - a));
const frac = (x) => x - Math.floor(x);
const hash = (n) => frac(Math.sin(n * 127.1 + 311.7) * 43758.5453123);

const E = {
  lin: (t) => t,
  sine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  io: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  io5: (t) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2),
  o: (t) => 1 - Math.pow(1 - t, 3),
  o5: (t) => 1 - Math.pow(1 - t, 5),
  i: (t) => t * t * t,
  iExp: (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
  oBack: (t) => { const c1 = 1.2, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
};
// eased 0..1 progress of t through [a,b]
const seg = (t, a, b, e = E.io) => e(inv(a, b, t));
// visibility window: fades in at a, out at b
const win = (t, a, b, fi = 0.6, fo = 0.6) =>
  Math.min(seg(t, a, a + fi, E.sine), 1 - seg(t, b - fo, b, E.sine));

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// smooth 1D value noise
function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash(i + seed * 57.3), hash(i + 1 + seed * 57.3), u);
}

// ---------- colour ----------
const C = {
  bg0: [5, 7, 11],
  bg1: [11, 16, 25],
  ink: [234, 238, 244],
  dim: [138, 150, 168],
  faint: [88, 100, 118],
  cool: [170, 208, 255],
  coolDeep: [96, 150, 230],
  warm: [246, 200, 132],
  amber: [244, 178, 88],
  gray: [120, 128, 140],
};
const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${clamp(a)})`;
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

// ---------- camera ----------
// A keyframed 2.5D camera. zoom is interpolated in log space so that pushes feel uniform.
const cam = { x: 0, y: 0, z: 1, r: 0, cos: 1, sin: 0 };
function camAt(keys, t) {
  let k = 0;
  while (k < keys.length - 2 && t > keys[k + 1][0]) k++;
  const a = keys[k], b = keys[k + 1];
  const e = b[5] || E.io;
  const p = e(inv(a[0], b[0], t));
  const z = Math.exp(lerp(Math.log(a[3]), Math.log(b[3]), p));
  // Screen-consistent pan: when zooming in, the destination glides to centre linearly on screen;
  // when zooming out, the origin leaves centre linearly. Avoids swinging during big dives.
  let x, y;
  if (b[3] >= a[3]) {
    const f = (1 - p) * a[3] / z;
    x = b[1] - (b[1] - a[1]) * f; y = b[2] - (b[2] - a[2]) * f;
  } else {
    const f = p * b[3] / z;
    x = a[1] + (b[1] - a[1]) * f; y = a[2] + (b[2] - a[2]) * f;
  }
  return { x, y, z, r: lerp(a[4], b[4], p) };
}
function setCam(c) {
  cam.x = c.x; cam.y = c.y; cam.z = c.z; cam.r = c.r;
  cam.cos = Math.cos(c.r * Math.PI / 180); cam.sin = Math.sin(c.r * Math.PI / 180);
}
// project world (x,y) on a plane at depth d (0 = main plane, >0 = further away)
function P(x, y, d = 0) {
  const s = d === 0 ? cam.z : cam.z / Math.max(0.05, 1 + d * cam.z);
  const dx = (x - cam.x) * s, dy = (y - cam.y) * s;
  return [W / 2 + dx * cam.cos - dy * cam.sin, H / 2 + dx * cam.sin + dy * cam.cos, s];
}
const polar = (r, deg) => [r * Math.cos(deg * Math.PI / 180), r * Math.sin(deg * Math.PI / 180)];
const qbez = (p0, p1, p2, t) => {
  const u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
};
