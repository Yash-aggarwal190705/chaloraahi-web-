import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  r, C, Ico, Heading, Body, Btn, Field, Notice, Badge, Link, Divider, Screen, TopRow, Steps, Sheet,
  Logo, LogoMark, Glyph, IllRide, IllFuel, IllTrust, GoogleMark,
} from './OnboardingUI'

export type OnboardingScreen =
  | 'splash-intro' | 'splash-1' | 'splash-2' | 'splash-3'
  | 'auth' | 'email-sent' | 'profile'
  | 'college-id' | 'guidelines' | 'verify-pending' | 'verify-approved' | 'verify-rejected'
  | 'choose-role' | 'role-confirmed' | 'browse-preview'

export const ALL_ONBOARDING_SCREENS: OnboardingScreen[] = [
  'splash-intro', 'splash-1', 'splash-2', 'splash-3',
  'auth', 'email-sent', 'profile',
  'college-id', 'guidelines', 'verify-pending', 'verify-approved', 'verify-rejected',
  'choose-role', 'role-confirmed', 'browse-preview',
]

// Product assumption: the 18+ pilot rule is not confirmed, so it is off.
const REQUIRE_18_PLUS_ACK = false

// ── Session (lifted so form values survive navigation and policy sheets) ─────

export type RoleKey = 'customer' | 'rider' | 'both'
export type RejectReason = 'blurry' | 'wrong-document' | 'expired' | 'not-confirmed'
export type Membership = 'none' | 'pending' | 'approved' | 'rejected'
export type FileDraft = { name: string; size: number; url: string }

export type Proto = {
  network: 'online' | 'offline'
  google: 'ok' | 'cancelled'
  emailLink: 'pending' | 'verified' | 'expired'
  submission: 'ok' | 'fail' | 'in-progress'
  membership: 'pending' | 'approved' | 'rejected'
  rejectReason: RejectReason
}
export type Data = {
  email: string; name: string; area: string
  photo: FileDraft | null; idDoc: FileDraft | null
  agreed: boolean; eligible: boolean
  role: RoleKey | null
  submittedAt: number | null
  membership: Membership
}

const DEFAULT_PROTO: Proto = { network: 'online', google: 'ok', emailLink: 'verified', submission: 'ok', membership: 'approved', rejectReason: 'blurry' }
const EMPTY: Data = { email: '', name: '', area: '', photo: null, idDoc: null, agreed: false, eligible: false, role: null, submittedAt: null, membership: 'none' }

const store = {
  get: (k: string) => { try { return sessionStorage.getItem(k) } catch { return null } },
  set: (k: string, v: string) => { try { sessionStorage.setItem(k, v) } catch { /* ignore */ } },
  del: (k: string) => { try { sessionStorage.removeItem(k) } catch { /* ignore */ } },
}
// Only non-sensitive progress is stored. Documents and photos are never persisted.
const K_INTRO = 'cr.intro', K_MEMBERSHIP = 'cr.membership'

export type Session = ReturnType<typeof useOnboardingSession>

export function useOnboardingSession() {
  const [boot] = useState(() => {
    const m = (store.get(K_MEMBERSHIP) as Membership | null) ?? 'none'
    const intro = store.get(K_INTRO) === '1'
    const screen: OnboardingScreen =
      m === 'approved' ? 'choose-role' : m === 'pending' ? 'verify-pending' : m === 'rejected' ? 'verify-rejected' : intro ? 'auth' : 'splash-intro'
    return { screen, restored: m !== 'none' || intro, membership: m }
  })
  const [data, setData] = useState<Data>({ ...EMPTY, membership: boot.membership })
  const [proto, setProto] = useState<Proto>(DEFAULT_PROTO)
  const dataRef = useRef(data)
  dataRef.current = data

  const patch = (p: Partial<Data>) => setData(d => ({ ...d, ...p }))
  const setMembership = (m: Membership) => { store.set(K_MEMBERSHIP, m); patch({ membership: m }) }
  const markIntroSeen = () => store.set(K_INTRO, '1')
  const reset = () => {
    const d = dataRef.current
    ;[d.photo, d.idDoc].forEach(f => f && URL.revokeObjectURL(f.url))
    store.del(K_INTRO); store.del(K_MEMBERSHIP)
    setData(EMPTY); setProto(DEFAULT_PROTO)
  }
  return { data, patch, proto, setProto, setMembership, markIntroSeen, reset, boot }
}

type Ctx = {
  s: Session
  go: (s: OnboardingScreen) => void
  openSheet: (k: SheetKind) => void
}
type SheetKind = 'terms' | 'privacy' | 'guidelines' | 'help' | 'review-request'

// ── Helpers ──────────────────────────────────────────────────────────────────

function useLater() {
  const ids = useRef<number[]>([])
  useEffect(() => () => ids.current.forEach(clearTimeout), [])
  return (fn: () => void, ms: number) => { ids.current.push(window.setTimeout(fn, ms)) }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function checkImage(f: File): string | null {
  if (!['image/jpeg', 'image/png'].includes(f.type)) return 'That file type isn’t supported. Choose a JPG or PNG image.'
  if (f.size > 5 * 1024 * 1024) return 'That file is larger than 5 MB. Choose a smaller image.'
  return null
}
const fmtSize = (n: number) => n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`
const initials = (name: string) => name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => Array.from(w)[0]?.toUpperCase()).join('')
const domainOf = (email: string) => email.includes('@') ? email.split('@')[1] : ''

// ── Splash ───────────────────────────────────────────────────────────────────

function SplashIntro({ onDone }: { onDone: () => void }) {
  const reduced = prefersReducedMotion()
  const [shown, setShown] = useState(reduced)
  useEffect(() => {
    const a = window.setTimeout(() => setShown(true), 60)
    const b = window.setTimeout(onDone, reduced ? 900 : 1700)
    return () => { clearTimeout(a); clearTimeout(b) }
  }, [onDone, reduced])
  const t = (d: number) => reduced ? 'none' : `opacity 480ms ease-out ${d}ms, transform 480ms ease-out ${d}ms`
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center" style={{ background: C.primary, padding: r(24), gap: r(16) }}
      onClick={onDone} role="img" aria-label="ChaloRaahi. Your campus. Your route. Together.">
      <div className="flex flex-wrap items-center justify-center" style={{ gap: r(12), opacity: shown ? 1 : 0, transform: shown ? 'none' : 'translateY(8px)', transition: t(0) }}>
        <LogoMark size={64} inverse />
        <span aria-hidden="true" style={{ fontSize: r(36), fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>ChaloRaahi</span>
      </div>
      <p aria-hidden="true" style={{ fontSize: r(16), fontWeight: 500, color: '#fff', opacity: shown ? 0.92 : 0, transition: t(320) }}>
        Your campus. Your route. Together.
      </p>
    </div>
  )
}

// ── Introduction ─────────────────────────────────────────────────────────────

const INTRO = {
  1: { ill: <IllRide />, title: 'Share your daily commute', sub: 'Find verified students from your college travelling your way.' },
  2: { ill: <IllFuel />, title: 'Share the ride. Split the fuel cost.', sub: 'Contribute to the fuel for a journey your co-pilot is already making.' },
  3: { ill: <IllTrust />, title: 'Travel with more confidence', sub: 'College verification, trip sharing, and quick access to emergency contacts.' },
} as const

function IntroScreen({ slide, ctx }: { slide: 1 | 2 | 3; ctx: Ctx }) {
  const c = INTRO[slide]
  const next: OnboardingScreen = slide === 1 ? 'splash-2' : slide === 2 ? 'splash-3' : 'auth'
  const prev: OnboardingScreen | undefined = slide === 1 ? undefined : slide === 2 ? 'splash-1' : 'splash-2'
  return (
    <Screen
      top={<TopRow onBack={prev && (() => ctx.go(prev))}
        right={<button type="button" onClick={() => ctx.go('auth')} className="ob-btn ob-btn-text" style={{ minHeight: r(48), padding: `0 ${r(8)}`, marginRight: r(-8), fontSize: r(15), fontWeight: 600, color: C.text2 }}>Skip introduction</button>} />}
      footer={<>
        <div className="flex items-center justify-center" style={{ gap: r(12) }}>
          <div role="group" aria-label={`Introduction, page ${slide} of 3`} className="flex items-center" style={{ gap: r(8) }}>
            {[1, 2, 3].map(n => (
              <span key={n} aria-hidden="true" style={{ height: r(8), width: r(n === slide ? 28 : 8), borderRadius: 999, background: n === slide ? C.primary : '#fff', border: `1.5px solid ${n === slide ? C.primary : C.input}`, transition: 'width 200ms' }} />
            ))}
          </div>
          <span aria-hidden="true" style={{ fontSize: r(14), color: C.text3 }}>{slide} of 3</span>
        </div>
        <Btn onClick={() => ctx.go(next)}>{slide === 3 ? 'Get started' : 'Next'}</Btn>
      </>}>
      <div style={{ width: '100%', maxWidth: r(420), margin: '0 auto', aspectRatio: '390 / 250' }}>{c.ill}</div>
      <div className="flex flex-col" style={{ gap: r(12) }}>
        <Heading size={28} center>{c.title}</Heading>
        <Body center>{c.sub}</Body>
      </div>
    </Screen>
  )
}

// ── Sign-in ──────────────────────────────────────────────────────────────────

function AuthScreen({ ctx }: { ctx: Ctx }) {
  const { s, go, openSheet } = ctx
  const { data, patch, proto } = s
  const [busy, setBusy] = useState<null | 'email' | 'google'>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState<null | { kind: 'error' | 'info'; text: string }>(null)
  const later = useLater()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setNotice(null)
    if (!EMAIL_RE.test(data.email.trim())) { setError('Enter a valid email address.'); document.getElementById('email')?.focus(); return }
    setError(''); setBusy('email')
    later(() => {
      setBusy(null)
      if (proto.network === 'offline') setNotice({ kind: 'error', text: 'We couldn’t send the link. Check your connection and try again.' })
      else { patch({ email: data.email.trim() }); go('email-sent') }
    }, 900)
  }
  const google = () => {
    if (busy) return
    setNotice(null); setError(''); setBusy('google')
    later(() => {
      setBusy(null)
      if (proto.google === 'cancelled') setNotice({ kind: 'info', text: 'Google sign-in was cancelled. You can try again or use email.' })
      else go('profile')
    }, 800)
  }
  return (
    <Screen top={<TopRow onBack={() => go('splash-3')} />}
      footer={
        <p style={{ fontSize: r(13), lineHeight: 1.5, color: C.text3, textAlign: 'center' }}>
          By continuing, you agree to our <Link href="#terms" onClick={() => openSheet('terms')}>Terms of Service</Link> and acknowledge our <Link href="#privacy" onClick={() => openSheet('privacy')}>Privacy Notice</Link>.
        </p>
      }>
      <div className="flex flex-col" style={{ gap: r(24) }}>
        <Logo />
        <div className="flex flex-col" style={{ gap: r(8) }}>
          <Heading size={28}>Welcome to ChaloRaahi</Heading>
          <Body>Your college commute, shared.</Body>
        </div>
      </div>
      <form onSubmit={submit} noValidate className="flex flex-col" style={{ gap: r(16) }}>
        <Field id="email" label="College email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false}
          placeholder="you@college.edu" helper="Use the email associated with your college." value={data.email} error={error}
          onChange={e => { patch({ email: e.target.value }); if (error) setError('') }}
          />
        {notice && busy === null && <Notice kind={notice.kind === 'error' ? 'error' : 'info'}>{notice.text}</Notice>}
        <Btn type="submit" loading={busy === 'email'}>Continue with email</Btn>
        <Divider label="or" />
        <Btn variant="secondary" loading={busy === 'google'} onClick={google} icon={<GoogleMark />} style={{ color: C.text, borderColor: C.input }}>Continue with Google</Btn>
      </form>
      <Body size={14} color={C.text3}>Signing in creates your account. College verification is a separate step.</Body>
    </Screen>
  )
}

// ── Email confirmation ───────────────────────────────────────────────────────

type MailPhase = 'waiting' | 'checking' | 'expired' | 'error' | 'verified'

function EmailSentScreen({ ctx }: { ctx: Ctx }) {
  const { s, go } = ctx
  const { data, proto } = s
  const [phase, setPhase] = useState<MailPhase>('waiting')
  const [resent, setResent] = useState(false)
  const [resending, setResending] = useState(false)
  const [cooldown, setCooldown] = useState(30)
  const [sr, setSr] = useState('')
  const later = useLater()

  useEffect(() => {
    if (cooldown <= 0) { setSr('You can resend the link now.'); return }
    if (cooldown === 30) setSr('You can resend the link in 30 seconds.')
    const t = window.setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const check = () => {
    if (phase === 'checking') return
    setPhase('checking'); setResent(false)
    later(() => {
      if (proto.network === 'offline') return setPhase('error')
      if (proto.emailLink === 'verified') return setPhase('verified')
      if (proto.emailLink === 'expired') { setCooldown(0); return setPhase('expired') }
      setPhase('waiting')
    }, 900)
  }
  const resend = () => {
    if (cooldown > 0 || resending) return
    setResending(true)
    later(() => {
      setResending(false)
      if (proto.network === 'offline') return setPhase('error')
      setResent(true); setPhase('waiting'); setCooldown(30)
    }, 700)
  }

  const verified = phase === 'verified'
  return (
    <Screen top={<TopRow onBack={() => go('auth')} />}
      footer={<>
        {verified
          ? <Btn onClick={() => go('profile')}>Continue to profile</Btn>
          : <Btn loading={phase === 'checking'} onClick={check}>Check verification status</Btn>}
        {!verified && <Btn variant="secondary" onClick={() => go('auth')}>Use a different email</Btn>}
      </>}>
      <div className="flex items-center" style={{ gap: r(16) }}>
        <Glyph kind={verified ? 'check' : 'mail'} />
      </div>
      <div className="flex flex-col" style={{ gap: r(12) }}>
        <Heading size={28}>{verified ? 'Email verified' : 'Check your inbox'}</Heading>
        <Body>
          {verified ? 'Your email is confirmed. Next, set up your profile.' : <>We sent a sign-in link to <strong style={{ color: C.text, overflowWrap: 'anywhere' }}>{data.email || 'your email address'}</strong>. Open the link to verify your email.</>}
        </Body>
      </div>
      <div className="flex flex-col" style={{ gap: r(12) }} aria-live="polite">
        {phase === 'waiting' && !resent && <Notice kind="info">Your email hasn’t been verified yet. Open the latest link, then check again.</Notice>}
        {phase === 'waiting' && resent && <Notice kind="success">A new link has been sent. Use the latest email.</Notice>}
        {phase === 'checking' && <Notice kind="info">Checking your verification status…</Notice>}
        {phase === 'expired' && <Notice kind="error">This link is no longer valid. Request a new one.</Notice>}
        {phase === 'error' && <Notice kind="error">We couldn’t check your status. Check your connection and try again. Your address is saved.</Notice>}
        {verified && <Notice kind="success">Verified. You can continue.</Notice>}
      </div>
      {!verified && (
        <div className="flex flex-col" style={{ gap: r(4) }}>
          <Btn variant="text" loading={resending} disabled={false} aria-disabled={cooldown > 0 || resending || undefined} onClick={resend}
            style={{ color: cooldown > 0 ? C.text3 : C.primary, justifyContent: 'flex-start', paddingLeft: 0 }}>
            {cooldown > 0 ? `Resend link in ${cooldown}s` : 'Resend link'}
          </Btn>
          <span className="sr-only" role="status">{sr}</span>
        </div>
      )}
    </Screen>
  )
}

// ── Profile ──────────────────────────────────────────────────────────────────

function ProfileScreen({ ctx }: { ctx: Ctx }) {
  const { s, go } = ctx
  const { data, patch, proto } = s
  const [errs, setErrs] = useState<{ name?: string; area?: string }>({})
  const [photoErr, setPhotoErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const later = useLater()

  const pick = (f?: File) => {
    if (!f) return
    const err = checkImage(f)
    if (err) { setPhotoErr(err); return }
    setPhotoErr('')
    if (data.photo) URL.revokeObjectURL(data.photo.url)
    patch({ photo: { name: f.name, size: f.size, url: URL.createObjectURL(f) } })
  }
  const removePhoto = () => { if (data.photo) URL.revokeObjectURL(data.photo.url); patch({ photo: null }); setPhotoErr('') }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    const next: typeof errs = {}
    if (!data.name.trim()) next.name = 'Enter your name.'
    if (!data.area.trim()) next.area = 'Enter your area or locality.'
    setErrs(next); setSaveErr(false)
    if (next.name) return document.getElementById('name')?.focus()
    if (next.area) return document.getElementById('area')?.focus()
    setSaving(true)
    later(() => {
      setSaving(false)
      if (proto.network === 'offline') setSaveErr(true)
      else go('college-id')
    }, 700)
  }
  const ini = initials(data.name)
  return (
    <Screen top={<TopRow onBack={() => go('auth')} />}>
      <form onSubmit={submit} noValidate className="flex flex-col flex-1" style={{ gap: r(24) }}>
        <div className="flex flex-col" style={{ gap: r(8) }}>
          <Heading size={28}>Let’s set up your profile</Heading>
          <Body>A few details to help your co-pilot recognise you.</Body>
        </div>
        <div className="flex items-center" style={{ gap: r(16) }}>
          <span className="flex items-center justify-center overflow-hidden flex-shrink-0" style={{ width: r(80), height: r(80), borderRadius: 999, background: C.tint, color: C.pressed, border: `2px solid ${C.divider}`, fontSize: r(28), fontWeight: 700 }}>
            {data.photo ? <img src={data.photo.url} alt="Your profile photo preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : ini ? <span aria-hidden="true">{ini}</span> : <Ico name="user" size={32} />}
          </span>
          <div className="flex flex-col items-start min-w-0" style={{ gap: r(2) }}>
            <span style={{ fontSize: r(14), fontWeight: 600, color: C.text }}>{data.photo ? 'Profile photo' : 'Add profile photo'} <span style={{ fontWeight: 400, color: C.text3 }}>· Optional</span></span>
            <div className="flex flex-wrap" style={{ columnGap: r(16) }}>
              <button type="button" onClick={() => fileRef.current?.click()} className="ob-btn ob-btn-text" style={{ minHeight: r(48), fontSize: r(15), fontWeight: 600, color: C.primary }}>{data.photo ? 'Replace' : 'Choose photo'}</button>
              {data.photo && <button type="button" onClick={removePhoto} className="ob-btn ob-btn-text" style={{ minHeight: r(48), fontSize: r(15), fontWeight: 600, color: C.errText }}>Remove</button>}
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="sr-only" tabIndex={-1} aria-hidden="true"
            onChange={e => { pick(e.target.files?.[0]); e.target.value = '' }} />
        </div>
        {photoErr && <Notice kind="error">{photoErr}</Notice>}
        <Body size={14} color={C.text3}>Your name and photo are shown to your matched co-pilot.</Body>
        <Field id="name" label="Full name" placeholder="Enter your name" autoComplete="name" value={data.name} error={errs.name}
          onChange={e => { patch({ name: e.target.value }); if (errs.name) setErrs(x => ({ ...x, name: undefined })) }} />
        <Field id="area" label="Area or locality" placeholder="For example, Mansarovar" autoComplete="address-level2" helper="Your area is enough. Don’t enter your full home address."
          value={data.area} error={errs.area} onChange={e => { patch({ area: e.target.value }); if (errs.area) setErrs(x => ({ ...x, area: undefined })) }} />
        {saveErr && <Notice kind="error">We couldn’t save your profile. Your details are still here. Please try again.</Notice>}
        <div className="mt-auto flex flex-col" style={{ paddingTop: r(8) }}>
          <Btn type="submit" loading={saving}>Continue</Btn>
        </div>
      </form>
    </Screen>
  )
}

// ── College ID ───────────────────────────────────────────────────────────────

function CollegeIdScreen({ ctx }: { ctx: Ctx }) {
  const { s, go } = ctx
  const { data, patch } = s
  const [err, setErr] = useState('')
  const [previewFailed, setPreviewFailed] = useState(false)
  const chooseRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const pick = (f?: File) => {
    if (!f) return
    const e = checkImage(f)
    if (e) { setErr(e); return }
    setErr(''); setPreviewFailed(false)
    if (data.idDoc) URL.revokeObjectURL(data.idDoc.url)
    patch({ idDoc: { name: f.name, size: f.size, url: URL.createObjectURL(f) } })
  }
  const remove = () => { if (data.idDoc) URL.revokeObjectURL(data.idDoc.url); patch({ idDoc: null }); setErr(''); setPreviewFailed(false) }
  const doc = data.idDoc
  const lost = s.boot.restored && !doc && data.membership !== 'none'

  return (
    <Screen top={<TopRow onBack={() => go('profile')} />}
      footer={<Btn onClick={() => { if (!doc) { setErr('Add a photo of your college ID to continue.'); return } go('guidelines') }}>Continue</Btn>}>
      <Steps current={1} />
      <div className="flex flex-col" style={{ gap: r(8) }}>
        <Heading size={28}>Verify your college membership</Heading>
        <Body>Upload a clear photo of your college student ID.</Body>
      </div>
      {data.membership === 'rejected' && <Notice kind="warning">Add a new photo of your ID. Your other details are saved.</Notice>}
      {lost && <Notice kind="info">Your ID photo isn’t kept after a refresh. Select it again to continue.</Notice>}
      <div className="flex items-start" style={{ gap: r(12), padding: r(12), borderRadius: r(12), background: C.tint, color: C.pressed }}>
        <span style={{ marginTop: 2 }}><Ico name="lock" size={18} /></span>
        <p style={{ fontSize: r(14), lineHeight: 1.45 }}>Your ID is used to review your college membership. It is not shown to other pilots or buddies.</p>
      </div>

      {!doc ? (
        <div className="flex flex-col" style={{ gap: r(12), padding: r(16), borderRadius: r(16), border: `2px dashed ${err ? C.errText : C.input}`, background: C.surface2 }}>
          <div className="flex items-center" style={{ gap: r(12) }}>
            <span className="flex items-center justify-center flex-shrink-0" style={{ width: r(44), height: r(44), borderRadius: 999, background: '#fff', color: C.text2, border: `1px solid ${C.divider}` }}><Ico name="upload" size={22} /></span>
            <div>
              <p style={{ fontSize: r(16), fontWeight: 600, color: C.text }}>Add college ID</p>
              <p style={{ fontSize: r(14), color: C.text3 }}>JPG or PNG · Up to 5 MB</p>
            </div>
          </div>
          <div className="flex flex-col" style={{ gap: r(8) }}>
            <Btn variant="secondary" icon={<Ico name="camera" size={20} />} onClick={() => cameraRef.current?.click()}>Take photo</Btn>
            <Btn variant="secondary" icon={<Ico name="file" size={20} />} onClick={() => chooseRef.current?.click()}>Choose file</Btn>
          </div>
        </div>
      ) : (
        <div className="flex flex-col" style={{ gap: r(12), padding: r(16), borderRadius: r(16), border: `1.5px solid ${C.divider}`, background: '#fff' }}>
          {previewFailed ? (
            <Notice kind="error">We couldn’t show a preview of this file. Choose the file again.</Notice>
          ) : (
            <div className="flex items-center justify-center" style={{ background: C.surface2, borderRadius: r(12), padding: r(8) }}>
              <img src={doc.url} alt="Preview of your college ID" onError={() => setPreviewFailed(true)} style={{ width: '100%', maxHeight: r(220), objectFit: 'contain', borderRadius: r(8) }} />
            </div>
          )}
          <div className="flex items-start justify-between" style={{ gap: r(12) }}>
            <div className="min-w-0">
              <p style={{ fontSize: r(15), fontWeight: 600, color: C.text, overflowWrap: 'anywhere' }}>{doc.name}</p>
              <p style={{ fontSize: r(14), color: C.text3 }}>{fmtSize(doc.size)}</p>
            </div>
            <Badge kind="neutral">Ready for review</Badge>
          </div>
          <div className="flex flex-wrap" style={{ columnGap: r(16) }}>
            <button type="button" onClick={() => chooseRef.current?.click()} className="ob-btn ob-btn-text flex items-center" style={{ gap: r(6), minHeight: r(48), fontSize: r(15), fontWeight: 600, color: C.primary }}><Ico name="refresh" size={18} />Replace</button>
            <button type="button" onClick={remove} className="ob-btn ob-btn-text flex items-center" style={{ gap: r(6), minHeight: r(48), fontSize: r(15), fontWeight: 600, color: C.errText }}><Ico name="trash" size={18} />Remove</button>
          </div>
        </div>
      )}
      <input ref={chooseRef} type="file" accept="image/jpeg,image/png" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={e => { pick(e.target.files?.[0]); e.target.value = '' }} />
      <input ref={cameraRef} type="file" accept="image/jpeg,image/png" capture="environment" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={e => { pick(e.target.files?.[0]); e.target.value = '' }} />
      {err && <Notice kind="error">{err}</Notice>}

      <div className="flex flex-col" style={{ gap: r(8) }}>
        <h2 style={{ fontSize: r(16), fontWeight: 600, color: C.text }}>For a clear photo</h2>
        <ul className="flex flex-col" style={{ gap: r(8), listStyle: 'none' }}>
          {['Show all four corners.', 'Keep the name and college details readable.', 'Avoid glare and blur.'].map(t => (
            <li key={t} className="flex items-start" style={{ gap: r(8), fontSize: r(15), color: C.text2, lineHeight: 1.4 }}><span style={{ marginTop: 2, color: C.okText }}><Ico name="check" size={16} sw={2.5} /></span>{t}</li>
          ))}
        </ul>
      </div>
    </Screen>
  )
}

// ── Review and guidelines ────────────────────────────────────────────────────

const RULES = [
  { icon: 'fuel', title: 'Share fuel costs fairly', text: 'Agree on the fuel contribution before travelling.' },
  { icon: 'heart', title: 'Respect your co-pilot', text: 'Be considerate and respect personal boundaries.' },
  { icon: 'helmet', title: 'Travel responsibly', text: 'Follow traffic rules and wear a helmet.' },
]

function GuidelinesScreen({ ctx }: { ctx: Ctx }) {
  const { s, go, openSheet } = ctx
  const { data, patch, proto, setMembership } = s
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [err, setErr] = useState('')
  const resubmit = data.membership === 'rejected'

  useEffect(() => {
    if (!busy || proto.submission === 'in-progress') return
    const t = window.setTimeout(() => {
      setBusy(false)
      if (proto.submission === 'fail') { setFailed(true); return }
      patch({ submittedAt: Date.now() }); setMembership('pending'); go('verify-pending')
    }, 1200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, proto.submission])

  const submit = () => {
    if (busy) return
    if (!data.agreed) { setErr('Agree to the Community Guidelines to continue.'); return }
    if (REQUIRE_18_PLUS_ACK && !data.eligible) { setErr('Confirm the eligibility statement to continue.'); return }
    setErr(''); setFailed(false); setBusy(true)
  }
  const Row = ({ label, value, action, onAction }: { label: string; value: ReactNode; action: string; onAction: () => void }) => (
    <div className="flex items-center justify-between" style={{ gap: r(12), minHeight: r(48) }}>
      <div className="min-w-0"><p style={{ fontSize: r(13), color: C.text3 }}>{label}</p><p style={{ fontSize: r(15), fontWeight: 600, color: C.text, overflowWrap: 'anywhere' }}>{value}</p></div>
      <button type="button" onClick={onAction} aria-label={`${action} ${label.toLowerCase()}`} className="ob-btn ob-btn-text flex items-center flex-shrink-0" style={{ gap: r(4), minHeight: r(48), padding: `0 ${r(8)}`, fontSize: r(15), fontWeight: 600, color: C.primary }}><Ico name="edit" size={16} />{action}</button>
    </div>
  )
  return (
    <Screen top={<TopRow onBack={() => go('college-id')} />}
      footer={<Btn loading={busy} onClick={submit}>{resubmit ? 'Resubmit for review' : 'Submit for review'}</Btn>}>
      <Steps current={2} />
      <div className="flex flex-col" style={{ gap: r(8) }}>
        <Heading size={28}>Ready to join your campus community?</Heading>
        <Body>Review your details and agree to how we share rides.</Body>
      </div>
      <div className="flex flex-col" style={{ padding: `${r(4)} ${r(16)}`, borderRadius: r(16), border: `1.5px solid ${C.divider}` }}>
        <Row label="Name" value={data.name || 'Not added'} action="Edit" onAction={() => go('profile')} />
        <div style={{ height: 1, background: C.divider }} />
        <Row label="College email" value={domainOf(data.email) || data.email || 'Signed in with Google'} action="Edit" onAction={() => go('auth')} />
        <div style={{ height: 1, background: C.divider }} />
        <Row label="College ID" value={data.idDoc ? <span className="inline-flex items-center" style={{ gap: r(6), color: C.okText }}><Ico name="check" size={16} sw={2.5} />Document attached</span> : <span style={{ color: C.errText }}>No document attached</span>} action={data.idDoc ? 'Change' : 'Add'} onAction={() => go('college-id')} />
      </div>
      {!data.idDoc && <Notice kind="warning">{s.boot.restored ? 'Your ID photo isn’t kept after a refresh. Add it again before you submit.' : 'Add your college ID before you submit.'}</Notice>}
      <ul className="flex flex-col" style={{ gap: r(16), listStyle: 'none' }}>
        {RULES.map(x => (
          <li key={x.title} className="flex items-start" style={{ gap: r(12) }}>
            <span className="flex items-center justify-center flex-shrink-0" style={{ width: r(40), height: r(40), borderRadius: r(12), background: C.tint, color: C.primary }}><Ico name={x.icon} size={20} /></span>
            <div><p style={{ fontSize: r(16), fontWeight: 600, color: C.text }}>{x.title}</p><p style={{ fontSize: r(15), color: C.text2, lineHeight: 1.4 }}>{x.text}</p></div>
          </li>
        ))}
      </ul>
      <div className="flex flex-col" style={{ gap: r(4) }}>
        <label className="ob-check flex items-start" style={{ gap: r(12), minHeight: r(48), padding: `${r(8)} 0`, borderRadius: r(8) }}>
          <input type="checkbox" checked={data.agreed} onChange={e => { patch({ agreed: e.target.checked }); setErr('') }} aria-describedby={err ? 'agree-err' : undefined}
            style={{ width: r(24), height: r(24), accentColor: C.primary, marginTop: 0, flexShrink: 0 }} />
          <span style={{ fontSize: r(16), color: C.text, lineHeight: 1.4 }}>I agree to the <Link href="#guidelines" onClick={() => openSheet('guidelines')}>Community Guidelines</Link>.</span>
        </label>
        {REQUIRE_18_PLUS_ACK && (
          <label className="ob-check flex items-start" style={{ gap: r(12), minHeight: r(48), padding: `${r(8)} 0` }}>
            <input type="checkbox" checked={data.eligible} onChange={e => patch({ eligible: e.target.checked })} style={{ width: r(24), height: r(24), accentColor: C.primary, flexShrink: 0 }} />
            <span style={{ fontSize: r(16), color: C.text, lineHeight: 1.4 }}>I confirm I meet the pilot’s age requirement.</span>
          </label>
        )}
        {err && <p id="agree-err" role="alert" className="flex items-center" style={{ gap: r(6), fontSize: r(14), color: C.errText }}><Ico name="alert" size={16} />{err}</p>}
      </div>
      {busy && <Notice kind="info">Submitting your details…</Notice>}
      {failed && <Notice kind="error">We couldn’t submit your details. Your information is still here—please try again.</Notice>}
    </Screen>
  )
}

// ── Verification outcomes ────────────────────────────────────────────────────

function VerifyPendingScreen({ ctx }: { ctx: Ctx }) {
  const { s, go, openSheet } = ctx
  const { data, proto, setMembership } = s
  const [checking, setChecking] = useState(false)
  const [still, setStill] = useState(false)
  const later = useLater()
  const check = () => {
    if (checking) return
    setChecking(true); setStill(false)
    later(() => {
      setChecking(false)
      if (proto.membership === 'approved') { setMembership('approved'); go('verify-approved') }
      else if (proto.membership === 'rejected') { setMembership('rejected'); go('verify-rejected') }
      else setStill(true)
    }, 900)
  }
  const when = data.submittedAt ? new Date(data.submittedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : null
  return (
    <Screen center
      footer={<>
        <Btn onClick={() => go('browse-preview')}>Explore the app</Btn>
        <Btn variant="secondary" loading={checking} onClick={check}>Check status</Btn>
        <Btn variant="text" onClick={() => openSheet('help')}>Get help</Btn>
      </>}>
      <Glyph kind="clock" />
      <Badge kind="warn">Under review</Badge>
      <div className="flex flex-col items-center" style={{ gap: r(12) }}>
        <Heading size={26} center>Your college ID is under review</Heading>
        <Body center>We’ll update your verification status here when the review is complete.</Body>
        {when && <Body center size={14} color={C.text3}>Submitted {when}</Body>}
      </div>
      <div style={{ padding: r(16), borderRadius: r(16), background: C.surface2, border: `1px solid ${C.divider}`, textAlign: 'left' }}>
        <Body size={15}>You can explore the app while you wait. Requesting or offering rides becomes available after the required approvals.</Body>
      </div>
      {still && <div className="w-full" style={{ textAlign: 'left' }}><Notice kind="info">Still under review. We’ll update this page when the review is complete.</Notice></div>}
    </Screen>
  )
}

function VerifyApprovedScreen({ ctx }: { ctx: Ctx }) {
  const d = domainOf(ctx.s.data.email)
  return (
    <Screen center footer={<Btn onClick={() => ctx.go('choose-role')}>Choose how you’ll travel</Btn>}>
      <Glyph kind="check" />
      <Badge kind="ok">Verified</Badge>
      <div className="flex flex-col items-center" style={{ gap: r(12) }}>
        <Heading size={26} center>College membership verified</Heading>
        <Body center>You’re ready to join your college’s commute community.</Body>
        {d && <Body center size={14} color={C.text3}>Verified with {d}</Body>}
      </div>
      <Body center size={15} color={C.text3}>Want to offer rides? Your vehicle and driving documents need a separate review.</Body>
    </Screen>
  )
}

const REJECT: Record<RejectReason, { title: string; reason: string; guide: string }> = {
  blurry: { title: 'We need a clearer ID photo', reason: 'The name and college details were not readable.', guide: 'Retake the photo in good lighting, with all four corners visible and no glare.' },
  'wrong-document': { title: 'We need your college student ID', reason: 'The document you uploaded isn’t a college student ID.', guide: 'Upload a photo of the student ID issued by your college, with all four corners visible.' },
  expired: { title: 'We need a current ID', reason: 'The validity date on this ID has passed.', guide: 'Upload a photo of a current college student ID. If you think this is a mistake, ask for a review.' },
  'not-confirmed': { title: 'We couldn’t confirm your membership', reason: 'We couldn’t match your details to this college.', guide: 'Check that your name and college email are correct, then upload your ID again, or ask for a review.' },
}

function VerifyRejectedScreen({ ctx }: { ctx: Ctx }) {
  const c = REJECT[ctx.s.proto.rejectReason]
  return (
    <Screen center
      footer={<>
        <Btn onClick={() => { const d = ctx.s.data; if (d.idDoc) URL.revokeObjectURL(d.idDoc.url); ctx.s.patch({ idDoc: null }); ctx.go('college-id') }}>Replace ID photo</Btn>
        <Btn variant="secondary" onClick={() => ctx.openSheet('review-request')}>Ask for a review</Btn>
      </>}>
      <Glyph kind="alert" />
      <Badge kind="err">Action needed</Badge>
      <Heading size={26} center>{c.title}</Heading>
      <div className="w-full" style={{ padding: r(16), borderRadius: r(16), background: C.warnBg, border: `1px solid ${C.warnBorder}`, textAlign: 'left' }}>
        <p style={{ fontSize: r(13), fontWeight: 600, color: C.warnText, marginBottom: r(4) }}>Reason</p>
        <p style={{ fontSize: r(16), color: C.text, lineHeight: 1.45 }}>{c.reason}</p>
      </div>
      <Body center>{c.guide}</Body>
      <Body center size={14} color={C.text3}>Your name, email and area are saved.</Body>
    </Screen>
  )
}

function BrowsePreviewScreen({ ctx }: { ctx: Ctx }) {
  return (
    <Screen top={<TopRow onBack={() => ctx.go('verify-pending')} />}>
      <Notice kind="warning" action={<div><Link href="#status" onClick={() => ctx.go('verify-pending')}>View status</Link></div>}>
        <strong>College verification pending</strong>
      </Notice>
      <div className="flex flex-col" style={{ gap: r(8) }}>
        <Heading size={26}>Preview ChaloRaahi</Heading>
        <Body>This is a read-only preview. Requesting or offering rides opens after approval.</Body>
      </div>
      <ul className="flex flex-col" style={{ gap: r(12), listStyle: 'none' }}>
        {[['users', 'Find a ride', 'Join a pilot already travelling your way.'], ['scooter', 'Offer a seat', 'Share one pillion seat on your regular commute. Needs a separate vehicle review.'], ['shield', 'Stay in touch', 'Keep emergency contacts close while you travel.']].map(([i, t, d]) => (
          <li key={t} className="flex items-start" style={{ gap: r(12), padding: r(16), borderRadius: r(16), border: `1.5px solid ${C.divider}` }}>
            <span className="flex items-center justify-center flex-shrink-0" style={{ width: r(40), height: r(40), borderRadius: r(12), background: C.tint, color: C.primary }}><Ico name={i} size={20} /></span>
            <div><p style={{ fontSize: r(16), fontWeight: 600, color: C.text }}>{t}</p><p style={{ fontSize: r(15), color: C.text2, lineHeight: 1.4 }}>{d}</p></div>
          </li>
        ))}
      </ul>
      <Btn aria-disabled="true" disabled style={{ background: C.divider, color: C.text3 }}>Available after verification</Btn>
    </Screen>
  )
}

// ── Role selection and confirmation ──────────────────────────────────────────

const ROLES: { id: RoleKey; label: string; title: string; desc: string; icon: string }[] = [
  { id: 'customer', label: 'Buddy', title: 'Find a ride', desc: 'Join a pilot already travelling your way.', icon: 'user' },
  { id: 'rider', label: 'Pilot', title: 'Offer a seat', desc: 'Share one pillion seat on your regular commute.', icon: 'scooter' },
  { id: 'both', label: 'Both', title: 'Do both', desc: 'Find rides or offer a seat when it suits you.', icon: 'users' },
]

function ChooseRoleScreen({ ctx }: { ctx: Ctx }) {
  const { data, patch } = ctx.s
  const [err, setErr] = useState(false)
  return (
    <Screen footer={<Btn onClick={() => { if (!data.role) { setErr(true); return } ctx.go('role-confirmed') }}>Continue</Btn>}>
      <div className="flex flex-col" style={{ gap: r(8) }}>
        <Heading size={28}>How would you like to travel?</Heading>
        <Body>Choose what suits you now. You can change this later.</Body>
      </div>
      <div role="radiogroup" aria-label="How you’ll travel" className="flex flex-col" style={{ gap: r(12) }}>
        {ROLES.map(o => {
          const sel = data.role === o.id
          return (
            <label key={o.id} className="ob-role flex items-center cursor-pointer" style={{ gap: r(16), padding: r(16), borderRadius: r(16), border: `2px solid ${sel ? C.primary : C.divider}`, background: sel ? C.tint : '#fff' }}>
              <input type="radio" name="role" value={o.id} checked={sel} onChange={() => { patch({ role: o.id }); setErr(false) }} className="sr-only" />
              <span className="flex items-center justify-center flex-shrink-0" style={{ width: r(48), height: r(48), borderRadius: r(14), background: sel ? C.primary : C.surface2, color: sel ? '#fff' : C.text2 }}><Ico name={o.icon} size={24} /></span>
              <span className="flex-1 min-w-0">
                <span style={{ display: 'block', fontSize: r(13), fontWeight: 600, color: sel ? C.pressed : C.text3 }}>{o.label}</span>
                <span style={{ display: 'block', fontSize: r(18), fontWeight: 600, color: C.text }}>{o.title}</span>
                <span style={{ display: 'block', fontSize: r(15), color: C.text2, lineHeight: 1.4 }}>{o.desc}</span>
              </span>
              <span aria-hidden="true" className="flex items-center justify-center flex-shrink-0" style={{ width: r(24), height: r(24), borderRadius: 999, border: `2px solid ${sel ? C.primary : C.input}`, background: sel ? C.primary : '#fff', color: '#fff' }}>{sel && <Ico name="check" size={14} sw={3} />}</span>
            </label>
          )
        })}
      </div>
      {err && <p role="alert" className="flex items-center" style={{ gap: r(6), fontSize: r(14), color: C.errText }}><Ico name="alert" size={16} />Choose an option to continue.</p>}
      {(data.role === 'rider' || data.role === 'both') && <Body size={14} color={C.text3}>Offering rides requires vehicle and driving-document approval.</Body>}
    </Screen>
  )
}

function RoleConfirmedScreen({ ctx, onFinish }: { ctx: Ctx; onFinish: (d: 'customer' | 'rider') => void }) {
  const role = ctx.s.data.role ?? 'customer'
  const change = <Btn variant="text" onClick={() => ctx.go('choose-role')}>Change role</Btn>
  const copy = {
    customer: { glyph: 'users' as const, title: 'You’re ready to plan your first commute', sub: 'Choose your pickup, destination, and travel time to request a shared ride.' },
    rider: { glyph: 'scooter' as const, title: 'Next, set up your vehicle', sub: 'Add your vehicle and driving documents before offering a seat.' },
    both: { glyph: 'both' as const, title: 'One account. Both ways to travel.', sub: 'You can request a ride now and complete vehicle setup whenever you’re ready to offer a seat.' },
  }[role]
  return (
    <Screen center
      footer={role === 'customer' ? <><Btn onClick={() => onFinish('customer')}>Plan a ride</Btn>{change}</>
        : role === 'rider' ? <><Btn onClick={() => onFinish('rider')}>Set up my vehicle</Btn>{change}</>
        : <><Btn onClick={() => onFinish('customer')}>Find a ride</Btn><Btn variant="secondary" onClick={() => onFinish('rider')}>Set up my vehicle</Btn>{change}</>}>
      <Glyph kind={copy.glyph} />
      <div className="flex flex-col items-center" style={{ gap: r(12) }}>
        <Heading size={26} center>{copy.title}</Heading>
        <Body center>{copy.sub}</Body>
        {role !== 'customer' && <Body center size={14} color={C.text3}>Vehicle and driving documents are reviewed separately from your college membership.</Body>}
      </div>
    </Screen>
  )
}

// ── Sheets ───────────────────────────────────────────────────────────────────

const POLICIES: Record<'terms' | 'privacy' | 'guidelines', { title: string; topics: string[] }> = {
  terms: { title: 'Terms of Service', topics: ['Who can use ChaloRaahi', 'Account and college verification', 'Sharing a commute', 'Changes and contact'] },
  privacy: { title: 'Privacy Notice', topics: ['What we collect', 'How your college ID is used and kept', 'What your co-pilot can see', 'Your choices'] },
  guidelines: { title: 'Community Guidelines', topics: ['Share fuel costs fairly', 'Respect your co-pilot', 'Travel responsibly', 'Reporting a concern'] },
}

function SheetBody({ kind, s }: { kind: SheetKind; s: Session }) {
  const [note, setNote] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')
  const later = useLater()
  if (kind === 'help') return (
    <>
      <Body>Support contact options haven’t been set up in this prototype. In the live app, help and contact details will appear here.</Body>
    </>
  )
  if (kind === 'review-request') return state === 'done' ? (
    <Notice kind="success">Review request recorded. This is a prototype, so nothing was sent to anyone.</Notice>
  ) : (
    <form className="flex flex-col" style={{ gap: r(16) }} onSubmit={e => { e.preventDefault(); if (state === 'sending') return; setState('sending'); later(() => setState('done'), 800) }}>
      <Body>Tell us what we should look at again. This is optional.</Body>
      <div className="flex flex-col" style={{ gap: r(8) }}>
        <label htmlFor="review-note" style={{ fontSize: r(14), fontWeight: 600, color: C.text }}>Note for the reviewer</label>
        <textarea id="review-note" value={note} onChange={e => setNote(e.target.value)} rows={4} className="ob-input w-full"
          style={{ borderRadius: r(12), border: `1.5px solid ${C.input}`, padding: r(12), fontSize: r(16), color: C.text, fontFamily: 'inherit' }} />
      </div>
      <Btn type="submit" loading={state === 'sending'}>Send review request</Btn>
    </form>
  )
  const p = POLICIES[kind]
  void s
  return (
    <>
      <Notice kind="warning">Draft for prototype review. This is not final legal text.</Notice>
      <Body>The final {p.title.toLowerCase()} will cover:</Body>
      <ul style={{ paddingLeft: r(20), display: 'flex', flexDirection: 'column', gap: r(8), fontSize: r(16), color: C.text2, lineHeight: 1.4 }}>
        {p.topics.map(t => <li key={t}>{t}</li>)}
      </ul>
    </>
  )
}

const sheetTitle = (k: SheetKind) => k === 'help' ? 'Get help' : k === 'review-request' ? 'Ask for a review' : POLICIES[k].title

// ── Prototype controls (outside the phone frame) ─────────────────────────────

export function PrototypeControls({ s, screen, setScreen, onReset }: { s: Session; screen: OnboardingScreen; setScreen: (x: OnboardingScreen) => void; onReset: () => void }) {
  const { proto, setProto, data, patch } = s
  const sel = (label: string, value: string, opts: [string, string][], on: (v: string) => void) => (
    <label key={label} className="flex flex-col gap-1" style={{ minWidth: 150, flex: 1 }}>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)' }}>{label}</span>
      <select value={value} onChange={e => on(e.target.value)} style={{ padding: '7px 8px', borderRadius: 8, fontSize: 12, background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)' }}>
        {opts.map(([v, l]) => <option key={v} value={v} style={{ background: '#1c1c2e' }}>{l}</option>)}
      </select>
    </label>
  )
  void screen; void setScreen
  return (
    <section aria-label="Prototype controls" style={{ maxWidth: 520, width: '100%', padding: 12, borderRadius: 12, border: '1px dashed rgba(255,255,255,0.25)' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Onboarding prototype controls</span>
        <button type="button" onClick={onReset} style={{ fontSize: 12, fontWeight: 600, color: '#fff', padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.3)' }}>Reset prototype</button>
      </div>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 10, lineHeight: 1.4 }}>Results are simulated. No email, sign-in, upload or review is sent anywhere.</p>
      <div className="flex flex-wrap gap-2">
        {sel('Network', proto.network, [['online', 'Online'], ['offline', 'Offline (errors)']], v => setProto(p => ({ ...p, network: v as Proto['network'] })))}
        {sel('Google sign-in', proto.google, [['ok', 'Succeeds'], ['cancelled', 'Cancelled']], v => setProto(p => ({ ...p, google: v as Proto['google'] })))}
        {sel('Email link', proto.emailLink, [['verified', 'Verified'], ['pending', 'Still pending'], ['expired', 'Expired']], v => setProto(p => ({ ...p, emailLink: v as Proto['emailLink'] })))}
        {sel('Submission', proto.submission, [['ok', 'Succeeds'], ['fail', 'Fails'], ['in-progress', 'Stays in progress']], v => setProto(p => ({ ...p, submission: v as Proto['submission'] })))}
        {sel('Membership result', proto.membership, [['approved', 'Approved'], ['pending', 'Still pending'], ['rejected', 'Rejected']], v => setProto(p => ({ ...p, membership: v as Proto['membership'] })))}
        {sel('Rejection reason', proto.rejectReason, [['blurry', 'Blurry image'], ['wrong-document', 'Wrong document'], ['expired', 'Expired ID'], ['not-confirmed', 'Membership not confirmed']], v => setProto(p => ({ ...p, rejectReason: v as RejectReason })))}
        {sel('Role preview', data.role ?? '', [['', 'Not chosen'], ['customer', 'Buddy'], ['rider', 'Pilot'], ['both', 'Both']], v => patch({ role: (v || null) as RoleKey | null }))}
      </div>
    </section>
  )
}

// ── Main export ──────────────────────────────────────────────────────────────

export default function OnboardingContent({
  screen, setScreen, onComplete, session, framed = true,
}: {
  screen: OnboardingScreen
  setScreen: (s: OnboardingScreen) => void
  onComplete?: (dest: 'customer' | 'rider') => void
  session: Session
  framed?: boolean
}) {
  const [sheet, setSheet] = useState<SheetKind | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const ctx: Ctx = useMemo(() => ({ s: session, go: setScreen, openSheet: setSheet }), [session, setScreen])

  useEffect(() => {
    if (screen === 'splash-intro') return
    rootRef.current?.querySelector<HTMLElement>('[data-heading]')?.focus({ preventScroll: true })
    rootRef.current?.querySelector<HTMLElement>('[data-scroll]')?.scrollTo?.(0, 0)
  }, [screen])

  const introDone = () => { session.markIntroSeen(); setScreen('splash-1') }

  return (
    <div ref={rootRef} className="ob-root absolute inset-0 bg-white flex flex-col overflow-hidden" style={{ borderRadius: framed ? 40 : 0, fontFamily: 'Inter, sans-serif' }}>
      {screen === 'splash-intro' ? (
        <SplashIntro onDone={introDone} />
      ) : (
        <div {...(sheet ? { inert: true } : {})} className="flex flex-col flex-1 min-h-0" style={{ paddingTop: framed ? 44 : 'env(safe-area-inset-top)' }}>
          <main key={screen} className="ob-fade flex flex-col flex-1 min-h-0">
            {screen === 'splash-1' && <IntroScreen slide={1} ctx={ctx} />}
            {screen === 'splash-2' && <IntroScreen slide={2} ctx={ctx} />}
            {screen === 'splash-3' && <IntroScreen slide={3} ctx={ctx} />}
            {screen === 'auth' && <AuthScreen ctx={ctx} />}
            {screen === 'email-sent' && <EmailSentScreen ctx={ctx} />}
            {screen === 'profile' && <ProfileScreen ctx={ctx} />}
            {screen === 'college-id' && <CollegeIdScreen ctx={ctx} />}
            {screen === 'guidelines' && <GuidelinesScreen ctx={ctx} />}
            {screen === 'verify-pending' && <VerifyPendingScreen ctx={ctx} />}
            {screen === 'verify-approved' && <VerifyApprovedScreen ctx={ctx} />}
            {screen === 'verify-rejected' && <VerifyRejectedScreen ctx={ctx} />}
            {screen === 'browse-preview' && <BrowsePreviewScreen ctx={ctx} />}
            {screen === 'choose-role' && <ChooseRoleScreen ctx={ctx} />}
            {screen === 'role-confirmed' && <RoleConfirmedScreen ctx={ctx} onFinish={dest => onComplete?.(dest)} />}
          </main>
        </div>
      )}
      {sheet && <Sheet title={sheetTitle(sheet)} onClose={() => setSheet(null)}><SheetBody key={sheet} kind={sheet} s={session} /></Sheet>}
    </div>
  )
}
