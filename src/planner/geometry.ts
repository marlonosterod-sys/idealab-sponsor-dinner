import walls from './walls.json'

// Koordinaten in Metern. Quelle: Feuerwehrplan WHU Vallendar EG (2010), 5-m-Raster kalibriert.
// Genauigkeit ca. ±0,3 m – bei genaueren Maßen von Sara hier ersetzen.
export const VIEWBOX = walls.viewBox as [number, number, number, number]
export const WALL_BOXES = walls.boxes as [number, number, number, number][]
export const WALL_LINES = walls.lines as [number, number, number, number][]

export const ROOMS: { name: string; x: number; y: number; sub?: string; big?: boolean }[] = [
  { name: 'Mensa – Saal', x: 22.4, y: 34.6, big: true },
  { name: 'Wintergarten', x: 27.5, y: 38.9, sub: 'Glasfront, ab 19:15 dunkel' },
  { name: 'Ausgabe', x: 16.9, y: 27.6, sub: 'Anrichtestraße' },
  { name: 'D-006 Mensa', x: 9.8, y: 28.4 },
  { name: 'D-006a Lounge', x: 9.2, y: 35.4 },
  { name: 'D-012 Kochen', x: 22.8, y: 26.4 },
  { name: 'D-011 Vorbereitung', x: 28.6, y: 26.4 },
  { name: 'D-010 Spülen', x: 34.2, y: 26.4 },
  { name: 'Lager', x: 16.3, y: 20.8, sub: 'Außenzugang' },
  { name: 'D-009 Umkleide', x: 37.6, y: 34.9, sub: 'Crew' },
  { name: 'D-001 Hörsaal 1', x: 50.2, y: 35.6, sub: '50 Pers. · Nebenraum?' },
  { name: 'Fahrstuhl', x: 42.6, y: 33.4 },
]
export const MARKERS: { label: string; x: number; y: number }[] = [
  { label: '▲ Eingang Gäste (Burgplatz)', x: 42.6, y: 38.3 },
  { label: '▼ Anlieferung', x: 23.3, y: 23.0 },
]

// Saal für die automatische Tischstellung (Innenkante, ohne Ausgabe-Nische)
export const HALL = { x0: 13.7, y0: 32.4, x1: 35.9, y1: 39.45 }
// Zweiter Raum „D-006 Mensa“ (Nordteil) – nur falls mitgebucht
export const D006 = { x0: 5.9, y0: 24.1, x1: 13.2, y1: 32.9 }

export type Pt = [number, number]
export type Poly = Pt[]

export function rectPoly(cx: number, cy: number, w: number, d: number, rotDeg: number): Poly {
  const r = rotDeg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r)
  return ([[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]] as Pt[]).map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c])
}
export function circlePoly(cx: number, cy: number, r: number, n = 16): Poly {
  return Array.from({ length: n }, (_, i) => [cx + r * Math.cos(i / n * 2 * Math.PI), cy + r * Math.sin(i / n * 2 * Math.PI)] as Pt)
}
const bbox = (p: Poly) => { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const [x, y] of p) { if (x < a) a = x; if (y < b) b = y; if (x > c) c = x; if (y > d) d = y } return [a, b, c, d] }

function project(p: Poly, ax: number, ay: number) { let mn = Infinity, mx = -Infinity; for (const [x, y] of p) { const v = x * ax + y * ay; if (v < mn) mn = v; if (v > mx) mx = v } return [mn, mx] }
function sat(a: Poly, b: Poly) {
  for (const poly of [a, b]) for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length]
    const ax = -(y2 - y1), ay = x2 - x1
    const [a0, a1] = project(a, ax, ay), [b0, b1] = project(b, ax, ay)
    if (a1 < b0 || b1 < a0) return false
  }
  return true
}
function segIntersect(p: Pt, q: Pt, r: Pt, s: Pt) {
  const o = (a: Pt, b: Pt, c: Pt) => Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]))
  return o(p, q, r) !== o(p, q, s) && o(r, s, p) !== o(r, s, q)
}
function pointIn(pt: Pt, poly: Poly) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j]
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** Kollidiert das Polygon mit einer Wand oder Stütze aus dem Plan? */
export function hitsWall(poly: Poly) {
  const [a, b, c, d] = bbox(poly)
  for (const [x0, y0, x1, y1] of WALL_BOXES) {
    if (x1 < a || x0 > c || y1 < b || y0 > d) continue
    if (sat(poly, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]])) return true
  }
  for (const [x0, y0, x1, y1] of WALL_LINES) {
    if (Math.max(x0, x1) < a || Math.min(x0, x1) > c || Math.max(y0, y1) < b || Math.min(y0, y1) > d) continue
    for (let i = 0; i < poly.length; i++) if (segIntersect(poly[i], poly[(i + 1) % poly.length], [x0, y0], [x1, y1])) return true
    if (pointIn([x0, y0], poly)) return true
  }
  return false
}

function segDist(p: Pt, a: Pt, b: Pt) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy
  const t = l ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l)) : 0
  const x = a[0] + t * dx, y = a[1] + t * dy
  return [Math.hypot(p[0] - x, p[1] - y), x, y] as const
}
/** Minimaler Abstand zweier Polygone (0 bei Überlappung) + nächste Punkte */
export function polyDist(a: Poly, b: Poly): { d: number; p: Pt; q: Pt } {
  if (sat(a, b)) { const ca = centroid(a), cb = centroid(b); return { d: 0, p: ca, q: cb } }
  let best = { d: Infinity, p: [0, 0] as Pt, q: [0, 0] as Pt }
  const run = (A: Poly, B: Poly, flip: boolean) => {
    for (const pt of A) for (let i = 0; i < B.length; i++) {
      const [d, x, y] = segDist(pt, B[i], B[(i + 1) % B.length])
      if (d < best.d) best = flip ? { d, p: [x, y], q: pt } : { d, p: pt, q: [x, y] }
    }
  }
  run(a, b, false); run(b, a, true)
  return best
}
export const centroid = (p: Poly): Pt => [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length]
