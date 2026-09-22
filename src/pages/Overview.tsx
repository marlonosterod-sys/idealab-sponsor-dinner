import { useData } from '../lib/data'
import { AREAS, EVENT } from '../lib/types'
import { Badge, fmtDay, isOverdue, todayISO } from '../ui'
import type { Page } from '../App'

const done = (s: string) => s === 'erledigt' || s === 'entfällt'

export default function Overview({ nav }: { nav: (p: Page) => void }) {
  const { tasks, materials, crew, shifts, schedule, variants, activity } = useData()
  const open = tasks.filter(t => !done(t.status))
  const hot = open.filter(t => t.priority === 'hoch').sort((a, b) => (a.due || '9').localeCompare(b.due || '9'))
  const overdue = open.filter(t => isOverdue(t.due, t.status))
  const matOpen = materials.filter(m => ['offen', 'angefragt'].includes(m.status))
  const confirmed = crew.filter(c => c.confirmed).length
  const today = todayISO()
  const deadlines = schedule.filter(s => s.kind === 'deadline').sort((a, b) => (a.day + a.start_time).localeCompare(b.day + b.start_time))
  const week = schedule.filter(s => s.kind === 'woche').sort((a, b) => a.day.localeCompare(b.day))
  const pct = tasks.length ? Math.round(tasks.filter(t => done(t.status)).length / tasks.length * 100) : 0
  const finalVariant = variants.find(v => v.is_final)

  return <>
    <section className="hero">
      <div>
        <p className="eyebrow">{EVENT.sub} · Samstag, 26.09.2026 · 19:00</p>
        <h1>Sponsor<br />Dinner.</h1>
        <p className="lead">{EVENT.place} · {EVENT.guests} Gedecke, davon {EVENT.veg} vegetarisch · 3 Gänge, Tellerservice · 19 Crew in 5 Schichten. <b>Kein Fuck-up schlägt brillant.</b></p>
      </div>
      <button className="incoming-hero" onClick={() => nav('Aufgaben')}>
        <span>Fortschritt Aufgaben</span>
        <strong>{pct}%</strong>
        <em>{open.length} offen · {hot.length} mit hoher Priorität{overdue.length ? ` · ${overdue.length} überfällig` : ''}</em>
        <b>Zur Aufgabenliste →</b>
      </button>
    </section>

    <div className="kpi-grid">
      <button className="kpi" onClick={() => nav('Aufgaben')}><span>Offene Aufgaben</span><strong>{open.length}</strong></button>
      <button className="kpi" onClick={() => nav('Aufgaben')}><span>Überfällig</span><strong className={overdue.length ? 'warn' : ''}>{overdue.length}</strong></button>
      <button className="kpi" onClick={() => nav('Material')}><span>Material ungeklärt</span><strong>{matOpen.length}</strong></button>
      <button className="kpi" onClick={() => nav('Crew')}><span>Crew bestätigt</span><strong>{confirmed}/{crew.length}</strong></button>
      <button className={`kpi${finalVariant ? ' green' : ''}`} onClick={() => nav('Raumplan')}><span>Raumplan</span><strong style={{ fontSize: finalVariant ? 22 : 42 }}>{finalVariant ? finalVariant.name : variants.length ? `${variants.length} Var.` : '—'}</strong></button>
    </div>

    <div className="dashboard-grid section-gap">
      <div className="panel span-2">
        <div className="section-head"><h2>Hohe Priorität</h2><button className="text-btn" onClick={() => nav('Aufgaben')}>Alle →</button></div>
        <div className="attention-list">
          {hot.slice(0, 9).map(t => <div key={t.id} className="att-row">
            <div><b>{t.title}</b><span>{t.area} · bei {t.contact || '—'}</span></div>
            <div className="att-meta"><span className={isOverdue(t.due, t.status) ? 'overdue' : ''}>{fmtDay(t.due)}</span><Badge value={t.status} /></div>
          </div>)}
          {!hot.length && <p className="muted">Keine offenen Punkte mit hoher Priorität.</p>}
        </div>
      </div>
      <div className="panel dark-panel">
        <p className="eyebrow light">Freeze-Termine</p>
        <div className="deadline-list">
          {deadlines.map(x => <div key={x.id} className={x.day < today ? 'past' : x.day === today ? 'now' : ''}><b>{fmtDay(x.day)} {x.start_time}</b><span>{x.title}</span></div>)}
        </div>
      </div>
    </div>

    <div className="dashboard-grid section-gap">
      <div className="panel">
        <h2>Stand je Bereich</h2>
        <div className="analytics-bars">
          {AREAS.map(a => { const all = tasks.filter(t => t.area === a); if (!all.length) return null; const d = all.filter(t => done(t.status)).length; return <div key={a}><span>{a}</span><div><i style={{ width: `${d / all.length * 100}%` }} /></div><span>{d}/{all.length}</span></div> })}
        </div>
      </div>
      <div className="panel">
        <h2>Die Woche</h2>
        <div className="week-list">
          {week.map(w => <div key={w.id} className={w.day === today ? 'now' : w.day < today ? 'past' : ''}><b>{fmtDay(w.day)}</b><span>{w.title}</span></div>)}
        </div>
      </div>
      <div className="panel">
        <div className="section-head"><h2>Schichten</h2><button className="text-btn" onClick={() => nav('Crew')}>Crew →</button></div>
        <div className="week-list">
          {shifts.map(s => { const n = crew.filter(c => c.shifts.includes(s.id)); return <div key={s.id}><b>{s.start_time}–{s.end_time}</b><span>{s.label} · {n.length} Pers.{s.lead ? ` · Lead: ${s.lead}` : ' · Lead offen'}</span></div> })}
        </div>
      </div>
    </div>

    <div className="panel section-gap">
      <div className="section-head"><h2>Zuletzt geändert</h2><button className="text-btn" onClick={() => nav('Protokoll')}>Protokoll →</button></div>
      <div className="attention-list">
        {activity.slice(0, 6).map(a => <div key={a.id} className="att-row"><div><b>{a.summary}</b><span>{a.entity_type} · {a.actor || 'Team'}</span></div><span className="muted">{new Date(a.created_at).toLocaleString('de-DE', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</span></div>)}
        {!activity.length && <p className="muted">Noch keine Änderungen.</p>}
      </div>
    </div>
  </>
}
