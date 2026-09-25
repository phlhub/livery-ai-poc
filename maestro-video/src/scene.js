// The film. renderFrame(t) draws the complete frame for time t (seconds) into the canvas.
let ctx, canvas;
const A = {}; // cached assets

// ======================================================================
// assets & drawing primitives
// ======================================================================
function initScene(cv) {
  canvas = cv; ctx = cv.getContext('2d');
  // grain tiles
  A.grain = [];
  const r = rng(5);
  for (let k = 0; k < 6; k++) {
    const g = document.createElement('canvas'); g.width = g.height = 256;
    const gx = g.getContext('2d'), id = gx.createImageData(256, 256);
    for (let i = 0; i < id.data.length; i += 4) {
      const v = 128 + (r() - 0.5) * 255;
      id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255;
    }
    gx.putImageData(id, 0, 0);
    A.grain.push(ctx.createPattern(g, 'repeat'));
  }
  // vignette
  const v = document.createElement('canvas'); v.width = W; v.height = H;
  const vx = v.getContext('2d');
  const vg = vx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 1.05);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.62)');
  vx.fillStyle = vg; vx.fillRect(0, 0, W, H);
  A.vig = v;
  // background
  const b = document.createElement('canvas'); b.width = W; b.height = H;
  const bx = b.getContext('2d');
  const bg = bx.createRadialGradient(W / 2, H * 0.48, 0, W / 2, H / 2, H * 1.1);
  bg.addColorStop(0, rgba(C.bg1)); bg.addColorStop(1, rgba(C.bg0));
  bx.fillStyle = bg; bx.fillRect(0, 0, W, H);
  A.bg = b;
  A.spr = {};
}
function sprite(col) {
  const k = col.join(',');
  if (A.spr[k]) return A.spr[k];
  const s = document.createElement('canvas'); s.width = s.height = 128;
  const sx = s.getContext('2d');
  const g = sx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, rgba(col, 1)); g.addColorStop(0.18, rgba(col, 0.45));
  g.addColorStop(0.5, rgba(col, 0.1)); g.addColorStop(1, rgba(col, 0));
  sx.fillStyle = g; sx.fillRect(0, 0, 128, 128);
  return (A.spr[k] = s);
}
function glow(x, y, r, col, a) {
  if (a <= 0.003 || r <= 0.5) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(a);
  ctx.drawImage(sprite(col), x - r, y - r, r * 2, r * 2); ctx.restore();
}
function dot(x, y, r, col, a) {
  if (a <= 0.003) return;
  ctx.fillStyle = rgba(col, a); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}
function line(p, q, col, a, w = 1) {
  if (a <= 0.003) return;
  ctx.strokeStyle = rgba(col, a); ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
}
function curve(p0, p1, p2, col, a, w = 1, t0 = 0, t1 = 1) {
  if (a <= 0.003 || t1 <= t0) return;
  ctx.strokeStyle = rgba(col, a); ctx.lineWidth = w; ctx.beginPath();
  const n = 24;
  for (let i = 0; i <= n; i++) {
    const q = qbez(p0, p1, p2, lerp(t0, t1, i / n));
    i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]);
  }
  ctx.stroke();
}
function comet(pts, col, a, w = 2) {
  // pts: head first
  for (let i = 0; i < pts.length - 1; i++) {
    const k = 1 - i / (pts.length - 1);
    line(pts[i], pts[i + 1], col, a * k * k, w * (0.4 + 0.6 * k));
  }
  glow(pts[0][0], pts[0][1], 16 * w, col, a * 0.7);
  dot(pts[0][0], pts[0][1], w * 0.9, mix(col, [255, 255, 255], 0.5), a);
}
function rrect(x, y, w, h, r) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
}
function font(size, weight = 400) { ctx.font = `${weight} ${size}px Inter`; }
function txt(s, x, y, o = {}) {
  const { size = 16, weight = 400, col = C.ink, a = 1, align = 'left', ls = 0, base = 'alphabetic', shadow = 0 } = o;
  if (a <= 0.003) return;
  font(size, weight); ctx.letterSpacing = ls + 'px'; ctx.textAlign = align; ctx.textBaseline = base;
  ctx.fillStyle = rgba(col, a);
  if (shadow) { ctx.shadowColor = 'rgba(3,5,9,0.9)'; ctx.shadowBlur = shadow; }
  const xx = align === 'center' ? x + ls / 2 : align === 'right' ? x + ls : x;
  ctx.fillText(s, xx, y);
  ctx.shadowBlur = 0; ctx.letterSpacing = '0px';
}
function measure(s, size, weight = 400, ls = 0) {
  font(size, weight); ctx.letterSpacing = ls + 'px';
  const w = ctx.measureText(s).width; ctx.letterSpacing = '0px'; return w - ls;
}
function wrap(s, size, weight, maxW) {
  const words = s.split(' '), out = []; let cur = '';
  for (const w of words) {
    const nx = cur ? cur + ' ' + w : w;
    if (measure(nx, size, weight) > maxW && cur) { out.push(cur); cur = w; } else cur = nx;
  }
  if (cur) out.push(cur);
  return out;
}
const caps = (s, x, y, o = {}) => txt(s.toUpperCase(), x, y, { size: 13, weight: 500, ls: 2.6, col: C.dim, ...o });

// ---------- icons (vector glyphs drawn in category colour) ----------
function icon(kind, x, y, s, col, a) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = rgba(col, a); ctx.fillStyle = rgba(col, a); ctx.lineWidth = 1.4 / Math.max(0.5, s) * Math.min(1, s) + 0.2;
  ctx.lineWidth = 1.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath();
  switch (kind) {
    case 'mail': ctx.rect(-6, -4.5, 12, 9); ctx.moveTo(-6, -4.5); ctx.lineTo(0, 0.8); ctx.lineTo(6, -4.5); break;
    case 'chat': ctx.roundRect(-6, -5, 12, 8, 2.5); ctx.moveTo(-2.5, 3); ctx.lineTo(-4, 6); ctx.lineTo(0.5, 3); break;
    case 'cal': ctx.rect(-6, -4.5, 12, 10); ctx.moveTo(-6, -1); ctx.lineTo(6, -1); ctx.moveTo(-3, -6.5); ctx.lineTo(-3, -3.5); ctx.moveTo(3, -6.5); ctx.lineTo(3, -3.5); break;
    case 'alert': ctx.moveTo(0, -6); ctx.lineTo(6.5, 5.5); ctx.lineTo(-6.5, 5.5); ctx.closePath(); ctx.moveTo(0, -1.5); ctx.lineTo(0, 1.8); break;
    case 'shield': ctx.moveTo(0, -6); ctx.lineTo(5.5, -3.5); ctx.lineTo(5, 2); ctx.lineTo(0, 6); ctx.lineTo(-5, 2); ctx.lineTo(-5.5, -3.5); ctx.closePath(); break;
    case 'bars': ctx.moveTo(-5, 5); ctx.lineTo(-5, 0); ctx.moveTo(0, 5); ctx.lineTo(0, -5); ctx.moveTo(5, 5); ctx.lineTo(5, -2); break;
    case 'flag': ctx.moveTo(-4.5, 6); ctx.lineTo(-4.5, -6); ctx.lineTo(5, -3.5); ctx.lineTo(-4.5, -0.5); break;
    case 'list': for (let i = -1; i <= 1; i++) { ctx.moveTo(-6, i * 4); ctx.lineTo(-4, i * 4); ctx.moveTo(-1, i * 4); ctx.lineTo(6, i * 4); } break;
    case 'check': ctx.arc(0, 0, 6, 0, TAU); ctx.moveTo(-3, 0); ctx.lineTo(-0.8, 2.4); ctx.lineTo(3.2, -2.2); break;
    case 'loop': ctx.arc(0, 0, 5.5, -0.3, TAU * 0.8); ctx.moveTo(5.3, -1.6); ctx.lineTo(5.6, 1.8); ctx.lineTo(2.3, 0.8); break;
    case 'people': ctx.arc(-2.5, -2, 2.5, 0, TAU); ctx.moveTo(-7, 6); ctx.arc(-2.5, 6, 4.5, Math.PI, 0); ctx.moveTo(5.6, -2.5); ctx.arc(3.8, -2.5, 1.8, 0, TAU); break;
    case 'inbox': ctx.moveTo(-6, 1); ctx.lineTo(-6, 5); ctx.lineTo(6, 5); ctx.lineTo(6, 1); ctx.moveTo(0, -6); ctx.lineTo(0, 1.5); ctx.moveTo(-3, -1.5); ctx.lineTo(0, 1.5); ctx.lineTo(3, -1.5); break;
    case 'doc': ctx.moveTo(-4.5, -6); ctx.lineTo(2, -6); ctx.lineTo(5, -3); ctx.lineTo(5, 6); ctx.lineTo(-4.5, 6); ctx.closePath(); ctx.moveTo(-2, 0); ctx.lineTo(2.5, 0); ctx.moveTo(-2, 3); ctx.lineTo(2.5, 3); break;
    case 'spark': ctx.moveTo(0, -6.5); ctx.quadraticCurveTo(0.8, -0.8, 6.5, 0); ctx.quadraticCurveTo(0.8, 0.8, 0, 6.5); ctx.quadraticCurveTo(-0.8, 0.8, -6.5, 0); ctx.quadraticCurveTo(-0.8, -0.8, 0, -6.5); break;
  }
  ctx.stroke(); ctx.restore();
}
function checkMark(x, y, s, col, a) {
  ctx.strokeStyle = rgba(col, a); ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - 4 * s, y); ctx.lineTo(x - 1.2 * s, y + 3 * s); ctx.lineTo(x + 4.5 * s, y - 3.5 * s); ctx.stroke();
}

// ======================================================================
// timing helpers shared by several layers
// ======================================================================
const worldAlpha = (t) => (t < 43 ? 1 - seg(t, 37.9, 38.8) : seg(t, 48.3, 49.4));
function ringState(t) {
  // sweep (0..1 of the circle drawn) and alpha
  if (t < 76.3) return { sweep: seg(t, T.ringForm, T.ringForm + 2.5, E.io), a: 1 };
  if (t < 78.4) return { sweep: 1, a: 1 - seg(t, 76.3, 77.1) };
  return { sweep: seg(t, 78.4, 80.3, E.io), a: 1 };
}
// how dimmed the world is behind the briefing
const briefDim = (t) => 0.72 * win(t, 59.8, 67.4, 0.9, 1.4);
// human-role scene: machinery recedes
const humanRecede = (t) => win(t, 65.4, 76.4, 1.2, 0.6);
const simplify = (t) => seg(t, T.simplify, T.simplify + 1.6);

// card mix: 0 = scattered around the human, 1 = merged into its stack
function cardMix(c, t) {
  const s = c.stag;
  const m1 = seg(t, T.reorg + s * 1.6, T.reorg + s * 1.6 + 2.5, E.io5);
  const m2 = seg(t, 76.2 + (1 - s) * 0.5, 76.2 + (1 - s) * 0.5 + 1.2, E.io);
  const m3 = seg(t, 78.6 + s * 0.8, 78.6 + s * 0.8 + 2.1, E.io5);
  return clamp(m1 - m2 + m3);
}
// opening time runs until the freeze; the callback re-uses the frozen chaos
const motionT = (t) => Math.min(t, T.freeze);
function chaosPos(c, t) {
  const tm = motionT(t);
  const ap = seg(tm, c.spawn, c.spawn + 0.8, E.o);
  const out = 1 + 0.07 * (1 - ap);
  return [c.cx * out + Math.sin(tm * 0.31 + c.seed) * 7, c.cy * out + Math.cos(tm * 0.27 + c.seed * 1.3) * 5];
}
function stackPos(c) {
  const k = Math.min(c.stackIdx, 2), p = CAT[c.cat].pos;
  return [p[0] + k * 6, p[1] - k * 6];
}
function cardState(c, t) {
  const m = cardMix(c, t);
  const tm = motionT(t);
  const ap = seg(tm, c.spawn, c.spawn + 0.8, E.o);
  const a0 = chaosPos(c, t), a1 = stackPos(c);
  // curved travel: slight perpendicular bulge
  const dx = a1[0] - a0[0], dy = a1[1] - a0[1];
  const bulge = Math.sin(Math.PI * m) * 0.12 * (c.i % 2 ? 1 : -1);
  const x = lerp(a0[0], a1[0], m) - dy * bulge, y = lerp(a0[1], a1[1], m) + dx * bulge;
  const d = lerp(c.d, 0, m);
  let a = ap * (1 - Math.max(0, d) * 1.1);
  const stackA = c.stackIdx === 0 ? 1 : c.stackIdx === 1 ? 0.55 : c.stackIdx === 2 ? 0.28 : 0;
  a *= lerp(1, stackA, m);
  // freeze desaturation
  const frz = seg(t, T.freeze, T.freeze + 0.5) * (1 - seg(t, 21, 24.5));
  const cb = win(t, 76.4, 78.9, 0.6, 0.6); // callback memory: slightly desaturated
  return { x, y, d, a, m, ap, desat: Math.max(frz * 0.75, cb * 0.45), dim: 1 - 0.35 * frz };
}

// ======================================================================
// layers
// ======================================================================
function drawBackground(t) {
  ctx.drawImage(A.bg, 0, 0);
  // far dot-grid for spatial reference (parallax plane)
  const d = 1.2, sp = 90;
  const a = 0.05 * seg(t, 0.2, 3) * (1 - 0.6 * seg(t, 100, 103));
  if (a > 0) {
    const [ox, oy, s] = P(0, 0, d);
    const step = sp * s;
    if (step > 6) {
      ctx.fillStyle = rgba(C.dim, a);
      const x0 = ((ox % step) + step) % step, y0 = ((oy % step) + step) % step;
      const r = Math.max(0.6, 1.1 * Math.min(1.4, s));
      for (let x = x0 - step; x < W + step; x += step)
        for (let y = y0 - step; y < H + step; y += step) { ctx.fillRect(x - r / 2, y - r / 2, r, r); }
    }
  }
}

function drawField(t, wa) {
  const a = (seg(t, 49.6, 52.6) * (1 - seg(t, 65.8, 67)) + win(t, 83, 89, 1.2, 1.0)) * wa * (1 - briefDim(t));
  if (a <= 0.01) return;
  for (const p of FIELD) {
    const c = CATS[p.cat];
    const q = P(p.x, p.y, p.d), s = P(c.pos[0], c.pos[1]);
    line(q, s, C.dim, 0.035 * a);
    dot(q[0], q[1], 1.3, mix(c.col, C.dim, 0.5), 0.5 * a * (0.5 + 0.5 * Math.sin(t * 1.3 + p.s * 20)));
    const ph = frac(t * 0.22 + p.s * 7);
    if (ph < 0.6) {
      const u = ph / 0.6, m = [lerp(q[0], s[0], u), lerp(q[1], s[1], u)];
      dot(m[0], m[1], 1.1, mix(c.col, C.ink, 0.4), a * 0.5 * Math.sin(Math.PI * u));
    }
  }
}

function drawPanels(t) {
  const tm = motionT(t);
  for (const p of PANELS) {
    const ap = seg(tm, p.spawn, p.spawn + 1.0, E.o);
    // collapse into stack during reorganisation, and flash back in the callback
    const m = clamp(seg(t, 20.2, 23.2, E.io5) - seg(t, 76.3, 77.4) + seg(t, 78.5, 80.5, E.io5));
    const cat = CAT[p.cat];
    const x = lerp(p.x, cat.pos[0], m), y = lerp(p.y, cat.pos[1], m), d = lerp(p.d, 0, m);
    const a = ap * (1 - m) * 0.55 * (1 - 0.4 * seg(t, 18, 18.5));
    if (a < 0.01) continue;
    const [sx, sy, s] = P(x, y, d);
    const w = p.w * s * lerp(1, 0.4, m), h = p.h * s * lerp(1, 0.25, m);
    ctx.save(); ctx.globalAlpha = a * (1 - 0.8 * CAPBAND * inv(760, 900, sy + h / 2));
    rrect(sx - w / 2, sy - h / 2, w, h, 10 * s);
    ctx.fillStyle = 'rgba(14,19,28,0.85)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1; ctx.stroke();
    const ix = sx - w / 2 + 14 * s, iy = sy - h / 2 + 18 * s;
    if (s > 0.35) txt(p.label, ix, iy + 4 * s, { size: 11 * s, weight: 500, col: C.dim, a: 0.9 });
    const bx = ix, by = iy + 18 * s, bw = w - 28 * s, bh = h - 46 * s;
    ctx.strokeStyle = rgba(cat.col, 0.6); ctx.fillStyle = rgba(cat.col, 0.35); ctx.lineWidth = 1.2;
    const r2 = rng(p.spawn * 100 | 0);
    if (p.kind === 'line') {
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const u = i / 40, v = 0.5 + 0.25 * Math.sin(u * 7 + 1) * (1 - u * 0.5) - u * 0.2 + (r2() - 0.5) * 0.08;
        const X = bx + u * bw, Y = by + bh * (1 - v);
        i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
      }
      ctx.stroke();
    } else if (p.kind === 'gantt') {
      for (let i = 0; i < 6; i++) { const x0 = r2() * 0.6, l = 0.2 + r2() * 0.35; ctx.fillRect(bx + x0 * bw, by + i * bh / 6, l * bw, bh / 6 - 4 * s); }
    } else if (p.kind === 'bars') {
      for (let i = 0; i < 12; i++) { const v = 0.2 + r2() * 0.8; ctx.fillRect(bx + i * bw / 12, by + bh * (1 - v), bw / 12 - 3 * s, bh * v); }
    } else {
      const rows = p.kind === 'doc' ? 7 : 6;
      ctx.fillStyle = 'rgba(160,172,190,0.16)';
      for (let i = 0; i < rows; i++) {
        const l = 0.45 + r2() * 0.5;
        ctx.fillRect(bx, by + i * bh / rows, bw * l, Math.max(1, 5 * s));
        if (p.kind !== 'doc') { ctx.fillStyle = rgba(cat.col, 0.4); ctx.fillRect(bx + bw - 10 * s, by + i * bh / rows, 6 * s, Math.max(1, 5 * s)); ctx.fillStyle = 'rgba(160,172,190,0.16)'; }
      }
    }
    ctx.restore();
  }
}

// hub point for spokes: the human, or (after the callback reroute) the Maestro ring
function spokeHub(c, st, t) {
  const rr = seg(t, 78.4, 79.8);
  if (t < 78.4 || rr <= 0) return [0, 0];
  const ang = Math.atan2(st.y, st.x);
  return [Math.cos(ang) * RING_R * rr, Math.sin(ang) * RING_R * rr];
}

function drawSpokes(t, states) {
  const tm = motionT(t);
  const sat = seg(t, 12.5, 15.5);
  const cut = t < 50 ? 1 - seg(t, 19.3, 21.2) : 1;
  const cbOn = t > 70 ? seg(t, 76.4, 77.3) : 1;
  const hot = seg(t, 13.8, 15) * (1 - seg(t, 18, 18.6));
  for (const c of CARDS) {
    const st = states[c.i];
    const a = st.a * (1 - st.m) * cut * cbOn;
    if (a < 0.01) continue;
    const p = P(st.x, st.y, st.d), hub = P(...spokeHub(c, st, t));
    const col = t > 78.4 ? mix(C.dim, C.cool, seg(t, 78.4, 79.8)) : mix(C.dim, C.warm, 0.25 * hot);
    line(p, hub, col, (0.07 + 0.1 * sat) * a * st.dim, 1);
    // inbound traffic toward the human (the integration layer)
    const inten = (0.25 + 0.75 * sat) * seg(tm, 7, 12) * (1 - seg(t, 18.4, 19.4)) + (t > 70 ? win(t, 76.9, 79.6, 0.5, 0.8) : 0);
    if (inten > 0.01) {
      const ph = frac((t > 70 ? t : tm) * 0.5 + c.seed);
      const u = E.i(ph) * 0.6 + ph * 0.4;
      const q = [lerp(p[0], hub[0], u), lerp(p[1], hub[1], u)];
      const q2 = [lerp(p[0], hub[0], Math.max(0, u - 0.06)), lerp(p[1], hub[1], Math.max(0, u - 0.06))];
      line(q2, q, mix(CAT[c.cat].col, C.ink, 0.5), 0.5 * inten * a * Math.sin(Math.PI * ph), 1.3);
    }
  }
}

function drawLinks(t, states) {
  const a = seg(t, 19.0, 20.4) * (1 - seg(t, 23.4, 24.6));
  if (a <= 0.01) return;
  const last = {};
  for (const c of CARDS) {
    if (last[c.cat] !== undefined) {
      const b = CARDS[last[c.cat]];
      const g = seg(t, 19.0 + hash(c.i) * 0.9, 19.9 + hash(c.i) * 0.9);
      const p = P(states[b.i].x, states[b.i].y, states[b.i].d), q = P(states[c.i].x, states[c.i].y, states[c.i].d);
      const qq = [lerp(p[0], q[0], g), lerp(p[1], q[1], g)];
      line(p, qq, mix(C.cool, CAT[c.cat].col, 0.3), 0.32 * a * Math.min(states[b.i].a, states[c.i].a) + 0.02, 1);
    }
    last[c.cat] = c.i;
  }
}

function drawHops(t, states) {
  const tm = motionT(t);
  const fade = 1 - seg(t, 18.5, 19.5);
  if (fade <= 0) return;
  for (const h of HOPS) {
    const u = (tm - h.t) / h.dur;
    if (u < 0 || u > 1) continue;
    const a = states[h.a], b = states[h.b];
    const pa = P(a.x, a.y, a.d), pb = P(b.x, b.y, b.d), pc = P(0, 0);
    const pts = [];
    for (let i = 0; i < 14; i++) {
      const v = clamp(u - i * 0.018);
      const p = v < 0.5 ? [lerp(pa[0], pc[0], E.io(v * 2)), lerp(pa[1], pc[1], E.io(v * 2))]
        : [lerp(pc[0], pb[0], E.io(v * 2 - 1)), lerp(pc[1], pb[1], E.io(v * 2 - 1))];
      pts.push(p);
    }
    comet(pts, C.warm, 0.8 * fade * Math.sin(Math.PI * clamp(u * 1.1)), 1.6);
    if (u > 0.9) glow(pb[0], pb[1], 40, C.warm, 0.3 * fade * (1 - u) * 10);
  }
}

function drawCard(c, st, t, extraHot = 0, hotCol = null) {
  if (st.a < 0.01) return;
  const [sx, sy, s0] = P(st.x, st.y, st.d);
  const s = s0 * lerp(0.92 + 0.08 * st.ap, 1, st.m);
  const cat = CAT[c.cat];
  if (!c.bw) c.bw = Math.max(150, Math.max(measure(c.title, 12.5, 500), measure(cat.name + ' · yesterday', 10)) + 50);
  const bw = lerp(c.bw, 168, st.m);
  const w = bw * s, h = 46 * s;
  let col = mix(cat.col, C.gray, st.desat);
  const a = st.a * st.dim * (1 - 0.94 * CAPBAND * inv(770, 860, sy));
  ctx.save(); ctx.globalAlpha = clamp(a);
  rrect(sx - w / 2, sy - h / 2, w, h, 8 * s);
  ctx.fillStyle = `rgba(${16 + 8 * extraHot},${21 + 8 * extraHot},${31 + 6 * extraHot},0.94)`; ctx.fill();
  ctx.strokeStyle = extraHot > 0.02 ? rgba(hotCol || col, 0.25 + 0.6 * extraHot) : 'rgba(255,255,255,0.085)';
  ctx.lineWidth = 1 + extraHot; ctx.stroke();
  if (extraHot > 0.02) { ctx.restore(); glow(sx, sy, w * 0.8, hotCol || col, 0.18 * extraHot * a); ctx.save(); ctx.globalAlpha = clamp(a); }
  // accent tick
  ctx.fillStyle = rgba(col, 0.9); ctx.fillRect(sx - w / 2, sy - h * 0.28, 2 * s, h * 0.56);
  icon(cat.icon, sx - w / 2 + 18 * s, sy, s, col, 0.95);
  const tx = sx - w / 2 + 34 * s;
  const front = c.stackIdx === 0;
  const tm = st.m > 0.5 && front ? seg(st.m, 0.5, 0.9) : 0;
  if (13 * s >= 5.5) {
    const title = c.title;
    const ta = (1 - tm) * (front ? 1 : 1 - seg(st.m, 0.2, 0.6));
    if (ta > 0.01) {
      txt(title, tx, sy - 2 * s, { size: 12.5 * s, weight: 500, col: C.ink, a: 0.92 * ta });
      txt(`${cat.name} · ${c.age}`, tx, sy + 12 * s, { size: 10 * s, weight: 400, col: C.dim, a: 0.85 * ta });
    }
    if (tm > 0) {
      const nm = cat.name.length > 19 ? cat.name.slice(0, 18) + '…' : cat.name;
      txt(nm, tx, sy - 2 * s, { size: 12.5 * s, weight: 500, col: C.ink, a: 0.95 * tm });
      txt(`${cat.count} sources · live`, tx, sy + 12 * s, { size: 10 * s, weight: 400, col: C.dim, a: 0.85 * tm });
    }
  } else {
    ctx.fillStyle = 'rgba(210,218,230,0.35)'; ctx.fillRect(tx, sy - 5 * s, 90 * s, 4 * s);
    ctx.fillStyle = 'rgba(140,150,168,0.3)'; ctx.fillRect(tx, sy + 5 * s, 60 * s, 3 * s);
  }
  // unread badge
  const tmo = motionT(t);
  const ba = c.badge ? seg(tmo, c.spawn + 0.9, c.spawn + 1.3, E.oBack) * (1 - st.m) : 0;
  if (ba > 0.01 && 9 * s > 4) {
    const bx = sx + w / 2 - 3 * s, by = sy - h / 2 + 3 * s;
    dot(bx, by, 8 * s * ba, mix([214, 96, 84], C.gray, st.desat), 0.95);
    txt(String(c.badge), bx, by + 3.4 * s, { size: 9.5 * s, weight: 600, col: [255, 255, 255], a: ba, align: 'center' });
  }
  ctx.restore();
}

function stackHot(catId, t) {
  let h = 0, col = null;
  for (const e of EVENTS) {
    if (e.cat === catId) { const u = t - e.t; if (u > -0.05 && u < 2.4) h = Math.max(h, Math.exp(-Math.max(0, u) * 1.6) * seg(u, -0.05, 0.1)); }
    for (const p of e.probes) if (p === catId) { const u = t - e.t - 1.1; if (u > 0 && u < 1.5) h = Math.max(h, 0.5 * Math.exp(-u * 2.2)); }
  }
  if (catId === 'opportunity') {
    const o = seg(t, T.opp - 0.05, T.opp + 0.2) * (1 - seg(t, 66.2, 67.2));
    if (o > h) { h = o; col = C.amber; }
  }
  return [h, col];
}

function drawCards(t, states) {
  // back-to-front: deeper stack layers first, far depth first
  const order = CARDS.slice().sort((p, q) => (q.stackIdx - p.stackIdx) * states[p.i].m + (states[q.i].d - states[p.i].d) * 10 * (1 - states[p.i].m));
  const wa = worldAlpha(t) * (1 - briefDim(t)) * (1 - simplify(t)) * (1 - 0.9 * humanRecede(t));
  for (const c of order) {
    const st = { ...states[c.i] };
    st.a *= wa;
    const [h, col] = c.stackIdx === 0 && st.m > 0.9 ? stackHot(c.cat, t) : [0, null];
    // the surfaced opportunity stays visible through the dim
    if (c.cat === 'opportunity' && c.stackIdx === 0 && col) st.a = Math.max(st.a, states[c.i].a * worldAlpha(t) * 0.8 * (1 - seg(t, 66, 67)));
    drawCard(c, st, t, h, col);
  }
}

// ---------- Maestro ring, model and agents ----------
function flowGeom(cat) {
  const ag = AG[cat.agent];
  const p0 = cat.pos, p2 = ag.pos;
  const mid = [(p0[0] + p2[0]) / 2, (p0[1] + p2[1]) / 2];
  const rm = Math.hypot(mid[0], mid[1]);
  const pa = polar(rm, ag.ang);
  return [p0, [lerp(mid[0], pa[0], 0.65), lerp(mid[1], pa[1], 0.65)], p2];
}
const FLOW_RATE = 0.34;
function flowAlpha(t) {
  const rs = ringState(t);
  return seg(t, 24.4, 27.2) * rs.a * (t > 78 ? seg(t, 79.6, 81.2) : 1) * worldAlpha(t) * (1 - simplify(t));
}

function drawFlows(t) {
  const fa = flowAlpha(t) * (1 - briefDim(t)) * (1 - 0.5 * humanRecede(t));
  if (fa <= 0.01) return;
  for (const cat of CATS) {
    const [p0, p1, p2] = flowGeom(cat).map((p) => P(p[0], p[1]));
    curve(p0, p1, p2, mix(cat.col, C.cool, 0.6), 0.1 * fa, 1);
    for (let k = 0; k < 3; k++) {
      const ph = frac(t * FLOW_RATE + cat.i * 0.37 + k / 3);
      const q = qbez(p0, p1, p2, E.sine(ph));
      const a = fa * Math.sin(Math.PI * ph) * 0.85;
      dot(q[0], q[1], 1.8, mix(cat.col, C.ink, 0.45), a);
      glow(q[0], q[1], 10, cat.col, a * 0.35);
    }
  }
}
function agentInflowPulse(ag, t) {
  let p = 0;
  for (const cat of CATS) {
    if (cat.agent !== ag.id) continue;
    for (let k = 0; k < 3; k++) {
      const ph = frac(t * FLOW_RATE + cat.i * 0.37 + k / 3);
      p = Math.max(p, Math.exp(-(ph / FLOW_RATE) * 5));
    }
  }
  return p * flowAlpha(t);
}

function drawRing(t) {
  const rs = ringState(t);
  const wa = worldAlpha(t);
  const recede = 1 - 0.55 * humanRecede(t);
  const a = rs.a * wa * recede * (1 - 0.5 * briefDim(t));
  if (a <= 0.01 || rs.sweep <= 0) return;
  const [cx, cy, s] = P(0, 0);
  const R = RING_R * s;
  const a0 = -Math.PI / 2 + cam.r * Math.PI / 180, a1 = a0 + TAU * rs.sweep;
  const fin = simplify(t);
  // soft glow body (layered strokes)
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const [w, al] of [[16, 0.025], [7, 0.05], [3, 0.12]]) {
    ctx.strokeStyle = rgba(C.coolDeep, al * a); ctx.lineWidth = w * Math.min(1.5, Math.max(0.6, s));
    ctx.beginPath(); ctx.arc(cx, cy, R, a0, a1); ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = rgba(C.cool, 0.78 * a); ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(cx, cy, R, a0, a1); ctx.stroke();
  // sweep head
  if (rs.sweep < 1) {
    const hx = cx + Math.cos(a1) * R, hy = cy + Math.sin(a1) * R;
    glow(hx, hy, 60, C.cool, 0.8 * a); dot(hx, hy, 2.5, [255, 255, 255], a);
  }
  const orn = a * rs.sweep * (1 - 0.7 * fin);
  // inner tick ring
  if (orn > 0.01 && s > 0.2) {
    const rot = t * 0.035;
    ctx.strokeStyle = rgba(C.cool, 0.16 * orn); ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i < 144; i++) {
      const ang = rot + (i / 144) * TAU;
      if (ang - rot > TAU * rs.sweep) break;
      const l = i % 12 === 0 ? 7 : 3.5;
      const r0 = (RING_R - 16) * s, r1 = r0 - l * Math.min(1.4, s);
      ctx.moveTo(cx + Math.cos(ang + a0) * r0, cy + Math.sin(ang + a0) * r0);
      ctx.lineTo(cx + Math.cos(ang + a0) * r1, cy + Math.sin(ang + a0) * r1);
    }
    ctx.stroke();
    // orchestration arcs
    const arcs = [[0.11, 0.34, 18], [-0.07, 0.22, 18], [0.05, 0.5, 30]];
    arcs.forEach(([sp, len, dr], i) => {
      const st = t * sp + i * 2.1;
      ctx.strokeStyle = rgba(C.cool, (0.32 - i * 0.07) * orn); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(cx, cy, (RING_R + dr) * s, st, st + len); ctx.stroke();
    });
    // signals circulating along the ring
    for (let k = 0; k < 5; k++) {
      const ang = a0 + frac(t * (0.045 + k * 0.012) + k * 0.23) * TAU;
      const pts = [];
      for (let j = 0; j < 10; j++) pts.push([cx + Math.cos(ang - j * 0.018) * R, cy + Math.sin(ang - j * 0.018) * R]);
      comet(pts, C.cool, 0.55 * orn * seg(t, 25, 27), 1.4);
    }
  }
  // amber: opportunity spreading through the ring
  const am = win(t, 58.9, 66.5, 0.5, 1.2) + win(t, 80.8, 82.6, 0.4, 0.8);
  if (am > 0.01) {
    const center = t < 70 ? Math.PI : Math.PI * 1.15;
    const spread = 0.25 + 0.6 * seg(t, 58.9, 59.7) ;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [w, al] of [[12, 0.06], [4, 0.2], [1.6, 0.7]]) {
      ctx.strokeStyle = rgba(C.amber, al * am * wa); ctx.lineWidth = w;
      ctx.beginPath(); ctx.arc(cx, cy, R, center - spread, center + spread); ctx.stroke();
    }
    ctx.restore();
  }
}

function drawModel(t) {
  const a = seg(t, 27.2, 29.5) * worldAlpha(t) * (1 - 0.85 * humanRecede(t)) * (1 - simplify(t)) * (1 - win(t, 76.3, 80.5, 0.6, 1.2)) * (1 - 0.6 * briefDim(t));
  if (a <= 0.01) return;
  const pts = MODEL.nodes.map((n) => {
    const q = P(n.x + Math.sin(t * 0.2 + n.s) * 6, n.y + Math.cos(t * 0.17 + n.s) * 6);
    return q;
  });
  // brightness from agent outputs and events
  const bright = MODEL.nodes.map((n) => {
    let b = 0;
    for (const e of EVENTS) { const u = t - e.t - 1.7; if (u > 0 && u < 2 && (hash(e.t) * 30 | 0) % 30 === n.i) b = Math.max(b, Math.exp(-u * 1.5)); }
    const ph = frac(t * 0.21 + n.s); b = Math.max(b, 0.5 * Math.exp(-ph * 12));
    return b;
  });
  for (const [i, j] of MODEL.edges) line(pts[i], pts[j], C.cool, (0.08 + 0.2 * Math.max(bright[i], bright[j])) * a, 1);
  pts.forEach((q, i) => {
    dot(q[0], q[1], 1.6 + bright[i] * 1.2, C.cool, (0.35 + 0.6 * bright[i]) * a);
    if (bright[i] > 0.1) glow(q[0], q[1], 22, C.cool, bright[i] * 0.4 * a);
  });
}

function agentPresence(ag, t) {
  let e = seg(t, ag.intro, ag.intro + 0.9, E.o);
  const rs = ringState(t);
  if (t > 76) {
    // callback: agents fade with the ring and re-emerge as the sweep passes them
    const angFrac = frac((ag.ang + 90) / 360);
    e = t < 78.4 ? rs.a : seg(rs.sweep, angFrac, Math.min(1, angFrac + 0.12));
  }
  return e * (1 - seg(t, T.simplify + 0.3, T.simplify + 1.7));
}
function drawAgents(t) {
  const wa = worldAlpha(t);
  for (const ag of AGENTS) {
    const e = agentPresence(ag, t);
    if (e <= 0.01) continue;
    const isExec = ag.id === 'execution';
    const localA = isExec && t > 37 && t < 49.6 ? 1 - seg(t, 38.9, 39.3) + seg(t, 48.4, 48.9) : wa;
    const recede = 1 - 0.5 * humanRecede(t);
    const bd = briefDim(t);
    const amber = ag.id === 'growth' ? win(t, 58.85, 66.4, 0.25, 1.0) : 0;
    const a = e * clamp(localA) * recede * (1 - bd * (1 - amber));
    if (a <= 0.01) continue;
    const [x, y, s] = P(ag.pos[0], ag.pos[1]);
    const k = clamp(Math.sqrt(s / 0.8), 0.7, 1.5) * (0.6 + 0.4 * e);
    const col = mix(C.cool, C.amber, amber);
    const pulse = agentInflowPulse(ag, t);
    let ev = 0;
    for (const x2 of EVENTS) if (x2.agent === ag.id) { const u = t - x2.t - 0.8; if (u > 0 && u < 1.5) ev = Math.max(ev, Math.exp(-u * 2.5)); }
    if (ag.id === 'growth') { const u = t - T.opp - 0.85; if (u > 0 && u < 2) ev = Math.max(ev, Math.exp(-u * 1.8)); }
    const bd2 = 1 - 0.85 * bd * (1 - amber);
    // background disc to cut the ring line
    dot(x, y, 19 * k, C.bg1, 0.92 * a);
    glow(x, y, 46 * k, col, (0.22 + 0.25 * pulse + 0.6 * ev) * a);
    // gauge: state of the standing responsibility
    const g = 0.3 + 0.55 * noise1(t * 0.35 + AGENTS.indexOf(ag) * 3.1, 2);
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = rgba(col, 0.18 * a); ctx.beginPath(); ctx.arc(x, y, 15 * k, 0, TAU); ctx.stroke();
    ctx.strokeStyle = rgba(col, 0.85 * a * bd2); ctx.beginPath(); ctx.arc(x, y, 15 * k, -Math.PI / 2, -Math.PI / 2 + TAU * g); ctx.stroke();
    dot(x, y, (4.6 + 1.5 * pulse + 2 * ev) * k, mix(col, [255, 255, 255], 0.35), a);
    // living loop indicator (after the automation/agent contrast)
    const lp = seg(t, 48.6, 49.8);
    if (lp > 0) {
      const ang = t * 2.9 + AGENTS.indexOf(ag);
      dot(x + Math.cos(ang) * 22 * k, y + Math.sin(ang) * 22 * k, 1.7 * k, col, lp * a * 0.9);
      ctx.strokeStyle = rgba(col, 0.1 * lp * a); ctx.beginPath(); ctx.arc(x, y, 22 * k, 0, TAU); ctx.stroke();
    }
    // event ripple
    if (ev > 0.02) {
      const rr = (1 - ev) * 40 + 16;
      ctx.strokeStyle = rgba(col, ev * 0.7 * a); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, rr * k, 0, TAU); ctx.stroke();
    }
    // emergence ripple
    const em = t - ag.intro;
    if (em > 0 && em < 1.4 && t < 40) {
      const u = em / 1.4;
      ctx.strokeStyle = rgba(C.cool, (1 - u) * 0.6); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, (16 + u * 50) * k, 0, TAU); ctx.stroke();
    }
  }
}

function drawAgentLabels(t) {
  const intro = t < 40;
  for (const ag of AGENTS) {
    const e = agentPresence(ag, t);
    let a;
    if (intro) a = seg(t, ag.intro + 0.3, ag.intro + 1.0) * (1 - seg(t, 36.6, 37.3));
    else a = 0.62 * (win(t, 50.0, 66.0, 1.0, 0.6) + win(t, 83.2, 88.4, 1.0, 0.6)) * (1 - clamp(briefDim(t) / 0.5) * (ag.id === 'growth' ? 0 : 1));
    a *= e * worldAlpha(t);
    if (ag.id === 'growth' && t > 58.8 && t < 66) a = Math.max(a, 0.95 * win(t, 58.8, 66, 0.3, 0.8));
    if (a <= 0.01) continue;
    const [x0, y0, s] = P(ag.pos[0], ag.pos[1]);
    const cs = Math.cos(ag.ang * Math.PI / 180), sn = Math.sin(ag.ang * Math.PI / 180);
    const off = 32 * clamp(Math.sqrt(s / 0.8), 0.8, 1.4);
    let x = x0 + cs * off, y = y0 + sn * off;
    let align = cs > 0.3 ? 'left' : cs < -0.3 ? 'right' : 'center';
    if (align === 'center') y += sn > 0 ? 16 : -24;
    else y += sn > 0.3 ? 8 : sn < -0.3 ? -10 : -2;
    if (align !== 'center' && Math.abs(sn) > 0.3) x += cs * 4;
    const amberOn = ag.id === 'growth' ? win(t, 58.85, 66.4, 0.25, 1.0) : 0;
    const nameCol = mix(C.ink, C.amber, amberOn);
    txt(ag.name, x, y, { size: intro ? 17 : 14, weight: 500, col: nameCol, a, align, shadow: 8 });
    if (intro) txt(ag.desc, x, y + 21, { size: 13.5, weight: 400, col: C.dim, a: a * 0.95, align, shadow: 8 });
  }
}

// ---------- the CSAM (the human) ----------
function drawHuman(t) {
  const [x, y, s] = P(0, 0);
  const ap = seg(t, T.pointIn, 2.6, E.sine);
  if (ap <= 0) return;
  const k = clamp(Math.sqrt(s), 0.55, 1.35);
  // strain ripples in the overloaded states
  const strain = seg(t, 5, 15) * (1 - seg(t, 18.2, 19)) + (t > 70 ? win(t, 76.8, 78.6, 0.4, 0.4) : 0);
  if (strain > 0.01) {
    const tm = t > 70 ? t : motionT(t);
    const phi = 0.5 * tm + 0.75 * Math.pow(Math.max(0, Math.min(tm, 17) - 5), 2) / 24;
    for (let i = 0; i < 3; i++) {
      const u = frac(phi + i / 3);
      ctx.strokeStyle = rgba(C.warm, (1 - u) * 0.35 * strain); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, (18 + u * 70) * k, 0, TAU); ctx.stroke();
    }
  }
  // received surfaced signal
  let flare = 0;
  for (const tf of [60.2, 81.9, 86.5]) { const u = t - tf; if (u > 0 && u < 2.5) flare = Math.max(flare, Math.exp(-u * 1.8)); }
  const breathe = 0.5 + 0.5 * Math.sin(t * 1.1);
  glow(x, y, (70 + 20 * breathe + 60 * flare) * k, C.warm, (0.28 + 0.12 * breathe + 0.5 * flare) * ap);
  dot(x, y, 22 * k, C.bg1, 0.85 * ap);
  ctx.strokeStyle = rgba(mix(C.warm, C.amber, flare), (0.85 + 0.15 * flare) * ap); ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(x, y, 15 * k, 0, TAU); ctx.stroke();
  dot(x, y, 5.5 * k, [255, 244, 228], ap);
  if (flare > 0.02) {
    ctx.strokeStyle = rgba(C.amber, flare * 0.8); ctx.beginPath(); ctx.arc(x, y, (15 + (1 - flare) * 50) * k, 0, TAU); ctx.stroke();
  }
  // label
  const la = ap * (win(t, 1.4, 12.5, 1.2, 1.5) + win(t, 68.4, 76.0, 1.0, 0.6) + win(t, 83.4, 88.3, 1.0, 0.6));
  caps('CSAM', x, y + 44 * k, { a: la * 0.85, align: 'center', col: mix(C.warm, C.dim, 0.35), shadow: 6 });
}

// ---------- signals between layers ----------
function drawSurface(t) {
  // opportunity: stack -> Growth Scout -> across the ring -> CSAM
  const cat = CAT.opportunity, ag = AG.growth;
  const u1 = inv(T.opp + 0.12, T.opp + 0.85, t);
  if (u1 > 0 && u1 < 1) {
    const [p0, p1, p2] = flowGeom(cat).map((p) => P(p[0], p[1]));
    const pts = []; for (let i = 0; i < 12; i++) pts.push(qbez(p0, p1, p2, E.io(clamp(u1 - i * 0.02))));
    comet(pts, C.amber, 0.95, 2.2);
  }
  const u2 = inv(T.surface, T.surface + 0.9, t);
  if (u2 > 0 && u2 < 1) {
    const a = P(ag.pos[0], ag.pos[1]), c = P(0, 0), m = P(-120, -90);
    const pts = []; for (let i = 0; i < 16; i++) pts.push(qbez(a, m, c, E.io(clamp(u2 - i * 0.02))));
    comet(pts, C.amber, 1, 2.4);
  }
  // callback: one amber signal through the rebuilt system
  const u3 = inv(81.0, 81.9, t);
  if (u3 > 0 && u3 < 1) {
    const a = P(...polar(RING_R, 207)), c = P(0, 0), m = P(-150, 20);
    const pts = []; for (let i = 0; i < 16; i++) pts.push(qbez(a, m, c, E.io(clamp(u3 - i * 0.02))));
    comet(pts, C.amber, 1, 2.2);
  }
  // final: one signal along the whole path  env -> stack -> Maestro ring -> agent -> CSAM
  const f = inv(83.9, 86.5, t);
  if (f > 0 && f < 1) {
    const email = CAT.email, ex = AG.execution;
    const envP = [email.pos[0] * 1.45, email.pos[1] * 1.45];
    const ringIn = polar(RING_R, -20);
    const path = (v) => {
      if (v < 0.25) { const w = E.io(v / 0.25); return [lerp(envP[0], email.pos[0], w), lerp(envP[1], email.pos[1], w)]; }
      if (v < 0.45) { const w = E.io((v - 0.25) / 0.2); return [lerp(email.pos[0], ringIn[0], w), lerp(email.pos[1], ringIn[1], w)]; }
      if (v < 0.72) { const w = E.io((v - 0.45) / 0.27); return polar(RING_R, lerp(-20, 45, w)); }
      const w = E.io((v - 0.72) / 0.28); return qbez(ex.pos, [60, 120], [0, 0], w);
    };
    const pts = []; for (let i = 0; i < 16; i++) { const q = path(clamp(f - i * 0.006)); pts.push(P(q[0], q[1])); }
    comet(pts, f > 0.72 ? C.amber : C.cool, 1, 2.2);
  }
}

function drawEvents(t) {
  const wa = worldAlpha(t);
  for (const e of EVENTS) {
    const u = t - e.t;
    if (u < -0.1 || u > 3.2) continue;
    const cat = CAT[e.cat], ag = AG[e.agent];
    // signal to agent
    const u1 = inv(0.12, 0.8, u);
    if (u1 > 0 && u1 < 1) {
      const g = cat.agent === e.agent ? flowGeom(cat) : [cat.pos, [lerp(cat.pos[0], ag.pos[0], 0.5) * 0.8, lerp(cat.pos[1], ag.pos[1], 0.5) * 0.8], ag.pos];
      const [p0, p1, p2] = g.map((p) => P(p[0], p[1]));
      const pts = []; for (let i = 0; i < 12; i++) pts.push(qbez(p0, p1, p2, E.io(clamp(u1 - i * 0.02))));
      comet(pts, mix(cat.col, C.ink, 0.3), 0.95 * wa, 2);
    }
    // probes: the agent investigating related signals
    const pa = win(u, 0.9, 2.5, 0.3, 0.8);
    if (pa > 0.01) {
      const q0 = P(ag.pos[0], ag.pos[1]);
      e.probes.forEach((pid, i) => {
        const c2 = CAT[pid], q1 = P(c2.pos[0], c2.pos[1]);
        const g = seg(u, 0.9 + i * 0.1, 1.3 + i * 0.1);
        const qq = [lerp(q0[0], q1[0], g), lerp(q0[1], q1[1], g)];
        ctx.setLineDash([3, 5]); line(q0, qq, C.cool, 0.45 * pa * wa, 1); ctx.setLineDash([]);
        if (g > 0.98) glow(q1[0], q1[1], 26, C.cool, 0.3 * pa);
      });
    }
    // output: into Maestro's account model
    const u3 = inv(1.1, 1.75, u);
    if (u3 > 0 && u3 < 1) {
      const n = MODEL.nodes[(hash(e.t) * 30 | 0) % 30];
      const p0 = P(ag.pos[0], ag.pos[1]), p2 = P(n.x, n.y);
      const pts = []; for (let i = 0; i < 10; i++) { const v = E.io(clamp(u3 - i * 0.025)); pts.push([lerp(p0[0], p2[0], v), lerp(p0[1], p2[1], v)]); }
      comet(pts, C.cool, 0.8 * wa, 1.5);
    }
    // toast at the source
    drawToast(t, cat, e.a, e.b, u, 0.05, 0.85, 3.0);
  }
  // opportunity toast
  drawToast(t, CAT.opportunity, 'Expansion signal', 'Needs human judgment', t - T.opp, 0.05, 0.95, 8.2, true);
}
function drawToast(t, cat, a1, a2, u, tin1, tin2, tout, amber = false) {
  if (u < 0 || u > tout) return;
  const vis = seg(u, tin1, tin1 + 0.35) * (1 - seg(u, tout - 0.5, tout)) * worldAlpha(t) * (amber ? 1 : 1 - briefDim(t));
  if (vis <= 0.01) return;
  const [sx, sy, s] = P(cat.pos[0], cat.pos[1]);
  const b = seg(u, tin2, tin2 + 0.35);
  const w = Math.max(measure(a1, 14, 500), measure(a2, 13, 400) + 18) + 28, h = 30 + 20 * b;
  let x = sx - w / 2, y = sy - 23 * s - 12 - h;
  x = clamp(x, 24, W - w - 24); y = Math.max(24, y);
  ctx.save(); ctx.globalAlpha = vis;
  rrect(x, y + (1 - seg(u, tin1, tin1 + 0.4, E.o)) * 8, w, h, 8);
  ctx.fillStyle = 'rgba(12,17,26,0.92)'; ctx.fill();
  ctx.strokeStyle = rgba(amber ? C.amber : cat.col, 0.45); ctx.lineWidth = 1; ctx.stroke();
  const yy = y + (1 - seg(u, tin1, tin1 + 0.4, E.o)) * 8;
  txt(a1, x + 14, yy + 20, { size: 14, weight: 500, col: amber ? C.amber : C.ink });
  if (b > 0) {
    if (amber) dot(x + 18, yy + 39, 3, C.amber, b);
    else checkMark(x + 19, yy + 39, 1, C.cool, b);
    txt(a2, x + 30, yy + 43, { size: 13, weight: 400, col: amber ? C.warm : C.cool, a: b });
  }
  ctx.restore();
}

// ---------- the briefing ----------
function drawBriefing(t) {
  const a = seg(t, T.brief + 0.2, T.brief + 0.8) * (1 - seg(t, 66.0, 66.8));
  const lead = seg(t, T.brief, T.brief + 0.6) * (1 - seg(t, 65.9, 66.5));
  const [hx, hy] = P(0, 0);
  const X = 1000, Y = 268, Wd = 600;
  if (lead > 0.01) {
    const ex = lerp(hx + 24, X, lead);
    line([hx + 24, hy], [ex, hy], C.amber, 0.6 * lead, 1.2);
    glow(ex, hy, 18, C.amber, 0.6 * lead);
  }
  if (a <= 0.01) return;
  const open = seg(t, T.brief + 0.2, T.brief + 1.0, E.io5);
  const close = 0;
  const shrink = seg(t, 65.9, 66.8, E.io);
  const fullH = 566;
  const h = fullH * open * (1 - close) + 4;
  const cy = hy;
  const y0 = lerp(cy - h / 2, Y, open * (1 - close));
  ctx.save(); ctx.globalAlpha = a;
  const sc2 = 1 - 0.12 * shrink;
  ctx.translate(X, cy); ctx.scale(sc2, sc2); ctx.translate(-X - 40 * shrink, -cy);
  rrect(X, y0, Wd, h, 14);
  ctx.fillStyle = 'rgba(13,18,27,0.96)'; ctx.fill();
  ctx.strokeStyle = 'rgba(244,178,88,0.35)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.clip();
  const c = (k) => seg(t, T.brief + 0.8 + k * 0.28, T.brief + 1.3 + k * 0.28) * (1 - close);
  let y = y0 + 44;
  caps('Maestro · Briefing for the CSAM', X + 32, y, { col: C.amber, a: c(0), size: 12.5 });
  caps('Growth Scout', X + Wd - 32, y, { a: c(0) * 0.8, align: 'right', size: 12 });
  y += 44;
  txt(BRIEF.title, X + 32, y, { size: 26, weight: 500, a: c(1) });
  y += 22;
  ctx.fillStyle = `rgba(255,255,255,${0.07 * c(1)})`; ctx.fillRect(X + 32, y, Wd - 64, 1);
  y += 38;
  BRIEF.sections.forEach(([lab, body], i) => {
    const ca = c(2 + i);
    const last = i === BRIEF.sections.length - 1;
    if (last) {
      ctx.fillStyle = rgba(C.amber, 0.08 * ca); ctx.fillRect(X + 20, y - 26, Wd - 40, 96);
      ctx.fillStyle = rgba(C.amber, 0.9 * ca); ctx.fillRect(X + 20, y - 26, 2, 96);
    }
    caps(lab, X + 32, y - 2, { a: ca, size: 11.5, col: last ? C.amber : C.dim });
    const lines = wrap(body, 18, 400, Wd - 72);
    lines.forEach((l, j) => txt(l, X + 32, y + 26 + j * 26, { size: 18, weight: 400, a: ca * 0.94, col: C.ink }));
    y += 26 + lines.length * 26 + 30;
  });
  ctx.restore();
}

// ---------- the human role ----------
function drawStakeholders(t) {
  const [hx, hy, s] = P(0, 0);
  for (const sh of STAKEHOLDERS) {
    const e = seg(t, sh.t, sh.t + 1.0, E.o) * (1 - seg(t, 76.0, 76.7));
    if (e <= 0.01) continue;
    const [x, y] = P(sh.pos[0], sh.pos[1]);
    const perp = [-(y - hy) * 0.12, (x - hx) * 0.12];
    const m = [(x + hx) / 2 + perp[0], (y + hy) / 2 + perp[1]];
    const draw = seg(t, sh.t - 0.2, sh.t + 0.9);
    const isCIO = sh.name === 'CIO';
    curve([hx, hy], m, [x, y], C.warm, (isCIO ? 0.55 : 0.34) * e, 1.2, 0.08, draw);
    // two-way conversation
    for (let k = 0; k < 2; k++) {
      const ph = frac(t * 0.3 + hash(sh.ang) + k * 0.5);
      const v = k === 0 ? ph : 1 - ph;
      const q = qbez([hx, hy], m, [x, y], v);
      dot(q[0], q[1], 2, C.warm, 0.8 * e * Math.sin(Math.PI * ph) * draw);
      glow(q[0], q[1], 12, C.warm, 0.25 * e * Math.sin(Math.PI * ph) * draw);
    }
    glow(x, y, 50, C.warm, 0.2 * e);
    dot(x, y, 13, C.bg1, e);
    ctx.strokeStyle = rgba(C.warm, 0.8 * e); ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(x, y, 10 * (0.6 + 0.4 * e), 0, TAU); ctx.stroke();
    dot(x, y, 3.2, C.warm, e);
    txt(sh.name.toUpperCase(), x, y + 32, { size: 12.5, weight: 500, ls: 2.2, col: mix(C.ink, C.warm, 0.25), a: 0.9 * e, align: 'center', shadow: 6 });
  }
  // the briefing's recommendation travels to the CIO
  const u = inv(66.6, 67.5, t);
  if (u > 0 && u < 1) {
    const cio = STAKEHOLDERS[0], q = P(cio.pos[0], cio.pos[1]);
    const pts = []; for (let i = 0; i < 12; i++) { const v = E.io(clamp(u - i * 0.03)); pts.push([lerp(hx, q[0], v), lerp(hy, q[1], v)]); }
    comet(pts, C.amber, 0.9, 2);
  }
}

// ---------- automation vs. agent (screen-space, inside the Execution Assistant) ----------
function drawRecipe(t) {
  if (t < 38.6 || t > 49.4) return;
  const L = 1080, x0 = 420, midY = 560, cx = 960, cyT = 540;
  const alive = 1 - seg(t, 48.7, 49.3);
  const k = seg(t, T.bend, T.bend + 1.5, E.io);
  const ret = seg(t, T.back, T.back + 1.4, E.io5);
  const sc = lerp(1, 0.02, ret);
  const gray = seg(t, 42.0, 42.5) * (1 - k);
  // geometry of the (possibly bent) line: bend downward -> clockwise circle; then centre at (cx,cyT)
  const R = k > 1e-4 ? L / (TAU * k) : 1e9;
  const pos = (s) => {
    let x, y;
    if (k < 1e-4) { x = x0 + s * L; y = midY; }
    else { const ph = TAU * k * (s - 0.5); x = cx + R * Math.sin(ph); y = midY + R * (1 - Math.cos(ph)); }
    y -= (midY + L / TAU - cyT) * k;
    return [cx + (x - cx) * sc, cyT + (y - cyT) * sc];
  };
  ctx.save(); ctx.globalAlpha = alive;
  // intro: the agent's light slides out to become the trigger
  const intro = seg(t, 38.9, 39.8, E.io);
  const draw = seg(t, 39.3, 40.3, E.io);
  const lineCol = mix(mix(C.cool, C.gray, 0.3 + 0.5 * gray), C.cool, k);
  const lineA = 0.42 + 0.25 * k - 0.15 * gray;
  if (t < 39.9) {
    const p = [lerp(cx, x0, intro), lerp(540, midY, intro)];
    glow(p[0], p[1], 50, C.cool, 0.8 * (1 - seg(t, 39.6, 39.9)));
    dot(p[0], p[1], 5, [255, 255, 255], 1 - seg(t, 39.6, 39.9));
  }
  // line
  ctx.strokeStyle = rgba(lineCol, lineA); ctx.lineWidth = 1.6; ctx.beginPath();
  const smax = draw;
  for (let i = 0; i <= 160; i++) { const s = (i / 160) * smax; const q = pos(s); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }
  ctx.stroke();
  // pipeline nodes
  const pipeA = 1 - seg(t, 42.7, 43.2);
  const pipe = [[0, 'Trigger'], [0.27, 'Step'], [0.54, 'Step'], [0.81, 'Output'], [1, 'Stop']];
  const pu = inv(40.3, 42.0, t);
  pipe.forEach(([s, lab], i) => {
    const ap = seg(draw, Math.max(0, s - 0.06), Math.max(0.01, s)) * pipeA;
    if (ap <= 0.01) return;
    const q = pos(s);
    const passed = pu >= s && t < 42.1 + 0.3;
    const fl = pu > 0 ? Math.exp(-Math.max(0, (pu - s)) * 12) * (pu >= s ? 1 : 0) : 0;
    const col = mix(C.cool, C.gray, gray);
    if (i === 4) {
      ctx.fillStyle = rgba(C.bg1, ap); ctx.fillRect(q[0] - 9, q[1] - 9, 18, 18);
      ctx.strokeStyle = rgba(mix(col, C.ink, 0.3), 0.8 * ap); ctx.lineWidth = 1.4; ctx.strokeRect(q[0] - 9, q[1] - 9, 18, 18);
      ctx.fillStyle = rgba(col, 0.6 * ap); ctx.fillRect(q[0] - 4, q[1] - 4, 8, 8);
    } else {
      dot(q[0], q[1], 10, C.bg1, ap);
      ctx.strokeStyle = rgba(col, 0.8 * ap); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(q[0], q[1], 9, 0, TAU); ctx.stroke();
      dot(q[0], q[1], 3.5, col, ap * (passed ? 1 : 0.5));
    }
    if (fl > 0.02) glow(q[0], q[1], 60, C.cool, fl * 0.7 * ap);
    caps(lab, q[0], q[1] + 40, { a: ap * seg(t, 39.6 + i * 0.12, 40.0 + i * 0.12) * (1 - seg(t, 42.6, 43.0)), align: 'center', col: mix(C.dim, C.gray, gray) });
  });
  // pipeline arrows (chevrons between nodes)
  if (pipeA > 0.01 && k < 0.02) {
    for (let i = 0; i < 4; i++) {
      const s = (pipe[i][0] + pipe[i + 1][0]) / 2, q = pos(s);
      const ap = seg(draw, s - 0.03, s) * pipeA;
      ctx.strokeStyle = rgba(mix(C.cool, C.gray, gray), 0.5 * ap); ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(q[0] - 4, q[1] - 5); ctx.lineTo(q[0] + 2, q[1]); ctx.lineTo(q[0] - 4, q[1] + 5); ctx.stroke();
    }
  }
  if (pu > 0 && pu < 1 && t < 42.1) {
    const pts = []; for (let i = 0; i < 14; i++) pts.push(pos(clamp(E.sine(pu) - i * 0.012)));
    comet(pts, C.cool, 1, 2.2);
  }
  // headers
  caps('Automation', cx, 430, { a: win(t, 39.4, 43.0, 0.5, 0.4), align: 'center', size: 14, ls: 4 });
  caps('Agent', cx, cyT - (L / TAU) * sc - 96 * sc, { a: seg(t, 44.0, 44.6) * (1 - ret), align: 'center', size: 14, ls: 4, col: C.cool });
  // loop nodes & labels
  const loopLabs = ['Observe', 'Understand context', 'Decide', 'Act', 'Monitor', 'Continue'];
  const lt = t - T.loop;
  const speed = 1 / 1.9;
  const lp = lt > 0 ? frac(0.5 + (lt - 0.25 * (1 - Math.exp(-lt * 3)) / 3 * 0) * speed) : -1;
  loopLabs.forEach((lab, j) => {
    const s = frac(0.5 + j / 6);
    const ap = seg(t, 43.9 + j * 0.1, 44.5 + j * 0.1) * (1 - ret);
    if (ap <= 0.01) return;
    const q = pos(s);
    let fl = 0;
    if (lp >= 0) { let d = frac(lp - s); fl = Math.exp(-d * 9); }
    dot(q[0], q[1], 10 * sc + 1, C.bg1, ap);
    ctx.strokeStyle = rgba(C.cool, 0.85 * ap); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(q[0], q[1], 9 * sc + 0.5, 0, TAU); ctx.stroke();
    dot(q[0], q[1], (3.5 + 1.5 * fl) * sc, C.cool, ap);
    if (fl > 0.02) glow(q[0], q[1], 60 * sc, C.cool, fl * 0.6 * ap);
    const ang = Math.atan2(q[1] - cyT, q[0] - cx);
    const lx = q[0] + Math.cos(ang) * 30, ly = q[1] + Math.sin(ang) * 30 + 5;
    const al = Math.cos(ang) > 0.3 ? 'left' : Math.cos(ang) < -0.3 ? 'right' : 'center';
    const lyy = al === 'center' ? (Math.sin(ang) < 0 ? ly - 6 : ly + 8) : ly;
    caps(lab, lx, lyy, { a: ap * (0.7 + 0.3 * fl) * (1 - seg(t, 47.4, 47.8)), align: al, col: mix(C.dim, C.ink, fl) });
  });
  if (lp >= 0 && ret < 1) {
    const pts = []; for (let i = 0; i < 26; i++) pts.push(pos(frac(lp - i * 0.008)));
    comet(pts, C.cool, seg(t, T.loop, T.loop + 0.3), 2.2 * sc + 0.3);
  }
  ctx.restore();
}

// ---------- typography layers ----------
function drawCaptionBand(a) {
  if (a <= 0.01) return;
  const g = ctx.createLinearGradient(0, H - 300, 0, H);
  g.addColorStop(0, 'rgba(4,6,10,0)'); g.addColorStop(0.55, `rgba(4,6,10,${0.6 * a})`); g.addColorStop(1, `rgba(4,6,10,${0.8 * a})`);
  ctx.fillStyle = g; ctx.fillRect(0, H - 300, W, 300);
}
const CAP_Y = 968;
let CAPBAND = 0;
function capBand(t) {
  let b = 0;
  for (const c of CAPTIONS) b = Math.max(b, win(t, c.t0, c.t1, 0.7, 0.6));
  return Math.max(b, win(t, 7.5, 13.5, 0.4, 0.5), win(t, 70.9, 76.2, 0.4, 0.6), win(t, 83.4, 88.4, 0.8, 0.7));
}
function drawCaptions(t) {
  let band = 0;
  for (const c of CAPTIONS) {
    const a = win(t, c.t0, c.t1, 0.7, 0.6);
    if (a <= 0) continue;
    band = Math.max(band, a);
  }
  // word sequences
  const seqA = win(t, 7.5, 13.5, 0.4, 0.5);
  const moreA = win(t, 70.9, 76.2, 0.4, 0.6);
  band = Math.max(band, seqA, moreA);
  drawCaptionBand(band);
  for (const c of CAPTIONS) {
    const a = win(t, c.t0, c.t1, 0.7, 0.6);
    if (a <= 0) continue;
    const rise = (1 - seg(t, c.t0, c.t0 + 1.0, E.o)) * 12;
    txt(c.text, W / 2, CAP_Y + rise, { size: c.size, weight: c.weight, a, align: 'center', ls: 0.2 });
  }
  if (seqA > 0) wordRow(t, ['Observe.', 'Remember.', 'Connect.', 'Track.', 'Follow up.', 'Repeat.'], 7.6, 0.9, seqA, 42, C.ink);
  if (moreA > 0) wordRow(t, ['More judgment.', 'More relationships.', 'More strategy.', 'More customer impact.'], 71.0, 1.05, moreA, 38, C.ink, true);
}
function wordRow(t, words, t0, dt, alpha, size, col, warmLast = false) {
  const gap = size * 0.55;
  const ws = words.map((w) => measure(w, size, 300));
  const total = ws.reduce((p, q) => p + q, 0) + gap * (words.length - 1);
  let x = W / 2 - total / 2;
  words.forEach((w, i) => {
    const a = seg(t, t0 + i * dt, t0 + i * dt + 0.6) * alpha;
    const rise = (1 - seg(t, t0 + i * dt, t0 + i * dt + 0.9, E.o)) * 10;
    const c = warmLast ? mix(C.ink, C.warm, 0.35) : col;
    txt(w, x, CAP_Y + rise, { size, weight: 300, a, col: c });
    x += ws[i] + gap;
  });
}

function drawMaestroWord(t) {
  const a = win(t, T.maestroWord, 28.0, 1.2, 1.0);
  if (a <= 0) return;
  const [x, y, s] = P(0, 0);
  const ls = lerp(22, 15, seg(t, T.maestroWord, 28, E.o));
  txt('MAESTRO', x, y + 70 * s + 16, { size: 40, weight: 300, ls, a, align: 'center', col: C.ink, shadow: 12 });
}

function drawLegend(t) {
  const a = win(t, 83.4, 88.4, 0.8, 0.7);
  if (a <= 0) return;
  drawCaptionBand(a);
  const items = [['Customer environment', 83.9], ['Maestro', 84.95], ['Specialized agents', 85.7], ['CSAM', 86.5]];
  const size = 30, gap = 70;
  const ws = items.map(([s]) => measure(s, size, 300));
  const total = ws.reduce((p, q) => p + q, 0) + gap * (items.length - 1);
  let x = W / 2 - total / 2;
  items.forEach(([s, tt], i) => {
    const lit = seg(t, tt, tt + 0.4);
    const col = i === 3 ? mix(C.dim, C.warm, lit) : mix(C.dim, C.ink, lit);
    txt(s, x, CAP_Y, { size, weight: 300, a: a * (0.55 + 0.45 * lit), col });
    x += ws[i];
    if (i < items.length - 1) {
      const ax = x + gap / 2, ay = CAP_Y - 10;
      const la = a * (0.35 + 0.5 * seg(t, items[i + 1][1] - 0.2, items[i + 1][1] + 0.2));
      line([ax - 14, ay], [ax + 12, ay], C.dim, la, 1.3);
      ctx.strokeStyle = rgba(C.dim, la); ctx.beginPath(); ctx.moveTo(ax + 6, ay - 5); ctx.lineTo(ax + 12, ay); ctx.lineTo(ax + 6, ay + 5); ctx.stroke();
    }
    x += gap;
  });
}

function drawClosing(t) {
  const lines = [
    [T.line1, 'The future CSAM shouldn’t be a human doing the same job faster with AI.'],
    [T.line2, 'It should be a human doing a fundamentally different, higher-value job…'],
    [T.line3, '…because AI is doing the work that never truly required the human.'],
  ];
  const out = 1 - seg(t, 101.4, 102.3);
  lines.forEach(([t0, s], i) => {
    const next = lines[i + 1] ? lines[i + 1][0] : 999;
    const a = seg(t, t0, t0 + 1.0, E.sine) * lerp(1, 0.42, seg(t, next, next + 0.8)) * out;
    if (a <= 0) return;
    const rise = (1 - seg(t, t0, t0 + 1.2, E.o)) * 10;
    txt(s, W / 2, 628 + i * 62 + rise, { size: 36, weight: 300, a, align: 'center', col: i === 2 ? C.ink : C.ink });
  });
  // lockup
  const la = seg(t, 102.9, 104.2, E.sine);
  if (la > 0) {
    const ls = lerp(64, 46, seg(t, 102.9, 105.0, E.o));
    txt('MAESTRO', W / 2, 668, { size: 104, weight: 200, ls, a: la, align: 'center' });
    txt('Reimagining the CSAM Role', W / 2, 736, { size: 28, weight: 300, ls: 1.5, a: seg(t, 104.2, 105.2, E.sine) * 0.9, align: 'center', col: mix(C.ink, C.dim, 0.3) });
  }
}

// ======================================================================
// frame
// ======================================================================
function renderFrame(t) {
  setCam(camAt(CAM_KEYS, t));
  // gentle hand-held drift so holds never feel dead
  cam.x += Math.sin(t * 0.21) * 4 / cam.z; cam.y += Math.cos(t * 0.17) * 3 / cam.z;
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  drawBackground(t);
  const wa = worldAlpha(t);
  CAPBAND = capBand(t);
  const states = CARDS.map((c) => cardState(c, t));
  // world layers
  ctx.save(); ctx.globalAlpha = 1;
  drawField(t, wa);
  if (wa > 0.01) {
    ctx.globalAlpha = wa;
    drawPanels(t);
    drawSpokes(t, states);
    drawLinks(t, states);
    ctx.globalAlpha = 1;
  }
  drawFlows(t);
  drawModel(t);
  drawRing(t);
  if (wa > 0.01) { ctx.globalAlpha = wa; drawHops(t, states); ctx.globalAlpha = 1; }
  drawCards(t, states);
  drawEvents(t);
  drawAgents(t);
  drawSurface(t);
  if (wa > 0.01) { ctx.globalAlpha = wa; drawHuman(t); ctx.globalAlpha = 1; }
  drawStakeholders(t);
  ctx.restore();
  // screen space
  drawRecipe(t);
  drawAgentLabels(t);
  drawBriefing(t);
  drawMaestroWord(t);
  drawLegend(t);
  drawCaptions(t);
  drawClosing(t);
  // finishing: vignette, grain, fades
  ctx.globalAlpha = 1;
  ctx.drawImage(A.vig, 0, 0);
  const f = Math.round(t * FPS);
  ctx.save(); ctx.globalAlpha = 0.035; ctx.fillStyle = A.grain[f % A.grain.length];
  ctx.translate((f * 37) % 256, (f * 91) % 256); ctx.fillRect(-256, -256, W + 512, H + 512); ctx.restore();
  const black = Math.max(1 - seg(t, 0, 1.2, E.sine), seg(t, T.fadeOut, DURATION - 0.2, E.sine));
  if (black > 0) { ctx.fillStyle = `rgba(0,0,0,${black})`; ctx.fillRect(0, 0, W, H); }
}

// ======================================================================
// audio cue sheet (consumed by tools/audio.py so sound is locked to picture)
// ======================================================================
function audioCues() {
  const cues = [];
  CARDS.forEach((c) => cues.push({ t: c.spawn, type: 'tick', v: c.spawn < 7 ? 0.5 : 0.35, p: hash(c.i) }));
  HOPS.forEach((h) => cues.push({ t: h.t, type: 'hop', v: 0.25 }));
  cues.push({ t: T.freeze, type: 'freeze' });
  cues.push({ t: 19.0, type: 'breath' });
  cues.push({ t: T.reorg, type: 'whoosh', v: 0.5 });
  cues.push({ t: T.ringForm, type: 'ring' });
  cues.push({ t: T.maestroWord, type: 'title' });
  AGENTS.forEach((a) => cues.push({ t: a.intro, type: 'agent', i: AGENT_INTRO.indexOf(a.id) }));
  cues.push({ t: T.dive, type: 'dive' });
  [0, 0.27, 0.54, 0.81].forEach((s) => cues.push({ t: 40.3 + 1.7 * s, type: 'step' }));
  cues.push({ t: 42.0, type: 'stop' });
  cues.push({ t: T.bend, type: 'bend' });
  for (let i = 0; i < 6; i++) cues.push({ t: T.loop + i * 0.3167 * 2, type: 'loopstep', i });
  cues.push({ t: T.back, type: 'whoosh', v: 0.4 });
  EVENTS.forEach((e, i) => { cues.push({ t: e.t, type: 'event', i }); cues.push({ t: e.t + 0.85, type: 'resolve', i }); });
  cues.push({ t: T.opp, type: 'opp' });
  cues.push({ t: 60.2, type: 'surface' });
  STAKEHOLDERS.forEach((s, i) => cues.push({ t: s.t, type: 'stake', i }));
  cues.push({ t: 76.2, type: 'callback' });
  cues.push({ t: 78.4, type: 'ring' });
  cues.push({ t: 81.9, type: 'surface' });
  [83.9, 84.95, 85.7, 86.5].forEach((t, i) => cues.push({ t, type: 'legend', i }));
  cues.push({ t: T.line1, type: 'line' }); cues.push({ t: T.line2, type: 'line' }); cues.push({ t: T.line3, type: 'line' });
  cues.push({ t: 102.9, type: 'lockup' });
  return cues.sort((a, b) => a.t - b.t);
}
