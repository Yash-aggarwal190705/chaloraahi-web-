// Concept-demo ledger. Integer paise only. This is a front-end simulation, not a production ledger.

export type Account = 'passenger' | 'rider'
export type TxType = 'topup' | 'fuel-in' | 'fuel-out' | 'withdrawal' | 'refund'
export type TxStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'unknown'
export type Method = 'upi' | 'card'
export type Dest = { id: string; bank: string; last4: string; holder: string }

export type Txn = {
  id: string; ref: string; account: Account; type: TxType; amount: number; status: TxStatus
  createdAt: number; updatedAt: number
  key?: string
  method?: Method
  dest?: Dest
  rideId?: string; rideRole?: 'buddy' | 'pilot'; rideLabel?: string
  relatesTo?: string
}

export type PlanId = 'basic' | 'plus' | 'pro'
export type PlanPayment = {
  id: string; ref: string; planId: PlanId; amount: number; method: Method; status: TxStatus
  createdAt: number; updatedAt: number; key?: string; startsAt?: number; expiresAt?: number
}

export type Ledger = {
  opening: Record<Account, number>
  txns: Txn[]
  plans: PlanPayment[]
  seq: number
}

export const LIMITS = { topupMin: 1000, topupMax: 500000, demoFee: 0 }
export const UNRESOLVED: TxStatus[] = ['pending', 'processing', 'unknown']
export const isOpen = (s: TxStatus) => UNRESOLVED.includes(s)

// ── Money ────────────────────────────────────────────────────────────────────

export type AmountError = 'empty' | 'negative' | 'format' | 'decimals' | 'zero' | 'min' | 'max'
export type Parsed = { ok: true; paise: number } | { ok: false; code: AmountError }

export function parseAmount(raw: string, opt: { min?: number; max?: number } = {}): Parsed {
  const s = raw.trim()
  if (!s) return { ok: false, code: 'empty' }
  if (/^-/.test(s)) return { ok: false, code: 'negative' }
  if (/^\d{1,9}\.\d{3,}$/.test(s)) return { ok: false, code: 'decimals' }
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(s)) return { ok: false, code: 'format' }
  const [w, f = ''] = s.split('.')
  const paise = Number(w) * 100 + Number(f.padEnd(2, '0'))
  if (paise <= 0) return { ok: false, code: 'zero' }
  if (opt.min && paise < opt.min) return { ok: false, code: 'min' }
  if (opt.max !== undefined && paise > opt.max) return { ok: false, code: 'max' }
  return { ok: true, paise }
}

const whole = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 })
const fine = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const inr = (paise: number) => (paise % 100 === 0 ? whole : fine).format(paise / 100)
export const toInput = (paise: number) => (paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2))

// ── Dates (one consistent timezone) ──────────────────────────────────────────

const TZ = 'Asia/Kolkata'
const dayKey = (ts: number) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ts)
const monthKey = (ts: number) => dayKey(ts).slice(0, 7)
export const fmtTime = (ts: number) => new Intl.DateTimeFormat('en-IN', { timeZone: TZ, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).format(ts)
export const fmtFull = (ts: number) => new Intl.DateTimeFormat('en-IN', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short' }).format(ts)
export const fmtDay = (ts: number) => new Intl.DateTimeFormat('en-IN', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' }).format(ts)

export function groupLabel(ts: number, now: number): string {
  const d = dayKey(ts)
  if (d === dayKey(now)) return 'Today'
  if (d === dayKey(now - 86400000)) return 'Yesterday'
  if (monthKey(ts) === monthKey(now)) return 'Earlier this month'
  return new Intl.DateTimeFormat('en-IN', { timeZone: TZ, month: 'long', year: 'numeric' }).format(ts)
}

// Same calendar day next month (IST), clamped to month end: 31 Jan -> 28/29 Feb.
export function addOneMonth(ts: number): number {
  const off = 330 * 60000
  const d = new Date(ts + off)
  const y = d.getUTCFullYear(), m = d.getUTCMonth(), day = d.getUTCDate()
  const last = new Date(Date.UTC(y, m + 2, 0)).getUTCDate()
  const next = Date.UTC(y, m + 1, Math.min(day, last), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds())
  return next - off
}

// ── Derived balances ─────────────────────────────────────────────────────────

const CREDIT: TxType[] = ['topup', 'fuel-in', 'refund']

export function balances(l: Ledger, account: Account) {
  let settled = l.opening[account], reserved = 0, pendingIn = 0
  for (const t of l.txns) {
    if (t.account !== account) continue
    if (t.status === 'completed') settled += CREDIT.includes(t.type) ? t.amount : -t.amount
    else if (t.type === 'withdrawal' && isOpen(t.status)) reserved += t.amount
    else if (t.type === 'topup' && isOpen(t.status)) pendingIn += t.amount
  }
  return { settled, reserved, pendingIn, available: settled - reserved }
}

export const sorted = (l: Ledger, account: Account) => l.txns.filter(t => t.account === account).sort((a, b) => b.createdAt - a.createdAt)
export const findTxn = (l: Ledger, id: string | undefined | null) => (id ? l.txns.find(t => t.id === id) : undefined)
export const openTopup = (l: Ledger, account: Account) => l.txns.find(t => t.account === account && t.type === 'topup' && isOpen(t.status))
export const openWithdrawals = (l: Ledger, account: Account) => l.txns.filter(t => t.account === account && t.type === 'withdrawal' && isOpen(t.status)).sort((a, b) => b.createdAt - a.createdAt)

// Fuel contributions received in the last 7 days. Only completed contribution credits count.
export function fuelWeek(l: Ledger, account: Account, now: number) {
  const since = now - 7 * 86400000
  const list = l.txns.filter(t => t.account === account && t.type === 'fuel-in' && t.status === 'completed' && t.createdAt >= since)
  return { total: list.reduce((n, t) => n + t.amount, 0), count: list.length }
}

// ── Commands ─────────────────────────────────────────────────────────────────

const touch = (t: Txn, status: TxStatus, now: number): Txn => ({ ...t, status, updatedAt: now })
const nextRef = (l: Ledger, p: string) => `${p}-${String(l.seq + 1).padStart(4, '0')}`
const replace = (l: Ledger, t: Txn): Ledger => ({ ...l, txns: l.txns.map(x => (x.id === t.id ? t : x)) })

export type StartResult<T> = { ledger: Ledger; id: string | null; created: boolean; error?: string; item?: T }

export function startTopup(l: Ledger, a: { amount: number; method: Method; key: string; now: number; account?: Account }): StartResult<Txn> {
  const account = a.account ?? 'passenger'
  const dup = l.txns.find(t => t.key === a.key)
  if (dup) return { ledger: l, id: dup.id, created: false }
  const open = openTopup(l, account)
  if (open) return { ledger: l, id: open.id, created: false, error: 'open-attempt' }
  if (!Number.isSafeInteger(a.amount) || a.amount < LIMITS.topupMin || a.amount > LIMITS.topupMax) return { ledger: l, id: null, created: false, error: 'amount' }
  const seq = l.seq + 1
  const t: Txn = { id: `tx${seq}`, ref: nextRef(l, 'CRW'), account, type: 'topup', amount: a.amount, status: 'processing', createdAt: a.now, updatedAt: a.now, key: a.key, method: a.method }
  return { ledger: { ...l, seq, txns: [...l.txns, t] }, id: t.id, created: true }
}

export function resolveTopup(l: Ledger, id: string, to: TxStatus, now: number): Ledger {
  const t = findTxn(l, id)
  if (!t || t.type !== 'topup' || !isOpen(t.status) || t.status === to) return l
  if (!['completed', 'failed', 'cancelled', 'unknown', 'processing'].includes(to)) return l
  return replace(l, touch(t, to, now))
}

export function startWithdrawal(l: Ledger, a: { amount: number; dest: Dest; key: string; now: number }): StartResult<Txn> {
  const dup = l.txns.find(t => t.key === a.key)
  if (dup) return { ledger: l, id: dup.id, created: false }
  if (openWithdrawals(l, 'rider').some(t => t.status === 'unknown')) return { ledger: l, id: null, created: false, error: 'unknown-open' }
  if (!Number.isSafeInteger(a.amount) || a.amount <= 0) return { ledger: l, id: null, created: false, error: 'amount' }
  if (a.amount > balances(l, 'rider').available) return { ledger: l, id: null, created: false, error: 'insufficient' }
  const seq = l.seq + 1
  const t: Txn = { id: `tx${seq}`, ref: nextRef(l, 'CRW'), account: 'rider', type: 'withdrawal', amount: a.amount, status: 'pending', createdAt: a.now, updatedAt: a.now, key: a.key, dest: { ...a.dest } }
  return { ledger: { ...l, seq, txns: [...l.txns, t] }, id: t.id, created: true }
}

const WD_NEXT: Record<string, TxStatus[]> = {
  pending: ['processing', 'completed', 'failed', 'unknown'],
  processing: ['completed', 'failed', 'unknown'],
  unknown: ['processing', 'completed', 'failed'],
}
export function resolveWithdrawal(l: Ledger, id: string, to: TxStatus, now: number): Ledger {
  const t = findTxn(l, id)
  if (!t || t.type !== 'withdrawal' || !WD_NEXT[t.status]?.includes(to)) return l
  return replace(l, touch(t, to, now))
}

// ── Plans ────────────────────────────────────────────────────────────────────

export function entitlement(l: Ledger, now: number): PlanPayment | null {
  const live = l.plans.filter(p => p.status === 'completed' && p.expiresAt !== undefined && p.expiresAt > now).sort((a, b) => (b.expiresAt ?? 0) - (a.expiresAt ?? 0))
  return live[0] ?? null
}
export const lastExpired = (l: Ledger, now: number) => l.plans.filter(p => p.status === 'completed' && p.expiresAt !== undefined && p.expiresAt <= now).sort((a, b) => (b.expiresAt ?? 0) - (a.expiresAt ?? 0))[0] ?? null
export const openPlanPayment = (l: Ledger) => l.plans.find(p => isOpen(p.status))

export function startPlanPayment(l: Ledger, a: { planId: PlanId; amount: number; method: Method; key: string; now: number }): StartResult<PlanPayment> {
  const dup = l.plans.find(p => p.key === a.key)
  if (dup) return { ledger: l, id: dup.id, created: false }
  const open = openPlanPayment(l)
  if (open) return { ledger: l, id: open.id, created: false, error: 'open-attempt' }
  if (entitlement(l, a.now)) return { ledger: l, id: null, created: false, error: 'active-plan' }
  const seq = l.seq + 1
  const p: PlanPayment = { id: `pp${seq}`, ref: nextRef(l, 'CRP'), planId: a.planId, amount: a.amount, method: a.method, status: 'processing', createdAt: a.now, updatedAt: a.now, key: a.key }
  return { ledger: { ...l, seq, plans: [...l.plans, p] }, id: p.id, created: true }
}

export function resolvePlanPayment(l: Ledger, id: string, to: TxStatus, now: number): Ledger {
  const p = l.plans.find(x => x.id === id)
  if (!p || !isOpen(p.status) || p.status === to) return l
  const next: PlanPayment = to === 'completed' ? { ...p, status: to, updatedAt: now, startsAt: now, expiresAt: addOneMonth(now) } : { ...p, status: to, updatedAt: now }
  return { ...l, plans: l.plans.map(x => (x.id === id ? next : x)) }
}

export function expireActivePlan(l: Ledger, now: number): Ledger {
  const e = entitlement(l, now)
  if (!e) return l
  return { ...l, plans: l.plans.map(x => (x.id === e.id ? { ...x, expiresAt: now - 1000 } : x)) }
}

// ── Seed ─────────────────────────────────────────────────────────────────────

export const SEED_DESTS = (): Dest[] => [
  { id: 'd1', bank: 'Demo Bank', last4: '4821', holder: 'Sample account holder' },
  { id: 'd2', bank: 'Demo Savings Bank', last4: '7305', holder: 'Sample account holder' },
]

export function seedLedger(now: number): Ledger {
  const d = (days: number, mins = 0) => now - days * 86400000 - mins * 60000
  const dest = SEED_DESTS()[0]
  const tx = (n: number, ref: number, o: Partial<Txn> & Pick<Txn, 'account' | 'type' | 'amount' | 'createdAt'>): Txn => ({ id: `tx${n}`, ref: `CRW-${String(ref).padStart(4, '0')}`, status: 'completed', updatedAt: o.createdAt, ...o })
  const txns: Txn[] = [
    tx(1, 1001, { account: 'passenger', type: 'topup', amount: 10000, createdAt: d(10), method: 'card' }),
    tx(2, 1002, { account: 'passenger', type: 'fuel-out', amount: 3500, createdAt: d(6), rideLabel: 'Ride with Meera J.' }),
    tx(3, 1003, { account: 'passenger', type: 'topup', amount: 50000, createdAt: d(3), method: 'upi', status: 'cancelled' }),
    tx(4, 1004, { account: 'passenger', type: 'fuel-out', amount: 4000, createdAt: d(1, 30), rideLabel: 'Ride with Ananya V.', rideId: 'h1', rideRole: 'buddy' }),
    tx(5, 1005, { account: 'passenger', type: 'topup', amount: 20000, createdAt: d(0, 90), method: 'upi' }),
    tx(6, 1006, { account: 'rider', type: 'fuel-in', amount: 4000, createdAt: d(11), rideLabel: 'Ride from Kabir T.' }),
    tx(7, 1007, { account: 'rider', type: 'fuel-in', amount: 4500, createdAt: d(10), rideLabel: 'Ride from Isha M.' }),
    tx(8, 1008, { account: 'rider', type: 'withdrawal', amount: 10000, createdAt: d(6), dest, status: 'failed' }),
    tx(9, 1009, { account: 'rider', type: 'withdrawal', amount: 20000, createdAt: d(1, 10), dest }),
    tx(10, 1010, { account: 'rider', type: 'fuel-in', amount: 4000, createdAt: d(0, 200), rideLabel: 'Ride from Meera J.', rideId: 'h1', rideRole: 'pilot' }),
    tx(11, 1011, { account: 'rider', type: 'fuel-in', amount: 3500, createdAt: d(0, 140), rideLabel: 'Ride from Dev P.' }),
  ]
  return { opening: { passenger: 0, rider: 28000 }, txns, plans: [], seq: 11 }
}
