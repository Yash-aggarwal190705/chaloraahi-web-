import { useEffect, useRef, type ReactNode } from 'react'
import { Badge, C, Ico, r } from './OnboardingUI'
import { fmtTime, dayLabel, STATUS_LABEL, inr, WEEKDAYS, type CustomerScreen, type PStore, type Ride, type RideStatus } from './PassengerData'

export type SheetName =
  | 'cancel' | 'early-end' | 'complete' | 'mismatch' | 'share' | 'options' | 'messages' | 'badge' | 'estimate'
  | 'location' | 'block' | 'help' | 'directions' | 'skip' | 'end-schedule' | 'role' | 'no-show' | 'mappick' | 'rider-info'

export type Ctx = {
  s: PStore
  screen: CustomerScreen
  go: (x: CustomerScreen) => void
  back: () => void
  root: (x: CustomerScreen) => void
  open: (n: SheetName, arg?: string) => void
  close: () => void
  sheet: SheetName | null
  sheetArg: string | undefined
  say: (m: string) => void
  sos: () => void
  openVerification: () => void
  prev: CustomerScreen | null
  online: boolean
  openRide: (x: Ride) => void
  switchRole: () => void
}

export const flags = { locDenied: false }

export const fmtWindow = (x: { earliest: string; latest: string }) => `${fmtTime(x.earliest)} – ${fmtTime(x.latest)}`
export const days = (d: boolean[]) => {
  if (d.every(Boolean)) return 'Every day'
  if (d.slice(0, 5).every(Boolean) && !d[5] && !d[6]) return 'Mon–Fri'
  return WEEKDAYS.filter((_, i) => d[i]).join(', ')
}

export function useTimers() {
  const t = useRef<number[]>([])
  useEffect(() => () => t.current.forEach(clearTimeout), [])
  return (fn: () => void, ms: number) => { t.current.push(window.setTimeout(fn, ms)) }
}

export function Card({ children, tone = 'plain', style }: { children: ReactNode; tone?: 'plain' | 'tint' | 'ok' | 'warn'; style?: React.CSSProperties }) {
  const t = { plain: ['#fff', C.divider], tint: [C.tint, C.tintBorder], ok: [C.okBg, C.okBorder], warn: [C.warnBg, C.warnBorder] }[tone]
  return <div style={{ background: t[0], border: `1px solid ${t[1]}`, borderRadius: r(16), padding: r(16), ...style }}>{children}</div>
}

export function H2({ children, id }: { children: ReactNode; id?: string }) {
  return <h2 id={id} style={{ fontSize: r(18), fontWeight: 600, color: C.text, lineHeight: 1.3 }}>{children}</h2>
}

export function Label({ children }: { children: ReactNode }) {
  return <span style={{ fontSize: r(13), fontWeight: 600, color: C.text3 }}>{children}</span>
}

export function KV({ k, v, strong }: { k: string; v: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between" style={{ gap: r(16) }}>
      <span style={{ fontSize: r(14), color: C.text3 }}>{k}</span>
      <span style={{ fontSize: r(strong ? 18 : 15), fontWeight: strong ? 700 : 500, color: C.text, textAlign: 'right', overflowWrap: 'anywhere' }}>{v}</span>
    </div>
  )
}

export function RouteLine({ from, to, fromSub, toSub }: { from: string; to: string; fromSub?: string; toSub?: string }) {
  return (
    <div className="flex flex-col" style={{ gap: r(10) }}>
      <div className="flex items-start" style={{ gap: r(12) }}>
        <span aria-hidden style={{ width: r(12), height: r(12), borderRadius: 999, background: '#12B76A', marginTop: r(6), flexShrink: 0, boxShadow: '0 0 0 3px #D1FADF' }} />
        <div className="min-w-0"><p style={{ fontSize: r(16), fontWeight: 600, color: C.text, overflowWrap: 'anywhere' }}><span className="sr-only">From </span>{from}</p>
          {fromSub && <p style={{ fontSize: r(13), color: C.text3 }}>{fromSub}</p>}</div>
      </div>
      <div className="flex items-start" style={{ gap: r(12) }}>
        <span aria-hidden style={{ width: r(12), height: r(12), borderRadius: 3, background: C.primary, marginTop: r(6), flexShrink: 0, boxShadow: `0 0 0 3px ${C.tint}` }} />
        <div className="min-w-0"><p style={{ fontSize: r(16), fontWeight: 600, color: C.text, overflowWrap: 'anywhere' }}><span className="sr-only">To </span>{to}</p>
          {toSub && <p style={{ fontSize: r(13), color: C.text3 }}>{toSub}</p>}</div>
      </div>
    </div>
  )
}

export function StatusBadge({ status }: { status: RideStatus }) {
  const kind = ({ awaiting: 'warn', confirmed: 'ok', 'on-the-way': 'ok', 'at-pickup': 'ok', 'in-progress': 'ok', completed: 'neutral', cancelled: 'neutral', expired: 'neutral', 'ended-early': 'err' } as const)[status]
  return <Badge kind={kind}>{STATUS_LABEL[status]}</Badge>
}

export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  const idx = options.findIndex(o => o[0] === value)
  const key = (e: React.KeyboardEvent) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!d) return
    e.preventDefault()
    const n = options[(idx + d + options.length) % options.length][0]
    onChange(n)
    window.setTimeout(() => (e.currentTarget.parentElement?.querySelector('[aria-checked="true"]') as HTMLElement | null)?.focus(), 0)
  }
  return (
    <div role="radiogroup" aria-label={label} className="flex" style={{ background: C.surface2, border: `1px solid ${C.divider}`, borderRadius: r(14), padding: r(4), gap: r(4) }}>
      {options.map(([v, l]) => (
        <button key={v} type="button" role="radio" aria-checked={v === value} tabIndex={v === value ? 0 : -1} onKeyDown={key} onClick={() => onChange(v)}
          className="ob-seg flex-1" style={{ minHeight: r(48), borderRadius: r(10), fontSize: r(15), fontWeight: 600, background: v === value ? C.primary : 'transparent', color: v === value ? '#fff' : C.text2 }}>
          {l}
        </button>
      ))}
    </div>
  )
}

export function Chip({ on, onClick, children, label, wide }: { on: boolean; onClick: () => void; children: ReactNode; label?: string; wide?: boolean }) {
  return (
    <button type="button" aria-pressed={on} aria-label={label} onClick={onClick} className="ob-chip"
      style={{ minHeight: r(48), minWidth: wide ? undefined : r(48), padding: `0 ${r(16)}`, borderRadius: r(12), fontSize: r(15), fontWeight: 600,
        background: on ? C.primary : '#fff', color: on ? '#fff' : C.text2, border: `1.5px solid ${on ? C.primary : C.input}` }}>
      {children}
    </button>
  )
}

export function Check({ id, checked, onChange, label, hint }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: ReactNode; hint?: ReactNode }) {
  return (
    <label htmlFor={id} className="ob-check flex items-start" style={{ gap: r(12), padding: r(14), minHeight: r(56), borderRadius: r(14), border: `1.5px solid ${checked ? C.primary : C.divider}`, background: checked ? C.tint : '#fff', cursor: 'pointer' }}>
      <input id={id} type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ width: r(24), height: r(24), accentColor: C.primary, flexShrink: 0, marginTop: 1 }} />
      <span style={{ fontSize: r(16), color: C.text, lineHeight: 1.4 }}>{label}{hint && <span className="block" style={{ fontSize: r(14), color: C.text2, marginTop: r(4) }}>{hint}</span>}</span>
    </label>
  )
}

export function RadioList({ name, legend, value, options, onChange }: { name: string; legend: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <fieldset className="flex flex-col" style={{ gap: r(8), border: 0, padding: 0, minWidth: 0 }}>
      <legend style={{ fontSize: r(14), fontWeight: 600, color: C.text, marginBottom: r(8) }}>{legend}</legend>
      {options.map((o, i) => {
        const on = value === o
        return (
          <label key={o} className="ob-check flex items-center" style={{ gap: r(12), minHeight: r(52), padding: `0 ${r(14)}`, borderRadius: r(12), border: `1.5px solid ${on ? C.primary : C.divider}`, background: on ? C.tint : '#fff', cursor: 'pointer' }}>
            <input type="radio" name={name} value={o} checked={on} onChange={() => onChange(o)} id={`${name}-${i}`} style={{ width: r(22), height: r(22), accentColor: C.primary, flexShrink: 0 }} />
            <span style={{ fontSize: r(16), color: C.text, overflowWrap: 'anywhere' }}>{o}</span>
          </label>
        )
      })}
    </fieldset>
  )
}

export function Stars({ value, onChange, readOnly }: { value: number; onChange?: (n: number) => void; readOnly?: boolean }) {
  const key = (e: React.KeyboardEvent) => {
    if (!onChange) return
    const d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0
    if (!d) return
    e.preventDefault()
    const n = Math.min(5, Math.max(1, (value || (d > 0 ? 0 : 6)) + d))
    onChange(n)
    window.setTimeout(() => (e.currentTarget.parentElement?.querySelector('[aria-checked="true"]') as HTMLElement | null)?.focus(), 0)
  }
  return (
    <div role={readOnly ? 'img' : 'radiogroup'} aria-label={readOnly ? `${value} out of 5 stars` : 'Rating'} className="flex" style={{ gap: r(4) }}>
      {[1, 2, 3, 4, 5].map(n => readOnly ? (
        <Ico key={n} name="star" size={22} color={n <= value ? '#F79009' : '#D0D5DD'} sw={1.5} />
      ) : (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} out of 5 stars`} tabIndex={value === n || (!value && n === 1) ? 0 : -1}
          onKeyDown={key} onClick={() => onChange?.(n)} className="ob-icon-btn flex items-center justify-center" style={{ width: r(56), height: r(56), borderRadius: r(14) }}>
          <span style={{ display: 'inline-flex', color: n <= value ? '#F79009' : '#D0D5DD' }}><svg width="36" height="36" viewBox="0 0 24 24" fill={n <= value ? '#F79009' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg></span>
        </button>
      ))}
    </div>
  )
}

export function Skel({ h = 16, w = '100%' }: { h?: number; w?: string | number }) {
  return <div aria-hidden className="ob-skel" style={{ height: r(h), width: typeof w === 'number' ? r(w) : w, borderRadius: r(8), background: '#EAECF0' }} />
}

export function Row({ icon, title, sub, onClick, trailing, danger, disabled }: { icon?: string; title: string; sub?: string; onClick: () => void; trailing?: ReactNode; danger?: boolean; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="ob-row flex items-center w-full text-left" style={{ minHeight: r(56), padding: `${r(10)} ${r(4)}`, gap: r(14), borderRadius: r(12), color: danger ? C.errText : C.text, opacity: disabled ? 0.5 : 1 }}>
      {icon && <span className="flex items-center justify-center flex-shrink-0" style={{ width: r(40), height: r(40), borderRadius: 999, background: danger ? C.errBg : C.tint, color: danger ? C.errText : C.primary }}><Ico name={icon} size={20} /></span>}
      <span className="flex-1 min-w-0"><span className="block" style={{ fontSize: r(16), fontWeight: 600, overflowWrap: 'anywhere' }}>{title}</span>{sub && <span className="block" style={{ fontSize: r(14), color: C.text2, fontWeight: 400 }}>{sub}</span>}</span>
      {trailing ?? <Ico name="chevron" size={18} color={C.text3} />}
    </button>
  )
}

export function RiderAvatar({ initials, size = 48 }: { initials: string; size?: number }) {
  return <span aria-hidden className="flex items-center justify-center flex-shrink-0" style={{ width: r(size), height: r(size), borderRadius: 999, background: C.tint, color: C.pressed, fontWeight: 700, fontSize: r(size * 0.36), border: `1px solid ${C.tintBorder}` }}>{initials}</span>
}

export const ctaFor = (status: RideStatus): string | null =>
  status === 'awaiting' ? 'View request' : status === 'confirmed' ? 'View ride' : status === 'on-the-way' || status === 'at-pickup' ? 'View pickup'
  : status === 'in-progress' ? 'Return to ride' : status === 'completed' || status === 'ended-early' ? 'View summary' : 'View details'

export function RideCard({ ride, onOpen, headingLevel = 3 }: { ride: Ride; onOpen: () => void; headingLevel?: 2 | 3 }) {
  const H = `h${headingLevel}` as 'h2' | 'h3'
  const weekly = ride.mode === 'weekly'
  return (
    <Card>
      <div className="flex flex-col" style={{ gap: r(12) }}>
        <div className="flex items-start justify-between" style={{ gap: r(12) }}>
          <div className="min-w-0">
            <H style={{ fontSize: r(16), fontWeight: 700, color: C.text }}>{weekly ? `${days(ride.days)} · from ${dayLabel(ride.date)}` : dayLabel(ride.date)}</H>
            <p style={{ fontSize: r(14), color: C.text2 }}>{fmtWindow(ride)} IST</p>
          </div>
          <StatusBadge status={ride.status} />
        </div>
        <RouteLine from={ride.pickup.name} to={ride.destination.name} />
        <div className="flex flex-wrap items-center justify-between" style={{ gap: r(8), fontSize: r(14), color: C.text2 }}>
          <span>{weekly ? 'Est. contribution per ride' : ride.status === 'awaiting' ? 'Est. contribution' : 'Agreed contribution'} <strong style={{ color: C.text }}>{inr(ride.amount)}</strong></span>
          {ride.rider && <span className="flex items-center" style={{ gap: r(6) }}><Ico name="user" size={16} />{ride.rider.name}</span>}
        </div>
        <button type="button" onClick={onOpen} className="ob-btn ob-btn-secondary" style={{ minHeight: r(48), borderRadius: r(12), border: `1.5px solid ${C.primary}`, color: C.primary, fontWeight: 600, fontSize: r(16) }}>
          {ctaFor(ride.status)}<span className="sr-only">, {dayLabel(ride.date)}</span>
        </button>
      </div>
    </Card>
  )
}

export function PageTop({ title, back, right }: { title?: string; back: () => void; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between flex-shrink-0" style={{ minHeight: r(56), gap: r(8) }}>
      <button type="button" onClick={back} aria-label="Back" className="ob-icon-btn flex items-center justify-center" style={{ width: r(48), height: r(48), marginLeft: r(-12), borderRadius: 999, color: C.text }}>
        <Ico name="back" size={22} sw={2.25} />
      </button>
      {title && <span style={{ fontSize: r(14), fontWeight: 600, color: C.text3 }}>{title}</span>}
      {right ?? <span style={{ width: r(48) }} />}
    </div>
  )
}
