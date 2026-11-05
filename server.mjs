// The Larkspur Dome, laptop version: the same game as the website, run from this laptop over the home Wi-Fi.
// No internet needed (fonts fall back if there is none). Double-click PLAY; this starts by itself.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import crypto from 'node:crypto'; import { exec } from 'node:child_process'; import { fileURLToPath } from 'node:url';
import { makeEngine } from './game/engine.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, 'public');
const PORT = Number(process.env.PORT || 8888);
const mem = new Map(); let n = 0;
const store = {
  async getJ(k) { const v = mem.get(k); return v ? { data: JSON.parse(v.s), etag: v.e } : null; },
  async setJ(k, d, o = {}) { const v = mem.get(k); if (o.ifNew && v) return false; if (o.ifMatch && (!v || v.e !== o.ifMatch)) return false; mem.set(k, { s: JSON.stringify(d), e: '"' + (++n) + '"' }); return true; },
  async del(k) { mem.delete(k); },
  async list(p) { return [...mem.keys()].filter(k => k.startsWith(p)).sort(); }
};
// a fresh secret every time the game starts: the answer exists only while it runs
const engine = makeEngine(store, crypto.randomBytes(32).toString('hex'));
function lan() {
  for (const list of Object.values(os.networkInterfaces())) for (const a of list || [])
    if (a.family === 'IPv4' && !a.internal && !/^169\.254\./.test(a.address)) return a.address;
  return 'localhost';
}
const CLOUD = (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || '').replace(/\/$/, '');
const LAN = CLOUD || `http://${lan()}:${PORT}`, HOST_URL = CLOUD ? `${CLOUD}/host` : `http://localhost:${PORT}/host`;
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mp4': 'video/mp4', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.webmanifest': 'application/manifest+json' };
// the big screen opens as its own full-screen window (no tabs, no address bar). Esc or F11 leaves full screen.
function openBrowser(u) {
  if (process.platform === 'win32') {
    const L = process.env.LOCALAPPDATA || '', P = process.env.PROGRAMFILES || 'C:\\Program Files', P86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';
    const apps = [path.join(P, 'Google', 'Chrome', 'Application', 'chrome.exe'), path.join(P86, 'Google', 'Chrome', 'Application', 'chrome.exe'), path.join(L, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(P86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'), path.join(P, 'Microsoft', 'Edge', 'Application', 'msedge.exe')];
    const app = apps.find(f => { try { return fs.existsSync(f); } catch { return false; } });
    if (app) return exec(`"${app}" --app="${u}" --start-fullscreen --autoplay-policy=no-user-gesture-required`);
    return exec(`start "" "${u}"`);
  }
  if (process.platform === 'darwin') return exec(`open -a "Google Chrome" --args --app="${u}" --start-fullscreen || open "${u}"`);
  return exec(`xdg-open "${u}"`);
}
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/api' && req.method === 'POST') {
    let b = ''; for await (const ch of req) b += ch;
    try {
      const body = JSON.parse(b);
      const out = await engine(body, { origin: LAN });
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(out));
      if (body.a === 'host:shutdown' && out.events && out.events.some(e => e.e === 'bye')) setTimeout(() => process.exit(0), 1500);
    } catch (e) { console.error(e); res.writeHead(500); res.end(JSON.stringify({ ack: { error: 'The house is busy. Try again.' } })); }
    return;
  }
  let p = decodeURIComponent(u.pathname); if (p === '/') p = '/index.html'; if (!path.extname(p)) p += '.html';
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); res.end('Not here'); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
server.on('error', err => { if (err.code === 'EADDRINUSE') { openBrowser(HOST_URL); setTimeout(() => process.exit(0), 300); return; } throw err; });
server.listen(PORT, '0.0.0.0', () => {
  if (!CLOUD) openBrowser(HOST_URL);
  console.log('\n  THE LARKSPUR DOME — running\n');
  console.log(`  BIG SCREEN (opens by itself):   ${HOST_URL}`);
  console.log(`  PHONES (same Wi-Fi):            ${LAN}/play\n`);
});
