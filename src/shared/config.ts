import type { SearchEngine, SearchEngineId, AIProvider, DeviceProfile } from './types';

export const SEARCH_ENGINES: Record<SearchEngineId, SearchEngine> = {
  google: { id: 'google', name: 'Google', searchUrl: 'https://www.google.com/search?q=%s' },
  bing: { id: 'bing', name: 'Bing', searchUrl: 'https://www.bing.com/search?q=%s' },
  duckduckgo: { id: 'duckduckgo', name: 'DuckDuckGo', searchUrl: 'https://duckduckgo.com/?q=%s' },
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
    return `https://${noProto}`;
  }
  return SEARCH_ENGINES[engineId].searchUrl.replace('%s', encodeURIComponent(trimmed));
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export const NULL_NEWTAB = 'null://newtab';
export const NULL_NEWTAB_FILE_MARKER = 'NULL_NEWTAB_FILE';
export const NULL_SETTINGS = 'null://settings';
export const NULL_ERROR_PREFIX = 'null://error';
export const GOOGLE_HOME = 'https://www.google.com/';
