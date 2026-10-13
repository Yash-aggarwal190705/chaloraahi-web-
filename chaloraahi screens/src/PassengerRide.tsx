import { reportCtx } from './SOSData'
import { useEffect, useState } from 'react'
import { Badge, Body, Btn, C, Heading, Ico, Notice, Screen, r } from './OnboardingUI'
import MiniMap, { pointOnRoute } from './PassengerMap'
import {
  SAMPLE_RIDER, addMinutes, agreedTime, dayLabel, draftFromRide, fmtDate, fmtTime, inr, stamp, type Msg, type Ride,
} from './PassengerData'
import { Card, Check, Ctx, H2, KV, Label, PageTop, RiderAvatar, RouteLine, StatusBadge, Stars, fmtWindow, days, useTimers } from './PassengerUI'

const riderOf = (x: Ride) => x.rider ?? SAMPLE_RIDER
export const departAt = (x: Ride) => agreedTime(x)
const arriveAt = (x: Ride) => addMinutes(agreedTime(x), 28)
const confirmedDate = (x: Ride) => Object.entries(x.occ).find(([, v]) => v === 'confirmed')?.[0] ?? x.date
const red: React.CSSProperties = { minHeight: 48, color: C.errText, fontWeight: 600, fontSize: '1rem', textDecoration: 'underline' }

function NoRide({ c }: { c: Ctx }) {
  return <Screen><Heading>Ride not found</Heading><Body>This ride isn’t available on this device.</Body><Btn onClick={() => c.root('my-rides')}>Go to My rides</Btn></Screen>
}

function RiderCard({ c, ride }: { c: Ctx; ride: Ride }) {
  const p = riderOf(ride)
  return (
    <Card>
      <div className="flex items-center" style={{ gap: r(14) }}>
        <RiderAvatar initials={p.initials} size={56} />
        <div className="min-w-0 flex-1">
          <p style={{ fontSize: r(18), fontWeight: 700, color: C.text }}>{p.name}</p>
          <p style={{ fontSize: r(14), color: C.text2 }}>VGU student · {p.rating ? `★ ${p.rating} · ${p.rides} rides` : 'New pilot'}</p>
        </div>
      </div>
      <button type="button" onClick={() => c.open('badge')} className="ob-btn flex items-center" style={{ minHeight: r(48), marginTop: r(8), gap: r(8), color: C.okText, fontWeight: 600, fontSize: r(14) }}>
        <Ico name="shield" size={18} />Pilot approved<span style={{ color: C.primary, textDecoration: 'underline', marginLeft: r(4) }}>What’s this?</span>
      </button>
    </Card>
  )
}

function VehicleCard({ ride }: { ride: Ride }) {
  const p = riderOf(ride)
  return (
    <Card>
      <div className="flex flex-col" style={{ gap: r(8) }}>
        <div className="flex items-center" style={{ gap: r(10) }}><Ico name="scooter" size={22} color={C.primary} /><H2>{p.vehicle}</H2></div>
        <KV k="Colour" v={p.color} /><KV k="Registration" v={p.reg} /><KV k="Helmet" v={p.helmets} />
      </div>
    </Card>
  )
}

function PickupCard({ c, ride }: { c: Ctx; ride: Ride }) {
  return (
    <Card>
      <div className="flex flex-col" style={{ gap: r(10) }}>
        <div className="flex items-center" style={{ gap: r(10) }}><Ico name="pin" size={22} color={C.primary} /><H2>Pickup</H2></div>
        <p style={{ fontSize: r(16), fontWeight: 600, color: C.text }}>{ride.pickup.name}</p>
        <p style={{ fontSize: r(14), color: C.text2 }}>{ride.pickupPoint.label}. {ride.pickupPoint.detail}.</p>
        {ride.pickupNote && <p style={{ fontSize: r(14), color: C.text2 }}>Your note: “{ride.pickupNote}”</p>}
        <KV k="Pickup time" v={`Around ${fmtTime(departAt(ride))}`} />
        <button type="button" onClick={() => c.open('directions')} className="ob-btn ob-btn-text self-start" style={{ minHeight: r(48), padding: 0, color: C.primary, fontWeight: 600, fontSize: r(16) }}>View map and directions</button>
      </div>
    </Card>
  )
}

// ── Confirmed ────────────────────────────────────────────────────────────────

export function Confirmed({ c }: { c: Ctx }) {
  const ride = c.s.cur
  if (!ride) return <NoRide c={c} />
  const d = confirmedDate(ride)
  return (
    <Screen gap={16} footer={<>
      <Btn onClick={() => c.go('rider-arriving')}>View pickup details</Btn>
      <Btn variant="secondary" onClick={() => c.open('messages')}>Send an update</Btn>
      <Btn variant="text" onClick={() => c.open('help')} icon={<Ico name="more" size={20} />}>More options</Btn>
    </>}>
      <div className="flex flex-col" style={{ gap: r(10) }}>
        <div><Badge kind="ok">Confirmed</Badge></div>
        <Heading size={26}>Your ride is confirmed</Heading>
      </div>
      <Card tone="ok">
        <p style={{ fontSize: r(18), fontWeight: 700, color: C.text }}>{dayLabel(d)}</p>
        <p style={{ fontSize: r(16), color: C.text }}>Pickup around {fmtTime(departAt(ride))} · window {fmtWindow(ride)}</p>
        <div style={{ marginTop: r(12) }}><RouteLine from={ride.pickup.name} to={ride.destination.name} /></div>
      </Card>
      <RiderCard c={c} ride={ride} />
      <VehicleCard ride={ride} />
      <PickupCard c={c} ride={ride} />
      <Card tone="tint">
        <KV k="Agreed fuel contribution" v={inr(ride.amount)} strong />
        <p style={{ fontSize: r(14), color: C.text2, marginTop: r(8) }}>Settle directly with your pilot by cash or your own UPI app after the ride. The amount doesn’t change automatically.</p>
      </Card>
      {ride.mode === 'weekly' && <Body size={14}>This is one date in your recurring schedule. Other dates need their own pilot acceptance.</Body>}
    </Screen>
  )
}

// ── Messaging ────────────────────────────────────────────────────────────────

export const PRESETS = ['I’m at the pickup point', 'I’m running a few minutes late', 'Please check the pickup landmark']

export function sendMsg(c: Ctx, ride: Ride, text: string, retryId?: number) {
  const id = retryId ?? Date.now()
  const msg: Msg = { id, text, state: 'sending', at: Date.now() }
  c.s.patchRide(ride.id, x => ({ msgs: retryId ? x.msgs.map(m => m.id === id ? { ...m, state: 'sending' as const } : m) : [msg, ...x.msgs].slice(0, 5) }))
  const ok = c.online && c.s.proto.message === 'ok'
  window.setTimeout(() => {
    c.s.patchRide(ride.id, x => ({ msgs: x.msgs.map(m => m.id === id ? { ...m, state: ok ? 'sent' as const : 'failed' as const, at: Date.now() } : m) }))
    c.say(ok ? 'Update sent.' : 'Update not sent. You can retry.')
  }, 800)
}

export function MessagePanel({ c, ride }: { c: Ctx; ride: Ride }) {
  return (
    <div className="flex flex-col" style={{ gap: r(10) }}>
      <div role="group" aria-label="Quick updates" className="flex flex-col" style={{ gap: r(8) }}>
        {PRESETS.map(t => (
          <button key={t} type="button" onClick={() => sendMsg(c, ride, t)} className="ob-btn ob-btn-secondary flex items-center" style={{ minHeight: r(52), gap: r(10), padding: `0 ${r(16)}`, borderRadius: r(12), border: `1.5px solid ${C.input}`, color: C.text, fontWeight: 600, fontSize: r(16), textAlign: 'left' }}>
            <Ico name="send" size={18} color={C.primary} />{t}
          </button>
        ))}
      </div>
      <p style={{ fontSize: r(13), color: C.text3 }}>Preset updates only. No chat or phone numbers are shared.</p>
      {ride.msgs.length > 0 && (
        <ul aria-label="Sent updates" className="flex flex-col" style={{ gap: r(6) }}>
          {ride.msgs.map(m => (
            <li key={m.id} className="flex items-center justify-between" style={{ gap: r(8), minHeight: r(44), fontSize: r(14), color: C.text }}>
              <span style={{ overflowWrap: 'anywhere' }}>{m.text}</span>
              <span className="flex items-center flex-shrink-0" style={{ gap: r(6), color: m.state === 'failed' ? C.errText : C.text2 }}>
                {m.state === 'sending' ? 'Sending…' : m.state === 'sent' ? `Sent ${stamp(m.at)}` : 'Not sent'}
                {m.state === 'failed' && <button type="button" onClick={() => sendMsg(c, ride, m.text, m.id)} style={{ minHeight: r(44), padding: `0 ${r(8)}`, color: C.primary, fontWeight: 600, textDecoration: 'underline' }}>Retry<span className="sr-only">: {m.text}</span></button>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Meetup ───────────────────────────────────────────────────────────────────

export function Meetup({ c }: { c: Ctx }) {
  const ride = c.s.cur
  if (!ride) return <NoRide c={c} />
  const onWay = ride.status === 'on-the-way'
  const fresh = onWay && ride.loc === 'fresh' && ride.onWayAt
  const mins = fresh ? Math.max(1, 6 - Math.floor((Date.now() - ride.onWayAt!) / 60000)) : 0
  const p = riderOf(ride)
  return (
    <Screen top={!onWay ? <PageTop back={c.back} /> : undefined} gap={16}
      footer={<>
        <Btn onClick={() => c.open('directions')}>View meeting point</Btn>
        {onWay && <Btn variant="text" onClick={() => c.s.patchCur({ status: 'at-pickup' })}>We’ve met — check pilot and vehicle</Btn>}
      </>}>
      <div className="flex flex-col" style={{ gap: r(8) }}>
        <div><StatusBadge status={ride.status} /></div>
        <Heading size={26}>{onWay ? 'Your pilot is on the way' : 'Your ride is scheduled'}</Heading>
        {onWay ? (
          <>
            <Body color={C.text}>{fresh ? <strong>Arrives in {mins} min</strong> : <>Agreed pickup time: <strong>{fmtTime(departAt(ride))}</strong></>}</Body>
            <Body size={14}>{ride.loc === 'fresh' ? `Update from ${p.name.split(' ')[0]}’s shared location at ${stamp(ride.locAt)}.` : ride.loc === 'stale' ? `Location hasn’t updated recently. Last update at ${stamp(ride.locAt)}.` : 'Live location is unavailable. Use the agreed pickup time.'}</Body>
          </>
        ) : (
          <Body>{dayLabel(ride.date)} · pickup around {fmtTime(departAt(ride))}. We’ll show updates here when your pilot starts travelling.</Body>
        )}
      </div>
      {ride.pastDue && ride.noShow === 'none' && (
        <Notice kind="warning" action={<button type="button" onClick={() => c.open('no-show')} className="block" style={{ marginTop: r(6), minHeight: r(44), color: C.warnText, fontWeight: 600, textDecoration: 'underline' }}>Report that your pilot hasn’t arrived</button>}>
          It’s been over 10 minutes past the agreed time (prototype waiting policy). You can report that your pilot hasn’t arrived.
        </Notice>
      )}
      {ride.noShow === 'reported' && <Notice kind="info"><strong>No-show report submitted.</strong> It’s pending review. This isn’t a finding against anyone.</Notice>}
      <PickupCard c={c} ride={ride} />
      <Card>
        <H2>Send an update</H2>
        <div style={{ marginTop: r(10) }}><MessagePanel c={c} ride={ride} /></div>
      </Card>
      <div className="flex items-center" style={{ gap: r(12) }}>
        <RiderAvatar initials={p.initials} size={44} />
        <div className="min-w-0"><p style={{ fontSize: r(16), fontWeight: 600, color: C.text }}>{p.name}</p><p style={{ fontSize: r(14), color: C.text2 }}>{p.color} {p.vehicle} · {p.reg}</p></div>
      </div>
      <button type="button" onClick={() => c.open('help')} className="ob-btn ob-btn-text self-start" style={{ minHeight: r(48), padding: 0, color: C.primary, fontWeight: 600, fontSize: r(16) }}>Help and safety</button>
    </Screen>
  )
}

// ── At pickup / start code ───────────────────────────────────────────────────

export function AtPickup({ c }: { c: Ctx }) {
  const ride = c.s.cur
  const later = useTimers()
  const both = !!ride && ride.ack.match && ride.ack.helmets
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!both) return
    setLoading(true); const t = window.setTimeout(() => setLoading(false), 650); return () => clearTimeout(t)
  }, [both])
  if (!ride) return <NoRide c={c} />
  const p = riderOf(ride)
  const ack = (k: 'match' | 'helmets', v: boolean) => c.s.patchCur(x => ({ ack: { ...x.ack, [k]: v } }))
  const refresh = () => { c.s.patchCur({ code: 'refreshing' }); later(() => c.s.patchCur(x => ({ code: 'ready', codeValue: x.codeValue === '4719' ? '5832' : '4719' })), 900) }
  const code = ride.code
  return (
    <Screen top={<PageTop back={c.back} right={<button type="button" onClick={c.sos} className="flex items-center" style={{ minHeight: r(48), gap: r(6), padding: `0 ${r(12)}`, color: C.errText, fontWeight: 700, fontSize: r(15) }}><Ico name="sos" size={18} />Emergency help</button>} />} gap={16}>
      <Heading size={26}>Meet your pilot</Heading>
      <Body>Check the person and vehicle before sharing your start code.</Body>
      <Card>
        <div className="flex items-center" style={{ gap: r(14) }}>
          <RiderAvatar initials={p.initials} size={64} />
          <div className="min-w-0"><p style={{ fontSize: r(20), fontWeight: 700, color: C.text }}>{p.name}</p>
            <p style={{ fontSize: r(15), color: C.text2 }}>{p.color} {p.vehicle}</p>
            <p style={{ fontSize: r(16), fontWeight: 600, color: C.text, letterSpacing: '0.02em' }}>{p.reg}</p></div>
        </div>
        <div style={{ marginTop: r(12) }}><KV k="Pickup" v={ride.pickupPoint.label} /></div>
      </Card>
      <div className="flex flex-col" style={{ gap: r(10) }}>
        <Check id="ack-match" checked={ride.ack.match} onChange={v => ack('match', v)} label="The pilot and vehicle match these details." />
        <Check id="ack-helmets" checked={ride.ack.helmets} onChange={v => ack('helmets', v)} label="We both have helmets for this ride." />
      </div>
      <button type="button" onClick={() => c.open('mismatch')} className="ob-btn self-start" style={{ minHeight: r(48), padding: `0 ${r(4)}`, color: C.errText, fontWeight: 600, fontSize: r(16), textDecoration: 'underline' }}>Something doesn’t match</button>

      {!both ? <Notice kind="info">Tick both checks to show your start code.</Notice> : !c.online ? (
        <Notice kind="warning">Connect to verify the start of this ride. Help and cancellation are still available.</Notice>
      ) : (
        <section aria-labelledby="code-h" aria-busy={loading || code === 'refreshing'}>
          <Card tone="tint">
            <div className="flex flex-col items-center text-center" style={{ gap: r(10) }}>
              <Label>Sample code · prototype only</Label>
              <h2 id="code-h" style={{ fontSize: r(16), fontWeight: 600, color: C.text }}>Your ride start code</h2>
              {loading || code === 'refreshing' ? (
                <div role="status" aria-label="Loading your start code" className="flex" style={{ gap: r(8) }}>{[0, 1, 2, 3].map(i => <div key={i} className="ob-skel" style={{ width: r(48), height: r(64), borderRadius: r(12), background: '#D5DBF5' }} />)}</div>
              ) : code === 'ready' || code === 'waiting' ? (
                <>
                  <p aria-label={`Start code ${ride.codeValue.split('').join(' ')}`} style={{ fontSize: r(48), fontWeight: 700, letterSpacing: '0.18em', color: C.pressed, fontVariantNumeric: 'tabular-nums', paddingLeft: '0.18em' }}>{ride.codeValue}</p>
                  <Body center>Share this code with your pilot only when you are together and ready to leave.</Body>
                  <Body center size={14}>Your pilot enters this code to start the ride.</Body>
                  <p role="status" style={{ fontSize: r(14), fontWeight: 600, color: C.text }}>{code === 'waiting' ? 'Your pilot is verifying the code…' : 'Waiting for your pilot to verify.'}</p>
                </>
              ) : code === 'expired' ? (
                <><Notice kind="warning">This code expired. Get a new one to continue.</Notice><Btn onClick={refresh}>Get a new code</Btn></>
              ) : code === 'unavailable' ? (
                <Notice kind="warning">Verification is unavailable right now. Wait together at the pickup point, or get help. The ride hasn’t started.</Notice>
              ) : (
                <Notice kind="error">Too many incorrect attempts, so start verification is paused. Don’t start the ride. Get help or cancel the booking.</Notice>
              )}
            </div>
          </Card>
        </section>
      )}
      <p style={{ fontSize: r(13), color: C.text3 }}>Your code is never sent in notifications, share links or history. Only your pilot’s verified entry starts the ride.</p>
      <button type="button" onClick={() => c.open('cancel')} className="ob-btn ob-btn-text" style={red}>Cancel booking</button>
    </Screen>
  )
}

// ── Active ride ──────────────────────────────────────────────────────────────

export function Active({ c }: { c: Ctx }) {
  const ride = c.s.cur
  const [open, setOpen] = useState(true)
  if (!ride) return <NoRide c={c} />
  const p = riderOf(ride)
  const live = c.online ? ride.loc : 'stale'
  const t = live === 'fresh' ? 0.58 : 0.42
  const pos = pointOnRoute(ride.pickup, ride.destination, t)
  const banner = !c.online
    ? <Notice kind="warning">Reconnecting. Showing the last confirmed ride status.</Notice>
    : ride.loc === 'stale' ? <Notice kind="warning">Location hasn’t updated recently. Last known location at {stamp(ride.locAt)}. If you’re worried, use Emergency help.</Notice>
    : ride.loc === 'unavailable' ? <Notice kind="warning">Live location is unavailable. Your ride status, pilot details and help are still available.</Notice> : null
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="relative flex-shrink-0">
        <MiniMap height="clamp(140px, 36dvh, 320px)"
          label={`Sample map. ${p.name} is ${live === 'fresh' ? 'travelling' : 'last seen'} between ${ride.pickup.name} and ${ride.destination.name}. ${live === 'fresh' ? 'Location updated 12 seconds ago, accuracy about 15 metres.' : `Last known location at ${stamp(ride.locAt)}.`}`}
          pickup={ride.pickup} destination={ride.destination}
          rider={ride.loc === 'unavailable' && c.online ? null : { ...pos, state: live === 'fresh' ? 'fresh' : 'stale' }} />
        <button type="button" onClick={c.sos} className="absolute flex items-center" style={{ right: r(12), top: r(12), minHeight: r(48), padding: `0 ${r(16)}`, gap: r(8), borderRadius: 999, background: '#fff', color: C.errText, fontWeight: 700, fontSize: r(16), border: `2px solid ${C.errText}`, boxShadow: '0 2px 8px rgba(16,24,40,.2)' }}>
          <Ico name="sos" size={20} />SOS
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto" style={{ background: '#fff', borderRadius: `${r(24)} ${r(24)} 0 0`, marginTop: r(-16), position: 'relative', boxShadow: '0 -4px 16px rgba(16,24,40,.08)' }}>
        <div className="flex flex-col" style={{ padding: `${r(16)} max(${r(20)}, min(${r(24)}, 6vw)) max(1.5rem, env(safe-area-inset-bottom))`, gap: r(14) }}>
          <div className="flex items-start justify-between" style={{ gap: r(8) }}>
            <div className="min-w-0">
              <Heading size={24}>Ride in progress</Heading>
              <p style={{ fontSize: r(16), color: C.text, marginTop: r(4) }}>Heading to {ride.destination.name}</p>
            </div>
            <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls="ride-more" className="ob-icon-btn flex items-center justify-center flex-shrink-0" style={{ width: r(48), height: r(48), borderRadius: 999 }}>
              <Ico name={open ? 'chevdown' : 'chevup'} size={22} /><span className="sr-only">{open ? 'Hide ride details' : 'Show ride details'}</span>
            </button>
          </div>
          <p style={{ fontSize: r(16), fontWeight: 600, color: C.text }}>Estimated arrival: {fmtTime(arriveAt(ride))}</p>
          {!banner && <p role="status" style={{ fontSize: r(14), color: C.text2 }}>Location updated 12 seconds ago · accuracy about 15 m <span style={{ color: C.text3 }}>(sample)</span></p>}
          {banner}
          {ride.endState === 'saved-offline' && <Notice kind="warning">End request saved on this device. Waiting for connection.</Notice>}
          {ride.endState === 'requested' && <Notice kind="info">{c.s.proto.end === 'uncertain' ? 'We’re not sure your pilot received the end request. The ride is still active. Check again shortly or use Emergency help.' : 'End request sent. Waiting for your pilot to acknowledge. The ride stays active until then.'}</Notice>}
          <div id="ride-more" hidden={!open} className="flex flex-col" style={{ gap: r(14) }}>
            <Card>
              <div className="flex items-center" style={{ gap: r(12) }}>
                <RiderAvatar initials={p.initials} size={48} />
                <div className="min-w-0 flex-1"><p style={{ fontSize: r(16), fontWeight: 700, color: C.text }}>{p.name}</p><p style={{ fontSize: r(14), color: C.text2 }}>{p.color} {p.vehicle} · {p.reg}</p></div>
              </div>
            </Card>
            {ride.share.on && <Notice kind="info">Sharing is on until {stamp(ride.share.expires)}.</Notice>}
          </div>
          <Btn onClick={() => c.open('complete')}>I’ve reached my destination</Btn>
          <Btn variant="secondary" onClick={() => c.open('share')} icon={<Ico name="share" size={18} />}>Share trip</Btn>
          <Btn variant="text" onClick={() => c.open('options')}>Ride options</Btn>
          <Label>Location freshness thresholds are a prototype assumption.</Label>
        </div>
      </div>
    </div>
  )
}

// ── Summary ──────────────────────────────────────────────────────────────────

export function Summary({ c }: { c: Ctx }) {
  const ride = c.s.cur
  if (!ride) return <NoRide c={c} />
  const early = ride.status === 'ended-early'
  const p = riderOf(ride)
  const rated = ride.rating && ride.rating !== 'skipped'
  const settle = ride.settlement
  return (
    <Screen gap={16} footer={<>
      {rated ? <Btn onClick={() => c.root('my-rides')}>Back to My rides</Btn> : <>
        <Btn onClick={() => c.go('rate-rider')}>Rate your ride</Btn>
        <Btn variant="secondary" onClick={() => c.root('my-rides')}>Back to My rides</Btn></>}
      <Btn variant="text" onClick={() => c.open('help')}>Get help with this ride</Btn>
    </>}>
      <div className="flex flex-col" style={{ gap: r(10) }}>
        <div>{early ? <Badge kind="err">Ended early</Badge> : <Badge kind="ok">Completed</Badge>}</div>
        <Heading size={26}>{early ? 'Ride ended early' : 'Ride complete'}</Heading>
      </div>
      {early && <Notice kind="info">This ride ended before {ride.destination.name}. The agreed contribution doesn’t change automatically. Talk to your pilot about any adjustment, or report a concern.</Notice>}
      {ride.summaryVariant === 'awaiting-confirmation' && <Notice kind="warning">Waiting for your pilot to confirm the ride is complete. You can still rate it.</Notice>}
      {ride.summaryVariant === 'under-review' && <Notice kind="warning">The amount is under review. Your agreed contribution of {inr(ride.amount)} hasn’t changed.</Notice>}
      <Card>
        <div className="flex flex-col" style={{ gap: r(10) }}>
          <KV k="Date and time" v={`${fmtDate(confirmedDate(ride))}, ${fmtTime(departAt(ride))} – ${fmtTime(early ? addMinutes(departAt(ride), 12) : arriveAt(ride))}`} />
          <div style={{ height: 1, background: C.divider }} />
          <RouteLine from={ride.pickup.name} to={ride.destination.name} />
          <div style={{ height: 1, background: C.divider }} />
          <KV k="Pilot" v={p.name} /><KV k="Vehicle" v={`${p.color} ${p.vehicle}, ${p.reg}`} />
          <KV k="Shared distance" v={early ? '6.1 km' : '14.2 km'} />
          <p style={{ fontSize: r(13), color: C.text3 }}>From the sample route (simulated), not GPS-measured.</p>
        </div>
      </Card>
      <Card>
        <H2>Fuel contribution</H2>
        <div className="flex flex-col" style={{ gap: r(8), marginTop: r(10) }}>
          <KV k="Agreed contribution" v={inr(ride.amount)} /><KV k="Platform fee" v="₹0 — pilot" />
          <div style={{ height: 1, background: C.divider }} />
          <KV k="Total" v={inr(ride.amount)} strong />
        </div>
        <p style={{ fontSize: r(15), color: C.text, marginTop: r(12) }}>Settle directly with your pilot by cash or your own UPI app.</p>
        <p role="status" style={{ fontSize: r(15), fontWeight: 600, marginTop: r(8), color: settle === 'issue' ? C.warnText : settle === 'paid' ? C.okText : C.text2 }}>
          {settle === 'paid' ? 'You marked this as paid' : settle === 'issue' ? 'Payment issue reported' : 'Not marked as paid'}
        </p>
        <div className="flex flex-col" style={{ gap: r(8), marginTop: r(10) }}>
          {settle === 'none' ? <>
            <Btn variant="secondary" onClick={() => { c.s.patchCur({ settlement: 'paid' }); c.say('Saved. You marked this ride as paid.') }}>Mark as paid</Btn>
            <Btn variant="text" onClick={() => { c.s.patchCur({ settlement: 'issue' }); c.say('Payment issue recorded.') }}>Report a payment issue</Btn>
          </> : <Btn variant="text" onClick={() => c.s.patchCur({ settlement: 'none' })}>Change this update</Btn>}
        </div>
        <p style={{ fontSize: r(13), color: C.text3, marginTop: r(8) }}>This records your update. ChaloRaahi does not verify the transfer.</p>
      </Card>
      {rated && <Body size={14}>You’ve rated this ride.</Body>}
    </Screen>
  )
}

// ── Rating ───────────────────────────────────────────────────────────────────

const TAGS = ['On time', 'Clear pickup instructions', 'Considerate', 'Comfortable ride']

export function Rate({ c }: { c: Ctx }) {
  const ride = c.s.cur
  const [stars, setStars] = useState(0)
  const [tags, setTags] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)
  if (!ride) return <NoRide c={c} />
  const p = riderOf(ride)
  if (done || (ride.rating && ride.rating !== 'skipped')) {
    const rt = ride.rating && ride.rating !== 'skipped' ? ride.rating : null
    return (
      <Screen top={<PageTop back={() => c.root('my-rides')} />} center footer={<Btn onClick={() => c.root('my-rides')}>Back to My rides</Btn>}>
        <Ico name="check" size={40} color={C.okText} />
        <Heading center size={26}>{done ? 'Thanks for your feedback.' : 'You’ve rated this ride'}</Heading>
        {rt && <Stars value={rt.stars} readOnly />}
        <Body center>Each ride can be rated once.</Body>
      </Screen>
    )
  }
  const submit = () => {
    if (!stars) { setErr('Choose a star rating to submit.'); return }
    if (!c.online) { setErr('You’re offline. Your rating isn’t saved yet. Try again when connected.'); return }
    c.s.patchCur({ rating: { stars, tags, note: note.trim() } }); setDone(true)
  }
  return (
    <Screen top={<PageTop back={c.back} />} gap={20} footer={<>
      <Btn onClick={submit}>Submit rating</Btn>
      <Btn variant="secondary" onClick={() => { c.s.patchCur({ rating: 'skipped' }); c.root('my-rides') }}>Skip for now</Btn>
      <Btn variant="text" onClick={() => c.go('report')}>Report a concern</Btn>
    </>}>
      <Heading size={26}>How was your ride with {p.name}?</Heading>
      <div className="flex flex-col" style={{ gap: r(8) }}>
        <Stars value={stars} onChange={n => { setStars(n); setErr('') }} />
        <p aria-live="polite" style={{ fontSize: r(14), color: stars ? C.text : C.text3 }}>{stars ? `${stars} out of 5 stars` : 'No rating selected'}</p>
        {err && <p role="alert" style={{ fontSize: r(14), color: C.errText }}>{err}</p>}
      </div>
      <div role="group" aria-label="What went well (optional)" className="flex flex-wrap" style={{ gap: r(8) }}>
        {TAGS.map(t => { const on = tags.includes(t); return (
          <button key={t} type="button" aria-pressed={on} onClick={() => setTags(x => on ? x.filter(y => y !== t) : [...x, t])} className="ob-chip"
            style={{ minHeight: r(48), padding: `0 ${r(16)}`, borderRadius: 999, fontSize: r(15), fontWeight: 600, background: on ? C.primary : '#fff', color: on ? '#fff' : C.text2, border: `1.5px solid ${on ? C.primary : C.input}` }}>{t}</button>) })}
      </div>
      <div className="flex flex-col" style={{ gap: r(8) }}>
        <label htmlFor="note" style={{ fontSize: r(14), fontWeight: 600, color: C.text }}>Anything else you’d like to share?</label>
        <textarea id="note" value={note} onChange={e => setNote(e.target.value)} rows={3} maxLength={300} aria-describedby="note-h" className="ob-input"
          style={{ borderRadius: r(12), padding: r(14), fontSize: r(16), border: `1.5px solid ${C.input}`, resize: 'vertical', minHeight: r(96) }} />
        <p id="note-h" style={{ fontSize: r(14), color: C.text2 }}>Avoid including phone numbers or other personal information.</p>
      </div>
    </Screen>
  )
}

// ── Cancelled / expired ──────────────────────────────────────────────────────

export function Cancelled({ c }: { c: Ctx }) {
  const ride = c.s.cur
  const [details, setDetails] = useState(false)
  if (!ride) return <NoRide c={c} />
  const expired = ride.status === 'expired'
  const byPilot = ride.cancelledBy === 'rider'
  const restart = (focusDate?: boolean) => {
    c.s.setDraft(draftFromRide(ride)); c.s.setEditingId(null); c.go('ticket-form')
    if (focusDate) window.setTimeout(() => document.getElementById(ride.mode === 'weekly' ? 'start' : 'date')?.focus(), 80)
  }
  return (
    <Screen gap={16} footer={
      expired ? <>
        <Btn onClick={() => restart()}>Plan another ride</Btn>
        <Btn variant="secondary" onClick={() => setDetails(d => !d)}>{details ? 'Hide request details' : 'View request details'}</Btn>
      </> : byPilot ? <>
        <Btn onClick={() => restart()}>Create another request</Btn>
        <Btn variant="secondary" onClick={() => restart(true)}>Change date or time</Btn>
        <Btn variant="text" onClick={() => c.open('help')}>Get help</Btn>
      </> : <Btn onClick={() => c.root('my-rides')}>Back to My rides</Btn>
    }>
      <div><StatusBadge status={ride.status} /></div>
      <Heading size={26}>{expired ? 'This request expired' : byPilot ? 'Your pilot cancelled' : ride.mode === 'weekly' ? 'Schedule ended' : 'Ride cancelled'}</Heading>
      <Body>{expired ? 'No pilot accepted before this request expired.' : byPilot ? `Reason given: ${ride.cancelReason || 'Not provided'}. Your ride wasn’t republished.` : `Reason: ${ride.cancelReason || 'Not provided'}. No cancellation fee applies.`}</Body>
      {(expired || byPilot) && <Body size={14}>{expired ? 'Your route and times can be a starting point, but a new request only goes out when you publish it.' : 'Nothing is created automatically. A new request only goes out when you publish it.'}</Body>}
      {(details || !expired) && (
        <Card>
          <div className="flex flex-col" style={{ gap: r(10) }}>
            <KV k="Date" v={dayLabel(ride.date)} /><KV k="Window" v={`${fmtWindow(ride)} IST`} />
            <RouteLine from={ride.pickup.name} to={ride.destination.name} />
            {ride.mode === 'weekly' && <KV k="Repeats" v={days(ride.days)} />}
          </div>
        </Card>
      )}
    </Screen>
  )
}

// ── Report ───────────────────────────────────────────────────────────────────

export const REPORT_CATS = ['Pilot or vehicle did not match', 'Unsafe riding', 'Harassment or inappropriate behaviour', 'Pickup or route issue', 'Fuel-contribution disagreement', 'Something else']

export function ReportScreen({ c }: { c: Ctx }) {
  const ride = c.s.cur
  const [cat, setCat] = useState('')
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [view, setView] = useState(false)
  const [sent, setSent] = useState(false)
  const later = useTimers()
  if (!ride) return <NoRide c={c} />
  const last = ride.reports[0]
  const submit = () => {
    if (!cat) { setErr('Choose what happened to continue.'); return }
    if (!c.online) { setErr('You’re offline. Your details are kept here. Connect to submit.'); return }
    setErr(''); setBusy(true)
    later(() => {
      c.s.patchCur(x => ({ reports: [{ ref: `CR-${String(1000 + x.reports.length * 7 + 342)}`, category: cat, at: Date.now(), status: 'Received — pending review' }, ...x.reports] }))
      setBusy(false); setSent(true); c.say('Report submitted.')
    }, 800)
  }
  if (sent && last) {
    return (
      <Screen top={<PageTop back={c.back} />} gap={16} footer={<><Btn onClick={() => c.back()}>Done</Btn></>}>
        <Heading size={26}>Report submitted</Heading>
        <Card tone="ok">
          <div className="flex flex-col" style={{ gap: r(8) }}>
            <KV k="Case reference" v={last.ref} /><KV k="Submitted" v={`${fmtDate(new Date().toISOString().slice(0, 10))}, ${stamp(last.at)}`} /><KV k="Status" v={last.status} />
          </div>
        </Card>
        <button type="button" onClick={() => setView(v => !v)} aria-expanded={view} className="ob-btn ob-btn-text self-start" style={{ minHeight: r(48), padding: 0, color: C.primary, fontWeight: 600, fontSize: r(16) }}>View report</button>
        {view && <Card><KV k="Category" v={last.category} /></Card>}
        <Body size={14}>Your report is saved to this ride. If you’re in danger, use Emergency help now.</Body>
        <button type="button" onClick={c.sos} className="ob-btn ob-btn-text self-start" style={{ ...red, textDecoration: 'underline' }}>Emergency help</button>
      </Screen>
    )
  }
  return (
    <Screen top={<PageTop back={c.back} />} gap={16} footer={<Btn loading={busy} onClick={submit}>Submit report</Btn>}>
      <Heading size={26}>What happened?</Heading>
      {reportCtx.note && <Notice kind="info">{reportCtx.note}</Notice>}
      <Notice kind="info">If you’re in danger, don’t wait. Use <button type="button" onClick={c.sos} style={{ fontWeight: 700, textDecoration: 'underline', minHeight: r(44) }}>Emergency help</button>.</Notice>
      <fieldset className="flex flex-col" style={{ gap: r(8), border: 0, padding: 0, minWidth: 0 }}>
        <legend className="sr-only">Report category</legend>
        {REPORT_CATS.map(o => (
          <label key={o} className="ob-check flex items-center" style={{ gap: r(12), minHeight: r(52), padding: `0 ${r(14)}`, borderRadius: r(12), border: `1.5px solid ${cat === o ? C.primary : C.divider}`, background: cat === o ? C.tint : '#fff', cursor: 'pointer' }}>
            <input type="radio" name="cat" checked={cat === o} onChange={() => { setCat(o); setErr('') }} style={{ width: r(22), height: r(22), accentColor: C.primary }} />
            <span style={{ fontSize: r(16), color: C.text }}>{o}</span>
          </label>
        ))}
      </fieldset>
      <div className="flex flex-col" style={{ gap: r(8) }}>
        <label htmlFor="details" style={{ fontSize: r(14), fontWeight: 600, color: C.text }}>Details <span style={{ fontWeight: 400, color: C.text3 }}>(optional)</span></label>
        <textarea id="details" value={text} onChange={e => setText(e.target.value)} rows={4} maxLength={500} className="ob-input"
          style={{ borderRadius: r(12), padding: r(14), fontSize: r(16), border: `1.5px solid ${C.input}`, minHeight: r(110) }} />
      </div>
      {err && <p role="alert" className="flex items-start" style={{ gap: 6, fontSize: r(14), color: C.errText }}><Ico name="alert" size={16} />{err}</p>}
    </Screen>
  )
}

// ── Share viewer (internal preview of what a trusted contact sees) ───────────

export function ShareViewer({ c }: { c: Ctx }) {
  const ride = c.s.cur
  const v = ride?.share.revoked ? 'revoked' : c.s.proto.viewer
  if (!ride) return <NoRide c={c} />
  const p = riderOf(ride)
  const pos = pointOnRoute(ride.pickup, ride.destination, v === 'active' ? 0.6 : 0.45)
  const msg = { active: 'This ride is in progress.', stale: 'Location hasn’t updated recently. Showing the last known location.', ended: 'This ride has ended. Location sharing has stopped.',
    expired: 'This link has expired.', revoked: 'The rider stopped sharing this ride.' }[v]
  const hidden = v === 'expired' || v === 'revoked'
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div style={{ padding: `${r(8)} ${r(12)}`, background: C.warnBg, borderBottom: `1px solid ${C.warnBorder}`, color: C.warnText, fontSize: r(13), fontWeight: 600 }} className="flex items-center justify-between">
        <span>Internal preview of the shared link</span>
        <button type="button" onClick={c.back} style={{ minHeight: r(44), padding: `0 ${r(8)}`, textDecoration: 'underline' }}>Close</button>
      </div>
      <Screen gap={16}>
        <Heading size={24}>{hidden ? 'This link is no longer available' : `${p.name.split(' ')[0]}’s ride`}</Heading>
        <Notice kind={v === 'active' ? 'success' : 'warning'}>{msg}</Notice>
        {!hidden && (
          <>
            <div style={{ borderRadius: r(16), overflow: 'hidden' }}>
              <MiniMap height={200} label={`Sample map showing the shared ride from ${ride.pickup.name} to ${ride.destination.name}.`} pickup={ride.pickup} destination={ride.destination}
                rider={v === 'ended' ? null : { ...pos, state: v === 'active' ? 'fresh' : 'stale' }} />
            </div>
            <Card><div className="flex flex-col" style={{ gap: r(8) }}>
              <KV k="Pilot" v={p.name.split(' ')[0] + ' ' + p.name.split(' ')[1][0] + '.'} /><KV k="Vehicle" v={`${p.color} ${p.vehicle}`} />
              <KV k="From" v={ride.pickup.name} /><KV k="To" v={ride.destination.name} />
              <KV k="Status" v={v === 'ended' ? 'Ended' : 'In progress'} />
            </div></Card>
          </>
        )}
        <Body size={14}>Not shown: ID documents, phone numbers, start code, other rides, reports or home address.</Body>
      </Screen>
    </div>
  )
}
