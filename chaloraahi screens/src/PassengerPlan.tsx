import { useEffect, useMemo, useRef, useState } from 'react'
import { Badge, Body, Btn, C, Field, Heading, Ico, Notice, Screen, r } from './OnboardingUI'
import MiniMap from './PassengerMap'
import {
  CHANGED_AMOUNT, DEMO_AMOUNT, PLACES, WEEKDAYS, addDays, agreedTime, dayLabel, draftFromRide, fmtDate, fmtTime, inr, occurrenceDates,
  placeById, rideFromDraft, screenForStatus, todayISO, validateDraft, type Place, type Ride,
} from './PassengerData'
import {
  Card, Chip, Ctx, H2, KV, Label, PageTop, RideCard, Row, RouteLine, Segmented, Skel, StatusBadge, days, flags, fmtWindow, useTimers,
} from './PassengerUI'

const openRide = (c: Ctx, x: Ride) => c.openRide(x)
const rank = (x: Ride) => ({ 'in-progress': 0, 'at-pickup': 1, 'on-the-way': 2, confirmed: 3, awaiting: 4 } as Record<string, number>)[x.status] ?? 9

// ── Home ─────────────────────────────────────────────────────────────────────

export function Home({ c }: { c: Ctx }) {
  const { s } = c
  const [loading, setLoading] = useState(true)
  useEffect(() => { const t = window.setTimeout(() => setLoading(false), 450); return () => clearTimeout(t) }, [])
  const pending = s.proto.verification === 'pending'
  const featured = useMemo(() => [...s.upcoming].sort((a, b) => rank(a) - rank(b) || a.date.localeCompare(b.date))[0], [s.upcoming])
  const d = s.draft
  const pick = (p: Place, field: 'pickup' | 'destination') => {
    const other = field === 'pickup' ? d.destination : d.pickup
    if (other?.id === p.id) { c.say(`Choose a different ${field === 'pickup' ? 'pickup' : 'destination'} to continue.`); return }
    s.setDraft(field === 'pickup' ? { pickup: p, pickupPoint: p.points[0] } : { destination: p })
    c.say(`${p.name} set as ${field}.`)
  }
  const plan = () => {
    if (d.pickup && d.destination) { c.go('ticket-form'); return }
    s.setSearchField(d.pickup ? 'destination' : 'pickup'); c.go('searching')
  }
  const rowBtn = (field: 'pickup' | 'destination', label: string, v: string | undefined) => (
    <button type="button" onClick={() => { s.setSearchField(field); c.go('searching') }} className="ob-row flex items-center w-full text-left"
      style={{ minHeight: r(60), padding: `${r(8)} ${r(14)}`, gap: r(12), border: `1.5px solid ${C.input}`, borderRadius: r(14), background: '#fff' }}>
      <span aria-hidden style={{ width: r(12), height: r(12), borderRadius: field === 'pickup' ? 999 : 3, background: field === 'pickup' ? '#12B76A' : C.primary, flexShrink: 0 }} />
      <span className="flex-1 min-w-0"><span className="block" style={{ fontSize: r(13), fontWeight: 600, color: C.text3 }}>{label}</span>
        <span className="block" style={{ fontSize: r(16), color: v ? C.text : C.text3, fontWeight: v ? 600 : 400, overflowWrap: 'anywhere' }}>{v ?? `Choose ${label.toLowerCase()}`}</span></span>
      <Ico name="chevron" size={18} color={C.text3} />
    </button>
  )
  return (
    <Screen gap={20}>
      <div className="flex flex-col" style={{ gap: r(8) }}>
        <Heading size={26}>Where are you heading?</Heading>
        <Body>Plan a shared commute with someone from your college.</Body>
      </div>
      {pending && (
        <Notice kind="warning" action={<button type="button" onClick={c.openVerification} className="block" style={{ marginTop: r(6), minHeight: r(44), color: C.primary, fontWeight: 600, textDecoration: 'underline' }}>View verification status</button>}>
          Complete college verification to request a ride. You can keep browsing.
        </Notice>
      )}
      {!c.online && <Notice kind="warning">You’re offline. You can keep planning a draft; publishing needs a connection. Showing the last saved status.</Notice>}
      <div className="flex flex-col" style={{ gap: r(10) }}>
        {rowBtn('pickup', 'Pickup', d.pickup?.name)}
        {rowBtn('destination', 'Destination', d.destination?.name)}
        <Btn onClick={plan} disabled={pending} style={{ marginTop: r(6) }}>Plan a ride</Btn>
      </div>
      <div style={{ borderRadius: r(16), overflow: 'hidden', border: `1px solid ${C.divider}` }}>
        <MiniMap height={120} label={d.pickup && d.destination ? `Sample map showing a route from ${d.pickup.name} to ${d.destination.name}.` : 'Sample map of Jaipur. Choose a pickup and destination to see a route.'}
          pickup={d.pickup} destination={d.destination} />
      </div>

      <section aria-labelledby="up-h" className="flex flex-col" style={{ gap: r(12) }}>
        <H2 id="up-h">Upcoming commute</H2>
        {loading ? (
          <Card><div className="flex flex-col" style={{ gap: r(12) }} role="status" aria-label="Loading your upcoming commute"><Skel h={20} w="60%" /><Skel h={16} /><Skel h={16} w="80%" /><Skel h={48} /></div></Card>
        ) : featured ? (
          <RideCard ride={featured} onOpen={() => openRide(c, featured)} />
        ) : (
          <Card tone="tint"><p style={{ fontSize: r(16), color: C.text, fontWeight: 600 }}>No commute planned yet</p>
            <p style={{ fontSize: r(14), color: C.text2, marginTop: r(4) }}>Your first request will show up here. Pilots travelling your way can accept it.</p></Card>
        )}
        <Row icon="list" title="My rides" sub="Upcoming requests, confirmed rides and history" onClick={() => c.root('my-rides')} />
      </section>

      <section aria-labelledby="saved-h" className="flex flex-col" style={{ gap: r(4) }}>
        <H2 id="saved-h">Saved places</H2>
        <Row icon="users" title="College" sub="VGU Main Gate · set as destination" onClick={() => pick(placeById('vgu'), 'destination')} trailing={<span style={{ color: C.primary, fontSize: r(14), fontWeight: 600 }}>Use</span>} />
        <Row icon="pin" title="Saved pickup" sub="Mansarovar Metro Station · set as pickup" onClick={() => pick(placeById('mansarovar'), 'pickup')} trailing={<span style={{ color: C.primary, fontSize: r(14), fontWeight: 600 }}>Use</span>} />
        <Row icon="edit" title="Add a place" sub="Search for a landmark or stop" onClick={() => { s.setSearchField('pickup'); c.go('searching') }} />
      </section>
    </Screen>
  )
}

// ── Route search ─────────────────────────────────────────────────────────────

function RouteInput({ id, label, value, onChange, onFocus, error, dot, active }: {
  id: string; label: string; value: string; onChange: (v: string) => void; onFocus: () => void; error?: string; dot: 'from' | 'to'; active: boolean
}) {
  return (
    <div className="flex flex-col" style={{ gap: r(6) }}>
      <label htmlFor={id} style={{ fontSize: r(14), fontWeight: 600, color: C.text }}>{label}</label>
      <div className="flex items-center" style={{ minHeight: r(54), borderRadius: r(12), border: `1.5px solid ${error ? C.errText : active ? C.primary : C.input}`, background: '#fff', paddingLeft: r(14) }}>
        <span aria-hidden style={{ width: r(12), height: r(12), borderRadius: dot === 'from' ? 999 : 3, background: dot === 'from' ? '#12B76A' : C.primary, flexShrink: 0, marginRight: r(10) }} />
        <input id={id} value={value} onChange={e => onChange(e.target.value)} onFocus={onFocus} autoComplete="off" enterKeyHint="search" aria-invalid={!!error || undefined} aria-describedby={error ? `${id}-e` : undefined}
          placeholder={dot === 'from' ? 'Search for a pickup point' : 'Search for a destination'} className="ob-input flex-1 min-w-0" style={{ minHeight: r(52), fontSize: r(16), color: C.text, background: 'transparent', border: 0, outline: 'none' }} />
        {value && (
          <button type="button" aria-label={`Clear ${label.toLowerCase()}`} onClick={() => { onChange(''); document.getElementById(id)?.focus() }} className="ob-icon-btn flex items-center justify-center flex-shrink-0" style={{ width: r(48), height: r(48), borderRadius: 999 }}>
            <Ico name="close" size={18} />
          </button>
        )}
      </div>
      {error && <p id={`${id}-e`} role="alert" className="flex items-start" style={{ gap: r(6), fontSize: r(14), color: C.errText }}><span style={{ marginTop: 2 }}><Ico name="alert" size={16} /></span>{error}</p>}
    </div>
  )
}

export function Searching({ c }: { c: Ctx }) {
  const { s } = c
  const d = s.draft
  const field = s.searchField
  const [q, setQ] = useState({ pickup: d.pickup?.name ?? '', destination: d.destination?.name ?? '' })
  const [loading, setLoading] = useState(false)
  const tim = useRef<number>(0)
  const [, force] = useState(0)
  const selected = { pickup: d.pickup, destination: d.destination }
  const text = q[field]
  const typed = text.trim() !== '' && text !== selected[field]?.name

  const type = (f: 'pickup' | 'destination', v: string) => {
    setQ(x => ({ ...x, [f]: v }))
    if (selected[f] && v !== selected[f]!.name) s.setDraft(f === 'pickup' ? { pickup: null, pickupPoint: null } : { destination: null })
    setLoading(true); clearTimeout(tim.current); tim.current = window.setTimeout(() => setLoading(false), 350)
  }
  useEffect(() => () => clearTimeout(tim.current), [])

  const results = PLACES.filter(p => {
    const t = text.trim().toLowerCase()
    return t && (p.name.toLowerCase().includes(t) || p.locality.toLowerCase().includes(t))
  })
  const saved = PLACES.filter(p => p.kind !== 'search' || s.recents.includes(p.id))
  const choose = (p: Place) => { s.setPending({ field, place: p, from: 'search' }); c.go('meeting-point') }
  const same = d.pickup && d.destination && d.pickup.id === d.destination.id
  const blocked = s.proto.route === 'unavailable' && d.pickup && d.destination
  const ready = !!d.pickup && !!d.destination && !same && !blocked
  const confirm = () => { if (c.prev === 'ticket-form' || c.prev === 'review-request') c.back(); else c.go('ticket-form') }
  const list = typed ? results : saved

  return (
    <Screen top={<PageTop back={c.back} />} gap={20}
      footer={<Btn onClick={confirm} disabled={!ready}>Confirm route</Btn>}>
      <Heading>Plan your route</Heading>
      <div className="flex flex-col" style={{ gap: r(14) }}>
        <RouteInput id="pickup-q" label="Pickup" value={q.pickup} active={field === 'pickup'} dot="from" onFocus={() => s.setSearchField('pickup')} onChange={v => type('pickup', v)} />
        <RouteInput id="dest-q" label="Destination" value={q.destination} active={field === 'destination'} dot="to" onFocus={() => s.setSearchField('destination')} onChange={v => type('destination', v)}
          error={same ? 'Choose a different destination to continue.' : undefined} />
      </div>
      {blocked && <Notice kind="warning">This route isn’t in the pilot service area yet. Try a pickup or destination closer to the college.</Notice>}

      {field === 'pickup' && (
        <>
          <Row icon="locate" title="Use current location" sub={flags.locDenied ? 'Location access is off. Search for a pickup point or choose one on the map.' : 'Suggests a nearby pickup point'} onClick={() => c.open('location')} />
          {flags.locDenied && <Notice kind="info">You can still search above or pick a place on the map.</Notice>}
        </>
      )}

      <section aria-label={typed ? 'Search results' : 'Saved and recent places'} className="flex flex-col" style={{ gap: r(2) }}>
        {!typed && <H2>Saved and recent places</H2>}
        {typed && loading && <div className="flex flex-col" style={{ gap: r(14) }} role="status" aria-label="Searching places"><Skel h={44} /><Skel h={44} /><Skel h={44} /></div>}
        {typed && !loading && !c.online && (
          <Notice kind="error" action={<button type="button" onClick={() => { force(x => x + 1); c.say(c.online ? 'Back online.' : 'Still offline.') }} className="block" style={{ marginTop: r(6), minHeight: r(44), color: C.errText, fontWeight: 600, textDecoration: 'underline' }}>Try again</button>}>
            Can’t search places right now. Check your connection. Saved places still work.
          </Notice>
        )}
        {typed && !loading && c.online && results.length === 0 && <Notice kind="info">No places found. Try a nearby landmark or choose on the map.</Notice>}
        {(!typed || (!loading && c.online)) && list.map(p => (
          <Row key={p.id} icon={p.kind === 'college' ? 'users' : p.kind === 'saved' ? 'heart' : p.kind === 'recent' ? 'clock' : 'pin'} title={p.name} sub={p.locality} onClick={() => choose(p)} />
        ))}
        <Row icon="map" title="Choose on map" sub="Browse sample places on the map" onClick={() => c.open('mappick')} />
      </section>
    </Screen>
  )
}

// ── Meeting point ────────────────────────────────────────────────────────────

export function MeetingPoint({ c }: { c: Ctx }) {
  const { s } = c
  const p = s.pending
  const [sel, setSel] = useState(0)
  const [note, setNote] = useState(s.draft.pickupNote)
  useEffect(() => { if (!p) c.back() }, [p])  // eslint-disable-line
  if (!p) return null
  const isPickup = p.field === 'pickup'
  const pts = p.place.points
  const pt = pts[Math.min(sel, pts.length - 1)]
  const other = isPickup ? s.draft.destination : s.draft.pickup
  const walk = 90 + sel * 60, detour = 3 + sel * 2
  const use = () => {
    if (isPickup) s.setDraft({ pickup: p.place, pickupPoint: pt, pickupNote: note.trim() })
    else s.setDraft({ destination: p.place })
    s.setPending(null); c.back()
  }
  const markers = isPickup ? pts.map((x, i) => ({ id: x.id, x: p.place.x + (i * 24 - (pts.length - 1) * 12), y: p.place.y + (i % 2 ? 14 : -10), selected: i === sel })) : undefined
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="relative flex-shrink-0">
        <MiniMap height="clamp(150px, 32dvh, 280px)" label={`Sample map near ${p.place.name}. ${isPickup ? `${pts.length} suggested pickup ${pts.length === 1 ? 'point' : 'points'}; selected: ${pt.label}.` : 'Destination marked.'}`}
          pickup={isPickup ? null : other} destination={isPickup ? null : p.place} markers={markers}>
          <button type="button" onClick={() => { setSel(0); c.say('Map recentred.') }} aria-label="Recenter map" className="absolute flex items-center justify-center" style={{ right: r(12), bottom: r(36), width: r(48), height: r(48), borderRadius: 999, background: '#fff', boxShadow: '0 2px 8px rgba(16,24,40,.2)', color: C.primary }}>
            <Ico name="locate" size={22} />
          </button>
        </MiniMap>
        <button type="button" onClick={c.back} aria-label="Back" className="absolute flex items-center justify-center" style={{ left: r(12), top: r(12), width: r(48), height: r(48), borderRadius: 999, background: '#fff', boxShadow: '0 2px 8px rgba(16,24,40,.2)' }}>
          <Ico name="back" size={22} sw={2.25} />
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto" style={{ background: '#fff', borderRadius: `${r(24)} ${r(24)} 0 0`, marginTop: r(-16), position: 'relative', boxShadow: '0 -4px 16px rgba(16,24,40,.08)' }}>
        <div className="flex flex-col" style={{ padding: `${r(20)} max(${r(20)}, min(${r(24)}, 6vw)) max(1.5rem, env(safe-area-inset-bottom))`, gap: r(16) }}>
          <Heading size={22}>{isPickup ? 'Confirm your pickup point' : 'Confirm your destination'}</Heading>
          <div>
            <p style={{ fontSize: r(18), fontWeight: 600, color: C.text }}>{p.place.name}</p>
            <p style={{ fontSize: r(14), color: C.text2 }}>{p.place.locality}</p>
          </div>
          {isPickup ? (
            <>
              <fieldset className="flex flex-col" style={{ gap: r(8), border: 0, padding: 0, minWidth: 0 }}>
                <legend style={{ fontSize: r(14), fontWeight: 600, color: C.text, marginBottom: r(8) }}>Entrance or landmark</legend>
                {pts.map((x, i) => (
                  <label key={x.id} className="ob-check flex items-start" style={{ gap: r(12), padding: r(12), minHeight: r(56), borderRadius: r(12), border: `1.5px solid ${i === sel ? C.primary : C.divider}`, background: i === sel ? C.tint : '#fff', cursor: 'pointer' }}>
                    <input type="radio" name="mp" checked={i === sel} onChange={() => setSel(i)} style={{ width: r(22), height: r(22), accentColor: C.primary, marginTop: 2 }} />
                    <span><span className="block" style={{ fontSize: r(16), fontWeight: 600, color: C.text }}>{x.label}</span><span className="block" style={{ fontSize: r(14), color: C.text2 }}>{x.detail}</span></span>
                  </label>
                ))}
              </fieldset>
              <Field id="mp-note" label="Instruction for your pilot" optional value={note} onChange={e => setNote(e.target.value)} maxLength={120} helper="For example: “I’ll be wearing a blue jacket.” Avoid phone numbers." />
            </>
          ) : (
            <Card tone="tint"><p style={{ fontSize: r(14), color: C.text2 }}>Drop-off: <strong style={{ color: C.text }}>{pt.label}</strong></p></Card>
          )}
          <Card>
            <div className="flex flex-col" style={{ gap: r(8) }}>
              <Label>Sample distances (simulated, not live routing)</Label>
              {isPickup && <KV k="Your walk to this point" v={`${walk} m`} />}
              <KV k="Shared ride distance" v="14.2 km" />
              {isPickup && <KV k="Pilot detour" v={`+${detour} min`} />}
            </div>
          </Card>
          <Btn onClick={use}>{isPickup ? 'Use this pickup' : 'Use this destination'}</Btn>
          <Btn variant="text" onClick={c.back}>Search another place</Btn>
        </div>
      </div>
    </div>
  )
}

// ── Schedule ─────────────────────────────────────────────────────────────────

export function Schedule({ c }: { c: Ctx }) {
  const { s } = c
  const d = s.draft, set = s.setDraft
  const [tried, setTried] = useState(false)
  const err = validateDraft(d)
  const bad = Object.keys(err).length > 0
  const weekly = d.mode === 'weekly'
  const today = todayISO(), tomorrow = addDays(today, 1)
  const amount = s.proto.estimate === 'unavailable' ? null : DEMO_AMOUNT
  const go = () => {
    setTried(true)
    if (bad) { window.setTimeout(() => (document.querySelector('[aria-invalid="true"],[data-bad]') as HTMLElement | null)?.focus(), 30); return }
    if (c.prev === 'review-request') c.back(); else c.go('review-request')
  }
  if (!d.pickup || !d.destination) return (
    <Screen top={<PageTop back={c.back} />}><Heading>When do you want to travel?</Heading><Notice kind="info">Choose a pickup and destination first.</Notice><Btn onClick={() => c.go('searching')}>Plan your route</Btn></Screen>
  )
  const first = weekly ? d.startDate : d.date
  return (
    <Screen top={<PageTop back={c.back} />} gap={20} footer={<Btn onClick={go}>Review request</Btn>}>
      <Heading>{s.editingId ? 'Edit your request' : 'When do you want to travel?'}</Heading>
      <Card>
        <RouteLine from={d.pickup.name} to={d.destination.name} fromSub={d.pickupPoint?.label} />
        <button type="button" onClick={() => c.go('searching')} className="ob-btn ob-btn-text" style={{ minHeight: r(48), marginTop: r(6), marginLeft: r(-8), padding: `0 ${r(8)}`, color: C.primary, fontWeight: 600, fontSize: r(16) }}>Edit route</button>
      </Card>
      {tried && bad && <Notice kind="error">Fix the highlighted fields to continue. Your other choices are saved.</Notice>}
      {!c.online && <Notice kind="warning">You’re offline. This draft is saved on this device. You’ll need a connection to publish.</Notice>}

      <Segmented label="How often" value={d.mode} options={[['one', 'One time'], ['weekly', 'Repeat weekly']]} onChange={v => set({ mode: v })} />

      {!weekly ? (
        <div className="flex flex-col" style={{ gap: r(12) }}>
          <div className="flex flex-wrap" style={{ gap: r(8) }}>
            <Chip wide on={d.date === today} onClick={() => set({ date: today })}>Today</Chip>
            <Chip wide on={d.date === tomorrow} onClick={() => set({ date: tomorrow })}>Tomorrow</Chip>
          </div>
          <Field id="date" label="Date" type="date" min={today} value={d.date} onChange={e => set({ date: e.target.value })} error={tried ? err.date : undefined}
            helper={d.date ? `${dayLabel(d.date)}, ${parseYear(d.date)}` : undefined} />
        </div>
      ) : (
        <div className="flex flex-col" style={{ gap: r(16) }}>
          <div className="flex flex-wrap" style={{ gap: r(12) }}>
            <div style={{ flex: `1 1 ${r(150)}` }}><Field id="start" label="Start date" type="date" min={today} value={d.startDate} onChange={e => set({ startDate: e.target.value })} error={tried ? err.date : undefined} /></div>
            <div style={{ flex: `1 1 ${r(150)}` }}><Field id="end" label="End date" type="date" min={d.startDate} value={d.endDate} onChange={e => set({ endDate: e.target.value })} error={tried ? err.range : undefined} /></div>
          </div>
          <fieldset style={{ border: 0, padding: 0, minWidth: 0 }}>
            <legend style={{ fontSize: r(14), fontWeight: 600, color: C.text, marginBottom: r(8) }}>Repeat on</legend>
            <div className="flex flex-wrap" style={{ gap: r(8) }} data-bad={tried && err.days ? '' : undefined} tabIndex={tried && err.days ? -1 : undefined}>
              {WEEKDAYS.map((w, i) => (
                <Chip key={w} on={d.days[i]} label={['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][i]} onClick={() => set({ days: d.days.map((x, j) => j === i ? !x : x) })}>{w}</Chip>
              ))}
            </div>
            {tried && err.days && <p role="alert" style={{ fontSize: r(14), color: C.errText, marginTop: r(8) }}>{err.days}</p>}
          </fieldset>
          {!err.days && !err.range && <Body size={14}>{days(d.days)}, {fmtDate(d.startDate)} to {fmtDate(d.endDate)}. Each date needs its own {`pilot`} acceptance.</Body>}
        </div>
      )}

      <div className="flex flex-col" style={{ gap: r(8) }}>
        <H2>Departure window</H2>
        <div className="flex flex-wrap" style={{ gap: r(12) }}>
          <div style={{ flex: `1 1 ${r(140)}` }}><Field id="earliest" label="Earliest" type="time" value={d.earliest} onChange={e => set({ earliest: e.target.value })} /></div>
          <div style={{ flex: `1 1 ${r(140)}` }}><Field id="latest" label="Latest" type="time" value={d.latest} onChange={e => set({ latest: e.target.value })} error={tried ? err.time : undefined} /></div>
        </div>
        <Body size={14}>Choose a time window that works for you. All times are India Standard Time (IST).</Body>
      </div>

      <Card tone="tint">
        <div className="flex flex-col" style={{ gap: r(6) }}>
          <Label>{weekly ? 'Estimated contribution per ride' : 'Estimated fuel contribution'}</Label>
          {amount ? <p style={{ fontSize: r(24), fontWeight: 700, color: C.text }}>{inr(amount)} <span style={{ fontSize: r(13), fontWeight: 500, color: C.text3 }}>demo estimate</span></p>
            : <p style={{ fontSize: r(16), color: C.text }}>Estimate unavailable right now. You can continue; you’ll need it before publishing.</p>}
          <button type="button" onClick={() => c.open('estimate')} className="ob-btn ob-btn-text self-start" style={{ minHeight: r(48), color: C.primary, fontWeight: 600, fontSize: r(15), padding: 0 }}>How this is estimated</button>
        </div>
      </Card>
      <span className="sr-only" aria-live="polite">{first && tried && bad ? 'Some fields need attention.' : ''}</span>
    </Screen>
  )
}
const parseYear = (s: string) => fmtDate(s, true).split(' ').pop()

// ── Review ───────────────────────────────────────────────────────────────────

const overlaps = (a: { earliest: string; latest: string }, b: { earliest: string; latest: string }) => a.earliest < b.latest && b.earliest < a.latest

export function Review({ c }: { c: Ctx }) {
  const { s } = c
  const d = s.draft
  const later = useTimers()
  const [ackChanged, setAckChanged] = useState(false)
  const [conflict, setConflict] = useState<Ride | null>(null)
  const phase = s.publishPhase
  const weekly = d.mode === 'weekly'
  const est = s.proto.estimate
  const amount = est === 'unavailable' ? null : est === 'changed' ? CHANGED_AMOUNT : DEMO_AMOUNT
  const dates = occurrenceDates({ mode: d.mode, date: d.date, startDate: d.startDate, endDate: d.endDate, days: d.days }, 60)
  const errs = validateDraft(d)
  const canPublish = !!d.pickup && !!d.destination && Object.keys(errs).length === 0 && amount !== null && (est !== 'changed' || ackChanged) && phase !== 'publishing' && phase !== 'checking'

  if (!d.pickup || !d.destination) return (
    <Screen top={<PageTop back={c.back} />}><Heading>Review your ride request</Heading><Notice kind="info">Your draft needs a route first.</Notice><Btn onClick={() => c.go('searching')}>Plan your route</Btn></Screen>
  )

  const finalize = () => {
    const ex = s.editingId ? s.rides.find(x => x.id === s.editingId) : null
    const occFor = (old?: Record<string, 'awaiting' | 'confirmed' | 'skipped'>) => {
      const o: Record<string, 'awaiting' | 'confirmed' | 'skipped'> = {}
      dates.forEach(x => { o[x] = old?.[x] ?? 'awaiting' })
      Object.entries(old ?? {}).forEach(([k, v]) => { if (v === 'confirmed') o[k] = v })
      return o
    }
    if (s.editingId) {
      if (!ex || (ex.status !== 'awaiting' && !(ex.mode === 'weekly' && d.mode === 'weekly'))) {
        s.setEditingId(null); s.setPublishPhase('idle')
        if (ex) { c.say(`This request was accepted while you were editing. Showing your confirmed booking.`); c.openRide(ex) } else c.root('my-rides')
        return
      }
      s.patchRide(ex.id, { mode: d.mode, date: dates[0] ?? d.startDate, startDate: d.startDate, endDate: d.endDate, days: d.days, earliest: d.earliest, latest: d.latest,
        pickup: d.pickup!, pickupPoint: d.pickupPoint ?? d.pickup!.points[0], pickupNote: d.pickupNote, destination: d.destination!, amount: amount!, noMatchYet: false, occ: occFor(ex.occ) })
      s.setEditingId(null); s.setCurId(ex.id); s.resetDraft(); s.setPublishPhase('idle'); c.say('Request updated.'); c.root('waiting'); return
    }
    const ride = rideFromDraft(d, amount!)
    s.addRide(ride); s.setLastAcked(ride.createdAt); s.resetDraft(); s.setPublishPhase('idle'); c.root('waiting')
  }

  const publish = () => {
    if (!canPublish) return
    if (!c.online) { s.setPublishPhase('failed'); return }
    const hit = s.rides.find(x => x.id !== s.editingId && (x.status === 'awaiting' || x.status === 'confirmed') && !x.ended
      && overlaps(x, d) && occurrenceDates(x, 60).some(z => dates.includes(z)))
    if (hit) { setConflict(hit); s.setPublishPhase('conflict'); return }
    s.setPublishPhase('publishing'); setConflict(null)
    later(() => {
      if (s.proto.publish === 'failed') s.setPublishPhase('failed')
      else if (s.proto.publish === 'uncertain') s.setPublishPhase('uncertain')
      else finalize()
    }, 900)
  }
  const check = () => { s.setPublishPhase('checking'); later(() => { c.say('Your request was published.'); finalize() }, 900) }

  const Section = ({ title, onEdit, children, label }: { title: string; onEdit: () => void; children: React.ReactNode; label: string }) => (
    <section aria-label={title}>
      <Card>
        <div className="flex items-center justify-between" style={{ marginBottom: r(8) }}>
          <H2>{title}</H2>
          <button type="button" onClick={onEdit} aria-label={`Edit ${label}`} className="ob-btn ob-btn-text" style={{ minHeight: r(48), minWidth: r(48), padding: `0 ${r(8)}`, color: C.primary, fontWeight: 600, fontSize: r(16) }}>Edit</button>
        </div>
        {children}
      </Card>
    </section>
  )
  return (
    <Screen top={<PageTop back={c.back} />} gap={16}
      footer={
        phase === 'uncertain' || phase === 'checking'
          ? <Btn loading={phase === 'checking'} onClick={check}>Check status</Btn>
          : <Btn loading={phase === 'publishing'} disabled={!canPublish && phase !== 'publishing'} onClick={publish}>{weekly ? 'Publish schedule' : 'Publish request'}</Btn>
      }>
      <Heading>Review your ride request</Heading>

      {phase === 'failed' && <Notice kind="error">{c.online ? 'We couldn’t publish your request. Nothing was sent, and your draft is saved. Try again.' : 'You’re offline. Your draft is saved on this device. Connect to publish.'}</Notice>}
      {(phase === 'uncertain' || phase === 'checking') && <Notice kind="warning">We’re checking whether your request was published. Please don’t publish again — use Check status.</Notice>}
      {phase === 'conflict' && conflict && (
        <Notice kind="warning" action={<button type="button" onClick={() => openRide(c, conflict)} className="block" style={{ marginTop: r(6), minHeight: r(44), color: C.warnText, fontWeight: 600, textDecoration: 'underline' }}>View the existing request</button>}>
          You already have a request on {dayLabel(conflict.date)} within {fmtWindow(conflict)}. Change the date or time to continue.
        </Notice>
      )}
      {est === 'unavailable' && <Notice kind="warning">The fuel contribution estimate is unavailable right now, so you can’t publish yet. Your draft is saved. Try again in a moment.</Notice>}
      {est === 'changed' && (
        <Notice kind="warning" action={!ackChanged && <button type="button" onClick={() => setAckChanged(true)} className="block" style={{ marginTop: r(6), minHeight: r(44), color: C.warnText, fontWeight: 600, textDecoration: 'underline' }}>I’ve reviewed the new estimate</button>}>
          The estimate changed from {inr(DEMO_AMOUNT)} to {inr(CHANGED_AMOUNT)}. {ackChanged ? 'You’ve reviewed it.' : 'Please review it before publishing.'}
        </Notice>
      )}
      {Object.keys(errs).length > 0 && <Notice kind="error">Some schedule details need fixing. <button type="button" onClick={() => c.go('ticket-form')} style={{ fontWeight: 600, textDecoration: 'underline', minHeight: r(44) }}>Edit schedule</button></Notice>}

      <Section title="Route" label="route" onEdit={() => c.go('searching')}>
        <RouteLine from={d.pickup.name} to={d.destination.name} fromSub={d.pickupPoint ? `${d.pickupPoint.label}${d.pickupNote ? ` · “${d.pickupNote}”` : ''}` : undefined} />
      </Section>
      <Section title={weekly ? 'Recurring schedule' : 'Date'} label={weekly ? 'schedule' : 'date'} onEdit={() => c.go('ticket-form')}>
        {weekly ? <div className="flex flex-col" style={{ gap: r(6) }}><KV k="Repeats" v={days(d.days)} /><KV k="From" v={fmtDate(d.startDate, true)} /><KV k="Until" v={fmtDate(d.endDate, true)} /><KV k="Rides" v={`${dates.length}${dates.length >= 60 ? '+' : ''} dates`} /></div>
          : <p style={{ fontSize: r(16), fontWeight: 600, color: C.text }}>{dayLabel(d.date)}, {parseYear(d.date)}</p>}
      </Section>
      <Section title="Departure window" label="departure window" onEdit={() => c.go('ticket-form')}>
        <p style={{ fontSize: r(16), fontWeight: 600, color: C.text }}>{fmtWindow(d)} IST</p>
      </Section>

      <Card tone={est === 'changed' && !ackChanged ? 'warn' : 'plain'}>
        <H2>{weekly ? 'Estimated contribution per ride' : 'Fuel contribution'}</H2>
        <div className="flex flex-col" style={{ gap: r(8), marginTop: r(10) }}>
          <KV k="Fuel contribution estimate" v={amount === null ? 'Unavailable' : inr(amount)} />
          <KV k="Platform fee" v="₹0 — pilot" />
          <div style={{ height: 1, background: C.divider }} />
          <KV k={weekly ? 'Total per ride' : 'Total'} v={amount === null ? '—' : inr(amount)} strong />
          <p style={{ fontSize: r(13), color: C.text3 }}>Demo estimate for the prototype, not a live tariff.</p>
        </div>
      </Card>
      <Card tone="tint">
        <div className="flex flex-col" style={{ gap: r(8) }}>
          <p style={{ fontSize: r(15), color: C.text }}><strong>Payment.</strong> Settle directly with your pilot by cash or your own UPI app after the ride. ChaloRaahi does not process the payment.</p>
          <p style={{ fontSize: r(15), color: C.text }}><strong>What happens next.</strong> Your request becomes a confirmed ride when an eligible pilot accepts it.{weekly && ' Each date needs its own pilot acceptance. The same pilot is not guaranteed.'}</p>
        </div>
      </Card>
    </Screen>
  )
}

// ── Waiting ──────────────────────────────────────────────────────────────────

export function Waiting({ c }: { c: Ctx }) {
  const { s } = c
  const ride = s.cur
  if (!ride) return <Screen><Heading>Request not found</Heading><Btn onClick={() => c.root('my-rides')}>Go to My rides</Btn></Screen>
  const fresh = Math.abs(ride.createdAt - s.lastAcked) < 3000
  const weekly = ride.mode === 'weekly'
  const notif = () => {
    if (s.proto.notifications === 'allow') { s.patchCur({ notif: 'enabled' }); c.say('Notifications on. We’ll tell you when a pilot accepts.') } else { s.patchCur({ notif: 'declined' }) }
  }
  const edit = () => { s.setDraft(draftFromRide(ride)); s.setEditingId(ride.id); c.go('ticket-form') }
  return (
    <Screen gap={20} footer={<>
      <Btn onClick={() => c.root('my-rides')}>View in My rides</Btn>
      <Btn variant="secondary" onClick={edit}>Edit request</Btn>
      <button type="button" onClick={() => c.open('cancel')} className="ob-btn ob-btn-text" style={{ minHeight: r(48), color: C.errText, fontWeight: 600, fontSize: r(16), textDecoration: 'underline' }}>Cancel request</button>
    </>}>
      {fresh && <Notice kind="success">Request published.</Notice>}
      <div className="flex items-start justify-between" style={{ gap: r(12) }}>
        <div className="flex flex-col" style={{ gap: r(8) }}>
          <Heading size={26}>Your request is open</Heading>
          <Body>A pilot travelling your way can accept this request. Check back here for updates.</Body>
        </div>
      </div>
      <svg viewBox="0 0 240 40" width="100%" height="40" aria-hidden style={{ maxWidth: r(260), alignSelf: 'center' }}>
        <path d="M14 20 H226" stroke={C.tintBorder} strokeWidth="3" strokeDasharray="4 8" strokeLinecap="round" />
        <circle cx="14" cy="20" r="9" fill="#12B76A" /><rect x="212" y="11" width="18" height="18" rx="4" fill={C.primary} />
      </svg>
      <Card>
        <div className="flex flex-col" style={{ gap: r(12) }}>
          <div className="flex items-center justify-between flex-wrap" style={{ gap: r(8) }}><StatusBadge status={ride.status} /></div>
          <RouteLine from={ride.pickup.name} to={ride.destination.name} />
          <KV k="Date" v={weekly ? `${days(ride.days)} from ${fmtDate(ride.date)}` : dayLabel(ride.date)} />
          <KV k="Departure window" v={`${fmtWindow(ride)} IST`} />
          <KV k={weekly ? 'Est. contribution per ride' : 'Estimated contribution'} v={inr(ride.amount)} />
        </div>
      </Card>
      {ride.noMatchYet && (
        <Notice kind="warning" action={
          <div className="flex flex-col" style={{ marginTop: r(8), gap: r(2) }}>
            <button type="button" onClick={() => { s.patchCur({ noMatchYet: false }); c.say('We’ll keep your request open.') }} style={linkBtn}>Keep waiting</button>
            <button type="button" onClick={edit} style={linkBtn}>Change date or time</button>
            <button type="button" onClick={() => c.open('cancel')} style={{ ...linkBtn, color: C.errText }}>Cancel request</button>
          </div>}>
          No pilot has accepted yet.
        </Notice>
      )}
      {ride.notif === 'ask' && (
        <Card tone="tint">
          <p style={{ fontSize: r(16), fontWeight: 600, color: C.text }}>Get notified when a pilot accepts.</p>
          <div className="flex flex-col" style={{ gap: r(8), marginTop: r(12) }}>
            <Btn variant="secondary" onClick={notif}>Enable notifications</Btn>
            <Btn variant="text" onClick={() => s.patchCur({ notif: 'declined' })}>Not now</Btn>
          </div>
        </Card>
      )}
      {ride.notif === 'declined' && <Body size={14}>Notifications are off. Your request stays available in My rides.</Body>}
      {ride.notif === 'enabled' && <Body size={14}>Notifications are on for this request.</Body>}
      {weekly && <Body size={14}>Each date needs its own pilot acceptance. The same pilot is not guaranteed.</Body>}
      {agreedTime(ride) && null}
    </Screen>
  )
}
const linkBtn: React.CSSProperties = { minHeight: 44, textAlign: 'left', fontWeight: 600, textDecoration: 'underline', color: C.warnText, fontSize: '0.9375rem' }

// ── My rides ─────────────────────────────────────────────────────────────────

export function MyRides({ c }: { c: Ctx }) {
  const { s } = c
  const [tab, setTab] = useState<'up' | 'past'>('up')
  const up = [...s.upcoming].sort((a, b) => rank(a) - rank(b) || a.date.localeCompare(b.date))
  const past = [...s.pastRides].sort((a, b) => b.date.localeCompare(a.date))
  const list = tab === 'up' ? up : past
  const series = s.upcoming.filter(x => x.mode === 'weekly' && !x.ended).length
  const key = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); const n = tab === 'up' ? 'past' : 'up'; setTab(n); window.setTimeout(() => document.getElementById(`tab-${n}`)?.focus(), 0) }
  }
  return (
    <Screen gap={16}>
      <Heading size={26}>My rides</Heading>
      <div role="tablist" aria-label="My rides" className="flex" style={{ borderBottom: `1px solid ${C.divider}` }}>
        {([['up', `Upcoming (${up.length})`], ['past', 'Past']] as const).map(([k, l]) => (
          <button key={k} id={`tab-${k}`} role="tab" aria-selected={tab === k} aria-controls="rides-panel" tabIndex={tab === k ? 0 : -1} onKeyDown={key} onClick={() => setTab(k)}
            className="flex-1" style={{ minHeight: r(48), fontSize: r(16), fontWeight: 600, color: tab === k ? C.primary : C.text2, borderBottom: `3px solid ${tab === k ? C.primary : 'transparent'}`, marginBottom: -1 }}>{l}</button>
        ))}
      </div>
      <Row icon="repeat" title="Recurring schedules" sub={series ? `${series} active` : 'None yet'} onClick={() => c.go('recurring')} />
      <div id="rides-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="flex flex-col" style={{ gap: r(12) }}>
        {list.length === 0 ? (
          tab === 'up' ? (
            <Card tone="tint"><p style={{ fontSize: r(16), fontWeight: 600, color: C.text }}>No upcoming rides yet.</p>
              <div style={{ marginTop: r(12) }}><Btn onClick={() => c.root('idle')}>Plan a ride</Btn></div></Card>
          ) : <Card><p style={{ fontSize: r(16), color: C.text2 }}>Your past rides will appear here.</p></Card>
        ) : list.map(x => <RideCard key={x.id} ride={x} onOpen={() => openRide(c, x)} />)}
      </div>
    </Screen>
  )
}

// ── Recurring schedules ──────────────────────────────────────────────────────

export function Recurring({ c }: { c: Ctx }) {
  const { s } = c
  const series = s.rides.filter(x => x.mode === 'weekly' && !x.ended && ['awaiting', 'confirmed'].includes(x.status))
  return (
    <Screen top={<PageTop back={c.back} />} gap={16}>
      <Heading size={26}>Recurring schedules</Heading>
      <Notice kind="info">Changes to this schedule won’t change rides that are already confirmed.</Notice>
      {series.length === 0 && <Card><p style={{ fontSize: r(16), color: C.text2 }}>No recurring schedules yet.</p><div style={{ marginTop: r(12) }}><Btn onClick={() => c.root('idle')}>Plan a ride</Btn></div></Card>}
      {series.map(x => {
        const dates = occurrenceDates(x, 8)
        return (
          <Card key={x.id}>
            <div className="flex flex-col" style={{ gap: r(12) }}>
              <div className="flex items-start justify-between" style={{ gap: r(8) }}>
                <h2 style={{ fontSize: r(17), fontWeight: 700, color: C.text }}>{days(x.days)}</h2>
                <Badge kind={x.paused ? 'warn' : 'ok'}>{x.paused ? 'Paused' : 'Active'}</Badge>
              </div>
              <RouteLine from={x.pickup.name} to={x.destination.name} />
              <KV k="Window" v={`${fmtWindow(x)} IST`} />
              <KV k="Dates" v={`${fmtDate(x.startDate)} – ${fmtDate(x.endDate)}`} />
              <div>
                <Label>Next dates</Label>
                <ul className="flex flex-col" style={{ marginTop: r(6) }}>
                  {dates.map(dt => {
                    const st = x.occ[dt] ?? 'awaiting'
                    return (
                      <li key={dt} className="flex items-center justify-between flex-wrap" style={{ gap: r(8), minHeight: r(48), borderTop: `1px solid ${C.divider}` }}>
                        <span style={{ fontSize: r(15), color: C.text, fontWeight: 600 }}>{dayLabel(dt)}</span>
                        <span className="flex items-center" style={{ gap: r(8) }}>
                          <span style={{ fontSize: r(14), color: st === 'confirmed' ? C.okText : C.text2 }}>{st === 'confirmed' ? 'Confirmed' : st === 'skipped' ? 'Skipped' : x.paused ? 'Paused' : 'Awaiting pilot'}</span>
                          {st === 'confirmed' && <button type="button" onClick={() => { s.setCurId(x.id); c.go('rider-accepted') }} style={{ minHeight: r(44), padding: `0 ${r(8)}`, color: C.primary, fontWeight: 600, textDecoration: 'underline' }}>Open booking<span className="sr-only"> for {dayLabel(dt)}</span></button>}
                          {st === 'awaiting' && !x.paused && <button type="button" onClick={() => { s.setCurId(x.id); c.open('skip', dt) }} style={{ minHeight: r(44), padding: `0 ${r(8)}`, color: C.primary, fontWeight: 600, textDecoration: 'underline' }}>Skip<span className="sr-only"> {dayLabel(dt)}</span></button>}
                        </span>
                      </li>
                    )
                  })}
                </ul>
                <p style={{ fontSize: r(13), color: C.text3, marginTop: r(6) }}>Each date needs its own pilot acceptance.</p>
              </div>
              <Btn variant="secondary" onClick={() => { s.patchRide(x.id, { paused: !x.paused }); c.say(x.paused ? 'Schedule resumed.' : 'Schedule paused. Confirmed rides are not affected.') }}>{x.paused ? 'Resume schedule' : 'Pause schedule'}</Btn>
              <Btn variant="secondary" onClick={() => { s.setDraft(draftFromRide(x)); s.setEditingId(x.id); c.go('ticket-form') }}>Edit future dates</Btn>
              <button type="button" onClick={() => { s.setCurId(x.id); c.open('end-schedule') }} className="ob-btn ob-btn-text" style={{ minHeight: r(48), color: C.errText, fontWeight: 600, fontSize: r(16), textDecoration: 'underline' }}>End this schedule</button>
            </div>
          </Card>
        )
      })}
    </Screen>
  )
}

