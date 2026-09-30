import React from 'react';
import { useSettingsStore, useUIStore } from '../stores';
import { DEVICE_PROFILES, SEARCH_ENGINES, isValidHttpUrl } from '../../shared/config';
import type { AIProvider } from '../../shared/types';
import { randomUUID } from '../uuid';
import { Icon, type IconName } from './icons';
import { BrandMark } from './BrandMark';

const WALLPAPERS = [
  { id: 'none', name: 'None', scene: 'none' },
  { id: 'coastal-dusk', name: 'Coastal dusk', scene: 'coastal' },
  { id: 'alpine-fog', name: 'Alpine fog', scene: 'alpine' },
  { id: 'desert-night', name: 'Desert night', scene: 'desert' },
  { id: 'forest-canopy', name: 'Forest canopy', scene: 'forest' },
  { id: 'arctic-glow', name: 'Arctic glow', scene: 'arctic' },
  { id: 'city-rain', name: 'City rain', scene: 'city' },
] as const;

const SECTIONS: { id: string; icon: IconName; description: string }[] = [
  { id: 'General', icon: 'home', description: 'Choose how Null opens and feels.' },
  { id: 'Theme', icon: 'globe', description: 'Set the browser colors and new-tab scene.' },
  { id: 'Search', icon: 'search', description: 'Choose where your searches go.' },
  { id: 'Privacy', icon: 'lock', description: 'Manage your temporary session and emergency options.' },
  { id: 'Device', icon: 'external', description: 'Choose the device identity websites see.' },
  { id: 'AI', icon: 'plus', description: 'Manage AI services and shortcuts.' },
  { id: 'Tabs', icon: 'globe', description: 'Set tab placement and behavior.' },
  { id: 'Downloads', icon: 'download', description: 'Choose where files are saved.' },
  { id: 'Keyboard', icon: 'settings', description: 'Browse shortcuts and developer options.' },
] as const;

type Section = (typeof SECTIONS)[number]['id'];

export function SettingsPage(): React.ReactElement {
  const settings = useSettingsStore((s) => s.settings);
  const setUI = useUIStore((s) => s.set);
  const [section, setSection] = React.useState<Section>('General');
  const [urlError, setUrlError] = React.useState('');
  const [clearConfirm, setClearConfirm] = React.useState(false);
  const set = window.nullSettings.set;

  return (
    <>
    <div className="overlay settings-overlay">
      <div className="dialog settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title" aria-describedby="settings-description">
        <div className="dialog-head settings-header">
          <BrandMark size={28} />
          <div className="settings-title-wrap">
            <h2 id="settings-title">Settings</h2>
            <p id="settings-description">Tune Null to work the way you do.</p>
          </div>
          <button className="icon-btn" aria-label="Close settings" onClick={() => setUI({ settingsOpen: false })}>
            <Icon name="close" />
          </button>
        </div>
        <div className="settings-page">
          <nav className="settings-nav" aria-label="Settings sections" onKeyDown={(event) => {
            const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
            if (direction === 0 && event.key !== 'Home' && event.key !== 'End') return;
            event.preventDefault();
            const current = SECTIONS.findIndex((item) => item.id === section);
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? SECTIONS.length - 1 : (current + direction + SECTIONS.length) % SECTIONS.length;
            const target = SECTIONS[next];
            setSection(target.id);
            event.currentTarget.querySelectorAll<HTMLButtonElement>('.settings-nav button')[next]?.focus();
          }}>
            {SECTIONS.map((s) => (
              <button key={s.id} className={section === s.id ? 'active' : ''} tabIndex={section === s.id ? 0 : -1} aria-current={section === s.id ? 'page' : undefined} aria-label={`${s.id}: ${s.description}`} onClick={() => setSection(s.id as Section)}>
                <Icon name={s.icon} size={15} />
                <span className="settings-nav-copy"><span>{s.id}</span><small>{s.description}</small></span>
              </button>
            ))}
          </nav>
          <div className="settings-body" key={section}>
            {section === 'General' && (
              <section>
                <h2>General</h2>
                <p className="settings-desc">Set your home destination and new-tab shortcuts.</p>
                <div className="row-line">
                  <label className="row-label" htmlFor="homepage">Homepage<span className="row-hint">Opened by the Home button</span></label>
                  <input id="homepage" type="text" value={settings.homepage} onChange={(e) => void set('homepage', e.target.value)} aria-label="Homepage" />
                </div>
                <div className="row-line">
                  <span className="row-label">AI shortcuts on New Tab<span className="row-hint">Quick pills for your providers</span></span>
                  <input type="checkbox" className="switch" role="switch" checked={settings.newTabShowAI} onChange={(e) => void set('newTabShowAI', e.target.checked)} aria-label="Show AI on new tab" />
                </div>
              </section>
            )}
            {section === 'Theme' && (
              <section>
                <h2>Theme</h2>
                <p className="settings-desc">Applies instantly to the shell and every new-tab page.</p>
                <div className="row-line">
                  <span className="row-label">Color theme<span className="row-hint">Identity and accent color</span></span>
                  <select value={settings.theme} onChange={(e) => void set('theme', e.target.value as never)} aria-label="Color theme">
                    <option value="neutral">Graphite</option>
                    <option value="blue">Cobalt</option>
                    <option value="red">Ember</option>
                  </select>
                </div>
                <div className="row-line">
                  <span className="row-label">Appearance<span className="row-hint">Follows the app chrome</span></span>
                  <select value={settings.appearance} onChange={(e) => void set('appearance', e.target.value as never)} aria-label="Appearance">
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                  </select>
                </div>
                <div className="wallpaper-setting">
                  <div className="wallpaper-heading">
                    <span className="row-label">New-tab wallpaper<span className="row-hint">Choose a scene or use your theme background</span></span>
                    <span className="wallpaper-current">{WALLPAPERS.find((wallpaper) => wallpaper.id === settings.newTabWallpaper)?.name ?? 'None'}</span>
                  </div>
                  <div className="wallpaper-grid" role="radiogroup" aria-label="New-tab wallpaper">
                    {WALLPAPERS.map((wallpaper) => (
                      <button
                        key={wallpaper.id}
                        type="button"
                        className={`wallpaper-choice${settings.newTabWallpaper === wallpaper.id ? ' selected' : ''}`}
                        role="radio"
                        aria-checked={settings.newTabWallpaper === wallpaper.id}
                        tabIndex={settings.newTabWallpaper === wallpaper.id ? 0 : -1}
                        aria-label={wallpaper.name}
                        onKeyDown={(event) => {
                          const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
                          if (direction === 0 && event.key !== 'Home' && event.key !== 'End') return;
                          event.preventDefault();
                          const current = WALLPAPERS.findIndex((item) => item.id === settings.newTabWallpaper);
                          const next = event.key === 'Home' ? 0 : event.key === 'End' ? WALLPAPERS.length - 1 : (current + direction + WALLPAPERS.length) % WALLPAPERS.length;
                          const choice = WALLPAPERS[next];
                          void set('newTabWallpaper', choice.id);
                          event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('.wallpaper-choice')[next]?.focus();
                        }}
                        onClick={() => void set('newTabWallpaper', wallpaper.id)}
                      >
                        <span className={`wallpaper-preview scene-${wallpaper.scene}`} aria-hidden="true" />
                        <span className="wallpaper-name">{wallpaper.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            )}
            {section === 'Search' && (
              <section>
                <h2>Search</h2>
                <p className="settings-desc">Used by the address bar and the new-tab search box.</p>
                <div className="row-line">
                  <span className="row-label">Default search engine</span>
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
                <p className="settings-desc">Each tab uses a temporary session. Its history, cookies, storage, and cache are cleared when Null closes.</p>
                <div className="row-line">
                  <span className="row-label">Clear session data now<span className="row-hint">Cookies, storage and cache for all tabs. This cannot be undone.</span></span>
                  <button className="btn danger" onClick={() => setClearConfirm(true)}>Clear session data</button>
                </div>
                <div className="row-line">
                  <span className="row-label">Warn before opening HTTP pages<span className="row-hint">Ask before loading a page that is not secured with HTTPS</span></span>
                  <input type="checkbox" className="switch" role="switch" checked={settings.warnOnInsecureHttp} onChange={(e) => void set('warnOnInsecureHttp', e.target.checked)} aria-label="Warn before opening HTTP pages" />
                </div>
                <div className="row-line">
                  <span className="row-label">Warn before sensitive sites<span className="row-hint">Show a category-specific warning for porn, gambling and alcohol sites</span></span>
                  <input type="checkbox" className="switch" role="switch" checked={settings.warnSensitiveSites} onChange={(e) => void set('warnSensitiveSites', e.target.checked)} aria-label="Warn before sensitive sites" />
                </div>
                {settings.warnSensitiveSites && (
                  <>
                    <div className="row-line">
                      <span className="row-label">Pornography warnings<span className="row-hint">Adult and explicit sexual content</span></span>
                      <input type="checkbox" className="switch" role="switch" checked={settings.warnPorn} onChange={(e) => void set('warnPorn', e.target.checked)} aria-label="Pornography warnings" />
                    </div>
                    <div className="row-line">
                      <span className="row-label">Gambling warnings<span className="row-hint">Real-money betting, casinos and poker</span></span>
                      <input type="checkbox" className="switch" role="switch" checked={settings.warnGambling} onChange={(e) => void set('warnGambling', e.target.checked)} aria-label="Gambling warnings" />
                    </div>
                    <div className="row-line">
                      <span className="row-label">Alcohol warnings<span className="row-hint">Sites selling or promoting alcohol</span></span>
                      <input type="checkbox" className="switch" role="switch" checked={settings.warnAlcohol} onChange={(e) => void set('warnAlcohol', e.target.checked)} aria-label="Alcohol warnings" />
                    </div>
                    <div className="field">
                      <span className="row-label">Trusted sensitive sites<span className="row-hint">These hosts open without a warning</span></span>
                      {settings.trustedSensitiveHosts.length === 0 ? (
                        <p className="settings-desc">No trusted sites yet.</p>
                      ) : (
                        <div>
                          {settings.trustedSensitiveHosts.map((host) => (
                            <div key={host} className="row-line">
                              <span>{host}</span>
                              <button
                                className="btn ghost"
                                onClick={() => void set('trustedSensitiveHosts', settings.trustedSensitiveHosts.filter((h) => h !== host))}
                                aria-label={`Remove ${host} from trusted sites`}
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {settings.trustedSensitiveHosts.length > 0 && (
                        <button className="btn danger" onClick={() => void set('trustedSensitiveHosts', [])}>Clear all trusted sites</button>
                      )}
                    </div>
                  </>
                )}
                <div className="row-line">
                  <span className="row-label">Emergency destination<span className="row-hint">Where emergency mode lands</span></span>
                  <select value={settings.emergencyDestination} onChange={(e) => void set('emergencyDestination', e.target.value as never)} aria-label="Emergency destination">
                    <option value="google">Google</option>
                    <option value="blank">Blank page</option>
                    <option value="custom">Custom URL</option>
                  </select>
                </div>
                {settings.emergencyDestination === 'custom' && (
                  <div className="field">
                    <label htmlFor="custom-emergency-url">Custom emergency URL</label>
                    <input
                      id="custom-emergency-url"
                      type="url"
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
                    {urlError && <p className="error">{urlError}</p>}
                  </div>
                )}
                <div className="row-line">
                  <span className="row-label">Confirm before emergency mode</span>
                  <input type="checkbox" className="switch" role="switch" checked={settings.emergencyConfirm} onChange={(e) => void set('emergencyConfirm', e.target.checked)} aria-label="Confirm emergency" />
                </div>
              </section>
            )}
            {section === 'Device' && (
              <section>
                <h2>Device profile</h2>
                <p className="settings-desc">Sets the User-Agent presented to websites. This is identification only — not full fingerprint resistance.</p>
                <div className="row-line">
                  <span className="row-label">Profile<span className="row-hint">Takes effect on all tabs</span></span>
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
                <p className="settings-desc">Position, restore behavior, and the AI side panel.</p>
                <div className="row-line">
                  <span className="row-label">Tab position</span>
                  <select value={settings.tabLayout} onChange={(e) => void set('tabLayout', e.target.value as never)} aria-label="Tab position">
                    <option value="top">Top</option>
                    <option value="side">Side</option>
                    <option value="bottom">Bottom</option>
                  </select>
                </div>
                <div className="row-line">
                  <span className="row-label">Allow reopening closed tabs<span className="row-hint">Keep a 25-tab restore stack</span></span>
                  <input type="checkbox" className="switch" role="switch" checked={settings.restoreClosedTabs} onChange={(e) => void set('restoreClosedTabs', e.target.checked)} aria-label="Restore closed tabs" />
                </div>
                <div className="row-line">
                  <span className="row-label">AI panel width<span className="row-hint">{settings.aiPanelWidth}px</span></span>
                  <input type="range" className="slider" min={240} max={600} value={settings.aiPanelWidth} onChange={(e) => void set('aiPanelWidth', Number(e.target.value))} aria-label="AI panel width" />
                </div>
              </section>
            )}
            {section === 'Downloads' && (
              <section>
                <h2>Downloads</h2>
                <p className="settings-desc">Files land here unless you choose a location each time.</p>
                <div className="row-line">
                  <span className="row-label">Download location<span className="row-hint">{settings.downloadLocation || 'System default'}</span></span>
                  <button className="btn" onClick={() => void window.nullBrowser.pickDownloadDir().then((d) => { if (d) void set('downloadLocation', d); })}>
                    <Icon name="folder" size={14} /> Choose
                  </button>
                </div>
                <div className="row-line">
                  <span className="row-label">Ask where to save each file</span>
                  <input type="checkbox" className="switch" role="switch" checked={settings.askWhereToSave} onChange={(e) => void set('askWhereToSave', e.target.checked)} aria-label="Ask where to save" />
                </div>
              </section>
            )}
            {section === 'Keyboard' && (
              <section>
                <h2>Keyboard shortcuts</h2>
                <p className="settings-desc">Everything in Null is reachable from the keyboard.</p>
                {[
                  ['New tab', 'Ctrl/⌘ + T'],
                  ['Close tab', 'Ctrl/⌘ + W'],
                  ['Reopen closed tab', 'Ctrl/⌘ + Shift + T'],
                  ['Focus address bar', 'Ctrl/⌘ + L'],
                  ['Reload', 'Ctrl/⌘ + R'],
                  ['Hard reload', 'Ctrl/⌘ + Shift + R'],
                  ['Next / previous tab', 'Ctrl/⌘ + Tab'],
                  ['Find in page', 'Ctrl/⌘ + F'],
                  ['Clear session data', 'Ctrl/⌘ + Shift + Del'],
                  ['Stop / dismiss', 'Esc'],
                ].map(([d, k]) => (
                  <div className="row-line" key={k}>
                    <span>{d}</span>
                    <kbd className="kbd">{k}</kbd>
                  </div>
                ))}
                <div className="row-line">
                  <span className="row-label">Developer mode<span className="row-hint">Enables Inspect element</span></span>
                  <input type="checkbox" className="switch" role="switch" checked={settings.devMode} onChange={(e) => void set('devMode', e.target.checked)} aria-label="Developer mode" />
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
    {clearConfirm && (
      <div className="overlay" role="alertdialog" aria-modal aria-label="Confirm clearing session data">
        <div className="dialog" style={{ width: 'min(440px, 92vw)' }}>
          <div className="dialog-head">
            <span style={{ color: 'var(--danger)', display: 'inline-flex' }}>
              <Icon name="alert" size={20} />
            </span>
            <h2>Clear session data</h2>
          </div>
          <p className="muted">
            This clears cookies, local storage, cache and navigation history for every open tab.
            It cannot be undone.
          </p>
          <div className="btn-row">
            <button className="btn ghost" onClick={() => setClearConfirm(false)}>Cancel</button>
            <button
              className="btn danger-btn"
              onClick={() => {
                setClearConfirm(false);
                void window.nullBrowser.clearSession();
              }}
            >
              Clear session data
            </button>
          </div>
        </div>
      </div>
    )}
    </>
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
      <p className="settings-desc">Buttons in the toolbar open these in the side panel. They also appear as pills on the new-tab page.</p>
      {settings.aiProviders.map((p) => (
        <div className="row-line" key={p.id}>
          <span className="row-label">{p.name}<span className="row-hint">{p.url}</span></span>
          <span style={{ display: 'flex', gap: 4 }}>
            <button className="icon-btn" onClick={() => move(p.id, -1)} disabled={settings.aiProviders[0]?.id === p.id} aria-label={`Move ${p.name} up`}>
              <Icon name="chevronUp" size={14} />
            </button>
            <button className="icon-btn" onClick={() => move(p.id, 1)} disabled={settings.aiProviders[settings.aiProviders.length - 1]?.id === p.id} aria-label={`Move ${p.name} down`}>
              <Icon name="chevronDown" size={14} />
            </button>
            {!p.builtin && (
              <button className="btn" onClick={() => void set('aiProviders', settings.aiProviders.filter((x) => x.id !== p.id))} aria-label={`Remove ${p.name}`}>Remove</button>
            )}
          </span>
        </div>
      ))}
      <div className="field provider-form">
        <h3>Add a provider</h3>
        <div className="provider-fields">
          <label className="sr-only" htmlFor="provider-name">Provider name</label>
          <input id="provider-name" type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <label className="sr-only" htmlFor="provider-url">Provider URL</label>
          <input id="provider-url" type="url" placeholder="https://service.example" value={url} onChange={(e) => setUrl(e.target.value)} />
          <button className="btn primary" onClick={add}>Add provider</button>
        </div>
        {err && <p className="error" role="alert">{err}</p>}
      </div>
    </section>
  );
}
