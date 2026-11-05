(() => {
  const $ = id => document.getElementById(id);
  const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
  const socket = io({ autoConnect: false });
  let saved = null; try { saved = JSON.parse(store.get('larkspur:host') || 'null'); } catch {}
  if (saved && saved.room) { $('resume').hidden = false; $('resumeH').textContent = `Game ${saved.room}`; }
  let S = null, viewing = null, localLeft = 0, localRunning = false, lastSync = 0;
  const corvin = (pose, stars) => { try { if (!window.Film) return; Film.pose(pose); if (stars) Film.shower(stars); } catch (e) {} };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

  // ------------------------------------------------ Corvin's voice (the browser's own speech, a low British voice)
  let speakOn = store.get('larkspur:speak') !== '0', voice = null;   // on by default: the host is playing too
  const pickVoice = () => { const vs = speechSynthesis.getVoices(); voice = vs.find(v => /en-GB/i.test(v.lang) && /male|daniel|george|arthur|ryan/i.test(v.name)) || vs.find(v => /en-GB/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null; };
  if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  function say(text) {
    if (!('speechSynthesis' in window) || !text) return;
    speechSynthesis.cancel();
    String(text).split(/(?<=[.!?])\s+/).forEach(s => { const u = new SpeechSynthesisUtterance(s); if (voice) u.voice = voice; u.lang = 'en-GB'; u.rate = 0.9; u.pitch = 0.72; speechSynthesis.speak(u); });
    corvin('lean');
  }
  const syncSpeak = () => { $('speak').setAttribute('aria-pressed', String(speakOn)); $('speak').innerHTML = speakOn ? '&#128266; Reading aloud' : '&#128264; Read aloud'; };
  $('speak').onclick = () => { speakOn = !speakOn; store.set('larkspur:speak', speakOn ? '1' : '0'); syncSpeak(); if (speakOn && S) say(S.acts[S.act].script); else speechSynthesis && speechSynthesis.cancel(); };
  syncSpeak();

  // ------------------------------------------------ the big picture behind everything: this round's Blender scene
  const sceneSrcs = names => (names || []).flatMap(n => [`/media/scenes/${n}.jpg`, `/media/stills/${n}.jpg`]);
  function setScene(names) {
    const box = $('scene'), key = (names || []).join('|');
    if (box.dataset.k === key) return; box.dataset.k = key;
    const srcs = sceneSrcs(names); let i = 0;
    const img = new Image();
    img.onload = () => { const layer = el('div', 'scene-layer'); layer.style.backgroundImage = `url("${img.src}")`; box.appendChild(layer); requestAnimationFrame(() => layer.classList.add('on')); [...box.children].slice(0, -2).forEach(x => x.remove()); };
    img.onerror = () => { i++; if (i < srcs.length) img.src = srcs[i]; };
    if (srcs.length) img.src = srcs[0];
  }

  // ------------------------------------------------ gate
  function enter(room, key) {
    window.NET.room = room; window.NET.key = key;
    socket.emit('host:hello', { key }, res => {
      if (!res || !res.ok) { $('gateMsg').textContent = res && res.error ? res.error : 'That game has gone. Host a new one.'; store.set('larkspur:host', ''); $('resume').hidden = true; return; }
      store.set('larkspur:host', JSON.stringify({ room, key }));
      $('gate').hidden = true;
    });
  }
  $('open').onclick = async () => {
    window.goFull && goFull(); Sound.unlock(); $('gateMsg').textContent = 'Opening the house…';
    try { const r = await createGame(); if (!r || !r.ok) throw 0; $('gateMsg').textContent = ''; enter(r.room, r.key); }
    catch { $('gateMsg').textContent = 'Could not reach the house. Check the connection and try again.'; }
  };
  $('resume').onclick = () => { window.goFull && goFull(); Sound.unlock(); enter(saved.room, saved.key); };

  // ------------------------------------------------ state
  socket.on('state', apply);
  function apply(st) {
    const firstLive = S && S.phase === 'lobby' && st.phase === 'live';
    const prevAct = S ? S.act : null;
    S = st;
    const lobby = st.phase === 'lobby';
    $('lobby').hidden = !lobby; $('desk').hidden = lobby;
    document.body.classList.toggle('in-lobby', lobby);
    if (lobby) { setScene(['01_exterior', 'exterior']); renderLobby(); return; }
    setScene(st.acts[st.act].scene);
    renderPersons(); renderAct(); renderVote(); renderTimer(true); renderShelf(); renderOrders();
    $('seal').disabled = st.phase !== 'live';
    $('voteCard').hidden = st.act < 5 && st.phase === 'live';
    $('seal').hidden = st.act < 5 && st.phase === 'live';
    $('tDrop').closest('.env-card').hidden = st.act < 2 || st.act >= 5;
    if (firstLive) { viewing = null; showExhibit(st.exhibits.length - 1); Sound.carriage(); corvin('spread'); window.lightLeak && lightLeak(); if (speakOn) say(st.acts[st.act].script); corvinGuide(st.act); }
    else if (!$('exhibit').firstChild) showExhibit(st.exhibits.length - 1);
    if (prevAct !== null && prevAct !== st.act && st.phase === 'live') { window.lightLeak && lightLeak(); corvin('lean'); Sound.ding(); if (speakOn) say(st.acts[st.act].script); orderI = 0; renderOrders(); corvinGuide(st.act); }
  }

  const HUES = ['#8e3b46', '#4f6b45', '#3f5482', '#a0433a', '#3e6a64', '#7a6338', '#5d4a7a', '#7b5a3c', '#355f7d', '#6e3f5c'];
  const initials = n => (n || '?').split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const hueOf = name => { let h = 0; for (const c of name || '') h = (h * 31 + c.charCodeAt(0)) >>> 0; return HUES[h % HUES.length]; };
  function mono(p, big) { const m = el('span', 'mono' + (p.online === false ? ' off' : '') + (big ? ' big' : '')); m.style.setProperty('--c', hueOf(p.name)); m.textContent = initials(p.name); return m; }

  // ------------------------------------------------ lobby
  function renderLobby() {
    const urls = S.joinUrls || [];
    let shown = location.host + '/play'; try { if (urls[0]) { const u = new URL(urls[0]); shown = u.host + '/play'; } } catch (e) {}
    $('joinUrl').textContent = shown; $('roomCode').textContent = S.room || '';
    if (urls[0] && $('qr').dataset.u !== urls[0]) { try { $('qr').innerHTML = QR.svg(urls[0], { dark: '#0b1020', light: '#ece6d6', quiet: 1 }); $('qr').dataset.u = urls[0]; } catch (e) {} }
    const named = S.lobby.filter(p => p.name);
    const fill = (g, ol, need, label) => {
      ol.innerHTML = '';
      const list = named.filter(p => p.gender === g);
      for (let i = 0; i < Math.max(need, list.length); i++) {
        const p = list[i], li = el('li');
        if (!p) { li.className = 'seat empty'; li.innerHTML = `<span class="ghost"></span><span class="n">Awaiting ${label}</span>`; ol.appendChild(li); continue; }
        li.className = 'seat ready' + (p.online ? '' : ' away') + (i >= need ? ' extra' : '');
        li.appendChild(mono(p));
        li.insertAdjacentHTML('beforeend', '<span class="n"></span><span class="s"></span><button class="x" title="Remove this guest">&times;</button>');
        li.querySelector('.n').textContent = p.name;
        li.querySelector('.s').textContent = !p.online ? 'Phone asleep' : p.form ? 'Statement signed' : 'Filling in the police form';
        if (!p.form) li.classList.add('form');
        li.querySelector('.x').onclick = () => { if (confirmStrike(li)) socket.emit('host:kick', { name: p.name }); };
        ol.appendChild(li);
      }
      return list;
    };
    const w = fill('F', $('seatsF'), 7, 'a lady'), m = fill('M', $('seatsM'), 3, 'a gentleman');
    $('fCount').textContent = `${w.length} of 7`; $('mCount').textContent = `${m.length} of 3`;
    const forms = named.filter(p => !p.form).length;
    const ok = w.length === 7 && m.length === 3 && !forms;
    $('tally').innerHTML = `<b>${w.length + m.length}</b><span>of 10 here</span>`;
    $('distribute').disabled = !ok;
    $('countLine').textContent = ok ? 'Everyone is here' : `${Math.max(0, 10 - w.length - m.length)} still to come`;
    const needs = [];
    if (w.length < 7) needs.push(`${7 - w.length} more ${7 - w.length === 1 ? 'lady' : 'ladies'}`);
    if (m.length < 3) needs.push(`${3 - m.length} more ${3 - m.length === 1 ? 'gentleman' : 'gentlemen'}`);
    if (w.length > 7) needs.push(`${w.length - 7} fewer ladies`); if (m.length > 3) needs.push(`${m.length - 3} fewer gentlemen`);
    if (forms) needs.push(`${forms} police form${forms > 1 ? 's' : ''} to be signed`);
    $('lobbyHint').textContent = ok ? 'Every seat is taken and every statement signed. Press Distribute dossiers when everyone is sitting down.' : `Waiting for ${needs.join(' and ')}.`;
  }
  function confirmStrike(li) {
    if (li.dataset.armed && Date.now() - li.dataset.armed < 3000) return true;
    li.dataset.armed = Date.now(); li.classList.add('armed'); li.querySelector('.s').textContent = 'Click × again to remove';
    setTimeout(() => li.classList.remove('armed'), 3000); return false;
  }
  $('distribute').onclick = () => { $('lobbyMsg').textContent = ''; socket.emit('host:distribute', {}, r => { if (r && !r.ok) $('lobbyMsg').textContent = r.err; }); };

  // ------------------------------------------------ guests
  const cast = () => S.lobby.filter(p => p.character);
  const byKey = k => cast().find(p => p.key === k);
  function renderPersons() {
    const ol = $('persons'); ol.innerHTML = '';
    const list = cast().slice().sort((a, b) => a.character.localeCompare(b.character));
    list.forEach(p => {
      const li = el('li'); li.appendChild(mono(p));
      const t = el('div', 'pt'); t.appendChild(el('div', 'who', p.character)); t.appendChild(el('div', 'arch', p.archetype));
      t.appendChild(el('div', 'as', `played by ${p.name}` + (p.online ? '' : ' · phone asleep')));
      const badges = el('div', 'badges'); if (p.oath) badges.appendChild(el('span', 'b-oath', 'oath')); if (p.goals) badges.appendChild(el('span', 'b-goal', `${p.goals}/3`));
      t.appendChild(badges); li.appendChild(t);
      li.title = p.publicLine; li.tabIndex = 0; li.onclick = () => openSpot('hot', p);
      ol.appendChild(li);
    });
    $('online').textContent = `${list.filter(p => p.online).length}/${list.length} online`;
  }

  // ------------------------------------------------ rounds
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  function renderAct() {
    const A = S.acts[S.act];
    $('acts').innerHTML = '';
    S.acts.forEach((a, i) => {
      const li = el('li', i < S.act ? 'done' : i === S.act ? 'now' : '');
      const b = el('button', '', a.n); b.title = a.title; b.onclick = () => { if (S.phase === 'live') socket.emit('host:act', { to: i }); };
      li.appendChild(b); $('acts').appendChild(li);
    });
    $('actN').textContent = `Round ${A.n} of ${ROMAN[S.acts.length - 1]}`;
    $('actTitle').textContent = A.title; $('actScript').textContent = A.script; $('actHost').textContent = A.host;
    $('actHint').hidden = !A.hint; $('actHint').textContent = A.hint || '';
    const next = S.acts[S.act + 1];
    $('actNext').disabled = !next || S.phase !== 'live';
    $('actNext').querySelector('.row-t').textContent = next ? 'Next round' : 'Final round';
    $('actNextH').textContent = next ? `${next.n} · ${next.title}` : '';
    $('actPrev').disabled = S.act === 0 || S.phase !== 'live';
    const lit = { 0: 'intro', 3: 'hot', 5: 'voteBtn', 6: 'seal' }[S.act];
    ['intro', 'hot', 'interrupt', 'voteBtn', 'seal'].forEach(id => $(id).classList.toggle('glow', id === lit));
    $('tDrop').classList.toggle('glow', S.timer.ready > 0 && !S.timer.running);
    const tools = $('actTools'); tools.innerHTML = '';
    const add = (label, fn) => { const b = el('button', 'pill-btn lit', label); b.onclick = fn; tools.appendChild(b); };
    const person = k => byKey(k);
    if (S.act === 0) add('Introduce the guests', () => openSpot('intro', null));
    if (S.act === 1) add('Show the invitation', () => { viewing = 0; showExhibit(0); renderShelf(); });
    if (S.act === 2) {
      if (person('agnes')) add('The cook finds him', () => cue('body', person('agnes')));
      if (person('pryce')) add('The doctor’s verdict', () => cue('verdict', person('pryce')));
    }
    if (S.act === 4 && person('seraphine')) add('The seance', () => cue('seance', person('seraphine')));
    if (S.act >= 3 && S.act <= 5 && (S.statements || []).length) add('The statements', showStatements);
    if (S.act >= 4 && A.hint) add('Corvin’s hint', () => call('Corvin whispers', A.hint.replace(/^Corvin whispers:\s*/, ''), true));
  }
  $('actNext').onclick = () => socket.emit('host:act', { to: S.act + 1 });
  $('actPrev').onclick = () => socket.emit('host:act', { to: S.act - 1 });

  // a single guest's moment, on their phone and on the big screen
  const CUES = { body: ['The discovery', 'Five past midnight. The cocoa tray.'], verdict: ['The doctor', 'Examine the body. Give your verdict.'], seance: ['The seance', 'Lights low. Hands on the table.'] };
  function cue(kind, p) {
    socket.emit('host:spot', { name: p.name, kind });
    call(CUES[kind][0], `${p.character} (${p.name}): ${CUES[kind][1]}`, false);
    if (kind === 'seance') { Sound.caw(); corvin('spread', 8); }
    else { Sound.ding(); corvin('lean'); }
  }

  // ------------------------------------------------ party challenges
  let orderI = 0;
  function renderOrders() {
    const orders = (S.acts[S.act].orders || []);
    $('ordersCard').hidden = !orders.length || S.phase !== 'live';
    const box = $('orders'); box.innerHTML = '';
    orders.forEach((o, i) => {
      const b = el('button', 'order' + (i === orderI ? ' next' : '')); b.type = 'button';
      b.appendChild(el('b', '', o.k)); b.appendChild(el('span', '', o.t));
      b.onclick = () => { orderI = i + 1; renderOrders(); call(`Challenge · ${o.k}`, o.t, false); Sound.ding(); corvin('lean'); };
      box.appendChild(b);
    });
  }

  // ------------------------------------------------ Corvin interrupts
  const INTERRUPTS = [
    a => `Backwards! ${a} must tell their story of the night backwards, from the cocoa to half past eleven. Liars hate this. Go.`,
    a => `Snap question for ${a}: what was the very last thing you heard before the cook screamed? Three seconds. Everyone count.`,
    (a, b) => `Swap stories. ${a} must retell ${b}’s story of the night from memory. ${b} may only say “right” or “wrong”.`,
    () => `On three, everyone point at the story you believe least. Whoever gets the most fingers must add one brand-new detail. Now.`,
    (a, b) => `${a} and ${b}: look each other in the eye and each say, “I never touched the Professor’s glass.” First to look away tells the room one true thing.`,
    a => `${a}: what time exactly did you last see the Professor alive? Everyone remember the answer. I shall ask again later.`,
    a => `Silence. Nobody speaks for ten seconds. Watch the faces. Then ${a} says who looked most nervous, and why.`,
    a => `${a}: name one person who can vouch for where you were at a quarter to twelve. They must confirm it now, out loud. Or not.`,
    a => `I have a hunch about ${a}. Reveal one true fact from your dossier, or let the whole table ask you one question each.`,
    () => `New rule until the end of this round: anyone who says “um” or “er” while answering a question must answer the next question too. Caw.`,
    (a, b) => `${a}: what was ${b} drinking at dinner? ${b}: is that right? Do the stories match?`,
    a => `Cross-examination. ${a} stands up. Everyone else gets one question each, fired fast. No pauses longer than three seconds.`,
    a => `${a}: describe the smell of the room you say you were in at half past eleven. Anyone who was really there may challenge it.`,
    (a, b) => `${a}, whisper one secret, true or false, to ${b}. ${b} decides whether to tell the room.`,
    a => `${a}, the spirits are restless. Do your best impression of the Professor raising his toast to honesty. Everyone watches who flinches.`
  ];
  function interruptText() {
    const pl = cast().map(p => `${p.name} (${p.character})`).sort(() => Math.random() - 0.5);
    const f = INTERRUPTS[Math.floor(Math.random() * INTERRUPTS.length)];
    return f(pl[0] || 'someone', pl[1] || pl[0] || 'someone');
  }
  let callAgain = null;
  // ------------------------------------------------ Corvin, who saw everything, steers the room (never names anyone)
  const GUIDE = {
    0: 'Ten guests. One house. Nobody leaves before morning. Look at each other carefully: one of you is not who they say.',
    1: 'Every one of you had a reason to wish him gone. Listen closely. A reason is not yet a crime.',
    2: 'A motive is cheap. Ask instead: who could reach him, and with what? Find the means.',
    3: 'The alibis are sworn now. Times matter more than tears. Whose minutes do not add up? Find the opportunity.',
    4: 'I was watching from the dome. I have shown you what I saw. Lay my words beside theirs.',
    5: 'Motive. Means. Opportunity. Only one of you holds all three. Speak your accusation.'
  };
  function corvinGuide(act) { const t = GUIDE[act]; if (!t) return; setTimeout(() => { Sound.caw(); corvin('lean'); call('Corvin whispers', t, true); }, 7000); }
  function call(k, t, speak = true, again = null) {
    $('callK').textContent = k; $('callT').textContent = t; $('call').hidden = false;
    $('callAgain').hidden = !again; callAgain = again;
    if (speakOn) say(t);
  }
  $('interrupt').onclick = () => { Sound.caw(); corvin('spread'); window.Film && Film.hop && Film.hop(); call('Corvin interrupts', interruptText(), true, () => call('Corvin interrupts', interruptText(), true, callAgain)); };
  $('callAgain').onclick = () => callAgain && callAgain();

  // ------------------------------------------------ the statement board: everyone's chosen alibi, side by side
  function showStatements() {
    call('Statements taken · half past eleven to midnight', '', false);
    const t = $('callT'); t.textContent = ''; const ol = el('ol', 'st-board');
    (S.statements || []).forEach(s => { const li = el('li'); li.appendChild(el('b', '', s.name)); li.appendChild(el('span', '', s.where)); ol.appendChild(li); });
    t.appendChild(ol); t.appendChild(el('p', 'st-hint', 'Two people in the same place should have seen each other. Somebody here is lying. Probably more than one.'));
    Sound.ding(); corvin('lean');
  }

  // ------------------------------------------------ Corvin whispers: a secret mission to one random phone
  $('whisper').onclick = () => {
    if (!S || S.phase !== 'live') return;
    socket.emit('host:whisper', {}, r => {
      if (!r || !r.ok) return;
      Sound.caw(); corvin('lean'); window.Film && Film.hop && Film.hop();
      call('Corvin whispers', 'I have whispered a secret mission to one of you. You will not know who. Watch each other very carefully.', true);
      logLine('Corvin whispered', 'A secret mission went to one phone. Nobody knows whose.', 'oath-line');
    });
  };
  socket.on('search', x => { logLine('Search warrant', `${x.who} searched ${x.room.replace(/^The /, 'the ')}.`); Sound.ding(); });
  socket.on('labSent', x => { logLine('The murder bag', `${x.who} is testing ${x.item.replace(/^The /, 'the ').replace(/^A /, 'a ')}.`); });
  socket.on('whisperDone', () => { logLine('Mission accomplished', 'Somebody has carried out Corvin’s whisper. Did you spot it?', 'oath-line'); Sound.ding(); });
  $('callOk').onclick = () => { $('call').hidden = true; speechSynthesis && speechSynthesis.cancel(); };

  // ------------------------------------------------ vote
  function renderVote() {
    const v = S.vote;
    $('voteCount').textContent = `${v.cast} of ${v.of}`;
    $('voteState').textContent = S.phase === 'ended' ? 'Counted' : v.open ? 'Voting open on every phone' : v.cast ? 'Vote closed' : 'Opens in round VI';
    $('voteBar').style.width = `${v.of ? (100 * v.cast / v.of) : 0}%`;
    $('voteBtn').textContent = v.open ? 'Close the vote' : 'Open the vote';
    $('voteBtn').disabled = S.phase !== 'live';
  }
  $('voteBtn').onclick = () => socket.emit('host:vote', { open: !S.vote.open });

  // ------------------------------------------------ envelopes
  function renderShelf() {
    const nav = $('shelf'); nav.innerHTML = '';
    const cur = viewing === null ? S.exhibits.length - 1 : viewing;
    S.exhibits.forEach((ex, i) => {
      const b = el('button', '', i === 0 ? 'Invitation' : ex.id || String(i));
      b.title = ex.title; b.setAttribute('aria-current', String(i === cur));
      b.onclick = () => { viewing = i === S.exhibits.length - 1 ? null : i; showExhibit(i); renderShelf(); };
      nav.appendChild(b);
    });
    const left = S.timer.total - S.exhibits.length; if (left > 0) nav.appendChild(el('span', 'tbc more', `+${left} sealed`));
    const ex = S.exhibits[cur];
    $('exLabel').textContent = cur === 0 ? 'The invitation' : ex ? `Envelope ${ex.id} · ${cur} of ${S.timer.total - 1}` : '';
  }
  function showExhibit(i) {
    if (!S || !S.exhibits[i]) return;
    const w = $('exhibit'); w.innerHTML = '';
    w.appendChild(renderExhibit(S.exhibits[i], i)); w.scrollTop = 0;
  }
  socket.on('exhibit', ex => {
    setTimeout(() => {
      viewing = null; showExhibit(S.exhibits.length - 1); renderShelf(); Sound.carriage(); corvin('lean', 5); window.lightLeak && lightLeak();
      if (ex && ex.scene) setScene(ex.scene);
      if (speakOn && ex && ex.host) say(`Envelope ${ex.id}. ${ex.title.replace(/^What Corvin saw · [IV]+ · /, 'What I saw: ')}. Host, read it to them.`);
      else if (speakOn && ex && ex.by) say(`Envelope ${ex.id}. ${ex.by}, read it to us.`);
    }, 60);
  });

  function renderTimer(fromServer) {
    if (!S || S.phase === 'lobby') return;
    if (fromServer) { localLeft = S.timer.left; localRunning = S.timer.running; lastSync = Date.now(); }
    const left = localRunning ? Math.max(0, localLeft - Math.floor((Date.now() - lastSync) / 1000)) : localLeft;
    const opened = S.exhibits.length - 1, total = S.timer.total - 1;
    $('envCount').textContent = `${opened} of ${total}`;
    $('clockSub').textContent = S.timer.ready ? (localRunning ? `Next one opens by itself in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : `${S.timer.ready} ready to open this round`) : opened >= total ? 'Every envelope is open' : 'The rest arrive in later rounds';
    $('tDrop').disabled = S.phase !== 'live' || !S.timer.ready;
    $('tStart').disabled = S.phase !== 'live' || !S.timer.ready;
    $('tStart').textContent = localRunning ? 'Auto: on (pause)' : 'Auto: off';
    if (fromServer) $('tInt').value = String(S.timer.interval / 60);
  }
  setInterval(() => renderTimer(false), 500);
  $('tStart').onclick = () => socket.emit('host:timer', { action: localRunning ? 'pause' : 'start' });
  $('tDrop').onclick = () => socket.emit('host:dropNow');
  $('tInt').onchange = e => socket.emit('host:interval', { minutes: e.target.value });

  setInterval(() => { const d = new Date(), p = x => String(x).padStart(2, '0'); $('wall').textContent = `${p(d.getHours())}:${p(d.getMinutes())}`; }, 1000);

  let byeArmed = 0;
  $('bye').onclick = () => {
    if (Date.now() - byeArmed < 4000) { socket.emit('host:shutdown'); return; }
    byeArmed = Date.now(); $('byeH').textContent = 'Click again to close this game';
    setTimeout(() => { if (Date.now() - byeArmed >= 4000) $('byeH').textContent = 'End the night'; }, 4100);
  };
  socket.on('bye', () => {
    socket.disconnect(); store.set('larkspur:host', '');
    document.body.insertAdjacentHTML('beforeend', '<div class="gate"><div class="glass gate-card"><div class="eyebrow">Larkspur House</div><h1 class="display">Goodnight from Larkspur.</h1><p class="lede">This game is closed. You can close this tab, or <a href="/host" style="color:var(--brass)">host another</a>.</p></div></div>');
  });

  // ------------------------------------------------ the spotlight: introductions and the hot seat
  let spot = { kind: 'intro', list: [], i: 0 }, spotTimer = null, hotUsed = new Set();
  function openSpot(kind, person) {
    const all = cast(); if (!all.length) return;
    if (kind === 'intro') spot = { kind, list: all.slice().sort((a, b) => a.character.localeCompare(b.character)), i: 0 };
    else {
      let p = person;
      if (!p) { let pool = all.filter(x => !hotUsed.has(x.name)); if (!pool.length) { hotUsed.clear(); pool = all; } p = pool[Math.floor(Math.random() * pool.length)]; }
      hotUsed.add(p.name); spot = { kind, list: [p], i: 0 };
    }
    $('spot').hidden = false; showSpot();
  }
  function showSpot() {
    const p = spot.list[spot.i]; if (!p) return;
    const hot = spot.kind === 'hot';
    $('spot').classList.toggle('hot', hot);
    $('spotKind').textContent = hot ? 'The hot seat' : 'Now arriving';
    $('spotNo').textContent = hot ? 'Two minutes. Answer everything in character.' : `${spot.i + 1} of ${spot.list.length}`;
    const m = $('spotMono'); m.innerHTML = ''; m.appendChild(mono(p, true));
    $('spotName').textContent = p.character; $('spotArch').textContent = p.archetype; $('spotPublic').textContent = p.publicLine; $('spotPlayed').textContent = p.name;
    $('spotLine').hidden = hot; $('spotLine').textContent = hot ? '' : `“${p.entrance}”`;
    const qs = $('spotQs'); qs.innerHTML = ''; qs.hidden = !hot;
    if (hot) { (p.ask || []).forEach(q => qs.appendChild(el('li', '', q))); (S.policeQs || []).forEach(q => qs.appendChild(el('li', 'police-q', q))); }
    $('spotPrev').hidden = hot || spot.i === 0;
    $('spotNextT').textContent = hot ? 'Someone else' : spot.i === spot.list.length - 1 ? 'Begin the evening' : 'Next guest';
    $('spotTimer').hidden = !hot;
    clearInterval(spotTimer);
    if (hot) {
      const end = Date.now() + 120000, arc = $('spotArc'), C = 2 * Math.PI * 17;
      arc.style.strokeDasharray = C;
      const tick = () => { const left = Math.max(0, end - Date.now()), s = Math.ceil(left / 1000); $('spotT').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; arc.style.strokeDashoffset = C * (1 - left / 120000); if (!left) { clearInterval(spotTimer); Sound.ding(); } };
      tick(); spotTimer = setInterval(tick, 250); Sound.caw(); corvin('lean');
      if (speakOn) say(`${p.character}, take the hot seat.`);
    } else { Sound.ding(); corvin('nod'); if (speakOn) say(`${p.character}, ${p.archetype.replace(/^The /, 'the ')}.`); }
    socket.emit('host:spot', { name: p.name, kind: spot.kind });
  }
  $('spotNext').onclick = () => {
    if (spot.kind === 'hot') { openSpot('hot', null); return; }
    if (spot.i < spot.list.length - 1) { spot.i++; showSpot(); }
    else { closeSpot(); if (S.act === 0) socket.emit('host:act', { to: 1 }); }
  };
  $('spotPrev').onclick = () => { if (spot.i > 0) { spot.i--; showSpot(); } };
  const closeSpot = () => { $('spot').hidden = true; clearInterval(spotTimer); };
  $('spotClose').onclick = closeSpot;
  $('hot').onclick = () => openSpot('hot', null);
  $('intro').onclick = () => openSpot('intro', null);
  addEventListener('keydown', e => {
    if (!$('call').hidden && (e.key === 'Escape' || e.key === 'Enter')) { $('callOk').click(); return; }
    if ($('spot').hidden) return;
    if (e.key === 'Escape') closeSpot();
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); $('spotNext').click(); }
    if (e.key === 'ArrowLeft') $('spotPrev').click();
  });

  // ------------------------------------------------ telegrams and oaths
  function logLine(hdr, txt, cls) {
    const li = el('li', 'fresh ' + (cls || '')); li.appendChild(el('span', 'hdr', hdr)); li.appendChild(el('span', 'txt', txt));
    const e = $('wires').querySelector('.empty'); if (e) e.remove();
    $('wires').prepend(li);
  }
  socket.on('wire', w => {
    const t = new Date(w.at);
    logLine(`Handed in ${t.getHours()}.${String(t.getMinutes()).padStart(2, '0')} · sender withheld`, `${w.text} STOP`);
    Sound.ding(); setTimeout(() => window.Film && Film.hop(), 900);
  });
  socket.on('oath', o => {
    logLine('Oath token spent', `${o.from} puts ${o.to} under oath.`, 'oath-line');
    call('Under oath', `${o.from} has spent an oath token on ${o.to}. One question, and ${o.to} must answer it truthfully. Only the murderer may lie.`, true);
    Sound.caw(); corvin('spread');
  });

  // ------------------------------------------------ polygraph
  let needleTimer = null;
  socket.on('needle', ({ v }) => { return;   // traditional version: no polygraph votes
    const ov = $('needle'), st = $('needleStamp');
    st.textContent = v; st.className = `big-stamp ${v === 'TRUTH' ? 'truth' : 'deception'}`;
    drawTrace(v === 'DECEPTION'); ov.hidden = false;
    st.style.animation = 'none'; void st.offsetWidth; st.style.animation = '';
    (v === 'TRUTH' ? Sound.truth : Sound.deception)(); corvin(v === 'TRUTH' ? 'nod' : 'spread');
    clearTimeout(needleTimer); needleTimer = setTimeout(() => (ov.hidden = true), 4200);
  });
  $('needle').onclick = () => ($('needle').hidden = true);
  function drawTrace(wild) {
    let d = 'M0 150';
    for (let x = 0; x <= 1200; x += 6) { const calm = Math.sin(x / 22) * 14 + (Math.random() - .5) * 8; const spike = wild && x > 650 ? (Math.random() - .5) * 220 : 0; d += ` L${x} ${(150 + calm + spike).toFixed(1)}`; }
    $('trace').setAttribute('d', d);
  }

  // ------------------------------------------------ the seal (hold three seconds)
  let hold = null, held = 0;
  const startHold = e => {
    if ($('seal').disabled) return; e.preventDefault();
    held = 0; clearInterval(hold);
    hold = setInterval(() => { held += 100; $('sealFill').style.width = `${Math.min(100, held / 30)}%`; if (held >= 3000) { stopHold(); socket.emit('host:reveal', {}, () => {}); } }, 100);
  };
  const stopHold = () => { clearInterval(hold); $('sealFill').style.width = '0'; };
  ['mousedown', 'touchstart'].forEach(ev => $('seal').addEventListener(ev, startHold));
  ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(ev => $('seal').addEventListener(ev, stopHold));
  $('seal').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) startHold(e); });
  $('seal').addEventListener('keyup', stopHold);

  let T = null;
  socket.on('reveal', t => {
    T = t;
    $('vName').textContent = t.character;
    $('vRole').textContent = `${t.archetype}, played by ${t.name}. ${t.method}. ${t.motive}.`;
    const story = $('vStory'); story.innerHTML = ''; t.reveal.forEach(p => story.appendChild(el('p', '', p)));
    const proof = $('vProof'); proof.innerHTML = ''; (t.proof || []).forEach(p => proof.appendChild(el('li', '', p)));
    const box = $('vTally'); box.innerHTML = '';
    if (t.tally && t.tally.length) {
      const max = Math.max(...t.tally.map(x => x[1])), right = (t.tally.find(x => x[0] === t.character) || [0, 0])[1];
      box.appendChild(el('div', 'label', `The table’s accusations · ${right} of ${t.ballots} named the killer` + (t.caught ? '' : ' · the murderer got away with it')));
      t.tally.forEach(([name, n]) => {
        const row = el('div', 'vt' + (name === t.character ? ' hit' : ''));
        row.appendChild(el('span', 'vt-n', name)); const bar = el('span', 'vt-b'); const i = el('i'); i.style.width = `${100 * n / max}%`; bar.appendChild(i); row.appendChild(bar); row.appendChild(el('span', 'vt-c', String(n)));
        box.appendChild(row);
      });
    } else box.appendChild(el('div', 'label', 'No accusations were made'));
    const sc = $('vScores'); sc.innerHTML = '';
    (t.rows || []).forEach((r, i) => {
      const li = el('li', i === 0 ? 'champ' : ''); li.appendChild(el('span', 'vs-i', String(i + 1)));
      const n = el('span', 'vs-n'); n.appendChild(el('b', '', r.name)); n.appendChild(el('small', '', `${r.character} · ${r.why.join(', ') || 'no points'}`)); li.appendChild(n);
      li.appendChild(el('span', 'vs-p', String(r.points))); sc.appendChild(li);
    });
    if (t.best && t.best.length) sc.insertAdjacentElement('beforebegin', Object.assign(el('div', 'label best-line', `Best performance: ${t.best.join(' and ')}`)));
    setScene(['N10_the_confession']);
    const acc = (t.tally || []).map(([n, c]) => `${n} · ${c} ${c === 1 ? 'accusation' : 'accusations'}`);
    unmask([
      { k: 'The gathering', t: 'Everybody into the drawing room, please. Sit down. Nobody leaves. The boat comes at dawn, and by then one of you will be in handcuffs.', list: acc.length ? acc : ['Nobody dared to accuse anyone.'] },
      ...t.reveal.map((p, i) => ({ k: `Corvin’s account · ${i + 1} of ${t.reveal.length}`, t: p }))
    ], () => { socket.emit('host:unmasked'); $('verdict').hidden = false; Sound.deception(); corvin('bow', 12); window.Film && Film.flash(.5); });
  });
  // one step at a time, like a detective in a drawing room
  let UM = null;
  function unmask(steps, done) {
    UM = { steps, i: 0, done }; $('unmask').hidden = false; umShow(); Sound.carriage(); corvin('spread');
  }
  function umShow() {
    const s = UM.steps[UM.i];
    $('umK').textContent = s.k; $('umT').textContent = s.t; const ol = $('umList'); ol.innerHTML = ''; (s.list || []).forEach(x => ol.appendChild(el('li', '', x)));
    $('umN').textContent = `${UM.i + 1} / ${UM.steps.length}`;
    $('umNext').querySelector('.row-t').textContent = UM.i === UM.steps.length - 1 ? (UM.last || 'The verdict') : 'Go on';
    const box = $('umT'); box.style.animation = 'none'; void box.offsetWidth; box.style.animation = '';
    if (speakOn) say(s.t); corvin(UM.i % 2 ? 'lean' : 'nod');
  }
  $('umNext').onclick = () => { if (!UM) return; if (UM.i < UM.steps.length - 1) { UM.i++; umShow(); return; } $('unmask').hidden = true; const d = UM.done; UM = null; d && d(); };
  addEventListener('keydown', e => { if (!$('unmask').hidden && (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight')) { e.preventDefault(); $('umNext').click(); } }, true);
  $('vMorning').onclick = () => {
    if (!T) return; $('verdict').hidden = true; setScene(['01_exterior', 'exterior', 'LH_front_door']);
    unmask((T.epilogue || []).map((p, i) => ({ k: `The morning after · ${i + 1} of ${T.epilogue.length}`, t: p })), () => { $('verdict').hidden = false; });
    UM.last = 'Back to the verdict'; umShow();
  };
  $('vSpeak').onclick = () => T && say(T.reveal.join(' '));
  $('vLast').onclick = () => { if (!T) return; $('verdict').hidden = true; setScene(['15_the_ring', 'ring']); call('The last shot', T.last, true); corvin('spread', 20); };
  $('vClose').onclick = () => ($('verdict').hidden = true);
})();
