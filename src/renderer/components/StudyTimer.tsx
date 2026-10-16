import React from 'react';
import { create } from 'zustand';
import { Icon } from './icons';
import type { StudySnapshot } from '../../shared/types';

export type {
  StudyMode,
  StudyStatus,
  StudyFace,
  StudyHue,
  PomodoroPhase,
  IntervalPhase,
  StudyHistoryEntry,
  StudySnapshot,
} from '../../shared/types';

export const HUES: { id: StudySnapshot['hue']; name: string; css: string | null }[] = [
  { id: 'auto', name: 'Browser', css: null },
  { id: 'cobalt', name: 'Cobalt', css: '#4f7cff' },
  { id: 'ember', name: 'Ember', css: '#e5484d' },
  { id: 'violet', name: 'Violet', css: '#8e7cff' },
  { id: 'mint', name: 'Mint', css: '#30a46c' },
  { id: 'amber', name: 'Amber', css: '#f5a524' },
  { id: 'rose', name: 'Rose', css: '#e93d82' },
];

export function hueStyle(hue: StudySnapshot['hue']): React.CSSProperties {
  const h = HUES.find((x) => x.id === hue);
  if (!h?.css) return {};
  return { ['--study-accent' as string]: h.css } as React.CSSProperties;
}

export function formatClock(ms: number, showHours = false): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = showHours || h > 0 ? String(m).padStart(2, '0') : String(m);
  const ss = String(s).padStart(2, '0');
  if (showHours || h > 0) return `${h}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

/** Adaptive long format for exam countdowns (e.g. "3d 4h", "12m 5s"). */
export function formatLong(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

function beep(ok = true): void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const notes = ok ? [660, 880, 990] : [440, 330];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.16;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.22, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    });
    setTimeout(() => void ctx.close().catch(() => undefined), notes.length * 170 + 200);
  } catch {
    /* audio unavailable */
  }
}

interface StudyMirror extends StudySnapshot {
  now: number;
  panelOpen: boolean;
  miniOpen: boolean;
  set: (p: Partial<StudyMirror>) => void;
}

const SNAPSHOT_KEYS: (keyof StudySnapshot)[] = [
  'mode', 'status', 'face', 'hue', 'label', 'totalMs', 'endsAt', 'pausedMs',
  'swAccumMs', 'swStartedAt', 'focusMs', 'shortMs', 'longMs', 'rounds', 'round', 'phase',
  'workMs', 'restMs', 'iRounds', 'iRound', 'iPhase', 'examTargetAt', 'examDone',
  'sessions', 'history', 'soundOn',
];

export function applySnapshot(snap: StudySnapshot): void {
  const patch: Partial<StudyMirror> = {};
  for (const k of SNAPSHOT_KEYS) {
    (patch as Record<string, unknown>)[k] = snap[k];
  }
  useStudyStore.getState().set(patch);
}

export const useStudyStore = create<StudyMirror>((set) => ({
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
  now: Date.now(),
  panelOpen: false,
  miniOpen: false,
  set: (p) => set(p),
}));

// Chime on finish / phase transitions observed from the main-process engine.
try {
  let prevStatus: string | null = null;
  let prevPhase = '';
  useStudyStore.subscribe((s) => {
    try {
      const phaseKey = `${s.mode}|${s.phase}|${s.round}|${s.iPhase}|${s.iRound}`;
      if (prevStatus !== null && s.soundOn) {
        if (s.status === 'finished' && prevStatus !== 'finished') {
          beep(true);
        } else if (s.status === 'running' && phaseKey !== prevPhase && prevPhase !== '') {
          const onBreak = (s.mode === 'pomodoro' && s.phase !== 'focus') || (s.mode === 'interval' && s.iPhase === 'rest');
          beep(!onBreak);
        }
      }
      prevStatus = s.status;
      prevPhase = phaseKey;
    } catch {
      /* ignore */
    }
  });
} catch {
  /* ignore */
}

function cmd(action: string, args?: Record<string, string | number>): void {
  try {
    void window.nullStudy.command(action, args ?? {}).then((snap) => {
      if (snap) applySnapshot(snap);
    }).catch(() => undefined);
  } catch {
    /* ignore */
  }
}

export function studyRemaining(s: StudyMirror): number {
  if (s.mode === 'exam') {
    if (s.status === 'paused') return Math.max(0, s.pausedMs);
    if (s.examTargetAt == null) return 0;
    return Math.max(0, s.examTargetAt - s.now);
  }
  if (s.status === 'running' && s.endsAt != null) return Math.max(0, s.endsAt - s.now);
  if (s.status === 'paused') return Math.max(0, s.pausedMs);
  if (s.status === 'finished') return 0;
  return s.totalMs;
}

export function studyElapsed(s: StudyMirror): number {
  if (s.mode !== 'stopwatch') return 0;
  const base = s.swAccumMs;
  if (s.status === 'running' && s.swStartedAt != null) return base + (s.now - s.swStartedAt);
  return base;
}

export function studyProgress(s: StudyMirror): number {
  if (s.mode === 'stopwatch') return 0;
  if (s.totalMs <= 0) return 0;
  return Math.min(1, Math.max(0, 1 - studyRemaining(s) / s.totalMs));
}

export function startRun(totalMs?: number): void {
  if (totalMs !== undefined) cmd('start', { ms: Math.round(totalMs) });
  else cmd('start', {});
}

export function startPomodoroPhase(): void {
  cmd('start', {});
}

export function startIntervalPhase(): void {
  cmd('start', {});
}

export function startExam(): void {
  cmd('start', {});
}

export function pauseRun(): void {
  cmd('pause', {});
}

export function resumeRun(): void {
  cmd('resume', {});
}

export function resetRun(): void {
  cmd('reset', {});
}

/** Ticks the local clock for smooth display; must be mounted once. */
export function StudyTicker(): React.ReactElement {
  const status = useStudyStore((s) => s.status);
  const mode = useStudyStore((s) => s.mode);
  React.useEffect(() => {
    try {
      void window.nullStudy.get().then((snap) => {
        if (snap) applySnapshot(snap);
      }).catch(() => undefined);
    } catch {
      /* ignore */
    }
    const id = setInterval(() => {
      useStudyStore.getState().set({ now: Date.now() });
    }, 250);
    return () => clearInterval(id);
  }, []);
  void status;
  void mode;
  React.useEffect(() => {
    const st = useStudyStore.getState();
    if (st.status === 'running' || st.status === 'paused') {
      const parts: string[] = [];
      if (st.mode === 'stopwatch') parts.push(formatClock(studyElapsed(st), true));
      else if (st.mode === 'exam') parts.push(formatLong(studyRemaining(st)));
      else parts.push(formatClock(studyRemaining(st), true));
      if (st.mode === 'pomodoro') parts.push(st.phase === 'focus' ? 'Focus' : st.phase === 'long' ? 'Long break' : 'Break');
      else if (st.mode === 'interval') parts.push(st.iPhase === 'work' ? `Work ${st.iRound}/${st.iRounds}` : `Rest ${st.iRound}/${st.iRounds}`);
      else parts.push('Study');
      parts.push('— Null');
      document.title = parts.join(' ');
    } else if (document.title.endsWith('— Null') && document.title !== 'Null') {
      document.title = 'Null';
    }
  });
  return <></>;
}

export function modeName(mode: StudySnapshot['mode']): string {
  if (mode === 'pomodoro') return 'Pomodoro';
  if (mode === 'interval') return 'Interval';
  if (mode === 'countdown') return 'Countdown';
  if (mode === 'exam') return 'Exam countdown';
  if (mode === 'stopwatch') return 'Stopwatch';
  return 'Focus';
}

function phaseLabel(s: StudyMirror): string {
  if (s.mode === 'pomodoro') {
    if (s.phase === 'focus') return `Focus · Round ${s.round}/${s.rounds}`;
    if (s.phase === 'long') return 'Long break';
    return 'Short break';
  }
  if (s.mode === 'interval') {
    return s.iPhase === 'work' ? `Work · Round ${s.iRound}/${s.iRounds}` : `Rest · Round ${s.iRound}/${s.iRounds}`;
  }
  if (s.mode === 'exam') {
    if (s.examTargetAt == null) return 'Pick a date to count down to';
    try {
      return `Target · ${new Date(s.examTargetAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return 'Exam countdown';
    }
  }
  return '';
}

export function chipText(s: StudyMirror): string {
  if (s.mode === 'stopwatch') return formatClock(studyElapsed(s));
  if (s.mode === 'exam') return s.examTargetAt == null ? '' : formatLong(studyRemaining(s));
  return formatClock(studyRemaining(s));
}

export function StudyChip(): React.ReactElement {
  const status = useStudyStore((s) => s.status);
  const mode = useStudyStore((s) => s.mode);
  const hue = useStudyStore((s) => s.hue);
  const now = useStudyStore((s) => s.now);
  const set = useStudyStore((s) => s.set);
  void now;
  const s = useStudyStore.getState();
  const active = status === 'running' || status === 'paused' || status === 'finished';
  const text = chipText(s);
  return (
    <button
      className={`icon-btn study-chip-btn${active ? ' study-live' : ''}`}
      style={hueStyle(hue)}
      title={active ? `Study timer ${text} (${modeName(mode)}, ${status}) — open Study Mode` : 'Open Study Mode (timer)'}
      aria-label={active ? `Study timer ${text}, ${modeName(mode)}, ${status}. Open Study Mode` : 'Open Study Mode timer'}
      onClick={() => set({ panelOpen: true })}
    >
      <Icon name="timer" size={15} />
      {active && text && (
        <span className="study-chip-time" aria-hidden>
          {text}
        </span>
      )}
      {status === 'running' && <span className="study-dot running" aria-hidden />}
      {status === 'paused' && <span className="study-dot paused" aria-hidden />}
      {status === 'finished' && <span className="study-dot finished" aria-hidden />}
    </button>
  );
}

function FaceRing({ remaining, total, status }: { remaining: number; total: number; status: StudySnapshot['status'] }): React.ReactElement {
  const r = 84;
  const c = 2 * Math.PI * r;
  const p = total > 0 ? Math.min(1, Math.max(0, 1 - remaining / total)) : 0;
  return (
    <div className="study-face study-ring" role="img" aria-label={`Timer, ${formatLong(remaining)} remaining`}>
      <svg viewBox="0 0 200 200" width={220} height={220} aria-hidden>
        <circle cx={100} cy={100} r={r} fill="none" stroke="var(--border)" strokeWidth={11} />
        <circle
          cx={100}
          cy={100}
          r={r}
          fill="none"
          stroke={status === 'finished' ? 'var(--success)' : 'var(--study-accent, var(--accent))'}
          strokeWidth={11}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p)}
          transform="rotate(-90 100 100)"
          style={{ transition: 'stroke-dashoffset 0.3s linear, stroke 0.3s ease' }}
        />
      </svg>
      <div className="study-ring-center">
        <span className="study-big">{formatClock(remaining)}</span>
        <span className="study-sub">{status === 'finished' ? 'Done — nice work' : status}</span>
      </div>
    </div>
  );
}

function FaceMinimal({ remaining, status, long }: { remaining: number; status: StudySnapshot['status']; long?: boolean }): React.ReactElement {
  return (
    <div className="study-face study-minimal" role="img" aria-label={`Timer, ${formatLong(remaining)} remaining`}>
      <span className="study-huge">{long ? formatLong(remaining) : formatClock(remaining, true)}</span>
      <span className="study-sub">{status === 'finished' ? 'Done — nice work' : status}</span>
    </div>
  );
}

function FaceFlip({ remaining }: { remaining: number }): React.ReactElement {
  const total = Math.max(0, Math.ceil(remaining / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const cells: [string, string][] = [
    [String(h).padStart(2, '0'), 'hrs'],
    [String(m).padStart(2, '0'), 'min'],
    [String(s).padStart(2, '0'), 'sec'],
  ];
  return (
    <div className="study-face study-flip" role="img" aria-label={`Timer, ${formatLong(remaining)} remaining`}>
      {cells.map(([v, l]) => (
        <div className="flip-cell" key={l}>
          <span className="flip-num">{v}</span>
          <span className="flip-label">{l}</span>
        </div>
      ))}
    </div>
  );
}

function FaceBars({ remaining, total, status }: { remaining: number; total: number; status: StudySnapshot['status'] }): React.ReactElement {
  const segs = 24;
  const p = total > 0 ? Math.min(1, Math.max(0, 1 - remaining / total)) : 0;
  const lit = Math.round(p * segs);
  return (
    <div className="study-face study-bars" role="img" aria-label={`Timer, ${formatLong(remaining)} remaining, ${Math.round(p * 100)} percent elapsed`}>
      <span className="study-huge">{formatClock(remaining)}</span>
      <div className="bars-row" aria-hidden>
        {Array.from({ length: segs }, (_, i) => (
          <i key={i} className={i < lit ? 'on' : ''} />
        ))}
      </div>
      <span className="study-sub">{status === 'finished' ? 'Done — nice work' : `${Math.round(p * 100)}% elapsed · ${status}`}</span>
    </div>
  );
}

function FaceAnalog({ remaining, total, status }: { remaining: number; total: number; status: StudySnapshot['status'] }): React.ReactElement {
  const p = total > 0 ? Math.min(1, Math.max(0, 1 - remaining / total)) : 0;
  const secs = Math.ceil(remaining / 1000);
  const secAngle = ((secs % 60) / 60) * 360;
  const minAngle = p * 360;
  const ticks = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <div className="study-face study-analog" role="img" aria-label={`Timer, ${formatLong(remaining)} remaining`}>
      <svg viewBox="0 0 200 200" width={210} height={210} aria-hidden>
        <circle cx={100} cy={100} r={92} fill="var(--surface)" stroke="var(--border-strong)" strokeWidth={2} />
        {ticks.map((a) => (
          <line
            key={a}
            x1={100}
            y1={14}
            x2={100}
            y2={a % 90 === 0 ? 28 : 22}
            stroke="var(--muted)"
            strokeWidth={a % 90 === 0 ? 3 : 1.5}
            strokeLinecap="round"
            transform={`rotate(${a} 100 100)`}
          />
        ))}
        <line x1={100} y1={100} x2={100} y2={44} stroke="var(--study-accent, var(--accent))" strokeWidth={5} strokeLinecap="round" transform={`rotate(${minAngle} 100 100)`} />
        <line x1={100} y1={100} x2={100} y2={30} stroke="var(--danger)" strokeWidth={2} strokeLinecap="round" transform={`rotate(${secAngle} 100 100)`} />
        <circle cx={100} cy={100} r={6} fill="var(--study-accent, var(--accent))" />
      </svg>
      <span className="study-big">{formatClock(remaining)}</span>
      <span className="study-sub">{status === 'finished' ? 'Done — nice work' : status}</span>
    </div>
  );
}

function FaceNeon({ remaining, total, status }: { remaining: number; total: number; status: StudySnapshot['status'] }): React.ReactElement {
  const p = total > 0 ? Math.min(1, Math.max(0, 1 - remaining / total)) : 0;
  return (
    <div className="study-face study-neon" role="img" aria-label={`Timer, ${formatLong(remaining)} remaining`}>
      <span className="study-neon-time">{formatClock(remaining, true)}</span>
      <div className="neon-track" aria-hidden>
        <i style={{ width: `${Math.round(p * 100)}%` }} />
      </div>
      <span className="study-sub">{status === 'finished' ? 'Done — nice work' : `${Math.round(p * 100)}% · ${status}`}</span>
    </div>
  );
}

function FaceDots({ remaining, total, status }: { remaining: number; total: number; status: StudySnapshot['status'] }): React.ReactElement {
  const cells = 48;
  const p = total > 0 ? Math.min(1, Math.max(0, 1 - remaining / total)) : 0;
  const lit = Math.round(p * cells);
  return (
    <div className="study-face study-dots" role="img" aria-label={`Timer, ${formatLong(remaining)} remaining`}>
      <span className="study-huge">{formatClock(remaining)}</span>
      <div className="dots-grid" aria-hidden>
        {Array.from({ length: cells }, (_, i) => (
          <i key={i} className={i < lit ? 'on' : ''} />
        ))}
      </div>
      <span className="study-sub">{status === 'finished' ? 'Done — nice work' : status}</span>
    </div>
  );
}

const PRESETS = [15, 25, 50, 90];
const MODES: StudySnapshot['mode'][] = ['focus', 'pomodoro', 'interval', 'countdown', 'exam', 'stopwatch'];
const FACES: StudySnapshot['face'][] = ['ring', 'minimal', 'flip', 'bars', 'analog', 'neon', 'dots'];
const FACE_NAMES: Record<StudySnapshot['face'], string> = {
  ring: 'Ring',
  minimal: 'Minimal',
  flip: 'Flip',
  bars: 'Bars',
  analog: 'Analog',
  neon: 'Neon',
  dots: 'Dots',
};

function toLocalInput(ts: number | null): string {
  if (ts == null) return '';
  const d = new Date(ts);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function StudyPanel(): React.ReactElement | null {
  const open = useStudyStore((s) => s.panelOpen);
  const mode = useStudyStore((s) => s.mode);
  const status = useStudyStore((s) => s.status);
  const face = useStudyStore((s) => s.face);
  const hue = useStudyStore((s) => s.hue);
  const label = useStudyStore((s) => s.label);
  const totalMs = useStudyStore((s) => s.totalMs);
  const sessions = useStudyStore((s) => s.sessions);
  const history = useStudyStore((s) => s.history);
  const soundOn = useStudyStore((s) => s.soundOn);
  const now = useStudyStore((s) => s.now);
  const set = useStudyStore((s) => s.set);
  const [custom, setCustom] = React.useState('45');
  void now;

  const onKey = (e: React.KeyboardEvent): void => {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
    if (e.code === 'Space') {
      e.preventDefault();
      const st = useStudyStore.getState();
      if (st.status === 'running') pauseRun();
      else if (st.status === 'paused') resumeRun();
      else primaryAction();
    } else if (e.key === 'r' || e.key === 'R') {
      resetRun();
    }
  };

  if (!open) return null;
  const s = useStudyStore.getState();
  const remaining = studyRemaining(s);
  const elapsed = studyElapsed(s);
  const faceValue = s.mode === 'stopwatch' ? elapsed : remaining;
  const faceTotal = s.mode === 'stopwatch' ? 0 : s.totalMs;
  const isExam = s.mode === 'exam';
  const examValid = s.examTargetAt != null && s.examTargetAt > Date.now();
  const close = (): void => {
    // Closing the page keeps the timer alive as a floating popup.
    const st = useStudyStore.getState();
    const stillLive = st.status === 'running' || st.status === 'paused';
    set({ panelOpen: false, miniOpen: stillLive ? true : st.miniOpen });
  };
  const setMode = (m: StudySnapshot['mode']): void => {
    cmd('set-mode', { mode: m });
  };
  const primaryAction = (): void => {
    const st = useStudyStore.getState();
    if ((st.mode === 'focus' || st.mode === 'countdown') && st.status !== 'paused') {
      startRun(st.totalMs);
    } else {
      startRun();
    }
  };
  const startCustom = (): void => {
    const mins = Math.round(Number(custom));
    if (!Number.isFinite(mins) || mins < 1 || mins > 480) return;
    startRun(mins * 60 * 1000);
  };
  const primaryDisabled = isExam && s.status !== 'running' && s.status !== 'paused' && !examValid;
  const openStudyTab = (): void => {
    try {
      void window.nullBrowser.createTab('null://study');
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Study Mode" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="dialog study-dialog" style={hueStyle(hue)} onKeyDown={onKey}>
        <div className="dialog-head">
          <span className="hist-head-icon" aria-hidden>
            <Icon name="timer" size={17} />
          </span>
          <div className="settings-title-wrap">
            <h2>Study Mode</h2>
            <p>
              {modeName(mode)}{phaseLabel(s) ? ` · ${phaseLabel(s)}` : ''}
              {sessions > 0 ? ` · ${sessions} session${sessions === 1 ? '' : 's'} done` : ''}
            </p>
          </div>
          <button
            className="icon-btn"
            title="Open the full study tab"
            aria-label="Open the full study tab"
            onClick={openStudyTab}
          >
            <Icon name="external" size={15} />
          </button>
          <button className="icon-btn" aria-label="Close Study Mode (timer keeps running)" onClick={close}>
            <Icon name="close" size={15} />
          </button>
        </div>

        <div className="study-modes" role="tablist" aria-label="Timer mode">
          {MODES.map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              className={`study-tab${mode === m ? ' active' : ''}`}
              onClick={() => setMode(m)}
            >
              {modeName(m)}
            </button>
          ))}
        </div>

        <div className="study-cols">
          <div className="study-col-main">
            <div className="study-stage">
              {face === 'ring' && <FaceRing remaining={faceValue} total={faceTotal} status={status} />}
              {face === 'minimal' && <FaceMinimal remaining={faceValue} status={status} long={isExam} />}
              {face === 'flip' && <FaceFlip remaining={faceValue} />}
              {face === 'bars' && <FaceBars remaining={faceValue} total={faceTotal} status={status} />}
              {face === 'analog' && <FaceAnalog remaining={faceValue} total={faceTotal} status={status} />}
              {face === 'neon' && <FaceNeon remaining={faceValue} total={faceTotal} status={status} />}
              {face === 'dots' && <FaceDots remaining={faceValue} total={faceTotal} status={status} />}
              {label.trim() && <p className="study-label">“{label.trim()}”</p>}
            </div>

            <div className="study-controls">
              {status === 'idle' || status === 'finished' ? (
                <button className="btn primary" disabled={primaryDisabled} onClick={primaryAction}>
                  <Icon name="play" size={14} /> {status === 'finished' ? 'Start again' : mode === 'stopwatch' ? 'Start stopwatch' : 'Start'}
                </button>
              ) : status === 'running' ? (
                <button className="btn primary" onClick={pauseRun}>
                  <Icon name="pause" size={14} /> Pause
                </button>
              ) : (
                <button className="btn primary" onClick={resumeRun}>
                  <Icon name="play" size={14} /> Resume
                </button>
              )}
              <button className="btn" onClick={resetRun} disabled={status === 'idle'}>
                Reset
              </button>
              <button
                className="btn ghost"
                title={soundOn ? 'Mute finish chime' : 'Play finish chime'}
                aria-pressed={soundOn}
                onClick={() => cmd('set-sound', { on: soundOn ? 0 : 1 })}
              >
                <Icon name={soundOn ? 'bell' : 'volumeX'} size={14} /> {soundOn ? 'Chime on' : 'Muted'}
              </button>
            </div>
            <p className="study-hint study-keys"><kbd className="kbd">Space</kbd> start / pause · <kbd className="kbd">R</kbd> reset · <kbd className="kbd">Esc</kbd> pop out</p>
          </div>

          <div className="study-col-side">
            {(mode === 'focus' || mode === 'countdown') && (
              <section className="study-card" aria-label="Duration">
                <h3>Duration</h3>
                <div className="study-preset-row">
                  {PRESETS.map((m) => (
                    <button
                      key={m}
                      className={`study-preset${totalMs === m * 60 * 1000 && status === 'idle' ? ' active' : ''}`}
                      onClick={() => cmd('set-total', { ms: m * 60 * 1000 })}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
                <span className="study-custom">
                  <input
                    type="number"
                    min={1}
                    max={480}
                    value={custom}
                    aria-label="Custom minutes"
                    onChange={(e) => setCustom(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') startCustom(); }}
                  />
                  <button className="btn" onClick={startCustom}>Start</button>
                </span>
              </section>
            )}

            {mode === 'pomodoro' && (
              <PomodoroCard />
            )}

            {mode === 'interval' && (
              <IntervalCard />
            )}

            {mode === 'exam' && (
              <section className="study-card" aria-label="Exam countdown setup">
                <h3>Exam date</h3>
                <input
                  type="datetime-local"
                  className="study-datetime"
                  aria-label="Exam date and time"
                  value={toLocalInput(s.examTargetAt)}
                  min={toLocalInput(Date.now())}
                  disabled={status === 'running' || status === 'paused'}
                  onChange={(e) => {
                    const t = new Date(e.target.value).getTime();
                    if (Number.isFinite(t)) cmd('set-exam-target', { targetAt: t });
                  }}
                />
                <p className="study-hint">
                  {s.examTargetAt == null
                    ? 'Pick the moment you need to be ready for.'
                    : examValid || status !== 'idle'
                      ? `Counting down to ${new Date(s.examTargetAt).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}.`
                      : 'That moment has passed — pick a future date.'}
                </p>
              </section>
            )}

            {mode === 'stopwatch' && (
              <section className="study-card" aria-label="About stopwatch">
                <h3>Stopwatch</h3>
                <p className="study-hint">Open-ended timing for flow sessions. Stopping after 60+ seconds logs it to your history automatically.</p>
              </section>
            )}

            <section className="study-card" aria-label="Session label">
              <h3>Label</h3>
              <div className="field" style={{ margin: 0 }}>
                <label className="sr-only" htmlFor="study-label">Session label</label>
                <input
                  id="study-label"
                  type="text"
                  placeholder="e.g. Maths chapter 4"
                  value={label}
                  maxLength={80}
                  onChange={(e) => cmd('set-label', { label: e.target.value })}
                />
              </div>
            </section>

            <section className="study-card" aria-label="Appearance">
              <h3>Face</h3>
              <div className="study-face-row" role="radiogroup" aria-label="Timer face">
                {FACES.map((f) => (
                  <button
                    key={f}
                    role="radio"
                    aria-checked={face === f}
                    className={`study-face-opt${face === f ? ' active' : ''}`}
                    onClick={() => cmd('set-face', { face: f })}
                  >
                    {FACE_NAMES[f]}
                  </button>
                ))}
              </div>
              <h3 style={{ marginTop: 12 }}>Accent</h3>
              <div className="study-hue-row" role="radiogroup" aria-label="Timer accent color">
                {HUES.map((h) => (
                  <button
                    key={h.id}
                    role="radio"
                    aria-checked={hue === h.id}
                    title={h.id === 'auto' ? 'Follow browser theme' : h.name}
                    aria-label={h.id === 'auto' ? 'Follow browser theme' : `${h.name} accent`}
                    className={`study-hue${hue === h.id ? ' active' : ''}${h.id === 'auto' ? ' auto' : ''}`}
                    style={h.css ? { background: h.css } : undefined}
                    onClick={() => cmd('set-hue', { hue: h.id })}
                  />
                ))}
              </div>
              <p className="study-hint">Browser follows your Graphite / Cobalt / Ember shell automatically.</p>
            </section>

            <section className="study-card" aria-label="Session history">
              <div className="study-hist-head">
                <h3>History</h3>
                {history.length > 0 && (
                  <button className="btn ghost study-clear" onClick={() => cmd('clear-history', {})}>Clear</button>
                )}
              </div>
              {history.length === 0 ? (
                <p className="study-hint">Finished sessions land here.</p>
              ) : (
                <ul className="study-hist">
                  {history.slice(0, 8).map((h, i) => (
                    <li key={`${h.at}-${i}`}>
                      <span className="study-hist-main">
                        <b>{h.label || h.mode}</b>
                        <small>{h.label ? `${h.mode} · ` : ''}{formatLong(h.ms)}</small>
                      </span>
                      <span className="study-hist-at">
                        {new Date(h.at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>

        <div className="study-foot">
          <p className="study-hint" style={{ margin: 0 }}>Closing this page never stops the timer — it shrinks to a floating popup.</p>
          <button className="btn" onClick={openStudyTab} title="Open the timer as a full tab">
            <Icon name="external" size={14} /> Open study tab
          </button>
        </div>
      </div>
    </div>
  );
}

function PomodoroCard(): React.ReactElement {
  const focusMs = useStudyStore((s) => s.focusMs);
  const shortMs = useStudyStore((s) => s.shortMs);
  const longMs = useStudyStore((s) => s.longMs);
  const rounds = useStudyStore((s) => s.rounds);
  const status = useStudyStore((s) => s.status);
  const locked = status === 'running' || status === 'paused';
  return (
    <section className="study-card" aria-label="Pomodoro setup">
      <h3>Pomodoro</h3>
      <div className="study-pomo-grid">
        <label>Focus (min)
          <input
            type="number" min={1} max={180} value={Math.round(focusMs / 60000)}
            disabled={locked}
            onChange={(e) => cmd('set-pomodoro', { focusMs: Math.round(Number(e.target.value) * 60000) })}
          />
        </label>
        <label>Short (min)
          <input
            type="number" min={1} max={60} value={Math.round(shortMs / 60000)}
            disabled={locked}
            onChange={(e) => cmd('set-pomodoro', { shortMs: Math.round(Number(e.target.value) * 60000) })}
          />
        </label>
        <label>Long (min)
          <input
            type="number" min={1} max={90} value={Math.round(longMs / 60000)}
            disabled={locked}
            onChange={(e) => cmd('set-pomodoro', { longMs: Math.round(Number(e.target.value) * 60000) })}
          />
        </label>
        <label>Rounds
          <input
            type="number" min={2} max={8} value={rounds}
            disabled={locked}
            onChange={(e) => cmd('set-pomodoro', { rounds: Math.round(Number(e.target.value) || 4) })}
          />
        </label>
      </div>
      <p className="study-hint">Every {rounds}th focus earns a long break. Phases advance automatically.</p>
    </section>
  );
}

function IntervalCard(): React.ReactElement {
  const workMs = useStudyStore((s) => s.workMs);
  const restMs = useStudyStore((s) => s.restMs);
  const iRounds = useStudyStore((s) => s.iRounds);
  const status = useStudyStore((s) => s.status);
  const locked = status === 'running' || status === 'paused';
  return (
    <section className="study-card" aria-label="Interval setup">
      <h3>Interval training</h3>
      <div className="study-pomo-grid study-grid-3">
        <label>Work (min)
          <input
            type="number" min={0.5} max={180} step={0.5} value={workMs / 60000}
            disabled={locked}
            onChange={(e) => cmd('set-interval', { workMs: Math.round(Number(e.target.value) * 60000) })}
          />
        </label>
        <label>Rest (min)
          <input
            type="number" min={0.5} max={60} step={0.5} value={restMs / 60000}
            disabled={locked}
            onChange={(e) => cmd('set-interval', { restMs: Math.round(Number(e.target.value) * 60000) })}
          />
        </label>
        <label>Rounds
          <input
            type="number" min={1} max={12} value={iRounds}
            disabled={locked}
            onChange={(e) => cmd('set-interval', { rounds: Math.round(Number(e.target.value) || 4) })}
          />
        </label>
      </div>
      <p className="study-hint">Work → rest repeats {iRounds}× and advances automatically. Good for drills and workouts.</p>
    </section>
  );
}

export function StudyMini(): React.ReactElement | null {
  const miniOpen = useStudyStore((s) => s.miniOpen);
  const panelOpen = useStudyStore((s) => s.panelOpen);
  const status = useStudyStore((s) => s.status);
  const mode = useStudyStore((s) => s.mode);
  const hue = useStudyStore((s) => s.hue);
  const now = useStudyStore((s) => s.now);
  const set = useStudyStore((s) => s.set);
  const [pos, setPos] = React.useState({ x: 0, y: 0 });
  const drag = React.useRef<{ dx: number; dy: number } | null>(null);
  void now;

  if (!miniOpen || panelOpen) return null;
  const s = useStudyStore.getState();
  const live = status === 'running' || status === 'paused' || status === 'finished';
  const text = mode === 'exam' && s.examTargetAt != null ? formatLong(studyRemaining(s)) : chipText(s);
  const p = studyProgress(s);
  const r = 9;
  const c = 2 * Math.PI * r;
  const sub =
    mode === 'pomodoro'
      ? s.phase === 'focus'
        ? `F${s.round}/${s.rounds}`
        : 'Break'
      : mode === 'interval'
        ? s.iPhase === 'work'
          ? `W${s.iRound}/${s.iRounds}`
          : `R${s.iRound}/${s.iRounds}`
        : modeName(mode);

  return (
    <div
      className="study-mini"
      role="status"
      style={{ ...hueStyle(hue), transform: pos.x || pos.y ? `translate(${pos.x}px, ${pos.y}px)` : undefined }}
      aria-label={`Study timer mini popup, ${text}, ${status}`}
    >
      <button
        className="study-mini-grip"
        aria-label="Drag mini timer"
        onMouseDown={(e) => {
          drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
          const move = (ev: MouseEvent): void => {
            if (!drag.current) return;
            setPos({ x: ev.clientX - drag.current.dx, y: ev.clientY - drag.current.dy });
          };
          const up = (): void => {
            drag.current = null;
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
          };
          window.addEventListener('mousemove', move);
          window.addEventListener('mouseup', up);
        }}
      >
        <Icon name="command" size={12} />
      </button>
      <button
        className="study-mini-time"
        title={`Expand Study Mode (${sub})`}
        aria-label={`Expand Study Mode, ${text}`}
        onClick={() => set({ panelOpen: true })}
      >
        {mode === 'stopwatch' || !live ? (
          <Icon name="timer" size={14} />
        ) : (
          <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden>
            <circle cx={12} cy={12} r={r} fill="none" stroke="var(--border)" strokeWidth={3} />
            <circle
              cx={12}
              cy={12}
              r={r}
              fill="none"
              stroke="var(--study-accent, var(--accent))"
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - p)}
              transform="rotate(-90 12 12)"
            />
          </svg>
        )}
        <span>{live && text ? text : 'Study'}</span>
        {status === 'running' && <span className="study-dot running" aria-hidden />}
        {status === 'paused' && <span className="study-dot paused" aria-hidden />}
      </button>
      <span className="study-mini-sub" aria-hidden>
        {sub}
      </span>
      {live && status !== 'finished' && (
        <button
          className="icon-btn study-mini-btn"
          title={status === 'running' ? 'Pause' : 'Resume'}
          aria-label={status === 'running' ? 'Pause timer' : 'Resume timer'}
          onClick={() => (status === 'running' ? pauseRun() : resumeRun())}
        >
          <Icon name={status === 'running' ? 'pause' : 'play'} size={13} />
        </button>
      )}
      <button
        className="icon-btn study-mini-btn"
        title="Expand"
        aria-label="Expand Study Mode"
        onClick={() => set({ panelOpen: true })}
      >
        <Icon name="chevronUp" size={13} />
      </button>
      <button
        className="icon-btn study-mini-btn"
        title="Hide popup (timer keeps running)"
        aria-label="Hide mini timer popup"
        onClick={() => set({ miniOpen: false })}
      >
        <Icon name="close" size={13} />
      </button>
    </div>
  );
}
