// THE LARKSPUR DOME — the game engine (the same file runs the website and the laptop version).
// Every request is stateless: the game lives in a key/value store (Netlify Blobs online, memory on the laptop).
// Each key has one writer, so phones never overwrite each other:
//   <room>/meta         host key (written once)
//   <room>/game         the table: phase, act, envelopes, cast, spotlight          (conditional writes)
//   <room>/p/<pid>      one guest's own sheet: name, part, goals, oath, vote       (that guest only)
//   <room>/d/<pid>      that guest's dossier, encrypted                            (written once, at the deal)
//   <room>/w/<stamp>    telegrams, <room>/n/<stamp> polygraph needles, <room>/o/<stamp> oaths   (append only)
// Secrets (dossiers, the envelope queue, the solution) are encrypted with SEAL_SECRET.
import crypto from 'node:crypto';
import lark from './larkspur.cjs';
const { CAST, KILLER, KILLER_PAGE, INNOCENT_PAGE, CLUES, BRIEF, ACTS, METHODS, MOTIVES, SOLUTION, ALIBIS, SEARCHES, LAB, WHEN, KEY_WHEN, KEY_EVIDENCE, EPILOGUE, POLICE_QS } = lark;
const WARRANTS = 2, LAB_MS = 3 * 60 * 1000, SEARCH_FROM = 2, SEARCH_TO = 4;
const ALIBI_LOCK_ACT = 3;   // alibis can be changed until round IV begins
const POINTS = { whisper: 1, when: 2, evidence: 2, ...lark.POINTS };

// ---------------------------------------------------------------- the police form (from Case 4418) and what Corvin saw
// Every guest describes their REAL self before the deal: writing hand, watch, ring, colour of top.
// Corvin's four observations are then written from whichever real guest was dealt the murderer.
const SIDES = ['left', 'right', 'none'];
const COLOURS = ['black', 'white', 'navy', 'blue', 'red', 'green', 'grey', 'cream', 'pink', 'gold', 'brown', 'purple', 'yellow', 'orange'];
const UP = x => String(x).toUpperCase();
function corvinSaw(bio) {
  const hand = bio.hand === 'left' ? 'left' : 'right', other = hand === 'left' ? 'right' : 'left';
  const colour = COLOURS.includes(bio.top) ? bio.top : 'grey';
  return [
    { kind: 'report', id: 'C1', act: 3, title: 'What Corvin saw · I · The spoon',
      text: `From the banister above the hall, at half past eleven, I watched someone stir a glass with a teaspoon. The glass was held in the ${UP(other)} hand. The spoon went round in the ${UP(hand)}. Ravens always notice which hand reaches for the cheese. Whoever stirred that glass is ${UP(hand)}-HANDED.`,
      scene: ['N8_the_brown_jar', 'A_study_desk'] },
    { kind: 'report', id: 'C2', act: 3, title: 'What Corvin saw · II · The wrist',
      text: bio.watch === 'none'
        ? 'Something shiny would have caught my eye. Nothing did. The wrist that carried the glass across the hall wore NO WATCH at all.'
        : `As the glass crossed the hall, a wristwatch winked at me in the lamplight. It was on the ${UP(bio.watch)} WRIST. I do love a shiny thing.`,
      scene: ['LH_hall', 'N2_the_toast'] },
    { kind: 'report', id: 'C3', act: 4, title: 'What Corvin saw · III · The garden',
      text: `This afternoon I sat on the wall of the walled garden. The larkspur bed has been snipped bare. Caught on one of the cut stems is a thread of ${UP(colour)} cloth, the colour of a sleeve that brushed past. The same colour is in this house tonight.`,
      scene: ['N4_walled_garden'] },
    { kind: 'report', id: 'C4', act: 4, title: 'What Corvin saw · IV · The jar',
      text: bio.ring === 'none'
        ? 'The lid of the cook’s brown jar is clean and smooth. No ring scraped it. The hand that unscrewed it wore NO RING.'
        : `There is a fresh, bright scratch on the lid of the cook’s brown jar, the kind a ring leaves when a lid is screwed on tight. The hand that did it wore a RING on the ${UP(bio.ring)} HAND.`,
      scene: ['N8_the_brown_jar'] }
  ].map(c => ({ ...c, by: 'Corvin', played: '', host: true }));
}

// ---------------------------------------------------------------- Corvin whispers: secret missions sent to one phone
const WHISPERS = [
  'Accuse the guest on your left of lying about the time. Refuse to explain why for one whole minute.',
  'Get two different guests to tell you where they were at a quarter to midnight. If the stories clash, announce it.',
  'Defend the guest everybody suspects most, passionately, for thirty seconds. Make the table doubt itself.',
  'Pat your pockets, pull out nothing, look horrified, and say only: “It’s gone.” Refuse to say what.',
  'Raise your glass and make a toast to the Professor in your character’s voice. Watch who doesn’t drink.',
  'Trade secrets: get one secret out of another guest by offering one of yours. Yours may be a lie.',
  'Insist, to anyone who will listen, that you heard a raven caw at exactly twenty to twelve. Never change your story.',
  'Faint, dramatically. When you come round, say only: “The stars… the stars were in the wrong place.”',
  'Get somebody to swap seats with you without telling them why.',
  'Every time anyone says “midnight”, tap your glass with a spoon. Keep doing it until somebody asks why.',
  'Quietly ask three guests who they trust most. Tell the whole table the most popular answer.',
  'Choose one guest and agree with everything they say for the next five minutes. Loudly.',
  'Your character has lost a cufflink or an earring tonight. Ask everyone to help you look for it, and watch who refuses.',
  'Ask the guest opposite you a question in a whisper, so nobody else hears it. Then look very pleased with the answer.',
  'Tell one guest, privately, that you know what they did. Say nothing more, whatever they ask.',
  'Find out what each guest was drinking at dinner. The first person who can’t remember is hiding something.',
  'Stand up and announce that you will now name the murderer. Pause. Sit back down and say, “Not yet.”',
  'Sniff the air. Ask, quite seriously, whether anyone else can smell almonds. Note who answers too quickly.',
  'Make a friend: convince one guest to vote the same way as you. Shake hands on it.',
  'Ask the host for the hot seat for yourself, and then answer every question with a question.',
  'Take out a pencil and very slowly write down something the last speaker said. When they ask what, say: “Just for the Inspector.”',
  'Announce that you are going to “have a look round”. Leave the room for one minute. Come back, sit down, and say nothing about it.',
  'Ask every guest, one at a time, which hand they hold their glass in. Look thoughtful at one answer in particular.',
  'Insist that someone open a window because “a dead man’s room should be aired”. Refuse to explain where you heard that.',
  'Ask the host, loudly, whether anybody has thought to check the cocoa. Then drop the subject completely.',
  'Get one guest to show you the palm of their hand. Study it, frown, and give it back without a word.',
  'Persuade someone to tell you the exact time on their watch. Then tell the room the Professor’s clock was five minutes fast.',
  'Find an excuse to stand right behind each gentleman, one after another. Say nothing.',
  'Ask whoever holds the most clues on their phone to read one again, slowly. Repeat the last line back to the room.',
  'Start a rumour: tell one guest, in confidence, that the police launch has already left Oban. Watch how fast it travels.',
  'Offer to “look after” a clue for somebody. If they hand you their phone, read it and give it straight back with a knowing look.',
  'Say, apropos of nothing: “Ravens never forget a face, you know.” Look at the guest you trust least.',
  'Count, out loud, how many people at the table wear a wristwatch. Ask the room why that might matter.',
  'Challenge someone to a game of cards, or a quick hand of snap, to “settle your nerves”. Win or lose, shake hands.',
  'Ask the cook, or anyone, what was on the menu tonight. Pretend to write each dish down as evidence.'
];

// ---------------------------------------------------------------- a guest's police form, cleaned
function cleanBio(b = {}) {
  const hand = b.hand === 'left' || b.hand === 'right' ? b.hand : null;
  const watch = SIDES.includes(b.watch) ? b.watch : null, ring = SIDES.includes(b.ring) ? b.ring : null;
  const top = COLOURS.includes(String(b.top || '').toLowerCase()) ? String(b.top).toLowerCase() : null;
  return hand && watch && ring && top ? { hand, watch, ring, top } : null;
}

const NEED = { F: 7, M: 3 };
const ONLINE_MS = 30000;
const VOTE_ACT = 5, LAST_ACT = ACTS.length - 1;
const rnd = n => crypto.randomInt(n);
const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = rnd(i + 1); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const clean = (s, n) => String(s || '').replace(/[\p{Cf}\p{Cc}]/gu, '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
const ROOM_RE = /^[A-Z]{4}$/;
const LETTERS = 'BCDFGHJKLMNPQRSTVWXZ';   // no vowels: no rude words by accident
const stamp = () => String(Date.now()).padStart(15, '0') + crypto.randomBytes(3).toString('hex');
const role = k => CAST.find(r => r.key === k);
// Traditional version: talk in person. Phones keep the rules, your character, your alibi, notes and the secret vote.
// Lines about features that were taken out (telegrams, oaths, Corvin's phone missions, phone clues, searches, the lab) are dropped.
const OFF = /\boath|whisper|telegram|clues tab|evidence tab|case file|search warrant|warrants?\b|murder bag|inquiries|on your phone/i;
const trimOff = v => typeof v === 'string' ? v.split(/(?<=[.!?])\s+/).filter(x => !OFF.test(x)).join(' ')
  : Array.isArray(v) ? v.map(trimOff).filter(x => !(typeof x === 'string' && !x.trim())) : v;
const OFF_ACTIONS = new Set(['p:wire', 'p:oath', 'p:whisperDone', 'p:search', 'p:lab', 'host:whisper']);
const publicActs = ACTS.map(a => ({ n: a.n, title: a.title, script: trimOff(a.script), host: trimOff(a.host), phone: trimOff(a.phone), orders: trimOff(a.orders), hint: a.hint || null, scene: a.scene }));
const envelope = (c, cast, list) => {
  const holder = Object.entries(cast).find(([, k]) => k === c.by), p = holder && list.find(x => x.pid === holder[0]);
  return { kind: c.kind, id: c.id, act: c.act, title: c.title, text: c.text, scene: c.scene, by: role(c.by).name, played: p ? p.name : '' };
};

// ---------------------------------------------------------------- sealing
function keyFor(secret, label) { return crypto.createHmac('sha256', secret).update(label).digest(); }
function seal(secret, label, obj, pad = 0) {
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', keyFor(secret, label), iv);
  let txt = JSON.stringify(obj); if (pad) txt += ' '.repeat(Math.max(0, pad - Buffer.byteLength(txt)));
  const data = Buffer.concat([c.update(txt, 'utf8'), c.final()]);
  return { iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), data: data.toString('base64') };
}
function unseal(secret, label, e) {
  const d = crypto.createDecipheriv('aes-256-gcm', keyFor(secret, label), Buffer.from(e.iv, 'base64'));
  d.setAuthTag(Buffer.from(e.tag, 'base64'));
  return JSON.parse(Buffer.concat([d.update(Buffer.from(e.data, 'base64')), d.final()]).toString('utf8'));
}

// ---------------------------------------------------------------- the engine
export function makeEngine(store, secret) {
  if (!secret) throw new Error('SEAL_SECRET is not set');
  const K = (room, ...p) => [room, ...p].join('/');

  async function game(room) { const r = await store.getJ(K(room, 'game')); return r ? { g: r.data, etag: r.etag } : null; }
  async function mutate(room, fn) {
    for (let i = 0; i < 6; i++) {
      const r = await game(room); if (!r) throw new Error('No such game');
      const res = await fn(r.g);
      if (res === false) return r.g;
      r.g.ver = (r.g.ver || 0) + 1;
      if (await store.setJ(K(room, 'game'), r.g, { ifMatch: r.etag })) return r.g;
      await new Promise(ok => setTimeout(ok, 40 + rnd(120)));
    }
    throw new Error('The table is busy. Try again.');
  }
  async function players(room) {
    const keys = await store.list(K(room, 'p') + '/');
    const out = await Promise.all(keys.map(k => store.getJ(k).then(r => r && r.data)));
    return out.filter(Boolean).sort((a, b) => a.joined - b.joined);
  }
  const seatsOf = list => {
    const t = { F: 0, M: 0 }; list.forEach(p => { if (p.name && p.gender) t[p.gender]++; });
    return { F: { need: NEED.F, taken: t.F }, M: { need: NEED.M, taken: t.M } };
  };

  function timerView(g, now) {
    const t = g.timer, left = t.running ? Math.max(0, Math.round((t.endsAt - now) / 1000)) : t.left;
    const ready = (g.queueActs || []).filter(a => a <= g.act).length;
    return { running: t.running, left, interval: g.interval, next: g.exhibits.length, total: g.exhibits.length + (g.queueActs || []).length, ready };
  }
  function hostState(g, list, origin, room, now) {
    const lobby = list.map(p => {
      const k = g.cast[p.pid], r = k && role(k);
      return { name: p.name, gender: p.gender || null, ready: !!(p.name && p.bio), form: !!p.bio, online: now - (p.seen || 0) < ONLINE_MS,
        key: k || null, character: r ? r.name : null, archetype: r ? r.archetype : null, publicLine: r ? r.public : null,
        entrance: r ? r.entrance : null, ask: r ? r.ask : null, oath: false, goals: k ? (p.goals || []).filter(Boolean).length : 0, whispers: k ? (p.whispersDone || 0) : 0 };
    }).filter(p => p.name);
    const votes = list.filter(p => g.cast[p.pid] && p.vote && p.vote.killer).length;
    return { phase: g.phase, room, lobby, seats: seatsOf(list), act: g.act, acts: publicActs,
      vote: { open: g.voteOpen, cast: votes, of: Object.keys(g.cast).length },
      exhibits: g.exhibits, timer: timerView(g, now), joinUrls: [`${origin}/play?room=${room}`], statements: statementsOf(g, list), policeQs: POLICE_QS };
  }
  const evidenceOpts = g => (g.exhibits || []).filter(x => x.id && x.id !== 'brief').map(x => ({ k: x.id, t: `${x.id} · ${x.title}` }));
  const statementsOf = (g, list) => g.act < ALIBI_LOCK_ACT ? [] : list.filter(p => g.cast[p.pid]).map(p => {
    const k = g.cast[p.pid], a = k === KILLER ? (ALIBIS[k] || [])[p.alibi || 0] : null;
    return { key: k, name: role(k).name, played: p.name, where: a ? a.t : role(k).where };
  }).sort((a, b) => a.name.localeCompare(b.name));
  const castList = (cast, list) => Object.entries(cast).map(([pid, k]) => {
    const r = role(k), p = list.find(x => x.pid === pid);
    return { key: k, name: r.name, archetype: r.archetype, played: p ? p.name : '' };
  }).sort((a, b) => a.name.localeCompare(b.name));

  // ---------------------------------------------------------------- the deal
  function deal(list) {
    const named = list.filter(p => p.name);
    const w = named.filter(p => p.gender === 'F'), m = named.filter(p => p.gender === 'M');
    if (w.length !== NEED.F || m.length !== NEED.M) {
      const need = [];
      if (w.length < NEED.F) need.push(`${NEED.F - w.length} more ${NEED.F - w.length === 1 ? 'woman' : 'women'}`);
      if (m.length < NEED.M) need.push(`${NEED.M - m.length} more ${NEED.M - m.length === 1 ? 'man' : 'men'}`);
      if (w.length > NEED.F) need.push(`${w.length - NEED.F} fewer women`);
      if (m.length > NEED.M) need.push(`${m.length - NEED.M} fewer men`);
      return { err: `Larkspur is written for 7 women and 3 men. Still needed: ${need.join(' and ')}.` };
    }
    const noForm = named.filter(p => !p.bio).map(p => p.name);
    if (noForm.length) return { err: `Still filling in the police form: ${noForm.join(', ')}.` };
    const draw = (people, gd) => { const parts = shuffle(CAST.filter(r => r.gender === gd)); return shuffle(people).map((p, i) => ({ p, role: parts[i] })); };
    const cast = draw(w, 'F').concat(draw(m, 'M'));
    const playedBy = k => { const c = cast.find(x => x.role.key === k); return c ? c.p.name : null; };
    const dossiers = new Map();
    cast.forEach(c => {
      const r = c.role, guilty = r.key === KILLER;
      dossiers.set(c.p.pid, {
        key: r.key, name: r.name, archetype: r.archetype, public: r.public,
        part: { costume: r.costume, voice: r.voice, entrance: r.entrance }, mannerisms: r.mannerisms,
        secret: r.secret, defend: r.defend, danger: r.danger,
        night: { where: r.where, claim: r.claim, truth: r.truth, saw: r.saw },
        goals: r.goals, diary: r.diary, beats: r.beats,
        // traditional: everyone's alibi is fixed by their story; only the murderer must choose a cover story (each written to fit the night)
        alibis: guilty ? (ALIBIS[r.key] || [{ t: r.where, claim: r.claim, risk: '' }]) : [{ t: r.where, claim: r.claim, risk: 'Your alibi is part of your story. Stick to it.' }], alibiFixed: !guilty,
        relations: Object.entries(r.relations).map(([k, text]) => ({ name: role(k).name, played: playedBy(k), text })),
        company: cast.map(o => ({ key: o.role.key, name: o.role.name, archetype: o.role.archetype, public: o.role.public, played: o.p.name, me: o === c })).sort((a, b) => a.name.localeCompare(b.name)),
        clues: CLUES.filter(x => x.by === r.key).map(x => ({ id: x.id, act: x.act, title: x.title, text: x.text, star: false })),
        sealed: guilty ? KILLER_PAGE : INNOCENT_PAGE
      });
    });
    const castMap = Object.fromEntries(cast.map(c => [c.p.pid, c.role.key]));
    const k = cast.find(c => c.role.key === KILLER);
    const queue = CLUES.map(c => envelope(c, castMap, list)).concat(corvinSaw(k.p.bio))
      .map((c, i) => ({ c, i })).sort((a, b) => a.c.act - b.c.act || a.i - b.i).map(x => x.c);
    const b = k.p.bio;
    const saw = `What Corvin saw matched the murderer’s own police form: ${b.hand}-handed, ${b.watch === 'none' ? 'no watch' : 'a watch on the ' + b.watch + ' wrist'}, a ${b.top} top, ${b.ring === 'none' ? 'no ring' : 'a ring on the ' + b.ring + ' hand'}.`;
    const truth = { name: k.p.name, character: k.role.name, archetype: k.role.archetype, saw, sealedAt: new Date().toISOString() };
    return { cast: castMap, dossiers, queue, truth };
  }

  // the next envelope: only ones whose act has come
  function dueDrop(g, now) {
    if (!g.timer.running || now < g.timer.endsAt) return false;
    return openNext(g, now);
  }
  function openNext(g, now) {
    if (!(g.queueActs || []).length || g.queueActs[0] > g.act) { g.timer = { running: false, endsAt: 0, left: g.interval }; return false; }
    const q = unseal(secret, 'queue', g.queue);
    g.exhibits.push(q.shift()); g.queueActs.shift(); g.queue = seal(secret, 'queue', q);
    const more = g.queueActs.length && g.queueActs[0] <= g.act;
    g.timer = more && g.timer.running ? { running: true, endsAt: now + g.interval * 1000, left: g.interval } : { running: false, endsAt: 0, left: g.interval };
    return true;
  }

  function proofFor(g, castP) {
    const kp = castP.find(p => g.cast[p.pid] === SOLUTION.killer), ai = kp ? (kp.alibi || 0) : 0;
    let proof = SOLUTION.proof.slice();
    if (ai) {
      const a = (ALIBIS[SOLUTION.killer] || [])[ai];
      proof = proof.map(x => /^The alibi:/.test(x) && a
        ? `The alibi: he told you “${a.t.toLowerCase()}”. But Agnes saw him in her kitchen at 11.30 with the brown jar, Honoria saw him carry the glass across the hall, and Kitty’s photograph (R3-3) puts his bowler hat in the study.`
        : x);
    }
    return proof.concat(g.truthSaw ? [g.truthSaw] : []);
  }
  function score(g, list) {
    const castP = list.filter(p => g.cast[p.pid]);
    const tally = {}, best = {};
    castP.forEach(p => { const v = p.vote || {}; if (v.killer) tally[v.killer] = (tally[v.killer] || 0) + 1; if (v.best) best[v.best] = (best[v.best] || 0) + 1; });
    const top = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    const caught = top.length && top[0][0] === SOLUTION.killer && (top.length < 2 || top[1][1] < top[0][1]);
    const bestMax = Math.max(0, ...Object.values(best));
    const rows = castP.map(p => {
      const k = g.cast[p.pid], v = p.vote || {}, why = [];
      let pts = 0;
      const add = (n, t) => { pts += n; why.push(`${t} +${n}`); };
      if (k === SOLUTION.killer) { if (!caught) add(POINTS.getaway, 'got away with it'); }
      else if (v.killer === SOLUTION.killer) add(POINTS.killer, 'named the killer');
      if (v.method === SOLUTION.method) add(POINTS.method, 'method');
      if (v.motive === SOLUTION.motive) add(POINTS.motive, 'motive');
      if (v.when === KEY_WHEN) add(POINTS.when, 'time');
      if (v.evidence && KEY_EVIDENCE.includes(v.evidence)) add(POINTS.evidence, 'evidence');
      const goals = (p.goals || []).filter(Boolean).length; if (goals) add(goals * POINTS.goal, `${goals} goal${goals > 1 ? 's' : ''}`);
      const wh = Math.min(5, p.whispersDone || 0); if (wh) add(wh * POINTS.whisper, `${wh} whisper${wh > 1 ? 's' : ''}`);
      if (bestMax && best[k] === bestMax) add(POINTS.best, 'best performance');
      return { name: p.name, character: role(k).name, points: pts, why };
    }).sort((a, b) => b.points - a.points);
    return {
      tally: top.map(([k, n]) => [role(k).name, n]),
      best: Object.entries(best).filter(([, n]) => n === bestMax && n > 0).map(([k]) => role(k).name),
      caught: !!caught, rows,
      ballots: castP.filter(p => p.vote && p.vote.killer).length,
      method: METHODS.find(x => x.k === SOLUTION.method).t, motive: MOTIVES.find(x => x.k === SOLUTION.motive).t,
      reveal: SOLUTION.reveal, proof: proofFor(g, castP), last: SOLUTION.last,
      when: WHEN.find(x => x.k === KEY_WHEN).t, epilogue: caught ? EPILOGUE.caught : EPILOGUE.escaped
    };
  }

  // ---------------------------------------------------------------- requests
  async function hostAuth(room, key) {
    if (!ROOM_RE.test(room || '')) return false;
    const m = await store.getJ(K(room, 'meta'));
    const h = x => crypto.createHash('sha256').update(String(x)).digest();
    return !!(m && key && crypto.timingSafeEqual(h(key), h(m.data.key)));
  }
  async function me(room, pid) {
    if (!ROOM_RE.test(room || '') || !/^[0-9a-f-]{36}$/.test(pid || '')) return null;
    const r = await store.getJ(K(room, 'p', pid)); if (!r) return null;
    Object.defineProperty(r.data, '_etag', { value: r.etag, enumerable: false }); return r.data;
  }
  async function playerStage(room, g, p, wantDossier, now = Date.now()) {
    if (g.kicked && g.kicked.includes(p.pid)) return { kicked: true };
    if (!p.name) return { stage: 'name', seats: g.seats };
    if (!p.bio && !g.cast[p.pid]) return { stage: g.phase === 'lobby' ? 'intake' : 'late', name: p.name, seats: g.seats };
    if (!g.cast[p.pid]) return { stage: g.phase === 'lobby' ? 'pending' : 'late', name: p.name, seats: g.seats };
    const a = ACTS[g.act];
    const out = { stage: 'dossier', name: p.name, phase: g.phase, act: g.act, actInfo: { n: a.n, title: a.title, phone: publicActs[g.act].phone, scene: a.scene },
      whisper: p.whisper || null, bio: p.bio || null, alibi: p.alibi || 0, alibiLocked: g.act >= ALIBI_LOCK_ACT,
      goals: p.goals || [false, false, false], oathUsed: !!p.oathUsed, opened: g.exhibits.map(x => x.id) };
    if (wantDossier) { const d = await store.getJ(K(room, 'd', p.pid)); out.dossier = d ? unseal(secret, 'd:' + room + ':' + p.pid, d.data) : null; }
    if (out.dossier) out.dossier.clues = [];   // clues are revealed on the big screen and read aloud, not on phones
    out.vote = { open: g.voteOpen, mine: p.vote || null, options: g.voteOpen ? (g.castNames || []) : [], methods: g.voteOpen ? METHODS : [], motives: g.voteOpen ? MOTIVES : [],
      when: g.voteOpen ? WHEN : [], evidence: g.voteOpen ? evidenceOpts(g) : [] };
    // phones carry no clues, case file, searches or lab tests in the traditional version
    out.casefile = [];
    out.search = { open: false, left: 0, rooms: [], done: [] };
    out.lab = { open: false, items: [], mine: null };
    out.statements = [];
    out.oathTargets = [];
    return out;
  }

  return async function handle(body, { origin = '', now = Date.now() } = {}) {
    const a = String(body.a || ''), d = body.d || {}, room = String(body.room || '').toUpperCase(), c = body.c || {};
    const ev = []; const emit = (e, x) => ev.push({ e, d: x });

    if (a === 'create') {
      for (let i = 0; i < 20; i++) {
        const code = Array.from({ length: 4 }, () => LETTERS[rnd(LETTERS.length)]).join('');
        const key = crypto.randomBytes(16).toString('hex');
        if (await store.setJ(K(code, 'meta'), { key, created: now }, { ifNew: true })) {
          await store.setJ(K(code, 'game'), { phase: 'lobby', act: 0, ver: 1, interval: 2 * 60, timer: { running: false, endsAt: 0, left: 2 * 60 },
            exhibits: [], queue: null, queueActs: [], cast: {}, castNames: [], voteOpen: false, spot: null, kicked: [], envelope: null, truth: null,
            seats: { F: { need: 7, taken: 0 }, M: { need: 3, taken: 0 } }, names: [], closed: false, created: now });
          return { ack: { ok: true, room: code, key } };
        }
      }
      return { ack: { ok: false, err: 'Could not open a new table. Try again.' } };
    }
    if (!ROOM_RE.test(room)) return { ack: { ok: false, error: 'No such game. Check the four-letter code.' } };
    if (OFF_ACTIONS.has(a)) return { ack: { ok: false, error: 'Not in this version: say it to their face!' } };

    // ================================================================ HOST
    if (a.startsWith('host:')) {
      if (!(await hostAuth(room, body.key))) return { ack: { ok: false, err: 'Wrong key.' } };
      let list = await players(room);
      const refreshSeats = g => { const s = seatsOf(list), names = list.filter(p => p.name).map(p => p.name.toLowerCase());
        if (JSON.stringify(s) === JSON.stringify(g.seats) && JSON.stringify(names) === JSON.stringify(g.names)) return false;
        g.seats = s; g.names = names; return true; };
      let ack = null, g;
      switch (a) {
        case 'host:hello': case 'host:poll': {
          g = await mutate(room, g0 => { const x = g0.phase === 'live' && dueDrop(g0, now); const y = g0.phase === 'lobby' && refreshSeats(g0); return (x || y) ? true : false; });
          if (a === 'host:hello') ack = { ok: true };
          break;
        }
        case 'host:distribute': {
          let err = null;
          g = await mutate(room, async g0 => {
            if (g0.phase !== 'lobby') { err = 'Dossiers already distributed.'; return false; }
            const r = deal(list); if (r.err) { err = r.err; return false; }
            await Promise.all([...r.dossiers].map(([pid, dz]) => store.setJ(K(room, 'd', pid), seal(secret, 'd:' + room + ':' + pid, dz, 16000))));
            g0.cast = r.cast; g0.castNames = castList(r.cast, list);
            g0.queue = seal(secret, 'queue', r.queue); g0.queueActs = r.queue.map(x => x.act); g0.exhibits = [{ ...BRIEF, id: 'brief' }];
            g0.envelope = seal(secret, 'truth:' + room, r.truth, 2048);
            g0.phase = 'live'; g0.act = 0; g0.voteOpen = false; g0.timer = { running: false, endsAt: 0, left: g0.interval };
            return true;
          });
          ack = { ok: !err, err };
          break;
        }
        case 'host:timer':
          g = await mutate(room, g0 => {
            if (g0.phase !== 'live') return false;
            if (d.action === 'start' && !g0.timer.running && g0.queueActs.length && g0.queueActs[0] <= g0.act) { g0.timer = { running: true, endsAt: now + g0.timer.left * 1000, left: g0.timer.left }; return true; }
            if (d.action === 'pause' && g0.timer.running) { g0.timer = { running: false, endsAt: 0, left: Math.max(0, Math.round((g0.timer.endsAt - now) / 1000)) }; return true; }
            return false;
          }); break;
        case 'host:dropNow':
          g = await mutate(room, g0 => (g0.phase === 'live' ? openNext(g0, now) : false)); break;
        case 'host:interval':
          g = await mutate(room, g0 => { const m = Math.max(1, Math.min(30, Number(d.minutes) || 2)); g0.interval = m * 60; if (!g0.timer.running) g0.timer.left = g0.interval; return true; }); break;
        case 'host:act':
          g = await mutate(room, g0 => {
            if (g0.phase !== 'live') return false;
            g0.act = Math.max(0, Math.min(LAST_ACT, Number(d.to) || 0));
            g0.voteOpen = g0.act >= VOTE_ACT;
            if (g0.timer.running && !(g0.queueActs.length && g0.queueActs[0] <= g0.act)) g0.timer = { running: false, endsAt: 0, left: g0.interval };
            return true;
          }); break;
        case 'host:vote':
          g = await mutate(room, g0 => { if (g0.phase !== 'live') return false; g0.voteOpen = !!d.open; return true; }); break;
        case 'host:spot': {
          const p = list.find(x => x.name === d.name);
          const kind = ['hot', 'intro', 'seance', 'body', 'verdict'].includes(d.kind) ? d.kind : 'intro';
          g = await mutate(room, g0 => { if (!p) return false; g0.spot = { pid: p.pid, kind, id: now }; return true; });
          break;
        }
        case 'host:whisper': {
          let to = null, text = null;
          g = await mutate(room, g0 => {
            if (g0.phase !== 'live') return false;
            const pool = list.filter(x => g0.cast[x.pid]);
            const recent = g0.whispered || [];
            const fresh = pool.filter(x => !recent.includes(x.pid));
            const pick = (fresh.length ? fresh : pool)[rnd((fresh.length ? fresh : pool).length)]; if (!pick) return false;
            const used = g0.whisperUsed || [];
            let left = WHISPERS.map((t, i) => i).filter(i => !used.includes(i)); if (!left.length) left = WHISPERS.map((t, i) => i);
            const wi = left[rnd(left.length)];
            g0.whisperUsed = (left.length === WHISPERS.length ? [] : used).concat(wi);
            g0.whispered = (fresh.length ? recent : []).concat(pick.pid);
            g0.spot = { pid: pick.pid, kind: 'whisper', text: WHISPERS[wi], wid: now, id: now };
            to = pick; text = WHISPERS[wi]; return true;
          });
          if (to) for (let i = 0; i < 6; i++) { const p0 = await me(room, to.pid); if (!p0) break; p0.whisper = { id: now, text, done: false };
            if (await store.setJ(K(room, 'p', p0.pid), p0, { ifMatch: p0._etag })) break; }
          ack = { ok: !!to };
          break;
        }
        case 'host:kick': {
          const p = list.find(x => x.name === d.name);
          g = await mutate(room, g0 => { if (g0.phase !== 'lobby' || !p) return false; g0.kicked = (g0.kicked || []).concat(p.pid); return true; });
          if (p && g.phase === 'lobby') { await store.del(K(room, 'p', p.pid)); list = list.filter(x => x !== p);
            g = await mutate(room, g0 => refreshSeats(g0)); }
          break;
        }
        case 'host:reveal': {
          g = await mutate(room, g0 => {
            if (!g0.envelope || g0.truth) return false;
            const t = unseal(secret, 'truth:' + room, g0.envelope);
            g0.truthSaw = t.saw || null;
            g0.truth = { ...t, ...score(g0, list) }; g0.phase = 'ended'; g0.voteOpen = false; g0.act = LAST_ACT; g0.timer.running = false;
            return true;
          });
          ack = { ok: !!g.truth }; break;
        }
        case 'host:unmasked':
          g = await mutate(room, g0 => { if (!g0.truth || g0.unmasked) return false; g0.unmasked = true; return true; }); break;
        case 'host:reset':
          g = await mutate(room, g0 => { Object.assign(g0, { phase: 'lobby', act: 0, exhibits: [], queue: null, queueActs: [], cast: {}, castNames: [], voteOpen: false, envelope: null, truth: null, truthSaw: null, unmasked: false, whispered: [], whisperUsed: [], spot: null, timer: { running: false, endsAt: 0, left: g0.interval } }); return true; });
          await Promise.all(list.map(p => store.setJ(K(room, 'p', p.pid), { ...p, vote: null, goals: null, oathUsed: false, whisper: null, whispersDone: 0, alibi: 0, searches: [], lab: null })));
          break;
        case 'host:shutdown':
          g = await mutate(room, g0 => { g0.closed = true; g0.phase = g0.phase === 'live' ? 'ended' : g0.phase; return true; });
          emit('bye'); break;
        default: return { ack: { ok: false, err: 'Unknown request.' } };
      }
      const st = hostState(g, list, origin, room, now);
      const h = crypto.createHash('sha1').update(JSON.stringify({ ...st, timer: { ...st.timer, left: st.timer.running ? 0 : st.timer.left } })).digest('hex').slice(0, 16);
      const nc = { ...c };
      if (c.h !== h) { emit('state', st); nc.h = h; }
      if ((c.ex ?? g.exhibits.length) < g.exhibits.length && g.phase !== 'lobby') emit('exhibit', g.exhibits[g.exhibits.length - 1]);
      nc.ex = g.exhibits.length;
      for (const [pre, evn] of [['w', 'wire'], ['n', 'needle'], ['o', 'oath'], ['m', 'whisperDone'], ['s', 'search'], ['l', 'labSent']]) {
        const keys = (await store.list(K(room, pre) + '/')).filter(k => k > (c[pre] || K(room, pre, '0')));
        if (c[pre] === undefined) { nc[pre] = keys.length ? keys[keys.length - 1] : K(room, pre, '0'); continue; }   // first contact: don't replay history
        for (const k of keys) { const r = await store.getJ(k); if (r) emit(evn, r.data); nc[pre] = k; }
      }
      if (g.truth && !c.rv) { emit('reveal', g.truth); nc.rv = 1; }
      return { ack, events: ev, c: nc };
    }

    // ================================================================ GUESTS
    const r0 = await game(room); if (!r0) return { ack: { error: 'No such game. Check the four-letter code.' } };
    const g = r0.g;
    if (a === 'p:hello') {
      let p = await me(room, body.pid);
      if (!p) {
        if (g.phase !== 'lobby') return { ack: { error: 'This game has already started. Ask the host.' }, events: [{ e: 'closed', d: { msg: 'This game has already started.' } }] };
        p = { pid: crypto.randomUUID(), name: '', gender: null, vote: null, goals: null, oathUsed: false, joined: now, seen: now };
        await store.setJ(K(room, 'p', p.pid), p);
      } else if (now - (p.seen || 0) > 8000) { p.seen = now; await store.setJ(K(room, 'p', p.pid), p); }
      const st = await playerStage(room, g, p, true);
      if (st.kicked) return { ack: { pid: null }, events: [{ e: 'kicked' }] };
      return { ack: { pid: p.pid, ...st }, c: { gv: g.ver, sp: g.spot ? g.spot.id : 0, dv: st.stage === 'dossier' ? 1 : 0 } };
    }
    const p = await me(room, body.pid);
    if (!p) return { ack: { error: 'Reconnecting. Try again in a moment.' }, events: [{ e: 'kicked' }] };
    // conditional: a second request from the same phone (or the host's whisper) that saved in between wins, this one fails
    const save = async () => { if (!(await store.setJ(K(room, 'p', p.pid), p, { ifMatch: p._etag }))) throw new Error('The table is busy. Try again.'); };
    let ack = null;
    switch (a) {
      case 'p:poll': {
        const nc = { ...c };
        if (g.kicked && g.kicked.includes(p.pid)) return { events: [{ e: 'kicked' }] };
        if (g.closed || g.phase === 'ended') {
          const told = g.truth && (g.unmasked || g.closed), lvl = told ? 2 : 1;   // no name on the phones until the big screen has unmasked him
          if ((c.end || 0) < lvl) emit('ended', told ? { killer: g.truth.character, rows: g.truth.rows } : null); nc.end = lvl; }
        else if (c.gv !== g.ver) {
          const st = await playerStage(room, g, p, !c.dv);
          nc.dv = st.stage === 'dossier' ? 1 : 0;
          if (st.stage === 'name' || st.stage === 'pending') emit('seats', g.seats);
          emit('stage', st); nc.gv = g.ver;
        }
        if (g.spot && g.spot.pid === p.pid && g.spot.id > (c.sp || 0)) { emit('spot', { kind: g.spot.kind, from: g.spot.from || null, text: g.spot.text || null }); nc.sp = g.spot.id; }
        if (p.lab && !p.lab.told && now >= p.lab.at && g.cast[p.pid]) {
          const x = LAB.find(y => y.k === p.lab.k); p.lab.told = true; p.seen = now;
          if (await save().then(() => true, () => false)) { emit('lab', { t: x.t, result: x.result }); emit('stage', await playerStage(room, g, p, false, now)); }
        } else if (now - (p.seen || 0) > 10000) { p.seen = now; await save().catch(() => {}); }
        return { events: ev, c: nc };
      }
      case 'p:name': {
        if (g.cast[p.pid]) { ack = await playerStage(room, g, p, true); break; }
        if (g.phase !== 'lobby') { ack = { error: 'The dossiers have already gone out. Ask the host to reset the game to join.' }; break; }
        const n = clean(d.name, 28);
        if (!n || !/\p{L}/u.test(n)) { ack = { error: 'Write your name, in full.' }; break; }
        const gd = d.gender === 'F' || d.gender === 'M' ? d.gender : null;
        if (!gd) { ack = { error: 'Choose a lady’s part or a gentleman’s part.' }; break; }
        const list = await players(room), others = list.filter(o => o.pid !== p.pid);
        const st = seatsOf(others)[gd];
        if (st.taken >= st.need) { ack = { error: gd === 'F' ? 'All seven ladies’ parts are taken. Ask the host.' : 'All three gentlemen’s parts are taken. Ask the host.' }; break; }
        if (others.some(o => (o.name || '').toLowerCase() === n.toLowerCase())) { ack = { error: 'That name is already in the register. Add an initial.' }; break; }
        p.name = n; p.gender = gd; p.seen = now; await save();
        ack = await playerStage(room, g, p, false); break;
      }
      case 'p:intake': {
        if (g.cast[p.pid]) { ack = await playerStage(room, g, p, true); break; }
        if (!p.name) { ack = { error: 'Sign the visitors’ book first.' }; break; }
        if (g.phase !== 'lobby') { ack = { error: 'The dossiers have already gone out.' }; break; }
        const bio = cleanBio(d);
        if (!bio) { ack = { error: 'Every line of the form must be filled in.' }; break; }
        p.bio = bio; p.seen = now; await save();
        ack = await playerStage(room, g, p, false); break;
      }
      case 'p:alibi': {
        if (!g.cast[p.pid] || g.phase !== 'live') { ack = { error: 'Not now.' }; break; }
        if (g.act >= ALIBI_LOCK_ACT) { ack = { error: 'Too late: your alibi was locked in when round IV began.' }; break; }
        if (g.cast[p.pid] !== KILLER) { ack = { error: 'Your alibi is fixed by your story.' }; break; }
        const i = Number(d.i), opts = ALIBIS[g.cast[p.pid]] || [];
        if (!(i >= 0 && i < opts.length)) { ack = { error: 'Choose one of the four.' }; break; }
        p.alibi = i; await save();
        ack = await playerStage(room, g, p, false); break;
      }
      case 'p:search': {
        if (!g.cast[p.pid] || g.phase !== 'live') { ack = { error: 'Not now.' }; break; }
        if (g.act < SEARCH_FROM) { ack = { error: 'No searches until the body has been found.' }; break; }
        if (g.act > SEARCH_TO) { ack = { error: 'The searching is over. It is time to accuse.' }; break; }
        const r = SEARCHES.find(x => x.k === d.k); if (!r) { ack = { error: 'No such room.' }; break; }
        p.searches = p.searches || [];
        if (p.searches.includes(r.k)) { ack = { error: 'You have already searched there.' }; break; }
        if (p.searches.length >= WARRANTS) { ack = { error: 'You have used both of your search warrants.' }; break; }
        p.searches.push(r.k); await save();
        await store.setJ(K(room, 's', stamp()), { who: role(g.cast[p.pid]).name, played: p.name, room: r.t, at: now });
        ack = { ok: true, room: r.t, find: r.find, stage: await playerStage(room, g, p, false, now) }; break;
      }
      case 'p:lab': {
        if (!g.cast[p.pid] || g.phase !== 'live') { ack = { error: 'Not now.' }; break; }
        if (p.lab) { ack = { error: 'You have already used your test.' }; break; }
        const x = LAB.find(y => y.k === d.k); if (!x) { ack = { error: 'No such exhibit.' }; break; }
        if (g.act < x.minAct) { ack = { error: 'That cannot be tested yet.' }; break; }
        p.lab = { k: x.k, at: now + LAB_MS, told: false }; await save();
        await store.setJ(K(room, 'l', stamp()), { who: role(g.cast[p.pid]).name, item: x.t, at: now });
        ack = { ok: true, stage: await playerStage(room, g, p, false, now) }; break;
      }
      case 'p:whisperDone': {
        if (!g.cast[p.pid] || g.phase !== 'live') { ack = { error: 'Not now.' }; break; }
        if (!p.whisper || p.whisper.done) { ack = { error: 'No whisper to complete.' }; break; }
        p.whisper.done = true; p.whispersDone = (p.whispersDone || 0) + 1; await save();
        await store.setJ(K(room, 'm', stamp()), { at: now });
        ack = { ok: true, whisper: p.whisper }; break;
      }
      case 'p:goal': {
        if (!g.cast[p.pid] || g.phase !== 'live') { ack = { error: 'Not now.' }; break; }
        const i = Number(d.i); if (!(i >= 0 && i < 3)) { ack = { error: 'No such goal.' }; break; }
        p.goals = (p.goals || [false, false, false]).slice(0, 3); p.goals[i] = !!d.done; await save();
        ack = { ok: true, goals: p.goals }; break;
      }
      case 'p:oath': {
        if (!g.cast[p.pid] || g.phase !== 'live') { ack = { error: 'Not now.' }; break; }
        if (p.oathUsed) { ack = { error: 'You have already spent your oath token.' }; break; }
        if (g.act < 2) { ack = { error: 'Oath tokens can be spent once the body has been found.' }; break; }
        const target = Object.entries(g.cast).find(([pid, k]) => k === d.key && pid !== p.pid);
        if (!target) { ack = { error: 'Choose someone else at the table.' }; break; }
        p.oathUsed = true; await save();
        const from = role(g.cast[p.pid]).name, to = role(d.key).name;
        await store.setJ(K(room, 'o', stamp()), { from, fromPlayer: p.name, to, at: now });
        await mutate(room, g0 => { g0.spot = { pid: target[0], kind: 'oath', from, id: now }; return true; });
        ack = { ok: true, to }; break;
      }
      case 'p:wire': {
        if (!p.name) { ack = { error: 'Sign the register first.' }; break; }
        const t = clean(d.text, 140).toUpperCase();
        if (!t) { ack = { error: 'Nothing to send.' }; break; }
        if (now - (p.lastWire || 0) < 20000) { ack = { error: 'The counter clerk says wait. Twenty seconds between telegrams.' }; break; }
        p.lastWire = now; await save();
        await store.setJ(K(room, 'w', stamp()), { text: t, at: now });
        ack = { ok: true }; break;
      }
      case 'p:vote': {
        if (!g.cast[p.pid]) { ack = { error: 'Only guests at the table may accuse.' }; break; }
        if (!g.voteOpen || g.phase !== 'live') { ack = { error: 'The vote is closed.' }; break; }
        const v = { ...(p.vote || {}) }, keys = Object.values(g.cast);
        if (d.killer !== undefined) { if (!keys.includes(d.killer)) { ack = { error: 'Choose someone at the table.' }; break; } v.killer = d.killer; }
        if (d.method !== undefined) { if (!METHODS.some(x => x.k === d.method)) { ack = { error: 'Choose a method.' }; break; } v.method = d.method; }
        if (d.motive !== undefined) { if (!MOTIVES.some(x => x.k === d.motive)) { ack = { error: 'Choose a motive.' }; break; } v.motive = d.motive; }
        if (d.when !== undefined) { if (!WHEN.some(x => x.k === d.when)) { ack = { error: 'Choose a time.' }; break; } v.when = d.when; }
        if (d.evidence !== undefined) { if (!evidenceOpts(g).some(x => x.k === d.evidence)) { ack = { error: 'Choose an exhibit that has been opened.' }; break; } v.evidence = d.evidence; }
        if (d.best !== undefined) { if (!keys.includes(d.best) || d.best === g.cast[p.pid]) { ack = { error: 'Choose someone else for best performance.' }; break; } v.best = d.best; }
        p.vote = v; await save();
        ack = await playerStage(room, g, p, false); break;
      }
      case 'p:needle': {
        if (!g.cast[p.pid] || now - (p.lastNeedle || 0) < 3000 || (d.v !== 'TRUTH' && d.v !== 'DECEPTION')) break;
        p.lastNeedle = now; await save();
        await store.setJ(K(room, 'n', stamp()), { v: d.v }); break;
      }
      default: ack = { error: 'Unknown request.' };
    }
    return { ack, events: ev };
  };
}
