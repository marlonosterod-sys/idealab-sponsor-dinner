import { useState } from 'react'
import { useData } from '../lib/data'
import type { ScheduleItem } from '../lib/types'
import { Badge, fmtDay, PageHead, RecordModal, todayISO, type Field } from '../ui'
import { downloadCSV } from '../lib/csv'

const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return (h || 0) * 60 + (m || 0) }
const DAY0 = toMin('17:00'), DAY1 = toMin('23:30')
const PHASES = ['Vorbereitung', 'Set-up', 'Küche', 'Übergabe', 'Empfang', 'Programm', 'Service', 'Crew', 'Transfer', 'Abbau', 'Ende']
const PHASE_COLOR: Record<string, string> = { Vorbereitung: '#8a8175', 'Set-up': '#5a6a7c', Küche: '#c0703a', Übergabe: '#9e68fa', Empfang: '#35ab32', Programm: '#1e1e1e', Service: '#7442c9', Crew: '#c0703a', Transfer: '#b23a3f', Abbau: '#5f6a5b', Ende: '#777' }
const SHIFT_COLOR: Record<string, string> = { setup: '#5a6a7c', service: '#7442c9', bar: '#35ab32', kueche: '#c0703a', teardown: '#5f6a5b' }

const fields: Field[] = [
  { key: 'start_time', label: 'Von', placeholder: '19:15' }, { key: 'end_time', label: 'Bis', placeholder: 'optional' },
  { key: 'phase', label: 'Phase', type: 'select', options: ['', ...PHASES] }, { key: 'who', label: 'Wer' },
  { key: 'title', label: 'Was passiert', full: true }, { key: 'notes', label: 'Notizen', type: 'textarea' },
  { key: 'flagged', label: 'Kritisch / ungeklärt markieren', type: 'check' },
  { key: 'kind', label: 'Art', type: 'select', options: ['abend', 'woche', 'deadline'] }, { key: 'day', label: 'Tag', type: 'date' },
]

type Tab = 'abend' | 'woche'
export default function Timeline() {
  const { schedule, shifts, tasks, crew, requireEdit } = useData()
  const [tab, setTab] = useState<Tab>('abend')
  const [edit, setEdit] = useState<ScheduleItem | 'new' | null>(null)
  const evening = schedule.filter(s => s.kind === 'abend').sort((a, b) => toMin(a.start_time) - toMin(b.start_time))
  const pos = (t: string) => `${(toMin(t) - DAY0) / (DAY1 - DAY0) * 100}%`
  const hours = Array.from({ length: 7 }, (_, i) => 17 + i)
  const now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes(), isEventDay = todayISO() === '2026-09-26'

  return <>
    <PageHead eyebrow="Zeitplan" title="Ablauf" sub="Minutenplan für Samstag und der Kalender der Woche bis zum Event.">
      <button className="secondary" onClick={() => downloadCSV('sponsor-dinner-ablauf.csv', schedule, ['kind', 'day', 'start_time', 'end_time', 'phase', 'title', 'who', 'notes'])}>CSV</button>
      <button className="secondary" onClick={() => window.print()}>Drucken</button>
      <button className="primary" onClick={() => requireEdit() && setEdit('new')}>+ Eintrag</button>
    </PageHead>
    <div className="segmented">
      <button className={tab === 'abend' ? 'active' : ''} onClick={() => setTab('abend')}>Samstagabend</button>
      <button className={tab === 'woche' ? 'active' : ''} onClick={() => setTab('woche')}>Woche Di–So</button>
    </div>

    {tab === 'abend' && <>
      <div className="panel gantt">
        <div className="gantt-axis">{hours.map(h => <span key={h} style={{ left: pos(`${h}:00`) }}>{h}:00</span>)}</div>
        {shifts.map(s => { const n = crew.filter(c => c.shifts.includes(s.id)).length; return <div className="gantt-row" key={s.id}>
          <b>{s.label}<small>{n} Pers.</small></b>
          <div className="gantt-track">{hours.map(h => <i key={h} className="gl" style={{ left: pos(`${h}:00`) }} />)}
            <div className="gantt-bar" style={{ left: pos(s.start_time), width: `calc(${pos(s.end_time)} - ${pos(s.start_time)})`, background: SHIFT_COLOR[s.id] || '#555' }}>{s.start_time}–{s.end_time}</div>
            {isEventDay && nowMin > DAY0 && nowMin < DAY1 && <i className="now-line" style={{ left: `${(nowMin - DAY0) / (DAY1 - DAY0) * 100}%` }} />}
          </div>
        </div> })}
        <div className="gantt-row"><b>Gäste</b><div className="gantt-track">{hours.map(h => <i key={h} className="gl" style={{ left: pos(`${h}:00`) }} />)}<div className="gantt-bar guest" style={{ left: pos('19:15'), width: `calc(${pos('21:30')} - ${pos('19:15')})` }}>Einlass 19:15 · Ende ~21:30</div></div></div>
      </div>

      <div className="run-sheet">
        {evening.map(e => <button key={e.id} className={`run-row${e.flagged ? ' flagged' : ''}`} onClick={() => requireEdit() && setEdit(e)}>
          <time>{e.start_time}{e.end_time && <small>–{e.end_time}</small>}</time>
          <span className="phase" style={{ background: PHASE_COLOR[e.phase] || '#999' }}>{e.phase || '—'}</span>
          <span className="what"><b>{e.title}</b>{e.notes && <small>{e.notes}</small>}</span>
          <span className="who">{e.who}</span>
          {e.flagged && <Badge value="hoch" />}
        </button>)}
      </div>
    </>}

    {tab === 'woche' && <div className="week-cal">
      {['2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27'].map(day => {
        const items = schedule.filter(s => s.day === day && s.kind !== 'abend')
        const due = tasks.filter(t => t.due === day && !['erledigt', 'entfällt'].includes(t.status))
        return <div key={day} className={`week-col${day === todayISO() ? ' today' : ''}`}>
          <h3>{fmtDay(day)}</h3>
          {items.filter(i => i.kind === 'woche').map(i => <button key={i.id} className="wk-focus" onClick={() => requireEdit() && setEdit(i)}>{i.title}</button>)}
          {items.filter(i => i.kind === 'deadline').map(i => <button key={i.id} className="wk-deadline" onClick={() => requireEdit() && setEdit(i)}><b>{i.start_time} Freeze</b>{i.title}</button>)}
          {due.length > 0 && <p className="eyebrow" style={{ marginTop: 14 }}>Fällig ({due.length})</p>}
          {due.map(t => <div key={t.id} className={`wk-task p-${t.priority}`}>{t.title}<small>{t.contact}</small></div>)}
        </div>
      })}
    </div>}

    {edit && <RecordModal title={edit === 'new' ? 'Neuer Eintrag' : 'Eintrag'} table="schedule" fields={fields} record={edit === 'new' ? undefined : edit} defaults={{ kind: tab, day: '2026-09-26', flagged: false }} close={() => setEdit(null)} onDelete />}
  </>
}
