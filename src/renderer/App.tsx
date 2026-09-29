import React from 'react';
import { AddressBar } from './components/AddressBar';
import { Toolbar } from './components/Toolbar';
import { TopStrip, BottomStrip, SideStrip } from './components/TabStrips';
import { SetupWizard } from './components/SetupWizard';
import { SettingsPage } from './components/SettingsPage';
import { EmergencyConfirm } from './components/EmergencyConfirm';
import { FindBar } from './components/FindBar';
import { DownloadTray } from './components/DownloadTray';
import { ContextMenuHost } from './components/ContextMenuHost';
import { useTabStore, useSettingsStore, useDownloadStore, useFindStore, useUIStore } from './stores';

function useChromeReporter(
  topRef: React.RefObject<HTMLDivElement | null>,
  bottomRef: React.RefObject<HTMLDivElement | null>,
  sideRef: React.RefObject<HTMLDivElement | null>,
): void {
  const layout = useSettingsStore((s) => s.settings.tabLayout);
  React.useEffect(() => {
    const report = (): void => {
      const top = topRef.current?.offsetHeight ?? 0;
      const bottom = bottomRef.current?.offsetHeight ?? 0;
      const side = sideRef.current?.offsetWidth ?? 0;
      void window.nullBrowser.setChrome({ top, bottom, side }).catch(() => undefined);
    };
    report();
    const t = setTimeout(report, 120);
    let ro: ResizeObserver | null = null;
    try {
      ro = new ResizeObserver(() => report());
      if (topRef.current) ro.observe(topRef.current);
      if (bottomRef.current) ro.observe(bottomRef.current);
      if (sideRef.current) ro.observe(sideRef.current);
    } catch {
      /* ResizeObserver unavailable */
    }
    window.addEventListener('resize', report);
    return () => {
      clearTimeout(t);
      ro?.disconnect();
      window.removeEventListener('resize', report);
    };
  }, [layout, topRef, bottomRef, sideRef]);
}

export function App(): React.ReactElement {
  const settings = useSettingsStore((s) => s.settings);
  const ready = useSettingsStore((s) => s.ready);
  const settingsOpen = useUIStore((s) => s.settingsOpen);
  const emergencyOpen = useUIStore((s) => s.emergencyConfirmOpen);
  const topRef = React.useRef<HTMLDivElement>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const sideRef = React.useRef<HTMLDivElement>(null);
  const addressRef = React.useRef<HTMLInputElement>(null);
  useChromeReporter(topRef, bottomRef, sideRef);

  React.useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.dataset.mode = settings.appearance;
    document.documentElement.style.colorScheme = settings.appearance;
  }, [settings.theme, settings.appearance]);

  React.useEffect(() => {
    const modalOpen = settingsOpen || emergencyOpen || !settings.setupDone;
    void window.nullBrowser.setModalOpen(modalOpen).catch(() => undefined);
  }, [settingsOpen, emergencyOpen, settings.setupDone]);

  React.useEffect(() => {
    let offTabs: () => void = () => undefined;
    let offSettings: () => void = () => undefined;
    let offDl: () => void = () => undefined;
    let offFind: () => void = () => undefined;
    let offCtx: () => void = () => undefined;
    let offEm: () => void = () => undefined;
    const b = window.nullBrowser;
    void window.nullSettings.getAll().then((s) => {
      useSettingsStore.getState().setSettings(s);
      useSettingsStore.getState().setReady(true);
    });
    offTabs = b.onTabsChanged((tabs, activeId) => useTabStore.getState().setTabs(tabs, activeId));
    offSettings = b.onSettingsChanged((s) => useSettingsStore.getState().setSettings(s));
    offDl = b.onDownloadsChanged((d) => useDownloadStore.getState().setDownloads(d));
    offFind = b.onFindResult((r) => {
      const f = useFindStore.getState();
      if (!f.open) f.set({ open: true });
      f.set({ result: r });
    });
    offCtx = b.onContextMenu((m) => useUIStore.getState().set({ ctxMenu: m }));
    offEm = b.onEmergencyDone(() => undefined);
    b.rendererReady();
    void b.getTabs().then(({ tabs, activeId }) => useTabStore.getState().setTabs(tabs, activeId));

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
      } else if (mod && e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        cycleTab(1);
      } else if (e.key === 'Escape') {
        const ui = useUIStore.getState();
        if (ui.ctxMenu) ui.set({ ctxMenu: null });
        else if (useFindStore.getState().open && activeId) {
          void b.findStop(activeId);
          useFindStore.getState().set({ open: false, query: '', result: null });
        } else if (ui.settingsOpen) ui.set({ settingsOpen: false });
        else if (ui.emergencyConfirmOpen) ui.set({ emergencyConfirmOpen: false });
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
      offSettings();
      offDl();
      offFind();
      offCtx();
      offEm();
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
      else if (c === 'shortcut:find') useFindStore.getState().set({ open: true });
      else if (c === 'shortcut:clear-data') void b.clearSession();
      else if (c === 'shortcut:escape' && activeId) void b.stop(activeId);
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
      else if (c === 'shortcut:find') useFindStore.getState().set({ open: true });
      else if (c === 'shortcut:clear-data') void b.clearSession();
      else if (c === 'shortcut:escape' && activeId) void b.stop(activeId);
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

  if (!ready) return <div className="welcome-hint">Loading Null…</div>;

  const layout = settings.tabLayout;
  const narrow = typeof window !== 'undefined' && window.innerWidth < 760;

  return (
    <div className={`browser layout-${layout}`} data-theme={settings.theme} data-mode={settings.appearance}>
      {layout === 'side' && (
        <aside ref={sideRef} className={`side-tabs${narrow ? ' collapsed' : ''}`} aria-label="Sidebar tabs">
          <SideStrip collapsed={narrow} />
        </aside>
      )}
      <div className="main-col" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
        {(layout === 'top' || layout === 'side') && (
          <div ref={topRef} className="chrome-top">
            {layout === 'top' && <TopStrip />}
            <Toolbar addressRef={addressRef} />
            <AddressBar addressRef={addressRef} />
            <FindBar />
            <DownloadTray />
          </div>
        )}
        {layout === 'bottom' && (
          <div ref={topRef} className="chrome-top">
            <Toolbar addressRef={addressRef} />
            <AddressBar addressRef={addressRef} />
            <FindBar />
            <DownloadTray />
          </div>
        )}
        <div style={{ flex: 1 }} />
        {layout === 'bottom' && (
          <div ref={bottomRef} className="chrome-bottom">
            <BottomStrip />
          </div>
        )}
      </div>
      {!settings.setupDone && <SetupWizard />}
      {settingsOpen && <SettingsPage />}
      {emergencyOpen && <EmergencyConfirm />}
      <ContextMenuHost />
    </div>
  );
}
