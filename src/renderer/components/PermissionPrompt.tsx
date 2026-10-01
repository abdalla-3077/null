import React from 'react';
import { useUIStore } from '../stores';
import { Icon, type IconName } from './icons';
import type { PermissionKind } from '../../shared/types';

const KIND_ICON: Record<PermissionKind, IconName> = {
  media: 'camera',
  geolocation: 'mapPin',
  notifications: 'bell',
  'clipboard-read': 'copy',
  midi: 'sliders',
  'display-capture': 'screen',
};

export function PermissionPrompt(): React.ReactElement | null {
  const request = useUIStore((s) => s.permission);
  const set = useUIStore((s) => s.set);
  if (!request) return null;

  const answer = (allow: boolean): void => {
    void window.nullBrowser.respondPermission(request.id, allow);
    set({ permission: null });
  };

  return (
    <div className="overlay" role="alertdialog" aria-modal="true" aria-label={`${request.label} permission`}>
      <div className="dialog perm-dialog">
        <div className="dialog-head">
          <span className="perm-icon">
            <Icon name={KIND_ICON[request.kind] ?? 'lock'} size={20} />
          </span>
          <h2>{request.label}</h2>
        </div>
        <p className="muted">{request.detail}</p>
        <p className="perm-host" title={request.origin}>
          {request.host || request.origin}
        </p>
        <div className="btn-row">
          <button className="btn ghost" onClick={() => answer(false)}>Block</button>
          <button className="btn primary" onClick={() => answer(true)}>Allow</button>
        </div>
      </div>
    </div>
  );
}
