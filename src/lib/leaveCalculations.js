// Toată logica de business a aplicației trăiește în acest fișier,
// ca să fie ușor de găsit și de modificat într-un singur loc.

export const LEAVE_TYPES = ['Odihnă', 'Medical', 'Fără Plată', 'Evenimente Speciale']

// Angajații, din formularul public, nu pot alege "Medical" — doar Adminul
// poate introduce concedii medicale (are nevoie de Serie și număr / Cod
// indemnizație, câmpuri suplimentare disponibile doar în Panoul Admin).
export const PUBLIC_LEAVE_TYPES = LEAVE_TYPES.filter((t) => t !== 'Medical')

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

// Calculează numărul de zile CALENDARISTICE (toate, inclusiv weekend) dintre
// două date, inclusiv — folosit pentru concediul medical.
export function countCalendarDays(startDate, endDate) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (isNaN(start) || isNaN(end) || end < start) return 0
  return Math.round((end - start) / 86400000) + 1
}

function isSameOrBetween(date, start, end) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return d >= start && d <= end
}

function isLegalHoliday(date, legalHolidays) {
  return (legalHolidays || []).some((h) => {
    const start = new Date(h.start_date)
    const end = new Date(h.end_date)
    return isSameOrBetween(date, start, end)
  })
}

/**
 * Calculează numărul de zile care se scad dintr-o cerere de concediu,
 * ținând cont de tipul de concediu:
 *  - Medical: zile CALENDARISTICE, indiferent de weekend sau zile libere legale
 *  - Odihnă: zile lucrătoare, excluzând weekendurile ȘI zilele libere legale
 *    care cad în cursul săptămânii
 *  - Fără Plată / Evenimente Speciale: zile lucrătoare, excluzând doar weekendurile
 */
export function countLeaveDays(leaveType, startDate, endDate, legalHolidays = []) {
  if (leaveType === 'Medical') return countCalendarDays(startDate, endDate)

  const start = new Date(startDate)
  const end = new Date(endDate)
  if (isNaN(start) || isNaN(end) || end < start) return 0

  let count = 0
  const cur = new Date(start)
  while (cur <= end) {
    const day = cur.getDay()
    const isWeekend = day === 0 || day === 6
    const isExcludedHoliday = leaveType === 'Odihnă' && isLegalHoliday(cur, legalHolidays)
    if (!isWeekend && !isExcludedHoliday) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

// 30 iunie a anului curent — data limită de expirare pentru zilele reportate
// din urmă cu 2 ani.
function june30(year) {
  return new Date(year, 5, 30, 23, 59, 59)
}

// Alocarea pentru un an calendaristic REAL. Dacă există un rând explicit în
// year_allocations pentru acel an, îl folosește; altfel presupune alocarea
// de bază a angajatului — exact mecanismul care face ca un an nou să capete
// automat, pe 1 ianuarie, o alocare implicită, fără nicio intervenție manuală.
function allocationForYear(yearAllocations, employee, year) {
  const row = (yearAllocations || []).find((a) => a.year === year)
  if (row) return Number(row.days) || 0
  return Number(employee.base_annual_days) || 0
}

function usedForYear(approvedRequests, year) {
  return approvedRequests.reduce((s, r) => s + Number((r.deduction && r.deduction[String(year)]) || 0), 0)
}

/**
 * Calculează soldul unui angajat, defalcat pe categorii, ancorat de ANI
 * CALENDARISTICI REALI — nu relativ la "azi". Asta face ca:
 *  - pe 1 ianuarie, anul curent să treacă automat mai departe
 *  - pe 30 iunie, zilele din urmă cu 2 ani să expire automat
 * fără nicio acțiune manuală.
 *
 * @param {object} employee - rândul din tabela employees (are base_annual_days, opening_recoveries)
 * @param {array} approvedRequests - cererile APROBATE ale angajatului (cu coloana "deduction")
 * @param {array} recoveries - rândurile din overtime_recoveries ale angajatului
 * @param {array} yearAllocations - rândurile din year_allocations ale angajatului
 * @param {Date} asOf - data de referință (implicit azi)
 */
export function calculateBalance(employee, approvedRequests, recoveries, yearAllocations, asOf = new Date()) {
  const currentYear = asOf.getFullYear()
  const yearY = currentYear
  const yearY1 = currentYear - 1
  const yearY2 = currentYear - 2

  const y2Expired = asOf > june30(currentYear)

  const openingRecoveries = Number(employee.opening_recoveries) || 0
  const totalRecoveriesEarned = openingRecoveries + recoveries.reduce((s, r) => s + Number(r.days || 0), 0)
  const usedRecoveries = approvedRequests.reduce((s, r) => s + Number((r.deduction && r.deduction.recoveries) || 0), 0)

  const usedY2 = usedForYear(approvedRequests, yearY2)
  const usedY1 = usedForYear(approvedRequests, yearY1)
  const usedY = usedForYear(approvedRequests, yearY)

  const allocY2 = allocationForYear(yearAllocations, employee, yearY2)
  const allocY1 = allocationForYear(yearAllocations, employee, yearY1)
  const allocY = allocationForYear(yearAllocations, employee, yearY)

  const poolRecoveries = totalRecoveriesEarned - usedRecoveries
  const poolY2 = (y2Expired ? 0 : allocY2) - usedY2
  const poolY1 = allocY1 - usedY1
  const poolY = allocY - usedY

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

/**
 * Determină automat distribuția de zile la APROBAREA unei cereri, aplicând
 * ordinea strictă cerută: 1) Recuperări, 2) Y-2 (dacă nu a expirat),
 * 3) Y-1, 4) Y (poate deveni negativ). "pools" trebuie să conțină soldul
 * RĂMAS înainte de această cerere (rezultatul lui calculateBalance).
 * Întoarce valorile pe categorii relative — apelantul le leagă de anii
 * reali (pools.yearY2 / pools.yearY1 / pools.year) când le salvează.
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

/** Construiește obiectul "deduction" (jsonb) pornind de la un split relativ + anii reali. */
export function splitToDeduction(split, pools) {
  return {
    recoveries: split.recoveries || 0,
    [String(pools.yearY2)]: split.y2 || 0,
    [String(pools.yearY1)]: split.y1 || 0,
    [String(pools.year)]: split.y || 0,
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
