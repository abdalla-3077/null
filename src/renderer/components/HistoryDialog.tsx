import React from 'react';
import { useSessionStore, useTabStore, useUIStore } from '../stores';
import { Icon } from './icons';
import type { HistoryEntry } from '../../shared/types';

function timeLabel(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return time;
  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${time}`;
}

function HistoryFavicon({ entry }: { entry: HistoryEntry }): React.ReactElement {
  const [broken, setBroken] = React.useState(false);
  if (entry.favicon && !broken) {
    return <img src={entry.favicon} alt="" draggable={false} onError={() => setBroken(true)} />;
  }
  return <Icon name="globe" size={13} />;
}

export function HistoryDialog(): React.ReactElement | null {
  const open = useUIStore((s) => s.historyOpen);
  const set = useUIStore((s) => s.set);
  const history = useSessionStore((s) => s.history);
  const activeId = useTabStore((s) => s.activeId);
  const [query, setQuery] = React.useState('');
  const [confirmClear, setConfirmClear] = React.useState(false);
  const b = window.nullBrowser;

  React.useEffect(() => {
    if (open) {
      setQuery('');
      setConfirmClear(false);
      void b.getHistory().then((h) => useSessionStore.getState().setHistory(h)).catch(() => undefined);
    }
  }, [open, b]);

  if (!open) return null;

  const q = query.trim().toLowerCase();
  const filtered = q
    ? history.filter((h) => h.url.toLowerCase().includes(q) || h.title.toLowerCase().includes(q))
    : history;

  const close = (): void => set({ historyOpen: false });

  return (
    <div
      className="overlay"
      role="dialog"
      aria-modal="true"
      aria-label="History"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="dialog history-dialog">
        <div className="dialog-head">
          <span className="hist-head-icon">
            <Icon name="history" size={18} />
          </span>
          <h2>History</h2>
          <span className="hist-pill">{history.length}</span>
          <button className="icon-btn" aria-label="Close history" onClick={close}>
            <Icon name="close" size={15} />
          </button>
        </div>
        <p className="hist-note">Kept for this session only — cleared when Null closes.</p>

        <div className="hist-search">
          <Icon name="search" size={14} />
          <input
            type="text"
            value={query}
            placeholder="Search history"
            aria-label="Search history"
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="dl-empty">
            <span className="dl-empty-icon">
              <Icon name="history" size={22} />
            </span>
            <span>{history.length === 0 ? 'No history yet' : 'No matches'}</span>
            <span className="dl-empty-hint">
              {history.length === 0 ? 'Pages you visit this session show up here.' : 'Try a different search.'}
            </span>
          </div>
        ) : (
          <div className="dl-list hist-list">
            {filtered.map((entry) => (
              <div className="hist-row" key={entry.id}>
                <span className="hist-fav">
                  <HistoryFavicon entry={entry} />
                </span>
                <button
                  className="hist-open"
                  title={entry.url}
                  onClick={() => {
                    if (activeId) void b.navigate(activeId, entry.url);
                    else void b.createTab(entry.url, true);
                    close();
                  }}
                >
                  <span className="hist-title">{entry.title || entry.url}</span>
                  <span className="hist-url">{entry.url}</span>
                </button>
                <span className="hist-time">{timeLabel(entry.visitedAt)}</span>
                <button
                  className="icon-btn"
                  title="Remove from history"
                  aria-label={`Remove ${entry.title} from history`}
                  onClick={() => void b.removeHistory(entry.id)}
                >
                  <Icon name="close" size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="btn-row">
          {history.length > 0 &&
            (confirmClear ? (
              <>
                <span className="hist-confirm">Clear all {history.length} entries?</span>
                <button className="btn ghost" onClick={() => setConfirmClear(false)}>Cancel</button>
                <button className="btn danger-btn" onClick={() => void b.clearHistory()}>Clear history</button>
              </>
            ) : (
              <>
                <span className="spacer" />
                <button className="btn danger" onClick={() => setConfirmClear(true)}>
                  <Icon name="trash" size={14} /> Clear browsing history
                </button>
              </>
            ))}
        </div>
      </div>
    </div>
  );
}
