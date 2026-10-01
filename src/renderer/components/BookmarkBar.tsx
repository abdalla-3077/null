import React from 'react';
import { useSessionStore, useTabStore } from '../stores';
import { Icon } from './icons';
import type { BookmarkItem } from '../../shared/types';

function BookmarkFavicon({ item }: { item: BookmarkItem }): React.ReactElement {
  const [broken, setBroken] = React.useState(false);
  if (item.favicon && !broken) {
    return (
      <img
        src={item.favicon}
        alt=""
        draggable={false}
        onError={() => setBroken(true)}
      />
    );
  }
  return <Icon name="globe" size={12} />;
}

export function BookmarkBar(): React.ReactElement {
  const bookmarks = useSessionStore((s) => s.bookmarks);
  const activeId = useTabStore((s) => s.activeId);
  const b = window.nullBrowser;

  const open = (url: string, newTab: boolean): void => {
    if (newTab || !activeId) void b.createTab(url, true);
    else void b.navigate(activeId, url);
  };

  return (
    <div className="bookmark-bar" role="toolbar" aria-label="Bookmarks">
      <span className="bookmark-bar-icon" aria-hidden>
        <Icon name="starFilled" size={13} />
      </span>
      {bookmarks.length === 0 ? (
        <span className="bookmark-empty">Bookmarked pages show up here</span>
      ) : (
        <div className="bookmark-list">
          {bookmarks.map((item) => (
            <div className="bookmark-item" key={item.id}>
              <button
                className="bookmark-link"
                title={item.url}
                onClick={() => open(item.url, false)}
                onAuxClick={(e) => {
                  if (e.button === 1) {
                    e.preventDefault();
                    open(item.url, true);
                  }
                }}
              >
                <span className="bookmark-fav">
                  <BookmarkFavicon item={item} />
                </span>
                <span className="bookmark-title">{item.title || item.url}</span>
              </button>
              <button
                className="bookmark-remove"
                title="Remove bookmark"
                aria-label={`Remove bookmark ${item.title}`}
                onClick={() => void b.removeBookmark(item.id)}
              >
                <Icon name="close" size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
