import React from 'react';
import { useUIStore } from '../stores';
import { Icon } from './icons';

export function EmergencyConfirm(): React.ReactElement {
  const setUI = useUIStore((s) => s.set);
  return (
    <div className="overlay" role="alertdialog" aria-modal aria-label="Confirm emergency mode">
      <div className="dialog" style={{ width: 'min(460px, 92vw)' }}>
        <div className="dialog-head">
          <span style={{ color: 'var(--danger)', display: 'inline-flex' }}>
            <Icon name="alert" size={22} />
          </span>
          <h2>Emergency mode</h2>
        </div>
        <p className="muted">
          This will immediately close all tabs, destroy page contents, clear cookies, storage,
          cache, navigation history and temporary permissions for this session, close AI panels,
          and open your emergency destination.
        </p>
        <div className="btn-row">
          <button className="btn ghost" onClick={() => setUI({ emergencyConfirmOpen: false })}>Cancel</button>
          <button
            className="btn danger-btn"
            onClick={() => {
              setUI({ emergencyConfirmOpen: false });
              void window.nullBrowser.emergency();
            }}
          >
            <Icon name="check" size={14} /> Clear everything
          </button>
        </div>
      </div>
    </div>
  );
}
