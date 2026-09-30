import domainLists from './sensitive-domains.json';

export type SensitiveCategory = 'porn' | 'gambling' | 'alcohol';

const DOMAIN_SETS: Record<SensitiveCategory, Set<string>> = {
  porn: new Set(domainLists.porn),
  gambling: new Set(domainLists.gambling),
  alcohol: new Set(domainLists.alcohol),
};

const CATEGORY_ORDER: SensitiveCategory[] = ['porn', 'gambling', 'alcohol'];

function normalizeHost(url: string): string | null {
  let host = '';
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    host = u.hostname.toLowerCase();
  } catch {
    return null;
  }
  if (!host || host === 'localhost' || host.endsWith('.localhost')) return null;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':') || host.endsWith('.local') || host.endsWith('.lan') || host.endsWith('.home')) return null;
  if (host.startsWith('www.')) host = host.slice(4);
  return host;
}

export function classifySensitiveUrl(url: string): SensitiveCategory | null {
  const host = normalizeHost(url);
  if (!host) return null;
  for (const category of CATEGORY_ORDER) {
    const set = DOMAIN_SETS[category];
    if (set.has(host)) return category;
    const parts = host.split('.');
    for (let i = 1; i < parts.length - 1; i++) {
      if (set.has(parts.slice(i).join('.'))) return category;
    }
  }
  return null;
}

export function trustHostForUrl(url: string): string {
  return normalizeHost(url) ?? '';
}

export function isHostTrusted(host: string, trusted: readonly string[]): boolean {
  const h = host.toLowerCase();
  return trusted.some((t) => {
    const n = t.toLowerCase();
    return h === n || h.endsWith(`.${n}`);
  });
}

export interface SensitiveWarningCopy {
  title: string;
  kicker: string;
  body: string;
  note: string;
  token: string;
  icon: 'eyeOff' | 'dice' | 'martini';
}

export const SENSITIVE_WARNING_COPY: Record<SensitiveCategory, SensitiveWarningCopy> = {
  porn: {
    title: 'Adult content ahead',
    kicker: '18+ · Explicit',
    body: 'This site is known to host pornography and explicit sexual content. It may not be suitable for minors or shared screens.',
    note: 'If you are under 18 or this device is shared, consider going back.',
    token: 'var(--danger)',
    icon: 'eyeOff',
  },
  gambling: {
    title: 'Gambling site ahead',
    kicker: 'Real money · Risk',
    body: 'This site offers gambling with real money. Gambling carries a risk of financial loss and can be addictive.',
    note: 'Only gamble what you can afford to lose. Consider going back if this was not intentional.',
    token: 'var(--warning)',
    icon: 'dice',
  },
  alcohol: {
    title: 'Alcohol-related site ahead',
    kicker: 'Age restricted',
    body: 'This site sells or promotes alcohol. Alcohol is age-restricted and can harm your health.',
    note: 'You may need to verify your age on this site. Consider going back if this was not intentional.',
    token: 'var(--accent)',
    icon: 'martini',
  },
};

export const SENSITIVE_CATEGORY_LABEL: Record<SensitiveCategory, string> = {
  porn: 'Pornography',
  gambling: 'Gambling',
  alcohol: 'Alcohol',
};
