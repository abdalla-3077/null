import React from 'react';
import { SEARCH_ENGINES } from '../../shared/config';
import { useSettingsStore, useTabStore, useUIStore } from '../stores';
import { Icon } from './icons';

const DISMISSED_KEY = 'null-engine-banner-dismissed';

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function engineForHost(host: string): 'google' | 'bing' | null {
  if (!host) return null;
  if (host === 'google.com' || host.endsWith('.google.com') || host.startsWith('google.') || host.endsWith('.google.co') || host.endsWith('.google.co.uk') || host.endsWith('.google.de') || host.endsWith('.google.fr')) return 'google';
  if (host === 'bing.com' || host.endsWith('.bing.com')) return 'bing';
  return null;
}

export function EnginePrivacyBanner(): React.ReactElement | null {
  const settings = useSettingsStore((s) => s.settings);
  const tabs = useTabStore((s) => s.tabs);
  const activeId = useTabStore((s) => s.activeId);
  const [dismissed, setDismissed] = React.useState<string[]>(() => {
    try {
      return JSON.parse(sessionStorage.getItem(DISMISSED_KEY) ?? '[]') as string[];
    } catch {
      return [];
    }
  });
  if (!settings.googlePrivacyBanner) return null;
  const active = tabs.find((t) => t.id === activeId);
  const host = active ? hostOf(active.url) : '';
  const visiting = engineForHost(host);
  if (!visiting) return null;
  const engine = settings.searchEngine === visiting ? null : SEARCH_ENGINES[settings.searchEngine];
  const key = `${visiting}:${settings.searchEngine}`;
  if (dismissed.includes(key)) return null;
  const dismiss = (): void => {
    const next = [...dismissed, key];
    setDismissed(next);
    try {
      sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };
  const switchEngine = (): void => {
    void window.nullBrowser.createTab(engine ? SEARCH_ENGINES[engine.id].searchUrl.replace('%s', '') : 'null://newtab');
    dismiss();
  };
  return (
    <div className="engine-banner" role="status" aria-live="polite">
      <span className="engine-banner-icon" aria-hidden>
        <Icon name={visiting === 'google' ? 'alert' : 'lock'} size={14} />
      </span>
      <p className="engine-banner-copy">
        <strong>
          {visiting === 'google'
            ? 'Google collects your searches for ad profiling.'
            : 'Bing profiles your searches through a Microsoft account graph.'}
        </strong>
        <span>
          {visiting === 'google'
            ? ' Null forgets everything on close, but Google still sees this visit. Prefer a private engine for sensitive searches.'
            : ' Null forgets everything on close, but Microsoft still sees this visit. Prefer a private engine for sensitive searches.'}
        </span>
      </p>
      {engine && (
        <button className="engine-banner-btn" onClick={switchEngine}>
          Open {engine.name} instead
        </button>
      )}
      <button className="icon-btn engine-banner-dismiss" aria-label="Dismiss privacy notice for this session" onClick={dismiss}>
        <Icon name="close" size={13} />
      </button>
      <button
        className="engine-banner-link"
        onClick={() => useUIStore.getState().set({ settingsOpen: true })}
      >
        Privacy settings
      </button>
    </div>
  );
}
