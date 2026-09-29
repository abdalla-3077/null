import React from 'react';
import { useSettingsStore } from '../stores';
import type { SearchEngineId, TabLayout, ThemeName, AppearanceMode } from '../../shared/types';

export function SetupWizard(): React.ReactElement {
  const settings = useSettingsStore((s) => s.settings);
  const [layout, setLayout] = React.useState<TabLayout>(settings.tabLayout);
  const [theme, setTheme] = React.useState<ThemeName>(settings.theme);
  const [mode, setMode] = React.useState<AppearanceMode>(settings.appearance);
  const [engine, setEngine] = React.useState<SearchEngineId>(settings.searchEngine);

  const save = async (): Promise<void> => {
    await window.nullSettings.set('tabLayout', layout);
    await window.nullSettings.set('theme', theme);
    await window.nullSettings.set('appearance', mode);
    await window.nullSettings.set('searchEngine', engine);
    await window.nullSettings.set('setupDone', true);
  };

  const opt = (selected: boolean) => `opt${selected ? ' selected' : ''}`;

  return (
    <div className="overlay" role="dialog" aria-modal aria-label="Welcome to Null">
      <div className="dialog">
        <h2>Welcome to NULL</h2>
        <p>Minimal, private desktop browser. Choose your setup — you can change all of this later in Settings.</p>
        <div className="field">
          <label>Tab layout</label>
          <div className="opt-grid">
            {(['top', 'side', 'bottom'] as TabLayout[]).map((l) => (
              <button key={l} className={opt(layout === l)} onClick={() => setLayout(l)} aria-pressed={layout === l}>
                {l === 'top' ? 'Top tabs' : l === 'side' ? 'Side tabs' : 'Bottom tabs'}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Theme</label>
          <div className="opt-grid">
            {(['blue', 'red', 'neutral'] as ThemeName[]).map((t) => (
              <button key={t} className={opt(theme === t)} onClick={() => setTheme(t)} aria-pressed={theme === t}>
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Appearance</label>
          <div className="opt-grid">
            {(['dark', 'light'] as AppearanceMode[]).map((m) => (
              <button key={m} className={opt(mode === m)} onClick={() => setMode(m)} aria-pressed={mode === m}>
                {m[0].toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Search engine</label>
          <div className="opt-grid">
            {(['google', 'bing', 'duckduckgo'] as SearchEngineId[]).map((e) => (
              <button key={e} className={opt(engine === e)} onClick={() => setEngine(e)} aria-pressed={engine === e}>
                {e === 'duckduckgo' ? 'DuckDuckGo' : e[0].toUpperCase() + e.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <p>Null is a temporary private session: history, cookies and storage are cleared when it closes.</p>
        <div className="btn-row">
          <button className="btn primary" onClick={() => void save()}>Start browsing</button>
        </div>
      </div>
    </div>
  );
}
