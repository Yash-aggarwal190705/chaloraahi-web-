import { useCallback, useEffect, useRef, useState } from 'react'
import { C, Ico, r } from './OnboardingUI'
import {
  FOCUSED_SCREENS, LIFECYCLE_SCREENS, NEW_RIDER, SAMPLE_RIDER, STATUS_LABEL, screenForStatus,
  type CustomerScreen, type PProto, type PStore, type Ride, type RideStatus,
} from './PassengerData'
import { Home, MeetingPoint, MyRides, Recurring, Review, Schedule, Searching, Waiting } from './PassengerPlan'
import { Active, AtPickup, Cancelled, Confirmed, Meetup, Rate, ReportScreen, ShareViewer, Summary } from './PassengerRide'
import Sheets from './PassengerSheets'
import type { Ctx, SheetName } from './PassengerUI'

// ── Navigation with a back stack ─────────────────────────────────────────────

export function usePassengerNav() {
  const [screen, setScreen] = useState<CustomerScreen>('idle')
  const [stack, setStack] = useState<CustomerScreen[]>([])
  const go = useCallback((x: CustomerScreen) => { setStack(s => [...s, screen]); setScreen(x) }, [screen])
  const back = useCallback(() => {
    if (stack.length) { setScreen(stack[stack.length - 1]); setStack(stack.slice(0, -1)) } else setScreen('idle')
  }, [stack])
  const root = useCallback((x: CustomerScreen) => { setStack([]); setScreen(x) }, [])
  const replace = useCallback((x: CustomerScreen) => setScreen(x), [])
  return { screen, go, back, root, replace, prev: stack[stack.length - 1] ?? null }
}
export type PNav = ReturnType<typeof usePassengerNav>

const HEADER_SCREENS = new Set<CustomerScreen>(['idle', 'waiting', 'my-rides', 'recurring', 'rider-accepted', 'rider-arriving', 'ride-summary', 'ride-cancelled'])
const HOME_TAB = new Set<CustomerScreen>(['idle', 'waiting', 'rider-accepted', 'rider-arriving', 'ride-in-progress', 'ride-summary', 'ride-cancelled'])
const LIVE: RideStatus[] = ['at-pickup', 'in-progress']

// ── Shell ────────────────────────────────────────────────────────────────────

export default function PassengerFlow({ store: s, nav, onSwitchRole, onNotifications, onProfile, onSOS, onVerification }: {
  store: PStore; nav: PNav
  onSwitchRole: () => void; onNotifications: () => void; onProfile: () => void; onSOS: () => void; onVerification: () => void
}) {
  const [sheet, setSheet] = useState<{ name: SheetName; arg?: string } | null>(null)
  const [note, setNote] = useState('')
  const [toast, setToast] = useState('')
  const toastTimer = useRef(0)
  const mainRef = useRef<HTMLDivElement>(null)
  const online = s.proto.network === 'online'
  const screen = nav.screen

  const say = useCallback((m: string) => {
    setNote(''); window.setTimeout(() => setNote(m), 30)
    setToast(m); clearTimeout(toastTimer.current); toastTimer.current = window.setTimeout(() => setToast(''), 4500)
  }, [])
  useEffect(() => () => clearTimeout(toastTimer.current), [])

  // Status changes: follow them on lifecycle screens, otherwise announce.
  const seen = useRef<Record<string, RideStatus>>({})
  useEffect(() => {
    s.rides.forEach(x => {
      const before = seen.current[x.id]
      if (before && before !== x.status) {
        if (x.id === s.curId && LIFECYCLE_SCREENS.has(screen)) nav.replace(screenForStatus(x.status))
        else say(`${x.pickup.name} to ${x.destination.name}: ${STATUS_LABEL[x.status]}.`)
      }
      seen.current[x.id] = x.status
    })
  }, [s.rides])  // eslint-disable-line react-hooks/exhaustive-deps

  // Saved end requests go out when the connection returns.
  useEffect(() => {
    if (online) s.rides.filter(x => x.endState === 'saved-offline').forEach(x => s.patchRide(x.id, { endState: 'requested' }))
  }, [online])  // eslint-disable-line react-hooks/exhaustive-deps

  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    const t = window.setTimeout(() => mainRef.current?.querySelector<HTMLElement>('[data-heading]')?.focus({ preventScroll: true }), 60)
    return () => clearTimeout(t)
  }, [screen])

  const openRide = (x: Ride) => { s.setCurId(x.id); nav.root(screenForStatus(x.status)) }
  const c: Ctx = {
    s, screen, go: nav.go, back: nav.back, root: nav.root, prev: nav.prev,
    open: (name, arg) => setSheet({ name, arg }), close: () => setSheet(null), sheet: sheet?.name ?? null, sheetArg: sheet?.arg,
    say, sos: onSOS, openVerification: onVerification, online, openRide, switchRole: onSwitchRole,
  }

  const live = s.upcoming.find(x => LIVE.includes(x.status))
  const onLive = live && s.curId === live.id && screen === screenForStatus(live.status)
  const showHeader = HEADER_SCREENS.has(screen)
  const showNav = !FOCUSED_SCREENS.has(screen) && screen !== 'ride-in-progress' && screen !== 'share-viewer'
  const tab = screen === 'my-rides' || screen === 'recurring' ? 'rides' : HOME_TAB.has(screen) ? 'home' : 'home'

  const body = (() => {
    switch (screen) {
      case 'idle': return <Home c={c} />
      case 'searching': return <Searching c={c} />
      case 'meeting-point': return <MeetingPoint c={c} />
      case 'ticket-form': return <Schedule c={c} />
      case 'review-request': return <Review c={c} />
      case 'waiting': return <Waiting c={c} />
      case 'my-rides': return <MyRides c={c} />
      case 'recurring': return <Recurring c={c} />
      case 'rider-accepted': return <Confirmed c={c} />
      case 'rider-arriving': return <Meetup c={c} />
      case 'at-pickup': return <AtPickup c={c} />
      case 'ride-in-progress': return <Active c={c} />
      case 'ride-summary': return <Summary c={c} />
      case 'rate-rider': return <Rate c={c} />
      case 'ride-cancelled': return <Cancelled c={c} />
      case 'report': return <ReportScreen c={c} />
      case 'share-viewer': return <ShareViewer c={c} />
    }
  })()

  const navBtn = (id: string, label: string, icon: string, on: boolean, fn: () => void) => (
    <button key={id} type="button" onClick={fn} aria-current={on ? 'page' : undefined} className="ob-icon-btn flex-1 flex flex-col items-center justify-center"
      style={{ minHeight: r(60), gap: r(2), color: on ? C.primary : C.text3, fontSize: r(13), fontWeight: on ? 700 : 500 }}>
      <Ico name={icon} size={22} sw={on ? 2.4 : 1.8} />{label}
    </button>
  )

  return (
    <div className="ob-root relative flex flex-col flex-1 min-h-0 w-full" style={{ background: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <div inert={!!sheet} className="flex flex-col flex-1 min-h-0">
        {showHeader && (
          <header className="flex items-center justify-between flex-shrink-0 flex-wrap" style={{ padding: `${r(4)} max(${r(16)}, min(${r(20)}, 5vw))`, gap: r(4), borderBottom: `1px solid ${C.divider}` }}>
            <div className="flex items-center flex-wrap" style={{ gap: r(4) }}>
              <button type="button" onClick={() => c.open('role')} aria-haspopup="dialog" aria-label="Role: Buddy. Switch role" className="ob-btn flex items-center"
                style={{ minHeight: r(48), padding: `0 ${r(12)}`, gap: r(6), borderRadius: 999, background: C.tint, color: C.pressed, fontWeight: 700, fontSize: r(15) }}>
                Buddy<Ico name="chevdown" size={16} sw={2.5} />
              </button>
              <span className="flex items-center" style={{ gap: r(4), fontSize: r(13), color: C.text2, fontWeight: 500 }}><Ico name="shield" size={14} />VGU · Jaipur</span>
            </div>
            <button type="button" onClick={onNotifications} aria-label="Notifications" className="ob-icon-btn flex items-center justify-center" style={{ width: r(48), height: r(48), borderRadius: 999, color: C.text }}>
              <Ico name="bell" size={22} />
            </button>
          </header>
        )}
        {live && !onLive && !FOCUSED_SCREENS.has(screen) && screen !== 'ride-in-progress' && (
          <button type="button" onClick={() => openRide(live)} className="flex items-center justify-between flex-shrink-0 w-full text-left"
            style={{ minHeight: r(52), padding: `${r(8)} max(${r(16)}, min(${r(20)}, 5vw))`, background: C.pressed, color: '#fff', gap: r(8), fontSize: r(15), fontWeight: 600 }}>
            <span>{STATUS_LABEL[live.status]} · {live.destination.name}</span><span style={{ textDecoration: 'underline', flexShrink: 0 }}>Return to ride</span>
          </button>
        )}
        <main ref={mainRef} className="flex-1 min-h-0 flex flex-col ob-fade" key={screen}>{body}</main>
        {showNav && (
          <nav aria-label="Main" className="flex flex-shrink-0" style={{ borderTop: `1px solid ${C.divider}`, background: '#fff', paddingBottom: 'env(safe-area-inset-bottom)' }}>
            {navBtn('home', 'Home', 'home', tab === 'home', () => nav.root('idle'))}
            {navBtn('rides', 'My rides', 'list', tab === 'rides', () => nav.root('my-rides'))}
            {navBtn('profile', 'Profile', 'user', false, onProfile)}
          </nav>
        )}
      </div>
      {sheet && <Sheets key={sheet.name} c={c} />}
      {toast && (
        <div aria-hidden className="absolute left-0 right-0 flex justify-center pointer-events-none" style={{ bottom: showNav ? r(76) : r(20), padding: `0 ${r(16)}`, zIndex: 60 }}>
          <div style={{ background: '#101828', color: '#fff', borderRadius: r(12), padding: `${r(10)} ${r(16)}`, fontSize: r(14), fontWeight: 500, maxWidth: '100%', overflowWrap: 'anywhere', boxShadow: '0 4px 16px rgba(16,24,40,.3)' }}>{toast}</div>
        </div>
      )}
      <div role="status" aria-live="polite" className="sr-only">{note}</div>
    </div>
  )
}

// ── Prototype controls (outside the phone frame) ─────────────────────────────

export function PassengerControls({ store: s, nav, onReset }: { store: PStore; nav: PNav; onReset: () => void }) {
  const { proto, setProto } = s
  const t = s.cur ?? s.upcoming[0]
  const [hint, setHint] = useState('')
  const sel = <K extends keyof PProto>(label: string, k: K, opts: [PProto[K], string][]) => (
    <label key={k} className="flex flex-col gap-1" style={{ minWidth: 140, flex: 1 }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>{label}</span>
      <select value={String(proto[k])} onChange={e => setProto(p => ({ ...p, [k]: (typeof p[k] === 'boolean' ? e.target.value === 'true' : e.target.value) as PProto[K] }))}
        style={{ padding: '7px 8px', borderRadius: 8, fontSize: 13, background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)' }}>
        {opts.map(([v, l]) => <option key={String(v)} value={String(v)} style={{ background: '#1c1c2e' }}>{l}</option>)}
      </select>
    </label>
  )
  const act = (label: string, fn: (x: Ride) => Partial<Ride> | null, need?: (x: Ride) => string | null) => (
    <button key={label} type="button" onClick={() => {
      if (!t) { setHint('Create or open a request first.'); return }
      const why = need?.(t); if (why) { setHint(why); return }
      const p = fn(t); if (p) { s.patchRide(t.id, p); setHint('') }
    }} style={{ fontSize: 12, fontWeight: 600, color: '#fff', padding: '7px 10px', minHeight: 36, borderRadius: 8, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.06)' }}>{label}</button>
  )
  const firstOcc = (x: Ride) => Object.fromEntries(Object.keys(x.occ).map((k, i) => [k, i === 0 ? 'confirmed' as const : x.occ[k]]))
  const H = (h: string) => <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', margin: '12px 0 6px' }}>{h}</p>
  return (
    <section aria-label="Buddy prototype controls" style={{ maxWidth: 560, width: '100%', padding: 12, borderRadius: 12, border: '1px dashed rgba(255,255,255,0.25)' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Buddy prototype controls</span>
        <button type="button" onClick={() => { s.reset(); nav.root('idle'); onReset() }} style={{ fontSize: 12, fontWeight: 600, color: '#fff', padding: '7px 12px', minHeight: 36, borderRadius: 8, border: '1px solid rgba(255,255,255,0.3)' }}>Reset prototype</button>
      </div>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>
        Everything here is simulated. No payment, messaging, map or notification service is connected, and SOS actions never alert a real contact.
        Controls act on {t ? `the ${t.pickup.name} → ${t.destination.name} request (${STATUS_LABEL[t.status]})` : 'the current request once one exists'}.
      </p>
      {hint && <p role="status" style={{ fontSize: 12, color: '#FEDF89', marginTop: 4 }}>{hint}</p>}
      {H('Account and planning')}
      <div className="flex flex-wrap gap-2">
        {sel('Verification', 'verification', [['approved', 'Approved'], ['pending', 'Pending']])}
        {sel('Route', 'route', [['available', 'Available'], ['unavailable', 'Unavailable']])}
        {sel('Estimate', 'estimate', [['ok', 'Available'], ['changed', 'Changed'], ['unavailable', 'Unavailable']])}
        {sel('Publishing', 'publish', [['ok', 'Succeeds'], ['failed', 'Fails'], ['uncertain', 'Uncertain']])}
        {sel('Network', 'network', [['online', 'Online'], ['offline', 'Offline']])}
        {sel('Location permission', 'location', [['granted', 'Granted'], ['denied', 'Denied']])}
        {sel('Notifications', 'notifications', [['allow', 'Allow'], ['deny', 'Deny']])}
      </div>
      {H('Pilot and request events')}
      <div className="flex flex-wrap gap-2">
        {act('Pilot accepts', x => ({ status: 'confirmed', rider: SAMPLE_RIDER, noMatchYet: false, occ: firstOcc(x) }), x => x.status === 'awaiting' ? null : 'Only an open request can be accepted.')}
        {act('New pilot accepts', x => ({ status: 'confirmed', rider: NEW_RIDER, noMatchYet: false, occ: firstOcc(x) }), x => x.status === 'awaiting' ? null : 'Only an open request can be accepted.')}
        {act('No match yet', () => ({ noMatchYet: true }), x => x.status === 'awaiting' ? null : 'Only an open request can wait.')}
        {act('Request expires', () => ({ status: 'expired' }), x => x.status === 'awaiting' ? null : 'Only an open request can expire.')}
        {act('Pilot cancels', () => ({ status: 'cancelled', cancelledBy: 'rider', cancelReason: 'Schedule conflict' }), x => ['confirmed', 'on-the-way'].includes(x.status) ? null : 'Needs a confirmed ride.')}
        {act('Pilot on the way', () => ({ status: 'on-the-way', onWayAt: Date.now(), loc: 'fresh', locAt: Date.now() }), x => x.status === 'confirmed' ? null : 'Needs a confirmed ride.')}
        {act('Waiting time passed', () => ({ pastDue: true }))}
        {act('Pilot arrived', () => ({ status: 'at-pickup' }), x => ['confirmed', 'on-the-way'].includes(x.status) ? null : 'Needs a confirmed ride.')}
      </div>
      {H('Start code')}
      <div className="flex flex-wrap gap-2">
        {act('Code expired', () => ({ code: 'expired' }))}
        {act('Pilot is verifying', () => ({ code: 'waiting' }))}
        {act('Verification unavailable', () => ({ code: 'unavailable' }))}
        {act('Attempt limit reached', () => ({ code: 'locked' }))}
        {act('Reset code', () => ({ code: 'ready' }))}
        {act('Ride start confirmed', () => ({ status: 'in-progress', startedAt: Date.now(), loc: 'fresh', locAt: Date.now() }),
          x => x.status !== 'at-pickup' ? 'Ride must be at pickup.' : !(x.ack.match && x.ack.helmets) ? 'The Buddy must complete both checks before the code is shown.' : null)}
      </div>
      {H('Active ride')}
      <div className="flex flex-wrap gap-2">
        {act('Location fresh', () => ({ loc: 'fresh', locAt: Date.now() }))}
        {act('Location stale', () => ({ loc: 'stale', locAt: Date.now() - 95000 }))}
        {act('Location unavailable', () => ({ loc: 'unavailable' }))}
        {act('Early end acknowledged', () => ({ status: 'ended-early', endedAt: Date.now(), endState: 'acknowledged' }), x => x.status === 'in-progress' ? null : 'Needs a ride in progress.')}
        {act('Pilot marks ride complete', () => ({ status: 'completed', endedAt: Date.now() }), x => x.status === 'in-progress' ? null : 'Needs a ride in progress.')}
        {act('Summary: awaiting confirmation', () => ({ summaryVariant: 'awaiting-confirmation' }))}
        {act('Summary: amount under review', () => ({ summaryVariant: 'under-review' }))}
        {act('Report: under review', x => ({ reports: x.reports.map((q, i) => i ? q : { ...q, status: 'Under review' }) }), x => x.reports.length ? null : 'Submit a report first.')}
      </div>
      <div className="flex flex-wrap gap-2" style={{ marginTop: 8 }}>
        {sel('Message delivery', 'message', [['ok', 'Succeeds'], ['fail', 'Fails']])}
        {sel('Early-end result', 'end', [['acknowledged', 'Acknowledged'], ['uncertain', 'Uncertain']])}
        {sel('Share link', 'shareFail', [[false, 'Creates'], [true, 'Fails']])}
        {sel('Shared-link viewer', 'viewer', [['active', 'Active'], ['stale', 'Stale'], ['ended', 'Ended'], ['expired', 'Expired'], ['revoked', 'Revoked']])}
      </div>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 10, lineHeight: 1.4 }}>Prototype assumptions: a sample location counts as stale after about 30 seconds, and the waiting policy allows a no-show report 10 minutes after the agreed time. Share-link expiry and revocation would need backend enforcement.</p>
    </section>
  )
}
