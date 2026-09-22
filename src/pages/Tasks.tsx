import { useMemo, useState } from 'react'
import { useData } from '../lib/data'
import { AREAS, OWNERS, PRIORITY, TASK_STATUS, type Task } from '../lib/types'
import { Badge, fmtDay, InlineSelect, isOverdue, PageHead, RecordModal, type Field } from '../ui'
import { downloadCSV } from '../lib/csv'

export const taskFields = (contacts: string[]): Field[] => [
  { key: 'title', label: 'Aufgabe / Frage', full: true },
  { key: 'area', label: 'Bereich', type: 'select', options: AREAS },
  { key: 'priority', label: 'Priorität', type: 'select', options: PRIORITY },
  { key: 'status', label: 'Status', type: 'select', options: TASK_STATUS },
  { key: 'due', label: 'Fällig', type: 'date' },
  { key: 'owner', label: 'Verantwortlich (wir)', type: 'select', options: ['', ...OWNERS] },
  { key: 'contact', label: 'Ansprechpartner', list: contacts },
  { key: 'answer', label: 'Antwort / Ergebnis', type: 'textarea' },
  { key: 'notes', label: 'Notizen', type: 'textarea' },
]

type View = 'offen' | 'alle' | 'erledigt'

export default function Tasks() {
  const { tasks, contacts, write, requireEdit, setError, flash } = useData()
  const [q, setQ] = useState(''), [area, setArea] = useState('alle'), [view, setView] = useState<View>('offen'), [contact, setContact] = useState('alle'), [owner, setOwner] = useState('alle'), [prio, setPrio] = useState('alle')
  const [edit, setEdit] = useState<Task | 'new' | null>(null)
  const contactNames = useMemo(() => Array.from(new Set([...contacts.map(c => c.name), ...tasks.map(t => t.contact).filter(Boolean)])).sort(), [contacts, tasks])

  const list = tasks.filter(t => {
    const isDone = t.status === 'erledigt' || t.status === 'entfällt'
    if (view === 'offen' && isDone) return false
    if (view === 'erledigt' && !isDone) return false
    if (area !== 'alle' && t.area !== area) return false
    if (contact !== 'alle' && t.contact !== contact) return false
    if (owner !== 'alle' && (owner === '—' ? t.owner : t.owner !== owner)) return false
    if (prio !== 'alle' && t.priority !== prio) return false
    if (q && !`${t.title} ${t.answer} ${t.notes} ${t.contact}`.toLowerCase().includes(q.toLowerCase())) return false
    return true
  })
  const groups = AREAS.map(a => ({ a, rows: list.filter(t => t.area === a) })).filter(g => g.rows.length)
  const extra = list.filter(t => !(AREAS as readonly string[]).includes(t.area))
  if (extra.length) groups.push({ a: 'Sonstiges' as any, rows: extra })

  const quick = async (t: Task, patch: Partial<Task>) => {
    if (!requireEdit()) return
    try { await write('tasks', 'update', patch, t.id); flash('Aktualisiert') } catch (x) { setError(x instanceof Error ? x.message : String(x)) }
  }
  const counts = { offen: tasks.filter(t => !['erledigt', 'entfällt'].includes(t.status)).length, alle: tasks.length, erledigt: tasks.filter(t => ['erledigt', 'entfällt'].includes(t.status)).length }

  return <>
    <PageHead eyebrow="Checkliste" title="Aufgaben & Fragen" sub="Alles, was bis Samstag geklärt oder erledigt sein muss. Status direkt in der Zeile ändern.">
      <button className="secondary" onClick={() => downloadCSV('sponsor-dinner-aufgaben.csv', list, ['area', 'title', 'priority', 'status', 'due', 'owner', 'contact', 'answer', 'notes'])}>CSV</button>
      <button className="primary" onClick={() => requireEdit() && setEdit('new')}>+ Aufgabe</button>
    </PageHead>
    <div className="segmented">
      {(['offen', 'alle', 'erledigt'] as View[]).map(v => <button key={v} className={view === v ? 'active' : ''} onClick={() => setView(v)}>{v === 'offen' ? 'Offen' : v === 'alle' ? 'Alle' : 'Erledigt'}<b>{counts[v]}</b></button>)}
    </div>
    <div className="filters">
      <input placeholder="Suchen…" value={q} onChange={e => setQ(e.target.value)} />
      <select value={area} onChange={e => setArea(e.target.value)}><option value="alle">Alle Bereiche</option>{AREAS.map(a => <option key={a}>{a}</option>)}</select>
      <select value={contact} onChange={e => setContact(e.target.value)}><option value="alle">Alle Ansprechpartner</option>{contactNames.map(a => <option key={a}>{a}</option>)}</select>
      <select value={owner} onChange={e => setOwner(e.target.value)}><option value="alle">Alle Verantwortlichen</option><option value="—">ohne Verantwortlichen</option>{OWNERS.map(a => <option key={a}>{a}</option>)}</select>
      <select value={prio} onChange={e => setPrio(e.target.value)}><option value="alle">Jede Priorität</option>{PRIORITY.map(a => <option key={a}>{a}</option>)}</select>
    </div>
    {groups.map(g => <section key={g.a} className="group">
      <h3 className="group-title">{g.a}<span>{g.rows.length}</span></h3>
      <div className="table-shell"><table>
        <thead><tr><th style={{ width: '42%' }}>Aufgabe</th><th>Prio</th><th>Fällig</th><th>Ansprechpartner</th><th>Wir</th><th>Status</th></tr></thead>
        <tbody>{g.rows.map(t => <tr key={t.id} onClick={() => requireEdit() && setEdit(t)} className={t.status === 'erledigt' || t.status === 'entfällt' ? 'row-done' : ''}>
          <td><strong>{t.title}</strong>{t.answer && <small className="answer">→ {t.answer}</small>}{t.notes && <small>{t.notes}</small>}</td>
          <td><Badge value={t.priority} /></td>
          <td className={isOverdue(t.due, t.status) ? 'overdue' : ''}>{fmtDay(t.due)}</td>
          <td>{t.contact || '—'}</td>
          <td onClick={e => e.stopPropagation()}><InlineSelect value={t.owner} options={['', ...OWNERS]} onChange={v => quick(t, { owner: v })} /></td>
          <td onClick={e => e.stopPropagation()}><InlineSelect value={t.status} options={TASK_STATUS} onChange={v => quick(t, { status: v })} /></td>
        </tr>)}</tbody>
      </table></div>
    </section>)}
    {!groups.length && <div className="panel muted">Nichts gefunden.</div>}
    {edit && <RecordModal title={edit === 'new' ? 'Neue Aufgabe' : 'Aufgabe'} table="tasks" fields={taskFields(contactNames)} record={edit === 'new' ? undefined : edit} defaults={{ area: 'Rahmen', priority: 'mittel', status: 'offen', sort: tasks.length }} close={() => setEdit(null)} onDelete />}
  </>
}
