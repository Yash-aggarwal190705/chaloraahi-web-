import { useEffect, useRef } from 'react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

// ── Tokens ───────────────────────────────────────────────────────────────────

export const r = (px: number) => `${px / 16}rem`

export const C = {
  primary: '#3B5BDB', pressed: '#364FC7',
  text: '#101828', text2: '#475467', text3: '#667085',
  surface: '#FFFFFF', surface2: '#F9FAFB',
  input: '#828A9A', divider: '#E4E7EC', tint: '#EDF1FF', tintBorder: '#BAC8FF',
  okText: '#027A48', okBg: '#ECFDF3', okBorder: '#A6F4C5',
  warnText: '#93370D', warnBg: '#FFFAEB', warnBorder: '#FEDF89',
  errText: '#B42318', errBg: '#FEF3F2', errBorder: '#FECDCA',
}

// ── Icons ────────────────────────────────────────────────────────────────────

const paths: Record<string, ReactNode> = {
  back: <path d="m12 19-7-7 7-7M5 12h14" />,
  check: <polyline points="20 6 9 17 4 12" />,
  alert: <><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></>,
  info: <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  clock: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></>,
  users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  scooter: <><circle cx="5.5" cy="17.5" r="2.5" /><circle cx="18.5" cy="17.5" r="2.5" /><path d="M8 17.5h8M15 6h-3v4l-3 3v2M15 6h3l2.5 6v3.5" /></>,
  upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><path d="M12 3v12" /></>,
  camera: <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></>,
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></>,
  trash: <><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></>,
  refresh: <><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></>,
  fuel: <><path d="M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16M3 21h14M15 10h2a2 2 0 0 1 2 2v4a1.5 1.5 0 0 0 3 0V8l-3-3" /><path d="M7 8h5" /></>,
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" />,
  helmet: <><path d="M3 15a9 9 0 0 1 18 0v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M3 14h10a3 3 0 0 0 3-3V7" /></>,
  phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.89 12 19.79 19.79 0 0 1 1.77 3.5 2 2 0 0 1 3.74 1.35h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9a16 16 0 0 0 6.29 6.29l.91-.91a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7a2 2 0 0 1 1.72 2.02z" />,
  pin: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></>,
  lock: <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>,
  close: <path d="M18 6 6 18M6 6l12 12" />,
  home: <><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>,
  list: <><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></>,
  star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />,
  send: <><path d="m22 2-11 11" /><path d="M22 2 15 22l-4-9-9-4z" /></>,
  share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></>,
  copy: <><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
  bell: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
  map: <><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" /><path d="M9 3v15M15 6v15" /></>,
  chevron: <path d="m9 18 6-6-6-6" />,
  chevdown: <path d="m6 9 6 6 6-6" />,
  chevup: <path d="m18 15-6-6-6 6" />,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  repeat: <><path d="m17 1 4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></>,
  flag: <><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><path d="M4 22v-7" /></>,
  ban: <><circle cx="12" cy="12" r="10" /><path d="m4.9 4.9 14.2 14.2" /></>,
  locate: <><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="8" /><path d="M12 1v3M12 20v3M1 12h3M20 12h3" /></>,
  search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  pause: <><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></>,
  play: <polygon points="5 3 19 12 5 21 5 3" />,
  key: <><circle cx="7.5" cy="15.5" r="4.5" /><path d="m10.7 12.3 9.8-9.8M16 7l3 3M14 9l2 2" /></>,
  sparkles: <><path d="m12 3-1.5 5.5L5 10l5.5 1.5L12 17l1.5-5.5L19 10l-5.5-1.5z" /><path d="m19 16-.7 2.3L16 19l2.3.7L19 22l.7-2.3L22 19l-2.3-.7z" /><path d="m5 3-.6 1.9L2.5 5.5l1.9.6L5 8l.6-1.9 1.9-.6-1.9-.6z" /></>,
  sliders: <><path d="M4 6h7M15 6h5M4 12h2M10 12h10M4 18h7M15 18h5" /><circle cx="13" cy="6" r="2" /><circle cx="8" cy="12" r="2" /><circle cx="13" cy="18" r="2" /></>,
  wallet: <><path d="M4 6h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12" /><path d="M16 13h5" /><circle cx="16" cy="13" r=".5" fill="currentColor" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  sos: <><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></>,
  nav: <polygon points="3 11 22 2 13 21 11 13 3 11" />,
  edit: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" /></>,
}

export function Ico({ name, size = 20, color = 'currentColor', sw = 2 }: { name: keyof typeof paths | string; size?: number; color?: string; sw?: number }) {
  return (
    <svg aria-hidden="true" focusable="false" width={r(size)} height={r(size)} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      {paths[name]}
    </svg>
  )
}

export function Spinner({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg aria-hidden="true" width={r(20)} height={r(20)} viewBox="0 0 24 24" fill="none" className="ob-spin" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

// ── Text and controls ────────────────────────────────────────────────────────

export function Heading({ children, size = 28, center }: { children: ReactNode; size?: number; center?: boolean }) {
  return (
    <h1 data-heading tabIndex={-1}
      style={{ fontSize: r(size), fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em', color: C.text, textAlign: center ? 'center' : 'left', overflowWrap: 'anywhere' }}>
      {children}
    </h1>
  )
}

export function Body({ children, center, size = 16, color = C.text2 }: { children: ReactNode; center?: boolean; size?: number; color?: string }) {
  return <p style={{ fontSize: r(size), lineHeight: 1.5, color, textAlign: center ? 'center' : 'left', overflowWrap: 'anywhere' }}>{children}</p>
}

type BtnProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  variant?: 'primary' | 'secondary' | 'text'
  loading?: boolean
  children: ReactNode
  icon?: ReactNode
}
export function Btn({ variant = 'primary', loading, children, icon, onClick, style, ...rest }: BtnProps) {
  const base = { minHeight: r(variant === 'text' ? 48 : 54), borderRadius: r(14), fontSize: r(16), fontWeight: 600, lineHeight: 1.25, padding: `${r(12)} ${r(20)}` }
  const look =
    variant === 'primary' ? { background: C.primary, color: '#fff' }
    : variant === 'secondary' ? { background: '#fff', color: C.primary, border: `1.5px solid ${C.primary}` }
    : { background: 'transparent', color: C.primary }
  return (
    <button {...rest} type={rest.type ?? 'button'} className={`ob-btn ob-btn-${variant} w-full relative flex items-center justify-center gap-2`}
      aria-disabled={loading || undefined} aria-busy={loading || undefined}
      onClick={e => { if (loading) return; onClick?.(e) }}
      style={{ ...base, ...look, ...style }}>
      {loading && <span style={{ position: 'absolute', left: r(20) }}><Spinner /></span>}
      {!loading && icon}
      <span style={{ overflowWrap: 'anywhere' }}>{children}</span>
    </button>
  )
}

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & { id: string; label: string; helper?: string; error?: string; optional?: boolean }
export function Field({ id, label, helper, error, optional, onFocus, ...input }: FieldProps) {
  const describedBy = error ? `${id}-e` : helper ? `${id}-h` : undefined
  return (
    <div className="flex flex-col" style={{ gap: r(8) }}>
      <label htmlFor={id} style={{ fontSize: r(14), fontWeight: 600, color: C.text }}>
        {label}{optional && <span style={{ fontWeight: 400, color: C.text3 }}> (optional)</span>}
      </label>
      <input id={id} {...input} aria-invalid={!!error || undefined} aria-describedby={describedBy}
        onFocus={e => { onFocus?.(e); const el = e.currentTarget; window.setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 250) }}
        className="ob-input w-full"
        style={{ minHeight: r(54), borderRadius: r(12), padding: `0 ${r(16)}`, fontSize: r(16), color: C.text, background: '#fff',
          border: `1.5px solid ${error ? C.errText : C.input}` }} />
      {error ? (
        <p id={`${id}-e`} role="alert" className="flex items-start gap-1.5" style={{ fontSize: r(14), color: C.errText, lineHeight: 1.4 }}>
          <span style={{ marginTop: 2 }}><Ico name="alert" size={16} /></span>{error}
        </p>
      ) : helper ? (
        <p id={`${id}-h`} style={{ fontSize: r(14), color: C.text3, lineHeight: 1.4 }}>{helper}</p>
      ) : null}
    </div>
  )
}

type NoticeKind = 'error' | 'success' | 'info' | 'warning'
export function Notice({ kind, children, action }: { kind: NoticeKind; children: ReactNode; action?: ReactNode }) {
  const t = { error: [C.errBg, C.errBorder, C.errText, 'alert'], success: [C.okBg, C.okBorder, C.okText, 'check'], info: [C.tint, C.tintBorder, C.pressed, 'info'], warning: [C.warnBg, C.warnBorder, C.warnText, 'clock'] }[kind]
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className="flex items-start" style={{ gap: r(12), padding: r(12), borderRadius: r(12), background: t[0], border: `1px solid ${t[1]}`, color: t[2] }}>
      <span style={{ marginTop: 2 }}><Ico name={t[3]} size={18} /></span>
      <div className="flex-1 min-w-0" style={{ fontSize: r(14), lineHeight: 1.45, overflowWrap: 'anywhere' }}>
        {children}
        {action}
      </div>
    </div>
  )
}

export function Badge({ kind, children }: { kind: 'ok' | 'warn' | 'err' | 'neutral'; children: ReactNode }) {
  const t = { ok: [C.okBg, C.okBorder, C.okText, 'check'], warn: [C.warnBg, C.warnBorder, C.warnText, 'clock'], err: [C.warnBg, C.warnBorder, C.warnText, 'alert'], neutral: [C.surface2, C.divider, C.text2, 'file'] }[kind]
  return (
    <span className="inline-flex items-center" style={{ gap: r(6), padding: `${r(4)} ${r(12)}`, borderRadius: 999, background: t[0], border: `1px solid ${t[1]}`, color: t[2], fontSize: r(14), fontWeight: 600 }}>
      <Ico name={t[3]} size={14} sw={2.5} />{children}
    </span>
  )
}

export function Link({ children, onClick, href = '#' }: { children: ReactNode; onClick: () => void; href?: string }) {
  return (
    <a href={href} onClick={e => { e.preventDefault(); onClick() }} style={{ color: C.primary, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }}>
      {children}
    </a>
  )
}

export function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center" style={{ gap: r(12) }} role="separator" aria-label={label}>
      <div className="flex-1" style={{ height: 1, background: C.divider }} />
      <span aria-hidden="true" style={{ fontSize: r(14), color: C.text3 }}>{label}</span>
      <div className="flex-1" style={{ height: 1, background: C.divider }} />
    </div>
  )
}

// ── Layout ───────────────────────────────────────────────────────────────────

export function Screen({ top, children, footer, center, gap = 24 }: { top?: ReactNode; children: ReactNode; footer?: ReactNode; center?: boolean; gap?: number }) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: 'thin' }}>
      <div className="flex flex-col min-h-full" style={{ padding: `0 max(${r(20)}, min(${r(24)}, 6vw))` }}>
        {top}
        <div className={`flex-1 flex flex-col ${center ? 'justify-center items-center text-center' : ''}`} style={{ gap: r(gap), paddingTop: r(top ? 8 : 24) }}>
          {children}
        </div>
        {footer && <div className="flex flex-col" style={{ gap: r(12), paddingTop: r(24), paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>{footer}</div>}
        {!footer && <div style={{ height: r(24) }} />}
      </div>
    </div>
  )
}

export function TopRow({ onBack, right }: { onBack?: () => void; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between flex-shrink-0" style={{ minHeight: r(56) }}>
      {onBack ? (
        <button type="button" onClick={onBack} aria-label="Back" className="ob-icon-btn flex items-center justify-center" style={{ width: r(48), height: r(48), marginLeft: r(-12), borderRadius: 999, color: C.text }}>
          <Ico name="back" size={22} sw={2.25} />
        </button>
      ) : <span />}
      {right}
    </div>
  )
}

export function Steps({ current }: { current: 1 | 2 }) {
  const items = ['College ID', 'Review and agree']
  return (
    <ol className="flex items-center" style={{ gap: r(8), listStyle: 'none', fontSize: r(14) }} aria-label="Verification steps">
      {items.map((label, i) => {
        const n = i + 1, active = n === current, done = n < current
        return (
          <li key={label} aria-current={active ? 'step' : undefined} className="flex items-center" style={{ gap: r(8), color: active ? C.text : C.text3, fontWeight: active ? 600 : 500 }}>
            <span className="flex items-center justify-center" style={{ width: r(24), height: r(24), borderRadius: 999, fontSize: r(13), fontWeight: 700,
              background: active || done ? C.primary : '#fff', color: active || done ? '#fff' : C.text3, border: `1.5px solid ${active || done ? C.primary : C.input}` }}>
              {done ? <Ico name="check" size={13} sw={3} /> : n}
            </span>
            {label}
            {i === 0 && <span aria-hidden="true" style={{ width: r(16), height: 1.5, background: C.divider }} />}
          </li>
        )
      })}
    </ol>
  )
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLElement>('[data-close]')?.focus()
    return () => opener?.focus?.()
  }, [])
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); return }
    if (e.key !== 'Tab') return
    const f = Array.from(ref.current!.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,textarea,select,[tabindex]:not([tabindex="-1"])'))
    if (!f.length) return
    const first = f[0], last = f[f.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }
  return (
    <div className="absolute inset-0 z-50 flex items-end" style={{ background: 'rgba(16,24,40,0.5)' }} onClick={onClose} onKeyDown={onKey}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="sheet-title" onClick={e => e.stopPropagation()} className="ob-sheet w-full flex flex-col"
        style={{ maxHeight: '88%', background: '#fff', borderRadius: `${r(24)} ${r(24)} 0 0` }}>
        <div className="flex items-center justify-between flex-shrink-0" style={{ padding: `${r(8)} ${r(8)} 0 ${r(24)}` }}>
          <h2 id="sheet-title" style={{ fontSize: r(20), fontWeight: 600, color: C.text }}>{title}</h2>
          <button data-close type="button" onClick={onClose} aria-label="Close" className="ob-icon-btn flex items-center justify-center" style={{ width: r(48), height: r(48), borderRadius: 999 }}>
            <Ico name="close" size={22} />
          </button>
        </div>
        <div className="overflow-y-auto flex flex-col" style={{ padding: `${r(8)} ${r(24)} max(1.5rem, env(safe-area-inset-bottom))`, gap: r(16) }}>{children}</div>
      </div>
    </div>
  )
}

// ── Brand ────────────────────────────────────────────────────────────────────

export function LogoMark({ size = 44, inverse }: { size?: number; inverse?: boolean }) {
  return (
    <span className="flex items-center justify-center flex-shrink-0" aria-hidden="true"
      style={{ width: r(size), height: r(size), borderRadius: r(size * 0.3), background: inverse ? 'rgba(255,255,255,0.16)' : C.primary, border: inverse ? '1.5px solid rgba(255,255,255,0.4)' : 'none' }}>
      <svg width={r(size * 0.55)} height={r(size * 0.55)} viewBox="0 0 24 24" fill="none">
        <circle cx="6" cy="18" r="3" fill="white" /><circle cx="18" cy="18" r="3" fill="white" />
        <path d="M6 18 L8 8 L14 6 L20 14 L18 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 8 L18 10" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </span>
  )
}

export function Logo() {
  return (
    <div className="flex items-center" style={{ gap: r(12) }} role="img" aria-label="ChaloRaahi">
      <LogoMark />
      <span aria-hidden="true" style={{ fontSize: r(24), fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>ChaloRaahi</span>
    </div>
  )
}

export function Glyph({ kind }: { kind: 'mail' | 'clock' | 'check' | 'alert' | 'users' | 'scooter' | 'both' }) {
  const t = {
    mail: [C.tint, C.primary, 'mail'], clock: [C.warnBg, C.warnText, 'clock'], check: [C.okBg, C.okText, 'check'],
    alert: [C.warnBg, C.warnText, 'alert'], users: [C.tint, C.primary, 'users'], scooter: [C.tint, C.primary, 'scooter'], both: [C.tint, C.primary, 'users'],
  }[kind]
  return (
    <span aria-hidden="true" className="flex items-center justify-center flex-shrink-0" style={{ width: r(88), height: r(88), borderRadius: 999, background: t[0], color: t[1] }}>
      <Ico name={t[2]} size={40} sw={2} />
    </span>
  )
}

// ── Intro illustrations (shared backdrop and palette) ────────────────────────

function Backdrop({ children }: { children: ReactNode }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 390 250" fill="none" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%', display: 'block' }}>
      <defs>
        <linearGradient id="ob-bg" x1="0" y1="0" x2="0" y2="250" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#F4F6FF" /><stop offset="1" stopColor="#DBE4FF" /></linearGradient>
      </defs>
      <rect width="390" height="250" rx="24" fill="url(#ob-bg)" />
      <circle cx="56" cy="52" r="52" fill="#C7D2FE" opacity="0.45" />
      <circle cx="346" cy="60" r="28" fill="#BAC8FF" opacity="0.4" />
      {children}
    </svg>
  )
}

function Rider({ x, y, jacket, helmet }: { x: number; y: number; jacket: string; helmet: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-13" y="-4" width="26" height="40" rx="9" fill={jacket} />
      <circle cx="0" cy="-16" r="13" fill="#F3D9C4" />
      <path d="M-15 -14a15 15 0 0 1 30 0v3h-30z" fill={helmet} />
      <path d="M-4 -10h19v6h-19z" fill="#1E3A8A" opacity="0.85" />
    </g>
  )
}

export function IllRide() {
  return (
    <Backdrop>
      <rect y="206" width="390" height="44" fill="#A5B4FC" opacity="0.35" />
      {[24, 84, 144, 204, 264, 324].map(x => <rect key={x} x={x} y="226" width="30" height="5" rx="2.5" fill="white" opacity="0.7" />)}
      <g transform="translate(95 60)">
        <g transform="translate(-110 -230)">
          <g transform="translate(110 290)">
            <path d="M40 50 Q50 20 90 18 L140 18 Q160 18 165 35 L170 50Z" fill="#3B5BDB" />
            <path d="M40 50 Q45 30 80 28 L130 28 Q148 28 152 42 L155 50Z" fill="#4C6EF5" />
            <rect x="60" y="10" width="86" height="12" rx="6" fill="#364FC7" />
            <path d="M145 18 L158 6" stroke="#364FC7" strokeWidth="4" strokeLinecap="round" />
            <circle cx="30" cy="60" r="22" fill="#364FC7" /><circle cx="30" cy="60" r="12" fill="#748FFC" /><circle cx="30" cy="60" r="5" fill="white" />
            <circle cx="155" cy="60" r="22" fill="#364FC7" /><circle cx="155" cy="60" r="12" fill="#748FFC" /><circle cx="155" cy="60" r="5" fill="white" />
          </g>
          <Rider x={200} y={254} jacket="#364FC7" helmet="#3B5BDB" />
          <Rider x={236} y={258} jacket="#748FFC" helmet="#5C7CFA" />
        </g>
      </g>
    </Backdrop>
  )
}

function Person({ x, y, helmet }: { x: number; y: number; helmet: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="38" fill="white" stroke="#BAC8FF" strokeWidth="2" />
      <circle cx="0" cy="-2" r="13" fill="#F3D9C4" />
      <path d="M-15 0a15 15 0 0 1 30 0v3h-30z" fill={helmet} transform="translate(0 -6)" />
      <path d="M-20 26c2-10 10-14 20-14s18 4 20 14" fill="#748FFC" />
    </g>
  )
}

export function IllFuel() {
  return (
    <Backdrop>
      <circle cx="195" cy="104" r="56" fill="white" stroke="#BAC8FF" strokeWidth="2" />
      <g transform="translate(171 80) scale(2)" stroke="#3B5BDB" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">{paths.fuel}</g>
      <path d="M160 150 Q120 170 104 184" stroke="#5C7CFA" strokeWidth="3" strokeDasharray="7 6" strokeLinecap="round" />
      <path d="M230 150 Q270 170 286 184" stroke="#5C7CFA" strokeWidth="3" strokeDasharray="7 6" strokeLinecap="round" />
      <Person x={92} y={200} helmet="#3B5BDB" />
      <Person x={298} y={200} helmet="#5C7CFA" />
    </Backdrop>
  )
}

export function IllTrust() {
  return (
    <Backdrop>
      <path d="M195 28 L268 58 L268 128 Q268 182 195 208 Q122 182 122 128 L122 58 Z" fill="white" stroke="#BAC8FF" strokeWidth="3" />
      <path d="M195 44 L254 68 L254 126 Q254 170 195 192 Q136 170 136 126 L136 68 Z" fill="#EDF1FF" />
      <path d="M163 120 L187 144 L229 98" stroke="#3B5BDB" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      {[[80, 126, 'lock'], [310, 126, 'pin'], [80, 196, 'phone']].map(([x, y, n]) => (
        <g key={String(n)} transform={`translate(${x} ${y})`}>
          <circle r="28" fill="white" stroke="#BAC8FF" strokeWidth="2" />
          <g transform="translate(-13 -13) scale(1.08)" stroke="#3B5BDB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">{paths[String(n)]}</g>
        </g>
      ))}
    </Backdrop>
  )
}

export function GoogleMark() {
  return (
    <svg aria-hidden="true" width={r(20)} height={r(20)} viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}
