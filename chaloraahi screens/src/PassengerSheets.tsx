import { useState } from 'react'
import ShareTrip from './ShareTrip'
import { Btn, C, Ico, Notice, Sheet, r } from './OnboardingUI'
import MiniMap from './PassengerMap'
import { PLACES, PILOT, SAMPLE_RIDER, STATUS_LABEL, dayLabel, fmtTime, placeById, stamp } from './PassengerData'
import { Card, Ctx, KV, RadioList, Row, RiderAvatar, flags, useTimers } from './PassengerUI'
import { MessagePanel, departAt } from './PassengerRide'

const redText: React.CSSProperties = { minHeight: 48, color: C.errText, fontWeight: 600, fontSize: '1rem', textDecoration: 'underline' }
const P = (t: string, s = 15, color: string = C.text2) => <p style={{ fontSize: r(s), color, lineHeight: 1.5 }}>{t}</p>

export default function Sheets({ c }: { c: Ctx }) {
  const { s } = c
  const ride = s.cur
  const close = c.close
  const which = c.sheet
  const later = useTimers()
  const [reason, setReason] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [sel, setSel] = useState('vgu')
  const p = ride?.rider ?? SAMPLE_RIDER

  switch (which) {
    case 'role': {
      const live = s.upcoming.find(x => ['on-the-way', 'at-pickup', 'in-progress'].includes(x.status))
      return (
        <Sheet title="Switch role" onClose={close}>
          <Row icon="user" title="Buddy" sub="Request rides — current role" onClick={close} trailing={<Ico name="check" size={20} color={C.okText} />} />
          <Row icon="scooter" title="Pilot" sub="Offer rides on your two-wheeler" onClick={() => { close(); c.switchRole() }} />
          {live && <Notice kind="info">You have a ride in progress. It stays active, and you can return to it from the Buddy home.</Notice>}
          <p style={{ fontSize: r(14), color: C.text2 }}>Switching keeps your current request or ride exactly as it is.</p>
        </Sheet>
      )
    }
    case 'cancel': {
      if (!ride) return null
      const open = ride.status === 'awaiting'
      const matched = !!ride.rider && !open
      const go = () => {
        if (!reason) { setErr('Choose a reason to continue.'); return }
        s.patchCur({ status: 'cancelled', cancelledBy: 'passenger', cancelReason: reason })
        close(); c.say(c.online ? (open ? 'Request cancelled.' : 'Ride cancelled. Your pilot will be notified.') : 'Cancelled on this device. Your pilot will be notified when you reconnect.')
      }
      return (
        <Sheet title={open ? 'Cancel this request?' : 'Cancel this ride?'} onClose={close}>
          <RadioList name="cr" legend="Reason" value={reason} onChange={v => { setReason(v); setErr('') }}
            options={['Plans changed', 'Wrong date or time', 'Unable to reach pickup', `${PILOT.cap} or vehicle concern`, 'Another reason']} />
          {err && <p role="alert" style={{ fontSize: r(14), color: C.errText }}>{err}</p>}
          {matched && P('The pilot will be notified.')}
          {P('No cancellation fee applies.')}
          {!open && P('Nothing is reopened or replaced automatically. You can plan a new ride afterwards.', 14)}
          <Btn onClick={close}>{open ? 'Keep request' : 'Keep ride'}</Btn>
          <button type="button" onClick={go} className="ob-btn ob-btn-text" style={redText}>{open ? 'Cancel request' : 'Cancel ride'}</button>
        </Sheet>
      )
    }
    case 'early-end': {
      if (!ride) return null
      const go = () => {
        if (!reason) { setErr('Choose a reason to continue.'); return }
        s.patchCur({ endState: c.online ? 'requested' : 'saved-offline', endReason: reason }); close()
        c.say(c.online ? 'End request sent. The ride stays active until it is acknowledged.' : 'End request saved on this device. Waiting for connection.')
      }
      return (
        <Sheet title="Need to end this ride early?" onClose={close}>
          <button type="button" onClick={() => { close(); c.sos() }} className="flex items-center" style={{ minHeight: r(52), gap: r(10), color: C.errText, fontWeight: 700, fontSize: r(16) }}><Ico name="sos" size={20} />Emergency help</button>
          <RadioList name="er" legend="Reason" value={reason} onChange={v => { setReason(v); setErr('') }} options={['I feel unsafe', 'Route or stop changed', 'Vehicle problem', 'I need to get off here', 'Another reason']} />
          {err && <p role="alert" style={{ fontSize: r(14), color: C.errText }}>{err}</p>}
          {P('Your pilot is asked to acknowledge. The ride is only marked ended early once that happens.', 14)}
          <Btn onClick={go}>Request early end</Btn>
          <Btn variant="text" onClick={close}>Keep ride active</Btn>
        </Sheet>
      )
    }
    case 'complete': {
      if (!ride) return null
      const go = () => {
        if (!c.online) return
        setBusy(true)
        later(() => { s.patchCur(x => ({ status: 'completed', endedAt: Date.now(), share: { ...x.share, on: false } })); setBusy(false); close() }, 800)
      }
      return (
        <Sheet title="Have you reached your destination?" onClose={close}>
          {P(`Confirming ends this ride and stops any live sharing. You can still report a concern afterwards.`)}
          {!c.online && <Notice kind="warning">Connect to confirm the ride is complete. Help stays available.</Notice>}
          <Btn loading={busy} disabled={!c.online} onClick={go}>Confirm ride complete</Btn>
          <Btn variant="text" onClick={close}>Keep ride active</Btn>
        </Sheet>
      )
    }
    case 'mismatch':
      return (
        <Sheet title="Something doesn’t match" onClose={close}>
          <Notice kind="warning">Don’t share your start code or get on the vehicle. The ride hasn’t started.</Notice>
          <Btn variant="secondary" onClick={close}>Do not start</Btn>
          <Btn variant="secondary" onClick={() => { close(); c.go('report') }}>Report</Btn>
          <Btn variant="secondary" onClick={() => c.open('cancel')}>Cancel booking</Btn>
          <button type="button" onClick={() => { close(); c.sos() }} className="flex items-center justify-center" style={{ minHeight: r(54), gap: r(8), borderRadius: r(14), background: C.errBg, color: C.errText, fontWeight: 700, fontSize: r(16), border: `1.5px solid ${C.errBorder}` }}><Ico name="sos" size={20} />Emergency help</button>
        </Sheet>
      )
    case 'share': {
      if (!ride) return null
      return (
        <Sheet title="Share this ride" onClose={close}>
          <ShareTrip share={ride.share} patch={fn => s.patchRide(ride.id, x => ({ share: fn(x.share) }))} fail={s.proto.shareFail} online={s.proto.network === 'online'} say={c.say}
            owner="Aarav S." route={`${ride.pickup.name} → ${ride.destination.name}`} status={STATUS_LABEL[ride.status]} loc={{ state: ride.loc, at: ride.locAt }} />
        </Sheet>
      )
    }
    case 'options':
      return (
        <Sheet title="Ride options" onClose={close}>
          <Row icon="sos" danger title="Emergency help" sub="Opens the SOS tools. Your ride stays active." onClick={() => { close(); c.sos() }} />
          <Row icon="clock" title="Request early end" onClick={() => c.open('early-end')} />
          <Row icon="flag" title="Report an issue" onClick={() => { close(); c.go('report') }} />
          <Row icon="user" title={`View ${PILOT.lo} and vehicle`} onClick={() => c.open('rider-info')} />
          <Row icon="ban" title="Block future matches" onClick={() => c.open('block')} />
        </Sheet>
      )
    case 'rider-info':
      return (
        <Sheet title={`${PILOT.cap} and vehicle`} onClose={close}>
          <div className="flex items-center" style={{ gap: r(12) }}><RiderAvatar initials={p.initials} size={56} /><div><p style={{ fontSize: r(18), fontWeight: 700, color: C.text }}>{p.name}</p><p style={{ fontSize: r(14), color: C.text2 }}>VGU student · {p.rating ? `★ ${p.rating} · ${p.rides} rides` : 'New pilot'}</p></div></div>
          <Card><div className="flex flex-col" style={{ gap: r(8) }}><KV k="Vehicle" v={p.vehicle} /><KV k="Colour" v={p.color} /><KV k="Registration" v={p.reg} /><KV k="Helmet" v={p.helmets} /></div></Card>
        </Sheet>
      )
    case 'messages':
      return ride ? <Sheet title="Send an update" onClose={close}><MessagePanel c={c} ride={ride} /></Sheet> : null
    case 'badge':
      return (
        <Sheet title="Pilot approved" onClose={close}>
          {P('This pilot’s college membership, licence and vehicle details were reviewed before they could offer rides on ChaloRaahi.')}
          {P('It’s a check, not a safety guarantee. Always confirm the pilot and vehicle match before you start.', 14)}
          <Btn onClick={close}>Got it</Btn>
        </Sheet>
      )
    case 'estimate':
      return (
        <Sheet title="How this is estimated" onClose={close}>
          {P('The fuel contribution is a demo estimate for this prototype. In a real version it would be based on the shared distance and a fair fuel share, and shown to you before you publish.')}
          {P('You and your pilot settle directly by cash or your own UPI app. ChaloRaahi charges no platform fee during the pilot and does not process payments.')}
          <Btn onClick={close}>Got it</Btn>
        </Sheet>
      )
    case 'location':
      return (
        <Sheet title="Use your location?" onClose={close}>
          {P('Use your location to suggest a nearby pickup point. You can also choose one manually.')}
          {s.proto.location === 'denied' && flags.locDenied && <Notice kind="warning">Location access is off. Search for a pickup point or choose one on the map.</Notice>}
          <Btn onClick={() => {
            if (s.proto.location === 'denied') { flags.locDenied = true; close(); c.say('Location access is off.'); return }
            flags.locDenied = false; close(); s.setSearchField('pickup')
            s.setPending({ field: 'pickup', place: placeById('mansarovar'), from: 'search' }); c.go('meeting-point'); c.say('Suggested a nearby sample pickup point.')
          }}>Use my location</Btn>
          <Btn variant="secondary" onClick={() => { close(); window.setTimeout(() => document.getElementById('pickup-q')?.focus(), 50) }}>Choose manually</Btn>
        </Sheet>
      )
    case 'mappick': {
      const field = s.searchField
      const place = placeById(sel)
      return (
        <Sheet title="Choose on map" onClose={close}>
          <div style={{ borderRadius: r(14), overflow: 'hidden' }}>
            <MiniMap height={170} label={`Sample map of Jaipur with ${PLACES.length} places. Selected: ${place.name}. Use the list below to choose.`}
              markers={PLACES.map(x => ({ id: x.id, x: x.x, y: x.y, selected: x.id === sel }))} />
          </div>
          <fieldset style={{ border: 0, padding: 0, minWidth: 0 }} className="flex flex-col">
            <legend className="sr-only">Places on the map</legend>
            {PLACES.map(x => (
              <label key={x.id} className="flex items-center" style={{ gap: r(12), minHeight: r(52), cursor: 'pointer' }}>
                <input type="radio" name="mp" checked={sel === x.id} onChange={() => setSel(x.id)} style={{ width: r(22), height: r(22), accentColor: C.primary }} />
                <span><span className="block" style={{ fontSize: r(16), fontWeight: 600, color: C.text }}>{x.name}</span><span className="block" style={{ fontSize: r(14), color: C.text2 }}>{x.locality}</span></span>
              </label>
            ))}
          </fieldset>
          <Btn onClick={() => { close(); s.setPending({ field, place, from: 'search' }); c.go('meeting-point') }}>Continue with {place.name}</Btn>
        </Sheet>
      )
    }
    case 'block': {
      if (!ride) return null
      return (
        <Sheet title={`Block future matches with ${p.name}?`} onClose={close}>
          {P('You won’t be matched with this person for future rides.')}
          {P('Blocking does not automatically cancel this ride.', 14)}
          <Btn onClick={() => { s.patchCur({ blocked: true }); close(); c.say(`${p.name} blocked for future matches.`) }}>Block {p.name.split(' ')[0]}</Btn>
          <Btn variant="text" onClick={close}>Not now</Btn>
        </Sheet>
      )
    }
    case 'help': {
      const active = ride && ['awaiting', 'confirmed', 'on-the-way', 'at-pickup'].includes(ride.status)
      return (
        <Sheet title="Help and safety" onClose={close}>
          <Row icon="sos" danger title="Emergency help" sub="Opens the SOS tools" onClick={() => { close(); c.sos() }} />
          <Row icon="flag" title="Report a concern" onClick={() => { close(); c.go('report') }} />
          {ride?.rider && <Row icon="ban" title="Block future matches" onClick={() => c.open('block')} />}
          {active && <Row icon="close" title={ride!.status === 'awaiting' ? 'Cancel request' : 'Cancel booking'} onClick={() => c.open('cancel')} />}
        </Sheet>
      )
    }
    case 'directions': {
      if (!ride) return null
      return (
        <Sheet title="Meeting point" onClose={close}>
          <div style={{ borderRadius: r(14), overflow: 'hidden' }}>
            <MiniMap height={170} label={`Sample map. Meeting point: ${ride.pickupPoint.label}, at ${ride.pickup.name}.`} markers={[{ id: 'p', x: ride.pickup.x, y: ride.pickup.y, selected: true }]} />
          </div>
          <p style={{ fontSize: r(18), fontWeight: 700, color: C.text }}>{ride.pickup.name}</p>
          {P(`${ride.pickupPoint.label}. ${ride.pickupPoint.detail}.`)}
          <KV k="When" v={`${dayLabel(ride.date)}, around ${fmtTime(departAt(ride))}`} />
          {P('Directions are simulated. The prototype has no live routing.', 13, C.text3)}
        </Sheet>
      )
    }
    case 'skip':
      return (
        <Sheet title="Skip this date?" onClose={close}>
          {P(`${c.sheetArg ? dayLabel(c.sheetArg) : 'This date'} won’t be requested. Your other dates stay the same.`)}
          <Btn onClick={() => { const d = c.sheetArg!; s.patchCur(x => ({ occ: { ...x.occ, [d]: 'skipped' } })); close(); c.say('Date skipped.') }}>Skip this date</Btn>
          <Btn variant="text" onClick={close}>Keep it</Btn>
        </Sheet>
      )
    case 'end-schedule':
      return (
        <Sheet title="End this schedule?" onClose={close}>
          {P('No new dates will be requested. Rides that are already confirmed stay as they are.')}
          <Btn onClick={close}>Keep schedule</Btn>
          <button type="button" style={redText} className="ob-btn ob-btn-text" onClick={() => {
            s.patchCur(x => Object.values(x.occ).includes('confirmed') ? { ended: true } : { ended: true, status: 'cancelled', cancelledBy: 'passenger', cancelReason: 'Schedule ended' }); close(); c.say('Schedule ended.')
          }}>End schedule</button>
        </Sheet>
      )
    case 'no-show':
      return (
        <Sheet title="Report that your pilot hasn’t arrived" onClose={close}>
          {P('This sends a report for review. It doesn’t say anyone is at fault, and it doesn’t change anyone’s rating.')}
          <Btn onClick={() => { s.patchCur({ noShow: 'reported' }); close(); c.say('No-show report submitted.') }}>Submit report</Btn>
          <Btn variant="text" onClick={close}>Keep waiting</Btn>
        </Sheet>
      )
    default:
      return null
  }
}
