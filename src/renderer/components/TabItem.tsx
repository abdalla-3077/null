import React from 'react';
import type { TabInfo } from '../../shared/types';

function Favicon({ tab }: { tab: TabInfo }): React.ReactElement {
  if (tab.loading) return <span className="spin" aria-hidden />;
  if (tab.favicon) {
    return (
      <span className="fav">
        <img src={tab.favicon} alt="" draggable={false} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      </span>
    );
  }
  return <span className="fav">○</span>;
}

export function TabItem({
  tab,
  onActivate,
  onClose,
  onMute,
  onReorder,
}: {
  tab: TabInfo;
  onActivate: () => void;
  onClose: () => void;
  onMute: () => void;
  onReorder: (dir: -1 | 1) => void;
}): React.ReactElement {
  return (
    <div
      className={`tab${tab.active ? ' active' : ''}${tab.pinned ? ' pinned' : ''}`}
      role="tab"
      aria-selected={tab.active}
      aria-label={tab.title}
      onClick={onActivate}
      onAuxClick={(e) => {
        if (e.button === 1) {
          e.preventDefault();
          onClose();
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onActivate();
      }}
      tabIndex={0}
    >
      <Favicon tab={tab} />
      <span className="title">{tab.title || 'New Tab'}</span>
      {(tab.audible || tab.muted) && (
        <button
          className="m"
          title={tab.muted ? 'Unmute tab' : 'Mute tab'}
          aria-label={tab.muted ? `Unmute ${tab.title}` : `Mute ${tab.title}`}
          onClick={(e) => {
            e.stopPropagation();
            onMute();
          }}
        >
          {tab.muted ? '✕♪' : '♪'}
        </button>
      )}
      {!tab.pinned && (
        <button
          className="x"
          title="Close tab"
          aria-label={`Close ${tab.title}`}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          ×
        </button>
      )}
      <span style={{ display: 'none' }}>
        <button onClick={() => onReorder(-1)} aria-label="Move tab left" />
        <button onClick={() => onReorder(1)} aria-label="Move tab right" />
      </span>
    </div>
  );
}
