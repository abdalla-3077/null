import type { SearchEngine, SearchEngineId, AIProvider, DeviceProfile } from './types';

export const SEARCH_ENGINES: Record<SearchEngineId, SearchEngine> = {
  brave: { id: 'brave', name: 'Brave', searchUrl: 'https://search.brave.com/search?q=%s', privacy: 'max', privacyNote: 'Independent index, no profiling' },
  mojeek: { id: 'mojeek', name: 'Mojeek', searchUrl: 'https://www.mojeek.com/search?q=%s', privacy: 'max', privacyNote: 'Independent index, no tracking' },
  duckduckgo: { id: 'duckduckgo', name: 'DuckDuckGo', searchUrl: 'https://duckduckgo.com/?q=%s', privacy: 'high', privacyNote: 'No tracking, Bing-based results' },
  startpage: { id: 'startpage', name: 'Startpage', searchUrl: 'https://www.startpage.com/sp/search?query=%s', privacy: 'high', privacyNote: 'Anonymous Google results' },
  qwant: { id: 'qwant', name: 'Qwant', searchUrl: 'https://www.qwant.com/?q=%s', privacy: 'high', privacyNote: 'EU-hosted, no profiling' },
  ecosia: { id: 'ecosia', name: 'Ecosia', searchUrl: 'https://www.ecosia.org/search?q=%s', privacy: 'medium', privacyNote: 'Anonymized after 7 days' },
  bing: { id: 'bing', name: 'Bing', searchUrl: 'https://www.bing.com/search?q=%s', privacy: 'low', privacyNote: 'Microsoft profiling' },
  google: { id: 'google', name: 'Google', searchUrl: 'https://www.google.com/search?q=%s', privacy: 'low', privacyNote: 'Full ad profiling' },
};

const PRIVACY_RANK: Record<SearchEngine['privacy'], number> = { max: 0, high: 1, medium: 2, low: 3 };

export const SEARCH_ENGINE_ORDER: SearchEngineId[] = (Object.keys(SEARCH_ENGINES) as SearchEngineId[]).sort(
  (a, b) => PRIVACY_RANK[SEARCH_ENGINES[a].privacy] - PRIVACY_RANK[SEARCH_ENGINES[b].privacy] || SEARCH_ENGINES[a].name.localeCompare(SEARCH_ENGINES[b].name),
);

export const PRIVACY_LABEL: Record<SearchEngine['privacy'], string> = {
  max: 'Maximum privacy',
  high: 'High privacy',
  medium: 'Balanced',
  low: 'Low privacy',
};

export const BUILTIN_AI_PROVIDERS: AIProvider[] = [
  { id: 'chatgpt', name: 'ChatGPT', url: 'https://chat.openai.com/', builtin: true },
  { id: 'claude', name: 'Claude', url: 'https://claude.ai/', builtin: true },
  { id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com/', builtin: true },
  { id: 'qwen', name: 'Qwen', url: 'https://chat.qwen.ai/', builtin: true },
];

const CHROME_VERSION = '144.0.0.0';

export const DEVICE_PROFILES: Record<string, DeviceProfile> = {
  windows: {
    id: 'windows',
    name: 'Windows Desktop',
    userAgent: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROME_VERSION} Safari/537.36`,
  },
  macos: {
    id: 'macos',
    name: 'macOS Desktop',
    userAgent: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROME_VERSION} Safari/537.36`,
  },
  linux: {
    id: 'linux',
    name: 'Linux Desktop',
    userAgent: `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROME_VERSION} Safari/537.36`,
  },
  iphone: {
    id: 'iphone',
    name: 'iPhone',
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1',
  },
  ipad: {
    id: 'ipad',
    name: 'iPad',
    userAgent:
      'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1',
  },
  'android-phone': {
    id: 'android-phone',
    name: 'Android Phone',
    userAgent: `Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROME_VERSION} Mobile Safari/537.36`,
  },
  'android-tablet': {
    id: 'android-tablet',
    name: 'Android Tablet',
    userAgent: `Mozilla/5.0 (Linux; Android 14; Pixel Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROME_VERSION} Safari/537.36`,
  },
};

export function resolveInputToUrl(input: string, engineId: SearchEngineId): string {
  const trimmed = input.trim();
  if (!trimmed) return SEARCH_ENGINES[engineId].searchUrl.replace('%s', '');
  if (/^(null|about|data|file|chrome):/i.test(trimmed)) return trimmed;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) {
    try {
      new URL(trimmed);
      return trimmed;
    } catch {
      /* fall through to search */
    }
  }
  const noProto = trimmed.replace(/^https?:\/\//i, '');
  if (
    /^localhost(:\d+)?(\/\S*)?$/.test(noProto) ||
    /^\d{1,3}(\.\d{1,3}){3}(:\d+)?(\/\S*)?$/.test(noProto) ||
    /^[^/\s]+\.[a-zA-Z]{2,}(:\d+)?(\/\S*)?$/.test(noProto)
  ) {
    return `${isLocalNetworkInput(noProto) ? 'http' : 'https'}://${noProto}`;
  }
  return SEARCH_ENGINES[engineId].searchUrl.replace('%s', encodeURIComponent(trimmed));
}

export function isLocalNetworkInput(value: string): boolean {
  const host = value.split('/')[0].replace(/:\d+$/, '').toLowerCase();
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.lan') ||
    host.endsWith('.home')
  ) {
    return true;
  }
  const m = /^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/.exec(host);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 192 && b === 168) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 169 && b === 254)
  );
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isInsecureHttpUrl(value: string): boolean {
  return /^http:\/\//i.test(value);
}

export const NULL_NEWTAB = 'null://newtab';
export const NULL_NEWTAB_FILE_MARKER = 'NULL_NEWTAB_FILE';
export const NULL_SETTINGS = 'null://settings';
export const NULL_ERROR_PREFIX = 'null://error';
export const GOOGLE_HOME = 'https://www.google.com/';

export interface TranslateLanguage {
  id: string;
  name: string;
}

export const TRANSLATE_LANGUAGES: TranslateLanguage[] = [
  { id: 'en', name: 'English' },
  { id: 'ar', name: 'Arabic' },
  { id: 'fr', name: 'French' },
  { id: 'de', name: 'German' },
  { id: 'es', name: 'Spanish' },
  { id: 'it', name: 'Italian' },
  { id: 'pt', name: 'Portuguese' },
  { id: 'ru', name: 'Russian' },
  { id: 'zh-CN', name: 'Chinese (Simplified)' },
  { id: 'ja', name: 'Japanese' },
  { id: 'ko', name: 'Korean' },
  { id: 'hi', name: 'Hindi' },
  { id: 'tr', name: 'Turkish' },
  { id: 'nl', name: 'Dutch' },
];

export const CRYPTO_SYMBOLS = [
  { symbol: 'BTCUSDT', label: 'BTC' },
  { symbol: 'ETHUSDT', label: 'ETH' },
  { symbol: 'SOLUSDT', label: 'SOL' },
] as const;

export function translateUrl(url: string, targetLang: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    const raw = /^[a-z]{2}(-[A-Za-z]{2})?$/.test(targetLang) ? targetLang : 'en';
    const host = u.hostname.replace(/\./g, '-');
    if (!host) return null;
    const params = new URLSearchParams(u.search);
    params.set('_x_tr_sl', 'auto');
    params.set('_x_tr_tl', raw);
    params.set('_x_tr_hl', 'en');
    params.set('_x_tr_pto', 'wapp');
    const query = params.toString();
    return `https://${host}.translate.goog${u.pathname}${query ? `?${query}` : ''}${u.hash}`;
  } catch {
    return null;
  }
}

export function isTranslatedUrl(url: string): boolean {
  return /\.translate\.goog(\/|$|\?|#)/i.test(url);
}

export function originalUrlFromTranslated(url: string): string | null {
  try {
    const u = new URL(url);
    const parts = u.hostname.split('.');
    const idx = parts.findIndex((p) => p === 'translate');
    if (idx < 1) return null;
    const maybeLang = parts[idx - 1] ?? '';
    const hasLangSegment = idx >= 2 && /^[a-z]{2}(-[a-z]{2})?$/i.test(maybeLang);
    const host = parts.slice(0, hasLangSegment ? idx - 1 : idx).join('.').replace(/-/g, '.');
    if (!host) return null;
    const params = new URLSearchParams(u.search);
    params.delete('_x_tr_sl');
    params.delete('_x_tr_tl');
    params.delete('_x_tr_hl');
    params.delete('_x_tr_pto');
    const search = params.toString();
    return `https://${host}${u.pathname}${search ? `?${search}` : ''}${u.hash}`;
  } catch {
    return null;
  }
}
