import { reportCtx } from './SOSData'
import { useEffect, useRef, useState } from 'react'
import { Body, Btn, C, Field, Heading, Ico, Notice, Screen, TopRow, r } from './OnboardingUI'
import MiniMap, { pointOnRoute } from './PassengerMap'
import { addMinutes, dayLabel, fmtTime, inr } from './PassengerData'
import { Card, Check, H2, KV, Label, RouteLine, Stars, useTimers } from './PassengerUI'
import { draftFromTrip, noShowEligible, type RCtx, type Trip } from './RiderData'
import { BuddyLine, Initials, LinkBtn, NoRide, Para, clock, redText } from './RiderUI'

const PRESETS = ['I’m heading to the pickup point', 'I’m running a few minutes late', 'I’ve reached the pickup point']
const sos = (c: RCtx) => (
  <button type="button" onClick={c.sos} className="flex items-center" style={{ minHeight: r(48), gap: r(6), padding: `0 ${r(12)}`, color: C.errText, fontWeight: 700, fontSize: r(15) }}>
    <Ico name="sos" size={18} />Emergency help
  </button>
)

function send(c: RCtx, t: Trip, text: string, retryId?: number) {
  const id = retryId ?? Date.now()
  c.s.patchTrip(t.id, x => ({ msgs: retryId ? x.msgs.map(m => m.id === id ? { ...m, state: 'sending' as const } : m) : [{ id, text, state: 'sending' as const, at: Date.now() }, ...x.msgs].slice(0, 5) }))
  const ok = c.online && c.s.proto.message === 'ok'
  window.setTimeout(() => {
    c.s.patchTrip(t.id, x => ({ msgs: x.msgs.map(m => m.id === id ? { ...m, state: ok ? 'sent' as const : 'failed' as const, at: Date.now() } : m) }))
    c.say(ok ? 'Update sent.' : 'Update not sent. You can retry.')
  }, 800)
}

export function MessagePanel({ c, t }: { c: RCtx; t: Trip }) {
  return (
    <div className="flex flex-col" style={{ gap: r(10) }}>
      <div role="group" aria-label="Quick updates" className="flex flex-col" style={{ gap: r(8) }}>
        {PRESETS.map(p => (
          <button key={p} type="button" onClick={() => send(c, t, p)} className="ob-btn ob-btn-secondary flex items-center" style={{ minHeight: r(52), gap: r(10), padding: `${r(8)} ${r(16)}`, borderRadius: r(12), border: `1.5px solid ${C.input}`, color: C.text, fontWeight: 600, fontSize: r(16), textAlign: 'left' }}>
            <Ico name="send" size={18} color={C.primary} />{p}
          </button>
        ))}
      </div>
      <p style={{ fontSize: r(14), color: C.text2 }}>Preset updates only. No chat or phone numbers are shared.</p>
      {t.msgs.length > 0 && (
        <ul aria-label="Sent updates" className="flex flex-col" style={{ gap: r(6), listStyle: 'none' }}>
          {t.msgs.map(m => (
            <li key={m.id} className="flex items-center justify-between" style={{ gap: r(8), minHeight: r(44), fontSize: r(14), color: C.text }}>
              <span style={{ overflowWrap: 'anywhere' }}>{m.text}</span>
              <span className="flex items-center flex-shrink-0" style={{ gap: r(6), color: m.state === 'failed' ? C.errText : C.text2 }}>
                {m.state === 'sending' ? 'Sending…' : m.state === 'sent' ? `Sent ${clock(m.at)}` : 'Not sent'}
                {m.state === 'failed' && <button type="button" onClick={() => send(c, t, m.text, m.id)} style={{ minHeight: r(44), padding: `0 ${r(8)}`, color: C.primary, fontWeight: 600, textDecoration: 'underline' }}>Retry<span className="sr-only">: {m.text}</span></button>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const PickupCard = ({ t }: { t: Trip }) => (
  <Card>
    <H2>Pickup details</H2>
    <div style={{ marginTop: r(10) }}><RouteLine from={t.pickupPoint.label} fromSub={t.pickup.name} to={t.destination.name} /></div>
    {t.req && <div className="flex flex-col" style={{ gap: r(6), marginTop: r(12) }}>
      <KV k="Pickup time" v={`about ${fmtTime(t.time)}`} /><KV k="Helmet" v={t.req.helmet === 'has' ? 'Buddy has their own' : 'Buddy needs your spare helmet'} />
    </div>}
  </Card>
)

// ── Confirmed ────────────────────────────────────────────────────────────────

export function Confirmed({ c }: { c: RCtx }) {
  const t = c.s.cur
  const [panel, setPanel] = useState(false)
  if (!t || !t.req) return <NoRide c={c} />
  const q = t.req
  return (
    <Screen gap={16} top={<TopRow onBack={c.back} />}
      footer={<>
        <Btn onClick={() => { c.s.patchCur({ status: 'heading', headAt: Date.now() }); c.replace('heading-to-pickup') }}>I’m heading to pickup</Btn>
        <Btn variant="secondary" onClick={() => setPanel(p => !p)}>Send an update</Btn>
        <Btn variant="text" onClick={() => c.open('help')}>Get help</Btn>
        <button type="button" onClick={() => c.open('cancel-ride')} className="ob-btn ob-btn-text" style={redText}>Cancel this ride</button>
      </>}>
      <div className="flex flex-col" style={{ gap: r(8) }}>
        <span className="flex items-center justify-center" style={{ width: r(56), height: r(56), borderRadius: 999, background: C.okBg, color: C.okText, border: `1px solid ${C.okBorder}` }}><Ico name="check" size={28} sw={2.5} /></span>
        <Heading size={26}>Ride confirmed</Heading>
        <Body>{dayLabel(t.date)} · pickup around {fmtTime(t.time)} IST</Body>
      </div>
      <Card><BuddyLine q={q} size={56} /></Card>
      <Card tone="tint"><KV k="Estimated contribution" v={inr(t.amount)} strong /><div style={{ marginTop: r(6) }}><Para size={14}>Settled directly after the ride, by cash or the Buddy’s own UPI app.</Para></div></Card>
      <PickupCard t={t} />
      {panel && <Card><H2>Send an update</H2><div style={{ marginTop: r(10) }}><MessagePanel c={c} t={t} /></div></Card>}
    </Screen>
  )
}

// ── Heading to pickup ────────────────────────────────────────────────────────

export function HeadingToPickup({ c }: { c: RCtx }) {
  const t = c.s.cur
  if (!t || !t.req) return <NoRide c={c} />
  const live = c.online ? t.loc : 'stale'
  const pos = pointOnRoute(t.pickup, t.destination, live === 'fresh' ? 0.12 : 0.05)
  return (
    <Screen gap={16} top={<TopRow onBack={c.back} right={sos(c)} />}
      footer={<>
        <Btn onClick={() => c.open('directions')} icon={<Ico name="nav" size={18} />}>Open directions</Btn>
        <Btn variant="secondary" onClick={() => { c.s.patchCur({ status: 'at-pickup', arrivedAt: Date.now() }); c.replace('at-pickup') }}>I’ve arrived</Btn>
        <Btn variant="text" onClick={() => c.open('help')}>Get help</Btn>
      </>}>
      <Heading size={26}>Heading to pickup</Heading>
      <Body>Pickup around {fmtTime(t.time)} · {t.pickupPoint.label}</Body>
      {!c.online && <Notice kind="warning">You’re offline. Your last ride status is shown. Updates you send will not go until you reconnect.</Notice>}
      <div style={{ borderRadius: r(14), overflow: 'hidden' }}>
        <MiniMap height={190} pickup={t.pickup} destination={t.destination} rider={{ ...pos, state: live === 'fresh' ? 'fresh' : 'stale' }}
          label={`Sample map. You are on your way to ${t.pickup.name}. ${live === 'fresh' ? 'Location updated moments ago.' : 'Location has not updated recently.'}`} />
      </div>
      <PickupCard t={t} />
      <Card><H2>Let {t.req.name.split(' ')[0]} know</H2><div style={{ marginTop: r(10) }}><MessagePanel c={c} t={t} /></div></Card>
      <Para size={14}>The map is an illustration. Directions open in your own maps app.</Para>
    </Screen>
  )
}

// ── At pickup ────────────────────────────────────────────────────────────────

export function AtPickup({ c }: { c: RCtx }) {
  const t = c.s.cur
  if (!t || !t.req) return <NoRide c={c} />
  const both = t.ack.match && t.ack.helmets
  const elig = noShowEligible(t)
  const ack = (k: 'match' | 'helmets', v: boolean) => c.s.patchCur(x => ({ ack: { ...x.ack, [k]: v } }))
  const next = () => { if (t.locReady === 'none') c.open('location'); else c.go('verify-otp') }
  return (
    <Screen gap={16} top={<TopRow onBack={c.back} right={sos(c)} />}
      footer={<>
        <Btn disabled={!both} onClick={next}>Enter start code</Btn>
        {!both && <p style={{ fontSize: r(14), color: C.text2, textAlign: 'center' }}>Tick both checks to continue.</p>}
        <Btn variant="text" onClick={() => c.open('options')}>Buddy isn’t here</Btn>
      </>}>
      <Heading size={26}>Meet your Buddy</Heading>
      <Body>Check who you’re meeting before asking for the start code.</Body>
      <Card><BuddyLine q={t.req} size={56} /><div style={{ marginTop: r(10) }}><KV k="Pickup" v={t.pickupPoint.label} /></div></Card>
      <div className="flex flex-col" style={{ gap: r(10) }}>
        <Check id="ack-match" checked={t.ack.match} onChange={v => ack('match', v)} label={`This is ${t.req.name}, the Buddy on this ride.`} />
        <Check id="ack-helm" checked={t.ack.helmets} onChange={v => ack('helmets', v)} label="We both have helmets for this ride." />
      </div>
      <button type="button" onClick={() => c.open('mismatch')} style={{ ...redText, alignSelf: 'flex-start' }}>Something doesn’t match</button>
      {t.noShow === 'reported' ? <Notice kind="info"><strong>No-show report submitted.</strong> It’s pending review. This isn’t a finding against anyone.</Notice>
        : elig ? <Notice kind="warning" action={<div style={{ marginTop: r(8) }}><Btn variant="secondary" style={{ minHeight: r(48) }} onClick={() => c.open('no-show')}>Report Buddy not here</Btn></div>}>It’s been over 10 minutes past the agreed time (prototype waiting policy). You can report that your Buddy hasn’t arrived.</Notice>
        : <Para size={14}>If your Buddy hasn’t arrived, send an update. You can report a no-show after 10 minutes past the agreed time.</Para>}
      <Card><H2>Send an update</H2><div style={{ marginTop: r(10) }}><MessagePanel c={c} t={t} /></div></Card>
    </Screen>
  )
}

// ── Start code ───────────────────────────────────────────────────────────────

export function VerifyCode({ c }: { c: RCtx }) {
  const t = c.s.cur
  const later = useTimers()
  const [val, setVal] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [unsure, setUnsure] = useState(false)
  const [checking, setChecking] = useState(false)
  const ref = { current: { focus: () => document.getElementById("code")?.focus() } }
  if (!t || !t.req) return <NoRide c={c} />
  if (!(t.ack.match && t.ack.helmets)) return <Screen top={<TopRow onBack={c.back} />}><Heading size={24}>Confirm the Buddy first</Heading><Body>Start-code entry opens after both checks on the previous screen.</Body><Btn onClick={() => c.back()}>Go back</Btn></Screen>
  const LEFT = 3 - t.wrongTries
  const locked = LEFT <= 0 || c.s.proto.code === 'limit'
  const start = () => { c.s.patchCur({ status: 'active', startedAt: Date.now() }); c.replace('ride-in-progress-r'); c.say('Ride started.') }
  const submit = () => {
    if (busy || locked) return
    if (val.length !== 4) { setErr('Enter the 4-digit code your Buddy shows you.'); ref.current?.focus(); return }
    if (!c.online) { setErr('You’re offline. Connect to verify the code. The ride hasn’t started.'); return }
    setErr(''); setBusy(true)
    later(() => {
      setBusy(false)
      const m = c.s.proto.code
      if (m === 'accept') start()
      else if (m === 'uncertain') setUnsure(true)
      else if (m === 'expired') setErr('This code has expired. Ask your Buddy to open a new one.')
      else if (m === 'wrong') { c.s.patchCur(x => ({ wrongTries: x.wrongTries + 1 })); setErr(`That code doesn’t match. Check it with your Buddy. ${Math.max(0, LEFT - 1)} ${LEFT - 1 === 1 ? 'try' : 'tries'} left.`); setVal(''); ref.current?.focus() }
    }, 900)
  }
  return (
    <Screen gap={16} top={<TopRow onBack={c.back} right={sos(c)} />}
      footer={locked ? <><Btn variant="secondary" onClick={() => c.open('help')}>Get help</Btn><button type="button" onClick={() => c.open('cancel-ride')} className="ob-btn ob-btn-text" style={redText}>Cancel this ride</button></>
        : unsure ? null : <Btn loading={busy} onClick={submit}>{busy ? 'Checking…' : 'Start ride'}</Btn>}>
      <Heading size={26}>Enter start code</Heading>
      <Body>Ask {t.req.name.split(' ')[0]} to show the 4-digit code in their app. Only enter it when you’re together and ready to leave.</Body>
      {locked ? <Notice kind="error">Too many incorrect attempts, so start verification is paused. Don’t start the ride. Get help or cancel the ride.</Notice>
        : unsure ? <Notice kind="warning" action={<div style={{ marginTop: r(8) }}><Btn variant="secondary" loading={checking} style={{ minHeight: r(48) }} onClick={() => { setChecking(true); later(() => { setChecking(false); start() }, 1100) }}>{checking ? 'Checking…' : 'Check ride status'}</Btn></div>}>We couldn’t confirm whether the ride started. Please don’t enter the code again yet.</Notice>
        : (
          <>
            <Field id="code" label="Start code" inputMode="numeric" autoComplete="one-time-code" maxLength={4} value={val} error={err || undefined}
              onChange={e => { setVal(e.target.value.replace(/\D/g, '').slice(0, 4)); setErr('') }} style={{ fontSize: r(28), letterSpacing: '0.4em', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}
              helper="Numbers only. Pasting is fine." />
            <Para size={14}>The ride starts only after the code is verified. {LEFT < 3 ? `${LEFT} ${LEFT === 1 ? 'try' : 'tries'} left.` : ''}</Para>
          </>
        )}
      <Label>Prototype: the result is set from the controls below the phone. Real verification needs a server; none is connected.</Label>
    </Screen>
  )
}

// ── Active ride ──────────────────────────────────────────────────────────────

export function Active({ c }: { c: RCtx }) {
  const t = c.s.cur
  const [, tick] = useState(0)
  useEffect(() => { const i = window.setInterval(() => tick(n => n + 1), 30000); return () => clearInterval(i) }, [])
  if (!t || !t.req) return <NoRide c={c} />
  const live = c.online ? t.loc : 'stale'
  const pos = pointOnRoute(t.pickup, t.destination, live === 'fresh' ? 0.58 : 0.42)
  const mins = t.startedAt ? Math.max(0, Math.floor((Date.now() - t.startedAt) / 60000)) : 0
  const banner = !c.online ? <Notice kind="warning">You’re offline. Showing the last confirmed ride status. Completing the ride will be saved on this device and sent when you reconnect.</Notice>
    : t.loc === 'stale' ? <Notice kind="warning">Location hasn’t updated recently. Last known location at {clock(t.locAt)}.</Notice>
    : t.loc === 'unavailable' ? <Notice kind="warning">Location is unavailable. Ride status and help are still available.</Notice> : null
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="relative flex-shrink-0">
        <MiniMap height="clamp(130px, 32dvh, 300px)" pickup={t.pickup} destination={t.destination}
          rider={t.loc === 'unavailable' && c.online ? null : { ...pos, state: live === 'fresh' ? 'fresh' : 'stale' }}
          label={`Sample map. You are travelling from ${t.pickup.name} to ${t.destination.name} with ${t.req.name}. ${live === 'fresh' ? 'Location updated moments ago.' : `Last known location at ${clock(t.locAt)}.`}`} />
        <button type="button" onClick={c.sos} className="absolute flex items-center" style={{ right: r(12), top: r(12), minHeight: r(48), padding: `0 ${r(16)}`, gap: r(8), borderRadius: 999, background: '#fff', color: C.errText, fontWeight: 700, fontSize: r(16), border: `1.5px solid ${C.errBorder}` }}>
          <Ico name="sos" size={20} />SOS
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto" style={{ background: '#fff', borderRadius: `${r(24)} ${r(24)} 0 0`, marginTop: r(-16), position: 'relative', boxShadow: '0 -4px 16px rgba(16,24,40,.08)' }}>
        <div className="flex flex-col" style={{ padding: `${r(16)} max(${r(20)}, min(${r(24)}, 6vw)) ${r(24)}`, gap: r(14) }}>
          <div><Heading size={24}>Ride in progress</Heading><p style={{ fontSize: r(16), color: C.text, marginTop: r(4) }}>Heading to {t.destination.name}</p></div>
          <p role="status" style={{ fontSize: r(14), color: C.text2 }}>Started {t.startedAt ? clock(t.startedAt) : '—'} · {mins} min · location {live === 'fresh' ? 'updated moments ago' : 'not fresh'}</p>
          {banner}
          {t.completeState === 'saved-offline' && <Notice kind="warning">Completion saved on this device. It will be sent when you’re connected.</Notice>}
          {t.endState === 'saved-offline' && <Notice kind="warning">Your early-end request is saved on this device. It will be sent when you’re connected. The ride is still active.</Notice>}
          <Card><div className="flex items-center" style={{ gap: r(12) }}><Initials text={t.req.initials} size={44} /><div><p style={{ fontSize: r(16), fontWeight: 700, color: C.text }}>{t.req.name}</p><p style={{ fontSize: r(14), color: C.text2 }}>Buddy</p></div></div></Card>
          {t.share.on && <Notice kind="info">Sharing is on until {clock(t.share.expires)}.</Notice>}
          <Btn onClick={() => c.open('complete')}>Complete ride</Btn>
          <Btn variant="secondary" onClick={() => c.open('share')} icon={<Ico name="share" size={18} />}>Share trip</Btn>
          <Btn variant="text" onClick={() => c.open('options')}>Ride options</Btn>
        </div>
      </div>
    </div>
  )
}

// ── Summary ──────────────────────────────────────────────────────────────────

export function Summary({ c }: { c: RCtx }) {
  const t = c.s.cur
  if (!t || !t.req) return <NoRide c={c} />
  const early = t.status === 'ended-early'
  const rated = !!t.rating && t.rating !== 'skipped'
  const settle = t.settlement
  const set = (s: Trip['settlement'], msg: string) => { c.s.patchCur({ settlement: s }); c.say(msg) }
  return (
    <Screen gap={16} top={<TopRow onBack={() => c.root('my-trips')} />} footer={<>
      {rated ? <Btn onClick={() => c.root('my-trips')}>Back to My trips</Btn> : <>
        <Btn onClick={() => c.go('rate-co-rider')}>Rate your Buddy</Btn>
        <Btn variant="secondary" onClick={() => c.root('my-trips')}>Back to My trips</Btn></>}
      <Btn variant="text" onClick={() => c.open('help')}>Get help with this ride</Btn>
    </>}>
      <Heading size={26}>{early ? 'Ride ended early' : 'Ride complete'}</Heading>
      {early && <Notice kind="info">This ride ended before {t.destination.name}{t.endReason ? ` (${t.endReason})` : ''}. The estimated contribution doesn’t change automatically—agree any adjustment with your Buddy, or report a concern.</Notice>}
      <Card>
        <div className="flex flex-col" style={{ gap: r(10) }}>
          <KV k="Date" v={dayLabel(t.date)} />
          <KV k="Time" v={`${fmtTime(t.time)} – ${fmtTime(addMinutes(t.time, early ? 14 : 32))}`} />
          <RouteLine from={t.pickup.name} to={t.destination.name} />
          <KV k="Buddy" v={t.req.name} />
          <p style={{ fontSize: r(13), color: C.text2 }}>Route details are from the sample route, not GPS-measured.</p>
        </div>
      </Card>
      <Card>
        <H2>Fuel contribution</H2>
        <div className="flex flex-col" style={{ gap: r(8), marginTop: r(10) }}>
          <KV k="Estimated contribution" v={inr(t.amount)} /><KV k="Platform fee" v="₹0 during the pilot" /><KV k="You receive" v={inr(t.amount)} strong />
        </div>
        <div style={{ marginTop: r(10) }}><Para>Your Buddy pays you directly by cash or their own UPI app. ChaloRaahi doesn’t process or verify the transfer.</Para></div>
        <p role="status" style={{ fontSize: r(15), fontWeight: 600, marginTop: r(8), color: settle === 'issue' ? C.warnText : settle === 'cash' || settle === 'upi' ? C.okText : C.text2 }}>
          {settle === 'cash' ? 'You marked this as received in cash' : settle === 'upi' ? 'You marked this as received by UPI' : settle === 'notyet' ? 'You marked this as not received yet' : settle === 'issue' ? 'Payment issue reported' : 'Not marked yet'}
        </p>
        <div className="flex flex-col" style={{ gap: r(8), marginTop: r(10) }}>
          {settle === 'none' || settle === 'notyet' ? <>
            <Btn variant="secondary" onClick={() => set('cash', 'Saved. Marked as received in cash.')}>Received in cash</Btn>
            <Btn variant="secondary" onClick={() => set('upi', 'Saved. Marked as received by UPI.')}>Received by UPI</Btn>
            {settle === 'none' && <Btn variant="text" onClick={() => set('notyet', 'Saved. Marked as not received yet.')}>Not received yet</Btn>}
            <Btn variant="text" onClick={() => set('issue', 'Payment issue recorded.')}>Report a payment issue</Btn>
          </> : <Btn variant="text" onClick={() => set('none', 'Update cleared.')}>Change this update</Btn>}
        </div>
      </Card>
      {rated && <Para size={14}>You’ve rated this Buddy.</Para>}
    </Screen>
  )
}

// ── Rating ───────────────────────────────────────────────────────────────────

const TAGS = ['On time', 'Easy to find', 'Respectful', 'Had a helmet']

export function Rate({ c }: { c: RCtx }) {
  const t = c.s.cur
  const [stars, setStars] = useState(0)
  const [tags, setTags] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const later = useTimers()
  if (!t || !t.req) return <NoRide c={c} />
  if (done || (t.rating && t.rating !== 'skipped')) return (
    <Screen top={<TopRow onBack={() => c.root('my-trips')} />} center footer={<Btn onClick={() => c.root('my-trips')}>Back to My trips</Btn>}>
      <Ico name="check" size={40} color={C.okText} />
      <Heading center size={26}>{done ? 'Thanks for your feedback' : 'You’ve rated this ride'}</Heading>
      <Body center>Each ride can be rated once.</Body>
    </Screen>
  )
  const submit = () => {
    if (!stars) { setErr('Choose a star rating to submit.'); return }
    if (!c.online) { setErr('You’re offline. Your rating isn’t saved yet. Try again when connected.'); return }
    setBusy(true)
    later(() => {
      setBusy(false)
      if (c.s.proto.ratingFail) { setErr('We couldn’t save your rating. Nothing was lost—please try again.'); return }
      c.s.patchCur({ rating: { stars, tags, note: note.trim() } }); setDone(true)
    }, 700)
  }
  return (
    <Screen top={<TopRow onBack={c.back} />} gap={20} footer={<>
      <Btn loading={busy} onClick={submit}>Submit rating</Btn>
      <Btn variant="secondary" onClick={() => { c.s.patchCur({ rating: 'skipped' }); c.root('my-trips') }}>Skip for now</Btn>
      <Btn variant="text" onClick={() => c.go('report-r')}>Report a concern</Btn>
    </>}>
      <Heading size={26}>How was your ride with {t.req.name}?</Heading>
      <div className="flex flex-col" style={{ gap: r(8) }}>
        <Stars value={stars} onChange={n => { setStars(n); setErr('') }} />
        <p aria-live="polite" style={{ fontSize: r(14), color: stars ? C.text : C.text2 }}>{stars ? `${stars} out of 5 stars` : 'No rating selected'}</p>
        {err && <p role="alert" style={{ fontSize: r(14), color: C.errText }}>{err}</p>}
      </div>
      <div role="group" aria-label="What went well (optional)" className="flex flex-wrap" style={{ gap: r(8) }}>
        {TAGS.map(x => { const on = tags.includes(x); return (
          <button key={x} type="button" aria-pressed={on} onClick={() => setTags(v => on ? v.filter(y => y !== x) : [...v, x])} className="ob-chip"
            style={{ minHeight: r(48), padding: `0 ${r(16)}`, borderRadius: 999, fontSize: r(15), fontWeight: 600, background: on ? C.primary : '#fff', color: on ? '#fff' : C.text2, border: `1.5px solid ${on ? C.primary : C.input}` }}>{x}</button>) })}
      </div>
      <div className="flex flex-col" style={{ gap: r(8) }}>
        <label htmlFor="note" style={{ fontSize: r(14), fontWeight: 600, color: C.text }}>Note <span style={{ fontWeight: 400, color: C.text2 }}>(optional)</span></label>
        <textarea id="note" value={note} onChange={e => setNote(e.target.value)} rows={3} maxLength={300} className="ob-input" style={{ borderRadius: r(12), padding: r(14), fontSize: r(16), border: `1.5px solid ${C.input}`, minHeight: r(96) }} />
      </div>
    </Screen>
  )
}

// ── Cancelled ────────────────────────────────────────────────────────────────

export function Cancelled({ c }: { c: RCtx }) {
  const t = c.s.cur
  if (!t) return <NoRide c={c} />
  const byBuddy = t.cancelledBy === 'buddy'
  const parent = t.parentId ? c.s.trips.find(x => x.id === t.parentId) : null
  const reopen = () => {
    const seat = parent ?? t
    if (parent) c.s.patchTrip(parent.id, { status: 'published', accepting: true, occ: { ...parent.occ, [t.date]: 'open' } })
    else c.s.patchTrip(t.id, { status: 'published', accepting: true, req: null, cancelledBy: null, occ: { [t.date]: 'open' } })
    c.s.setTripId(seat.id); c.say('Your seat is open for requests again.'); c.root('tickets-list')
  }
  return (
    <Screen gap={16} top={<TopRow onBack={() => c.root('my-trips')} />} footer={byBuddy ? <>
      <Btn onClick={reopen}>Reopen this seat</Btn>
      <Btn variant="secondary" onClick={() => c.root('my-trips')}>Keep trip closed</Btn>
      <Btn variant="text" onClick={() => c.open('help')}>Get help</Btn>
    </> : <Btn onClick={() => c.root('my-trips')}>Back to My trips</Btn>}>
      <Heading size={26}>{byBuddy ? 'Your Buddy cancelled' : 'Ride cancelled'}</Heading>
      <Body>{byBuddy ? `Reason given: ${t.cancelReason || 'Not provided'}. Your seat was not reopened automatically.` : `Reason: ${t.cancelReason || 'Not provided'}.`}</Body>
      <Card><div className="flex flex-col" style={{ gap: r(10) }}><KV k="Date" v={dayLabel(t.date)} /><RouteLine from={t.pickup.name} to={t.destination.name} />{t.req && <KV k="Buddy" v={t.req.name} />}</div></Card>
      <LinkBtn onClick={() => { c.s.setDraftAll(draftFromTrip(t)); c.s.setEditingId(null); c.go('post-trip') }}>Plan another trip</LinkBtn>
    </Screen>
  )
}

// ── Report ───────────────────────────────────────────────────────────────────

export const REPORT_CATS = ['Buddy didn’t show up', 'Unsafe behaviour', 'Harassment or inappropriate behaviour', 'Pickup or route issue', 'Fuel-contribution disagreement', 'Something else']

export function Report({ c }: { c: RCtx }) {
  const t = c.s.cur
  const [cat, setCat] = useState('')
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [view, setView] = useState(false)
  const later = useTimers()
  if (!t) return <NoRide c={c} />
  const last = t.reports[0]
  const submit = () => {
    if (!cat) { setErr('Choose what happened to continue.'); return }
    if (!c.online) { setErr('You’re offline. Your details are kept here. Connect to submit.'); return }
    setErr(''); setBusy(true)
    later(() => {
      c.s.patchCur(x => ({ reports: [{ ref: `CR-${1342 + x.reports.length * 7}`, category: cat, details: text.trim(), at: Date.now(), status: 'Received, pending review' }, ...x.reports] }))
      setBusy(false); setSent(true); c.say('Report submitted.')
    }, 800)
  }
  if (sent && last) return (
    <Screen top={<TopRow onBack={c.back} />} gap={16} footer={<Btn onClick={() => c.back()}>Done</Btn>}>
      <Heading size={26}>Report submitted</Heading>
      <Card tone="ok"><div className="flex flex-col" style={{ gap: r(8) }}><KV k="Case reference" v={last.ref} /><KV k="Submitted" v={clock(last.at)} /><KV k="Status" v={last.status} /></div></Card>
      <LinkBtn onClick={() => setView(v => !v)}>View case</LinkBtn>
      {view && <Card><KV k="Category" v={last.category} />{last.details && <div style={{ marginTop: r(6) }}><Para>{last.details}</Para></div>}</Card>}
      <Para size={14}>Your report is saved to this ride. If you’re in danger, use Emergency help now.</Para>
    </Screen>
  )
  return (
    <Screen top={<TopRow onBack={c.back} />} gap={16} footer={<Btn loading={busy} onClick={submit}>Submit report</Btn>}>
      <Heading size={26}>What happened?</Heading>
      {reportCtx.note && <Notice kind="info">{reportCtx.note}</Notice>}
      <Notice kind="info">If you’re in danger, don’t wait. Use <button type="button" onClick={c.sos} style={{ fontWeight: 700, textDecoration: 'underline', minHeight: r(44) }}>Emergency help</button>.</Notice>
      <fieldset className="flex flex-col" style={{ gap: r(8), border: 0, padding: 0, minWidth: 0 }}>
        <legend className="sr-only">Report category</legend>
        {REPORT_CATS.map(o => (
          <label key={o} className="flex items-center" style={{ gap: r(12), minHeight: r(52), padding: `${r(6)} ${r(14)}`, borderRadius: r(12), border: `1.5px solid ${cat === o ? C.primary : C.divider}`, background: cat === o ? C.tint : '#fff' }}>
            <input type="radio" name="cat" checked={cat === o} onChange={() => { setCat(o); setErr('') }} style={{ width: r(22), height: r(22), accentColor: C.primary }} />
            <span style={{ fontSize: r(16), color: C.text }}>{o}</span>
          </label>
        ))}
      </fieldset>
      <div className="flex flex-col" style={{ gap: r(8) }}>
        <label htmlFor="details" style={{ fontSize: r(14), fontWeight: 600, color: C.text }}>Details <span style={{ fontWeight: 400, color: C.text2 }}>(optional)</span></label>
        <textarea id="details" value={text} onChange={e => setText(e.target.value)} rows={4} maxLength={500} className="ob-input" style={{ borderRadius: r(12), padding: r(14), fontSize: r(16), border: `1.5px solid ${C.input}`, minHeight: r(110) }} />
      </div>
      {err && <p role="alert" style={{ fontSize: r(14), color: C.errText }}>{err}</p>}
    </Screen>
  )
}
