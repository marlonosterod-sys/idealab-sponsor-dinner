import { useState, type FormEvent, type ReactNode } from 'react'
import { useData } from './lib/data'
import type { TableName } from './lib/types'

export const DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
export const fmtDay = (d?: string | null) => {
  if (!d) return '—'
  const x = new Date(d + 'T12:00:00')
  return `${DAYS[x.getDay()]} ${String(x.getDate()).padStart(2, '0')}.${String(x.getMonth() + 1).padStart(2, '0')}.`
}
export const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
export const isOverdue = (due: string | null, status: string) => !!due && due < todayISO() && !['erledigt', 'entfällt', 'vor Ort', 'zurückgegeben', 'geklärt'].includes(status)

const tone: Record<string, string> = {
  offen: '', 'in Arbeit': 'purple', wartet: 'amber', erledigt: 'green', entfällt: 'muted',
  angefragt: 'amber', bestellt: 'purple', geklärt: 'green', 'vor Ort': 'green', zurückgegeben: 'muted',
  hoch: 'red', mittel: '', niedrig: 'muted', Lead: 'dark',
}
export function Badge({ value }: { value: string }) {
  return <span className={`badge badge-${tone[value] ?? ''}`}>{value}</span>
}

export function Modal({ children, close, wide }: { children: ReactNode; close: () => void; wide?: boolean }) {
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) close() }}>
    <div className={`modal${wide ? ' modal-wide' : ''}`}><button className="modal-close" onClick={close} aria-label="Schließen">×</button>{children}</div>
  </div>
}

export type Field = { key: string; label: string; type?: 'text' | 'textarea' | 'select' | 'date' | 'check' | 'multi'; options?: readonly string[]; full?: boolean; placeholder?: string; list?: string[] }

export function RecordModal({ title, table, fields, record, defaults, close, onDelete }: { title: string; table: TableName; fields: Field[]; record?: Record<string, any>; defaults?: Record<string, any>; close: () => void; onDelete?: boolean }) {
  const { write, flash, setError } = useData()
  const [state, setState] = useState<Record<string, any>>(() => ({ ...(defaults || {}), ...(record || {}) }))
  const [busy, setBusy] = useState(false)
  const set = (k: string, v: any) => setState(s => ({ ...s, [k]: v }))
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true)
    try {
      const payload = Object.fromEntries(fields.map(f => [f.key, state[f.key] ?? (f.type === 'check' ? false : f.type === 'multi' ? [] : '')]))
      await write(table, record?.id ? 'update' : 'insert', payload, record?.id)
      flash('Gespeichert'); close()
    } catch (x) { setError(x instanceof Error ? x.message : String(x)) } finally { setBusy(false) }
  }
  const del = async () => {
    if (!record?.id || !window.confirm('Wirklich löschen?')) return
    setBusy(true)
    try { await write(table, 'delete', undefined, record.id); flash('Gelöscht'); close() } catch (x) { setError(x instanceof Error ? x.message : String(x)) } finally { setBusy(false) }
  }
  return <Modal close={close}>
    <p className="eyebrow">{record?.id ? 'Bearbeiten' : 'Neu'}</p>
    <h2>{title}</h2>
    <form onSubmit={submit}>
      <div className="form-grid">
        {fields.map(f => <label key={f.key} className={f.full || f.type === 'textarea' ? 'span-all' : ''}>
          {f.type === 'check' ? <span className="check"><input type="checkbox" checked={!!state[f.key]} onChange={e => set(f.key, e.target.checked)} /> {f.label}</span> : f.label}
          {f.type === 'textarea' && <textarea rows={3} value={state[f.key] ?? ''} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder} />}
          {f.type === 'select' && <select value={state[f.key] ?? ''} onChange={e => set(f.key, e.target.value)}>{f.options!.map(o => <option key={o} value={o}>{o || '—'}</option>)}</select>}
          {f.type === 'date' && <input type="date" value={state[f.key] ?? ''} onChange={e => set(f.key, e.target.value)} />}
          {f.type === 'multi' && <div className="chips-pick">{f.options!.map(o => { const on = (state[f.key] || []).includes(o); return <button type="button" key={o} className={on ? 'on' : ''} onClick={() => set(f.key, on ? state[f.key].filter((x: string) => x !== o) : [...(state[f.key] || []), o])}>{o}</button> })}</div>}
          {(!f.type || f.type === 'text') && <><input value={state[f.key] ?? ''} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder} list={f.list ? `dl-${f.key}` : undefined} />{f.list && <datalist id={`dl-${f.key}`}>{f.list.map(o => <option key={o} value={o} />)}</datalist>}</>}
        </label>)}
      </div>
      <div className="modal-actions">
        {onDelete && record?.id && <button type="button" className="danger-btn" onClick={del} disabled={busy}>Löschen</button>}
        <span style={{ flex: 1 }} />
        <button type="button" className="secondary" onClick={close}>Abbrechen</button>
        <button className="primary" disabled={busy}>{busy ? 'Speichert…' : 'Speichern'}</button>
      </div>
    </form>
  </Modal>
}

export function PageHead({ eyebrow, title, sub, children }: { eyebrow: string; title: string; sub?: string; children?: ReactNode }) {
  return <div className="page-head"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{sub && <p>{sub}</p>}</div><div className="top-actions">{children}</div></div>
}

export function InlineSelect({ value, options, onChange }: { value: string; options: readonly string[]; onChange: (v: string) => void }) {
  return <select className={`inline-select tone-${tone[value] ?? 'none'}`} value={value} onClick={e => e.stopPropagation()} onChange={e => onChange(e.target.value)}>{options.map(o => <option key={o}>{o}</option>)}</select>
}
