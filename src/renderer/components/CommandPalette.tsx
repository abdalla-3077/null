import React from 'react';
import { useDownloadStore, useFindStore, useSessionStore, useTabStore, useUIStore } from '../stores';
import { Icon, type IconName } from './icons';

interface PaletteItem {
  id: string;
  label: string;
  hint: string;
  icon: IconName;
  group: string;
  run: () => void;
}

export function CommandPalette(): React.ReactElement | null {
  const open = useUIStore((s) => s.paletteOpen);
  const mode = useUIStore((s) => s.paletteMode);
  const set = useUIStore((s) => s.set);
  const tabs = useTabStore((s) => s.tabs);
  const activeId = useTabStore((s) => s.activeId);
  const bookmarks = useSessionStore((s) => s.bookmarks);
  const [query, setQuery] = React.useState('');
  const [index, setIndex] = React.useState(0);
  const listRef = React.useRef<HTMLDivElement>(null);
  const b = window.nullBrowser;

  const active = tabs.find((t) => t.id === activeId);
  const bookmarked = !!active && bookmarks.some((x) => x.url === active.url);

  React.useEffect(() => {
    if (open) {
      setQuery('');
      setIndex(0);
    }
  }, [open, mode]);

  const close = (): void => set({ paletteOpen: false });

  const items = React.useMemo<PaletteItem[]>(() => {
    const tabItems: PaletteItem[] = tabs.map((t) => ({
      id: `tab-${t.id}`,
      label: t.title || 'New Tab',
      hint: t.url,
      icon: 'globe',
      group: 'Tabs',
      run: () => void b.activateTab(t.id),
    }));
    if (mode === 'tabs') return tabItems;
    const commands: PaletteItem[] = [
      { id: 'new-tab', label: 'New tab', hint: 'Ctrl+T', icon: 'plus', group: 'Actions', run: () => void b.createTab() },
      { id: 'new-window', label: 'New window', hint: 'Ctrl+Shift+N', icon: 'external', group: 'Actions', run: () => void b.newWindow() },
      { id: 'close-tab', label: 'Close tab', hint: 'Ctrl+W', icon: 'close', group: 'Actions', run: () => { if (activeId) void b.closeTab(activeId); } },
      { id: 'reopen', label: 'Reopen closed tab', hint: 'Ctrl+Shift+T', icon: 'history', group: 'Actions', run: () => void b.reopenClosed() },
      {
        id: 'bookmark',
        label: bookmarked ? 'Remove bookmark' : 'Bookmark this page',
        hint: 'Ctrl+D',
        icon: bookmarked ? 'starFilled' : 'star',
        group: 'Actions',
        run: () => {
          if (active && /^https?:/i.test(active.url)) void b.toggleBookmark(active.url, active.title, active.favicon);
        },
      },
      { id: 'history', label: 'Open history', hint: 'Ctrl+H', icon: 'history', group: 'Actions', run: () => set({ historyOpen: true }) },
      { id: 'downloads', label: 'Open downloads', hint: 'Ctrl+J', icon: 'download', group: 'Actions', run: () => useDownloadStore.getState().setOpen(true) },
      { id: 'find', label: 'Find in page', hint: 'Ctrl+F', icon: 'search', group: 'Actions', run: () => useFindStore.getState().set({ open: true }) },
      { id: 'translate', label: 'Translate this page', hint: '', icon: 'translate', group: 'Actions', run: () => { if (activeId) void b.translate(activeId); } },
      { id: 'translate-restore', label: 'Show original page', hint: '', icon: 'translate', group: 'Actions', run: () => { if (activeId) void b.translateRestore(activeId); } },
      { id: 'inspector', label: 'Open page inspector', hint: '', icon: 'code', group: 'Actions', run: () => set({ devToolsOpen: true }) },
      { id: 'zoom-in', label: 'Zoom in', hint: 'Ctrl++', icon: 'zoomIn', group: 'View', run: () => { if (activeId) void b.zoomIn(activeId); } },
      { id: 'zoom-out', label: 'Zoom out', hint: 'Ctrl+-', icon: 'zoomOut', group: 'View', run: () => { if (activeId) void b.zoomOut(activeId); } },
      { id: 'zoom-reset', label: 'Reset zoom', hint: 'Ctrl+0', icon: 'search', group: 'View', run: () => { if (activeId) void b.resetZoom(activeId); } },
      { id: 'fullscreen', label: 'Toggle full screen', hint: 'F11', icon: 'screen', group: 'View', run: () => void b.getFullscreen().then((value) => b.setWindowFullscreen(!value)).catch(() => undefined) },
      { id: 'settings', label: 'Open settings', hint: '', icon: 'settings', group: 'View', run: () => set({ settingsOpen: true }) },
      { id: 'clear', label: 'Clear session data', hint: 'Ctrl+Shift+Del', icon: 'trash', group: 'Privacy', run: () => void b.clearSession() },
      { id: 'emergency', label: 'Emergency mode', hint: '', icon: 'alert', group: 'Privacy', run: () => void b.emergency() },
    ];
    return [...tabItems, ...commands];
  }, [tabs, mode, activeId, active, bookmarked, b, set]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? items
        .map((item) => {
          const label = item.label.toLowerCase();
          const hay = `${label} ${item.hint.toLowerCase()}`;
          if (!hay.includes(q)) return null;
          return { item, score: label.startsWith(q) ? 0 : label.includes(q) ? 1 : 2 };
        })
        .filter((x): x is { item: PaletteItem; score: number } => x !== null)
        .sort((a, bb) => a.score - bb.score)
        .map((x) => x.item)
    : items;

  const safeIndex = filtered.length === 0 ? 0 : Math.min(index, filtered.length - 1);

  React.useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>('.palette-row.active');
    el?.scrollIntoView({ block: 'nearest' });
  }, [safeIndex, open, filtered.length]);

  if (!open) return null;

  const runItem = (item: PaletteItem | undefined): void => {
    if (!item) return;
    close();
    item.run();
  };

  return (
    <div className="overlay palette-overlay" role="dialog" aria-modal="true" aria-label="Command palette" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="palette" onKeyDown={(e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setIndex((i) => (filtered.length ? (i + 1) % filtered.length : 0));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setIndex((i) => (filtered.length ? (i - 1 + filtered.length) % filtered.length : 0));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          runItem(filtered[safeIndex]);
        }
      }}>
        <div className="palette-search">
          <Icon name={mode === 'tabs' ? 'globe' : 'command'} size={16} />
          <input
            type="text"
            autoFocus
            value={query}
            aria-label={mode === 'tabs' ? 'Search tabs' : 'Search commands'}
            placeholder={mode === 'tabs' ? 'Search tabs…' : 'Search commands, tabs and settings…'}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
          />
          <kbd className="kbd">Esc</kbd>
        </div>
        <div className="palette-list" ref={listRef} role="listbox" aria-label="Results">
          {filtered.length === 0 ? (
            <div className="palette-empty">No matches</div>
          ) : (
            filtered.map((item, i) => (
              <button
                key={item.id}
                role="option"
                aria-selected={i === safeIndex}
                className={`palette-row${i === safeIndex ? ' active' : ''}`}
                onMouseEnter={() => setIndex(i)}
                onClick={() => runItem(item)}
              >
                <span className="palette-icon">
                  <Icon name={item.icon} size={15} />
                </span>
                <span className="palette-copy">
                  <span className="palette-label">{item.label}</span>
                  {item.hint && <span className="palette-hint">{item.hint}</span>}
                </span>
                <span className="palette-group">{item.group}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
