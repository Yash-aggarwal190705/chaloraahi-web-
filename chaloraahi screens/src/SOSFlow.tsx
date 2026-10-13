import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Btn, C, Ico, Notice, r } from './OnboardingUI'
import { Card, KV } from './PassengerUI'
import type { Contact } from './CommonData'
import ShareTrip, { locLine } from './ShareTrip'
import { freshness, linkState } from './shareModel'
import { holdInterrupt, holdProgress, holdSecondsLeft, holdStart, holdTick, idleHold, HOLD_MS, type HoldState, type Interrupt } from './holdGesture'
import {
  campusTarget, contactTarget, emergencyTarget, env, fmtClock, fmtElapsed, pickContact, opener, useNow,
  type CallTarget, type RideCtx, type SOSApi, type SOSScreen, type SOSSession,
} from './SOSData'

export type { SOSScreen } from './SOSData'

const RED = '#B42318', RED_DARK = '#912018'
const HOLD_SECS = Math.round(HOLD_MS / 1000)
const P = ({ children, size = 14, color = C.text2 }: { children: React.ReactNode; size?: number; color?: string }) => <p style={{ fontSize: r(size), color, lineHeight: 1.5 }}>{children}</p>
const H3 = ({ children }: { children: React.ReactNode }) => <h3 style={{ fontSize: r(16), fontWeight: 700, color: C.text, lineHeight: 1.3 }}>{children}</h3>

export type SOSActions = {
  addContact: () => void; manageContacts: () => void; backToRide: () => void; viewRide: () => void; goHome: () => void
  reportIncident: () => void; viewCase: () => void
}
type Props = { sos: SOSApi; ride: RideCtx; contacts: Contact[]; consent: boolean; actions: SOSActions; chipHidden?: boolean }
type Say = (m: string) => void

// ── Shared pieces ────────────────────────────────────────────────────────────

function Modal({ focusKey, onEscape, onBackdrop, full, children }: { focusKey: string; onEscape: () => void; onBackdrop?: () => void; full: (v: boolean) => void; children: React.ReactNode }) {
  const ov = useRef<HTMLDivElement>(null)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    return () => {
      const el = opener.el
      window.setTimeout(() => { (el && el.isConnected ? el : document.querySelector<HTMLElement>('[data-sos-chip]'))?.focus?.() }, 0)
    }
  }, [])
  useEffect(() => { box.current?.querySelector<HTMLElement>('#sos-title')?.focus({ preventScroll: true }) }, [focusKey])
  useLayoutEffect(() => {
    const el = ov.current; if (!el) return
    const measure = () => {
      const large = parseFloat(getComputedStyle(document.documentElement).fontSize) > 18
      el.dataset.scroll = large || el.clientHeight < 560 ? '1' : ''
      full(el.clientHeight < 700 || large)
    }
    measure()
    const ro = new ResizeObserver(measure); ro.observe(el)
    return () => ro.disconnect()
  }, [full])
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onEscape(); return }
    if (e.key !== 'Tab') return
    const f = Array.from(box.current!.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea,[tabindex]:not([tabindex="-1"])'))
    if (!f.length) return
    const first = f[0], last = f[f.length - 1]
    if (e.shiftKey && (document.activeElement === first || document.activeElement === document.getElementById('sos-title'))) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }
  return (
    <div ref={ov} className="ob-root absolute inset-0 z-50 flex items-end" style={{ background: 'rgba(16,24,40,0.55)', fontFamily: 'Inter, sans-serif' }} onClick={() => onBackdrop?.()} onKeyDown={onKey}>
      <div ref={box} role="dialog" aria-modal="true" aria-labelledby="sos-title" onClick={e => e.stopPropagation()} className="ob-sheet sos-sheet w-full flex flex-col min-h-0"
        style={{ background: '#fff', borderRadius: `${r(24)} ${r(24)} 0 0`, maxHeight: '94%' }}>
        {children}
      </div>
      <style>{'[data-scroll="1"] .sos-sheet{overflow-y:auto;overscroll-behavior:contain}[data-scroll="1"] .sos-body{overflow:visible!important;flex:none!important}[data-scroll="1"] .sos-foot{flex-shrink:0}'}</style>
    </div>
  )
}

function Header({ title, sub, onClose, closeLabel }: { title: string; sub?: React.ReactNode; onClose: () => void; closeLabel: string }) {
  return (
    <div className="sos-head flex items-start justify-between flex-shrink-0" style={{ padding: '12px 8px 4px 20px', gap: r(8) }}>
      <div style={{ paddingTop: r(8), minWidth: 0 }}>
        <h2 id="sos-title" tabIndex={-1} style={{ fontSize: `clamp(20px, ${r(22)}, 36px)`, fontWeight: 700, color: C.text, lineHeight: 1.25, outline: 'none' }}>{title}</h2>
        {sub && <div style={{ marginTop: r(4) }}>{sub}</div>}
      </div>
      <button type="button" onClick={onClose} aria-label={closeLabel} className="ob-icon-btn flex items-center justify-center flex-shrink-0" style={{ width: 48, height: 48, borderRadius: 999 }}>
        <Ico name="close" size={22} />
      </button>
    </div>
  )
}
const Body = ({ children }: { children: React.ReactNode }) => <div className="sos-body overflow-y-auto overflow-x-hidden min-h-0 flex-1 flex flex-col" style={{ padding: `${r(8)} 20px ${r(16)}`, gap: r(14) }}>{children}</div>
const Footer = ({ children }: { children: React.ReactNode }) => (
  <div className="sos-foot flex-shrink-0 flex flex-col" style={{ padding: `${r(12)} 20px max(1rem, env(safe-area-inset-bottom))`, gap: r(10), borderTop: `1px solid ${C.divider}`, background: '#fff' }}>{children}</div>
)
const DemoTag = () => <span style={{ fontSize: r(13), color: C.text2 }}>Prototype · alerts, tracking and phone handoffs are simulated</span>

function ActionRow({ icon, title, sub, onClick, danger, disabled, note }: { icon: string; title: string; sub?: string; onClick?: () => void; danger?: boolean; disabled?: boolean; note?: string }) {
  return (
    <div>
      <button type="button" data-danger={danger || undefined} onClick={disabled ? undefined : onClick} aria-disabled={disabled || undefined} className="ob-btn w-full flex items-center text-left"
        style={{ minHeight: r(danger ? 60 : 56), gap: 12, padding: `${r(10)} 14px`, borderRadius: r(14), background: danger ? RED : '#fff', color: danger ? '#fff' : disabled ? C.text2 : C.text, border: danger ? 'none' : `1.5px solid ${C.divider}` }}>
        <Ico name={icon} size={22} color={danger ? '#fff' : disabled ? C.text2 : C.primary} />
        <span className="flex flex-col min-w-0" style={{ flex: 1 }}>
          <span style={{ fontSize: r(16), fontWeight: 700, lineHeight: 1.25, overflowWrap: 'break-word' }}>{title}</span>
          {sub && <span style={{ fontSize: r(14), color: danger ? '#fff' : C.text2, lineHeight: 1.3, overflowWrap: 'anywhere' }}>{sub}</span>}
        </span>
      </button>
      {note && <div style={{ marginTop: r(4) }}><P size={13}>{note}</P></div>}
    </div>
  )
}

function ContactPicker({ contacts, value, onChange }: { contacts: Contact[]; value: string; onChange: (id: string) => void }) {
  if (contacts.length < 2) return null
  return (
    <label className="flex flex-col" style={{ gap: r(4) }}>
      <span style={{ fontSize: r(14), fontWeight: 600, color: C.text }}>Contact to call</span>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ minHeight: r(48), borderRadius: r(12), border: `1.5px solid ${C.input}`, padding: `0 ${r(12)}`, fontSize: r(16), background: '#fff', color: C.text }}>
        {contacts.map(c => <option key={c.id} value={c.id}>{c.name} · {c.relation}</option>)}
      </select>
      <span style={{ fontSize: r(13), color: C.text2 }}>Choosing a contact only changes who you call. It does not notify anyone.</span>
    </label>
  )
}
const tail = (c: Contact) => `ends ${c.phone.slice(-4)}`

// ── Hold button: one mounted control for Confirm and Holding ─────────────────

type HoldCtl = { cancel: (why: Interrupt) => void }
function HoldButton({ ctl, preview, onHolding, onFire, onSay }: { ctl: React.MutableRefObject<HoldCtl | null>; preview: boolean; onHolding: (v: boolean) => void; onFire: () => void; onSay: Say }) {
  const st = useRef<HoldState>(idleHold())
  const raf = useRef(0)
  const [view, setView] = useState({ holding: false, p: 0, secs: HOLD_SECS })
  const cb = useRef({ onHolding, onFire, onSay }); cb.current = { onHolding, onFire, onSay }

  const stop = () => { cancelAnimationFrame(raf.current); raf.current = 0 }
  const fire = () => { stop(); setView({ holding: false, p: 1, secs: 0 }); cb.current.onFire() }
  const interrupt = (why: Interrupt, pid?: number | null) => {
    const o = holdInterrupt(st.current, why, performance.now(), pid)
    if (o.state === st.current && !o.fired) return
    st.current = o.state
    if (o.fired) { fire(); return }
    if (o.interrupted) { stop(); setView({ holding: false, p: 0, secs: HOLD_SECS }); cb.current.onHolding(false); cb.current.onSay('SOS not sent') }
  }
  const loop = () => {
    const t = performance.now()
    const o = holdTick(st.current, t)
    st.current = o.state
    if (o.fired) { fire(); return }
    if (st.current.phase === 'holding') { setView({ holding: true, p: holdProgress(st.current, t), secs: holdSecondsLeft(st.current, t) }); raf.current = requestAnimationFrame(loop) }
  }
  ctl.current = { cancel: why => interrupt(why) }

  useEffect(() => {
    const hide = () => { if (document.hidden) interrupt('hidden') }
    const blur = () => interrupt('blur')
    document.addEventListener('visibilitychange', hide); window.addEventListener('blur', blur)
    return () => { document.removeEventListener('visibilitychange', hide); window.removeEventListener('blur', blur); stop(); st.current = idleHold() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const down = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const o = holdStart(st.current, performance.now(), e.pointerId)
    if (o.state === st.current) return
    st.current = o.state
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* unsupported */ }
    setView({ holding: true, p: 0, secs: HOLD_SECS }); cb.current.onHolding(true)
    cb.current.onSay(`Holding. Keep holding for ${HOLD_SECS} seconds to send SOS. Release to cancel.`)
    raf.current = requestAnimationFrame(loop)
  }
  const move = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (st.current.phase !== 'holding') return
    const b = e.currentTarget.getBoundingClientRect()
    if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom) interrupt('leave', e.pointerId)
  }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cb.current.onSay('Holding is not possible with a keyboard. Use Send without holding.') }
  }
  const showHold = view.holding
  const p = showHold ? view.p : preview ? 0.33 : 0
  const secs = showHold ? view.secs : preview ? HOLD_SECS - 1 : HOLD_SECS
  const circ = 2 * Math.PI * 20
  return (
    <div>
      <button type="button" data-danger onPointerDown={down} onPointerMove={move} onPointerUp={e => interrupt('release', e.pointerId)} onPointerCancel={e => interrupt('cancel', e.pointerId)}
        onLostPointerCapture={e => interrupt('lost-capture', e.pointerId)} onBlur={() => interrupt('blur')} onKeyDown={onKey} onClick={e => e.preventDefault()} onContextMenu={e => e.preventDefault()}
        aria-label={`Hold ${HOLD_SECS} seconds to send SOS`} aria-describedby="sos-hold-hint"
        className="ob-btn relative w-full flex items-center overflow-hidden text-left select-none"
        style={{ minHeight: r(76), gap: r(14), padding: `${r(10)} ${r(18)}`, borderRadius: r(18), background: showHold ? RED_DARK : RED, color: '#fff', touchAction: 'none', WebkitTouchCallout: 'none' }}>
        <span aria-hidden className="absolute left-0 top-0 bottom-0" style={{ width: `${p * 100}%`, background: 'rgba(0,0,0,0.22)' }} />
        <span aria-hidden className="relative flex-shrink-0 flex items-center justify-center" style={{ width: 48, height: 48 }}>
          <svg width={48} height={48} viewBox="0 0 48 48" style={{ position: 'absolute', inset: 0 }}>
            <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="4" />
            <circle cx="24" cy="24" r="20" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - p)} transform="rotate(-90 24 24)" />
          </svg>
          <span style={{ fontSize: r(18), fontWeight: 700 }}>{secs}</span>
        </span>
        <span className="relative flex flex-col min-w-0">
          <span style={{ fontSize: r(17), fontWeight: 700, lineHeight: 1.25 }}>{showHold || preview ? `Keep holding · ${secs} ${secs === 1 ? 'second' : 'seconds'}` : `Hold ${HOLD_SECS} seconds to send SOS`}</span>
          <span style={{ fontSize: r(14) }}>Release to cancel.</span>
        </span>
      </button>
      <p id="sos-hold-hint" className="sr-only">Press and hold. Releasing early cancels and sends nothing. With a keyboard or switch control, use Send without holding.</p>
    </div>
  )
}

// ── Confirm / Holding ────────────────────────────────────────────────────────

function ContextRow({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between" style={{ gap: r(12), padding: `${r(7)} 0` }}>
      <span style={{ fontSize: r(14), color: C.text2, flexShrink: 0, maxWidth: '100%' }}>{k}</span>
      <span style={{ fontSize: r(14), fontWeight: 600, color: C.text, textAlign: 'right', overflowWrap: 'anywhere' }}>{children}</span>
    </div>
  )
}

function PreSheet({ p, previewHold, alt, setAlt, onDismiss, ctl, setHolding, say, fire, onCall }: {
  p: Props; previewHold: boolean; alt: boolean; setAlt: (v: boolean) => void; onDismiss: () => void; ctl: React.MutableRefObject<HoldCtl | null>
  setHolding: (v: boolean) => void; say: Say; fire: () => void; onCall: (t: CallTarget) => void
}) {
  const { ride, contacts, consent, sos, actions } = p
  const now = useNow(1000)
  const contact = pickContact(contacts, sos.ui.contactId)
  const prev = sos.cur?.endedAt ? sos.cur : null
  const sh = ride.share, sharing = !!sh && linkState(sh, now, ride.stage === 'closed') === 'active'
  const noCtx = ride.stage === 'none' || ride.stage === 'closed'
  const call = (t: CallTarget) => { ctl.current?.cancel('dismiss'); onCall(t) }
  if (alt) {
    return (
      <>
        <Header title="Send SOS alert?" onClose={() => setAlt(false)} closeLabel="Go back" />
        <Body>
          <P size={15} color={C.text}>This sends an in-app emergency alert now. {contact && consent ? `${contact.name} may also be notified.` : 'No contact will be notified.'}</P>
          <ActionRow danger icon="phone" title="Call emergency services · 112" onClick={() => call(emergencyTarget())} />
          <P size={13}>An in-app alert does not guarantee emergency assistance.</P>
        </Body>
        <Footer>
          <Btn data-danger onClick={() => { setAlt(false); fire() }} style={{ background: RED }}>Send SOS alert</Btn>
          <Btn variant="secondary" onClick={() => setAlt(false)}>Go back</Btn>
        </Footer>
      </>
    )
  }
  return (
    <>
      <Header title="Emergency SOS" sub={<DemoTag />} onClose={onDismiss} closeLabel="Go back" />
      <Body>
        <P size={15} color={C.text}>In immediate danger? Call emergency services.</P>
        <ActionRow danger icon="phone" title="Call emergency services · 112" onClick={() => call(emergencyTarget())} />
        {env.auth === 'expired' && <Notice kind="warning">Your sign-in has expired. Calls still work. In-app alerts need you to sign in again.</Notice>}
        {!ride.online && <Notice kind="warning">You’re offline. Calls still work. An in-app alert can’t be submitted until you reconnect.</Notice>}
        <P size={15}>Send an in-app emergency alert. Your selected contact may also be notified if emergency sharing is enabled.</P>
        <Card style={{ padding: `${r(6)} ${r(14)}` }}>
          <ContextRow k={ride.stage === 'meetup' ? 'Meetup' : 'Ride'}>{noCtx ? 'No active ride' : `${ride.route} · ${ride.stageLabel}`}</ContextRow>
          <ContextRow k="Emergency contact">{contact ? `${contact.name} · ${contact.relation}` : 'None selected'}</ContextRow>
          <ContextRow k="Contact notifications">{!contact ? 'Not applicable' : consent ? 'On' : 'Off'}</ContextRow>
          <ContextRow k="Trip sharing">{sharing ? `Active until ${fmtClock(sh!.expires)}` : 'Not sharing'}</ContextRow>
        </Card>
        {ride.stage === 'meetup' && <P>Ride not started · live tracking is off. SOS will not start tracking.</P>}
        {noCtx && <P>{ride.stage === 'closed' ? 'This ride has closed.' : 'No active ride.'} The alert will not carry a ride ID. Calling and reporting still work.</P>}
        {!contact && (
          <div className="flex flex-col" style={{ gap: r(8) }}>
            <Notice kind="info">No emergency contact selected.</Notice>
            <Btn variant="secondary" onClick={() => { ctl.current?.cancel('dismiss'); actions.addContact() }}>Add contact</Btn>
          </div>
        )}
        {contact && !consent && (
          <div className="flex flex-col" style={{ gap: r(8) }}>
            <Notice kind="info">Contact notifications are off. {contact.name} will not be messaged. A saved number is not permission to notify.</Notice>
            <Btn variant="secondary" onClick={() => { ctl.current?.cancel('dismiss'); actions.manageContacts() }}>Manage contact notifications</Btn>
          </div>
        )}
        <ContactPicker contacts={contacts} value={contact?.id ?? ''} onChange={sos.setContactId} />
        {prev && <Btn variant="text" onClick={() => sos.setScreen('sos-ended')}>Previous SOS ended at {fmtClock(prev.endedAt!)} · View summary</Btn>}
        <P size={13}>An in-app alert does not guarantee emergency assistance.</P>
      </Body>
      <Footer>
        <HoldButton ctl={ctl} preview={previewHold} onHolding={setHolding} onFire={fire} onSay={say} />
        <Btn variant="secondary" onClick={() => { ctl.current?.cancel('dismiss'); setAlt(true) }}>Send without holding</Btn>
        <Btn variant="text" onClick={onDismiss}>Go back</Btn>
      </Footer>
    </>
  )
}

// ── Active / Shared dashboard ────────────────────────────────────────────────

const ALERT_HEAD: Record<string, string> = { sending: 'Sending alert…', submitted: 'Alert submitted', uncertain: 'Submission not confirmed', failed: 'Alert not sent', acknowledged: 'Support acknowledged' }
const TONE: Record<string, { bg: string; fg: string; icon: string }> = {
  sending: { bg: C.tint, fg: C.pressed, icon: 'clock' }, submitted: { bg: C.okBg, fg: C.okText, icon: 'check' }, acknowledged: { bg: C.okBg, fg: C.okText, icon: 'check' },
  uncertain: { bg: C.warnBg, fg: C.warnText, icon: 'alert' }, failed: { bg: C.errBg, fg: C.errText, icon: 'alert' },
}
const failCopy = (s: SOSSession) => s.alert.reason === 'offline' ? 'You were offline, so nothing was submitted.' : s.alert.reason === 'auth' ? 'Your sign-in expired. Calls still work. Restore sign-in, then retry.' : s.alert.reason === 'not-received' ? 'The alert was not received. You can send it again.' : 'The server reported an error.'

const Log = ({ events, order }: { events: SOSSession['events']; order: 'new' | 'old' }) => (
  <ol className="flex flex-col" style={{ gap: r(8), listStyle: 'none', padding: 0 }}>
    {(order === 'new' ? [...events].reverse() : events).map(e => (
      <li key={e.id} className="flex" style={{ gap: r(10) }}>
        <span style={{ fontSize: r(13), color: C.text2, minWidth: r(64), flexShrink: 0 }}>{fmtClock(e.at)}</span>
        <span style={{ fontSize: r(14), color: C.text, lineHeight: 1.4 }}>{e.text}</span>
      </li>
    ))}
  </ol>
)

function Line({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: `${r(6)} 0` }}>
      <div style={{ fontSize: r(13), color: C.text2 }}>{k}</div>
      <div style={{ fontSize: r(15), color: C.text, fontWeight: 500, lineHeight: 1.4 }}>{children}</div>
    </div>
  )
}

function Dashboard({ p, s, expanded, onCall, onEnd, close, say }: { p: Props; s: SOSSession; expanded: boolean; onCall: (t: CallTarget) => void; onEnd: () => void; close: () => void; say: Say }) {
  const { sos, ride, contacts, actions } = p
  const now = useNow(1000)
  const online = ride.online
  const contact = pickContact(contacts, sos.ui.contactId)
  const target = contact ? contactTarget(contact) : null
  const campus = campusTarget()
  const a = s.alert, c = s.contact
  const head = a.checking ? 'Checking alert…' : ALERT_HEAD[a.status]
  const tone = TONE[a.status]
  const shareRef = useRef<HTMLDivElement>(null)
  useEffect(() => { if (expanded) shareRef.current?.scrollIntoView?.({ block: 'start' }) }, [expanded])
  const sh = ride.share, ls = sh ? linkState(sh, now, ride.stage === 'closed') : 'none'
  const live = ride.stage === 'live'
  const f = live ? freshness(ride.loc, ride.locAt, now) : null
  const subject = s.role === 'customer' ? 'Rider location' : 'Ride location'
  const sent = ['submitted', 'acknowledged'].includes(a.status)

  return (
    <>
      <Header title="Emergency SOS" onClose={close} closeLabel="Minimize SOS and go back to the ride"
        sub={
          <div className="flex flex-col" style={{ gap: r(4) }}>
            <span className="inline-flex items-center self-start" style={{ gap: r(6), padding: `${r(4)} ${r(10)}`, borderRadius: 999, background: tone.bg, color: tone.fg, fontSize: r(14), fontWeight: 700 }}>
              <Ico name={tone.icon} size={16} />{head}
            </span>
            <span style={{ fontSize: r(14), color: C.text2 }}><span className="sr-only">SOS started at {fmtClock(s.startedAt)}.</span><span aria-hidden>Since you started SOS · {fmtElapsed(now - s.startedAt)}</span></span>
            <DemoTag />
          </div>
        } />
      <Body>
        {s.restored && <Notice kind="info">Demo session restored after a reload. Pending steps were not resent.</Notice>}
        {a.status === 'failed' && (
          <div className="flex flex-col" style={{ gap: r(8) }}>
            <Notice kind="error"><strong>Alert not sent.</strong> {failCopy(s)} If you’re in danger, call emergency services now.</Notice>
            <Btn onClick={() => sos.retryAlert(online)} disabled={!online}>{online ? 'Retry sending alert' : 'Reconnect to retry'}</Btn>
          </div>
        )}
        {a.status === 'uncertain' && (
          <div className="flex flex-col" style={{ gap: r(8) }}>
            <Notice kind="warning"><strong>Submission not confirmed.</strong> The alert may or may not have reached ChaloRaahi. Check its status before sending again.</Notice>
            <Btn variant="secondary" loading={a.checking} onClick={() => sos.checkAlert(online)}>Check alert status</Btn>
          </div>
        )}
        {ride.stage === 'closed' && <Notice kind="info">Your ride has closed. SOS stays active until you end it. Closing a ride does not close a safety case.</Notice>}

        <section aria-label="Call now" className="flex flex-col" style={{ gap: r(10) }}>
          <ActionRow danger icon="phone" title="Call emergency services · 112" onClick={() => onCall(emergencyTarget())} />
          <ContactPicker contacts={contacts} value={contact?.id ?? ''} onChange={sos.setContactId} />
          {contact && target ? (
            <ActionRow icon="phone" title={`Call ${contact.name}`} sub={`${contact.relation} · ${tail(contact)}`} disabled={!target.tel} onClick={() => onCall(target)} note={target.tel ? undefined : 'This number isn’t valid. Update it in Profile.'} />
          ) : (
            <div className="flex flex-col" style={{ gap: r(6) }}><P>No emergency contact selected.</P><Btn variant="secondary" onClick={actions.addContact}>Add contact</Btn></div>
          )}
          {campus ? <ActionRow icon="phone" title="Call campus security" sub={`${campus.number} · sample number`} onClick={() => onCall(campus)} /> : <P>Campus security number unavailable.</P>}
        </section>

        <Card>
          <H3>Alert status</H3>
          <Line k="Alert">{a.checking ? 'Checking…' : a.status === 'sending' ? 'Sending alert…' : sent ? `Alert submitted at ${fmtClock(a.at)}.${a.ref ? ` Reference ${a.ref}.` : ''}` : a.status === 'uncertain' ? 'Submission not confirmed.' : 'Alert not sent.'}</Line>
          <Line k="Contact">{c.status === 'not-requested' ? 'No contact notification requested.' : c.status === 'pending-alert' ? `Will be requested for ${c.name} once the alert is submitted.` : c.status === 'queued' ? `Message queued for ${c.name}.` : c.status === 'sent' ? 'Message sent · delivery not confirmed.' : 'Couldn’t send the contact notification.'}</Line>
          {sent && c.status === 'failed' && <Btn variant="secondary" onClick={() => sos.retryContact(online)} disabled={!online}>Retry contact notification only</Btn>}
          {c.status === 'sent' && <Line k="Delivery">Not confirmed. ChaloRaahi can’t tell if the message was delivered or read.</Line>}
          <Line k="Support">{a.status === 'acknowledged' ? `Support acknowledged at ${fmtClock(a.ackAt!)}.` : 'Not acknowledged yet. ChaloRaahi can’t confirm anyone is responding.'}</Line>
        </Card>

        <Card>
          <H3>{subject}</H3>
          {ride.stage === 'meetup' && <Line k="Status">Ride not started · live tracking is off.</Line>}
          {ride.stage === 'none' && <Line k="Status">No active ride. No location is being shared.</Line>}
          {ride.stage === 'closed' && <Line k="Status">Ride closed. Live location has stopped.</Line>}
          {live && f && (
            <>
              <Line k="Status">{f === 'live' ? 'Live' : f === 'stale' ? 'Last known · not live' : 'Unavailable'}</Line>
              <Line k="Source">{s.role === 'customer' ? 'Rider’s phone (sample feed)' : 'This phone (sample feed)'}</Line>
              <Line k="Updated">{f === 'unavailable' ? 'No location received.' : locLine({ state: ride.loc, at: ride.locAt }, now)}</Line>
              {f !== 'unavailable' && <Line k="Accuracy">About 25 m (sample)</Line>}
              {f === 'stale' && <P>This location is more than 30 seconds old (prototype assumption). Don’t rely on it.</P>}
              {f === 'unavailable' && <P>Location permission may be off, or the signal was lost.</P>}
            </>
          )}
          {s.role === 'customer' && live && <P size={13}>Your own location isn’t tracked during this ride by default.</P>}
          <p className="sr-only">{subject}: {!live ? 'not available for this ride state' : f === 'live' ? 'live' : f === 'stale' ? 'last known, not live' : 'unavailable'}. Route {ride.route}.</p>
        </Card>

        <div ref={shareRef} className="flex flex-col" style={{ gap: r(10) }}>
          {expanded && sh && ride.patchShare && (
            <Card>
              <H3>Trip sharing</H3>
              <div style={{ marginTop: r(8) }}>
                <ShareTrip share={sh} patch={ride.patchShare} fail={ride.shareFail} online={online} say={say} intro={false}
                  closed={ride.stage === 'closed'} owner="Aarav S." route={ride.route} status={ride.stageLabel} loc={{ state: ride.loc, at: ride.locAt }} />
              </div>
            </Card>
          )}
          {ride.stage !== 'none' && sh ? (
            <Btn variant="secondary" icon={<Ico name="share" size={18} />} onClick={() => sos.setScreen(expanded ? 'sos-active' : 'sos-shared')}>
              {expanded ? 'Hide trip sharing' : ls === 'active' || ls === 'uncertain' ? 'Manage trip sharing' : ls === 'closed' || ls === 'revoked' ? 'View trip sharing' : 'Share trip'}
            </Btn>
          ) : <P>Trip sharing needs an active ride.</P>}
        </div>

        <Card>
          <H3>Activity log</H3>
          <div style={{ margin: `${r(2)} 0 ${r(8)}` }}><P size={13}>Simulated prototype events, newest first.</P></div>
          <Log events={s.events} order="new" />
        </Card>
      </Body>
      <Footer>
        <Btn variant="secondary" onClick={actions.backToRide}>Back to ride</Btn>
        <Btn onClick={onEnd}>I’m safe — end SOS</Btn>
      </Footer>
    </>
  )
}

// ── Calling (phone-app handoff) ──────────────────────────────────────────────

function Calling({ p, back }: { p: Props; back: () => void }) {
  const { sos } = p
  const cs = sos.ui.call
  const now = useNow(1000)
  const s = sos.cur && !sos.cur.endedAt ? sos.cur : null
  if (!cs) return <><Header title="Call" onClose={back} closeLabel="Return to SOS" /><Body><P>No call selected.</P></Body><Footer><Btn onClick={back}>Return to SOS</Btn></Footer></>
  const t = cs.target
  const simulated = !new URLSearchParams(location.search).has('nativeDial')
  return (
    <>
      <Header title={t.title} onClose={back} closeLabel="Return to SOS" sub={s ? <span style={{ fontSize: r(14), color: C.text2 }}><span aria-hidden>SOS active · {fmtElapsed(now - s.startedAt)}</span></span> : <DemoTag />} />
      <Body>
        <Card>
          <P>{t.name}{t.sample ? ' · sample number' : ''}</P>
          <p style={{ fontSize: r(28), fontWeight: 700, color: C.text, userSelect: 'all', overflowWrap: 'anywhere' }}>{t.number}</p>
        </Card>
        <P size={15} color={C.text}>Use your phone app to place the call. Your in-app SOS status is separate.</P>
        {cs.handoff === 'requested' && <Notice kind="info">Phone-app handoff requested.{simulated ? ' Prototype: this is simulated, so no call was placed.' : ' ChaloRaahi can’t tell whether the call connected.'}</Notice>}
        {cs.handoff === 'unavailable' && <Notice kind="warning">{t.tel ? 'This device can’t open a phone app. Select the number above and copy it, or dial it manually.' : 'This number isn’t valid, so no call can be started. Update it in Profile.'}</Notice>}
        {cs.copy === 'copied' && <Notice kind="success">Number copied.</Notice>}
        {cs.copy === 'failed' && <Notice kind="warning">Couldn’t copy automatically. Select the number above and copy it manually.</Notice>}
        {s && <P size={13}>Alert: {ALERT_HEAD[s.alert.status]}. Location, sharing and the timer keep running.</P>}
      </Body>
      <Footer>
        <Btn icon={<Ico name="phone" size={18} />} onClick={() => sos.requestHandoff()} disabled={!t.tel}>Open phone app</Btn>
        <Btn variant="secondary" icon={<Ico name="copy" size={18} />} onClick={() => sos.copyNumber()}>Copy number</Btn>
        <Btn variant="text" onClick={back}>Return to SOS</Btn>
      </Footer>
    </>
  )
}

// ── End confirm ──────────────────────────────────────────────────────────────

function EndConfirm({ p, s, back, onCall }: { p: Props; s: SOSSession; back: () => void; onCall: (t: CallTarget) => void }) {
  const { sos, ride } = p
  const [accident, setAccident] = useState(false)
  const now = useNow(1000)
  const e = s.end
  const ls = ride.share ? linkState(ride.share, now, ride.stage === 'closed') : 'none'
  const sending = e.status === 'sending'
  const go = () => sos.requestEnd(ride.online, accident ? 'Activated by accident' : '')
  return (
    <>
      <Header title="End this SOS session?" onClose={back} closeLabel="Keep SOS active" />
      <Body>
        <P size={15} color={C.text}>If you’re safe now, you can send a safe-status update and end this SOS session.</P>
        <ul style={{ paddingLeft: r(20), listStyle: 'disc', display: 'flex', flexDirection: 'column', gap: r(6), fontSize: r(14), color: C.text2, lineHeight: 1.5 }}>
          <li>Your ride will not be completed.</li>
          <li>Existing trip links remain active until revoked or expired.</li>
          <li>A safety case may remain open.</li>
          <li>Messages already sent cannot be recalled.</li>
        </ul>
        {(ls === 'active' || ls === 'uncertain') && <Btn variant="secondary" onClick={() => sos.setScreen('sos-shared')}>Manage sharing</Btn>}
        <label className="flex items-center" style={{ gap: r(12), minHeight: r(48) }}>
          <input type="checkbox" checked={accident} onChange={ev => setAccident(ev.target.checked)} style={{ width: r(22), height: r(22), accentColor: C.primary, flexShrink: 0 }} />
          <span style={{ fontSize: r(15), color: C.text }}>This was activated by accident (optional)</span>
        </label>
        {(sending || e.checking) && <Notice kind="info">{e.checking ? 'Checking safe-status update…' : 'Sending safe-status update…'} Calling is still available.</Notice>}
        {e.status === 'saved-offline' && <Notice kind="warning"><strong>Safe-status update saved on this device. Not confirmed.</strong> SOS stays active until it’s sent.</Notice>}
        {e.status === 'uncertain' && <Notice kind="warning"><strong>No response to the safe-status update.</strong> Check its state before trying again.</Notice>}
        {e.status === 'failed' && <Notice kind="error"><strong>Safe-status update failed.</strong> {e.failReason === 'auth' ? 'Your sign-in expired. Calls still work.' : e.failReason === 'not-received' ? 'The update was not received.' : 'SOS is still active.'} You can try again or keep SOS active.</Notice>}
        <ActionRow icon="phone" title="Call emergency services · 112" onClick={() => onCall(emergencyTarget())} />
      </Body>
      <Footer>
        {e.status === 'uncertain' ? (
          <Btn loading={e.checking} onClick={() => sos.checkEnd(ride.online)}>Check status first</Btn>
        ) : e.status === 'saved-offline' ? (
          <Btn onClick={go} disabled={!ride.online}>{ride.online ? 'Send saved update' : 'Reconnect to send'}</Btn>
        ) : (
          <Btn loading={sending} onClick={go}>{e.status === 'failed' ? 'Try again — I’m safe' : 'I’m safe — end SOS'}</Btn>
        )}
        <Btn variant="secondary" onClick={back}>Keep SOS active</Btn>
        {(e.status === 'saved-offline' || e.status === 'failed') && <Btn variant="text" onClick={() => { sos.cancelEndIntent(); back() }}>Discard update</Btn>}
      </Footer>
    </>
  )
}

// ── Ended ────────────────────────────────────────────────────────────────────

function Ended({ p, s, close, say }: { p: Props; s: SOSSession; close: () => void; say: Say }) {
  const { ride, actions, sos } = p
  const now = useNow(1000)
  const [share, setShare] = useState(false)
  const sh = ride.share, ls = sh ? linkState(sh, now, ride.stage === 'closed') : 'none'
  const liveRide = ride.stage === 'live' || ride.stage === 'meetup'
  const a = s.alert, c = s.contact
  const ref = a.ref ?? (['failed', 'sending', 'uncertain'].includes(a.status) ? 'None — the alert was not confirmed.' : 'Not available.')
  const primary = liveRide ? { t: 'Back to ride', f: actions.backToRide } : ride.rideId ? { t: 'View ride', f: actions.viewRide } : { t: 'Back to home', f: actions.goHome }
  return (
    <>
      <Header title="SOS session ended" onClose={close} closeLabel="Close" sub={<span style={{ fontSize: r(15), color: C.text2 }}>{s.end.status === 'done' ? 'You marked yourself safe.' : 'Session ended.'}</span>} />
      <Body>
        <Card>
          <div className="flex flex-col" style={{ gap: r(8) }}>
            <KV k="Started" v={fmtClock(s.startedAt)} />
            <KV k="Ended" v={fmtClock(s.endedAt!)} />
            <KV k="Duration" v={fmtElapsed(s.endedAt! - s.startedAt)} />
            <KV k="Alert reference" v={ref} />
            <KV k="Alert" v={ALERT_HEAD[a.status]} />
            <KV k="Contact" v={c.status === 'not-requested' ? 'None requested' : c.status === 'sent' ? `Message sent to ${c.name} · delivery not confirmed` : c.status === 'failed' ? 'Notification failed' : c.status === 'queued' ? 'Message queued · not confirmed' : 'Not sent'} />
            <KV k="Ride" v={ride.stage === 'none' ? 'No ride attached' : `${ride.route} · ${ride.stageLabel}`} />
            <KV k="Trip sharing" v={ls === 'active' || ls === 'uncertain' ? `Link active until ${fmtClock(sh!.expires)}` : ls === 'revoked' ? 'Link revoked' : ls === 'closed' ? 'Link ended when the ride closed' : ls === 'expired' ? 'Link expired' : 'Not shared'} />
            <KV k="Safety case" v={s.caseRef ? `${s.caseRef} · Acknowledged` : 'None known'} />
          </div>
        </Card>
        <P>Ending SOS does not complete your ride or close a safety case.</P>
        <Card>
          <H3>Activity log</H3>
          <div style={{ marginTop: r(8) }}><Log events={s.events} order="old" /></div>
        </Card>
        {share && sh && ride.patchShare && (
          <Card><ShareTrip share={sh} patch={ride.patchShare} fail={ride.shareFail} online={ride.online} say={say} intro={false}
            closed={ride.stage === 'closed'} owner="Aarav S." route={ride.route} status={ride.stageLabel} loc={{ state: ride.loc, at: ride.locAt }} /></Card>
        )}
        <Btn variant="secondary" onClick={actions.reportIncident}>Report an incident</Btn>
        {s.caseRef && <Btn variant="secondary" onClick={actions.viewCase}>View safety case</Btn>}
        {sh && ride.patchShare && ls !== 'none' && <Btn variant="secondary" onClick={() => setShare(v => !v)}>{share ? 'Hide sharing' : 'Manage sharing'}</Btn>}
        <ActionRow icon="phone" title="Call emergency services · 112" onClick={() => sos.startCall(emergencyTarget())} />
      </Body>
      <Footer><Btn onClick={primary.f}>{primary.t}</Btn></Footer>
    </>
  )
}

// ── Host ─────────────────────────────────────────────────────────────────────

export default function SOSContent(p: Props) {
  const { sos, ride, chipHidden } = p
  const { ui, cur } = sos
  const [say, setSay] = useState('')
  const [, setHolding] = useState(false)
  const [alt, setAlt] = useState(false)
  const [full, setFull] = useState(false)
  const ctl = useRef<HoldCtl | null>(null)
  const active = !!cur && !cur.endedAt
  const now = useNow(1000, active && !ui.open)

  // Stage announcements only, never per-second ticks.
  const sig = cur ? [cur.alert.status, cur.contact.status, cur.end.status, !!cur.endedAt, cur.alert.checking].join('|') : ''
  const last = useRef(sig)
  useEffect(() => {
    if (!cur || sig === last.current) { last.current = sig; return }
    last.current = sig
    const a = cur.alert.status
    setSay(cur.endedAt ? 'SOS session ended.' : cur.end.status === 'saved-offline' ? 'Safe-status update saved on this device. Not confirmed.' : cur.end.status === 'uncertain' ? 'Safe-status update not confirmed.' :
      a === 'submitted' ? 'Alert submitted.' : a === 'acknowledged' ? 'Support acknowledged the alert.' : a === 'failed' ? 'Alert not sent.' : a === 'uncertain' ? 'Alert submission not confirmed.' : 'Sending alert.')
  }, [sig, cur])

  const screen: SOSScreen = ui.screen
  const pre = screen === 'sos-confirm' || screen === 'sos-holding'
  useEffect(() => { if (!pre) setAlt(false) }, [pre])

  const dismissPre = () => { ctl.current?.cancel('dismiss'); setHolding(false); setAlt(false); sos.close() }
  const fire = () => {
    setHolding(false); setAlt(false)
    sos.activate({ role: ride.role, rideId: ride.stage === 'none' || ride.stage === 'closed' ? null : ride.rideId, route: ride.route, rideNote: ride.stageLabel, online: ride.online, contact: pickContact(p.contacts, ui.contactId), consent: p.consent })
    sos.setScreen('sos-active')
  }
  const hold = (v: boolean) => {
    setHolding(v)
    sos.setScreen(v ? 'sos-holding' : 'sos-confirm')
  }
  const onCall = (t: CallTarget) => { setHolding(false); sos.startCall(t) }
  const toActive = () => sos.setScreen('sos-active')

  const escape = () => {
    if (pre) return alt ? setAlt(false) : dismissPre()
    if (screen === 'sos-calling') return sos.returnFromCall()
    if (screen === 'sos-cancel-confirm') return toActive()
    sos.close()
  }

  let chip: React.ReactNode = null
  if (active && !ui.open && !chipHidden && cur) {
    const st = cur.alert.status
    const label = st === 'failed' ? 'SOS alert not sent' : st === 'sending' || st === 'uncertain' ? 'SOS submission pending' : 'SOS alert active'
    const tone = st === 'failed' ? [C.errBg, C.errText] : st === 'sending' || st === 'uncertain' ? [C.warnBg, C.warnText] : [C.okBg, C.okText]
    chip = (
      <button type="button" onClick={() => sos.openSOS('sos-active')} aria-label={`${label}. Open SOS session.`} data-sos-chip className="ob-root ob-btn absolute flex items-center"
        style={{ top: 48, left: 12, right: 12, zIndex: 45, minHeight: r(48), gap: r(8), padding: `${r(6)} ${r(14)}`, borderRadius: r(14), background: tone[0], color: tone[1], border: `1.5px solid ${tone[1]}`, fontSize: r(15), fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>
        <Ico name="alert" size={18} /><span className="flex-1 text-left">{label}</span><span aria-hidden style={{ fontWeight: 600 }}>{fmtElapsed(now - cur.startedAt)}</span><Ico name="chevron" size={18} />
      </button>
    )
  }

  return (
    <>
      {chip}
      <div role="status" aria-live="polite" className="sr-only">{say}</div>
      {ui.open && (
        <Modal focusKey={pre ? (alt ? 'pre-alt' : 'pre') : screen === 'sos-shared' ? 'sos-active' : screen} onEscape={escape} onBackdrop={pre ? dismissPre : undefined} full={setFull}>
          {full && <style>{'.sos-sheet{max-height:100%!important;border-radius:0!important}'}</style>}
          {pre ? (
            <PreSheet p={p} previewHold={screen === 'sos-holding'} alt={alt} setAlt={setAlt} onDismiss={dismissPre} ctl={ctl} setHolding={hold} say={setSay} fire={fire} onCall={onCall} />
          ) : screen === 'sos-calling' ? (
            <Calling p={p} back={sos.returnFromCall} />
          ) : !cur ? (
            <>
              <Header title="No SOS session" onClose={sos.close} closeLabel="Close" />
              <Body><P>There’s no SOS session to show. You can start one from the SOS button on a ride screen.</P></Body>
              <Footer><Btn onClick={() => sos.setScreen('sos-confirm')}>Open Emergency SOS</Btn></Footer>
            </>
          ) : cur.endedAt || screen === 'sos-ended' ? (
            <Ended p={p} s={cur} close={sos.close} say={setSay} />
          ) : screen === 'sos-cancel-confirm' ? (
            <EndConfirm p={p} s={cur} back={toActive} onCall={onCall} />
          ) : (
            <Dashboard p={p} s={cur} expanded={screen === 'sos-shared'} onCall={onCall} onEnd={() => sos.setScreen('sos-cancel-confirm')} close={sos.close} say={setSay} />
          )}
        </Modal>
      )}
    </>
  )
}
