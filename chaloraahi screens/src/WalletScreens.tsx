import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Btn, C, Field, Ico, Notice, Screen, TopRow, r } from './OnboardingUI'
import { Page, Pill, Sh, useHost } from './CommonUI'
import type { CNav } from './CommonData'
import { WALLET_SCREENS, type WalletScreen } from './WalletNav'
import type { WalletStore } from './useWallet'
import {
  fmtFull, findTxn, fuelWeek, inr, LIMITS, openTopup, openWithdrawals, parseAmount, sorted, toInput,
  type Account, type Txn,
} from './walletModel'
import {
  ActivityList, AMOUNT_MSG, AmountField, Chips, ConceptTag, Empty, Grouped, KV, MethodPicker, METHOD_LABEL, NUM, Result, Skel, StatusPill, TxnSheet,
} from './WalletUI'

export { WALLET_SCREENS, type WalletScreen }
export const RIDER_WALLET = new Set<WalletScreen>(['wallet-rider-home', 'wallet-rider-history', 'wallet-withdraw', 'wallet-withdraw-bank', 'wallet-withdraw-pending', 'wallet-withdraw-success'])
export const accountOf = (s: string): Account => (RIDER_WALLET.has(s as WalletScreen) ? 'rider' : 'passenger')

type P = {
  screen: WalletScreen; w: WalletStore; nav: CNav; online: boolean
  reported: { total: number; count: number }
  onOpenRide: (role: 'buddy' | 'pilot', id: string) => void
  onHelp: () => void; onBack: () => void; onSignIn: () => void
}

const Card = ({ children, tone = 'plain' }: { children: ReactNode; tone?: 'plain' | 'warn' }) => (
  <div style={{ padding: r(16), borderRadius: r(16), border: `1px solid ${tone === 'warn' ? C.warnBorder : C.divider}`, background: tone === 'warn' ? C.warnBg : '#fff' }}>{children}</div>
)
const H2 = ({ children }: { children: ReactNode }) => <h2 style={{ fontSize: r(17), fontWeight: 700, color: C.text }}>{children}</h2>

function Gate({ p }: { p: P }) {
  return (
    <>
      {!p.online && <Notice kind="warning">You’re offline. Money actions are paused until you’re back online.</Notice>}
      {p.w.scenario.auth === 'expired' && (
        <Notice kind="warning" action={<button type="button" onClick={p.onSignIn} className="block" style={{ minHeight: r(44), fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3, color: 'inherit' }}>Sign in again</button>}>
          Your session expired. Sign in again to continue. Nothing was changed.
        </Notice>
      )}
    </>
  )
}
const canAct = (p: P) => p.online && p.w.scenario.auth === 'valid'

function BalanceCard({ p, label, amount, lines }: { p: P; label: string; amount: number; lines: ReactNode }) {
  const st = p.w.scenario.balance
  const say = useHost().say
  return (
    <section aria-label={label} style={{ padding: r(20), borderRadius: r(20), background: C.primary, color: '#fff' }} aria-busy={st === 'loading' || undefined}>
      <p style={{ fontSize: r(14), fontWeight: 600, opacity: 0.95 }}>{label}</p>
      {st === 'loading' ? (
        <div className="flex flex-col" style={{ gap: r(10), marginTop: r(10) }} role="status"><span className="sr-only">Loading balance</span><Skel w="55%" h={36} /><Skel w="80%" h={16} /></div>
      ) : st === 'unavailable' ? (
        <div style={{ marginTop: r(8) }}>
          <p role="alert" style={{ fontSize: r(18), fontWeight: 700 }}>Balance unavailable</p>
          <p style={{ fontSize: r(14), marginTop: r(4), opacity: 0.95 }}>We can’t load your balance right now. No money has moved.</p>
          <button type="button" onClick={() => say('Still unavailable. Try again in a moment.')} className="ob-btn" style={{ minHeight: r(48), marginTop: r(8), padding: `0 ${r(16)}`, borderRadius: r(12), background: '#fff', color: C.primary, fontWeight: 700, fontSize: r(15) }}>Try again</button>
        </div>
      ) : (
        <>
          <p data-testid="balance" style={{ ...NUM, fontSize: r(40), fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, marginTop: r(4) }}>{inr(amount)}</p>
          <div style={{ fontSize: r(14), marginTop: r(6), display: 'flex', flexDirection: 'column', gap: r(2), ...NUM }}>{lines}</div>
        </>
      )}
    </section>
  )
}

function Detail({ p, id, onClose }: { p: P; id: string; onClose: () => void }) {
  const { w, nav } = p
  const say = useHost().say
  const t = findTxn(w.ledger, id)
  if (!t) return null
  const isWd = t.type === 'withdrawal'
  const open = t.status === 'pending' || t.status === 'processing' || t.status === 'unknown'
  return (
    <TxnSheet t={t} onClose={onClose}
      onViewRide={t.rideId ? () => { onClose(); p.onOpenRide(t.rideRole ?? (t.account === 'rider' ? 'pilot' : 'buddy'), t.rideId!) } : undefined}
      onHelp={() => { onClose(); p.onHelp() }}
      onOpenWithdrawal={isWd ? () => { onClose(); nav.go(t.status === 'completed' ? 'wallet-withdraw-success' : 'wallet-withdraw-pending', { id: t.id }) } : undefined}
      onCheck={open && !isWd ? () => { const s = w.checkTopup(t.id); const m = s === 'completed' ? 'Confirmed. The money was added.' : s === 'failed' ? 'The payment failed. No money was added.' : 'Still not confirmed. We’ll keep this pending.'; say(m); return m } : undefined} />
  )
}

function useDetail() {
  const [id, setId] = useState<string | null>(null)
  return { id, open: (t: Txn) => setId(t.id), close: () => setId(null) }
}

// ── Passenger home ───────────────────────────────────────────────────────────

function Home({ p }: { p: P }) {
  const { w, nav } = p
  const d = useDetail()
  const say = useHost().say
  const list = sorted(w.ledger, 'passenger')
  const pend = openTopup(w.ledger, 'passenger')
  const st = w.scenario.balance
  return (
    <Page title="Wallet" sub="Passenger wallet" onBack={p.onBack}>
      <div><ConceptTag /></div>
      <Gate p={p} />
      <BalanceCard p={p} label="Wallet balance" amount={w.passenger.available}
        lines={w.passenger.pendingIn > 0 ? <span>{inr(w.passenger.pendingIn)} top-up pending · not added yet</span> : <span>Demo balance</span>} />
      {pend && (
        <Card tone="warn">
          <div className="flex flex-col" style={{ gap: r(8) }}>
            <p style={{ fontSize: r(15), fontWeight: 700, color: C.warnText }}>{inr(pend.amount)} top-up is {pend.status === 'unknown' ? 'not confirmed' : 'pending'}</p>
            <p style={{ fontSize: r(14), color: C.text2 }}>Your balance won’t change until the payment is confirmed.</p>
            <Btn variant="secondary" disabled={!canAct(p)} onClick={() => { const s = w.checkTopup(pend.id); say(s === 'completed' ? 'Confirmed. The money was added.' : s === 'failed' ? 'The payment failed. No money was added.' : 'Still not confirmed.') }}>Check status</Btn>
          </div>
        </Card>
      )}
      <Btn disabled={!canAct(p)} onClick={() => nav.go('wallet-add')}>Add money</Btn>
      {!canAct(p) && <p style={{ fontSize: r(14), color: C.text2, marginTop: r(-8) }}>{p.online ? 'Sign in again to add money.' : 'Go online to add money.'}</p>}
      <section className="flex flex-col" style={{ gap: r(8) }}>
        <div className="flex items-center justify-between"><H2>Recent activity</H2>
          {list.length > 0 && <button type="button" onClick={() => nav.go('wallet-history')} className="ob-btn" style={{ minHeight: r(48), padding: `0 ${r(8)}`, color: C.primary, fontWeight: 600, fontSize: r(15) }}>See all</button>}
        </div>
        {st === 'loading' ? <Skeletons /> : list.length === 0 ? (
          <Empty title="No activity yet" sub="Top-ups and fuel contributions paid from your wallet show up here." />
        ) : <ActivityList list={list.slice(0, 5)} onOpen={d.open} />}
      </section>
      <p style={{ fontSize: r(13), color: C.text2, lineHeight: 1.45 }}>Cash or UPI paid directly to a Rider is never added to or taken from this wallet. Plan payments are not wallet debits.</p>
      {d.id && <Detail p={p} id={d.id} onClose={d.close} />}
    </Page>
  )
}

function Skeletons() {
  return (
    <div role="status" className="flex flex-col" style={{ gap: r(12) }}>
      <span className="sr-only">Loading activity</span>
      {[0, 1, 2].map(i => <div key={i} className="flex items-center" style={{ gap: r(12) }}><span className="ob-skel" style={{ width: r(40), height: r(40), borderRadius: r(12), background: C.divider }} /><span className="flex-1 flex flex-col" style={{ gap: r(6) }}><span className="ob-skel" style={{ height: r(14), width: '60%', borderRadius: 6, background: C.divider }} /><span className="ob-skel" style={{ height: r(12), width: '40%', borderRadius: 6, background: C.divider }} /></span></div>)}
    </div>
  )
}

// ── Add money ────────────────────────────────────────────────────────────────

function AddMoney({ p }: { p: P }) {
  const { w, nav } = p
  const say = useHost().say
  const { topupAmt, method, topupId } = w.drafts
  const [touched, setTouched] = useState(false)
  const [review, setReview] = useState(false)
  const [err, setErr] = useState('')
  const busy = useRef(false)
  const cur = findTxn(w.ledger, topupId) ?? openTopup(w.ledger, 'passenger')
  const parsed = parseAmount(topupAmt, { min: LIMITS.topupMin, max: LIMITS.topupMax })
  const showErr = !parsed.ok && (touched || topupAmt.trim() !== '')
  const msg = !parsed.ok && showErr ? AMOUNT_MSG(parsed.code, { min: LIMITS.topupMin, max: LIMITS.topupMax }) : undefined
  const cur$ = parsed.ok ? parsed.paise : null

  const leave = () => { if (cur && cur.status !== 'pending' && cur.status !== 'processing' && cur.status !== 'unknown') w.resetTopup(true); nav.popTo('wallet-home') }
  const pay = () => {
    if (busy.current) return
    busy.current = true
    const res = w.payTopup()
    window.setTimeout(() => { busy.current = false }, 400)
    setReview(false)
    if (!res.ok && res.error !== 'open-attempt') setErr(res.error === 'auth' ? 'Your session expired. Sign in again to continue.' : 'Check the amount and try again.')
    else setErr('')
  }

  if (cur) {
    const amt = inr(cur.amount)
    const tryAgain = () => w.resetTopup(false)
    const back = <Btn variant="text" onClick={leave}>Back to Wallet</Btn>
    return (
      <Screen top={<TopRow onBack={leave} />} center>
        <ConceptTag />
        {cur.status === 'processing' || cur.status === 'pending' ? (
          <Result tone="busy" title="Confirming your payment" sub={`Waiting for the payment provider to confirm ${amt}. Your balance changes only after confirmation.`}>
            <Btn variant="secondary" onClick={() => say(w.checkTopup(cur.id) === 'completed' ? 'Confirmed.' : 'Still waiting.')}>Check status</Btn>{back}
          </Result>
        ) : cur.status === 'completed' ? (
          <Result tone="ok" icon="check" title="Money added" sub={`${amt} was added to your Passenger wallet.`}>
            <dl className="w-full text-left"><KV k="Amount" v={amt} /><KV k="Method" v={cur.method ? METHOD_LABEL[cur.method] : ''} /><KV k="Reference" v={cur.ref} /><KV k="New balance" v={inr(w.passenger.available)} strong /></dl>
            <Btn onClick={leave}>Back to Wallet</Btn>
          </Result>
        ) : cur.status === 'failed' ? (
          <Result tone="err" icon="alert" title="Payment failed" sub="No money was added and your balance is unchanged.">
            <Btn onClick={tryAgain}>Try again</Btn>{back}
          </Result>
        ) : cur.status === 'cancelled' ? (
          <Result tone="neutral" icon="close" title="Payment cancelled" sub="You cancelled before paying. Your balance is unchanged.">
            <Btn onClick={tryAgain}>Try again</Btn>{back}
          </Result>
        ) : (
          <Result tone="warn" icon="clock" title="We couldn’t confirm this payment" sub={`Please don’t pay again yet. ${amt} is not in your wallet until the provider confirms it.`}>
            <Btn onClick={() => say(w.checkTopup(cur.id) === 'unknown' ? 'Still not confirmed. Your balance is unchanged.' : 'Status updated.')}>Check status</Btn>{back}
          </Result>
        )}
      </Screen>
    )
  }

  return (
    <Page title="Add money" sub="Passenger wallet" onBack={p.onBack}
      footer={<Btn disabled={!canAct(p)} onClick={() => { setTouched(true); if (parsed.ok) setReview(true) }}>Review</Btn>}>
      <div><ConceptTag /></div>
      <Gate p={p} />
      {err && <Notice kind="error">{err}</Notice>}
      <AmountField id="topup-amt" label="Amount" value={topupAmt} onChange={v => { w.patchDrafts({ topupAmt: v }); setErr('') }} error={msg} helper={`Between ${inr(LIMITS.topupMin)} and ${inr(LIMITS.topupMax)}.`} />
      <Chips current={cur$} onPick={pa => { w.patchDrafts({ topupAmt: toInput(pa) }); setErr('') }} items={[100, 200, 500].map(n => ({ label: `₹${n}`, paise: n * 100 }))} />
      <MethodPicker value={method} onChange={m => w.patchDrafts({ method: m })} />
      {review && parsed.ok && (
        <Sh title="Review top-up" onClose={() => setReview(false)}>
          <dl><KV k="Amount" v={inr(parsed.paise)} /><KV k="Method" v={METHOD_LABEL[method]} /><KV k="Fee" v="₹0 (demo)" /><KV k="Total" v={inr(parsed.paise)} strong /></dl>
          <Notice kind="info">No real payment will be made.</Notice>
          <Btn onClick={pay}>{`Pay ${inr(parsed.paise)} · demo`}</Btn>
          <Btn variant="text" onClick={() => setReview(false)}>Cancel</Btn>
        </Sh>
      )}
    </Page>
  )
}

// ── History ──────────────────────────────────────────────────────────────────

function History({ p, account }: { p: P; account: Account }) {
  const { w, nav } = p
  const say = useHost().say
  const d = useDetail()
  const filters: [string, (t: Txn) => boolean][] = account === 'passenger'
    ? [['All', () => true], ['Added', t => t.type === 'topup'], ['Paid', t => t.type === 'fuel-out']]
    : [['All', () => true], ['Received', t => t.type === 'fuel-in'], ['Withdrawals', t => t.type === 'withdrawal']]
  const [f, setF] = useState(nav.p.filter && filters.some(x => x[0] === nav.p.filter) ? nav.p.filter : 'All')
  const all = sorted(w.ledger, account)
  const list = all.filter(filters.find(x => x[0] === f)![1])
  return (
    <Page title="Activity" sub={account === 'rider' ? 'Rider wallet' : 'Passenger wallet'} onBack={() => nav.popTo(account === 'rider' ? 'wallet-rider-home' : 'wallet-home')}>
      <div><ConceptTag /></div>
      <div role="group" aria-label="Filter activity" className="flex flex-wrap" style={{ gap: r(8) }}>
        {filters.map(([n]) => (
          <button key={n} type="button" aria-pressed={f === n} onClick={() => setF(n)} className="ob-chip"
            style={{ minHeight: r(48), padding: `0 ${r(18)}`, borderRadius: 999, fontSize: r(15), fontWeight: 600, background: f === n ? C.tint : '#fff', color: f === n ? C.pressed : C.text, border: `1.5px solid ${f === n ? C.primary : C.divider}` }}>{n}</button>
        ))}
      </div>
      {w.scenario.history === 'error' ? (
        <Notice kind="error" action={<button type="button" onClick={() => say('Still can’t load activity.')} className="block" style={{ minHeight: r(44), fontWeight: 700, textDecoration: 'underline', color: 'inherit' }}>Try again</button>}>We couldn’t load your activity. Nothing was changed.</Notice>
      ) : w.scenario.balance === 'loading' ? <Skeletons /> : all.length === 0 ? (
        <Empty title="No activity yet" sub="Your wallet records will appear here." />
      ) : list.length === 0 ? (
        <Empty title={`No ${f.toLowerCase()} activity`} sub="Try another filter." action={<Btn variant="secondary" onClick={() => setF('All')}>Show all</Btn>} />
      ) : <Grouped list={list} now={w.now} onOpen={d.open} />}
      {d.id && <Detail p={p} id={d.id} onClose={d.close} />}
    </Page>
  )
}

// ── Rider home ───────────────────────────────────────────────────────────────

function RiderHome({ p }: { p: P }) {
  const { w, nav } = p
  const d = useDetail()
  const b = w.rider
  const list = sorted(w.ledger, 'rider')
  const pend = openWithdrawals(w.ledger, 'rider')
  const wk = fuelWeek(w.ledger, 'rider', w.now)
  const blockedUnknown = pend.some(x => x.status === 'unknown')
  const why = !canAct(p) ? (p.online ? 'Sign in again to withdraw.' : 'Go online to withdraw.') : w.scenario.balance !== 'ready' ? 'Balance isn’t available right now.' : blockedUnknown ? 'Check your unconfirmed withdrawal first.' : b.available <= 0 ? 'Nothing available to withdraw.' : ''
  return (
    <Page title="Wallet" sub="Rider wallet" onBack={p.onBack}>
      <div><ConceptTag /></div>
      <Gate p={p} />
      <BalanceCard p={p} label="Available to withdraw" amount={b.available}
        lines={<><span>Wallet balance {inr(b.settled)}</span>{b.reserved > 0 && <span>{inr(b.reserved)} reserved for pending withdrawals</span>}</>} />
      <Btn disabled={!!why} onClick={() => nav.go('wallet-withdraw')}>Withdraw</Btn>
      {why && <p style={{ fontSize: r(14), color: C.text2, marginTop: r(-8) }}>{why}</p>}
      {pend.length > 0 && (
        <section className="flex flex-col" style={{ gap: r(8) }}>
          <H2>Pending withdrawals</H2>
          {pend.map(t => (
            <Card key={t.id} tone="warn">
              <div className="flex flex-col" style={{ gap: r(8) }}>
                <div className="flex items-center justify-between" style={{ gap: r(8) }}><span style={{ ...NUM, fontSize: r(20), fontWeight: 700, color: C.text }}>{inr(t.amount)}</span><StatusPill t={t} /></div>
                <p style={{ fontSize: r(14), color: C.text2 }}>To {t.dest?.bank} ••{t.dest?.last4} · {t.ref}</p>
                <Btn variant="secondary" onClick={() => nav.go('wallet-withdraw-pending', { id: t.id })}>View withdrawal</Btn>
              </div>
            </Card>
          ))}
        </section>
      )}
      <section aria-label="This week" className="flex flex-col" style={{ gap: r(8) }}>
        <H2>This week</H2>
        <Card>
          <p style={{ fontSize: r(14), color: C.text2 }}>Fuel contributions received in wallet</p>
          <p style={{ ...NUM, fontSize: r(24), fontWeight: 700, color: C.text }}>{inr(wk.total)}</p>
          <p style={{ fontSize: r(14), color: C.text2 }}>{wk.count} {wk.count === 1 ? 'ride' : 'rides'} · last 7 days</p>
        </Card>
        <Card>
          <div className="flex items-center justify-between" style={{ gap: r(8) }}><p style={{ fontSize: r(14), color: C.text2 }}>Reported received · not bank-verified</p><Pill kind="neutral">Cash / UPI</Pill></div>
          <p style={{ ...NUM, fontSize: r(24), fontWeight: 700, color: C.text }}>{inr(p.reported.total)}</p>
          <p style={{ fontSize: r(14), color: C.text2, lineHeight: 1.45 }}>Marked by participants after {p.reported.count} {p.reported.count === 1 ? 'ride' : 'rides'}. Paid directly, so it is not part of your wallet or withdrawable balance.</p>
        </Card>
      </section>
      <section className="flex flex-col" style={{ gap: r(8) }}>
        <div className="flex items-center justify-between"><H2>Recent activity</H2>
          {list.length > 0 && <button type="button" onClick={() => nav.go('wallet-rider-history')} className="ob-btn" style={{ minHeight: r(48), padding: `0 ${r(8)}`, color: C.primary, fontWeight: 600, fontSize: r(15) }}>See all</button>}
        </div>
        {w.scenario.balance === 'loading' ? <Skeletons /> : list.length === 0 ? <Empty title="No activity yet" sub="Fuel contributions and withdrawals show up here." /> : <ActivityList list={list.slice(0, 5)} onOpen={d.open} />}
      </section>
      {d.id && <Detail p={p} id={d.id} onClose={d.close} />}
    </Page>
  )
}

// ── Withdraw: amount ─────────────────────────────────────────────────────────

function Withdraw({ p }: { p: P }) {
  const { w, nav } = p
  const [touched, setTouched] = useState(false)
  const av = w.rider.available
  const raw = w.drafts.wdAmt
  const parsed = parseAmount(raw)
  const over = parsed.ok && parsed.paise > av
  const unknownOpen = openWithdrawals(w.ledger, 'rider').find(x => x.status === 'unknown')
  const msg = over ? AMOUNT_MSG('over', { available: av }) : !parsed.ok && (touched || raw.trim() !== '') ? AMOUNT_MSG(parsed.code) : undefined
  const ok = parsed.ok && !over
  const chip = (n: number) => ({ label: `₹${n}`, paise: n * 100, disabled: n * 100 > av, why: n * 100 > av ? 'More than available' : undefined })
  return (
    <Page title="Withdraw" sub="Rider wallet" onBack={() => nav.popTo('wallet-rider-home')}
      footer={<Btn disabled={!canAct(p) || w.scenario.balance !== 'ready' || !!unknownOpen} onClick={() => { setTouched(true); if (ok) nav.go('wallet-withdraw-bank') }}>Continue</Btn>}>
      <div><ConceptTag /></div>
      <Gate p={p} />
      <Card>
        <p style={{ fontSize: r(14), color: C.text2 }}>Available to withdraw</p>
        <p data-testid="available" style={{ ...NUM, fontSize: r(28), fontWeight: 700, color: C.text }}>{inr(av)}</p>
        {w.rider.reserved > 0 && <p style={{ fontSize: r(14), color: C.text2 }}>{inr(w.rider.reserved)} is reserved for pending withdrawals.</p>}
      </Card>
      {unknownOpen && (
        <Notice kind="warning" action={<button type="button" onClick={() => nav.go('wallet-withdraw-pending', { id: unknownOpen.id })} className="block" style={{ minHeight: r(44), fontWeight: 700, textDecoration: 'underline', color: 'inherit' }}>View withdrawal</button>}>
          A withdrawal of {inr(unknownOpen.amount)} isn’t confirmed yet. Check it before requesting another.
        </Notice>
      )}
      <AmountField id="wd-amt" label="Amount to withdraw" value={raw} onChange={v => w.patchDrafts({ wdAmt: v })} error={msg} helper="Nothing is reserved until you request the withdrawal." />
      <Chips current={parsed.ok ? parsed.paise : null} onPick={pa => w.patchDrafts({ wdAmt: toInput(pa) })}
        items={[chip(200), chip(500), { label: 'All available', paise: av, disabled: av <= 0, why: av <= 0 ? 'Nothing available' : undefined }]} />
    </Page>
  )
}

// ── Withdraw: bank review ────────────────────────────────────────────────────

const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/

function AccountSheets({ p, mode, setMode }: { p: P; mode: 'list' | 'add'; setMode: (m: 'list' | 'add' | null) => void }) {
  const { w } = p
  const [f, setF] = useState({ holder: '', num: '', num2: '', ifsc: '' })
  const [tried, setTried] = useState(false)
  const e = {
    holder: f.holder.trim().length < 2 || !/^[A-Za-z .'-]{2,60}$/.test(f.holder.trim()) ? 'Enter the account holder name (letters only).' : '',
    num: !/^\d{9,18}$/.test(f.num) ? 'Enter 9 to 18 digits.' : '',
    num2: f.num2 !== f.num || !f.num2 ? 'Account numbers must match.' : '',
    ifsc: !IFSC.test(f.ifsc.toUpperCase()) ? 'Use the format ABCD0123456.' : '',
  }
  const bad = Object.values(e).some(Boolean)
  const save = () => {
    setTried(true)
    if (bad) return
    const ifsc = f.ifsc.toUpperCase()
    w.addDest({ bank: `Bank ${ifsc.slice(0, 4)}`, last4: f.num.slice(-4), holder: f.holder.trim() })
    setF({ holder: '', num: '', num2: '', ifsc: '' })
    setMode(null)
  }
  if (mode === 'list') {
    return (
      <Sh title="Choose account" onClose={() => setMode(null)}>
        <fieldset style={{ border: 0, padding: 0, minWidth: 0 }} className="flex flex-col">
          <legend className="sr-only">Destination account</legend>
          <div className="flex flex-col" style={{ gap: r(8) }}>
            {w.dests.map(d => (
              <label key={d.id} className="ob-check flex items-center" style={{ gap: r(12), padding: r(14), minHeight: r(64), borderRadius: r(14), border: `1.5px solid ${w.drafts.destId === d.id ? C.primary : C.divider}`, background: w.drafts.destId === d.id ? C.tint : '#fff', cursor: 'pointer' }}>
                <input type="radio" name="dest" checked={w.drafts.destId === d.id} onChange={() => { w.patchDrafts({ destId: d.id }); setMode(null) }} style={{ width: r(22), height: r(22), accentColor: C.primary }} />
                <span className="min-w-0"><span className="block" style={{ fontSize: r(16), fontWeight: 600, color: C.text }}>{d.bank} ••{d.last4}</span><span className="block" style={{ fontSize: r(14), color: C.text2 }}>{d.holder}</span></span>
              </label>
            ))}
          </div>
        </fieldset>
        <Btn variant="secondary" onClick={() => setMode('add')}>Add another account</Btn>
      </Sh>
    )
  }
  return (
    <Sh title="Add another account" onClose={() => setMode(null)}>
      <Notice kind="info">Concept demo. Don’t enter a real account number. Only the last 4 digits are kept.</Notice>
      <Field id="acc-h" label="Account holder name" autoComplete="off" value={f.holder} onChange={ev => setF({ ...f, holder: ev.target.value })} error={tried ? e.holder : ''} />
      <Field id="acc-n" label="Account number" inputMode="numeric" autoComplete="off" value={f.num} onChange={ev => setF({ ...f, num: ev.target.value.trim() })} error={tried ? e.num : ''} />
      <Field id="acc-n2" label="Confirm account number" inputMode="numeric" autoComplete="off" value={f.num2} onChange={ev => setF({ ...f, num2: ev.target.value.trim() })} error={tried ? e.num2 : ''} />
      <Field id="acc-i" label="IFSC" autoComplete="off" autoCapitalize="characters" value={f.ifsc} onChange={ev => setF({ ...f, ifsc: ev.target.value.trim() })} error={tried ? e.ifsc : ''} helper="Format check only. It isn’t verified with a bank." />
      <Btn onClick={save}>Save account</Btn>
      <Btn variant="text" onClick={() => setMode('list')}>Back</Btn>
    </Sh>
  )
}

function WithdrawBank({ p }: { p: P }) {
  const { w, nav } = p
  const say = useHost().say
  const [sheet, setSheet] = useState<null | 'list' | 'add'>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<ReactNode>('')
  const inflight = useRef(false)
  const timer = useRef<number>(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const parsed = parseAmount(w.drafts.wdAmt)
  const dest = w.dests.find(d => d.id === w.drafts.destId) ?? w.dests[0]
  const av = w.rider.available
  const unknownOpen = openWithdrawals(w.ledger, 'rider').find(x => x.status === 'unknown')

  if (!parsed.ok) {
    return (
      <Screen top={<TopRow onBack={() => nav.replace('wallet-withdraw')} />} center>
        <Result tone="neutral" icon="info" title="Enter an amount first" sub="We don’t have an amount for this withdrawal. Your balance is unchanged.">
          <Btn onClick={() => nav.replace('wallet-withdraw')}>Enter amount</Btn>
        </Result>
      </Screen>
    )
  }
  const over = parsed.paise > av
  const submit = () => {
    if (inflight.current || over || !dest) return
    inflight.current = true
    setBusy(true); setErr('')
    timer.current = window.setTimeout(() => {
      const res = w.requestWithdrawal()
      if (res.ok && res.id) {
        w.newWithdrawal()
        say('Withdrawal requested.')
        nav.popTo('wallet-rider-home')
        nav.go('wallet-withdraw-pending', { id: res.id })
        return
      }
      inflight.current = false; setBusy(false)
      setErr(res.error === 'auth' ? 'Your session expired. Sign in again. No funds were reserved.'
        : res.error === 'insufficient' ? `Your available balance changed. You can withdraw up to ${inr(res.available ?? av)}.`
        : res.error === 'unknown-open' ? 'An earlier withdrawal isn’t confirmed yet. Check it before requesting another.'
        : 'The request wasn’t accepted. No funds were reserved. Try again.')
    }, 900)
  }
  return (
    <Page title="Confirm withdrawal" sub="Rider wallet" onBack={() => nav.pop()}
      footer={<Btn loading={busy} disabled={!canAct(p) || over || !!unknownOpen || !dest} onClick={submit}>{busy ? 'Submitting request…' : `Request withdrawal · ${inr(parsed.paise)}`}</Btn>}>
      <div><ConceptTag /></div>
      <Gate p={p} />
      {over && (
        <Notice kind="error" action={<button type="button" onClick={() => nav.replace('wallet-withdraw')} className="block" style={{ minHeight: r(44), fontWeight: 700, textDecoration: 'underline', color: 'inherit' }}>Change amount</button>}>
          Your available balance changed. You can now withdraw up to {inr(av)}. Your amount was not changed.
        </Notice>
      )}
      {unknownOpen && <Notice kind="warning" action={<button type="button" onClick={() => nav.go('wallet-withdraw-pending', { id: unknownOpen.id })} className="block" style={{ minHeight: r(44), fontWeight: 700, textDecoration: 'underline', color: 'inherit' }}>View withdrawal</button>}>An earlier withdrawal isn’t confirmed yet. Check it first.</Notice>}
      {err && <Notice kind="error">{err}</Notice>}
      <dl>
        <KV k="Amount" v={inr(parsed.paise)} strong />
        <KV k="Fee" v="₹0 (demo)" />
        <KV k="You would receive" v={inr(parsed.paise)} />
        <KV k="Available after request" v={inr(Math.max(0, av - parsed.paise))} />
      </dl>
      <Card>
        <div className="flex items-start justify-between" style={{ gap: r(12) }}>
          <div className="min-w-0"><p style={{ fontSize: r(14), color: C.text2 }}>Send to</p><p style={{ fontSize: r(16), fontWeight: 600, color: C.text, overflowWrap: 'anywhere' }}>{dest?.bank} ••{dest?.last4}</p><p style={{ fontSize: r(14), color: C.text2 }}>{dest?.holder}</p></div>
          <button type="button" onClick={() => setSheet('list')} aria-haspopup="dialog" className="ob-btn" style={{ minHeight: r(48), padding: `0 ${r(12)}`, color: C.primary, fontWeight: 700, fontSize: r(15), textDecoration: 'underline', textUnderlineOffset: 3 }}>Change</button>
        </div>
      </Card>
      <p style={{ fontSize: r(14), color: C.text2, lineHeight: 1.45 }}>Requesting reserves this amount from your balance. The transfer is not confirmed until the payout is verified.</p>
      {sheet && <AccountSheets p={p} mode={sheet} setMode={m => setSheet(m)} />}
    </Page>
  )
}

// ── Withdrawal status (pending / success / failed / unknown) ─────────────────

function WithdrawStatus({ p }: { p: P }) {
  const { w, nav } = p
  const say = useHost().say
  const t = findTxn(w.ledger, nav.p.id)
  const home = () => nav.popTo('wallet-rider-home')
  if (!t || t.type !== 'withdrawal') {
    return (
      <Screen top={<TopRow onBack={home} />} center>
        <Result tone="neutral" icon="info" title="Withdrawal not found" sub="We can’t find this request. Your balance is unchanged.">
          <Btn onClick={home}>Back to Wallet</Btn>
        </Result>
      </Screen>
    )
  }
  const amt = inr(t.amount), to = t.dest ? `${t.dest.bank} ••${t.dest.last4}` : ''
  const details = (
    <dl className="w-full text-left">
      <KV k="Amount" v={amt} strong /><KV k="To" v={to} /><KV k="Reference" v={t.ref} /><KV k="Requested" v={fmtFull(t.createdAt)} />
      <KV k="Status" v={<StatusPill t={t} />} />
    </dl>
  )
  const back = <Btn variant={t.status === 'completed' ? 'primary' : 'secondary'} onClick={home}>Back to Wallet</Btn>
  const help = <Btn variant="text" onClick={p.onHelp}>Get help</Btn>
  let view: ReactNode
  if (t.status === 'completed') {
    view = <Result tone="ok" icon="check" title="Withdrawal completed" sub={`${amt} was sent to ${to}.`}>{details}{back}</Result>
  } else if (t.status === 'failed') {
    view = <Result tone="err" icon="alert" title="Withdrawal failed" sub="The transfer didn’t go through. The reserved amount was released back to your available balance.">{details}<Btn onClick={() => nav.replace('wallet-withdraw')}>Request again</Btn>{back}{help}</Result>
  } else if (t.status === 'unknown') {
    view = (
      <Result tone="warn" icon="clock" title="Outcome not confirmed" sub={`We couldn’t confirm this transfer. ${amt} stays reserved. Check this request before making another.`}>
        {details}
        <Btn onClick={() => { const r2 = w.checkWithdrawal(t.id); say(r2 && r2.after !== 'unknown' ? 'Status updated.' : 'Still not confirmed. Funds stay reserved.') }}>Check status</Btn>{back}{help}
      </Result>
    )
  } else {
    view = <Result tone="warn" icon="clock" title={t.status === 'processing' ? 'Withdrawal processing' : 'Withdrawal requested'} sub="Your request is pending. The transfer is not confirmed yet.">{details}{back}{help}</Result>
  }
  return <Screen top={<TopRow onBack={home} />} center><ConceptTag />{view}</Screen>
}

// ── Router ───────────────────────────────────────────────────────────────────

export default function WalletContent(p: P) {
  switch (p.screen) {
    case 'wallet-home': return <Home p={p} />
    case 'wallet-add': return <AddMoney p={p} />
    case 'wallet-history': return <History p={p} account="passenger" />
    case 'wallet-rider-home': return <RiderHome p={p} />
    case 'wallet-rider-history': return <History p={p} account="rider" />
    case 'wallet-withdraw': return <Withdraw p={p} />
    case 'wallet-withdraw-bank': return <WithdrawBank p={p} />
    default: return <WithdrawStatus p={p} />
  }
}
