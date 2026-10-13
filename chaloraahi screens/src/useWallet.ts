import { useEffect, useRef, useState } from 'react'
import {
  balances, entitlement, findTxn, isOpen, openPlanPayment, openTopup, openWithdrawals, parseAmount, resolvePlanPayment, resolveTopup, resolveWithdrawal, seedLedger,
  SEED_DESTS, startPlanPayment, startTopup, startWithdrawal, expireActivePlan, LIMITS,
  type Dest, type Ledger, type Method, type PlanId, type TxStatus,
} from './walletModel'
import { planById } from './PlanCatalog'

export type Scenario = {
  balance: 'ready' | 'loading' | 'unavailable'
  history: 'ok' | 'error'
  pay: 'confirm' | 'fail' | 'cancel' | 'unknown' | 'wait'
  check: 'confirm' | 'fail' | 'unknown'
  auth: 'valid' | 'expired'
}
export const DEFAULT_SCENARIO: Scenario = { balance: 'ready', history: 'ok', pay: 'confirm', check: 'confirm', auth: 'valid' }

export type Drafts = {
  topupAmt: string; method: Method; topupKey: string | null; topupId: string | null
  wdAmt: string; destId: string; wdKey: string | null
  planSel: PlanId | null; planMethod: Method; planKey: string | null; planPayId: string | null
}
const EMPTY_DRAFTS: Drafts = { topupAmt: '', method: 'upi', topupKey: null, topupId: null, wdAmt: '', destId: 'd1', wdKey: null, planSel: null, planMethod: 'upi', planKey: null, planPayId: null }

type S = { ledger: Ledger; dests: Dest[]; drafts: Drafts; scenario: Scenario }

const KEY = 'cr-wallet-demo-v1'
function load(): S {
  const fresh = (): S => ({ ledger: seedLedger(Date.now()), dests: SEED_DESTS(), drafts: EMPTY_DRAFTS, scenario: DEFAULT_SCENARIO })
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return fresh()
    const j = JSON.parse(raw)
    if (!j?.ledger?.txns || !Array.isArray(j.dests)) return fresh()
    return { ledger: j.ledger, dests: j.dests, drafts: { ...EMPTY_DRAFTS, planSel: j.planSel ?? null }, scenario: DEFAULT_SCENARIO }
  } catch { return fresh() }
}

const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
const OUT: Record<Scenario['pay'], TxStatus | null> = { confirm: 'completed', fail: 'failed', cancel: 'cancelled', unknown: 'unknown', wait: null }

export function useWallet() {
  const [s, setS] = useState<S>(load)
  const ref = useRef(s)
  const timers = useRef<number[]>([])
  const set = (fn: (x: S) => S) => { ref.current = fn(ref.current); setS(ref.current) }
  const patchDrafts = (p: Partial<Drafts>) => set(x => ({ ...x, drafts: { ...x.drafts, ...p } }))
  const patchLedger = (fn: (l: Ledger) => Ledger) => set(x => ({ ...x, ledger: fn(x.ledger) }))

  useEffect(() => {
    try { sessionStorage.setItem(KEY, JSON.stringify({ ledger: s.ledger, dests: s.dests, planSel: s.drafts.planSel })) } catch { /* demo state only */ }
  }, [s.ledger, s.dests, s.drafts.planSel])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const after = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)) }

  // ── Top-up ──
  const topupAmount = () => parseAmount(ref.current.drafts.topupAmt, { min: LIMITS.topupMin, max: LIMITS.topupMax })
  const payTopup = (): { ok: boolean; id?: string; error?: string } => {
    const cur = ref.current
    if (cur.scenario.auth === 'expired') return { ok: false, error: 'auth' }
    const p = topupAmount()
    if (!p.ok) return { ok: false, error: p.code }
    const key = cur.drafts.topupKey ?? uid('top')
    const res = startTopup(cur.ledger, { amount: p.paise, method: cur.drafts.method, key, now: Date.now() })
    set(x => ({ ...x, ledger: res.ledger, drafts: { ...x.drafts, topupKey: key, topupId: res.id ?? x.drafts.topupId } }))
    if (res.created && res.id) {
      const id = res.id, to = OUT[cur.scenario.pay]
      if (to) after(1200, () => patchLedger(l => resolveTopup(l, id, to, Date.now())))
    }
    return res.id ? { ok: true, id: res.id } : { ok: false, error: res.error }
  }
  const checkTopup = (id: string): TxStatus | undefined => {
    const t = findTxn(ref.current.ledger, id)
    if (!t || !isOpen(t.status)) return t?.status
    const c = ref.current.scenario.check
    patchLedger(l => resolveTopup(l, id, c === 'confirm' ? 'completed' : c === 'fail' ? 'failed' : 'unknown', Date.now()))
    return findTxn(ref.current.ledger, id)?.status
  }
  const resetTopup = (clearAmount: boolean) => patchDrafts({ topupKey: null, topupId: null, ...(clearAmount ? { topupAmt: '' } : {}) })

  // ── Withdrawal ──
  const newWithdrawal = () => patchDrafts({ wdAmt: '', wdKey: null })
  const requestWithdrawal = (): { ok: boolean; id?: string; error?: string; available?: number } => {
    const cur = ref.current
    if (cur.scenario.auth === 'expired') return { ok: false, error: 'auth' }
    const p = parseAmount(cur.drafts.wdAmt)
    if (!p.ok) return { ok: false, error: 'draft' }
    const dest = cur.dests.find(d => d.id === cur.drafts.destId)
    if (!dest) return { ok: false, error: 'dest' }
    if (cur.scenario.pay === 'fail') return { ok: false, error: 'rejected' }
    const key = cur.drafts.wdKey ?? uid('wd')
    const res = startWithdrawal(cur.ledger, { amount: p.paise, dest, key, now: Date.now() })
    const settled = res.created && res.id && cur.scenario.pay === 'unknown' ? resolveWithdrawal(res.ledger, res.id, 'unknown', Date.now()) : res.ledger
    set(x => ({ ...x, ledger: settled, drafts: { ...x.drafts, wdKey: key } }))
    return res.id ? { ok: true, id: res.id } : { ok: false, error: res.error, available: balances(cur.ledger, 'rider').available }
  }
  const checkWithdrawal = (id: string): { before: TxStatus; after: TxStatus } | null => {
    const t = findTxn(ref.current.ledger, id)
    if (!t) return null
    if (t.status === 'unknown') {
      const c = ref.current.scenario.check
      if (c !== 'unknown') patchLedger(l => resolveWithdrawal(l, id, c === 'confirm' ? 'completed' : 'failed', Date.now()))
    }
    return { before: t.status, after: findTxn(ref.current.ledger, id)!.status }
  }
  const addDest = (d: Omit<Dest, 'id'>) => {
    const id = uid('d')
    set(x => ({ ...x, dests: [...x.dests, { ...d, id }], drafts: { ...x.drafts, destId: id } }))
    return id
  }

  // ── Plans ──
  const selectPlan = (id: PlanId | null) => patchDrafts({ planSel: id })
  const payPlan = (): { ok: boolean; id?: string; error?: string } => {
    const cur = ref.current
    if (cur.scenario.auth === 'expired') return { ok: false, error: 'auth' }
    if (!cur.drafts.planSel) return { ok: false, error: 'none' }
    const key = cur.drafts.planKey ?? uid('plan')
    const res = startPlanPayment(cur.ledger, { planId: cur.drafts.planSel, amount: planById(cur.drafts.planSel).price, method: cur.drafts.planMethod, key, now: Date.now() })
    set(x => ({ ...x, ledger: res.ledger, drafts: { ...x.drafts, planKey: key, planPayId: res.id ?? x.drafts.planPayId } }))
    if (res.created && res.id) {
      const id = res.id, to = OUT[cur.scenario.pay]
      if (to) after(1200, () => patchLedger(l => resolvePlanPayment(l, id, to, Date.now())))
    }
    return res.id ? { ok: true, id: res.id } : { ok: false, error: res.error }
  }
  const checkPlan = (id: string) => {
    const p = ref.current.ledger.plans.find(x => x.id === id)
    if (!p || !isOpen(p.status)) return p?.status
    const c = ref.current.scenario.check
    patchLedger(l => resolvePlanPayment(l, id, c === 'confirm' ? 'completed' : c === 'fail' ? 'failed' : 'unknown', Date.now()))
    return ref.current.ledger.plans.find(x => x.id === id)?.status
  }
  const resetPlanAttempt = () => patchDrafts({ planKey: null, planPayId: null })

  // ── Demo scenario controls (outside the phone) ──
  const setScenario = (p: Partial<Scenario>) => set(x => ({ ...x, scenario: { ...x.scenario, ...p } }))
  const operator = (kind: 'topup' | 'withdrawal' | 'plan', to: TxStatus) => {
    const l = ref.current.ledger, now = Date.now()
    if (kind === 'topup') { const t = openTopup(l, 'passenger'); if (t) patchLedger(x => resolveTopup(x, t.id, to, now)) }
    else if (kind === 'withdrawal') { const t = openWithdrawals(l, 'rider')[0]; if (t) patchLedger(x => resolveWithdrawal(x, t.id, to, now)) }
    else { const p = openPlanPayment(l); if (p) patchLedger(x => resolvePlanPayment(x, p.id, to, now)) }
  }
  const expirePlan = () => patchLedger(l => expireActivePlan(l, Date.now()))
  const reset = () => { timers.current.forEach(clearTimeout); timers.current = []; set(() => ({ ledger: seedLedger(Date.now()), dests: SEED_DESTS(), drafts: EMPTY_DRAFTS, scenario: DEFAULT_SCENARIO })) }

  // Picker previews: explicit user action, never on mount. Returns the record the screen should show.
  const seedFor = (screen: string): { id?: string } => {
    const cur = ref.current
    if (screen === 'wallet-withdraw-bank') {
      const ok = parseAmount(cur.drafts.wdAmt)
      if (!ok.ok || ok.paise > balances(cur.ledger, 'rider').available) patchDrafts({ wdAmt: '200', wdKey: null })
    }
    if (screen === 'wallet-withdraw-pending') {
      const open = openWithdrawals(cur.ledger, 'rider')[0]
      if (open) return { id: open.id }
      const dest = cur.dests[0]
      const res = startWithdrawal(cur.ledger, { amount: Math.min(20000, balances(cur.ledger, 'rider').available), dest, key: 'seed-pending', now: Date.now() })
      if (res.id) { set(x => ({ ...x, ledger: res.ledger })); return { id: res.id } }
    }
    if (screen === 'wallet-withdraw-success') {
      const done = [...cur.ledger.txns].filter(t => t.type === 'withdrawal' && t.status === 'completed').sort((a, b) => b.createdAt - a.createdAt)[0]
      if (done) return { id: done.id }
    }
    return {}
  }

  const now = Date.now()
  return {
    ledger: s.ledger, dests: s.dests, drafts: s.drafts, scenario: s.scenario,
    patchDrafts, topupAmount, payTopup, checkTopup, resetTopup, newWithdrawal, requestWithdrawal, checkWithdrawal, addDest,
    selectPlan, payPlan, checkPlan, resetPlanAttempt, setScenario, operator, expirePlan, reset, seedFor,
    passenger: balances(s.ledger, 'passenger'), rider: balances(s.ledger, 'rider'), plan: entitlement(s.ledger, now), now,
  }
}
export type WalletStore = ReturnType<typeof useWallet>
