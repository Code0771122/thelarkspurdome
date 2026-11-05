// Full screen everywhere: the first tap on a page asks for it, the ⛶ button and the F key toggle it.
(() => {
  const d = document.documentElement;
  const isFull = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
  const standalone = matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || navigator.standalone;
  window.goFull = () => {
    if (isFull() || standalone) return;
    try {
      const p = d.requestFullscreen ? d.requestFullscreen({ navigationUI: 'hide' }) : d.webkitRequestFullscreen && d.webkitRequestFullscreen();
      if (p && p.catch) p.catch(() => {});
    } catch (e) {}
  };
  window.toggleFull = () => {
    if (!isFull()) return goFull();
    try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) {}
  };
  // first deliberate tap anywhere: go full screen (browsers only allow it from a tap or click)
  let asked = false;
  const first = e => { if (asked) return; if (e.target.closest && e.target.closest('input, textarea, select')) return; asked = true; goFull(); };
  addEventListener('pointerup', first, true);
  addEventListener('keydown', e => {
    if ((e.key === 'f' || e.key === 'F') && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '')) { e.preventDefault(); toggleFull(); }
  });
  const sync = () => { document.body && document.body.classList.toggle('is-full', isFull()); document.querySelectorAll('[data-fs]').forEach(b => { b.setAttribute('aria-pressed', String(isFull())); b.title = isFull() ? 'Leave full screen (F)' : 'Full screen (F)'; }); };
  document.addEventListener('fullscreenchange', sync); document.addEventListener('webkitfullscreenchange', sync);
  addEventListener('DOMContentLoaded', () => { document.querySelectorAll('[data-fs]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); toggleFull(); })); sync(); });
})();
