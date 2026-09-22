import { circlePoly, rectPoly, type Poly } from './geometry'

export type SeatMode = 'long' | 'round' | 'one' | 'none'
export interface Def {
  id: string; label: string; cat: string; w: number; d: number; shape: 'rect' | 'circle'
  color: string; seats?: number; seatMode?: SeatMode; ends?: boolean; light?: 'warm' | 'spot'
  resize?: 'w' | 'both' | 'none'; table?: boolean; under?: boolean; hint?: string
}
export const CATS = ['Tische', 'Sitzen & Lounge', 'Service & Küche', 'Licht', 'Deko', 'Technik', 'Infrastruktur'] as const

export const DEFS: Def[] = [
  // Tische
  { id: 'rund180', label: 'Rundtisch Ø 1,80', cat: 'Tische', w: 1.8, d: 1.8, shape: 'circle', color: '#8a8175', seats: 10, seatMode: 'round', table: true, hint: '8–10 Plätze' },
  { id: 'rund160', label: 'Rundtisch Ø 1,60', cat: 'Tische', w: 1.6, d: 1.6, shape: 'circle', color: '#8a8175', seats: 8, seatMode: 'round', table: true, hint: '7–8 Plätze' },
  { id: 'bankett', label: 'Banketttisch 1,80 × 0,80', cat: 'Tische', w: 1.8, d: 0.8, shape: 'rect', color: '#8a8175', seats: 6, seatMode: 'long', table: true, resize: 'w', hint: 'Länge variabel → Tafel' },
  { id: 'tafel', label: 'Tafel 5,40 × 0,80', cat: 'Tische', w: 5.4, d: 0.8, shape: 'rect', color: '#8a8175', seats: 16, seatMode: 'long', ends: true, table: true, resize: 'w', hint: '3 Tische, 70 cm/Platz' },
  { id: 'block', label: 'Tischblock 1,60 × 1,60', cat: 'Tische', w: 1.6, d: 1.6, shape: 'rect', color: '#8a8175', seats: 8, seatMode: 'long', ends: true, table: true, resize: 'both', hint: '2 Tische nebeneinander' },
  { id: 'steh', label: 'Stehtisch Ø 0,70', cat: 'Tische', w: 0.7, d: 0.7, shape: 'circle', color: '#9a9083' },
  // Sitzen & Lounge
  { id: 'stuhl', label: 'Stuhl', cat: 'Sitzen & Lounge', w: 0.45, d: 0.5, shape: 'rect', color: '#7b6e63' },
  { id: 'sofa2', label: 'Sofa 2-Sitzer', cat: 'Sitzen & Lounge', w: 1.6, d: 0.85, shape: 'rect', color: '#6b5d52', resize: 'w' },
  { id: 'sofa3', label: 'Sofa 3-Sitzer', cat: 'Sitzen & Lounge', w: 2.1, d: 0.9, shape: 'rect', color: '#6b5d52', resize: 'w' },
  { id: 'sessel', label: 'Sessel', cat: 'Sitzen & Lounge', w: 0.85, d: 0.85, shape: 'rect', color: '#6b5d52' },
  { id: 'couch', label: 'Couchtisch', cat: 'Sitzen & Lounge', w: 1.0, d: 0.6, shape: 'rect', color: '#a39888' },
  { id: 'teppich', label: 'Teppich / Lounge-Fläche', cat: 'Sitzen & Lounge', w: 3.0, d: 2.0, shape: 'rect', color: '#c9b99a', resize: 'both', under: true },
  // Service
  { id: 'bar', label: 'Bar / Theke', cat: 'Service & Küche', w: 2.0, d: 0.6, shape: 'rect', color: '#35ab32', resize: 'w' },
  { id: 'anrichte', label: 'Anrichtestraße', cat: 'Service & Küche', w: 3.0, d: 0.8, shape: 'rect', color: '#c0703a', resize: 'w', hint: '2 Wellen à 35 Teller' },
  { id: 'kaffee', label: 'Kaffeestation', cat: 'Service & Küche', w: 1.6, d: 0.7, shape: 'rect', color: '#8b5a3c' },
  { id: 'abraeum', label: 'Abräumstation', cat: 'Service & Küche', w: 1.2, d: 0.6, shape: 'rect', color: '#a0522d', hint: 'außer Sicht der Gäste' },
  { id: 'kuehl', label: 'Getränke / Eisboxen', cat: 'Service & Küche', w: 1.2, d: 0.6, shape: 'rect', color: '#3a7ca5' },
  { id: 'leergut', label: 'Leergut / Müll', cat: 'Service & Küche', w: 0.8, d: 0.4, shape: 'rect', color: '#666' },
  // Licht
  { id: 'uplight', label: 'Uplight (warm)', cat: 'Licht', w: 0.3, d: 0.3, shape: 'circle', color: '#e0a526', light: 'warm', hint: 'an Wand / Glasfront' },
  { id: 'spot', label: 'Scheinwerfer', cat: 'Licht', w: 0.45, d: 0.45, shape: 'circle', color: '#f2c14e', light: 'spot' },
  { id: 'stehleuchte', label: 'Stehleuchte', cat: 'Licht', w: 0.4, d: 0.4, shape: 'circle', color: '#e8b04a', light: 'warm' },
  { id: 'kette', label: 'Lichterkette warmweiß', cat: 'Licht', w: 4.0, d: 0.06, shape: 'rect', color: '#f0b429', light: 'warm', resize: 'w' },
  // Deko
  { id: 'pflanze', label: 'Pflanze / Grün', cat: 'Deko', w: 0.6, d: 0.6, shape: 'circle', color: '#5f8a4f' },
  { id: 'welcome', label: 'Welcome-Board', cat: 'Deko', w: 0.7, d: 0.3, shape: 'rect', color: '#9e68fa' },
  { id: 'rollup', label: 'Roll-up Sponsoren', cat: 'Deko', w: 0.85, d: 0.3, shape: 'rect', color: '#9e68fa' },
  { id: 'fotowand', label: 'Foto-Wand / Backdrop', cat: 'Deko', w: 2.4, d: 0.3, shape: 'rect', color: '#7442c9', resize: 'w' },
  // Technik
  { id: 'pult', label: 'Rednerpult + Mikro', cat: 'Technik', w: 0.6, d: 0.5, shape: 'rect', color: '#1e1e1e' },
  { id: 'box', label: 'Lautsprecher', cat: 'Technik', w: 0.4, d: 0.4, shape: 'rect', color: '#333' },
  { id: 'musik', label: 'Musik-Tisch', cat: 'Technik', w: 1.2, d: 0.6, shape: 'rect', color: '#444' },
  { id: 'leinwand', label: 'Leinwand / Screen', cat: 'Technik', w: 2.4, d: 0.2, shape: 'rect', color: '#555', resize: 'w' },
  // Infrastruktur
  { id: 'garderobe', label: 'Garderobe', cat: 'Infrastruktur', w: 1.5, d: 0.5, shape: 'rect', color: '#5f6a5b', resize: 'w' },
  { id: 'stellwand', label: 'Stellwand / Sichtschutz', cat: 'Infrastruktur', w: 2.0, d: 0.1, shape: 'rect', color: '#5f6a5b', resize: 'w' },
  { id: 'strom', label: 'Verteiler / Strom', cat: 'Infrastruktur', w: 0.3, d: 0.2, shape: 'rect', color: '#b23a3f' },
]
export const DEF: Record<string, Def> = Object.fromEntries(DEFS.map(d => [d.id, d]))

export interface Placed { uid: string; type: string; x: number; y: number; w: number; d: number; rot: number; seats?: number; label?: string }
export interface Zone { uid: string; x: number; y: number; w: number; h: number; label: string; color: string; lead: string }
export interface PlanState { items: Placed[]; zones: Zone[]; seq: number; info?: { inHall: number; extra: number } }
export const EMPTY: PlanState = { items: [], zones: [], seq: 1 }

export const CHAIR = { w: 0.45, d: 0.45, gap: 0.08 }

/** Stuhlpositionen relativ zur Tischmitte (unrotiert) */
export function chairs(p: Placed): { x: number; y: number; a: number }[] {
  const def = DEF[p.type]; if (!def?.table) return []
  const n = Math.max(0, p.seats ?? def.seats ?? 0)
  if (!n) return []
  if (def.shape === 'circle') {
    const R = p.w / 2 + CHAIR.d / 2 + CHAIR.gap
    return Array.from({ length: n }, (_, i) => { const a = i / n * 2 * Math.PI - Math.PI / 2; return { x: R * Math.cos(a), y: R * Math.sin(a), a: a * 180 / Math.PI + 90 } })
  }
  const ends = def.ends && n >= 4 ? 2 : 0
  const side = n - ends, top = Math.ceil(side / 2), bottom = Math.floor(side / 2)
  const out: { x: number; y: number; a: number }[] = []
  const row = (k: number, y: number, a: number) => { for (let i = 0; i < k; i++) out.push({ x: -p.w / 2 + p.w * (i + 0.5) / k, y, a }) }
  row(top, -p.d / 2 - CHAIR.d / 2 - CHAIR.gap, 0)
  row(bottom, p.d / 2 + CHAIR.d / 2 + CHAIR.gap, 180)
  if (ends) { out.push({ x: -p.w / 2 - CHAIR.d / 2 - CHAIR.gap, y: 0, a: -90 }); out.push({ x: p.w / 2 + CHAIR.d / 2 + CHAIR.gap, y: 0, a: 90 }) }
  return out
}

/** Grundfläche inkl. Stühlen – für Wand- und Abstandsprüfung */
export function footprint(p: Placed, withChairs = true): Poly {
  const def = DEF[p.type]
  const extra = withChairs && def?.table && (p.seats ?? def.seats ?? 0) > 0 ? CHAIR.d + CHAIR.gap : 0
  if (def?.shape === 'circle') return circlePoly(p.x, p.y, p.w / 2 + extra)
  const ends = def?.ends ? extra : 0
  return rectPoly(p.x, p.y, p.w + 2 * ends, p.d + 2 * extra, p.rot)
}
export const bodyPoly = (p: Placed): Poly => DEF[p.type]?.shape === 'circle' ? circlePoly(p.x, p.y, p.w / 2) : rectPoly(p.x, p.y, p.w, p.d, p.rot)

export const seatsOf = (p: Placed) => DEF[p.type]?.table ? (p.seats ?? DEF[p.type].seats ?? 0) : p.type === 'stuhl' ? 1 : p.type === 'sofa2' ? 2 : p.type === 'sofa3' ? 3 : p.type === 'sessel' ? 1 : 0
export const ZONE_COLORS = ['#9e68fa', '#35ab32', '#3a7ca5', '#c0703a', '#e0a526', '#b23a3f', '#5f6a5b']
