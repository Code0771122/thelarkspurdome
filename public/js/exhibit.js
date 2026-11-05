// Renders an envelope { kind, id, title, sub?, body[] | text, by?, played?, scene? } as a piece of paper,
// with the Blender scene it belongs to pinned above it, and who reads it aloud.
window.renderExhibit = (ex, number) => {
  const el = document.createElement('article');
  el.className = `ex paper k-${ex.kind}`;
  const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

  if (ex.scene && ex.scene.length) {
    const fig = mk('figure', 'ex-scene'); const img = new Image(); img.alt = '';
    const srcs = ex.scene.flatMap(n => [`/media/scenes/${n}.jpg`, `/media/stills/${n}.jpg`]); let i = 0;
    img.onerror = () => { i++; if (i < srcs.length) img.src = srcs[i]; else fig.remove(); };
    img.src = srcs[0]; fig.appendChild(img); el.appendChild(fig);
  }
  if (ex.kind !== 'telegram') el.appendChild(mk('span', 'clip'));
  const no = mk('div', 'exno');
  if (number !== 0) no.appendChild(mk('span', 'stamp', ex.id ? `Envelope ${ex.id}` : `Exhibit ${number}`));
  el.appendChild(no);
  el.appendChild(mk('h2', '', ex.title));
  if (ex.host) el.appendChild(mk('p', 'reader', 'Read aloud by the host · Corvin’s own notebook'));
  else if (ex.by) el.appendChild(mk('p', 'reader', `Read aloud by ${ex.by}${ex.played ? ` (${ex.played})` : ''}`));
  else if (ex.sub) el.appendChild(mk('p', 'sub', ex.sub));
  (ex.body || [ex.text]).forEach(line => el.appendChild(mk('p', '', line)));
  if (ex.kind === 'brief') el.appendChild(mk('span', 'stamp conf', 'Invitation'));
  return el;
};
