import { useEffect, useMemo, useState } from 'react'
import { Body, Btn, C, Heading, Ico, Notice, Screen, TopRow, r } from './OnboardingUI'
import { Card, Chip, Check, KV, RouteLine, Segmented, Skel, useTimers } from './PassengerUI'
import { STATUS_LABEL, dayLabel, fmtTime, inr, type Ride } from './PassengerData'
import { OPEN_STATES, TRIP_LABEL, maskReg, vehicleLine, type Trip } from './RiderData'
import { ago, CASE_STEPS, type CaseStatus, type Notif, type SupportCase } from './CommonData'
import { Expand, Group, InfoRow, NavRow, Page, Pill, Select, Sh, SwitchRow, Textarea, CONTRIBUTION_NOTE, fmtLong, useHost, type CCtx } from './CommonUI'

type Tone = 'ok' | 'warn' | 'err' | 'neutral' | 'info'

// ── Unified ride history ─────────────────────────────────────────────────────

type H = {
  key: string; role: 'buddy' | 'pilot'; id: string; date: string; time: string; status: string; tone: Tone; upcoming: boolean; recurring: boolean
  from: string; to: string; who: string | null; amount: number
  rating: Ride['rating']; settle: string; cancelled: string
  vehicle: string; reg: string; cancelledBy: string; raw: Ride | Trip
}

const buddySettle = (s: Ride['settlement']) => (s === 'paid' ? 'You marked the contribution as paid' : s === 'issue' ? 'You reported a problem with the contribution' : 'No settlement recorded yet')
const pilotSettle = (s: Trip['settlement']) =>
  s === 'cash' ? 'You recorded cash received' : s === 'upi' ? 'You recorded a UPI payment received' : s === 'notyet' ? 'You marked it as not received yet' : s === 'issue' ? 'You reported a problem with the contribution' : 'No settlement recorded yet'

function useHistory(c: CCtx): H[] {
  const { p, rs, a } = c
  return useMemo(() => {
    if (a.proto.member === 'new') return []
    const out: H[] = []
    for (const x of p.rides) {
      const up = ['awaiting', 'confirmed', 'on-the-way', 'at-pickup', 'in-progress'].includes(x.status)
      out.push({
        key: `buddy:${x.id}`, role: 'buddy', id: x.id, date: x.mode === 'weekly' ? x.startDate : x.date, time: x.earliest, status: STATUS_LABEL[x.status],
        tone: x.status === 'completed' ? 'ok' : up ? 'info' : x.status === 'cancelled' ? 'err' : 'neutral', upcoming: up, recurring: x.mode === 'weekly',
        from: x.pickup.name, to: x.destination.name, who: x.rider?.name ?? null, amount: x.amount, rating: x.rating, settle: buddySettle(x.settlement),
        cancelled: x.status === 'cancelled' ? x.cancelReason : '', cancelledBy: x.cancelledBy === 'passenger' ? 'you' : x.cancelledBy === 'rider' ? 'the Pilot' : '',
        vehicle: x.rider ? `${x.rider.vehicle} · ${x.rider.color}` : '', reg: x.rider?.reg ?? '', raw: x,
      })
    }
    for (const t of rs.trips) {
      if (t.status === 'draft') continue
      const up = OPEN_STATES.includes(t.status)
      out.push({
        key: `pilot:${t.id}`, role: 'pilot', id: t.id, date: t.mode === 'weekly' ? t.startDate : t.date, time: t.time, status: TRIP_LABEL[t.status],
        tone: t.status === 'completed' ? 'ok' : up ? 'info' : t.status === 'cancelled' ? 'err' : 'neutral', upcoming: up, recurring: t.mode === 'weekly',
        from: t.pickup.name, to: t.destination.name, who: t.req?.name ?? null, amount: t.amount, rating: t.rating, settle: pilotSettle(t.settlement),
        cancelled: t.status === 'cancelled' ? t.cancelReason : '', cancelledBy: t.cancelledBy === 'pilot' ? 'you' : t.cancelledBy === 'buddy' ? 'the Buddy' : '',
        vehicle: vehicleLine(rs.vehicle), reg: rs.vehicle.reg ? maskReg(rs.vehicle.reg) : '', raw: t,
      })
    }
    return out
  }, [p.rides, rs.trips, rs.vehicle, a.proto.member])
}

const sortHist = (l: H[], up: boolean) => [...l].sort((x, y) => (up ? x.date.localeCompare(y.date) : y.date.localeCompare(x.date)))

export function RideHistory({ c }: { c: CCtx }) {
  const { a } = c
  const all = useHistory(c)
  const rec = c.nav.p.filter === 'recurring'
  const { histRole: role, histTab: tab } = a.ui
  const list = sortHist(all.filter(h => (role === 'All' || (role === 'As Buddy' ? h.role === 'buddy' : h.role === 'pilot')) && h.upcoming === (tab === 'Upcoming') && (!rec || h.recurring)), tab === 'Upcoming')
  return (
    <Page title={rec ? 'Recurring schedules' : 'Ride history'} onBack={c.back}>
      <Segmented label="Role" value={role} options={[['All', 'All'], ['As Buddy', 'As Buddy'], ['As Pilot', 'As Pilot']]} onChange={v => a.setUi(u => ({ ...u, histRole: v }))} />
      <Segmented label="Time" value={tab} options={[['Upcoming', 'Upcoming'], ['Past', 'Past']]} onChange={v => a.setUi(u => ({ ...u, histTab: v }))} />
      {list.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center text-center" style={{ gap: r(8), padding: `${r(12)} 0` }}>
            <span className="flex items-center justify-center" style={{ width: r(56), height: r(56), borderRadius: 999, background: C.tint, color: C.primary }}><Ico name="calendar" size={26} /></span>
            <h2 style={{ fontSize: r(18), fontWeight: 600 }}>{all.length === 0 ? 'No rides yet' : `No ${tab.toLowerCase()} ${rec ? 'schedules' : 'rides'}${role !== 'All' ? ` ${role.toLowerCase()}` : ''}`}</h2>
            <Body size={15} center>{all.length === 0 ? 'Your rides and trips will appear here after you request or offer one.' : 'Try another filter.'}</Body>
          </div>
        </Card>
      ) : (
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: r(12) }}>
          {list.map(h => (
            <li key={h.key}>
              <button type="button" onClick={() => c.go('ride-detail', { id: h.id, role: h.role })} className="ob-row w-full text-left" style={{ padding: r(16), borderRadius: r(16), border: `1px solid ${C.divider}`, background: '#fff', display: 'flex', flexDirection: 'column', gap: r(8) }}>
                <span className="flex items-center justify-between" style={{ gap: r(8) }}>
                  <span style={{ fontSize: r(14), color: C.text2 }}>{dayLabel(h.date)} · {fmtTime(h.time)}</span>
                  <Pill kind={h.tone}>{h.status}</Pill>
                </span>
                <span style={{ fontSize: r(16), fontWeight: 600, color: C.text, overflowWrap: 'anywhere' }}>{h.from} to {h.to}</span>
                <span style={{ fontSize: r(14), color: C.text2 }}>{h.role === 'buddy' ? 'As Buddy' : 'As Pilot'}{h.who ? ` · with ${h.who}` : ''}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Page>
  )
}

export function RideDetail({ c }: { c: CCtx }) {
  const all = useHistory(c)
  const h = all.find(x => x.id === c.nav.p.id && x.role === (c.nav.p.role ?? x.role)) ?? (c.nav.p.id ? undefined : all[0])
  if (!h) {
    return (
      <Page title="Ride details" onBack={c.back}>
        <Notice kind="info">This ride is no longer available in your history.</Notice>
        <Btn onClick={c.back}>Back</Btn>
      </Page>
    )
  }
  const who = h.role === 'buddy' ? 'Pilot' : 'Buddy'
  const ratingText = h.rating == null ? 'Not rated yet' : h.rating === 'skipped' ? 'Rating skipped' : `You rated ${h.rating.stars} out of 5${h.rating.tags.length ? ` · ${h.rating.tags.join(', ')}` : ''}`
  const done = h.status === 'Completed' || h.status === 'Ended early'
  return (
    <Page title={`${h.from} to ${h.to}`} onBack={c.back}>
      <div className="flex items-center flex-wrap" style={{ gap: r(8) }}>
        <Pill kind={h.tone}>{h.status}</Pill><Pill kind="neutral">{h.role === 'buddy' ? 'You were the Buddy' : 'You were the Pilot'}</Pill>
      </div>
      <Card>
        <div className="flex flex-col" style={{ gap: r(12) }}>
          <p style={{ fontSize: r(14), color: C.text2 }}>{dayLabel(h.date)} · {fmtTime(h.time)}</p>
          <RouteLine from={h.from} to={h.to} />
        </div>
      </Card>
      <Card>
        <div className="flex flex-col" style={{ gap: r(10) }}>
          <KV k={who} v={h.who ?? `No ${who} joined`} />
          {h.vehicle && <KV k="Vehicle" v={h.vehicle} />}
          {h.reg && <KV k="Registration" v={h.reg} />}
        </div>
      </Card>
      <Card>
        <div className="flex flex-col" style={{ gap: r(10) }}>
          <KV k="Agreed fuel contribution" v={inr(h.amount)} strong />
          <KV k="ChaloRaahi platform fee" v={inr(0)} />
          <KV k="Settlement" v={h.settle} />
          <p style={{ fontSize: r(13), color: C.text2 }}>Settled directly between participants. {CONTRIBUTION_NOTE}</p>
        </div>
      </Card>
      {h.cancelled || h.cancelledBy ? <Notice kind="info">Cancelled by {h.cancelledBy || 'a participant'}{h.cancelled ? `: ${h.cancelled}` : ''}.</Notice> : null}
      {done && <Card><KV k="Rating" v={ratingText} /></Card>}
      <div className="flex flex-col" style={{ gap: r(12) }}>
        {h.upcoming && <Btn onClick={() => c.onOpenRide(h.role, h.id)}>Open this {h.role === 'buddy' ? 'ride' : 'trip'}</Btn>}
        {done && <Btn variant="secondary" onClick={() => c.onOpenRide(h.role, h.id)}>View ride summary</Btn>}
        <Btn variant={h.upcoming ? 'secondary' : 'secondary'} onClick={() => c.go('support-form', { id: h.key, filter: 'Ride problem' })}>Report a problem with this ride</Btn>
      </div>
    </Page>
  )
}

// ── Notifications ────────────────────────────────────────────────────────────

const groupOf = (n: Notif) => (n.minsAgo < 60 * 16 ? 'Today' : 'Earlier')

export function NotifList({ c, forceEmpty }: { c: CCtx; forceEmpty: boolean }) {
  const { a } = c
  const t = useTimers()
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState(false)
  useEffect(() => { t(() => setLoading(false), 450) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const mode = forceEmpty ? 'empty' : a.proto.notifMode
  const f = a.ui.notifFilter
  const items = (mode === 'empty' ? [] : [...a.notifs]).filter(n => f === 'All' || (f === 'Rides' ? n.kind === 'ride' : n.kind === 'account')).sort((x, y) => x.minsAgo - y.minsAgo)
  const unread = a.notifs.filter(n => !n.read).length
  const retry = () => { setRetrying(true); t(() => { setRetrying(false); if (a.proto.network === 'online') a.setProto(p => ({ ...p, notifMode: 'normal' })) }, 900) }
  const open = (n: Notif) => { a.markRead(n.id); c.go('notif-detail', { id: n.id }) }

  return (
    <Page title="Notifications" onBack={c.back} right={unread > 0 && mode !== 'empty' ? (
      <button type="button" onClick={() => a.setNotifs(ns => ns.map(n => ({ ...n, read: true })))} style={{ minHeight: r(48), padding: `0 ${r(8)}`, color: C.primary, fontWeight: 600, fontSize: r(15), textDecoration: 'underline' }}>Mark all read</button>
    ) : undefined}>
      {mode === 'error' && (
        <Notice kind="error" action={<Btn variant="text" loading={retrying} onClick={retry} style={{ justifyContent: 'flex-start', padding: 0, minHeight: r(48) }}>Try again</Btn>}>
          <b>Notifications couldn't be refreshed.</b> Showing the ones saved on this device.
        </Notice>
      )}
      {mode === 'offline' && <Notice kind="warning">You're offline. Showing notifications saved on this device.</Notice>}
      {mode !== 'empty' && (
        <div role="group" aria-label="Filter notifications" className="flex" style={{ gap: r(8) }}>
          {['All', 'Rides', 'Account'].map(x => <Chip key={x} wide on={f === x} onClick={() => a.setUi(u => ({ ...u, notifFilter: x }))}>{x}</Chip>)}
        </div>
      )}
      {loading ? (
        <div className="flex flex-col" style={{ gap: r(12) }} aria-busy="true"><span className="sr-only" role="status">Loading notifications</span>{[0, 1, 2].map(i => <Skel key={i} h={72} />)}</div>
      ) : items.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center text-center" style={{ gap: r(8), padding: `${r(12)} 0` }}>
            <span className="flex items-center justify-center" style={{ width: r(56), height: r(56), borderRadius: 999, background: C.tint, color: C.primary }}><Ico name="bell" size={26} /></span>
            <h2 style={{ fontSize: r(18), fontWeight: 600 }}>{mode === 'empty' ? "You're all caught up" : `No ${f.toLowerCase()} notifications`}</h2>
            <Body size={15} center>{mode === 'empty' ? 'New ride and account updates will show up here.' : 'Try another filter to see other updates.'}</Body>
            {mode !== 'empty' && <Btn variant="secondary" onClick={() => a.setUi(u => ({ ...u, notifFilter: 'All' }))}>Show all</Btn>}
          </div>
        </Card>
      ) : (
        (['Today', 'Earlier'] as const).map(g => {
          const l = items.filter(n => groupOf(n) === g)
          if (!l.length) return null
          return (
            <section key={g} className="flex flex-col" style={{ gap: r(8) }}>
              <h2 style={{ fontSize: r(13), fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: C.text2 }}>{g}</h2>
              <ul style={{ listStyle: 'none', border: `1px solid ${C.divider}`, borderRadius: r(16), overflow: 'hidden' }}>
                {l.map((n, i) => (
                  <li key={n.id} style={{ borderTop: i ? `1px solid ${C.divider}` : undefined }}>
                    <button type="button" onClick={() => open(n)} className="ob-row w-full text-left flex items-start" style={{ padding: r(14), gap: r(12), background: n.read ? '#fff' : C.tint }}>
                      <span className="flex items-center justify-center flex-shrink-0" style={{ width: r(36), height: r(36), borderRadius: 999, background: '#fff', border: `1px solid ${C.tintBorder}`, color: C.primary }}><Ico name={n.kind === 'ride' ? 'scooter' : 'user'} size={18} /></span>
                      <span className="flex-1 min-w-0">
                        <span className="block" style={{ fontSize: r(16), fontWeight: n.read ? 500 : 700, color: C.text, overflowWrap: 'anywhere' }}>{!n.read && <span className="sr-only">Unread. </span>}{n.title}</span>
                        <span className="block" style={{ fontSize: r(14), color: C.text2, overflowWrap: 'anywhere' }}>{n.body}</span>
                        <span className="block" style={{ fontSize: r(13), color: C.text3, marginTop: r(2) }}>{ago(n.minsAgo)}</span>
                      </span>
                      {!n.read && <span aria-hidden style={{ width: 10, height: 10, borderRadius: 99, background: C.primary, marginTop: 8, flexShrink: 0 }} />}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )
        })
      )}
    </Page>
  )
}

export function NotifDetail({ c }: { c: CCtx }) {
  const { a, p, rs } = c
  const n = a.notifs.find(x => x.id === c.nav.p.id) ?? (c.nav.p.id ? undefined : a.notifs[0])
  useEffect(() => { if (n && !n.read) a.markRead(n.id) }, [n?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!n) return <Page title="Notification" onBack={c.back}><Notice kind="info">This notification is no longer available.</Notice><Btn onClick={c.back}>Back to notifications</Btn></Page>
  const d = n.dest
  let current = ''
  let missing = false
  let cancelled = false
  if (d.type === 'ride') {
    const rec = d.role === 'buddy' ? p.rides.find(x => x.id === d.rideId) : rs.trips.find(x => x.id === d.rideId)
    if (!rec) missing = true
    else {
      current = d.role === 'buddy' ? STATUS_LABEL[(rec as Ride).status] : TRIP_LABEL[(rec as Trip).status]
      cancelled = ['cancelled', 'expired'].includes(rec.status)
    }
  }
  return (
    <Page title={n.title} sub={ago(n.minsAgo)} onBack={c.back}>
      <Card>
        <div className="flex flex-col" style={{ gap: r(6) }}>
          <h2 style={{ fontSize: r(13), fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: C.text2 }}>Original update</h2>
          <p style={{ fontSize: r(16), color: C.text, lineHeight: 1.5 }}>{d.original}</p>
        </div>
      </Card>
      {d.type === 'ride' && (missing ? (
        <Notice kind="info">This ride is no longer available in your history, so there are no current details to show.</Notice>
      ) : (
        <Card tone={cancelled ? 'warn' : 'plain'}>
          <div className="flex flex-col" style={{ gap: r(6) }}>
            <h2 style={{ fontSize: r(13), fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: C.text2 }}>Current status</h2>
            <p style={{ fontSize: r(16), fontWeight: 600, color: C.text }}>{current}</p>
            {cancelled && n.title.toLowerCase().includes('accepted') && <p style={{ fontSize: r(15), color: C.warnText }}>This ride was accepted earlier but has since been cancelled.</p>}
          </div>
        </Card>
      ))}
      {d.type === 'ride' && !missing && <Btn onClick={() => c.go('ride-detail', { id: d.rideId, role: d.role })}>View current ride details</Btn>}
      {d.type === 'account' && <Btn onClick={() => c.go(d.to)}>{d.to === 'verify-status' ? 'Open verification' : 'Open'}</Btn>}
      <Btn variant="text" onClick={c.back}>Back to notifications</Btn>
    </Page>
  )
}

// ── Notification preferences ─────────────────────────────────────────────────

export function NotifPrefs({ c }: { c: CCtx }) {
  const { a } = c
  const t = useTimers()
  const [st, setSt] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle')
  const perm = a.proto.device
  const toggle = (k: keyof typeof a.prefs, v: boolean) => {
    const prev = a.prefs
    a.setPrefs({ ...prev, [k]: v }); setSt('saving')
    t(() => {
      if (a.proto.prefSave === 'failed' || a.proto.network === 'offline') { a.setPrefs(prev); setSt('failed') } else setSt('saved')
    }, 700)
  }
  const S = (id: keyof typeof a.prefs, title: string, sub: string) => <SwitchRow key={id} id={`np-${id}`} title={title} sub={sub} checked={a.prefs[id]} onChange={v => toggle(id, v)} />
  return (
    <Page title="Notification preferences" onBack={c.back}>
      <Card tone={perm === 'denied' ? 'warn' : 'plain'}>
        <div className="flex flex-col" style={{ gap: r(10) }}>
          <div className="flex items-center justify-between" style={{ gap: r(8) }}>
            <h2 style={{ fontSize: r(17), fontWeight: 600 }}>On this device</h2>
            <Pill kind={perm === 'allowed' ? 'ok' : perm === 'denied' ? 'warn' : 'neutral'}>{perm === 'allowed' ? 'Allowed' : perm === 'denied' ? 'Turned off' : 'Not requested'}</Pill>
          </div>
          <p style={{ fontSize: r(15), color: C.text2 }}>
            {perm === 'allowed' ? 'Your device can show ChaloRaahi alerts.' : perm === 'denied' ? 'Alerts are turned off in your device settings. You will still see updates inside the app. To change this, open your device settings for ChaloRaahi.' : 'Allow alerts so you do not miss ride changes when the app is closed.'}
          </p>
          {perm === 'not-requested' && <Btn variant="secondary" onClick={() => a.setProto(p => ({ ...p, device: 'allowed' }))}>Turn on device alerts</Btn>}
        </div>
      </Card>
      <div role="status" aria-live="polite" style={{ minHeight: r(24) }}>
        {st === 'saving' && <p style={{ fontSize: r(14), color: C.text2 }}>Saving…</p>}
        {st === 'saved' && <p style={{ fontSize: r(14), color: C.okText, fontWeight: 600 }}>Preferences saved</p>}
      </div>
      {st === 'failed' && <Notice kind="error">We couldn't save that change, so the previous setting was restored. Try again.</Notice>}
      <Group title="Ride updates">
        {S('rideConfirm', 'Ride confirmed or declined', 'When a request is accepted or can’t be matched')}
        {S('rideArrival', 'Arrival and pickup', 'When your Pilot or Buddy is on the way or at the pickup point')}
        {S('rideChange', 'Changes and cancellations', 'When a ride time, place or status changes')}
        {S('rideMsg', 'Ride messages', 'Short messages from the person you are riding with')}
      </Group>
      <Group title="Matching">
        {S('matchBuddy', 'Matches for my requests', 'As a Buddy')}
        {S('matchPilot', 'New requests on my route', 'As a Pilot')}
      </Group>
      <Group title="Optional updates">
        {S('feedback', 'Rating reminders', 'A nudge to rate a finished ride')}
        {S('tips', 'Tips and news about ChaloRaahi', 'Occasional updates about the pilot')}
      </Group>
      <Notice kind="info"><b>Essential information</b> such as account security, safety alerts and changes to active rides is always sent and can't be turned off.</Notice>
    </Page>
  )
}

// ── Help and support ─────────────────────────────────────────────────────────

const FAQ: [string, string][] = [
  ['How does ChaloRaahi work?', 'Buddies request a ride along a route and time. Pilots who ride that way can accept. Both meet at an agreed pickup point and share the fuel contribution.'],
  ['Who can use ChaloRaahi?', 'Members of VGU, Jaipur whose college membership has been reviewed by an authorized operator. Pilots also need licence and vehicle documents approved.'],
  ['How is the fuel contribution settled?', 'Directly between the two participants, in cash or through their own UPI app. ChaloRaahi does not process the payment and charges no platform fee.'],
  ['What if my Pilot or Buddy does not show up?', 'Wait at the pickup point for a short while, then use the ride screen to report that they did not show. You can also contact support from the ride.'],
  ['How do I cancel or change a ride?', 'Open the ride from My rides or My trips. Changing or cancelling is available while the ride is still open, and the other person is told.'],
  ['How do I report a problem or a safety concern?', 'Use Contact support below, or Report a concern in the Safety center. If you are in danger, use Emergency help instead. Support requests are not an emergency service.'],
  ['What happens to my data?', 'Your details are used to run the pilot. You can see what others can see, request a copy of your data, or ask for your account to be deleted in Privacy and data.'],
]

export function HelpSupport({ c }: { c: CCtx }) {
  const [open, setOpen] = useState<number | null>(null)
  const n = c.a.cases.length
  return (
    <Page title="Help and support" sub="We’ll show the status of every request here. We can’t promise a response time." onBack={c.back}>
      <Group>
        <NavRow icon="send" title="Contact support" sub="Send us a question or report a problem" onClick={() => c.go('support-form')} />
        <NavRow icon="list" title="My support requests" sub={n ? `${n} ${n === 1 ? 'request' : 'requests'}` : 'None yet'} onClick={() => c.go('my-support')} />
      </Group>
      <section className="flex flex-col" style={{ gap: r(8) }}>
        <h2 style={{ fontSize: r(13), fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: C.text2 }}>Common questions</h2>
        <div style={{ border: `1px solid ${C.divider}`, borderRadius: r(16), overflow: 'hidden' }}>
          {FAQ.map(([q, ans], i) => <Expand key={q} id={`faq${i}`} title={q} open={open === i} onToggle={() => setOpen(open === i ? null : i)}>{ans}</Expand>)}
        </div>
      </section>
      <Notice kind="warning">In danger right now? Open the Safety center and use Emergency help.</Notice>
    </Page>
  )
}

const CATEGORIES = ['Ride problem', 'Contribution or settlement issue', 'Safety concern', 'Pilot or vehicle verification', 'Account or profile', 'Email correction', 'Account restriction', 'Account deletion', 'App feedback', 'Other']

export function SupportForm({ c }: { c: CCtx }) {
  const { a } = c
  const t = useTimers()
  const hist = useHistory(c)
  const [cat, setCat] = useState(CATEGORIES.includes(c.nav.p.filter ?? '') ? (c.nav.p.filter as string) : CATEGORIES[0])
  const [ride, setRide] = useState(c.nav.p.id ?? 'none')
  const [desc, setDesc] = useState('')
  const [err, setErr] = useState('')
  const [phase, setPhase] = useState<'idle' | 'sending' | 'failed'>('idle')
  const [done, setDone] = useState<SupportCase | null>(null)
  const label = (h: H) => `${dayLabel(h.date)} · ${h.from} to ${h.to} (${h.role === 'buddy' ? 'as Buddy' : 'as Pilot'})`
  const rideLabel = ride === 'none' ? 'No specific ride' : (hist.find(h => h.key === ride) ? label(hist.find(h => h.key === ride)!) : 'A ride')

  const submit = () => {
    const d = desc.trim()
    if (d.length < 10) { setErr('Tell us a little more, at least 10 characters.'); document.getElementById('sf-desc')?.focus(); return }
    setErr('')
    const base: SupportCase = { ref: a.nextRef(), category: cat, description: d, rideLabel, at: Date.now(), status: 'Submitted', draft: false, uncertain: false }
    if (a.proto.network === 'offline') { const x = { ...base, draft: true }; a.setCases(cs => [x, ...cs]); setDone(x); return }
    setPhase('sending')
    t(() => {
      if (a.proto.support === 'failed') { setPhase('failed'); return }
      const x: SupportCase = a.proto.support === 'uncertain' ? { ...base, uncertain: true } : { ...base, status: 'Acknowledged' }
      a.setCases(cs => [x, ...cs]); setPhase('idle'); setDone(x)
    }, 1000)
  }

  if (done) {
    return (
      <Screen center gap={16} footer={<><Btn onClick={() => c.nav.replace('support-case', { id: done.ref })}>View this request</Btn><Btn variant="text" onClick={c.back}>Back to help</Btn></>}>
        <span className="flex items-center justify-center" style={{ width: r(72), height: r(72), borderRadius: 999, background: done.draft || done.uncertain ? C.warnBg : C.okBg, color: done.draft || done.uncertain ? C.warnText : C.okText }}><Ico name={done.draft || done.uncertain ? 'clock' : 'check'} size={32} /></span>
        <Heading size={26} center>{done.draft ? 'Saved on this device' : done.uncertain ? 'We’re not sure it was sent' : 'Request received'}</Heading>
        <Body center size={16}>
          {done.draft ? 'You’re offline. Your request is saved as a draft and has not been sent. Send it from My support requests once you’re back online.'
            : done.uncertain ? 'The connection dropped before we got a confirmation. Check My support requests before sending it again, so we don’t get two.'
            : 'We’ve acknowledged your request. We’ll update its status here. We can’t promise a response time.'}
        </Body>
        {!done.draft && !done.uncertain && <Pill kind="ok">Reference {done.ref}</Pill>}
      </Screen>
    )
  }
  return (
    <Page title="Contact support" onBack={c.back} footer={
      <>
        {phase === 'failed' && <Notice kind="error">We couldn't send your request. What you wrote is still here. Try again.</Notice>}
        {a.proto.network === 'offline' && <Notice kind="warning">You're offline. Sending will save a draft on this device.</Notice>}
        <Btn loading={phase === 'sending'} onClick={submit}>{phase === 'sending' ? 'Sending…' : phase === 'failed' ? 'Try again' : a.proto.network === 'offline' ? 'Save draft' : 'Send request'}</Btn>
      </>
    }>
      <Select id="sf-cat" label="What is this about?" value={cat} onChange={setCat} options={CATEGORIES.map(x => [x, x])} />
      {cat === 'Safety concern' && (
        <Notice kind="warning" action={<button type="button" onClick={c.onSOS} className="block" style={{ minHeight: r(44), fontWeight: 700, textDecoration: 'underline', color: 'inherit' }}>Open emergency help</button>}>
          In danger right now? Use emergency help. Support requests are not an emergency service.
        </Notice>
      )}
      <Select id="sf-ride" label="Related ride" value={ride} onChange={setRide} options={[['none', 'No specific ride'], ...hist.map(h => [h.key, label(h)] as [string, string])]} />
      <Textarea id="sf-desc" label="What happened?" value={desc} onChange={setDesc} error={err} maxLength={1000} helper="Please don’t include passwords or payment details." />
    </Page>
  )
}

type Case = SupportCase
const caseTone = (s: Case): [Tone, string] => (s.draft ? ['warn', 'Draft on this device'] : s.uncertain ? ['warn', 'Not confirmed'] : s.status === 'Resolved' ? ['ok', 'Resolved'] : ['info', s.status])

export function MySupport({ c }: { c: CCtx }) {
  const { a } = c
  const { say } = useHost()
  const safety = c.nav.p.filter === 'safety'
  const list = a.cases.filter(x => !safety || x.category === 'Safety concern')
  const send = (x: Case) => {
    if (a.proto.network === 'offline') { say('Still offline. The draft is kept.'); return }
    a.setCases(cs => cs.map(y => (y.ref === x.ref ? { ...y, draft: false, status: 'Acknowledged' } : y))); say('Request sent')
  }
  return (
    <Page title={safety ? 'My reports' : 'My support requests'} onBack={c.back}>
      {list.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center text-center" style={{ gap: r(8), padding: `${r(12)} 0` }}>
            <h2 style={{ fontSize: r(18), fontWeight: 600 }}>{safety ? 'No reports yet' : 'No support requests yet'}</h2>
            <Body size={15} center>{safety ? 'Concerns you report will be listed here with their status.' : 'When you contact support, you can follow the request here.'}</Body>
            <Btn onClick={() => c.go('support-form', safety ? { filter: 'Safety concern' } : {})}>{safety ? 'Report a concern' : 'Contact support'}</Btn>
          </div>
        </Card>
      ) : (
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: r(12) }}>
          {list.map(x => {
            const [tn, tl] = caseTone(x)
            return (
              <li key={x.ref}>
                <div style={{ padding: r(16), borderRadius: r(16), border: `1px solid ${C.divider}`, display: 'flex', flexDirection: 'column', gap: r(8) }}>
                  <button type="button" onClick={() => c.go('support-case', { id: x.ref })} className="w-full text-left flex flex-col" style={{ gap: r(6), minHeight: r(48) }}>
                    <span className="flex items-center justify-between" style={{ gap: r(8) }}><span style={{ fontSize: r(14), color: C.text2 }}>{x.draft ? 'Not sent' : x.ref}</span><Pill kind={tn}>{tl}</Pill></span>
                    <span style={{ fontSize: r(16), fontWeight: 600, color: C.text }}>{x.category}</span>
                    <span style={{ fontSize: r(14), color: C.text2, overflowWrap: 'anywhere' }}>{x.description.length > 80 ? x.description.slice(0, 80) + '…' : x.description}</span>
                  </button>
                  {x.draft && <Btn variant="secondary" onClick={() => send(x)}>Send draft</Btn>}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Page>
  )
}

export function SupportCaseScreen({ c }: { c: CCtx }) {
  const x = c.a.cases.find(y => y.ref === c.nav.p.id) ?? (c.nav.p.id ? undefined : c.a.cases[0])
  if (!x) return <Page title="Support request" onBack={c.back}><Notice kind="info">We can't find this request.</Notice><Btn onClick={c.back}>Back</Btn></Page>
  const idx = CASE_STEPS.indexOf(x.status as CaseStatus)
  const [tn, tl] = caseTone(x)
  return (
    <Page title={x.category} sub={x.draft ? 'Not sent yet' : `Reference ${x.ref}`} onBack={c.back}>
      <div><Pill kind={tn}>{tl}</Pill></div>
      {x.draft && <Notice kind="warning">This request is saved on your device and hasn't been sent. Send it from My support requests.</Notice>}
      {x.uncertain && <Notice kind="warning">We didn't get a confirmation for this request. If it isn't acknowledged soon, send it again.</Notice>}
      {!x.draft && (
        <ol aria-label="Request progress" style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: r(12) }}>
          {CASE_STEPS.map((s, i) => {
            const reached = i <= idx && !x.uncertain, now = i === idx && !x.uncertain
            return (
              <li key={s} aria-current={now ? 'step' : undefined} className="flex items-center" style={{ gap: r(12), minHeight: r(32), color: reached ? C.text : C.text3, fontWeight: now ? 700 : 500, fontSize: r(16) }}>
                <span className="flex items-center justify-center" style={{ width: r(28), height: r(28), borderRadius: 999, background: reached ? C.primary : '#fff', border: `1.5px solid ${reached ? C.primary : C.input}`, color: '#fff' }}>{reached && <Ico name="check" size={14} sw={3} />}</span>
                {s}{now && <span className="sr-only"> (current)</span>}
              </li>
            )
          })}
        </ol>
      )}
      <Card><div className="flex flex-col" style={{ gap: r(10) }}><KV k="Related ride" v={x.rideLabel} /><KV k="Sent" v={new Date(x.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} /><p style={{ fontSize: r(15), color: C.text, overflowWrap: 'anywhere' }}>{x.description}</p></div></Card>
      <p style={{ fontSize: r(14), color: C.text2 }}>We’ll update this status as your request moves along. We don’t promise a specific response time.</p>
    </Page>
  )
}

// ── Safety center ────────────────────────────────────────────────────────────

export function SafetyCenter({ c }: { c: CCtx }) {
  const n = c.a.contacts.length
  return (
    <Page title="Safety center" sub="Tools and guidance to help you prepare. They can’t guarantee a safe ride." onBack={c.back}>
      <div style={{ border: `1.5px solid ${C.errText}`, borderRadius: r(16), padding: r(16), background: C.errBg, display: 'flex', flexDirection: 'column', gap: r(12) }}>
        <h2 style={{ fontSize: r(18), fontWeight: 700, color: C.errText }}>Need urgent help?</h2>
        <p style={{ fontSize: r(15), color: C.text }}>If you feel unsafe or someone is hurt, use emergency help. Call local emergency services first if you can.</p>
        <Btn onClick={c.onSOS} style={{ background: C.errText }} icon={<Ico name="sos" size={18} />}>Open emergency help</Btn>
      </div>
      <Group>
        <NavRow icon="phone" title="Emergency contacts" sub={n ? `${n} saved` : 'Add someone you trust'} onClick={() => c.go('emergency-contact')} />
        <NavRow icon="flag" title="Report a concern" onClick={() => c.go('support-form', { filter: 'Safety concern' })} />
        <NavRow icon="list" title="My reports" onClick={() => c.go('my-support', { filter: 'safety' })} />
        <NavRow icon="ban" title="Blocked users" sub={c.a.blocked.length ? `${c.a.blocked.length} blocked` : 'No one blocked'} onClick={() => c.go('blocked-users')} />
      </Group>
      <Card>
        <div className="flex flex-col" style={{ gap: r(6) }}>
          <h2 style={{ fontSize: r(17), fontWeight: 600 }}>Sharing your trip</h2>
          <p style={{ fontSize: r(15), color: C.text2, lineHeight: 1.5 }}>During a ride you can share a trip link with someone you trust. You decide when sharing starts and you can stop it at any time. Adding an emergency contact does not share anything by itself.</p>
        </div>
      </Card>
      <Card>
        <div className="flex flex-col" style={{ gap: r(8) }}>
          <h2 style={{ fontSize: r(17), fontWeight: 600 }}>Before you ride</h2>
          <ul style={{ paddingLeft: r(20), display: 'flex', flexDirection: 'column', gap: r(6), fontSize: r(15), color: C.text2, lineHeight: 1.5 }}>
            <li>Check that the vehicle and the person match what the app shows.</li>
            <li>Meet at the agreed pickup point, in a public place.</li>
            <li>Use the ride code to confirm you are starting with the right person.</li>
            <li>Wear a helmet. If something feels wrong, you can end the ride and report it.</li>
          </ul>
        </div>
      </Card>
    </Page>
  )
}

export function BlockedUsers({ c }: { c: CCtx }) {
  const { a } = c
  const { say } = useHost()
  const [u, setU] = useState<(typeof a.blocked)[number] | null>(null)
  return (
    <>
      <Page title="Blocked users" sub="People you block won’t be matched with you." onBack={c.back}>
        {a.blocked.length === 0 ? (
          <Card><div className="flex flex-col items-center text-center" style={{ gap: r(8), padding: `${r(12)} 0` }}><h2 style={{ fontSize: r(18), fontWeight: 600 }}>No one is blocked</h2><Body size={15} center>You can block someone from a ride or a report if you don’t want to be matched again.</Body></div></Card>
        ) : (
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: r(12) }}>
            {a.blocked.map(b => (
              <li key={b.id}><Card><div className="flex items-center justify-between" style={{ gap: r(12) }}>
                <div className="min-w-0"><p style={{ fontSize: r(16), fontWeight: 600, overflowWrap: 'anywhere' }}>{b.name}</p><p style={{ fontSize: r(14), color: C.text2 }}>{b.role} · blocked {fmtLong(b.since)}</p></div>
                <button type="button" onClick={() => setU(b)} aria-haspopup="dialog" aria-label={`Unblock ${b.name}`} className="ob-btn flex-shrink-0" style={{ minHeight: r(48), padding: `0 ${r(14)}`, borderRadius: r(12), border: `1.5px solid ${C.primary}`, color: C.primary, fontWeight: 600, fontSize: r(15) }}>Unblock</button>
              </div></Card></li>
            ))}
          </ul>
        )}
      </Page>
      {u && (
        <Sh title={`Allow future matches with ${u.name}?`} onClose={() => setU(null)}>
          <p style={{ fontSize: r(15), color: C.text2 }}>You could be matched with them again. You can block them again whenever you like.</p>
          <Btn onClick={() => setU(null)}>Keep blocked</Btn>
          <Btn variant="secondary" onClick={() => { a.setBlocked(l => l.filter(x => x.id !== u.id)); say(`${u.name} unblocked`); setU(null) }}>Allow matches</Btn>
        </Sh>
      )}
    </>
  )
}

// ── Privacy and data ─────────────────────────────────────────────────────────

export function PrivacyData({ c }: { c: CCtx }) {
  const { a } = c
  const t = useTimers()
  const { say } = useHost()
  const [open, setOpen] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const ex = a.exportState
  const requestExport = () => {
    if (a.proto.network === 'offline') { a.setExportState('failed'); return }
    setBusy(true); a.setExportState('requested')
    t(() => { setBusy(false); if (a.proto.exportOut === 'failed') a.setExportState('failed') }, 900)
  }
  return (
    <Page title="Privacy and data" onBack={c.back}>
      <section className="flex flex-col" style={{ gap: r(8) }}>
        <h2 style={{ fontSize: r(13), fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: C.text2 }}>What others can see</h2>
        <div style={{ border: `1px solid ${C.divider}`, borderRadius: r(16), overflow: 'hidden' }}>
          <Expand id="pv0" title="On your profile" open={open === 0} onToggle={() => setOpen(open === 0 ? null : 0)}>Matched members can see your name, your photo if you added one, and your general area. Your role and whether you are a verified member may also be shown.</Expand>
          <Expand id="pv1" title="During a ride" open={open === 1} onToggle={() => setOpen(open === 1 ? null : 1)}>The pickup point and route are shared with the other person. Pilots’ vehicle details are shown to the Buddy. Live location is shared only while a ride is active or while you share a trip link.</Expand>
          <Expand id="pv2" title="What is not shown" open={open === 2} onToggle={() => setOpen(open === 2 ? null : 2)}>Your college email, your documents and your exact address are not shown to other members. Documents are reviewed only by authorized operators.</Expand>
        </div>
      </section>
      <Group title="Permissions and consent">
        <InfoRow title="Location" value="Device setting" action={<Pill kind="neutral">Asked when needed</Pill>} />
        <InfoRow title="Device alerts" value="Device setting" action={<Pill kind={a.proto.device === 'allowed' ? 'ok' : 'neutral'}>{a.proto.device === 'allowed' ? 'Allowed' : a.proto.device === 'denied' ? 'Off' : 'Not asked'}</Pill>} />
        <InfoRow title="Trip sharing" value="Your choice each time" action={<Pill kind="neutral">You start it</Pill>} />
        <InfoRow title="Terms and Community Guidelines" value="Accepted when you joined" action={<Pill kind="info">Required</Pill>} />
      </Group>
      <Card>
        <div className="flex flex-col" style={{ gap: r(10) }}>
          <h2 style={{ fontSize: r(17), fontWeight: 600 }}>Request a copy of my data</h2>
          <p style={{ fontSize: r(15), color: C.text2 }}>
            {ex === 'none' ? 'Ask for a copy of the information we hold about you.' : ex === 'requested' ? 'Request received. We’ll show its status here.' : ex === 'preparing' ? 'We’re preparing your copy.' : ex === 'ready' ? 'Your copy is ready.' : 'We couldn’t submit this request.'}
          </p>
          {ex === 'failed' && <Notice kind="error">{a.proto.network === 'offline' ? 'You’re offline. Try again when you’re connected.' : 'Something went wrong. Nothing was requested. Try again.'}</Notice>}
          {(ex === 'none' || ex === 'failed') && <Btn loading={busy} onClick={requestExport}>{ex === 'failed' ? 'Try again' : 'Request a copy'}</Btn>}
          {(ex === 'requested' || ex === 'preparing') && <Pill kind="warn">{ex === 'requested' ? 'Requested' : 'Preparing'}</Pill>}
          {ex === 'ready' && <Btn onClick={() => say('Download started (simulated)')}>Download my data</Btn>}
        </div>
      </Card>
      <Group>
        <NavRow icon="edit" title="Correct my information" sub="Update your name or area" onClick={() => c.go('edit-profile')} />
        <NavRow icon="file" title="Privacy Notice" onClick={() => c.go('policy-detail', { id: 'privacy' })} />
      </Group>
      <Group title="Delete account">
        <NavRow icon="trash" title="Delete my account" danger sub={a.deleteState === 'none' ? undefined : `Status: ${a.deleteState}`} onClick={() => c.go('delete-account')} />
      </Group>
    </Page>
  )
}

export function DeleteAccount({ c }: { c: CCtx }) {
  const { a, p, rs } = c
  const t = useTimers()
  const [reason, setReason] = useState('none')
  const [ack, setAck] = useState(false)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const activeRide = p.rides.some(x => ['on-the-way', 'at-pickup', 'in-progress'].includes(x.status)) || !!rs.live
  const st = a.deleteState
  const request = () => {
    if (activeRide) { setMsg('You have a ride in progress. Finish or cancel it first.'); return }
    if (!ack) { setMsg('Confirm that you understand before requesting deletion.'); document.getElementById('da-ack')?.focus(); return }
    if (a.proto.network === 'offline') { setMsg('You’re offline. Try again when you’re connected.'); return }
    setMsg(''); setBusy(true)
    t(() => {
      setBusy(false)
      if (a.proto.deleteOut === 'failed') { a.setDeleteState('failed'); return }
      a.setDeleteState('requested'); a.setStatus('deletion-requested')
    }, 1000)
  }
  if (st !== 'none' && st !== 'failed') {
    const text = { requested: 'We received your request. Your account will be handled as described in the Privacy Notice.', processing: 'Your request is being processed.', completed: 'Your account has been deleted.' }[st]
    return (
      <Page title="Account deletion" onBack={c.back}>
        <Notice kind={st === 'completed' ? 'success' : 'info'}>{text}</Notice>
        <Pill kind={st === 'completed' ? 'ok' : 'warn'}>{st === 'requested' ? 'Requested' : st === 'processing' ? 'Processing' : 'Completed'}</Pill>
        {st === 'completed' ? <Btn onClick={c.onSignOut}>Done</Btn> : <Btn variant="secondary" onClick={() => c.go('support-form', { filter: 'Account deletion' })}>Contact support about this request</Btn>}
      </Page>
    )
  }
  return (
    <Page title="Delete your account" sub="Review this before you continue." onBack={c.back} footer={
      <>
        {(st === 'failed' || msg) && <Notice kind="error">{msg || 'We couldn’t submit your request. Nothing was changed. Try again.'}</Notice>}
        <Btn loading={busy} aria-disabled={!ack || busy || undefined} onClick={request} style={{ background: C.errText, opacity: ack ? 1 : 0.55 }}>{busy ? 'Requesting…' : 'Request deletion'}</Btn>
        <Btn variant="text" onClick={c.back}>Keep my account</Btn>
      </>
    }>
      <Card>
        <ul style={{ paddingLeft: r(20), display: 'flex', flexDirection: 'column', gap: r(8), fontSize: r(15), color: C.text2, lineHeight: 1.5 }}>
          <li>You will lose access to ChaloRaahi as a Buddy and as a Pilot.</li>
          <li>Open rides and trips should be finished or cancelled first.</li>
          <li>Some records, such as reports and ride records involving other people, may be kept as described in the Privacy Notice.</li>
        </ul>
      </Card>
      {activeRide && <Notice kind="warning">You have a ride in progress. Finish or cancel it before requesting deletion.</Notice>}
      <Select id="da-reason" label="Why are you leaving? (optional)" value={reason} onChange={setReason} options={[['none', 'Prefer not to say'], ['no-use', 'I don’t need it anymore'], ['privacy', 'Privacy concerns'], ['experience', 'A bad experience'], ['other', 'Something else']]} />
      <Check id="da-ack" checked={ack} onChange={v => { setAck(v); setMsg('') }} label="I understand that deleting my account can’t be undone from the app." />
    </Page>
  )
}

// ── Policies and About ───────────────────────────────────────────────────────

const POLICIES: Record<string, { title: string; sections: [string, string][] }> = {
  terms: { title: 'Terms of Use', sections: [['Who can use ChaloRaahi', 'ChaloRaahi is open to reviewed members of VGU, Jaipur. You must give accurate information and keep your account to yourself.'], ['Shared rides', 'Rides are arranged between members. ChaloRaahi helps members find each other and does not provide transport itself.'], ['Fuel contributions', CONTRIBUTION_NOTE], ['Conduct', 'Treat other members respectfully and follow the Community Guidelines. Accounts may be restricted if they do not.']] },
  privacy: { title: 'Privacy Notice', sections: [['What we collect', 'Your name, college email, area, photo if you add one, ride and trip details, and documents if you apply as a Pilot.'], ['How it is used', 'To run the pilot: verifying membership, matching rides and keeping the service safe. Documents are seen only by authorized operators.'], ['Your choices', 'You can correct your information, ask for a copy of your data, or ask for your account to be deleted from Privacy and data.']] },
  community: { title: 'Community Guidelines', sections: [['Be reliable', 'Show up on time, or cancel early so the other person can plan.'], ['Be respectful', 'No harassment, discrimination or pressure. Keep messages about the ride.'], ['Stay safe', 'Follow traffic rules, wear a helmet and end a ride if you feel unsafe. Report concerns from the Safety center.']] },
  pilot: { title: 'Pilot Guidelines', sections: [['Before you offer rides', 'Keep your licence and vehicle documents current and your vehicle roadworthy.'], ['On the road', 'Carry a helmet for your Buddy when you say you will. Take the agreed route and pickup point.'], ['Contributions', 'Agree the fuel contribution shown in the app and settle it directly. Do not ask for more than was agreed.']] },
}

export function Policies({ c }: { c: CCtx }) {
  return (
    <Page title="Terms and policies" sub="Draft wording for the pilot." onBack={c.back}>
      <Group>
        {Object.entries(POLICIES).map(([id, d]) => <NavRow key={id} icon="file" title={d.title} onClick={() => c.go('policy-detail', { id })} />)}
      </Group>
    </Page>
  )
}

export function PolicyDetail({ c }: { c: CCtx }) {
  const d = POLICIES[c.nav.p.id ?? 'terms'] ?? POLICIES.terms
  return (
    <Page title={d.title} onBack={c.back}>
      <div className="flex items-center flex-wrap" style={{ gap: r(8) }}><Pill kind="warn">Draft</Pill><span style={{ fontSize: r(14), color: C.text2 }}>Version 0.9 · pilot draft</span></div>
      {d.sections.map(([h, body]) => (
        <section key={h} className="flex flex-col" style={{ gap: r(6) }}>
          <h2 style={{ fontSize: r(18), fontWeight: 600 }}>{h}</h2>
          <p style={{ fontSize: r(16), color: C.text2, lineHeight: 1.55 }}>{body}</p>
        </section>
      ))}
      <Notice kind="info">This is draft wording for the pilot and is not final legal text.</Notice>
    </Page>
  )
}

export function About({ c }: { c: CCtx }) {
  return (
    <Page title="About ChaloRaahi" onBack={c.back}>
      <Body size={16}>ChaloRaahi is a pilot community for sharing rides between verified members of VGU, Jaipur.</Body>
      <Group>
        <InfoRow title="Version" value="0.9.0 (pilot build)" />
        <InfoRow title="Fuel contribution platform fee" value={inr(0)} />
      </Group>
      <Group>
        <NavRow icon="file" title="Terms and policies" onClick={() => c.go('policies')} />
        <NavRow icon="info" title="Help and support" onClick={() => c.go('help-support')} />
      </Group>
      <p style={{ fontSize: r(13), color: C.text2 }}>{CONTRIBUTION_NOTE}</p>
    </Page>
  )
}

void TopRow
void STATUS_LABEL
