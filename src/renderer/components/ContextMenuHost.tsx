import React from 'react';
import { useUIStore } from '../stores';

export function ContextMenuHost(): React.ReactElement {
  const ctx = useUIStore((s) => s.ctxMenu);
  const set = useUIStore((s) => s.set);
  const b = window.nullBrowser;
  if (!ctx) return <></>;
  const close = (): void => set({ ctxMenu: null });
  const items: { label: string; run: () => void }[] = [];
  if (ctx.linkURL) {
    items.push(
      { label: 'Open link in new tab', run: () => void b.createTab(ctx.linkURL, true) },
      { label: 'Copy link address', run: () => void navigator.clipboard.writeText(ctx.linkURL).catch(() => undefined) },
    );
  }
  if (ctx.srcURL) {
    items.push({ label: 'Open image in new tab', run: () => void b.createTab(ctx.srcURL, true) });
  }
  if (ctx.selectionText) {
    items.push({ label: `Search for "${ctx.selectionText.slice(0, 32)}"`, run: () => void b.createTab(ctx.selectionText, true) });
  }
  items.push(
    { label: 'Back', run: () => void b.goBack(ctx.tabId) },
    { label: 'Forward', run: () => void b.goForward(ctx.tabId) },
    { label: 'Reload', run: () => void b.reload(ctx.tabId) },
  );
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 59 }} onClick={close} onContextMenu={(e) => { e.preventDefault(); close(); }} />
      <div className="ctx-menu" style={{ left: Math.min(ctx.x, window.innerWidth - 220), top: Math.min(ctx.y, window.innerHeight - items.length * 32 - 16) }} role="menu">
        {items.map((i) => (
          <button key={i.label} role="menuitem" onClick={() => { close(); i.run(); }}>{i.label}</button>
        ))}
      </div>
    </>
  );
}
