import { net } from 'electron';
import { DEVICE_PROFILES, isLocalNetworkInput } from '../shared/config';
import { getSetting } from './settings-store';
import { getTabRecord } from './tab-manager';
import type {
  PageMeta,
  PageMetaTag,
  SiteImageResult,
  SiteResourceKind,
  SiteResourceResult,
  TabDevInfo,
  TabSecurity,
} from '../shared/types';

const MAX_BODY = 200_000;
const MAX_IMAGE_BYTES = 3_000_000;
const FETCH_TIMEOUT = 12_000;
const META_TIMEOUT = 4_000;

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}

function originOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
}

function protocolOf(url: string): string {
  try {
    return new URL(url).protocol.replace(':', '');
  } catch {
    return '';
  }
}

function securityOf(url: string, certError: boolean): TabSecurity {
  if (certError) return 'warning';
  if (/^https:/i.test(url)) return 'secure';
  if (/^http:\/\//i.test(url)) return 'insecure';
  if (/^(null|file|about|data|chrome):/i.test(url)) return 'internal';
  return 'unknown';
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(message));
      },
    );
  });
}

const META_SCRIPT = `(() => {
  try {
    const nodes = (sel) => Array.from(document.querySelectorAll(sel));
    const metas = nodes('meta').map((m) => ({
      name: (m.getAttribute('name') || '').toLowerCase(),
      property: (m.getAttribute('property') || '').toLowerCase(),
      content: m.getAttribute('content') || '',
    }));
    const metaByName = (n) => {
      const hit = metas.find((m) => m.name === n);
      return hit ? hit.content : '';
    };
    const keyOf = (m) => m.property || m.name;
    const canonicalEl = document.querySelector('link[rel="canonical"]');
    const openGraph = metas
      .filter((m) => m.property.startsWith('og:'))
      .map((m) => ({ label: keyOf(m), value: m.content }));
    const twitter = metas
      .filter((m) => m.property.startsWith('twitter:') || m.name.startsWith('twitter:'))
      .map((m) => ({ label: keyOf(m), value: m.content }));
    const other = metas
      .filter((m) => {
        const key = keyOf(m);
        if (!key || !m.content) return false;
        if (key.startsWith('og:') || key.startsWith('twitter:')) return false;
        return true;
      })
      .map((m) => ({ label: keyOf(m), value: m.content }))
      .filter((m, i, arr) => arr.findIndex((x) => x.label === m.label && x.value === m.value) === i);
    let cookies = 0;
    try {
      cookies = document.cookie ? document.cookie.split(';').filter((c) => c.trim()).length : 0;
    } catch (err) {
      cookies = -1;
    }
    let localStorageKeys = 0;
    try {
      localStorageKeys = window.localStorage ? window.localStorage.length : 0;
    } catch (err) {
      localStorageKeys = -1;
    }
    return {
      title: document.title || '',
      description: metaByName('description'),
      canonical: canonicalEl ? canonicalEl.getAttribute('href') || '' : '',
      lang: document.documentElement.getAttribute('lang') || '',
      charset: document.characterSet || '',
      viewport: metaByName('viewport'),
      robots: metaByName('robots'),
      author: metaByName('author'),
      generator: metaByName('generator'),
      themeColor: metaByName('theme-color'),
      openGraph,
      twitter,
      other,
      counts: {
        links: nodes('a[href]').length,
        images: nodes('img').length,
        scripts: nodes('script[src]').length,
        stylesheets: nodes('link[rel="stylesheet"]').length,
        forms: nodes('form').length,
        iframes: nodes('iframe').length,
      },
      readyState: document.readyState || '',
      contentType: document.contentType || '',
    };
  } catch (err) {
    return null;
  }
})()`;

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function asTags(value: unknown): PageMetaTag[] {
  if (!Array.isArray(value)) return [];
  const out: PageMetaTag[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const label = asString((item as Record<string, unknown>).label);
    const val = asString((item as Record<string, unknown>).value);
    if (label && val) out.push({ label, value: val });
    if (out.length >= 60) break;
  }
  return out;
}

function normalizeMeta(raw: unknown): PageMeta | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const counts = (r.counts ?? {}) as Record<string, unknown>;
  return {
    title: asString(r.title),
    description: asString(r.description),
    canonical: asString(r.canonical),
    lang: asString(r.lang),
    charset: asString(r.charset),
    viewport: asString(r.viewport),
    robots: asString(r.robots),
    author: asString(r.author),
    generator: asString(r.generator),
    themeColor: asString(r.themeColor),
    openGraph: asTags(r.openGraph),
    twitter: asTags(r.twitter),
    other: asTags(r.other),
    counts: {
      links: asNumber(counts.links),
      images: asNumber(counts.images),
      scripts: asNumber(counts.scripts),
      stylesheets: asNumber(counts.stylesheets),
      forms: asNumber(counts.forms),
      iframes: asNumber(counts.iframes),
    },
    cookies: asNumber(r.cookies),
    localStorageKeys: asNumber(r.localStorageKeys),
    readyState: asString(r.readyState),
    contentType: asString(r.contentType),
  };
}

async function extractMeta(wc: Electron.WebContents): Promise<{ meta: PageMeta | null; error: string }> {
  try {
    const raw = await withTimeout<unknown>(
      wc.executeJavaScript(META_SCRIPT, true),
      META_TIMEOUT,
      'Reading page metadata timed out.',
    );
    const meta = normalizeMeta(raw);
    if (!meta) return { meta: null, error: 'No metadata could be read from this page.' };
    return { meta, error: '' };
  } catch (err) {
    return { meta: null, error: err instanceof Error ? err.message : 'Unable to read page metadata.' };
  }
}

export async function inspectTab(tabId: string | null): Promise<TabDevInfo | null> {
  if (!tabId) return null;
  const record = getTabRecord(tabId);
  if (!record) return null;
  const wc = record.view.webContents;

  let url = record.url;
  let title = record.title;
  let userAgent = '';
  let processId: number | null = null;
  let zoom = 1;
  let devToolsOpen = false;
  try {
    url = wc.getURL() || url;
  } catch {
    /* ignore */
  }
  try {
    title = wc.getTitle() || title;
  } catch {
    /* ignore */
  }
  try {
    userAgent = wc.getUserAgent();
  } catch {
    /* ignore */
  }
  try {
    processId = wc.getOSProcessId();
  } catch {
    processId = null;
  }
  try {
    zoom = wc.getZoomFactor();
  } catch {
    /* ignore */
  }
  try {
    devToolsOpen = wc.isDevToolsOpened();
  } catch {
    /* ignore */
  }

  const profile = getSetting('deviceProfile');
  const { meta, error } = await extractMeta(wc);

  return {
    tabId,
    url,
    title,
    host: hostOf(url),
    origin: originOf(url),
    protocol: protocolOf(url),
    security: securityOf(url, record.certError),
    userAgent,
    deviceProfile: DEVICE_PROFILES[profile]?.name ?? profile,
    processId,
    loading: record.loading,
    canGoBack: record.canGoBack,
    canGoForward: record.canGoForward,
    devToolsOpen,
    zoom: Math.round(zoom * 100),
    muted: record.muted,
    meta,
    metaError: error,
    fetchedAt: Date.now(),
  };
}

interface FetchOutcome {
  ok: boolean;
  status: number;
  contentType: string;
  bytes: number;
  body: string;
  truncated: boolean;
  error: string;
}

async function fetchText(url: string): Promise<FetchOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  const profile = DEVICE_PROFILES[getSetting('deviceProfile')] ?? DEVICE_PROFILES.linux;
  try {
    const res = await net.fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'user-agent': profile.userAgent, accept: 'text/plain, application/xml, */*' },
    });
    const text = await res.text();
    const truncated = text.length > MAX_BODY;
    return {
      ok: res.ok,
      status: res.status,
      contentType: res.headers.get('content-type') ?? '',
      bytes: Buffer.byteLength(text, 'utf8'),
      body: truncated ? text.slice(0, MAX_BODY) : text,
      truncated,
      error: '',
    };
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    return {
      ok: false,
      status: 0,
      contentType: '',
      bytes: 0,
      body: '',
      truncated: false,
      error: aborted ? 'Request timed out.' : err instanceof Error ? err.message : 'Request failed.',
    };
  } finally {
    clearTimeout(timer);
  }
}

function parseSitemaps(body: string, origin: string): string[] {
  const out: string[] = [];
  const re = /^\s*sitemap:\s*(\S+)\s*$/gim;
  let match = re.exec(body);
  while (match) {
    try {
      out.push(new URL(match[1], origin).toString());
    } catch {
      /* ignore malformed entries */
    }
    match = re.exec(body);
  }
  return [...new Set(out)].slice(0, 10);
}

export async function fetchSiteResource(
  tabId: string | null,
  kind: SiteResourceKind,
  explicitUrl?: string,
): Promise<SiteResourceResult | null> {
  if (!tabId) return null;
  const record = getTabRecord(tabId);
  if (!record) return null;

  let pageUrl = record.url;
  try {
    pageUrl = record.view.webContents.getURL() || pageUrl;
  } catch {
    /* ignore */
  }
  const origin = originOf(pageUrl);

  const fail = (url: string, error: string): SiteResourceResult => ({
    kind,
    url,
    ok: false,
    status: 0,
    contentType: '',
    bytes: 0,
    body: '',
    truncated: false,
    sitemapUrls: [],
    error,
    fetchedAt: Date.now(),
  });

  if (!/^https?:/i.test(origin)) {
    return fail(origin || pageUrl, 'Only http(s) pages expose robots.txt and sitemaps.');
  }

  if (explicitUrl) {
    const outcome = await fetchText(explicitUrl);
    return { kind, url: explicitUrl, ...outcome, sitemapUrls: [explicitUrl], fetchedAt: Date.now() };
  }

  if (kind === 'robots') {
    const target = `${origin}/robots.txt`;
    const outcome = await fetchText(target);
    const sitemapUrls = parseSitemaps(outcome.body, origin);
    return { kind, url: target, ...outcome, sitemapUrls, fetchedAt: Date.now() };
  }

  const robots = await fetchText(`${origin}/robots.txt`);
  const discovered = parseSitemaps(robots.body, origin);
  const target = discovered[0] ?? `${origin}/sitemap.xml`;
  const outcome = await fetchText(target);
  return {
    kind,
    url: target,
    ...outcome,
    sitemapUrls: discovered.length > 0 ? discovered : [target],
    fetchedAt: Date.now(),
  };
}

export async function fetchSiteImage(rawUrl: string | null, referer?: string | null): Promise<SiteImageResult | null> {
  if (!rawUrl) return null;

  if (/^data:image\//i.test(rawUrl)) {
    const semi = rawUrl.indexOf(';');
    const contentType = semi > 5 ? rawUrl.slice(5, semi) : 'image';
    return { url: 'inline data URL', ok: true, dataUrl: rawUrl, contentType, bytes: rawUrl.length, error: '' };
  }

  const fail = (error: string, contentType = '', host = ''): SiteImageResult => ({
    url: host ? `Blocked host (${host})` : rawUrl,
    ok: false,
    dataUrl: '',
    contentType,
    bytes: 0,
    error,
  });

  if (!/^https?:/i.test(rawUrl)) return fail('Preview is available for http(s) images only.');

  // The URL comes from the page's own metadata, so refuse to probe the local
  // machine or network: that would let a page scan behind the firewall.
  let imageHost = '';
  try {
    imageHost = new URL(rawUrl).host;
  } catch {
    return fail('Invalid image URL.');
  }
  if (isLocalNetworkInput(imageHost)) {
    return fail('Preview is not available for local network images.', '', imageHost);
  }

  const profile = DEVICE_PROFILES[getSetting('deviceProfile')] ?? DEVICE_PROFILES.linux;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  const headers: Record<string, string> = {
    'user-agent': profile.userAgent,
    accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    'accept-language': 'en-US,en;q=0.9',
  };
  if (referer && /^https?:/i.test(referer)) headers.referer = referer;

  try {
    const res = await net.fetch(rawUrl, { signal: controller.signal, redirect: 'follow', headers });
    const contentType = (res.headers.get('content-type') ?? '').split(';')[0].trim();
    if (!res.ok) return fail(`HTTP ${res.status}`, contentType);
    if (!/^image\//i.test(contentType)) return fail(`Not an image (${contentType || 'unknown type'}).`, contentType);

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      return fail(`Image is ${(buffer.byteLength / 1_048_576).toFixed(1)} MB — too large to preview.`, contentType);
    }
    return {
      url: rawUrl,
      ok: true,
      dataUrl: `data:${contentType};base64,${buffer.toString('base64')}`,
      contentType,
      bytes: buffer.byteLength,
      error: '',
    };
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    return fail(aborted ? 'Image request timed out.' : err instanceof Error ? err.message : 'Image request failed.');
  } finally {
    clearTimeout(timer);
  }
}

export function setTabDevToolsOpen(tabId: string, open: boolean): void {
  const record = getTabRecord(tabId);
  if (!record) return;
  const wc = record.view.webContents;
  if (open) {
    if (!wc.isDevToolsOpened()) wc.openDevTools({ mode: 'detach' });
  } else if (wc.isDevToolsOpened()) {
    wc.closeDevTools();
  }
}
