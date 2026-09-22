import { useState } from 'react'
import { useData } from '../lib/data'
import { MAT_CATS, MAT_STATUS, OWNERS, type Material } from '../lib/types'
import { InlineSelect, PageHead, RecordModal, type Field } from '../ui'
import { downloadCSV } from '../lib/csv'

const fields: Field[] = [
  { key: 'item', label: 'Position', full: true },
  { key: 'category', label: 'Kategorie', type: 'select', options: MAT_CATS },
  { key: 'quantity', label: 'Menge' },
  { key: 'source', label: 'Woher / wer stellt' },
  { key: 'needed_when', label: 'Wann in der Mensa', list: ['Do', 'Fr', 'Sa', 'Sa 17:30'] },
  { key: 'location', label: 'Lagerort' },
  { key: 'owner', label: 'Verantwortlich (wir)', type: 'select', options: ['', ...OWNERS] },
  { key: 'status', label: 'Status', type: 'select', options: MAT_STATUS },
  { key: 'notes', label: 'Notizen', type: 'textarea' },
]
const ORDER = ['offen', 'angefragt', 'bestellt', 'geklärt', 'vor Ort', 'zurückgegeben', 'entfällt']

export default function Materials() {
  const { materials, write, requireEdit, setError, flash } = useData()
  const [q, setQ] = useState(''), [cat, setCat] = useState('alle'), [st, setSt] = useState('alle')
  const [edit, setEdit] = useState<Material | 'new' | null>(null)
  const list = materials.filter(m => (cat === 'alle' || m.category === cat) && (st === 'alle' || m.status === st) && (!q || `${m.item} ${m.source} ${m.notes}`.toLowerCase().includes(q.toLowerCase())))
  const quick = async (m: Material, patch: Partial<Material>) => { if (!requireEdit()) return; try { await write('materials', 'update', patch, m.id); flash('Aktualisiert') } catch (x) { setError(x instanceof Error ? x.message : String(x)) } }
  const count = (s: string) => materials.filter(m => m.status === s).length

  return <>
    <PageHead eyebrow="Checkliste" title="Material" sub="Was wir brauchen, woher es kommt, wann es in der Mensa sein muss – und ob es schon da ist.">
      <button className="secondary" onClick={() => downloadCSV('sponsor-dinner-material.csv', list, ['category', 'item', 'quantity', 'source', 'needed_when', 'location', 'owner', 'status', 'notes'])}>CSV</button>
      <button className="primary" onClick={() => requireEdit() && setEdit('new')}>+ Position</button>
    </PageHead>
    <div className="status-strip">
      {ORDER.map(s => <button key={s} className={st === s ? 'active' : ''} onClick={() => setSt(st === s ? 'alle' : s)}><strong>{count(s)}</strong><span>{s}</span></button>)}
    </div>
    <div className="filters filters-3">
      <input placeholder="Suchen…" value={q} onChange={e => setQ(e.target.value)} />
      <select value={cat} onChange={e => setCat(e.target.value)}><option value="alle">Alle Kategorien</option>{MAT_CATS.map(a => <option key={a}>{a}</option>)}</select>
      <select value={st} onChange={e => setSt(e.target.value)}><option value="alle">Jeder Status</option>{MAT_STATUS.map(a => <option key={a}>{a}</option>)}</select>
    </div>
    <div className="table-shell"><table>
      <thead><tr><th>Kategorie</th><th style={{ width: '32%' }}>Position</th><th>Menge</th><th>Woher</th><th>Wann</th><th>Wir</th><th>Status</th></tr></thead>
      <tbody>{list.map(m => <tr key={m.id} onClick={() => requireEdit() && setEdit(m)} className={['vor Ort', 'zurückgegeben', 'entfällt'].includes(m.status) ? 'row-done' : ''}>
        <td><span className="cat-dot">{m.category}</span></td>
        <td><strong>{m.item}</strong>{m.notes && <small>{m.notes}</small>}{m.location && <small>📍 {m.location}</small>}</td>
        <td>{m.quantity}</td>
        <td className={m.source === 'ungeklärt' ? 'overdue' : ''}>{m.source || '—'}</td>
        <td>{m.needed_when}</td>
        <td onClick={e => e.stopPropagation()}><InlineSelect value={m.owner} options={['', ...OWNERS]} onChange={v => quick(m, { owner: v })} /></td>
        <td onClick={e => e.stopPropagation()}><InlineSelect value={m.status} options={MAT_STATUS} onChange={v => quick(m, { status: v })} /></td>
      </tr>)}</tbody>
    </table></div>
    {edit && <RecordModal title={edit === 'new' ? 'Neue Position' : 'Position'} table="materials" fields={fields} record={edit === 'new' ? undefined : edit} defaults={{ category: 'Sonstiges', status: 'offen', sort: materials.length }} close={() => setEdit(null)} onDelete />}
  </>
}
