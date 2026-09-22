import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { supabase, supabaseConfigured } from './supabase'
import type { Activity, Contact, CrewMember, FloorVariant, Material, ScheduleItem, Shift, TableName, Task } from './types'

export interface Store {
  tasks: Task[]; materials: Material[]; contacts: Contact[]; schedule: ScheduleItem[]; crew: CrewMember[]; shifts: Shift[]; variants: FloorVariant[]; activity: Activity[]
}
const empty: Store = { tasks: [], materials: [], contacts: [], schedule: [], crew: [], shifts: [], variants: [], activity: [] }

interface Ctx extends Store {
  loading: boolean; error: string; setError: (s: string) => void; reload: () => Promise<void>
  demo: boolean; editMode: boolean; setEditMode: (b: boolean) => void; actor: string; setActor: (s: string) => void
  write: (table: TableName, action: 'insert' | 'update' | 'delete' | 'upsert', payload?: Record<string, unknown>, id?: string, quiet?: boolean) => Promise<any>
  flash: (m: string) => void; notice: string
  requireEdit: () => boolean; askUnlock: boolean; setAskUnlock: (b: boolean) => void
}
const C = createContext<Ctx | null>(null)
export const useData = () => { const c = useContext(C); if (!c) throw new Error('no ctx'); return c }

const readLS = (k: string) => { try { return localStorage.getItem(k) || '' } catch { return '' } }
const writeLS = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* egal */ } }

export function DataProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<Store>(empty)
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const [editMode, setEditMode] = useState(false), [askUnlock, setAskUnlock] = useState(false)
  const [actor, setActorState] = useState(readLS('sd_actor'))
  const setActor = (s: string) => { setActorState(s); writeLS('sd_actor', s) }

  const reload = useCallback(async () => {
    if (!supabaseConfigured) {
      if (!demoLoaded.current) {
        const d: any = (await import('./demo.json')).default
        const now = new Date().toISOString()
        const fill = (rows: any[], def: Record<string, unknown>) => rows.map(r => ({ created_at: now, updated_at: now, ...def, ...r }))
        demoLoaded.current = true
        setStore({ tasks: fill(d.tasks, { owner: '', notes: '', answer: '' }), materials: fill(d.materials, { location: '', owner: '' }), contacts: fill(d.contacts, { email: '', notes: '' }), schedule: fill(d.schedule, {}), crew: fill(d.crew, { role: 'Crew', zone: '', phone: '', confirmed: false, notes: '' }), shifts: fill(d.shifts, { lead: '' }), variants: [], activity: [] })
        setEditMode(true); setActorState('Demo')
      }
      setLoading(false); return
    }
    const r = await Promise.all([
      supabase.from('tasks').select('*').order('sort'),
      supabase.from('materials').select('*').order('sort'),
      supabase.from('contacts').select('*').order('sort'),
      supabase.from('schedule').select('*').order('day').order('start_time'),
      supabase.from('crew').select('*').order('name'),
      supabase.from('shifts').select('*').order('sort'),
      supabase.from('floor_variants').select('*').order('created_at'),
      supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(150),
    ])
    const e = r.find(x => x.error)?.error; if (e) setError(e.message)
    setStore({ tasks: (r[0].data || []) as Task[], materials: (r[1].data || []) as Material[], contacts: (r[2].data || []) as Contact[], schedule: (r[3].data || []) as ScheduleItem[], crew: (r[4].data || []) as CrewMember[], shifts: (r[5].data || []) as Shift[], variants: (r[6].data || []) as FloorVariant[], activity: (r[7].data || []) as Activity[] })
    setLoading(false)
  }, [])

  useEffect(() => { void reload() }, [reload])
  useEffect(() => { if (!supabaseConfigured) return; fetch('/api/edit-session', { credentials: 'include' }).then(r => r.json()).then(b => setEditMode(Boolean(b.ok))).catch(() => setEditMode(false)) }, [])
  useEffect(() => {
    if (!supabaseConfigured) return
    let t: ReturnType<typeof setTimeout> | undefined
    const ch = supabase.channel('sd-live')
    ;['tasks', 'materials', 'contacts', 'schedule', 'crew', 'shifts', 'floor_variants', 'activity_log'].forEach(table =>
      ch.on('postgres_changes', { event: '*', schema: 'public', table }, () => { clearTimeout(t); t = setTimeout(() => void reload(), 400) }))
    ch.subscribe(); return () => { void supabase.removeChannel(ch) }
  }, [reload])

  const demoLoaded = useRef(false)
  const demoWrite = (table: TableName, action: string, payload: Record<string, unknown> = {}, id?: string) => {
    const key = ({ tasks: 'tasks', materials: 'materials', contacts: 'contacts', schedule: 'schedule', crew: 'crew', shifts: 'shifts', floor_variants: 'variants' } as const)[table]
    const now = new Date().toISOString()
    let out: any = null
    setStore(s => {
      const rows = s[key] as any[]
      let next = rows
      if (action === 'insert') { out = { id: crypto.randomUUID(), created_at: now, ...payload, updated_at: now }; next = [...rows, out] }
      else if (action === 'upsert') { const ex = rows.find(r => r.id === payload.id); out = { ...(ex || { created_at: now }), ...payload, updated_at: now }; next = ex ? rows.map(r => r.id === payload.id ? out : r) : [...rows, out] }
      else if (action === 'update') { next = rows.map(r => r.id === id ? (out = { ...r, ...payload, updated_at: now }) : r) }
      else if (action === 'delete') next = rows.filter(r => r.id !== id)
      const act = { id: Date.now(), entity_type: table, entity_id: String(id || out?.id || ''), action, summary: `${action}: ${String(out?.title || out?.item || out?.name || out?.label || id || '')}`, actor: 'Demo', created_at: now }
      return { ...s, [key]: next, activity: [act, ...s.activity] }
    })
    return Promise.resolve(out)
  }
  const flash = useCallback((m: string) => { setNotice(m); setTimeout(() => setNotice(''), 3000) }, [])
  const requireEdit = useCallback(() => { if (!editMode) { setAskUnlock(true); return false } return true }, [editMode])

  const write = useCallback(async (table: TableName, action: 'insert' | 'update' | 'delete' | 'upsert', payload?: Record<string, unknown>, id?: string, quiet?: boolean) => {
    if (!supabaseConfigured) return demoWrite(table, action, payload, id)
    const r = await fetch('/api/write', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table, action, payload, id, actor, quiet }) })
    const j = await r.json().catch(() => ({}))
    if (r.status === 401) { setEditMode(false); setAskUnlock(true) }
    if (!r.ok) throw new Error(j.error || 'Speichern fehlgeschlagen.')
    if (!quiet) void reload()
    return j.data
  }, [actor, reload])

  const value = useMemo<Ctx>(() => ({ ...store, demo: !supabaseConfigured, loading, error, setError, reload, editMode, setEditMode, actor, setActor, write, flash, notice, requireEdit, askUnlock, setAskUnlock }), [store, loading, error, reload, editMode, actor, write, flash, notice, requireEdit, askUnlock])
  return <C.Provider value={value}>{children}</C.Provider>
}
