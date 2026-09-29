import { app, protocol, net } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { getSetting } from './settings-store';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export const NULL_HOST = 'null-pages';
export const NULL_NEWTAB_URL = `file://${NULL_HOST}/newtab.html`;

type ThemeName = 'blue' | 'red' | 'neutral';

interface Palette {
  bg: string;
  surface: string;
  surfaceHover: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentHover: string;
  glow: string;
  gridLine: string;
}

function normalizeTheme(t: unknown): ThemeName {
  return t === 'red' || t === 'neutral' ? t : 'blue';
}

function currentTheme(): { theme: ThemeName; appearance: 'light' | 'dark' } {
  try {
    return {
      theme: normalizeTheme(getSetting('theme')),
      appearance: getSetting('appearance') === 'light' ? 'light' : 'dark',
    };
  } catch {
    return { theme: 'blue', appearance: 'dark' };
  }
}

function palette(theme: ThemeName, appearance: 'light' | 'dark'): Palette {
  if (appearance === 'light') {
    if (theme === 'red') {
      return { bg: '#fff6f6', surface: '#ffecec', surfaceHover: '#fbdcdc', border: '#f0c9c9', text: '#161114', muted: '#8c5d5d', accent: '#d13438', accentHover: '#b02a2e', glow: 'rgba(209,52,56,0.14)', gridLine: 'rgba(209,52,56,0.08)' };
    }
    if (theme === 'neutral') {
      return { bg: '#ffffff', surface: '#f4f4f6', surfaceHover: '#e8e8ec', border: '#dcdce2', text: '#111114', muted: '#6d6d78', accent: '#52525e', accentHover: '#3f3f48', glow: 'rgba(82,82,94,0.12)', gridLine: 'rgba(17,17,20,0.06)' };
    }
    return { bg: '#f6f8ff', surface: '#e9efff', surfaceHover: '#dce6ff', border: '#c9d6f5', text: '#0e1220', muted: '#5d6b8c', accent: '#3d68e0', accentHover: '#2f55c4', glow: 'rgba(79,124,255,0.16)', gridLine: 'rgba(61,104,224,0.09)' };
  }
  if (theme === 'red') {
    return { bg: '#140f12', surface: '#1e1519', surfaceHover: '#2a1d22', border: '#3d2b32', text: '#faf2f3', muted: '#9a8b90', accent: '#e5484d', accentHover: '#c93a3e', glow: 'rgba(229,72,77,0.16)', gridLine: 'rgba(229,72,77,0.07)' };
  }
  if (theme === 'neutral') {
    return { bg: '#101014', surface: '#17171c', surfaceHover: '#1f1f26', border: '#2a2a32', text: '#f2f2f5', muted: '#8a8a94', accent: '#b6b6c0', accentHover: '#9898a3', glow: 'rgba(182,182,192,0.12)', gridLine: 'rgba(255,255,255,0.05)' };
  }
  return { bg: '#0d1120', surface: '#141a2e', surfaceHover: '#1c2440', border: '#2b3554', text: '#f2f4fa', muted: '#8b93ad', accent: '#4f7cff', accentHover: '#3d68e0', glow: 'rgba(79,124,255,0.18)', gridLine: 'rgba(79,124,255,0.08)' };
}

const TILES: { mono: string; name: string; url: string }[] = [
  { mono: 'GH', name: 'GitHub', url: 'https://github.com' },
  { mono: 'YT', name: 'YouTube', url: 'https://www.youtube.com' },
  { mono: 'W', name: 'Wikipedia', url: 'https://www.wikipedia.org' },
  { mono: 'MDN', name: 'MDN Web Docs', url: 'https://developer.mozilla.org' },
  { mono: 'HN', name: 'Hacker News', url: 'https://news.ycombinator.com' },
  { mono: 'SO', name: 'Stack Overflow', url: 'https://stackoverflow.com' },
];

const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

export function newTabHtml(theme?: unknown, appearance?: unknown): string {
  const t = normalizeTheme(theme ?? currentTheme().theme);
  const a = (appearance ?? currentTheme().appearance) === 'light' ? 'light' : 'dark';
  const p = palette(t, a);
  const tiles = TILES.map(
    (tile) =>
      `<a class="tile reveal" style="--d:.${TILES.indexOf(tile) + 5}s" href="null://go?to=${encodeURIComponent(tile.url)}"><span class="mono">${tile.mono}</span><span class="tname">${tile.name}</span></a>`,
  ).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="color-scheme" content="${a}"><title>New Tab</title>
<style>
*{box-sizing:border-box}::selection{background:${p.accent};color:#fff}
body{margin:0;min-height:100vh;background:${p.bg};color:${p.text};font-family:"Space Grotesk",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;display:flex;flex-direction:column;-webkit-font-smoothing:antialiased}
.bg{position:fixed;inset:0;pointer-events:none;background:radial-gradient(720px 420px at 50% -80px,${p.glow},transparent 70%),linear-gradient(${p.gridLine} 1px,transparent 1px),linear-gradient(90deg,${p.gridLine} 1px,transparent 1px);background-size:auto,44px 44px,44px 44px;mask-image:radial-gradient(ellipse 90% 80% at 50% 20%,#000 30%,transparent 100%)}
.topbar{display:flex;justify-content:space-between;align-items:center;padding:20px 28px;font-size:12px;letter-spacing:.22em;color:${p.muted}}
.brand-mini{font-weight:700;letter-spacing:.34em}
.clock{text-align:right;letter-spacing:.12em}.clock b{display:block;font-size:15px;letter-spacing:.06em;color:${p.text}}
main{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 20px 40px;margin-top:-4vh}
.eyebrow{font-size:11px;letter-spacing:.42em;color:${p.muted};margin-bottom:18px}
.wordmark{font-size:clamp(84px,17vw,196px);line-height:.95;font-weight:800;letter-spacing:.16em;margin:0 0 10px;padding-left:.16em;background:linear-gradient(180deg,${p.text},${p.muted});-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.tagline{font-size:15px;color:${p.muted};margin:0 0 34px;letter-spacing:.02em}
form.search{display:flex;gap:10px;width:min(620px,92vw)}
.search input{flex:1;padding:15px 20px;border-radius:14px;border:1px solid ${p.border};background:${p.surface};color:${p.text};font-size:16px;outline:none;transition:border-color .25s ${EASE},box-shadow .25s ${EASE},transform .25s ${EASE}}
.search input:focus{border-color:${p.accent};box-shadow:0 0 0 3px ${p.glow}}
.search input::placeholder{color:${p.muted}}
.search button{padding:0 28px;border-radius:14px;border:0;background:${p.accent};color:#fff;font-size:15px;font-weight:600;cursor:pointer;transition:background .25s ${EASE},transform .25s ${EASE}}
.search button:hover{background:${p.accentHover};transform:translateY(-1px)}
.search button:active{transform:translateY(0)}
.keys{margin-top:14px;font-size:12px;color:${p.muted};letter-spacing:.04em}.keys kbd{border:1px solid ${p.border};border-radius:5px;padding:1px 6px;font-size:11px;background:${p.surface};font-family:inherit}
.tiles{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-top:36px;width:min(680px,94vw)}
.tile{display:flex;flex-direction:column;align-items:flex-start;gap:10px;padding:14px;border:1px solid ${p.border};border-radius:12px;background:${p.surface};color:${p.text};text-decoration:none;transition:transform .3s ${EASE},border-color .3s ${EASE},background .3s ${EASE}}
.tile:hover{transform:translateY(-3px);border-color:${p.accent};background:${p.surfaceHover}}
.mono{font-size:11px;font-weight:800;letter-spacing:.14em;color:${p.accent}}
.tname{font-size:12.5px;color:${p.muted}}.tile:hover .tname{color:${p.text}}
footer{padding:18px;text-align:center;font-size:12px;color:${p.muted};letter-spacing:.03em}
a:focus-visible,button:focus-visible,input:focus-visible{outline:2px solid ${p.accent};outline-offset:3px}
.reveal{opacity:0;transform:translateY(18px);transition:opacity .7s ${EASE} var(--d,0s),transform .7s ${EASE} var(--d,0s)}
body.loaded .reveal{opacity:1;transform:none}
@media(max-width:640px){.tiles{grid-template-columns:repeat(3,1fr)}.topbar{padding:16px}.wordmark{letter-spacing:.1em;padding-left:.1em}}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}.reveal{opacity:1;transform:none}}
</style></head><body><div class="bg"></div>
<header class="topbar reveal" style="--d:.05s"><span class="brand-mini">NULL</span><span class="clock"><b id="clock">--:--</b><span id="date"></span></span></header>
<main><p class="eyebrow reveal" style="--d:.15s">PRIVATE&nbsp;SESSION</p>
<h1 class="wordmark reveal" style="--d:.25s">NULL</h1>
<p class="tagline reveal" style="--d:.35s">A minimal browser that forgets everything when it closes.</p>
<form class="search reveal" style="--d:.45s" id="f"><input id="q" placeholder="Search or enter address" autocomplete="off" spellcheck="false" aria-label="Search or enter address"><button type="submit">Go</button></form>
<div class="keys reveal" style="--d:.5s"><kbd>Ctrl</kbd> + <kbd>L</kbd> address &nbsp;·&nbsp; <kbd>Ctrl</kbd> + <kbd>T</kbd> new tab &nbsp;·&nbsp; <kbd>Ctrl</kbd> + <kbd>F</kbd> find</div>
<nav class="tiles" aria-label="Quick links">${tiles}</nav>
</main><footer class="reveal" style="--d:.7s">Temporary private session — history, cookies and storage are cleared when Null closes.</footer>
<script>
requestAnimationFrame(()=>requestAnimationFrame(()=>document.body.classList.add('loaded')));
const f=document.getElementById('f'),q=document.getElementById('q');q.focus();
f.addEventListener('submit',e=>{e.preventDefault();const v=q.value.trim();if(v)location.href='null://go?to='+encodeURIComponent(v);});
const c=document.getElementById('clock'),d=document.getElementById('date');
function tick(){try{const n=new Date();c.textContent=n.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});d.textContent=n.toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'});}catch{}}tick();setInterval(tick,10000);
</script></body></html>`;
}

export function errorHtml(code: string, desc: string, url: string, theme?: unknown, appearance?: unknown): string {
  const t = normalizeTheme(theme ?? currentTheme().theme);
  const a = (appearance ?? currentTheme().appearance) === 'light' ? 'light' : 'dark';
  const p = palette(t, a);
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="color-scheme" content="${a}"><title>Cannot reach page</title>
<style>
*{box-sizing:border-box}::selection{background:${p.accent};color:#fff}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:${p.bg};color:${p.text};font-family:"Space Grotesk",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;padding:20px}
.card{width:min(520px,94vw);background:${p.surface};border:1px solid ${p.border};border-radius:16px;padding:32px;animation:rise .6s ${EASE}}
@keyframes rise{from{opacity:0;transform:translateY(16px)}}
.code-big{font-size:13px;font-weight:800;letter-spacing:.3em;color:${p.accent};margin-bottom:12px}
h1{font-size:24px;margin:0 0 8px;letter-spacing:-.01em}p{color:${p.muted};font-size:14px;line-height:1.6;margin:0}
.url{font-size:12px;color:${p.muted};margin-top:14px;word-break:break-all;border-top:1px solid ${p.border};padding-top:14px}
.row{display:flex;gap:8px;margin-top:22px;flex-wrap:wrap}
button{padding:10px 18px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid ${p.border};background:${p.surfaceHover};color:${p.text};transition:transform .25s ${EASE},background .25s ${EASE}}
button:hover{transform:translateY(-1px)}button.primary{background:${p.accent};border-color:${p.accent};color:#fff}button.primary:hover{background:${p.accentHover}}
button:focus-visible{outline:2px solid ${p.accent};outline-offset:3px}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style></head><body><div class="card">
<div class="code-big">OFFLINE</div>
<h1>This page can't be reached</h1>
<p>${escapeHtml(desc) || 'The connection failed.'}</p>
<div class="url">${escapeHtml(url)}</div>
<div class="row"><button class="primary" onclick="location.reload()">Retry</button><button onclick="history.back()">Go back</button><button onclick="location.href='NULL_NEWTAB_PLACEHOLDER'">New tab</button></div>
</div></body></html>`.replace('NULL_NEWTAB_PLACEHOLDER', NULL_NEWTAB_URL);
}

function pagesDir(): string {
  const dir = path.join(app.getPath('userData'), 'null-pages');
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    /* ignore */
  }
  return dir;
}

export function writeInternalPages(): { newtab: string; errorFor: (code: string, desc: string, url: string) => string } {
  const dir = pagesDir();
  const newtabPath = path.join(dir, 'newtab.html');
  const { theme, appearance } = currentTheme();
  try {
    fs.writeFileSync(newtabPath, newTabHtml(theme, appearance));
  } catch {
    /* ignore */
  }
  const newtabUrl = `file://${newtabPath}`;
  return {
    newtab: newtabUrl,
    errorFor: (code, desc, url) => {
      const p = path.join(dir, `error-${Date.now()}.html`);
      try {
        fs.writeFileSync(p, errorHtml(code, desc, url, theme, appearance).replace(NULL_NEWTAB_URL, newtabUrl));
      } catch {
        /* ignore */
      }
      return `file://${p}`;
    },
  };
}

export function getNewtabUrl(): string {
  return `file://${path.join(pagesDir(), 'newtab.html')}`;
}

export function registerNullProtocol(): void {
  try {
    protocol.handle('null', async (request) => {
      let u: URL;
      try {
        u = new URL(request.url);
      } catch {
        return new Response('Bad request', { status: 400 });
      }
      const { theme, appearance } = currentTheme();
      const host = u.hostname || u.host;
      if (host === 'error') {
        return new Response(
          errorHtml(
            u.searchParams.get('code') ?? '',
            u.searchParams.get('desc') ?? '',
            u.searchParams.get('url') ?? '',
            theme,
            appearance,
          ).replace(NULL_NEWTAB_URL, getNewtabUrl()),
          { headers: { 'content-type': 'text/html' } },
        );
      }
      if (host === 'go') {
        return new Response('Redirecting…', { status: 204 });
      }
      if (host === 'newtab') {
        try {
          return new Response(newTabHtml(theme, appearance), { headers: { 'content-type': 'text/html' } });
        } catch {
          return new Response('New tab', { status: 200 });
        }
      }
      return net.fetch(request);
    });
  } catch {
    /* already registered (e.g. second window boot) */
  }
}

export function cleanupErrorPages(): void {
  try {
    const dir = pagesDir();
    for (const f of fs.readdirSync(dir)) {
      if (f.startsWith('error-')) {
        try {
          fs.unlinkSync(path.join(dir, f));
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    /* ignore */
  }
}
