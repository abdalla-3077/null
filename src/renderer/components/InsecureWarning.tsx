import React from 'react';
import { useUIStore } from '../stores';
import { Icon } from './icons';

export function InsecureWarning(): React.ReactElement | null {
  const warning = useUIStore((s) => s.insecureWarning);
  const setUI = useUIStore((s) => s.set);
  if (!warning) return null;

  let host = warning.url;
  try {
    host = new URL(warning.url).host;
  } catch {
    /* show the raw address if it cannot be parsed */
  }

  const dismiss = (): void => setUI({ insecureWarning: null });

  return (
    <div className="overlay" role="alertdialog" aria-modal aria-label="Insecure connection warning">
      <div className="dialog" style={{ width: 'min(480px, 92vw)' }}>
        <div className="dialog-head">
          <span style={{ color: 'var(--danger)', display: 'inline-flex' }}>
            <Icon name="unlock" size={22} />
          </span>
          <h2>Not a secure connection</h2>
        </div>
        <p className="muted">
          <strong>{host}</strong> uses plain HTTP. Anything you send or receive — passwords,
          messages, page contents — can be read or changed by anyone on the network.
        </p>
        <p className="insecure-url">{warning.url}</p>
        <div className="btn-row">
          <button className="btn ghost" onClick={dismiss}>Cancel</button>
          <button
            className="btn danger-btn"
            onClick={() => {
              dismiss();
              void window.nullBrowser.navigateConfirmed(warning.tabId, warning.url);
            }}
          >
            <Icon name="unlock" size={14} /> Continue anyway
          </button>
        </div>
      </div>
    </div>
  );
}
