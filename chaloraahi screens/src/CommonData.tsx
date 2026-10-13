import { createContext, useCallback, useEffect, useRef, useState } from 'react'
import { addDays, todayISO } from './PassengerData'
import { WALLET_SCREENS, type WalletScreen } from './WalletNav'

export type CommonScreen =
  | 'notif-list' | 'notif-empty' | 'notif-detail'
  | 'profile' | 'edit-profile' | 'verify-status' | 'emergency-contact' | 'contact-form'
  | 'ride-history' | 'ride-detail' | 'notif-prefs' | 'help-support' | 'safety-center'
  | 'privacy-data' | 'delete-account' | 'blocked-users'
  | 'support-form' | 'my-support' | 'support-case'
  | 'policies' | 'policy-detail' | 'about'
  | 'status-suspended' | 'status-session-expired' | 'status-deletion' | 'logged-out'
  | 'pricing' | 'pricing-selected' | 'pricing-compare'
  | WalletScreen

export const ALL_COMMON_SCREENS: CommonScreen[] = [
  'profile', 'edit-profile', 'verify-status', 'emergency-contact', 'contact-form',
  'notif-list', 'notif-empty', 'notif-detail', 'notif-prefs',
  'ride-history', 'ride-detail',
  'help-support', 'support-form', 'my-support', 'support-case',
  'safety-center', 'blocked-users', 'privacy-data', 'delete-account',
  'policies', 'policy-detail', 'about',
  'status-suspended', 'status-session-expired', 'status-deletion', 'logged-out',
  'pricing', 'pricing-selected', 'pricing-compare',
  ...WALLET_SCREENS,
]

export const FUTURE_SCREENS = new Set<CommonScreen>(['pricing', 'pricing-selected', 'pricing-compare', ...WALLET_SCREENS])

// ── Navigation with origin stack ─────────────────────────────────────────────

export type Params = { id?: string; role?: 'buddy' | 'pilot'; filter?: string }
export type Entry = { screen: CommonScreen; p: Params }

export function useCommonNav() {
  const [stack, setStack] = useState<Entry[]>([{ screen: 'profile', p: {} }])
  const top = stack[stack.length - 1]
  const go = useCallback((screen: CommonScreen, p: Params = {}) => setStack(s => [...s, { screen, p }]), [])
  const root = useCallback((screen: CommonScreen, p: Params = {}) => setStack([{ screen, p }]), [])
  const replace = useCallback((screen: CommonScreen, p: Params = {}) => setStack(s => [...s.slice(0, -1), { screen, p }]), [])
  const pop = useCallback(() => setStack(s => (s.length > 1 ? s.slice(0, -1) : s)), [])
  const popTo = useCallback((screen: CommonScreen) => setStack(s => { const i = s.map(e => e.screen).lastIndexOf(screen); return i >= 0 ? s.slice(0, i + 1) : [{ screen, p: {} }] }), [])
  return { screen: top.screen, p: top.p, depth: stack.length, go, root, replace, pop, popTo }
}
export type CNav = ReturnType<typeof useCommonNav>

// ── Overlay host (sheets, toast, live region) ────────────────────────────────

export const HostCtx = createContext<{ host: HTMLElement | null; count: (d: number) => void; say: (m: string) => void }>({ host: null, count: () => {}, say: () => {} })

// ── Account data ─────────────────────────────────────────────────────────────

export type CollegeStatus = 'verified' | 'pending' | 'action' | 'expired' | 'restricted'
export type AccountStatus = 'active' | 'suspended' | 'session-expired' | 'deletion-requested'
export type Contact = { id: string; name: string; phone: string; relation: string; primary: boolean }

export type NotifDest =
  | { type: 'ride'; role: 'buddy' | 'pilot'; rideId: string; original: string }
  | { type: 'account'; to: CommonScreen; original: string }
export type Notif = { id: string; kind: 'ride' | 'account'; title: string; body: string; minsAgo: number; read: boolean; dest: NotifDest }

export type CaseStatus = 'Submitted' | 'Acknowledged' | 'In review' | 'Resolved'
export const CASE_STEPS: CaseStatus[] = ['Submitted', 'Acknowledged', 'In review', 'Resolved']
export type SupportCase = { ref: string; category: string; description: string; rideLabel: string; at: number; status: CaseStatus; draft: boolean; uncertain: boolean }

export type Prefs = Record<'rideConfirm' | 'rideArrival' | 'rideChange' | 'rideMsg' | 'matchBuddy' | 'matchPilot' | 'tips' | 'feedback', boolean>
const DEFAULT_PREFS: Prefs = { rideConfirm: true, rideArrival: true, rideChange: true, rideMsg: true, matchBuddy: true, matchPilot: true, tips: false, feedback: true }

export type CProto = {
  member: 'returning' | 'new'
  network: 'online' | 'offline'
  save: 'ok' | 'failed'
  upload: 'ok' | 'failed'
  contactSave: 'ok' | 'failed'
  prefSave: 'ok' | 'failed'
  support: 'ok' | 'failed' | 'uncertain'
  exportOut: 'ok' | 'failed'
  deleteOut: 'ok' | 'failed'
  notifMode: 'normal' | 'empty' | 'error' | 'offline'
  device: 'allowed' | 'denied' | 'not-requested'
}
export const DEFAULT_CPROTO: CProto = { member: 'returning', network: 'online', save: 'ok', upload: 'ok', contactSave: 'ok', prefSave: 'ok', support: 'ok', exportOut: 'ok', deleteOut: 'ok', notifMode: 'normal', device: 'allowed' }

export type ExportState = 'none' | 'requested' | 'preparing' | 'ready' | 'failed'
export type DeleteState = 'none' | 'requested' | 'processing' | 'completed' | 'failed'

const SEED_CONTACTS = (): Contact[] => [{ id: 'c1', name: 'Meera Mehta', phone: '9876543210', relation: 'Mother', primary: true }]
const SEED_BLOCKED = () => [{ id: 'b1', name: 'Kabir Malhotra', role: 'Buddy', since: addDays(todayISO(), -11) }, { id: 'b2', name: 'Dev Khandelwal', role: 'Pilot', since: addDays(todayISO(), -24) }]

const SEED_NOTIFS = (): Notif[] => [
  { id: 'n1', kind: 'ride', title: 'Your ride request was accepted', body: 'A Pilot accepted your request for VGU.', minsAgo: 35, read: false, dest: { type: 'ride', role: 'buddy', rideId: 'h2', original: 'Your ride request was accepted by a Pilot. Pickup details were shared in the ride.' } },
  { id: 'n2', kind: 'ride', title: 'Ride completed', body: 'How was your ride with Ananya? You can rate it.', minsAgo: 150, read: false, dest: { type: 'ride', role: 'buddy', rideId: 'h1', original: 'Your ride with Ananya Verma was marked complete.' } },
  { id: 'n3', kind: 'account', title: 'College membership verified', body: 'Your VGU membership was approved.', minsAgo: 60 * 30, read: true, dest: { type: 'account', to: 'verify-status', original: 'Your VGU college membership was approved by an authorized operator.' } },
  { id: 'n4', kind: 'ride', title: 'A Buddy trip finished', body: 'Your trip to VGU was completed.', minsAgo: 60 * 50, read: true, dest: { type: 'ride', role: 'pilot', rideId: 'h1', original: 'Your trip to VGU was completed with a Buddy.' } },
  { id: 'n5', kind: 'account', title: 'Add an emergency contact', body: 'Adding one takes a minute. It does not share your location.', minsAgo: 60 * 72, read: true, dest: { type: 'account', to: 'emergency-contact', original: 'You can add a trusted person as an emergency contact. Adding a contact does not automatically share your location.' } },
  { id: 'n6', kind: 'ride', title: 'Ride update', body: 'There is an update on an earlier ride.', minsAgo: 60 * 100, read: true, dest: { type: 'ride', role: 'buddy', rideId: 'removed-1', original: 'There was an update on an earlier ride.' } },
]

type Seed = { name: string; email: string; area: string }

export function useAccountStore(seed: Seed) {
  const [name, setName] = useState(seed.name || 'Aarav Sharma')
  const [email, setEmail] = useState(seed.email || 'aarav.sharma@vgu.ac.in')
  const [area, setArea] = useState(seed.area || 'Mansarovar')
  const [photo, setPhoto] = useState<string | null>(null)
  const [college, setCollege] = useState<CollegeStatus>('verified')
  const [collegeAt] = useState(() => addDays(todayISO(), -30))
  const [contacts, setContacts] = useState<Contact[]>(SEED_CONTACTS)
  const [notifyContacts, setNotifyContacts] = useState(true)
  const [notifs, setNotifs] = useState<Notif[]>(SEED_NOTIFS)
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS)
  const [blocked, setBlocked] = useState(SEED_BLOCKED)
  const [cases, setCases] = useState<SupportCase[]>([])
  const [exportState, setExportState] = useState<ExportState>('none')
  const [deleteState, setDeleteState] = useState<DeleteState>('none')
  const [status, setStatus] = useState<AccountStatus>('active')
  const [proto, setProto] = useState<CProto>(DEFAULT_CPROTO)
  const [ui, setUi] = useState({ notifFilter: 'All', histRole: 'All', histTab: 'Upcoming', devicePromptSeen: false })
  const seq = useRef(4200)

  useEffect(() => { if (seed.name) setName(seed.name) }, [seed.name])
  useEffect(() => { if (seed.email) setEmail(seed.email) }, [seed.email])
  useEffect(() => { if (seed.area) setArea(seed.area) }, [seed.area])

  const nextRef = () => `CR-${++seq.current}`
  const reset = () => {
    setName(seed.name || 'Aarav Sharma'); setEmail(seed.email || 'aarav.sharma@vgu.ac.in'); setArea(seed.area || 'Mansarovar'); setPhoto(null)
    setCollege('verified'); setContacts(SEED_CONTACTS()); setNotifyContacts(true); setNotifs(SEED_NOTIFS()); setPrefs(DEFAULT_PREFS); setBlocked(SEED_BLOCKED()); setCases([])
    setExportState('none'); setDeleteState('none'); setStatus('active'); setProto(DEFAULT_CPROTO); setUi({ notifFilter: 'All', histRole: 'All', histTab: 'Upcoming', devicePromptSeen: false })
  }
  const markRead = (id: string) => setNotifs(ns => ns.map(n => (n.id === id ? { ...n, read: true } : n)))

  return {
    name, setName, email, area, setArea, photo, setPhoto, college, setCollege, collegeAt, contacts, setContacts, notifyContacts, setNotifyContacts, notifs, setNotifs, markRead,
    prefs, setPrefs, blocked, setBlocked, cases, setCases, nextRef, exportState, setExportState, deleteState, setDeleteState, status, setStatus,
    proto, setProto, ui, setUi, reset,
  }
}
export type AStore = ReturnType<typeof useAccountStore>

export const initialsOf = (n: string) => n.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?'
export const maskPhone = (p: string) => `+91 ••••• •${p.slice(-4)}`
export const fullPhone = (p: string) => `+91 ${p.slice(0, 5)} ${p.slice(5)}`
export const parsePhone = (raw: string) => {
  const d = raw.replace(/[\s-]/g, '').replace(/^(\+91|91|0)(?=\d{10}$)/, '')
  return /^[6-9]\d{9}$/.test(d) ? d : null
}
export const ago = (mins: number) => (mins < 60 ? `${Math.max(1, mins)} min ago` : mins < 60 * 24 ? `${Math.round(mins / 60)} h ago` : `${Math.round(mins / 1440)} d ago`)
