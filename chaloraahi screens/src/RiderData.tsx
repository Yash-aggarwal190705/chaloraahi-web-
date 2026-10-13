import { noShare, type ShareLink } from './shareModel'
import { useCallback, useMemo, useState } from 'react'
import {
  DEMO_AMOUNT, addDays, addMinutes, nowTime, occurrenceDates, placeById, todayISO,
  type MeetPoint, type Place,
} from './PassengerData'

// Pilot (rider) experience. Internal ids keep the original names; user-facing copy says Pilot / Buddy.

export type RiderScreen =
  | 'setup-vehicle' | 'setup-documents' | 'setup-promise'
  | 'verification-pending' | 'verification-verified' | 'verification-rejected'
  | 'rider-home-idle' | 'rider-home-requests' | 'post-trip' | 'review-trip'
  | 'my-trips' | 'trip-detail' | 'recurring'
  | 'tickets-list' | 'tickets-empty' | 'ticket-detail' | 'ticket-accepted'
  | 'heading-to-pickup' | 'at-pickup' | 'verify-otp' | 'ride-in-progress-r'
  | 'ride-summary' | 'rate-co-rider' | 'ride-cancelled-r' | 'report-r' | 'vehicle-status'

export const ALL_RIDER_SCREENS: RiderScreen[] = [
  'setup-vehicle', 'setup-documents', 'setup-promise', 'verification-pending', 'verification-verified', 'verification-rejected',
  'rider-home-idle', 'rider-home-requests', 'post-trip', 'review-trip', 'my-trips', 'trip-detail', 'recurring',
  'tickets-list', 'tickets-empty', 'ticket-detail', 'ticket-accepted', 'heading-to-pickup', 'at-pickup', 'verify-otp',
  'ride-in-progress-r', 'ride-summary', 'rate-co-rider', 'ride-cancelled-r', 'report-r', 'vehicle-status',
]

export const SETUP_SCREENS = new Set<RiderScreen>(['setup-vehicle', 'setup-documents', 'setup-promise'])
export const RFOCUSED = new Set<RiderScreen>([
  'setup-vehicle', 'setup-documents', 'setup-promise', 'post-trip', 'review-trip', 'ticket-detail', 'heading-to-pickup',
  'at-pickup', 'verify-otp', 'ride-in-progress-r', 'rate-co-rider', 'report-r', 'vehicle-status',
])
export const APPROVED_ONLY = new Set<RiderScreen>([
  'rider-home-idle', 'rider-home-requests', 'post-trip', 'review-trip', 'my-trips', 'trip-detail', 'recurring',
  'tickets-list', 'tickets-empty', 'ticket-detail',
])

export type SheetName =
  | 'role' | 'cancel-trip' | 'cancel-ride' | 'mismatch' | 'share' | 'options' | 'location' | 'block' | 'help'
  | 'directions' | 'complete' | 'early-end' | 'no-show' | 'decline' | 'skip' | 'end-schedule' | 'messages'
  | 'place' | 'trip-pick' | 'appeal' | 'remove-doc' | 'notifications'

// ── Vehicle and documents ────────────────────────────────────────────────────

export type Vehicle = { type: 'motorcycle' | 'scooter' | ''; make: string; color: string; reg: string; helmet: 'yes' | 'no' | '' }
export const emptyVehicle = (): Vehicle => ({ type: '', make: '', color: '', reg: '', helmet: '' })
export const SAMPLE_VEHICLE: Vehicle = { type: 'scooter', make: 'Honda Activa 6G', color: 'White', reg: 'RJ 14 AB 4821', helmet: 'yes' }

export const maskReg = (reg: string) => {
  const s = reg.replace(/[^a-z0-9]/gi, '').toUpperCase()
  if (s.length >= 8) return `${s.slice(0, 2)} ${s.slice(2, 4)} ·· ${s.slice(-4)}`
  return s ? `·· ${s.slice(-4)}` : ''
}
export const vehicleLine = (v: Vehicle) => [v.make, v.color].filter(Boolean).join(' · ')

export type DocKey = 'licFront' | 'licBack' | 'rc'
export type DocStatus = 'none' | 'selected' | 'ready' | 'uploading' | 'submitted' | 'review' | 'approved' | 'action' | 'expired'
export type Doc = { status: DocStatus; name: string; size: number; kind: 'image' | 'pdf'; url: string; error: string; reason: string; sample?: boolean }
export const emptyDoc = (): Doc => ({ status: 'none', name: '', size: 0, kind: 'image', url: '', error: '', reason: '' })
export const emptyDocs = (): Record<DocKey, Doc> => ({ licFront: emptyDoc(), licBack: emptyDoc(), rc: emptyDoc() })
export const DOC_META: Record<DocKey, { title: string; required: boolean; hint: string }> = {
  licFront: { title: 'Driving licence, front', required: true, hint: 'Show your name, photo and licence number clearly.' },
  licBack: { title: 'Driving licence, back', required: false, hint: 'Add this if your licence has details on the back.' },
  rc: { title: 'Registration certificate (RC)', required: true, hint: 'The page with your vehicle registration number.' },
}
export const DOC_STATUS: Record<DocStatus, string> = {
  none: 'Not added', selected: 'Selected', ready: 'Ready to submit', uploading: 'Uploading', submitted: 'Submitted',
  review: 'Under review', approved: 'Approved', action: 'Action needed', expired: 'Expired',
}
export const sampleDoc = (status: DocStatus, name: string): Doc => ({ ...emptyDoc(), status, name, size: 0, sample: true })

export type Approval = 'draft' | 'pending' | 'approved' | 'rejected' | 'expired' | 'restricted'
export type SubmitPhase = 'idle' | 'submitting' | 'failed' | 'partial' | 'uncertain' | 'checking'

// ── Requests ─────────────────────────────────────────────────────────────────

export type Req = {
  id: string; name: string; initials: string; rating: number | null; rides: number
  pickup: Place; dest: Place; window: string; time: string
  sharedKm: number; detourKm: number; detourMin: number; walkM: number; amount: number
  helmet: 'has' | 'needs'; state: 'open' | 'declined' | 'cancelled' | 'expired' | 'taken' | 'accepted'
}
export const makeReqs = (): Req[] => {
  const vgu = placeById('vgu')
  const base = { dest: vgu, state: 'open' as const }
  return [
    { ...base, id: 'q1', name: 'Arjun M.', initials: 'AM', rating: 4.7, rides: 8, pickup: placeById('mansarovar'), window: '7:50 – 8:10 AM', time: '08:00', sharedKm: 14.2, detourKm: 0.5, detourMin: 2, walkM: 60, amount: DEMO_AMOUNT, helmet: 'has' },
    { ...base, id: 'q2', name: 'Kavya S.', initials: 'KS', rating: null, rides: 0, pickup: placeById('vaishali'), window: '7:45 – 8:15 AM', time: '08:05', sharedKm: 11.6, detourKm: 1.5, detourMin: 5, walkM: 120, amount: 52, helmet: 'needs' },
    { ...base, id: 'q3', name: 'Dev P.', initials: 'DP', rating: 4.9, rides: 23, pickup: placeById('malviya'), window: '7:55 – 8:20 AM', time: '08:10', sharedKm: 12.8, detourKm: 1, detourMin: 4, walkM: 90, amount: 44, helmet: 'has' },
    { ...base, id: 'q4', name: 'Isha R.', initials: 'IR', rating: 4.5, rides: 5, pickup: placeById('pratap'), window: '8:00 – 8:25 AM', time: '08:15', sharedKm: 9.4, detourKm: 2.5, detourMin: 9, walkM: 150, amount: 34, helmet: 'needs' },
  ]
}

// ── Trips ────────────────────────────────────────────────────────────────────

export type TripStatus = 'draft' | 'published' | 'paused' | 'confirmed' | 'heading' | 'at-pickup' | 'active' | 'completed' | 'ended-early' | 'cancelled' | 'expired'
export const TRIP_LABEL: Record<TripStatus, string> = {
  draft: 'Draft', published: 'Published', paused: 'Paused', confirmed: 'Confirmed', heading: 'Heading to pickup', 'at-pickup': 'At pickup',
  active: 'Ride in progress', completed: 'Completed', 'ended-early': 'Ended early', cancelled: 'Cancelled', expired: 'No Buddy joined',
}
export const LIVE_STATES: TripStatus[] = ['heading', 'at-pickup', 'active']
export const OPEN_STATES: TripStatus[] = ['published', 'paused', 'confirmed', 'heading', 'at-pickup', 'active']

export type LocState = 'fresh' | 'stale' | 'unavailable'
export type Msg = { id: number; text: string; state: 'sending' | 'sent' | 'failed'; at: number }
export type Report = { ref: string; category: string; details: string; at: number; status: string }
export type TripPhase = 'idle' | 'working' | 'failed' | 'uncertain'

export type Trip = {
  id: string; status: TripStatus; parentId: string | null
  mode: 'one' | 'weekly'; date: string; startDate: string; endDate: string; days: boolean[]; time: string
  pickup: Place; pickupPoint: MeetPoint; destination: Place
  detour: number; helmet: 'spare' | 'own'; accepting: boolean
  occ: Record<string, 'open' | 'skipped' | 'confirmed'>; ended: boolean
  req: Req | null; amount: number; createdAt: number
  ack: { match: boolean; helmets: boolean }; wrongTries: number
  locReady: 'none' | 'granted' | 'skipped'; loc: LocState; locAt: number
  share: ShareLink
  endState: 'none' | 'saved-offline' | 'acknowledged'; completeState: 'none' | 'saved-offline'; endReason: string
  settlement: 'none' | 'cash' | 'upi' | 'notyet' | 'issue'
  rating: null | 'skipped' | { stars: number; tags: string[]; note: string }
  reports: Report[]; msgs: Msg[]; blocked: boolean; noShow: 'none' | 'reported'; pastDue: boolean
  cancelledBy: 'pilot' | 'buddy' | null; cancelReason: string; bookedAt: number | null
  headAt: number | null; arrivedAt: number | null; startedAt: number | null; endedAt: number | null
}

export type TDraft = {
  pickup: Place | null; pickupPoint: MeetPoint | null; destination: Place | null
  mode: 'one' | 'weekly'; date: string; startDate: string; endDate: string; days: boolean[]; time: string
  detour: number; helmet: 'spare' | 'own'; touched: boolean
}
export const newTDraft = (helmet: 'spare' | 'own' = 'spare'): TDraft => ({
  pickup: placeById('mansarovar'), pickupPoint: placeById('mansarovar').points[0], destination: placeById('vgu'),
  mode: 'one', date: addDays(todayISO(), 1), startDate: addDays(todayISO(), 1), endDate: addDays(todayISO(), 29),
  days: [true, true, true, true, true, false, false], time: '08:00', detour: 2, helmet, touched: false,
})

let seq = 500
export function tripFromDraft(d: TDraft): Trip {
  const base = { mode: d.mode, date: d.date, startDate: d.startDate, endDate: d.endDate, days: d.days }
  const dates = occurrenceDates(base)
  return {
    id: `t${++seq}`, status: 'published', parentId: null, ...base, date: dates[0] ?? d.startDate, time: d.time,
    pickup: d.pickup!, pickupPoint: d.pickupPoint ?? d.pickup!.points[0], destination: d.destination!,
    detour: d.detour, helmet: d.helmet, accepting: true,
    occ: Object.fromEntries(dates.map(x => [x, 'open' as const])), ended: false,
    req: null, amount: DEMO_AMOUNT, createdAt: Date.now(),
    ack: { match: false, helmets: false }, wrongTries: 0, locReady: 'none', loc: 'fresh', locAt: Date.now(),
    share: noShare(), endState: 'none', completeState: 'none', endReason: '',
    settlement: 'none', rating: null, reports: [], msgs: [], blocked: false, noShow: 'none', pastDue: false,
    cancelledBy: null, cancelReason: '', bookedAt: null, headAt: null, arrivedAt: null, startedAt: null, endedAt: null,
  }
}
export const draftFromTrip = (t: Trip): TDraft => ({
  pickup: t.pickup, pickupPoint: t.pickupPoint, destination: t.destination, mode: t.mode, date: t.date, startDate: t.startDate,
  endDate: t.endDate, days: t.days, time: t.time, detour: t.detour, helmet: t.helmet, touched: true,
})

export const fits = (t: Trip, q: Req) =>
  q.state === 'open' && q.detourKm <= t.detour && (t.helmet === 'spare' || q.helmet === 'has')
export const seatBooked = (t: Trip) => !!t.req && t.mode === 'one'
export const fmtKm = (n: number) => `${n % 1 ? n.toFixed(1) : n} km`
export const detourWords = (km: number) => km === 0 ? 'Only requests on your way' : `Up to ${fmtKm(km)} extra, about ${Math.max(2, Math.round(km * 3.4))} min`

export const noShowEligible = (t: Trip) => t.pastDue || (t.date === todayISO() && nowTime() >= addMinutes(t.time, 10))

export function screenForTrip(t: Trip): RiderScreen {
  switch (t.status) {
    case 'confirmed': return 'ticket-accepted'
    case 'heading': return 'heading-to-pickup'
    case 'at-pickup': return 'at-pickup'
    case 'active': return 'ride-in-progress-r'
    case 'completed': case 'ended-early': return 'ride-summary'
    case 'cancelled': return t.req ? 'ride-cancelled-r' : 'trip-detail'
    default: return 'trip-detail'
  }
}
export const LIFECYCLE = new Set<RiderScreen>(['ticket-accepted', 'heading-to-pickup', 'at-pickup', 'verify-otp', 'ride-in-progress-r', 'ride-summary', 'ride-cancelled-r'])

// ── Seeds ────────────────────────────────────────────────────────────────────

const PAST_PAX = { ...makeReqs()[0], id: 'h', name: 'Meera J.', initials: 'MJ', rating: 4.8, rides: 15, state: 'accepted' as const }
function seedTrip(status: TripStatus, over: Partial<Trip> = {}): Trip {
  const d = newTDraft()
  const t = tripFromDraft(d)
  const live = LIVE_STATES.includes(status)
  const booked = ['confirmed', 'heading', 'at-pickup', 'active', 'completed', 'ended-early'].includes(status)
  const date = live ? todayISO() : t.date
  const time = live ? addMinutes(nowTime(), -3) : t.time
  return {
    ...t, status, date, time, occ: { [date]: booked ? 'confirmed' : 'open' },
    req: booked ? { ...makeReqs()[0], state: 'accepted' } : null,
    startedAt: status === 'active' ? Date.now() - 6 * 60000 : null, endedAt: status === 'completed' || status === 'ended-early' ? Date.now() : null,
    arrivedAt: status === 'at-pickup' || status === 'active' ? Date.now() - 2 * 60000 : null,
    ...over,
  }
}
const seedPast = (): Trip[] => [
  seedTrip('completed', { id: 'h1', date: addDays(todayISO(), -2), req: PAST_PAX, settlement: 'cash', rating: { stars: 5, tags: ['On time'], note: '' } }),
  seedTrip('expired', { id: 'h2', date: addDays(todayISO(), -6), req: null, occ: {} }),
  seedTrip('cancelled', { id: 'h3', date: addDays(todayISO(), -9), req: null, cancelledBy: 'pilot', cancelReason: 'Plans changed', occ: {} }),
]

// ── Prototype settings ───────────────────────────────────────────────────────

export type RProto = {
  uploadFail: boolean; saveFail: boolean
  submit: 'ok' | 'failed' | 'partial' | 'uncertain'
  publish: 'ok' | 'failed' | 'uncertain' | 'conflict'
  accept: 'ok' | 'unavailable' | 'uncertain' | 'conflict'
  network: 'online' | 'offline'
  message: 'ok' | 'fail'
  locPerm: 'granted' | 'denied' | 'off' | 'unavailable' | 'inaccurate' | 'background'
  code: 'accept' | 'wrong' | 'expired' | 'limit' | 'uncertain'
  complete: 'ok' | 'failed' | 'uncertain'
  end: 'ack' | 'uncertain'
  refresh: 'ok' | 'failed'
  ratingFail: boolean; shareFail: boolean
}
export const DEFAULT_RPROTO: RProto = {
  uploadFail: false, saveFail: false, submit: 'ok', publish: 'ok', accept: 'ok', network: 'online', message: 'ok',
  locPerm: 'granted', code: 'accept', complete: 'ok', end: 'ack', refresh: 'ok', ratingFail: false, shareFail: false,
}

// ── Store ────────────────────────────────────────────────────────────────────

export function useRiderStore() {
  const [vehicle, setVehicleS] = useState<Vehicle>(emptyVehicle)
  const [docs, setDocs] = useState<Record<DocKey, Doc>>(emptyDocs)
  const [approval, setApproval] = useState<Approval>('draft')
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>('idle')
  const [draftSaved, setDraftSaved] = useState(false)
  const [checkedAt, setCheckedAt] = useState(0)
  const [trips, setTrips] = useState<Trip[]>(seedPast)
  const [reqs, setReqs] = useState<Req[]>(makeReqs)
  const [curId, setCurId] = useState<string | null>(null)
  const [tripId, setTripId] = useState<string | null>(null)
  const [reqId, setReqId] = useState<string | null>(null)
  const [draft, setDraftS] = useState<TDraft>(newTDraft)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [publishPhase, setPublishPhase] = useState<'idle' | 'publishing' | 'failed' | 'uncertain' | 'conflict' | 'published'>('idle')
  const [pendingTrip, setPendingTrip] = useState<Trip | null>(null)
  const [acceptPhase, setAcceptPhase] = useState<{ id: string; phase: 'confirming' | 'unavailable' | 'uncertain' | 'conflict' } | null>(null)
  const [refreshedAt, setRefreshedAt] = useState(Date.now())
  const [refreshFailed, setRefreshFailed] = useState(false)
  const [proto, setProto] = useState<RProto>(DEFAULT_RPROTO)
  const [notice, setNotice] = useState('')

  const setVehicle = useCallback((p: Partial<Vehicle>) => { setVehicleS(v => ({ ...v, ...p })); setDraftSaved(false) }, [])
  const setDoc = useCallback((k: DocKey, p: Partial<Doc>) => setDocs(d => ({ ...d, [k]: { ...d[k], ...p } })), [])
  const setDraft = useCallback((p: Partial<TDraft>) => setDraftS(d => ({ ...d, ...p, touched: true })), [])
  const patchTrip = useCallback((id: string, p: Partial<Trip> | ((t: Trip) => Partial<Trip>)) =>
    setTrips(ts => ts.map(t => t.id === id ? { ...t, ...(typeof p === 'function' ? p(t) : p) } : t)), [])
  const patchReq = useCallback((id: string, p: Partial<Req>) => setReqs(rs => rs.map(q => q.id === id ? { ...q, ...p } : q)), [])
  const cur = useMemo(() => trips.find(t => t.id === curId) ?? null, [trips, curId])
  const patchCur = useCallback((p: Partial<Trip> | ((t: Trip) => Partial<Trip>)) => { if (curId) patchTrip(curId, p) }, [curId, patchTrip])
  const upcoming = useMemo(() => trips.filter(t => OPEN_STATES.includes(t.status)), [trips])
  const past = useMemo(() => trips.filter(t => !OPEN_STATES.includes(t.status)), [trips])
  const published = useMemo(() => upcoming.filter(t => t.status === 'published' || t.status === 'paused'), [upcoming])
  const live = upcoming.find(t => LIVE_STATES.includes(t.status)) ?? null
  const selTrip = useMemo(() => published.find(t => t.id === tripId) ?? published[0] ?? null, [published, tripId])
  const addTrip = useCallback((t: Trip) => setTrips(ts => [t, ...ts]), [])

  // Confirm a request into a trip (weekly schedules spawn a one-off ride for the next open date).
  const confirmRequest = useCallback((trip: Trip, q: Req): string => {
    setReqs(rs => rs.map(x => x.id === q.id ? { ...x, state: 'accepted' } : x))
    if (trip.mode === 'one') {
      setTrips(ts => ts.map(t => t.id === trip.id ? { ...t, status: 'confirmed', req: { ...q, state: 'accepted' }, occ: { ...t.occ, [t.date]: 'confirmed' }, amount: q.amount, bookedAt: Date.now() } : t))
      return trip.id
    }
    const date = Object.keys(trip.occ).sort().find(d => trip.occ[d] === 'open') ?? trip.date
    const ride: Trip = { ...tripFromDraft({ ...draftFromTrip(trip), mode: 'one', date }), parentId: trip.id, status: 'confirmed', req: { ...q, state: 'accepted' }, amount: q.amount, occ: { [date]: 'confirmed' }, bookedAt: Date.now() }
    setTrips(ts => [ride, ...ts.map(t => t.id === trip.id ? { ...t, occ: { ...t.occ, [date]: 'confirmed' as const } } : t)])
    return ride.id
  }, [])

  const hasConflict = useCallback((date: string, time: string, ignoreId?: string | null) => {
    const m = (t: string) => { const [h, mm] = t.split(':').map(Number); return h * 60 + mm }
    return upcoming.some(t => t.id !== ignoreId && t.status !== 'paused' && (Object.keys(t.occ).includes(date) || t.date === date) && t.mode === 'one' && Math.abs(m(t.time) - m(time)) < 60)
  }, [upcoming])

  const seedPublished = (over: Partial<Trip> = {}) => { const t = seedTrip('published', over); setTrips([t, ...seedPast()]); setCurId(t.id); setTripId(t.id); return t }

  const jump = (s: RiderScreen) => {
    const setup = SETUP_SCREENS.has(s)
    if (s !== 'setup-vehicle' && !vehicle.type) setVehicleS(SAMPLE_VEHICLE)
    if (setup) { if (approval !== 'draft') setApproval('draft'); return }
    if (s === 'verification-pending') { setApproval('pending'); setDocs({ licFront: sampleDoc('review', 'Sample file'), licBack: emptyDoc(), rc: sampleDoc('review', 'Sample file') }); return }
    if (s === 'verification-rejected') {
      setApproval('rejected'); setDocs({ licFront: sampleDoc('action', 'Sample file'), licBack: emptyDoc(), rc: sampleDoc('approved', 'Sample file') })
      setDoc('licFront', { reason: 'The photo is too blurry to read the licence number.' }); return
    }
    setApproval('approved')
    setDocs(d => d.licFront.status === 'none' ? { licFront: sampleDoc('approved', 'Sample file'), licBack: emptyDoc(), rc: sampleDoc('approved', 'Sample file') } : d)
    setReqs(makeReqs()); setPublishPhase('idle'); setAcceptPhase(null); setRefreshFailed(false)
    const status: Partial<Record<RiderScreen, TripStatus>> = {
      'ticket-accepted': 'confirmed', 'heading-to-pickup': 'heading', 'at-pickup': 'at-pickup', 'verify-otp': 'at-pickup',
      'ride-in-progress-r': 'active', 'ride-summary': 'completed', 'rate-co-rider': 'completed', 'ride-cancelled-r': 'cancelled', 'report-r': 'confirmed',
    }
    const st = status[s]
    if (st) {
      const t = seedTrip(st, st === 'cancelled' ? { cancelledBy: 'buddy', cancelReason: 'Plans changed' } : {})
      t.ack = s === 'verify-otp' ? { match: true, helmets: true } : t.ack
      if (s === 'verify-otp') t.locReady = 'granted'
      setTrips([t, ...seedPast()]); setCurId(t.id); return
    }
    if (s === 'rider-home-idle' || s === 'post-trip' || s === 'review-trip') {
      setTrips(seedPast()); setCurId(null); setTripId(null)
      if (s !== 'rider-home-idle') { setDraftS({ ...newTDraft(), touched: true }); setEditingId(null) }
      return
    }
    if (s === 'recurring') { const d = { ...newTDraft(), mode: 'weekly' as const }; seedPublished({ mode: 'weekly', days: d.days, startDate: d.startDate, endDate: d.endDate, occ: Object.fromEntries(occurrenceDates({ mode: 'weekly', date: d.startDate, startDate: d.startDate, endDate: d.endDate, days: d.days }, 6).map(x => [x, 'open' as const])) }); return }
    if (s === 'tickets-empty') { seedPublished({ detour: 0 }); return }
    if (s === 'ticket-detail') setReqId('q1')
    seedPublished()
  }

  const reset = () => {
    setVehicleS(emptyVehicle()); setDocs(emptyDocs()); setApproval('draft'); setSubmitPhase('idle'); setDraftSaved(false); setCheckedAt(0)
    setTrips(seedPast()); setReqs(makeReqs()); setCurId(null); setTripId(null); setReqId(null); setDraftS(newTDraft()); setEditingId(null)
    setPublishPhase('idle'); setPendingTrip(null); setAcceptPhase(null); setRefreshedAt(Date.now()); setRefreshFailed(false); setProto(DEFAULT_RPROTO); setNotice('')
  }

  return {
    vehicle, setVehicle, docs, setDoc, setDocs, approval, setApproval, submitPhase, setSubmitPhase, draftSaved, setDraftSaved, checkedAt, setCheckedAt,
    trips, setTrips, reqs, setReqs, patchReq, cur, curId, setCurId, tripId, setTripId, reqId, setReqId, selTrip, patchTrip, patchCur, addTrip,
    upcoming, past, published, live, draft, setDraft, setDraftAll: setDraftS, editingId, setEditingId, publishPhase, setPublishPhase, pendingTrip, setPendingTrip,
    acceptPhase, setAcceptPhase, refreshedAt, setRefreshedAt, refreshFailed, setRefreshFailed, proto, setProto, notice, setNotice,
    confirmRequest, hasConflict, seedPublished, jump, reset,
  }
}
export type RStore = ReturnType<typeof useRiderStore>

export type RCtx = {
  s: RStore; screen: RiderScreen
  go: (x: RiderScreen) => void; back: () => void; root: (x: RiderScreen) => void; replace: (x: RiderScreen) => void
  open: (n: SheetName, arg?: string) => void; close: () => void; sheet: SheetName | null; sheetArg: string | undefined
  say: (m: string) => void; sos: () => void; online: boolean; switchRole: () => void; openTrip: (t: Trip) => void; notifications: () => void
}
