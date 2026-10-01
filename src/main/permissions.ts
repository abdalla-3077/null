/**
 * Permission prompts for tab sessions.
 *
 * Electron grants some permissions silently by default. Null routes the
 * privacy-relevant ones through an explicit in-app prompt instead, and denies
 * everything it does not explicitly recognise.
 */
import { randomUUID } from 'node:crypto';
import type { PermissionKind, PermissionRequestInfo } from '../shared/types';

const PROMPT_KINDS: Record<string, PermissionKind> = {
  media: 'media',
  geolocation: 'geolocation',
  notifications: 'notifications',
  'clipboard-read': 'clipboard-read',
  midi: 'midi',
  midiSysex: 'midi',
  'display-capture': 'display-capture',
};

/** Chrome never prompts for these, and neither do we. */
const ALLOW_SILENTLY = new Set([
  'fullscreen',
  'pointerLock',
  'clipboard-sanitized-write',
  'keyboardLock',
  'background-sync',
]);

const TIMEOUT_MS = 60_000;

const pending = new Map<string, (allow: boolean) => void>();
/** Session-only memory of a user's answer, keyed by origin + permission. */
const decisions = new Map<string, boolean>();
let emit: (channel: string, ...args: unknown[]) => void = () => undefined;

/**
 * The request handler reports a full URL while the check handler reports an
 * origin, so normalise both — otherwise an answer never matches a later check
 * and the user is re-prompted on every page of the same site.
 */
function decisionKey(urlOrOrigin: string, permission: string): string {
  let scope = urlOrOrigin;
  try {
    const origin = new URL(urlOrOrigin).origin;
    if (origin && origin !== 'null') scope = origin;
  } catch {
    /* keep the raw value for non-URL scopes */
  }
  return `${scope}|${permission}`;
}

export function setPermissionEmitter(fn: (channel: string, ...args: unknown[]) => void): void {
  emit = fn;
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}

function describe(kind: PermissionKind, mediaTypes: string[]): { label: string; detail: string } {
  const wantsAudio = mediaTypes.includes('audio');
  const wantsVideo = mediaTypes.includes('video');
  switch (kind) {
    case 'media':
      if (wantsVideo && wantsAudio) return { label: 'Camera and microphone', detail: 'This site wants to use your camera and microphone.' };
      if (wantsVideo) return { label: 'Camera', detail: 'This site wants to use your camera.' };
      if (wantsAudio) return { label: 'Microphone', detail: 'This site wants to use your microphone.' };
      return { label: 'Camera and microphone', detail: 'This site wants to use your camera and microphone.' };
    case 'geolocation':
      return { label: 'Location', detail: 'This site wants to know your location.' };
    case 'notifications':
      return { label: 'Notifications', detail: 'This site wants to show you notifications.' };
    case 'clipboard-read':
      return { label: 'Clipboard', detail: 'This site wants to read from your clipboard.' };
    case 'midi':
      return { label: 'MIDI devices', detail: 'This site wants to use your MIDI devices.' };
    case 'display-capture':
      return { label: 'Screen sharing', detail: 'This site wants to capture your screen.' };
    default:
      return { label: 'Permission', detail: 'This site is requesting access.' };
  }
}

export function attachPermissionHandlers(ses: Electron.Session, tabId: string): void {
  try {
    ses.setPermissionRequestHandler((_wc, permission, callback, details) => {
      const kind = PROMPT_KINDS[permission];
      if (!kind) {
        callback(ALLOW_SILENTLY.has(permission));
        return;
      }
      const originUrl = details?.requestingUrl ?? '';
      const remembered = decisions.get(decisionKey(originUrl, permission));
      if (remembered !== undefined) {
        callback(remembered);
        return;
      }
      const mediaTypes = (details as unknown as { mediaTypes?: string[] } | undefined)?.mediaTypes ?? [];
      const { label, detail: desc } = describe(kind, mediaTypes);
      const id = randomUUID();
      const request: PermissionRequestInfo = {
        id,
        tabId,
        origin: originUrl,
        host: hostOf(originUrl) || originUrl,
        kind,
        label,
        detail: desc,
      };
      const timer = setTimeout(() => {
        const cb = pending.get(id);
        if (cb) {
          pending.delete(id);
          cb(false);
        }
      }, TIMEOUT_MS);
      pending.set(id, (allow) => {
        clearTimeout(timer);
        decisions.set(decisionKey(originUrl, permission), allow);
        callback(allow);
      });
      emit('browser:permission-request', request);
    });
    ses.setPermissionCheckHandler((_wc, permission, requestingOrigin) =>
      decisions.get(decisionKey(requestingOrigin, permission)) ?? false,
    );
  } catch {
    /* session may not support handlers */
  }
}

export function respondPermission(id: string, allow: boolean): void {
  const cb = pending.get(id);
  if (!cb) return;
  pending.delete(id);
  cb(allow);
}

export function denyAllPending(): void {
  for (const [, cb] of pending) cb(false);
  pending.clear();
}

/** Denies any in-flight prompts and forgets remembered answers. */
export function resetPermissionMemory(): void {
  denyAllPending();
  decisions.clear();
}
