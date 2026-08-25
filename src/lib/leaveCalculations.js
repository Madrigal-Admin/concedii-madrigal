// Toată logica de business a aplicației trăiește în acest fișier,
// ca să fie ușor de găsit și de modificat într-un singur loc.

export const LEAVE_TYPES = ['Odihnă', 'Medical', 'Fără Plată', 'Evenimente Speciale']

// Doar aceste tipuri de concediu scad din soldul de zile de odihnă.
// Medical și Fără Plată sunt informative, nu consumă soldul.
const TYPES_THAT_DEDUCT_BALANCE = ['Odihnă', 'Evenimente Speciale']

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
 * Calculează soldul unui angajat, defalcat pe categorii, aplicând ordinea
 * strictă de scădere cerută:
 *   1. Recuperări (ore suplimentare)
 *   2. Zile din urmă cu 2 ani (Y-2) — dacă nu au expirat (înainte de 30 iunie)
 *   3. Zile din anul trecut (Y-1)
 *   4. Zile din anul curent (Y) — poate deveni negativ
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

  let poolRecoveries = recoveries.reduce((sum, r) => sum + Number(r.days || 0), 0)
  let poolY2 = y2Expired ? 0 : base
  let poolY1 = base
  let poolY = base

  // Totalul de zile de dedus, din toate cererile aprobate care consumă sold.
  const totalToDeduct = approvedRequests
    .filter((r) => TYPES_THAT_DEDUCT_BALANCE.includes(r.leave_type))
    .reduce((sum, r) => sum + Number(r.working_days || 0), 0)

  let remaining = totalToDeduct

  const takeFrom = (pool) => {
    const used = Math.min(pool, remaining)
    remaining -= used
    return pool - used
  }

  poolRecoveries = takeFrom(poolRecoveries)
  poolY2 = takeFrom(poolY2)
  poolY1 = takeFrom(poolY1)
  // Din anul curent scade tot ce a mai rămas, chiar dacă devine negativ.
  poolY = poolY - remaining

  const total = poolRecoveries + poolY2 + poolY1 + poolY

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
    totalUsed: round1(totalToDeduct),
    totalRecoveriesEarned: round1(recoveries.reduce((s, r) => s + Number(r.days || 0), 0)),
  }
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
