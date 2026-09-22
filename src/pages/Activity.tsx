import { useData } from '../lib/data'
import { PageHead } from '../ui'

const LABEL: Record<string, string> = { tasks: 'Aufgabe', materials: 'Material', contacts: 'Kontakt', schedule: 'Ablauf', crew: 'Crew', shifts: 'Schicht', floor_variants: 'Raumplan' }

export default function ActivityPage() {
  const { activity } = useData()
  return <>
    <PageHead eyebrow="Nachvollziehbar" title="Protokoll" sub="Wer hat wann was geändert – die letzten 150 Änderungen." />
    <div className="activity-list">
      {activity.map(a => <article key={a.id}>
        <time>{new Date(a.created_at).toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</time>
        <div><b>{a.summary}</b><span>{LABEL[a.entity_type] || a.entity_type} · {a.action}</span></div>
        <em>{a.actor || 'Team'}</em>
      </article>)}
      {!activity.length && <article><div className="muted">Noch keine Änderungen.</div></article>}
    </div>
  </>
}
