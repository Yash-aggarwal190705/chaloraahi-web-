import { useEffect, useRef, useState } from 'react'
import RiderFlow, { RiderControls, useRiderNav } from './RiderFlow'
import { ALL_RIDER_SCREENS, TRIP_LABEL, useRiderStore, type RiderScreen } from './RiderData'
import OnboardingContent, { ALL_ONBOARDING_SCREENS, PrototypeControls, useOnboardingSession, type OnboardingScreen } from './OnboardingFlow'
import { accountOf } from './WalletScreens'
import { WALLET_SCREENS, type WalletScreen } from './WalletNav'
import { useWallet, type Scenario } from './useWallet'
import CommonContent, { ALL_COMMON_SCREENS, CommonControls, type CommonScreen } from './CommonFlow'
import { useAccountStore, useCommonNav } from './CommonData'
import SOSContent, { type SOSActions, type SOSScreen } from './SOSFlow'
import { SOS_SCREENS, env, reportCtx, setEnv, emergencyTarget, useSOS, pickContact, type RideCtx, type Stage } from './SOSData'
import { createShare } from './shareModel'
import PassengerFlow, { PassengerControls, usePassengerNav } from './PassengerFlow'
import { ALL_CUSTOMER_SCREENS, STATUS_LABEL, screenForStatus, usePassengerStore, type CustomerScreen } from './PassengerData'
import { Ico, LogoMark } from './OnboardingUI'

type ScreenPicker = {
  label: string
  active: boolean
  screens: string[]
  value: string
  onChange: (screen: string) => void
}

function StatusBar({ light = false }: { light?: boolean }) {
  const ink = light ? '#FFFFFF' : '#101828'
  return (
    <div className="absolute top-0 left-0 right-0 h-11 z-30 flex items-center justify-between px-7">
      <span style={{ fontSize: 15, fontWeight: 700, color: ink, letterSpacing: '-0.3px' }}>9:41</span>
      <div className="flex items-center gap-1.5">
        <svg width="17" height="12" viewBox="0 0 17 12" fill={ink}>
          <rect x="0" y="6" width="3" height="6" rx="1" /><rect x="4.5" y="4" width="3" height="8" rx="1" />
          <rect x="9" y="2" width="3" height="10" rx="1" /><rect x="13.5" y="0" width="3" height="12" rx="1" />
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke={ink} strokeWidth="1.5" strokeLinecap="round">
          <path d="M1 4a9 9 0 0 1 14 0" /><path d="M3.5 7a5.5 5.5 0 0 1 9 0" />
          <path d="M6 10a2.5 2.5 0 0 1 4 0" /><circle cx="8" cy="12" r="1" fill={ink} stroke="none" />
        </svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
          <rect x="0.5" y="0.5" width="20" height="11" rx="2" stroke={ink} />
          <path d="M21.5 4v4a2 2 0 0 0 0-4z" fill={ink} />
          <rect x="2" y="2" width="16" height="8" rx="1" fill={ink} />
        </svg>
      </div>
    </div>
  )
}

function screenLabel(value: string) {
  if (value === 'idle' || value === 'rider-home-idle') return 'Home'
  return value
    .replace(/-r$/, '')
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function DemoHeader({ controlsOpen, onToggleControls, onReset }: { controlsOpen: boolean; onToggleControls: () => void; onReset: () => void }) {
  return (
    <header className="demo-header">
      <div className="demo-brand">
        <LogoMark size={40} />
        <div>
          <div className="demo-brand-name">ChaloRaahi</div>
          <div className="demo-brand-subtitle">Campus commute prototype</div>
        </div>
      </div>
      <div className="demo-header-actions">
        <span className="demo-status-pill"><span className="demo-status-dot" />Expo preview · simulated</span>
        <button type="button" className="demo-quiet-button" onClick={onToggleControls}>
          <Ico name="sliders" size={16} />{controlsOpen ? 'Hide controls' : 'Prototype controls'}
        </button>
        <button type="button" className="demo-reset-button" onClick={onReset}>Reset demo</button>
      </div>
    </header>
  )
}

function DemoRail({ active, onOnboarding, onBuddy, onPilot, onSafety }: {
  active: 'onboarding' | 'customer' | 'rider' | 'common'
  onOnboarding: () => void
  onBuddy: () => void
  onPilot: () => void
  onSafety: () => void
}) {
  const item = (key: typeof active, icon: string, title: string, text: string, onClick: () => void) => (
    <button type="button" className={`demo-rail-item ${active === key ? 'is-active' : ''}`} onClick={onClick}>
      <span className="demo-rail-icon"><Ico name={icon} size={18} /></span>
      <span className="demo-rail-copy"><strong>{title}</strong><span>{text}</span></span>
      <Ico name="chevron" size={16} />
    </button>
  )

  return (
    <aside className="demo-rail">
      <div className="demo-eyebrow">STARTUP EXPO · LIVE DEMO</div>
      <h1>Your campus.<br /><em>Your route.<br />Together.</em></h1>
      <p className="demo-rail-intro">A safer, more human way for students to share everyday rides.</p>
      <div className="demo-rail-proof"><span><Ico name="shield" size={16} /></span><p><strong>Built for student trust</strong><br />Verified campus community · Jaipur</p></div>

      <div className="demo-rail-section-label">Explore the prototype</div>
      <nav className="demo-rail-nav" aria-label="Prototype flows">
        {item('onboarding', 'sparkles', 'Welcome tour', 'From first launch to verified campus member', onOnboarding)}
        {item('customer', 'search', 'Find a ride', 'Buddy experience · plan a commute', onBuddy)}
        {item('rider', 'scooter', 'Offer a seat', 'Pilot experience · share your route', onPilot)}
        {item('common', 'shield', 'Safety & trust', 'SOS, contacts, verification and more', onSafety)}
      </nav>
      <div className="demo-rail-footer"><Ico name="info" size={15} /><span>All actions are simulated for this expo preview.</span></div>
    </aside>
  )
}

function DemoFlowCard({ icon, title, text, active, onClick }: { icon: string; title: string; text: string; active?: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`demo-flow-card ${active ? 'is-active' : ''}`} onClick={onClick}>
      <span className="demo-flow-icon"><Ico name={icon} size={18} /></span>
      <span className="demo-flow-copy"><strong>{title}</strong><span>{text}</span></span>
      <Ico name="chevron" size={16} />
    </button>
  )
}

function DemoInspector({ active, currentScreen, pickers, onOnboarding, onBuddy, onPilot, onSafety, onWallet, onToggleControls }: {
  active: 'onboarding' | 'customer' | 'rider' | 'common'
  currentScreen: string
  pickers: ScreenPicker[]
  onOnboarding: () => void
  onBuddy: () => void
  onPilot: () => void
  onSafety: () => void
  onWallet: () => void
  onToggleControls: () => void
}) {
  return (
    <aside className="demo-inspector">
      <div className="demo-inspector-heading">
        <div><div className="demo-eyebrow">CURRENT VIEW</div><h2>{screenLabel(currentScreen)}</h2></div>
        <span className="demo-live-mark">LIVE</span>
      </div>
      <p className="demo-inspector-sub">Tap through the phone prototype or jump to a complete story below.</p>

      <div className="demo-inspector-label">Curated stories</div>
      <div className="demo-flow-list">
        <DemoFlowCard icon="play" title="First-time journey" text="Welcome → verification → choose a role" active={active === 'onboarding'} onClick={onOnboarding} />
        <DemoFlowCard icon="search" title="Buddy journey" text="Plan a ride → meet → travel together" active={active === 'customer'} onClick={onBuddy} />
        <DemoFlowCard icon="scooter" title="Pilot journey" text="Set up a vehicle → offer a seat" active={active === 'rider'} onClick={onPilot} />
        <DemoFlowCard icon="sos" title="Safety toolkit" text="Contacts, SOS and trust surfaces" active={active === 'common'} onClick={onSafety} />
        <DemoFlowCard icon="wallet" title="Future concepts" text="Wallet and membership plans" onClick={onWallet} />
      </div>

      <details className="demo-screen-browser">
        <summary><span><Ico name="grid" size={16} />Browse every screen</span><Ico name="chevdown" size={15} /></summary>
        <div className="demo-screen-browser-body">
          {pickers.map(p => (
            <label key={p.label}>
              <span>{p.label}</span>
              <select value={p.active ? p.value : ''} onChange={e => e.target.value && p.onChange(e.target.value)}>
                <option value="">Choose a screen…</option>
                {p.screens.map(screen => <option key={screen} value={screen}>{screenLabel(screen)}</option>)}
              </select>
            </label>
          ))}
        </div>
      </details>

      <button type="button" className="demo-controls-link" onClick={onToggleControls}><Ico name="sliders" size={15} /> Open advanced simulation controls</button>
    </aside>
  )
}

export default function App() {
  const session = useOnboardingSession()
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 480px)').matches)
  useEffect(() => {
    const m = window.matchMedia('(max-width: 480px)')
    const f = () => setNarrow(m.matches)
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [])
  const [appSection, setAppSection] = useState<'onboarding' | 'customer' | 'rider' | 'common'>('onboarding')
  const [onboardingScreen, setOnboardingScreen] = useState<OnboardingScreen>(session.boot.screen)
  const [prevSection, setPrevSection] = useState<'customer' | 'rider'>('customer')
  const [role, setRole] = useState<'customer' | 'rider'>('customer')
  const pStore = usePassengerStore()
  const pNav = usePassengerNav()
  const rStore = useRiderStore()
  const rNav = useRiderNav()
  const acct = useAccountStore({ name: session.data.name, email: session.data.email, area: session.data.area })
  const cNav = useCommonNav()
  const commonScreen = cNav.screen
  const w = useWallet()
  const sos = useSOS()
  const [, bump] = useState(0)
  const [want, setWant] = useState<SOSScreen | null>(null)
  const [showControls, setShowControls] = useState(false)
  const showSOS = sos.ui.open
  const clearSOS = () => { sos.close(); sos.discard() }

  const sessionRole = sos.cur ? sos.cur.role : null
  const sosRole: 'customer' | 'rider' = sessionRole ?? (appSection === 'rider' ? 'rider' : appSection === 'customer' ? 'customer' : prevSection)
  const rideCtx: RideCtx = (() => {
    const sid = sos.cur?.rideId ?? null
    if (sosRole === 'customer') {
      const ride = (sid ? pStore.rides.find(x => x.id === sid) : null) ?? (sos.cur ? null : pStore.cur)
      const st = ride?.status
      const stage: Stage = !ride ? 'none' : st === 'in-progress' ? 'live' : st === 'confirmed' || st === 'on-the-way' || st === 'at-pickup' ? 'meetup' : st === 'completed' || st === 'ended-early' || st === 'cancelled' || st === 'expired' ? 'closed' : 'none'
      return {
        role: 'customer', rideId: ride?.id ?? null, stage, route: ride ? `${ride.pickup.name} to ${ride.destination.name}` : '', stageLabel: ride ? STATUS_LABEL[ride.status] : '',
        counterpart: ride?.rider?.name ?? null, loc: ride?.loc ?? 'unavailable', locAt: ride?.locAt ?? 0,
        share: ride?.share ?? null, patchShare: ride ? fn => pStore.patchRide(ride.id, x => ({ share: fn(x.share) })) : null,
        shareFail: pStore.proto.shareFail, online: pStore.proto.network === 'online',
      }
    }
    const t = (sid ? rStore.trips.find(x => x.id === sid) : null) ?? (sos.cur ? null : rStore.cur)
    const st = t?.status
    const stage: Stage = !t ? 'none' : st === 'active' ? 'live' : st === 'confirmed' || st === 'heading' || st === 'at-pickup' ? 'meetup' : st === 'completed' || st === 'ended-early' || st === 'cancelled' ? 'closed' : 'none'
    return {
      role: 'rider', rideId: t?.id ?? null, stage, route: t ? `${t.pickup.name} to ${t.destination.name}` : '', stageLabel: t ? TRIP_LABEL[t.status] : '',
      counterpart: t?.req?.name ?? null, loc: t?.loc ?? 'unavailable', locAt: t?.locAt ?? 0,
      share: t?.share ?? null, patchShare: t ? fn => rStore.patchTrip(t.id, x => ({ share: fn(x.share) })) : null,
      shareFail: rStore.proto.shareFail, online: rStore.proto.network === 'online',
    }
  })()

  // Prototype location feed: a fresh location keeps refreshing while a session or the sheet is open.
  const feed = useRef(rideCtx); feed.current = rideCtx
  useEffect(() => {
    if (!sos.active && !sos.ui.open) return
    const id = window.setInterval(() => {
      const c = feed.current
      if (c.stage !== 'live' || c.loc !== 'fresh' || !c.rideId || !c.online) return
      if (c.role === 'customer') pStore.patchRide(c.rideId, { locAt: Date.now() }); else rStore.patchTrip(c.rideId, { locAt: Date.now() })
    }, 10000)
    return () => clearInterval(id)
  }, [sos.active, sos.ui.open]) // eslint-disable-line react-hooks/exhaustive-deps

  const closedLogged = useRef('')
  useEffect(() => {
    if (sos.cur && !sos.cur.endedAt && rideCtx.stage === 'closed' && closedLogged.current !== sos.cur.id) {
      closedLogged.current = sos.cur.id
      sos.log('Ride closed. SOS stays active until you end it.')
    }
  })

  // Picker: seed coherent data once the ride for the chosen role exists.
  useEffect(() => {
    if (!want) return
    const needsRide = want !== 'sos-ended'
    if (needsRide && rideCtx.stage !== 'live') return
    const info = { role: rideCtx.role, rideId: rideCtx.rideId, route: rideCtx.route, rideNote: rideCtx.stageLabel, contact: pickContact(acct.contacts, null), consent: acct.notifyContacts }
    if (want !== 'sos-confirm' && want !== 'sos-holding') sos.seedDemo(want === 'sos-ended' ? 'ended' : 'active', info)
    if (want === 'sos-shared' && rideCtx.patchShare && !rideCtx.share?.on) rideCtx.patchShare(() => createShare(Date.now()))
    if (want === 'sos-calling') { sos.openSOS('sos-active'); sos.startCall(emergencyTarget()) } else sos.openSOS(want)
    setWant(null)
  }, [want, rideCtx.stage, rideCtx.rideId]) // eslint-disable-line react-hooks/exhaustive-deps

  const pickSOS = (sc: SOSScreen) => {
    const r = sessionRole ?? (role)
    setAppSection(r); setRole(r)
    if (sc === 'sos-ended') { sos.seedDemo('ended', { role: r, rideId: null, route: rideCtx.route, rideNote: rideCtx.stageLabel, contact: pickContact(acct.contacts, null), consent: acct.notifyContacts }); sos.openSOS('sos-ended'); return }
    if (rideCtx.role !== r || rideCtx.stage !== 'live') {
      if (r === 'customer') { pStore.jump('ride-in-progress'); pNav.root('ride-in-progress') } else { rStore.jump('ride-in-progress-r'); rNav.root('ride-in-progress-r') }
    }
    setWant(sc)
  }
  const sosActions: SOSActions = {
    addContact: () => { sos.close(); goToCommon('emergency-contact') },
    manageContacts: () => { sos.close(); goToCommon('emergency-contact') },
    backToRide: () => { sos.close(); if (isCommon || appSection !== rideCtx.role) { setAppSection(rideCtx.role); setRole(rideCtx.role) } },
    viewRide: () => { sos.close(); if (rideCtx.rideId) openRide(rideCtx.role === 'rider' ? 'pilot' : 'buddy', rideCtx.rideId) },
    goHome: () => {
      sos.close(); sos.discard(); setAppSection(rideCtx.role); setRole(rideCtx.role)
      if (rideCtx.role === 'rider') rNav.root('rider-home-idle'); else pNav.root('idle')
    },
    reportIncident: () => {
      const ref = sos.cur?.alert.ref
      reportCtx.note = `You opened this from an SOS session${ref ? ` (${ref})` : ''}. Submitting a report does not send an SOS alert or contact anyone urgently.`
      sos.close()
      if (rideCtx.role === 'customer' && rideCtx.rideId) { setAppSection('customer'); setRole('customer'); pStore.setCurId(rideCtx.rideId); pNav.root('report') }
      else if (rideCtx.role === 'rider' && rideCtx.rideId) { setAppSection('rider'); setRole('rider'); rStore.setCurId(rideCtx.rideId); rNav.root('report-r') }
      else goToCommon('support-form')
    },
    viewCase: () => { sos.close(); goToCommon('safety-center') },
  }

  const isOnboarding = appSection === 'onboarding'
  const bleed = narrow && (isOnboarding || ((appSection === 'customer' || appSection === 'rider') && appSection === role))
  const isCommon = appSection === 'common'

  const goToCommon = (screen: CommonScreen) => {
    const isWallet = WALLET_SCREENS.includes(screen as WalletScreen)
    if (isWallet) setPrevSection(accountOf(screen) === 'rider' ? 'rider' : 'customer')
    else if (appSection === 'customer' || appSection === 'rider') setPrevSection(appSection)
    if (screen === 'pricing-selected' && !w.drafts.planSel && !w.plan) w.selectPlan('plus')
    setAppSection('common')
    cNav.root(screen, isWallet ? w.seedFor(screen) : {})
  }
  const openRide = (r: 'buddy' | 'pilot', id: string) => {
    if (r === 'pilot') { rStore.setTripId(id); setAppSection('rider'); setRole('rider'); rNav.root('trip-detail'); return }
    const ride = pStore.rides.find(x => x.id === id)
    pStore.setCurId(id); setAppSection('customer'); setRole('customer')
    pNav.root(ride ? screenForStatus(ride.status) : 'my-rides')
  }
  const toAuth = () => { setAppSection('onboarding'); setOnboardingScreen('auth') }
  const goFromCommon = () => {
    setAppSection(prevSection)
    setRole(prevSection)
  }

  const handleRoleSwitch = () => {
    const next = appSection === 'customer' ? 'rider' : 'customer'
    setRole(next)
    setAppSection(next)
  }

  const allCustomerScreens: CustomerScreen[] = ALL_CUSTOMER_SCREENS
  const allRiderScreens: RiderScreen[] = ALL_RIDER_SCREENS

  const startOnboarding = () => { sos.close(); setAppSection('onboarding'); setRole('customer'); setOnboardingScreen('splash-intro') }
  const startBuddy = () => { sos.close(); pStore.reset(); setAppSection('customer'); setRole('customer'); setPrevSection('customer'); pNav.root('idle') }
  const startPilot = () => { sos.close(); rStore.reset(); setAppSection('rider'); setRole('rider'); setPrevSection('rider'); rNav.root('rider-home-idle') }
  const startSafety = () => { sos.close(); setAppSection('common'); cNav.root('safety-center') }
  const startWallet = () => { sos.close(); goToCommon('wallet-home') }
  const resetDemo = () => {
    clearSOS(); session.reset(); pStore.reset(); rStore.reset(); acct.reset(); w.reset()
    setAppSection('onboarding'); setOnboardingScreen('splash-intro'); setPrevSection('customer'); setRole('customer')
    pNav.root('idle'); rNav.root('rider-home-idle'); cNav.root('profile'); setShowControls(false)
  }

  const screenPickers: ScreenPicker[] = [
    { label: 'Onboarding', active: isOnboarding, screens: ALL_ONBOARDING_SCREENS, value: isOnboarding ? onboardingScreen : '',
      onChange: screen => { setAppSection('onboarding'); setOnboardingScreen(screen as OnboardingScreen) } },
    { label: 'Buddy', active: appSection === 'customer', screens: allCustomerScreens, value: appSection === 'customer' ? pNav.screen : '',
      onChange: screen => { setAppSection('customer'); setRole('customer'); sos.close(); pStore.jump(screen as CustomerScreen); pNav.root(screen as CustomerScreen) } },
    { label: 'Pilot', active: appSection === 'rider', screens: allRiderScreens, value: appSection === 'rider' ? rNav.screen : '',
      onChange: screen => { setAppSection('rider'); setRole('rider'); sos.close(); rStore.jump(screen as RiderScreen); rNav.root(screen as RiderScreen) } },
    { label: 'Common', active: isCommon, screens: ALL_COMMON_SCREENS, value: isCommon ? commonScreen : '',
      onChange: screen => goToCommon(screen as CommonScreen) },
    { label: 'SOS', active: showSOS, screens: SOS_SCREENS, value: showSOS ? sos.ui.screen : '',
      onChange: screen => pickSOS(screen as SOSScreen) },
  ]

  const activeFlow: 'onboarding' | 'customer' | 'rider' | 'common' = isOnboarding ? 'onboarding' : isCommon ? 'common' : appSection
  const currentScreen = showSOS ? sos.ui.screen : isOnboarding ? onboardingScreen : isCommon ? commonScreen : appSection === 'customer' ? pNav.screen : rNav.screen

  return (
    <div className={`demo-app ${bleed ? 'demo-app-mobile' : ''}`}>
      {!bleed && <DemoHeader controlsOpen={showControls} onToggleControls={() => setShowControls(v => !v)} onReset={resetDemo} />}

      <main className="demo-workspace">
        {!bleed && <DemoRail active={activeFlow} onOnboarding={startOnboarding} onBuddy={startBuddy} onPilot={startPilot} onSafety={startSafety} />}

        <section className="demo-stage" aria-label="Interactive ChaloRaahi prototype">
          {!bleed && (
            <div className="demo-stage-topline">
              <div><span className="demo-stage-kicker">INTERACTIVE PROTOTYPE</span><span className="demo-stage-title">{screenLabel(currentScreen)}</span></div>
              <span className="demo-stage-counter">Tap, explore, and tell the story</span>
            </div>
          )}
          <div className="demo-phone-zone">
            <div className="demo-phone-frame relative overflow-clip flex-shrink-0"
              style={bleed ? { width: '100%', height: '100dvh', background: '#fff' } : { width: 390, height: 844, borderRadius: 44, background: '#F7F8FA',
                boxShadow: '0 0 0 11px #1c1c2e, 0 0 0 13px #2e2e42, 0 40px 100px rgba(0,0,0,0.7)' }}>
              <div className="absolute inset-0" inert={showSOS}>
                {/* Common: full-screen, no map */}
                {isCommon ? (
                  <>
                    <StatusBar />
                    <CommonContent a={acct} nav={cNav} p={pStore} rs={rStore} role={prevSection} bleed={bleed}
                      onExit={goFromCommon}
                      onTab={t => { goFromCommon(); if (t === 'requests') rNav.root('tickets-list'); else if (t === 'rides') { if (prevSection === 'rider') rNav.root('my-trips'); else pNav.root('my-rides') } }}
                      onSOS={() => sos.openSOS()}
                      onPilot={s => { setPrevSection('rider'); setAppSection('rider'); setRole('rider'); rNav.root(s) }}
                      onMembership={() => { setAppSection('onboarding'); setOnboardingScreen('verify-pending') }}
                      onOpenRide={openRide}
                      onSwitchRole={r => { setPrevSection(r); setRole(r) }}
                      onSignOut={toAuth} onSignIn={toAuth}
                      w={w} />
                  </>
                ) : isOnboarding ? (
                  <>
                    {!bleed && <StatusBar light={onboardingScreen === 'splash-intro'} />}
                    <OnboardingContent
                      session={session}
                      framed={!bleed}
                      screen={onboardingScreen}
                      setScreen={setOnboardingScreen}
                      onComplete={dest => {
                        setAppSection(dest)
                        setRole(dest)
                        if (dest === 'rider') rNav.root('setup-vehicle')
                        else pNav.root('idle')
                      }}
                    />
                  </>
                ) : role === 'customer' ? (
                  <>
                    {!bleed && <StatusBar />}
                    <div className="absolute inset-0 flex flex-col" style={{ paddingTop: bleed ? 0 : 44 }}>
                      <PassengerFlow
                        store={pStore} nav={pNav}
                        onSwitchRole={handleRoleSwitch}
                        onNotifications={() => goToCommon('notif-list')}
                        onProfile={() => goToCommon('profile')}
                        onSOS={() => sos.openSOS()}
                        onVerification={() => { setAppSection('onboarding'); setOnboardingScreen('verify-pending') }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {!bleed && <StatusBar />}
                    <div className="absolute inset-0 flex flex-col" style={{ paddingTop: bleed ? 0 : 44 }}>
                      <RiderFlow
                        store={rStore} nav={rNav}
                        onSwitchRole={handleRoleSwitch}
                        onProfile={() => goToCommon('profile')}
                        onSOS={() => sos.openSOS()}
                      />
                    </div>
                  </>
                )}
              </div>

              <SOSContent sos={sos} ride={rideCtx} contacts={acct.contacts} consent={acct.notifyContacts} actions={sosActions} chipHidden={isOnboarding} />

              {/* Home indicator */}
              {!isOnboarding && isCommon && <div className="absolute left-1/2 -translate-x-1/2 z-30 rounded-full"
                style={{ bottom: 8, width: 130, height: 4, background: 'rgba(16,24,40,0.22)' }} />}
            </div>
          </div>
          {!bleed && <div className="demo-stage-footer"><span className="demo-stage-chip"><Ico name="shield" size={14} /> Safe by design</span><span>Designed for VGU students · Jaipur</span></div>}
        </section>

        {!bleed && <DemoInspector active={activeFlow} currentScreen={currentScreen} pickers={screenPickers}
          onOnboarding={startOnboarding} onBuddy={startBuddy} onPilot={startPilot} onSafety={startSafety} onWallet={startWallet}
          onToggleControls={() => setShowControls(v => !v)} />}
      </main>

      {showControls && !bleed && <div className="demo-control-deck">
        <div className="demo-control-deck-heading"><div><span className="demo-eyebrow">PRESENTER MODE</span><h2>Advanced simulation controls</h2></div><button type="button" onClick={() => setShowControls(false)}>Close panel</button></div>
        {appSection === 'customer' && role === 'customer' && <PassengerControls store={pStore} nav={pNav} onReset={clearSOS} />}
        {appSection === 'rider' && role === 'rider' && <RiderControls store={rStore} nav={rNav} onReset={clearSOS} />}
        {isCommon && <CommonControls a={acct} nav={cNav} rs={rStore} p={pStore} onReset={clearSOS} onPilotScreen={s => rNav.root(s)} />}
        {isOnboarding && <PrototypeControls s={session} screen={onboardingScreen} setScreen={setOnboardingScreen}
          onReset={() => { session.reset(); setOnboardingScreen('splash-intro') }} />}
        {isCommon && (commonScreen.startsWith('wallet-') || commonScreen.startsWith('pricing')) && <WalletPanel w={w} refresh={() => bump(n => n + 1)} />}
        {(showSOS || sos.cur) && <SOSPanel sos={sos} refresh={() => bump(n => n + 1)} onClear={clearSOS} />}
      </div>}
    </div>
  )
}

const ENV_OPTS: { key: keyof typeof env; label: string; opts: string[] }[] = [
  { key: 'alert', label: 'Alert result', opts: ['ok', 'fail', 'uncertain'] },
  { key: 'contactResult', label: 'Contact notification', opts: ['ok', 'fail'] },
  { key: 'endResult', label: 'End-SOS result', opts: ['ok', 'fail', 'uncertain'] },
  { key: 'auth', label: 'Sign-in', opts: ['valid', 'expired'] },
  { key: 'phone', label: 'Phone app', opts: ['handler', 'none'] },
  { key: 'clipboard', label: 'Clipboard', opts: ['auto', 'fail'] },
  { key: 'campus', label: 'Campus number', opts: ['configured', 'unavailable'] },
  { key: 'shareMode', label: 'Share sheet', opts: ['auto', 'cancel', 'none'] },
  { key: 'shareRevoke', label: 'Link revoke', opts: ['ok', 'fail', 'uncertain'] },
]

function SOSPanel({ sos, refresh, onClear }: { sos: ReturnType<typeof useSOS>; refresh: () => void; onClear: () => void }) {
  const btn = { padding: '8px 12px', minHeight: 36, borderRadius: 10, fontSize: 13, fontWeight: 600, color: 'white', border: '1.5px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.07)' } as const
  return (
    <section aria-label="SOS prototype scenarios" className="flex flex-col gap-2" style={{ maxWidth: 520, width: '100%', fontFamily: 'Inter, sans-serif' }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>SOS scenarios (prototype only, simulated)</h2>
      <div className="grid grid-cols-3 gap-2">
        {ENV_OPTS.map(o => (
          <label key={o.key} className="flex flex-col gap-1" style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
            {o.label}
            <select value={env[o.key]} onChange={e => { setEnv({ [o.key]: e.target.value } as never); refresh() }} style={{ padding: '6px 8px', borderRadius: 8, fontSize: 13, background: '#1c1c2e', color: 'white', border: '1.5px solid rgba(255,255,255,0.2)' }}>
              {o.opts.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap">
        <button type="button" style={btn} onClick={() => sos.acknowledge()} disabled={!sos.cur || !!sos.cur.endedAt || sos.cur.alert.status !== 'submitted'}>Operator acknowledges</button>
        <button type="button" style={btn} onClick={() => { onClear(); for (const k of Object.keys(env)) setEnv({ [k]: ENV_OPTS.find(o => o.key === k)!.opts[0] } as never); refresh() }}>Reset SOS session and scenarios</button>
      </div>
    </section>
  )
}

const W_OPTS: { key: keyof Scenario; label: string; opts: string[] }[] = [
  { key: 'balance', label: 'Balance', opts: ['ready', 'loading', 'unavailable'] },
  { key: 'history', label: 'Activity', opts: ['ok', 'error'] },
  { key: 'pay', label: 'Next payment or request', opts: ['confirm', 'fail', 'cancel', 'unknown', 'wait'] },
  { key: 'check', label: 'Check status returns', opts: ['confirm', 'fail', 'unknown'] },
  { key: 'auth', label: 'Sign-in', opts: ['valid', 'expired'] },
]

function WalletPanel({ w, refresh }: { w: ReturnType<typeof useWallet>; refresh: () => void }) {
  const btn = { padding: '8px 12px', minHeight: 36, borderRadius: 10, fontSize: 13, fontWeight: 600, color: 'white', border: '1.5px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.07)' } as const
  const ops: [string, () => void][] = [
    ['Top-up: confirm', () => w.operator('topup', 'completed')], ['Top-up: fail', () => w.operator('topup', 'failed')], ['Top-up: unknown', () => w.operator('topup', 'unknown')],
    ['Withdrawal: complete', () => w.operator('withdrawal', 'completed')], ['Withdrawal: fail', () => w.operator('withdrawal', 'failed')], ['Withdrawal: unknown', () => w.operator('withdrawal', 'unknown')],
    ['Plan payment: confirm', () => w.operator('plan', 'completed')], ['Plan payment: fail', () => w.operator('plan', 'failed')], ['Plan payment: unknown', () => w.operator('plan', 'unknown')],
    ['Expire active plan', () => w.expirePlan()],
  ]
  return (
    <section aria-label="Wallet and plans scenarios" className="flex flex-col gap-2" style={{ maxWidth: 520, width: '100%', fontFamily: 'Inter, sans-serif' }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>Wallet and plans scenarios (prototype only, simulated)</h2>
      <div className="grid grid-cols-3 gap-2">
        {W_OPTS.map(o => (
          <label key={o.key} className="flex flex-col gap-1" style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
            {o.label}
            <select value={w.scenario[o.key]} onChange={e => w.setScenario({ [o.key]: e.target.value } as never)} style={{ padding: '6px 8px', borderRadius: 8, fontSize: 13, background: '#1c1c2e', color: 'white', border: '1.5px solid rgba(255,255,255,0.2)' }}>
              {o.opts.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
        ))}
        <label className="flex flex-col gap-1" style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
          Clipboard
          <select value={env.clipboard} onChange={e => { setEnv({ clipboard: e.target.value } as never); refresh() }} style={{ padding: '6px 8px', borderRadius: 8, fontSize: 13, background: '#1c1c2e', color: 'white', border: '1.5px solid rgba(255,255,255,0.2)' }}>
            {['auto', 'fail'].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
      </div>
      <div className="flex gap-2 flex-wrap">
        {ops.map(([l, fn]) => <button key={l} type="button" style={btn} onClick={fn}>{l}</button>)}
        <button type="button" style={btn} onClick={() => { w.reset(); setEnv({ clipboard: 'auto' } as never); refresh() }}>Reset wallet demo</button>
      </div>
    </section>
  )
}
