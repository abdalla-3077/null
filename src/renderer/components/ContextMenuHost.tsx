import React from 'react';
import { useSessionStore, useTabStore, useUIStore } from '../stores';
import { Icon, type IconName } from './icons';

function swapTabIds(ids: string[], a: string, c: string): string[] {
  const next = [...ids];
  const i = next.indexOf(a);
  const j = next.indexOf(c);
  if (i < 0 || j < 0) return ids;
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function ContextMenuHost(): React.ReactElement {
  const ctx = useUIStore((s) => s.ctxMenu);
  const set = useUIStore((s) => s.set);
  const tabs = useTabStore((s) => s.tabs);
  const bookmarks = useSessionStore((s) => s.bookmarks);
  const b = window.nullBrowser;
  if (!ctx) return <></>;
  const close = (): void => set({ ctxMenu: null });
  const tab = tabs.find((t) => t.id === ctx.tabId);
  const bookmarked = !!tab && bookmarks.some((x) => x.url === tab.url);
  const items: { label: string; icon: IconName; run: () => void }[] = [];
  if (ctx.linkURL) {
    items.push(
      { label: 'Open link in new tab', icon: 'plus', run: () => void b.createTab(ctx.linkURL, true) },
      { label: 'Copy link address', icon: 'search', run: () => void navigator.clipboard.writeText(ctx.linkURL).catch(() => undefined) },
    );
  }
  if (ctx.srcURL) {
    items.push({ label: 'Open image in new tab', icon: 'plus', run: () => void b.createTab(ctx.srcURL, true) });
  }
  if (ctx.selectionText) {
    items.push({ label: `Search for "${ctx.selectionText.slice(0, 32)}"`, icon: 'search', run: () => void b.createTab(ctx.selectionText, true) });
  }
  if (tab) {
    items.push(
      {
        label: tab.pinned ? 'Unpin tab' : 'Pin tab',
        icon: 'pin',
        run: () => void b.togglePin(tab.id),
      },
      {
        label: bookmarked ? 'Remove bookmark' : 'Bookmark this page',
        icon: bookmarked ? 'starFilled' : 'star',
        run: () => {
          if (/^https?:/i.test(tab.url)) void b.toggleBookmark(tab.url, tab.title, tab.favicon);
        },
      },
      { label: 'Duplicate tab', icon: 'copy', run: () => void b.duplicateTab(tab.id) },
    );
    const tabIndex = tabs.findIndex((t) => t.id === tab.id);
    const prev = tabIndex > 0 ? tabs[tabIndex - 1] : null;
    const next = tabIndex >= 0 && tabIndex < tabs.length - 1 ? tabs[tabIndex + 1] : null;
    if (prev && prev.pinned === tab.pinned) {
      items.push({ label: 'Move tab left', icon: 'back', run: () => void b.reorderTabs(swapTabIds(tabs.map((t) => t.id), tab.id, prev.id)) });
    }
    if (next && next.pinned === tab.pinned) {
      items.push({ label: 'Move tab right', icon: 'forward', run: () => void b.reorderTabs(swapTabIds(tabs.map((t) => t.id), tab.id, next.id)) });
    }
  }
  const nav: { label: string; icon: IconName; run: () => void }[] = [
    { label: 'Back', icon: 'back', run: () => void b.goBack(ctx.tabId) },
    { label: 'Forward', icon: 'forward', run: () => void b.goForward(ctx.tabId) },
    { label: 'Reload', icon: 'reload', run: () => void b.reload(ctx.tabId) },
  ];
  const zoom: { label: string; icon: IconName; run: () => void }[] = [
    { label: 'Zoom in', icon: 'zoomIn', run: () => void b.zoomIn(ctx.tabId) },
    { label: 'Zoom out', icon: 'zoomOut', run: () => void b.zoomOut(ctx.tabId) },
    { label: 'Reset zoom', icon: 'search', run: () => void b.resetZoom(ctx.tabId) },
  ];
  const rows = items.length + nav.length + zoom.length;
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 59 }} onClick={close} onContextMenu={(e) => { e.preventDefault(); close(); }} />
      <div className="ctx-menu" style={{ left: Math.min(ctx.x, window.innerWidth - 240), top: Math.min(ctx.y, window.innerHeight - rows * 33 - 24) }} role="menu">
        {items.map((i) => (
          <button key={i.label} role="menuitem" onClick={() => { close(); i.run(); }}>
            <Icon name={i.icon} size={14} />
            {i.label}
          </button>
        ))}
        {items.length > 0 && <div className="ctx-sep" />}
        {nav.map((i) => (
          <button key={i.label} role="menuitem" onClick={() => { close(); i.run(); }}>
            <Icon name={i.icon} size={14} />
            {i.label}
          </button>
        ))}
        <div className="ctx-sep" />
        {zoom.map((i) => (
          <button key={i.label} role="menuitem" onClick={() => { close(); i.run(); }}>
            <Icon name={i.icon} size={14} />
            {i.label}
          </button>
        ))}
      </div>
    </>
  );
}
