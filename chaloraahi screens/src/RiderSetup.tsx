import { useRef, useState } from 'react'
import { Badge, Body, Btn, C, Field, Heading, Ico, Notice, Screen, TopRow, r } from './OnboardingUI'
import { Card, H2, KV, Row, useTimers } from './PassengerUI'
import { DOC_META, DOC_STATUS, maskReg, vehicleLine, type DocKey, type RCtx, type Doc } from './RiderData'
import { LinkBtn, P, Para, Stepper, clock } from './RiderUI'

const KEYS: DocKey[] = ['licFront', 'licBack', 'rc']
const EDITABLE = ['none', 'selected', 'ready', 'action', 'expired']
const regOk = (v: string) => { const s = v.replace(/[^a-z0-9]/gi, ''); return s.length >= 6 && /\d/.test(s) }
const kb = (n: number) => n ? (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`) : ''

// ── Step 1: vehicle ──────────────────────────────────────────────────────────

export function SetupVehicle({ c }: { c: RCtx }) {
  const { s } = c
  const v = s.vehicle
  const later = useTimers()
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState('')
  const empty = !v.type && !v.make && !v.color && !v.reg && !v.helmet

  const validate = () => {
    const e: Record<string, string> = {}
    if (!v.type) e.type = 'Choose your vehicle type.'
    if (!v.make.trim()) e.make = 'Enter the make and model, for example Honda Activa 6G.'
    if (!v.color.trim()) e.color = 'Enter the vehicle colour.'
    if (!v.reg.trim()) e.reg = 'Enter your registration number.'
    else if (!regOk(v.reg)) e.reg = 'This doesn’t look like a registration number. Check it and try again.'
    if (!v.helmet) e.helmet = 'Tell us whether you can provide a Buddy helmet.'
    return e
  }
  const next = () => {
    const e = validate(); setErrs(e)
    const first = ['type', 'make', 'color', 'reg', 'helmet'].find(k => e[k])
    if (first) { window.setTimeout(() => document.getElementById(first === 'type' || first === 'helmet' ? `v-${first}` : `v-${first}`)?.focus(), 30); return }
    c.go('setup-documents')
  }
  const save = () => {
    setSaving(true); setSaveErr('')
    later(() => {
      setSaving(false)
      if (s.proto.saveFail || !c.online) { setSaveErr('We couldn’t save your draft. Your details are still here—please try again.'); return }
      s.setDraftSaved(true); c.say('Draft saved on this device.')
    }, 800)
  }
  const partial = !empty && Object.keys(validate()).length > 0
  const card = (val: 'motorcycle' | 'scooter', label: string, sub: string) => {
    const on = v.type === val
    return (
      <label key={val} className="ob-check flex flex-col" style={{ gap: r(6), padding: r(14), minHeight: r(96), borderRadius: r(14), border: `1.5px solid ${on ? C.primary : errs.type ? C.errText : C.divider}`, background: on ? C.tint : '#fff', cursor: 'pointer', flex: '1 1 8rem' }}>
        <span className="flex items-center justify-between"><Ico name="scooter" size={26} color={on ? C.primary : C.text2} />
          <input id={`v-type-${val}`} type="radio" name="vtype" checked={on} onChange={() => { s.setVehicle({ type: val }); setErrs(x => ({ ...x, type: '' })) }} style={{ width: r(22), height: r(22), accentColor: C.primary }} /></span>
        <span style={{ fontSize: r(16), fontWeight: 700, color: C.text }}>{label}</span>
        <span style={{ fontSize: r(14), color: C.text2 }}>{sub}</span>
      </label>
    )
  }
  return (
    <Screen top={<TopRow onBack={c.switchRole} />} gap={20}
      footer={<>
        <Btn onClick={next}>Continue</Btn>
        <Btn variant="text" loading={saving} onClick={save}>{saving ? 'Saving…' : 'Save and finish later'}</Btn>
      </>}>
      <Stepper step={1} />
      <div className="flex flex-col" style={{ gap: r(8) }}>
        <Heading size={26}>Set up your vehicle</Heading>
        <Body>Tell us about the two-wheeler you’ll use for your commute. Only members who offer a seat need to do this.</Body>
      </div>
      {empty && <Notice kind="info">Nothing added yet. Everything on this page is needed before you can offer a seat.</Notice>}
      {partial && !Object.keys(errs).length && !s.draftSaved && <Notice kind="info">Some details are still missing. You can save and finish later.</Notice>}
      {s.draftSaved && <Notice kind="success">Draft saved. You can finish this later—your details stay here.</Notice>}
      {saveErr && <Notice kind="error">{saveErr}</Notice>}
      {Object.values(errs).some(Boolean) && <Notice kind="error">Check the fields marked below.</Notice>}
      <fieldset className="flex flex-col" style={{ gap: r(8), border: 0, padding: 0, minWidth: 0 }} aria-describedby={errs.type ? 'v-type-e' : undefined}>
        <legend style={{ fontSize: r(14), fontWeight: 600, color: C.text, marginBottom: r(8) }}>Vehicle type</legend>
        <div className="flex flex-wrap" style={{ gap: r(12) }}>{card('motorcycle', 'Motorcycle', 'Geared or cruiser')}{card('scooter', 'Scooter', 'Automatic')}</div>
        {errs.type && <p id="v-type-e" role="alert" style={{ fontSize: r(14), color: C.errText }}>{errs.type}</p>}
      </fieldset>
      <Field id="v-make" label="Make and model" placeholder="Honda Activa 6G" autoComplete="off" value={v.make} error={errs.make} onChange={e => { s.setVehicle({ make: e.target.value }); setErrs(x => ({ ...x, make: '' })) }} />
      <Field id="v-color" label="Vehicle colour" placeholder="White" autoComplete="off" value={v.color} error={errs.color} onChange={e => { s.setVehicle({ color: e.target.value }); setErrs(x => ({ ...x, color: '' })) }} />
      <Field id="v-reg" label="Registration number" placeholder="RJ 14 AB 4821" autoComplete="off" autoCapitalize="characters" value={v.reg} error={errs.reg}
        helper={v.reg && regOk(v.reg) ? `Passengers will only see ${maskReg(v.reg)}.` : 'Passengers only see the first part and the last four characters.'}
        onChange={e => { s.setVehicle({ reg: e.target.value.toUpperCase() }); setErrs(x => ({ ...x, reg: '' })) }} />
      <fieldset className="flex flex-col" style={{ gap: r(8), border: 0, padding: 0, minWidth: 0 }}>
        <legend style={{ fontSize: r(14), fontWeight: 600, color: C.text, marginBottom: r(8) }}>Can you provide a Buddy helmet?</legend>
        <div className="flex" style={{ gap: r(12) }}>
          {(['yes', 'no'] as const).map(o => {
            const on = v.helmet === o
            return (
              <label key={o} className="ob-check flex items-center flex-1" style={{ gap: r(10), minHeight: r(54), padding: `0 ${r(14)}`, borderRadius: r(12), border: `1.5px solid ${on ? C.primary : errs.helmet ? C.errText : C.divider}`, background: on ? C.tint : '#fff', cursor: 'pointer' }}>
                <input id={o === 'yes' ? 'v-helmet' : undefined} type="radio" name="vhelmet" checked={on} onChange={() => { s.setVehicle({ helmet: o }); setErrs(x => ({ ...x, helmet: '' })) }} style={{ width: r(22), height: r(22), accentColor: C.primary }} />
                <span style={{ fontSize: r(16), fontWeight: 600, color: C.text }}>{o === 'yes' ? 'Yes' : 'No'}</span>
              </label>
            )
          })}
        </div>
        {errs.helmet && <p role="alert" style={{ fontSize: r(14), color: C.errText }}>{errs.helmet}</p>}
        <p style={{ fontSize: r(14), color: C.text2 }}>If not, your Buddy will need to bring their own helmet.</p>
      </fieldset>
      <div className="flex items-center" style={{ gap: r(12), padding: r(14), borderRadius: r(14), background: C.surface2, border: `1px solid ${C.divider}` }}>
        <Ico name="info" size={20} color={C.primary} /><span style={{ fontSize: r(15), fontWeight: 600, color: C.text }}>One pillion seat available</span>
      </div>
    </Screen>
  )
}

// ── Step 2: documents ────────────────────────────────────────────────────────

function DocCard({ k, c }: { k: DocKey; c: RCtx }) {
  const d = c.s.docs[k]
  const meta = DOC_META[k]
  const fileRef = useRef<HTMLInputElement>(null)
  const camRef = useRef<HTMLInputElement>(null)
  const later = useTimers()
  const editable = EDITABLE.includes(d.status)
  const set = (p: Partial<Doc>) => c.s.setDoc(k, p)

  const pick = (f?: File | null) => {
    if (!f) return
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(f.type)) { set({ error: 'This file type isn’t supported. Choose a JPG, PNG or PDF.' }); return }
    if (f.size > 5 * 1048576) { set({ error: 'This file is larger than 5 MB. Choose a smaller file.' }); return }
    if (f.size === 0) { set({ error: 'We couldn’t read this file. Choose another one.' }); return }
    const url = URL.createObjectURL(f)
    const finish = (ok: boolean) => {
      if (!ok) { URL.revokeObjectURL(url); set({ error: 'We couldn’t read this file. Choose another one.' }); return }
      if (d.url) URL.revokeObjectURL(d.url)
      set({ status: 'selected', name: f.name, size: f.size, kind: f.type === 'application/pdf' ? 'pdf' : 'image', url, error: '', reason: '', sample: false })
      later(() => set({ status: 'ready' }), 400)
      c.say(`${meta.title} selected, ready to submit.`)
    }
    if (f.type === 'application/pdf') finish(true)
    else { const im = new Image(); im.onload = () => finish(true); im.onerror = () => finish(false); im.src = url }
  }
  const camera = () => {
    if (!navigator.mediaDevices?.getUserMedia) { set({ error: 'Camera isn’t available on this device. Choose a file instead.' }); return }
    camRef.current?.click()
  }
  const remove = () => {
    if (d.url) URL.revokeObjectURL(d.url)
    c.s.setDocs(x => ({ ...x, [k]: { status: 'none', name: '', size: 0, kind: 'image', url: '', error: '', reason: '' } }))
    c.say(`${meta.title} removed.`)
  }
  const has = d.status !== 'none'
  const kind = d.status === 'approved' ? 'ok' : d.status === 'action' || d.status === 'expired' ? 'err' : d.status === 'none' ? 'neutral' : 'warn'
  return (
    <Card tone={d.status === 'action' || d.status === 'expired' ? 'warn' : 'plain'}>
      <div className="flex flex-col" style={{ gap: r(12) }}>
        <div className="flex items-start justify-between flex-wrap" style={{ gap: r(8) }}>
          <div className="min-w-0">
            <h3 style={{ fontSize: r(16), fontWeight: 700, color: C.text }}>{meta.title}</h3>
            <p style={{ fontSize: r(13), fontWeight: 600, color: meta.required ? C.pressed : C.text2 }}>{meta.required ? 'Required' : 'Required if printed on your licence'}</p>
          </div>
          <Badge kind={kind}>{DOC_STATUS[d.status]}</Badge>
        </div>
        <Para>{meta.hint}</Para>
        {has && (
          <div className="flex items-center" style={{ gap: r(12) }}>
            {d.kind === 'image' && d.url
              ? <img src={d.url} alt={`Preview of ${d.name}`} style={{ width: r(56), height: r(56), objectFit: 'cover', borderRadius: r(10), border: `1px solid ${C.divider}` }} />
              : <span className="flex items-center justify-center flex-shrink-0" style={{ width: r(56), height: r(56), borderRadius: r(10), background: C.surface2, border: `1px solid ${C.divider}` }}><Ico name="file" size={24} color={C.text2} /></span>}
            <div className="min-w-0"><p style={{ fontSize: r(15), fontWeight: 600, color: C.text, overflowWrap: 'anywhere' }}>{d.name}</p>
              <p style={{ fontSize: r(13), color: C.text2 }}>{d.sample ? 'Prototype sample, no file' : `${d.kind === 'pdf' ? 'PDF' : 'Image'} · ${kb(d.size)}`}</p></div>
          </div>
        )}
        {d.reason && <Notice kind="warning">{d.reason}</Notice>}
        {d.status === 'expired' && <Notice kind="warning">This document has expired. Add a current one to offer new trips.</Notice>}
        {d.error && <Notice kind="error">{d.error}{has ? ' Your current file was kept.' : ''}</Notice>}
        {d.status === 'uploading' && <p role="status" style={{ fontSize: r(14), color: C.text2 }}>Uploading…</p>}
        {editable && (
          <div className="flex flex-wrap" style={{ gap: r(8) }}>
            <Btn variant="secondary" style={{ width: 'auto', flex: '1 1 8rem', minHeight: r(48) }} onClick={() => fileRef.current?.click()}>{has ? 'Replace' : 'Choose file'}<span className="sr-only"> {meta.title}</span></Btn>
            <Btn variant="secondary" style={{ width: 'auto', flex: '1 1 8rem', minHeight: r(48) }} onClick={camera} icon={<Ico name="camera" size={18} />}>Take photo<span className="sr-only"> of {meta.title}</span></Btn>
            {has && d.status !== 'action' && d.status !== 'expired' && <Btn variant="text" style={{ width: 'auto', minHeight: r(48) }} onClick={remove}>Remove<span className="sr-only"> {meta.title}</span></Btn>}
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,application/pdf" tabIndex={-1} aria-hidden className="sr-only" onChange={e => { pick(e.target.files?.[0]); e.target.value = '' }} />
        <input ref={camRef} type="file" accept="image/*" capture="environment" tabIndex={-1} aria-hidden className="sr-only" onChange={e => { pick(e.target.files?.[0]); e.target.value = '' }} />
      </div>
    </Card>
  )
}

export function SetupDocuments({ c }: { c: RCtx }) {
  const { s } = c
  const [err, setErr] = useState('')
  const next = () => {
    const missing = KEYS.filter(k => DOC_META[k].required && s.docs[k].status === 'none')
    const bad = KEYS.filter(k => s.docs[k].status === 'expired' || s.docs[k].status === 'action')
    if (missing.length) { setErr(`Add ${missing.map(k => DOC_META[k].title.toLowerCase()).join(' and ')} to continue.`); return }
    if (bad.length) { setErr(`Replace ${bad.map(k => DOC_META[k].title.toLowerCase()).join(' and ')} to continue.`); return }
    setErr(''); c.go('setup-promise')
  }
  return (
    <Screen top={<TopRow onBack={c.back} />} gap={16} footer={<Btn onClick={next}>Continue to review</Btn>}>
      <Stepper step={2} />
      <div className="flex flex-col" style={{ gap: r(8) }}>
        <Heading size={26}>Add your driving documents</Heading>
        <Body>We check these once so Buddies can trust who they ride with.</Body>
      </div>
      <Notice kind="info">Only used to review your application. Previews stay on this device. Don’t add Aadhaar, bank details or anything else.</Notice>
      {err && <Notice kind="error">{err}</Notice>}
      {KEYS.map(k => <DocCard key={k} k={k} c={c} />)}
    </Screen>
  )
}

// ── Step 3: review and submit ────────────────────────────────────────────────

export function SetupReview({ c }: { c: RCtx }) {
  const { s } = c
  const v = s.vehicle
  const later = useTimers()
  const [agree, setAgree] = useState(false)
  const [tried, setTried] = useState(false)
  const phase = s.submitPhase
  const vehicleDone = !!(v.type && v.make.trim() && v.color.trim() && regOk(v.reg) && v.helmet)
  const docsDone = KEYS.filter(k => DOC_META[k].required).every(k => s.docs[k].status !== 'none' && s.docs[k].status !== 'expired' && s.docs[k].status !== 'action')
  const ready = vehicleDone && docsDone
  const busy = phase === 'submitting' || phase === 'checking'

  const finish = () => {
    s.setApproval('pending'); s.setSubmitPhase('idle'); c.root('verification-pending'); c.say('Application submitted. It is now under review.')
  }
  const submit = () => {
    if (busy) return
    setTried(true)
    if (!agree || !ready) return
    s.setSubmitPhase('submitting')
    const up = KEYS.filter(k => s.docs[k].status === 'ready')
    up.forEach(k => s.setDoc(k, { status: 'uploading', error: '' }))
    later(() => {
      const restore = (ks: DocKey[]) => ks.forEach(k => s.setDoc(k, { status: 'ready' }))
      const mode = s.proto.submit
      if (!c.online || mode === 'failed') { restore(up); s.setSubmitPhase('failed'); return }
      if (mode === 'partial' || s.proto.uploadFail) {
        const bad = up.includes('rc') ? 'rc' : up[up.length - 1]
        up.forEach(k => k === bad ? s.setDoc(k, { status: 'ready', error: 'Upload failed. Try again.' }) : s.setDoc(k, { status: 'submitted' }))
        s.setSubmitPhase('partial'); return
      }
      up.forEach(k => s.setDoc(k, { status: mode === 'uncertain' ? 'submitted' : 'review' }))
      if (mode === 'uncertain') { s.setSubmitPhase('uncertain'); return }
      finish()
    }, 1500)
  }
  const check = () => {
    s.setSubmitPhase('checking')
    later(() => { KEYS.forEach(k => s.docs[k].status === 'submitted' && s.setDoc(k, { status: 'review' })); finish() }, 1200)
  }
  const docLine = (k: DocKey) => {
    const d = s.docs[k]
    return (
      <li key={k} className="flex items-start justify-between" style={{ gap: r(12), minHeight: r(44) }}>
        <span style={{ fontSize: r(15), color: C.text }}>{DOC_META[k].title}{!DOC_META[k].required && d.status === 'none' ? ' (if needed)' : ''}</span>
        <span className="flex items-center flex-shrink-0" style={{ gap: r(6), fontSize: r(14), fontWeight: 600, color: d.status === 'none' && DOC_META[k].required ? C.errText : d.status === 'none' ? C.text2 : C.okText }}>
          <Ico name={d.status === 'none' ? (DOC_META[k].required ? 'alert' : 'info') : 'check'} size={16} />{DOC_STATUS[d.status]}
        </span>
      </li>
    )
  }
  return (
    <Screen top={<TopRow onBack={c.back} />} gap={16}
      footer={<>
        <Btn loading={busy} onClick={submit}>{phase === 'submitting' ? 'Submitting…' : phase === 'checking' ? 'Checking…' : phase === 'partial' ? 'Retry failed upload' : 'Submit for review'}</Btn>
        {tried && !agree && <p role="alert" style={{ fontSize: r(14), color: C.errText }}>Agree to the rider guidelines to submit.</p>}
        {tried && agree && !ready && <p role="alert" style={{ fontSize: r(14), color: C.errText }}>Finish your vehicle details and required documents first.</p>}
      </>}>
      <Stepper step={3} />
      <Heading size={26}>Review your rider application</Heading>
      {phase === 'failed' && <Notice kind="error">We couldn’t submit your application. Your details are still here—please try again.</Notice>}
      {phase === 'partial' && <Notice kind="warning">Some documents were submitted, but one didn’t upload. Your other files are kept—retry the one that failed.</Notice>}
      {phase === 'uncertain' && <Notice kind="warning" action={<div style={{ marginTop: r(8) }}><Btn variant="secondary" style={{ minHeight: r(48) }} loading={phase !== 'uncertain'} onClick={check}>Check application status</Btn></div>}>We’re not sure your application was received. Please check before submitting again.</Notice>}
      <Card>
        <div className="flex items-center justify-between" style={{ marginBottom: r(8) }}><H2>Vehicle</H2><LinkBtn onClick={() => c.go('setup-vehicle')}>Edit<span className="sr-only"> vehicle</span></LinkBtn></div>
        <div className="flex flex-col" style={{ gap: r(6) }}>
          <KV k="Type" v={v.type ? v.type[0].toUpperCase() + v.type.slice(1) : 'Not added'} />
          <KV k="Vehicle" v={vehicleLine(v) || 'Not added'} />
          <KV k="Registration" v={maskReg(v.reg) || 'Not added'} />
          <KV k="Buddy helmet" v={v.helmet === 'yes' ? 'I can provide one' : v.helmet === 'no' ? 'Buddy brings their own' : 'Not answered'} />
          <KV k="Seats" v="One pillion seat" />
        </div>
      </Card>
      <Card>
        <div className="flex items-center justify-between" style={{ marginBottom: r(4) }}><H2>Documents</H2><LinkBtn onClick={() => c.go('setup-documents')}>Edit<span className="sr-only"> documents</span></LinkBtn></div>
        <ul style={{ listStyle: 'none' }}>{KEYS.map(docLine)}</ul>
      </Card>
      <Card tone="tint">
        <H2>Your commitments</H2>
        <ul className="flex flex-col" style={{ gap: r(10), listStyle: 'none', marginTop: r(10) }}>
          {['Share an existing commute. ChaloRaahi is not a taxi service.', 'Keep the agreed contribution. Fuel share only, settled directly.', 'Prepare before setting off. Check your vehicle and helmet.', 'Respect your Buddy. Follow the community guidelines.'].map(t => (
            <li key={t} className="flex items-start" style={{ gap: r(10), fontSize: r(15), color: C.text }}><span style={{ marginTop: 3 }}><Ico name="check" size={16} color={C.primary} sw={3} /></span>{t}</li>
          ))}
        </ul>
      </Card>
      <label htmlFor="agree" className="ob-check flex items-start" style={{ gap: r(12), padding: r(14), minHeight: r(56), borderRadius: r(14), border: `1.5px solid ${agree ? C.primary : tried ? C.errText : C.divider}`, background: agree ? C.tint : '#fff', cursor: 'pointer' }}>
        <input id="agree" type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} style={{ width: r(24), height: r(24), accentColor: C.primary, flexShrink: 0, marginTop: 1 }} />
        <span style={{ fontSize: r(16), color: C.text, lineHeight: 1.4 }}>I’ve reviewed my details and agree to the rider guidelines</span>
      </label>
    </Screen>
  )
}

// ── Approval states ──────────────────────────────────────────────────────────

const statusRow = (icon: string, title: string, value: string, kind: 'ok' | 'warn' | 'err') => (
  <li key={title} className="flex items-center justify-between" style={{ gap: r(12), minHeight: r(56) }}>
    <span className="flex items-center" style={{ gap: r(12), fontSize: r(16), color: C.text, fontWeight: 600 }}><Ico name={icon} size={20} color={C.text2} />{title}</span>
    <Badge kind={kind}>{value}</Badge>
  </li>
)

export function ApprovalStatus({ c }: { c: RCtx }) {
  const { s } = c
  const later = useTimers()
  const [checking, setChecking] = useState(false)
  const docsState = KEYS.some(k => s.docs[k].status === 'action') ? 'action' : KEYS.some(k => s.docs[k].status === 'expired') ? 'expired' : 'review'
  const check = () => { setChecking(true); later(() => { setChecking(false); s.setCheckedAt(Date.now()); c.say('No update yet. Your application is still under review.') }, 1000) }

  if (s.approval === 'pending') return (
    <Screen gap={20} footer={<>
      <Btn variant="secondary" onClick={() => c.go('vehicle-status')}>View application</Btn>
      <Btn variant="secondary" loading={checking} onClick={check}>{checking ? 'Checking…' : 'Check status'}</Btn>
      <Btn variant="text" onClick={() => c.open('help')}>Get help</Btn>
    </>}>
      <div className="flex flex-col" style={{ gap: r(8), paddingTop: r(16) }}>
        <Heading size={26}>Your rider application is under review</Heading>
        <Body>We’ll show the result here and in your notifications. You can keep using ChaloRaahi as a Buddy while you wait.</Body>
      </div>
      <Card><ul style={{ listStyle: 'none' }}>
        {statusRow('shield', 'College membership', 'Verified', 'ok')}
        {statusRow('file', 'Driving documents', 'Under review', 'warn')}
        {statusRow('scooter', 'Vehicle', 'Submitted', 'warn')}
      </ul></Card>
      {s.checkedAt > 0 && <Para>Last checked at {clock(s.checkedAt)}. No update yet.</Para>}
    </Screen>
  )

  if (s.approval === 'approved') return (
    <Screen gap={20} center footer={<>
      <Btn onClick={() => { s.setDraftAll({ ...s.draft, touched: false }); c.root('post-trip') }}>Plan your first trip</Btn>
      <Btn variant="secondary" onClick={() => c.root('rider-home-idle')}>Go to Pilot home</Btn>
    </>}>
      <span className="flex items-center justify-center" style={{ width: r(72), height: r(72), borderRadius: 999, background: C.okBg, color: C.okText, border: `1px solid ${C.okBorder}` }}><Ico name="check" size={34} sw={2.5} /></span>
      <Heading size={26} center>You’re ready to offer a seat</Heading>
      <Body center>Your college membership, documents and vehicle are approved. Plan a trip you already make and matching Buddies will be able to request it.</Body>
    </Screen>
  )

  const expired = s.approval === 'expired', restricted = s.approval === 'restricted'
  const bad = KEYS.filter(k => s.docs[k].status === 'action' || s.docs[k].status === 'expired')
  return (
    <Screen gap={20} footer={restricted ? <>
      <Btn onClick={() => c.open('help')}>Get help</Btn>
      <Btn variant="secondary" onClick={() => c.go('vehicle-status')}>View application</Btn>
    </> : <>
      <Btn onClick={() => c.go('setup-documents')}>Update documents</Btn>
      {!expired && <Btn variant="secondary" onClick={() => c.open('appeal')}>Ask for a review</Btn>}
      <Btn variant="text" onClick={() => c.open('help')}>Get help</Btn>
    </>}>
      <div className="flex flex-col" style={{ gap: r(8), paddingTop: r(16) }}>
        <Heading size={26}>{restricted ? 'Pilot access is paused' : expired ? 'Your documents need renewing' : 'Your application needs an update'}</Heading>
        <Body>{restricted ? 'You can’t publish new trips right now. Rides that are already confirmed are not changed automatically. Contact support to understand next steps.'
          : expired ? 'A document has expired, so you can’t publish new trips. Rides that are already confirmed stay as they are.' : 'Nothing is wrong with your account. A few items need another look before we can approve your vehicle.'}</Body>
      </div>
      <Card><ul style={{ listStyle: 'none' }}>
        {statusRow('shield', 'College membership', 'Verified', 'ok')}
        {statusRow('file', 'Driving documents', docsState === 'action' ? 'Action needed' : docsState === 'expired' ? 'Expired' : restricted ? 'Paused' : 'Under review', docsState === 'review' && !restricted ? 'warn' : 'err')}
        {statusRow('scooter', 'Vehicle', restricted ? 'Paused' : 'Submitted', restricted ? 'err' : 'warn')}
      </ul></Card>
      {bad.map(k => (
        <Notice key={k} kind="warning"><strong>{DOC_META[k].title}.</strong> {s.docs[k].reason || (s.docs[k].status === 'expired' ? 'This document has expired. Add a current one.' : 'This document needs to be replaced.')}</Notice>
      ))}
      {s.notice && <Notice kind="success">{s.notice}</Notice>}
    </Screen>
  )
}

// ── Vehicle and document status (Profile destination) ────────────────────────

export function VehicleStatus({ c }: { c: RCtx }) {
  const { s } = c
  const v = s.vehicle
  const outcome = { draft: 'Not submitted yet', pending: 'Under review', approved: 'Approved', rejected: 'Needs an update', expired: 'Documents expired', restricted: 'Pilot access paused' }[s.approval]
  const editable = KEYS.some(k => ['action', 'expired', 'none', 'ready'].includes(s.docs[k].status))
  return (
    <Screen top={<TopRow onBack={c.back} />} gap={16}>
      <Heading size={26}>Vehicle and documents</Heading>
      <Card tone={s.approval === 'approved' ? 'ok' : s.approval === 'pending' || s.approval === 'draft' ? 'tint' : 'warn'}>
        <KV k="Review outcome" v={outcome} strong />
      </Card>
      <Card>
        <H2>Vehicle</H2>
        <div className="flex flex-col" style={{ gap: r(6), marginTop: r(8) }}>
          <KV k="Vehicle" v={vehicleLine(v) || 'Not added'} />
          <KV k="Registration" v={maskReg(v.reg) || 'Not added'} />
          <KV k="Buddy helmet" v={v.helmet === 'yes' ? 'I can provide one' : v.helmet === 'no' ? 'Buddy brings their own' : 'Not answered'} />
        </div>
        <div style={{ marginTop: r(8) }}><LinkBtn onClick={() => c.go('setup-vehicle')}>Edit vehicle details</LinkBtn></div>
      </Card>
      <Card>
        <H2>Documents</H2>
        <ul style={{ listStyle: 'none', marginTop: r(4) }}>
          {KEYS.map(k => {
            const d = s.docs[k]
            return (
              <li key={k} className="flex items-start justify-between" style={{ gap: r(12), minHeight: r(48), padding: `${r(6)} 0` }}>
                <span className="min-w-0"><span className="block" style={{ fontSize: r(15), color: C.text }}>{DOC_META[k].title}</span>
                  {d.status === 'approved' && <span className="block" style={{ fontSize: r(13), color: C.text2 }}>Valid until 12 Mar 2029 (sample)</span>}
                  {d.reason && <span className="block" style={{ fontSize: r(13), color: C.errText }}>{d.reason}</span>}</span>
                <span style={{ fontSize: r(14), fontWeight: 600, color: d.status === 'approved' ? C.okText : d.status === 'action' || d.status === 'expired' ? C.errText : C.text2 }}>{DOC_STATUS[d.status]}</span>
              </li>
            )
          })}
        </ul>
        {editable && <div style={{ marginTop: r(8) }}><LinkBtn onClick={() => c.go('setup-documents')}>Add or replace documents</LinkBtn></div>}
      </Card>
      <Row icon="info" title="Get help with your application" sub="Ask the ChaloRaahi team" onClick={() => c.open('help')} />
      <Para>Replacing an approved document sends it for review again. Confirmed rides are not affected while that happens.</Para>
    </Screen>
  )
}
