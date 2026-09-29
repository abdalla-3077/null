import { app, protocol, net } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { getSetting } from './settings-store';
import { SITE_ICONS } from './site-icon-data';
import { SEARCH_ENGINES } from '../shared/config';
import type { SearchEngineId, WallpaperId } from '../shared/types';

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
  borderStrong: string;
  text: string;
  muted: string;
  accent: string;
  accentHover: string;
  accentSoft: string;
}

function normalizeTheme(t: unknown): ThemeName {
  return t === 'blue' || t === 'red' ? t : 'neutral';
}

function currentTheme(): { theme: ThemeName; appearance: 'light' | 'dark' } {
  try {
    return {
      theme: normalizeTheme(getSetting('theme')),
      appearance: getSetting('appearance') === 'light' ? 'light' : 'dark',
    };
  } catch {
    return { theme: 'neutral', appearance: 'dark' };
  }
}

function palette(theme: ThemeName, appearance: 'light' | 'dark'): Palette {
  if (appearance === 'light') {
    if (theme === 'red') {
      return { bg: '#fff6f6', surface: '#ffecec', surfaceHover: '#fbdcdc', border: '#f0c9c9', borderStrong: '#dda9a9', text: '#161114', muted: '#7d4f4f', accent: '#c9302f', accentHover: '#a82726', accentSoft: 'rgba(201,48,47,0.14)' };
    }
    if (theme === 'neutral') {
      return { bg: '#ffffff', surface: '#f5f5f7', surfaceHover: '#ebebef', border: '#dcdce2', borderStrong: '#c4c4ce', text: '#111114', muted: '#63636d', accent: '#3f3f47', accentHover: '#2b2b31', accentSoft: 'rgba(63,63,71,0.12)' };
    }
    return { bg: '#f6f8ff', surface: '#e9efff', surfaceHover: '#dce6ff', border: '#c9d6f5', borderStrong: '#a9bde9', text: '#0e1220', muted: '#4f5d7d', accent: '#3d68e0', accentHover: '#2f55c4', accentSoft: 'rgba(61,104,224,0.14)' };
  }
  if (theme === 'red') {
    return { bg: '#140f12', surface: '#1e1519', surfaceHover: '#2a1d22', border: '#3d2b32', borderStrong: '#553c45', text: '#faf2f3', muted: '#9a8b90', accent: '#e5484d', accentHover: '#c93a3e', accentSoft: 'rgba(229,72,77,0.16)' };
  }
  if (theme === 'blue') {
    return { bg: '#0d1120', surface: '#141a2e', surfaceHover: '#1c2440', border: '#2b3554', borderStrong: '#3b476e', text: '#f2f4fa', muted: '#8b93ad', accent: '#4f7cff', accentHover: '#3d68e0', accentSoft: 'rgba(79,124,255,0.16)' };
  }
  return { bg: '#0e0e11', surface: '#151518', surfaceHover: '#1d1d22', border: '#28282e', borderStrong: '#3a3a42', text: '#ededf0', muted: '#8c8c96', accent: '#6d6d78', accentHover: '#5a5a64', accentSoft: 'rgba(109,109,120,0.22)' };
}

const TILES: { name: string; url: string; icon: string }[] = [
  { name: 'GitHub', url: 'https://github.com', icon: SITE_ICONS['github.svg'] },
  { name: 'YouTube', url: 'https://www.youtube.com', icon: SITE_ICONS['youtube.png'] },
  { name: 'Wikipedia', url: 'https://www.wikipedia.org', icon: SITE_ICONS['wikipedia.png'] },
  { name: 'MDN Web Docs', url: 'https://developer.mozilla.org', icon: SITE_ICONS['mdn.png'] },
  { name: 'Hacker News', url: 'https://news.ycombinator.com', icon: SITE_ICONS['hn.svg'] },
  { name: 'Stack Overflow', url: 'https://stackoverflow.com', icon: SITE_ICONS['stackoverflow.png'] },
];

const ENGINE_ICONS: Record<SearchEngineId, string> = {
  google: SITE_ICONS['google.png'],
  bing: SITE_ICONS['bing.png'],
  duckduckgo: SITE_ICONS['duckduckgo.png'],
};

export interface NewTabOptions {
  providers?: { name: string; url: string }[];
  showAI?: boolean;
  wallpaper?: WallpaperId;
}

const WALLPAPERS: { id: WallpaperId; name: string }[] = [
  { id: 'none', name: 'None' },
  { id: 'coastal-dusk', name: 'Coastal dusk' },
  { id: 'alpine-fog', name: 'Alpine fog' },
  { id: 'desert-night', name: 'Desert night' },
  { id: 'forest-canopy', name: 'Forest canopy' },
  { id: 'arctic-glow', name: 'Arctic glow' },
  { id: 'city-rain', name: 'City rain' },
];

function wallpaperDataUri(id: WallpaperId): string {
  try {
    const root = app.isPackaged ? process.resourcesPath : app.getAppPath();
    const file = path.join(root, app.isPackaged ? 'wallpapers' : 'assets/wallpapers', `${id}.svg`);
    return `data:image/svg+xml;base64,${fs.readFileSync(file).toString('base64')}`;
  } catch {
    return '';
  }
}

function currentNewTabOptions(): NewTabOptions {
  try {
    const wallpaper = getSetting('newTabWallpaper');
    return {
      providers: (getSetting('aiProviders') as { name: string; url: string }[]).map((p) => ({
        name: p.name,
        url: p.url,
      })),
      showAI: getSetting('newTabShowAI') !== false,
      wallpaper: WALLPAPERS.some((item) => item.id === wallpaper) ? wallpaper : 'coastal-dusk',
    };
  } catch {
    return { providers: [], showAI: false, wallpaper: 'coastal-dusk' };
  }
}

function currentEngine(): SearchEngineId {
  try {
    const e = getSetting('searchEngine');
    if (e === 'bing' || e === 'duckduckgo') return e;
    return 'google';
  } catch {
    return 'google';
  }
}

export function newTabHtml(theme?: unknown, appearance?: unknown, opts?: NewTabOptions): string {
  const t = normalizeTheme(theme ?? currentTheme().theme);
  const a = (appearance ?? currentTheme().appearance) === 'light' ? 'light' : 'dark';
  const o = opts ?? currentNewTabOptions();
  const p = palette(t, a);
  const wallpaper = WALLPAPERS.find((item) => item.id === o.wallpaper)?.id ?? 'coastal-dusk';
  const wallpaperImage = wallpaper === 'none' ? '' : wallpaperDataUri(wallpaper);
  const homeText = wallpaper === 'none' ? p.text : '#fff';
  const homeMuted = wallpaper === 'none' ? p.muted : 'rgba(255,255,255,.75)';
  const homeSurface = wallpaper === 'none' ? p.surface : 'rgba(16,20,30,.76)';
  const homeHover = wallpaper === 'none' ? p.surfaceHover : 'rgba(255,255,255,.14)';
  const homeBorder = wallpaper === 'none' ? p.border : 'rgba(255,255,255,.3)';
  const homeFocus = wallpaper === 'none' ? p.accent : '#fff';
  const engine = currentEngine();
  const engineName = SEARCH_ENGINES[engine].name;
  const engineIcon = ENGINE_ICONS[engine];
  const tiles = TILES.map(
    (tile) =>
      `<a class="site" href="null://go?to=${encodeURIComponent(tile.url)}" title="${escapeHtml(tile.name)} — ${escapeHtml(tile.url)}"><span class="site-icon"><img src="${tile.icon}" alt="" draggable="false" loading="eager"></span><span class="site-name">${escapeHtml(tile.name)}</span></a>`,
  ).join('');
  const aiRow =
    o.showAI !== false && o.providers && o.providers.length > 0
      ? `<nav class="ai" aria-label="AI shortcuts">${o.providers
          .slice(0, 6)
          .map((pr) => `<a href="null://go?to=${encodeURIComponent(pr.url)}">${escapeHtml(pr.name)}</a>`)
          .join('')}</nav>`
      : '';
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="color-scheme" content="${a}"><title>New Tab</title>
<style>
*{box-sizing:border-box}
::selection{background:${p.accent};color:#fff}
body{margin:0;min-height:100vh;display:flex;flex-direction:column;background:${p.bg}${wallpaperImage ? ` url("${wallpaperImage}") center/cover fixed` : ''};color:${homeText};font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-size:14px;-webkit-font-smoothing:antialiased;isolation:isolate}
body:before{content:"";position:fixed;inset:0;z-index:-1;background:${wallpaperImage ? 'linear-gradient(90deg,rgba(7,10,18,.74),rgba(7,10,18,.42) 58%,rgba(7,10,18,.2)),linear-gradient(0deg,rgba(7,10,18,.48),transparent 45%)' : 'none'}}
a{color:inherit}
:focus-visible{outline:2px solid ${homeFocus};outline-offset:3px;border-radius:6px}
.bar{display:flex;align-items:center;justify-content:space-between;padding:22px 32px;border-bottom:1px solid ${wallpaperImage ? 'rgba(255,255,255,.18)' : p.border};color:${homeText}}
.lockup{display:flex;align-items:center;gap:9px;font-weight:700;letter-spacing:.34em;font-size:12px}
.lockup svg{display:block}
.clock{display:flex;align-items:baseline;gap:10px;color:${homeMuted};font-size:12px}
.clock b{font-size:13px;font-variant-numeric:tabular-nums;color:${homeText};font-weight:600}
main{flex:1;display:flex;align-items:center;justify-content:flex-start;padding:8vh 8vw 7vh}
.col{width:100%;max-width:720px}
.greet{margin:0 0 8px;font-size:clamp(34px,4.2vw,54px);font-weight:600;letter-spacing:-.045em;line-height:1.06;color:${homeText};text-shadow:${wallpaperImage ? '0 2px 24px rgba(0,0,0,.2)' : 'none'}}
.sub{margin:0 0 30px;font-size:14px;color:${homeMuted};line-height:1.5}
form.search{display:flex;gap:10px;align-items:stretch}
.inp{flex:1;min-width:0;display:flex;align-items:center;gap:4px;padding:0 7px;border:1px solid ${wallpaperImage ? 'rgba(255,255,255,.36)' : p.border};border-radius:14px;background:${homeSurface};backdrop-filter:blur(18px);box-shadow:0 12px 40px rgba(0,0,0,.18);transition:border-color .18s ease,box-shadow .18s ease}
.inp:focus-within{border-color:${homeFocus};box-shadow:0 0 0 3px ${wallpaperImage ? 'rgba(255,255,255,.2)' : p.accentSoft},0 12px 40px rgba(0,0,0,.18)}
.eng{display:inline-flex;align-items:center;gap:7px;padding:9px;border:0;border-radius:8px;background:transparent;color:${homeMuted};font:inherit;font-size:12px;font-weight:600;cursor:pointer;flex:none}
.eng:hover{background:${homeHover};color:${homeText}}
.eng img{width:16px;height:16px;border-radius:50%;background:#fff;display:block}
.eng .caret{font-size:9px;opacity:.7}
.inp input{flex:1;min-width:0;padding:14px 7px;border:0;background:transparent;color:${homeText};font:inherit;font-size:15px;outline:none}
.inp input::placeholder{color:${homeMuted}}
.go{padding:0 22px;border:1px solid ${wallpaperImage ? 'rgba(255,255,255,.22)' : p.accent};border-radius:14px;background:${wallpaperImage ? '#fff' : p.accent};color:${wallpaperImage ? '#171920' : '#fff'};font:inherit;font-size:14px;font-weight:700;cursor:pointer;transition:background .18s ease,transform .18s ease}
.go:hover{background:${wallpaperImage ? '#e9edf4' : p.accentHover};transform:translateY(-1px)}
.hints{margin:14px 0 0;font-size:12px;color:${homeMuted}}
.hints kbd{border:1px solid ${wallpaperImage ? 'rgba(255,255,255,.26)' : p.border};border-radius:5px;padding:1px 6px;font:inherit;font-size:11px;background:${wallpaperImage ? 'rgba(10,14,22,.38)' : p.surface};color:${homeText}}
.ai{display:flex;flex-wrap:wrap;gap:8px;margin:24px 0 0}
.ai a{padding:7px 13px;border:1px solid ${homeBorder};border-radius:999px;background:${wallpaperImage ? 'rgba(10,14,22,.28)' : p.surface};backdrop-filter:blur(10px);color:${homeText};text-decoration:none;font-size:12px;font-weight:600;transition:background .15s ease,border-color .15s ease}
.ai a:hover{background:${homeHover};border-color:${wallpaperImage ? 'rgba(255,255,255,.65)' : p.borderStrong}}
.sites{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;margin:30px 0 0;padding-top:20px;border-top:1px solid ${homeBorder}}
.site{display:flex;flex-direction:column;align-items:center;gap:8px;padding:12px 4px;border-radius:12px;text-decoration:none;color:${homeMuted};transition:background .15s ease,color .15s ease,transform .15s ease}
.site:hover{background:${homeHover};color:${homeText};transform:translateY(-2px)}
.site-icon{width:40px;height:40px;display:flex;align-items:center;justify-content:center;border:1px solid ${homeBorder};border-radius:12px;background:${wallpaperImage ? 'rgba(10,14,22,.52)' : p.surface};backdrop-filter:blur(12px)}
.site-icon img{width:19px;height:19px;object-fit:contain;display:block}
.site-name{font-size:11.5px;font-weight:600;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}
.foot{display:flex;align-items:center;justify-content:center;gap:8px;padding:16px;border-top:1px solid ${homeBorder};color:${homeMuted};font-size:12px;text-align:center}
.foot .dot{width:5px;height:5px;border-radius:50%;background:${wallpaperImage ? '#fff' : p.accent};flex:none}
@media(max-width:700px){main{padding:8vh 22px 6vh}.bar{padding:16px 20px}.sites{grid-template-columns:repeat(3,minmax(0,1fr));margin-top:22px}.greet{font-size:34px}.go{padding:0 16px}.clock{gap:6px}}
@media(max-width:420px){.clock #date{display:none}.eng{padding:8px 4px}.eng #engName{max-width:70px;overflow:hidden;text-overflow:ellipsis}.hints{line-height:1.9}}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
</style></head><body>
<header class="bar"><span class="lockup"><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><line x1="18.5" y1="5.5" x2="5.5" y2="18.5" stroke-linecap="round"/></g></svg>NULL</span><span class="clock"><b id="clock">--:--</b><span id="date"></span></span></header>
<main><div class="col">
<p class="greet" id="greet">Good evening.</p>
<p class="sub">This window forgets everything when it closes.</p>
<form class="search" id="f"><div class="inp"><button type="button" class="eng" id="eng" aria-label="Current search engine: ${engineName}. Activate to switch."><img id="engIcon" src="${engineIcon}" alt=""><span id="engName">${engineName}</span><span class="caret" aria-hidden="true">▾</span></button><input id="q" placeholder="Search ${engineName} or enter address" autocomplete="off" spellcheck="false" aria-label="Search ${engineName} or enter address"></div><button class="go" type="submit">Go</button></form>
<p class="hints"><kbd>Ctrl</kbd> + <kbd>L</kbd> address &nbsp;&middot;&nbsp; <kbd>Ctrl</kbd> + <kbd>T</kbd> new tab &nbsp;&middot;&nbsp; <kbd>Ctrl</kbd> + <kbd>F</kbd> find</p>
${aiRow}
<nav class="sites" aria-label="Quick links">${tiles}</nav>
</div></main>
<footer class="foot"><span class="dot" aria-hidden="true"></span>Private session. History, cookies and storage are cleared when Null closes.</footer>
<script>
const f=document.getElementById('f'),q=document.getElementById('q');q.focus();
f.addEventListener('submit',e=>{e.preventDefault();const v=q.value.trim();if(!v){q.focus();return;}location.href='null://go?to='+encodeURIComponent(v);});
const eng=document.getElementById('eng');eng.addEventListener('click',()=>{location.href='null://cycle-engine';});
const c=document.getElementById('clock'),d=document.getElementById('date'),g=document.getElementById('greet');
function tick(){try{const n=new Date();c.textContent=n.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});d.textContent=n.toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'});const h=n.getHours();g.textContent=h<5?'Good night.':h<12?'Good morning.':h<18?'Good afternoon.':'Good evening.';}catch{}}
tick();setInterval(tick,30000);
</script></body></html>`;
}

export function errorHtml(code: string, desc: string, url: string, theme?: unknown, appearance?: unknown): string {
  const t = normalizeTheme(theme ?? currentTheme().theme);
  const a = (appearance ?? currentTheme().appearance) === 'light' ? 'light' : 'dark';
  const p = palette(t, a);
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="color-scheme" content="${a}"><title>Cannot reach page</title>
<style>
*{box-sizing:border-box}
::selection{background:${p.accent};color:#fff}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:${p.bg};color:${p.text};font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;padding:20px}
.card{width:min(520px,94vw);background:${p.surface};border:1px solid ${p.border};border-radius:16px;padding:32px}
.code-big{font-size:13px;font-weight:800;letter-spacing:.3em;color:${p.muted};margin-bottom:12px}
h1{font-size:24px;margin:0 0 8px;letter-spacing:-.01em}
p{color:${p.muted};font-size:14px;line-height:1.6;margin:0}
.url{font-size:12px;color:${p.muted};margin-top:14px;word-break:break-all;border-top:1px solid ${p.border};padding-top:14px}
.row{display:flex;gap:8px;margin-top:22px;flex-wrap:wrap}
button{padding:10px 18px;border-radius:10px;font:inherit;font-size:13px;font-weight:600;cursor:pointer;border:1px solid ${p.border};background:${p.surfaceHover};color:${p.text}}
button:hover{border-color:${p.borderStrong}}
button.primary{background:${p.accent};border-color:${p.accent};color:#fff}
button:focus-visible{outline:2px solid ${p.accent};outline-offset:3px}
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
      if (host === 'cycle-engine') {
        return new Response('Switching search engine…', { status: 204 });
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
