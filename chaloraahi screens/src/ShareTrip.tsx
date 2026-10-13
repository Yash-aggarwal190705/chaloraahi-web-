import { useEffect, useRef, useState } from 'react'
import { Btn, C, Ico, Notice, r } from './OnboardingUI'
import { Card, KV } from './PassengerUI'
import { SHARE_LINK, createShare, freshness, linkState, type ShareLink } from './shareModel'
import { bus, env, fmtClock, useNow } from './SOSData'

type Loc = { state: 'fresh' | 'stale' | 'unavailable'; at: number }
type Props = {
  share: ShareLink; patch: (fn: (s: ShareLink) => ShareLink) => void; fail: boolean; online: boolean; say: (m: string) => void
  owner: string; route: string; status: string; loc: Loc; intro?: boolean; closed?: boolean
}
type Note = { kind: 'info' | 'success' | 'warning' | 'error'; text: string } | null

const P = ({ children, size = 14, color = C.text2 }: { children: React.ReactNode; size?: number; color?: string }) => <p style={{ fontSize: r(size), color, lineHeight: 1.5 }}>{children}</p>
const textBtn = (color: string): React.CSSProperties => ({ minHeight: r(48), color, fontWeight: 600, fontSize: r(16), textDecoration: 'underline', width: '100%' })

export function locLine(loc: Loc, now: number) {
  const f = freshness(loc.state, loc.at, now)
  const age = Math.max(0, Math.round((now - loc.at) / 1000))
  const ago = age < 90 ? `${age}s ago` : `${Math.round(age / 60)} min ago`
  return f === 'live' ? `Live · updated ${ago}` : f === 'stale' ? `Last known · updated ${fmtClock(loc.at)} (${ago})` : 'Unavailable'
}

// The one trip-sharing surface used by Buddy, Pilot and SOS.
export default function ShareTrip({ share: sh, patch, fail, online, say, owner, route, status, loc, intro = true, closed = false }: Props) {
  const now = useNow(1000)
  const [view, setView] = useState<'main' | 'preview' | 'revoke'>('main')
  const [busy, setBusy] = useState<'' | 'create' | 'revoke' | 'check'>('')
  const [err, setErr] = useState('')
  const [note, setNote] = useState<Note>(null)
  const head = useRef<HTMLHeadingElement>(null)
  const alive = useRef(true)
  const creating = useRef<Promise<boolean> | null>(null)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => { if (view !== 'main') head.current?.focus({ preventScroll: true }) }, [view])
  const ls = linkState(sh, now, closed)
  const usable = ls === 'active' || ls === 'uncertain'

  const ensureLink = (): Promise<boolean> => {
    if (usable) return Promise.resolve(true)
    if (creating.current) return creating.current
    if (fail) { setErr('We couldn’t create a link. Nothing was shared. Try again.'); return Promise.resolve(false) }
    if (!online) { setErr('You’re offline, so a link can’t be created. Nothing was shared.'); return Promise.resolve(false) }
    setErr(''); setBusy('create')
    creating.current = new Promise(res => setTimeout(() => {
      patch(() => createShare())
      bus.log('Trip link created. Not yet sent to anyone.')
      creating.current = null
      if (alive.current) setBusy('')
      res(true)
    }, 600))
    return creating.current
  }
  const copyText = async () => {
    if (env.clipboard === 'fail') return false
    try { await navigator.clipboard.writeText(SHARE_LINK); return true } catch { return false }
  }
  const copy = async (linkReady = false) => {
    if (!linkReady && !(await ensureLink())) return
    if (await copyText()) { patch(s => ({ ...s, copied: true })); setNote({ kind: 'success', text: 'Link copied on this device. ChaloRaahi can’t see who you send it to.' }); say('Link copied.'); bus.log('Trip link copied on this device.') }
    else { setNote({ kind: 'warning', text: 'Couldn’t copy automatically. Select the link below and copy it yourself.' }); say('Could not copy the link.') }
  }
  const share = async () => {
    if (!(await ensureLink())) return
    const native = env.shareMode === 'auto' ? typeof navigator.share === 'function' : env.shareMode === 'cancel'
    if (!native) { await copy(true); return }
    if (env.shareMode === 'cancel') { setNote({ kind: 'info', text: 'Sharing was cancelled. The link you created is still active. You can share it again or revoke it.' }); say('Sharing cancelled.'); return }
    try {
      await navigator.share({ title: 'My ChaloRaahi ride', url: SHARE_LINK })
      patch(s => ({ ...s, opened: true }))
      setNote({ kind: 'info', text: 'Share menu opened. ChaloRaahi can’t confirm anyone received the link.' }); say('Share menu opened. Delivery is not confirmed.'); bus.log('Share menu opened. Delivery not confirmed.')
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') { setNote({ kind: 'info', text: 'Sharing was cancelled. The link you created is still active. You can share it again or revoke it.' }); say('Sharing cancelled.') }
      else await copy(true)
    }
  }
  const revoke = () => {
    if (busy) return
    setBusy('revoke'); setErr(''); setNote(null)
    setTimeout(() => {
      if (!online || env.shareRevoke === 'fail') patch(s => ({ ...s, revoke: 'failed' }))
      else if (env.shareRevoke === 'uncertain') patch(s => ({ ...s, revoke: 'uncertain', srvRevoked: true }))
      else { patch(s => ({ ...s, on: false, revoked: true, revokedAt: Date.now(), revoke: 'none', srvRevoked: true })); bus.log('Trip link revoked.'); say('Trip link revoked.') }
      if (alive.current) { setBusy(''); setView('main') }
      if (!online || env.shareRevoke !== 'ok') bus.log('Revocation not confirmed.')
    }, 800)
  }
  const reconcile = () => {
    if (!online) { setErr('You’re offline, so the link can’t be checked.'); return }
    setErr(''); setNote(null); setBusy('check')
    setTimeout(() => {
      patch(s => (s.srvRevoked ? { ...s, on: false, revoked: true, revokedAt: Date.now(), revoke: 'none' } : { ...s, revoke: 'none' }))
      bus.log('Checked link status with the server.')
      if (alive.current) setBusy('')
    }, 700)
  }

  if (view === 'preview') {
    const dead = ls === 'revoked' || ls === 'expired' || ls === 'closed'
    return (
      <div className="flex flex-col" style={{ gap: r(12) }}>
        <h3 ref={head} tabIndex={-1} style={{ fontSize: r(18), fontWeight: 700, color: C.text, outline: 'none' }}>Shared details</h3>
        <P>This is what people with the link can see. It is built from the same ride data, limited to the fields below.</P>
        <Card>
          {dead ? <P color={C.text}>{ls === 'revoked' ? 'This link was revoked.' : ls === 'closed' ? 'This link ended when the ride closed.' : 'This link has expired.'} Viewers see no ride details and no location.</P> : (
            <div className="flex flex-col" style={{ gap: r(8) }}>
              <KV k="Name" v={owner} /><KV k="Route" v={route} /><KV k="Ride status" v={status} /><KV k="Location" v={locLine(loc, now)} />
            </div>
          )}
        </Card>
        <P>Never included: phone numbers, documents, start codes, safety-case details, other trips or home-address detail.</P>
        <Btn variant="secondary" onClick={() => setView('main')}>Back to sharing</Btn>
      </div>
    )
  }

  if (view === 'revoke') {
    return (
      <div className="flex flex-col" style={{ gap: r(12) }}>
        <h3 ref={head} tabIndex={-1} style={{ fontSize: r(20), fontWeight: 700, color: C.text, outline: 'none' }}>Revoke this trip link?</h3>
        <P size={15}>People with this link will lose access once revocation is confirmed. Information already viewed or captured cannot be recalled.</P>
        {!online && <Notice kind="warning">You’re offline. Revocation can’t be confirmed until you reconnect.</Notice>}
        <Btn loading={busy === 'revoke'} onClick={revoke} style={{ background: C.errText }}>Revoke link</Btn>
        <Btn variant="secondary" onClick={() => setView('main')}>Keep sharing</Btn>
      </div>
    )
  }

  const stateCopy: Record<string, string> = { none: 'No link yet', active: 'Active', expired: 'Expired', revoked: 'Revoked', uncertain: 'Active · revocation not confirmed', closed: 'Ended with the ride' }
  return (
    <div className="flex flex-col" style={{ gap: r(12) }}>
      {intro && (
        <>
          <P size={15}>Share a temporary link so someone you trust can see this ride’s progress.</P>
          <Card>
            <p style={{ fontSize: r(14), fontWeight: 700, color: C.text }}>What they can see</p>
            <ul style={{ fontSize: r(14), color: C.text2, lineHeight: 1.6, paddingLeft: r(18), listStyle: 'disc' }}><li>Your display name</li><li>Route summary and ride status</li><li>Ride location, with how recent it is</li></ul>
            <p style={{ fontSize: r(14), fontWeight: 700, color: C.text, marginTop: r(8) }}>Never shared</p>
            <p style={{ fontSize: r(14), color: C.text2 }}>Phone numbers, documents, start codes, safety-case details, other trips or home-address detail.</p>
          </Card>
        </>
      )}
      {err && <Notice kind="error">{err}</Notice>}
      {fail && !usable && <Notice kind="error">Trip links are unavailable right now. Nothing was shared.</Notice>}
      {note && <Notice kind={note.kind}>{note.text}</Notice>}
      {busy === 'create' && <Notice kind="info">Creating link…</Notice>}

      {ls !== 'none' && (
        <Card>
          <div className="flex flex-col" style={{ gap: r(8) }}>
            <KV k="Link" v={stateCopy[ls]} />
            <KV k="Recipient" v="Not known" />
            <KV k="Created" v={fmtClock(sh.createdAt)} />
            {ls === 'revoked' ? <KV k="Revoked" v={fmtClock(sh.revokedAt)} /> : ls === 'closed' ? <KV k="Ended" v="When the ride closed" /> : <KV k="Expiry setting" v={fmtClock(sh.expires)} />}
            {usable && <KV k="Location shown" v={locLine(loc, now)} />}
          </div>
          {usable && <p style={{ fontSize: r(14), color: C.text2, marginTop: r(10), lineHeight: 1.5 }}>Access ends when the ride closes or at {fmtClock(sh.expires)}, whichever comes first.</p>}
          {usable && <p style={{ fontSize: r(13), color: C.text3, marginTop: r(6), overflowWrap: 'anywhere', userSelect: 'all' }}>Sample link: {SHARE_LINK}</p>}
        </Card>
      )}
      {ls === 'closed' && <Notice kind="info">The ride has closed, so this link no longer shows ride details or location. Server-side enforcement is required in production.</Notice>}
      {ls === 'expired' && <Notice kind="warning">This link has expired. People who open it see no ride details. Create a new link to share again.</Notice>}
      {ls === 'revoked' && <Notice kind="info">This link was revoked. People who open it see no ride details and no location.</Notice>}
      {usable && <P>Anyone with this link may be able to view the shared ride details until access ends. Recipients may forward the link or take a screenshot.</P>}
      {sh.copied && usable && <P>Copied on this device.</P>}
      {sh.opened && usable && <P>Share menu opened. Delivery is not confirmed.</P>}

      {sh.revoke !== 'none' && ls !== 'revoked' && (
        <Notice kind="warning" action={<button type="button" className="ob-btn ob-btn-text" disabled={!!busy} onClick={reconcile} style={textBtn(C.warnText)}>{busy === 'check' ? 'Checking…' : 'Check link status'}</button>}>
          Revocation not confirmed. The link may still be active. Check its status before trying again.
        </Notice>
      )}

      {usable ? (
        <>
          <Btn onClick={share} icon={<Ico name="share" size={18} />}>Share link</Btn>
          <Btn variant="secondary" onClick={() => copy()} icon={<Ico name="copy" size={18} />}>Copy link</Btn>
          <Btn variant="text" onClick={() => setView('preview')}>View shared details</Btn>
          {sh.revoke === 'uncertain' ? null : <button type="button" className="ob-btn ob-btn-text" onClick={() => setView('revoke')} style={textBtn(C.errText)}>{sh.revoke === 'failed' ? 'Try revoking again' : 'Revoke link'}</button>}
        </>
      ) : ls === 'closed' ? (
        <Btn variant="text" onClick={() => setView('preview')}>View shared details</Btn>
      ) : (
        <>
          <Btn loading={busy === 'create'} onClick={share} icon={<Ico name="share" size={18} />}>{ls === 'none' ? 'Share link' : 'Create a new link and share'}</Btn>
          <Btn variant="secondary" onClick={() => copy()} icon={<Ico name="copy" size={18} />}>{ls === 'none' ? 'Copy link' : 'Create a new link and copy'}</Btn>
          {ls !== 'none' && <Btn variant="text" onClick={() => setView('preview')}>View shared details</Btn>}
        </>
      )}
    </div>
  )
}
