/* Corvin, as he is now: never seen, only his shadow.
   Night-time photographs of the rooms of Larkspur House drift slowly behind the page by candlelight.
   Corvin himself (the original raven, monocle and chain and all, from corvin-rig.js) is drawn on his own
   canvas, and that canvas is turned into a soft shadow thrown on the walls by the lamp. He perches,
   watches, hops, bows and spreads his wings exactly as before; you only ever see his shadow do it.
   The game still calls Film.hop(), Film.pose(name), Film.shower(n) and Film.flash(v). */
(() => {
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const cv = document.getElementById('film'); if (!cv) return;
const ctx = cv.getContext('2d');
const ROOMS = (window.LK_ROOMS || ['dining_room', 'drawing_room', 'library', 'morning_room', 'servants_hall', 'kitchen', 'dressing_room'])
  .map(n => '/media/rooms/' + n + '.jpg');
const now = () => performance.now();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const rand = (a, b) => a + Math.random() * (b - a);

let W = 0, H = 0, DPR = 1;
function size() {
  DPR = Math.min(1.5, window.devicePixelRatio || 1);
  const r = cv.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
}
addEventListener('resize', size); size();

// ---------------------------------------------------------------- Corvin's shadow layer
const sh = document.createElement('canvas'); sh.id = 'corvin'; sh.setAttribute('aria-hidden', 'true');
Object.assign(sh.style, { position: 'fixed', inset: '0', width: '100vw', height: '100vh', zIndex: getComputedStyle(cv).zIndex || '0',
  pointerEvents: 'none', opacity: '0', mixBlendMode: 'multiply', filter: 'brightness(0) blur(2.5px)',
  transformOrigin: '50% 100%', transform: 'skewX(-5deg)', transition: 'opacity 1.1s ease' });
cv.insertAdjacentElement('afterend', sh);
const rig = document.createElement('script'); rig.src = '/js/corvin-rig.js'; document.head.appendChild(rig);
const Rig = () => window.CorvinRig;
let spot = null, shown = false, hideAt = 0, nextAuto = now() + rand(4000, 7000);
const RAVEN_H = 300;                                                     // the rig's raven is ~300 units tall at s = 1
function place(kind) {
  const right = innerWidth * .92, left = innerWidth * (innerWidth > 900 ? .42 : .1);
  const big = kind === 'spread' || kind === 'bow';
  const hgt = innerHeight * (big ? rand(.62, .72) : rand(.38, .5));
  spot = { x: rand(left + hgt * .3, right - hgt * .2), y: innerHeight * (big ? .86 : rand(.72, .84)), s: hgt / RAVEN_H, big };
}
function show(kind, ms) {
  const r = Rig(); if (!r) return;
  if (!shown || (kind && (kind === 'spread' || kind === 'bow') !== (spot && spot.big))) place(kind);
  r.ravenOnly(() => spot ? { x: spot.x, y: spot.y, s: spot.s, ang: 0 } : null);
  sh.style.opacity = spot.big ? '.66' : '.6'; shown = true; hideAt = now() + (ms || 7000);
}
function hide() { sh.style.opacity = '0'; shown = false; }

// ---------------------------------------------------------------- the rooms
const imgs = [];
const order = ROOMS.map((_, i) => i).sort(() => Math.random() - .5);
let cur = 0, curStart = now(), fadeFrom = null, fadeStart = 0;
const HOLD = 22000, FADE = 3500;
function load(i) { if (imgs[i]) return imgs[i]; const im = new Image(); im.decoding = 'async'; im.src = ROOMS[i]; imgs[i] = im; return im; }
load(order[0]); load(order[1 % order.length]);
function drawRoom(im, t0, alpha) {
  if (!im || !im.complete || !im.naturalWidth) return;
  const age = (now() - t0) / (HOLD + FADE);
  const z = reduce ? 1.04 : 1.04 + .07 * clamp(age, 0, 1);
  const s = Math.max(W / im.naturalWidth, H / im.naturalHeight) * z;
  const dw = im.naturalWidth * s, dh = im.naturalHeight * s;
  const dx = (W - dw) / 2 + (reduce ? 0 : (age - .5) * W * .025), dy = (H - dh) / 2;
  ctx.globalAlpha = alpha; ctx.filter = 'brightness(1.45) contrast(1.05)'; ctx.drawImage(im, dx, dy, dw, dh); ctx.filter = 'none'; ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- lamplight, dust, flashes
let flick = 0, flickBoost = 0, flash = 0, pool = 0;
const motes = Array.from({ length: reduce ? 0 : 46 }, () => ({ x: Math.random(), y: Math.random(), r: rand(.5, 1.6), v: rand(.004, .012), p: Math.random() * 6 }));
function atmosphere(t) {
  const n = Math.sin(t / 97) * .5 + Math.sin(t / 61 + 1.3) * .3 + Math.sin(t / 23 + 4) * .2;
  flick = n * (.6 + flickBoost); flickBoost *= .985;
  // the lamp's warm pool on the wall behind him, so his shadow has light to fall across
  pool += ((shown ? 1 : 0) - pool) * .04;
  if (pool > .01 && spot) {
    const r0 = cv.getBoundingClientRect(), px = spot.x - r0.left, py = spot.y - spot.s * RAVEN_H * .5, pr = Math.max(spot.s * RAVEN_H * 1.3, W * .3);
    const lg = ctx.createRadialGradient(px, py, pr * .05, px, py, pr), a = pool * (.9 + flick * .2);
    lg.addColorStop(0, `rgba(255,190,120,${(.36 * a).toFixed(3)})`); lg.addColorStop(.5, `rgba(255,160,90,${(.15 * a).toFixed(3)})`); lg.addColorStop(1, 'rgba(255,150,80,0)');
    ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
  }
  const g = ctx.createRadialGradient(W * .5, H * .62, H * .05, W * .5, H * .55, Math.max(W, H) * .8);
  g.addColorStop(0, `rgba(255,170,90,${(.06 + flick * .03).toFixed(3)})`);
  g.addColorStop(.55, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,6,${(.38 - flick * .05).toFixed(3)})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (const m of motes) {
    m.y -= m.v * .016; m.x += Math.sin(t / 1800 + m.p) * .00015; if (m.y < -.02) { m.y = 1.02; m.x = Math.random(); }
    ctx.fillStyle = `rgba(255,220,170,${(.12 + .1 * Math.sin(t / 700 + m.p)).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(m.x * W, m.y * H, m.r, 0, Math.PI * 2); ctx.fill();
  }
  if (flash > .002) { ctx.fillStyle = `rgba(220,230,255,${flash.toFixed(3)})`; ctx.fillRect(0, 0, W, H); flash *= .9; }
  if (shown) sh.style.filter = `brightness(0) blur(${(2.4 + flick * .6).toFixed(2)}px)`;   // the shadow wavers with the flame
}

// ---------------------------------------------------------------- loop
function frame() {
  const t = now();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#07090f'; ctx.fillRect(0, 0, W, H);
  if (t - curStart > HOLD) { fadeFrom = { i: order[cur], t0: curStart }; fadeStart = t; cur = (cur + 1) % order.length; curStart = t; load(order[(cur + 1) % order.length]); }
  if (fadeFrom && t - fadeStart < FADE) drawRoom(imgs[fadeFrom.i], fadeFrom.t0, 1); else fadeFrom = null;
  drawRoom(load(order[cur]), curStart, fadeFrom ? ease(clamp((t - fadeStart) / FADE, 0, 1)) : 1);
  if (shown && t > hideAt) hide();
  if (!shown && t > nextAuto && Rig()) {                                   // now and then he is simply there, watching
    show(null, rand(6000, 9000)); nextAuto = t + rand(20000, 34000);
    setTimeout(() => { const r = Rig(); r && r.pose(Math.random() < .5 ? 'tilt' : 'aside'); }, 1600);
  }
  atmosphere(t);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---------------------------------------------------------------- what the game calls
window.Film = {
  hop() { show(null, 5000); const r = Rig(); r && setTimeout(() => r.hop(), 500); },
  pose(name) { show(name, name === 'spread' || name === 'bow' ? 6000 : 5000); const r = Rig(); r && setTimeout(() => r.pose(name), 400); nextAuto = now() + rand(18000, 28000); },
  shower(n) { flickBoost = clamp((n || 5) / 10, .3, 2); },
  flash(v) { flash = clamp(v || .4, 0, .8); },
};
})();
