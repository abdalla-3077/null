import React from 'react';
import { useDownloadStore } from '../stores';

export function DownloadTray(): React.ReactElement {
  const downloads = useDownloadStore((s) => s.downloads);
  const open = useDownloadStore((s) => s.open);
  const setOpen = useDownloadStore((s) => s.setOpen);
  const b = window.nullBrowser;
  React.useEffect(() => {
    if (open) void b.getDownloads().then((d) => useDownloadStore.getState().setDownloads(d)).catch(() => undefined);
  }, [open, b]);
  if (!open) return <></>;
  const active = downloads.filter((d) => d.state === 'progressing').length;
  return (
    <div className="dl-tray" role="dialog" aria-label="Downloads">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4>Downloads{active > 0 ? ` (${active} active)` : ''}</h4>
        <button className="icon-btn" aria-label="Close downloads" onClick={() => setOpen(false)}>×</button>
      </div>
      {downloads.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 12 }}>No downloads yet.</p>}
      {downloads.slice().reverse().map((d) => {
        const pct = d.totalBytes > 0 ? Math.min(100, Math.round((d.receivedBytes / d.totalBytes) * 100)) : 0;
        return (
          <div className="dl-item" key={d.id}>
            <div>{d.filename}</div>
            <div style={{ color: 'var(--muted)', fontSize: 11 }}>
              {d.state === 'progressing' ? `${pct}%` : d.state}
            </div>
            {d.state === 'progressing' && (
              <div className="bar"><i style={{ width: `${pct}%` }} /></div>
            )}
            {d.state === 'completed' && (
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <button className="btn" onClick={() => void b.downloadOpen(d.savePath)}>Open</button>
                <button className="btn" onClick={() => void b.downloadReveal(d.savePath)}>Show in folder</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
