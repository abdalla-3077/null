import Store from 'electron-store';
import type { StudySnapshot } from '../shared/types';

const MIN_MS = 60 * 1000;
const MIN_MS_INTERVAL = 10 * 1000;
const MAX_MS = 8 * 60 * 60 * 1000;

function clampMs(ms: number, min = MIN_MS): number {
  if (!Number.isFinite(ms)) return 25 * 60 * 1000;
  return Math.min(MAX_MS, Math.max(min, Math.round(ms)));
}

function num(v: unknown, fb: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fb;
}

interface Persisted {
  mode?: StudySnapshot['mode'];
  face?: StudySnapshot['face'];
  hue?: StudySnapshot['hue'];
  label?: string;
  totalMs?: number;
  pausedMs?: number;
  endsAt?: number | null;
  swAccumMs?: number;
  focusMs?: number;
  shortMs?: number;
  longMs?: number;
  rounds?: number;
  round?: number;
  phase?: StudySnapshot['phase'];
  workMs?: number;
  restMs?: number;
  iRounds?: number;
  iRound?: number;
  iPhase?: StudySnapshot['iPhase'];
  examTargetAt?: number | null;
  status?: StudySnapshot['status'];
  sessions?: number;
  history?: StudySnapshot['history'];
  soundOn?: boolean;
}

const store = new Store<Persisted>({ name: 'study' });

let emit: (channel: string, ...args: unknown[]) => void = () => undefined;
export function setStudyEmitter(fn: (channel: string, ...args: unknown[]) => void): void {
  emit = fn;
}

const MODES: StudySnapshot['mode'][] = ['focus', 'pomodoro', 'interval', 'countdown', 'exam', 'stopwatch'];

const s: StudySnapshot = {
  mode: 'focus',
  status: 'idle',
  face: 'ring',
  hue: 'auto',
  label: '',
  totalMs: 25 * 60 * 1000,
  endsAt: null,
  pausedMs: 25 * 60 * 1000,
  swAccumMs: 0,
  swStartedAt: null,
  focusMs: 25 * 60 * 1000,
  shortMs: 5 * 60 * 1000,
  longMs: 15 * 60 * 1000,
  rounds: 4,
  round: 1,
  phase: 'focus',
  workMs: 25 * 60 * 1000,
  restMs: 5 * 60 * 1000,
  iRounds: 4,
  iRound: 1,
  iPhase: 'work',
  examTargetAt: null,
  examDone: false,
  sessions: 0,
  history: [],
  soundOn: true,
};

function loadPersisted(): void {
  let d: Persisted;
  try {
    d = store.store;
  } catch {
    return;
  }
  if (d.mode && MODES.includes(d.mode)) s.mode = d.mode;
  if (d.face) s.face = d.face;
  if (d.hue) s.hue = d.hue;
  if (typeof d.label === 'string') s.label = d.label.slice(0, 80);
  if (typeof d.totalMs === 'number') s.totalMs = clampMs(d.totalMs);
  if (typeof d.pausedMs === 'number') s.pausedMs = Math.max(0, d.pausedMs);
  if (typeof d.swAccumMs === 'number') s.swAccumMs = Math.max(0, d.swAccumMs);
  if (typeof d.focusMs === 'number') s.focusMs = clampMs(d.focusMs);
  if (typeof d.shortMs === 'number') s.shortMs = clampMs(d.shortMs);
  if (typeof d.longMs === 'number') s.longMs = clampMs(d.longMs);
  if (typeof d.rounds === 'number') s.rounds = Math.min(8, Math.max(2, Math.round(d.rounds)));
  if (typeof d.round === 'number') s.round = Math.max(1, Math.round(d.round));
  if (d.phase) s.phase = d.phase;
  if (typeof d.workMs === 'number') s.workMs = clampMs(d.workMs, MIN_MS_INTERVAL);
  if (typeof d.restMs === 'number') s.restMs = clampMs(d.restMs, MIN_MS_INTERVAL);
  if (typeof d.iRounds === 'number') s.iRounds = Math.min(12, Math.max(1, Math.round(d.iRounds)));
  if (typeof d.iRound === 'number') s.iRound = Math.max(1, Math.round(d.iRound));
  if (d.iPhase) s.iPhase = d.iPhase;
  if (typeof d.examTargetAt === 'number' && d.examTargetAt > 0) s.examTargetAt = d.examTargetAt;
  if (typeof d.sessions === 'number') s.sessions = Math.max(0, Math.round(d.sessions));
  if (Array.isArray(d.history)) s.history = d.history.filter((h) => h && typeof h.at === 'number').slice(0, 30);
  if (typeof d.soundOn === 'boolean') s.soundOn = d.soundOn;
  // A run in progress across a restart resumes paused so no time is silently lost.
  if (d.status === 'running' || d.status === 'paused') {
    s.status = 'paused';
    if (typeof d.endsAt === 'number' && d.endsAt > Date.now()) s.pausedMs = d.endsAt - Date.now();
    else if (typeof d.pausedMs === 'number') s.pausedMs = d.pausedMs;
  } else if (d.status) {
    s.status = d.status;
  }
  s.endsAt = null;
  s.swStartedAt = null;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function persist(): void {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      const { mode, face, hue, label, totalMs, pausedMs, endsAt, swAccumMs, focusMs, shortMs, longMs, rounds, round, phase, workMs, restMs, iRounds, iRound, iPhase, examTargetAt, status, sessions, history, soundOn } = s;
      store.store = { mode, face, hue, label, totalMs, pausedMs, endsAt, swAccumMs, focusMs, shortMs, longMs, rounds, round, phase, workMs, restMs, iRounds, iRound, iPhase, examTargetAt, status, sessions, history, soundOn };
    } catch {
      /* ignore */
    }
  }, 400);
}

export function getStudySnapshot(): StudySnapshot {
  return { ...s, history: [...s.history] };
}

function broadcast(): void {
  persist();
  emit('study:changed', getStudySnapshot());
}

function logSession(mode: string, ms: number): void {
  s.history = [{ at: Date.now(), mode, ms: Math.max(0, Math.round(ms)), label: s.label.slice(0, 80) }, ...s.history].slice(0, 30);
}

function phaseTotalPomo(): number {
  if (s.phase === 'short') return s.shortMs;
  if (s.phase === 'long') return s.longMs;
  return s.focusMs;
}

function finishLive(): void {
  s.status = 'finished';
  s.endsAt = null;
}

function advanceAfterFinish(): void {
  if (s.mode === 'pomodoro') {
    if (s.phase === 'focus') {
      logSession(`Pomodoro ${s.round}/${s.rounds}`, s.totalMs);
      const doneLong = s.round >= s.rounds;
      s.phase = doneLong ? 'long' : 'short';
      s.totalMs = s.phase === 'long' ? s.longMs : s.shortMs;
      s.pausedMs = s.totalMs;
      s.endsAt = Date.now() + s.totalMs;
      s.status = 'running';
      s.sessions += 1;
    } else {
      const wrapped = s.phase === 'long';
      s.phase = 'focus';
      s.round = wrapped ? 1 : s.round + 1;
      s.totalMs = s.focusMs;
      s.pausedMs = s.totalMs;
      s.endsAt = Date.now() + s.totalMs;
      s.status = 'running';
    }
    broadcast();
    return;
  }
  if (s.mode === 'interval') {
    if (s.iPhase === 'work') {
      logSession(`Interval ${s.iRound}/${s.iRounds}`, s.totalMs);
      s.iPhase = 'rest';
      s.totalMs = clampMs(s.restMs, MIN_MS_INTERVAL);
      s.pausedMs = s.totalMs;
      s.endsAt = Date.now() + s.totalMs;
      s.status = 'running';
      s.sessions += 1;
    } else if (s.iRound >= s.iRounds) {
      finishLive();
      s.sessions += 1;
    } else {
      s.iPhase = 'work';
      s.iRound += 1;
      s.totalMs = clampMs(s.workMs, MIN_MS_INTERVAL);
      s.pausedMs = s.totalMs;
      s.endsAt = Date.now() + s.totalMs;
      s.status = 'running';
    }
    broadcast();
    return;
  }
  if (s.mode === 'exam') {
    logSession('Exam countdown', s.totalMs);
    s.examDone = true;
    finishLive();
    s.sessions += 1;
    broadcast();
    return;
  }
  if (s.mode === 'stopwatch') return;
  logSession(s.mode === 'focus' ? 'Focus' : 'Countdown', s.totalMs);
  finishLive();
  s.sessions += 1;
  broadcast();
}

export type StudyAction =
  | 'set-mode'
  | 'set-total'
  | 'start'
  | 'pause'
  | 'resume'
  | 'reset'
  | 'set-face'
  | 'set-hue'
  | 'set-label'
  | 'set-pomodoro'
  | 'set-interval'
  | 'set-exam-target'
  | 'clear-history'
  | 'set-sound';

export function studyCommand(action: StudyAction, args: Record<string, string | number> = {}): StudySnapshot {
  const str = (k: string): string => String(args[k] ?? '');
  switch (action) {
    case 'set-mode': {
      const m = str('mode');
      if (MODES.includes(m as StudySnapshot['mode'])) {
        s.mode = m as StudySnapshot['mode'];
        s.status = 'idle';
        s.endsAt = null;
        s.swAccumMs = 0;
        s.swStartedAt = null;
        if (s.mode === 'pomodoro') {
          s.phase = 'focus';
          s.round = 1;
          s.totalMs = clampMs(s.focusMs);
          s.pausedMs = s.totalMs;
        } else if (s.mode === 'interval') {
          s.iPhase = 'work';
          s.iRound = 1;
          s.totalMs = clampMs(s.workMs, MIN_MS_INTERVAL);
          s.pausedMs = s.totalMs;
        } else if (s.mode === 'exam') {
          s.examDone = false;
        }
      }
      break;
    }
    case 'set-total': {
      const ms = clampMs(num(args.ms, s.totalMs));
      s.totalMs = ms;
      if (s.status === 'idle') s.pausedMs = ms;
      break;
    }
    case 'start': {
      if (s.mode === 'stopwatch') {
        s.swAccumMs = 0;
        s.swStartedAt = Date.now();
        s.status = 'running';
      } else if (s.mode === 'pomodoro') {
        s.totalMs = clampMs(phaseTotalPomo());
        s.pausedMs = s.totalMs;
        s.endsAt = Date.now() + s.totalMs;
        s.status = 'running';
      } else if (s.mode === 'interval') {
        s.totalMs = clampMs(s.iPhase === 'rest' ? s.restMs : s.workMs, MIN_MS_INTERVAL);
        s.pausedMs = s.totalMs;
        s.endsAt = Date.now() + s.totalMs;
        s.status = 'running';
      } else if (s.mode === 'exam') {
        if (s.examTargetAt != null && s.examTargetAt > Date.now()) {
          s.totalMs = s.examTargetAt - Date.now();
          s.pausedMs = s.totalMs;
          s.examDone = false;
          s.endsAt = null;
          s.status = 'running';
        }
      } else {
        const explicit = args.ms !== undefined ? clampMs(num(args.ms, s.totalMs)) : s.totalMs;
        s.totalMs = explicit;
        s.pausedMs = explicit;
        s.endsAt = Date.now() + explicit;
        s.status = 'running';
      }
      break;
    }
    case 'pause': {
      if (s.status !== 'running') break;
      if (s.mode === 'stopwatch' && s.swStartedAt != null) {
        s.swAccumMs += Date.now() - s.swStartedAt;
        s.swStartedAt = null;
        s.status = 'paused';
      } else if (s.mode === 'exam' && s.examTargetAt != null) {
        s.pausedMs = Math.max(0, s.examTargetAt - Date.now());
        s.status = 'paused';
      } else if (s.endsAt != null) {
        s.pausedMs = Math.max(0, s.endsAt - Date.now());
        s.endsAt = null;
        s.status = 'paused';
      }
      break;
    }
    case 'resume': {
      if (s.status !== 'paused') break;
      if (s.mode === 'stopwatch') {
        s.swStartedAt = Date.now();
        s.status = 'running';
      } else if (s.mode === 'exam' && s.examTargetAt != null) {
        const shift = s.pausedMs - Math.max(0, s.examTargetAt - Date.now());
        s.examTargetAt += Math.max(0, shift);
        s.status = 'running';
      } else {
        s.endsAt = Date.now() + s.pausedMs;
        s.status = 'running';
      }
      break;
    }
    case 'reset': {
      if (s.mode === 'stopwatch') {
        const elapsed = s.swStartedAt != null ? s.swAccumMs + (Date.now() - s.swStartedAt) : s.swAccumMs;
        if (elapsed >= 60 * 1000 && (s.status === 'running' || s.status === 'paused')) {
          logSession('Stopwatch', elapsed);
          s.sessions += 1;
        }
        s.swAccumMs = 0;
        s.swStartedAt = null;
        s.status = 'idle';
      } else if (s.mode === 'pomodoro') {
        s.totalMs = clampMs(phaseTotalPomo());
        s.pausedMs = s.totalMs;
        s.endsAt = null;
        s.status = 'idle';
        s.round = 1;
        s.phase = 'focus';
      } else if (s.mode === 'interval') {
        s.totalMs = clampMs(s.workMs, MIN_MS_INTERVAL);
        s.pausedMs = s.totalMs;
        s.endsAt = null;
        s.status = 'idle';
        s.iRound = 1;
        s.iPhase = 'work';
      } else if (s.mode === 'exam') {
        s.endsAt = null;
        s.status = 'idle';
        s.examDone = false;
      } else {
        s.pausedMs = s.totalMs;
        s.endsAt = null;
        s.status = 'idle';
      }
      break;
    }
    case 'set-face': {
      const faces: StudySnapshot['face'][] = ['ring', 'minimal', 'flip', 'bars', 'analog', 'neon', 'dots'];
      const f = str('face');
      if (faces.includes(f as StudySnapshot['face'])) s.face = f as StudySnapshot['face'];
      break;
    }
    case 'set-hue': {
      const hues: StudySnapshot['hue'][] = ['auto', 'cobalt', 'ember', 'violet', 'mint', 'amber', 'rose'];
      const h = str('hue');
      if (hues.includes(h as StudySnapshot['hue'])) s.hue = h as StudySnapshot['hue'];
      break;
    }
    case 'set-label': {
      s.label = str('label').slice(0, 80);
      break;
    }
    case 'set-pomodoro': {
      if (args.focusMs !== undefined) s.focusMs = clampMs(num(args.focusMs, s.focusMs));
      if (args.shortMs !== undefined) s.shortMs = clampMs(num(args.shortMs, s.shortMs));
      if (args.longMs !== undefined) s.longMs = clampMs(num(args.longMs, s.longMs));
      if (args.rounds !== undefined) s.rounds = Math.min(8, Math.max(2, Math.round(num(args.rounds, s.rounds))));
      break;
    }
    case 'set-interval': {
      if (args.workMs !== undefined) s.workMs = clampMs(num(args.workMs, s.workMs), MIN_MS_INTERVAL);
      if (args.restMs !== undefined) s.restMs = clampMs(num(args.restMs, s.restMs), MIN_MS_INTERVAL);
      if (args.rounds !== undefined) s.iRounds = Math.min(12, Math.max(1, Math.round(num(args.rounds, s.iRounds))));
      break;
    }
    case 'set-exam-target': {
      const t = Math.round(num(args.targetAt, 0));
      if (t > 0) {
        s.examTargetAt = t;
        s.examDone = false;
        if (s.status !== 'running' && s.status !== 'paused') s.status = 'idle';
      }
      break;
    }
    case 'clear-history': {
      s.history = [];
      break;
    }
    case 'set-sound': {
      const v = args.on;
      s.soundOn = v === 1 || v === '1' || v === 'true';
      break;
    }
  }
  broadcast();
  return getStudySnapshot();
}

let loopStarted = false;
export function startStudyLoop(): void {
  loadPersisted();
  if (loopStarted) return;
  loopStarted = true;
  setInterval(() => {
    if (s.status !== 'running') return;
    if (s.mode === 'exam') {
      if (s.examTargetAt != null && s.examTargetAt <= Date.now() && !s.examDone) advanceAfterFinish();
      return;
    }
    if (s.mode !== 'stopwatch' && s.endsAt != null && s.endsAt <= Date.now()) {
      advanceAfterFinish();
    }
  }, 250);
}
