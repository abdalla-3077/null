import React from 'react';
import { TabItem } from './TabItem';
import { useTabStore } from '../stores';

function useTabActions(): {
  activate: (id: string) => void;
  close: (id: string) => void;
  mute: (id: string, muted: boolean) => void;
  move: (id: string, dir: -1 | 1) => void;
} {
  const tabs = useTabStore((s) => s.tabs);
  const b = window.nullBrowser;
  return {
    activate: (id) => void b.activateTab(id),
    close: (id) => void b.closeTab(id),
    mute: (id, muted) => void b.muteTab(id, !muted),
    move: (id, dir) => {
      const ids = tabs.map((t) => t.id);
      const i = ids.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= ids.length) return;
      const next = [...ids];
      [next[i], next[j]] = [next[j], next[i]];
      void b.reorderTabs(next);
    },
  };
}

export function TopStrip(): React.ReactElement {
  const tabs = useTabStore((s) => s.tabs);
  const a = useTabActions();
  const b = window.nullBrowser;
  return (
    <div className="tabstrip" role="tablist" aria-label="Tabs">
      {tabs.map((t) => (
        <TabItem key={t.id} tab={t} onActivate={() => a.activate(t.id)} onClose={() => a.close(t.id)} onMute={() => a.mute(t.id, t.muted)} onReorder={(d) => a.move(t.id, d)} />
      ))}
      <button className="icon-btn newtab-inline" title="New tab (Ctrl+T)" aria-label="New tab" onClick={() => void b.createTab()}>+</button>
    </div>
  );
}

export function BottomStrip(): React.ReactElement {
  const tabs = useTabStore((s) => s.tabs);
  const a = useTabActions();
  const b = window.nullBrowser;
  return (
    <div className="tabstrip bottom" role="tablist" aria-label="Tabs">
      {tabs.map((t) => (
        <TabItem key={t.id} tab={t} onActivate={() => a.activate(t.id)} onClose={() => a.close(t.id)} onMute={() => a.mute(t.id, t.muted)} onReorder={(d) => a.move(t.id, d)} />
      ))}
      <button className="icon-btn newtab-inline" title="New tab (Ctrl+T)" aria-label="New tab" onClick={() => void b.createTab()}>+</button>
    </div>
  );
}

export function SideStrip({ collapsed }: { collapsed: boolean }): React.ReactElement {
  void collapsed;
  const tabs = useTabStore((s) => s.tabs);
  const a = useTabActions();
  const b = window.nullBrowser;
  return (
    <div className="vlist" role="tablist" aria-label="Tabs">
      {tabs.map((t) => (
        <TabItem key={t.id} tab={t} onActivate={() => a.activate(t.id)} onClose={() => a.close(t.id)} onMute={() => a.mute(t.id, t.muted)} onReorder={(d) => a.move(t.id, d)} />
      ))}
      <button className="btn newtab-btn" onClick={() => void b.createTab()}>+ New tab</button>
    </div>
  );
}
