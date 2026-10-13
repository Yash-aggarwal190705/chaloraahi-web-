// Pure hold-to-confirm state machine. UI feeds it events; it never reads the clock itself.
export const HOLD_MS = 3000

export type Interrupt = 'release' | 'cancel' | 'leave' | 'lost-capture' | 'blur' | 'hidden' | 'dismiss'
export type HoldState = { phase: 'idle' | 'holding' | 'fired'; startedAt: number; pointerId: number | null }
export type HoldOut = { state: HoldState; fired?: boolean; interrupted?: Interrupt }

export const idleHold = (): HoldState => ({ phase: 'idle', startedAt: 0, pointerId: null })

export function holdStart(s: HoldState, now: number, pointerId: number): HoldOut {
  if (s.phase !== 'idle') return { state: s }
  return { state: { phase: 'holding', startedAt: now, pointerId } }
}

// Progress is derived from elapsed time, never from frame counts.
export const holdProgress = (s: HoldState, now: number, ms = HOLD_MS) =>
  s.phase === 'holding' ? Math.min(1, Math.max(0, (now - s.startedAt) / ms)) : s.phase === 'fired' ? 1 : 0

export const holdSecondsLeft = (s: HoldState, now: number, ms = HOLD_MS) =>
  s.phase === 'holding' ? Math.max(1, Math.ceil((ms - (now - s.startedAt)) / 1000)) : Math.ceil(ms / 1000)

// A frame tick may complete the hold exactly once.
export function holdTick(s: HoldState, now: number, ms = HOLD_MS): HoldOut {
  if (s.phase !== 'holding') return { state: s }
  if (now - s.startedAt >= ms) return { state: { ...s, phase: 'fired' }, fired: true }
  return { state: s }
}

// Any interruption resets and never fires. 'release' ticks first so a release after the
// threshold still counts, but hidden/blur/cancel/leave/lost-capture/dismiss never complete.
export function holdInterrupt(s: HoldState, why: Interrupt, now: number, pointerId?: number | null, ms = HOLD_MS): HoldOut {
  if (s.phase !== 'holding') return { state: s }
  if (pointerId != null && s.pointerId != null && pointerId !== s.pointerId) return { state: s }
  if (why === 'release') {
    const t = holdTick(s, now, ms)
    if (t.fired) return t
  }
  return { state: idleHold(), interrupted: why }
}

export const holdReset = (): HoldState => idleHold()
