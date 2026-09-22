import { useEffect, useState, type FormEvent } from 'react'
import { DataProvider, useData } from './lib/data'
import { Modal } from './ui'
import Overview from './pages/Overview'
import Tasks from './pages/Tasks'
import Materials from './pages/Materials'
import Contacts from './pages/Contacts'
import Timeline from './pages/Timeline'
import Crew from './pages/Crew'
import ActivityPage from './pages/Activity'
import Planner from './planner/Planner'
import { EVENT } from './lib/types'

export type Page = 'Übersicht' | 'Aufgaben' | 'Material' | 'Kontakte' | 'Ablauf' | 'Crew' | 'Raumplan' | 'Protokoll'
const PAGES: Page[] = ['Übersicht', 'Aufgaben', 'Material', 'Kontakte', 'Ablauf', 'Crew', 'Raumplan', 'Protokoll']

function Countdown() {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t) }, [])
  const ms = new Date(EVENT.start).getTime() - now
  if (ms <= 0) return <span>Heute Abend</span>
  const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24
  return <span>noch {d} T {h} h</span>
}

function Unlock() {
  const { setAskUnlock, setEditMode, actor, setActor, flash } = useData()
  const [pw, setPw] = useState(''), [name, setName] = useState(actor || ''), [err, setErr] = useState(''), [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('')
    try {
      const r = await fetch('/api/edit-session', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) })
      const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Passwort falsch.')
      setActor(name.trim()); setEditMode(true); setAskUnlock(false); flash('Bearbeitungsmodus aktiv')
    } catch (x) { setErr(x instanceof Error ? x.message : String(x)) } finally { setBusy(false) }
  }
  return <Modal close={() => setAskUnlock(false)}>
    <p className="eyebrow">Bearbeiten</p><h2>Team-Login</h2>
    <p>Lesen kann jeder mit dem Link. Zum Bearbeiten Team-Passwort eingeben.</p>
    <form onSubmit={submit}>
      <label>Dein Name<input value={name} onChange={e => setName(e.target.value)} placeholder="z. B. Marlon" required /></label>
      <label>Passwort<input type="password" value={pw} onChange={e => setPw(e.target.value)} autoFocus required /></label>
      {err && <p className="form-error">{err}</p>}
      <button className="primary full" disabled={busy}>{busy ? 'Prüfe…' : 'Freischalten'}</button>
    </form>
  </Modal>
}

function Shell() {
  const d = useData()
  const [page, setPage] = useState<Page>(() => { const h = decodeURIComponent(location.hash.slice(1)) as Page; return PAGES.includes(h) ? h : 'Übersicht' })
  const [menu, setMenu] = useState(false)
  const nav = (p: Page) => { setPage(p); setMenu(false); history.replaceState(null, '', '#' + encodeURIComponent(p)); window.scrollTo({ top: 0 }) }
  const openTasks = d.tasks.filter(t => !['erledigt', 'entfällt'].includes(t.status)).length
  const openMat = d.materials.filter(m => ['offen', 'angefragt'].includes(m.status)).length
  const lock = async () => { await fetch('/api/edit-session', { method: 'DELETE', credentials: 'include' }); d.setEditMode(false); d.flash('Bearbeitungsmodus beendet') }
  const badge: Partial<Record<Page, number>> = { Aufgaben: openTasks, Material: openMat }
  const wide = page === 'Raumplan'
  return <div className={`app-shell${menu ? ' menu-open' : ''}`}>
    <aside className="sidebar">
      <button className="logo" onClick={() => nav('Übersicht')}><strong>IdeaLab!</strong><span>Sponsor Dinner</span></button>
      <nav>{PAGES.map(p => <button key={p} className={page === p ? 'active' : ''} onClick={() => nav(p)}>{p}{badge[p] ? <em>{badge[p]}</em> : null}</button>)}</nav>
      <div className="sidebar-foot"><b style={{ color: '#fff' }}>Sa 26.09. · 19:00</b><small>Neue Mensa, Vallendar</small><small className="cd"><Countdown /></small></div>
    </aside>
    <main>
      <header className="topbar">
        <button className="burger" onClick={() => setMenu(!menu)} aria-label="Menü">☰</button>
        <div className="crumb">Sponsor Dinner<span>/</span><b>{page}</b></div>
        <div className="top-actions">
          <span className="live-dot">● LIVE</span>
          {d.editMode ? <><span className="edit-active">Bearbeiten aktiv{d.actor ? ` · ${d.actor}` : ''}</span><button className="secondary sm" onClick={lock}>Sperren</button></> : <button className="primary sm" onClick={() => d.setAskUnlock(true)}>Bearbeiten</button>}
        </div>
      </header>
      {d.demo && <div className="demo-banner">Demo-Modus: Supabase ist noch nicht verbunden – Änderungen bleiben nur in diesem Tab.</div>}
      <div className={wide ? 'content content-wide' : 'content'}>
        {d.loading ? <div className="loading">Lädt…</div> : <>
          {page === 'Übersicht' && <Overview nav={nav} />}
          {page === 'Aufgaben' && <Tasks />}
          {page === 'Material' && <Materials />}
          {page === 'Kontakte' && <Contacts nav={nav} />}
          {page === 'Ablauf' && <Timeline />}
          {page === 'Crew' && <Crew />}
          {page === 'Raumplan' && <Planner />}
          {page === 'Protokoll' && <ActivityPage />}
        </>}
      </div>
    </main>
    {d.notice && <div className="notice">{d.notice}</div>}
    {d.error && <div className="error-banner">{d.error}<button onClick={() => d.setError('')}>×</button></div>}
    {d.askUnlock && <Unlock />}
  </div>
}

export default function App() { return <DataProvider><Shell /></DataProvider> }
