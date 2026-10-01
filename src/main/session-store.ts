/**
 * Session-only bookmarks and browsing history.
 *
 * Null is designed to forget: nothing here is written to disk. Both lists live
 * in memory for the lifetime of the process and vanish when the app quits.
 */
import { randomUUID } from 'node:crypto';
import type { BookmarkItem, HistoryEntry } from '../shared/types';

const HISTORY_LIMIT = 500;

const bookmarks: BookmarkItem[] = [];
const history: HistoryEntry[] = [];
let emit: (channel: string, ...args: unknown[]) => void = () => undefined;

export function setSessionEmitter(fn: (channel: string, ...args: unknown[]) => void): void {
  emit = fn;
}

function isWebUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function bookmarksChanged(): void {
  emit('browser:bookmarks-changed', getBookmarks());
}

function historyChanged(): void {
  emit('browser:history-changed', getHistory());
}

export function getBookmarks(): BookmarkItem[] {
  return [...bookmarks];
}

export function getBookmarkByUrl(url: string): BookmarkItem | undefined {
  return bookmarks.find((b) => b.url === url);
}

export function addBookmark(url: string, title: string, favicon: string): BookmarkItem | null {
  if (!isWebUrl(url) || bookmarks.some((b) => b.url === url)) return null;
  const item: BookmarkItem = {
    id: randomUUID(),
    url,
    title: title || url,
    favicon: favicon || '',
    addedAt: Date.now(),
  };
  bookmarks.unshift(item);
  bookmarksChanged();
  return item;
}

export function removeBookmark(id: string): void {
  const i = bookmarks.findIndex((b) => b.id === id);
  if (i < 0) return;
  bookmarks.splice(i, 1);
  bookmarksChanged();
}

export function removeBookmarkByUrl(url: string): void {
  const i = bookmarks.findIndex((b) => b.url === url);
  if (i < 0) return;
  bookmarks.splice(i, 1);
  bookmarksChanged();
}

/** Adds the page if missing, removes it if already saved. Returns the new state. */
export function toggleBookmark(url: string, title: string, favicon: string): boolean {
  if (getBookmarkByUrl(url)) {
    removeBookmarkByUrl(url);
    return false;
  }
  return !!addBookmark(url, title, favicon);
}

export function updateBookmarkMeta(url: string, title: string, favicon: string): void {
  const item = getBookmarkByUrl(url);
  if (!item) return;
  let dirty = false;
  if (title && title !== item.title) {
    item.title = title;
    dirty = true;
  }
  if (favicon && favicon !== item.favicon) {
    item.favicon = favicon;
    dirty = true;
  }
  if (dirty) bookmarksChanged();
}

export function clearBookmarks(): void {
  bookmarks.length = 0;
  bookmarksChanged();
}

export function getHistory(): HistoryEntry[] {
  return [...history];
}

export function recordVisit(url: string, title: string, favicon = ''): void {
  if (!isWebUrl(url)) return;
  const last = history[0];
  if (last && last.url === url) {
    last.title = title || last.title;
    last.favicon = favicon || last.favicon;
    last.visitedAt = Date.now();
    historyChanged();
    return;
  }
  history.unshift({
    id: randomUUID(),
    url,
    title: title || url,
    favicon,
    visitedAt: Date.now(),
  });
  if (history.length > HISTORY_LIMIT) history.length = HISTORY_LIMIT;
  historyChanged();
}

/** Refreshes title/favicon on the most recent visit of a URL once they arrive. */
export function updateVisitMeta(url: string, title: string, favicon: string): void {
  const entry = history.find((h) => h.url === url);
  if (!entry) return;
  let dirty = false;
  if (title && title !== entry.title) {
    entry.title = title;
    dirty = true;
  }
  if (favicon && favicon !== entry.favicon) {
    entry.favicon = favicon;
    dirty = true;
  }
  if (dirty) historyChanged();
}

export function removeHistoryEntry(id: string): void {
  const i = history.findIndex((h) => h.id === id);
  if (i < 0) return;
  history.splice(i, 1);
  historyChanged();
}

export function clearHistory(): void {
  history.length = 0;
  historyChanged();
}
