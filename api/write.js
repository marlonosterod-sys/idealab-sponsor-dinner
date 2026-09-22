import { createClient } from '@supabase/supabase-js'
import { hasSession } from './_auth.js'

// Whitelist: nur diese Spalten dürfen vom Browser geschrieben werden
const allowed = {
  tasks: ['title', 'area', 'owner', 'contact', 'status', 'priority', 'due', 'answer', 'notes', 'sort'],
  materials: ['item', 'category', 'quantity', 'source', 'needed_when', 'location', 'owner', 'status', 'notes', 'sort'],
  contacts: ['name', 'role', 'org', 'phone', 'email', 'responsible_for', 'notes', 'sort'],
  schedule: ['kind', 'day', 'start_time', 'end_time', 'phase', 'title', 'who', 'notes', 'flagged'],
  crew: ['name', 'shifts', 'role', 'zone', 'phone', 'confirmed', 'notes'],
  shifts: ['label', 'start_time', 'end_time', 'whatsapp', 'lead', 'sort'],
  floor_variants: ['id', 'name', 'note', 'state', 'is_final'],
}
const labelField = { tasks: 'title', materials: 'item', contacts: 'name', schedule: 'title', crew: 'name', shifts: 'label', floor_variants: 'name' }
const clean = (table, payload) => Object.fromEntries(Object.entries(payload || {}).filter(([k]) => allowed[table].includes(k)).map(([k, v]) => [k, v === '' && k === 'due' ? null : v]))

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!hasSession(req)) return res.status(401).json({ error: 'Bearbeitungsmodus ist nicht aktiv.' })
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return res.status(503).json({ error: 'Vercel-Variable fehlt: VITE_SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY' })
  try {
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const { table, action, id, actor = '' } = body
    if (!allowed[table]) return res.status(400).json({ error: 'Unbekannte Tabelle.' })
    const payload = clean(table, body.payload)
    let data = null, summary = ''
    if (action === 'insert') {
      const r = await db.from(table).insert(payload).select().single(); if (r.error) throw r.error
      data = r.data; summary = `angelegt: ${data[labelField[table]] ?? ''}`
    } else if (action === 'update') {
      if (!id) return res.status(400).json({ error: 'id fehlt.' })
      const r = await db.from(table).update(payload).eq('id', id).select().single(); if (r.error) throw r.error
      data = r.data
      const fields = Object.keys(payload).filter(k => k !== 'state' && k !== 'sort')
      summary = `${data[labelField[table]] ?? ''}: ${fields.map(f => `${f} → ${String(payload[f]).slice(0, 60)}`).join(', ')}`
    } else if (action === 'upsert') {
      const r = await db.from(table).upsert(payload).select().single(); if (r.error) throw r.error
      data = r.data; summary = `gespeichert: ${data[labelField[table]] ?? ''}`
    } else if (action === 'delete') {
      if (!id) return res.status(400).json({ error: 'id fehlt.' })
      const old = await db.from(table).select(labelField[table]).eq('id', id).maybeSingle()
      const r = await db.from(table).delete().eq('id', id); if (r.error) throw r.error
      summary = `gelöscht: ${old.data?.[labelField[table]] ?? id}`
    } else return res.status(400).json({ error: 'Unbekannte Aktion.' })
    // Planer-Autosave nicht ins Protokoll spammen
    if (!(table === 'floor_variants' && action !== 'delete' && body.quiet)) {
      await db.from('activity_log').insert({ entity_type: table, entity_id: String(id || data?.id || ''), action, summary: summary.slice(0, 400), actor: String(actor).slice(0, 60) })
    }
    return res.status(200).json({ data })
  } catch (e) {
    return res.status(500).json({ error: e?.message || String(e) })
  }
}
