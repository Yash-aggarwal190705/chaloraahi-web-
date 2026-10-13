import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  addOneMonth, balances, entitlement, findTxn, inr, parseAmount, resolvePlanPayment, resolveTopup, resolveWithdrawal, seedLedger,
  startPlanPayment, startTopup, startWithdrawal, SEED_DESTS,
} from './walletModel.ts'

const now = Date.UTC(2026, 9, 7, 6, 0, 0)
const amt = (s: string) => { const p = parseAmount(s); return p.ok ? p.paise : p.code }

test('decimal parsing is strict', () => {
  assert.equal(amt('12.50'), 1250)
  assert.equal(amt('200'), 20000)
  assert.equal(amt('-200'), 'negative')
  assert.equal(amt('1e3'), 'format')
  assert.equal(amt('200abc'), 'format')
  assert.equal(amt('12.505'), 'decimals')
  assert.equal(amt('0'), 'zero')
  assert.equal(amt(''), 'empty')
  assert.equal(inr(120000), '₹1,200')
  assert.equal(inr(1250), '₹12.50')
})

test('top-up credits exactly once', () => {
  let l = seedLedger(now)
  const before = balances(l, 'passenger').settled
  const a = startTopup(l, { amount: 20000, method: 'upi', key: 'k1', now })
  l = a.ledger
  assert.equal(balances(l, 'passenger').settled, before)
  const dup = startTopup(l, { amount: 20000, method: 'upi', key: 'k1', now })
  assert.equal(dup.created, false)
  assert.equal(dup.id, a.id)
  l = resolveTopup(l, a.id!, 'completed', now)
  l = resolveTopup(l, a.id!, 'completed', now)
  l = resolveTopup(l, a.id!, 'failed', now)
  assert.equal(balances(l, 'passenger').settled, before + 20000)
  assert.equal(l.txns.filter(t => t.key === 'k1').length, 1)
})

test('withdrawal reserve, complete, fail and unknown', () => {
  const dest = SEED_DESTS()[0]
  let l = seedLedger(now)
  assert.equal(balances(l, 'rider').settled, 24000)
  const w = startWithdrawal(l, { amount: 20000, dest, key: 'w1', now })
  l = w.ledger
  let b = balances(l, 'rider')
  assert.deepEqual([b.settled, b.reserved, b.available], [24000, 20000, 4000])
  assert.equal(startWithdrawal(l, { amount: 20000, dest, key: 'w1', now }).created, false)
  assert.equal(startWithdrawal(l, { amount: 5000, dest, key: 'w2', now }).error, 'insufficient')
  const unk = resolveWithdrawal(l, w.id!, 'unknown', now)
  assert.equal(balances(unk, 'rider').reserved, 20000)
  assert.equal(startWithdrawal(unk, { amount: 100, dest, key: 'w3', now }).error, 'unknown-open')
  const done = resolveWithdrawal(unk, w.id!, 'completed', now)
  b = balances(done, 'rider')
  assert.deepEqual([b.settled, b.reserved, b.available], [4000, 0, 4000])
  assert.equal(resolveWithdrawal(done, w.id!, 'failed', now), done)
  const failed = resolveWithdrawal(l, w.id!, 'failed', now)
  b = balances(failed, 'rider')
  assert.deepEqual([b.settled, b.reserved, b.available], [24000, 0, 24000])
  assert.equal(findTxn(failed, w.id)!.status, 'failed')
})

test('no plan entitlement before confirmed payment', () => {
  let l = seedLedger(now)
  const s = startPlanPayment(l, { planId: 'plus', amount: 19900, method: 'upi', key: 'p1', now })
  l = s.ledger
  assert.equal(entitlement(l, now), null)
  for (const st of ['unknown', 'failed'] as const) assert.equal(entitlement(resolvePlanPayment(l, s.id!, st, now), now), null)
  const ok = resolvePlanPayment(l, s.id!, 'completed', now)
  assert.equal(entitlement(ok, now)?.planId, 'plus')
  assert.equal(startPlanPayment(ok, { planId: 'pro', amount: 29900, method: 'upi', key: 'p2', now }).error, 'active-plan')
  assert.equal(ok.plans[0].expiresAt, addOneMonth(now))
  assert.equal(balances(ok, 'passenger').settled, balances(l, 'passenger').settled)
})

test('one calendar month clamps to month end', () => {
  const jan31 = Date.UTC(2027, 0, 31, 6, 0, 0)
  const d = new Date(addOneMonth(jan31) + 330 * 60000)
  assert.equal(d.getUTCMonth(), 1)
  assert.equal(d.getUTCDate(), 28)
})
