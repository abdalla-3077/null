import React from 'react';
import { useDownloadStore } from '../stores';
import { Icon } from './icons';
import type { DownloadItem } from '../../shared/types';

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = value >= 10 || unit === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[unit]}`;
}

function itemStatus(d: DownloadItem): string {
  if (d.state === 'progressing' || d.state === 'paused') {
    const pct = d.totalBytes > 0 ? Math.min(100, Math.round((d.receivedBytes / d.totalBytes) * 100)) : 0;
    const size = formatBytes(d.receivedBytes);
    const of = d.totalBytes > 0 ? `${pct}% · ${size} of ${formatBytes(d.totalBytes)}` : size;
    return d.state === 'paused' ? `Paused${of ? ` · ${of}` : ''}` : of ? `${of} · downloading` : 'Downloading';
  }
  if (d.state === 'completed') {
    const size = formatBytes(d.totalBytes || d.receivedBytes);
    return size ? `Done · ${size}` : 'Done';
  }
  if (d.state === 'interrupted') return 'Interrupted';
  return 'Cancelled';
}

export function DownloadTray(): React.ReactElement | null {
  const downloads = useDownloadStore((s) => s.downloads);
  const open = useDownloadStore((s) => s.open);
  const setOpen = useDownloadStore((s) => s.setOpen);
  const b = window.nullBrowser;

  React.useEffect(() => {
    if (open) void b.getDownloads().then((d) => useDownloadStore.getState().setDownloads(d)).catch(() => undefined);
  }, [open, b]);

  if (!open) return null;

  const active = downloads.filter((d) => d.state === 'progressing' || d.state === 'paused').length;
  const finished = downloads.filter((d) => d.state !== 'progressing' && d.state !== 'paused').length;
  const items = downloads.slice().reverse();

  return (
    <div
      className="overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Downloads"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="dialog dl-dialog">
        <div className="dialog-head">
          <span className="dl-head-icon">
            <Icon name="download" size={18} />
          </span>
          <h2>Downloads</h2>
          {active > 0 && (
            <span className="dl-pill">
              {active} active
            </span>
          )}
          {finished > 0 && (
            <button className="dl-clear" title="Remove finished downloads" onClick={() => void b.downloadClearFinished()}>
              <Icon name="trash" size={13} /> Clear
            </button>
          )}
          <button className="icon-btn" aria-label="Close downloads" onClick={() => setOpen(false)}>
            <Icon name="close" size={15} />
          </button>
        </div>

        {downloads.length === 0 ? (
          <div className="dl-empty">
            <span className="dl-empty-icon">
              <Icon name="download" size={22} />
            </span>
            <span>No downloads yet</span>
            <span className="dl-empty-hint">Files you download will show up here.</span>
          </div>
        ) : (
          <div className="dl-list">
            {items.map((d) => {
              const pct = d.totalBytes > 0 ? Math.min(100, Math.round((d.receivedBytes / d.totalBytes) * 100)) : 0;
              const inFlight = d.state === 'progressing' || d.state === 'paused';
              const stateIcon = d.state === 'completed'
                ? 'check'
                : d.state === 'paused'
                  ? 'pause'
                  : d.state === 'progressing'
                    ? 'download'
                    : 'alert';
              return (
                <div className={`dl-row ${d.state}`} key={d.id}>
                  <span className={`dl-state ${d.state}`}>
                    <Icon name={stateIcon} size={15} />
                  </span>
                  <div className="dl-info">
                    <div className="dl-name" title={d.filename}>{d.filename}</div>
                    <div className="dl-meta">{itemStatus(d)}</div>
                    {inFlight && (
                      <div className="dl-bar"><i style={{ width: `${pct}%` }} /></div>
                    )}
                  </div>
                  <div className="dl-actions">
                    {d.state === 'progressing' && (
                      <button className="icon-btn" title="Pause" aria-label={`Pause ${d.filename}`} onClick={() => void b.downloadPause(d.id)}>
                        <Icon name="pause" size={14} />
                      </button>
                    )}
                    {d.state === 'paused' && (
                      <button className="icon-btn" title="Resume" aria-label={`Resume ${d.filename}`} onClick={() => void b.downloadResume(d.id)}>
                        <Icon name="play" size={14} />
                      </button>
                    )}
                    {inFlight && (
                      <button className="icon-btn" title="Cancel" aria-label={`Cancel ${d.filename}`} onClick={() => void b.downloadCancel(d.id)}>
                        <Icon name="close" size={14} />
                      </button>
                    )}
                    {d.state === 'completed' && (
                      <>
                        <button className="icon-btn" title="Open" aria-label={`Open ${d.filename}`} onClick={() => void b.downloadOpen(d.savePath)}>
                          <Icon name="external" size={15} />
                        </button>
                        <button className="icon-btn" title="Show in folder" aria-label={`Show ${d.filename} in folder`} onClick={() => void b.downloadReveal(d.savePath)}>
                          <Icon name="folder" size={15} />
                        </button>
                      </>
                    )}
                    {!inFlight && (
                      <button className="icon-btn" title="Remove from list" aria-label={`Remove ${d.filename} from list`} onClick={() => void b.downloadRemove(d.id)}>
                        <Icon name="trash" size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
