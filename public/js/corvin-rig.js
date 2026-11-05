/* Corvin's rig, from the original title screen. It now draws only Corvin, on his own canvas, and
   corvin-film.js turns that canvas into a shadow on the walls. Original notes: the rigged raven on the
   telescope in the dome, moonbeam, dust and meteors, drawn live on a canvas. The game calls
   Film.hop(), Film.pose(name), Film.shower(n) and Film.flash(v) when things happen. */
(() => {
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = id => document.getElementById(id);
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const lerp = (a,b,t) => a+(b-a)*t;
const ease = t => t<.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;
const now = () => performance.now();
if (!window.Sound) window.Sound = {};
if (!Sound.init) Sound.init = () => {};
if (!Sound.caw) Sound.caw = () => {};
const Film = (() => {
  const cv = $('corvin'); let ctx = cv.getContext('2d'); const mainCtx = ctx;
  const buf = document.createElement('canvas'); const bctx = buf.getContext('2d');
  let scene = 'dome', prevScene = null, sceneT0 = 0, sceneFade = 1400, fCur = 1, snapPending = false, snapScene = null, snapCam = null;
  const SW = 1000, SH = 625;
  let W = 0, H = 0, dpr = 1, px = 1;

  /* telescope tube: centreline from A to B, radius TR */
  const TA = {x:90, y:575}, TB = {x:1040, y:405}, TR = 24;
  const tAng = Math.atan2(TB.y-TA.y, TB.x-TA.x);
  const tubeTopAt = x => TA.y + (x-TA.x)*Math.tan(tAng) - TR/Math.cos(tAng);
  const DRX = 500, DRS = 1.55, DRY = tubeTopAt(DRX) + 2;
  let RX = DRX, RS = DRS, RY = DRY, perchAng = tAng;

  /* rig: springs */
  const P = {};
  const defs = {headRot:[0,13],yaw:[0,9],wing:[0,8],spread:[0,9],hackle:[0,12],lean:[0,7],tail:[0,9],crouch:[0,14]};
  for (const k in defs) P[k] = {x:defs[k][0], v:0, t:defs[k][0], w:defs[k][1]};
  const spring = (p, dt) => { const a = p.w*p.w*(p.t-p.x) - 2*p.w*p.v; p.v += a*dt; p.x += p.v*dt; };
  let beak = 0, mouth = 0, beakG = 0, blink = 0, nict = 0;
  let hopY = 0, hopV = 0, squash = 0, squashV = 0, shake = 0;
  let chainA = 0, chainV = 0, prevHead = 0;

  /* gestures: additive envelopes */
  const gestures = [];
  function gesture(param, amt, dur, delay=0){ gestures.push({param, amt, t0:now()+delay, dur}); }
  const env = u => u<0||u>1 ? 0 : (u<.25 ? ease(u/.25) : u>.7 ? ease((1-u)/.3) : 1);

  /* camera */
  const cam = {z:1, cx:540, cy:350};
  let camTw = null;
  function camTo(z, cx, cy, dur, lin){ camTw = {from:{...cam}, to:{z,cx,cy}, t0:now(), dur, lin:!!lin}; if (reduce) { Object.assign(cam,{z:1,cx,cy}); camTw=null; } }
  let still = false, snapZ = 0, snapT0 = 0;
  let ravenFn = null;
  let ptr = {x:0, y:0, sx:0, sy:0, at:-1e9};

  /* behaviour state */
  let talking = false, quoteMode = false, lookTarget = null, lookUntil = 0, nextIdle = now()+2500, nextBlink = now()+1800; let nextGaze = now()+1800;

  /* world */
  let stars = [], dust = [], meteors = [], nextMeteor = now()+1500;
  const rnd = (s => () => (s = (s*16807)%2147483647)/2147483647)(42);
  for (let i=0;i<170;i++) stars.push({x:560+rnd()*280, y:rnd()*380, r:rnd()*1.3+.25, p:rnd()*6.28, s:.4+rnd()*1.6});
  for (let i=0;i<70;i++) dust.push({x:rnd()*SW, y:rnd()*SH, z:.4+rnd()*1.2, p:rnd()*6.28});

  /* film grain tile */
  const grain = document.createElement('canvas'); grain.width = grain.height = 160;
  { const g = grain.getContext('2d'), id = g.createImageData(160,160);
    for (let i=0;i<id.data.length;i+=4){ const v = Math.random()*255; id.data[i]=id.data[i+1]=id.data[i+2]=v; id.data[i+3]=22; }
    g.putImageData(id,0,0); }
  let grainPat = null, grainT = 0, grainX = 0, grainY = 0;

  let rscale = 1, ftAvg = 16.7, ftT = 0;
  function size(){
    const r = cv.getBoundingClientRect(); dpr = Math.max(.5, Math.min(devicePixelRatio||1, 1.5) * rscale);
    // big screens (TVs) don't need more than ~1600 drawn pixels across; the browser scales it up smoothly
    if (r.width * dpr > 1440) dpr = 1440 / r.width;
    W = r.width; H = r.height; cv.width = Math.round(W*dpr); cv.height = Math.round(H*dpr);
    buf.width = cv.width; buf.height = cv.height;
    grainPat = ctx.createPattern(grain,'repeat');
  }

  /* ---------- helpers ---------- */
  function innerGlow(path, color, dx, dy, blur){
    ctx.save(); path(); ctx.clip();
    ctx.shadowColor = color; ctx.shadowBlur = blur*px; ctx.shadowOffsetX = dx*px; ctx.shadowOffsetY = dy*px;
    ctx.beginPath(); ctx.rect(-260,-260,520,520); path(true); ctx.fillStyle = '#000'; ctx.fill('evenodd');
    ctx.restore();
  }
  function feather(bx, by, ang, len, w0, w1, fill){
    const c = Math.cos(ang), s = Math.sin(ang), nx = -s, ny = c;
    const tx = bx+c*len, ty = by+s*len;
    ctx.beginPath();
    ctx.moveTo(bx+nx*w0, by+ny*w0);
    ctx.quadraticCurveTo(bx+c*len*.55+nx*w1*1.15, by+s*len*.55+ny*w1*1.15, tx+nx*w1*.6 - c*2, ty+ny*w1*.6 - s*2);
    ctx.quadraticCurveTo(tx+c*w1*.7, ty+s*w1*.7, tx-nx*w1*.6 - c*2, ty-ny*w1*.6 - s*2);
    ctx.quadraticCurveTo(bx+c*len*.55-nx*w1*1.15, by+s*len*.55-ny*w1*1.15, bx-nx*w0, by-ny*w0);
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = 'rgba(150,170,230,.10)'; ctx.lineWidth = .8;
    ctx.beginPath(); ctx.moveTo(bx,by); ctx.lineTo(tx-c*4,ty-s*4); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = .7;
    ctx.beginPath(); ctx.moveTo(bx-nx*w0, by-ny*w0); ctx.quadraticCurveTo(bx+c*len*.55-nx*w1*1.15, by+s*len*.55-ny*w1*1.15, tx-nx*w1*.6, ty-ny*w1*.6); ctx.stroke();
  }

  /* ---------- environment ---------- */
  function drawSky(t){
    ctx.save();
    ctx.beginPath(); ctx.rect(585,-40,225,385); ctx.clip();
    const g = ctx.createLinearGradient(0,-40,0,345);
    g.addColorStop(0,'#0a1634'); g.addColorStop(.7,'#0b1a3c'); g.addColorStop(1,'#13244a');
    ctx.fillStyle = g; ctx.fillRect(585,-40,225,385);
    // milky way haze
    const mw = ctx.createLinearGradient(600,0,800,330);
    mw.addColorStop(0,'rgba(140,160,220,0)'); mw.addColorStop(.5,'rgba(140,160,220,.10)'); mw.addColorStop(1,'rgba(140,160,220,0)');
    ctx.fillStyle = mw; ctx.fillRect(585,-40,225,385);
    for (const s of stars){
      const a = reduce ? .75 : .45+.5*Math.sin(t/1000*s.s+s.p);
      ctx.globalAlpha = a; ctx.fillStyle = '#e6ecff';
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // moon
    ctx.save(); ctx.shadowColor = 'rgba(220,230,255,.8)'; ctx.shadowBlur = 40*px;
    const mg = ctx.createRadialGradient(735,96,4,742,104,30);
    mg.addColorStop(0,'#fbfbf2'); mg.addColorStop(1,'#cfd5e6');
    ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(742,104,28,0,6.283); ctx.fill(); ctx.restore();
    ctx.fillStyle = 'rgba(150,160,185,.35)';
    [[734,96,6],[752,112,4],[746,92,3],[730,114,3.5]].forEach(([x,y,r])=>{ctx.beginPath();ctx.arc(x,y,r,0,6.283);ctx.fill();});
    // meteors
    for (const m of meteors){
      const tx = m.x + m.l*.82, ty = m.y - m.l*.58;
      const lg = ctx.createLinearGradient(m.x,m.y,tx,ty);
      lg.addColorStop(0,`rgba(255,246,225,${m.life})`); lg.addColorStop(1,'rgba(255,246,225,0)');
      ctx.strokeStyle = lg; ctx.lineWidth = 2; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(m.x,m.y); ctx.lineTo(tx,ty); ctx.stroke();
      ctx.fillStyle = `rgba(255,250,235,${m.life})`; ctx.beginPath(); ctx.arc(m.x,m.y,1.8,0,6.283); ctx.fill();
    }
    ctx.restore();
  }
  function drawDome(){
    const g = ctx.createLinearGradient(0,0,0,SH);
    g.addColorStop(0,'#0a0e1b'); g.addColorStop(.6,'#0e1426'); g.addColorStop(1,'#080b14');
    ctx.fillStyle = g; ctx.fillRect(-200,-200,SW+400,SH+400);
    // ribs converging upward
    ctx.lineWidth = 9;
    [-120,90,300,470,900,1080].forEach((x,i)=>{
      ctx.strokeStyle = '#151c31';
      ctx.beginPath(); ctx.moveTo(x,SH+40); ctx.quadraticCurveTo(x+(500-x)*.15, 200, 500+(x-500)*.25, -260); ctx.stroke();
      ctx.strokeStyle = 'rgba(160,180,230,.06)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x+4,SH+40); ctx.quadraticCurveTo(x+4+(500-x)*.15, 200, 504+(x-500)*.25, -260); ctx.stroke();
      ctx.lineWidth = 9;
    });
    // horizontal ring
    ctx.strokeStyle = '#141a2d'; ctx.lineWidth = 14;
    ctx.beginPath(); ctx.moveTo(-100,360); ctx.quadraticCurveTo(500,300,1100,360); ctx.stroke();
    ctx.fillStyle = 'rgba(201,163,90,.18)';
    for (let x=-60;x<1080;x+=42){ const y = 360 - 60*(1-Math.pow((x-500)/600,2)) ; ctx.beginPath(); ctx.arc(x,y+1,1.6,0,6.283); ctx.fill(); }
    // slit opening
    drawSkyRef();
    // shutter rails
    const rail = (x) => { const rg = ctx.createLinearGradient(x-9,0,x+9,0); rg.addColorStop(0,'#0c1120'); rg.addColorStop(.5,'#2a3045'); rg.addColorStop(1,'#0c1120'); ctx.fillStyle = rg; ctx.fillRect(x-9,-60,18,410); };
    rail(585); rail(810);
    ctx.fillStyle = '#0d1222'; ctx.fillRect(570,340,255,22);
    ctx.fillStyle = 'rgba(190,205,240,.10)'; ctx.fillRect(570,340,255,2);
  }
  let drawSkyRef = () => {};

  function drawBeam(){
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(700,0,350,625);
    g.addColorStop(0,'rgba(150,175,235,.20)'); g.addColorStop(.55,'rgba(150,175,235,.07)'); g.addColorStop(1,'rgba(150,175,235,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(592,0); ctx.lineTo(805,0); ctx.lineTo(600,700); ctx.lineTo(150,700); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  const inBeam = (x,y) => { const l = 592 - (y/700)*442, r = 805 - (y/700)*205; return x>l && x<r ? Math.min(1,(x-l)/40,(r-x)/40) : 0; };
  function drawDust(t, layer){
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const d of dust){
      if ((d.z>1) !== layer) continue;
      const x = (d.x + Math.sin(t/4000+d.p)*20 + t*.004*d.z) % (SW+40) - 20;
      const y = (d.y + Math.cos(t/5200+d.p)*14 - t*.003*d.z + SH*4) % SH;
      const b = inBeam(x,y); if (b<=0) continue;
      const r = d.z>1 ? 2.6*d.z : 1.1*d.z;
      ctx.fillStyle = `rgba(210,222,255,${(d.z>1?.07:.35)*b})`;
      ctx.beginPath(); ctx.arc(x,y,r,0,6.283); ctx.fill();
    }
    ctx.restore();
  }
  function drawLamp(){
    const g = ctx.createRadialGradient(40,640,10,40,640,520);
    g.addColorStop(0,'rgba(232,170,90,.28)'); g.addColorStop(.5,'rgba(232,170,90,.08)'); g.addColorStop(1,'rgba(232,170,90,0)');
    ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.fillStyle = g; ctx.fillRect(-100,100,800,600); ctx.restore();
  }
  function drawTelescope(){
    // pier
    const pg = ctx.createLinearGradient(330,0,410,0);
    pg.addColorStop(0,'#0a0d18'); pg.addColorStop(.55,'#2c3654'); pg.addColorStop(.75,'#3b4668'); pg.addColorStop(1,'#0a0d18');
    ctx.fillStyle = pg; ctx.beginPath(); ctx.moveTo(342,538); ctx.lineTo(398,538); ctx.lineTo(424,700); ctx.lineTo(316,700); ctx.fill();
    const cg = ctx.createLinearGradient(0,520,0,576); cg.addColorStop(0,'#e6c67e'); cg.addColorStop(.4,'#8a6d36'); cg.addColorStop(1,'#2a200e');
    ctx.fillStyle = cg; ctx.fillRect(330,560,80,16); ctx.fillRect(352,520,36,44);
    ctx.save(); ctx.translate(TA.x,TA.y); ctx.rotate(tAng);
    const len = Math.hypot(TB.x-TA.x, TB.y-TA.y);
    const g = ctx.createLinearGradient(0,-TR,0,TR);
    g.addColorStop(0,'#f1d79a'); g.addColorStop(.12,'#c9a35a'); g.addColorStop(.45,'#7a6233'); g.addColorStop(.8,'#3a2d16'); g.addColorStop(1,'#1c150a');
    ctx.fillStyle = g; ctx.fillRect(0,-TR,len,TR*2);
    // moon specular stripe
    ctx.fillStyle = 'rgba(220,232,255,.35)'; ctx.fillRect(0,-TR+3,len,1.6);
    // bands
    [60,250,520,780].forEach(x=>{
      const bg = ctx.createLinearGradient(0,-TR-3,0,TR+3);
      bg.addColorStop(0,'#fff0c4'); bg.addColorStop(.2,'#b08d47'); bg.addColorStop(1,'#20180b');
      ctx.fillStyle = bg; ctx.fillRect(x,-TR-3,16,TR*2+6);
      ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x+16,-TR,2,TR*2);
    });
    // dew shield end
    ctx.fillStyle = g; ctx.fillRect(len-60,-TR-6,80,TR*2+12);
    // eyepiece
    ctx.fillStyle = '#2a2216'; ctx.fillRect(10,-TR-26,14,26);
    ctx.fillStyle = '#c9a35a'; ctx.fillRect(6,-TR-32,22,7);
    ctx.restore();
  }

  /* ---------- the raven ---------- */
  function pBody(addOnly){
    if (!addOnly) ctx.beginPath();
    ctx.moveTo(46,-140);
    ctx.bezierCurveTo(66,-124,76,-98,68,-74);
    ctx.bezierCurveTo(60,-52,38,-38,12,-34);
    ctx.bezierCurveTo(-14,-30,-40,-38,-58,-52);
    ctx.bezierCurveTo(-74,-62,-92,-72,-104,-78);
    ctx.bezierCurveTo(-88,-98,-62,-120,-30,-136);
    ctx.bezierCurveTo(-8,-148,22,-152,46,-140);
    ctx.closePath();
  }
  function pHead(addOnly){
    if (!addOnly) ctx.beginPath();
    ctx.moveTo(-22,6);
    ctx.bezierCurveTo(-32,-14,-24,-38,0,-46);
    ctx.bezierCurveTo(16,-52,34,-49,46,-39);
    ctx.bezierCurveTo(52,-34,56,-30,59,-26);
    ctx.lineTo(61,-8);
    ctx.bezierCurveTo(50,2,36,9,20,13);
    ctx.bezierCurveTo(6,17,-10,16,-22,6);
    ctx.closePath();
  }
  function bodyFill(cx,cy,r){
    const g = ctx.createRadialGradient(cx,cy,2,cx,cy,r);
    g.addColorStop(0,'#2b3558'); g.addColorStop(.45,'#131a2e'); g.addColorStop(1,'#05070d');
    return g;
  }
  function sheen(path, t, x0, y0, x1, y1, k=1){
    ctx.save(); path(); ctx.clip();
    const o = Math.sin(t/2600)*.12 + P.headRot.x*.2 + P.lean.x*.1;
    const g = ctx.createLinearGradient(x0,y0,x1,y1);
    g.addColorStop(clamp(.18+o,0,1),'rgba(90,60,160,0)');
    g.addColorStop(clamp(.40+o,0,1),`rgba(115,85,200,${.19*k})`);
    g.addColorStop(clamp(.54+o,0,1),`rgba(60,150,205,${.17*k})`);
    g.addColorStop(clamp(.74+o,0,1),'rgba(60,150,205,0)');
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(-300,-300,600,600);
    ctx.restore();
  }
  const COOL = 'rgba(180,205,255,.85)', WARM = 'rgba(240,175,95,.5)';
  /* contour-feather scallops, precomputed inside the body */
  const scallops = [];
  for (let r=0;r<9;r++) for (let c=0;c<12;c++){
    const x = 50 - c*13 - (r%2)*6.5, y = -138 + r*12 + c*3.2;
    scallops.push({x,y,s:7+((r*7+c*3)%4)});
  }
  function featherTex(path, list, light){
    ctx.save(); path(); ctx.clip();
    for (const f of list){
      ctx.strokeStyle = 'rgba(0,0,0,.42)'; ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.s, .25, 2.9); ctx.stroke();
      ctx.strokeStyle = light; ctx.lineWidth = .9;
      ctx.beginPath(); ctx.arc(f.x, f.y-1.4, f.s, .5, 2.6); ctx.stroke();
    }
    ctx.restore();
  }

  function drawTail(t){
    const bx = -92, by = -78, flut = reduce ? 0 : Math.sin(t/430)*.012;
    for (let i=6;i>=0;i--){
      const a = 2.80 + (i-3)*.042 + P.tail.x*.25 + P.spread.x*(i-3)*.05 + flut*(i-3);
      const L = 136 - Math.abs(i-3)*10;
      feather(bx+(i-3)*1.2, by+(i-3)*2.2, a, L, 5, 12.5, i%2 ? '#0b0f1c' : '#0f1424');
      // lit edge
      const c = Math.cos(a), s = Math.sin(a);
      ctx.strokeStyle = 'rgba(150,175,235,.16)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(bx+(i-3)*1.2 + s*5, by+(i-3)*2.2 - c*5); ctx.lineTo(bx+(i-3)*1.2 + c*L*.92 + s*11, by+(i-3)*2.2 + s*L*.92 - c*11); ctx.stroke();
    }
  }
  function drawLegs(){
    const leg = (x, far) => {
      const col = far ? '#15161b' : '#25262d';
      ctx.strokeStyle = col; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x,-40); ctx.lineTo(x+3,-5); ctx.stroke();
      ctx.strokeStyle = far ? 'rgba(90,95,110,.2)' : 'rgba(160,172,205,.4)'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(x+3,-38); ctx.lineTo(x+5,-7); ctx.stroke();
      ctx.strokeStyle='rgba(0,0,0,.5)'; ctx.lineWidth=.9;
      for (let k=0;k<6;k++){ ctx.beginPath(); ctx.moveTo(x-3,-33+k*5); ctx.quadraticCurveTo(x+1,-31+k*5,x+5,-33+k*5); ctx.stroke(); }
      ctx.strokeStyle = col; ctx.lineWidth = 5;
      const toes = [[16,-6,24,7],[11,-2,17,10],[5,0,8,11],[-11,-3,-13,8]];
      toes.forEach(([mx,my,ex,ey])=>{ ctx.beginPath(); ctx.moveTo(x+3,-5); ctx.quadraticCurveTo(x+mx,-5+my,x+ex,ey); ctx.stroke(); });
      ctx.strokeStyle = '#050506'; ctx.lineWidth = 2.6;
      toes.forEach(([mx,my,ex,ey])=>{ const d = ex>0?1:-1; ctx.beginPath(); ctx.moveTo(x+ex,ey); ctx.quadraticCurveTo(x+ex+d*2,ey+4,x+ex-d*1,ey+6); ctx.stroke(); });
    };
    leg(-6,true); leg(14,false);
  }
  function drawWing(t, far){
    ctx.save();
    ctx.translate(20,-122);
    const lift = P.wing.x, sp = P.spread.x;
    ctx.rotate(lift*1.05 + (far ? .12 : 0));
    if (far) ctx.translate(-8,-6);
    const flut = reduce ? 0 : Math.sin(t/380)*.01;
    // primaries
    for (let i=7;i>=0;i--){
      const u = i/7;
      const bx = lerp(-34,-84,u), by = lerp(38,60,u);
      const a = 2.74 + i*.022 + flut*i + sp*(.12+i*.12);
      const L = 108 - i*5 + sp*14;
      feather(bx, by, a, L, 4.5, 9 + sp*2, far ? '#070a12' : (i%2 ? '#0c111f' : '#101627'));
      if (!far){
        const c = Math.cos(a), s = Math.sin(a);
        ctx.strokeStyle = 'rgba(160,185,240,.20)'; ctx.lineWidth = .9;
        ctx.beginPath(); ctx.moveTo(bx + s*4, by - c*4); ctx.lineTo(bx + c*L*.95 + s*7, by + s*L*.95 - c*7); ctx.stroke();
      }
    }
    // secondaries
    for (let i=5;i>=0;i--){
      const u = i/5;
      feather(lerp(0,-46,u), lerp(16,46,u), 2.58 + sp*(.5+u*.6), 58+sp*8, 4.5, 9, far ? '#080b14' : '#121a2c');
    }
    // coverts
    const pC = (add) => { if(!add) ctx.beginPath(); ctx.moveTo(10,-10); ctx.bezierCurveTo(28,8,18,44,-18,62); ctx.bezierCurveTo(-50,76,-86,70,-110,56); ctx.bezierCurveTo(-82,30,-36,-8,10,-10); ctx.closePath(); };
    pC(); ctx.fillStyle = far ? '#090c16' : bodyFill(-14,4,110); ctx.fill();
    if (!far){
      ctx.save(); pC(); ctx.clip();
      for (let r=0;r<6;r++){
        for (let k=0;k<8;k++){
          const x = 8 - k*15 - r*7, y = r*12 + k*4.6;
          ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 1.1;
          ctx.beginPath(); ctx.arc(x,y,10,.25,2.7); ctx.stroke();
          ctx.strokeStyle = 'rgba(140,165,230,.13)'; ctx.lineWidth = .9;
          ctx.beginPath(); ctx.arc(x,y-1.5,10,.5,2.4); ctx.stroke();
        }
      }
      ctx.restore();
      sheen(pC, t, -80, 0, 20, 50, 1.2);
      innerGlow(pC, COOL, -2.4, 2.4, 5);
    }
    ctx.restore();
  }
  function hackleLayer(n, x0, x1, y0, y1, len, fill, hk, t, edge){
    for (let i=0;i<n;i++){
      const u = i/(n-1), x = lerp(x0,x1,u), y = lerp(y0,y1,u);
      const f = reduce ? 0 : Math.sin(t/260 + i*1.3)*1.2;
      const L = len*(.8+.35*Math.sin(i*2.1+1)) + hk*8;
      const tx = x - 4 + hk*6 + f, ty = y + L;
      ctx.beginPath(); ctx.moveTo(x-6,y); ctx.quadraticCurveTo(x-4,y+L*.6,tx,ty); ctx.quadraticCurveTo(x+3,y+L*.55,x+7,y); ctx.closePath();
      ctx.fillStyle = fill; ctx.fill();
      if (edge){ ctx.strokeStyle = edge; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(x+6,y+2); ctx.quadraticCurveTo(x+3,y+L*.55,tx,ty); ctx.stroke(); }
    }
  }
  function drawHead(t){
    const hk = P.hackle.x;
    // nape shag
    ctx.fillStyle = '#0b0f1c';
    for (let i=0;i<6;i++){
      const y = -2 - i*8, x = -22 + i*2.5 + (i>3?(i-3)*3:0);
      ctx.beginPath(); ctx.moveTo(x+8,y-7); ctx.lineTo(x-9-hk*4, y+3 + Math.sin(t/300+i)*.8); ctx.lineTo(x+8,y+5); ctx.closePath(); ctx.fill();
    }
    // throat hackles, tucked under the chin: two shaggy layers
    hackleLayer(9, -14, 50, 6, -4, 30, '#080b15', hk, t, null);
    hackleLayer(8, -8, 44, 9, 1, 30, '#0e1322', hk, t, 'rgba(150,175,235,.22)');
    // head
    pHead(); ctx.fillStyle = bodyFill(18,-36,64); ctx.fill();
    // head texture: tiny feather lines
    ctx.save(); pHead(); ctx.clip();
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = .8;
    for (let i=0;i<26;i++){ const x = -20 + (i*13)%70, y = -40 + Math.floor(i/5)*10; ctx.beginPath(); ctx.arc(x,y,5,.4,2.6); ctx.stroke(); }
    ctx.restore();
    sheen(pHead, t, -14, -50, 50, 10, 1.1);
    innerGlow(pHead, COOL, -2.6, 2.6, 6);
    // brow ridge shadow
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.beginPath(); ctx.ellipse(27,-37,13,4.5,-.18,0,6.283); ctx.fill();

    // beak (with yaw foreshortening)
    const yaw = P.yaw.x, fs = 1 - Math.max(0,yaw)*.28;
    ctx.save(); ctx.translate(56,-18); ctx.scale(fs,1);
    const open = beak*.42;
    if (open > .01){
      ctx.fillStyle = '#2a0b12';
      ctx.beginPath(); ctx.moveTo(1,4); ctx.lineTo(58,9);
      ctx.lineTo(2 + Math.cos(open)*52, 6 + Math.sin(open)*52); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#4a1822';
      ctx.beginPath(); ctx.ellipse(16,9+open*10,10,2.5,open*.6,0,6.283); ctx.fill();
    }
    ctx.save(); ctx.translate(1,5); ctx.rotate(open);
    const pL = (add) => { if(!add) ctx.beginPath(); ctx.moveTo(-2,-1); ctx.bezierCurveTo(20,-1,40,2,55,5); ctx.bezierCurveTo(44,11,22,14,0,12); ctx.closePath(); };
    pL(); const lg = ctx.createLinearGradient(0,0,0,13); lg.addColorStop(0,'#24262f'); lg.addColorStop(1,'#0a0b0e'); ctx.fillStyle = lg; ctx.fill();
    ctx.restore();
    const pU = (add) => { if(!add) ctx.beginPath(); ctx.moveTo(-4,-14); ctx.bezierCurveTo(22,-17,46,-10,62,3); ctx.bezierCurveTo(66,7,66,12,61,14); ctx.bezierCurveTo(48,8,26,5,-1,6); ctx.closePath(); };
    pU(); const bg = ctx.createLinearGradient(0,-16,0,10); bg.addColorStop(0,'#454b60'); bg.addColorStop(.3,'#20232d'); bg.addColorStop(1,'#08090c'); ctx.fillStyle = bg; ctx.fill();
    innerGlow(pU, 'rgba(210,225,255,.95)', -1.5, 1.8, 3);
    // tomium line
    ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0,5.5); ctx.bezierCurveTo(26,5,48,8,61,13.5); ctx.stroke();
    // nostril bristles
    ctx.strokeStyle = '#141a2c'; ctx.lineWidth = 1.4;
    for (let i=0;i<12;i++){ ctx.beginPath(); ctx.moveTo(-8+i*1.1,-13+i*.9); ctx.quadraticCurveTo(6+i*1.5,-17+i*.7,20+i*1.2,-11+i*.6); ctx.stroke(); }
    ctx.restore();

    // eye
    const ex = 26 + Math.max(0,yaw)*3, ey = -28, er = 5.6;
    ctx.fillStyle = '#120a06'; ctx.beginPath(); ctx.arc(ex,ey,er+1,0,6.283); ctx.fill();
    const ig = ctx.createRadialGradient(ex+1,ey+1,.5,ex,ey,er);
    ig.addColorStop(0,'#030206'); ig.addColorStop(.5,'#2c170b'); ig.addColorStop(1,'#5a3416');
    ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(ex,ey,er,0,6.283); ctx.fill();
    ctx.fillStyle = '#020104'; ctx.beginPath(); ctx.arc(ex+.6,ey+.3,er*.48,0,6.283); ctx.fill();
    // reflections: the slit of moonlight, and a pinpoint
    ctx.fillStyle = 'rgba(225,235,255,.85)'; ctx.fillRect(ex+1.2, ey-3.6, 1.6, 3.4);
    ctx.fillStyle = 'rgba(255,255,255,1)'; ctx.beginPath(); ctx.arc(ex+2.2,ey-2.6,1.1,0,6.283); ctx.fill();
    ctx.fillStyle = 'rgba(240,180,110,.45)'; ctx.beginPath(); ctx.arc(ex-2,ey+2.4,.8,0,6.283); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(ex,ey,er+1.2,0,6.283); ctx.clip();
    if (nict > .01){ ctx.fillStyle = 'rgba(190,205,235,.78)'; ctx.fillRect(ex+er+1 - nict*(er*2+3), ey-er-2, er*2+3, er*2+4); }
    if (blink > .01){ const h = (er*2+4)*blink; ctx.fillStyle = '#141b36'; ctx.fillRect(ex-er-2, ey-er-2, er*2+4, h); ctx.strokeStyle='rgba(0,0,0,.7)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(ex-er-1,ey-er-2+h); ctx.lineTo(ex+er+1,ey-er-2+h); ctx.stroke(); }
    ctx.restore();

    // monocle
    ctx.save();
    const mr = 12.5;
    ctx.fillStyle = 'rgba(170,195,255,.07)'; ctx.beginPath(); ctx.arc(ex,ey,mr,0,6.283); ctx.fill();
    const glint = .2 + .6*Math.max(0,-P.headRot.x*1.5 + .3);
    ctx.save(); ctx.beginPath(); ctx.arc(ex,ey,mr,0,6.283); ctx.clip();
    ctx.strokeStyle = `rgba(235,242,255,${glint})`; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(ex-11,ey+4); ctx.lineTo(ex+4,ey-11); ctx.stroke();
    ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(ex-7,ey+9); ctx.lineTo(ex+9,ey-7); ctx.stroke();
    ctx.restore();
    const rg = ctx.createLinearGradient(ex-mr,ey-mr,ex+mr,ey+mr); rg.addColorStop(0,'#fff2c8'); rg.addColorStop(.4,'#c9a35a'); rg.addColorStop(1,'#5a4520');
    ctx.strokeStyle = rg; ctx.lineWidth = 2.3; ctx.beginPath(); ctx.arc(ex,ey,mr,0,6.283); ctx.stroke();
    ctx.restore();

  }

  function drawRaven(t){
    // contact shadow on tube
    ctx.save(); ctx.translate(RX+4, RY+3); ctx.rotate(perchAng); ctx.scale(RS/1.55,.16*RS/1.55);
    const sg = ctx.createRadialGradient(0,0,0,0,0,80);
    sg.addColorStop(0,'rgba(0,0,0,.7)'); sg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(0,0,80,0,6.283); ctx.fill(); ctx.restore();

    ctx.save();
    ctx.translate(RX + shake, RY - hopY);
    ctx.scale(RS*(1+squash*.5), RS*(1-squash));
    ctx.rotate(P.lean.x*.14);
    drawLegs();
    ctx.translate(0, P.crouch.x*9);
    const br = reduce ? 0 : Math.sin(t/1300);
    ctx.translate(0,-36); ctx.scale(1+br*.008, 1+br*.016); ctx.translate(0,36);

    if (P.wing.x > .12) { ctx.globalAlpha = clamp((P.wing.x-.12)*3,0,1); drawWing(t,true); ctx.globalAlpha = 1; }
    drawTail(t);
    // thigh feathering
    ctx.fillStyle = '#0a0e19';
    ctx.beginPath(); ctx.ellipse(6,-42,20,11,.15,0,6.283); ctx.fill();
    for (let i=0;i<5;i++){ ctx.beginPath(); ctx.moveTo(-10+i*7,-40); ctx.lineTo(-8+i*7,-26); ctx.lineTo(-4+i*7,-40); ctx.fill(); }
    pBody(); ctx.fillStyle = bodyFill(-4,-118,150); ctx.fill();
    featherTex(pBody, scallops, 'rgba(140,165,230,.11)');
    sheen(pBody, t, -80, -150, 50, -40);
    innerGlow(pBody, COOL, -2.8, 2.8, 7);
    innerGlow(pBody, WARM, 2.6, -2, 9);
    // ambient occlusion under the head
    ctx.save(); pBody(); ctx.clip();
    const ao = ctx.createRadialGradient(44,-128,4,44,-128,40); ao.addColorStop(0,'rgba(0,0,0,.55)'); ao.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = ao; ctx.fillRect(0,-170,100,90); ctx.restore();
    drawWing(t,false);

    ctx.save();
    ctx.translate(36,-142);
    ctx.rotate(P.headRot.x);
    drawHead(t);
    ctx.restore();

    // monocle chain (pendulum)
    const hr = P.headRot.x, ex = 26 + Math.max(0,P.yaw.x)*3;
    const ly = -28 + 12.5;
    const mx = 36 + Math.cos(hr)*ex - Math.sin(hr)*ly, my = -142 + Math.sin(hr)*ex + Math.cos(hr)*ly;
    const ax = 60, ay = -92;
    const sag = 18 + Math.sin(chainA)*2, swing = Math.sin(chainA)*10;
    const cx = (mx+ax)/2 + swing, cy = Math.max(my,ay) + sag;
    for (let i=0;i<=26;i++){
      const u = i/26, x = (1-u)*(1-u)*mx + 2*(1-u)*u*cx + u*u*ax, y = (1-u)*(1-u)*my + 2*(1-u)*u*cy + u*u*ay;
      ctx.fillStyle = i%2 ? '#e9c97c' : '#8a6c34';
      ctx.beginPath(); ctx.arc(x,y,1.05,0,6.283); ctx.fill();
    }
    ctx.restore();
  }

  /* ---------- simulation ---------- */
  let last = now(), headWorld = {x:RX+70*RS, y:RY-172*RS};
  function simulate(t, dt){
    // base pose
    const T = {headRot:.02, yaw:0, wing:0, spread:0, hackle:.1, lean:0, tail:0, crouch:0};
    if (talking){ T.yaw = .32; T.hackle = .3; T.headRot = .04 + Math.sin(t/900)*.04; if (quoteMode){ T.yaw = -.25; T.hackle = .7; T.lean = .25; T.headRot = -.06; } }
    // look targets
    let tgt = null;
    if (lookTarget && t < lookUntil) tgt = lookTarget;
    if (!talking && t - ptr.at < 2500) tgt = {x:ptr.sx, y:ptr.sy};
    if (tgt){
      const a = Math.atan2(tgt.y - headWorld.y, tgt.x - headWorld.x);
      if (tgt.x > headWorld.x - 20){ T.headRot = clamp(a - .25, -.65, .45); }
      else { T.headRot = clamp(-(Math.PI - Math.abs(a)) - .1, -.6, .3); T.yaw = -.5; }
    }
    // gestures
    for (let i=gestures.length-1;i>=0;i--){
      const g = gestures[i], u = (t-g.t0)/g.dur;
      if (u>1){ gestures.splice(i,1); continue; }
      const e = env(u);
      if (g.param==='beak') beakG = Math.max(beakG, g.amt*e);
      else if (T[g.param]!==undefined) T[g.param] += g.amt*e;
    }
    for (const k in P){ P[k].t = T[k]; spring(P[k], dt); }
    // beak: speech mouth + gesture
    const bt = Math.max(mouth, beakG); beakG = 0;
    beak += (bt - beak) * Math.min(1, dt*28);
    // hop physics
    if (hopY>0 || hopV>0){ hopV -= 1500*dt; hopY += hopV*dt; if (hopY<=0){ hopY=0; if (hopV<-60) squashV += hopV*-.006; hopV=0; } }
    squashV += (-squash*420 - squashV*16)*dt; squash += squashV*dt;
    shake *= Math.pow(.0005, dt); const sh = shake*Math.sin(t/18);
    // blink
    if (t > nextBlink){ blinkT = t; nextBlink = t + 1800 + Math.random()*4200; if (Math.random()<.18) dbl = t+260; if (Math.random()<.2) nictT = t+500; }
    if (dbl && t>dbl){ blinkT = t; dbl = 0; }
    const bu = (t-blinkT)/150; blink = bu<0||bu>1 ? 0 : Math.sin(bu*Math.PI);
    const nu = (t-nictT)/260; nict = nu<0||nu>1 ? 0 : Math.sin(nu*Math.PI);
    // chain pendulum driven by head velocity
    const hv = (P.headRot.x - prevHead)/Math.max(dt,1e-3); prevHead = P.headRot.x;
    chainV += (-chainA*30 - chainV*2.2 - hv*1.2 - hopV*.002)*dt; chainA += chainV*dt;
    // idle behaviours
    if (!talking && t > nextIdle){
      const r = Math.random();
      if (r < .22) { lookTarget = {x:700, y:120}; lookUntil = t+1600; }
      else if (r < .42) { gesture('headRot', .3, 1300); gesture('yaw', .55, 1300); }
      else if (r < .55) { gesture('hackle', 1, 600); shake = 3; gesture('wing', .12, 500); }
      else if (r < .68) { gesture('headRot', .7, 1700); gesture('yaw', -.5, 1700); gesture('beak', .25, 400, 600); gesture('beak', .2, 300, 1100); }
      else if (r < .82) { gesture('yaw', .7, 1800); }
      else { gesture('tail', .6, 500); gesture('lean', -.2, 600); }
      nextIdle = t + 2600 + Math.random()*3600;
    }
    // on his own, Corvin looks about the room: the window, the floor, the stars, and now and then straight at you
    if (!talking && !reduce && t > nextGaze && !(lookTarget && t < lookUntil)){
      const hx = (typeof headWorld !== 'undefined' && headWorld) ? headWorld.x : 700, hy = (typeof headWorld !== 'undefined' && headWorld) ? headWorld.y : 300;
      const spots = [[-320, 30], [-220, -140], [260, -160], [120, -320], [-160, 220], [320, 60], [0, 0]];
      const sp = spots[Math.floor(Math.random()*spots.length)];
      if (sp[0] || sp[1]){ lookTarget = {x:hx + sp[0], y:hy + sp[1]}; lookUntil = t + 1400 + Math.random()*1800; }
      if (Math.random() < .25) gesture('headRot', (Math.random() - .5)*.3, 700);
      nextGaze = t + 2200 + Math.random()*3200;
    }
    // meteors
    if (!reduce && t > nextMeteor){
      meteors.push({x:640+Math.random()*180, y:-10+Math.random()*90, v:420+Math.random()*260, l:70+Math.random()*80, life:1});
      nextMeteor = t + 2500 + Math.random()*5000;
      if (!talking && Math.random() < .6){ lookTarget = {x:700, y:150}; lookUntil = t + 1300; }
    }
    meteors = meteors.filter(m => (m.life -= dt*1.1) > 0);
    for (const m of meteors){ m.x -= m.v*.82*dt; m.y += m.v*.58*dt; }
    return sh;
  }
  let blinkT = -1e9, dbl = 0, nictT = -1e9;

  /* =================================================================
     ROOMS: empty, lamp-lit sets. Corvin perches in each one.
     ================================================================= */
  const seeded = s => () => (s = (s*16807)%2147483647)/2147483647;
  function glow(x,y,r,rgb,a){
    const g = ctx.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,`rgba(${rgb},${a})`); g.addColorStop(1,`rgba(${rgb},0)`);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(x-r,y-r,r*2,r*2); ctx.restore();
  }
  const flick = (t,k=0) => reduce ? .9 : .82 + .1*Math.sin(t/83+k) + .08*Math.sin(t/37+k*2.1);
  function vg(y0,y1,stops){ const g = ctx.createLinearGradient(0,y0,0,y1); stops.forEach(([o,c]) => g.addColorStop(o,c)); return g; }
  function hg(x0,x1,stops){ const g = ctx.createLinearGradient(x0,0,x1,0); stops.forEach(([o,c]) => g.addColorStop(o,c)); return g; }
  function box(x,y,w,h,f){ ctx.fillStyle = f; ctx.fillRect(x,y,w,h); }
  function poly(p,f){ ctx.beginPath(); ctx.moveTo(p[0],p[1]); for (let i=2;i<p.length;i+=2) ctx.lineTo(p[i],p[i+1]); ctx.closePath(); ctx.fillStyle = f; ctx.fill(); }
  function line(x0,y0,x1,y1,c,w=1){ ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y1); ctx.stroke(); }
  function candle(x,y,t,k=0,h=34){
    box(x-3.5,y-h,7,h,'#d8d1bd'); box(x-3.5,y-h,2,h,'rgba(255,255,255,.3)');
    const fl = flick(t,k);
    ctx.save(); ctx.translate(x,y-h-1); ctx.scale(1,fl);
    const g = ctx.createRadialGradient(0,-7,0,0,-7,10); g.addColorStop(0,'#fffbe6'); g.addColorStop(.35,'#ffcf6a'); g.addColorStop(1,'rgba(255,120,30,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0,-7,3.8,9.5,Math.sin(t/300+k)*.08,0,6.283); ctx.fill(); ctx.restore();
    glow(x,y-h-8,130*fl,'255,165,70',.11);
  }
  function moonWindow(x,y,w,h,t,curtain='#2a0f12'){
    // a deep reveal around the glass, catching moonlight on its inner edge
    box(x-14,y-14,w+28,h+30,'#120e0b'); box(x-14,y-14,w+28,3,'rgba(190,205,240,.10)');
    box(x-8,y-8,w+16,h+16,'#080605');
    const g = vg(y,y+h,[[0,'#13264a'],[.6,'#1f3866'],[1,'#2a4675']]); box(x,y,w,h,g);
    ctx.save(); ctx.beginPath(); ctx.rect(x,y,w,h); ctx.clip();
    const r = seeded(Math.round(x*7+y)); for (let i=0;i<30;i++){ ctx.globalAlpha = .3+.6*r(); box(x+r()*w, y+r()*h*.8, 1.4,1.4,'#e8eeff'); }
    ctx.globalAlpha = 1; glow(x+w*.7,y+h*.25,w*.75,'200,215,255',.32);
    ctx.fillStyle = '#f2f3ea'; ctx.beginPath(); ctx.arc(x+w*.7,y+h*.25,Math.min(w,h)*.09,0,6.283); ctx.fill();
    // a faint reflection on the old glass
    ctx.fillStyle = 'rgba(255,255,255,.04)'; ctx.beginPath(); ctx.moveTo(x,y+h*.2); ctx.lineTo(x+w*.35,y); ctx.lineTo(x+w*.5,y); ctx.lineTo(x,y+h*.45); ctx.fill();
    ctx.restore();
    // glazing bars, moonlit on one side
    box(x+w/2-3,y,6,h,'#0d0b09'); box(x+w/2-3,y,1.5,h,'rgba(200,215,255,.22)');
    for (let i=1;i<4;i++){ box(x,y+h*i/4-2,w,4,'#0d0b09'); box(x,y+h*i/4-2,w,1.2,'rgba(200,215,255,.2)'); }
    // sill
    box(x-20,y+h+8,w+40,9,'#1a140f'); box(x-20,y+h+8,w+40,2,'rgba(200,215,255,.18)'); box(x-14,y+h+17,w+28,6,'rgba(0,0,0,.5)');
    // moonlight spilling onto the wall below
    glow(x+w/2,y+h+40,w*1.1,'150,175,235',.07);
    // curtains in heavy folds, tied back
    for (const side of [-1,1]){
      const cx0 = side<0 ? x-44 : x+w+6, cw = 38;
      box(cx0,y-34,cw,h+100, hg(cx0,cx0+cw,[[0,'#050303'],[.25,curtain],[.5,'#080505'],[.75,curtain],[1,'#050303']]));
      box(cx0,y-34,cw,h+100,'rgba(255,255,255,.02)');
      box(cx0-2,y+h*.62,cw+4,5,'#b08a4a'); box(cx0-2,y+h*.62,cw+4,1.5,'rgba(255,230,180,.5)');
    }
    // pelmet
    box(x-50,y-42,w+100,14,'#140f0b'); box(x-50,y-42,w+100,2,'rgba(255,210,160,.12)');
  }

  /* ---- architecture: every interior gets real walls, mouldings, panelling and a lit surface ---- */
  function interior(fy, o = {}){
    const tint = o.tint || '255,210,160', lx = o.lx == null ? 500 : o.lx, ly = o.ly == null ? 200 : o.ly;
    // the wall picks up the room's light: a broad warm wash, strongest near the lamp or fire
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const L = (o.lift || .10) * 2.6, wg = ctx.createRadialGradient(lx, ly, 0, lx, ly, 720); wg.addColorStop(0, `rgba(${tint},${L})`); wg.addColorStop(.55, `rgba(${tint},${L*.35})`); wg.addColorStop(1, `rgba(${tint},${L*.08})`);
    ctx.fillStyle = wg; ctx.fillRect(-100, -100, SW + 200, fy + 100); ctx.restore();
    // wallpaper: a quiet damask lattice, or a regency stripe
    if (o.paper === 'damask'){
      ctx.save(); ctx.globalAlpha = .12; ctx.fillStyle = `rgb(${tint})`;
      for (let y = 40; y < fy - 150; y += 46) for (let x = -80 + ((y / 46) % 2) * 23; x < SW + 80; x += 46){
        ctx.beginPath(); ctx.moveTo(x, y - 9); ctx.quadraticCurveTo(x + 6, y - 3, x, y + 9); ctx.quadraticCurveTo(x - 6, y - 3, x, y - 9); ctx.fill();
        ctx.fillRect(x - 1, y + 10, 2, 5); }
      ctx.restore();
    } else if (o.paper === 'stripe'){
      for (let x = -100; x < SW + 100; x += 28){ box(x, 20, 9, fy - 150, `rgba(${tint},.06)`); box(x + 9, 20, 1, fy - 150, 'rgba(0,0,0,.12)'); }
    }
    // cornice: a deep moulding under the ceiling, lit along its lower lip
    box(-100, -100, SW + 200, 118, 'rgba(0,0,0,.35)');
    box(-100, 10, SW + 200, 6, `rgba(${tint},.10)`); box(-100, 16, SW + 200, 3, 'rgba(0,0,0,.45)');
    box(-100, 19, SW + 200, 24, vg(19, 43, [[0, 'rgba(0,0,0,.35)'], [1, 'rgba(0,0,0,0)']]));
    // picture rail
    if (o.rail !== false){ const py = Math.round(fy * .28); box(-100, py, SW + 200, 3, `rgba(${tint},.09)`); box(-100, py + 3, SW + 200, 2, 'rgba(0,0,0,.35)'); }
    // wainscot: raised panels below a dado rail
    if (o.dado !== false){
      const dy = fy - (o.dadoH || 128);
      box(-100, dy, SW + 200, fy - dy, 'rgba(0,0,0,.22)');
      box(-100, dy - 4, SW + 200, 5, `rgba(${tint},.12)`); box(-100, dy + 1, SW + 200, 3, 'rgba(0,0,0,.5)');
      for (let x = -80; x < SW + 80; x += 116){
        const px = x + 12, pw = 92, ph = fy - dy - 46, pyy = dy + 18;
        box(px, pyy, pw, ph, 'rgba(0,0,0,.14)');
        box(px, pyy, pw, 2, 'rgba(0,0,0,.45)'); box(px, pyy, 2, ph, 'rgba(0,0,0,.4)');
        box(px, pyy + ph - 2, pw, 2, `rgba(${tint},.2)`); box(px + pw - 2, pyy, 2, ph, `rgba(${tint},.16)`);
      }
    }
    // skirting board
    box(-100, fy - 18, SW + 200, 18, 'rgba(8,5,3,.85)'); box(-100, fy - 18, SW + 200, 2, `rgba(${tint},.14)`);
  }
  // where the floor meets the wall, light dies: this is what makes furniture sit on the floor
  function floorAO(fy){
    box(-100, fy, SW + 200, 70, vg(fy, fy + 70, [[0, 'rgba(0,0,0,.55)'], [1, 'rgba(0,0,0,0)']]));
  }
  function footShadow(x, y, w, a = .5){
    const g = ctx.createRadialGradient(x, y, 0, x, y, w); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save(); ctx.translate(x, y); ctx.scale(1, .22); ctx.translate(-x, -y); ctx.fillStyle = g; ctx.fillRect(x - w, y - w, w * 2, w * 2); ctx.restore();
  }

  /* ---- the motive films: little scenes, each with its own clock ---- */
  function vclock(R, t){ if (!R._t0 || t - (R._last || 0) > 400) R._t0 = t; R._last = t; return Math.max(0, (t - R._t0) / 1000); }
  const ease = u => u < 0 ? 0 : u > 1 ? 1 : u*u*(3 - 2*u);
  function deskTop(c1, c2, lx, ly){
    box(-100,-100,SW+200,SH+200, vg(0,SH,[[0,c1],[1,c2]]));
    for (let i=0;i<22;i++){ const y = -40 + i*34; ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-100,y); ctx.bezierCurveTo(300,y+8,700,y-6,SW+100,y+4); ctx.stroke(); }
    glow(lx, ly, 640, '255,200,130', .5);
    box(-100,-100,SW+200,SH+200, ctx.createRadialGradient ? (() => { const g = ctx.createRadialGradient(lx,ly,120,lx,ly,900); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,.55)'); return g; })() : 'rgba(0,0,0,0)');
  }
  function sheet(x, y, w, h, rot, tone='#e8dfc6'){
    ctx.save(); ctx.translate(x + w/2, y + h/2); ctx.rotate(rot);
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(-w/2 + 6, -h/2 + 8, w, h);
    ctx.fillStyle = tone; ctx.fillRect(-w/2, -h/2, w, h);
    const g = ctx.createLinearGradient(-w/2,-h/2,w/2,h/2); g.addColorStop(0,'rgba(255,255,255,.08)'); g.addColorStop(1,'rgba(90,60,20,.18)'); ctx.fillStyle = g; ctx.fillRect(-w/2,-h/2,w,h);
    ctx.restore();
  }
  function txt(str, x, y, font, color, align='left', rot=0){ ctx.save(); ctx.translate(x,y); ctx.rotate(rot); ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(str, 0, 0); ctx.restore(); }
  function stroke(pts, u, color, w){ // draw a pen line up to fraction u of its length
    if (u <= 0) return; let L = 0; const seg = []; for (let i=1;i<pts.length;i++){ const d = Math.hypot(pts[i][0]-pts[i-1][0], pts[i][1]-pts[i-1][1]); seg.push(d); L += d; }
    let left = L*Math.min(1,u); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i=1;i<pts.length && left > 0;i++){ const d = seg[i-1], f = Math.min(1, left/d); ctx.lineTo(pts[i-1][0] + (pts[i][0]-pts[i-1][0])*f, pts[i-1][1] + (pts[i][1]-pts[i-1][1])*f); left -= d; }
    ctx.stroke();
  }
  const HAND = (n) => `${n}px Caveat, "Segoe Print", "Bradley Hand", cursive`, SERIF = (n, i='') => `${i} ${n}px "Bodoni Moda", Didot, Georgia, serif`, MONO = n => `500 ${n}px "IBM Plex Mono", ui-monospace, monospace`;
  function moonBeam(x0,x1,y0,dx,y1,a=.10){
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = vg(y0,y1,[[0,`rgba(150,175,235,${a})`],[1,'rgba(150,175,235,0)']]);
    poly([x0,y0,x1,y0,x1+dx*1.4,y1,x0+dx,y1], g); ctx.restore();
  }
  function boards(y0,c1,c2,vx=500){
    box(-100,y0,SW+200,SH-y0+60, vg(y0,SH,[[0,c1],[1,c2]]));
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.2;
    for (let i=-14;i<=14;i++){ ctx.beginPath(); ctx.moveTo(vx+i*14,y0); ctx.lineTo(vx+i*120,SH+60); ctx.stroke(); }
    for (let k=1;k<6;k++){ const y = y0 + (SH-y0)*Math.pow(k/6,1.6); line(-100,y,SW+100,y,'rgba(0,0,0,.18)',1); }
  }
  function chairBack(x,y,s,tone='#2b1a10'){
    // seen from behind: two stiles, a top rail, a splat
    const w = 46*s, h = 78*s;
    box(x-w/2,y-h,6*s,h+40*s,tone); box(x+w/2-6*s,y-h,6*s,h+40*s,tone);
    box(x-w/2,y-h,w,9*s,tone); box(x-6*s,y-h+9*s,12*s,h-20*s,tone);
    box(x-w/2,y-h,w,2.5*s,'rgba(255,200,140,.28)'); box(x-w/2,y-h,1.5*s,h,'rgba(255,200,140,.12)');
  }
  function plate(x,y,s){
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x+2*s,y+2*s,24*s,7.5*s,0,0,6.283); ctx.fill();
    ctx.fillStyle = '#f4f1e8'; ctx.beginPath(); ctx.ellipse(x,y,24*s,7.5*s,0,0,6.283); ctx.fill();
    ctx.strokeStyle = 'rgba(150,130,90,.6)'; ctx.lineWidth = 1*s; ctx.beginPath(); ctx.ellipse(x,y,17*s,5*s,0,0,6.283); ctx.stroke();
    line(x-31*s,y-4*s,x-31*s,y+5*s,'#9aa0a8',1.6*s); line(x+31*s,y-4*s,x+31*s,y+5*s,'#9aa0a8',1.6*s);
  }
  function wineGlass(x,y,s){
    ctx.strokeStyle = 'rgba(220,230,245,.55)'; ctx.lineWidth = 1.2*s;
    ctx.beginPath(); ctx.moveTo(x-5*s,y-22*s); ctx.quadraticCurveTo(x-6*s,y-12*s,x,y-10*s); ctx.quadraticCurveTo(x+6*s,y-12*s,x+5*s,y-22*s); ctx.stroke();
    line(x,y-10*s,x,y,'rgba(220,230,245,.55)',1.2*s); line(x-4*s,y,x+4*s,y,'rgba(220,230,245,.55)',1.2*s);
    box(x-4*s,y-21*s,1.4*s,8*s,'rgba(255,255,255,.5)');
  }
  function books(x0,y0,w,h,seed){
    const r = seeded(seed), cols = ['#3b1414','#1c2a1f','#1b2238','#3a2a16','#2b1b26','#4a3a20','#16252a'];
    let x = x0;
    while (x < x0+w-6){
      const bw = 7+r()*10, bh = h*(.7+r()*.28), c = cols[Math.floor(r()*cols.length)];
      box(x,y0+h-bh,bw-1,bh,c);
      box(x,y0+h-bh+6,bw-1,1.6,'rgba(210,170,90,.35)'); box(x,y0+h-10,bw-1,1.6,'rgba(210,170,90,.25)');
      box(x,y0+h-bh,1.2,bh,'rgba(255,255,255,.05)');
      x += bw;
      if (r() < .05) x += 14;
    }
  }
  function fire(x,y,w,t){
    const fl = flick(t,3);
    glow(x+w/2,y-22,w*2.2*fl,'255,120,40',.32);
    glow(x+w/2,y-6,w*.8,'255,190,110',.18*fl);
    // logs, charred, with a live seam of ember along each
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = '#140805'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(x+6,y-1); ctx.lineTo(x+w-14,y-7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x+14,y-8); ctx.lineTo(x+w-4,y); ctx.stroke();
    ctx.strokeStyle = `rgba(255,${90+40*fl|0},30,${.55+.25*fl})`; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x+10,y+1); ctx.lineTo(x+w-16,y-5); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x+18,y-6); ctx.lineTo(x+w-8,y+2); ctx.stroke();
    ctx.restore();
    // flames: many soft, overlapping tongues added together, a hot core inside a deeper outer flame
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const N = 11;
    for (let layer = 0; layer < 2; layer++){
      for (let i = 0; i < N; i++){
        const u = i/(N-1), cx = x + w*(.12 + .76*u) + Math.sin(t/260 + i*2.3)*2.5;
        const env = Math.sin(Math.PI*(.08 + .84*u));
        const n = .55 + .25*Math.sin(t/120 + i*1.9) + .2*Math.sin(t/57 + i*3.7);
        const fh = (layer ? 36 : 60) * env * n * fl + (layer ? 6 : 12), hw = (layer ? 4.5 : 8.5) * (.7 + .3*env);
        const g = ctx.createLinearGradient(0, y, 0, y - fh);
        if (layer){ g.addColorStop(0,'rgba(255,245,210,.55)'); g.addColorStop(.6,'rgba(255,200,110,.3)'); g.addColorStop(1,'rgba(255,170,80,0)'); }
        else { g.addColorStop(0,'rgba(255,150,50,.42)'); g.addColorStop(.55,'rgba(230,70,20,.26)'); g.addColorStop(1,'rgba(160,30,10,0)'); }
        const sway = Math.sin(t/95 + i*1.3) * (layer ? 2 : 4);
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx - hw, y);
        ctx.bezierCurveTo(cx - hw*1.1, y - fh*.45, cx + sway - hw*.4, y - fh*.75, cx + sway, y - fh);
        ctx.bezierCurveTo(cx + sway + hw*.4, y - fh*.7, cx + hw*1.1, y - fh*.4, cx + hw, y); ctx.fill();
      }
    }
    // a few sparks lifting off
    if (!reduce) for (let k = 0; k < 4; k++){ const ph = ((t/1700 + k*.27) % 1), sx = x + w*(.3 + .4*((k*.37)%1)) + Math.sin(t/300 + k)*6, sy = y - 16 - ph*90;
      ctx.fillStyle = `rgba(255,${170+60*(1-ph)|0},90,${.7*(1-ph)})`; ctx.fillRect(sx, sy, 1.4, 1.4); }
    ctx.restore();
  }
  function motes(t, x0, x1, y0, y1, n=24, seed=5){
    if (reduce) return;
    const r = seeded(seed); ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i=0;i<n;i++){
      const bx = r(), by = r(), sp = .3+r();
      const x = x0 + ((bx*(x1-x0) + t*.006*sp) % (x1-x0)), y = y0 + ((by*(y1-y0) - t*.004*sp + (y1-y0)*10) % (y1-y0));
      ctx.fillStyle = `rgba(220,228,255,${.18+.2*Math.sin(t/900+i)})`; ctx.beginPath(); ctx.arc(x,y,1.1,0,6.283); ctx.fill();
    }
    ctx.restore();
  }
  function flyingRaven(x,y,s,t){
    const f = Math.sin(t/110);
    ctx.save(); ctx.translate(x,y); ctx.scale(s,s); ctx.fillStyle = '#05060b';
    ctx.beginPath(); ctx.ellipse(0,0,22,7,0,0,6.283); ctx.fill();
    ctx.beginPath(); ctx.moveTo(18,-2); ctx.lineTo(34,0); ctx.lineTo(18,3); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-20,0); ctx.lineTo(-36,-6); ctx.lineTo(-36,6); ctx.fill();
    for (const side of [-1,1]){
      ctx.beginPath(); ctx.moveTo(-6,0); ctx.quadraticCurveTo(-2, side*(-30*f) - 6, 16, side*(-44*f) - 4); ctx.quadraticCurveTo(10, side*(-18*f), 8, 0); ctx.fill();
    }
    ctx.restore();
  }

  const ROOMS = {
    dining: {
      floor:440,
      perch:[500,333,.5], focus:[500,330],
      back(t){
        box(-100,-100,SW+200,560, vg(0,440,[[0,'#0d1512'],[1,'#17211d']]));
        interior(440, {paper:'stripe', tint:'230,215,170', lx:520, ly:300, lift:.12, dado:false});
        box(-100,140,SW+200,4,'rgba(201,163,90,.18)');
        box(-100,330,SW+200,112,'#0d1310'); for (let x=-80;x<SW+80;x+=120){ ctx.strokeStyle='rgba(0,0,0,.4)'; ctx.lineWidth=2; ctx.strokeRect(x+10,345,100,80); }
        // painting
        box(100,165,200,130,'#3a2c16'); box(110,175,180,110, vg(175,285,[[0,'#1b2230'],[.6,'#2a3340'],[1,'#141813']]));
        poly([110,285,160,240,210,262,290,225,290,285],'#0b0f0c');
        glow(200,230,120,'255,190,110',.05);
        moonWindow(700,110,150,250,t);
        // sideboard + decanter
        box(40,345,230,70,'#140d09'); box(40,345,230,5,'rgba(255,190,120,.15)');
        ctx.fillStyle = 'rgba(160,110,60,.55)'; ctx.beginPath(); ctx.ellipse(120,330,14,18,0,0,6.283); ctx.fill(); box(116,300,8,14,'rgba(180,200,230,.35)');
        boards(440,'#120c09','#070504');
        moonBeam(700,850,360,-260,625,.09);
      },
      mid(t){
        // head chair behind table
        chairBack(500,400,1.05,'#1a110c');
        // side chairs
        for (let i=0;i<4;i++){
          const u = i/3, s = lerp(.62,1.2,u);
          chairBack(lerp(372,165,u)-18*s, lerp(410,560,u), s);
          chairBack(lerp(628,835,u)+18*s, lerp(410,560,u), s);
        }
        // tablecloth
        footShadow(500,600,420,.55);
        poly([360,400,640,400,850,560,150,560], vg(400,560,[[0,'#4a453d'],[.55,'#7a7366'],[1,'#958d7d']]));
        poly([150,560,850,560,850,598,150,598], vg(560,598,[[0,'#7c7567'],[1,'#3a362f']]));
        for (let i=0;i<9;i++){ const x = 160+i*86; line(x,562,x+4,598,'rgba(0,0,0,.12)',2); }
        // place settings
        for (let i=0;i<4;i++){
          const u = (i+.5)/4, s = lerp(.55,1.05,u);
          const yl = lerp(410,548,u);
          plate(lerp(392,215,u)+30*s, yl, s); wineGlass(lerp(392,215,u)+62*s, yl-6*s, s);
          plate(lerp(608,785,u)-30*s, yl, s); wineGlass(lerp(608,785,u)-62*s, yl-6*s, s);
        }
        plate(500,410,.55); wineGlass(522,404,.55);
        // candelabra
        box(492,500,16,8,'#8a6d36'); box(497,452,6,50,'#a88a4a');
        ctx.strokeStyle = '#a88a4a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(470,452); ctx.quadraticCurveTo(500,470,530,452); ctx.stroke();
        candle(470,452,t,0,30); candle(500,446,t,1,34); candle(530,452,t,2,30);
        glow(500,470,300,'255,170,90',.05);
      }
    },
    drawing: {
      floor:448,
      perch:[318,238,.48], focus:[500,340],
      back(t){
        box(-100,-100,SW+200,560, vg(0,450,[[0,'#120c0a'],[1,'#21150f']]));
        interior(448, {paper:'damask', tint:'255,190,140', lx:290, ly:330, lift:.13});
        for (let x=-100;x<SW+100;x+=36) box(x,-100,2,550,'rgba(120,60,40,.08)');
        box(-100,440,SW+200,8,'#0b0706');
        // fireplace
        box(150,236,260,12,'#3a3128'); box(165,248,230,200,'#2a241e'); box(205,300,150,148,'#070404');
        fire(215,446,130,t);
        ctx.fillStyle = '#1a1612'; ctx.beginPath(); ctx.ellipse(280,160,70,56,0,0,6.283); ctx.fill();
        ctx.fillStyle = 'rgba(160,170,190,.08)'; ctx.beginPath(); ctx.ellipse(280,160,60,47,0,0,6.283); ctx.fill();
        moonWindow(760,120,130,230,t,'#3a1014');
        // standard lamp
        box(684,240,5,210,'#2a2016');
        poly([660,240,712,240,700,196,672,196],'#c49a58'); glow(686,232,200,'255,190,110',.18);
        boards(448,'#140d09','#060403');
        ctx.fillStyle = 'rgba(80,20,22,.55)'; ctx.beginPath(); ctx.ellipse(520,560,330,60,0,0,6.283); ctx.fill();
        ctx.strokeStyle = 'rgba(201,163,90,.18)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(520,560,300,50,0,0,6.283); ctx.stroke();
      },
      mid(t){
        chairBack(520,440,.95);
        // card table
        box(440,500,5,60,'#120b07'); box(600,500,5,60,'#120b07');
        poly([430,450,610,450,652,504,388,504],'#0f0a07');
        poly([436,452,604,452,642,500,398,500], vg(452,500,[[0,'#1a3a28'],[1,'#24513a']]));
        // cards: four hands and a trick
        const card = (x,y,a) => { ctx.save(); ctx.translate(x,y); ctx.rotate(a); box(-6,-9,12,18,'#efe9dc'); box(-6,-9,12,18,'rgba(0,0,0,0)'); box(-4,-6,3,3,'#8a1c1c'); ctx.restore(); };
        [[-.3,0],[-.1,1],[.1,2],[.3,3]].forEach(([a,i]) => card(510+i*6,468,a));
        for (let i=0;i<5;i++) card(420+i*5,492,-.6+i*.12);
        for (let i=0;i<5;i++) card(600+i*5,492,.2+i*.12);
        box(560,458,26,18,'#e7e0cc'); line(562,463,582,463,'rgba(0,0,0,.4)'); line(562,468,578,468,'rgba(0,0,0,.4)');
        chairBack(372,560,1.1); chairBack(670,560,1.1);
        for (let i=0;i<7;i++) card(468+i*12, 486, 0);
        chairBack(492,628,1.25);
        // drinks tray + napkins
        box(810,420,140,10,'#1a120b'); box(830,430,6,110,'#120c08'); box(924,430,6,110,'#120c08');
        ctx.fillStyle = 'rgba(190,120,50,.55)'; ctx.beginPath(); ctx.ellipse(850,398,16,22,0,0,6.283); ctx.fill(); box(845,364,10,16,'rgba(190,210,240,.35)');
        for (let i=0;i<6;i++) box(886,412-i*2.4,34,2.2,i%2?'#e9e3d4':'#d8d1c0');
        box(899,404,8,2,'#3a5aa0');
        glow(286,400,420,'255,150,70',.06);
      }
    },
    library: {
      floor:480,
      perch:[452,286,.44], focus:[500,320],
      back(t){
        box(-100,-100,SW+200,600,'#0c0907');
        interior(480, {tint:'255,200,150', lx:700, ly:420, lift:.10, dado:false, rail:false});
        for (let row=0; row<6; row++){
          const y = 40 + row*72;
          box(-100,y+62,SW+200,8,'#1c130c');
          books(-90,y,470,62,11+row*7); books(620,y,180,62,3+row*13);
        }
        // fireplace & mantel in the shelves
        box(400,280,200,200,'#1e1915'); box(388,284,224,10,'#3b3027'); box(430,340,140,140,'#060403');
        fire(440,476,120,t*.8);
        // the meteorite on the mantel
        ctx.fillStyle = '#16171b'; ctx.beginPath(); ctx.moveTo(492,284); ctx.quadraticCurveTo(488,262,506,258); ctx.quadraticCurveTo(528,252,534,268); ctx.quadraticCurveTo(540,282,530,284); ctx.closePath(); ctx.fill();
        box(500,262,14,2,'rgba(200,200,220,.18)');
        // stair door
        box(810,170,120,310,'#0a0705');
        ctx.fillStyle = '#2a1a0f'; ctx.beginPath(); ctx.moveTo(822,480); ctx.lineTo(822,240); ctx.quadraticCurveTo(870,175,918,240); ctx.lineTo(918,480); ctx.fill();
        for (let i=0;i<5;i++) line(840+i*16,236,840+i*16,478,'rgba(0,0,0,.35)',2);
        box(822,300,40,6,'#3b3b40'); box(822,420,40,6,'#3b3b40');
        box(824,476,92,3,'rgba(150,175,235,.4)');
        // umbrella stand
        box(760,420,36,60, hg(760,796,[[0,'#2a2724'],[.5,'#4a4540'],[1,'#2a2724']]));
        line(770,420,764,350,'#2c1d10',3); line(782,420,790,346,'#3a2614',3); ctx.fillStyle='#3a2614'; ctx.beginPath(); ctx.arc(790,344,5,3.4,6.2); ctx.fill();
        boards(480,'#130c08','#060403');
        glow(500,420,380,'255,140,60',.07);
      },
      mid(t){
        // ladder
        line(250,40,210,520,'#2a1b10',6); line(300,40,262,520,'#2a1b10',6);
        for (let i=0;i<9;i++){ const u = i/9; line(lerp(250,210,u),lerp(60,500,u),lerp(300,262,u),lerp(60,500,u),'#2a1b10',4); }
        // armchair + reading lamp
        ctx.fillStyle = '#2a1012'; ctx.beginPath(); ctx.moveTo(60,600); ctx.lineTo(70,470); ctx.quadraticCurveTo(130,430,190,470); ctx.lineTo(200,600); ctx.fill();
        box(150,330,4,150,'#2a2016'); poly([130,330,174,330,166,300,138,300],'#b8904c'); glow(152,330,180,'255,190,110',.14);
      }
    },
    kitchen: {
      floor:470,
      perch:[800,334,.44], focus:[500,330],
      back(t){
        box(-100,-100,SW+200,600, vg(0,470,[[0,'#1a1813'],[1,'#26231d']]));
        interior(470, {tint:'235,225,200', lx:500, ly:220, lift:.10, dado:false, rail:false});
        for (let y=260;y<470;y+=22) for (let x=-100;x<SW+100;x+=22){ ctx.strokeStyle='rgba(0,0,0,.25)'; ctx.lineWidth=1; ctx.strokeRect(x,y,22,22); }
        // hooks with pans; two empty flask hooks
        box(330,222,360,6,'#2a2016');
        [360,410,470].forEach((x,i) => { line(x,228,x,244,'#555',2); ctx.fillStyle='#7a4a22'; ctx.beginPath(); ctx.arc(x,268,18+i*3,0,6.283); ctx.fill(); ctx.fillStyle='rgba(255,170,90,.25)'; ctx.beginPath(); ctx.arc(x-5,262,6,0,6.283); ctx.fill(); });
        [560,600].forEach(x => { line(x,228,x,244,'#666',2); ctx.strokeStyle='#666'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(x+4,246,4,3.1,0,true); ctx.stroke(); });
        // range
        box(340,320,330,150,'#0b0b0c'); box(340,320,330,8,'#26262a');
        box(370,350,110,90,'#141416'); box(530,350,110,90,'#141416');
        const fl = flick(t,2); box(390,410,70,4,`rgba(255,110,30,${.6*fl})`); box(390,420,70,4,`rgba(255,110,30,${.5*fl})`);
        glow(425,415,200*fl,'255,120,40',.12);
        // kettle + steam
        ctx.fillStyle = '#3a3a3e'; ctx.beginPath(); ctx.ellipse(600,306,30,18,0,0,6.283); ctx.fill(); box(624,296,22,5,'#3a3a3e');
        if (!reduce) for (let i=0;i<4;i++){ const k = (t/1800+i/4)%1; ctx.fillStyle = `rgba(220,220,230,${.12*(1-k)})`; ctx.beginPath(); ctx.arc(650+k*20, 290-k*90, 6+k*16, 0, 6.283); ctx.fill(); }
        moonWindow(730,150,140,180,t,'#20302a');
        box(720,330,160,14,'#2e2a24');
        // flags
        box(-100,470,SW+200,200, vg(470,SH,[[0,'#1b1915'],[1,'#0a0908']]));
        for (let x=-100;x<SW+100;x+=70) line(x,470,x-40,SH,'rgba(0,0,0,.3)',1.5);
        moonBeam(730,870,470,-200,625,.08);
      },
      mid(t){
        box(80,470,320,16,'#3a2c1c'); box(100,486,10,120,'#2a1f14'); box(370,486,10,120,'#2a1f14');
        ctx.fillStyle = '#e9e3d6'; ctx.beginPath(); ctx.ellipse(200,456,22,16,0,0,6.283); ctx.fill(); box(220,446,18,4,'#e9e3d6');
        ctx.fillStyle = '#e9e3d6'; ctx.beginPath(); ctx.ellipse(280,464,9,6,0,0,6.283); ctx.fill(); ctx.beginPath(); ctx.ellipse(310,464,9,6,0,0,6.283); ctx.fill();
      }
    },
    terrace: {
      perch:[560,432,.55], focus:[500,300],
      back(t){
        box(-100,-100,SW+200,440, vg(0,330,[[0,'#050a18'],[1,'#13234a']]));
        const r = seeded(77); for (let i=0;i<140;i++){ ctx.globalAlpha = .3+.6*Math.abs(Math.sin(t/1400+i)); box(r()*SW, r()*300, 1.3,1.3,'#e6ecff'); } ctx.globalAlpha = 1;
        ctx.fillStyle = '#f0f2ea'; ctx.beginPath(); ctx.arc(720,90,24,0,6.283); ctx.fill(); glow(720,90,160,'200,215,255',.2);
        poly([-100,330,120,280,260,300,420,270,600,300,760,276,1100,320,1100,340,-100,340],'#070b14');
        box(-100,330,SW+200,120, vg(330,450,[[0,'#0b162c'],[1,'#050a14']]));
        for (let i=0;i<14;i++){ const y = 336+i*7; box(700-10-i*3+Math.sin(t/600+i)*6, y, 20+i*6, 1.5, `rgba(220,230,255,${.35-i*.02})`); }
        // flares: one every so often, red light washing everything
        const ph = (t/6000)%1;
        if (ph < .35 && !reduce){
          const k = ph/.35, fx = 300 + 400*seeded(Math.floor(t/6000))(), fy = 180 - k*60;
          glow(fx,fy,300*(1-k),'255,60,60',.35*(1-k));
          for (let i=0;i<14;i++){ const a = i/14*6.283; box(fx+Math.cos(a)*k*70, fy+Math.sin(a)*k*70 + k*k*40, 2.4,2.4,`rgba(255,${120+i*6},120,${1-k})`); }
        }
        // the house wall and lit French windows
        box(-100,120,260,420,'#0d0b0a');
        box(20,240,60,180,'rgba(255,190,110,.55)'); box(90,240,60,180,'rgba(255,190,110,.45)');
        line(50,240,50,420,'#0d0b0a',4); line(120,240,120,420,'#0d0b0a',4);
        glow(90,330,260,'255,180,100',.12);
      },
      mid(t){
        // flagstones + balustrade
        box(-100,450,SW+200,200, vg(450,SH,[[0,'#1a1a1e'],[1,'#08080a']]));
        box(160,432,SW,16,'#4a4844'); box(160,432,SW,3,'rgba(200,210,240,.35)');
        for (let x=180;x<SW+40;x+=46){ ctx.fillStyle = '#3a3936'; ctx.beginPath(); ctx.moveTo(x,448); ctx.quadraticCurveTo(x-10,470,x+2,488); ctx.quadraticCurveTo(x-8,506,x,520); ctx.lineTo(x+20,520); ctx.quadraticCurveTo(x+28,506,x+18,488); ctx.quadraticCurveTo(x+30,470,x+20,448); ctx.fill(); }
        box(160,520,SW,18,'#3e3d3a');
        // bucket of spent flares
        box(860,470,50,50,'#2b2b2e'); for (let i=0;i<9;i++) line(866+i*5,470,868+i*5-2,446+((i*7)%9),'#5a2a1a',3);
      }
    },
    study: {
      floor:440,
      perch:[650,428,.44], focus:[480,330],
      back(t){
        box(-100,-100,SW+200,600, vg(0,440,[[0,'#0c1118'],[1,'#151c26']]));
        interior(440, {paper:'stripe', tint:'200,210,230', lx:520, ly:330, lift:.10});
        for (let row=0;row<5;row++){ box(-60,40+row*76+62,220,8,'#1a120c'); books(-56,40+row*76,210,62,91+row); }
        moonWindow(430,110,150,200,t,'#1e2a3a');
        // grate with embers
        box(760,330,140,130,'#221d18'); box(785,370,90,90,'#060403');
        if (true){ const fl = flick(t,5); box(795,440,70,10,`rgba(255,90,20,${.5*fl})`); glow(830,440,160*fl,'255,100,40',.14); }
        boards(440,'#100b08','#050403');
        moonBeam(430,580,330,-120,625,.07);
      },
      mid(t){
        chairBack(500,410,1.0,'#1a110c');
        poly([300,410,700,410,760,500,240,500],'#21150d');
        box(240,500,520,16,'#160e08'); box(260,516,14,100,'#140d08'); box(726,516,14,100,'#140d08');
        poly([400,424,600,424,620,470,380,470],'#173322');
        poly([450,430,540,428,548,462,446,464],'#ece6d4');
        for (let i=0;i<5;i++) line(458,438+i*5,536,437+i*5,'rgba(40,40,60,.35)',1);
        // banker's lamp
        box(340,370,4,40,'#a88a4a'); box(326,408,32,5,'#a88a4a');
        ctx.fillStyle = '#1f5a3a'; ctx.beginPath(); ctx.ellipse(342,368,30,10,0,3.14,6.283); ctx.fill();
        glow(342,400,260,'230,220,140',.2);
      }
    },
    darkroom: {
      floor:430,
      perch:[690,318,.42], focus:[500,300],
      back(t){
        box(-100,-100,SW+200,700,'#0b0405');
        interior(430, {tint:'255,70,50', lx:500, ly:110, lift:.09, dado:false});
        const fl = reduce ? 1 : .92+.08*Math.sin(t/50);
        ctx.fillStyle = '#ff2a20'; ctx.beginPath(); ctx.arc(500,110,14,0,6.283); ctx.fill(); line(500,0,500,96,'#222',2);
        glow(500,110,520*fl,'255,30,20',.28);
        [220,320].forEach(y => { box(560,y,320,10,'#2a0c0c'); box(560,y,320,2,'rgba(255,60,50,.4)'); });
        [[590,'#3a1a0a',30],[640,'#2a1a10',24],[700,'#3a2010',20],[760,'#401808',34],[820,'#2a1408',22]].forEach(([x,c,h],i) => {
          box(x,220-h,22,h,c); box(x+3,220-h+4,4,h-8,'rgba(255,80,60,.25)');
        });
        // the brown jar
        box(610,280,34,40,'#3a1e0c'); box(606,276,42,8,'#1a0e08'); box(616,290,22,16,'#d8c9b0'); line(620,293,634,303,'#3a0a0a',2); line(634,293,620,303,'#3a0a0a',2);
        // drying line
        line(60,170,420,180,'#555',1.2);
        for (let i=0;i<5;i++){ const x = 80+i*68; box(x,172+i*2,46,58,'#080808'); const r = seeded(i+3); for (let k=0;k<8;k++) box(x+r()*44,174+i*2+r()*54,1.5,1.5,'#ddd'); }
        box(-100,430,SW+200,20,'#1e0a0a');
        [[120,'#2a0d0d'],[300,'#2a0d0d']].forEach(([x,c]) => { box(x,416,140,14,c); box(x+6,418,128,6,'rgba(255,60,40,.25)'); });
      },
      mid(t){}
    },
    bedroom: {
      floor:450,
      perch:[770,382,.45], focus:[520,330],
      back(t){
        box(-100,-100,SW+200,600, vg(0,450,[[0,'#151318'],[1,'#1f1b20']]));
        interior(450, {tint:'230,200,215', lx:860, ly:330, lift:.10});
        for (let x=-100;x<SW+100;x+=50) for (let y=0;y<440;y+=60){ ctx.fillStyle='rgba(120,90,110,.07)'; ctx.beginPath(); ctx.arc(x+(y%120?25:0),y,6,0,6.283); ctx.fill(); }
        moonWindow(470,100,140,210,t,'#2a2030');
        box(60,220,150,260,'#120d0a'); box(70,230,60,240,'rgba(255,200,140,.03)'); box(140,230,60,240,'rgba(255,200,140,.03)');
        boards(450,'#120d0a','#050403');
        moonBeam(470,610,450,-160,625,.08);
      },
      mid(t){
        // an iron bedstead, headboard to the left, footboard to the right
        footShadow(560,512,330,.6);
        const rail = (x,y0,y1) => { box(x-3,y0,6,y1-y0,'#1d1d22'); box(x-3,y0,1.5,y1-y0,'rgba(200,210,235,.25)'); };
        rail(320,318,500); rail(366,334,500); for (let i=0;i<5;i++) rail(332+i*7,350,470);
        box(318,342,52,4,'#26262c'); box(318,452,52,4,'#26262c');
        ctx.fillStyle = '#b89452'; for (const x of [320,366]){ ctx.beginPath(); ctx.arc(x,316,5.5,0,6.283); ctx.fill(); }
        rail(770,378,512); rail(800,388,512); box(768,404,34,4,'#26262c');
        // mattress: the side face first, then the top
        poly([340,470,786,492,786,520,340,500], vg(470,520,[[0,'#3a3a42'],[1,'#1c1c22']]));
        // the sheet turned down over a dark quilt, catching the moonlight
        poly([340,404,786,432,786,494,340,472], vg(404,494,[[0,'#59607a'],[1,'#2c3042']]));
        for (let i=0;i<6;i++){ const x = 470+i*52; ctx.strokeStyle='rgba(0,0,0,.28)'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(x,412+i*3.2); ctx.quadraticCurveTo(x+10,450+i*2,x-4,488+i*1.4); ctx.stroke();
          ctx.strokeStyle='rgba(180,195,235,.12)'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(x+5,413+i*3.2); ctx.quadraticCurveTo(x+15,450+i*2,x+1,489+i*1.4); ctx.stroke(); }
        poly([340,398,470,406,470,430,340,422], vg(398,430,[[0,'#cfd3dc'],[1,'#8d93a3']]));
        box(340,421,130,3,'rgba(0,0,0,.25)');
        // the pillow, plumped and unslept-in
        ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(392,404,50,13,.04,0,6.283); ctx.fill();
        const pg = ctx.createLinearGradient(0,382,0,414); pg.addColorStop(0,'#e4e6ea'); pg.addColorStop(1,'#9ea3ae');
        ctx.fillStyle = pg; ctx.beginPath(); ctx.ellipse(388,397,48,15,.04,0,6.283); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(352,398); ctx.quadraticCurveTo(388,404,424,398); ctx.stroke();
        // dressing table + candle
        box(840,420,130,12,'#1e140c'); box(850,432,8,100,'#160e08'); box(955,432,8,100,'#160e08');
        candle(900,420,t,4,28);
      }
    },
    exterior: {
      perch:null, focus:[500,300],
      back(t){
        if (typeof EXT_PHOTO !== 'undefined' && EXT_PHOTO.complete && EXT_PHOTO.naturalWidth){
          // the house, photographed: a slow breath of light in the windows and the dome, and meteors over the sea
          ctx.drawImage(EXT_PHOTO, -20, -45, 1300, 708);
          const fl = .5 + .5 * Math.sin(t / 900) * Math.sin(t / 1370);
          glow(462, 212, 55, '255,190,110', .10 + .06 * fl);
          if (!reduce){ for (let k = 0; k < 3; k++){ const ph = ((t / 3100) + k * .37) % 1; if (ph < .18){ const u = ph / .18, sx = 880 - k * 230 - u * 260, sy = 20 + k * 35 + u * 120;
            const g = ctx.createLinearGradient(sx, sy, sx + 70, sy - 32); g.addColorStop(0, `rgba(235,240,255,${.9 * (1 - u)})`); g.addColorStop(1, 'rgba(235,240,255,0)');
            ctx.strokeStyle = g; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 70, sy - 32); ctx.stroke(); } } }
          return;
        }
        box(-100,-100,SW+200,520, vg(0,360,[[0,'#03060f'],[1,'#0e1c3c']]));
        const r = seeded(31); for (let i=0;i<220;i++){ ctx.globalAlpha = .25+.6*Math.abs(Math.sin(t/1600+i*1.3)); box(r()*SW, r()*320, 1.2,1.2,'#e6ecff'); } ctx.globalAlpha = 1;
        // meteors
        if (!reduce){ for (let k=0;k<2;k++){ const ph = ((t/2600)+k*.5)%1; if (ph<.25){ const u = ph/.25, sx = 820 - k*260 - u*240, sy = 40 + k*40 + u*150; const g = ctx.createLinearGradient(sx,sy,sx+90,sy-56); g.addColorStop(0,`rgba(255,246,225,${1-u})`); g.addColorStop(1,'rgba(255,246,225,0)'); ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(sx+90,sy-56); ctx.stroke(); } } }
        ctx.fillStyle = '#f2f3ea'; ctx.beginPath(); ctx.arc(160,90,26,0,6.283); ctx.fill(); glow(160,90,180,'200,215,255',.2);
        // sea
        box(-100,380,SW+200,260, vg(380,625,[[0,'#0a1630'],[1,'#03060c']]));
        for (let i=0;i<10;i++) box(150-30+Math.sin(t/700+i)*10, 390+i*9, 60+i*10, 1.5, `rgba(220,230,255,${.3-i*.025})`);
        // cliff and house
        poly([300,625,330,470,420,440,860,430,960,470,1000,625],'#04050a');
        box(400,300,400,150,vg(300,450,[[0,'#1a1d2a'],[1,'#0b0c13']]));
        poly([390,300,600,230,810,300],'#141826');
        poly([390,300,600,230,604,234,398,302],'rgba(170,185,230,.22)');
        box(450,250,18,50,'#11131d'); box(720,252,18,48,'#11131d');
        [[430,340],[480,340],[540,340],[600,340],[660,340],[720,340],[430,390],[540,390],[660,390]].forEach(([x,y],i) => { const on = i%3 !== 1; box(x,y,26,32, on ? 'rgba(255,190,110,.75)' : 'rgba(20,24,34,1)'); if (on) glow(x+13,y+16,40,'255,180,100',.15); });
        // the dome on the roof
        box(574,214,52,24,'#151824'); ctx.fillStyle = '#4a3220'; ctx.beginPath(); ctx.arc(600,214,30,3.14,6.283); ctx.fill(); glow(600,206,70,'255,190,110',.12);
        box(597,188,6,26,'rgba(160,190,255,.5)');
        // Corvin, flying
        const k = ((t/9000)%1);
        flyingRaven(1060 - k*1240, 160 + Math.sin(k*6.28)*30, .8, t);
      }
    },
    ring: {
      perch:null, focus:[560,300],
      back(t){
        // from the cliff above the Firth of Lorn: a moonlit sea far below
        const R = ROOMS.ring; if (!R._t0 || t - (R._last || 0) > 400) R._t0 = t; R._last = t;
        const HZ = 200;
        box(-100,-100,SW+200,HZ+100, vg(-100,HZ,[[0,'#0b1020'],[.6,'#1f2d4c'],[1,'#3d5584']]));
        { const r = seeded(77); for (let i=0;i<70;i++){ ctx.globalAlpha = .25+.6*r(); box(r()*SW, r()*HZ*.9, 1.2,1.2,'#e6ecff'); } ctx.globalAlpha = 1; }
        // the moon, and its haze
        glow(760,70,360,'190,205,240',.4);
        ctx.fillStyle = '#eef0e6'; ctx.beginPath(); ctx.arc(760,70,20,0,6.283); ctx.fill();
        // far shore of Mull, a low dark line on the horizon
        poly([-100,HZ,120,HZ-14,260,HZ-6,420,HZ-18,560,HZ-4,720,HZ-10,900,HZ-2,SW+100,HZ-8,SW+100,HZ,-100,HZ],'#131a2a');
        // the sea: deep, cold, darkening toward us
        box(-100,HZ,SW+200,SH-HZ+100, vg(HZ,SH,[[0,'#3c5788'],[.3,'#253b63'],[.75,'#13213b'],[1,'#080e1a']]));
        // swells: long lines of moonlight on the water, closer together near the horizon
        ctx.save();
        for (let i=0;i<46;i++){
          const u = i/45, y = HZ + 4 + Math.pow(u,1.8)*(SH-HZ), amp = 1 + u*5, sp = .4 + u*.9;
          ctx.strokeStyle = `rgba(170,195,240,${.12 + .16*(1-u)})`; ctx.lineWidth = .8 + u*1.6;
          ctx.beginPath();
          for (let x=-100;x<=SW+100;x+=24){ const yy = y + Math.sin(x*.012/(.4+u) + t*.0007*sp + i)*amp; x===-100 ? ctx.moveTo(x,yy) : ctx.lineTo(x,yy); }
          ctx.stroke();
        }
        // the moon's path on the water: broken glitter, brightest under the moon, shimmering
        ctx.globalCompositeOperation = 'lighter';
        const rr = seeded(13);
        for (let i=0;i<160;i++){
          const u = rr(), y = HZ + 3 + Math.pow(u,1.5)*(SH-HZ-40), wdt = 6 + u*60, x = 760 + (rr()-.5)*(30 + u*170);
          const tw = .5 + .5*Math.sin(t*.006 + i*1.7);
          ctx.fillStyle = `rgba(240,244,255,${(.35 + .6*(1-u))*tw})`; ctx.fillRect(x - wdt/2, y, wdt*(.3+.7*rr()), 1 + u*1.6);
        }
        ctx.restore();
        // the cliff edge in the foreground, top left: black rock, moonlight along its lip
        poly([-100,-100,180,-100,230,40,205,140,250,260,190,420,230,560,150,SH+100,-100,SH+100], hg(-100,250,[[0,'#020306'],[.8,'#0a0d16'],[1,'#141a28']]));
        ctx.strokeStyle = 'rgba(190,205,240,.6)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(180,-100); ctx.lineTo(230,40); ctx.lineTo(205,140); ctx.lineTo(250,260); ctx.lineTo(190,420); ctx.stroke();
        // surf breaking white at the cliff foot
        for (let i=0;i<5;i++){ const ph = (t*.0004 + i*.2) % 1; ctx.fillStyle = `rgba(220,230,250,${.18*(1-ph)})`; ctx.beginPath(); ctx.ellipse(250 + ph*30, 560 + i*8, 60 + ph*40, 5, 0, 0, 6.283); ctx.fill(); }
      },
      mid(t){
        const R = ROOMS.ring, k = Math.max(0,(t - (R._t0||t)) / 1000);
        const X = 700, IMPACT = 2.25, WY = 470;
        if (k < IMPACT){
          // the ring falls, tumbling, catching the moon each time it turns face-on
          const u = k/IMPACT, y = -40 + Math.pow(u,1.7)*(WY+40), x = X + Math.sin(k*1.4)*16, spin = k*4.2, tilt = Math.cos(spin), s = .55 + u*.45;
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          const tr = ctx.createLinearGradient(x, y-110*u, x, y); tr.addColorStop(0,'rgba(255,215,140,0)'); tr.addColorStop(1,'rgba(255,215,140,.16)');
          ctx.fillStyle = tr; ctx.fillRect(x-2, y-110*u, 4, 110*u); ctx.restore();
          ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(k*2.9)*.6); ctx.scale(s,s);
          const rx = 16, ry = Math.max(2.5, 16*Math.abs(tilt));
          ctx.lineWidth = 5.5; ctx.strokeStyle = '#6e511f'; ctx.beginPath(); ctx.ellipse(0,1.2,rx,ry,0,0,6.283); ctx.stroke();
          const gg = ctx.createLinearGradient(-rx,-ry,rx,ry); gg.addColorStop(0,'#fff2c4'); gg.addColorStop(.35,'#e3b75a'); gg.addColorStop(.7,'#a37a2c'); gg.addColorStop(1,'#f6dc93');
          ctx.lineWidth = 4; ctx.strokeStyle = gg; ctx.beginPath(); ctx.ellipse(0,0,rx,ry,0,0,6.283); ctx.stroke();
          ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,250,230,.8)'; ctx.beginPath(); ctx.ellipse(0,-1,rx-1,ry-1,0,3.6,5.6); ctx.stroke();
          ctx.restore();
          const gl = Math.pow(Math.abs(tilt), 16);
          if (gl > .05){ glow(x-6, y-6, 50*gl, '255,240,200', .5*gl);
            ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(255,248,225,${.75*gl})`; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(x-6-18*gl, y-6); ctx.lineTo(x-6+18*gl, y-6); ctx.moveTo(x-6, y-6-18*gl); ctx.lineTo(x-6, y-6+18*gl); ctx.stroke(); ctx.restore(); }
        } else {
          const a = k - IMPACT;
          // ripples: rings spreading flat across the water, fading as they go
          for (let i=0;i<4;i++){ const ra = a - i*.22; if (ra <= 0) continue;
            const rx = 10 + ra*95, al = Math.max(0, .5 - ra*.28);
            ctx.strokeStyle = `rgba(200,215,245,${al})`; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(X, WY, rx, rx*.16, 0, 0, 6.283); ctx.stroke();
            ctx.strokeStyle = `rgba(0,0,0,${al*.6})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(X, WY+2, rx*.97, rx*.15, 0, 0, 6.283); ctx.stroke(); }
          // the crown of the splash, then droplets thrown up and falling back
          if (a < .5){ const c = a/.5; ctx.fillStyle = `rgba(225,235,255,${.55*(1-c)})`;
            for (let j=0;j<14;j++){ const ang = Math.PI*(j/13), h = Math.sin(c*Math.PI)*(16 + 10*Math.sin(j*2.7));
              ctx.fillRect(X + Math.cos(ang)*(8 + c*16) - 1, WY - h, 2, h*.9); } }
          const rd = seeded(9);
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          for (let j=0;j<26;j++){ const vx = (rd()-.5)*90, vy = -(70 + rd()*120), tt = a*1.1;
            const dx = X + vx*tt, dy = WY + vy*tt + 260*tt*tt; if (dy > WY + 2 || tt > 1.3) continue;
            ctx.fillStyle = `rgba(235,242,255,${.75 - tt*.45})`; ctx.beginPath(); ctx.arc(dx, dy, 1 + rd()*1.4, 0, 6.283); ctx.fill(); }
          // a last glint of gold under the surface as it sinks
          if (a < .9){ glow(X, WY + 6 + a*12, 18, '255,210,120', .35*(1 - a/.9)); }
          // foam where it went in
          ctx.fillStyle = `rgba(225,235,255,${Math.max(0,.35 - a*.18)})`; ctx.beginPath(); ctx.ellipse(X, WY, 14 + a*10, 3 + a*1.5, 0, 0, 6.283); ctx.fill();
          ctx.restore();
        }
      }
    },
    v_rival: {
      perch:null, focus:[500,330],
      back(t){ deskTop('#2a1c12','#120b07',500,260); },
      mid(t){
        const k = vclock(ROOMS.v_rival, t);
        // left: Crane's own observing notebook, 1948, in his hand
        sheet(70,330,330,250,-.05,'#e6dcc2');
        txt('Lorn variable — J. Crane, 1948', 98, 372, HAND(24), '#2b2116', 'left', -.05);
        // right: Vale's printed paper
        sheet(600,320,330,260,.04,'#efe9da');
        txt('MONTHLY NOTICES', 765, 356, MONO(13), '#3a3226', 'center', .04);
        txt('On the Lorn Variable', 765, 386, SERIF(22,'italic'), '#1d1810', 'center', .04);
        txt('by Prof. E. Vale', 765, 410, SERIF(15), '#4a3f30', 'center', .04);
        // the same light curve, drawn in each: his in ink, slowly; Vale's in print
        const curve = (ox, oy, rot) => { const pts = []; for (let i=0;i<=24;i++){ const x = i*11, y = -Math.sin(i*.55)*26 - Math.sin(i*.21)*10; pts.push([ox + x*Math.cos(rot) - y*Math.sin(rot), oy + x*Math.sin(rot) + y*Math.cos(rot)]); } return pts; };
        stroke(curve(105,470,-.05), ease(k/1.6), '#24324f', 2.2);
        stroke(curve(632,492,.04), 1, '#1a160f', 1.8);
        for (let i=0;i<6;i++) box(640, 530 + i*7, 250 - (i%3)*30, 1.4, 'rgba(30,25,18,.35)');
        // the match: a gold light finds both graphs at once
        if (k > 1.8){ const a = Math.sin(Math.min(1,(k-1.8)/.8)*Math.PI*.5); glow(240,460,140,'255,210,120',.32*a); glow(765,480,140,'255,210,120',.32*a);
          ctx.strokeStyle = `rgba(255,215,130,${.7*a})`; ctx.lineWidth = 2; ctx.setLineDash([6,6]); ctx.beginPath(); ctx.moveTo(380,460); ctx.quadraticCurveTo(500,400,620,480); ctx.stroke(); ctx.setLineDash([]); }
      }
    },
    v_comet: {
      perch:null, focus:[500,330],
      back(t){ box(-100,-100,SW+200,SH+200, vg(0,SH,[[0,'#140707'],[1,'#060203']])); glow(500,90,600,'255,40,30',.22); },
      mid(t){
        const k = vclock(ROOMS.v_comet, t);
        // a lightbox, and on it the glass plate, developing
        box(580,250,330,240,'#1a1412'); box(590,260,310,220,'#f2efe6'); glow(745,370,260,'255,250,235',.25);
        const dev = ease(k/1.4);
        ctx.save(); ctx.beginPath(); ctx.rect(600,270,290,200); ctx.clip();
        box(600,270,290,200,`rgba(200,195,180,${.35*dev})`);
        const r = seeded(31); for (let i=0;i<90;i++){ const x = 600 + r()*290, y = 270 + r()*200, z = .6 + r()*1.8; ctx.fillStyle = `rgba(20,18,15,${.8*dev})`; ctx.beginPath(); ctx.arc(x,y,z,0,6.283); ctx.fill(); }
        // the comet: a dark head and a long fan of tail, as a negative shows it
        const g = ctx.createLinearGradient(650,440,820,320); g.addColorStop(0,'rgba(15,12,10,0)'); g.addColorStop(1,`rgba(15,12,10,${.85*dev})`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(640,450); ctx.lineTo(660,470); ctx.lineTo(826,326); ctx.closePath(); ctx.fill();
        ctx.fillStyle = `rgba(10,8,6,${dev})`; ctx.beginPath(); ctx.arc(824,326,5,0,6.283); ctx.fill();
        ctx.restore();
        // her label underneath, and Vale's pen
        sheet(610,512,270,70,-.02,'#e9e1c9');
        txt('Comet — O. Marsh', 640, 556, HAND(28), '#2a2016', 'left', -.02);
        stroke([[634,546],[812,541]], ease((k-1.3)/.5), '#8a1c1c', 3);
        if (k > 1.8) txt('E. Vale', 800, 536, HAND(26), `rgba(138,28,28,${ease((k-1.8)/.4)})`, 'left', -.05);
      }
    },
    v_ledger: {
      perch:null, focus:[500,330],
      back(t){ deskTop('#1f1a12','#0c0905',380,240); candle(150,440,t,2,40); },
      mid(t){
        const k = vclock(ROOMS.v_ledger, t);
        sheet(250,300,560,300,-.02,'#e7dcc0');
        txt('THE LARKSPUR FUND', 530, 336, MONO(15), '#5a2a1c', 'center', -.02);
        line(270,350,790,336,'rgba(90,40,25,.5)',1.4); line(640,355,640,590,'rgba(90,40,25,.3)',1); line(730,352,730,590,'rgba(90,40,25,.3)',1);
        const rows = [['Telescope maintenance','£212'],['Stipend, O. Marsh','£96'],['Withdrawn, R.A.','£4,000'],['Dome copper, repairs','£58'],['Sundries','£31']];
        rows.forEach(([a,b],i) => { const y = 386 + i*38 - i*.8; txt(a, 290, y - i*0, HAND(24), '#2b2116', 'left', -.02); txt(b, 700, y - 8, HAND(24), i===2 ? '#2b2116' : '#2b2116', 'right', -.02); });
        // the strike, then the ink bleeding out from the nib
        const u = ease((k-.6)/.6);
        stroke([[284,462],[712,452]], u, '#8f1414', 4);
        if (k > 1.25){ const b = ease((k-1.25)/1.4); ctx.fillStyle = 'rgba(70,10,10,.8)';
          ctx.beginPath(); for (let i=0;i<=24;i++){ const a = i/24*6.283, rr = (10 + 34*b)*(1 + .25*Math.sin(a*5 + 1.3)); i ? ctx.lineTo(714 + Math.cos(a)*rr, 456 + Math.sin(a)*rr*.7) : ctx.moveTo(714 + Math.cos(a)*rr, 456 + Math.sin(a)*rr*.7); } ctx.fill(); }
        // the pen itself, lifting away
        const px = 284 + (712-284)*u, py = 462 - 10*u - (k > 1.3 ? (k-1.3)*60 : 0);
        ctx.save(); ctx.translate(px + 4, py - 4); ctx.rotate(-.7); box(0,-3,120,6,'#14100c'); box(0,-3,120,1.5,'rgba(255,220,160,.4)'); box(-10,-1.5,12,3,'#b8964e'); ctx.restore();
      }
    },
    v_keys: {
      perch:null, focus:[540,360],
      back(t){
        // the lodge door at night, in steady rain: dark oak, iron, wet stone
        box(-100,-100,SW+200,SH+200, vg(0,SH,[[0,'#151a24'],[1,'#07090d']]));
        // rough stone wall around the door
        { const r = seeded(41); for (let y=-20;y<430;y+=34) for (let x=-100 + ((y/34)%2)*36;x<SW+100;x+=72){ const v = 48 + r()*22|0; box(x,y,70,32,`rgb(${v},${v+2},${v+7})`); box(x,y,70,1.5,'rgba(255,255,255,.04)'); box(x,y+31,70,1.5,'rgba(0,0,0,.5)'); } }
        // the doorway: a deep reveal, then planked oak with strap hinges
        box(350,30,340,410,'#0b0907');
        for (let i=0;i<6;i++){ const x = 368 + i*51; box(x,48,50,392, hg(x,x+50,[[0,'#5c4330'],[.5,'#71563c'],[1,'#523c2a']])); box(x,48,1.5,392,'rgba(0,0,0,.6)');
          const r = seeded(60+i); for (let j=0;j<7;j++){ const gx = x + 6 + r()*38; ctx.strokeStyle = 'rgba(20,12,6,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx,50); ctx.bezierCurveTo(gx+r()*6-3,180,gx+r()*6-3,320,gx+r()*4-2,438); ctx.stroke(); } }
        for (const y of [110,350]){ box(372,y,250,10,'#1a1a1d'); box(372,y,250,2,'rgba(200,205,220,.25)'); for (let x=384;x<610;x+=40){ ctx.fillStyle='#2a2a2e'; ctx.beginPath(); ctx.arc(x,y+5,3,0,6.283); ctx.fill(); } }
        box(632,250,10,36,'#1a1a1d'); ctx.strokeStyle = '#26262a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(637,292,11,0,Math.PI); ctx.stroke();
        // lantern light pooling on the door and the step
        glow(700,300,460,'255,170,80',.5); glow(520,120,500,'150,170,220',.16);
        // the step: worn granite, slick with rain
        box(250,432,560,44, vg(432,476,[[0,'#6c6f77'],[1,'#3c3e44']]));
        box(250,432,560,2.5,'rgba(220,226,240,.45)');
        { const r = seeded(9); for (let i=0;i<80;i++){ ctx.fillStyle = `rgba(0,0,0,${.12 + r()*.18})`; ctx.fillRect(250 + r()*560, 436 + r()*36, 2 + r()*6, 1 + r()*2); } }
        box(200,476,660,40, vg(476,516,[[0,'#4a4c53'],[1,'#222328']])); box(200,476,660,2,'rgba(220,226,240,.25)');
        box(-100,516,SW+200,200,'#08090c');
        // the wet sheen: the lantern reflected in the stone
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const sh = ctx.createLinearGradient(0,434,0,476); sh.addColorStop(0,'rgba(255,170,90,.22)'); sh.addColorStop(1,'rgba(255,170,90,0)');
        ctx.fillStyle = sh; ctx.fillRect(660,434,80,42); ctx.restore();
        // rain: fine, slanting, catching the light
        const r = seeded(5); ctx.strokeStyle = 'rgba(190,205,235,.28)'; ctx.lineWidth = 1;
        for (let i=0;i<160;i++){ const x = r()*(SW+200) - 100, sp = 700 + r()*400, y = ((r()*SH + t*sp/1000) % (SH+60)) - 30; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x-5,y+20); ctx.stroke(); }
        // and splashing on the step
        for (let i=0;i<14;i++){ const ph = ((t/600) + i*.137) % 1, x = 270 + ((i*97) % 520), a = 1 - ph;
          ctx.strokeStyle = `rgba(210,220,240,${.35*a})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x,434,2 + ph*7,1 + ph*1.6,0,Math.PI,6.283); ctx.stroke(); }
      },
      mid(t){
        const S = ROOMS.v_keys, k = vclock(S, t);
        // the notice, nailed down by the rain: soaked paper, the ink beginning to run
        ctx.save(); ctx.translate(268,446); ctx.rotate(.05);
        ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(4,5,214,30);
        ctx.fillStyle = '#b9b19a'; ctx.fillRect(0,0,214,30); ctx.fillStyle = 'rgba(70,60,40,.25)'; ctx.fillRect(0,18,214,12);
        ctx.font = HAND(19); ctx.fillStyle = 'rgba(30,26,40,.85)'; ctx.fillText('One week’s notice. E.V.', 10, 20);
        ctx.fillStyle = 'rgba(40,40,70,.18)'; for (let i=0;i<6;i++) ctx.fillRect(14 + i*24, 21, 2, 6 + (i%3)*3);
        ctx.restore();
        // a storm lantern on the step, burning low
        const lw = Math.max(.15, 1 - k/3.6), fl = flick(t,7);
        box(706,390,48,6,'#141416'); box(712,396,36,40,'rgba(255,190,110,'+(.18*lw)+')'); box(706,436,48,6,'#141416');
        for (const x of [708,750]) box(x,394,3,44,'#1e1e22');
        ctx.strokeStyle = '#1e1e22'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(730,388,14,Math.PI,6.283); ctx.stroke();
        const fg = ctx.createRadialGradient(730,418,0,730,418,12); fg.addColorStop(0,`rgba(255,245,210,${lw})`); fg.addColorStop(.4,`rgba(255,180,80,${.8*lw})`); fg.addColorStop(1,'rgba(255,120,30,0)');
        ctx.fillStyle = fg; ctx.beginPath(); ctx.ellipse(730,420,5*fl,11*fl,0,0,6.283); ctx.fill();
        glow(730,416,150*lw*fl,'255,170,80',.4*lw);

        /* ---- the keys: a real physics simulation (Verlet), with a springy ring and three rigid keys ---- */
        const G = 432;
        const ground = x => (x > 250 && x < 810) ? G : 476;
        if (!S.sim || k < (S.simK || 0) - .02){
          const P = [], C = [];
          const add = (x,y) => { P.push({x, y, px:x, py:y}); return P.length - 1; };
          const link = (a,b,stiff) => C.push({a, b, d:Math.hypot(P[a].x-P[b].x, P[a].y-P[b].y), s:stiff});
          const cx = 548, cy = 150, R = 19, N = 12, ring = [];
          for (let i=0;i<N;i++){ const a = i/N*6.283; ring.push(add(cx + Math.cos(a)*R, cy + Math.sin(a)*R)); }
          for (let i=0;i<N;i++){ link(ring[i], ring[(i+1)%N], 1); link(ring[i], ring[(i+2)%N], .5); link(ring[i], ring[(i+N/2)%N], .12); }   // a soft body: firm rim, springy across
          const keys = [];
          [[3,-.34,false],[4,.05,true],[5,.44,false]].forEach(([ri, lean, brass]) => {
            const r0 = ring[ri], bx = P[r0].x, by = P[r0].y, L = 66, ids = [];
            for (let j=0;j<4;j++){ const d = 4 + L*j/3; ids.push(add(bx + Math.sin(lean)*d, by + Math.cos(lean)*d)); }
            C.push({a:r0, b:ids[0], d:4, s:.9});                              // the bow, loose on the ring
            for (let a=0;a<4;a++) for (let b=a+1;b<4;b++) link(ids[a], ids[b], 1);   // a rigid steel key
            keys.push({ids, brass});
          });
          // a little spin as it leaves the hand
          P.forEach(p => { p.px = p.x - (p.y - cy)*.0009*8; p.py = p.y + (p.x - cx)*.0009*8 - .2; });
          S.sim = {P, C, ring, keys, acc:0, hit:[]}; S.simK = 0;
        }
        const sim = S.sim, dt = 1/240, g = 1300;
        let todo = Math.min(.1, k - (S.simK || 0)); S.simK = k;
        while (todo > 1e-6){
          const h = Math.min(dt, todo); todo -= h;
          for (const p of sim.P){
            const vx = (p.x - p.px)*.999, vy = (p.y - p.py)*.999;
            p.px = p.x; p.py = p.y; p.x += vx; p.y += vy + g*h*h;
          }
          for (let it=0; it<10; it++){
            for (const c of sim.C){
              const A = sim.P[c.a], B = sim.P[c.b], dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx,dy) || 1e-6, f = (d - c.d)/d*.5*c.s;
              A.x += dx*f; A.y += dy*f; B.x -= dx*f; B.y -= dy*f;
            }
            for (const p of sim.P){
              const gy = ground(p.x);
              if (p.y > gy){
                const vy = p.y - p.py, vx = p.x - p.px;
                if (vy > 1.2 && sim.hit.length < 40) sim.hit.push({x:p.x, y:gy, t:k});
                p.y = gy; p.py = gy + vy*.32;      // restitution: a dull bounce on stone
                p.px = p.x - vx*.55;               // friction: it skids, then stops
              }
            }
          }
        }
        // contact shadows under everything near the stone
        for (const p of sim.P){ const d = ground(p.x) - p.y; if (d < 60) footShadow(p.x, ground(p.x) + 1, 10, .35*(1 - d/60)); }
        // spray where steel strikes the wet step
        for (const hh of sim.hit){ const a = k - hh.t; if (a > .35) continue; const s = 1 - a/.35;
          ctx.fillStyle = `rgba(215,225,245,${.6*s})`; for (let d=0; d<4; d++) ctx.fillRect(hh.x + (d - 1.5)*4*(1.3 - s), hh.y - 2 - Math.sin(d*1.3 + 1)*9*(1 - s*.5), 1.5, 1.5); }
        // draw the keys along their simulated bodies
        for (const K of sim.keys){
          const a = sim.P[K.ids[0]], b = sim.P[K.ids[3]], ang = Math.atan2(b.x - a.x, b.y - a.y), L = Math.hypot(b.x - a.x, b.y - a.y);
          ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(-ang);
          const base = K.brass ? ['#5e4718','#b48d3e','#e6c77a'] : ['#2c2e33','#7b7f88','#c9ced8'];
          const mg = ctx.createLinearGradient(-6,0,6,0); mg.addColorStop(0,base[0]); mg.addColorStop(.55,base[1]); mg.addColorStop(1,base[0]);
          ctx.lineWidth = 3.6; ctx.strokeStyle = mg; ctx.beginPath(); ctx.ellipse(0,4,8,8.5,0,0,6.283); ctx.stroke();
          ctx.lineWidth = .9; ctx.strokeStyle = base[2]; ctx.beginPath(); ctx.ellipse(0,4,8,8.5,0,3.8,5.1); ctx.stroke();
          ctx.fillStyle = mg; ctx.fillRect(-3.4,12,6.8,4.5); ctx.fillRect(-2.1,16,4.2,L - 26);
          ctx.fillStyle = base[2]; ctx.fillRect(-2.1,16,.9,L - 26);
          ctx.fillStyle = mg; ctx.fillRect(-2.1,L - 11,12,11); ctx.fillStyle = 'rgba(0,0,0,.85)'; ctx.fillRect(3.5,L - 11,2.4,4.5); ctx.fillRect(7.2,L - 6,2.6,6);
          ctx.restore();
        }
        // and the ring, drawn as a smooth curve through its springy rim
        const rp = sim.ring.map(i => sim.P[i]);
        ctx.lineWidth = 3.8; ctx.strokeStyle = '#6e727b'; ctx.beginPath();
        for (let i=0;i<=rp.length;i++){ const p = rp[i % rp.length], q = rp[(i+1) % rp.length], mx = (p.x + q.x)/2, my = (p.y + q.y)/2; i ? ctx.quadraticCurveTo(p.x, p.y, mx, my) : ctx.moveTo(mx, my); }
        ctx.stroke();
        ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(230,236,248,.65)'; ctx.beginPath(); ctx.moveTo((rp[7].x+rp[8].x)/2,(rp[7].y+rp[8].y)/2); ctx.quadraticCurveTo(rp[8].x,rp[8].y,(rp[8].x+rp[9].x)/2,(rp[8].y+rp[9].y)/2); ctx.quadraticCurveTo(rp[9].x,rp[9].y,(rp[9].x+rp[10].x)/2,(rp[9].y+rp[10].y)/2); ctx.stroke();
      }
    },
    v_phone: {
      perch:null, focus:[500,330],
      back(t){
        box(-100,-100,SW+200,SH+200, vg(0,SH,[[0,'#0d0f0c'],[1,'#050604']]));
        // green baize under a hanging lamp, in a card room in Oban
        poly([60,300,940,300,1040,640,-40,640], vg(300,640,[[0,'#2c6a4a'],[1,'#123826']]));
        glow(500,330,600,'255,225,160',.5); box(497,-100,6,250,'#111');
        poly([430,150,570,150,610,200,390,200],'#1f2a1f'); glow(500,205,90,'255,230,170',.45);
      },
      mid(t){
        const k = vclock(ROOMS.v_phone, t);
        // cards and chips, a hand thrown in
        const card = (x,y,a,red) => { ctx.save(); ctx.translate(x,y); ctx.rotate(a); box(-17,-24,34,48,'#f1ebdc'); box(-17,-24,34,48,'rgba(0,0,0,.05)'); txt(red?'♥':'♠', -11, -8, SERIF(16), red?'#a01818':'#111'); ctx.restore(); };
        card(300,420,-.4,1); card(330,410,-.1,0); card(362,416,.25,1); card(610,470,.6,0); card(640,460,.9,1);
        for (let i=0;i<7;i++){ ctx.fillStyle = i%2 ? '#8a1c1c' : '#d8cfb5'; ctx.beginPath(); ctx.ellipse(420 + i*9, 470 - i*3, 13, 4.5, 0, 0, 6.283); ctx.fill(); }
        // the IOU
        sheet(160,470,150,64,-.08,'#ece4cc'); txt('I.O.U. £900', 176, 500, HAND(24), '#2a2016', 'left', -.08); txt('H. Pryce', 186, 524, HAND(20), '#2a2016', 'left', -.08);
        // the telephone, its receiver laid off the hook on the baize
        box(700,360,110,44,'#0a0a0a'); poly([710,360,800,360,790,336,720,336],'#121212');
        ctx.fillStyle = '#d8d0b8'; ctx.beginPath(); ctx.arc(755,382,14,0,6.283); ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(755,382,9,0,6.283); ctx.stroke();
        box(712,326,86,7,'#0a0a0a'); box(712,326,86,1.5,'rgba(255,255,255,.25)');
        ctx.save(); ctx.translate(790,436); ctx.rotate(.25); box(-50,-7,100,14,'#0c0c0c'); box(-58,-12,18,24,'#0c0c0c'); box(40,-12,18,24,'#0c0c0c'); box(-50,-7,100,2,'rgba(255,255,255,.2)'); ctx.restore();
        ctx.strokeStyle = '#0b0b0b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(800,400); ctx.bezierCurveTo(840,420,860,470,820,452); ctx.stroke();
        // and somewhere, a patient's call going nowhere: the faint purr of the line
        const a = (Math.sin(k*9) > 0 ? .5 : .15) * Math.min(1, k/.5);
        ctx.strokeStyle = `rgba(230,220,190,${a})`; ctx.lineWidth = 1.4; for (let i=1;i<=3;i++){ ctx.beginPath(); ctx.arc(752,440,12 + i*9,-1.1,-.2); ctx.stroke(); }
      }
    },
    v_tin: {
      perch:null, focus:[500,330],
      back(t){ deskTop('#2a2218','#100c08',460,250); },
      mid(t){
        const k = vclock(ROOMS.v_tin, t);
        // her savings tin, painted with faded roses
        box(410,400,200,120,'#5c2a26'); box(410,400,200,4,'rgba(255,210,180,.35)'); box(410,516,200,4,'rgba(0,0,0,.4)');
        for (let i=0;i<5;i++){ ctx.fillStyle = 'rgba(220,170,160,.35)'; ctx.beginPath(); ctx.arc(436 + i*38, 456 + (i%2)*12, 9, 0, 6.283); ctx.fill(); }
        // the inside, empty but for a folded note
        box(418,404,184,16,'#1a0f0c');
        const lift = ease(k/.9), ang = -lift*1.9;
        // the lid swinging open on its hinge at the back
        ctx.save(); ctx.translate(410,402); ctx.rotate(ang*.0); ctx.restore();
        ctx.save(); ctx.translate(410,400); const hh = 26*Math.cos(lift*1.6); box(0,-Math.max(4,hh),200,Math.max(4,hh)+2, vg(-26,0,[[0,'#7a3a33'],[1,'#4a201c']])); ctx.restore();
        if (k > .7){ sheet(450,384,110,26,-.1,'#e6dcc2'); txt('Loan, £340 — E.V.', 458, 402, HAND(17), '#2a2016', 'left', -.1); }
        // one last coin rolls out, wobbles and falls flat
        if (k > 1.0){ const c = k - 1.0, x = 600 + Math.min(c,1.2)*150, wob = c > 1.2 ? Math.max(0, 1 - (c-1.2)/.8) : 1, spin = c*14;
          ctx.save(); ctx.translate(x, 522); const w = c > 1.2 ? 12 : 12*Math.abs(Math.cos(spin)), h = c > 1.2 ? 4 + 8*wob*Math.abs(Math.sin(c*20)) : 12;
          ctx.fillStyle = '#c9a24e'; ctx.beginPath(); ctx.ellipse(0,0,Math.max(1.5,w),h,0,0,6.283); ctx.fill(); ctx.strokeStyle = '#8a6a26'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
          glow(x, 518, 30, '255,220,140', .25); }
      }
    },
    armchair: {
      floor:470,
      perch:null, focus:[470,330],
      back(t){
        // his chair, by the fire, empty
        box(-100,-100,SW+200,SH+200, vg(0,SH,[[0,'#140d0a'],[1,'#070505']]));
        for (let x=-20;x<SW;x+=130){ box(x,70,104,290,'rgba(70,42,26,.28)'); box(x+8,78,88,274,'rgba(20,12,8,.25)'); }
        box(-100,360,SW+200,14,'#24160e');
        boards(470,'#22150d','#0d0806',600);
        // rug
        ctx.fillStyle = '#3a1416'; ctx.beginPath(); ctx.ellipse(470,560,330,52,0,0,6.283); ctx.fill();
        ctx.strokeStyle = 'rgba(190,140,70,.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(470,560,300,42,0,0,6.283); ctx.stroke();
        // fireplace
        box(600,240,300,240,'#2c2119'); box(586,226,328,22,'#3c2d21'); box(630,290,240,190,'#050303');
        fire(670,478,160,t);
        glow(750,430,300,'255,140,60',.28);
        // a clock and a photograph on the mantel
        box(640,190,40,36,'#3a2a1a'); ctx.fillStyle = '#d8cba8'; ctx.beginPath(); ctx.arc(660,206,12,0,6.283); ctx.fill();
        box(820,196,46,30,'#2a2018'); box(825,200,36,22,'#8a7a5a');
      },
      mid(t){
        const fl = .82 + .18*Math.sin(t/110)*Math.sin(t/73);
        // the chair faces the fire; we see its back. Nobody in it now.
        ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.beginPath(); ctx.ellipse(360,566,170,26,0,0,6.283); ctx.fill();
        // the chair back, wings and the top roll, all from behind
        ctx.fillStyle = '#2c0d0f';
        ctx.beginPath(); ctx.moveTo(250,290); ctx.quadraticCurveTo(250,248,300,244); ctx.lineTo(430,244); ctx.quadraticCurveTo(478,248,478,290); ctx.lineTo(482,540); ctx.lineTo(246,540); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#240a0c';
        ctx.beginPath(); ctx.moveTo(226,300); ctx.quadraticCurveTo(222,266,254,270); ctx.lineTo(252,540); ctx.lineTo(228,540); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(502,300); ctx.quadraticCurveTo(506,266,474,270); ctx.lineTo(476,540); ctx.lineTo(500,540); ctx.closePath(); ctx.fill();
        // seams and the brass nails down the back
        ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(364,250); ctx.lineTo(364,536); ctx.stroke();
        ctx.fillStyle = 'rgba(200,160,90,.55)'; for (let y=262;y<536;y+=14){ ctx.beginPath(); ctx.arc(250,y,1.6,0,6.283); ctx.fill(); ctx.beginPath(); ctx.arc(478,y,1.6,0,6.283); ctx.fill(); }
        // legs
        box(240,540,12,26,'#120806'); box(476,540,12,26,'#120806');
        // firelight catching the edge nearest the hearth
        glow(492,380,150,'255,140,60',.14*fl);
        ctx.strokeStyle = `rgba(255,160,80,${.35*fl})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(500,300); ctx.lineTo(502,540); ctx.stroke();
        // a small side table, and his brandy poured and waiting: he never came down to drink it
        box(526,470,92,10,'#2a160c'); box(532,480,80,4,'#1a0d07'); box(566,484,10,76,'#1a0d07'); box(546,556,50,6,'#1a0d07');
        glow(572,452,60,'255,150,70',.16*fl);
        // decanter
        ctx.fillStyle = 'rgba(150,80,30,.75)'; ctx.beginPath(); ctx.ellipse(596,452,13,16,0,0,6.283); ctx.fill();
        ctx.fillStyle = 'rgba(210,230,255,.22)'; ctx.fillRect(592,424,8,16); ctx.beginPath(); ctx.arc(596,422,6,0,6.283); ctx.fill();
        ctx.strokeStyle = 'rgba(255,220,170,.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(596,452,13,16,0,0,6.283); ctx.stroke();
        // the snifter, untouched
        ctx.fillStyle = 'rgba(210,230,255,.16)'; ctx.beginPath(); ctx.ellipse(552,452,11,12,0,0,6.283); ctx.fill();
        ctx.fillStyle = `rgba(190,100,30,${.75 + .1*fl})`; ctx.beginPath(); ctx.ellipse(552,457,10,6,0,0,6.283); ctx.fill();
        ctx.fillStyle = 'rgba(210,230,255,.25)'; ctx.fillRect(551,463,2,6); ctx.fillRect(545,469,14,2);
        ctx.fillStyle = `rgba(255,230,190,${.5*fl})`; ctx.beginPath(); ctx.arc(548,447,2,0,6.283); ctx.fill();
      }
    },
    ballroom: {
      floor:420,
      perch:[700,436,.5], focus:[500,320],
      back(t){
        box(-100,-100,SW+200,520, vg(0,420,[[0,'#0d0f14'],[1,'#191c24']]));
        interior(420, {tint:'210,215,235', lx:500, ly:200, lift:.08, dado:false});
        for (let i=0;i<4;i++){
          const x = 90 + i*230;
          ctx.fillStyle = '#060810'; ctx.beginPath(); ctx.moveTo(x,400); ctx.lineTo(x,150); ctx.quadraticCurveTo(x+60,70,x+120,150); ctx.lineTo(x+120,400); ctx.fill();
          ctx.save(); ctx.beginPath(); ctx.moveTo(x+8,394); ctx.lineTo(x+8,154); ctx.quadraticCurveTo(x+60,84,x+112,154); ctx.lineTo(x+112,394); ctx.clip();
          box(x,80,120,330, vg(80,400,[[0,'#0e1d3e'],[1,'#1c2c50']]));
          line(x+60,80,x+60,400,'#060810',4); line(x,240,x+120,240,'#060810',4);
          ctx.restore();
          moonBeam(x+10,x+110,400,-120,625,.07);
        }
        // parquet
        box(-100,420,SW+200,260, vg(420,SH,[[0,'#1c140c'],[1,'#080604']]));
        for (let i=-20;i<=20;i++) line(500+i*10,420,500+i*90,SH+40,'rgba(0,0,0,.3)',1);
        for (let k=1;k<8;k++){ const y = 420 + (SH-420)*Math.pow(k/8,1.5); line(-100,y,SW+100,y,'rgba(0,0,0,.25)',1); }
        // dust-sheeted chairs along the walls
        [[120,430,1],[220,436,1],[800,436,1],[900,430,1],[700,436,1.05]].forEach(([x,y,s]) => {
          ctx.fillStyle = '#b9b6ae'; ctx.beginPath(); ctx.moveTo(x-30*s,y+60*s); ctx.quadraticCurveTo(x-34*s,y,x-10*s,y-2*s); ctx.quadraticCurveTo(x,y-6*s,x+10*s,y-2*s); ctx.quadraticCurveTo(x+34*s,y,x+30*s,y+60*s); ctx.fill();
          ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+30*s,y+60*s); ctx.lineTo(x+6*s,y+60*s); ctx.fill();
        });
      },
      mid(t){
        // chandelier
        const sw = reduce ? 0 : Math.sin(t/2400)*.03;
        ctx.save(); ctx.translate(500,0); ctx.rotate(sw);
        line(0,0,0,110,'#2a2420',2);
        ctx.fillStyle = '#3a3026'; ctx.beginPath(); ctx.ellipse(0,130,90,16,0,0,6.283); ctx.fill();
        for (let i=0;i<14;i++){ const a = i/14*6.283, x = Math.cos(a)*84, y = 130+Math.sin(a)*14; line(x,y,x,y+30,'rgba(220,230,255,.35)',1); const gl = .3+.5*Math.abs(Math.sin(t/700+i)); ctx.fillStyle = `rgba(230,240,255,${gl})`; ctx.beginPath(); ctx.arc(x,y+32,2.2,0,6.283); ctx.fill(); }
        ctx.restore();
        glow(500,140,200,'200,215,255',.05);
      }
    }
  };


  /* surfaces: every room gets mottled plaster, grain and grime, fixed to the walls (it moves with the camera, unlike film grain) */
  const surfTex = (() => {
    const N = 512, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d');
    const img = g.createImageData(N, N), d = img.data, acc = new Float32Array(N * N);
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (const [cell, amp] of [[128, .9], [64, .7], [32, .5], [16, .35], [6, .25], [2, .2]]){
      const m = N / cell, grid = []; for (let i = 0; i < m * m; i++) grid.push(rnd());
      const at = (x, y) => grid[((y + m) % m) * m + ((x + m) % m)];
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++){
        const fx = x / cell, fy = y / cell, x0 = Math.floor(fx), y0 = Math.floor(fy), u = fx - x0, v = fy - y0, su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
        acc[y * N + x] += amp * ((at(x0, y0) * (1 - su) + at(x0 + 1, y0) * su) * (1 - sv) + (at(x0, y0 + 1) * (1 - su) + at(x0 + 1, y0 + 1) * su) * sv);
      }
    }
    // faint vertical streaks: damp, wear, grain
    const streak = new Float32Array(N); for (let x = 0; x < N; x++) streak[x] = rnd() < .08 ? (rnd() - .5) * .5 : 0;
    let lo = 1e9, hi = -1e9; for (let i = 0; i < acc.length; i++){ acc[i] += streak[i % N] * (.5 + .5 * Math.sin(i / N / 40)); lo = Math.min(lo, acc[i]); hi = Math.max(hi, acc[i]); }
    for (let i = 0; i < acc.length; i++){ const v = Math.round(255 * (acc[i] - lo) / (hi - lo)); d[i * 4] = v; d[i * 4 + 1] = v * .96; d[i * 4 + 2] = v * .9; d[i * 4 + 3] = 255; }
    g.putImageData(img, 0, 0); return c;
  })();
  let surfPat = null;
  function surface(){
    if (!surfPat) surfPat = ctx.createPattern(surfTex, 'repeat');
    ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = .7; ctx.fillStyle = surfPat;
    ctx.fillRect(-300, -300, SW + 600, SH + 600);
    ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = .35; ctx.fillRect(-300, -300, SW + 600, SH + 600);
    ctx.restore();
  }
  function renderScene(name, t, layer){
    const R = ROOMS[name];
    if (!R){
      RX = DRX; RY = DRY; RS = DRS; perchAng = tAng; px = fCur*dpr*RS;
      layer(-14, drawDome);
      layer(-6, () => { drawBeam(); drawDust(t,false); });
      layer(0, () => { drawLamp(); drawTelescope(); drawRaven(t); });
      layer(18, () => drawDust(t,true));
      return;
    }
    layer(-8, () => { R.back(t); if (R.floor) floorAO(R.floor); if (name !== 'exterior' || typeof EXT_PHOTO === 'undefined') surface(); });
    layer(0, () => { if (R.mid) R.mid(t); if (R.perch){ RX = R.perch[0]; RY = R.perch[1]; RS = R.perch[2]; perchAng = 0; px = fCur*dpr*RS; drawRaven(t); } });
    layer(12, () => motes(t, 0, SW, 0, SH, 26, 9));
  }
  const focusOf = name => name === 'dome' || !ROOMS[name] ? [540,350] : ROOMS[name].focus;

  function adapt(t, ms){
    ftAvg += (ms - ftAvg) * .05;
    if (t - ftT < 1500 || prevScene || snapPending) return;
    if (ftAvg > 18.5 && rscale > .5){ rscale = Math.max(.5, rscale - .15); ftT = t; size(); }
    else if (ftAvg < 14 && rscale < 1 && t - ftT > 8000){ rscale = Math.min(1, rscale + .1); ftT = t; size(); }
  }
  let vgCache = null, vgKey = '';
  function frame(){ if (window.__filmPaused || document.hidden){ requestAnimationFrame(frame); return; }
    const t = now(), dt = Math.min(.05, (t-last)/1000); if (!document.hidden) adapt(t, Math.min(100, t - last)); last = t;
    if (!W) { requestAnimationFrame(frame); return; }
    shakeOff = simulate(t, dt);
    if (ravenFn){
      // the 3D film is underneath: draw only Corvin (and the drifting ash), on glass
      ctx = mainCtx; ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,cv.width,cv.height); prevScene = null; snapPending = false;
      const p = ravenFn();
      if (p){ const s = p.s*dpr; RX = DRX; RY = DRY; RS = DRS; perchAng = p.ang || 0; fCur = p.s; px = s*RS;
        ctx.setTransform(s,0,0,s,p.x*dpr - RX*s, p.y*dpr - RY*s); drawRaven(t); headWorld = {x:RX + (36+34)*RS, y:RY - (142+30)*RS}; }
      if (FX.ash || FX.flash > 0 || FX.streak > 0){ const g = FX.grade; FX.grade = 0; const gt = FX.gradeT; FX.gradeT = 0; drawFX(t, dt); FX.grade = g; FX.gradeT = gt; }
      requestAnimationFrame(frame); return;
    }
    if (still) ptr.at = -1e9;
    ptr.x += ((t-ptr.at<4000 ? (ptr.sx/SW-.5)*2 : 0) - ptr.x)*Math.min(1,dt*2);
    ptr.y += ((t-ptr.at<4000 ? (ptr.sy/SH-.5)*2 : 0) - ptr.y)*Math.min(1,dt*2);
    const drift = reduce || still ? 0 : 1;
    const view = () => {
      if (camTw){ const u = clamp((t-camTw.t0)/camTw.dur,0,1), e = camTw.lin ? u : ease(u); cam.z = lerp(camTw.from.z,camTw.to.z,e); cam.cx = lerp(camTw.from.cx,camTw.to.cx,e); cam.cy = lerp(camTw.from.cy,camTw.to.cy,e); if (u>=1) camTw = null; }
      const f = Math.max(W/SW, H/SH) * cam.z;
      let cx = cam.cx + Math.sin(t/7000)*8*drift + ptr.x*10*drift, cy = cam.cy + Math.cos(t/9000)*5*drift + ptr.y*6*drift;
      cx = clamp(cx, W/(2*f), SW - W/(2*f)); cy = clamp(cy, H/(2*f), SH - H/(2*f));
      fCur = f; px = f*dpr*RS;
      { const fo = focusOf(scene); LENS.x = W/2 + (fo[0]-cx)*f; LENS.y = H/2 + (fo[1]-cy)*f; LENS.mv += ((camTw ? 1 : 0) - LENS.mv)*.08; }
      return (k, fn) => { ctx.save(); ctx.translate(W/2, H/2); ctx.scale(f,f); ctx.translate(-cx - ptr.x*k*drift, -cy - ptr.y*k*.6*drift); fn(); ctx.restore(); };
    };
    drawSkyRef = () => drawSky(t);
    if (snapPending){
      // freeze the outgoing shot exactly as it looked, then start the new shot's own camera
      snapPending = false;
      const oldLayer = view();
      ctx = bctx; ctx.setTransform(dpr,0,0,dpr,0,0); ctx.fillStyle = '#05070d'; ctx.fillRect(0,0,W,H);
      renderScene(snapScene, t, oldLayer);
      ctx = mainCtx;
      if (snapCam){ Object.assign(cam, snapCam.from); camTw = snapCam; snapCam.t0 = t; snapCam = null; }
      sceneT0 = t;
    }
    const layer = view();
    const fu = clamp((t - sceneT0)/sceneFade, 0, 1);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.fillStyle = '#05070d'; ctx.fillRect(0,0,W,H);
    renderScene(scene, t, layer);
    if (prevScene && fu < 1){
      // the outgoing shot keeps drifting forward while it dissolves, so nothing ever stops dead
      const k = 1 + snapZ*(t - sceneT0)/1000, ew = cv.width*k, eh = cv.height*k;
      ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.globalAlpha = 1 - fu*fu*(3-2*fu); ctx.drawImage(buf,(cv.width-ew)/2,(cv.height-eh)/2,ew,eh);
      ctx.globalAlpha = .35*Math.sin(Math.PI*fu); ctx.fillStyle = '#000'; ctx.fillRect(0,0,cv.width,cv.height); ctx.restore(); }
    else prevScene = null;
    headWorld = {x:RX + (36+34)*RS, y:RY - (142+30)*RS};
    if (FX.grade > 0 || FX.ash || FX.flash > 0 || FX.streak > 0) drawFX(t, dt);
    // vignette
    if (vgKey !== W+'x'+H){ vgKey = W+'x'+H; vgCache = ctx.createRadialGradient(W/2,H*.45,Math.min(W,H)*.25,W/2,H/2,Math.max(W,H)*.75); vgCache.addColorStop(0,'rgba(0,0,0,0)'); vgCache.addColorStop(1,'rgba(0,0,0,.72)'); }
    ctx.fillStyle = vgCache; ctx.fillRect(0,0,W,H);
    // grain
    if (grainPat && !reduce){ if (t - grainT > 41){ grainT = t; grainX = Math.random()*160; grainY = Math.random()*160; } ctx.save(); ctx.globalAlpha = .75; ctx.translate(grainX, grainY); ctx.fillStyle = grainPat; ctx.fillRect(-160,-160,W+320,H+320); ctx.restore(); }
    if (!reduce && !still) filmLook(t);
    requestAnimationFrame(frame);
  }
  /* trailer look: colour grade, drifting ash and embers, lightning, a lens streak */
  const FX = {grade:0, gradeT:0, ash:false, flash:0, streak:0, streakT:0};
  const emberSpr = document.createElement('canvas'); emberSpr.width = emberSpr.height = 32;
  { const g = emberSpr.getContext('2d'), rg = g.createRadialGradient(16,16,0,16,16,16); rg.addColorStop(0,'rgba(255,220,150,1)'); rg.addColorStop(.25,'rgba(255,150,60,.75)'); rg.addColorStop(1,'rgba(255,90,20,0)'); g.fillStyle = rg; g.fillRect(0,0,32,32); }
  const ash = []; for (let i=0;i<110;i++) ash.push({x:Math.random(), y:Math.random(), z:.3+Math.random()*1.2, p:Math.random()*6.28, ember:Math.random()<.22});
  function drawFX(t, dt){
    ctx.save(); ctx.setTransform(dpr,0,0,dpr,0,0);
    FX.grade += (FX.gradeT - FX.grade)*Math.min(1, dt*1.2);
    if (FX.grade > .01){
      const g = ctx.createLinearGradient(0,0,0,H);
      g.addColorStop(0, `rgba(20,90,110,${.5*FX.grade})`); g.addColorStop(.55, `rgba(10,30,50,${.25*FX.grade})`); g.addColorStop(1, `rgba(190,110,40,${.38*FX.grade})`);
      ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
      ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgba(150,160,190,${.35*FX.grade})`; ctx.fillRect(0,0,W,H);
      ctx.globalCompositeOperation = 'source-over';
    }
    if (FX.ash && !reduce){
      const nA = rscale < .8 ? 55 : ash.length;
      for (let ai = 0; ai < nA; ai++){ const a = ash[ai];
        a.y -= dt*.012*a.z*(a.ember ? 2.2 : -.8); a.x += Math.sin(t/2200 + a.p)*dt*.006*a.z;
        if (a.y < -.05) a.y = 1.05; if (a.y > 1.05) a.y = -.05;
        const x = a.x*W, y = a.y*H, r = (a.ember ? 1.4 : 1.1)*a.z*Math.max(1, W/700);
        const fl = .5 + .5*Math.sin(t/300 + a.p*3);
        if (a.ember){ const s2 = r*7; ctx.globalAlpha = .3+.55*fl; ctx.drawImage(emberSpr, x-s2/2, y-s2/2, s2, s2); ctx.globalAlpha = 1; }
        else { ctx.fillStyle = `rgba(200,205,215,${.18*a.z})`; ctx.fillRect(x-r, y-r, r*2, r*2); }
      }
    }
    FX.streak += (FX.streakT - FX.streak)*Math.min(1, dt*1.5);
    if (FX.streak > .01){
      const y = H*.5, g = ctx.createLinearGradient(0,0,W,0);
      g.addColorStop(0,'rgba(120,180,255,0)'); g.addColorStop(.5,`rgba(190,220,255,${.55*FX.streak})`); g.addColorStop(1,'rgba(120,180,255,0)');
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(0, y-1.5, W, 3);
      const rg = ctx.createRadialGradient(W/2,y,0,W/2,y,H*.35); rg.addColorStop(0,`rgba(150,190,255,${.22*FX.streak})`); rg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle = rg; ctx.fillRect(0,0,W,H); ctx.globalCompositeOperation = 'source-over';
    }
    if (FX.flash > 0){ ctx.fillStyle = `rgba(225,235,255,${Math.min(.85, FX.flash)})`; ctx.fillRect(0,0,W,H); FX.flash = Math.max(0, FX.flash - dt*2.6); }
    ctx.restore();
  }

  /* a 35mm print: tungsten warmth, deep blacks, gate weave, flicker, dust and the odd scratch, all at 24 frames a second */
  const FL = {fl:0, dust:[], scratch:null, wx:0, wy:0, lastT:0};
  const LENS = {x:0, y:0, mv:0}, DF = {c:document.createElement('canvas')}; DF.x = DF.c.getContext('2d');
  const BL = {c:document.createElement('canvas')}; BL.x = BL.c.getContext('2d'); BL.ok = typeof BL.x.filter === 'string' && !/^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  function filmLook(t){
    if (t - FL.lastT > 41){
      FL.lastT = t;
      FL.fl = (Math.random() - .5) * .018;
      FL.wx = clamp(FL.wx * .7 + (Math.random() - .5) * .8, -1.1, 1.1); FL.wy = clamp(FL.wy * .7 + (Math.random() - .5) * .6, -.9, .9);
      // no gate-weave shake: it read as judder
      FL.dust = []; const n = Math.random() < .45 ? 1 + Math.floor(Math.random() * 3) : 0;
      for (let i = 0; i < n; i++) FL.dust.push({x:Math.random() * W, y:Math.random() * H, r:.5 + Math.random() * 1.6, a:Math.random() * 6.28, l:Math.random() < .35 ? 5 + Math.random() * 12 : 0, w:Math.random() < .7});
      if (!FL.scratch && Math.random() < .015) FL.scratch = {x:Math.random() * W, n:5 + Math.floor(Math.random() * 18)};
      if (FL.scratch && --FL.scratch.n <= 0) FL.scratch = null;
    }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    // light the way a lens sees it: highlights bloom and bleed into the dark, shadows sink
    if (BL.ok){
      // cinematic depth of field: sharp where the story is, the frame's edges fall softly out of focus (more so while the camera moves)
      // the soft passes are refreshed every other frame and reused in between: same look, half the work
      FL.n = (FL.n || 0) + 1; const fresh = (FL.n & 1) === 0 || !FL.ready; FL.ready = true;
      { const w = Math.max(2, cv.width >> 2), h = Math.max(2, cv.height >> 2), k = w / cv.width * dpr;
        if (DF.c.width !== w || DF.c.height !== h){ DF.c.width = w; DF.c.height = h; }
        if (fresh){
        DF.x.globalCompositeOperation = 'copy'; DF.x.filter = `blur(${(1.3 + LENS.mv*1.6).toFixed(2)}px)`; DF.x.drawImage(cv, 0, 0, w, h); DF.x.filter = 'none';
        const fx = clamp(LENS.x, W*.2, W*.8)*k, fy = clamp(LENS.y, H*.2, H*.8)*k, R = Math.max(w, h);
        const g = DF.x.createRadialGradient(fx, fy, R*.14, fx, fy, R*.62);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
        DF.x.globalCompositeOperation = 'destination-in'; DF.x.fillStyle = g; DF.x.fillRect(0, 0, w, h); }
        ctx.globalAlpha = .92; ctx.drawImage(DF.c, 0, 0, cv.width, cv.height); ctx.globalAlpha = 1; }
      const w = Math.max(2, cv.width >> 2), h = Math.max(2, cv.height >> 2);
      if (BL.c.width !== w || BL.c.height !== h){ BL.c.width = w; BL.c.height = h; BL.c2 = BL.c2 || document.createElement('canvas'); BL.c2.width = w; BL.c2.height = h; BL.x2 = BL.c2.getContext('2d'); }
      if (fresh){
        BL.x.globalCompositeOperation = 'copy'; BL.x.filter = 'brightness(.9) contrast(2.4) blur(3px)'; BL.x.drawImage(cv, 0, 0, w, h); BL.x.filter = 'none';
        // the wide shadow-glow is blurred here, on the small canvas, instead of over the whole screen
        BL.x2.globalCompositeOperation = 'copy'; BL.x2.filter = 'blur(2.5px)'; BL.x2.drawImage(BL.c, 0, 0); BL.x2.filter = 'none';
      }
      ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = .5; ctx.drawImage(BL.c, 0, 0, cv.width, cv.height);
      ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = .15; ctx.drawImage(BL.c2, 0, 0, cv.width, cv.height);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
    ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = 'rgba(255,168,88,.30)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = FL.fl > 0 ? `rgba(255,236,200,${FL.fl * .5})` : `rgba(0,0,0,${-FL.fl})`; ctx.fillRect(0, 0, W, H);
    for (const d of FL.dust){
      ctx.fillStyle = ctx.strokeStyle = d.w ? 'rgba(235,228,210,.5)' : 'rgba(8,6,4,.7)';
      if (d.l){ ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.quadraticCurveTo(d.x + d.l * .6, d.y + d.l * .3, d.x + Math.cos(d.a) * d.l, d.y + Math.sin(d.a) * d.l); ctx.stroke(); }
      else { ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.283); ctx.fill(); }
    }
    if (FL.scratch){ ctx.fillStyle = 'rgba(230,225,210,.16)'; ctx.fillRect(FL.scratch.x + Math.sin(t / 50) * 1.5, 0, 1, H); }
    ctx.restore();
  }
  let shakeOff = 0;
  const _drawRaven = drawRaven;
  drawRaven = (t) => { const s = shake; shake = shakeOff; _drawRaven(t); shake = s; };

  new ResizeObserver(size).observe(cv);
  size(); requestAnimationFrame(frame);

  /* the mouse no longer steers Corvin's head or the camera: it made the picture feel laggy */

  return {
    setTalking(v){ talking = v; if (!v){ mouth = 0; quoteMode = false; } },
    setScene(name, ms=2800, move){
      if (!name || (name === scene && !move)) return;
      // how fast the old shot was zooming, so its dissolve keeps the same motion
      snapZ = camTw && camTw.lin ? Math.max(0, (camTw.to.z - camTw.from.z)/camTw.dur) * 1000 * .6 / Math.max(1, cam.z) : .004;
      snapScene = scene; snapPending = true;
      prevScene = scene; scene = name; sceneT0 = now(); sceneFade = reduce ? 1 : ms;
      if (window.__roomFilm) window.__roomFilm.show(name, ms);
      const [fx, fy] = focusOf(name);
      if (reduce){ Object.assign(cam, {z:1, cx:fx, cy:fy}); camTw = null; snapCam = null; return; }
      if (move){
        const m = move;
        snapCam = {from:{z:m.z0, cx:fx + (m.x0||0), cy:fy + (m.y0||0)}, to:{z:m.z1, cx:fx + (m.x1||0), cy:fy + (m.y1||0)}, t0:0, dur:m.dur, lin:true};
      } else snapCam = {from:{z:1.08, cx:fx, cy:fy}, to:{z:1, cx:fx, cy:fy}, t0:0, dur:12000, lin:false};
    },
    still(v){ still = !!v; },
    ravenOnly(fn){ ravenFn = fn || null; },
    get scene(){ return scene; },
    fx(o){ if ('grade' in o) FX.gradeT = o.grade; if ('ash' in o) FX.ash = o.ash; if ('flash' in o) FX.flash = o.flash; if ('streak' in o) FX.streakT = o.streak; },
    focus(){ return focusOf(scene); },
    setMouth(v){ mouth = v; },
    setQuote(v){ quoteMode = v; },
    gesture,
    camTo,
    look(x,y,ms){ lookTarget = {x,y}; lookUntil = now()+ms; },
    shower(n){ if (reduce) return; for (let i = 0; i < n; i++) setTimeout(() => meteors.push({x:600+Math.random()*260, y:-20+Math.random()*120, v:480+Math.random()*320, l:90+Math.random()*120, life:1}), i*170 + Math.random()*120); },
    flash(v){ if (!reduce) FX.flash = Math.max(FX.flash, v); },
    hop(){ Sound.init(); Sound.caw(); if (reduce){ gesture('beak',.9,450); return; } hopV = 330; squash = -.08; gesture('beak', 1, 520, 80); gesture('hackle', 1.4, 900); gesture('wing', .35, 500); gesture('lean', .4, 700, 100); shake = 0; },
    pose(name){
      const P = {
        nod(){ gesture('headRot', .16, 300); },
        tilt(){ gesture('headRot', -.28, 1100); gesture('yaw', .5, 1100); },
        flick(){ gesture('wing', .3, 380); gesture('hackle', .8, 500); },
        aside(){ gesture('yaw', -.6, 1100); gesture('headRot', -.1, 1100); },
        bow(){ gesture('headRot', .55, 1500); gesture('lean', .5, 1500); gesture('wing', .25, 1500); gesture('crouch', .6, 1500); },
        lean(){ gesture('lean', .6, 2600); gesture('headRot', .12, 2600); gesture('hackle', 1, 2600); },
        spread(){ gesture('wing', 1.05, 2600); gesture('spread', 1, 2600); gesture('hackle', 1.4, 2600); gesture('headRot', -.18, 2600); },
        up(){ lookTarget = {x:700,y:110}; lookUntil = now()+2200; }
      };
      P[name] && P[name]();
    }
  };
})();
window.CorvinRig = Film;
})();
