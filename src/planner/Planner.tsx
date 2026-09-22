import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPE } from 'react'
import { useData } from '../lib/data'
import type { FloorVariant } from '../lib/types'
import { CATS, chairs, CHAIR, DEF, DEFS, EMPTY, footprint, seatsOf, ZONE_COLORS, type PlanState, type Placed, type Zone } from './elements'
import { hitsWall, MARKERS, polyDist, ROOMS, VIEWBOX } from './geometry'
import { buildPreset, PRESETS } from './presets'
import { Modal } from '../ui'
import { downloadCSV } from '../lib/csv'

type Sel = { kind: 'item' | 'zone'; uid: string } | null
type Tool = 'select' | 'zone' | 'measure'
type Drag =
  | { mode: 'move'; kind: 'item' | 'zone'; uid: string; dx: number; dy: number; moved: boolean }
  | { mode: 'rotate'; uid: string }
  | { mode: 'resize'; uid: string }
  | { mode: 'pan'; sx: number; sy: number; vx: number; vy: number }
  | { mode: 'draw'; x0: number; y0: number; x: number; y: number }
  | null

const rid = () => `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
const vid = () => `var_${Date.now().toString(36)}`
const r2 = (v: number) => Math.round(v * 100) / 100
const snapTo = (v: number, s: number) => Math.round(v / s) * s
const FIT = { x: 5.5, y: 19.5, w: 40, h: 22 }
const HALLVIEW = { x: 6.5, y: 22.5, w: 31, h: 18 }

export default function Planner() {
  const { variants, editMode, requireEdit, write, setError, flash, crew } = useData()
  const [activeId, setActiveId] = useState<string>('')
  const [plan, setPlan] = useState<PlanState>(EMPTY)
  const [meta, setMeta] = useState<{ name: string; note: string; is_final: boolean }>({ name: '', note: '', is_final: false })
  const [sel, setSel] = useState<Sel>(null)
  const [tool, setTool] = useState<Tool>('select')
  const [view, setView] = useState(HALLVIEW)
  const [layers, setLayers] = useState({ plan: true, rooms: true, zones: true, chairs: true, grid: false, gaps: true, light: true })
  const [snap, setSnap] = useState(true)
  const [drag, setDrag] = useState<Drag>(null)
  const [measure, setMeasure] = useState<{ a: [number, number]; b?: [number, number] }[]>([])
  const [hover, setHover] = useState<[number, number] | null>(null)
  const [saveState, setSaveState] = useState<'saved' | 'dirty' | 'saving' | 'error'>('saved')
  const [newDlg, setNewDlg] = useState(false)
  const [cat, setCat] = useState<string>('Tische')
  const hist = useRef<{ stack: string[]; i: number }>({ stack: [], i: -1 })
  const svgRef = useRef<SVGSVGElement>(null)
  const dirty = useRef(false)

  const active = variants.find(v => v.id === activeId)
  // Variante laden
  useEffect(() => { if (!activeId && variants.length) setActiveId((variants.find(v => v.is_final) || variants[0]).id) }, [variants, activeId])
  const loadedFor = useRef<string>('')
  useEffect(() => {
    if (!active) return
    const stamp = active.id + active.updated_at
    if (loadedFor.current.startsWith(active.id) && dirty.current) return
    if (loadedFor.current === stamp) return
    const firstLoad = !loadedFor.current.startsWith(active.id)
    loadedFor.current = stamp
    const st: PlanState = { ...EMPTY, ...(active.state || {}) }
    setPlan(st); setMeta({ name: active.name, note: active.note, is_final: active.is_final })
    if (firstLoad) { hist.current = { stack: [JSON.stringify(st)], i: 0 }; setSel(null); setMeasure([]) }
  }, [active])

  // Speichern (debounced)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const persist = useCallback((st: PlanState, m = meta) => {
    if (!activeId || !editMode) return
    dirty.current = true; setSaveState('dirty')
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaveState('saving')
      try { await write('floor_variants', 'upsert', { id: activeId, name: m.name, note: m.note, is_final: m.is_final, state: st }, activeId, true); dirty.current = false; setSaveState('saved') }
      catch (x) { setSaveState('error'); setError(x instanceof Error ? x.message : String(x)) }
    }, 900)
  }, [activeId, editMode, meta, write, setError])

  const commit = useCallback((st: PlanState) => {
    setPlan(st)
    const h = hist.current, s = JSON.stringify(st)
    if (h.stack[h.i] !== s) { h.stack = h.stack.slice(0, h.i + 1); h.stack.push(s); if (h.stack.length > 60) h.stack.shift(); h.i = h.stack.length - 1 }
    persist(st)
  }, [persist])
  const undo = () => { const h = hist.current; if (h.i > 0) { h.i--; const st = JSON.parse(h.stack[h.i]); setPlan(st); persist(st) } }
  const redo = () => { const h = hist.current; if (h.i < h.stack.length - 1) { h.i++; const st = JSON.parse(h.stack[h.i]); setPlan(st); persist(st) } }

  const canEdit = editMode && !!activeId
  const guard = () => { if (!activeId) { setNewDlg(true); return false } return requireEdit() }

  // Welt-Koordinaten
  const toWorld = (cx: number, cy: number): [number, number] => {
    const svg = svgRef.current; if (!svg) return [0, 0]
    const pt = svg.createSVGPoint(); pt.x = cx; pt.y = cy
    const m = svg.getScreenCTM(); if (!m) return [0, 0]
    const p = pt.matrixTransform(m.inverse()); return [p.x, p.y]
  }

  const selItem = sel?.kind === 'item' ? plan.items.find(i => i.uid === sel.uid) : undefined
  const selZone = sel?.kind === 'zone' ? plan.zones.find(z => z.uid === sel.uid) : undefined
  const updItem = (uid: string, patch: Partial<Placed>, live = false) => { const st = { ...plan, items: plan.items.map(i => i.uid === uid ? { ...i, ...patch } : i) }; live ? setPlan(st) : commit(st) }
  const updZone = (uid: string, patch: Partial<Zone>, live = false) => { const st = { ...plan, zones: plan.zones.map(z => z.uid === uid ? { ...z, ...patch } : z) }; live ? setPlan(st) : commit(st) }

  const addItem = (type: string) => {
    if (!guard()) return
    const def = DEF[type]
    const cx = r2(view.x + view.w / 2), cy = r2(view.y + view.h / 2)
    const tables = plan.items.filter(i => DEF[i.type]?.table).length
    const it: Placed = { uid: rid(), type, x: cx, y: cy, w: def.w, d: def.d, rot: 0, ...(def.table ? { seats: def.seats, label: `T${tables + 1}` } : {}) }
    commit({ ...plan, items: def.under ? [it, ...plan.items] : [...plan.items, it] }); setSel({ kind: 'item', uid: it.uid }); setTool('select')
  }
  const del = () => {
    if (!sel || !guard()) return
    commit(sel.kind === 'item' ? { ...plan, items: plan.items.filter(i => i.uid !== sel.uid) } : { ...plan, zones: plan.zones.filter(z => z.uid !== sel.uid) }); setSel(null)
  }
  const dup = () => {
    if (!guard()) return
    if (selItem) { const c = { ...selItem, uid: rid(), x: r2(selItem.x + 0.5), y: r2(selItem.y + 0.5), label: DEF[selItem.type]?.table ? `T${plan.items.filter(i => DEF[i.type]?.table).length + 1}` : selItem.label }; commit({ ...plan, items: [...plan.items, c] }); setSel({ kind: 'item', uid: c.uid }) }
    if (selZone) { const c = { ...selZone, uid: rid(), x: selZone.x + 0.5, y: selZone.y + 0.5 }; commit({ ...plan, zones: [...plan.zones, c] }); setSel({ kind: 'zone', uid: c.uid }) }
  }
  const renumber = () => { if (!guard()) return; let k = 1; const items = [...plan.items].sort((a, b) => a.x - b.x || a.y - b.y).map(i => DEF[i.type]?.table ? { ...i, label: `T${k++}` } : i); const order = new Map(plan.items.map((i, n) => [i.uid, n])); items.sort((a, b) => order.get(a.uid)! - order.get(b.uid)!); commit({ ...plan, items }); flash('Tische neu nummeriert') }

  // Tastatur
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return }
      if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return }
      if (e.key === 'Escape') { setSel(null); setTool('select'); setMeasure(m => m.filter(x => x.b)); return }
      if (!sel || !canEdit) return
      if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); dup(); return }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); del(); return }
      const st = e.shiftKey ? 0.5 : 0.1
      const mv: Record<string, [number, number]> = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] }
      if (mv[e.key]) { e.preventDefault(); const [dx, dy] = mv[e.key]; if (selItem) updItem(selItem.uid, { x: r2(selItem.x + dx), y: r2(selItem.y + dy) }); if (selZone) updZone(selZone.uid, { x: r2(selZone.x + dx), y: r2(selZone.y + dy) }) }
      if (selItem && e.key.toLowerCase() === 'r') updItem(selItem.uid, { rot: (selItem.rot + (e.shiftKey ? -15 : 15) + 360) % 360 })
      if (selItem && e.key.toLowerCase() === 'q') updItem(selItem.uid, { rot: (selItem.rot + 90) % 360 })
    }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  })

  // Zoom mit Mausrad
  useEffect(() => {
    const svg = svgRef.current; if (!svg) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const [wx, wy] = toWorld(e.clientX, e.clientY)
      const f = Math.exp(e.deltaY * 0.0015)
      setView(v => { const w = Math.min(80, Math.max(3, v.w * f)); const h = w * v.h / v.w; return { x: wx - (wx - v.x) * w / v.w, y: wy - (wy - v.y) * h / v.h, w, h } })
    }
    svg.addEventListener('wheel', onWheel, { passive: false }); return () => svg.removeEventListener('wheel', onWheel)
  })

  const onBgDown = (e: RPE<SVGSVGElement>) => {
    if (e.button !== 0) return
    const [x, y] = toWorld(e.clientX, e.clientY)
    if (tool === 'measure') {
      const p: [number, number] = snap ? [r2(snapTo(x, 0.1)), r2(snapTo(y, 0.1))] : [x, y]
      setMeasure(m => { const last = m[m.length - 1]; return last && !last.b ? [...m.slice(0, -1), { a: last.a, b: p }] : [...m, { a: p }] }); return
    }
    if (tool === 'zone') { if (!guard()) return; setDrag({ mode: 'draw', x0: x, y0: y, x, y }); return }
    setSel(null)
    setDrag({ mode: 'pan', sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y })
  }
  const onItemDown = (e: RPE, kind: 'item' | 'zone', uid: string) => {
    if (tool !== 'select' || e.button !== 0) return
    e.stopPropagation(); setSel({ kind, uid })
    if (!canEdit) return
    const [x, y] = toWorld(e.clientX, e.clientY)
    const o = kind === 'item' ? plan.items.find(i => i.uid === uid)! : plan.zones.find(z => z.uid === uid)!
    setDrag({ mode: 'move', kind, uid, dx: x - o.x, dy: y - o.y, moved: false })
  }
  const onMove = (e: RPE<SVGSVGElement>) => {
    const [x, y] = toWorld(e.clientX, e.clientY)
    setHover([x, y])
    if (!drag) return
    if (drag.mode === 'pan') { const svg = svgRef.current!; const k = view.w / svg.clientWidth; setView(v => ({ ...v, x: drag.vx - (e.clientX - drag.sx) * k, y: drag.vy - (e.clientY - drag.sy) * k })); return }
    if (drag.mode === 'draw') { setDrag({ ...drag, x, y }); return }
    if (drag.mode === 'move') {
      let nx = x - drag.dx, ny = y - drag.dy
      if (snap) { nx = snapTo(nx, 0.05); ny = snapTo(ny, 0.05) }
      drag.moved = true
      drag.kind === 'item' ? updItem(drag.uid, { x: r2(nx), y: r2(ny) }, true) : updZone(drag.uid, { x: r2(nx), y: r2(ny) }, true)
      return
    }
    if (drag.mode === 'rotate') { const it = plan.items.find(i => i.uid === drag.uid)!; let a = Math.atan2(y - it.y, x - it.x) * 180 / Math.PI + 90; if (!e.altKey) a = snapTo(a, 15); updItem(it.uid, { rot: (Math.round(a) + 360) % 360 }, true); return }
    if (drag.mode === 'resize') { const z = plan.zones.find(q => q.uid === drag.uid)!; updZone(z.uid, { w: r2(Math.max(0.5, (snap ? snapTo(x, 0.1) : x) - z.x)), h: r2(Math.max(0.5, (snap ? snapTo(y, 0.1) : y) - z.y)) }, true) }
  }
  const onUp = () => {
    if (!drag) return
    if (drag.mode === 'draw') {
      const x = Math.min(drag.x0, drag.x), y = Math.min(drag.y0, drag.y), w = Math.abs(drag.x - drag.x0), h = Math.abs(drag.y - drag.y0)
      if (w > 0.4 && h > 0.4) { const z: Zone = { uid: rid(), x: r2(x), y: r2(y), w: r2(w), h: r2(h), label: 'Neue Zone', color: ZONE_COLORS[plan.zones.length % ZONE_COLORS.length], lead: '' }; commit({ ...plan, zones: [...plan.zones, z] }); setSel({ kind: 'zone', uid: z.uid }) }
      setTool('select')
    } else if (drag.mode !== 'pan' && !(drag.mode === 'move' && !drag.moved)) commit(plan)
    setDrag(null)
  }

  // Analyse
  const analysis = useMemo(() => {
    const coll = new Set<string>()
    const fps = new Map<string, ReturnType<typeof footprint>>()
    for (const it of plan.items) {
      const def = DEF[it.type]; if (!def || def.under || def.light) continue
      const fp = footprint(it); fps.set(it.uid, fp)
      if (hitsWall(fp)) coll.add(it.uid)
    }
    const tables = plan.items.filter(i => DEF[i.type]?.table)
    const gaps: { a: string; b: string; d: number; p: [number, number]; q: [number, number] }[] = []
    for (let i = 0; i < tables.length; i++) for (let j = i + 1; j < tables.length; j++) {
      const A = tables[i], B = tables[j]
      if (Math.hypot(A.x - B.x, A.y - B.y) > 7) continue
      const r = polyDist(fps.get(A.uid)!, fps.get(B.uid)!)
      if (r.d < 0.9) gaps.push({ a: A.uid, b: B.uid, d: r.d, p: r.p, q: r.q })
    }
    const seats = plan.items.reduce((s, i) => s + (DEF[i.type]?.table ? seatsOf(i) : 0), 0)
    const counts = new Map<string, number>(); plan.items.forEach(i => counts.set(i.type, (counts.get(i.type) || 0) + 1))
    const chairsTotal = plan.items.reduce((s, i) => s + (DEF[i.type]?.table ? seatsOf(i) : i.type === 'stuhl' ? 1 : 0), 0)
    return { coll, gaps, seats, counts, tables: tables.length, chairsTotal }
  }, [plan])

  // Varianten
  const createVariant = async (name: string, st: PlanState, note = '') => {
    if (!requireEdit()) return
    const id = vid()
    try { await write('floor_variants', 'insert', { id, name, note, state: st, is_final: false }); setActiveId(id); loadedFor.current = ''; dirty.current = false; flash(`Variante „${name}“ angelegt`); setNewDlg(false); setView(HALLVIEW) } catch (x) { setError(x instanceof Error ? x.message : String(x)) }
  }
  const deleteVariant = async () => {
    if (!active || !requireEdit() || !window.confirm(`Variante „${active.name}“ löschen?`)) return
    try { await write('floor_variants', 'delete', undefined, active.id); setActiveId(''); loadedFor.current = ''; setPlan(EMPTY) } catch (x) { setError(x instanceof Error ? x.message : String(x)) }
  }
  const markFinal = async () => {
    if (!active || !requireEdit()) return
    try {
      for (const v of variants.filter(v => v.is_final && v.id !== active.id)) await write('floor_variants', 'update', { is_final: false }, v.id, true)
      await write('floor_variants', 'update', { is_final: !active.is_final }, active.id)
      setMeta(m => ({ ...m, is_final: !active.is_final })); flash(active.is_final ? 'Nicht mehr final' : `„${active.name}“ ist jetzt die finale Variante`)
    } catch (x) { setError(x instanceof Error ? x.message : String(x)) }
  }
  const saveMeta = (m: typeof meta) => { setMeta(m); persist(plan, m) }

  const exportPNG = async () => {
    const svg = svgRef.current; if (!svg) return
    const clone = svg.cloneNode(true) as SVGSVGElement
    clone.querySelectorAll('.no-export').forEach(n => n.remove())
    const img = clone.querySelector('image.bg')
    if (img) { const txt = await fetch('/mensa-plan.svg').then(r => r.text()); img.setAttribute('href', 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(txt)) }
    const W = 3200, H = Math.round(W * view.h / view.w)
    clone.setAttribute('width', String(W)); clone.setAttribute('height', String(H)); clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone))
    const im = new Image(); im.src = url; await im.decode()
    const head = 170, foot = 150
    const c = document.createElement('canvas'); c.width = W; c.height = H + head + foot
    const g = c.getContext('2d')!; g.fillStyle = '#f5f5f1'; g.fillRect(0, 0, c.width, c.height)
    g.fillStyle = '#1e1e1e'; g.font = '800 64px Poppins, Arial'; g.fillText(`Sponsor Dinner · ${meta.name}`, 60, 95)
    g.fillStyle = '#7442c9'; g.font = '600 30px Poppins, Arial'; g.fillText(`Neue Mensa · Sa 26.09.2026 · ${analysis.tables} Tische · ${analysis.seats} Plätze`, 60, 145)
    g.fillStyle = '#fff'; g.fillRect(0, head, W, H); g.drawImage(im, 0, head, W, H)
    g.fillStyle = '#1e1e1e'; g.font = '500 26px Poppins, Arial'
    const inv = [...analysis.counts.entries()].map(([t, n]) => `${n}× ${DEF[t]?.label || t}`).join('  ·  ')
    wrap(g, inv, 60, H + head + 55, W - 120, 36)
    const zones = plan.zones.map(z => `${z.label}${z.lead ? ` – ${z.lead}` : ''}`).join('  ·  ')
    g.fillStyle = '#62625d'; wrap(g, zones, 60, H + head + 120, W - 120, 36)
    const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = `raumplan-${meta.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`; a.click()
  }
  const exportInv = () => downloadCSV(`inventar-${meta.name}.csv`, [...analysis.counts.entries()].map(([t, n]) => ({ Element: DEF[t]?.label || t, Anzahl: n, Kategorie: DEF[t]?.cat })), ['Element', 'Anzahl', 'Kategorie'])

  const leads = crew.map(c => c.name)
  const draw = drag?.mode === 'draw' ? drag : null

  return <div className="planner">
    <aside className="pl-left">
      <div className="pl-block">
        <p className="eyebrow">Variante</p>
        <select value={activeId} onChange={e => { setActiveId(e.target.value); loadedFor.current = ''; dirty.current = false }}>
          {!variants.length && <option value="">– noch keine –</option>}
          {variants.map(v => <option key={v.id} value={v.id}>{v.is_final ? '★ ' : ''}{v.name}</option>)}
        </select>
        <div className="pl-row">
          <button className="primary sm" onClick={() => requireEdit() && setNewDlg(true)}>+ Neu</button>
          <button className="secondary sm" disabled={!active} onClick={() => active && createVariant(`${active.name} (Kopie)`, plan, meta.note)}>Kopie</button>
          <button className="secondary sm" disabled={!active} onClick={markFinal}>{meta.is_final ? '★ Final' : '☆ Final'}</button>
        </div>
        {active && <>
          <input className="pl-name" value={meta.name} disabled={!editMode} onChange={e => saveMeta({ ...meta, name: e.target.value })} />
          <textarea className="pl-note" rows={2} placeholder="Notiz zur Variante" value={meta.note} disabled={!editMode} onChange={e => saveMeta({ ...meta, note: e.target.value })} />
          <button className="text-btn danger-text" onClick={deleteVariant}>Variante löschen</button>
        </>}
      </div>
      <div className="pl-block">
        <p className="eyebrow">Elemente</p>
        <div className="pl-cats">{CATS.map(c => <button key={c} className={cat === c ? 'active' : ''} onClick={() => setCat(c)}>{c}</button>)}</div>
        <div className="pl-lib">
          {DEFS.filter(d => d.cat === cat).map(d => <button key={d.id} onClick={() => addItem(d.id)} title={d.hint}>
            <svg viewBox="-1 -1 2 2" width="22" height="22">{d.shape === 'circle' ? <circle r=".8" fill={d.color} /> : <rect x={-.9} y={-.9 * Math.min(1, d.d / d.w) || -.2} width="1.8" height={Math.max(.25, 1.8 * Math.min(1, d.d / d.w))} fill={d.color} rx=".08" />}</svg>
            <span><b>{d.label}</b><small>{d.shape === 'circle' ? `Ø ${d.w.toFixed(2)} m` : `${d.w.toFixed(2)} × ${d.d.toFixed(2)} m`}{d.seats ? ` · ${d.seats} Pl.` : ''}</small></span>
          </button>)}
        </div>
      </div>
    </aside>

    <section className="pl-main">
      <div className="pl-toolbar">
        <div className="seg">
          <button className={tool === 'select' ? 'on' : ''} onClick={() => setTool('select')}>↖ Auswahl</button>
          <button className={tool === 'zone' ? 'on' : ''} onClick={() => guard() && setTool('zone')}>▭ Zone</button>
          <button className={tool === 'measure' ? 'on' : ''} onClick={() => setTool('measure')}>📏 Messen</button>
        </div>
        <div className="seg">
          <button onClick={undo} disabled={!canEdit} title="Rückgängig (⌘Z)">↶</button>
          <button onClick={redo} disabled={!canEdit} title="Wiederholen (⌘⇧Z)">↷</button>
          <button onClick={() => setView(FIT)} title="Alles zeigen">⤢</button>
          <button onClick={() => setView(HALLVIEW)} title="Saal">Saal</button>
        </div>
        <div className="seg layers">
          {([['plan', 'Plan'], ['rooms', 'Räume'], ['zones', 'Zonen'], ['chairs', 'Stühle'], ['light', 'Licht'], ['gaps', 'Abstände'], ['grid', 'Raster']] as const).map(([k, l]) => <button key={k} className={layers[k] ? 'on' : ''} onClick={() => setLayers(s => ({ ...s, [k]: !s[k] }))}>{l}</button>)}
          <button className={snap ? 'on' : ''} onClick={() => setSnap(!snap)}>Snap</button>
        </div>
        <span style={{ flex: 1 }} />
        {measure.length > 0 && <button className="text-btn" onClick={() => setMeasure([])}>Messungen löschen</button>}
        <span className={`save-state ${saveState}`}>{!editMode ? 'Nur Ansicht' : saveState === 'saved' ? 'Gespeichert ✓' : saveState === 'saving' ? 'Speichert…' : saveState === 'dirty' ? 'Änderungen…' : 'Fehler'}</span>
        <button className="secondary sm" onClick={exportPNG} disabled={!active}>PNG</button>
      </div>

      <div className={`pl-canvas tool-${tool}`}>
        {!variants.length && <div className="pl-empty"><h3>Noch keine Variante</h3><p>Starte mit einer Tischkonfiguration – Tische, Service-Zonen, Bar, Anrichte, Lounge und Licht werden automatisch in den Saal gesetzt.</p><button className="primary" onClick={() => requireEdit() && setNewDlg(true)}>Erste Variante anlegen</button></div>}
        <svg ref={svgRef} viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} preserveAspectRatio="xMidYMid meet" onPointerDown={onBgDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={() => { setHover(null); onUp() }}>
          <defs>
            <radialGradient id="glow"><stop offset="0" stopColor="#ffb938" stopOpacity=".55" /><stop offset="1" stopColor="#ffb938" stopOpacity="0" /></radialGradient>
            <radialGradient id="spotg"><stop offset="0" stopColor="#fff2b0" stopOpacity=".6" /><stop offset="1" stopColor="#fff2b0" stopOpacity="0" /></radialGradient>
            <pattern id="grid" width=".5" height=".5" patternUnits="userSpaceOnUse"><path d="M.5 0H0V.5" fill="none" stroke="#d8d8d0" strokeWidth=".01" /></pattern>
          </defs>
          <rect x={VIEWBOX[0] - 50} y={VIEWBOX[1] - 50} width={VIEWBOX[2] + 100} height={VIEWBOX[3] + 100} fill="#fff" />
          {layers.grid && <rect x={VIEWBOX[0]} y={VIEWBOX[1]} width={VIEWBOX[2]} height={VIEWBOX[3]} fill="url(#grid)" />}
          {layers.plan && <image className="bg" href="/mensa-plan.svg" x={VIEWBOX[0]} y={VIEWBOX[1]} width={VIEWBOX[2]} height={VIEWBOX[3]} preserveAspectRatio="none" style={{ pointerEvents: 'none' }} />}
          {layers.rooms && <g className="rooms" pointerEvents="none">
            {ROOMS.map(r => <g key={r.name}><text x={r.x} y={r.y} textAnchor="middle" fontSize={r.big ? .55 : .36} fontWeight={700} fill="#8f8f88">{r.name}</text>{r.sub && <text x={r.x} y={r.y + .42} textAnchor="middle" fontSize=".26" fill="#a5a59e">{r.sub}</text>}</g>)}
            {MARKERS.map(m => <text key={m.label} x={m.x} y={m.y} textAnchor="middle" fontSize=".32" fontWeight={700} fill="#7442c9">{m.label}</text>)}
          </g>}
          {layers.zones && plan.zones.map(z => { const on = sel?.uid === z.uid; return <g key={z.uid} onPointerDown={e => onItemDown(e, 'zone', z.uid)} className="zone" pointerEvents="visiblePainted">
            <rect x={z.x} y={z.y} width={z.w} height={z.h} fill={z.color} fillOpacity={on ? .16 : .09} stroke={z.color} strokeWidth={on ? .06 : .035} strokeDasharray=".22 .12" rx=".15" pointerEvents="none" />
            <rect x={z.x} y={z.y} width={z.w} height={z.h} fill="none" stroke="transparent" strokeWidth=".35" rx=".15" pointerEvents="stroke" />
            <text x={z.x + .15} y={z.y + .38} fontSize=".3" fontWeight={700} fill={z.color} style={{ cursor: 'move' }}>{z.label}</text>
            {z.lead && <text x={z.x + .15} y={z.y + .72} fontSize=".26" fill={z.color}>Lead: {z.lead}</text>}
            {on && canEdit && <rect className="no-export" x={z.x + z.w - .18} y={z.y + z.h - .18} width=".36" height=".36" fill="#fff" stroke={z.color} strokeWidth=".04" style={{ cursor: 'nwse-resize' }} onPointerDown={e => { e.stopPropagation(); setDrag({ mode: 'resize', uid: z.uid }) }} />}
          </g> })}
          {layers.light && plan.items.filter(i => DEF[i.type]?.light).map(i => DEF[i.type].light === 'warm' && i.type === 'kette'
            ? <rect key={'g' + i.uid} x={i.x - i.w / 2} y={i.y - .5} width={i.w} height={1} fill="url(#glow)" transform={`rotate(${i.rot} ${i.x} ${i.y})`} pointerEvents="none" />
            : <circle key={'g' + i.uid} cx={i.x} cy={i.y} r={DEF[i.type].light === 'spot' ? 2.2 : 1.5} fill={`url(#${DEF[i.type].light === 'spot' ? 'spotg' : 'glow'})`} pointerEvents="none" />)}
          {plan.items.map(i => { const def = DEF[i.type]; if (!def) return null; const on = sel?.uid === i.uid; const bad = analysis.coll.has(i.uid)
            return <g key={i.uid} transform={`translate(${i.x} ${i.y}) rotate(${def.shape === 'circle' ? 0 : i.rot})`} onPointerDown={e => onItemDown(e, 'item', i.uid)} className="item">
              {layers.chairs && chairs(i).map((c, k) => <rect key={k} x={c.x - CHAIR.w / 2} y={c.y - CHAIR.d / 2} width={CHAIR.w} height={CHAIR.d} rx=".07" fill="#b5aa9c" stroke="#fff" strokeWidth=".02" transform={`rotate(${c.a} ${c.x} ${c.y})`} />)}
              {def.shape === 'circle'
                ? <circle r={i.w / 2} fill={def.color} fillOpacity={def.under ? .35 : .88} stroke={bad ? '#b23a3f' : on ? '#9e68fa' : '#fff'} strokeWidth={bad || on ? .07 : .025} />
                : <rect x={-i.w / 2} y={-i.d / 2} width={i.w} height={Math.max(i.d, .06)} rx={def.table ? .04 : .03} fill={def.color} fillOpacity={def.under ? .35 : .88} stroke={bad ? '#b23a3f' : on ? '#9e68fa' : '#fff'} strokeWidth={bad || on ? .07 : .025} />}
              {i.label && <text transform={`rotate(${def.shape === 'circle' ? 0 : -i.rot})`} textAnchor="middle" dy=".12" fontSize={def.table ? .34 : .22} fontWeight={800} fill="#fff" pointerEvents="none">{i.label}</text>}
              {def.table && <text transform={`rotate(${def.shape === 'circle' ? 0 : -i.rot})`} textAnchor="middle" dy=".42" fontSize=".2" fill="#fff" opacity=".85" pointerEvents="none">{seatsOf(i)} Pl.</text>}
              {on && canEdit && def.shape !== 'circle' && <g className="no-export" onPointerDown={e => { e.stopPropagation(); setDrag({ mode: 'rotate', uid: i.uid }) }} style={{ cursor: 'grab' }}>
                <line x1="0" y1={-i.d / 2} x2="0" y2={-i.d / 2 - .55} stroke="#9e68fa" strokeWidth=".03" /><circle cy={-i.d / 2 - .65} r=".14" fill="#fff" stroke="#9e68fa" strokeWidth=".04" />
              </g>}
            </g> })}
          {layers.gaps && analysis.gaps.map((g, k) => <g key={k} pointerEvents="none"><line x1={g.p[0]} y1={g.p[1]} x2={g.q[0]} y2={g.q[1]} stroke="#b23a3f" strokeWidth=".05" strokeDasharray=".1 .06" /><text x={(g.p[0] + g.q[0]) / 2} y={(g.p[1] + g.q[1]) / 2 - .08} fontSize=".24" fontWeight={700} fill="#b23a3f" textAnchor="middle">{g.d.toFixed(2)} m</text></g>)}
          {measure.map((m, k) => { const b = m.b || (tool === 'measure' && hover ? hover : m.a); const d = Math.hypot(b[0] - m.a[0], b[1] - m.a[1]); return <g key={k} className="no-export-measure" pointerEvents="none"><line x1={m.a[0]} y1={m.a[1]} x2={b[0]} y2={b[1]} stroke="#e74c3c" strokeWidth=".04" strokeDasharray=".15 .08" /><circle cx={m.a[0]} cy={m.a[1]} r=".07" fill="#e74c3c" /><circle cx={b[0]} cy={b[1]} r=".07" fill="#e74c3c" /><rect x={(m.a[0] + b[0]) / 2 - .45} y={(m.a[1] + b[1]) / 2 - .42} width=".9" height=".3" rx=".15" fill="#fff" stroke="#e74c3c" strokeWidth=".02" /><text x={(m.a[0] + b[0]) / 2} y={(m.a[1] + b[1]) / 2 - .2} fontSize=".2" fontWeight={700} textAnchor="middle" fill="#e74c3c">{d.toFixed(2)} m</text></g> })}
          {draw && <rect x={Math.min(draw.x0, draw.x)} y={Math.min(draw.y0, draw.y)} width={Math.abs(draw.x - draw.x0)} height={Math.abs(draw.y - draw.y0)} fill="#9e68fa" fillOpacity=".1" stroke="#9e68fa" strokeWidth=".04" strokeDasharray=".2 .1" />}
        </svg>
        {hover && <div className="pl-coords">x {hover[0].toFixed(2)} · y {hover[1].toFixed(2)} m</div>}
        {!editMode && variants.length > 0 && <div className="pl-ro">Nur Ansicht – zum Verschieben oben rechts „Bearbeiten“</div>}
      </div>
    </section>

    <aside className="pl-right">
      {selItem && <div className="pl-block props">
        <p className="eyebrow">Ausgewählt</p>
        <h3>{DEF[selItem.type]?.label}</h3>
        <label>Beschriftung<input value={selItem.label || ''} disabled={!canEdit} onChange={e => updItem(selItem.uid, { label: e.target.value })} placeholder="z. B. T4, Sponsoren" /></label>
        {DEF[selItem.type]?.table && <label>Plätze<input type="number" min={0} max={24} value={seatsOf(selItem)} disabled={!canEdit} onChange={e => updItem(selItem.uid, { seats: Math.max(0, +e.target.value) })} /></label>}
        <div className="pl-2">
          <label>{DEF[selItem.type]?.shape === 'circle' ? 'Ø (m)' : 'Breite (m)'}<input type="number" step={0.1} min={0.1} value={selItem.w} disabled={!canEdit || DEF[selItem.type]?.resize === 'none'} onChange={e => updItem(selItem.uid, DEF[selItem.type]?.shape === 'circle' ? { w: +e.target.value, d: +e.target.value } : { w: Math.max(.05, +e.target.value) })} /></label>
          {DEF[selItem.type]?.shape !== 'circle' && <label>Tiefe (m)<input type="number" step={0.1} min={0.05} value={selItem.d} disabled={!canEdit || DEF[selItem.type]?.resize === 'w'} onChange={e => updItem(selItem.uid, { d: Math.max(.05, +e.target.value) })} /></label>}
        </div>
        {DEF[selItem.type]?.shape !== 'circle' && <label>Drehung (°)<input type="number" step={15} value={selItem.rot} disabled={!canEdit} onChange={e => updItem(selItem.uid, { rot: ((+e.target.value % 360) + 360) % 360 })} /></label>}
        {analysis.coll.has(selItem.uid) && <p className="warn-text">Kollidiert mit Wand / Stütze</p>}
        <div className="pl-row"><button className="secondary sm" disabled={!canEdit} onClick={dup}>Duplizieren</button><button className="danger-btn sm" disabled={!canEdit} onClick={del}>Löschen</button></div>
        <p className="muted tiny">Ziehen = verschieben · R/⇧R = ±15° · Q = 90° · Pfeile = 10 cm · ⌘D = duplizieren</p>
      </div>}
      {selZone && <div className="pl-block props">
        <p className="eyebrow">Zone</p>
        <label>Name<input value={selZone.label} disabled={!canEdit} onChange={e => updZone(selZone.uid, { label: e.target.value })} /></label>
        <label>Lead / Head-Kellner<input list="pl-leads" value={selZone.lead} disabled={!canEdit} onChange={e => updZone(selZone.uid, { lead: e.target.value })} placeholder="Name aus der Crew" /></label>
        <datalist id="pl-leads">{leads.map(l => <option key={l} value={l} />)}</datalist>
        <div className="swatches">{ZONE_COLORS.map(c => <button key={c} style={{ background: c }} className={selZone.color === c ? 'on' : ''} disabled={!canEdit} onClick={() => updZone(selZone.uid, { color: c })} />)}</div>
        <div className="pl-2"><label>Breite<input type="number" step={.1} value={selZone.w} disabled={!canEdit} onChange={e => updZone(selZone.uid, { w: +e.target.value })} /></label><label>Höhe<input type="number" step={.1} value={selZone.h} disabled={!canEdit} onChange={e => updZone(selZone.uid, { h: +e.target.value })} /></label></div>
        <div className="pl-row"><button className="secondary sm" disabled={!canEdit} onClick={dup}>Duplizieren</button><button className="danger-btn sm" disabled={!canEdit} onClick={del}>Löschen</button></div>
      </div>}

      <div className="pl-block">
        <p className="eyebrow">Kapazität</p>
        <div className="cap"><strong className={analysis.seats < 70 ? 'warn' : ''}>{analysis.seats}</strong><span>Plätze an {analysis.tables} Tischen<br />für 70 Gedecke</span></div>
        <div className="meter"><i style={{ width: `${Math.min(100, analysis.seats / 70 * 100)}%`, background: analysis.seats >= 70 ? '#35ab32' : '#9e68fa' }} /></div>
        <ul className="checks">
          <li className={analysis.coll.size ? 'bad' : 'ok'}>{analysis.coll.size ? `${analysis.coll.size} Element(e) in Wand/Stütze` : 'Keine Kollision mit Wänden'}</li>
          <li className={analysis.gaps.length ? 'bad' : 'ok'}>{analysis.gaps.length ? `${analysis.gaps.length} Durchgang/-gänge unter 0,90 m` : 'Alle Durchgänge ≥ 0,90 m'}</li>
          <li>{analysis.tables ? `Tischdecken: ${analysis.tables + 2} (inkl. 2 Reserve)` : 'Noch keine Tische'}</li>
          <li>Stühle gesamt: {analysis.chairsTotal}</li>
        </ul>
        {analysis.tables > 0 && <button className="text-btn" onClick={renumber}>Tische neu nummerieren</button>}
      </div>
      <div className="pl-block">
        <div className="section-head"><p className="eyebrow">Inventar</p><button className="text-btn" onClick={exportInv}>CSV</button></div>
        <div className="inv">{[...analysis.counts.entries()].sort((a, b) => b[1] - a[1]).map(([t, n]) => <div key={t}><i style={{ background: DEF[t]?.color }} /><span>{DEF[t]?.label || t}</span><b>{n}</b></div>)}{!analysis.counts.size && <p className="muted">leer</p>}</div>
      </div>
      <div className="pl-block">
        <p className="eyebrow">Zonen & Leads</p>
        <div className="inv">{plan.zones.map(z => <div key={z.uid} onClick={() => setSel({ kind: 'zone', uid: z.uid })} style={{ cursor: 'pointer' }}><i style={{ background: z.color }} /><span>{z.label}</span><b className={z.lead ? '' : 'overdue'}>{z.lead ? z.lead.split(' ')[0] : 'offen'}</b></div>)}{!plan.zones.length && <p className="muted">Mit „▭ Zone“ aufziehen</p>}</div>
      </div>
    </aside>

    {newDlg && <NewVariant close={() => setNewDlg(false)} create={createVariant} current={active ? plan : null} />}
  </div>
}

function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number) {
  const words = text.split(' '); let line = ''
  for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > max && line) { g.fillText(line, x, y); line = w; y += lh } else line = t }
  if (line) g.fillText(line, x, y)
}

function NewVariant({ close, create, current }: { close: () => void; create: (name: string, st: PlanState, note?: string) => void; current: PlanState | null }) {
  const [busy, setBusy] = useState('')
  const go = (id: string) => {
    setBusy(id)
    setTimeout(() => {
      if (id === 'empty') create('Leerer Plan', { ...EMPTY })
      else { const p = PRESETS.find(x => x.id === id)!; const st = buildPreset(p); const seats = st.items.reduce((s, i) => s + (DEF[i.type]?.table ? seatsOf(i) : 0), 0); create(p.label, st, `${st.items.filter(i => DEF[i.type]?.table).length} Tische, ${seats} Plätze (automatisch gesetzt)`) }
    }, 30)
  }
  return <Modal close={close}>
    <p className="eyebrow">Raumplan</p><h2>Neue Variante</h2>
    <p>Die Tische werden automatisch in den Saal gesetzt – mit Abstand zu Wänden und Stützen. Bar, Anrichte in der Ausgabe, Kaffee, Rednerpult, Uplights an der Glasfront und eine Lounge in D-006a kommen dazu. Alles lässt sich danach verschieben.</p>
    <div className="preset-grid">
      {PRESETS.map(p => <button key={p.id} onClick={() => go(p.id)} disabled={!!busy}><b>{p.label}</b><small>{p.sub}</small>{busy === p.id && <em>setzt Tische…</em>}</button>)}
      <button onClick={() => go('empty')} disabled={!!busy}><b>Leerer Plan</b><small>nur Grundriss</small></button>
      {current && <button onClick={() => create('Kopie', current)} disabled={!!busy}><b>Kopie der aktuellen</b><small>zum Variieren</small></button>}
    </div>
  </Modal>
}
