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

function metaTagValue(tags: PageMetaTag[], label: string): string {
  const hit = tags.find((t) => t.label.toLowerCase() === label);
  return hit ? hit.value : '';
}

function resolveUrl(value: string, base: string): string {
  if (!value) return '';
  try {
    return new URL(value, base || undefined).toString();
  } catch {
    return value;
  }
}

interface SocialPreview {
  title: string;
  description: string;
  image: string;
  siteName: string;
  url: string;
}

type PreviewImage =
  | { phase: 'none' }
  | { phase: 'direct'; url: string }
  | { phase: 'fetching'; url: string }
  | { phase: 'ready'; url: string; dataUrl: string }
  | { phase: 'error'; url: string; error: string };

function PreviewCard({
  preview,
  image,
  source,
  showSourceToggle,
  onSource,
  onImageError,
  onCopyImage,
  onOpenImage,
}: {
  preview: SocialPreview;
  image: PreviewImage;
  source: 'og' | 'twitter';
  showSourceToggle: boolean;
  onSource: (source: 'og' | 'twitter') => void;
  onImageError: () => void;
  onCopyImage: (url: string) => void;
  onOpenImage: (url: string) => void;
}): React.ReactElement {
  const hasImage = Boolean(preview.image) && (image.phase === 'direct' || image.phase === 'ready');
  return (
    <div className="dt-preview">
      <div className="dt-preview-media">
        {!preview.image || image.phase === 'none' ? (
          <div className="dt-preview-fallback">
            <Icon name="image" size={22} />
            <span>No preview image</span>
          </div>
        ) : image.phase === 'fetching' ? (
          <div className="dt-preview-fallback">
            <i className="dt-spinner" />
            <span>Loading image…</span>
          </div>
        ) : image.phase === 'error' ? (
          <div className="dt-preview-fallback" title={image.error}>
            <Icon name="imageOff" size={22} />
            <span>Image unavailable</span>
            {image.error && <span className="dt-preview-reason">{image.error}</span>}
          </div>
        ) : (
          <img
            src={image.phase === 'ready' ? image.dataUrl : image.url}
            alt=""
            onError={onImageError}
            referrerPolicy="no-referrer"
          />
        )}
      </div>

      <div className="dt-preview-body">
        <div className="dt-preview-top">
          <span className="dt-preview-site">{preview.siteName || 'Untitled site'}</span>
          {showSourceToggle && (
            <div className="dt-seg" role="tablist" aria-label="Preview source">
              <button
                role="tab"
                aria-selected={source === 'og'}
                className={`dt-seg-btn${source === 'og' ? ' active' : ''}`}
                onClick={() => onSource('og')}
              >
                Open Graph
              </button>
              <button
                role="tab"
                aria-selected={source === 'twitter'}
                className={`dt-seg-btn${source === 'twitter' ? ' active' : ''}`}
                onClick={() => onSource('twitter')}
              >
                Twitter
              </button>
            </div>
          )}
        </div>

        <span className="dt-preview-title">{preview.title || 'Untitled'}</span>
        {preview.description && <span className="dt-preview-desc">{preview.description}</span>}

        <div className="dt-preview-bottom">
          <span className="dt-preview-url" title={preview.url}>
            {preview.url || '—'}
          </span>
          {hasImage && (
            <div className="dt-preview-actions">
              <button
                className="icon-btn"
                title="Copy image URL"
                aria-label="Copy image URL"
                onClick={() => onCopyImage(preview.image)}
              >
                <Icon name="copy" size={15} />
              </button>
              <button
                className="icon-btn"
                title="Open image in new tab"
                aria-label="Open image in new tab"
                onClick={() => onOpenImage(preview.image)}
              >
                <Icon name="external" size={15} />
              </button>
            </div>
          )}
        </div>
      </div>
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
  const [previewSource, setPreviewSource] = React.useState<'og' | 'twitter'>('og');
  const [previewImage, setPreviewImage] = React.useState<PreviewImage>({ phase: 'none' });
  const previewReq = React.useRef(0);

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

  const security: TabSecurity = info?.security ?? 'unknown';
  const meta = info?.meta ?? null;
  const ogTags = meta?.openGraph ?? [];
  const twitterTags = meta?.twitter ?? [];
  const activeTags = previewSource === 'og' ? ogTags : twitterTags;
  const tagPrefix = previewSource === 'og' ? 'og:' : 'twitter:';
  const preview: SocialPreview = {
    title: metaTagValue(activeTags, `${tagPrefix}title`) || meta?.title || info?.title || '',
    description: metaTagValue(activeTags, `${tagPrefix}description`) || meta?.description || '',
    image: resolveUrl(
      metaTagValue(activeTags, `${tagPrefix}image`) ||
        (previewSource === 'og' ? metaTagValue(ogTags, 'og:image:secure_url') : ''),
      info?.url ?? '',
    ),
    siteName:
      metaTagValue(ogTags, 'og:site_name') ||
      metaTagValue(twitterTags, 'twitter:site') ||
      info?.host ||
      '',
    url: metaTagValue(activeTags, `${tagPrefix}url`) || meta?.canonical || info?.url || '',
  };

  React.useEffect(() => {
    if (!open) return;
    setResources({ robots: null, sitemap: null });
    setCopied('');
    setPreviewImage({ phase: 'none' });
    void loadInfo();
  }, [open, activeId, loadInfo]);

  React.useEffect(() => {
    if (!open || !activeId) return;
    if (panel === 'robots' && !resources.robots && !resLoading.robots) void loadResource('robots');
    if (panel === 'sitemap' && !resources.sitemap && !resLoading.sitemap) void loadResource('sitemap');
  }, [open, activeId, panel, resources.robots, resources.sitemap, resLoading.robots, resLoading.sitemap, loadResource]);

  React.useEffect(() => {
    if (!meta) return;
    setPreviewSource(meta.openGraph.length === 0 && meta.twitter.length > 0 ? 'twitter' : 'og');
  }, [meta]);

  React.useEffect(() => {
    if (!open) return;
    previewReq.current += 1;
    const target = preview.image;
    if (!target || !/^(https?:\/\/|data:image\/)/i.test(target)) {
      setPreviewImage({ phase: 'none' });
      return;
    }
    setPreviewImage({ phase: 'direct', url: target });
  }, [open, preview.image]);

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

  const handleImageError = (): void => {
    if (previewImage.phase !== 'direct') return;
    const url = previewImage.url;
    const req = previewReq.current;
    setPreviewImage({ phase: 'fetching', url });
    void b
      .devImage(url, info?.url ?? null)
      .then((result) => {
        if (req !== previewReq.current) return;
        if (result?.ok) setPreviewImage({ phase: 'ready', url, dataUrl: result.dataUrl });
        else setPreviewImage({ phase: 'error', url, error: result?.error || 'Image could not be loaded.' });
      })
      .catch((err: unknown) => {
        if (req !== previewReq.current) return;
        setPreviewImage({ phase: 'error', url, error: err instanceof Error ? err.message : 'Image request failed.' });
      });
  };

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

                <h3 className="dt-section">Page</h3>
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
                <PreviewCard
                  preview={preview}
                  image={previewImage}
                  source={previewSource}
                  showSourceToggle={ogTags.length > 0 && twitterTags.length > 0}
                  onSource={setPreviewSource}
                  onImageError={handleImageError}
                  onCopyImage={(url) => copy(url, 'image')}
                  onOpenImage={(url) => void b.createTab(url, true)}
                />

                <div className="dt-toolbar">
                  <span className="dt-toolbar-label">
                    Summary
                  </span>
                  <button
                    className="dt-copy-btn"
                    onClick={() => copy(JSON.stringify(meta, null, 2), 'json')}
                    title="Copy all page metadata as JSON"
                  >
                    <Icon name={copied === 'json' ? 'check' : 'copy'} size={13} />
                    {copied === 'json' ? 'Copied' : 'Copy JSON'}
                  </button>
                </div>

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
