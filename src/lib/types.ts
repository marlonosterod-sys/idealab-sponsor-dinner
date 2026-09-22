export const TASK_STATUS = ['offen', 'in Arbeit', 'wartet', 'erledigt', 'entfällt'] as const
export const PRIORITY = ['hoch', 'mittel', 'niedrig'] as const
export const MAT_STATUS = ['offen', 'angefragt', 'bestellt', 'geklärt', 'vor Ort', 'zurückgegeben', 'entfällt'] as const
export const AREAS = ['Rahmen', 'Material', 'Anlieferung', 'Aufbau', 'Empfang', 'Essen & Service', 'Programm', 'Getränke', 'Ende & Abbau', 'Nachbereitung'] as const
export const MAT_CATS = ['Essen', 'Geschirr', 'Gläser', 'Tisch', 'Deko', 'Druck', 'Technik', 'Getränke', 'Kleinkram', 'Crew', 'Sonstiges'] as const
export const OWNERS = ['Marlon Osterod', 'Luis Wittbrock', 'Beide']

export interface Task { id: string; title: string; area: string; owner: string; contact: string; status: string; priority: string; due: string | null; answer: string; notes: string; sort: number; created_at: string; updated_at: string }
export interface Material { id: string; item: string; category: string; quantity: string; source: string; needed_when: string; location: string; owner: string; status: string; notes: string; sort: number; updated_at: string }
export interface Contact { id: string; name: string; role: string; org: string; phone: string; email: string; responsible_for: string; notes: string; sort: number }
export interface ScheduleItem { id: string; kind: 'abend' | 'woche' | 'deadline'; day: string; start_time: string; end_time: string; phase: string; title: string; who: string; notes: string; flagged: boolean }
export interface CrewMember { id: string; name: string; shifts: string[]; role: string; zone: string; phone: string; confirmed: boolean; notes: string }
export interface Shift { id: string; label: string; start_time: string; end_time: string; whatsapp: string; lead: string; sort: number }
export interface FloorVariant { id: string; name: string; note: string; state: any; is_final: boolean; updated_at: string }
export interface Activity { id: number; entity_type: string; entity_id: string; action: string; summary: string; actor: string; created_at: string }

export type TableName = 'tasks' | 'materials' | 'contacts' | 'schedule' | 'crew' | 'shifts' | 'floor_variants'

export const EVENT = {
  title: 'Sponsor Dinner',
  sub: "WHU Founders' Conference",
  start: '2026-09-26T19:00:00+02:00',
  place: 'Neue Mensa, Burgplatz 2, 56179 Vallendar',
  guests: 70, veg: 10,
}
