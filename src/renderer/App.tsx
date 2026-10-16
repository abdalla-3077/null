import React from 'react';
import { AddressBar } from './components/AddressBar';
import { Toolbar } from './components/Toolbar';
import { TopStrip, BottomStrip, SideStrip } from './components/TabStrips';
import { SetupWizard } from './components/SetupWizard';
import { SettingsPage } from './components/SettingsPage';
import { EmergencyConfirm } from './components/EmergencyConfirm';
import { InsecureWarning } from './components/InsecureWarning';
import { CertificateWarning } from './components/CertificateWarning';
import { SensitiveWarning } from './components/SensitiveWarning';
import { DevToolsDialog } from './components/DevToolsDialog';
import { FindBar } from './components/FindBar';
import { DownloadTray } from './components/DownloadTray';
import { ContextMenuHost } from './components/ContextMenuHost';
import { BookmarkBar } from './components/BookmarkBar';
import { HistoryDialog } from './components/HistoryDialog';
import { CommandPalette } from './components/CommandPalette';
import { PermissionPrompt } from './components/PermissionPrompt';
import { TranslateDialog } from './components/TranslateDialog';
import { StudyMini, StudyPanel, StudyTicker, applySnapshot, useStudyStore } from './components/StudyTimer';
import { BrandMark } from './components/BrandMark';
import { EnginePrivacyBanner } from './components/EnginePrivacyBanner';
import { useTabStore, useSettingsStore, useDownloadStore, useFindStore, useUIStore, useSessionStore } from './stores';

function useChromeReporter(
  topRef: React.RefObject<HTMLDivElement | null>,
  bottomRef: React.RefObject<HTMLDivElement | null>,
  sideRef: React.RefObject<HTMLDivElement | null>,
  active: boolean,
  showBookmarkBar: boolean,
  fullscreen: boolean,
): void {
  const layout = useSettingsStore((s) => s.settings.tabLayout);
  React.useEffect(() => {
    // The chrome only exists once the splash is replaced, so wait for `active`.
    // Reporting before that publishes a zero height, which parks the native tab
    // view over the whole window and swallows every mouse click.
    if (!active) return;
    const report = (): void => {
      if (fullscreen) {
        void window.nullBrowser.setChrome({ top: 0, bottom: 0, side: 0 }).catch(() => undefined);
        return;
      }
      const top = topRef.current?.offsetHeight ?? 0;
      const bottom = bottomRef.current?.offsetHeight ?? 0;
      const side = sideRef.current?.offsetWidth ?? 0;
      void window.nullBrowser.setChrome({ top, bottom, side }).catch(() => undefined);
    };
    report();
    const timers = [80, 240, 600].map((ms) => setTimeout(report, ms));
    let ro: ResizeObserver | null = null;
    try {
      // The observer reports the current size as soon as it attaches, which
      // guarantees a correct measurement even if nothing resizes later.
      ro = new ResizeObserver(() => report());
      if (topRef.current) ro.observe(topRef.current);
      if (bottomRef.current) ro.observe(bottomRef.current);
      if (sideRef.current) ro.observe(sideRef.current);
    } catch {
      /* ResizeObserver unavailable */
    }
    window.addEventListener('resize', report);
    void document.fonts?.ready?.then(() => report()).catch(() => undefined);
    return () => {
      for (const t of timers) clearTimeout(t);
      ro?.disconnect();
      window.removeEventListener('resize', report);
    };
  }, [active, layout, showBookmarkBar, fullscreen, topRef, bottomRef, sideRef]);
}

export function App(): React.ReactElement {
  const settings = useSettingsStore((s) => s.settings);
  const ready = useSettingsStore((s) => s.ready);
  const settingsOpen = useUIStore((s) => s.settingsOpen);
  const emergencyOpen = useUIStore((s) => s.emergencyConfirmOpen);
  const insecureWarning = useUIStore((s) => s.insecureWarning);
  const certWarning = useUIStore((s) => s.certWarning);
  const sensitiveWarning = useUIStore((s) => s.sensitiveWarning);
  const devToolsOpen = useUIStore((s) => s.devToolsOpen);
  const historyOpen = useUIStore((s) => s.historyOpen);
  const paletteOpen = useUIStore((s) => s.paletteOpen);
  const translateOpen = useUIStore((s) => s.translateOpen);
  const permission = useUIStore((s) => s.permission);
  const downloadsOpen = useDownloadStore((s) => s.open);
  const studyOpen = useStudyStore((s) => s.panelOpen);
  const topRef = React.useRef<HTMLDivElement>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const sideRef = React.useRef<HTMLDivElement>(null);
  const addressRef = React.useRef<HTMLInputElement>(null);
  const fullscreen = useUIStore((s) => s.fullscreen);
  useChromeReporter(topRef, bottomRef, sideRef, ready, settings.showBookmarkBar, fullscreen);

  React.useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.dataset.mode = settings.appearance;
    document.documentElement.style.colorScheme = settings.appearance;
  }, [settings.theme, settings.appearance]);

  React.useEffect(() => {
    const modalOpen =
      settingsOpen ||
      emergencyOpen ||
      devToolsOpen ||
      historyOpen ||
      paletteOpen ||
      translateOpen ||
      studyOpen ||
      !!permission ||
      !!insecureWarning ||
      !!certWarning ||
      !!sensitiveWarning ||
      downloadsOpen ||
      !settings.setupDone;
    void window.nullBrowser.setModalOpen(modalOpen).catch(() => undefined);
  }, [settingsOpen, emergencyOpen, devToolsOpen, historyOpen, paletteOpen, translateOpen, studyOpen, permission, insecureWarning, certWarning, sensitiveWarning, downloadsOpen, settings.setupDone]);

  React.useEffect(() => {
    let offTabs: () => void = () => undefined;
    let offFullscreen: () => void = () => undefined;
    let offSettings: () => void = () => undefined;
    let offDl: () => void = () => undefined;
    let offFind: () => void = () => undefined;
    let offCtx: () => void = () => undefined;
    let offEm: () => void = () => undefined;
    let offWarn: () => void = () => undefined;
    let offCert: () => void = () => undefined;
    let offSensitive: () => void = () => undefined;
    let offBookmarks: () => void = () => undefined;
    let offHistory: () => void = () => undefined;
    let offPermission: () => void = () => undefined;
    let offStudyChanged: () => void = () => undefined;
    const b = window.nullBrowser;
    void window.nullSettings.getAll().then((s) => {
      useSettingsStore.getState().setSettings(s);
      useSettingsStore.getState().setReady(true);
    });
    offTabs = b.onTabsChanged((tabs, activeId) => useTabStore.getState().setTabs(tabs, activeId));
    offFullscreen = b.onFullscreenChanged((value) => useUIStore.getState().set({ fullscreen: value }));
    offSettings = b.onSettingsChanged((s) => useSettingsStore.getState().setSettings(s));
    offDl = b.onDownloadsChanged((d) => useDownloadStore.getState().setDownloads(d));
    offFind = b.onFindResult((r) => {
      const f = useFindStore.getState();
      if (!f.open) f.set({ open: true });
      f.set({ result: r });
    });
    offCtx = b.onContextMenu((m) => useUIStore.getState().set({ ctxMenu: m }));
    offEm = b.onEmergencyDone(() => undefined);
    offWarn = b.onInsecureWarning((w) => useUIStore.getState().set({ insecureWarning: w }));
    offCert = b.onCertificateWarning((w) => useUIStore.getState().set({ certWarning: w }));
    offSensitive = b.onSensitiveWarning((w) => useUIStore.getState().set({ sensitiveWarning: w }));
    offBookmarks = b.onBookmarksChanged((list) => useSessionStore.getState().setBookmarks(list));
    offHistory = b.onHistoryChanged((list) => useSessionStore.getState().setHistory(list));
    offPermission = b.onPermissionRequest((r) => useUIStore.getState().set({ permission: r }));
    try {
      offStudyChanged = window.nullBrowser.onStudyChanged((snap) => {
        if (snap) applySnapshot(snap);
      });
    } catch {
      /* older preload */
    }
    b.rendererReady();
    void b.getFullscreen().then((value) => useUIStore.getState().set({ fullscreen: !!value })).catch(() => undefined);
    void b.getTabs().then(({ tabs, activeId }) => useTabStore.getState().setTabs(tabs, activeId));
    void b.getBookmarks().then((list) => useSessionStore.getState().setBookmarks(list)).catch(() => undefined);
    void b.getHistory().then((list) => useSessionStore.getState().setHistory(list)).catch(() => undefined);

    const onKey = (e: KeyboardEvent): void => {
      const mod = e.ctrlKey || e.metaKey;
      const st = useTabStore.getState();
      const activeId = st.activeId;
      if (mod && e.key.toLowerCase() === 't' && !e.shiftKey) {
        e.preventDefault();
        void b.createTab();
      } else if (mod && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        if (activeId) void b.closeTab(activeId);
      } else if (mod && e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        void b.reopenClosed();
      } else if (mod && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        addressRef.current?.focus();
        addressRef.current?.select();
      } else if (mod && e.key.toLowerCase() === 'r' && !e.shiftKey) {
        e.preventDefault();
        if (activeId) void b.reload(activeId);
      } else if (mod && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        useFindStore.getState().set({ open: true });
      } else if (mod && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        useUIStore.getState().set({ paletteOpen: true, paletteMode: 'tabs' });
      } else if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        useUIStore.getState().set({ paletteOpen: true, paletteMode: 'all' });
      } else if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        const active = useTabStore.getState().tabs.find((t) => t.id === activeId);
        if (active && /^https?:/i.test(active.url)) {
          void b.toggleBookmark(active.url, active.title, active.favicon);
        }
      } else if (mod && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        useUIStore.getState().set({ historyOpen: true });
      } else if (mod && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        useDownloadStore.getState().setOpen(!useDownloadStore.getState().open);
      } else if (mod && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        if (activeId) void b.zoomIn(activeId);
      } else if (mod && e.key === '-') {
        e.preventDefault();
        if (activeId) void b.zoomOut(activeId);
      } else if (mod && e.key === '0') {
        e.preventDefault();
        if (activeId) void b.resetZoom(activeId);
      } else if (e.key === 'F11') {
        e.preventDefault();
        void b.getFullscreen().then((value) => b.setWindowFullscreen(!value)).catch(() => undefined);
      } else if (mod && e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        cycleTab(1);
      } else if (e.key === 'Escape') {
        const ui = useUIStore.getState();
        if (ui.fullscreen) {
          void b.setWindowFullscreen(false).catch(() => undefined);
        } else if (ui.ctxMenu) ui.set({ ctxMenu: null });
        else if (ui.paletteOpen) ui.set({ paletteOpen: false });
        else if (ui.translateOpen) ui.set({ translateOpen: false });
        else if (useStudyStore.getState().panelOpen) {
          const st = useStudyStore.getState();
          const live = st.status === 'running' || st.status === 'paused';
          st.set({ panelOpen: false, miniOpen: live ? true : st.miniOpen });
        }
        else if (ui.permission) {
          void b.respondPermission(ui.permission.id, false);
          ui.set({ permission: null });
        } else if (ui.historyOpen) ui.set({ historyOpen: false });
        else if (useFindStore.getState().open && activeId) {
          void b.findStop(activeId);
          useFindStore.getState().set({ open: false, query: '', result: null });
        } else if (useDownloadStore.getState().open) useDownloadStore.getState().setOpen(false);
        else if (ui.settingsOpen) ui.set({ settingsOpen: false });
        else if (ui.emergencyConfirmOpen) ui.set({ emergencyConfirmOpen: false });
        else if (ui.devToolsOpen) ui.set({ devToolsOpen: false });
        else if (ui.insecureWarning) ui.set({ insecureWarning: null });
        else if (ui.certWarning) ui.set({ certWarning: null });
        else if (ui.sensitiveWarning) ui.set({ sensitiveWarning: null });
        else if (activeId) void b.stop(activeId);
      }
    };
    const cycleTab = (dir: 1 | -1): void => {
      const st = useTabStore.getState();
      if (st.tabs.length < 2) return;
      const i = st.tabs.findIndex((t) => t.id === st.activeId);
      const n = st.tabs[(i + dir + st.tabs.length) % st.tabs.length];
      void b.activateTab(n.id);
    };
    window.addEventListener('keydown', onKey);

    const onIpc = (channel: string, fn: () => void): (() => void) => {
      void channel;
      void fn;
      return () => undefined;
    };
    void onIpc;
    return () => {
      offTabs();
      offFullscreen();
      offSettings();
      offDl();
      offFind();
      offCtx();
      offEm();
      offWarn();
      offCert();
      offSensitive();
      offBookmarks();
      offHistory();
      offPermission();
      offStudyChanged();
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  React.useEffect(() => {
    const off = window.nullBrowser.onShortcut((c) => {
      const st = useTabStore.getState();
      const b = window.nullBrowser;
      const activeId = st.activeId;
      if (c === 'shortcut:new-tab') void b.createTab();
      else if (c === 'shortcut:new-window') void b.newWindow();
      else if (c === 'shortcut:close-tab' && activeId) void b.closeTab(activeId);
      else if (c === 'shortcut:reopen-tab') void b.reopenClosed();
      else if (c === 'shortcut:focus-address') {
        addressRef.current?.focus();
        addressRef.current?.select();
      } else if (c === 'shortcut:reload' && activeId) void b.reload(activeId);
      else if (c === 'shortcut:hard-reload' && activeId) void b.reload(activeId, true);
      else if (c === 'shortcut:fullscreen') void b.getFullscreen().then((value) => b.setWindowFullscreen(!value)).catch(() => undefined);
      else if (c === 'shortcut:find') useFindStore.getState().set({ open: true });
      else if (c === 'shortcut:clear-data') void b.clearSession();
      else if ((c === 'shortcut:next-tab' || c === 'shortcut:prev-tab') && st.tabs.length > 1) {
        const i = st.tabs.findIndex((t) => t.id === activeId);
        const n = st.tabs[(i + (c === 'shortcut:next-tab' ? 1 : -1) + st.tabs.length) % st.tabs.length];
        void b.activateTab(n.id);
      }
    });
    const handler = (e: Event): void => {
      const c = (e as CustomEvent).detail as string | undefined;
      const st = useTabStore.getState();
      const b = window.nullBrowser;
      const activeId = st.activeId;
      if (c === 'shortcut:new-tab') void b.createTab();
      else if (c === 'shortcut:close-tab' && activeId) void b.closeTab(activeId);
      else if (c === 'shortcut:reopen-tab') void b.reopenClosed();
      else if (c === 'shortcut:focus-address') {
        addressRef.current?.focus();
        addressRef.current?.select();
      } else if (c === 'shortcut:reload' && activeId) void b.reload(activeId);
      else if (c === 'shortcut:hard-reload' && activeId) void b.reload(activeId, true);
      else if (c === 'shortcut:fullscreen') void b.getFullscreen().then((value) => b.setWindowFullscreen(!value)).catch(() => undefined);
      else if (c === 'shortcut:find') useFindStore.getState().set({ open: true });
      else if (c === 'shortcut:clear-data') void b.clearSession();
      else if ((c === 'shortcut:next-tab' || c === 'shortcut:prev-tab') && st.tabs.length > 1) {
        const i = st.tabs.findIndex((t) => t.id === activeId);
        const n = st.tabs[(i + (c === 'shortcut:next-tab' ? 1 : -1) + st.tabs.length) % st.tabs.length];
        void b.activateTab(n.id);
      }
    };
    window.addEventListener('null-shortcut', handler);
    return () => {
      off();
      window.removeEventListener('null-shortcut', handler);
    };
  }, []);

  if (!ready) {
    return (
      <div className="splash" role="status" aria-label="Loading Null">
        <div className="splash-card">
          <BrandMark size={72} />
          <span className="splash-name">NULL</span>
          <span className="splash-bar" aria-hidden>
            <i />
          </span>
        </div>
      </div>
    );
  }

  const layout = settings.tabLayout;
  const narrow = typeof window !== 'undefined' && window.innerWidth < 760;

  return (
    <div className={`browser layout-${layout}${fullscreen ? ' is-fullscreen' : ''}`} data-theme={settings.theme} data-mode={settings.appearance}>
      {layout === 'side' && !fullscreen && (
        <aside ref={sideRef} className={`side-tabs${narrow ? ' collapsed' : ''}`} aria-label="Sidebar tabs">
          <SideStrip collapsed={narrow} />
        </aside>
      )}
      <div className="main-col" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
        {!fullscreen && (layout === 'top' || layout === 'side') && (
          <div ref={topRef} className="chrome-top">
            {layout === 'top' && <TopStrip />}
            <Toolbar addressRef={addressRef} />
            <AddressBar addressRef={addressRef} />
            <EnginePrivacyBanner />
            {settings.showBookmarkBar && <BookmarkBar />}
            <FindBar />
          </div>
        )}
        {!fullscreen && layout === 'bottom' && (
          <div ref={topRef} className="chrome-top">
            <Toolbar addressRef={addressRef} />
            <AddressBar addressRef={addressRef} />
            <EnginePrivacyBanner />
            {settings.showBookmarkBar && <BookmarkBar />}
            <FindBar />
          </div>
        )}
        <div style={{ flex: 1 }} />
        {!fullscreen && layout === 'bottom' && (
          <div ref={bottomRef} className="chrome-bottom">
            <BottomStrip />
          </div>
        )}
      </div>
      {fullscreen && (
        <button
          className="fullscreen-exit"
          aria-label="Exit full screen (Esc)"
          title="Exit full screen (Esc)"
          onClick={() => void window.nullBrowser.setWindowFullscreen(false).catch(() => undefined)}
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M8 3v3a2 2 0 0 1-2 2H3" />
            <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
            <path d="M3 16h3a2 2 0 0 1 2 2v3" />
            <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
          </svg>
          <span>Exit full screen</span>
          <kbd className="kbd">Esc</kbd>
        </button>
      )}
      {!settings.setupDone && <SetupWizard />}
      {settingsOpen && <SettingsPage />}
      {emergencyOpen && <EmergencyConfirm />}
      {insecureWarning && <InsecureWarning />}
      {certWarning && <CertificateWarning />}
      {sensitiveWarning && <SensitiveWarning />}
      {devToolsOpen && <DevToolsDialog />}
      {historyOpen && <HistoryDialog />}
      {paletteOpen && <CommandPalette />}
      <TranslateDialog />
      {permission && <PermissionPrompt />}
      <StudyPanel />
      <StudyMini />
      <StudyTicker />
      <DownloadTray />
      <ContextMenuHost />
    </div>
  );
}
