import { useCallback, useEffect, useRef, useState } from 'react'
import { fullPhone, parsePhone, type Contact } from './CommonData'

// ── Types ────────────────────────────────────────────────────────────────────

export type SOSScreen = 'sos-confirm' | 'sos-holding' | 'sos-active' | 'sos-calling' | 'sos-shared' | 'sos-cancel-confirm' | 'sos-ended'
export const SOS_SCREENS: SOSScreen[] = ['sos-confirm', 'sos-holding', 'sos-active', 'sos-calling', 'sos-shared', 'sos-cancel-confirm', 'sos-ended']
export type Role = 'customer' | 'rider'
export type AlertStatus = 'sending' | 'submitted' | 'uncertain' | 'failed' | 'acknowledged'
export type ContactStatus = 'not-requested' | 'pending-alert' | 'queued' | 'sent' | 'failed'
export type EndStatus = 'none' | 'sending' | 'saved-offline' | 'uncertain' | 'failed' | 'done'
export type FailReason = '' | 'offline' | 'auth' | 'server' | 'not-received'
export type SOSEvent = { id: number; at: number; text: string }

export type SOSSession = {
  id: string; role: Role; rideId: string | null; route: string; rideNote: string
  startedAt: number; endedAt: number | null; restored: boolean; demo: boolean
  alert: { status: AlertStatus; at: number; ref: string | null; ackAt: number | null; attempts: number; reason: FailReason; checking: boolean }
  contact: { id: string | null; name: string; status: ContactStatus; at: number; busy: boolean }
  end: { status: EndStatus; intentAt: number; at: number; reason: string; failReason: FailReason; checking: boolean }
  caseRef: string | null
  events: SOSEvent[]
}

export type CallTarget = { kind: 'emergency' | 'contact' | 'campus'; title: string; name: string; number: string; tel: string | null; sample?: boolean }
export type CallState = { target: CallTarget; handoff: 'idle' | 'requested' | 'unavailable'; copy: 'idle' | 'copied' | 'failed' }

// ── Prototype configuration and scenario switches ────────────────────────────

// One shared value. A prototype UX choice, not a researched threshold.
export { HOLD_MS } from './holdGesture'
export const EMERGENCY_NUMBER = '112'
// Synthetic placeholder. No real campus contact, hours or coverage is implied.
export const CAMPUS_SAMPLE = { name: 'Campus security', phone: '9000000000' }
// The prototype never opens a real dialer unless the page is loaded with ?nativeDial.
const NATIVE_DIAL = typeof location !== 'undefined' && new URLSearchParams(location.search).has('nativeDial')

export const env = {
  alert: 'ok' as 'ok' | 'fail' | 'uncertain',
  contactResult: 'ok' as 'ok' | 'fail',
  endResult: 'ok' as 'ok' | 'fail' | 'uncertain',
  auth: 'valid' as 'valid' | 'expired',
  phone: 'handler' as 'handler' | 'none',
  clipboard: 'auto' as 'auto' | 'fail',
  campus: 'configured' as 'configured' | 'unavailable',
  shareMode: 'auto' as 'auto' | 'cancel' | 'none',
  shareRevoke: 'ok' as 'ok' | 'fail' | 'uncertain',
}
export const setEnv = (p: Partial<typeof env>) => { Object.assign(env, p) }

// Hand-off to the phone app. Never claims a call connected.
export function placeCall(t: CallTarget): 'requested' | 'unavailable' {
  if (env.phone === 'none' || !t.tel) return 'unavailable'
  if (NATIVE_DIAL) window.location.href = t.tel
  return 'requested'
}

export const emergencyTarget = (): CallTarget => ({ kind: 'emergency', title: 'Call emergency services', name: 'Emergency services', number: EMERGENCY_NUMBER, tel: `tel:${EMERGENCY_NUMBER}` })
export function contactTarget(c: Contact): CallTarget {
  const d = parsePhone(c.phone)
  return { kind: 'contact', title: `Call ${c.name}`, name: c.name, number: d ? fullPhone(d) : 'Number not valid', tel: d ? `tel:+91${d}` : null }
}
export function campusTarget(): CallTarget | null {
  if (env.campus === 'unavailable') return null
  const d = parsePhone(CAMPUS_SAMPLE.phone)
  return d ? { kind: 'campus', title: 'Call campus security', name: CAMPUS_SAMPLE.name, number: fullPhone(d), tel: `tel:+91${d}`, sample: true } : null
}

// ── Formatting ───────────────────────────────────────────────────────────────

export const fmtClock = (t: number) => new Date(t).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
export const fmtElapsed = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60
  const p = (n: number) => String(n).padStart(2, '0')
  return h ? `${h}:${p(m)}:${p(x)}` : `${p(m)}:${p(x)}`
}

export function useNow(ms = 1000, on = true) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!on) return
    const tick = () => setNow(Date.now())
    tick()
    const i = window.setInterval(tick, ms)
    document.addEventListener('visibilitychange', tick)
    return () => { window.clearInterval(i); document.removeEventListener('visibilitychange', tick) }
  }, [ms, on])
  return now
}

// Carries context to the existing report screens. Nothing is submitted by opening them.
// Lets shared surfaces (trip sharing) append real events to an active SOS session.
export const bus: { log: (t: string) => void } = { log: () => {} }
export const opener: { el: HTMLElement | null } = { el: null }
export const reportCtx: { note: string } = { note: '' }

// ── Simulated server (stands in for an idempotent alert API) ─────────────────

type Server = { alerts: Record<string, string>; contacts: Record<string, number>; ends: Record<string, number> }
const KEY = 'chaloraahi.sos.demo'
type Stored = { cur: SOSSession | null; past: SOSSession[]; server: Server; seq: number }

function load(): Stored {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (raw) {
      const d = JSON.parse(raw) as Stored
      if (d.cur) {
        const c = d.cur
        c.restored = true
        if (c.alert.status === 'sending') c.alert.status = 'uncertain'
        c.alert.checking = false; c.contact.busy = false; c.end.checking = false
        if (c.end.status === 'sending') c.end.status = 'uncertain'
        c.events.push({ id: c.events.length + 1, at: Date.now(), text: 'Demo session restored after a reload. Pending steps were not resent.' })
      }
      return d
    }
  } catch { /* ignore */ }
  return { cur: null, past: [], server: { alerts: {}, contacts: {}, ends: {} }, seq: 4821 }
}

const evt = (s: SOSSession, text: string, at = Date.now()): SOSSession => ({ ...s, events: [...s.events, { id: s.events.length + 1, at, text }] })

export type ActivateInfo = { role: Role; rideId: string | null; route: string; rideNote: string; online: boolean; contact: Contact | null; consent: boolean }

export function useSOS() {
  const boot = useRef<Stored | null>(null)
  if (!boot.current) boot.current = load()
  const srv = useRef<Server>(boot.current.server)
  const seq = useRef(boot.current.seq)
  const [cur, setCur] = useState<SOSSession | null>(boot.current.cur)
  const [past, setPast] = useState<SOSSession[]>(boot.current.past)
  const ref = useRef<SOSSession | null>(cur)
  const [ui, setUi] = useState<{ open: boolean; screen: SOSScreen; call: CallState | null; callFrom: SOSScreen; contactId: string | null }>({ open: false, screen: 'sos-confirm', call: null, callFrom: 'sos-confirm', contactId: null })
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)) }

  useEffect(() => {
    try { sessionStorage.setItem(KEY, JSON.stringify({ cur, past, server: srv.current, seq: seq.current } satisfies Stored)) } catch { /* ignore */ }
  }, [cur, past])

  const put = (n: SOSSession | null) => { ref.current = n; setCur(n) }
  const upd = (id: string, fn: (s: SOSSession) => SOSSession) => { if (ref.current?.id === id) put(fn(ref.current)) }
  const log = useCallback((text: string) => { if (ref.current && !ref.current.endedAt) put(evt(ref.current, text)) }, [])
  bus.log = log

  // ── alert ──
  const dispatchContact = (id: string, online: boolean) => {
    const s = ref.current
    if (!s || s.id !== id || !s.contact.id || !['pending-alert', 'failed'].includes(s.contact.status)) return
    if (!online || env.auth === 'expired') { upd(id, x => evt({ ...x, contact: { ...x.contact, status: 'failed' } }, `Couldn't send the contact notification: ${!online ? 'no connection' : 'sign-in expired'}.`)); return }
    upd(id, x => evt({ ...x, contact: { ...x.contact, status: 'queued', busy: true, at: Date.now() } }, `Message queued for ${x.contact.name}.`))
    later(() => {
      const already = srv.current.contacts[id]
      if (env.contactResult === 'fail' && !already) upd(id, x => evt({ ...x, contact: { ...x.contact, status: 'failed', busy: false } }, "Couldn't send the contact notification."))
      else { srv.current.contacts[id] = srv.current.contacts[id] ?? Date.now(); upd(id, x => evt({ ...x, contact: { ...x.contact, status: 'sent', busy: false, at: Date.now() } }, `Message sent to ${x.contact.name} · delivery not confirmed.`)) }
    }, 800)
  }

  const send = (id: string, online: boolean) => {
    const s = ref.current
    if (!s || s.id !== id) return
    if (!online) { upd(id, x => evt({ ...x, alert: { ...x.alert, status: 'failed', reason: 'offline' } }, 'Alert not sent: no connection. Nothing was submitted.')); return }
    if (env.auth === 'expired') { upd(id, x => evt({ ...x, alert: { ...x.alert, status: 'failed', reason: 'auth' } }, 'Alert not sent: sign-in expired.')); return }
    upd(id, x => ({ ...x, alert: { ...x.alert, status: 'sending', reason: '', attempts: x.alert.attempts + 1 } }))
    later(() => {
      if (ref.current?.id !== id) return
      if (env.alert === 'fail') { upd(id, x => evt({ ...x, alert: { ...x.alert, status: 'failed', reason: 'server' } }, 'Alert not sent: the server reported an error.')); return }
      const ref0 = srv.current.alerts[id] ?? `SOS-${seq.current++}`
      srv.current.alerts[id] = ref0
      if (env.alert === 'uncertain') { upd(id, x => evt({ ...x, alert: { ...x.alert, status: 'uncertain', reason: '' } }, 'No response received. Submission not confirmed.')); return }
      const at = Date.now()
      upd(id, x => evt({ ...x, alert: { ...x.alert, status: 'submitted', ref: ref0, at }, caseRef: null }, `Alert submitted · reference ${ref0}.`, at))
      dispatchContact(id, true)
    }, 1000)
  }

  const activate = (info: ActivateInfo) => {
    if (ref.current && !ref.current.endedAt) return ref.current
    const prev = ref.current
    if (prev) setPast(p => [prev, ...p])
    const now = Date.now()
    const want = !!(info.contact && info.consent)
    const s: SOSSession = {
      id: `sos-${now.toString(36)}`, role: info.role, rideId: info.rideId, route: info.route, rideNote: info.rideNote,
      startedAt: now, endedAt: null, restored: false, demo: false,
      alert: { status: 'sending', at: 0, ref: null, ackAt: null, attempts: 0, reason: '', checking: false },
      contact: { id: want ? info.contact!.id : null, name: info.contact?.name ?? '', status: want ? 'pending-alert' : 'not-requested', at: 0, busy: false },
      end: { status: 'none', intentAt: 0, at: 0, reason: '', failReason: '', checking: false },
      caseRef: null,
      events: [{ id: 1, at: now, text: 'SOS started on this device.' }],
    }
    put(s)
    send(s.id, info.online)
    return s
  }

  const retryAlert = (online: boolean) => { const s = ref.current; if (s && s.alert.status === 'failed') send(s.id, online) }
  const checkAlert = (online: boolean) => {
    const s = ref.current; if (!s || s.alert.checking) return
    if (!online) { put(evt(s, "Can't check the alert while offline.")); return }
    upd(s.id, x => ({ ...x, alert: { ...x.alert, checking: true } }))
    later(() => {
      const found = srv.current.alerts[s.id]
      if (found) {
        upd(s.id, x => evt({ ...x, alert: { ...x.alert, status: 'submitted', ref: found, at: Date.now(), checking: false, reason: '' } }, `Checked: the alert was received · reference ${found}.`))
        dispatchContact(s.id, true)
      } else upd(s.id, x => evt({ ...x, alert: { ...x.alert, status: 'failed', reason: 'not-received', checking: false } }, 'Checked: the alert was not received. You can send it again.'))
    }, 800)
  }
  const retryContact = (online: boolean) => { const s = ref.current; if (s && ['submitted', 'acknowledged'].includes(s.alert.status)) dispatchContact(s.id, online) }

  const acknowledge = () => {
    const s = ref.current
    if (!s || s.endedAt || s.alert.status !== 'submitted') return
    const at = Date.now()
    put(evt({ ...s, alert: { ...s.alert, status: 'acknowledged', ackAt: at }, caseRef: `SC-${(s.alert.ref ?? '').replace('SOS-', '')}` }, 'Support acknowledged the alert (simulated operator).', at))
  }

  // ── end ──
  const requestEnd = (online: boolean, reason: string) => {
    const s = ref.current
    if (!s || s.endedAt || ['sending', 'uncertain'].includes(s.end.status) || s.end.checking) return
    const intentAt = s.end.intentAt || Date.now()
    const base = { ...s.end, intentAt, reason: reason || s.end.reason }
    if (!online) { put(evt({ ...s, end: { ...base, status: 'saved-offline', failReason: 'offline' } }, 'Safe-status update saved on this device. Not confirmed.')); return }
    if (env.auth === 'expired') { put(evt({ ...s, end: { ...base, status: 'failed', failReason: 'auth' } }, 'Safe-status update not sent: sign-in expired.')); return }
    put({ ...s, end: { ...base, status: 'sending', failReason: '' } })
    later(() => {
      if (ref.current?.id !== s.id) return
      if (env.endResult === 'fail') { upd(s.id, x => evt({ ...x, end: { ...x.end, status: 'failed', failReason: 'server' } }, 'Safe-status update failed. SOS is still active.')); return }
      const at = Date.now()
      srv.current.ends[s.id] = srv.current.ends[s.id] ?? at
      if (env.endResult === 'uncertain') { upd(s.id, x => evt({ ...x, end: { ...x.end, status: 'uncertain' } }, 'No response to the safe-status update. Not confirmed.')); return }
      upd(s.id, x => evt({ ...x, endedAt: at, end: { ...x.end, status: 'done', at } }, 'Safe-status update acknowledged. SOS session ended.', at))
    }, 1000)
  }
  const checkEnd = (online: boolean) => {
    const s = ref.current; if (!s || s.end.checking) return
    if (!online) { put(evt(s, "Can't check the safe-status update while offline.")); return }
    upd(s.id, x => ({ ...x, end: { ...x.end, checking: true } }))
    later(() => {
      const at = srv.current.ends[s.id]
      if (at) upd(s.id, x => evt({ ...x, endedAt: at, end: { ...x.end, status: 'done', at, checking: false } }, 'Checked: the safe-status update was received. SOS session ended.', at))
      else upd(s.id, x => evt({ ...x, end: { ...x.end, status: 'failed', failReason: 'not-received', checking: false } }, 'Checked: the safe-status update was not received. SOS is still active.'))
    }, 800)
  }
  const cancelEndIntent = () => { const s = ref.current; if (s && !s.endedAt && ['saved-offline', 'failed'].includes(s.end.status)) put(evt({ ...s, end: { ...s.end, status: 'none', intentAt: 0 } }, 'Saved safe-status update discarded. SOS stays active.')) }

  // ── navigation ──
  const setScreen = (screen: SOSScreen) => setUi(u => ({ ...u, screen }))
  const openSOS = (screen?: SOSScreen) => {
    const a = document.activeElement as HTMLElement | null
    if (!ui.open && a && a !== document.body) opener.el = a
    setUi(u => {
      const live = ref.current && !ref.current.endedAt
      return { ...u, open: true, screen: screen ?? (live ? 'sos-active' : 'sos-confirm') }
    })
  }
  const close = () => setUi(u => ({ ...u, open: false }))
  const setContactId = (id: string) => setUi(u => ({ ...u, contactId: id }))

  const startCall = (target: CallTarget) => setUi(u => ({ ...u, call: { target, handoff: 'idle', copy: 'idle' }, callFrom: u.screen === 'sos-calling' ? u.callFrom : u.screen, screen: 'sos-calling' }))
  const requestHandoff = () => {
    const c = ui.call; if (!c) return
    const res = placeCall(c.target)
    setUi(u => (u.call ? { ...u, call: { ...u.call, handoff: res } } : u))
    const sim = NATIVE_DIAL ? '' : 'Simulated '
    log(res === 'requested' ? `${sim}phone-app handoff requested for ${c.target.name}${c.target.kind === 'emergency' ? ` (${EMERGENCY_NUMBER})` : ''}.` : `Phone app unavailable on this device for ${c.target.name}.`)
    return res
  }
  const copyNumber = async () => {
    const c = ui.call; if (!c) return
    const digits = c.target.number.replace(/[^\d+]/g, '')
    let ok = false
    if (env.clipboard !== 'fail') { try { await navigator.clipboard.writeText(digits); ok = true } catch { ok = false } }
    setUi(u => (u.call ? { ...u, call: { ...u.call, copy: ok ? 'copied' : 'failed' } } : u))
    return ok
  }
  const returnFromCall = () => setUi(u => ({ ...u, screen: ref.current && !ref.current.endedAt ? 'sos-active' : u.callFrom === 'sos-holding' ? 'sos-confirm' : u.callFrom }))

  // ── demo seeding for the screen picker ──
  const seedDemo = (kind: 'active' | 'ended', info: Omit<ActivateInfo, 'online'>) => {
    if (ref.current && (kind === 'active' ? !ref.current.endedAt : !!ref.current.endedAt)) return
    if (ref.current) setPast(p => [ref.current!, ...p])
    const now = Date.now(), start = kind === 'ended' ? now - 4 * 60000 : now - 18000
    const want = !!(info.contact && info.consent), id = `sos-demo-${now.toString(36)}`, r = `SOS-${seq.current++}`
    srv.current.alerts[id] = r
    let s: SOSSession = {
      id, role: info.role, rideId: info.rideId, route: info.route, rideNote: info.rideNote, startedAt: start, endedAt: null, restored: false, demo: true,
      alert: { status: 'submitted', at: start + 1200, ref: r, ackAt: null, attempts: 1, reason: '', checking: false },
      contact: { id: want ? info.contact!.id : null, name: info.contact?.name ?? '', status: want ? 'sent' : 'not-requested', at: start + 2100, busy: false },
      end: { status: 'none', intentAt: 0, at: 0, reason: '', failReason: '', checking: false }, caseRef: null, events: [],
    }
    s = evt(s, 'SOS started on this device (demo session seeded by the screen picker).', start)
    s = evt(s, `Alert submitted · reference ${r}.`, start + 1200)
    if (want) { s = evt(s, `Message queued for ${info.contact!.name}.`, start + 1500); s = evt(s, `Message sent to ${info.contact!.name} · delivery not confirmed.`, start + 2100) }
    if (kind === 'ended') {
      const at = now - 20000
      srv.current.ends[id] = at
      s = evt({ ...s, endedAt: at, end: { ...s.end, status: 'done', intentAt: at - 900, at } }, 'Safe-status update acknowledged. SOS session ended.', at)
    }
    put(s)
  }

  const discard = () => { if (ref.current?.endedAt) put(null) }

  return {
    ui, cur, past, srv, log, activate, retryAlert, checkAlert, retryContact, acknowledge, requestEnd, checkEnd, cancelEndIntent,
    setScreen, openSOS, close, setContactId, startCall, requestHandoff, copyNumber, returnFromCall, seedDemo, discard,
    active: !!cur && !cur.endedAt,
  }
}
export type SOSApi = ReturnType<typeof useSOS>

export type Stage = 'none' | 'meetup' | 'live' | 'closed'
// Adapter from Buddy or Pilot state. SOSFlow never reads either store directly.
export type RideCtx = {
  role: Role; rideId: string | null; stage: Stage; route: string; stageLabel: string
  counterpart: string | null; loc: 'fresh' | 'stale' | 'unavailable'; locAt: number
  share: import('./shareModel').ShareLink | null
  patchShare: ((fn: (s: import('./shareModel').ShareLink) => import('./shareModel').ShareLink) => void) | null
  shareFail: boolean; online: boolean
}

export const pickContact = (contacts: Contact[], id: string | null) => contacts.find(c => c.id === id) ?? contacts.find(c => c.primary) ?? contacts[0] ?? null
