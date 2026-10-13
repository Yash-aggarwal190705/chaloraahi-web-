import type { ReactNode } from 'react'
import { Badge, Btn, C, Heading, Ico, Body, r } from './OnboardingUI'
import { dayLabel, fmtTime } from './PassengerData'
import { days } from './PassengerUI'
import { TRIP_LABEL, type RCtx, type Req, type Trip } from './RiderData'

export const P = (t: ReactNode, s = 15, color: string = C.text2) => <p style={{ fontSize: r(s), color, lineHeight: 1.5, overflowWrap: 'anywhere' }}>{t}</p>

export const when = (t: Pick<Trip, 'mode' | 'date' | 'days' | 'time'>) =>
  t.mode === 'weekly' ? `${days(t.days)} · ${fmtTime(t.time)}` : `${dayLabel(t.date)}, ${fmtTime(t.time)}`

export const clock = (ms: number) => new Date(ms).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
export const clockSec = (ms: number) => new Date(ms).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', second: '2-digit' })

export function Switch({ id, label, checked, onChange, hint }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <div className="flex items-center justify-between" style={{ gap: r(16), minHeight: r(56) }}>
      <div className="min-w-0">
        <label htmlFor={id} style={{ fontSize: r(16), fontWeight: 600, color: C.text }}>{label}</label>
        {hint && <p style={{ fontSize: r(14), color: C.text2 }}>{hint}</p>}
      </div>
      <button id={id} type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex-shrink-0 flex items-center"
        style={{ width: r(56), minHeight: r(48), padding: 0, background: 'none' }}>
        <span aria-hidden className="flex items-center" style={{ width: r(52), height: r(30), borderRadius: 999, padding: r(3), background: checked ? C.primary : '#98A2B3', justifyContent: checked ? 'flex-end' : 'flex-start', transition: 'background-color 160ms' }}>
          <span style={{ width: r(24), height: r(24), borderRadius: 999, background: '#fff' }} />
        </span>
        <span className="sr-only">{checked ? 'On' : 'Off'}</span>
      </button>
    </div>
  )
}

export function TripBadge({ t }: { t: Trip }) {
  const kind = t.status === 'published' || t.status === 'confirmed' ? 'ok' : t.status === 'paused' || t.status === 'draft' ? 'warn' : t.status === 'ended-early' ? 'err' : t.status === 'heading' || t.status === 'at-pickup' || t.status === 'active' ? 'ok' : 'neutral'
  return <Badge kind={kind}>{t.status === 'heading' || t.status === 'at-pickup' ? 'Meetup' : t.status === 'active' ? 'Active' : TRIP_LABEL[t.status]}</Badge>
}

export function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const items = ['Vehicle', 'Documents', 'Review']
  return (
    <ol className="flex items-center flex-wrap" aria-label="Setup steps" style={{ listStyle: 'none', gap: r(8), fontSize: r(14) }}>
      {items.map((l, i) => {
        const n = i + 1, on = n === step, done = n < step
        return (
          <li key={l} aria-current={on ? 'step' : undefined} className="flex items-center" style={{ gap: r(6), color: on ? C.text : C.text2, fontWeight: on ? 700 : 500 }}>
            <span className="flex items-center justify-center" style={{ width: r(24), height: r(24), borderRadius: 999, fontSize: r(13), fontWeight: 700, background: on || done ? C.primary : '#fff', color: on || done ? '#fff' : C.text2, border: `1.5px solid ${on || done ? C.primary : C.input}` }}>
              {done ? <Ico name="check" size={13} sw={3} /> : n}
            </span>
            {l}{done && <span className="sr-only"> (done)</span>}
            {i < 2 && <span aria-hidden style={{ width: r(12), height: 1.5, background: C.divider }} />}
          </li>
        )
      })}
    </ol>
  )
}

export function Initials({ text, size = 48 }: { text: string; size?: number }) {
  return <span aria-hidden className="flex items-center justify-center flex-shrink-0" style={{ width: r(size), height: r(size), borderRadius: 999, background: C.tint, color: C.pressed, fontWeight: 700, fontSize: r(size * 0.36), border: `1px solid ${C.tintBorder}` }}>{text}</span>
}

export function BuddyLine({ q, size = 48 }: { q: Req; size?: number }) {
  return (
    <div className="flex items-center" style={{ gap: r(12) }}>
      <Initials text={q.initials} size={size} />
      <div className="min-w-0">
        <p style={{ fontSize: r(size > 48 ? 20 : 16), fontWeight: 700, color: C.text, overflowWrap: 'anywhere' }}>{q.name}</p>
        <p style={{ fontSize: r(14), color: C.text2 }}>Verified VGU student · {q.rating ? `${q.rating.toFixed(1)} · ${q.rides} rides` : 'New to ChaloRaahi'}</p>
      </div>
    </div>
  )
}

export function NoRide({ c, text = 'There is no ride to show here.' }: { c: RCtx; text?: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center" style={{ padding: r(24), gap: r(12) }}>
      <Heading size={22} center>{text}</Heading>
      <Body center>Your trips are in My trips.</Body>
      <Btn onClick={() => c.root('my-trips')}>Go to My trips</Btn>
    </div>
  )
}

export function LinkBtn({ children, onClick, danger }: { children: ReactNode; onClick: () => void; danger?: boolean }) {
  return <button type="button" onClick={onClick} className="ob-btn ob-btn-text self-start" style={{ minHeight: r(48), padding: 0, color: danger ? C.errText : C.primary, fontWeight: 600, fontSize: r(16), textDecoration: 'underline' }}>{children}</button>
}

export const redText: React.CSSProperties = { minHeight: 48, color: C.errText, fontWeight: 600, fontSize: '1rem', textDecoration: 'underline' }

export const Para = ({ children, size = 15 }: { children: ReactNode; size?: number }) => P(children, size)
