import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Btn, C, Ico, Notice, Screen, TopRow, r } from './OnboardingUI'
import { Expand, Page, Pill, Sh, useHost } from './CommonUI'
import type { CNav } from './CommonData'
import type { WalletStore } from './useWallet'
import { BILLING_LINE, CORE_FREE, FEATURES, PLANS, benefitsOf, planById, type Plan } from './PlanCatalog'
import { fmtFull, inr, isOpen, lastExpired, openPlanPayment, type PlanId } from './walletModel'
import { ConceptTag, KV, METHOD_LABEL, MethodPicker, NUM, Result } from './WalletUI'

export type PricingScreen = 'pricing' | 'pricing-selected' | 'pricing-compare'
export type { PlanId }

type P = {
  screen: PricingScreen; w: WalletStore; nav: CNav; online: boolean
  onBack: () => void; onSignIn: () => void; onHelp: () => void; onProfile: () => void
}

const CHANGE_NOTE = 'Plan changes while a plan is active are not configured in this demo.'
const price = (pl: Plan) => `${inr(pl.price)}/month`
let planScroll = 0

function Gate({ p }: { p: P }) {
  return (
    <>
      {!p.online && <Notice kind="warning">You’re offline. Payments are paused until you’re back online.</Notice>}
      {p.w.scenario.auth === 'expired' && (
        <Notice kind="warning" action={<button type="button" onClick={p.onSignIn} className="block" style={{ minHeight: r(44), fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3, color: 'inherit' }}>Sign in again</button>}>
          Your session expired. Sign in again to continue. Nothing was charged.
        </Notice>
      )}
    </>
  )
}

function PlanCard({ pl, selected, current, suggested, children, headingLevel = 2 }: { pl: Plan; selected?: boolean; current?: boolean; suggested?: boolean; children?: ReactNode; headingLevel?: 2 | 3 }) {
  const H = `h${headingLevel}` as 'h2'
  return (
    <article aria-label={`${pl.name} plan`} style={{ padding: r(16), borderRadius: r(18), background: '#fff', border: selected ? `2.5px solid ${C.primary}` : current ? `2px solid ${C.okText}` : `1px solid ${C.divider}` }}>
      <div className="flex items-start justify-between" style={{ gap: r(8) }}>
        <div className="min-w-0">
          <H style={{ fontSize: r(20), fontWeight: 700, color: C.text }}>{pl.name}</H>
          <p style={{ ...NUM, fontSize: r(15), fontWeight: 600, color: C.text }}>{price(pl)}</p>
        </div>
        <div className="flex flex-col items-end" style={{ gap: r(4) }}>
          {selected && <span className="inline-flex items-center" style={{ gap: r(4), padding: `${r(3)} ${r(10)}`, borderRadius: 999, background: C.primary, color: '#fff', fontSize: r(13), fontWeight: 700 }}><Ico name="check" size={13} sw={3} />Selected</span>}
          {current && <Pill kind="ok">Current plan</Pill>}
          {suggested && !selected && !current && <Pill kind="neutral">Suggested for regular commuters</Pill>}
        </div>
      </div>
      <p style={{ fontSize: r(14), color: C.text2, marginTop: r(6) }}>{pl.blurb}</p>
      <ul className="flex flex-col" style={{ gap: r(6), marginTop: r(10), listStyle: 'none', padding: 0 }}>
        {benefitsOf(pl).map(b => <li key={b} className="flex items-start" style={{ gap: r(8), fontSize: r(14), color: C.text }}><span style={{ marginTop: 2, color: C.okText }}><Ico name="check" size={16} sw={2.5} /></span>{b}</li>)}
      </ul>
      {children && <div style={{ marginTop: r(14) }}>{children}</div>}
    </article>
  )
}

const FAQS: [string, string][] = [
  ['Do I need a plan to ride?', 'No. Core ride and safety features do not require a paid plan.'],
  ['Does a plan renew automatically?', 'No. Each payment covers one calendar month. Renewal is manual in this demo.'],
  ['Can I pay from my wallet?', 'No. Plans are paid by UPI or card in this demo. Your wallet is never charged for a plan.'],
  ['What if my payment is not confirmed?', 'Your plan stays inactive until the payment is confirmed. You can check the status without paying again.'],
]

// ── Plans ────────────────────────────────────────────────────────────────────

function Plans({ p }: { p: P }) {
  const { w, nav } = p
  const [faq, setFaq] = useState<number | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const active = w.plan
  const expired = lastExpired(w.ledger, w.now)
  const open = openPlanPayment(w.ledger)
  useEffect(() => {
    const sc = box.current?.closest('.overflow-y-auto') as HTMLElement | null
    if (sc && planScroll) requestAnimationFrame(() => { sc.scrollTop = planScroll })
  }, [])
  const choose = (id: PlanId) => {
    const sc = box.current?.closest('.overflow-y-auto') as HTMLElement | null
    planScroll = sc?.scrollTop ?? 0
    w.selectPlan(id); nav.go('pricing-selected')
  }
  return (
    <Page title="Plans" sub="Optional personal commute tools" onBack={p.onBack}>
      <div ref={box} className="flex flex-col" style={{ gap: r(20) }}>
        <div><ConceptTag /></div>
        <Gate p={p} />
        {active && <Notice kind="success" action={<button type="button" onClick={() => { w.selectPlan(null); nav.go('pricing-selected') }} className="block" style={{ minHeight: r(44), fontWeight: 700, textDecoration: 'underline', color: 'inherit' }}>View plan</button>}>{planById(active.planId).name} is active until {fmtFull(active.expiresAt!)}.</Notice>}
        {!active && expired && <Notice kind="info">Your {planById(expired.planId).name} plan ended on {fmtFull(expired.expiresAt!)}. You can buy a new month below.</Notice>}
        {open && <Notice kind="warning" action={<button type="button" onClick={() => nav.go('pricing-selected')} className="block" style={{ minHeight: r(44), fontWeight: 700, textDecoration: 'underline', color: 'inherit' }}>View payment</button>}>A payment for {planById(open.planId).name} is not confirmed yet.</Notice>}
        <section className="flex flex-col" style={{ gap: r(8) }}>
          <p style={{ fontSize: r(13), fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: C.text2 }}>Monthly plans</p>
          <p style={{ fontSize: r(14), color: C.text2 }}>{BILLING_LINE}</p>
          <Btn variant="secondary" onClick={() => nav.go('pricing-compare')}>Compare plans</Btn>
        </section>
        <div className="flex flex-col" style={{ gap: r(14) }}>
          {PLANS.map(pl => {
            const isCur = active?.planId === pl.id
            const sel = w.drafts.planSel === pl.id
            return (
              <PlanCard key={pl.id} pl={pl} selected={sel && !active} current={isCur} suggested={pl.id === 'plus'}>
                {active ? (isCur ? <Btn variant="secondary" onClick={() => { w.selectPlan(null); nav.go('pricing-selected') }}>View plan</Btn>
                  : <Btn variant="secondary" disabled aria-describedby="chg-note">{`Select ${pl.name}`}</Btn>)
                  : <Btn variant={sel ? 'primary' : 'secondary'} aria-pressed={sel} disabled={!!open} onClick={() => choose(pl.id)}>{`Select ${pl.name}`}</Btn>}
              </PlanCard>
            )
          })}
        </div>
        {active && <p id="chg-note" style={{ fontSize: r(14), color: C.text2 }}>{CHANGE_NOTE}</p>}
        <Notice kind="info">Core ride and safety features do not require a paid plan.</Notice>
        <section className="flex flex-col" style={{ gap: r(8) }}>
          <h2 style={{ fontSize: r(17), fontWeight: 700, color: C.text }}>Questions</h2>
          <div style={{ border: `1px solid ${C.divider}`, borderRadius: r(16), overflow: 'hidden' }}>
            {FAQS.map(([q, a], i) => <Expand key={q} id={`faq-${i}`} title={q} open={faq === i} onToggle={() => setFaq(faq === i ? null : i)}><p style={{ fontSize: r(14), color: C.text2, lineHeight: 1.5 }}>{a}</p></Expand>)}
          </div>
        </section>
      </div>
    </Page>
  )
}

// ── Selected / review / result ───────────────────────────────────────────────

function Selected({ p }: { p: P }) {
  const { w, nav } = p
  const say = useHost().say
  const [review, setReview] = useState(false)
  const [err, setErr] = useState('')
  const busy = useRef(false)
  const sel = w.drafts.planSel
  const active = w.plan
  const attempt = w.ledger.plans.find(x => x.id === w.drafts.planPayId) ?? openPlanPayment(w.ledger)
  const toProfile = () => { w.resetPlanAttempt(); nav.popTo('profile'); p.onProfile() }
  const pay = () => {
    if (busy.current) return
    busy.current = true
    const res = w.payPlan()
    window.setTimeout(() => { busy.current = false }, 400)
    setReview(false)
    setErr(res.ok || res.error === 'open-attempt' ? '' : res.error === 'auth' ? 'Your session expired. Sign in again. Nothing was charged.' : res.error === 'active-plan' ? CHANGE_NOTE : 'Choose a plan first.')
  }

  if (attempt) {
    const pl = planById(attempt.planId)
    const done = () => { w.resetPlanAttempt(); w.selectPlan(null) }
    const again = <Btn onClick={() => w.resetPlanAttempt()}>Try again</Btn>
    const back = <Btn variant="text" onClick={toProfile}>Back to Profile</Btn>
    const check = () => { const s = w.checkPlan(attempt.id); say(s === 'completed' ? `${pl.name} is now active.` : s === 'failed' ? 'The payment failed. No plan was activated.' : 'Still not confirmed. Your plan stays inactive.') }
    return (
      <Screen top={<TopRow onBack={() => { if (!isOpen(attempt.status)) done(); nav.pop() }} />} center>
        <ConceptTag />
        {attempt.status === 'processing' || attempt.status === 'pending' ? (
          <Result tone="busy" title="Confirming your payment" sub={`Your ${pl.name} plan activates only after the payment is confirmed.`}><Btn variant="secondary" onClick={check}>Check status</Btn>{back}</Result>
        ) : attempt.status === 'completed' ? (
          <Result tone="ok" icon="check" title={`${pl.name} is active`} sub="Your plan is active for one calendar month.">
            <dl className="w-full text-left"><KV k="Plan" v={pl.name} /><KV k="Paid" v={inr(attempt.amount)} /><KV k="Access starts" v={fmtFull(attempt.startsAt!)} /><KV k="Expires" v={fmtFull(attempt.expiresAt!)} /><KV k="Reference" v={attempt.ref} /></dl>
            <Btn onClick={done}>View plan</Btn><Btn variant="text" onClick={() => { done(); toProfile() }}>Back to Profile</Btn>
          </Result>
        ) : attempt.status === 'failed' ? (
          <Result tone="err" icon="alert" title="Payment failed" sub="No plan was activated and nothing was charged in this demo.">{again}{back}</Result>
        ) : attempt.status === 'cancelled' ? (
          <Result tone="neutral" icon="close" title="Payment cancelled" sub="You cancelled before paying. No plan was activated.">{again}{back}</Result>
        ) : (
          <Result tone="warn" icon="clock" title="Payment not confirmed" sub={`Your ${pl.name} plan stays inactive until the payment is confirmed. Please don’t pay again yet.`}><Btn onClick={check}>Check status</Btn>{back}</Result>
        )}
      </Screen>
    )
  }

  if (active && !sel) {
    const pl = planById(active.planId)
    return (
      <Page title="Your plan" onBack={() => nav.pop()}>
        <div><ConceptTag /></div>
        <PlanCard pl={pl} current />
        <dl><KV k="Access started" v={fmtFull(active.startsAt!)} /><KV k="Expires" v={fmtFull(active.expiresAt!)} /><KV k="Renewal" v="Manual. No auto-renewal." /></dl>
        <Notice kind="info">{CHANGE_NOTE}</Notice>
        <Btn variant="secondary" onClick={toProfile}>Back to Profile</Btn>
      </Page>
    )
  }

  if (!sel || active) {
    return (
      <Screen top={<TopRow onBack={() => nav.pop()} />} center>
        <Result tone="neutral" icon="info" title="No plan selected" sub="Choose a plan to see the details and review your payment."><Btn onClick={() => nav.replace('pricing')}>Choose a plan</Btn></Result>
      </Screen>
    )
  }

  const pl = planById(sel)
  const ok = p.online && w.scenario.auth === 'valid'
  return (
    <>
      <Page title={`${pl.name} plan`} sub="Review before you pay" onBack={() => nav.pop()}>
        <div><ConceptTag /></div>
        <Gate p={p} />
        {err && <Notice kind="error">{err}</Notice>}
        <PlanCard pl={pl} selected />
        <p style={{ fontSize: r(14), color: C.text2 }}>{BILLING_LINE}</p>
        <Notice kind="info">Core ride and safety features do not require a paid plan.</Notice>
        <Btn variant="text" onClick={() => nav.pop()}>Change plan</Btn>
      </Page>
      <div className="flex-shrink-0 flex items-center" style={{ gap: r(12), padding: `${r(12)} ${r(20)} max(${r(16)}, env(safe-area-inset-bottom))`, borderTop: `1px solid ${C.divider}`, background: '#fff', boxShadow: '0 -4px 16px rgba(16,24,40,0.06)' }}>
        <div className="min-w-0 flex-1"><p style={{ fontSize: r(14), color: C.text2 }}>{pl.name} · one month</p><p style={{ ...NUM, fontSize: r(20), fontWeight: 700, color: C.text }}>{inr(pl.price)}</p></div>
        <div style={{ width: '55%' }}><Btn disabled={!ok} onClick={() => setReview(true)}>{`Review ${pl.name}`}</Btn></div>
      </div>
      {review && (
        <Sh title={`Review ${pl.name}`} onClose={() => setReview(false)}>
          <dl><KV k="Plan" v={pl.name} /><KV k="Price" v={inr(pl.price)} strong /><KV k="Billing" v="Once, for one month" /><KV k="Access" v="Starts when payment is confirmed" /><KV k="Renewal" v="Manual" /></dl>
          <MethodPicker value={w.drafts.planMethod} onChange={m => w.patchDrafts({ planMethod: m })} legend="Pay with" />
          <Notice kind="info">No real payment will be made. Your wallet is not charged.</Notice>
          <Btn onClick={pay}>{`Pay ${inr(pl.price)} · demo`}</Btn>
          <Btn variant="text" onClick={() => setReview(false)}>Cancel</Btn>
          <p className="sr-only">{METHOD_LABEL[w.drafts.planMethod]} selected</p>
        </Sh>
      )}
    </>
  )
}

// ── Compare ──────────────────────────────────────────────────────────────────

function Compare({ p }: { p: P }) {
  const { w, nav } = p
  const active = w.plan
  const open = openPlanPayment(w.ledger)
  const sel = w.drafts.planSel
  return (
    <Page title="Compare plans" sub={BILLING_LINE} onBack={() => nav.pop()}>
      <div><ConceptTag /></div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(6rem, 1fr))', gap: r(8) }}>
        {PLANS.map(pl => <div key={pl.id} style={{ padding: r(10), borderRadius: r(12), border: `1px solid ${C.divider}`, background: C.surface2 }}><p style={{ fontSize: r(15), fontWeight: 700, color: C.text }}>{pl.name}</p><p style={{ ...NUM, fontSize: r(13), color: C.text2 }}>{inr(pl.price)}/mo</p></div>)}
      </div>
      {FEATURES.map(f => (
        <section key={f.key} aria-labelledby={`cmp-${f.key}`} style={{ borderRadius: r(14), border: `1px solid ${C.divider}`, padding: r(14) }}>
          <h2 id={`cmp-${f.key}`} style={{ fontSize: r(15), fontWeight: 700, color: C.text }}>{f.label}</h2>
          <dl>
            {PLANS.map(pl => {
              const v = pl.limits[f.key], yes = v !== false
              return (
                <div key={pl.id} className="flex items-center justify-between" style={{ gap: r(8), padding: `${r(8)} 0`, borderTop: `1px solid ${C.divider}`, marginTop: r(8) }}>
                  <dt style={{ fontSize: r(14), color: C.text2 }}>{pl.name}</dt>
                  <dd className="inline-flex items-center" style={{ gap: r(6), ...NUM, fontSize: r(14), fontWeight: 600, color: yes ? C.text : C.text3 }}>
                    <Ico name={yes ? 'check' : 'close'} size={15} sw={2.5} color={yes ? C.okText : C.text3} />{f.value(v)}
                  </dd>
                </div>
              )
            })}
          </dl>
        </section>
      ))}
      <section style={{ borderRadius: r(14), background: C.tint, padding: r(14) }}>
        <h2 style={{ fontSize: r(15), fontWeight: 700, color: C.text }}>Free for everyone</h2>
        <p style={{ fontSize: r(14), color: C.text2, margin: `${r(4)} 0 ${r(8)}` }}>Core ride and safety features do not require a paid plan.</p>
        <ul style={{ paddingLeft: r(18), fontSize: r(14), color: C.text }}>{CORE_FREE.map(x => <li key={x}>{x}</li>)}</ul>
      </section>
      <div className="flex flex-col" style={{ gap: r(8) }}>
        {PLANS.map(pl => (
          <Btn key={pl.id} variant={sel === pl.id ? 'primary' : 'secondary'} aria-pressed={sel === pl.id} disabled={!!active || !!open}
            onClick={() => { w.selectPlan(pl.id); nav.replace('pricing-selected') }}>{`Select ${pl.name}`}</Btn>
        ))}
        {active && <p style={{ fontSize: r(14), color: C.text2 }}>{CHANGE_NOTE}</p>}
        {open && !active && <p style={{ fontSize: r(14), color: C.text2 }}>Finish or check your open payment first.</p>}
      </div>
    </Page>
  )
}

export default function PricingContent(p: P) {
  if (p.screen === 'pricing-compare') return <Compare p={p} />
  if (p.screen === 'pricing-selected') return <Selected p={p} />
  return <Plans p={p} />
}
