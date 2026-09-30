import React from 'react';
import { useUIStore } from '../stores';
import { SENSITIVE_CATEGORY_LABEL, SENSITIVE_WARNING_COPY } from '../../shared/sensitive-sites';
import { Icon } from './icons';

export function SensitiveWarning(): React.ReactElement | null {
  const warning = useUIStore((s) => s.sensitiveWarning);
  const setUI = useUIStore((s) => s.set);
  const [trust, setTrust] = React.useState(false);
  if (!warning) return null;

  const copy = SENSITIVE_WARNING_COPY[warning.category];
  const label = SENSITIVE_CATEGORY_LABEL[warning.category];

  const dismiss = (): void => {
    setTrust(false);
    setUI({ sensitiveWarning: null });
  };

  return (
    <div className="overlay" role="alertdialog" aria-modal aria-label={`${label} warning`}>
      <div className="dialog" style={{ width: 'min(480px, 92vw)' }}>
        <div className="dialog-head">
          <span style={{ color: copy.token, display: 'inline-flex' }}>
            <Icon name={copy.icon} size={22} />
          </span>
          <h2>{copy.title}</h2>
        </div>
        <p className="wizard-step-label" style={{ color: copy.token, margin: '0 0 8px' }}>
          {copy.kicker}
        </p>
        <p className="muted">
          <strong>{warning.host || warning.url}</strong> is categorized as {label.toLowerCase()}.{' '}
          {copy.body}
        </p>
        <p className="insecure-url">{warning.url}</p>
        <p className="muted">{copy.note}</p>
        <div className="row-line" style={{ minHeight: 0, padding: '10px 0 0', borderBottom: 0 }}>
          <span className="row-label" style={{ fontSize: 12.5 }}>
            Trust {warning.host || 'this site'}
            <span className="row-hint">Skip this warning next time</span>
          </span>
          <input
            type="checkbox"
            className="switch"
            role="switch"
            checked={trust}
            onChange={(e) => setTrust(e.target.checked)}
            aria-label="Trust this site in future"
          />
        </div>
        <div className="btn-row">
          <button className="btn ghost" onClick={dismiss}>Go back</button>
          <button
            className="btn danger-btn"
            onClick={() => {
              const { tabId, url } = warning;
              const trustHost = trust;
              dismiss();
              void window.nullBrowser.sensitiveConfirm(tabId, url, trustHost);
            }}
          >
            <Icon name={copy.icon} size={14} /> Continue anyway
          </button>
        </div>
      </div>
    </div>
  );
}
