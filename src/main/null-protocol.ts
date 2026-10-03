import { app, protocol, net } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { getSetting } from './settings-store';
import { SITE_ICONS } from './site-icon-data';
import { SEARCH_ENGINES, SEARCH_ENGINE_ORDER, PRIVACY_LABEL } from '../shared/config';
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
  brave: SITE_ICONS['brave.svg'],
  startpage: SITE_ICONS['startpage.svg'],
  qwant: SITE_ICONS['qwant.svg'],
  ecosia: SITE_ICONS['ecosia.svg'],
  mojeek: SITE_ICONS['mojeek.svg'],
};

const CRYPTO_ICONS: Record<string, string> = {
  BTC: SITE_ICONS['btc.svg'],
  ETH: SITE_ICONS['eth.svg'],
  SOL: SITE_ICONS['sol.svg'],
};

export interface NewTabOptions {
  providers?: { name: string; url: string }[];
  showAI?: boolean;
  wallpaper?: WallpaperId;
  widgetCity?: string;
  widgetWeather?: boolean;
  widgetCrypto?: boolean;
}

const WALLPAPERS: { id: WallpaperId; name: string }[] = [
  { id: 'none', name: 'None' },
  { id: 'coastal-dusk', name: 'Coastal dusk' },
  { id: 'alpine-fog', name: 'Alpine fog' },
  { id: 'desert-night', name: 'Desert night' },
  { id: 'forest-canopy', name: 'Forest canopy' },
  { id: 'arctic-glow', name: 'Arctic glow' },
  { id: 'city-rain', name: 'City rain' },
  { id: 'lavender-dusk', name: 'Lavender dusk' },
  { id: 'fjord-morning', name: 'Fjord morning' },
  { id: 'canyon-glow', name: 'Canyon glow' },
  { id: 'aurora-mesh', name: 'Aurora mesh' },
  { id: 'ink-tide', name: 'Ink tide' },
  { id: 'nebula-drift', name: 'Nebula drift' },
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
      widgetCity: String(getSetting('widgetCity') ?? ''),
      widgetWeather: getSetting('widgetWeather') !== false,
      widgetCrypto: getSetting('widgetCrypto') !== false,
    };
  } catch {
    return { providers: [], showAI: false, wallpaper: 'coastal-dusk', widgetCity: '', widgetWeather: true, widgetCrypto: true };
  }
}

function currentEngine(): SearchEngineId {
  try {
    const e = getSetting('searchEngine');
    if (e && SEARCH_ENGINES[e as SearchEngineId]) return e as SearchEngineId;
    return 'google';
  } catch {
    return 'google';
  }
}

function shortcutModifier(): string {
  return process.platform === 'darwin' ? '⌘' : 'Ctrl';
}

function greetingFor(d: Date): string {
  const h = d.getHours();
  if (h < 5) return 'Good night.';
  if (h < 12) return 'Good morning.';
  if (h < 18) return 'Good afternoon.';
  return 'Good evening.';
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
  const mod = shortcutModifier();
  const greeting = greetingFor(new Date());
  const tiles = TILES.map(
    (tile) =>
      `<a class="site" href="null://go?to=${encodeURIComponent(tile.url)}" title="${escapeHtml(tile.name)} — ${escapeHtml(tile.url)}"><span class="site-icon"><img src="${tile.icon}" alt="" draggable="false" loading="eager"></span><span class="site-name">${escapeHtml(tile.name)}</span></a>`,
  ).join('');
  const engineMenu = SEARCH_ENGINE_ORDER
    .map((id) => {
      const active = id === engine;
      const info = SEARCH_ENGINES[id];
      return `<button type="button" role="option" data-id="${id}" aria-selected="${active}"><img src="${ENGINE_ICONS[id]}" alt=""><span class="nm">${escapeHtml(info.name)}<small>${escapeHtml(PRIVACY_LABEL[info.privacy])}</small></span><span class="tick" aria-hidden="true">✓</span></button>`;
    })
    .join('');
  const aiRow =
    o.showAI !== false && o.providers && o.providers.length > 0
      ? `<nav class="ai" aria-label="AI shortcuts">${o.providers
          .slice(0, 6)
          .map((pr) => `<a href="null://go?to=${encodeURIComponent(pr.url)}">${escapeHtml(pr.name)}</a>`)
          .join('')}</nav>`
      : '';
  const widgetCity = (o.widgetCity ?? '').trim();
  const showWeather = o.widgetWeather !== false;
  const showCrypto = o.widgetCrypto !== false;
  const showDash = showWeather || showCrypto;
  const dashHtml = showDash
    ? `<section class="dash" aria-label="Today at a glance">${
        showWeather
          ? `<div class="wcard" aria-label="Weather"><h3>Weather</h3><div class="wtemp" id="wxTemp">--</div><div class="wsub" id="wxSub">Loading…</div><div class="wmeta" id="wxMeta" hidden></div></div>`
          : ''
      }${
        showCrypto
          ? `<div class="wcard" aria-label="Crypto prices"><h3>Crypto</h3><div class="crypto" id="cx"><div class="werr">Loading prices…</div></div></div>`
          : ''
      }</section>`
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
.inp{position:relative;z-index:5;flex:1;min-width:0;display:flex;align-items:center;gap:4px;padding:0 7px;border:1px solid ${wallpaperImage ? 'rgba(255,255,255,.36)' : p.border};border-radius:14px;background:${homeSurface};backdrop-filter:blur(18px);box-shadow:0 12px 40px rgba(0,0,0,.18);transition:border-color .18s ease,box-shadow .18s ease}
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
.engwrap{position:relative;flex:none}
.eng[aria-expanded=true]{background:${homeHover};color:${homeText}}
.eng .caret{transition:transform .15s ease}
.eng[aria-expanded=true] .caret{transform:rotate(180deg)}
.engmenu{position:absolute;top:calc(100% + 10px);left:0;z-index:20;min-width:212px;padding:6px;border:1px solid ${homeBorder};border-radius:14px;background:${wallpaperImage ? 'rgba(14,18,28,.92)' : p.surface};backdrop-filter:blur(20px);box-shadow:0 20px 48px rgba(0,0,0,.34)}
.engmenu[hidden]{display:none}
.engmenu [role=option]{display:flex;align-items:center;gap:10px;width:100%;padding:9px 10px;border:0;border-radius:9px;background:transparent;color:${homeText};font:inherit;font-size:13px;font-weight:600;cursor:pointer;text-align:left}
.engmenu [role=option]:hover,.engmenu [role=option]:focus-visible{background:${homeHover}}
.engmenu [role=option] img{width:16px;height:16px;border-radius:50%;background:#fff;display:block;flex:none}
.engmenu .nm{flex:1;display:flex;flex-direction:column;gap:1px}
.engmenu .nm small{font-size:10.5px;font-weight:400;color:${homeMuted}}
.engmenu .tick{opacity:0;font-size:12px;color:${homeFocus}}
.engmenu [aria-selected=true] .tick{opacity:.9}
.clear{flex:none;display:flex;align-items:center;justify-content:center;width:26px;height:26px;margin-right:2px;border:0;border-radius:50%;background:transparent;color:${homeMuted};font:inherit;font-size:14px;line-height:1;cursor:pointer}
.clear:hover{background:${homeHover};color:${homeText}}
.clear[hidden]{display:none}
@keyframes null-nudge{0%,100%{transform:translateX(0)}20%{transform:translateX(-3px)}40%{transform:translateX(3px)}60%{transform:translateX(-2px)}80%{transform:translateX(2px)}}
.inp.nudge{border-color:${homeFocus};animation:null-nudge .34s ease}
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
.dash{display:grid;grid-template-columns:1fr 1.4fr;gap:10px;margin:26px 0 0}
.wcard{border:1px solid ${homeBorder};border-radius:14px;background:${homeSurface};backdrop-filter:blur(18px);padding:14px 16px;min-width:0}
.wcard h3{margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${homeMuted}}
.wtemp{font-size:30px;font-weight:600;letter-spacing:-.03em;line-height:1;color:${homeText};font-variant-numeric:tabular-nums}
.wsub{margin-top:6px;font-size:12.5px;color:${homeText}}
.wmeta{display:flex;gap:12px;margin-top:8px;font-size:11.5px;color:${homeMuted}}
.crypto{display:flex;flex-direction:column;gap:6px}
.cxrow{display:flex;align-items:center;gap:10px;padding:7px 4px;border-radius:9px}
.cxrow+.cxrow{border-top:1px solid ${homeBorder}}
.cxicon{width:20px;height:20px;border-radius:50%;flex:none;display:block}
.cxcoin{font-size:12.5px;font-weight:700;color:${homeText};min-width:38px}
.cxprice{flex:1;font-size:13px;font-weight:600;color:${homeText};text-align:right;font-variant-numeric:tabular-nums}
.cxchg{font-size:11.5px;font-weight:700;min-width:62px;text-align:right;font-variant-numeric:tabular-nums}
.cxchg.up{color:#3dd68c}.cxchg.down{color:#ff6369}
.werr{font-size:12px;color:${homeMuted}}
@media(max-width:700px){main{padding:8vh 22px 6vh}.bar{padding:16px 20px}.sites{grid-template-columns:repeat(3,minmax(0,1fr));margin-top:22px}.greet{font-size:34px}.go{padding:0 16px}.clock{gap:6px}.dash{grid-template-columns:1fr}}
@media(max-width:420px){.clock #date{display:none}.eng{padding:8px 4px}.eng #engName{max-width:70px;overflow:hidden;text-overflow:ellipsis}.hints{line-height:1.9}}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
</style></head><body>
<header class="bar"><span class="lockup"><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><line x1="18.5" y1="5.5" x2="5.5" y2="18.5" stroke-linecap="round"/></g></svg>NULL</span><span class="clock"><b id="clock">--:--</b><span id="date"></span></span></header>
<main><div class="col">
<h1 class="greet" id="greet">${greeting}</h1>
<p class="sub">This window forgets everything when it closes.</p>
<form class="search" id="f"><div class="inp"><div class="engwrap"><button type="button" class="eng" id="eng" aria-haspopup="listbox" aria-expanded="false" aria-label="Search engine: ${engineName}. Opens engine menu."><img id="engIcon" src="${engineIcon}" alt=""><span id="engName">${engineName}</span><span class="caret" aria-hidden="true">▾</span></button><div class="engmenu" id="engMenu" role="listbox" aria-label="Choose search engine" hidden>${engineMenu}</div></div><input id="q" placeholder="Search ${engineName} or enter address" autocomplete="off" spellcheck="false" enterkeyhint="go" aria-label="Search ${engineName} or enter address"><button type="button" class="clear" id="clear" aria-label="Clear search" hidden>✕</button></div><button class="go" type="submit">Go</button></form>
<p class="hints"><kbd>${mod}</kbd> + <kbd>L</kbd> address &nbsp;&middot;&nbsp; <kbd>${mod}</kbd> + <kbd>T</kbd> new tab &nbsp;&middot;&nbsp; <kbd>${mod}</kbd> + <kbd>F</kbd> find</p>
${dashHtml}
${aiRow}
<nav class="sites" aria-label="Quick links">${tiles}</nav>
</div></main>
<footer class="foot"><span class="dot" aria-hidden="true"></span>Private session. History, cookies and storage are cleared when Null closes.</footer>
<script>
const f=document.getElementById('f'),q=document.getElementById('q');
const eng=document.getElementById('eng'),menu=document.getElementById('engMenu'),engName=document.getElementById('engName'),engIcon=document.getElementById('engIcon'),clear=document.getElementById('clear');
const opts=[...menu.querySelectorAll('[role=option]')];
q.focus();
function setMenu(open){menu.hidden=!open;eng.setAttribute('aria-expanded',String(open));}
function pick(id){const o=opts.find(x=>x.dataset.id===id);if(!o)return;const nm=o.querySelector('.nm').textContent;engIcon.src=o.querySelector('img').src;engName.textContent=nm;q.placeholder='Search '+nm+' or enter address';eng.setAttribute('aria-label','Search engine: '+nm+'. Opens engine menu.');opts.forEach(x=>x.setAttribute('aria-selected',String(x===o)));setMenu(false);q.focus();location.href='null://set-engine?id='+encodeURIComponent(id);}
const selected=()=>opts.find(o=>o.getAttribute('aria-selected')==='true')||opts[0];
eng.addEventListener('click',e=>{e.stopPropagation();setMenu(menu.hidden);});
eng.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();setMenu(true);selected().focus();}});
menu.addEventListener('click',e=>e.stopPropagation());
opts.forEach(o=>o.addEventListener('click',()=>pick(o.dataset.id)));
document.addEventListener('click',()=>setMenu(false));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){e.preventDefault();setMenu(false);eng.focus();}});
function syncClear(){clear.hidden=!q.value;}
q.addEventListener('input',syncClear);syncClear();
clear.addEventListener('click',()=>{q.value='';syncClear();q.focus();});
f.addEventListener('submit',e=>{e.preventDefault();const v=q.value.trim();if(!v){const box=document.querySelector('.inp');box.classList.remove('nudge');void box.offsetWidth;box.classList.add('nudge');q.focus();return;}location.href='null://go?to='+encodeURIComponent(v);});
const c=document.getElementById('clock'),d=document.getElementById('date'),g=document.getElementById('greet');
function tick(){try{const n=new Date();c.textContent=n.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});d.textContent=n.toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'});const h=n.getHours();g.textContent=h<5?'Good night.':h<12?'Good morning.':h<18?'Good afternoon.':'Good evening.';}catch{}}
tick();setInterval(tick,30000);
const NULL_CITY=${JSON.stringify(widgetCity)};
const NULL_WX=${showWeather ? '1' : '0'},NULL_CX=${showCrypto ? '1' : '0'};
const NULL_ICONS=${JSON.stringify(CRYPTO_ICONS)};
function cxIcon(label){return NULL_ICONS[label]||'';}
function wxCode(code){code=Number(code);if(code===0)return 'Clear sky';if(code===1)return 'Mostly clear';if(code===2)return 'Partly cloudy';if(code===3)return 'Overcast';if(code===45||code===48)return 'Fog';if(code>=51&&code<=57)return 'Drizzle';if(code>=61&&code<=67)return 'Rain';if(code>=71&&code<=77)return 'Snow';if(code>=80&&code<=82)return 'Showers';if(code===95||code===96||code===99)return 'Thunderstorm';return 'Cloudy';}
async function loadWx(){if(!NULL_WX)return;const t=document.getElementById('wxTemp'),s=document.getElementById('wxSub'),m=document.getElementById('wxMeta');if(!t||!s||!m)return;
if(!NULL_CITY){s.textContent='Set a city in Settings → General.';return;}
try{const g=await(await fetch('https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(NULL_CITY)+'&count=1&language=en&format=json')).json();
const loc=g&&g.results&&g.results[0];if(!loc){s.textContent='City not found. Check Settings → General.';return;}
const w=await(await fetch('https://api.open-meteo.com/v1/forecast?latitude='+loc.latitude+'&longitude='+loc.longitude+'&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto')).json();
const cur=w&&w.current;if(!cur){s.textContent='Weather unavailable.';return;}
t.textContent=Math.round(cur.temperature_2m)+'°';s.textContent=wxCode(cur.weather_code)+' · '+(loc.name||NULL_CITY)+(loc.country?' '+loc.country:'');m.hidden=false;m.innerHTML='<span>Humidity '+cur.relative_humidity_2m+'%</span><span>Wind '+Math.round(cur.wind_speed_10m)+' km/h</span>';}catch{s.textContent='Weather unavailable offline.';}}
async function loadCx(){if(!NULL_CX)return;const box=document.getElementById('cx');if(!box)return;
try{const coins=[['BTCUSDT','BTC'],['ETHUSDT','ETH'],['SOLUSDT','SOL']];let rows='';
for(const [sym,label] of coins){const r=await(await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol='+sym)).json();const px=Number(r.lastPrice),chg=Number(r.priceChangePercent);
const fmt=px>=1000?px.toLocaleString('en-US',{maximumFractionDigits:0}):px>=10?px.toLocaleString('en-US',{maximumFractionDigits:2}):String(px);
rows+='<div class="cxrow"><img class="cxicon" src="'+cxIcon(label)+'" alt=""><span class="cxcoin">'+label+'</span><span class="cxprice">$'+fmt+'</span><span class="cxchg '+(chg>=0?'up':'down')+'">'+(chg>=0?'+':'')+chg.toFixed(2)+'%</span></div>';}
if(!rows)throw new Error('empty');box.innerHTML=rows;}catch{
try{const ids=['bitcoin','ethereum','solana'];const q=ids.join(',');const r=await(await fetch('https://api.coingecko.com/api/v3/simple/price?ids='+q+'&vs_currencies=usd&include_24hr_change=true')).json();
const labels={bitcoin:'BTC',ethereum:'ETH',solana:'SOL'};let rows='';
for(const id of ids){if(!r[id])continue;const px=Number(r[id].usd),chg=Number(r[id].usd_24h_change||0);
const fmt=px>=1000?px.toLocaleString('en-US',{maximumFractionDigits:0}):px>=10?px.toLocaleString('en-US',{maximumFractionDigits:2}):String(px);
rows+='<div class="cxrow"><img class="cxicon" src="'+cxIcon(labels[id])+'" alt=""><span class="cxcoin">'+labels[id]+'</span><span class="cxprice">$'+fmt+'</span><span class="cxchg '+(chg>=0?'up':'down')+'">'+(chg>=0?'+':'')+chg.toFixed(2)+'%</span></div>';}
if(!rows)throw new Error('empty');box.innerHTML=rows;}catch{box.innerHTML='<div class="werr">Prices unavailable offline.</div>';}}}
loadWx();loadCx();setInterval(()=>{loadWx();loadCx();},600000);
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
      if (host === 'set-engine') {
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
