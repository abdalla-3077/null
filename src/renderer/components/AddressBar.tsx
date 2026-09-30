import React, { useEffect, useRef } from 'react';
import { useTabStore } from '../stores';
import { Icon, type IconName } from './icons';

export function AddressBar({ addressRef }: { addressRef: React.RefObject<HTMLInputElement | null> }): React.ReactElement {
  const tabs = useTabStore((s) => s.tabs);
  const activeId = useTabStore((s) => s.activeId);
  const active = tabs.find((t) => t.id === activeId);
  const [value, setValue] = React.useState('');
  const [focused, setFocused] = React.useState(false);
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

  const url = active?.url ?? '';
  const security: 'secure' | 'insecure' | 'warning' | 'internal' | 'unknown' = active?.certError
    ? 'warning'
    : /^https:/i.test(url)
      ? 'secure'
      : /^http:\/\//i.test(url)
        ? 'insecure'
        : /^(null|file|about|data|chrome):/i.test(url)
          ? 'internal'
          : 'unknown';
  const affix: { icon: IconName; title: string } =
    security === 'secure'
      ? { icon: 'lock', title: 'Connection is secure (HTTPS)' }
      : security === 'warning'
        ? { icon: 'alert', title: 'Certificate not trusted — you chose to proceed' }
        : security === 'insecure'
          ? { icon: 'unlock', title: 'Not secure — this page uses plain HTTP' }
          : security === 'internal'
            ? { icon: 'lock', title: 'Null internal page' }
            : { icon: 'search', title: 'Search or enter address' };
  const showValue = focused || !active || active.url === 'null://newtab' || !active.title;

  return (
    <div className="address-wrap">
      <span className={`address-affix ${security}`} title={affix.title} aria-hidden>
        <Icon name={affix.icon} size={14} />
      </span>
      <input
        ref={ref as React.RefObject<HTMLInputElement>}
        className={`address${focused ? ' focused' : ''}`}
        aria-label="Address bar"
        placeholder={active && active.url !== 'null://newtab' ? active.url : 'Search or enter address'}
        value={showValue ? value : (active?.title ?? value)}
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
        onFocus={(e) => {
          setFocused(true);
          setValue(active?.url === 'null://newtab' ? '' : (active?.url ?? ''));
          e.target.select();
        }}
        onBlur={() => setFocused(false)}
        onMouseDown={(e) => {
          if (document.activeElement !== e.currentTarget) {
            e.preventDefault();
            e.currentTarget.focus();
            e.currentTarget.select();
          }
        }}
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
