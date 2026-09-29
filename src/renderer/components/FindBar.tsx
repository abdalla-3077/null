import React from 'react';
import { useFindStore, useTabStore } from '../stores';

export function FindBar(): React.ReactElement {
  const open = useFindStore((s) => s.open);
  const query = useFindStore((s) => s.query);
  const result = useFindStore((s) => s.result);
  const set = useFindStore((s) => s.set);
  const activeId = useTabStore((s) => s.activeId);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open ]);

  if (!open) return <></>;

  const search = (q: string, fwd = true): void => {
    set({ query: q });
    if (activeId) void window.nullBrowser.find(activeId, q, fwd);
  };

  const close = (): void => {
    if (activeId) void window.nullBrowser.findStop(activeId);
    set({ open: false, query: '', result: null });
  };

  return (
    <div className="findbar" role="search" aria-label="Find in page">
      <input
        ref={inputRef}
        value={query}
        placeholder="Find in page"
        aria-label="Find text"
        onChange={(e) => search(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') search(query, !e.shiftKey);
          else if (e.key === 'Escape') close();
        }}
      />
      <span className="count" aria-live="polite">
        {result && result.matches > 0 ? `${result.activeMatchOrdinal}/${result.matches}` : result ? '0/0' : ''}
      </span>
      <button className="icon-btn" title="Previous" aria-label="Previous match" onClick={() => search(query, false)}>↑</button>
      <button className="icon-btn" title="Next" aria-label="Next match" onClick={() => search(query, true)}>↓</button>
      <button className="icon-btn" title="Close" aria-label="Close find" onClick={close}>×</button>
    </div>
  );
}
