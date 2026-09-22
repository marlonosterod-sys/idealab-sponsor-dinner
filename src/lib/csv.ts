export function downloadCSV(name: string, rows: Record<string, any>[], cols: string[]) {
  const esc = (v: unknown) => { const s = Array.isArray(v) ? v.join(', ') : v == null ? '' : String(v); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
  const csv = '﻿' + [cols.join(';'), ...rows.map(r => cols.map(c => esc(r[c])).join(';'))].join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
