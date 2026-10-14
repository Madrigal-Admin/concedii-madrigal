export const LUNI = [
  'ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
  'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie',
]

export const numeLuna = (luna) => LUNI[(luna || 1) - 1] || ''
export const etichetaPerioada = (luna, an) => `${numeLuna(luna)} ${an}`

export function formatData(valoare) {
  if (!valoare) return ''
  const d = new Date(valoare)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatDataOra(valoare) {
  if (!valoare) return ''
  const d = new Date(valoare)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
