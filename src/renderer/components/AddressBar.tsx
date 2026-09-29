import React, { useEffect, useRef } from 'react';
import { useTabStore } from '../stores';

export function AddressBar({ addressRef }: { addressRef: React.RefObject<HTMLInputElement | null> }): React.ReactElement {
  const tabs = useTabStore((s) => s.tabs);
  const activeId = useTabStore((s) => s.activeId);
  const active = tabs.find((t) => t.id === activeId);
  const [value, setValue] = React.useState('');
  const localRef = useRef<HTMLInputElement>(null);
  const ref = addressRef ?? localRef;

  useEffect(() => {
    setValue(active?.url === 'null://newtab' ? '' : (active?.url ?? ''));
  }, [active?.url, activeId]);

  const submit = (): void => {
    if (!activeId) return;
    const v = value.trim();
    if (!v) return;
    if (v === active?.url) {
      void window.nullBrowser.reload(activeId);
      return;
    }
    void window.nullBrowser.navigate(activeId, v);
    (ref.current ?? localRef.current)?.blur();
  };

  return (
    <div className="address-wrap">
      <input
        ref={ref as React.RefObject<HTMLInputElement>}
        className="address"
        aria-label="Address bar"
        placeholder="Search or enter address"
        value={value}
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
          else if (e.key === 'Escape') {
            setValue(active?.url ?? '');
            e.currentTarget.blur();
            if (activeId) void window.nullBrowser.stop(activeId);
          }
        }}
        onFocus={(e) => e.target.select()}
        onPaste={(e) => {
          const text = e.clipboardData.getData('text');
          if ((e.nativeEvent as unknown as { shiftKey?: boolean }).shiftKey && text && activeId) {
            e.preventDefault();
            void window.nullBrowser.navigate(activeId, text);
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          if (!activeId) return;
          void window.nullBrowser.showContextMenu({
            tabId: activeId,
            linkURL: '',
            srcURL: '',
            selectionText: '',
            isEditable: true,
          });
        }}
      />
    </div>
  );
}
