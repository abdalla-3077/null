import React from 'react';
import { useSettingsStore, useUIStore } from '../stores';
import { DEVICE_PROFILES, SEARCH_ENGINES, isValidHttpUrl } from '../../shared/config';
import type { AIProvider } from '../../shared/types';
import { randomUUID } from '../uuid';

const SECTIONS = [
  'General',
  'Theme',
  'Search',
  'Privacy',
  'Device',
  'AI',
  'Tabs',
  'Downloads',
  'Keyboard',
] as const;

type Section = (typeof SECTIONS)[number];

export function SettingsPage(): React.ReactElement {
  const settings = useSettingsStore((s) => s.settings);
  const setUI = useUIStore((s) => s.set);
  const [section, setSection] = React.useState<Section>('General');
  const [urlError, setUrlError] = React.useState('');
  const set = window.nullSettings.set;

  return (
    <div className="overlay" role="dialog" aria-modal aria-label="Settings">
      <div className="dialog" style={{ width: 'min(860px, 94vw)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Settings</h2>
          <button className="icon-btn" aria-label="Close settings" onClick={() => setUI({ settingsOpen: false })}>×</button>
        </div>
        <div className="settings-page" style={{ height: '60vh' }}>
          <nav className="settings-nav" aria-label="Settings sections">
            {SECTIONS.map((s) => (
              <button key={s} className={section === s ? 'active' : ''} onClick={() => setSection(s)}>{s}</button>
            ))}
          </nav>
          <div className="settings-body">
            {section === 'General' && (
              <section>
                <h2>General</h2>
                <div className="row-line"><span>Tab layout</span>
                  <select value={settings.tabLayout} onChange={(e) => void set('tabLayout', e.target.value as never)} aria-label="Tab layout">
                    <option value="top">Top tabs</option>
                    <option value="side">Side tabs</option>
                    <option value="bottom">Bottom tabs</option>
                  </select>
                </div>
                <div className="row-line"><span>Homepage</span>
                  <input type="text" value={settings.homepage} onChange={(e) => void set('homepage', e.target.value)} aria-label="Homepage" style={{ width: 260 }} />
                </div>
                <div className="row-line"><span>Show AI shortcuts on New Tab page</span>
                  <input type="checkbox" checked={settings.newTabShowAI} onChange={(e) => void set('newTabShowAI', e.target.checked)} aria-label="Show AI on new tab" />
                </div>
              </section>
            )}
            {section === 'Theme' && (
              <section>
                <h2>Theme</h2>
                <div className="row-line"><span>Color theme</span>
                  <select value={settings.theme} onChange={(e) => void set('theme', e.target.value as never)} aria-label="Color theme">
                    <option value="blue">Blue</option>
                    <option value="red">Red</option>
                    <option value="neutral">Neutral</option>
                  </select>
                </div>
                <div className="row-line"><span>Appearance</span>
                  <select value={settings.appearance} onChange={(e) => void set('appearance', e.target.value as never)} aria-label="Appearance">
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                  </select>
                </div>
              </section>
            )}
            {section === 'Search' && (
              <section>
                <h2>Search</h2>
                <div className="row-line"><span>Default search engine</span>
                  <select value={settings.searchEngine} onChange={(e) => void set('searchEngine', e.target.value as never)} aria-label="Search engine">
                    {Object.values(SEARCH_ENGINES).map((e) => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>
              </section>
            )}
            {section === 'Privacy' && (
              <section>
                <h2>Privacy</h2>
                <p>Null uses temporary in-memory sessions. History, cookies, local storage and cache are cleared when the browser closes.</p>
                <div className="row-line"><span>Clear session data now</span>
                  <button className="btn" onClick={() => void window.nullBrowser.clearSession()}>Clear now</button>
                </div>
                <div className="row-line"><span>Emergency destination</span>
                  <select value={settings.emergencyDestination} onChange={(e) => void set('emergencyDestination', e.target.value as never)} aria-label="Emergency destination">
                    <option value="google">Google</option>
                    <option value="blank">Blank page</option>
                    <option value="custom">Custom URL</option>
                  </select>
                </div>
                {settings.emergencyDestination === 'custom' && (
                  <div className="field">
                    <label>Custom emergency URL</label>
                    <input
                      type="text"
                      value={settings.emergencyCustomUrl}
                      placeholder="https://example.com/"
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v.trim() && !isValidHttpUrl(v.trim())) setUrlError('Enter a valid http(s) URL.');
                        else setUrlError('');
                        void set('emergencyCustomUrl', v);
                      }}
                      aria-label="Custom emergency URL"
                    />
                    {urlError && <p style={{ color: 'var(--danger)' }}>{urlError}</p>}
                  </div>
                )}
                <div className="row-line"><span>Confirm before emergency mode</span>
                  <input type="checkbox" checked={settings.emergencyConfirm} onChange={(e) => void set('emergencyConfirm', e.target.checked)} aria-label="Confirm emergency" />
                </div>
              </section>
            )}
            {section === 'Device' && (
              <section>
                <h2>Device profile</h2>
                <p>Sets the User-Agent presented to websites. This is identification only — not full fingerprint resistance.</p>
                <div className="row-line"><span>Profile</span>
                  <select value={settings.deviceProfile} onChange={(e) => void set('deviceProfile', e.target.value as never)} aria-label="Device profile">
                    {Object.values(DEVICE_PROFILES).map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </section>
            )}
            {section === 'AI' && <AiSection />}
            {section === 'Tabs' && (
              <section>
                <h2>Tabs</h2>
                <div className="row-line"><span>Tab position</span>
                  <select value={settings.tabLayout} onChange={(e) => void set('tabLayout', e.target.value as never)} aria-label="Tab position">
                    <option value="top">Top</option>
                    <option value="side">Side</option>
                    <option value="bottom">Bottom</option>
                  </select>
                </div>
                <div className="row-line"><span>Allow reopening closed tabs</span>
                  <input type="checkbox" checked={settings.restoreClosedTabs} onChange={(e) => void set('restoreClosedTabs', e.target.checked)} aria-label="Restore closed tabs" />
                </div>
                <div className="row-line"><span>AI panel width ({settings.aiPanelWidth}px)</span>
                  <input type="range" min={240} max={600} value={settings.aiPanelWidth} onChange={(e) => void set('aiPanelWidth', Number(e.target.value))} aria-label="AI panel width" />
                </div>
              </section>
            )}
            {section === 'Downloads' && (
              <section>
                <h2>Downloads</h2>
                <div className="row-line"><span>Download location</span>
                  <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ color: 'var(--muted)', fontSize: 12 }}>{settings.downloadLocation || 'System default'}</span>
                    <button className="btn" onClick={() => void window.nullBrowser.pickDownloadDir().then((d) => { if (d) void set('downloadLocation', d); })}>Choose</button>
                  </span>
                </div>
                <div className="row-line"><span>Ask where to save each file</span>
                  <input type="checkbox" checked={settings.askWhereToSave} onChange={(e) => void set('askWhereToSave', e.target.checked)} aria-label="Ask where to save" />
                </div>
              </section>
            )}
            {section === 'Keyboard' && (
              <section>
                <h2>Keyboard shortcuts</h2>
                {[
                  ['Ctrl/⌘ + T', 'New tab'],
                  ['Ctrl/⌘ + W', 'Close tab'],
                  ['Ctrl/⌘ + Shift + T', 'Reopen closed tab'],
                  ['Ctrl/⌘ + L', 'Focus address bar'],
                  ['Ctrl/⌘ + R', 'Reload'],
                  ['Ctrl/⌘ + Shift + R', 'Hard reload'],
                  ['Ctrl/⌘ + Tab', 'Next tab'],
                  ['Ctrl/⌘ + Shift + Tab', 'Previous tab'],
                  ['Ctrl/⌘ + F', 'Find in page'],
                  ['Ctrl/⌘ + Shift + Del', 'Clear session data'],
                  ['Esc', 'Stop / close overlays'],
                ].map(([k, d]) => (
                  <div className="row-line" key={k}><span>{d}</span><span style={{ color: 'var(--muted)' }}>{k}</span></div>
                ))}
                <div className="row-line"><span>Developer mode (enables Inspect element)</span>
                  <input type="checkbox" checked={settings.devMode} onChange={(e) => void set('devMode', e.target.checked)} aria-label="Developer mode" />
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AiSection(): React.ReactElement {
  const settings = useSettingsStore((s) => s.settings);
  const set = window.nullSettings.set;
  const [name, setName] = React.useState('');
  const [url, setUrl] = React.useState('');
  const [err, setErr] = React.useState('');

  const move = (id: string, dir: -1 | 1): void => {
    const list = [...settings.aiProviders];
    const i = list.findIndex((p) => p.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    void set('aiProviders', list);
  };

  const add = (): void => {
    if (!name.trim() || !isValidHttpUrl(url.trim())) {
      setErr('Enter a name and a valid https URL.');
      return;
    }
    const p: AIProvider = { id: `custom-${randomUUID().slice(0, 8)}`, name: name.trim(), url: url.trim(), builtin: false };
    void set('aiProviders', [...settings.aiProviders, p]);
    setName('');
    setUrl('');
    setErr('');
  };

  return (
    <section>
      <h2>AI providers</h2>
      {settings.aiProviders.map((p) => (
        <div className="row-line" key={p.id}>
          <span>{p.name} <span style={{ color: 'var(--muted)', fontSize: 11 }}>{p.url}</span></span>
          <span style={{ display: 'flex', gap: 4 }}>
            <button className="btn" onClick={() => move(p.id, -1)} aria-label={`Move ${p.name} up`}>↑</button>
            <button className="btn" onClick={() => move(p.id, 1)} aria-label={`Move ${p.name} down`}>↓</button>
            {!p.builtin && (
              <button className="btn" onClick={() => void set('aiProviders', settings.aiProviders.filter((x) => x.id !== p.id))} aria-label={`Remove ${p.name}`}>Remove</button>
            )}
          </span>
        </div>
      ))}
      <div className="field">
        <label>Add provider</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Provider name" />
          <input type="text" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} aria-label="Provider URL" />
          <button className="btn primary" onClick={add}>Add</button>
        </div>
        {err && <p style={{ color: 'var(--danger)' }}>{err}</p>}
      </div>
    </section>
  );
}
