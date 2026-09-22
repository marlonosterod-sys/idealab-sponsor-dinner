import { useState } from 'react'
import { useData } from '../lib/data'
import type { Contact } from '../lib/types'
import { Badge, fmtDay, Modal, PageHead, RecordModal, type Field } from '../ui'
import type { Page } from '../App'

const fields: Field[] = [
  { key: 'name', label: 'Name' }, { key: 'role', label: 'Rolle' },
  { key: 'org', label: 'Organisation' }, { key: 'responsible_for', label: 'Zuständig für' },
  { key: 'phone', label: 'Telefon' }, { key: 'email', label: 'E-Mail' },
  { key: 'notes', label: 'Notizen', type: 'textarea' },
]

export default function Contacts({ nav }: { nav: (p: Page) => void }) {
  const { contacts, tasks, requireEdit } = useData()
  const [edit, setEdit] = useState<Contact | 'new' | null>(null)
  const [msgFor, setMsgFor] = useState<Contact | null>(null)
  const openFor = (name: string) => tasks.filter(t => t.contact === name && !['erledigt', 'entfällt'].includes(t.status))
  return <>
    <PageHead eyebrow="Wer ist wer" title="Kontakte" sub="Jede Person mit den Fragen, die bei ihr offen sind. „Nachricht“ baut dir die Fragenliste zum Kopieren.">
      <button className="primary" onClick={() => requireEdit() && setEdit('new')}>+ Kontakt</button>
    </PageHead>
    <div className="card-grid">
      {contacts.map(c => { const open = openFor(c.name); return <article key={c.id} className="incoming-card contact-card">
        <div className="card-top"><div><h3>{c.name}</h3><p className="muted">{c.role}{c.org && c.org !== c.role ? ` · ${c.org}` : ''}</p></div>{open.length > 0 && <span className="badge badge-purple">{open.length} offen</span>}</div>
        <p className="resp">{c.responsible_for}</p>
        <div className="mini-meta">
          {c.phone && <span><b>Tel.</b><a href={`tel:${c.phone.replace(/[^\d+]/g, '')}`}>{c.phone}</a></span>}
          {c.email && <span><b>Mail</b><a href={`mailto:${c.email}`}>{c.email}</a></span>}
        </div>
        {open.slice(0, 4).map(t => <div key={t.id} className="q-line"><span>{t.title}</span>{t.priority === 'hoch' && <Badge value="hoch" />}</div>)}
        {open.length > 4 && <button className="text-btn" onClick={() => nav('Aufgaben')}>+ {open.length - 4} weitere</button>}
        <div className="card-actions">
          <button className="secondary" onClick={() => requireEdit() && setEdit(c)}>Bearbeiten</button>
          <button className="primary" disabled={!open.length} onClick={() => setMsgFor(c)}>Nachricht</button>
        </div>
      </article> })}
    </div>
    {edit && <RecordModal title={edit === 'new' ? 'Neuer Kontakt' : 'Kontakt'} table="contacts" fields={fields} record={edit === 'new' ? undefined : edit} defaults={{ sort: contacts.length }} close={() => setEdit(null)} onDelete />}
    {msgFor && <MessageModal c={msgFor} close={() => setMsgFor(null)} />}
  </>
}

function MessageModal({ c, close }: { c: Contact; close: () => void }) {
  const { tasks, flash } = useData()
  const open = tasks.filter(t => t.contact === c.name && !['erledigt', 'entfällt'].includes(t.status)).sort((a, b) => (a.priority === 'hoch' ? 0 : 1) - (b.priority === 'hoch' ? 0 : 1))
  const [withStand, setWithStand] = useState(true)
  const first = c.name.split(' ')[0].replace(/\(.*/, '').trim()
  const soon = open.filter(t => t.priority === 'hoch').length
  const text = `Hi ${first}, kurz zum Sponsor Dinner am Samstag. Wir brauchen noch ein paar Antworten von dir:\n\n` +
    open.map((t, i) => `${i + 1}. ${t.title}${withStand && (t.answer || t.notes) ? `\n   Stand: ${t.answer || t.notes}` : ''}${t.due ? ` (bis ${fmtDay(t.due)})` : ''}`).join('\n') +
    `\n\n${soon ? `Wenn du die Punkte 1–${soon} zuerst klären kannst, wäre das super. ` : ''}Danke dir!`
  const copy = async () => { try { await navigator.clipboard.writeText(text); flash('In die Zwischenablage kopiert') } catch { flash('Kopieren nicht erlaubt – bitte markieren') } }
  return <Modal close={close}>
    <p className="eyebrow">Nachricht an</p><h2>{c.name}</h2>
    <label className="check" style={{ marginTop: 8 }}><input type="checkbox" checked={withStand} onChange={e => setWithStand(e.target.checked)} /> Unseren Stand mitschicken</label>
    <textarea className="msg-box" readOnly value={text} rows={Math.min(22, open.length * 2 + 6)} onFocus={e => e.currentTarget.select()} />
    <div className="modal-actions"><span style={{ flex: 1 }} />{c.phone && <a className="secondary" href={`https://wa.me/${c.phone.replace(/[^\d]/g, '').replace(/^0/, '49')}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">WhatsApp</a>}<button className="primary" onClick={copy}>Kopieren</button></div>
  </Modal>
}
