import { useState } from 'react'
import ShareTrip from './ShareTrip'
import { Btn, C, Ico, Notice, Sheet, r } from './OnboardingUI'
import MiniMap from './PassengerMap'
import { PLACES, dayLabel, fmtTime, placeById } from './PassengerData'
import { Card, KV, RadioList, Row, useTimers } from './PassengerUI'
import { TRIP_LABEL, emptyDoc, noShowEligible, type DocKey, type RCtx } from './RiderData'
import { MessagePanel } from './RiderRide'
import { Para, clock, redText } from './RiderUI'

const err = (t: string) => <p role="alert" style={{ fontSize: r(14), color: C.errText }}>{t}</p>

export default function Sheets({ c }: { c: RCtx }) {
  const { s } = c
  const t = s.cur
  const close = c.close
  const later = useTimers()
  const [reason, setReason] = useState('')
  const [e, setE] = useState('')
  const [busy, setBusy] = useState(false)
  const [sel, setSel] = useState(() => (c.sheetArg === 'to' ? s.draft.destination?.id : s.draft.pickup?.id) ?? 'vgu')
  const [pt, setPt] = useState(s.draft.pickupPoint?.id ?? '')
  const [text, setText] = useState('')
  const [perm, setPerm] = useState<'ask' | 'denied' | 'off' | 'unavailable' | 'inaccurate' | 'background'>('ask')
  const [unsure, setUnsure] = useState(false)
  const [qErr] = useState('')
  void qErr
  const buddy = t?.req?.name ?? 'your Buddy'

  switch (c.sheet) {
    case 'role': {
      const live = s.live
      return (
        <Sheet title="Switch role" onClose={close}>
          <Row icon="user" title="Buddy" sub="Request rides" onClick={() => { close(); c.switchRole() }} />
          <Row icon="scooter" title="Pilot" sub="Offer rides on your two-wheeler — current role" onClick={close} trailing={<Ico name="check" size={20} color={C.okText} />} />
          {live && <Notice kind="info">You have a ride in progress. It stays active, and you can return to it from the Pilot home.</Notice>}
          <Para size={14}>Switching keeps your trips, requests and drafts exactly as they are.</Para>
        </Sheet>
      )
    }
    case 'notifications': {
      const items: string[] = []
      if (s.approval === 'pending') items.push('Your application is under review.')
      if (s.approval === 'approved' && s.live) items.push(`Ride in progress with ${s.live.req?.name ?? 'your Buddy'}.`)
      const n = s.published.reduce((a, x) => a + (x.status === 'published' && !x.req ? s.reqs.filter(q => q.state === 'open' && q.detourKm <= x.detour).length : 0), 0)
      if (s.approval === 'approved' && n > 0) items.push('You have requests waiting for review.')
      return (
        <Sheet title="Notifications" onClose={close}>
          {items.length === 0 ? <Para>You’re all caught up.</Para> : <ul className="flex flex-col" style={{ gap: r(10), listStyle: 'none' }}>{items.map(i => <li key={i} style={{ fontSize: r(16), color: C.text }}>{i}</li>)}</ul>}
          <Btn variant="text" onClick={close}>Close</Btn>
        </Sheet>
      )
    }
    case 'place': {
      const to = c.sheetArg === 'to'
      const place = placeById(sel)
      const apply = () => {
        if (to) s.setDraft({ destination: place })
        else s.setDraft({ pickup: place, pickupPoint: place.points.find(p => p.id === pt) ?? place.points[0] })
        close()
      }
      return (
        <Sheet title={to ? 'Where are you going?' : 'Where do you start?'} onClose={close}>
          <div style={{ borderRadius: r(14), overflow: 'hidden' }}>
            <MiniMap height={140} label={`Sample map of Jaipur. Selected: ${place.name}. Use the list below to choose.`} markers={PLACES.map(x => ({ id: x.id, x: x.x, y: x.y, selected: x.id === sel }))} />
          </div>
          <fieldset style={{ border: 0, padding: 0, minWidth: 0 }} className="flex flex-col">
            <legend className="sr-only">Places</legend>
            {PLACES.map(x => (
              <label key={x.id} className="flex items-center" style={{ gap: r(12), minHeight: r(52), cursor: 'pointer' }}>
                <input type="radio" name="pl" checked={sel === x.id} onChange={() => { setSel(x.id); setPt('') }} style={{ width: r(22), height: r(22), accentColor: C.primary }} />
                <span><span className="block" style={{ fontSize: r(16), fontWeight: 600, color: C.text }}>{x.name}</span><span className="block" style={{ fontSize: r(14), color: C.text2 }}>{x.locality}</span></span>
              </label>
            ))}
          </fieldset>
          {!to && place.points.length > 1 && (
            <RadioList name="pt" legend="Meeting point" value={place.points.find(p => p.id === pt)?.label ?? place.points[0].label} options={place.points.map(p => p.label)} onChange={v => setPt(place.points.find(p => p.label === v)!.id)} />
          )}
          <Btn onClick={apply}>Use {place.name}</Btn>
        </Sheet>
      )
    }
    case 'trip-pick':
      return (
        <Sheet title="Choose a trip" onClose={close}>
          {s.published.map(x => (
            <Row key={x.id} icon="calendar" title={`${dayLabel(x.date)}, ${fmtTime(x.time)}`} sub={`${x.pickup.name} to ${x.destination.name}`}
              trailing={s.selTrip?.id === x.id ? <Ico name="check" size={20} color={C.okText} /> : undefined} onClick={() => { s.setTripId(x.id); close() }} />
          ))}
        </Sheet>
      )
    case 'decline': {
      const q = s.reqs.find(x => x.id === c.sheetArg)
      if (!q) return null
      return (
        <Sheet title={`Decline ${q.name}’s request?`} onClose={close}>
          <Para>{q.name.split(' ')[0]} will be told the request wasn’t accepted. No reason is shown to them, and your rating isn’t affected.</Para>
          <Btn onClick={() => { s.patchReq(q.id, { state: 'declined' }); close(); c.say('Request declined.'); if (c.screen === 'ticket-detail') c.root('tickets-list') }}>Decline request</Btn>
          <Btn variant="text" onClick={close}>Keep request</Btn>
        </Sheet>
      )
    }
    case 'cancel-trip': {
      if (!t) return null
      const go = () => {
        if (!reason) { setE('Choose a reason to continue.'); return }
        s.patchTrip(t.id, { status: 'cancelled', cancelledBy: 'pilot', cancelReason: reason }); close(); c.say('Trip cancelled.'); c.root('my-trips')
      }
      return (
        <Sheet title="Cancel this trip?" onClose={close}>
          <RadioList name="ct" legend="Reason" value={reason} onChange={v => { setReason(v); setE('') }} options={['Plans changed', 'Vehicle unavailable', 'Not travelling that day', 'Another reason']} />
          {e && err(e)}
          <Para>Buddies will no longer see this trip. No cancellation fee applies.</Para>
          <Btn onClick={close}>Keep trip</Btn>
          <button type="button" onClick={go} className="ob-btn ob-btn-text" style={redText}>Cancel trip</button>
        </Sheet>
      )
    }
    case 'cancel-ride': {
      if (!t) return null
      const go = () => {
        if (!reason) { setE('Choose a reason to continue.'); return }
        s.patchTrip(t.id, { status: 'cancelled', cancelledBy: 'pilot', cancelReason: reason })
        if (t.parentId) s.patchTrip(t.parentId, x => ({ occ: { ...x.occ, [t.date]: 'open' as const } }))
        close(); c.say(c.online ? 'Ride cancelled. Your Buddy will be notified.' : 'Cancelled on this device. Your Buddy will be notified when you reconnect.'); c.root('ride-cancelled-r')
      }
      return (
        <Sheet title="Cancel this ride?" onClose={close}>
          <RadioList name="cr" legend="Reason" value={reason} onChange={v => { setReason(v); setE('') }} options={['Plans changed', 'Vehicle problem', 'Unable to reach pickup', 'Buddy concern', 'Another reason']} />
          {e && err(e)}
          <Para>{buddy} will be notified. Your seat is not reopened automatically. No cancellation fee applies.</Para>
          <Btn onClick={close}>Keep ride</Btn>
          <button type="button" onClick={go} className="ob-btn ob-btn-text" style={redText}>Cancel ride</button>
        </Sheet>
      )
    }
    case 'mismatch':
      return (
        <Sheet title="Something doesn’t match" onClose={close}>
          <Notice kind="warning">Don’t ask for the start code or take this Buddy. The ride hasn’t started.</Notice>
          <Btn variant="secondary" onClick={close}>Do not start</Btn>
          <Btn variant="secondary" onClick={() => { close(); c.go('report-r') }}>Report</Btn>
          <Btn variant="secondary" onClick={() => c.open('cancel-ride')}>Cancel ride</Btn>
          <button type="button" onClick={() => { close(); c.sos() }} className="flex items-center justify-center" style={{ minHeight: r(54), gap: r(8), borderRadius: r(14), background: C.errBg, color: C.errText, fontWeight: 700, fontSize: r(16), border: `1.5px solid ${C.errBorder}` }}><Ico name="sos" size={20} />Emergency help</button>
        </Sheet>
      )
    case 'location': {
      if (!t) return null
      const go = (loc: 'granted' | 'skipped') => { s.patchCur({ locReady: loc, loc: loc === 'granted' ? 'fresh' : 'unavailable', locAt: Date.now() }); close(); c.go('verify-otp') }
      const allow = () => { const m = s.proto.locPerm; if (m === 'granted') go('granted'); else setPerm(m) }
      const msg = { denied: 'Location access is off for ChaloRaahi. You can turn it on in your browser or phone settings, then try again.', off: 'Your device location is switched off. Turn it on and try again.',
        unavailable: 'Location isn’t available right now.', inaccurate: 'Your location is approximate right now, so your Buddy may see a less exact position.', background: 'Location only works while this screen is open. Keep ChaloRaahi open during the ride.' }
      return (
        <Sheet title="Share your location during the ride?" onClose={close}>
          <Para>Your Buddy and anyone you share the ride with can see where you are until the ride ends. Starting a ride also works without it.</Para>
          {perm !== 'ask' && <Notice kind="warning">{msg[perm]}</Notice>}
          {perm === 'ask' || perm === 'denied' || perm === 'off' || perm === 'unavailable' ? <Btn onClick={allow}>{perm === 'ask' ? 'Allow location' : 'Try again'}</Btn> : <Btn onClick={() => go('granted')}>Continue with this location</Btn>}
          <Btn variant="secondary" onClick={() => go('skipped')}>Continue without location</Btn>
        </Sheet>
      )
    }
    case 'complete': {
      if (!t) return null
      const done = () => { s.patchCur(x => ({ status: 'completed', endedAt: Date.now(), completeState: 'none', share: { ...x.share, on: false } })); close(); c.root('ride-summary'); c.say('Ride complete.') }
      const go = () => {
        if (!c.online) { s.patchCur({ completeState: 'saved-offline' }); close(); c.say('Saved on this device. It will be sent when you reconnect.'); return }
        setBusy(true); setE('')
        later(() => {
          setBusy(false)
          const m = s.proto.complete
          if (m === 'failed') setE('We couldn’t complete the ride. It’s still active—please try again.')
          else if (m === 'uncertain') setUnsure(true)
          else done()
        }, 900)
      }
      return (
        <Sheet title="Have you reached the destination?" onClose={close}>
          <Para>Confirming ends this ride and stops any live sharing. You can still report a concern afterwards.</Para>
          {e && <Notice kind="error">{e}</Notice>}
          {unsure && <Notice kind="warning" action={<div style={{ marginTop: r(8) }}><Btn variant="secondary" style={{ minHeight: r(48) }} loading={busy} onClick={() => { setBusy(true); later(done, 900) }}>Check ride status</Btn></div>}>We’re not sure the ride was marked complete. Please check before trying again.</Notice>}
          {!c.online && <Notice kind="warning">You’re offline. Confirming will save this on your device and send it when you reconnect.</Notice>}
          {!unsure && <Btn loading={busy} onClick={go}>Confirm ride complete</Btn>}
          <Btn variant="text" onClick={close}>Keep ride active</Btn>
        </Sheet>
      )
    }
    case 'early-end': {
      if (!t) return null
      const go = () => {
        if (!reason) { setE('Choose a reason to continue.'); return }
        if (!c.online) { s.patchCur({ endState: 'saved-offline', endReason: reason }); close(); c.say('Saved on this device. The ride is still active.'); return }
        setBusy(true)
        later(() => {
          setBusy(false)
          if (s.proto.end === 'uncertain') { setUnsure(true); return }
          s.patchCur(x => ({ status: 'ended-early', endedAt: Date.now(), endReason: reason, endState: 'acknowledged', share: { ...x.share, on: false } })); close(); c.root('ride-summary'); c.say('Ride ended early.')
        }, 900)
      }
      return (
        <Sheet title="End this ride early?" onClose={close}>
          <button type="button" onClick={() => { close(); c.sos() }} className="flex items-center" style={{ minHeight: r(52), gap: r(10), color: C.errText, fontWeight: 700, fontSize: r(16) }}><Ico name="sos" size={20} />Emergency help</button>
          <RadioList name="er" legend="Reason" value={reason} onChange={v => { setReason(v); setE('') }} options={['I feel unsafe', 'Route or stop changed', 'Vehicle problem', 'Buddy asked to get off', 'Another reason']} />
          {e && err(e)}
          {unsure && <Notice kind="warning">We’re not sure the ride ended. It’s still active. Check again shortly or use Emergency help.</Notice>}
          <Para size={14}>The fuel contribution isn’t changed automatically. You can agree any adjustment with your Buddy afterwards.</Para>
          <Btn loading={busy} onClick={go}>{unsure ? 'Try again' : 'End ride early'}</Btn>
          <Btn variant="text" onClick={close}>Keep ride active</Btn>
        </Sheet>
      )
    }
    case 'no-show':
      return (
        <Sheet title="Report that your Buddy isn’t here" onClose={close}>
          <Para>This sends a report for review. It doesn’t say anyone is at fault, and it doesn’t change anyone’s rating.</Para>
          <Btn disabled={!t || !noShowEligible(t)} onClick={() => { s.patchCur({ noShow: 'reported' }); close(); c.say('No-show report submitted.') }}>Submit report</Btn>
          <Btn variant="text" onClick={close}>Keep waiting</Btn>
        </Sheet>
      )
    case 'share': {
      if (!t) return null
      return (
        <Sheet title="Share this ride" onClose={close}>
          <ShareTrip share={t.share} patch={fn => s.patchTrip(t.id, x => ({ share: fn(x.share) }))} fail={s.proto.shareFail} online={c.online} say={c.say}
            owner="Aarav S." route={`${t.pickup.name} → ${t.destination.name}`} status={TRIP_LABEL[t.status]} loc={{ state: t.loc, at: t.locAt }} />
        </Sheet>
      )
    }
    case 'options': {
      const atPickup = t?.status === 'at-pickup'
      return (
        <Sheet title={atPickup ? 'Buddy isn’t here' : 'Ride options'} onClose={close}>
          {atPickup && t ? (
            <>
              <Para>Send an update first, and wait a few minutes. Reports open 10 minutes past the agreed time.</Para>
              <MessagePanel c={c} t={t} />
              <Row icon="flag" title="Report Buddy not here" sub={noShowEligible(t) ? undefined : 'Available 10 minutes past the agreed time'} disabled={!noShowEligible(t)} onClick={() => c.open('no-show')} />
              <Row icon="close" title="Cancel ride" onClick={() => c.open('cancel-ride')} />
            </>
          ) : (
            <>
              <Row icon="sos" danger title="Emergency help" sub="Opens the SOS tools. Your ride stays active." onClick={() => { close(); c.sos() }} />
              <Row icon="clock" title="End ride early" onClick={() => c.open('early-end')} />
              <Row icon="flag" title="Report an issue" onClick={() => { close(); c.go('report-r') }} />
              <Row icon="ban" title="Block future matches" onClick={() => c.open('block')} />
            </>
          )}
        </Sheet>
      )
    }
    case 'messages':
      return t ? <Sheet title="Send an update" onClose={close}><MessagePanel c={c} t={t} /></Sheet> : null
    case 'block':
      return t?.req ? (
        <Sheet title={`Block future matches with ${t.req.name}?`} onClose={close}>
          <Para>You won’t be matched with this person for future trips. Blocking doesn’t automatically cancel this ride.</Para>
          <Btn onClick={() => { s.patchCur({ blocked: true }); close(); c.say(`${t.req!.name} blocked for future matches.`) }}>Block {t.req.name.split(' ')[0]}</Btn>
          <Btn variant="text" onClick={close}>Not now</Btn>
        </Sheet>
      ) : null
    case 'help': {
      const active = t && t.req && ['confirmed', 'heading', 'at-pickup'].includes(t.status)
      return (
        <Sheet title="Help and safety" onClose={close}>
          <Row icon="sos" danger title="Emergency help" sub="Opens the SOS tools" onClick={() => { close(); c.sos() }} />
          {t && <Row icon="flag" title="Report a concern" onClick={() => { close(); c.go('report-r') }} />}
          {t?.req && <Row icon="ban" title="Block future matches" onClick={() => c.open('block')} />}
          {active && <Row icon="close" title="Cancel ride" onClick={() => c.open('cancel-ride')} />}
          <Para size={14}>Prototype: no support team is connected.</Para>
        </Sheet>
      )
    }
    case 'directions': {
      if (!t) return null
      return (
        <Sheet title="Pickup point" onClose={close}>
          <div style={{ borderRadius: r(14), overflow: 'hidden' }}>
            <MiniMap height={170} label={`Sample map. Pickup point: ${t.pickupPoint.label}, at ${t.pickup.name}.`} markers={[{ id: 'p', x: t.pickup.x, y: t.pickup.y, selected: true }]} />
          </div>
          <p style={{ fontSize: r(18), fontWeight: 700, color: C.text }}>{t.pickup.name}</p>
          <Para>{t.pickupPoint.label}. {t.pickupPoint.detail}.</Para>
          <KV k="When" v={`${dayLabel(t.date)}, around ${fmtTime(t.time)}`} />
          <Btn variant="secondary" onClick={() => { window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.pickup.name + ' Jaipur')}`, '_blank', 'noopener'); }}>Open in your maps app</Btn>
          <Para size={13}>The in-app map is illustrative. Turn-by-turn directions open in your own maps app.</Para>
        </Sheet>
      )
    }
    case 'skip': {
      const [id, d] = (c.sheetArg ?? '|').split('|')
      return (
        <Sheet title="Skip this date?" onClose={close}>
          <Para>{d ? dayLabel(d) : 'This date'} won’t be offered. Your other dates stay the same.</Para>
          <Btn onClick={() => { s.patchTrip(id, x => ({ occ: { ...x.occ, [d]: 'skipped' as const } })); close(); c.say('Date skipped.') }}>Skip this date</Btn>
          <Btn variant="text" onClick={close}>Keep it</Btn>
        </Sheet>
      )
    }
    case 'end-schedule': {
      const id = c.sheetArg ?? ''
      return (
        <Sheet title="End this schedule?" onClose={close}>
          <Para>No new dates will be offered. Rides that are already confirmed stay as they are.</Para>
          <Btn onClick={close}>Keep schedule</Btn>
          <button type="button" className="ob-btn ob-btn-text" style={redText} onClick={() => {
            s.patchTrip(id, x => ({ ended: true, status: 'cancelled' as const, cancelledBy: 'pilot' as const, cancelReason: 'Schedule ended', occ: Object.fromEntries(Object.entries(x.occ).map(([k, v]) => [k, v === 'open' ? 'skipped' : v])) as typeof x.occ })); close(); c.say('Schedule ended.')
          }}>End schedule</button>
        </Sheet>
      )
    }
    case 'appeal':
      return (
        <Sheet title="Ask for a review" onClose={close}>
          <Para>Tell us what you’d like reviewed. This is optional.</Para>
          <textarea aria-label="What should we review?" value={text} onChange={x => setText(x.target.value)} rows={4} maxLength={400} className="ob-input" style={{ borderRadius: r(12), padding: r(14), fontSize: r(16), border: `1.5px solid ${C.input}`, minHeight: r(110) }} />
          <Btn loading={busy} onClick={() => { setBusy(true); later(() => { s.setApproval('pending'); setBusy(false); close(); c.root('verification-pending'); c.say('Review requested.') }, 800) }}>Send request</Btn>
          <Btn variant="text" onClick={close}>Cancel</Btn>
        </Sheet>
      )
    case 'remove-doc': {
      const k = c.sheetArg as DocKey
      return (
        <Sheet title="Remove this file?" onClose={close}>
          <Para>You’ll need to add it again before you can submit.</Para>
          <Btn onClick={() => { s.setDoc(k, emptyDoc()); close(); c.say('File removed.') }}>Remove file</Btn>
          <Btn variant="text" onClick={close}>Keep file</Btn>
        </Sheet>
      )
    }
    default:
      return null
  }
}
