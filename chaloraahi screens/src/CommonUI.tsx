import { useContext, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Body, C, Heading, Ico, Screen, Sheet, TopRow, r } from './OnboardingUI'
import { HostCtx, type AStore, type CNav, type CommonScreen, type Params } from './CommonData'
import type { PStore } from './PassengerData'
import type { RStore } from './RiderData'
import type { RiderScreen } from './RiderData'

export type CCtx = {
  a: AStore; nav: CNav; p: PStore; rs: RStore
  role: 'customer' | 'rider'
  back: () => void
  go: (s: CommonScreen, p?: Params) => void
  exit: () => void
  onSOS: () => void
  onPilot: (s: RiderScreen) => void
  onMembership: () => void
  onOpenRide: (role: 'buddy' | 'pilot', id: string) => void
  onSwitchRole: (r: 'customer' | 'rider') => void
  onSignOut: () => void
  onSignIn: () => void
}

export function Sh({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const h = useContext(HostCtx)
  useEffect(() => { h.count(1); return () => h.count(-1) }, [h])
  return h.host ? createPortal(<Sheet title={title} onClose={onClose}>{children}</Sheet>, h.host) : null
}

export function Page({ title, sub, onBack, right, children, footer, gap = 20 }: { title: string; sub?: ReactNode; onBack: () => void; right?: ReactNode; children: ReactNode; footer?: ReactNode; gap?: number }) {
  return (
    <Screen top={<TopRow onBack={onBack} right={right} />} footer={footer} gap={gap}>
      <div className="flex flex-col" style={{ gap: r(6) }}>
        <Heading size={26}>{title}</Heading>
        {sub && <Body size={15}>{sub}</Body>}
      </div>
      {children}
    </Screen>
  )
}

export function Group({ title, children, note }: { title?: string; children: ReactNode; note?: ReactNode }) {
  return (
    <section className="flex flex-col" style={{ gap: r(8) }}>
      {title && <h2 style={{ fontSize: r(13), fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: C.text2 }}>{title}</h2>}
      <div style={{ border: `1px solid ${C.divider}`, borderRadius: r(16), background: '#fff', overflow: 'hidden' }}>{children}</div>
      {note && <p style={{ fontSize: r(13), color: C.text2, lineHeight: 1.45 }}>{note}</p>}
    </section>
  )
}

const rowBox = { minHeight: r(56), padding: `${r(10)} ${r(14)}`, gap: r(12) }
const iconBox = (danger?: boolean) => ({ width: r(36), height: r(36), borderRadius: 999, background: danger ? C.errBg : C.tint, color: danger ? C.errText : C.primary })

export function NavRow({ icon, title, sub, onClick, danger, badge }: { icon: string; title: string; sub?: string; onClick: () => void; danger?: boolean; badge?: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="ob-row flex items-center w-full text-left" style={{ ...rowBox, color: danger ? C.errText : C.text, borderTop: `1px solid ${C.divider}`, marginTop: -1 }}>
      <span className="flex items-center justify-center flex-shrink-0" style={iconBox(danger)}><Ico name={icon} size={18} /></span>
      <span className="flex-1 min-w-0">
        <span className="block" style={{ fontSize: r(16), fontWeight: 600, overflowWrap: 'anywhere' }}>{title}</span>
        {sub && <span className="block" style={{ fontSize: r(14), color: C.text2, fontWeight: 400, overflowWrap: 'anywhere' }}>{sub}</span>}
      </span>
      {badge}
      {!danger && <Ico name="chevron" size={18} color={C.text3} />}
    </button>
  )
}

export function InfoRow({ icon, title, value, action }: { icon?: string; title: string; value: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center" style={{ ...rowBox, borderTop: `1px solid ${C.divider}`, marginTop: -1 }}>
      {icon && <span className="flex items-center justify-center flex-shrink-0" style={iconBox()}><Ico name={icon} size={18} /></span>}
      <div className="flex-1 min-w-0">
        <div style={{ fontSize: r(14), color: C.text2 }}>{title}</div>
        <div style={{ fontSize: r(16), fontWeight: 600, color: C.text, overflowWrap: 'anywhere' }}>{value}</div>
      </div>
      {action}
    </div>
  )
}

export function SwitchRow({ id, title, sub, checked, onChange, disabled, locked }: { id: string; title: string; sub?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; locked?: boolean }) {
  return (
    <label htmlFor={id} className="flex items-center" style={{ ...rowBox, borderTop: `1px solid ${C.divider}`, marginTop: -1, cursor: disabled || locked ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1 }}>
      <span className="flex-1 min-w-0">
        <span className="block" style={{ fontSize: r(16), fontWeight: 600, color: C.text }}>{title}</span>
        {sub && <span className="block" style={{ fontSize: r(14), color: C.text2 }}>{sub}</span>}
      </span>
      <input id={id} type="checkbox" role="switch" checked={checked} disabled={disabled || locked} onChange={e => onChange(e.target.checked)} className="sr-only peer" />
      <span aria-hidden className="flex items-center flex-shrink-0 ob-switch" style={{ width: r(52), height: r(32), borderRadius: 999, background: checked ? C.primary : '#98A2B3', padding: r(3), justifyContent: checked ? 'flex-end' : 'flex-start', transition: 'background-color 160ms' }}>
        <span style={{ width: r(26), height: r(26), borderRadius: 999, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.primary }}>{checked && <Ico name="check" size={14} sw={3} />}</span>
      </span>
    </label>
  )
}

export function Avatar({ name, photo, size = 64 }: { name: string; photo: string | null; size?: number }) {
  const ini = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?'
  return photo ? (
    <img src={photo} alt="" style={{ width: r(size), height: r(size), borderRadius: 999, objectFit: 'cover', flexShrink: 0, background: C.tint }} />
  ) : (
    <span aria-hidden className="flex items-center justify-center flex-shrink-0" style={{ width: r(size), height: r(size), borderRadius: 999, background: C.tint, color: C.pressed, fontSize: r(size * 0.36), fontWeight: 700 }}>{ini}</span>
  )
}

export function Pill({ kind, children }: { kind: 'ok' | 'warn' | 'err' | 'neutral' | 'info'; children: ReactNode }) {
  const t = { ok: [C.okBg, C.okBorder, C.okText, 'check'], warn: [C.warnBg, C.warnBorder, C.warnText, 'clock'], err: [C.errBg, C.errBorder, C.errText, 'alert'], neutral: [C.surface2, C.divider, C.text2, 'info'], info: [C.tint, C.tintBorder, C.pressed, 'info'] }[kind]
  return (
    <span className="inline-flex items-center" style={{ gap: r(6), padding: `${r(3)} ${r(10)}`, borderRadius: 999, background: t[0], border: `1px solid ${t[1]}`, color: t[2], fontSize: r(13), fontWeight: 600, lineHeight: 1.3 }}>
      <Ico name={t[3]} size={13} sw={2.5} />{children}
    </span>
  )
}

export function Textarea({ id, label, value, onChange, error, helper, optional, rows = 4, maxLength }: { id: string; label: string; value: string; onChange: (v: string) => void; error?: string; helper?: string; optional?: boolean; rows?: number; maxLength?: number }) {
  const d = error ? `${id}-e` : helper ? `${id}-h` : undefined
  return (
    <div className="flex flex-col" style={{ gap: r(8) }}>
      <label htmlFor={id} style={{ fontSize: r(14), fontWeight: 600, color: C.text }}>{label}{optional && <span style={{ fontWeight: 400, color: C.text3 }}> (optional)</span>}</label>
      <textarea id={id} value={value} rows={rows} maxLength={maxLength} onChange={e => onChange(e.target.value)} aria-invalid={!!error || undefined} aria-describedby={d}
        onFocus={e => { const el = e.currentTarget; window.setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 250) }}
        style={{ borderRadius: r(12), padding: r(14), fontSize: r(16), color: C.text, border: `1.5px solid ${error ? C.errText : C.input}`, background: '#fff', resize: 'vertical', lineHeight: 1.45, width: '100%' }} />
      {error ? <p id={`${id}-e`} role="alert" style={{ fontSize: r(14), color: C.errText }}>{error}</p> : helper ? <p id={`${id}-h`} style={{ fontSize: r(14), color: C.text3 }}>{helper}</p> : null}
    </div>
  )
}

export function Select({ id, label, value, options, onChange, error }: { id: string; label: string; value: string; options: [string, string][]; onChange: (v: string) => void; error?: string }) {
  return (
    <div className="flex flex-col" style={{ gap: r(8) }}>
      <label htmlFor={id} style={{ fontSize: r(14), fontWeight: 600, color: C.text }}>{label}</label>
      <select id={id} value={value} onChange={e => onChange(e.target.value)} aria-invalid={!!error || undefined} aria-describedby={error ? `${id}-e` : undefined}
        style={{ minHeight: r(54), borderRadius: r(12), padding: `0 ${r(12)}`, fontSize: r(16), color: C.text, border: `1.5px solid ${error ? C.errText : C.input}`, background: '#fff', width: '100%' }}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      {error && <p id={`${id}-e`} role="alert" style={{ fontSize: r(14), color: C.errText }}>{error}</p>}
    </div>
  )
}

export function Expand({ id, title, open, onToggle, children }: { id: string; title: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <div style={{ borderTop: `1px solid ${C.divider}`, marginTop: -1 }}>
      <h3>
        <button type="button" id={`${id}-b`} aria-expanded={open} aria-controls={`${id}-p`} onClick={onToggle} className="ob-row flex items-center justify-between w-full text-left"
          style={{ minHeight: r(56), padding: `${r(10)} ${r(14)}`, gap: r(12), fontSize: r(16), fontWeight: 600, color: C.text }}>
          <span style={{ overflowWrap: 'anywhere' }}>{title}</span>
          <Ico name={open ? 'chevup' : 'chevdown'} size={18} color={C.text3} />
        </button>
      </h3>
      {open && <div id={`${id}-p`} role="region" aria-labelledby={`${id}-b`} style={{ padding: `0 ${r(14)} ${r(14)}`, fontSize: r(15), color: C.text2, lineHeight: 1.5 }}>{children}</div>}
    </div>
  )
}

export const fmtLong = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
export const CONTRIBUTION_NOTE = 'Fuel contributions are settled directly between participants by cash or their own UPI app. ChaloRaahi does not process the payment.'

export function useHost() { return useContext(HostCtx) }
