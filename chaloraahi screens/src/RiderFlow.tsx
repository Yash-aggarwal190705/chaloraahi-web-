import { useCallback, useEffect, useRef, useState } from 'react'
import { C, Ico, r } from './OnboardingUI'
import {
  APPROVED_ONLY, LIFECYCLE, RFOCUSED, SETUP_SCREENS, SAMPLE_VEHICLE, TRIP_LABEL, emptyDoc, emptyDocs, sampleDoc, screenForTrip,
  type RCtx, type RStore, type RProto, type RiderScreen, type SheetName, type Trip,
} from './RiderData'
import { AtPickup, Active, Cancelled, Confirmed, HeadingToPickup, Rate, Report, Summary, VerifyCode } from './RiderRide'
import { ApprovalStatus, SetupDocuments, SetupReview, SetupVehicle, VehicleStatus } from './RiderSetup'
import Sheets from './RiderSheets'
import { Home, MyTrips, PlanTrip, Recurring, RequestDetail, Requests, ReviewTrip, TripDetail } from './RiderTrips'

export { ALL_RIDER_SCREENS } from './RiderData'
export type { RiderScreen } from './RiderData'

export function useRiderNav() {
  const [screen, setScreen] = useState<RiderScreen>('rider-home-idle')
  const [stack, setStack] = useState<RiderScreen[]>([])
  const go = useCallback((x: RiderScreen) => { setStack(s => [...s, screen]); setScreen(x) }, [screen])
  const back = useCallback(() => {
    if (stack.length) { setScreen(stack[stack.length - 1]); setStack(stack.slice(0, -1)) } else setScreen('rider-home-idle')
  }, [stack])
  const root = useCallback((x: RiderScreen) => { setStack([]); setScreen(x) }, [])
  const replace = useCallback((x: RiderScreen) => setScreen(x), [])
  return { screen, go, back, root, replace }
}
export type RNav = ReturnType<typeof useRiderNav>

const HEADER = new Set<RiderScreen>(['rider-home-idle', 'rider-home-requests', 'my-trips', 'tickets-list', 'tickets-empty', 'verification-pending', 'verification-verified', 'verification-rejected'])
const TAB = (s: RiderScreen) =>
  s === 'tickets-list' || s === 'tickets-empty' || s === 'ticket-detail' ? 'requests'
  : s === 'my-trips' || s === 'trip-detail' || s === 'recurring' || s === 'ride-summary' || s === 'ride-cancelled-r' ? 'trips' : 'home'

export default function RiderFlow({ store: s, nav, onSwitchRole, onProfile, onSOS }: {
  store: RStore; nav: RNav; onSwitchRole: () => void; onProfile: () => void; onSOS: () => void
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

  const seen = useRef<Record<string, string>>({})
  useEffect(() => {
    s.trips.forEach(x => {
      const before = seen.current[x.id]
      if (before && before !== x.status) {
        if (x.id === s.curId && LIFECYCLE.has(screen)) nav.replace(screenForTrip(x))
        else say(`${x.pickup.name} to ${x.destination.name}: ${TRIP_LABEL[x.status]}.`)
      }
      seen.current[x.id] = x.status
    })
  }, [s.trips])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!online) return
    s.trips.forEach(x => {
      if (x.completeState === 'saved-offline' && x.status === 'active') s.patchTrip(x.id, { status: 'completed', completeState: 'none', endedAt: Date.now() })
      else if (x.endState === 'saved-offline' && x.status === 'active') s.patchTrip(x.id, { status: 'ended-early', endState: 'acknowledged', endedAt: Date.now() })
    })
  }, [online])  // eslint-disable-line react-hooks/exhaustive-deps

  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    const t = window.setTimeout(() => mainRef.current?.querySelector<HTMLElement>('[data-heading]')?.focus({ preventScroll: true }), 60)
    return () => clearTimeout(t)
  }, [screen])

  const openTrip = (t: Trip) => { s.setCurId(t.id); s.setTripId(t.id); nav.go(screenForTrip(t)) }
  const c: RCtx = {
    s, screen, go: nav.go, back: nav.back, root: nav.root, replace: nav.replace,
    open: (name, arg) => setSheet({ name, arg }), close: () => setSheet(null), sheet: sheet?.name ?? null, sheetArg: sheet?.arg,
    say, sos: onSOS, online, switchRole: onSwitchRole, openTrip, notifications: () => setSheet({ name: 'notifications' }),
  }

  const live = s.live
  const onLive = !!live && s.curId === live.id && LIFECYCLE.has(screen)
  const showHeader = HEADER.has(screen)
  const showNav = !RFOCUSED.has(screen)
  const tab = TAB(screen)

  const gate = !SETUP_SCREENS.has(screen) && APPROVED_ONLY.has(screen) && s.approval !== 'approved'
  const body = (() => {
    if (gate) return s.approval === 'draft' ? <SetupVehicle c={c} /> : <ApprovalStatus c={c} />
    switch (screen) {
      case 'setup-vehicle': return <SetupVehicle c={c} />
      case 'setup-documents': return <SetupDocuments c={c} />
      case 'setup-promise': return <SetupReview c={c} />
      case 'verification-pending': case 'verification-verified': case 'verification-rejected':
        return s.approval === 'draft' ? <SetupVehicle c={c} /> : <ApprovalStatus c={c} />
      case 'vehicle-status': return <VehicleStatus c={c} />
      case 'rider-home-idle': case 'rider-home-requests': return <Home c={c} />
      case 'post-trip': return <PlanTrip c={c} />
      case 'review-trip': return <ReviewTrip c={c} />
      case 'my-trips': return <MyTrips c={c} />
      case 'trip-detail': return <TripDetail c={c} />
      case 'recurring': return <Recurring c={c} />
      case 'tickets-list': case 'tickets-empty': return <Requests c={c} />
      case 'ticket-detail': return <RequestDetail c={c} />
      case 'ticket-accepted': return <Confirmed c={c} />
      case 'heading-to-pickup': return <HeadingToPickup c={c} />
      case 'at-pickup': return <AtPickup c={c} />
      case 'verify-otp': return <VerifyCode c={c} />
      case 'ride-in-progress-r': return <Active c={c} />
      case 'ride-summary': return <Summary c={c} />
      case 'rate-co-rider': return <Rate c={c} />
      case 'ride-cancelled-r': return <Cancelled c={c} />
      case 'report-r': return <Report c={c} />
    }
  })()

  const pending = s.published.filter(t => t.status === 'published' && !t.req).some(t => s.reqs.some(q => q.state === 'open' && q.detourKm <= t.detour))
  const navBtn = (id: string, label: string, icon: string, on: boolean, fn: () => void, dot = false) => (
    <button key={id} type="button" onClick={fn} aria-current={on ? 'page' : undefined} className="ob-icon-btn flex-1 flex flex-col items-center justify-center relative"
      style={{ minHeight: r(60), gap: r(2), color: on ? C.primary : C.text2, fontSize: r(13), fontWeight: on ? 700 : 500 }}>
      <Ico name={icon} size={22} sw={on ? 2.4 : 1.8} />{label}
      {dot && <><span aria-hidden style={{ position: 'absolute', top: r(8), left: 'calc(50% + 10px)', width: 9, height: 9, borderRadius: 99, background: C.errText, border: '1.5px solid #fff' }} /><span className="sr-only">, new requests</span></>}
    </button>
  )

  return (
    <div className="ob-root relative flex flex-col flex-1 min-h-0 w-full" style={{ background: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <div inert={!!sheet} className="flex flex-col flex-1 min-h-0">
        {showHeader && (
          <header className="flex items-center justify-between flex-shrink-0 flex-wrap" style={{ padding: `${r(4)} max(${r(16)}, min(${r(20)}, 5vw))`, gap: r(4), borderBottom: `1px solid ${C.divider}` }}>
            <div className="flex items-center flex-wrap" style={{ gap: r(4) }}>
              <button type="button" onClick={() => c.open('role')} aria-haspopup="dialog" aria-label="Role: Pilot. Switch role" className="ob-btn flex items-center"
                style={{ minHeight: r(48), padding: `0 ${r(12)}`, gap: r(6), borderRadius: 999, background: C.tint, color: C.pressed, fontWeight: 700, fontSize: r(15) }}>
                Pilot<Ico name="chevdown" size={16} sw={2.5} />
              </button>
              <span className="flex items-center" style={{ gap: r(4), fontSize: r(13), color: C.text2, fontWeight: 500 }}><Ico name="shield" size={14} />VGU · Jaipur</span>
            </div>
            <button type="button" onClick={c.notifications} aria-label="Notifications" aria-haspopup="dialog" className="ob-icon-btn flex items-center justify-center" style={{ width: r(48), height: r(48), borderRadius: 999, color: C.text }}>
              <Ico name="bell" size={22} />
            </button>
          </header>
        )}
        {live && !onLive && !RFOCUSED.has(screen) && (
          <button type="button" onClick={() => { s.setCurId(live.id); nav.root(screenForTrip(live)) }} className="flex items-center justify-between flex-shrink-0 w-full text-left"
            style={{ minHeight: r(52), padding: `${r(8)} max(${r(16)}, min(${r(20)}, 5vw))`, background: C.pressed, color: '#fff', gap: r(8), fontSize: r(15), fontWeight: 600 }}>
            <span>{TRIP_LABEL[live.status]} · {live.destination.name}</span><span style={{ textDecoration: 'underline', flexShrink: 0 }}>Return to ride</span>
          </button>
        )}
        <main ref={mainRef} className="flex-1 min-h-0 flex flex-col ob-fade" key={screen}>{body}</main>
        {showNav && (
          <nav aria-label="Main" className="flex flex-shrink-0" style={{ borderTop: `1px solid ${C.divider}`, background: '#fff', paddingBottom: 'env(safe-area-inset-bottom)' }}>
            {navBtn('home', 'Home', 'home', tab === 'home', () => nav.root('rider-home-idle'))}
            {navBtn('req', 'Requests', 'list', tab === 'requests', () => nav.root('tickets-list'), pending && s.approval === 'approved' && !s.live)}
            {navBtn('trips', 'My trips', 'calendar', tab === 'trips', () => nav.root('my-trips'))}
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

export function RiderControls({ store: s, nav, onReset }: { store: RStore; nav: RNav; onReset: () => void }) {
  const { proto, setProto } = s
  const t = s.cur ?? s.live ?? s.upcoming[0] ?? null
  const [hint, setHint] = useState('')
  const sel = <K extends keyof RProto>(label: string, k: K, opts: [RProto[K], string][]) => (
    <label key={k} className="flex flex-col gap-1" style={{ minWidth: 140, flex: 1 }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>{label}</span>
      <select value={String(proto[k])} onChange={e => setProto(p => ({ ...p, [k]: (typeof p[k] === 'boolean' ? e.target.value === 'true' : e.target.value) as RProto[K] }))}
        style={{ padding: '7px 8px', borderRadius: 8, fontSize: 13, background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)' }}>
        {opts.map(([v, l]) => <option key={String(v)} value={String(v)} style={{ background: '#1c1c2e' }}>{l}</option>)}
      </select>
    </label>
  )
  const btn = (label: string, fn: () => void) => (
    <button key={label} type="button" onClick={() => { setHint(''); fn() }}
      style={{ fontSize: 12, fontWeight: 600, color: '#fff', padding: '7px 10px', minHeight: 36, borderRadius: 8, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.06)' }}>{label}</button>
  )
  const act = (label: string, fn: (x: Trip) => Partial<Trip>, need?: (x: Trip) => string | null) => btn(label, () => {
    if (!t) { setHint('Publish a trip first.'); return }
    const why = need?.(t); if (why) { setHint(why); return }
    s.patchTrip(t.id, fn(t)); s.setCurId(t.id)
  })
  const to = (screen: RiderScreen) => { s.jump(screen); nav.root(screen) }
  const setApproval = (a: 'pending' | 'approved' | 'rejected' | 'expired' | 'restricted') => {
    if (!s.vehicle.type) s.setVehicle(SAMPLE_VEHICLE)
    s.setApproval(a)
    const base = { licFront: sampleDoc(a === 'approved' ? 'approved' : 'review', 'Sample file'), licBack: emptyDoc(), rc: sampleDoc(a === 'approved' ? 'approved' : 'review', 'Sample file') }
    if (a === 'rejected') { base.licFront = { ...sampleDoc('action', 'Sample file'), reason: 'The photo is too blurry to read the licence number.' } }
    if (a === 'expired') { base.licFront = { ...sampleDoc('expired', 'Sample file'), reason: 'This licence has passed its expiry date.' } }
    s.setDocs(base)
    nav.root(a === 'pending' ? 'verification-pending' : a === 'approved' ? 'verification-verified' : 'verification-rejected')
  }
  const q = s.reqs.find(x => x.id === s.reqId && x.state === 'open') ?? s.reqs.find(x => x.state === 'open')
  const reqState = (label: string, state: 'cancelled' | 'expired' | 'taken') => btn(label, () => {
    if (!q) { setHint('There is no open request.'); return }
    s.patchReq(q.id, { state }); s.setReqId(q.id)
  })
  const H = (h: string) => <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', margin: '12px 0 6px' }}>{h}</p>
  return (
    <section aria-label="Pilot prototype controls" style={{ maxWidth: 560, width: '100%', padding: 12, borderRadius: 12, border: '1px dashed rgba(255,255,255,0.25)' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Pilot prototype controls</span>
        <button type="button" onClick={() => { s.reset(); nav.root('rider-home-idle'); onReset() }} style={{ fontSize: 12, fontWeight: 600, color: '#fff', padding: '7px 12px', minHeight: 36, borderRadius: 8, border: '1px solid rgba(255,255,255,0.3)' }}>Reset prototype</button>
      </div>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>
        Everything here is simulated. The start code is checked by a prototype setting, not a server. No backend, payment, messaging, map or location service is connected, and SOS never alerts a real contact.
        Trip controls act on {t ? `the ${t.pickup.name} → ${t.destination.name} trip (${TRIP_LABEL[t.status]})` : 'the current trip once one exists'}.
      </p>
      {hint && <p role="status" style={{ fontSize: 12, color: '#FEDF89', marginTop: 4 }}>{hint}</p>}
      {H('Setup and approval')}
      <div className="flex flex-wrap gap-2">
        {btn('Setup draft', () => { s.setApproval('draft'); s.setVehicle({ type: '', make: '', color: '', reg: '', helmet: '' }); s.setDocs(emptyDocs()); nav.root('setup-vehicle') })}
        {btn('Fill sample documents', () => { if (!s.vehicle.type) s.setVehicle(SAMPLE_VEHICLE); s.setApproval('draft'); s.setDocs({ licFront: sampleDoc('ready', 'Sample front.jpg'), licBack: emptyDoc(), rc: sampleDoc('ready', 'Sample RC.jpg') }); nav.root('setup-documents') })}
        {btn('Pending', () => setApproval('pending'))}
        {btn('Approved', () => setApproval('approved'))}
        {btn('Action needed', () => setApproval('rejected'))}
        {btn('Document expired', () => setApproval('expired'))}
        {btn('Restricted', () => setApproval('restricted'))}
      </div>
      <div className="flex flex-wrap gap-2" style={{ marginTop: 8 }}>
        {sel('Upload', 'uploadFail', [[false, 'Succeeds'], [true, 'Fails']])}
        {sel('Save draft', 'saveFail', [[false, 'Succeeds'], [true, 'Fails']])}
        {sel('Submission', 'submit', [['ok', 'Succeeds'], ['failed', 'Fails'], ['partial', 'Partly fails'], ['uncertain', 'Uncertain']])}
      </div>
      {H('Trips and requests')}
      <div className="flex flex-wrap gap-2">
        {btn('No trips', () => to('rider-home-idle'))}
        {btn('Published trip', () => to('rider-home-requests'))}
        {btn('Matching requests', () => to('tickets-list'))}
        {btn('Empty requests', () => to('tickets-empty'))}
        {reqState('Request cancelled', 'cancelled')}{reqState('Request expired', 'expired')}{reqState('Taken elsewhere', 'taken')}
      </div>
      <div className="flex flex-wrap gap-2" style={{ marginTop: 8 }}>
        {sel('Publishing', 'publish', [['ok', 'Succeeds'], ['failed', 'Fails'], ['uncertain', 'Uncertain'], ['conflict', 'Conflict']])}
        {sel('Accepting', 'accept', [['ok', 'Succeeds'], ['unavailable', 'Unavailable'], ['uncertain', 'Uncertain'], ['conflict', 'Conflict']])}
        {sel('Refresh', 'refresh', [['ok', 'Succeeds'], ['failed', 'Fails']])}
        {sel('Network', 'network', [['online', 'Online'], ['offline', 'Offline']])}
      </div>
      {H('Ride events')}
      <div className="flex flex-wrap gap-2">
        {act('Buddy cancels ride', () => ({ status: 'cancelled', cancelledBy: 'buddy', cancelReason: 'Plans changed' }), x => x.req && ['confirmed', 'heading', 'at-pickup'].includes(x.status) ? null : 'Needs a confirmed ride.')}
        {act('I’ve arrived', () => ({ status: 'at-pickup', arrivedAt: Date.now() }), x => ['confirmed', 'heading'].includes(x.status) ? null : 'Needs a confirmed ride.')}
        {act('Waiting time passed', () => ({ pastDue: true }))}
        {act('Ride started', () => ({ status: 'active', startedAt: Date.now(), loc: 'fresh', locAt: Date.now() }), x => x.status === 'at-pickup' && x.ack.match && x.ack.helmets ? null : 'Needs both pickup checks first; the start code can’t be skipped.')}
        {act('Location fresh', () => ({ loc: 'fresh', locAt: Date.now() }))}
        {act('Location stale', () => ({ loc: 'stale', locAt: Date.now() - 95000 }))}
        {act('Location unavailable', () => ({ loc: 'unavailable' }))}
        {act('Completed', () => ({ status: 'completed', endedAt: Date.now() }), x => x.status === 'active' ? null : 'Needs a ride in progress.')}
        {act('Ended early', () => ({ status: 'ended-early', endedAt: Date.now(), endState: 'acknowledged' }), x => x.status === 'active' ? null : 'Needs a ride in progress.')}
        {act('Settlement pending', () => ({ settlement: 'none' }))}
        {act('Settlement received', () => ({ settlement: 'cash' }))}
        {act('Report submitted', x => ({ reports: [{ ref: 'CR-1342', category: 'Pickup or route issue', details: '', at: Date.now(), status: 'Under review' }, ...x.reports] }))}
      </div>
      <div className="flex flex-wrap gap-2" style={{ marginTop: 8 }}>
        {sel('Location permission', 'locPerm', [['granted', 'Granted'], ['denied', 'Denied'], ['off', 'Device off'], ['unavailable', 'Unavailable'], ['inaccurate', 'Approximate'], ['background', 'Foreground only']])}
        {sel('Start code', 'code', [['accept', 'Accepted'], ['wrong', 'Wrong'], ['expired', 'Expired'], ['limit', 'Attempt limit'], ['uncertain', 'Uncertain']])}
        {sel('Complete ride', 'complete', [['ok', 'Succeeds'], ['failed', 'Fails'], ['uncertain', 'Uncertain']])}
        {sel('Early end', 'end', [['ack', 'Acknowledged'], ['uncertain', 'Uncertain']])}
        {sel('Message delivery', 'message', [['ok', 'Succeeds'], ['fail', 'Fails']])}
        {sel('Share link', 'shareFail', [[false, 'Creates'], [true, 'Fails']])}
        {sel('Rating', 'ratingFail', [[false, 'Saves'], [true, 'Fails']])}
      </div>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 10, lineHeight: 1.4 }}>Prototype assumptions: the waiting policy allows a no-show report 10 minutes after the agreed time, and a sample location counts as stale after about 30 seconds.</p>
    </section>
  )
}
