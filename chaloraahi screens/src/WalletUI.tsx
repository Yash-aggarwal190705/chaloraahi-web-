import { useState, type ReactNode } from 'react'
import { Btn, C, Ico, Spinner, r } from './OnboardingUI'
import { Pill, Sh } from './CommonUI'
import { env } from './SOSData'
import { fmtFull, fmtTime, groupLabel, inr, type AmountError, type Method, type Txn, type TxStatus } from './walletModel'

export const NUM = { fontVariantNumeric: 'tabular-nums' } as const

export function ConceptTag() {
  return (
    <span className="inline-flex items-center" style={{ gap: r(6), padding: `${r(3)} ${r(10)}`, borderRadius: 999, background: '#101828', color: '#fff', fontSize: r(13), fontWeight: 600, lineHeight: 1.3 }}>
      <Ico name="info" size={13} sw={2.5} />Concept demo · no real money moves
    </span>
  )
}

export const METHOD_LABEL: Record<Method, string> = { upi: 'UPI', card: 'Debit / credit card' }

// ── Status ───────────────────────────────────────────────────────────────────

export function statusText(t: { type?: string; status: TxStatus }): string {
  const w = t.type === 'withdrawal'
  switch (t.status) {
    case 'pending': return w ? 'Request received' : 'Pending'
    case 'processing': return 'Processing'
    case 'completed': return w ? 'Transfer completed' : 'Completed'
    case 'failed': return 'Failed'
    case 'cancelled': return 'Cancelled'
    default: return w ? 'Outcome not confirmed' : 'Not confirmed'
  }
}
const KIND: Record<TxStatus, 'ok' | 'warn' | 'err' | 'neutral'> = { completed: 'ok', pending: 'warn', processing: 'warn', unknown: 'warn', failed: 'err', cancelled: 'neutral' }
export const StatusPill = ({ t }: { t: { type?: string; status: TxStatus } }) => <Pill kind={KIND[t.status]}>{statusText(t)}</Pill>

export function titleOf(t: Txn): string {
  const open = t.status === 'pending' || t.status === 'processing' || t.status === 'unknown'
  switch (t.type) {
    case 'topup': return t.status === 'completed' ? 'Wallet top-up' : t.status === 'failed' ? 'Top-up failed' : t.status === 'cancelled' ? 'Top-up cancelled' : 'Top-up pending'
    case 'fuel-in': return 'Fuel contribution received'
    case 'fuel-out': return 'Fuel contribution paid'
    case 'refund': return 'Payment reversed'
    default: return t.status === 'completed' ? 'Withdrawal completed' : t.status === 'failed' ? 'Withdrawal failed' : open ? (t.status === 'unknown' ? 'Withdrawal not confirmed' : t.status === 'processing' ? 'Withdrawal processing' : 'Withdrawal requested') : 'Withdrawal'
  }
}
export const subOf = (t: Txn) => (t.type === 'topup' && t.method ? METHOD_LABEL[t.method] : t.type === 'withdrawal' && t.dest ? `${t.dest.bank} ••${t.dest.last4}` : t.rideLabel ?? '')
const sign = (t: Txn) => (t.status !== 'completed' ? '' : t.type === 'topup' || t.type === 'fuel-in' || t.type === 'refund' ? '+' : '−')

// ── Rows ─────────────────────────────────────────────────────────────────────

const ICON: Record<string, string> = { topup: 'upload', 'fuel-in': 'fuel', 'fuel-out': 'fuel', refund: 'refresh', withdrawal: 'send' }

export function TxnRow({ t, onOpen }: { t: Txn; onOpen: (t: Txn) => void }) {
  const credit = t.type === 'topup' || t.type === 'fuel-in' || t.type === 'refund'
  const done = t.status === 'completed'
  const label = `${titleOf(t)}, ${inr(t.amount)}${done ? '' : `, ${statusText(t)}`}, ${subOf(t)}, ${fmtTime(t.createdAt)}. Open details`
  return (
    <button type="button" onClick={() => onOpen(t)} aria-label={label} className="ob-row flex items-center w-full text-left" style={{ gap: r(12), padding: `${r(12)} ${r(4)}`, minHeight: r(64), borderTop: `1px solid ${C.divider}` }}>
      <span aria-hidden className="flex items-center justify-center flex-shrink-0" style={{ width: r(40), height: r(40), borderRadius: r(12), background: credit && done ? C.okBg : C.tint, color: credit && done ? C.okText : C.primary }}><Ico name={ICON[t.type]} size={18} /></span>
      <span className="flex-1 min-w-0 flex flex-col" style={{ gap: r(2) }}>
        <span style={{ fontSize: r(15), fontWeight: 600, color: C.text, overflowWrap: 'anywhere' }}>{titleOf(t)}</span>
        <span style={{ fontSize: r(13), color: C.text2, overflowWrap: 'anywhere' }}>{[subOf(t), fmtTime(t.createdAt)].filter(Boolean).join(' · ')}</span>
        {!done && <span><StatusPill t={t} /></span>}
      </span>
      <span style={{ ...NUM, fontSize: r(15), fontWeight: 700, color: done && credit ? C.okText : done ? C.text : C.text3, flexShrink: 0 }}>{sign(t)}{inr(t.amount)}</span>
    </button>
  )
}

export function ActivityList({ list, onOpen }: { list: Txn[]; onOpen: (t: Txn) => void }) {
  return <div className="flex flex-col" style={{ borderBottom: `1px solid ${C.divider}` }}>{list.map(t => <TxnRow key={t.id} t={t} onOpen={onOpen} />)}</div>
}

export function Grouped({ list, now, onOpen }: { list: Txn[]; now: number; onOpen: (t: Txn) => void }) {
  const groups: [string, Txn[]][] = []
  for (const t of list) {
    const g = groupLabel(t.createdAt, now)
    const last = groups[groups.length - 1]
    if (last && last[0] === g) last[1].push(t); else groups.push([g, [t]])
  }
  return (
    <div className="flex flex-col" style={{ gap: r(16) }}>
      {groups.map(([g, items]) => (
        <section key={g} aria-label={g}>
          <h2 style={{ fontSize: r(13), fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: C.text2, paddingBottom: r(6) }}>{g}</h2>
          <ActivityList list={items} onOpen={onOpen} />
        </section>
      ))}
    </div>
  )
}

// ── Inputs ───────────────────────────────────────────────────────────────────

export const AMOUNT_MSG = (code: AmountError | 'over', o: { max?: number; min?: number; available?: number } = {}): string => {
  switch (code) {
    case 'empty': return 'Enter an amount.'
    case 'negative': return 'Amount can’t be negative.'
    case 'zero': return 'Enter an amount greater than ₹0.'
    case 'decimals': return 'Use no more than two decimal places.'
    case 'min': return `Enter at least ${inr(o.min ?? 0)}.`
    case 'max': return o.available !== undefined ? `You can withdraw up to ${inr(o.available)}.` : `Enter no more than ${inr(o.max ?? 0)}.`
    case 'over': return `You can withdraw up to ${inr(o.available ?? 0)}.`
    default: return 'Use numbers only, like 200 or 12.50.'
  }
}

export function AmountField({ id, label, value, onChange, error, helper, autoFocus }: { id: string; label: string; value: string; onChange: (v: string) => void; error?: string; helper?: string; autoFocus?: boolean }) {
  const d = error ? `${id}-e` : helper ? `${id}-h` : undefined
  return (
    <div className="flex flex-col" style={{ gap: r(8) }}>
      <label htmlFor={id} style={{ fontSize: r(14), fontWeight: 600, color: C.text }}>{label}</label>
      <div className="ob-amount flex items-center" style={{ gap: r(8), minHeight: r(60), padding: `0 ${r(16)}`, borderRadius: r(12), border: `1.5px solid ${error ? C.errText : C.input}`, background: '#fff' }}>
        <span aria-hidden style={{ fontSize: r(22), fontWeight: 600, color: C.text2 }}>₹</span>
        <input id={id} value={value} onChange={e => onChange(e.target.value)} inputMode="decimal" autoComplete="off" autoFocus={autoFocus} placeholder="0" maxLength={14}
          aria-invalid={!!error || undefined} aria-describedby={d}
          onFocus={e => { const el = e.currentTarget; window.setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 250) }}
          className="flex-1 min-w-0 bg-transparent" style={{ ...NUM, outline: 'none', minHeight: r(56), fontSize: r(24), fontWeight: 700, color: C.text }} />
      </div>
      {error ? <p id={`${id}-e`} role="alert" className="flex items-start" style={{ gap: r(6), fontSize: r(14), color: C.errText, lineHeight: 1.4 }}><span style={{ marginTop: 2 }}><Ico name="alert" size={16} /></span>{error}</p>
        : helper ? <p id={`${id}-h`} style={{ fontSize: r(14), color: C.text3, lineHeight: 1.4 }}>{helper}</p> : null}
    </div>
  )
}

export function Chips({ items, current, onPick }: { items: { label: string; paise: number; disabled?: boolean; why?: string }[]; current: number | null; onPick: (p: number) => void }) {
  return (
    <div className="flex flex-wrap" style={{ gap: r(8) }} role="group" aria-label="Quick amounts">
      {items.map(i => {
        const on = current === i.paise
        return (
          <button key={i.label} type="button" disabled={i.disabled} aria-pressed={on} onClick={() => onPick(i.paise)} title={i.why}
            className="ob-chip" style={{ minHeight: r(48), padding: `0 ${r(18)}`, borderRadius: 999, fontSize: r(15), fontWeight: 600, ...NUM,
              background: on ? C.tint : '#fff', color: i.disabled ? C.text3 : on ? C.pressed : C.text, border: `1.5px solid ${on ? C.primary : C.divider}`, opacity: i.disabled ? 0.7 : 1 }}>
            {i.label}
          </button>
        )
      })}
    </div>
  )
}

export function MethodPicker({ value, onChange, legend = 'Pay with' }: { value: Method; onChange: (m: Method) => void; legend?: string }) {
  const opts: [Method, string, string, string][] = [
    ['upi', 'UPI', 'phone', 'Demo handoff. You won’t enter a UPI PIN.'],
    ['card', 'Debit / credit card', 'lock', 'Demo handoff. No card details are collected.'],
  ]
  return (
    <fieldset className="flex flex-col" style={{ gap: r(8), border: 0, padding: 0, minWidth: 0 }}>
      <legend style={{ fontSize: r(14), fontWeight: 600, color: C.text, marginBottom: r(8) }}>{legend}</legend>
      {opts.map(([v, t, ic, d]) => (
        <label key={v} className="ob-check flex items-center" style={{ gap: r(12), padding: r(14), minHeight: r(64), borderRadius: r(14), border: `1.5px solid ${value === v ? C.primary : C.divider}`, background: value === v ? C.tint : '#fff', cursor: 'pointer' }}>
          <input type="radio" name="pay-method" checked={value === v} onChange={() => onChange(v)} style={{ width: r(22), height: r(22), accentColor: C.primary, flexShrink: 0 }} />
          <span aria-hidden className="flex items-center justify-center flex-shrink-0" style={{ width: r(36), height: r(36), borderRadius: r(10), background: '#fff', color: C.primary, border: `1px solid ${C.divider}` }}><Ico name={ic} size={18} /></span>
          <span className="min-w-0"><span className="block" style={{ fontSize: r(16), fontWeight: 600, color: C.text }}>{t}</span><span className="block" style={{ fontSize: r(13), color: C.text2 }}>{d}</span></span>
        </label>
      ))}
    </fieldset>
  )
}

// ── Blocks ───────────────────────────────────────────────────────────────────

export function KV({ k, v, strong }: { k: string; v: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between" style={{ gap: r(16), padding: `${r(10)} 0`, borderTop: `1px solid ${C.divider}` }}>
      <dt style={{ fontSize: r(14), color: C.text2 }}>{k}</dt>
      <dd style={{ ...NUM, fontSize: r(15), fontWeight: strong ? 700 : 600, color: C.text, textAlign: 'right', overflowWrap: 'anywhere', minWidth: 0 }}>{v}</dd>
    </div>
  )
}

export function Result({ tone, icon, title, sub, children }: { tone: 'ok' | 'warn' | 'err' | 'neutral' | 'busy'; icon?: string; title: string; sub: ReactNode; children?: ReactNode }) {
  const t = { ok: [C.okBg, C.okText], warn: [C.warnBg, C.warnText], err: [C.errBg, C.errText], neutral: [C.surface2, C.text2], busy: [C.tint, C.primary] }[tone]
  return (
    <div className="flex flex-col items-center text-center" style={{ gap: r(12), paddingTop: r(8) }}>
      <span aria-hidden className="flex items-center justify-center" style={{ width: r(64), height: r(64), borderRadius: 999, background: t[0], color: t[1] }}>
        {tone === 'busy' ? <Spinner color={t[1]} /> : <Ico name={icon ?? 'info'} size={28} sw={2.25} />}
      </span>
      <div role="status" className="flex flex-col" style={{ gap: r(6) }}>
        <h2 data-heading tabIndex={-1} style={{ fontSize: r(24), fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em', color: C.text, overflowWrap: 'anywhere' }}>{title}</h2>
        <p style={{ fontSize: r(15), lineHeight: 1.5, color: C.text2, overflowWrap: 'anywhere' }}>{sub}</p>
      </div>
      {children}
    </div>
  )
}

export function Skel({ w = '60%', h = 20 }: { w?: string; h?: number }) {
  return <span className="ob-skel block" aria-hidden style={{ width: w, height: r(h), borderRadius: r(8), background: 'rgba(255,255,255,0.28)' }} />
}

export function Empty({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center" style={{ gap: r(8), padding: `${r(24)} ${r(8)}` }}>
      <span aria-hidden className="flex items-center justify-center" style={{ width: r(48), height: r(48), borderRadius: 999, background: C.surface2, color: C.text3 }}><Ico name="file" size={22} /></span>
      <p style={{ fontSize: r(16), fontWeight: 600, color: C.text }}>{title}</p>
      {sub && <p style={{ fontSize: r(14), color: C.text2, lineHeight: 1.45 }}>{sub}</p>}
      {action}
    </div>
  )
}

// ── Transaction detail ───────────────────────────────────────────────────────

export function TxnSheet({ t, onClose, onViewRide, onHelp, onOpenWithdrawal, onCheck }: {
  t: Txn; onClose: () => void; onViewRide?: () => void; onHelp: () => void; onOpenWithdrawal?: () => void; onCheck?: () => string | void
}) {
  const [copy, setCopy] = useState<'' | 'ok' | 'fail'>('')
  const [note, setNote] = useState('')
  const doCopy = async () => {
    try {
      if (env.clipboard === 'fail' || !navigator.clipboard) throw new Error('no clipboard')
      await navigator.clipboard.writeText(t.ref)
      setCopy('ok')
    } catch { setCopy('fail') }
  }
  const open = t.status === 'pending' || t.status === 'processing' || t.status === 'unknown'
  return (
    <Sh title={titleOf(t)} onClose={onClose}>
      <div className="flex flex-col" style={{ gap: r(8) }}>
        <p style={{ ...NUM, fontSize: r(32), fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>{sign(t)}{inr(t.amount)}</p>
        <span><StatusPill t={t} /></span>
      </div>
      <dl>
        <KV k="Reference" v={t.ref} />
        <KV k="Type" v={t.type === 'topup' ? 'Wallet top-up' : t.type === 'fuel-in' ? 'Fuel contribution received' : t.type === 'fuel-out' ? 'Fuel contribution paid' : t.type === 'refund' ? 'Reversal' : 'Withdrawal'} />
        <KV k="Created" v={fmtFull(t.createdAt)} />
        {t.updatedAt !== t.createdAt && <KV k="Updated" v={fmtFull(t.updatedAt)} />}
        {t.method && <KV k="Method" v={METHOD_LABEL[t.method]} />}
        {t.dest && <KV k="Destination" v={`${t.dest.bank}, account ending ${t.dest.last4}`} />}
        {t.rideLabel && <KV k="Related ride" v={t.rideLabel} />}
        {t.relatesTo && <KV k="Reverses" v={t.relatesTo} />}
        <KV k="Account" v={t.account === 'rider' ? 'Rider wallet (demo)' : 'Passenger wallet (demo)'} />
      </dl>
      <p style={{ fontSize: r(13), color: C.text2, lineHeight: 1.45 }}>Synthetic record for the concept demo. It is not a receipt or tax invoice.</p>
      {copy === 'fail' && (
        <div className="flex flex-col" style={{ gap: r(6) }}>
          <label htmlFor="ref-copy" style={{ fontSize: r(14), color: C.errText, fontWeight: 600 }}>Couldn’t copy automatically. Select the reference below.</label>
          <input id="ref-copy" readOnly value={t.ref} onFocus={e => e.currentTarget.select()} style={{ minHeight: r(52), borderRadius: r(12), padding: `0 ${r(14)}`, border: `1.5px solid ${C.input}`, fontSize: r(16), color: C.text }} />
        </div>
      )}
      <div role="status" className="sr-only">{copy === 'ok' ? 'Reference copied' : note}</div>
      {copy === 'ok' && <p aria-hidden style={{ fontSize: r(14), color: C.okText, fontWeight: 600 }}>Reference copied.</p>}
      {note && <p aria-hidden style={{ fontSize: r(14), color: C.text2 }}>{note}</p>}
      <div className="flex flex-col" style={{ gap: r(10) }}>
        {open && onCheck && <Btn onClick={() => { const m = onCheck(); if (m) setNote(m) }}>Check status</Btn>}
        {onOpenWithdrawal && <Btn variant={open ? 'secondary' : 'primary'} onClick={onOpenWithdrawal}>View withdrawal</Btn>}
        {onViewRide && <Btn variant="secondary" onClick={onViewRide}>View ride</Btn>}
        <Btn variant="secondary" onClick={doCopy}>Copy reference</Btn>
        <Btn variant="text" onClick={onHelp}>Get help</Btn>
      </div>
    </Sh>
  )
}
