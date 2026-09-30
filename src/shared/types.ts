import type { SensitiveCategory } from './sensitive-sites';

export type TabLayout = 'top' | 'side' | 'bottom';
export type ThemeName = 'blue' | 'red' | 'neutral';
export type AppearanceMode = 'light' | 'dark';
export type WallpaperId = 'none' | 'coastal-dusk' | 'alpine-fog' | 'desert-night' | 'forest-canopy' | 'arctic-glow' | 'city-rain';
export type SearchEngineId = 'google' | 'bing' | 'duckduckgo';
export type DeviceProfileId =
  | 'windows'
  | 'macos'
  | 'linux'
  | 'iphone'
  | 'ipad'
  | 'android-phone'
  | 'android-tablet';
export type EmergencyDestination = 'google' | 'blank' | 'custom';

export interface TabInfo {
  id: string;
  url: string;
  title: string;
  favicon: string;
  loading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  audible: boolean;
  muted: boolean;
  pinned: boolean;
  certError: boolean;
  active: boolean;
}

export type TabSecurity = 'secure' | 'insecure' | 'warning' | 'internal' | 'unknown';

export interface PageMetaTag {
  label: string;
  value: string;
}

export interface PageMetaCounts {
  links: number;
  images: number;
  scripts: number;
  stylesheets: number;
  forms: number;
  iframes: number;
}

export interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  lang: string;
  charset: string;
  viewport: string;
  robots: string;
  author: string;
  generator: string;
  themeColor: string;
  openGraph: PageMetaTag[];
  twitter: PageMetaTag[];
  other: PageMetaTag[];
  counts: PageMetaCounts;
  cookies: number;
  localStorageKeys: number;
  readyState: string;
  contentType: string;
}

export interface TabDevInfo {
  tabId: string;
  url: string;
  title: string;
  host: string;
  origin: string;
  protocol: string;
  security: TabSecurity;
  userAgent: string;
  deviceProfile: string;
  processId: number | null;
  loading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  devToolsOpen: boolean;
  zoom: number;
  muted: boolean;
  meta: PageMeta | null;
  metaError: string;
  fetchedAt: number;
}

export type SiteResourceKind = 'robots' | 'sitemap';

export interface SiteResourceResult {
  kind: SiteResourceKind;
  url: string;
  ok: boolean;
  status: number;
  contentType: string;
  bytes: number;
  body: string;
  truncated: boolean;
  sitemapUrls: string[];
  error: string;
  fetchedAt: number;
}

export interface SearchEngine {
  id: SearchEngineId;
  name: string;
  searchUrl: string;
}

export interface AIProvider {
  id: string;
  name: string;
  url: string;
  builtin: boolean;
}

export interface DeviceProfile {
  id: DeviceProfileId;
  name: string;
  userAgent: string;
}

export interface DownloadItem {
  id: string;
  filename: string;
  url: string;
  savePath: string;
  receivedBytes: number;
  totalBytes: number;
  state: 'progressing' | 'completed' | 'cancelled' | 'interrupted';
  startTime: number;
}

export interface FindResult {
  activeMatchOrdinal: number;
  matches: number;
  tabId: string;
}

export interface InsecureWarningInfo {
  tabId: string;
  url: string;
}

export interface CertificateWarningInfo {
  tabId: string;
  url: string;
  host: string;
  error: string;
  issuer: string;
}

export type { SensitiveCategory };

export interface SensitiveWarningInfo {
  tabId: string;
  url: string;
  host: string;
  category: SensitiveCategory;
}

export interface AppSettings {
  setupDone: boolean;
  tabLayout: TabLayout;
  theme: ThemeName;
  appearance: AppearanceMode;
  searchEngine: SearchEngineId;
  deviceProfile: DeviceProfileId;
  homepage: string;
  newTabWallpaper: WallpaperId;
  newTabShowAI: boolean;
  aiProviders: AIProvider[];
  aiPanelWidth: number;
  aiPanelOpen: boolean;
  aiActiveProvider: string;
  emergencyDestination: EmergencyDestination;
  emergencyCustomUrl: string;
  emergencyConfirm: boolean;
  downloadLocation: string;
  askWhereToSave: boolean;
  restoreClosedTabs: boolean;
  warnOnInsecureHttp: boolean;
  warnSensitiveSites: boolean;
  warnPorn: boolean;
  warnGambling: boolean;
  warnAlcohol: boolean;
  trustedSensitiveHosts: string[];
  devMode: boolean;
}

export const DEFAULT_AI_PROVIDERS: AIProvider[] = [
  { id: 'chatgpt', name: 'ChatGPT', url: 'https://chat.openai.com/', builtin: true },
  { id: 'claude', name: 'Claude', url: 'https://claude.ai/', builtin: true },
  { id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com/', builtin: true },
  { id: 'qwen', name: 'Qwen', url: 'https://chat.qwen.ai/', builtin: true },
];

export const DEFAULT_SETTINGS: AppSettings = {
  setupDone: false,
  tabLayout: 'top',
  theme: 'neutral',
  appearance: 'dark',
  searchEngine: 'google',
  deviceProfile: 'linux',
  homepage: 'null://newtab',
  newTabWallpaper: 'coastal-dusk',
  newTabShowAI: true,
  aiProviders: DEFAULT_AI_PROVIDERS,
  aiPanelWidth: 360,
  aiPanelOpen: false,
  aiActiveProvider: 'chatgpt',
  emergencyDestination: 'google',
  emergencyCustomUrl: '',
  emergencyConfirm: true,
  downloadLocation: '',
  askWhereToSave: true,
  restoreClosedTabs: true,
  warnOnInsecureHttp: true,
  warnSensitiveSites: true,
  warnPorn: true,
  warnGambling: true,
  warnAlcohol: true,
  trustedSensitiveHosts: [],
  devMode: false,
};
