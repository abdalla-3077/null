import React from 'react';
import { useTabStore, useUIStore } from '../stores';
import { Icon, type IconName } from './icons';
import type {
  PageMetaTag,
  SiteResourceKind,
  SiteResourceResult,
  TabDevInfo,
  TabSecurity,
} from '../../shared/types';

type Panel = 'overview' | 'meta' | 'robots' | 'sitemap';

const PANELS: { id: Panel; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'meta', label: 'Metadata' },
  { id: 'robots', label: 'robots.txt' },
  { id: 'sitemap', label: 'Sitemap' },
];

const SECURITY_LABEL: Record<TabSecurity, string> = {
  secure: 'Secure connection (HTTPS)',
  insecure: 'Not secure (plain HTTP)',
  warning: 'Certificate not trusted',
  internal: 'Null internal page',
  unknown: 'Unknown origin',
};

const SECURITY_ICON: Record<TabSecurity, IconName> = {
  secure: 'lock',
  insecure: 'unlock',
  warning: 'alert',
  internal: 'lock',
  unknown: 'globe',
};

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = value >= 10 || unit === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[unit]}`;
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}): React.ReactElement | null {
  if (value === '' || value === null || value === undefined) return null;
  return (
    <div className="dt-row">
      <span className="dt-key">{label}</span>
      <span className={`dt-val${mono ? ' mono' : ''}`}>{value}</span>
    </div>
  );
}

function TagList({ tags }: { tags: PageMetaTag[] }): React.ReactElement | null {
  if (tags.length === 0) return null;
  return (
    <div className="dt-tags">
      {tags.map((t) => (
        <div className="dt-tag" key={`${t.label}:${t.value.slice(0, 32)}`}>
          <span className="dt-tag-key">{t.label}</span>
          <span className="dt-tag-val">{t.value}</span>
        </div>
      ))}
    </div>
  );
}

function ResourcePanel({
  result,
  loading,
  copied,
  onReload,
  onCopy,
  onOpenExternal,
  onPick,
}: {
  result: SiteResourceResult | null;
  loading: boolean;
  copied: boolean;
  onReload: () => void;
  onCopy: () => void;
  onOpenExternal: (url: string) => void;
  onPick: (url: string) => void;
}): React.ReactElement {
  const status = ((): { text: string; tone: string } => {
    if (loading) return { text: 'Fetching…', tone: 'muted' };
    if (!result) return { text: 'Waiting…', tone: 'muted' };
    if (result.error) return { text: result.error, tone: 'bad' };
    const size = formatBytes(result.bytes);
    if (!result.ok) return { text: `HTTP ${result.status || '—'} · ${size}`, tone: 'warn' };
    return {
      text: `HTTP ${result.status} · ${result.contentType || 'unknown type'} · ${size}`,
      tone: 'good',
    };
  })();

  return (
    <div className="dt-res">
      <div className="dt-res-head">
        <span className="dt-res-url" title={result?.url ?? ''}>
          {result?.url ?? '—'}
        </span>
        <div className="dt-res-actions">
          <button className="icon-btn" title="Reload" aria-label="Reload" onClick={onReload} disabled={loading}>
            <Icon name="reload" size={15} />
          </button>
          <button
            className="icon-btn"
            title={copied ? 'Copied' : 'Copy'}
            aria-label="Copy contents"
            onClick={onCopy}
            disabled={!result?.body}
          >
            <Icon name={copied ? 'check' : 'copy'} size={15} />
          </button>
          <button
            className="icon-btn"
            title="Open in new tab"
            aria-label="Open in new tab"
            onClick={() => result && onOpenExternal(result.url)}
            disabled={!result}
          >
            <Icon name="external" size={15} />
          </button>
        </div>
      </div>

      <div className={`dt-res-status ${status.tone}`}>{status.text}</div>

      {result && result.sitemapUrls.length > 0 && (
        <div className="dt-chips">
          <span className="dt-chips-label">
            {result.kind === 'sitemap' ? 'Sitemaps' : 'Sitemaps referenced'}
          </span>
          {result.sitemapUrls.map((u) => (
            <button
              key={u}
              className={`dt-chip${u === result.url ? ' active' : ''}`}
              title={u}
              onClick={() => onPick(u)}
            >
              {u.replace(/^https?:\/\//, '')}
            </button>
          ))}
        </div>
      )}

      {result?.truncated && (
        <div className="dt-res-status warn">Showing the first {formatBytes(result.body.length)} only.</div>
      )}

      {result && result.body ? (
        <pre className="dt-code">{result.body}</pre>
      ) : (
        <div className="dt-res-empty">{loading ? 'Fetching…' : 'No content to display'}</div>
      )}
    </div>
  );
}

export function DevToolsDialog(): React.ReactElement | null {
  const open = useUIStore((s) => s.devToolsOpen);
  const setUI = useUIStore((s) => s.set);
  const activeId = useTabStore((s) => s.activeId);

  const [panel, setPanel] = React.useState<Panel>('overview');
  const [info, setInfo] = React.useState<TabDevInfo | null>(null);
  const [infoLoading, setInfoLoading] = React.useState(false);
  const [resources, setResources] = React.useState<Record<SiteResourceKind, SiteResourceResult | null>>({
    robots: null,
    sitemap: null,
  });
  const [resLoading, setResLoading] = React.useState<Record<SiteResourceKind, boolean>>({
    robots: false,
    sitemap: false,
  });
  const [copied, setCopied] = React.useState('');

  const b = window.nullBrowser;

  const loadInfo = React.useCallback(async (): Promise<void> => {
    if (!activeId) {
      setInfo(null);
      return;
    }
    setInfoLoading(true);
    try {
      setInfo(await b.devInfo(activeId));
    } catch {
      setInfo(null);
    } finally {
      setInfoLoading(false);
    }
  }, [activeId, b]);

  const loadResource = React.useCallback(
    async (kind: SiteResourceKind, url?: string): Promise<void> => {
      if (!activeId) return;
      setResLoading((s) => ({ ...s, [kind]: true }));
      try {
        const result = await b.devResource(activeId, kind, url);
        setResources((s) => ({ ...s, [kind]: result }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Request failed.';
        setResources((s) => ({
          ...s,
          [kind]: {
            kind,
            url: url ?? '',
            ok: false,
            status: 0,
            contentType: '',
            bytes: 0,
            body: '',
            truncated: false,
            sitemapUrls: [],
            error: message,
            fetchedAt: Date.now(),
          },
        }));
      } finally {
        setResLoading((s) => ({ ...s, [kind]: false }));
      }
    },
    [activeId, b],
  );

  React.useEffect(() => {
    if (!open) return;
    setResources({ robots: null, sitemap: null });
    setCopied('');
    void loadInfo();
  }, [open, activeId, loadInfo]);

  React.useEffect(() => {
    if (!open || !activeId) return;
    if (panel === 'robots' && !resources.robots && !resLoading.robots) void loadResource('robots');
    if (panel === 'sitemap' && !resources.sitemap && !resLoading.sitemap) void loadResource('sitemap');
  }, [open, activeId, panel, resources.robots, resources.sitemap, resLoading.robots, resLoading.sitemap, loadResource]);

  if (!open) return null;

  const close = (): void => setUI({ devToolsOpen: false });

  const copy = (text: string, key: string): void => {
    void navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(key);
        window.setTimeout(() => setCopied(''), 1200);
      })
      .catch(() => undefined);
  };

  const toggleDevTools = (): void => {
    if (!activeId) return;
    const next = !(info?.devToolsOpen ?? false);
    void b.setDevToolsOpen(activeId, next);
    setInfo((prev) => (prev ? { ...prev, devToolsOpen: next } : prev));
  };

  const security: TabSecurity = info?.security ?? 'unknown';
  const meta = info?.meta ?? null;

  return (
    <div
      className="overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Page inspector"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="dialog dt-dialog">
        <div className="dialog-head dt-head">
          <span className="dt-head-icon">
            <Icon name="code" size={19} />
          </span>
          <div className="dt-title">
            <h2>Page inspector</h2>
            <span className="dt-sub" title={info?.url ?? ''}>
              {info?.host || (activeId ? 'Loading…' : 'No page open')}
            </span>
          </div>
          <button className="icon-btn" aria-label="Close page inspector" onClick={close}>
            <Icon name="close" size={15} />
          </button>
        </div>

        <div className="dt-tabs" role="tablist" aria-label="Inspector sections">
          {PANELS.map((p) => (
            <button
              key={p.id}
              role="tab"
              aria-selected={panel === p.id}
              className={`dt-tab${panel === p.id ? ' active' : ''}`}
              onClick={() => setPanel(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="dt-body">
          {!activeId ? (
            <div className="dt-res-empty">Open a page to inspect it.</div>
          ) : panel === 'overview' ? (
            infoLoading && !info ? (
              <div className="dt-res-empty">Reading page…</div>
            ) : info ? (
              <>
                <div className={`dt-sec ${security}`}>
                  <Icon name={SECURITY_ICON[security]} size={14} />
                  <span>{SECURITY_LABEL[security]}</span>
                </div>

                <div className="dt-url">
                  <span className="dt-url-text" title={info.url}>{info.url || '—'}</span>
                  <button className="icon-btn" title="Copy URL" aria-label="Copy URL" onClick={() => copy(info.url, 'url')}>
                    <Icon name={copied === 'url' ? 'check' : 'copy'} size={15} />
                  </button>
                  <button
                    className="icon-btn"
                    title="Open in new tab"
                    aria-label="Open URL in new tab"
                    onClick={() => void b.createTab(info.url, true)}
                    disabled={!/^https?:/i.test(info.url)}
                  >
                    <Icon name="external" size={15} />
                  </button>
                </div>

                <div className="dt-rows">
                  <Row label="Title" value={info.title} />
                  <Row label="Host" value={info.host} mono />
                  <Row label="Origin" value={info.origin} mono />
                  <Row label="Protocol" value={info.protocol} mono />
                  <Row label="Status" value={info.loading ? 'Loading…' : 'Loaded'} />
                  <Row label="History" value={`${info.canGoBack ? '← back' : ''}${info.canGoBack && info.canGoForward ? ' · ' : ''}${info.canGoForward ? 'forward →' : ''}`} />
                  <Row label="Zoom" value={`${info.zoom}%`} />
                  <Row label="Audio" value={info.muted ? 'Muted' : ''} />
                  <Row label="Device profile" value={info.deviceProfile} />
                  <Row label="Process ID" value={info.processId ?? ''} mono />
                  <Row label="Renderer DevTools" value={info.devToolsOpen ? 'Open' : 'Closed'} />
                  <Row label="Ready state" value={meta?.readyState} />
                  <Row label="Content type" value={meta?.contentType} mono />
                </div>

                {meta && (
                  <>
                    <h3 className="dt-section">Storage</h3>
                    <div className="dt-rows">
                      <Row label="Cookies" value={meta.cookies < 0 ? 'Blocked' : `${meta.cookies}`} />
                      <Row label="localStorage keys" value={meta.localStorageKeys < 0 ? 'Blocked' : `${meta.localStorageKeys}`} />
                    </div>

                    <h3 className="dt-section">Document</h3>
                    <div className="dt-rows">
                      <Row label="Links" value={`${meta.counts.links}`} />
                      <Row label="Images" value={`${meta.counts.images}`} />
                      <Row label="Scripts" value={`${meta.counts.scripts}`} />
                      <Row label="Stylesheets" value={`${meta.counts.stylesheets}`} />
                      <Row label="Forms" value={`${meta.counts.forms}`} />
                      <Row label="Iframes" value={`${meta.counts.iframes}`} />
                    </div>
                  </>
                )}

                {info.metaError && <p className="dt-note">{info.metaError}</p>}
              </>
            ) : (
              <div className="dt-res-empty">No page selected.</div>
            )
          ) : panel === 'meta' ? (
            !info ? (
              <div className="dt-res-empty">Reading page…</div>
            ) : meta ? (
              <>
                <div className="dt-rows">
                  <Row label="Description" value={meta.description} />
                  <Row label="Canonical" value={meta.canonical} mono />
                  <Row label="Robots" value={meta.robots} />
                  <Row label="Viewport" value={meta.viewport} mono />
                  <Row label="Language" value={meta.lang} />
                  <Row label="Charset" value={meta.charset} />
                  <Row label="Author" value={meta.author} />
                  <Row label="Generator" value={meta.generator} />
                  <Row label="Theme color" value={meta.themeColor} />
                </div>

                {meta.openGraph.length > 0 && (
                  <>
                    <h3 className="dt-section">Open Graph <span className="dt-count">{meta.openGraph.length}</span></h3>
                    <TagList tags={meta.openGraph} />
                  </>
                )}
                {meta.twitter.length > 0 && (
                  <>
                    <h3 className="dt-section">Twitter <span className="dt-count">{meta.twitter.length}</span></h3>
                    <TagList tags={meta.twitter} />
                  </>
                )}
                {meta.other.length > 0 && (
                  <>
                    <h3 className="dt-section">Other meta <span className="dt-count">{meta.other.length}</span></h3>
                    <TagList tags={meta.other} />
                  </>
                )}
                {info.metaError && <p className="dt-note">{info.metaError}</p>}
              </>
            ) : (
              <div className="dt-res-empty">{info.metaError || 'No metadata available for this page.'}</div>
            )
          ) : (
            <ResourcePanel
              result={resources[panel]}
              loading={resLoading[panel]}
              copied={copied === 'res'}
              onReload={() => void loadResource(panel)}
              onCopy={() => resources[panel]?.body && copy(resources[panel]?.body ?? '', 'res')}
              onOpenExternal={(url) => void b.createTab(url, true)}
              onPick={(url) => {
                if (panel === 'robots') {
                  setPanel('sitemap');
                  void loadResource('sitemap', url);
                } else {
                  void loadResource('sitemap', url);
                }
              }}
            />
          )}
        </div>

        <div className="btn-row dt-foot">
          <button className="btn ghost" onClick={toggleDevTools} disabled={!activeId}>
            <Icon name="code" size={14} /> {info?.devToolsOpen ? 'Close DevTools' : 'Open DevTools'}
          </button>
          <span className="spacer" />
          <button className="btn" onClick={() => void loadInfo()} disabled={!activeId || infoLoading}>
            <Icon name="reload" size={14} /> Refresh
          </button>
          <button className="btn primary" onClick={close}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
