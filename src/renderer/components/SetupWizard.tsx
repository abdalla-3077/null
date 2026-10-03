import React from 'react';
import { useSettingsStore } from '../stores';
import type { SearchEngineId, TabLayout, ThemeName, AppearanceMode } from '../../shared/types';
import { SEARCH_ENGINES, SEARCH_ENGINE_ORDER, PRIVACY_LABEL } from '../../shared/config';
import { BrandMark } from './BrandMark';
import { Icon, type IconName } from './icons';

const STEPS = ['Layout', 'Theme', 'Search', 'Done'] as const;

const LAYOUTS: { id: TabLayout; label: string; hint: string; icon: IconName }[] = [
  { id: 'top', label: 'Top tabs', hint: 'Classic', icon: 'chevronDown' },
  { id: 'side', label: 'Side tabs', hint: 'Roomy', icon: 'chevronUp' },
  { id: 'bottom', label: 'Bottom tabs', hint: 'Thumb-friendly', icon: 'chevronUp' },
];

const THEME_LABEL: Record<ThemeName, string> = { neutral: 'Graphite', blue: 'Cobalt', red: 'Ember' };
const THEME_SWATCH: Record<ThemeName, string> = {
  neutral: '#6d6d78',
  blue: '#4f7cff',
  red: '#e5484d',
};

const ENGINES: { id: SearchEngineId; label: string; hint: string }[] = SEARCH_ENGINE_ORDER.map((id) => ({
  id,
  label: SEARCH_ENGINES[id].name,
  hint: PRIVACY_LABEL[SEARCH_ENGINES[id].privacy],
}));

export function SetupWizard(): React.ReactElement {
  const settings = useSettingsStore((s) => s.settings);
  const [step, setStep] = React.useState(0);
  const [layout, setLayout] = React.useState<TabLayout>(settings.tabLayout);
  const [theme, setTheme] = React.useState<ThemeName>(settings.theme);
  const [mode, setMode] = React.useState<AppearanceMode>(settings.appearance);
  const [engine, setEngine] = React.useState<SearchEngineId>(settings.searchEngine);

  React.useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.mode = mode;
  }, [theme, mode]);

  const save = async (): Promise<void> => {
    await window.nullSettings.set('tabLayout', layout);
    await window.nullSettings.set('theme', theme);
    await window.nullSettings.set('appearance', mode);
    await window.nullSettings.set('searchEngine', engine);
    await window.nullSettings.set('setupDone', true);
  };

  return (
    <div className="overlay" role="dialog" aria-modal aria-label="Welcome to Null">
      <div className="dialog" style={{ width: 'min(480px, 94vw)' }}>
        <div className="wizard-hero">
          <BrandMark size={44} />
          <div>
            <h2>Welcome to Null</h2>
            <p>A private browser that forgets everything when it closes.</p>
          </div>
        </div>
        <div className="wizard-steps" aria-hidden>
          {STEPS.map((s, i) => (
            <span key={s} className={`seg${i <= step ? ' done' : ''}`} />
          ))}
        </div>
        <p className="wizard-step-label">
          STEP {step + 1} OF {STEPS.length} — {STEPS[step].toUpperCase()}
        </p>

        {step === 0 && (
          <div className="wizard-pane" key="layout">
            <div className="opt-grid">
              {LAYOUTS.map((l) => (
                <button
                  key={l.id}
                  className={`opt${layout === l.id ? ' selected' : ''}`}
                  onClick={() => setLayout(l.id)}
                  aria-pressed={layout === l.id}
                >
                  <Icon name={l.icon} size={20} />
                  {l.label}
                  <small>{l.hint}</small>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="wizard-pane" key="theme">
            <div className="swatch-row" role="radiogroup" aria-label="Color theme">
              {(Object.keys(THEME_SWATCH) as ThemeName[]).map((t) => (
                <button
                  key={t}
                  className={`swatch${theme === t ? ' selected' : ''}`}
                  style={{ background: THEME_SWATCH[t] }}
                  title={THEME_LABEL[t]}
                  aria-label={`${THEME_LABEL[t]} theme`}
                  aria-pressed={theme === t}
                  onClick={() => setTheme(t)}
                />
              ))}
            </div>
            <div className="opt-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              {(['dark', 'light'] as AppearanceMode[]).map((m) => (
                <button
                  key={m}
                  className={`opt${mode === m ? ' selected' : ''}`}
                  onClick={() => setMode(m)}
                  aria-pressed={mode === m}
                >
                  {m === 'dark' ? '🌙 Dark' : '☀️ Light'}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="wizard-pane" key="search">
            <div className="opt-grid">
              {ENGINES.map((e) => (
                <button
                  key={e.id}
                  className={`opt${engine === e.id ? ' selected' : ''}`}
                  onClick={() => setEngine(e.id)}
                  aria-pressed={engine === e.id}
                >
                  <Icon name="search" size={20} />
                  {e.label}
                  <small>{e.hint}</small>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="wizard-pane" key="done">
            <p className="muted" style={{ margin: '12px 0' }}>
              You're set: <strong>{LAYOUTS.find((l) => l.id === layout)?.label}</strong> ·{' '}
              <strong>
                {THEME_LABEL[theme]} / {mode}
              </strong>{' '}
              · <strong>{ENGINES.find((e) => e.id === engine)?.label}</strong>
            </p>
            <p className="muted">
              History, cookies and storage are cleared when Null closes. You can change everything
              later in Settings.
            </p>
          </div>
        )}

        <div className="btn-row">
          <span className="spacer" />
          {step > 0 && (
            <button className="btn ghost" onClick={() => setStep(step - 1)}>
              Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button className="btn primary" onClick={() => setStep(step + 1)}>
              Continue
            </button>
          ) : (
            <button className="btn primary" onClick={() => void save()}>
              Start browsing
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
