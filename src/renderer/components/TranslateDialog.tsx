import React from 'react';
import { useSettingsStore, useTabStore, useUIStore } from '../stores';
import { TRANSLATE_LANGUAGES } from '../../shared/config';
import { Icon } from './icons';

export function TranslateDialog(): React.ReactElement | null {
  const open = useUIStore((s) => s.translateOpen);
  const setUI = useUIStore((s) => s.set);
  const settings = useSettingsStore((s) => s.settings);
  const tabs = useTabStore((s) => s.tabs);
  const activeId = useTabStore((s) => s.activeId);
  const active = tabs.find((t) => t.id === activeId);
  const [lang, setLang] = React.useState(settings.translateLanguage);
  const b = window.nullBrowser;

  React.useEffect(() => {
    if (open) setLang(useSettingsStore.getState().settings.translateLanguage);
  }, [open ]);

  if (!open) return null;

  const close = (): void => setUI({ translateOpen: false });

  let host = active?.url ?? '';
  try {
    host = new URL(active?.url ?? '').host;
  } catch {
    /* show the raw address if it cannot be parsed */
  }

  const submit = (): void => {
    if (!activeId) {
      close();
      return;
    }
    void window.nullSettings.set('translateLanguage', lang);
    void b.translate(activeId, lang);
    close();
  };

  return (
    <div className="overlay" role="alertdialog" aria-modal="true" aria-label="Translate page" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="dialog perm-dialog">
        <div className="dialog-head">
          <span className="perm-icon">
            <Icon name="translate" size={20} />
          </span>
          <h2>Translate page</h2>
          <button className="icon-btn" aria-label="Close translate" onClick={close}>
            <Icon name="close" size={15} />
          </button>
        </div>
        <p className="muted">
          Translate <strong>{host || 'this page'}</strong> with Google Translate. The page reloads
          in the same tab, and you can restore the original any time.
        </p>
        <div className="field">
          <label htmlFor="translate-lang">Target language</label>
          <select id="translate-lang" value={lang} onChange={(e) => setLang(e.target.value)}>
            {TRANSLATE_LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
        <div className="btn-row">
          <button className="btn ghost" onClick={close}>Cancel</button>
          <button className="btn primary" onClick={submit} disabled={!activeId}>
            <Icon name="translate" size={14} /> Translate
          </button>
        </div>
      </div>
    </div>
  );
}
