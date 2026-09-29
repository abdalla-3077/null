import React from 'react';
import { useTabStore, useSettingsStore, useDownloadStore, useUIStore } from '../stores';
import { Icon } from './icons';

function NavButtons(): React.ReactElement {
  const tabs = useTabStore((s) => s.tabs);
  const activeId = useTabStore((s) => s.activeId);
  const active = tabs.find((t) => t.id === activeId);
  const b = window.nullBrowser;
  return (
    <>
      <button className="icon-btn" title="Back" aria-label="Go back" disabled={!active?.canGoBack} onClick={() => activeId && b.goBack(activeId)}>
        <Icon name="back" />
      </button>
      <button className="icon-btn" title="Forward" aria-label="Go forward" disabled={!active?.canGoForward} onClick={() => activeId && b.goForward(activeId)}>
        <Icon name="forward" />
      </button>
      {active?.loading ? (
        <button className="icon-btn spin-btn" title="Stop" aria-label="Stop loading" onClick={() => activeId && b.stop(activeId)}>
          <Icon name="close" />
        </button>
      ) : (
        <button className="icon-btn" title="Reload" aria-label="Reload page" onClick={() => activeId && b.reload(activeId)}>
          <Icon name="reload" />
        </button>
      )}
      <button className="icon-btn" title="Home" aria-label="Go home" onClick={() => activeId && b.goHome(activeId)}>
        <Icon name="home" />
      </button>
    </>
  );
}

function AiRail(): React.ReactElement {
  const settings = useSettingsStore((s) => s.settings);
  const b = window.nullBrowser;
  return (
    <div className="ai-rail" role="toolbar" aria-label="AI providers">
      {settings.aiProviders.map((p) => (
        <button
          key={p.id}
          className={`ai-btn${settings.aiPanelOpen && settings.aiActiveProvider === p.id ? ' active' : ''}`}
          title={`Open ${p.name}`}
          aria-label={`Open ${p.name} panel`}
          onClick={() => {
            if (settings.aiPanelOpen && settings.aiActiveProvider === p.id) void b.aiClose();
            else void b.aiOpen(p.id);
          }}
        >
          {p.name}
        </button>
      ))}
    </div>
  );
}

export function Toolbar({ addressRef }: { addressRef: React.RefObject<HTMLInputElement | null> }): React.ReactElement {
  void addressRef;
  const tabs = useTabStore((s) => s.tabs);
  const downloads = useDownloadStore((s) => s.downloads);
  const dlOpen = useDownloadStore((s) => s.open);
  const setDl = useDownloadStore((s) => s.setOpen);
  const setUI = useUIStore((s) => s.set);
  const settings = useSettingsStore((s) => s.settings);
  const b = window.nullBrowser;
  const activeCount = downloads.filter((d) => d.state === 'progressing').length;
  return (
    <div className="toolbar">
      <NavButtons />
      <button className="icon-btn" title="New tab (Ctrl+T)" aria-label="New tab" onClick={() => void b.createTab()}>
        <Icon name="plus" />
      </button>
      <AiRail />
      <div style={{ flex: 1 }} />
      <button
        className="icon-btn dl-btn"
        title={`Downloads${activeCount > 0 ? ` (${activeCount} active)` : ''}`}
        aria-label="Show downloads"
        onClick={() => {
          if (!dlOpen) void b.getDownloads().then((d) => useDownloadStore.getState().setDownloads(d)).catch(() => undefined);
          setDl(!dlOpen);
        }}
      >
        <Icon name="download" />
        {activeCount > 0 && <span className="dl-badge">{activeCount}</span>}
      </button>
      <button className="icon-btn" title="Settings" aria-label="Open settings" onClick={() => setUI({ settingsOpen: true })}>
        <Icon name="settings" />
      </button>
      <button
        className="icon-btn danger"
        title="Emergency mode"
        aria-label="Emergency mode: clear data and reset"
        onClick={() => {
          if (settings.emergencyConfirm) setUI({ emergencyConfirmOpen: true });
          else void b.emergency();
        }}
      >
        <Icon name="alert" />
      </button>
      <span style={{ display: 'none' }}>{tabs.length}</span>
    </div>
  );
}
