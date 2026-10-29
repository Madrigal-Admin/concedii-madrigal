// Ajutoare pentru istoricul „Medicina muncii" și „Evaluări".

export const TIP_CONTROL = [
  { value: 'angajare', label: 'Angajare' },
  { value: 'periodic', label: 'Periodic' },
]

export const CALIFICATIVE = [
  { value: 'nesatisfacator', label: 'Nesatisfăcător' },
  { value: 'satisfacator', label: 'Satisfăcător' },
  { value: 'bine', label: 'Bine' },
  { value: 'foarte_bine', label: 'Foarte bine' },
]

export const eticheta = (opts, v) => opts.find((o) => o.value === v)?.label || ''

export const formatNota = (n) => (n === null || n === undefined || n === '' ? '' : String(n).replace('.', ','))

// "4,6" / "4.6" -> 4.6 ; gol -> null ; invalid -> NaN
export function parseNota(txt) {
  const t = String(txt ?? '').trim().replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  if (!Number.isFinite(n) || n < 1 || n > 5) return NaN
  return Math.round(n * 10) / 10
}

// Cel mai recent rând (după câmpul de dată).
export function ultima(randuri, campData) {
  let best = null
  for (const r of randuri || []) {
    if (r[campData] && (!best || r[campData] > best[campData])) best = r
  }
  return best
}

// Scadența = data + 12 luni (implicit).
export function scadenta(dataStr, luni = 12) {
  if (!dataStr) return null
  const [y, m, d] = dataStr.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1 + luni, d))
  // 29 feb -> 28 feb în anii fără 29 februarie
  if (t.getUTCMonth() !== (((m - 1 + luni) % 12) + 12) % 12) t.setUTCDate(0)
  return t.toISOString().slice(0, 10)
}

export const AZI_ISO = () => new Date().toISOString().slice(0, 10)

// { tip: 'ok' | 'curand' | 'depasit', zile } — zile până la scadență (negativ = depășit)
export function statusScadenta(scad, fereastra = 30) {
  if (!scad) return null
  const zile = Math.round((new Date(scad) - new Date(AZI_ISO())) / 86400000)
  if (zile < 0) return { tip: 'depasit', zile }
  if (zile <= fereastra) return { tip: 'curand', zile }
  return { tip: 'ok', zile }
}

export const normText = (t) =>
  (t || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
