import { useEffect, useState } from 'react'
import { Body, Btn, C, Field, Heading, Ico, Notice, Screen, TopRow, r } from './OnboardingUI'
import MiniMap from './PassengerMap'
import {
  WEEKDAYS, addDays, dayLabel, fmtDate, fmtTime, inr, nowTime, occurrenceDates, placeById, todayISO,
} from './PassengerData'
import { Card, Chip, H2, KV, Label, RadioList, RouteLine, Segmented, Row, Skel, days, useTimers } from './PassengerUI'
import {
  detourWords, draftFromTrip, fits, fmtKm, maskReg, newTDraft, screenForTrip, seatBooked, tripFromDraft, vehicleLine,
  type RCtx, type Req, type TDraft, type Trip,
} from './RiderData'
import { BuddyLine, Initials, LinkBtn, P, Para, Switch, TripBadge, clock, when } from './RiderUI'

const FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const fitCount = (c: RCtx, t: Trip) => t.status === 'published' && !seatBooked(t) ? c.s.reqs.filter(q => fits(t, q)).length : 0

// ── Trip card ────────────────────────────────────────────────────────────────

export function TripCard({ t, c, cta, h = 3 }: { t: Trip; c: RCtx; cta?: string; h?: 2 | 3 }) {
  const H = `h${h}` as 'h2' | 'h3'
  const n = fitCount(c, t)
  const seat = t.status === 'paused' ? 'Paused, not accepting requests' : t.req && t.status !== 'completed' && t.status !== 'ended-early' && t.status !== 'cancelled' ? `Seat booked · ${t.req.name}` : t.status === 'published' ? 'One seat open' : ''
  return (
    <Card>
      <div className="flex flex-col" style={{ gap: r(12) }}>
        <div className="flex items-start justify-between" style={{ gap: r(12) }}>
          <H style={{ fontSize: r(16), fontWeight: 700, color: C.text }}>{when(t)}</H>
          <TripBadge t={t} />
        </div>
        <RouteLine from={t.pickup.name} to={t.destination.name} />
        <div className="flex flex-col" style={{ gap: r(4), fontSize: r(14), color: C.text2 }}>
          <span className="flex items-center" style={{ gap: r(8) }}><Ico name="scooter" size={16} />{vehicleLine(c.s.vehicle) || 'Honda Activa 6G · White'}</span>
          {seat && <span className="flex items-center" style={{ gap: r(8) }}><Ico name="user" size={16} />{seat}</span>}
          {n > 0 && <span className="flex items-center" style={{ gap: r(8), color: C.pressed, fontWeight: 600 }}><Ico name="list" size={16} />{n} {n === 1 ? 'request fits' : 'requests fit'} this trip</span>}
        </div>
        <button type="button" onClick={() => c.openTrip(t)} className="ob-btn ob-btn-secondary" style={{ minHeight: r(48), borderRadius: r(12), border: `1.5px solid ${C.primary}`, color: C.primary, fontWeight: 600, fontSize: r(16) }}>
          {cta ?? 'View trip'}<span className="sr-only">, {when(t)}</span>
        </button>
      </div>
    </Card>
  )
}

// ── Home ─────────────────────────────────────────────────────────────────────

export function Home({ c }: { c: RCtx }) {
  const { s } = c
  const byDate = (a: Trip, b: Trip) => (a.date + a.time).localeCompare(b.date + b.time)
  const live = s.live
  const confirmed = s.upcoming.filter(t => t.status === 'confirmed').sort(byDate)[0]
  const pub = s.published.filter(t => t.status === 'published' || t.status === 'paused').sort(byDate)[0]
  const next = live ?? confirmed ?? pub
  const n = pub ? fitCount(c, pub) : 0
  const liveLabel = live ? (live.status === 'active' ? 'Ride in progress' : live.status === 'at-pickup' ? 'Meet your Buddy' : 'Heading to pickup') : ''
  return (
    <Screen gap={16}>
      <div style={{ paddingTop: r(16) }}><Heading size={26}>Your next commute</Heading></div>
      {live && (
        <Card tone="tint">
          <p style={{ fontSize: r(13), fontWeight: 700, color: C.pressed, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Active ride</p>
          <H2>{liveLabel}</H2>
          <div style={{ margin: `${r(10)} 0 ${r(14)}` }}><RouteLine from={live.pickup.name} to={live.destination.name} /></div>
          <Btn onClick={() => c.openTrip(live)}>Return to ride</Btn>
        </Card>
      )}
      {!live && next && (
        <>
          <TripCard t={next} c={c} h={2} cta={next.status === 'confirmed' ? 'View confirmed ride' : 'View trip'} />
          {next.status === 'published' || next.status === 'paused' ? (
            <Card>
              <Switch id="accepting" label="Accepting requests for this trip" checked={next.status === 'published'} hint={next.status === 'paused' ? 'Paused. Buddies can’t see this trip.' : undefined}
                onChange={v => { s.patchTrip(next.id, { status: v ? 'published' : 'paused', accepting: v }); c.say(v ? 'Accepting requests for this trip.' : 'Requests paused for this trip.') }} />
            </Card>
          ) : null}
        </>
      )}
      {!live && n > 0 && pub && (
        <Card tone="tint">
          <H2>{n} {n === 1 ? 'request fits' : 'requests fit'} your trip</H2>
          <div style={{ margin: `${r(6)} 0 ${r(12)}` }}>{P('Sorted by least detour. You choose who to accept.')}</div>
          <Btn onClick={() => { s.setTripId(pub.id); c.root('tickets-list') }}>Review requests</Btn>
        </Card>
      )}
      {!live && !next && (
        <Card>
          <div className="flex flex-col" style={{ gap: r(10) }}>
            <span className="flex items-center justify-center" style={{ width: r(48), height: r(48), borderRadius: 999, background: C.tint, color: C.primary }}><Ico name="calendar" size={24} /></span>
            <H2>No trips planned yet</H2>
            {P('Plan the commute you already make. Matching Buddies can then ask to share your seat.')}
            <Btn onClick={() => c.go('post-trip')}>Plan a trip</Btn>
          </div>
        </Card>
      )}
      {s.draft.touched && !s.editingId && (
        <Card tone="warn"><H2>You have an unfinished trip</H2><div style={{ margin: `${r(6)} 0 ${r(10)}` }}>{P('Your draft is saved on this device.')}</div><Btn variant="secondary" onClick={() => c.go('post-trip')}>Continue draft</Btn></Card>
      )}
      {(live || next) && <Btn variant="secondary" onClick={() => { s.setEditingId(null); c.go('post-trip') }}>Plan another trip</Btn>}
      {s.past.some(t => t.status === 'completed') && (
        <Row icon="list" title="My trips" sub="Upcoming and past" onClick={() => c.root('my-trips')} />
      )}
    </Screen>
  )
}

// ── Plan a trip ──────────────────────────────────────────────────────────────

const PlaceBtn = ({ label, name, sub, onClick, error }: { label: string; name: string; sub?: string; onClick: () => void; error?: string }) => (
  <div className="flex flex-col" style={{ gap: r(8) }}>
    <span style={{ fontSize: r(14), fontWeight: 600, color: C.text }}>{label}</span>
    <button type="button" onClick={onClick} aria-haspopup="dialog" className="ob-input flex items-center justify-between text-left" style={{ minHeight: r(56), padding: `${r(8)} ${r(16)}`, borderRadius: r(12), border: `1.5px solid ${error ? C.errText : C.input}`, background: '#fff', gap: r(8) }}>
      <span className="min-w-0"><span className="block" style={{ fontSize: r(16), color: name ? C.text : C.text3, fontWeight: 500, overflowWrap: 'anywhere' }}>{name || 'Choose a place'}</span>{sub && <span className="block" style={{ fontSize: r(13), color: C.text2 }}>{sub}</span>}</span>
      <Ico name="chevron" size={18} color={C.text3} />
    </button>
    {error && <p role="alert" style={{ fontSize: r(14), color: C.errText }}>{error}</p>}
  </div>
)

function validateDraft(d: TDraft, helmetOk: boolean) {
  const e: Record<string, string> = {}
  if (!d.pickup) e.pickup = 'Choose where you start.'
  if (!d.destination) e.dest = 'Choose where you’re going.'
  else if (d.pickup && d.pickup.id === d.destination.id) e.dest = 'Start and destination can’t be the same place.'
  const first = d.mode === 'one' ? d.date : d.startDate
  if (!first) e.date = 'Choose a date.'
  else if (first < todayISO()) e.date = 'Choose today or a later date.'
  if (!d.time) e.time = 'Choose a departure time.'
  else if (first === todayISO() && d.time <= nowTime()) e.time = 'That time has already passed. Choose a later time or date.'
  if (d.mode === 'weekly') {
    if (!d.days.some(Boolean)) e.days = 'Choose at least one day.'
    if (d.endDate < d.startDate) e.range = 'End date must be on or after the start date.'
    else if (d.days.some(Boolean) && !occurrenceDates({ mode: 'weekly', date: d.startDate, startDate: d.startDate, endDate: d.endDate, days: d.days }, 1).length) e.range = 'No selected day falls between these dates.'
  }
  if (d.helmet === 'spare' && !helmetOk) e.helmet = 'Your vehicle details say you can’t provide a helmet. Choose “Buddy brings their own” or update your vehicle.'
  return e
}

export function PlanTrip({ c }: { c: RCtx }) {
  const { s } = c
  const d = s.draft
  const [errs, setErrs] = useState<Record<string, string>>({})
  const helmetOk = s.vehicle.helmet !== 'no'
  const set = (p: Partial<TDraft>) => { s.setDraft(p); setErrs({}) }
  const next = () => {
    const e = validateDraft(d, helmetOk); setErrs(e)
    const first = Object.keys(e)[0]
    if (first) { window.setTimeout(() => document.getElementById(`pt-${first}`)?.focus(), 30); return }
    s.setPublishPhase('idle'); c.go('review-trip')
  }
  const weekly = d.mode === 'weekly'
  return (
    <Screen top={<TopRow onBack={c.back} />} gap={20} footer={<Btn onClick={next}>Review trip</Btn>}>
      <div className="flex flex-col" style={{ gap: r(8) }}>
        <Heading size={26}>{s.editingId ? 'Edit your trip' : 'Plan a trip'}</Heading>
        <Body>Offer a seat on a commute you already make.</Body>
      </div>
      {s.editingId && <Notice kind="info">Changes won’t alter rides that are already confirmed.</Notice>}
      {Object.keys(errs).length > 0 && <Notice kind="error">Check the highlighted fields.</Notice>}
      <section aria-labelledby="pt-route" className="flex flex-col" style={{ gap: r(14) }}>
        <H2 id="pt-route">Route</H2>
        <PlaceBtn label="From" name={d.pickup?.name ?? ''} sub={d.pickup ? `${d.pickupPoint?.label ?? ''}` : undefined} onClick={() => c.open('place', 'from')} error={errs.pickup} />
        <PlaceBtn label="To" name={d.destination?.name ?? ''} sub={d.destination?.locality} onClick={() => c.open('place', 'to')} error={errs.dest} />
      </section>
      <section aria-labelledby="pt-when" className="flex flex-col" style={{ gap: r(14) }}>
        <H2 id="pt-when">When</H2>
        <Segmented label="Trip frequency" value={d.mode} options={[['one', 'One time'], ['weekly', 'Repeat weekly']]} onChange={v => set({ mode: v })} />
        {!weekly ? (
          <Field id="pt-date" type="date" label="Date" min={todayISO()} value={d.date} error={errs.date} onChange={e => set({ date: e.target.value })} />
        ) : (
          <>
            <fieldset style={{ border: 0, padding: 0, minWidth: 0 }}>
              <legend style={{ fontSize: r(14), fontWeight: 600, color: C.text, marginBottom: r(8) }}>Repeat on</legend>
              <div className="flex flex-wrap" style={{ gap: r(8) }}>
                {WEEKDAYS.map((w, i) => <Chip key={w} on={d.days[i]} label={FULL[i]} onClick={() => set({ days: d.days.map((x, j) => j === i ? !x : x) })}>{w}</Chip>)}
              </div>
              {errs.days && <p id="pt-days" tabIndex={-1} role="alert" style={{ fontSize: r(14), color: C.errText, marginTop: r(8) }}>{errs.days}</p>}
            </fieldset>
            <div className="flex flex-wrap" style={{ gap: r(12) }}>
              <div style={{ flex: '1 1 9rem' }}><Field id="pt-date" type="date" label="Starts" min={todayISO()} value={d.startDate} onChange={e => set({ startDate: e.target.value })} /></div>
              <div style={{ flex: '1 1 9rem' }}><Field id="pt-range" type="date" label="Ends" min={d.startDate} value={d.endDate} error={errs.range} onChange={e => set({ endDate: e.target.value })} /></div>
            </div>
            {errs.date && <p role="alert" style={{ fontSize: r(14), color: C.errText }}>{errs.date}</p>}
          </>
        )}
        <Field id="pt-time" type="time" label="Departure time" value={d.time} error={errs.time} helper="Campus time (IST, Jaipur). Buddies see a short window around this time." onChange={e => set({ time: e.target.value })} />
      </section>
      <section aria-labelledby="pt-veh" className="flex flex-col" style={{ gap: r(12) }}>
        <H2 id="pt-veh">Your vehicle</H2>
        <Card tone="tint">
          <div className="flex items-center" style={{ gap: r(12) }}>
            <Ico name="scooter" size={26} color={C.primary} />
            <div className="min-w-0"><p style={{ fontSize: r(16), fontWeight: 600, color: C.text }}>{vehicleLine(s.vehicle) || 'Approved vehicle'}</p>
              <p style={{ fontSize: r(14), color: C.text2 }}>{maskReg(s.vehicle.reg) || 'Registration on file'} · One Buddy seat</p></div>
          </div>
        </Card>
      </section>
      <section className="flex flex-col" style={{ gap: r(10) }}>
        <label htmlFor="pt-detour" style={{ fontSize: r(18), fontWeight: 600, color: C.text }}>How much extra travel works for you?</label>
        <input id="pt-detour" type="range" min={0} max={5} step={0.5} value={d.detour} onChange={e => set({ detour: Number(e.target.value) })} aria-valuetext={detourWords(d.detour)}
          style={{ width: '100%', minHeight: r(48), accentColor: C.primary }} />
        <div className="flex justify-between" style={{ fontSize: r(13), color: C.text2 }}><span>On my way</span><span>5 km</span></div>
        <p aria-live="polite" style={{ fontSize: r(16), fontWeight: 600, color: C.pressed }}>{detourWords(d.detour)}</p>
      </section>
      <section className="flex flex-col" style={{ gap: r(12) }}>
        <RadioList name="helmet" legend="Helmet arrangement" value={d.helmet === 'spare' ? 'I’ll bring a spare helmet' : 'My Buddy brings their own'}
          options={['I’ll bring a spare helmet', 'My Buddy brings their own']} onChange={v => set({ helmet: v.startsWith('I’ll') ? 'spare' : 'own' })} />
        {errs.helmet && <p id="pt-helmet" tabIndex={-1} role="alert" style={{ fontSize: r(14), color: C.errText }}>{errs.helmet}</p>}
      </section>
      <Notice kind="info">The contribution for each request is shown before you accept.</Notice>
    </Screen>
  )
}

// ── Review trip and publish ──────────────────────────────────────────────────

const applyDraft = (t: Trip, d: TDraft): Partial<Trip> => {
  const base = { mode: d.mode, date: d.date, startDate: d.startDate, endDate: d.endDate, days: d.days }
  const dates = occurrenceDates(base)
  return {
    ...base, date: dates[0] ?? d.startDate, time: d.time, pickup: d.pickup!, pickupPoint: d.pickupPoint ?? d.pickup!.points[0], destination: d.destination!,
    detour: d.detour, helmet: d.helmet,
    occ: Object.fromEntries(dates.map(x => [x, t.occ[x] ?? ('open' as const)])),
  }
}

export function ReviewTrip({ c }: { c: RCtx }) {
  const { s } = c
  const d = s.draft
  const later = useTimers()
  const [checking, setChecking] = useState(false)
  const phase = s.publishPhase
  const weekly = d.mode === 'weekly'
  const commit = (t: Trip) => {
    if (s.editingId) { s.patchTrip(s.editingId, applyDraft(t, d)); s.setCurId(s.editingId); s.setTripId(s.editingId) }
    else { s.addTrip(t); s.setCurId(t.id); s.setTripId(t.id) }
    s.setPendingTrip(null); s.setPublishPhase('published'); s.setDraftAll(newTDraft(s.vehicle.helmet === 'no' ? 'own' : 'spare'))
    c.say(s.editingId ? 'Trip updated.' : 'Your trip is open for requests.')
  }
  const publish = () => {
    if (phase === 'publishing' || !d.pickup || !d.destination) return
    s.setPublishPhase('publishing')
    later(() => {
      const m = s.proto.publish
      const t = tripFromDraft(d)
      if (!c.online || m === 'failed') { s.setPublishPhase('failed'); return }
      if (m === 'conflict' || (!weekly && s.hasConflict(d.date, d.time, s.editingId))) { s.setPublishPhase('conflict'); return }
      if (m === 'uncertain') { s.setPendingTrip(t); s.setPublishPhase('uncertain'); return }
      commit(t)
    }, 1400)
  }
  const check = () => {
    setChecking(true)
    later(() => { setChecking(false); if (s.pendingTrip) commit(s.pendingTrip) }, 1200)
  }
  const tid = s.cur?.id
  if (phase === 'published') return (
    <Screen gap={20} center footer={<>
      <Btn onClick={() => { s.setPublishPhase('idle'); c.root('tickets-list') }}>View requests</Btn>
      <Btn variant="secondary" onClick={() => { s.setPublishPhase('idle'); const t = s.trips.find(x => x.id === tid); if (t) c.openTrip(t); else c.root('my-trips') }}>View trip</Btn>
    </>}>
      <span className="flex items-center justify-center" style={{ width: r(72), height: r(72), borderRadius: 999, background: C.okBg, color: C.okText, border: `1px solid ${C.okBorder}` }}><Ico name="check" size={34} sw={2.5} /></span>
      <Heading size={26} center>Your trip is open for requests</Heading>
      <Body center>Matching Buddies can now ask to share your seat. You decide who to accept.</Body>
    </Screen>
  )
  const busy = phase === 'publishing'
  const dates = occurrenceDates({ mode: d.mode, date: d.date, startDate: d.startDate, endDate: d.endDate, days: d.days }, 3)
  return (
    <Screen top={<TopRow onBack={c.back} />} gap={16}
      footer={<Btn loading={busy} onClick={publish}>{busy ? 'Publishing…' : weekly ? 'Publish schedule' : 'Publish trip'}</Btn>}>
      <Heading size={26}>Review your trip</Heading>
      {phase === 'failed' && <Notice kind="error">We couldn’t publish your trip. Nothing was published and your details are still here—please try again.</Notice>}
      {phase === 'conflict' && <Notice kind="warning">You already have a trip or ride around this time. Change the time or date, or cancel the other trip first.</Notice>}
      {phase === 'uncertain' && <Notice kind="warning" action={<div style={{ marginTop: r(8) }}><Btn variant="secondary" loading={checking} style={{ minHeight: r(48) }} onClick={check}>{checking ? 'Checking…' : 'Check status'}</Btn></div>}>We’re checking whether your trip was published. Please don’t publish again yet.</Notice>}
      <Card>
        <div className="flex items-center justify-between" style={{ marginBottom: r(10) }}><H2>Route</H2><LinkBtn onClick={() => c.back()}>Edit<span className="sr-only"> route</span></LinkBtn></div>
        <RouteLine from={d.pickup?.name ?? ''} to={d.destination?.name ?? ''} fromSub={d.pickupPoint?.label} />
      </Card>
      <Card>
        <div className="flex items-center justify-between" style={{ marginBottom: r(10) }}><H2>Schedule</H2><LinkBtn onClick={() => c.back()}>Edit<span className="sr-only"> schedule</span></LinkBtn></div>
        <div className="flex flex-col" style={{ gap: r(6) }}>
          <KV k="Frequency" v={weekly ? `Every ${days(d.days)}` : 'One time'} />
          <KV k={weekly ? 'First date' : 'Date'} v={dates[0] ? dayLabel(dates[0]) : '—'} />
          {weekly && <KV k="Until" v={fmtDate(d.endDate, true)} />}
          <KV k="Departure" v={`${fmtTime(d.time)} IST`} />
        </div>
      </Card>
      <Card>
        <div className="flex items-center justify-between" style={{ marginBottom: r(10) }}><H2>Seat and preferences</H2><LinkBtn onClick={() => c.back()}>Edit<span className="sr-only"> preferences</span></LinkBtn></div>
        <div className="flex flex-col" style={{ gap: r(6) }}>
          <KV k="Vehicle" v={vehicleLine(s.vehicle) || 'Approved vehicle'} />
          <KV k="Seats" v="One Buddy seat" />
          <KV k="Extra travel" v={d.detour === 0 ? 'On my way only' : `Up to ${fmtKm(d.detour)}`} />
          <KV k="Helmet" v={d.helmet === 'spare' ? 'You bring a spare' : 'Buddy brings their own'} />
        </div>
      </Card>
      <Notice kind="info">The contribution for each request is shown before you accept. ChaloRaahi charges no platform fee during the pilot.</Notice>
      {weekly && <Para>Each date is confirmed separately, so you choose a Buddy for every ride.</Para>}
    </Screen>
  )
}

// ── My trips ─────────────────────────────────────────────────────────────────

const pastNote = (t: Trip) =>
  t.noShow === 'reported' ? 'No-show report submitted · under review'
  : t.status === 'expired' ? 'No Buddy joined this trip' : t.status === 'cancelled' ? (t.cancelledBy === 'buddy' ? 'Cancelled by your Buddy' : 'Cancelled by you')
  : t.status === 'ended-early' ? 'Ended early' : `Completed${t.settlement === 'cash' || t.settlement === 'upi' ? ' · contribution received' : ''}`

export function MyTrips({ c }: { c: RCtx }) {
  const { s } = c
  const [tab, setTab] = useState<'up' | 'past'>('up')
  const sched = s.upcoming.filter(t => t.mode === 'weekly' && t.status !== 'confirmed' && !t.parentId)
  const up = [...s.upcoming].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  return (
    <Screen gap={16}>
      <div style={{ paddingTop: r(16) }}><Heading size={26}>My trips</Heading></div>
      <Segmented label="Trips" value={tab} options={[['up', 'Upcoming'], ['past', 'Past']]} onChange={setTab} />
      {tab === 'up' ? (
        <>
          <Row icon="repeat" title="Recurring schedules" sub={sched.length ? `${sched.length} active` : 'None yet'} onClick={() => c.go('recurring')} />
          {s.draft.touched && !s.editingId && (
            <Card tone="warn">
              <div className="flex items-start justify-between" style={{ gap: r(8) }}><H2>Trip draft</H2><span style={{ fontSize: r(13), fontWeight: 700, color: C.warnText }}>Draft</span></div>
              <div style={{ margin: `${r(8)} 0 ${r(12)}` }}><RouteLine from={s.draft.pickup?.name ?? 'Not set'} to={s.draft.destination?.name ?? 'Not set'} /></div>
              <Btn variant="secondary" onClick={() => c.go('post-trip')}>Continue draft</Btn>
            </Card>
          )}
          {up.length === 0 && !s.draft.touched && (
            <Card><div className="flex flex-col" style={{ gap: r(10) }}><H2>No upcoming trips</H2>{P('Plan a trip to start receiving matching requests.')}<Btn onClick={() => c.go('post-trip')}>Plan a trip</Btn></div></Card>
          )}
          {up.map(t => <TripCard key={t.id} t={t} c={c} cta={t.status === 'confirmed' ? 'View confirmed ride' : t.status === 'active' ? 'Return to ride' : t.status === 'heading' || t.status === 'at-pickup' ? 'Return to pickup' : 'View trip'} />)}
        </>
      ) : (
        <>
          {s.past.length === 0 && P('No past trips yet.')}
          {s.past.map(t => (
            <Card key={t.id}>
              <div className="flex flex-col" style={{ gap: r(10) }}>
                <div className="flex items-start justify-between" style={{ gap: r(8) }}><h3 style={{ fontSize: r(16), fontWeight: 700, color: C.text }}>{dayLabel(t.date)}</h3><TripBadge t={t} /></div>
                <RouteLine from={t.pickup.name} to={t.destination.name} />
                <Para>{pastNote(t)}{t.req ? ` · ${t.req.name}` : ''}</Para>
                <button type="button" onClick={() => c.openTrip(t)} className="ob-btn ob-btn-secondary" style={{ minHeight: r(48), borderRadius: r(12), border: `1.5px solid ${C.primary}`, color: C.primary, fontWeight: 600 }}>
                  {t.status === 'completed' || t.status === 'ended-early' ? 'View summary' : 'View details'}<span className="sr-only">, {dayLabel(t.date)}</span>
                </button>
              </div>
            </Card>
          ))}
        </>
      )}
    </Screen>
  )
}

// ── Trip detail ──────────────────────────────────────────────────────────────

export function TripDetail({ c }: { c: RCtx }) {
  const { s } = c
  const t = s.cur
  if (!t) return <div className="p-6"><Btn onClick={() => c.root('my-trips')}>Go to My trips</Btn></div>
  const open = t.status === 'published' || t.status === 'paused'
  const n = fitCount(c, t)
  const edit = () => { s.setDraftAll(draftFromTrip(t)); s.setEditingId(t.id); c.go('post-trip') }
  return (
    <Screen top={<TopRow onBack={c.back} />} gap={16}
      footer={open ? <>
        <Btn onClick={() => { s.setTripId(t.id); c.go('tickets-list') }}>{n ? `Review ${n} ${n === 1 ? 'request' : 'requests'}` : 'View requests'}</Btn>
        <Btn variant="secondary" onClick={edit}>Edit availability</Btn>
        {t.mode === 'weekly' && <Btn variant="secondary" onClick={() => c.go('recurring')}>Manage schedule</Btn>}
        <button type="button" onClick={() => c.open('cancel-trip')} className="ob-btn ob-btn-text" style={redBtn}>Cancel trip</button>
      </> : undefined}>
      <div className="flex items-start justify-between" style={{ gap: r(12) }}><Heading size={26}>{open ? 'Your trip' : t.status === 'expired' ? 'Trip ended' : 'Trip details'}</Heading><TripBadge t={t} /></div>
      {t.status === 'expired' && <Notice kind="info">No Buddy joined this trip. That happens sometimes, and it doesn’t affect your account.</Notice>}
      {t.status === 'cancelled' && !t.req && <Notice kind="info">{t.cancelledBy === 'pilot' ? 'You cancelled this trip.' : 'This trip was cancelled.'}</Notice>}
      {t.status === 'paused' && <Notice kind="warning">This trip is paused. Buddies can’t see it until you resume.</Notice>}
      <Card>
        <Para>{when(t)} IST</Para>
        <div style={{ marginTop: r(10) }}><RouteLine from={t.pickup.name} to={t.destination.name} fromSub={t.pickupPoint.label} /></div>
      </Card>
      <Card>
        <div className="flex flex-col" style={{ gap: r(6) }}>
          <KV k="Vehicle" v={vehicleLine(s.vehicle) || 'Honda Activa 6G · White'} />
          <KV k="Seat" v={t.req && !['completed', 'ended-early', 'cancelled'].includes(t.status) ? `Booked · ${t.req.name}` : 'One Buddy seat'} />
          <KV k="Extra travel" v={t.detour === 0 ? 'On my way only' : `Up to ${fmtKm(t.detour)}`} />
          <KV k="Helmet" v={t.helmet === 'spare' ? 'You bring a spare' : 'Buddy brings their own'} />
        </div>
      </Card>
      {open && (
        <Card><Switch id="acc2" label="Accepting requests for this trip" checked={t.status === 'published'}
          onChange={v => { s.patchTrip(t.id, { status: v ? 'published' : 'paused', accepting: v }); c.say(v ? 'Accepting requests.' : 'Requests paused.') }} /></Card>
      )}
      {open && t.mode === 'weekly' && <Para>Changes won’t alter rides that are already confirmed.</Para>}
      {!open && t.req && <Btn variant="secondary" onClick={() => c.root(screenForTrip({ ...t, status: t.status === 'cancelled' ? 'cancelled' : t.status }))}>{t.status === 'completed' || t.status === 'ended-early' ? 'View summary' : 'View ride'}</Btn>}
    </Screen>
  )
}
const redBtn: React.CSSProperties = { minHeight: 48, color: C.errText, fontWeight: 600, fontSize: '1rem', textDecoration: 'underline' }

// ── Recurring schedules ──────────────────────────────────────────────────────

export function Recurring({ c }: { c: RCtx }) {
  const { s } = c
  const list = s.upcoming.filter(t => t.mode === 'weekly' && !t.parentId)
  return (
    <Screen top={<TopRow onBack={c.back} />} gap={16}>
      <Heading size={26}>Recurring schedules</Heading>
      <Notice kind="info">Changes won’t alter rides that are already confirmed.</Notice>
      {list.length === 0 && (
        <Card><div className="flex flex-col" style={{ gap: r(10) }}><H2>No recurring schedules yet</H2>{P('Plan a trip and choose Repeat weekly to offer the same commute every week.')}<Btn onClick={() => c.go('post-trip')}>Plan a trip</Btn></div></Card>
      )}
      {list.map(t => {
        const dates = Object.keys(t.occ).sort().slice(0, 6)
        const paused = t.status === 'paused'
        return (
          <Card key={t.id}>
            <div className="flex flex-col" style={{ gap: r(12) }}>
              <div className="flex items-start justify-between" style={{ gap: r(8) }}><h2 style={{ fontSize: r(17), fontWeight: 700, color: C.text }}>{days(t.days)} · {fmtTime(t.time)}</h2><TripBadge t={t} /></div>
              <RouteLine from={t.pickup.name} to={t.destination.name} />
              <Para>{fmtDate(t.startDate)} to {fmtDate(t.endDate, true)}</Para>
              <div><Label>Upcoming dates</Label>
                <ul style={{ listStyle: 'none' }}>
                  {dates.map(dt => {
                    const st = t.occ[dt]
                    return (
                      <li key={dt} className="flex items-center justify-between" style={{ gap: r(8), minHeight: r(48), borderBottom: `1px solid ${C.divider}` }}>
                        <span style={{ fontSize: r(15), color: st === 'skipped' ? C.text3 : C.text }}>{dayLabel(dt)}</span>
                        {st === 'open' ? <button type="button" onClick={() => c.open('skip', `${t.id}|${dt}`)} style={{ minHeight: r(48), padding: `0 ${r(8)}`, color: C.primary, fontWeight: 600, textDecoration: 'underline', fontSize: r(15) }}>Skip<span className="sr-only"> {dayLabel(dt)}</span></button>
                          : <span style={{ fontSize: r(14), fontWeight: 600, color: st === 'confirmed' ? C.okText : C.text2 }}>{st === 'confirmed' ? 'Ride confirmed' : 'Skipped'}</span>}
                      </li>
                    )
                  })}
                </ul>
              </div>
              <div className="flex flex-wrap" style={{ gap: r(8) }}>
                <Btn variant="secondary" style={{ flex: '1 1 8rem', width: 'auto' }} onClick={() => { s.patchTrip(t.id, { status: paused ? 'published' : 'paused', accepting: paused }); c.say(paused ? 'Schedule resumed.' : 'Schedule paused. New dates won’t get requests.') }}>{paused ? 'Resume' : 'Pause'}</Btn>
                <Btn variant="secondary" style={{ flex: '1 1 8rem', width: 'auto' }} onClick={() => { s.setDraftAll(draftFromTrip(t)); s.setEditingId(t.id); c.go('post-trip') }}>Edit future dates</Btn>
              </div>
              <button type="button" onClick={() => c.open('end-schedule', t.id)} className="ob-btn ob-btn-text" style={redBtn}>End schedule</button>
            </div>
          </Card>
        )
      })}
    </Screen>
  )
}

// ── Requests ─────────────────────────────────────────────────────────────────

export function Requests({ c }: { c: RCtx }) {
  const { s } = c
  const trip = s.selTrip
  const later = useTimers()
  const [sort, setSort] = useState<'detour' | 'time'>('detour')
  const [helmetOnly, setHelmetOnly] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  useEffect(() => { const t = window.setTimeout(() => setReady(true), 450); return () => clearTimeout(t) }, [])

  const refresh = () => {
    setLoading(true)
    later(() => {
      setLoading(false)
      if (s.proto.refresh === 'failed' || !c.online) { s.setRefreshFailed(true); return }
      s.setRefreshFailed(false); s.setRefreshedAt(Date.now()); c.say('Requests refreshed.')
    }, 900)
  }
  const Empty = (title: string, body: string, actions: React.ReactNode) => (
    <Screen gap={16} center footer={actions}>
      <span className="flex items-center justify-center" style={{ width: r(64), height: r(64), borderRadius: 999, background: C.tint, color: C.primary }}><Ico name="list" size={28} /></span>
      <Heading size={24} center>{title}</Heading><Body center>{body}</Body>
    </Screen>
  )
  if (!trip) return Empty('Plan a trip to see matching requests', 'Buddies can only request a seat on a published trip.', <Btn onClick={() => c.go('post-trip')}>Plan a trip</Btn>)

  const matches = s.reqs.filter(q => fits(trip, q))
  const shown = matches.filter(q => !helmetOnly || q.helmet === 'has').sort((a, b) => sort === 'detour' ? a.detourKm - b.detourKm || a.time.localeCompare(b.time) : a.time.localeCompare(b.time))
  const ctxHead = (
    <div className="flex flex-col" style={{ gap: r(8), paddingTop: r(16) }}>
      <Heading size={26}>Buddy requests</Heading>
      <Card tone="tint">
        <div className="flex items-start justify-between" style={{ gap: r(8) }}>
          <div className="min-w-0"><p style={{ fontSize: r(15), fontWeight: 700, color: C.text }}>{when(trip)}</p><p style={{ fontSize: r(14), color: C.text2, overflowWrap: 'anywhere' }}>{trip.pickup.name} to {trip.destination.name}</p></div>
          {s.published.length > 1 && <button type="button" onClick={() => c.open('trip-pick')} style={{ minHeight: r(48), padding: `0 ${r(8)}`, color: C.primary, fontWeight: 600, textDecoration: 'underline', flexShrink: 0 }}>Change trip</button>}
        </div>
      </Card>
    </div>
  )
  if (seatBooked(trip)) return Empty('Your seat is booked for this trip', `${trip.req!.name} is confirmed, so new requests are closed for this trip.`, <Btn onClick={() => c.openTrip(trip)}>View confirmed ride</Btn>)
  if (s.refreshFailed) return Empty('Requests couldn’t be refreshed', `Showing nothing new. Last refreshed at ${clock(s.refreshedAt)}.`, <Btn loading={loading} onClick={refresh}>{loading ? 'Trying…' : 'Try again'}</Btn>)
  if (trip.status === 'paused') return Empty('Requests are paused for this trip', 'Buddies can’t see this trip until you resume.', <Btn onClick={() => { s.patchTrip(trip.id, { status: 'published', accepting: true }); c.say('Accepting requests.') }}>Resume requests</Btn>)
  if (matches.length === 0) return Empty('No matching requests yet', 'When a Buddy’s route fits this trip, their request appears here. You can also widen how much extra travel works for you.',
    <><Btn onClick={() => c.openTrip(trip)}>View trip</Btn><Btn variant="secondary" onClick={() => { s.setDraftAll(draftFromTrip(trip)); s.setEditingId(trip.id); c.go('post-trip') }}>Edit availability</Btn></>)

  return (
    <Screen gap={14}>
      {ctxHead}
      <div className="flex items-center justify-between flex-wrap" style={{ gap: r(8) }}>
        <Para>Last refreshed at {clock(s.refreshedAt)}</Para>
        <button type="button" onClick={refresh} disabled={loading} className="flex items-center" style={{ minHeight: r(48), gap: r(6), color: C.primary, fontWeight: 600 }}><Ico name="refresh" size={18} />{loading ? 'Refreshing…' : 'Refresh'}</button>
      </div>
      <Segmented label="Sort requests" value={sort} options={[['detour', 'Least detour'], ['time', 'Earliest pickup']]} onChange={setSort} />
      <div className="flex"><Chip wide on={helmetOnly} onClick={() => setHelmetOnly(v => !v)}>Has own helmet</Chip></div>
      <p role="status" style={{ fontSize: r(14), color: C.text2 }}>{shown.length} of {matches.length} {matches.length === 1 ? 'request' : 'requests'} shown · {sort === 'detour' ? 'least detour first' : 'earliest pickup first'}</p>
      {!ready || loading ? [1, 2].map(i => <Card key={i}><div className="flex flex-col" style={{ gap: r(10) }}><Skel h={20} w="60%" /><Skel h={14} /><Skel h={48} /></div></Card>)
        : shown.length === 0 ? (
          <Card><div className="flex flex-col" style={{ gap: r(10) }}><H2>No requests match these filters</H2><Btn variant="secondary" onClick={() => setHelmetOnly(false)}>Reset filters</Btn></div></Card>
        ) : shown.map(q => <RequestCard key={q.id} q={q} c={c} />)}
    </Screen>
  )
}

function RequestCard({ q, c }: { q: Req; c: RCtx }) {
  return (
    <Card>
      <div className="flex flex-col" style={{ gap: r(12) }}>
        <h3 style={{ margin: 0 }}><BuddyLine q={q} /></h3>
        <RouteLine from={q.pickup.locality.split(',')[0]} fromSub={q.pickup.name} to={q.dest.name} />
        <div className="flex flex-col" style={{ gap: r(4), fontSize: r(14), color: C.text2 }}>
          <span className="flex items-center" style={{ gap: r(8) }}><Ico name="clock" size={16} />Pickup window {q.window}</span>
          <span className="flex items-center" style={{ gap: r(8) }}><Ico name="nav" size={16} />{fmtKm(q.detourKm)} detour · about {q.detourMin} min</span>
          <span className="flex items-center" style={{ gap: r(8) }}><Ico name="helmet" size={16} />{q.helmet === 'has' ? 'Has own helmet' : 'Needs a helmet'}</span>
        </div>
        <div className="flex items-center justify-between" style={{ fontSize: r(14), color: C.text2 }}><span>Estimated contribution</span><strong style={{ fontSize: r(16), color: C.text }}>{inr(q.amount)}</strong></div>
        <div className="flex" style={{ gap: r(8) }}>
          <Btn style={{ flex: 1.4 }} onClick={() => { c.s.setReqId(q.id); c.go('ticket-detail') }}>View request<span className="sr-only"> from {q.name}</span></Btn>
          <Btn variant="secondary" style={{ flex: 1 }} onClick={() => c.open('decline', q.id)}>Decline<span className="sr-only"> {q.name}</span></Btn>
        </div>
      </div>
    </Card>
  )
}

// ── Request detail ───────────────────────────────────────────────────────────

export function RequestDetail({ c }: { c: RCtx }) {
  const { s } = c
  const q = s.reqs.find(x => x.id === s.reqId)
  const trip = s.selTrip
  const later = useTimers()
  const [checking, setChecking] = useState(false)
  const [err, setErr] = useState('')
  if (!q || !trip) return <Screen top={<TopRow onBack={c.back} />}><Heading size={24}>This request isn’t available</Heading><Btn onClick={() => c.root('tickets-list')}>Back to requests</Btn></Screen>

  const ap = s.acceptPhase?.id === q.id ? s.acceptPhase.phase : null
  const done = () => { const id = s.confirmRequest(trip, q); s.setCurId(id); s.setAcceptPhase(null); c.root('ticket-accepted'); c.say('Your ride is confirmed.') }
  const accept = () => {
    if (ap === 'confirming' || q.state !== 'open') return
    if (!c.online) { setErr('You’re offline. Connect to accept this request.'); return }
    setErr(''); s.setAcceptPhase({ id: q.id, phase: 'confirming' })
    later(() => {
      const m = s.proto.accept
      if (seatBooked(trip) || m === 'unavailable') s.setAcceptPhase({ id: q.id, phase: 'unavailable' })
      else if (m === 'conflict' || (trip.mode === 'one' && s.hasConflict(trip.date, trip.time, trip.id))) s.setAcceptPhase({ id: q.id, phase: 'conflict' })
      else if (m === 'uncertain') s.setAcceptPhase({ id: q.id, phase: 'uncertain' })
      else done()
    }, 1300)
  }
  const check = () => { setChecking(true); later(() => { setChecking(false); done() }, 1200) }

  const gone = q.state === 'cancelled' ? ['Your Buddy cancelled this request', 'They no longer need this seat. Nothing else changes for your trip.']
    : q.state === 'expired' ? ['This request has expired', 'It wasn’t accepted in time. Your seat is still open for other requests.']
    : q.state === 'taken' ? ['Another pilot accepted this request', 'This Buddy has a ride with someone else. Your seat is still open.']
    : q.state === 'declined' ? ['You declined this request', 'The Buddy was told it wasn’t accepted.']
    : q.state === 'accepted' ? ['You accepted this request', 'This ride is confirmed.'] : null
  const blocked = ap === 'unavailable' ? ['This seat isn’t available any more', 'Your seat on this trip may already be booked. Nothing was confirmed.']
    : ap === 'conflict' ? ['This conflicts with another ride', 'You already have a ride around this time. Nothing was confirmed.'] : null
  const info = gone ?? blocked

  const total = q.sharedKm + q.detourKm
  return (
    <Screen top={<TopRow onBack={c.back} />} gap={16}
      footer={info ? <Btn onClick={() => c.root('tickets-list')}>Back to requests</Btn> : ap === 'uncertain' ? null : <>
        <Btn loading={ap === 'confirming'} onClick={accept}>{ap === 'confirming' ? 'Confirming…' : 'Accept request'}</Btn>
        <Btn variant="secondary" onClick={() => c.open('decline', q.id)}>Decline request</Btn>
        <p style={{ fontSize: r(14), color: C.text2, textAlign: 'center' }}>Accepting confirms this Buddy for the available seat on this trip.</p>
      </>}>
      <Heading size={26}>Review Buddy request</Heading>
      {info && <Notice kind="warning"><strong>{info[0]}.</strong> {info[1]}</Notice>}
      {ap === 'uncertain' && <Notice kind="warning" action={<div style={{ marginTop: r(8) }}><Btn variant="secondary" style={{ minHeight: r(48) }} loading={checking} onClick={check}>{checking ? 'Checking…' : 'Check ride status'}</Btn></div>}>We’re checking whether this ride was confirmed. Please don’t accept again.</Notice>}
      {err && <Notice kind="error">{err}</Notice>}
      <Card><BuddyLine q={q} size={56} />
        <div style={{ marginTop: r(10) }}>{P('Phone numbers and documents aren’t shared. You can send preset updates after the ride is confirmed.', 14)}</div></Card>
      <section aria-labelledby="fit" className="flex flex-col" style={{ gap: r(10) }}>
        <H2 id="fit">Route fit</H2>
        <div style={{ borderRadius: r(14), overflow: 'hidden' }}>
          <MiniMap height={180} pickup={trip.pickup} destination={trip.destination} markers={[{ id: 'o', x: trip.pickup.x, y: trip.pickup.y }, { id: 'b', x: q.pickup.x, y: q.pickup.y, selected: true }]}
            label={`Sample map. Your route runs from ${trip.pickup.name} to ${trip.destination.name}. The Buddy’s pickup at ${q.pickup.name} is ${fmtKm(q.detourKm)} off your route.`} />
        </div>
        <Card>
          <RouteLine from={q.pickup.name} fromSub={`Buddy’s pickup · ${q.pickup.locality}`} to={q.dest.name} />
          <div className="flex flex-col" style={{ gap: r(6), marginTop: r(12) }}>
            <KV k="Shared distance" v={fmtKm(q.sharedKm)} />
            <KV k="Extra distance for you" v={fmtKm(q.detourKm)} />
            <KV k="Extra time for you" v={`about ${q.detourMin} min`} />
            <KV k="Buddy walks to pickup" v={`${q.walkM} m`} />
          </div>
          <div role="img" aria-label={`${fmtKm(q.sharedKm)} shared and ${fmtKm(q.detourKm)} extra`} className="flex" style={{ height: r(12), borderRadius: 999, overflow: 'hidden', marginTop: r(12), background: C.divider }}>
            <span style={{ width: `${(q.sharedKm / total) * 100}%`, background: C.primary }} />
            <span style={{ width: `${(q.detourKm / total) * 100}%`, background: '#F79009', minWidth: 6 }} />
          </div>
          <p style={{ fontSize: r(13), color: C.text2, marginTop: r(6) }}>Blue: shared on your route · Orange: extra detour</p>
        </Card>
      </section>
      <section aria-labelledby="fuel" className="flex flex-col" style={{ gap: r(10) }}>
        <H2 id="fuel">Fuel contribution</H2>
        <Card tone="tint">
          <div className="flex flex-col" style={{ gap: r(6) }}>
            <KV k="Estimated contribution" v={inr(q.amount)} strong />
            <KV k="ChaloRaahi platform fee" v="₹0 during the pilot" />
          </div>
          <div style={{ marginTop: r(10) }}>{P('A fair share of fuel for the shared distance, shown before you accept. The Buddy settles directly with you after the ride by cash or their own UPI app. ChaloRaahi does not process the transfer.', 14)}</div>
        </Card>
      </section>
      <div className="flex items-center" style={{ gap: r(8), fontSize: r(14), color: C.text2 }}><Initials text={q.initials} size={28} />{q.window} · {q.helmet === 'has' ? 'Has own helmet' : 'Needs a helmet'}</div>
    </Screen>
  )
}

export { placeById }
