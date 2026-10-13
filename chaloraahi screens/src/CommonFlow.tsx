import { useEffect, useMemo, useRef, useState } from 'react'
import { Body, Btn, C, Field, Heading, Ico, Notice, Screen, TopRow, r } from './OnboardingUI'
import { Card, Check, useTimers } from './PassengerUI'
import { addDays, todayISO, type Ride } from './PassengerData'
import { DOC_META, DOC_STATUS, maskReg, SAMPLE_VEHICLE, emptyDoc, emptyDocs, sampleDoc, vehicleLine } from './RiderData'
import PricingContent from './PricingScreens'
import WalletContent, { WALLET_SCREENS, type WalletScreen } from './WalletScreens'
import type { WalletStore } from './useWallet'
import {
  ALL_COMMON_SCREENS, FUTURE_SCREENS, HostCtx, fullPhone, maskPhone, parsePhone, type AStore, type CNav, type CollegeStatus, type CommonScreen, type Contact,
} from './CommonData'
import { Avatar, Group, InfoRow, NavRow, Page, Pill, Sh, SwitchRow, fmtLong, useHost, type CCtx } from './CommonUI'
import {
  About, BlockedUsers, DeleteAccount, HelpSupport, NotifDetail, NotifList, NotifPrefs, Policies, PolicyDetail, PrivacyData, RideDetail, RideHistory,
  SafetyCenter, SupportCaseScreen, SupportForm, MySupport,
} from './CommonMore'
import type { PStore } from './PassengerData'
import type { RStore, RiderScreen } from './RiderData'

export { ALL_COMMON_SCREENS }
export type { CommonScreen }

const APP_VERSION = '0.9.0 (pilot build)'

// ── Derived status helpers ───────────────────────────────────────────────────

type Tone = 'ok' | 'warn' | 'err' | 'neutral'
export const collegeLabel: Record<CollegeStatus, [Tone, string]> = {
  verified: ['ok', 'Verified'], pending: ['warn', 'Under review'], action: ['err', 'Action needed'], expired: ['warn', 'Renewal needed'], restricted: ['err', 'Restricted'],
}
function pilotLabel(rs: RStore): [Tone, string] {
  const started = !!rs.vehicle.type || Object.values(rs.docs).some(d => d.status !== 'none')
  switch (rs.approval) {
    case 'draft': return started ? ['warn', 'Draft'] : ['neutral', 'Not started']
    case 'pending': return ['warn', 'Under review']
    case 'approved': return ['ok', 'Approved']
    case 'rejected': return ['err', 'Action needed']
    case 'expired': return ['warn', 'Renewal needed']
    default: return ['err', 'Restricted']
  }
}
function vehicleLabel(rs: RStore): [Tone, string] {
  if (!rs.vehicle.type) return ['neutral', 'Not added']
  const [t, l] = pilotLabel(rs)
  return [t, rs.approval === 'draft' ? 'Draft' : rs.approval === 'approved' ? 'Approved' : l]
}

const activeRide = (p: PStore): Ride | undefined => p.rides.find(x => ['on-the-way', 'at-pickup', 'in-progress'].includes(x.status))

// ── Shell ────────────────────────────────────────────────────────────────────

export default function CommonContent(props: {
  a: AStore; nav: CNav; p: PStore; rs: RStore; role: 'customer' | 'rider'
  bleed: boolean
  onExit: () => void
  onTab: (t: 'home' | 'rides' | 'requests') => void
  onSOS: () => void
  onPilot: (s: RiderScreen) => void
  onMembership: () => void
  onOpenRide: (role: 'buddy' | 'pilot', id: string) => void
  onSwitchRole: (r: 'customer' | 'rider') => void
  onSignOut: () => void
  onSignIn: () => void
  w: WalletStore
}) {
  const { a, nav, p, rs, role, onExit, onTab } = props
  const [host, setHost] = useState<HTMLElement | null>(null)
  const [sheets, setSheets] = useState(0)
  const [toast, setToast] = useState('')
  const [note, setNote] = useState('')
  const tm = useRef<number>(0)
  const mainRef = useRef<HTMLElement>(null)
  const say = (m: string) => { setToast(m); setNote(''); window.setTimeout(() => setNote(m), 30); window.clearTimeout(tm.current); tm.current = window.setTimeout(() => setToast(''), 3200) }
  const count = useMemo(() => (d: number) => setSheets(n => n + d), [])
  const ctxVal = useMemo(() => ({ host, count, say }), [host]) // eslint-disable-line react-hooks/exhaustive-deps

  const c: CCtx = {
    a, nav, p, rs, role,
    back: () => (nav.depth > 1 ? nav.pop() : onExit()),
    go: nav.go, exit: onExit, onSOS: props.onSOS, onPilot: props.onPilot, onMembership: props.onMembership, onOpenRide: props.onOpenRide,
    onSwitchRole: props.onSwitchRole, onSignOut: props.onSignOut, onSignIn: props.onSignIn,
  }

  const key = `${nav.screen}:${nav.p.id ?? ''}`
  useEffect(() => { mainRef.current?.querySelector<HTMLElement>('[data-heading]')?.focus({ preventScroll: true }) }, [key])

  const screen = nav.screen
  const showNav = screen === 'profile'
  const pilot = role === 'rider'
  const offline = a.proto.network === 'offline'
  const reported = useMemo(() => {
    const since = Date.now() - 7 * 86400000
    const list = rs.trips.filter(t => t.status === 'completed' && (t.settlement === 'cash' || t.settlement === 'upi') && new Date(t.date + 'T00:00:00').getTime() >= since)
    return { total: list.reduce((n, t) => n + Math.round(t.amount * 100), 0), count: list.length }
  }, [rs.trips])

  const navBtn = (id: string, label: string, icon: string, on: boolean, fn: () => void) => (
    <button key={id} type="button" onClick={fn} aria-current={on ? 'page' : undefined} className="ob-icon-btn flex-1 flex flex-col items-center justify-center"
      style={{ minHeight: r(60), gap: r(2), color: on ? C.primary : C.text2, fontSize: r(13), fontWeight: on ? 700 : 500 }}>
      <Ico name={icon} size={22} sw={on ? 2.4 : 1.8} />{label}
    </button>
  )

  let body: React.ReactNode = null
  const future = FUTURE_SCREENS.has(screen)
  switch (screen) {
    case 'profile': body = a.status === 'suspended' ? <StatusScreen c={c} kind="suspended" /> : a.status === 'session-expired' ? <StatusScreen c={c} kind="expired" /> : <Profile c={c} /> ; break
    case 'edit-profile': body = <EditProfile c={c} />; break
    case 'verify-status': body = <Verification c={c} />; break
    case 'emergency-contact': body = <Contacts c={c} />; break
    case 'contact-form': body = <ContactForm key={nav.p.id ?? 'new'} c={c} />; break
    case 'notif-list': case 'notif-empty': body = <NotifList c={c} forceEmpty={screen === 'notif-empty'} />; break
    case 'notif-detail': body = <NotifDetail c={c} />; break
    case 'notif-prefs': body = <NotifPrefs c={c} />; break
    case 'ride-history': body = <RideHistory c={c} />; break
    case 'ride-detail': body = <RideDetail c={c} />; break
    case 'help-support': body = <HelpSupport c={c} />; break
    case 'support-form': body = <SupportForm c={c} />; break
    case 'my-support': body = <MySupport c={c} />; break
    case 'support-case': body = <SupportCaseScreen c={c} />; break
    case 'safety-center': body = <SafetyCenter c={c} />; break
    case 'blocked-users': body = <BlockedUsers c={c} />; break
    case 'privacy-data': body = <PrivacyData c={c} />; break
    case 'delete-account': body = <DeleteAccount c={c} />; break
    case 'policies': body = <Policies c={c} />; break
    case 'policy-detail': body = <PolicyDetail c={c} />; break
    case 'about': body = <About c={c} />; break
    case 'status-suspended': body = <StatusScreen c={c} kind="suspended" />; break
    case 'status-session-expired': body = <StatusScreen c={c} kind="expired" />; break
    case 'status-deletion': body = <StatusScreen c={c} kind="deletion" />; break
    case 'logged-out': body = <StatusScreen c={c} kind="logged-out" />; break
    case 'pricing': case 'pricing-selected': case 'pricing-compare':
      body = <PricingContent screen={screen} w={props.w} nav={nav} online={!offline} onBack={c.back} onSignIn={props.onSignIn} onHelp={() => nav.go('help-support')} onProfile={() => {}} />; break
    default:
      if (WALLET_SCREENS.includes(screen as WalletScreen))
        body = <WalletContent screen={screen as WalletScreen} w={props.w} nav={nav} online={!offline} reported={reported} onOpenRide={props.onOpenRide} onHelp={() => nav.go('help-support')} onBack={c.back} onSignIn={props.onSignIn} />
  }

  return (
    <HostCtx.Provider value={ctxVal}>
      <div className="ob-root absolute inset-0 flex flex-col" style={{ background: '#fff', fontFamily: 'Inter, sans-serif', paddingTop: props.bleed ? 0 : 44 }}>
        <div inert={sheets > 0} className="flex flex-col flex-1 min-h-0">
          {offline && (
            <div role="status" className="flex items-center flex-shrink-0" style={{ gap: r(8), padding: `${r(8)} ${r(20)}`, background: C.warnBg, color: C.warnText, fontSize: r(14), fontWeight: 600, borderBottom: `1px solid ${C.warnBorder}` }}>
              <Ico name="alert" size={16} />You're offline. Saved details are shown.
            </div>
          )}
          {future && (
            <div className="flex-shrink-0" style={{ padding: `${r(8)} ${r(20)}`, background: '#101828', color: '#fff', fontSize: r(13), fontWeight: 600, lineHeight: 1.4 }}>
              Future concept, not part of the current pilot.
            </div>
          )}
          <main ref={mainRef} key={key} className="ob-fade flex-1 min-h-0 flex flex-col">{body}</main>
          {showNav && (
            <nav aria-label="Main" className="flex flex-shrink-0" style={{ borderTop: `1px solid ${C.divider}`, background: '#fff', paddingBottom: 'env(safe-area-inset-bottom)' }}>
              {navBtn('home', 'Home', 'home', false, () => onTab('home'))}
              {pilot ? navBtn('req', 'Requests', 'list', false, () => onTab('requests')) : null}
              {navBtn('rides', pilot ? 'My trips' : 'My rides', 'calendar', false, () => onTab('rides'))}
              {navBtn('profile', 'Profile', 'user', true, () => {})}
            </nav>
          )}
        </div>
        <div ref={setHost} />
        {toast && (
          <div aria-hidden className="absolute left-0 right-0 flex justify-center pointer-events-none" style={{ bottom: showNav ? r(76) : r(20), padding: `0 ${r(16)}`, zIndex: 60 }}>
            <div style={{ background: '#101828', color: '#fff', borderRadius: r(12), padding: `${r(10)} ${r(16)}`, fontSize: r(14), fontWeight: 500, overflowWrap: 'anywhere', boxShadow: '0 4px 16px rgba(16,24,40,.3)' }}>{toast}</div>
          </div>
        )}
        <div role="status" aria-live="polite" className="sr-only">{note}</div>
      </div>
    </HostCtx.Provider>
  )
}

// ── Profile ──────────────────────────────────────────────────────────────────

function Profile({ c }: { c: CCtx }) {
  const { a, rs, p, role } = c
  const [sheet, setSheet] = useState<null | 'role' | 'logout'>(null)
  const [pick, setPick] = useState<'customer' | 'rider'>(role)
  const pilotMode = role === 'rider'
  const done = p.rides.filter(x => x.status === 'completed').length + rs.trips.filter(t => t.status === 'completed').length
  const isNew = a.proto.member === 'new'
  const [ct, cl] = collegeLabel[a.college]
  const [pt, pl] = pilotLabel(rs)
  const [vt, vl] = vehicleLabel(rs)
  const act = activeRide(p) ?? null
  const liveTrip = rs.live

  const banner = (() => {
    if (a.status === 'deletion-requested') return { kind: 'warning' as const, text: 'Account deletion requested. Review what happens next.', label: 'View details', fn: () => c.go('status-deletion') }
    if (a.college !== 'verified') return { kind: a.college === 'pending' ? ('info' as const) : ('warning' as const), text: a.college === 'pending' ? 'Your college membership is under review.' : a.college === 'restricted' ? 'Your college membership is restricted.' : a.college === 'expired' ? 'Your college membership needs renewal.' : 'Your college membership needs an update.', label: 'Open verification', fn: () => c.go('verify-status') }
    if (rs.approval === 'rejected' || rs.approval === 'expired') return { kind: 'warning' as const, text: rs.approval === 'expired' ? 'Your Pilot documents need renewal.' : 'Your Pilot approval needs action.', label: 'Fix now', fn: () => c.go('verify-status') }
    if (pilotMode && rs.approval !== 'approved') return { kind: 'info' as const, text: rs.approval === 'draft' ? 'Finish Pilot setup to offer rides.' : 'Your Pilot approval is being reviewed.', label: 'Open verification', fn: () => c.go('verify-status') }
    if (a.contacts.length === 0) return { kind: 'info' as const, text: 'Add an emergency contact. It does not share your location.', label: 'Add contact', fn: () => c.go('contact-form') }
    return null
  })()

  return (
    <Screen gap={20} footer={<p style={{ fontSize: r(13), color: C.text3, textAlign: 'center' }}>ChaloRaahi {APP_VERSION}</p>}>
      {(act || liveTrip) && (
        <button type="button" onClick={() => (act ? c.onOpenRide('buddy', act.id) : liveTrip && c.onOpenRide('pilot', liveTrip.id))} className="flex items-center justify-between w-full text-left"
          style={{ minHeight: r(52), padding: `${r(8)} ${r(16)}`, borderRadius: r(14), background: C.pressed, color: '#fff', gap: r(8), fontSize: r(15), fontWeight: 600 }}>
          <span>You have a ride in progress</span><span style={{ textDecoration: 'underline', flexShrink: 0 }}>Return to ride</span>
        </button>
      )}
      <div className="flex items-center" style={{ gap: r(16) }}>
        <Avatar name={a.name} photo={a.photo} size={72} />
        <div className="min-w-0 flex-1 flex flex-col" style={{ gap: r(2) }}>
          <Heading size={24}>{a.name}</Heading>
          <p style={{ fontSize: r(14), color: C.text2, overflowWrap: 'anywhere' }}>{a.email}</p>
          {a.area && <p style={{ fontSize: r(14), color: C.text2, overflowWrap: 'anywhere' }}>{a.area}</p>}
          <p style={{ fontSize: r(14), color: C.text, fontWeight: 600 }}>{isNew || done === 0 ? 'New member · No ratings yet' : `${done} completed ${done === 1 ? 'ride' : 'rides'} · No ratings yet`}</p>
        </div>
      </div>

      <div className="flex items-center flex-wrap" style={{ gap: r(8) }}>
        <Pill kind="info">Using {pilotMode ? 'Pilot' : 'Buddy'} mode</Pill>
        <button type="button" onClick={() => { setPick(role); setSheet('role') }} aria-haspopup="dialog" className="ob-btn" style={{ minHeight: r(48), padding: `0 ${r(12)}`, color: C.primary, fontWeight: 600, fontSize: r(15), textDecoration: 'underline', textUnderlineOffset: 3 }}>Switch role</button>
      </div>

      {banner && <Notice kind={banner.kind} action={<button type="button" onClick={banner.fn} className="block" style={{ minHeight: r(44), marginTop: r(4), fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3, color: 'inherit', textAlign: 'left' }}>{banner.label}</button>}>{banner.text}</Notice>}

      <Card>
        <div className="flex flex-col" style={{ gap: r(10) }}>
          {([['College membership', ct, cl], ['Pilot approval', pt, pl], ['Vehicle', vt, vl]] as [string, Tone, string][]).map(([k, t, l]) => (
            <div key={k} className="flex items-center justify-between" style={{ gap: r(12) }}>
              <span style={{ fontSize: r(15), color: C.text }}>{k}</span><Pill kind={t}>{l}</Pill>
            </div>
          ))}
        </div>
      </Card>

      <Group title="Account">
        <NavRow icon="user" title="Edit profile" onClick={() => c.go('edit-profile')} />
        <NavRow icon="shield" title="Verification and vehicle" onClick={() => c.go('verify-status')} />
        <NavRow icon="phone" title="Emergency contacts" sub={a.contacts.length ? `${a.contacts.length} saved` : 'None added yet'} onClick={() => c.go('emergency-contact')} />
      </Group>
      <Group title="Future concepts" note="Concept demos. Not part of the current pilot. No real money moves.">
        <NavRow icon="fuel" title="Wallet" sub={pilotMode ? 'Rider wallet' : 'Passenger wallet'} onClick={() => c.go(pilotMode ? 'wallet-rider-home' : 'wallet-home')} />
        <NavRow icon="star" title="Plans" sub="Optional monthly commute tools" onClick={() => c.go('pricing')} />
      </Group>
      <Group title="Activity">
        <NavRow icon="calendar" title="Ride history" onClick={() => c.go('ride-history')} />
        <NavRow icon="repeat" title="Recurring schedules" sub={pilotMode ? 'Repeating trips you offer' : 'Repeating rides you requested'} onClick={() => (pilotMode ? c.onPilot('recurring') : c.go('ride-history', { filter: 'recurring' }))} />
        <NavRow icon="bell" title="Notification preferences" onClick={() => c.go('notif-prefs')} />
      </Group>
      <Group title="Safety and privacy">
        <NavRow icon="shield" title="Safety center" onClick={() => c.go('safety-center')} />
        <NavRow icon="ban" title="Blocked users" sub={a.blocked.length ? `${a.blocked.length} blocked` : 'No one blocked'} onClick={() => c.go('blocked-users')} />
        <NavRow icon="lock" title="Privacy and data" onClick={() => c.go('privacy-data')} />
      </Group>
      <Group title="Support" note={<>Fuel contributions are settled directly between participants by cash or their own UPI app. ChaloRaahi does not process the payment.</>}>
        <NavRow icon="info" title="Help and support" onClick={() => c.go('help-support')} />
        <NavRow icon="file" title="Terms and policies" onClick={() => c.go('policies')} />
        <NavRow icon="heart" title="About ChaloRaahi" onClick={() => c.go('about')} />
      </Group>
      <Group>
        <NavRow icon="close" title="Log out" danger onClick={() => setSheet('logout')} />
      </Group>

      {sheet === 'role' && (
        <Sh title="Switch role" onClose={() => setSheet(null)}>
          <p style={{ fontSize: r(15), color: C.text2 }}>Switching keeps your rides, trips and settings.</p>
          <fieldset className="flex flex-col" style={{ gap: r(8), border: 0, padding: 0, minWidth: 0 }}>
            <legend className="sr-only">Role</legend>
            {([['customer', 'Buddy', 'Request rides from Pilots on your route.'], ['rider', 'Pilot', rs.approval === 'approved' ? 'Offer rides to Buddies.' : 'Needs setup and approval before you can offer rides.']] as const).map(([v, t, d]) => (
              <label key={v} className="ob-check flex items-start" style={{ gap: r(12), padding: r(14), minHeight: r(56), borderRadius: r(14), border: `1.5px solid ${pick === v ? C.primary : C.divider}`, background: pick === v ? C.tint : '#fff', cursor: 'pointer' }}>
                <input type="radio" name="role" checked={pick === v} onChange={() => setPick(v)} style={{ width: r(22), height: r(22), accentColor: C.primary, marginTop: 2 }} />
                <span><span className="block" style={{ fontSize: r(16), fontWeight: 600, color: C.text }}>{t}</span><span className="block" style={{ fontSize: r(14), color: C.text2 }}>{d}</span></span>
              </label>
            ))}
          </fieldset>
          <Btn onClick={() => { setSheet(null); if (pick !== role) { c.onSwitchRole(pick) } }}>{pick === role ? 'Keep current role' : `Switch to ${pick === 'rider' ? 'Pilot' : 'Buddy'}`}</Btn>
        </Sh>
      )}
      {sheet === 'logout' && (
        <Sh title="Log out of ChaloRaahi?" onClose={() => setSheet(null)}>
          <p style={{ fontSize: r(15), color: C.text2 }}>You will need to sign in again with your college email. This prototype only simulates logging out.</p>
          <Btn onClick={() => setSheet(null)}>Stay signed in</Btn>
          <Btn variant="secondary" onClick={() => { setSheet(null); c.onSignOut() }}>Log out</Btn>
        </Sh>
      )}
    </Screen>
  )
}

// ── Edit profile ─────────────────────────────────────────────────────────────

function EditProfile({ c }: { c: CCtx }) {
  const { a } = c
  const t = useTimers()
  const { say } = useHost()
  const [name, setName] = useState(a.name)
  const [area, setArea] = useState(a.area)
  const [photo, setPhoto] = useState<string | null>(a.photo)
  const [phase, setPhase] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle')
  const [fail, setFail] = useState('')
  const [errs, setErrs] = useState<{ name?: string; area?: string }>({})
  const [sheet, setSheet] = useState<null | 'photo' | 'discard' | 'email'>(null)
  const [up, setUp] = useState<'idle' | 'uploading' | 'failed'>('idle')
  const [upMsg, setUpMsg] = useState('')
  const pending = useRef<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const dirty = name !== a.name || area !== a.area || photo !== a.photo

  const upload = (f: File) => {
    pending.current = f
    if (!f.type.startsWith('image/')) { setUp('failed'); setUpMsg('Choose an image file (JPG, PNG or similar).'); pending.current = null; return }
    if (f.size > 5 * 1024 * 1024) { setUp('failed'); setUpMsg('That photo is larger than 5 MB. Choose a smaller one.'); pending.current = null; return }
    setUp('uploading'); setUpMsg('')
    t(() => {
      if (a.proto.upload === 'failed' || a.proto.network === 'offline') { setUp('failed'); setUpMsg(a.proto.network === 'offline' ? "You're offline. Try again when you're connected." : "The photo couldn't be uploaded.") }
      else { setPhoto(URL.createObjectURL(f)); setUp('idle'); pending.current = null; setPhase('idle') }
    }, 900)
  }

  const save = () => {
    const e: typeof errs = {}
    if (!name.trim()) e.name = 'Enter your name.'
    else if (name.trim().length > 80) e.name = 'Use 80 characters or fewer.'
    if (area.trim().length > 60) e.area = 'Use 60 characters or fewer.'
    setErrs(e)
    if (e.name || e.area) { document.getElementById(e.name ? 'pf-name' : 'pf-area')?.focus(); return }
    setPhase('saving'); setFail('')
    t(() => {
      if (a.proto.network === 'offline') { setPhase('failed'); setFail("You're offline, so your changes weren't saved. They're still here. Try again when you're connected."); return }
      if (a.proto.save === 'failed') { setPhase('failed'); setFail("We couldn't save your changes. They're still here. Try again."); return }
      a.setName(name.trim()); a.setArea(area.trim()); a.setPhoto(photo); setName(name.trim()); setArea(area.trim())
      setPhase('saved'); say('Profile updated')
    }, 900)
  }
  const back = () => (dirty && phase !== 'saving' ? setSheet('discard') : c.back())

  return (
    <>
      <Page title="Edit profile" onBack={back} footer={
        <>
          {phase === 'failed' && <Notice kind="error">{fail}</Notice>}
          {phase === 'saved' && !dirty && <Notice kind="success">Profile updated</Notice>}
          <Btn loading={phase === 'saving'} aria-disabled={!dirty || phase === 'saving' || undefined} onClick={() => { if (dirty) save() }}
            style={!dirty && phase !== 'saving' ? { opacity: 0.55 } : undefined}>{phase === 'saving' ? 'Saving…' : phase === 'failed' ? 'Try again' : phase === 'saved' && !dirty ? 'Saved' : 'Save changes'}</Btn>
        </>
      }>
        <div className="flex items-center" style={{ gap: r(16) }}>
          <Avatar name={name || a.name} photo={photo} size={80} />
          <div className="flex flex-col items-start">
            <button type="button" onClick={() => setSheet('photo')} aria-haspopup="dialog" className="ob-btn" style={{ minHeight: r(48), color: C.primary, fontWeight: 600, fontSize: r(16), textDecoration: 'underline', textUnderlineOffset: 3 }}>{photo ? 'Change photo' : 'Add photo'}</button>
            {up === 'uploading' && <span role="status" style={{ fontSize: r(14), color: C.text2 }}>Uploading photo…</span>}
          </div>
        </div>
        {up === 'failed' && (
          <Notice kind="error" action={pending.current ? <button type="button" onClick={() => pending.current && upload(pending.current)} className="block" style={{ minHeight: r(44), fontWeight: 700, textDecoration: 'underline', color: 'inherit' }}>Retry upload</button> : undefined}>{upMsg}</Notice>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-label="Choose profile photo" onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }} />
        <Field id="pf-name" label="Full name" value={name} autoComplete="name" onChange={e => { setName(e.target.value); setPhase('idle') }} error={errs.name} />
        <Field id="pf-area" label="Area or locality" optional value={area} autoComplete="off" onChange={e => { setArea(e.target.value); setPhase('idle') }} error={errs.area}
          helper="Shown to matched riders as a general area only, never your exact address." />
        <Group>
          <InfoRow icon="mail" title="College email" value={a.email} action={<Ico name="lock" size={16} color={C.text3} />} />
        </Group>
        <p style={{ fontSize: r(14), color: C.text2, marginTop: r(-8) }}>Your college email is used for verification and can't be edited here.</p>
        <Btn variant="text" onClick={() => setSheet('email')} aria-haspopup="dialog">Request an email correction</Btn>
      </Page>

      {sheet === 'photo' && (
        <Sh title="Profile photo" onClose={() => setSheet(null)}>
          <Btn icon={<Ico name="camera" size={18} />} onClick={() => { setSheet(null); window.setTimeout(() => fileRef.current?.click(), 0) }}>Choose photo</Btn>
          {photo && <Btn variant="secondary" onClick={() => { setPhoto(null); setUp('idle'); setSheet(null); setPhase('idle') }}>Remove photo</Btn>}
          <Btn variant="text" onClick={() => setSheet(null)}>Cancel</Btn>
        </Sh>
      )}
      {sheet === 'discard' && (
        <Sh title="Discard your changes?" onClose={() => setSheet(null)}>
          <p style={{ fontSize: r(15), color: C.text2 }}>Your edits to this profile haven't been saved.</p>
          <Btn onClick={() => setSheet(null)}>Keep editing</Btn>
          <Btn variant="secondary" onClick={() => { setSheet(null); c.back() }}>Discard changes</Btn>
        </Sh>
      )}
      {sheet === 'email' && (
        <Sh title="Request an email correction" onClose={() => setSheet(null)}>
          <p style={{ fontSize: r(15), color: C.text2 }}>Because your college email confirms your membership, an authorized operator reviews any correction. Send a request to support and include the correct address.</p>
          <Btn onClick={() => { setSheet(null); c.go('support-form', { filter: 'Email correction' }) }}>Contact support</Btn>
          <Btn variant="text" onClick={() => setSheet(null)}>Cancel</Btn>
        </Sh>
      )}
    </>
  )
}


// ── Verification and vehicle ─────────────────────────────────────────────────

function Verification({ c }: { c: CCtx }) {
  const { a, rs } = c
  const [sheet, setSheet] = useState(false)
  const [ct, cl] = collegeLabel[a.college]
  const [pt, pl] = pilotLabel(rs)
  const [vt, vl] = vehicleLabel(rs)
  const docs = (Object.keys(rs.docs) as (keyof typeof rs.docs)[]).filter(k => rs.docs[k].status !== 'none')
  const ap = rs.approval
  const supportRestricted = () => c.go('support-form', { filter: 'Account restriction' })

  const collegeText: Record<CollegeStatus, string> = {
    verified: `Verified on ${fmtLong(a.collegeAt)}.`,
    pending: 'An authorized operator is reviewing your college ID.',
    action: 'Your college ID needs to be updated before it can be approved.',
    expired: 'Your college membership needs to be renewed.',
    restricted: 'Your membership has a restriction. Contact support to understand what it means.',
  }
  const collegeBtn: Record<CollegeStatus, [string, () => void] | null> = {
    verified: null, pending: ['View review status', c.onMembership], action: ['Update verification', c.onMembership], expired: ['Renew membership', c.onMembership], restricted: ['Contact support', supportRestricted],
  }
  const pilotText = { draft: 'Pilot setup is not finished. You only need it to offer rides.', pending: 'Your licence and vehicle documents are being reviewed.', approved: 'Your documents were approved.', rejected: 'One or more documents need action.', expired: 'A document has expired and needs renewal.', restricted: 'Your Pilot access has a restriction. Contact support to understand what it means.' }[ap]
  const started = !!rs.vehicle.type || docs.length > 0
  const pilotBtn: [string, () => void] = ap === 'draft' ? [started ? 'Continue setup' : 'Start Pilot setup', () => c.onPilot(rs.vehicle.type ? 'setup-documents' : 'setup-vehicle')]
    : ap === 'pending' ? ['View review status', () => c.onPilot('verification-pending')]
    : ap === 'approved' ? ['View Pilot status', () => c.onPilot('verification-verified')]
    : ap === 'rejected' ? ['Replace document', () => c.onPilot('setup-documents')]
    : ap === 'expired' ? ['Renew documents', () => c.onPilot('setup-documents')] : ['Contact support', supportRestricted]

  return (
    <>
      <Page title="Verification and vehicle" sub="Separate checks for your membership, your Pilot approval and your vehicle." onBack={c.back}
        right={<button type="button" onClick={() => setSheet(true)} aria-haspopup="dialog" className="ob-icon-btn flex items-center justify-center" aria-label="What verification means" style={{ width: r(48), height: r(48), borderRadius: 999 }}><Ico name="info" size={22} /></button>}>
        <StatusCard title="College membership" tone={ct} label={cl} text={collegeText[a.college]} action={collegeBtn[a.college]} />
        <StatusCard title="Pilot approval" tone={pt} label={pl} text={pilotText} action={pilotBtn}>
          {docs.length > 0 && (
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: r(8) }}>
              {docs.map(k => (
                <li key={k} style={{ fontSize: r(14), color: C.text }}>
                  <span style={{ fontWeight: 600 }}>{DOC_META[k].title}</span>: {DOC_STATUS[rs.docs[k].status]}
                  {rs.docs[k].reason && <span className="block" style={{ color: C.warnText }}>{rs.docs[k].reason}</span>}
                </li>
              ))}
            </ul>
          )}
        </StatusCard>
        <StatusCard title="Vehicle" tone={vt} label={vl} text={rs.vehicle.type ? `${vehicleLine(rs.vehicle)} · ${maskReg(rs.vehicle.reg)}` : 'No vehicle added. You only need one to offer rides.'}
          action={rs.vehicle.type ? ['View vehicle', () => c.onPilot('vehicle-status')] : ['Add vehicle', () => c.onPilot('setup-vehicle')]} />
        <Notice kind="info">Documents are reviewed by authorized operators and are never shown to other members.</Notice>
      </Page>
      {sheet && (
        <Sh title="What verification means" onClose={() => setSheet(false)}>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: r(12), paddingLeft: r(20), fontSize: r(15), color: C.text2, lineHeight: 1.5 }}>
            <li><b style={{ color: C.text }}>College membership</b> means an authorized operator checked your college ID.</li>
            <li><b style={{ color: C.text }}>Pilot approval</b> means operators reviewed your licence and vehicle documents.</li>
            <li>Verification is not a guarantee of any ride or any person's behaviour. Use your own judgement and the safety tools when you need them.</li>
          </ul>
          <Btn onClick={() => setSheet(false)}>Got it</Btn>
        </Sh>
      )}
    </>
  )
}

function StatusCard({ title, tone, label, text, action, children }: { title: string; tone: Tone; label: string; text: string; action?: [string, () => void] | null; children?: React.ReactNode }) {
  return (
    <Card>
      <div className="flex flex-col" style={{ gap: r(12) }}>
        <div className="flex items-center justify-between" style={{ gap: r(8) }}>
          <h2 style={{ fontSize: r(18), fontWeight: 600, color: C.text }}>{title}</h2>
          <Pill kind={tone}>{label}</Pill>
        </div>
        <p style={{ fontSize: r(15), color: C.text2, lineHeight: 1.45, overflowWrap: 'anywhere' }}>{text}</p>
        {children}
        {action && <Btn variant={tone === 'ok' || tone === 'neutral' ? 'secondary' : 'primary'} onClick={action[1]}>{action[0]}</Btn>}
      </div>
    </Card>
  )
}

// ── Emergency contacts ───────────────────────────────────────────────────────

function Contacts({ c }: { c: CCtx }) {
  const { a } = c
  const { say } = useHost()
  const [show, setShow] = useState<Record<string, boolean>>({})
  const [manage, setManage] = useState<Contact | null>(null)
  const [remove, setRemove] = useState<Contact | null>(null)
  const [err, setErr] = useState('')
  const offline = a.proto.network === 'offline'

  const doRemove = (x: Contact) => {
    if (offline) { setErr('Changes need a connection. Try again when you are back online.'); setRemove(null); return }
    const rest = a.contacts.filter(y => y.id !== x.id)
    if (x.primary && rest.length) rest[0] = { ...rest[0], primary: true }
    a.setContacts(rest); setRemove(null); say(`${x.name} removed`); setErr('')
  }
  const makePrimary = (x: Contact) => {
    if (offline) { setErr('Changes need a connection. Try again when you are back online.'); setManage(null); return }
    a.setContacts(a.contacts.map(y => ({ ...y, primary: y.id === x.id }))); setManage(null); say(`${x.name} is now your primary contact`)
  }

  return (
    <>
      <Page title="Emergency contacts" onBack={c.back}
        sub="Adding a contact does not automatically share your location. Sharing only starts when you choose it, for example during a ride or an SOS."
        footer={a.contacts.length > 0 ? <Btn variant="secondary" icon={<Ico name="user" size={18} />} onClick={() => c.go('contact-form')}>Add a contact</Btn> : undefined}>
        {offline && <Notice kind="warning">You can view saved contact details. Changes will need a connection.</Notice>}
        {err && <Notice kind="error">{err}</Notice>}
        {a.contacts.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center text-center" style={{ gap: r(12), padding: `${r(12)} 0` }}>
              <span className="flex items-center justify-center" style={{ width: r(56), height: r(56), borderRadius: 999, background: C.tint, color: C.primary }}><Ico name="phone" size={26} /></span>
              <h2 style={{ fontSize: r(18), fontWeight: 600 }}>No emergency contacts yet</h2>
              <Body size={15} center>Add someone you trust. We will only use their number when you choose to contact them.</Body>
              <Btn onClick={() => c.go('contact-form')}>Add a contact</Btn>
            </div>
          </Card>
        ) : (
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: r(12) }}>
            {a.contacts.map(x => (
              <li key={x.id}>
                <Card>
                  <div className="flex items-start justify-between" style={{ gap: r(8) }}>
                    <div className="min-w-0">
                      <h2 style={{ fontSize: r(17), fontWeight: 600, overflowWrap: 'anywhere' }}>{x.name}</h2>
                      {x.relation && <p style={{ fontSize: r(14), color: C.text2 }}>{x.relation}</p>}
                      <p style={{ fontSize: r(16), color: C.text, marginTop: r(4) }}>{show[x.id] ? fullPhone(x.phone) : maskPhone(x.phone)}</p>
                    </div>
                    <button type="button" onClick={() => setManage(x)} aria-haspopup="dialog" aria-label={`Manage ${x.name}`} className="ob-icon-btn flex items-center justify-center flex-shrink-0" style={{ width: r(48), height: r(48), borderRadius: 999 }}><Ico name="more" size={22} /></button>
                  </div>
                  <div className="flex items-center flex-wrap" style={{ gap: r(8), marginTop: r(8) }}>
                    {x.primary && <Pill kind="info">Primary</Pill>}
                    <Pill kind="neutral">Saved</Pill>
                    <button type="button" aria-pressed={!!show[x.id]} onClick={() => setShow(s => ({ ...s, [x.id]: !s[x.id] }))} style={{ minHeight: r(44), padding: `0 ${r(8)}`, color: C.primary, fontWeight: 600, fontSize: r(14), textDecoration: 'underline' }}>{show[x.id] ? 'Hide number' : 'Show number'}</button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
        {a.contacts.length > 0 && (
          <SwitchRow id="notify-contacts" title="Notify my contact when I send SOS" checked={a.notifyContacts} onChange={a.setNotifyContacts}
            sub="When on, sending an SOS alert also queues a notification to your contact. When off, your contact is only told if you share your trip or call them yourself." />
        )}
        <p style={{ fontSize: r(13), color: C.text2 }}>Contacts are saved as you entered them. ChaloRaahi does not verify them.</p>
      </Page>
      {manage && (
        <Sh title={`Manage ${manage.name}`} onClose={() => setManage(null)}>
          <Btn onClick={() => { const id = manage.id; setManage(null); c.go('contact-form', { id }) }}>Edit details</Btn>
          {!manage.primary && <Btn variant="secondary" onClick={() => makePrimary(manage)}>Make primary</Btn>}
          <Btn variant="secondary" onClick={() => { const m = manage; setManage(null); setRemove(m) }} style={{ color: C.errText, borderColor: C.errText }}>Remove contact</Btn>
          <Btn variant="text" onClick={() => setManage(null)}>Cancel</Btn>
        </Sh>
      )}
      {remove && (
        <Sh title={`Remove ${remove.name}?`} onClose={() => setRemove(null)}>
          <p style={{ fontSize: r(15), color: C.text2 }}>They will no longer be listed as your emergency contact.</p>
          <Btn onClick={() => setRemove(null)}>Keep contact</Btn>
          <Btn variant="secondary" onClick={() => doRemove(remove)} style={{ color: C.errText, borderColor: C.errText }}>Remove</Btn>
        </Sh>
      )}
    </>
  )
}

function ContactForm({ c }: { c: CCtx }) {
  const { a } = c
  const t = useTimers()
  const { say } = useHost()
  const ex = a.contacts.find(x => x.id === c.nav.p.id)
  const [name, setName] = useState(ex?.name ?? '')
  const [phone, setPhone] = useState(ex?.phone ?? '')
  const [rel, setRel] = useState(ex?.relation ?? '')
  const [primary, setPrimary] = useState(ex?.primary ?? a.contacts.length === 0)
  const [ack, setAck] = useState(!!ex)
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [phase, setPhase] = useState<'idle' | 'saving' | 'failed'>('idle')
  const [msg, setMsg] = useState('')
  const [discard, setDiscard] = useState(false)
  const dirty = !ex ? !!(name || phone || rel) : name !== ex.name || phone !== ex.phone || rel !== ex.relation || primary !== ex.primary

  const save = () => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Enter their name.'
    const d = parsePhone(phone)
    if (!phone.trim()) e.phone = 'Enter a mobile number.'
    else if (!d) e.phone = 'Enter a 10-digit Indian mobile number, with or without +91.'
    if (!ack) e.ack = 'Confirm that this person knows before you save.'
    setErrs(e)
    const first = e.name ? 'cf-name' : e.phone ? 'cf-phone' : e.ack ? 'cf-ack' : ''
    if (first) { document.getElementById(first)?.focus(); return }
    if (a.proto.network === 'offline') { setPhase('failed'); setMsg("You're offline. Changes need a connection, and nothing was saved. Try again when you're back online."); return }
    setPhase('saving'); setMsg('')
    t(() => {
      if (a.proto.contactSave === 'failed') { setPhase('failed'); setMsg("We couldn't save this contact. What you entered is still here."); return }
      const next: Contact = { id: ex?.id ?? `c${Date.now()}`, name: name.trim(), phone: d!, relation: rel.trim(), primary }
      let list = ex ? a.contacts.map(x => (x.id === ex.id ? next : x)) : [...a.contacts, next]
      if (primary) list = list.map(x => ({ ...x, primary: x.id === next.id }))
      else if (!list.some(x => x.primary)) list = list.map((x, i) => ({ ...x, primary: i === 0 }))
      a.setContacts(list); say(ex ? 'Contact updated' : 'Contact saved'); c.back()
    }, 800)
  }

  return (
    <>
      <Page title={ex ? 'Edit contact' : 'Add a contact'} onBack={() => (dirty ? setDiscard(true) : c.back())}
        footer={<>{phase === 'failed' && <Notice kind="error">{msg}</Notice>}<Btn loading={phase === 'saving'} onClick={save}>{phase === 'saving' ? 'Saving…' : phase === 'failed' ? 'Try again' : 'Save contact'}</Btn></>}>
        <Field id="cf-name" label="Full name" value={name} autoComplete="off" onChange={e => setName(e.target.value)} error={errs.name} />
        <Field id="cf-phone" label="Mobile number" value={phone} inputMode="tel" autoComplete="off" placeholder="+91 98765 43210" onChange={e => setPhone(e.target.value)} error={errs.phone} helper="Indian mobile numbers only." />
        <Field id="cf-rel" label="Relationship" optional value={rel} autoComplete="off" onChange={e => setRel(e.target.value)} />
        <Check id="cf-primary" checked={primary} onChange={setPrimary} label="Make this my primary contact" />
        <div>
          <Check id="cf-ack" checked={ack} onChange={v => { setAck(v); setErrs(e => ({ ...e, ack: '' })) }} label="This person knows I'm adding them and is okay being contacted in an emergency." />
          {errs.ack && <p role="alert" style={{ fontSize: r(14), color: C.errText, marginTop: r(8) }}>{errs.ack}</p>}
        </div>
        <p style={{ fontSize: r(14), color: C.text2 }}>Saving a contact does not share your location.</p>
      </Page>
      {discard && (
        <Sh title="Discard your changes?" onClose={() => setDiscard(false)}>
          <Btn onClick={() => setDiscard(false)}>Keep editing</Btn>
          <Btn variant="secondary" onClick={() => { setDiscard(false); c.back() }}>Discard changes</Btn>
        </Sh>
      )}
    </>
  )
}

// ── Account status screens ───────────────────────────────────────────────────

function StatusScreen({ c, kind }: { c: CCtx; kind: 'suspended' | 'expired' | 'deletion' | 'logged-out' }) {
  const d = {
    suspended: { icon: 'alert', title: 'Your account has a restriction', body: 'You can’t request or offer rides right now. You can still view your ride history, change notification preferences and contact support to understand the restriction.' },
    expired: { icon: 'lock', title: 'Sign in again', body: 'Your session ended, so we can’t show your account. Your saved details are kept. Sign in with your college email to continue.' },
    deletion: { icon: 'trash', title: 'Account deletion requested', body: 'We received your request. Your account will be handled according to the Privacy Notice. If you did not make this request, contact support.' },
    'logged-out': { icon: 'check', title: 'You’re logged out', body: 'This is a simulated log out for the prototype. Nothing was deleted.' },
  }[kind]
  return (
    <Screen center gap={16} footer={
      <>
        {kind === 'suspended' && <><Btn onClick={() => c.go('support-form', { filter: 'Account restriction' })}>Contact support</Btn><Btn variant="secondary" onClick={() => c.go('ride-history')}>View ride history</Btn><Btn variant="text" onClick={() => c.go('notif-prefs')}>Notification preferences</Btn></>}
        {(kind === 'expired' || kind === 'logged-out') && <Btn onClick={c.onSignIn}>Sign in again</Btn>}
        {kind === 'deletion' && <><Btn onClick={() => c.go('support-form', { filter: 'Account deletion' })}>Contact support</Btn><Btn variant="secondary" onClick={() => c.go('privacy-data')}>Privacy and data</Btn></>}
      </>
    }>
      <span className="flex items-center justify-center" style={{ width: r(72), height: r(72), borderRadius: 999, background: kind === 'suspended' ? C.errBg : C.tint, color: kind === 'suspended' ? C.errText : C.primary }}><Ico name={d.icon} size={32} /></span>
      <Heading size={26} center>{d.title}</Heading>
      <Body center size={16}>{d.body}</Body>
    </Screen>
  )
}

// ── Prototype controls (outside the phone frame) ─────────────────────────────

export function CommonControls({ a, nav, rs, p, onReset, onPilotScreen }: { a: AStore; nav: CNav; rs: RStore; p: PStore; onReset: () => void; onPilotScreen: (s: RiderScreen) => void }) {
  void onPilotScreen
  const sel = <K extends keyof AStore['proto']>(label: string, k: K, opts: [AStore['proto'][K], string][]) => (
    <label key={k} className="flex flex-col gap-1" style={{ minWidth: 140, flex: 1 }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>{label}</span>
      <select value={String(a.proto[k])} onChange={e => a.setProto(x => ({ ...x, [k]: e.target.value as AStore['proto'][K] }))}
        style={{ padding: '7px 8px', borderRadius: 8, fontSize: 13, background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)' }}>
        {opts.map(([v, l]) => <option key={String(v)} value={String(v)} style={{ background: '#1c1c2e' }}>{l}</option>)}
      </select>
    </label>
  )
  const btn = (label: string, fn: () => void) => (
    <button key={label} type="button" onClick={fn} style={{ fontSize: 12, fontWeight: 600, color: '#fff', padding: '7px 10px', minHeight: 36, borderRadius: 8, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.06)' }}>{label}</button>
  )
  const H = (h: string) => <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', margin: '12px 0 6px' }}>{h}</p>
  const pilotState = (ap: 'draft' | 'pending' | 'approved' | 'rejected' | 'expired' | 'restricted') => {
    if (ap === 'draft') { rs.setApproval('draft'); rs.setVehicle({ type: '', make: '', color: '', reg: '', helmet: '' }); rs.setDocs(emptyDocs()); return }
    if (!rs.vehicle.type) rs.setVehicle(SAMPLE_VEHICLE)
    rs.setApproval(ap)
    const ok = ap === 'approved'
    const base = { licFront: sampleDoc(ok ? 'approved' : 'review', 'Sample file'), licBack: emptyDoc(), rc: sampleDoc(ok ? 'approved' : 'review', 'Sample file') }
    if (ap === 'rejected') base.licFront = { ...sampleDoc('action', 'Sample file'), reason: 'The photo is too blurry to read the licence number.' }
    if (ap === 'expired') base.licFront = { ...sampleDoc('expired', 'Sample file'), reason: 'This licence has passed its expiry date.' }
    rs.setDocs(base)
  }
  const advance = () => {
    const n = a.cases[0]; if (!n) return
    const order = ['Submitted', 'Acknowledged', 'In review', 'Resolved'] as const
    a.setCases(cs => cs.map((x, i) => (i === 0 && !x.draft ? { ...x, status: order[Math.min(3, order.indexOf(x.status) + 1)] } : x)))
  }
  return (
    <section aria-label="Profile prototype controls" style={{ maxWidth: 560, width: '100%', padding: 12, borderRadius: 12, border: '1px dashed rgba(255,255,255,0.25)' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Prototype controls: Profile and common</h2>
        <button type="button" onClick={() => { a.reset(); onReset(); nav.root('profile') }} style={{ fontSize: 12, fontWeight: 600, color: '#fff', padding: '7px 12px', minHeight: 36, borderRadius: 8, border: '1px solid rgba(255,255,255,0.3)' }}>Reset prototype</button>
      </div>
      {H('Account')}
      <div className="flex flex-wrap gap-2">
        {sel('Member', 'member', [['returning', 'Returning member'], ['new', 'New member']])}
        <label className="flex flex-col gap-1" style={{ minWidth: 140, flex: 1 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>College membership</span>
          <select value={a.college} onChange={e => a.setCollege(e.target.value as CollegeStatus)} style={{ padding: '7px 8px', borderRadius: 8, fontSize: 13, background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)' }}>
            {(['verified', 'pending', 'action', 'expired', 'restricted'] as const).map(v => <option key={v} value={v} style={{ background: '#1c1c2e' }}>{v}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1" style={{ minWidth: 140, flex: 1 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>Account status</span>
          <select value={a.status} onChange={e => a.setStatus(e.target.value as AStore['status'])} style={{ padding: '7px 8px', borderRadius: 8, fontSize: 13, background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)' }}>
            {(['active', 'suspended', 'session-expired', 'deletion-requested'] as const).map(v => <option key={v} value={v} style={{ background: '#1c1c2e' }}>{v}</option>)}
          </select>
        </label>
        {sel('Network', 'network', [['online', 'Online'], ['offline', 'Offline']])}
      </div>
      {H('Pilot setup and vehicle')}
      <div className="flex flex-wrap gap-2">
        {btn('Setup incomplete', () => pilotState('draft'))}{btn('Under review', () => pilotState('pending'))}{btn('Approved', () => pilotState('approved'))}
        {btn('Action needed', () => pilotState('rejected'))}{btn('Vehicle renewal', () => pilotState('expired'))}{btn('Restricted', () => pilotState('restricted'))}
      </div>
      {H('Data')}
      <div className="flex flex-wrap gap-2">
        {btn('Contacts: empty', () => a.setContacts([]))}
        {btn('Contacts: populated', () => a.setContacts([{ id: 'c1', name: 'Meera Mehta', phone: '9876543210', relation: 'Mother', primary: true }, { id: 'c2', name: 'Rohit Mehta', phone: '9123456780', relation: 'Brother', primary: false }]))}
        {btn('Blocked: empty', () => a.setBlocked([]))}
        {btn('Blocked: populated', () => a.setBlocked([{ id: 'b1', name: 'Kabir Malhotra', role: 'Buddy', since: addDays(todayISO(), -11) }]))}
        {btn('Start sample active ride', () => p.jump('ride-in-progress'))}
      </div>
      {H('Outcomes and states')}
      <div className="flex flex-wrap gap-2">
        {sel('Notifications', 'notifMode', [['normal', 'Normal'], ['empty', 'Empty'], ['error', 'Refresh error'], ['offline', 'Cached (offline)']])}
        {sel('Device permission', 'device', [['allowed', 'Allowed'], ['denied', 'Denied'], ['not-requested', 'Not requested']])}
        {sel('Profile save', 'save', [['ok', 'Succeeds'], ['failed', 'Fails']])}
        {sel('Photo upload', 'upload', [['ok', 'Succeeds'], ['failed', 'Fails']])}
        {sel('Contact save', 'contactSave', [['ok', 'Succeeds'], ['failed', 'Fails']])}
        {sel('Preference save', 'prefSave', [['ok', 'Succeeds'], ['failed', 'Fails']])}
        {sel('Support request', 'support', [['ok', 'Acknowledged'], ['failed', 'Fails'], ['uncertain', 'Uncertain']])}
        {sel('Data export', 'exportOut', [['ok', 'Succeeds'], ['failed', 'Fails']])}
        {sel('Deletion request', 'deleteOut', [['ok', 'Succeeds'], ['failed', 'Fails']])}
      </div>
      <div className="flex flex-wrap gap-2" style={{ marginTop: 8 }}>
        {btn('Advance newest support case', advance)}
        {btn('Advance data export', () => a.setExportState(s => (s === 'requested' ? 'preparing' : s === 'preparing' ? 'ready' : s)))}
        {btn('Advance deletion', () => a.setDeleteState(s => (s === 'requested' ? 'processing' : s === 'processing' ? 'completed' : s)))}
      </div>
      {H('Future concept — not part of the current pilot')}
      <div className="flex flex-wrap gap-2">
        {btn('Wallet', () => nav.root('wallet-home'))}{btn('Plans and pricing', () => nav.root('pricing'))}
      </div>
    </section>
  )
}

