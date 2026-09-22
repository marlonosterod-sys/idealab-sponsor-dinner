import { useState } from 'react'
import { useData } from '../lib/data'
import type { CrewMember, Shift } from '../lib/types'
import { Modal, PageHead, RecordModal, type Field } from '../ui'

const SHIFT_EN: Record<string, string> = { setup: 'Set-up', service: 'Waiters', bar: 'Bar', kueche: 'Kitchen', teardown: 'Tear-down' }

export default function Crew() {
  const { crew, shifts, write, requireEdit, setError, flash } = useData()
  const [edit, setEdit] = useState<CrewMember | 'new' | null>(null)
  const [editShift, setEditShift] = useState<Shift | null>(null)
  const [msg, setMsg] = useState<Shift | null>(null)
  const shiftIds = shifts.map(s => s.id)
  const label = (id: string) => shifts.find(s => s.id === id)?.label || id
  const fields: Field[] = [
    { key: 'name', label: 'Name' }, { key: 'phone', label: 'Telefon' },
    { key: 'shifts', label: 'Schichten', type: 'multi', options: shiftIds, full: true },
    { key: 'role', label: 'Rolle', type: 'select', options: ['Crew', 'Lead', 'Head-Kellner', 'Weinrunde', 'Springer'] },
    { key: 'zone', label: 'Zone / Position', placeholder: 'z. B. Tische 1–3, Anrichte, Bar' },
    { key: 'confirmed', label: 'Hat Teilnahme bestätigt', type: 'check' },
    { key: 'notes', label: 'Notizen', type: 'textarea' },
  ]
  const shiftFields: Field[] = [{ key: 'label', label: 'Name' }, { key: 'whatsapp', label: 'WhatsApp-Gruppe' }, { key: 'start_time', label: 'Beginn' }, { key: 'end_time', label: 'Ende' }, { key: 'lead', label: 'Lead', list: crew.map(c => c.name) }]
  const toggle = async (c: CrewMember) => { if (!requireEdit()) return; try { await write('crew', 'update', { confirmed: !c.confirmed }, c.id); flash(c.confirmed ? 'Bestätigung entfernt' : `${c.name} bestätigt`) } catch (x) { setError(x instanceof Error ? x.message : String(x)) } }
  const doubles = crew.filter(c => c.shifts.length > 1)

  return <>
    <PageHead eyebrow="Personal" title="Crew" sub={`${crew.length} Personen · ${crew.filter(c => c.confirmed).length} bestätigt · ${doubles.length} mit Doppelschicht`}>
      <button className="primary" onClick={() => requireEdit() && setEdit('new')}>+ Person</button>
    </PageHead>
    {doubles.length > 0 && <div className="hint">⚠ Doppelschicht ohne Pause: {doubles.map(d => d.name.split(' ')[0]).join(', ')} – Essen und Kurzpause um 21:05 einplanen.</div>}
    <div className="shift-board">
      {shifts.map(s => { const people = crew.filter(c => c.shifts.includes(s.id)); return <section key={s.id} className="shift-col">
        <header>
          <div><h3>{s.label}</h3><span>{s.start_time}–{s.end_time} · {people.length} Pers.</span></div>
          <button className="icon-btn" title="Schicht bearbeiten" onClick={() => requireEdit() && setEditShift(s)}>✎</button>
        </header>
        <div className="shift-meta"><span>{s.whatsapp || 'WhatsApp-Gruppe —'}</span><span className={s.lead ? '' : 'overdue'}>Lead: {s.lead || 'offen'}</span></div>
        {people.map(c => <div key={c.id} className={`crew-card${c.confirmed ? ' ok' : ''}`} onClick={() => requireEdit() && setEdit(c)}>
          <button className="conf" title="Bestätigt?" onClick={e => { e.stopPropagation(); void toggle(c) }}>{c.confirmed ? '✓' : ''}</button>
          <div><b>{c.name}</b><small>{[c.role !== 'Crew' ? c.role : '', c.zone, c.shifts.length > 1 ? `+ ${c.shifts.filter(x => x !== s.id).map(label).join(', ')}` : ''].filter(Boolean).join(' · ') || '—'}</small></div>
        </div>)}
        <button className="secondary full" onClick={() => setMsg(s)}>Infonachricht</button>
      </section> })}
    </div>
    {edit && <RecordModal title={edit === 'new' ? 'Neue Person' : 'Crew'} table="crew" fields={fields} record={edit === 'new' ? undefined : edit} defaults={{ role: 'Crew', shifts: [], confirmed: false }} close={() => setEdit(null)} onDelete />}
    {editShift && <RecordModal title={`Schicht ${editShift.label}`} table="shifts" fields={shiftFields} record={editShift} close={() => setEditShift(null)} />}
    {msg && <ShiftMessage s={msg} close={() => setMsg(null)} />}
  </>
}

function ShiftMessage({ s, close }: { s: Shift; close: () => void }) {
  const { flash, crew } = useData()
  const [m, setM] = useState('[Nummer]'), [l, setL] = useState('[Nummer]')
  const tear = s.id === 'teardown'
  const text = `SPONSOR DINNER — Samstag, 26. September 2026\nWHU Neue Mensa, Burgplatz 2, 56179 Vallendar\n\nHi zusammen, das hier ist die Gruppe für die Schicht ${s.label}.\nEure Schicht: ${s.start_time}–${s.end_time}\nTreffpunkt: Neue Mensa, bitte 10 Minuten vorher da sein. Dresscode folgt.\nIn den nächsten Tagen kommen hier alle weiteren Infos und das finale Briefing. Haltet die Gruppe im Blick.\nDie Teilnahme an eurer Schicht ist verbindlich. Attendance ist die Grundlage für unser Miteinander und für alles, was an der Uni funktioniert. Falls ihr verhindert seid, meldet euch bitte sofort — nicht am Samstag.${tear ? '\nIhr seid alle schon ab 19:15 im Einsatz — das sind mit dem Tear-down knapp vier Stunden. Wir sorgen für Essen und eine kurze Pause zwischendurch.' : ''}\nBei Fragen: Marlon ${m}, Luis ${l}\n—\nSPONSOR DINNER — Saturday, 26 September 2026\nWHU Neue Mensa, Burgplatz 2, 56179 Vallendar\n\nHi everyone, this is the group for the ${SHIFT_EN[s.id] || s.label} shift.\nYour shift: ${s.start_time}–${s.end_time}\nMeeting point: Neue Mensa, please arrive 10 minutes early. Dress code to follow.\nAll further information and the final briefing will follow here over the next few days. Keep an eye on this group.\nAttending your shift is binding. Attendance is the foundation of how we work together – at this event and at WHU. If you cannot make it, let us know immediately — not on Saturday.${tear ? "\nYou are all on duty from 19:15 already — including tear-down that's almost four hours. We'll make sure there's food and a short break in between." : ''}\nQuestions: Marlon ${m}, Luis ${l}`
  const copy = async () => { try { await navigator.clipboard.writeText(text); flash('Kopiert') } catch { flash('Bitte manuell markieren') } }
  return <Modal close={close}>
    <p className="eyebrow">{s.whatsapp || 'WhatsApp'}</p><h2>Infonachricht {s.label}</h2>
    <div className="form-grid"><label>Nummer Marlon<input value={m} onChange={e => setM(e.target.value)} /></label><label>Nummer Luis<input value={l} onChange={e => setL(e.target.value)} /></label></div>
    <textarea className="msg-box" readOnly rows={18} value={text} onFocus={e => e.currentTarget.select()} />
    <p className="muted">{crew.filter(c => c.shifts.includes(s.id)).map(c => c.name).join(', ')}</p>
    <div className="modal-actions"><span style={{ flex: 1 }} /><button className="primary" onClick={copy}>Kopieren</button></div>
  </Modal>
}
