// Toată logica de business a aplicației trăiește în acest fișier,
// ca să fie ușor de găsit și de modificat într-un singur loc.

export const LEAVE_TYPES = ['Odihnă', 'Medical', 'Fără Plată', 'Evenimente Speciale']

// Doar aceste tipuri de concediu scad din soldul de zile de odihnă.
// Medical și Fără Plată sunt informative, nu consumă soldul.
export const TYPES_THAT_DEDUCT_BALANCE = ['Odihnă', 'Evenimente Speciale']

// Calculează numărul de zile lucrătoare (luni-vineri) dintre două date, inclusiv.
export function countWorkingDays(startDate, endDate) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (isNaN(start) || isNaN(end) || end < start) return 0

  let count = 0
  const cur = new Date(start)
  while (cur <= end) {
    const day = cur.getDay() // 0 = duminică, 6 = sâmbătă
    if (day !== 0 && day !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

// 30 iunie a anului curent — data limită de expirare pentru zilele reportate
// din urmă cu 2 ani.
function june30(year) {
  return new Date(year, 5, 30, 23, 59, 59)
}

/**
 * Calculează soldul unui angajat, defalcat pe categorii, pe baza distribuției
 * REALE salvate la fiecare cerere aprobată (coloanele deducted_recoveries,
 * deducted_y2, deducted_y1, deducted_y). Distribuția e stabilită automat la
 * momentul aprobării (vezi computeDefaultSplit) și poate fi corectată manual
 * de un Admin din pagina Aprobări.
 *
 * @param {object} employee - rândul din tabela employees (are base_annual_days)
 * @param {array} approvedRequests - cererile APROBATE ale angajatului
 * @param {array} recoveries - rândurile din overtime_recoveries ale angajatului
 * @param {Date} asOf - data de referință (implicit azi)
 */
export function calculateBalance(employee, approvedRequests, recoveries, asOf = new Date()) {
  const currentYear = asOf.getFullYear()
  const yearY = currentYear
  const yearY1 = currentYear - 1
  const yearY2 = currentYear - 2

  const y2Expired = asOf > june30(currentYear)

  // Total de zile alocate în fiecare "găleată". Presupunem aceeași alocare
  // anuală de bază pentru toți cei 3 ani — dacă vrei alocări diferite per an,
  // poți extinde tabela employees cu coloane separate mai târziu.
  const base = Number(employee.base_annual_days) || 0

  const totalRecoveriesEarned = recoveries.reduce((s, r) => s + Number(r.days || 0), 0)

  const usedRecoveries = sumField(approvedRequests, 'deducted_recoveries')
  const usedY2 = sumField(approvedRequests, 'deducted_y2')
  const usedY1 = sumField(approvedRequests, 'deducted_y1')
  const usedY = sumField(approvedRequests, 'deducted_y')

  const poolRecoveries = totalRecoveriesEarned - usedRecoveries
  const poolY2 = (y2Expired ? 0 : base) - usedY2
  const poolY1 = base - usedY1
  const poolY = base - usedY

  const total = poolRecoveries + poolY2 + poolY1 + poolY
  const totalUsed = usedRecoveries + usedY2 + usedY1 + usedY

  return {
    year: yearY,
    yearY1,
    yearY2,
    y2Expired,
    recoveries: round1(poolRecoveries),
    y2: round1(poolY2),
    y1: round1(poolY1),
    y: round1(poolY),
    total: round1(total),
    totalUsed: round1(totalUsed),
    totalRecoveriesEarned: round1(totalRecoveriesEarned),
  }
}

function sumField(rows, field) {
  return rows.reduce((sum, r) => sum + Number(r[field] || 0), 0)
}

/**
 * Determină automat distribuția de zile la APROBAREA unei cereri, aplicând
 * ordinea strictă cerută: 1) Recuperări, 2) Y-2 (dacă nu a expirat),
 * 3) Y-1, 4) Y (poate deveni negativ). "pools" trebuie să conțină soldul
 * RĂMAS înainte de această cerere (adică balance.recoveries / y2 / y1 / y
 * calculate din cererile deja aprobate anterior).
 */
export function computeDefaultSplit(workingDaysToDeduct, pools) {
  let remaining = Number(workingDaysToDeduct) || 0

  const take = (available) => {
    const usable = Math.max(0, available)
    const used = Math.min(usable, remaining)
    remaining -= used
    return round1(used)
  }

  const recoveries = take(pools.recoveries)
  const y2 = take(pools.y2)
  const y1 = take(pools.y1)
  const y = round1(remaining) // ce mai rămâne merge pe anul curent, chiar și negativ ca sold rezultat

  return { recoveries, y2, y1, y }
}

function round1(n) {
  return Math.round(n * 10) / 10
}

export function formatDate(d) {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export const STATUS_LABELS = {
  pending: 'În așteptare',
  approved: 'Aprobat',
  rejected: 'Respins',
}

export const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  rejected: 'bg-rose-100 text-rose-800 border-rose-200',
}
