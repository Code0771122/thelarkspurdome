/* Larkspur polish: ripples, a gold cursor ring, haptic taps, an iris-in on load, film light leaks and clue stamps.
   Shared by the story game and the party game. Everything here is decoration: if any of it fails, the game carries on. */
(() => {
  try {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const css = `
.lp-rpl{position:fixed;pointer-events:none;overflow:hidden;z-index:2147483000}
.lp-rpl i{position:absolute;border-radius:50%;background:radial-gradient(circle,rgba(255,236,190,.38),rgba(227,194,122,.16) 45%,rgba(227,194,122,0) 70%);transform:translate(-50%,-50%) scale(0);animation:lpR .6s cubic-bezier(.2,.7,.2,1) forwards}
@keyframes lpR{to{transform:translate(-50%,-50%) scale(1);opacity:0}}
html.lp-cur,html.lp-cur *{cursor:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 24 24'%3E%3Cpath d='M6.36 4.74 Q6.60 3.00 7.84 4.24 L17.10 13.50 Q18.40 14.80 16.56 14.93 L10.38 15.36 Q8.30 15.50 6.85 16.99 L5.58 18.28 Q4.30 19.60 4.55 17.78 Z' transform='translate%28.5 1.3%29' fill='rgba%280,0,0,.35%29'/%3E%3Cpath d='M6.36 4.74 Q6.60 3.00 7.84 4.24 L17.10 13.50 Q18.40 14.80 16.56 14.93 L10.38 15.36 Q8.30 15.50 6.85 16.99 L5.58 18.28 Q4.30 19.60 4.55 17.78 Z' fill='none' stroke='rgba%28255,255,255,.75%29' stroke-width='1.7' stroke-linejoin='round'/%3E%3Cpath d='M6.36 4.74 Q6.60 3.00 7.84 4.24 L17.10 13.50 Q18.40 14.80 16.56 14.93 L10.38 15.36 Q8.30 15.50 6.85 16.99 L5.58 18.28 Q4.30 19.60 4.55 17.78 Z' fill='%23050506'/%3E%3C/svg%3E") 8 4,default!important}
html.lp-cur :is(button,a,[role="button"],.pill,.btn,label,summary,select,.guest,.place,.dk-chips span),html.lp-cur :is(button,a,[role="button"],.pill,.btn,label,summary,select,.guest,.place) *{cursor:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 24 24'%3E%3Cpath d='M6.36 4.74 Q6.60 3.00 7.84 4.24 L17.10 13.50 Q18.40 14.80 16.56 14.93 L10.38 15.36 Q8.30 15.50 6.85 16.99 L5.58 18.28 Q4.30 19.60 4.55 17.78 Z' transform='translate%28.5 1.3%29' fill='rgba%280,0,0,.35%29'/%3E%3Cpath d='M6.36 4.74 Q6.60 3.00 7.84 4.24 L17.10 13.50 Q18.40 14.80 16.56 14.93 L10.38 15.36 Q8.30 15.50 6.85 16.99 L5.58 18.28 Q4.30 19.60 4.55 17.78 Z' fill='none' stroke='rgba%280,0,0,.55%29' stroke-width='1.7' stroke-linejoin='round'/%3E%3Cpath d='M6.36 4.74 Q6.60 3.00 7.84 4.24 L17.10 13.50 Q18.40 14.80 16.56 14.93 L10.38 15.36 Q8.30 15.50 6.85 16.99 L5.58 18.28 Q4.30 19.60 4.55 17.78 Z' fill='%23e8c984'/%3E%3C/svg%3E") 8 4,pointer!important}
html.lp-cur input[type="text"],html.lp-cur input[type="search"],html.lp-cur input:not([type]),html.lp-cur textarea,html.lp-cur [contenteditable="true"]{cursor:text!important}
.lp-iris{position:fixed;inset:0;z-index:2147483002;pointer-events:none;background:#000;-webkit-mask:radial-gradient(circle at 50% 46%,transparent var(--r,0%),#000 calc(var(--r,0%) + 8%));mask:radial-gradient(circle at 50% 46%,transparent var(--r,0%),#000 calc(var(--r,0%) + 8%))}
.lp-leak{position:fixed;inset:-10%;z-index:2147482990;pointer-events:none;mix-blend-mode:screen;background:radial-gradient(40% 60% at 0% 40%,rgba(255,140,40,.55),transparent 70%),radial-gradient(30% 50% at 10% 80%,rgba(255,60,30,.35),transparent 70%),linear-gradient(100deg,rgba(255,190,110,.0) 30%,rgba(255,200,130,.25) 45%,rgba(255,190,110,0) 60%);animation:lpLeak 2.4s ease-out forwards}
@keyframes lpLeak{0%{opacity:0;transform:translateX(-25%)}25%{opacity:1}100%{opacity:0;transform:translateX(30%)}}
.lp-toast{position:fixed;left:50%;bottom:calc(96px + env(safe-area-inset-bottom,0px));z-index:2147482995;display:flex;align-items:center;gap:14px;padding:12px 18px 12px 12px;border-radius:28px;background:rgba(28,26,32,.72);backdrop-filter:blur(28px) saturate(1.9);-webkit-backdrop-filter:blur(28px) saturate(1.9);border:1px solid rgba(255,255,255,.07);box-shadow:0 20px 50px -18px #000;color:#efe6cf;font:500 14px/1.3 'Spectral',Georgia,serif;transform:translate(-50%,30px);opacity:0;transition:transform .5s cubic-bezier(.2,.7,.2,1),opacity .5s;pointer-events:none;max-width:calc(100% - 32px)}
.lp-toast.on{transform:translate(-50%,0);opacity:1}
@media (min-width:900px) and (orientation:landscape) and (min-height:520px){.lp-toast{bottom:auto;top:calc(92px + env(safe-area-inset-top,0px));transform:translate(-50%,-20px)}.lp-toast.on{transform:translate(-50%,0)}}
.lp-toast small{display:block;font:500 10px/1 'IBM Plex Mono',ui-monospace,monospace;letter-spacing:.2em;text-transform:uppercase;color:#b39a68;margin-bottom:5px}
.lp-stamp{flex:none;width:46px;height:46px;border-radius:50%;display:grid;place-items:center;border:2px solid rgba(200,60,50,.85);color:rgba(220,80,65,.95);font:700 10px/1 'IBM Plex Mono',ui-monospace,monospace;letter-spacing:.12em;transform:rotate(-14deg);animation:lpStamp .45s cubic-bezier(.3,1.6,.5,1) both}
@keyframes lpStamp{from{transform:rotate(-14deg) scale(2.2);opacity:0}to{transform:rotate(-14deg) scale(1);opacity:1}}
.lp-bump{animation:lpBump .6s cubic-bezier(.3,1.6,.5,1)}
@keyframes lpBump{40%{transform:scale(1.18)}}
`;
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    const HOT = 'button, a, [role="button"], .pill, .btn, label, summary, select, input[type="checkbox"], input[type="range"], .guest, .place, .dk-chips span';

    /* ripples, from wherever you touched */
    addEventListener('pointerdown', e => {
      const el = e.target.closest && e.target.closest(HOT); if (!el || reduce) return;
      const r = el.getBoundingClientRect(); if (r.width < 8 || r.height < 8) return;
      const box = document.createElement('span'); box.className = 'lp-rpl';
      Object.assign(box.style, {left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', borderRadius: getComputedStyle(el).borderRadius});
      const dot = document.createElement('i'), d = Math.hypot(r.width, r.height) * 2.1;
      Object.assign(dot.style, {left: (e.clientX - r.left) + 'px', top: (e.clientY - r.top) + 'px', width: d + 'px', height: d + 'px'});
      box.appendChild(dot); document.body.appendChild(box); setTimeout(() => box.remove(), 650);
      if (navigator.vibrate && e.pointerType === 'touch') try { navigator.vibrate(8); } catch (_) {}
    }, {passive: true, capture: true});

    /* the arrow is a real system pointer, drawn by the computer itself: it moves at your screen's full refresh rate, with no lag */
    if (fine) document.documentElement.classList.add('lp-cur');

    /* the picture opens like a camera iris */
    if (!reduce){
      const iris = document.createElement('div'); iris.className = 'lp-iris'; document.body.appendChild(iris);
      const t0 = performance.now(), dur = 1500;
      const step = t => { const u = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - u, 3); iris.style.setProperty('--r', (e * 95).toFixed(1) + '%');
        if (u < 1) requestAnimationFrame(step); else iris.remove(); };
      requestAnimationFrame(step);
    }

    /* a warm light leak across the frame: new chapters, new acts */
    let leakT = 0;
    window.lightLeak = () => { if (reduce || performance.now() - leakT < 1500) return; leakT = performance.now();
      const l = document.createElement('div'); l.className = 'lp-leak'; document.body.appendChild(l); setTimeout(() => l.remove(), 2500); };

    /* a toast, stamped */
    let toastEl = null, toastTimer = 0;
    window.lpToast = (title, sub, stamp) => {
      if (!toastEl){ toastEl = document.createElement('div'); toastEl.className = 'lp-toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
      toastEl.innerHTML = `<span class="lp-stamp">${stamp || 'NOTED'}</span><span><small>${sub || ''}</small>${title}</span>`;
      requestAnimationFrame(() => toastEl.classList.add('on'));
      clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('on'), 3200);
    };

    /* story game: chapter cards and the notebook */
    const card = document.getElementById('card');
    if (card) new MutationObserver(() => { if (card.classList.contains('on')) window.lightLeak(); }).observe(card, {attributes: true, attributeFilter: ['class']});
    const nb = document.getElementById('nbCount');
    if (nb){ let last = +nb.textContent || 0;
      new MutationObserver(() => { const n = +nb.textContent || 0;
        if (n > last){ window.lpToast('A new clue, in your notebook', 'Clue ' + n, 'NOTED');
          const pill = nb.closest('.pill') || nb; pill.classList.remove('lp-bump'); void pill.offsetWidth; pill.classList.add('lp-bump'); }
        last = n; }).observe(nb, {childList: true, characterData: true, subtree: true}); }
  } catch (e) { /* decoration only */ }
})();

