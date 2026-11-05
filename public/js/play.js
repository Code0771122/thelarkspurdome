(() => {
  const $ = id => document.getElementById(id);
  const N = window.NET;
  if (!N.room) {
    $('s-room').hidden = false; $('progress').hidden = true;
    $('fRoom').onsubmit = e => { e.preventDefault(); const v = $('roomIn').value.toUpperCase().replace(/[^A-Z]/g, ''); if (v.length === 4) location.href = '/play?room=' + v; else $('roomErr').textContent = 'The code is four letters.'; };
    return;
  }
  const socket = io();
  const STAGES = ['s-room', 's-name', 's-intake', 's-pending', 's-dossier', 's-ended'];
  let current = null, lastAct = null, D = null, ST = null;
  const seen = new Set(JSON.parse((() => { try { return localStorage.getItem('seen:' + N.room) || '[]'; } catch { return '[]'; } })()));
  const keepSeen = () => { try { localStorage.setItem('seen:' + N.room, JSON.stringify([...seen])); } catch {} };
  const show = id => {
    STAGES.forEach(s => ($(s).hidden = s !== id));
    const step = { 's-name': 0, 's-intake': 1, 's-pending': 2 }[id];
    $('progress').hidden = step === undefined;
    [...$('progress').children].forEach((li, i) => { li.className = i < step ? 'done' : i === step ? 'now' : ''; });
    if (current !== id) scrollTo({ top: 0, behavior: 'smooth' });
    current = id;
  };
  const toast = (msg, ms = 2600) => { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(t._h); t._h = setTimeout(() => (t.hidden = true), ms); };
  const note = (title, sub, stampTxt) => window.lpToast ? lpToast(title, sub, stampTxt) : toast(title);
  const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

  socket.on('connect', () => { $('offline').hidden = true; socket.emit('p:hello', { pid: N.pid }, r => {
    if (r && r.error && !r.pid) { $('s-ended').querySelector('h1').textContent = 'Not this time'; $('s-ended').querySelector('.lede').textContent = r.error; show('s-ended'); return; }
    onStage(r); }); });
  socket.on('disconnect', () => { setTimeout(() => { $('offline').hidden = false; }, 1500); });
  socket.on('stage', onStage);
  socket.on('seats', seats);
  socket.on('ended', t => { if (t && t.rows) ended(t); show('s-ended'); });
  socket.on('kicked', () => { try { localStorage.setItem('pid:' + N.room, ''); } catch {} N.pid = null; location.reload(); });

  function seats(s) {
    if (!s) return;
    const left = g => Math.max(0, s[g].need - s[g].taken);
    $('leftF').textContent = left('F') ? `${left('F')} of 7 left` : 'All taken';
    $('leftM').textContent = left('M') ? `${left('M')} of 3 left` : 'All taken';
    document.querySelector('input[name=gender][value=F]').disabled = !left('F');
    document.querySelector('input[name=gender][value=M]').disabled = !left('M');
    $('cntF').textContent = `${s.F.taken}/7`; $('cntM').textContent = `${s.M.taken}/3`;
    $('barF').style.width = `${Math.min(100, 100 * s.F.taken / 7)}%`; $('barM').style.width = `${Math.min(100, 100 * s.M.taken / 3)}%`;
  }

  function onStage(st) {
    if (!st) return;
    if (st.seats) seats(st.seats);
    if (st.stage === 'name') show('s-name');
    if (st.stage === 'intake') show('s-intake');
    if (st.stage === 'pending') { D = null; bookBuilt = false; $('pendName').textContent = `Signed in as ${st.name}`; show('s-pending'); }
    if (st.stage === 'late') { $('s-ended').querySelector('h1').textContent = 'The dossiers have gone out'; $('s-ended').querySelector('.lede').textContent = 'This game started without you. Ask the host to add you next time.'; show('s-ended'); return; }
    if (st.stage === 'dossier') {
      const fresh = $('s-dossier').hidden && st.phase !== 'ended';
      if (st.dossier) { D = st.dossier; fill(D); }
      if (!D) return;
      ST = st;
      act(st); goals(st.goals); clues(st); vote(st.vote); oath(st); whisper(st.whisper); scene(st.actInfo && st.actInfo.scene); alibis(st); casefile(st); inquiries(st); casebook();
      show(st.phase === 'ended' ? 's-ended' : 's-dossier');
      if (fresh) { window.lightLeak && lightLeak(); note('Your dossier has arrived', 'Larkspur House', 'SEALED'); buzz([30, 60, 30]); try { window.Film && Film.pose('spread'); } catch (e) {} }
    }
  }

  $('fName').onsubmit = e => {
    e.preventDefault(); $('nameErr').textContent = '';
    window.goFull && goFull();
    const g = (document.querySelector('input[name=gender]:checked') || {}).value;
    if (!g) { $('nameErr').textContent = 'Choose a lady’s part or a gentleman’s part.'; return; }
    socket.emit('p:name', { name: $('name').value, gender: g }, r => r.error ? ($('nameErr').textContent = r.error) : onStage(r));
  };

  // ------------------------------------------------ the police form
  const FORM = {};
  document.querySelectorAll('#fIntake .seg').forEach(seg => seg.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    FORM[seg.dataset.f] = b.dataset.v; [...seg.children].forEach(x => x.classList.toggle('on', x === b)); buzz(10);
  }));
  const SW = { Black: '#111', White: '#eee', Navy: '#1d2a50', Blue: '#2f5fb3', Red: '#a3262a', Green: '#2f6b3b', Grey: '#808080', Cream: '#efe4c8', Pink: '#e6a3b8', Gold: '#c9a35a', Brown: '#6b4428', Purple: '#5e3a7e', Yellow: '#e2c23a', Orange: '#d9772b' };
  Object.entries(SW).forEach(([c, hex]) => {
    const b = el('button', 'sw', c); b.type = 'button'; b.style.setProperty('--sw', hex);
    b.onclick = () => { FORM.top = c.toLowerCase(); document.querySelectorAll('.sw').forEach(x => x.classList.toggle('on', x === b)); buzz(10); };
    $('swatches').appendChild(b);
  });
  $('fIntake').onsubmit = e => {
    e.preventDefault(); $('intakeErr').textContent = '';
    const miss = ['hand', 'watch', 'ring', 'top'].filter(k => !FORM[k]);
    if (miss.length) { $('intakeErr').textContent = 'Every line of the form must be filled in.'; return; }
    socket.emit('p:intake', FORM, r => { if (r.error) { $('intakeErr').textContent = r.error; return; } note('Statement signed', 'Argyll County Constabulary', 'SIGNED'); onStage(r); });
  };
  if (/iPhone|iPad|iPod/.test(navigator.userAgent) && !navigator.standalone) $('iosTip').hidden = false;

  // ------------------------------------------------ this round's scene, faintly, behind the dossier
  let sceneKey = '';
  function scene(names) {
    const k = (names || []).join('|'); if (!k || k === sceneKey) return; sceneKey = k;
    const srcs = names.flatMap(n => [`/media/scenes/${n}.jpg`, `/media/stills/${n}.jpg`]); let i = 0;
    const img = new Image();
    img.onload = () => { document.querySelector('.bg').style.setProperty('--scene', `url("${img.src}")`); document.body.classList.add('has-scene'); };
    img.onerror = () => { i++; if (i < srcs.length) img.src = srcs[i]; };
    img.src = srcs[0];
  }

  // ------------------------------------------------ four alibis: pick one, locked when round IV begins
  function alibis(st) {
    const opts = (D && D.alibis) || []; if (!opts.length) return;
    const mine = st.alibi || 0, locked = !!st.alibiLocked;
    const fixed = !!D.alibiFixed; const lab = $('alibiState').parentElement; if (lab && lab.firstChild && lab.firstChild.nodeType === 3) lab.firstChild.textContent = fixed ? 'Your alibi \u00b7 ' : 'Choose your alibi \u00b7 ';
    $('alibiState').textContent = fixed ? 'fixed by your story: learn it, stick to it' : locked ? 'locked in' : 'you can change it until round IV';
    $('dClaim').textContent = opts[mine].claim;
    const ol = $('alibiList'); ol.innerHTML = '';
    opts.forEach((a, i) => {
      const li = el('li', (i === mine ? 'on' : '') + (locked && i !== mine ? ' off' : ''));
      const b = el('button'); b.type = 'button'; b.disabled = locked || fixed;
      b.appendChild(el('span', 'al-n', String.fromCharCode(65 + i)));
      const t = el('span', 'al-t'); t.appendChild(el('b', '', a.t)); t.appendChild(el('small', '', a.risk)); b.appendChild(t);
      b.onclick = () => socket.emit('p:alibi', { i }, r => { if (r && r.error) { toast(r.error); return; } onStage(r); buzz(20); note('Alibi chosen', a.t, 'ALIBI'); });
      li.appendChild(b); ol.appendChild(li);
    });
  }

  // ------------------------------------------------ the case file: every opened envelope, and everyone's statement
  let caseCount = 0;
  function casefile(st) {
    const list = (st.casefile || []).filter(x => x.id !== 'brief'), box = $('caseList'); box.innerHTML = '';
    if (!list.length) box.appendChild(el('p', 'note', 'Nothing yet. Exhibits arrive here as the envelopes are opened.'));
    list.slice().reverse().forEach(x => {
      const c = el('article', 'case-card k-' + x.kind);
      c.appendChild(el('div', 'cc-k', `${x.id} · read by ${x.by}${x.played ? ' (' + x.played + ')' : ''}`));
      c.appendChild(el('h3', 'cc-t', x.title)); c.appendChild(el('p', 'cc-x', x.text)); box.appendChild(c);
    });
    $('evN').textContent = list.length ? String(list.length) : '';
    if (caseCount && list.length > caseCount) { $('evN').classList.add('ping'); setTimeout(() => $('evN').classList.remove('ping'), 4000); }
    caseCount = list.length;
    const sts = st.statements || []; $('statements').hidden = !sts.length;
    const ol = $('stList'); ol.innerHTML = '';
    sts.forEach(s => { const li = el('li', D && s.key === D.key ? 'me' : ''); li.appendChild(el('b', '', s.name)); li.appendChild(el('span', '', s.where)); li.appendChild(el('small', '', s.played)); ol.appendChild(li); });
  }

  // ------------------------------------------------ inquiries: search warrants and the laboratory
  let labTimer = null;
  function inquiries(st) {
    const s = st.search, l = st.lab; if (!s || !l) return;
    $('warrantsLeft').textContent = !s.open ? (st.act < 2 ? 'from the discovery onwards' : 'closed') : `${s.left} of 2 left`;
    const done = $('searchDone'); done.innerHTML = '';
    s.done.forEach(r => { const c = el('article', 'found'); c.appendChild(el('div', 'cc-k', 'Search warrant · ' + r.t)); c.appendChild(el('p', 'cc-x', r.find)); done.appendChild(c); });
    const g = $('rooms'); g.innerHTML = '';
    s.rooms.forEach(r => {
      const was = s.done.some(x => x.k === r.k);
      const b = el('button', 'room' + (was ? ' was' : ''), r.t); b.type = 'button'; b.disabled = !s.open || was || s.left <= 0;
      b.onclick = () => { if (!confirmTap(b, `Search ${r.t}?`)) return; socket.emit('p:search', { k: r.k }, x => { if (x.error) { toast(x.error); return; } buzz([30, 30, 60]); note('Search warrant executed', x.room, 'SEARCHED'); onStage(x.stage); openTab('p-inq'); }); };
      g.appendChild(b);
    });
    const mine = $('labMine'); mine.innerHTML = ''; clearInterval(labTimer);
    if (l.mine) {
      const c = el('article', 'found lab'); c.appendChild(el('div', 'cc-k', 'Murder bag test · ' + l.mine.t));
      const p = el('p', 'cc-x'); c.appendChild(p); mine.appendChild(c);
      if (l.mine.result) p.textContent = l.mine.result;
      else { let left = l.mine.readyIn; const tick = () => { p.textContent = `Testing… results in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}…`; if (left-- <= 0) { clearInterval(labTimer); p.textContent = 'Results arriving…'; } }; tick(); labTimer = setInterval(tick, 1000); }
    }
    const ol = $('labList'); ol.innerHTML = ''; ol.hidden = !l.open;
    l.items.forEach(x => {
      const li = el('li'); const b = el('button'); b.type = 'button'; b.disabled = !x.ready;
      b.appendChild(el('span', 'vn', x.t)); b.appendChild(el('span', 'vp', x.ready ? 'Test it' : 'Not yet'));
      b.onclick = () => { if (!confirmTap(b, 'Your only test: use it on this?')) return; socket.emit('p:lab', { k: x.k }, r => { if (r.error) { toast(r.error); return; } note('Test under way', x.t, 'TESTING'); onStage(r.stage); }); };
      li.appendChild(b); ol.appendChild(li);
    });
    const n = (s.open ? s.left : 0) + (l.open ? 1 : 0); $('inqN').textContent = n ? String(n) : '';
  }
  function confirmTap(b, msg) {
    if (b.dataset.armed && Date.now() - b.dataset.armed < 3000) return true;
    b.dataset.armed = Date.now(); toast(msg + ' Tap again to confirm.'); return false;
  }
  socket.on('lab', x => { return; buzz([60, 40, 60, 40, 120]); note('Your test result is in', x.t, 'RESULT'); });

  // ------------------------------------------------ the casebook: motive, means, opportunity (kept on this phone only)
  const BK = 'book:' + N.room;
  const book = (() => { try { return JSON.parse(localStorage.getItem(BK) || '{}'); } catch { return {}; } })();
  const saveBook = () => { try { localStorage.setItem(BK, JSON.stringify(book)); } catch {} };
  let bookBuilt = false;
  function casebook() {
    if (bookBuilt || !D) return; bookBuilt = true;
    const box = $('mmo'); box.innerHTML = '';
    (D.company || []).filter(c => !c.me).forEach(c => {
      const row = el('div', 'mmo-row'), b = book[c.key] = book[c.key] || { m: false, w: false, o: false, n: '' };
      const head = el('div', 'mmo-h'); head.appendChild(el('b', '', c.name)); head.appendChild(el('small', '', c.played)); row.appendChild(head);
      const ticks = el('div', 'mmo-t');
      [['m', 'Motive'], ['w', 'Means'], ['o', 'Opportunity']].forEach(([k, t]) => {
        const x = el('button', 'tick' + (b[k] ? ' on' : ''), t); x.type = 'button';
        x.onclick = () => { b[k] = !b[k]; x.classList.toggle('on', b[k]); saveBook(); buzz(10); row.classList.toggle('all3', b.m && b.w && b.o); };
        ticks.appendChild(x);
      });
      row.appendChild(ticks); row.classList.toggle('all3', b.m && b.w && b.o);
      const ta = el('textarea', 'mmo-n'); ta.rows = 2; ta.placeholder = 'What do you know about them?'; ta.value = b.n || '';
      ta.oninput = () => { b.n = ta.value; saveBook(); }; row.appendChild(ta);
      box.appendChild(row);
    });
    $('timeline').value = book._timeline || ''; $('timeline').oninput = e => { book._timeline = e.target.value; saveBook(); };
    $('freeNotes').value = book._notes || ''; $('freeNotes').oninput = e => { book._notes = e.target.value; saveBook(); };
  }

  // ------------------------------------------------ Corvin's whispers
  let whisperId = null;
  function whisper(w) {
    $('whisperCard').hidden = true; return;
    if (!w) return;
    $('whisperT').textContent = w.text;
    if (w.id !== whisperId && whisperId !== null && !w.done) { buzz([30, 30, 30, 30, 90]); note('Corvin whispers to you', 'A secret mission', 'PSST'); }
    whisperId = w.id;
  }
  const doneWhisper = () => socket.emit('p:whisperDone', {}, r => {
    if (r && r.error) { toast(r.error); return; }
    whisper(r.whisper); $('spot').hidden = true; note('Mission done', 'One point', 'CAW'); buzz([30, 60, 30]);
  });
  $('whisperDone').onclick = doneWhisper;
  $('spotDone').onclick = doneWhisper;

  // ------------------------------------------------ the dossier
  const ACT_NAMES = ['The Arrival', 'Dinner', 'The Discovery', 'Everyone Had a Reason', 'The House at Midnight', 'The Accusation', 'The Truth'];
  function fill(d) {
    $('dName').textContent = d.name; $('dArch').textContent = d.archetype; $('dPublic').textContent = d.public;
    $('dEntrance').textContent = `“${d.part.entrance}”`; $('dVoice').textContent = d.part.voice; $('dCostume').textContent = d.part.costume;
    $('dManner').innerHTML = ''; d.mannerisms.forEach(m => $('dManner').appendChild(el('li', '', m)));
    $('dBeats').innerHTML = '';
    Object.entries(d.beats || {}).forEach(([i, t]) => { const li = el('li'); li.dataset.act = i; li.appendChild(el('b', '', ACT_NAMES[i] || '')); li.appendChild(el('span', '', t)); $('dBeats').appendChild(li); });
    $('dWhere').textContent = d.night.where; $('dClaim').textContent = d.night.claim; $('dTruth').textContent = d.night.truth; $('dSaw').textContent = d.night.saw;
    $('dSecret').textContent = d.secret; $('dDefend').textContent = d.defend; $('dDanger').textContent = d.danger;
    $('dDiary').innerHTML = ''; d.diary.forEach(n => $('dDiary').appendChild(el('p', 'diary', n)));
    const rel = $('dRel'); rel.innerHTML = '';
    (d.relations || []).forEach(r => {
      const c = el('div', 'rel-card'); c.appendChild(el('div', 'rel-n', r.name)); c.appendChild(el('div', 'rel-p', r.played ? `played by ${r.played}` : '')); c.appendChild(el('p', 'rel-t', r.text)); rel.appendChild(c);
    });
    const co = $('dCompany'); co.innerHTML = '';
    (d.company || []).forEach(c => {
      const li = el('li', c.me ? 'me' : ''); li.appendChild(el('div', 'c-n', c.name + (c.me ? ' (you)' : ''))); li.appendChild(el('div', 'c-a', c.archetype)); li.appendChild(el('div', 'c-p', c.played));
      li.title = c.public; co.appendChild(li);
    });
    const s = $('dSealed'); s.innerHTML = '';
    s.appendChild(el('p', 'headline', d.sealed.headline));
    d.sealed.account.concat(d.sealed.rules).forEach(t => s.appendChild(el('p', 'typed', t)));
    $('dGoals').innerHTML = '';
    d.goals.forEach((t, i) => {
      const li = el('li'); const lab = el('label', 'goal'); const cb = document.createElement('input'); cb.type = 'checkbox'; cb.dataset.i = i;
      cb.onchange = () => socket.emit('p:goal', { i, done: cb.checked }, r => { if (r && r.error) { cb.checked = !cb.checked; toast(r.error); return; } goals(r.goals); if (cb.checked) { note('Goal achieved', 'Two points', 'DONE'); buzz(30); } });
      lab.appendChild(cb); lab.appendChild(el('span', '', t)); li.appendChild(lab); $('dGoals').appendChild(li);
    });
  }
  function goals(g) {
    if (!g || !D) return;
    [...$('dGoals').querySelectorAll('input')].forEach((cb, i) => { cb.checked = !!g[i]; });
    const n = g.filter(Boolean).length; $('goalN').textContent = n ? `${n}/3` : '';
  }
  function clues(st) {
    const box = $('dClues'); box.innerHTML = '';
    const mine = (D.clues || []).filter(c => c.act <= st.act);
    let fresh = 0;
    if (!mine.length) box.appendChild(el('p', 'note', 'No envelopes yet. They arrive with the rounds.'));
    mine.forEach(c => {
      const card = el('article', 'clue-card' + ((st.opened || []).includes(c.id) ? ' read' : ''));
      card.appendChild(el('div', 'cc-k', `Envelope ${c.id}` + ((st.opened || []).includes(c.id) ? ' · read aloud' : ' · read when your name is called')));
      card.appendChild(el('h3', 'cc-t', c.title)); card.appendChild(el('p', 'cc-x', c.text));
      box.appendChild(card);
      if (!seen.has(c.id)) { fresh++; seen.add(c.id); }
    });
    $('clueN').textContent = mine.length ? String(mine.length) : '';
    if (fresh && false) { keepSeen(); buzz([60, 40, 60]); note(fresh === 1 ? 'A new envelope for you' : `${fresh} new envelopes for you`, 'See the Clues tab', 'CLUE'); $('clueN').classList.add('ping'); setTimeout(() => $('clueN').classList.remove('ping'), 4000); }
  }

  function act(st) {
    const a = st.actInfo; if (!a) return;
    $('abN').textContent = a.n; $('abTitle').textContent = `${a.n} · ${a.title}`; $('abDo').textContent = a.phone;
    const beat = D && D.beats && D.beats[st.act];
    $('abBeat').textContent = beat ? `Reveal this now: ${beat}` : '';
    [...$('dBeats').children].forEach(li => li.classList.toggle('now', Number(li.dataset.act) === st.act));
    if (lastAct !== null && lastAct !== st.act) { buzz(40); window.lightLeak && lightLeak(); note(a.title, `Act ${a.n}`, 'NEW ROUND'); if (beat) setTimeout(() => { buzz([20, 40, 20]); note('Reveal this now', beat + '  \u00b7  Keep your secret hidden.', 'THIS ROUND'); }, 3200); }
    lastAct = st.act;
  }
  $('actBanner').onclick = () => { const t = { 0: 'p-part', 1: 'p-nine', 2: 'p-nine', 3: 'p-book', 4: 'p-book', 5: 'p-vote' }[lastAct]; if (t && !(t === 'p-vote' && $('voteTab').hidden)) openTab(t); };

  function openTab(id) {
    [...$('tabs').children].forEach(x => x.setAttribute('aria-current', String(x.dataset.p === id)));
    document.querySelectorAll('.panel').forEach(p => (p.hidden = p.id !== id));
    const b = $('tabs').querySelector(`[data-p="${id}"]`); if (b) b.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }
  $('tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) openTab(b.dataset.p); });

  // ------------------------------------------------ the accusation
  let voteWasOpen = false;
  function pickList(ol, items, mineKey, field, label) {
    ol.innerHTML = '';
    items.forEach(o => {
      const li = el('li', mineKey === o.key ? 'on' : ''); const b = el('button'); b.type = 'button';
      b.appendChild(el('span', 'vn', o.name)); if (o.sub) b.appendChild(el('span', 'vp', o.sub));
      b.onclick = () => {
        $('voteMsg').textContent = ''; $('voteMsg').className = 'note warn';
        socket.emit('p:vote', { [field]: o.key }, r => {
          if (r && r.error) { $('voteMsg').textContent = r.error; return; }
          onStage(r); buzz(25);
          $('voteMsg').className = 'note ok'; $('voteMsg').textContent = `${label}: ${o.name}. You can change it until the seal is broken.`;
          if (field === 'killer') note(`You accuse ${o.name}`, 'Accusation lodged', 'J’ACCUSE');
        });
      };
      li.appendChild(b); ol.appendChild(li);
    });
  }
  function vote(v) {
    if (!v) return;
    $('voteTab').hidden = !v.open;
    if (v.open && !voteWasOpen) { openTab('p-vote'); buzz([40, 40, 40]); }
    if (!v.open && !$('p-vote').hidden) openTab('p-part');
    voteWasOpen = v.open;
    if (!v.open) return;
    const m = v.mine || {};
    const people = (v.options || []).map(o => ({ key: o.key, name: o.name, sub: `played by ${o.played}` }));
    pickList($('voteList'), people.filter(o => !D || o.key !== D.key), m.killer, 'killer', 'Your accusation');
    pickList($('voteMethod'), (v.methods || []).map(x => ({ key: x.k, name: x.t })), m.method, 'method', 'How');
    pickList($('voteMotive'), (v.motives || []).map(x => ({ key: x.k, name: x.t })), m.motive, 'motive', 'Why');
    pickList($('voteWhen'), (v.when || []).map(x => ({ key: x.k, name: x.t })), m.when, 'when', 'When');
    pickList($('voteEvidence'), (v.evidence || []).map(x => ({ key: x.k, name: x.t })), m.evidence, 'evidence', 'The proof');
    pickList($('voteBest'), people.filter(o => !D || o.key !== D.key), m.best, 'best', 'Best performance');
  }

  // ------------------------------------------------ the oath token
  function oath(st) {
    $('oathBtn').disabled = !!st.oathUsed || st.act < 2 || st.phase !== 'live';
    $('oathH').textContent = st.oathUsed ? 'Spent' : st.act < 2 ? 'Available once the body is found' : 'One question, answered truthfully';
    const ol = $('oathList'); ol.innerHTML = '';
    (st.oathTargets || []).filter(o => !D || o.key !== D.key).forEach(o => {
      const li = el('li'); const b = el('button'); b.type = 'button'; b.appendChild(el('span', 'vn', o.name)); b.appendChild(el('span', 'vp', `played by ${o.played}`));
      b.onclick = () => socket.emit('p:oath', { key: o.key }, r => {
        if (r && r.error) { $('oathErr').textContent = r.error; return; }
        $('oath').hidden = true; note(`${r.to} is under oath`, 'Ask your one question', 'OATH'); buzz([50, 50, 120]);
        $('oathBtn').disabled = true; $('oathH').textContent = 'Spent';
      });
      li.appendChild(b); ol.appendChild(li);
    });
  }
  $('oathBtn').onclick = () => { $('oathErr').textContent = ''; $('oath').hidden = false; };
  $('oathCancel').onclick = () => ($('oath').hidden = true);

  // ------------------------------------------------ the spotlight
  const SPOT = {
    intro: ['You’re on', 'Stand up and say hello', () => D ? `Say your opening line: “${D.part.entrance}”` : 'Introduce yourself in character.'],
    hot: ['The hot seat', 'You’re in the hot seat', () => 'Two minutes of questions. Answer everything in character. You may lie about your secret, never about a clue card.'],
    seance: ['The seance', 'The spirits are waiting', () => 'Lights low. Everyone’s hands on the table. Hold your seance now, and let the spirits deliver what you heard at twenty past eleven.'],
    body: ['The discovery', 'You found him', () => 'Stand up. Tell the room, in your own words, what you saw when you opened the study door with the cocoa.'],
    verdict: ['The doctor', 'Examine the body', () => 'Stand up, examine the Professor gravely, and give your verdict on how and when he died.'],
    oath: ['Under oath', 'You are under oath', s => `${s.from || 'Someone'} has spent an oath token on you. Answer their one question truthfully. (Only the murderer may lie.)`],
    whisper: ['Corvin whispers', 'A secret mission, just for you', s => `${s.text || ''} Don’t tell anyone it came from Corvin.`]
  };
  socket.on('spot', s => {
    if (s && (s.kind === 'whisper' || s.kind === 'oath')) return;
    buzz([80, 60, 80]);
    const k = SPOT[s.kind] || SPOT.intro;
    $('spot').classList.toggle('hot', s.kind === 'hot' || s.kind === 'oath');
    $('spot').classList.toggle('psst', s.kind === 'whisper'); $('spotDone').hidden = s.kind !== 'whisper';
    if (s.kind === 'whisper') { whisper({ id: Date.now(), text: s.text, done: false }); whisperId = null; }
    $('spotK').textContent = k[0]; $('spotH').textContent = k[1]; $('spotP').textContent = k[2](s);
    $('spot').hidden = false;
  });
  $('spotOk').onclick = () => ($('spot').hidden = true);

  function ended(t) {
    const box = $('endScore'); box.innerHTML = '';
    box.appendChild(el('div', 'label', 'The murderer was'));
    box.appendChild(el('p', 'display end-k', t.killer));
    const ol = el('ol', 'end-rows');
    t.rows.forEach((r, i) => { const li = el('li', D && r.character === D.name ? 'me' : ''); li.appendChild(el('span', 'er-i', String(i + 1))); li.appendChild(el('span', 'er-n', `${r.name} · ${r.character}`)); li.appendChild(el('b', 'er-p', String(r.points))); ol.appendChild(li); });
    box.appendChild(ol);
  }

  // press-and-hold to read
  document.querySelectorAll('.hold').forEach(x => {
    const on = e => { e.preventDefault(); x.classList.add('open'); };
    const off = () => x.classList.remove('open');
    x.addEventListener('pointerdown', on);
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => x.addEventListener(ev, off));
    x.addEventListener('contextmenu', e => e.preventDefault());
  });
  document.addEventListener('visibilitychange', () => document.querySelectorAll('.hold.open').forEach(x => x.classList.remove('open')));

  // ------------------------------------------------ telegram
  $('wireBtn').onclick = () => { $('wireErr').textContent = ''; $('wire').hidden = false; $('wireText').focus(); };
  $('wireCancel').onclick = () => ($('wire').hidden = true);
  $('wireText').oninput = e => ($('wireCount').textContent = `${e.target.value.length} / 140`);
  $('fWire').onsubmit = e => {
    e.preventDefault();
    socket.emit('p:wire', { text: $('wireText').value }, r => {
      if (r && r.error) { $('wireErr').textContent = r.error; return; }
      $('wireText').value = ''; $('wireCount').textContent = '0 / 140'; $('wire').hidden = true;
      note('Handed in. Sent without your name.', 'Post Office Telegraphs', 'SENT');
      try { window.Film && Film.hop(); } catch (e) {}
    });
  };

  // ------------------------------------------------ the needle (host only knows)
  const ring = $('ring'); let t = null, x = 0;
  ring.addEventListener('pointerdown', e => {
    const r = ring.getBoundingClientRect(); x = e.clientX - r.left; clearTimeout(t);
    if (true) return;   // traditional version: no polygraph votes
    t = setTimeout(() => { socket.emit('p:needle', { v: x < r.width / 2 ? 'TRUTH' : 'DECEPTION' }); buzz(25); }, 1000);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => ring.addEventListener(ev, () => clearTimeout(t)));
  ring.addEventListener('contextmenu', e => e.preventDefault());
})();
