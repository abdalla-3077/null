import React from 'react';
import { useUIStore } from '../stores';

export function EmergencyConfirm(): React.ReactElement {
  const setUI = useUIStore((s) => s.set);
  return (
    <div className="overlay" role="alertdialog" aria-modal aria-label="Confirm emergency mode">
      <div className="dialog">
        <h2>Emergency mode</h2>
        <p>
          This will immediately close all tabs, destroy page contents, clear cookies, storage,
          cache, navigation history and temporary permissions for this session, close AI panels,
          and open your emergency destination.
        </p>
        <div className="btn-row">
          <button className="btn" onClick={() => setUI({ emergencyConfirmOpen: false })}>Cancel</button>
          <button
            className="btn danger-btn"
            onClick={() => {
              setUI({ emergencyConfirmOpen: false });
              void window.nullBrowser.emergency();
            }}
          >
            Clear everything
          </button>
        </div>
      </div>
    </div>
  );
}
