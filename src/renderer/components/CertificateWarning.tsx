import React from 'react';
import { useUIStore } from '../stores';
import { Icon } from './icons';

const CERT_ERROR_TEXT: Record<string, string> = {
  'net::ERR_CERT_AUTHORITY_INVALID':
    'The certificate is not signed by a trusted authority. Devices such as routers and NAS boxes usually ship a self-signed certificate.',
  'net::ERR_CERT_COMMON_NAME_INVALID': 'The certificate was issued for a different host name.',
  'net::ERR_CERT_DATE_INVALID': 'The certificate is expired or not valid yet.',
  'net::ERR_CERT_REVOKED': 'The certificate has been revoked.',
  'net::ERR_CERT_WEAK_SIGNATURE_ALGORITHM': 'The certificate uses a weak signature algorithm.',
  'net::ERR_CERT_INVALID': 'The certificate is invalid.',
};

export function CertificateWarning(): React.ReactElement | null {
  const warning = useUIStore((s) => s.certWarning);
  const setUI = useUIStore((s) => s.set);
  if (!warning) return null;

  const dismiss = (): void => setUI({ certWarning: null });
  const reason =
    CERT_ERROR_TEXT[warning.error] ??
    'The connection is not private because the certificate could not be verified.';

  return (
    <div className="overlay" role="alertdialog" aria-modal aria-label="Certificate warning">
      <div className="dialog" style={{ width: 'min(500px, 92vw)' }}>
        <div className="dialog-head">
          <span style={{ color: 'var(--warning)', display: 'inline-flex' }}>
            <Icon name="alert" size={22} />
          </span>
          <h2>Your connection is not private</h2>
        </div>
        <p className="muted">
          <strong>{warning.host}</strong> presented a certificate Null cannot trust. {reason}
        </p>
        <p className="insecure-url">{warning.url}</p>
        {warning.issuer && <p className="cert-issuer">Issued by {warning.issuer}</p>}
        <p className="muted">
          Only continue if this is a device you control. Proceeding disables certificate checking
          for this host until Null closes.
        </p>
        <div className="btn-row">
          <button className="btn ghost" onClick={dismiss}>Cancel</button>
          <button
            className="btn danger-btn"
            onClick={() => {
              dismiss();
              void window.nullBrowser.approveCertificate(warning.tabId, warning.url);
            }}
          >
            <Icon name="alert" size={14} /> Proceed anyway
          </button>
        </div>
      </div>
    </div>
  );
}
