import { create } from 'zustand';
import type {
  TabInfo,
  AppSettings,
  BookmarkItem,
  CertificateWarningInfo,
  DownloadItem,
  FindResult,
  HistoryEntry,
  InsecureWarningInfo,
  PermissionRequestInfo,
  SensitiveWarningInfo,
} from '../shared/types';
import { DEFAULT_SETTINGS } from '../shared/types';

interface TabState {
  tabs: TabInfo[];
  activeId: string | null;
  setTabs: (tabs: TabInfo[], activeId: string | null) => void;
  activeTab: () => TabInfo | undefined;
}

export const useTabStore = create<TabState>((set, get) => ({
  tabs: [],
  activeId: null,
  setTabs: (tabs, activeId) => set({ tabs, activeId }),
  activeTab: () => get().tabs.find((t) => t.id === get().activeId),
}));

interface SettingsState {
  settings: AppSettings;
  setSettings: (s: AppSettings) => void;
  ready: boolean;
  setReady: (r: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,
  setSettings: (settings) => set({ settings }),
  ready: false,
  setReady: (ready) => set({ ready }),
}));

interface DownloadState {
  downloads: DownloadItem[];
  setDownloads: (d: DownloadItem[]) => void;
  open: boolean;
  setOpen: (o: boolean) => void;
}

export const useDownloadStore = create<DownloadState>((set) => ({
  downloads: [],
  setDownloads: (downloads) => set({ downloads }),
  open: false,
  setOpen: (open) => set({ open }),
}));

interface FindState {
  open: boolean;
  query: string;
  result: FindResult | null;
  set: (p: Partial<FindState>) => void;
}

export const useFindStore = create<FindState>((set) => ({
  open: false,
  query: '',
  result: null,
  set: (p) => set(p),
}));

interface UIState {
  settingsOpen: boolean;
  emergencyConfirmOpen: boolean;
  devToolsOpen: boolean;
  historyOpen: boolean;
  paletteOpen: boolean;
  paletteMode: 'all' | 'tabs';
  insecureWarning: InsecureWarningInfo | null;
  certWarning: CertificateWarningInfo | null;
  sensitiveWarning: SensitiveWarningInfo | null;
  permission: PermissionRequestInfo | null;
  ctxMenu: {
    x: number;
    y: number;
    tabId: string;
    linkURL: string;
    srcURL: string;
    selectionText: string;
    isEditable: boolean;
  } | null;
  set: (p: Partial<UIState>) => void;
}

export const useUIStore = create<UIState>((set) => ({
  settingsOpen: false,
  emergencyConfirmOpen: false,
  devToolsOpen: false,
  historyOpen: false,
  paletteOpen: false,
  paletteMode: 'all',
  insecureWarning: null,
  certWarning: null,
  sensitiveWarning: null,
  permission: null,
  ctxMenu: null,
  set: (p) => set(p),
}));

interface SessionState {
  bookmarks: BookmarkItem[];
  history: HistoryEntry[];
  setBookmarks: (b: BookmarkItem[]) => void;
  setHistory: (h: HistoryEntry[]) => void;
  isBookmarked: (url: string) => boolean;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  bookmarks: [],
  history: [],
  setBookmarks: (bookmarks) => set({ bookmarks }),
  setHistory: (history) => set({ history }),
  isBookmarked: (url) => get().bookmarks.some((b) => b.url === url),
}));
