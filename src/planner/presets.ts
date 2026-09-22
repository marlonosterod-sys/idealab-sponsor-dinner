import { DEF, footprint, type PlanState, type Placed, type Zone, ZONE_COLORS } from './elements'
import { D006, HALL, hitsWall, polyDist, type Poly } from './geometry'

export interface Preset { id: string; label: string; sub: string; table: string; seats: number; count: number; rot?: number }
export const PRESETS: Preset[] = [
  { id: 'r8x9', label: 'Rund · 8 × 9', sub: 'Ø 1,80 · 72 Plätze · kommunikativ', table: 'rund180', seats: 9, count: 8 },
  { id: 'r7x10', label: 'Rund · 7 × 10', sub: 'Ø 1,80 · 70 Plätze · maximal', table: 'rund180', seats: 10, count: 7 },
  { id: 'r10x7', label: 'Rund · 10 × 7', sub: 'Ø 1,60 · 70 Plätze · viel Fläche', table: 'rund160', seats: 7, count: 10 },
  { id: 'tafel', label: 'Tafeln quer · 5 × 14', sub: 'je 3 Banketttische, quer zum Saal · 70 Plätze', table: 'tafel', seats: 14, count: 5, rot: 90 },
  { id: 'block', label: 'Tischblöcke · 9 × 8', sub: '2 Tische 1,60 × 1,60 · 72 Plätze', table: 'block', seats: 8, count: 9 },
]

let n = 0
const uid = () => `u${Date.now().toString(36)}${(n++).toString(36)}`
const mk = (type: string, x: number, y: number, rot = 0, extra: Partial<Placed> = {}): Placed => ({ uid: uid(), type, x, y, rot, w: DEF[type].w, d: DEF[type].d, ...extra })

/** Service-Infrastruktur, die in jeder Variante gleich ist */
export function baseItems(): Placed[] {
  const items: Placed[] = [
    mk('anrichte', 17.0, 29.6, 0, { label: 'Anrichte W1/W2' }),
    mk('kaffee', 14.9, 29.6, 0),
    mk('abraeum', 19.3, 26.0, 0),
    mk('kuehl', 14.6, 26.0, 0),
    mk('bar', 35.2, 33.4, 90, { label: 'Bar' }),
    mk('leergut', 35.35, 35.1, 90),
    mk('pult', 14.5, 35.0, 90),
    mk('box', 14.2, 32.6, 0), mk('box', 14.2, 39.1, 0),
    mk('welcome', 37.0, 38.6, 0),
    // Lounge in D-006a
    mk('teppich', 9.4, 35.4, 0, { w: 3.2, d: 2.4 }),
    mk('sofa3', 9.4, 34.1, 0), mk('sessel', 7.9, 35.8, 90), mk('sessel', 10.9, 35.8, -90), mk('couch', 9.4, 35.5, 0),
    mk('stehleuchte', 7.6, 34.0, 0), mk('pflanze', 11.2, 34.0, 0),
  ]
  // Uplights entlang der Glasfront (gegen die schwarze Scheibe)
  for (let x = 15.5; x < 35.5; x += 3.3) items.push(mk('uplight', +x.toFixed(2), 39.25, 0))
  items.push(mk('kette', 24.8, 32.15, 0, { w: 9.0 }))
  return items
}

export function buildPreset(p: Preset): PlanState {
  const base = baseItems()
  const obstacles: Poly[] = base.filter(b => !DEF[b.type].under && !DEF[b.type].light).map(b => footprint(b))
  const def = DEF[p.table]
  const rot = p.rot || 0
  const probe = mk(p.table, 0, 0, rot, { seats: p.seats })
  const round = def.shape === 'circle'
  let fx = round ? def.w + 1.06 : def.w + (def.ends ? 1.06 : 0)
  let fy = round ? def.w + 1.06 : def.d + 1.06
  if (rot === 90) [fx, fy] = [fy, fx]
  const aisle = round ? 0.9 : 1.0
  const margin = rot === 90 ? 0.05 : 0.12
  const placed: Placed[] = []
  const fill = (R: { x0: number; y0: number; x1: number; y1: number }, room: string) => {
    const depth = R.y1 - R.y0 - 2 * margin
    const nRows = Math.max(1, Math.floor((depth + aisle) / (fy + aisle)))
    const free = depth - nRows * fy, gapY = nRows > 1 ? free / (nRows - 1) : 0
    for (let r = 0; r < nRows && placed.length < p.count; r++) {
      const y = nRows > 1 ? R.y0 + margin + fy / 2 + r * (fy + gapY) : (R.y0 + R.y1) / 2
      for (let x = R.x0 + fx / 2 + margin; x <= R.x1 - fx / 2 - margin + 1e-6 && placed.length < p.count; x += 0.05) {
        const t = { ...probe, uid: uid(), x: +x.toFixed(2), y: +y.toFixed(2), label: room }
        const fp = footprint(t)
        if (hitsWall(fp)) continue
        if (obstacles.some(o => polyDist(o, fp).d < 0.5)) continue
        if (placed.some(c => Math.abs(c.y - t.y) < fy + aisle && polyDist(footprint(c), fp).d < aisle)) continue
        placed.push(t); x += fx + aisle - 0.05
      }
    }
  }
  fill(HALL, 'Saal')
  const inHall = placed.length
  fill(D006, 'D-006')
  const tables = [...placed].sort((a, b) => (a.label === b.label ? 0 : a.label === 'Saal' ? -1 : 1) || a.x - b.x || a.y - b.y).map((t, i) => ({ ...t, label: `T${i + 1}` }))
  const zones: Zone[] = []
  const groups: Placed[][] = []
  const hallT = tables.slice(0, inHall).sort((a, b) => a.x - b.x), extraT = tables.slice(inHall)
  const per = Math.max(2, Math.ceil(hallT.length / 3))
  for (let z = 0; z * per < hallT.length; z++) groups.push(hallT.slice(z * per, (z + 1) * per))
  if (extraT.length) groups.push(extraT)
  groups.forEach((grp, z) => {
    const pts = grp.flatMap(g => footprint(g)), xs = pts.map(q => q[0]), ys = pts.map(q => q[1])
    const zx = Math.min(...xs) - 0.2, zy = Math.min(...ys) - 0.2
    zones.push({ uid: uid(), x: +zx.toFixed(2), y: +zy.toFixed(2), w: +(Math.max(...xs) - zx + 0.2).toFixed(2), h: +(Math.max(...ys) - zy + 0.2).toFixed(2), label: `Service ${String.fromCharCode(65 + z)} · ${grp.map(g => g.label).sort((a, b) => +a!.slice(1) - +b!.slice(1)).join(', ')}${grp === extraT ? ' (D-006)' : ''}`, color: ZONE_COLORS[z % ZONE_COLORS.length], lead: '' })
  })
  zones.push({ uid: uid(), x: 13.4, y: 25.0, w: 7.0, h: 5.4, label: 'Küche · Anrichte', color: '#c0703a', lead: '' })
  zones.push({ uid: uid(), x: 34.4, y: 31.4, w: 1.7, h: 4.3, label: 'Bar', color: '#35ab32', lead: '' })
  zones.push({ uid: uid(), x: 7.3, y: 33.4, w: 4.3, h: 3.6, label: 'Lounge', color: '#e0a526', lead: '' })
  return { items: [...base.filter(b => DEF[b.type].under), ...tables, ...base.filter(b => !DEF[b.type].under)], zones, seq: tables.length + 1, info: { inHall, extra: extraT.length } } as PlanState
}
