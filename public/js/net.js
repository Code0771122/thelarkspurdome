// The game's connection to the house. Same shape as the laptop version's socket
// (socket.on / socket.emit(event, data, reply) / socket.connect), but over plain web requests,
// so it works on any network, anywhere: every couple of seconds it asks the server what's new.
// window.NET = { role: 'host' | 'player', room: 'ABCD', key | pid }
window.io = function (opts = {}) {
  const N = window.NET;
  const handlers = {};
  const fire = (e, d) => (handlers[e] || []).forEach(fn => { try { fn(d); } catch (err) { console.error(err); } });
  let cursor = {}, running = false, down = false, fails = 0, chain = Promise.resolve(), timer = null;

  function call(a, d) {
    // one request at a time, in order, so nothing is shown twice or missed
    const job = chain.then(async () => {
      const body = { a, d, room: N.room, c: cursor };
      if (N.role === 'host') body.key = N.key; else body.pid = N.pid;
      const r = await fetch('/api', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' });
      const j = await r.json();
      if (j.c) cursor = j.c;
      if (down) { down = false; fire('connect'); }
      fails = 0;
      (j.events || []).forEach(ev => fire(ev.e, ev.d));
      return j.ack;
    });
    chain = job.catch(() => {});
    return job;
  }
  const every = () => N.role === 'host' ? 2000 : (document.hidden ? 8000 : 2500);
  function loop() {
    clearTimeout(timer);
    if (!running) return;
    call(N.role === 'host' ? 'host:poll' : 'p:poll', {})
      .catch(() => { fails++; if (!down && fails >= 2) { down = true; fire('disconnect'); } })
      .finally(() => { timer = setTimeout(loop, fails ? Math.min(10000, 1500 * fails) : every()); });
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && running) loop(); });

  const api = {
    on(e, fn) { (handlers[e] = handlers[e] || []).push(fn); return api; },
    emit(e, d = {}, cb) {
      if (e === 'host:hello' && d.key) N.key = d.key;
      call(e, d).then(ack => {
        if (e === 'p:hello' && ack && ack.pid) { N.pid = ack.pid; try { localStorage.setItem('pid:' + N.room, ack.pid); } catch {} }
        if (e === 'host:hello' && ack && ack.ok && !running) { running = true; setTimeout(loop, every()); }
        if (e === 'p:hello' && ack && ack.pid && !running) { running = true; setTimeout(loop, every()); }
        if (typeof cb === 'function') cb(ack || {});
      }).catch(() => { if (typeof cb === 'function') cb({ error: 'No connection. Check the Wi-Fi or mobile data and try again.' }); });
      return api;
    },
    connect() { setTimeout(() => fire('connect'), 0); return api; },
    disconnect() { running = false; clearTimeout(timer); return api; }
  };
  if (opts.autoConnect !== false) api.connect();
  return api;
};
// open a brand-new table (laptop only)
window.createGame = async () => {
  const r = await fetch('/api', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ a: 'create' }) });
  return (await r.json()).ack;
};
