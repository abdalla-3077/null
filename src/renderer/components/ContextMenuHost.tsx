import React from 'react';
import { useUIStore } from '../stores';
import { Icon, type IconName } from './icons';

export function ContextMenuHost(): React.ReactElement {
  const ctx = useUIStore((s) => s.ctxMenu);
  const set = useUIStore((s) => s.set);
  const b = window.nullBrowser;
  if (!ctx) return <></>;
  const close = (): void => set({ ctxMenu: null });
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
  const nav: { label: string; icon: IconName; run: () => void }[] = [
    { label: 'Back', icon: 'back', run: () => void b.goBack(ctx.tabId) },
    { label: 'Forward', icon: 'forward', run: () => void b.goForward(ctx.tabId) },
    { label: 'Reload', icon: 'reload', run: () => void b.reload(ctx.tabId) },
  ];
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 59 }} onClick={close} onContextMenu={(e) => { e.preventDefault(); close(); }} />
      <div className="ctx-menu" style={{ left: Math.min(ctx.x, window.innerWidth - 240), top: Math.min(ctx.y, window.innerHeight - (items.length + nav.length) * 33 - 24) }} role="menu">
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
      </div>
    </>
  );
}
