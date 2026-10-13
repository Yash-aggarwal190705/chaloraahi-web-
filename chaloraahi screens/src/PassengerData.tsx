import { noShare, type ShareLink } from './shareModel'
import { useCallback, useMemo, useRef, useState } from 'react'

// Vocabulary: the product owner asked for "Buddy" (requesting a seat) and "Pilot" (operating the two-wheeler).
export const PILOT = { lo: 'pilot', cap: 'Pilot', pl: 'pilots' }
export const BUDDY = { lo: 'buddy', cap: 'Buddy' }

// ── Screens ──────────────────────────────────────────────────────────────────

export type CustomerScreen =
  | 'idle' | 'searching' | 'meeting-point' | 'ticket-form' | 'review-request' | 'waiting'
  | 'my-rides' | 'recurring' | 'rider-accepted' | 'rider-arriving' | 'at-pickup' | 'ride-in-progress'
  | 'ride-summary' | 'rate-rider' | 'ride-cancelled' | 'report' | 'share-viewer'

export const ALL_CUSTOMER_SCREENS: CustomerScreen[] = [
  'idle', 'searching', 'meeting-point', 'ticket-form', 'review-request', 'waiting',
  'my-rides', 'recurring', 'rider-accepted', 'rider-arriving', 'at-pickup', 'ride-in-progress',
  'ride-summary', 'rate-rider', 'ride-cancelled', 'report', 'share-viewer',
]

// Screens where the bottom navigation is hidden (focused tasks)
export const FOCUSED_SCREENS = new Set<CustomerScreen>([
  'searching', 'meeting-point', 'ticket-form', 'review-request', 'at-pickup', 'report', 'share-viewer', 'rate-rider',
])

// ── Places (sample data; no live geocoding) ──────────────────────────────────

export type MeetPoint = { id: string; label: string; detail: string }
export type Place = {
  id: string; name: string; locality: string; kind: 'college' | 'saved' | 'recent' | 'search'
  x: number; y: number; points: MeetPoint[]
}

export const PLACES: Place[] = [
  { id: 'vgu', name: 'VGU Main Gate', locality: 'Jagatpura, Jaipur', kind: 'college', x: 300, y: 70,
    points: [{ id: 'g1', label: 'Main gate, left of the guard room', detail: 'Near the campus bus bay' }, { id: 'g2', label: 'Gate 2, visitor parking', detail: 'Opposite the stationery shop' }] },
  { id: 'mansarovar', name: 'Mansarovar Metro Station', locality: 'Mansarovar, Jaipur', kind: 'saved', x: 90, y: 215,
    points: [{ id: 'm1', label: 'Exit 2, under the footbridge', detail: 'Next to the chai stall' }, { id: 'm2', label: 'Exit 1, auto stand', detail: 'By the ticket office' }] },
  { id: 'vaishali', name: 'Vaishali Nagar Circle', locality: 'Vaishali Nagar, Jaipur', kind: 'recent', x: 60, y: 120,
    points: [{ id: 'v1', label: 'Circle, east side', detail: 'Beside the bank ATM' }] },
  { id: 'malviya', name: 'Malviya Nagar Crossing', locality: 'Malviya Nagar, Jaipur', kind: 'recent', x: 170, y: 245,
    points: [{ id: 'ml1', label: 'Crossing, near the petrol pump', detail: 'Opposite the sweet shop' }] },
  { id: 'pratap', name: 'Pratap Nagar Bus Stop', locality: 'Pratap Nagar, Jaipur', kind: 'search', x: 215, y: 190,
    points: [{ id: 'p1', label: 'Bus stop shelter', detail: 'Facing the main road' }] },
  { id: 'sindhi', name: 'Sindhi Camp Bus Stand', locality: 'Sindhi Camp, Jaipur', kind: 'search', x: 140, y: 60,
    points: [{ id: 's1', label: 'Platform 1 entrance', detail: 'By the enquiry window' }] },
  { id: 'jagatpura', name: 'Jagatpura Railway Crossing', locality: 'Jagatpura, Jaipur', kind: 'search', x: 255, y: 120,
    points: [{ id: 'j1', label: 'Crossing, service road', detail: 'Next to the tea stall' }] },
  { id: 'sitapura', name: 'Sitapura Industrial Area', locality: 'Sitapura, Jaipur', kind: 'search', x: 330, y: 195,
    points: [{ id: 'si1', label: 'Gate 1, main road', detail: 'Near the auto stand' }] },
]
export const placeById = (id: string) => PLACES.find(p => p.id === id)!

// ── Dates ────────────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0')
export const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const parseISO = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
export const todayISO = () => isoOf(new Date())
export const addDays = (s: string, n: number) => { const d = parseISO(s); d.setDate(d.getDate() + n); return isoOf(d) }
export const fmtDate = (s: string, year = false) =>
  parseISO(s).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}) })
export const relDay = (s: string) => s === todayISO() ? 'Today' : s === addDays(todayISO(), 1) ? 'Tomorrow' : ''
export const dayLabel = (s: string) => { const r = relDay(s); return r ? `${r}, ${fmtDate(s)}` : fmtDate(s) }
export const fmtTime = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`
}
export const nowTime = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}` }
export const stamp = (t: number) => new Date(t).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const weekdayIdx = (s: string) => (parseISO(s).getDay() + 6) % 7

// ── Money (demo estimate; not a tariff) ──────────────────────────────────────

export const DEMO_AMOUNT = 46
export const CHANGED_AMOUNT = 52
export const inr = (n: number) => `₹${n}`

// ── Types ────────────────────────────────────────────────────────────────────

export type Draft = {
  pickup: Place | null; pickupPoint: MeetPoint | null; pickupNote: string
  destination: Place | null
  mode: 'one' | 'weekly'
  date: string; startDate: string; endDate: string; days: boolean[]
  earliest: string; latest: string
}
export const newDraft = (): Draft => ({
  pickup: null, pickupPoint: null, pickupNote: '', destination: null,
  mode: 'one', date: addDays(todayISO(), 1), startDate: addDays(todayISO(), 1), endDate: addDays(todayISO(), 29),
  days: [true, true, true, true, true, false, false], earliest: '07:45', latest: '08:15',
})

export type RideStatus = 'awaiting' | 'confirmed' | 'on-the-way' | 'at-pickup' | 'in-progress' | 'completed' | 'cancelled' | 'expired' | 'ended-early'
export const STATUS_LABEL: Record<RideStatus, string> = {
  awaiting: 'Awaiting rider', confirmed: 'Confirmed', 'on-the-way': 'Rider on the way', 'at-pickup': 'At pickup',
  'in-progress': 'Ride in progress', completed: 'Completed', cancelled: 'Cancelled', expired: 'Expired', 'ended-early': 'Ended early',
}
STATUS_LABEL['awaiting'] = `Awaiting ${PILOT.lo}`
STATUS_LABEL['on-the-way'] = `${PILOT.cap} on the way`

export type Rider = { name: string; initials: string; rating: number | null; rides: number; vehicle: string; color: string; reg: string; helmets: string }
export const SAMPLE_RIDER: Rider = { name: 'Rohan Sharma', initials: 'RS', rating: 4.8, rides: 42, vehicle: 'Honda Activa 6G', color: 'White', reg: 'RJ 14 ·· 4821', helmets: 'Rider has two helmets' }
export const NEW_RIDER: Rider = { ...SAMPLE_RIDER, rating: null, rides: 0 }

export type CodeState = 'ready' | 'expired' | 'refreshing' | 'unavailable' | 'locked' | 'waiting'
export type LocState = 'fresh' | 'stale' | 'unavailable'
export type EndState = 'none' | 'saved-offline' | 'requested' | 'acknowledged'
export type Report = { ref: string; category: string; at: number; status: string }
export type Msg = { id: number; text: string; state: 'sending' | 'sent' | 'failed'; at: number }

export type Ride = {
  id: string; status: RideStatus
  mode: 'one' | 'weekly'; date: string; startDate: string; endDate: string; days: boolean[]
  earliest: string; latest: string
  pickup: Place; pickupPoint: MeetPoint; pickupNote: string; destination: Place
  amount: number; createdAt: number
  rider: Rider | null
  occ: Record<string, 'awaiting' | 'confirmed' | 'skipped'>; paused: boolean; ended: boolean
  noMatchYet: boolean; cancelledBy: 'passenger' | 'rider' | null; cancelReason: string
  notif: 'ask' | 'enabled' | 'declined'
  ack: { match: boolean; helmets: boolean }
  code: CodeState; codeValue: string; wrongTries: number
  loc: LocState; locAt: number
  share: ShareLink
  endState: EndState; endReason: string
  settlement: 'none' | 'paid' | 'issue'
  rating: null | 'skipped' | { stars: number; tags: string[]; note: string }
  reports: Report[]; msgs: Msg[]; blocked: boolean; noShow: 'none' | 'reported'
  startedAt: number | null; endedAt: number | null
  summaryVariant: 'normal' | 'awaiting-confirmation' | 'under-review'
  pastDue: boolean; onWayAt: number | null
}

export const occurrenceDates = (r: Pick<Ride, 'startDate' | 'endDate' | 'days' | 'mode' | 'date'>, max = 8) => {
  if (r.mode === 'one') return [r.date]
  const out: string[] = []
  for (let d = r.startDate; d <= r.endDate && out.length < max; d = addDays(d, 1)) if (r.days[weekdayIdx(d)]) out.push(d)
  return out
}

let seq = 100
export function rideFromDraft(d: Draft, amount: number): Ride {
  const base = {
    mode: d.mode, date: d.mode === 'one' ? d.date : addDays(d.startDate, 0), startDate: d.startDate, endDate: d.endDate, days: d.days,
  }
  const dates = occurrenceDates({ ...base })
  const date = dates[0] ?? d.startDate
  return {
    id: `r${++seq}`, status: 'awaiting', ...base, date, earliest: d.earliest, latest: d.latest,
    pickup: d.pickup!, pickupPoint: d.pickupPoint ?? d.pickup!.points[0], pickupNote: d.pickupNote, destination: d.destination!,
 amount, createdAt: Date.now(), rider: null,
    occ: Object.fromEntries(dates.map(x => [x, 'awaiting' as const])), paused: false, ended: false,
    noMatchYet: false, cancelledBy: null, cancelReason: '', notif: 'ask',
    ack: { match: false, helmets: false }, code: 'ready', codeValue: '4719', wrongTries: 0,
    loc: 'fresh', locAt: Date.now(), share: noShare(),
    endState: 'none', endReason: '', settlement: 'none', rating: null, reports: [], msgs: [], blocked: false, noShow: 'none',
    startedAt: null, endedAt: null, summaryVariant: 'normal', pastDue: false, onWayAt: null,
  }
}

export function sampleDraft(): Draft {
  return { ...newDraft(), pickup: placeById('mansarovar'), pickupPoint: placeById('mansarovar').points[0], destination: placeById('vgu') }
}

function seedRide(status: RideStatus, over: Partial<Ride> = {}): Ride {
  const r = rideFromDraft(sampleDraft(), DEMO_AMOUNT)
  const rider = status === 'awaiting' ? null : SAMPLE_RIDER
  const occ = status === 'awaiting' ? r.occ : Object.fromEntries(Object.keys(r.occ).map((k, i) => [k, i === 0 ? 'confirmed' as const : 'awaiting' as const]))
  return { ...r, status, rider, occ, ...over }
}

// Past rides for My rides > Past
const past = (id: string, status: RideStatus, offset: number, over: Partial<Ride> = {}): Ride => ({
  ...seedRide(status, { id, date: addDays(todayISO(), offset), ...over }),
})
const seedPast = (): Ride[] => [
  past('h1', 'completed', -2, { rating: { stars: 5, tags: ['On time'], note: '' }, settlement: 'paid', rider: { ...SAMPLE_RIDER, name: 'Ananya Verma', initials: 'AV', vehicle: 'TVS Jupiter', color: 'Grey', reg: 'RJ 14 ·· 2290' } }),
  past('h2', 'cancelled', -5, { cancelledBy: 'passenger', cancelReason: 'Plans changed' }),
  past('h3', 'expired', -9, { rider: null, pickup: placeById('vaishali'), pickupPoint: placeById('vaishali').points[0] }),
]

// ── Prototype settings ───────────────────────────────────────────────────────

export type PProto = {
  verification: 'approved' | 'pending'
  route: 'available' | 'unavailable'
  estimate: 'ok' | 'unavailable' | 'changed'
  publish: 'ok' | 'failed' | 'uncertain'
  network: 'online' | 'offline'
  location: 'granted' | 'denied'
  notifications: 'allow' | 'deny'
  message: 'ok' | 'fail'
  end: 'acknowledged' | 'uncertain'
  shareFail: boolean
  viewer: 'active' | 'stale' | 'ended' | 'expired' | 'revoked'
}
export const DEFAULT_PPROTO: PProto = {
  verification: 'approved', route: 'available', estimate: 'ok', publish: 'ok', network: 'online',
  location: 'granted', notifications: 'allow', message: 'ok', end: 'acknowledged', shareFail: false, viewer: 'active',
}

// ── Store ────────────────────────────────────────────────────────────────────

export function usePassengerStore() {
  const [draft, setDraftState] = useState<Draft>(newDraft)
  const [rides, setRides] = useState<Ride[]>(seedPast)
  const [curId, setCurId] = useState<string | null>(null)
  const [proto, setProto] = useState<PProto>(DEFAULT_PPROTO)
  const [recents] = useState<string[]>(['vaishali', 'malviya'])
  // Place selection in progress on the meeting-point screen
  const [pending, setPending] = useState<{ field: 'pickup' | 'destination'; place: Place; from: 'route' | 'search' } | null>(null)
  const [publishPhase, setPublishPhase] = useState<'idle' | 'publishing' | 'failed' | 'uncertain' | 'checking' | 'estimate-changed' | 'estimate-unavailable' | 'conflict'>('idle')
  const [uncertain, setUncertain] = useState<Ride | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchField, setSearchField] = useState<'pickup' | 'destination'>('pickup')
  const [lastAcked, setLastAcked] = useState<number>(0)
  const [, bump] = useState(0)
  const ridesRef = useRef(rides); ridesRef.current = rides

  const setDraft = useCallback((p: Partial<Draft>) => setDraftState(d => ({ ...d, ...p })), [])
  const patchRide = useCallback((id: string, p: Partial<Ride> | ((r: Ride) => Partial<Ride>)) =>
    setRides(rs => rs.map(r => r.id === id ? { ...r, ...(typeof p === 'function' ? p(r) : p) } : r)), [])
  const cur = useMemo(() => rides.find(r => r.id === curId) ?? null, [rides, curId])
  const patchCur = useCallback((p: Partial<Ride> | ((r: Ride) => Partial<Ride>)) => { if (curId) patchRide(curId, p) }, [curId, patchRide])
  const addRide = (r: Ride) => { setRides(rs => [r, ...rs]); setCurId(r.id) }
  const upcoming = useMemo(() => rides.filter(r => ['awaiting', 'confirmed', 'on-the-way', 'at-pickup', 'in-progress'].includes(r.status)), [rides])
  const pastRides = useMemo(() => rides.filter(r => !['awaiting', 'confirmed', 'on-the-way', 'at-pickup', 'in-progress'].includes(r.status)), [rides])

  // Jump used by the screen picker: seeds a coherent ride for the chosen screen.
  const jump = (s: CustomerScreen) => {
    const needDraft = ['ticket-form', 'review-request', 'meeting-point'].includes(s)
    if (needDraft && !draft.pickup) setDraftState(sampleDraft())
    if (s === 'meeting-point' && !pending) setPending({ field: 'pickup', place: draft.pickup ?? placeById('mansarovar'), from: 'route' })
    const map: Partial<Record<CustomerScreen, Partial<Ride> & { status: RideStatus }>> = {
      waiting: { status: 'awaiting' }, 'rider-accepted': { status: 'confirmed' },
      'rider-arriving': { status: 'on-the-way' }, 'at-pickup': { status: 'at-pickup' },
      'ride-in-progress': { status: 'in-progress', startedAt: Date.now() },
      'ride-summary': { status: 'completed', endedAt: Date.now() }, 'rate-rider': { status: 'completed', endedAt: Date.now() },
      'ride-cancelled': { status: 'cancelled', cancelledBy: 'rider', cancelReason: 'Schedule conflict' },
      report: { status: 'confirmed' }, 'share-viewer': { status: 'in-progress' }, recurring: { status: 'awaiting', mode: 'weekly' },
    }
    const m = map[s]
    if (m) {
      const r = seedRide(m.status, { id: `r${++seq}`, ...m })
      if (s === 'recurring') { r.date = occurrenceDates(r)[0]; r.occ = Object.fromEntries(occurrenceDates(r).map(d => [d, 'awaiting' as const])) }
      setRides(rs => [r, ...rs]); setCurId(r.id)
    }
    if (s === 'my-rides' && !rides.some(x => x.status === 'awaiting' || x.status === 'confirmed')) {
      const a = seedRide('awaiting', { id: `r${++seq}` }), b = seedRide('confirmed', { id: `r${++seq}`, date: addDays(todayISO(), 2), pickup: placeById('malviya'), pickupPoint: placeById('malviya').points[0] })
      setRides(rs => [a, b, ...rs])
    }
  }

  const reset = () => {
    setDraftState(newDraft()); setRides(seedPast()); setCurId(null); setProto(DEFAULT_PPROTO); setPending(null); setPublishPhase('idle'); setUncertain(null); setEditingId(null); setLastAcked(0); bump(x => x + 1)
  }

  return {
    draft, setDraft, resetDraft: () => setDraftState(newDraft()),
    rides, cur, curId, setCurId, patchRide, patchCur, addRide, upcoming, pastRides,
    proto, setProto, recents, pending, setPending, publishPhase, setPublishPhase, uncertain, setUncertain, editingId, setEditingId, searchField, setSearchField, lastAcked, setLastAcked, jump, reset,
  }
}
export type PStore = ReturnType<typeof usePassengerStore>

// Which screen shows a ride in a given status
export const screenForStatus = (s: RideStatus): CustomerScreen =>
  s === 'awaiting' ? 'waiting' : s === 'confirmed' ? 'rider-accepted' : s === 'on-the-way' ? 'rider-arriving'
  : s === 'at-pickup' ? 'at-pickup' : s === 'in-progress' ? 'ride-in-progress'
  : s === 'completed' || s === 'ended-early' ? 'ride-summary' : 'ride-cancelled'

export const LIFECYCLE_SCREENS = new Set<CustomerScreen>(['waiting', 'rider-accepted', 'rider-arriving', 'at-pickup', 'ride-in-progress', 'ride-summary', 'ride-cancelled'])

export const draftFromRide = (r: Ride): Draft => ({
  pickup: r.pickup, pickupPoint: r.pickupPoint, pickupNote: r.pickupNote, destination: r.destination,
  mode: r.mode, date: r.date, startDate: r.startDate, endDate: r.endDate, days: r.days,
  earliest: r.earliest, latest: r.latest,
})
export const agreedTime = (r: Pick<Ride, 'earliest' | 'latest'>) => {
  const f = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const mid = Math.round((f(r.earliest) + f(r.latest)) / 2)
  return `${pad(Math.floor(mid / 60))}:${pad(mid % 60)}`
}
export const addMinutes = (t: string, n: number) => {
  const [h, m] = t.split(':').map(Number); const x = (h * 60 + m + n + 1440) % 1440
  return `${pad(Math.floor(x / 60))}:${pad(x % 60)}`
}
export const validateDraft = (d: Draft) => {
  const e: { date?: string; time?: string; days?: string; range?: string } = {}
  const first = d.mode === 'one' ? d.date : d.startDate
  if (!first) e.date = 'Choose a date.'
  else if (first < todayISO()) e.date = 'Choose today or a later date.'
  if (d.latest <= d.earliest) e.time = 'Latest departure must be after earliest departure.'
  else if (first === todayISO() && d.latest <= nowTime()) e.time = 'That departure window has already passed. Choose a later time or date.'
  if (d.mode === 'weekly') {
    if (!d.days.some(Boolean)) e.days = 'Choose at least one day.'
    if (d.endDate < d.startDate) e.range = 'End date must be on or after the start date.'
    else if (!e.days && occurrenceDates({ mode: 'weekly', date: d.startDate, startDate: d.startDate, endDate: d.endDate, days: d.days }, 1).length === 0) e.range = 'No selected day falls between these dates.'
  }
  return e
}
