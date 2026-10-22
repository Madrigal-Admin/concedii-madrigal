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

export const CERTIFICATE_TYPES = [
  'Adeverință de vechime',
  'Adeverință de salariu',
  'Adeverință de salariat',
  'Fluturaș de salariu',
]

export const DELIVERY_METHODS = ['Pe mail-ul personal', 'Ridicare de la biroul Resurse Umane']

export const CERTIFICATE_STATUS_LABELS = {
  pending: 'În așteptare',
  issued: 'Eliberată',
}

export const CERTIFICATE_STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  issued: 'bg-emerald-100 text-emerald-800 border-emerald-200',
}

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

// Câmpurile care aparțin CONTRACTULUI (tabela hr_contracte). Restul câmpurilor
// din hr_profil_angajat (CNP, IBAN, act de identitate, sex, recuperări etc.)
// aparțin PERSOANEI.
export const CONTRACT_FIELDS = [
  'numar_contract',
  'data_inceput_contract',
  'tip_contract',
  'obiect_contract',
  'data_final_contract',
  'grad',
  'atributie_id',
  'attribution',
  'norma_ore',
  'interval_ora_inceput',
  'interval_ora_sfarsit',
  'are_fisa_postului',
  'functie_de_baza',
  'zile_concediu_baza_an',
  'sold_an_minus_2',
  'sold_an_minus_1',
  'sold_an_curent',
  'an_referinta',
]

/** Toate contractele angajatului, cel principal primul. */
export function getContracte(employee) {
  const lista = Array.isArray(employee?.hr_contracte) ? [...employee.hr_contracte] : []
  return lista.sort((a, b) => {
    if (a.este_principal !== b.este_principal) return a.este_principal ? -1 : 1
    return String(a.data_inceput_contract || '').localeCompare(String(b.data_inceput_contract || ''))
  })
}

export function getContractPrincipal(employee) {
  const lista = getContracte(employee)
  return lista.find((c) => c.este_principal) || lista[0] || null
}

/** Contractul e în vigoare în (cel puțin o zi din) perioada dată? */
export function contractActivInPerioada(contract, startDate, endDate) {
  const inceput = contract.data_inceput_contract
  const final = contract.data_final_contract
  if (inceput && inceput > endDate) return false
  if (final && final < startDate) return false
  return true
}

/** Etichetă scurtă pentru un contract, ex.: "Referent · nr. 12/2024". */
export function etichetaContract(contract, idx) {
  if (!contract) return 'Contract'
  const parti = []
  const atributie = contract.attribution?.name
  if (atributie) parti.push(atributie)
  if (contract.numar_contract) parti.push(`nr. ${contract.numar_contract}`)
  if (parti.length === 0) parti.push(`Contract ${typeof idx === 'number' ? idx + 1 : ''}`.trim())
  return parti.join(' · ') + (contract.este_principal ? ' (principal)' : '')
}

// hr_profil_angajat vine ca obiect unic sau ca array cu un element, în
// funcție de cum a fost făcut join-ul Supabase — normalizăm aici o singură
// dată.
// Întoarce datele PERSONALE ale angajatului, la care se adaugă (pentru
// compatibilitate cu ecranele existente) câmpurile CONTRACTULUI PRINCIPAL.
export function getHrProfil(employee) {
  const p = employee?.hr_profil_angajat
  const personal = (Array.isArray(p) ? p[0] : p) || {}
  const principal = getContractPrincipal(employee)
  if (!principal) return personal

  const supra = {}
  for (const k of CONTRACT_FIELDS) {
    if (k in principal) supra[k] = principal[k]
  }
  return { ...personal, ...supra }
}

// Cât s-a scăzut dintr-un contract, pe ani, dintr-o cerere aprobată.
// Format nou: { recoveries, contracte: { <id>: { "2025": 1, ... } } }.
// Format vechi (cereri dinainte de contractele multiple): { recoveries,
// "2025": 1, ... } — se consideră scăzut din contractul principal.
function aniScazutiDinContract(deduction, contractId, principalId) {
  const d = deduction || {}
  if (d.contracte) return d.contracte[contractId] || {}
  if (contractId === principalId) {
    // eslint-disable-next-line no-unused-vars
    const { recoveries, ...ani } = d
    return ani
  }
  return {}
}

function usedForYear(approvedRequests, year, contractId, principalId) {
  return approvedRequests.reduce(
    (s, r) => s + Number(aniScazutiDinContract(r.deduction, contractId, principalId)[String(year)] || 0),
    0
  )
}

/**
 * Calculează soldul unui angajat, defalcat pe categorii, ancorat de ANI
 * CALENDARISTICI REALI — nu relativ la "azi".
 *
 * Expirarea la 30 iunie a soldului de-acum-2-ani rămâne complet automată
 * (y2Expired mai jos), exact ca înainte.
 *
 * Spre deosebire de vechiul mecanism (year_allocations), avansarea anuală a
 * celor 3 solduri (hr_profil_angajat.sold_an_minus_2/1/curent) NU se mai
 * întâmplă singură la 1 ianuarie — un admin trebuie să apese butonul
 * "Trece la anul nou" din tab-ul Angajați (vezi rollover_hr_profil_angajat
 * în migration_hub_hr_faza6b_rollover_an.sql).
 *
 * @param {object} employee - rândul din tabela angajati, cu join hr_profil_angajat(*)
 * @param {array} approvedRequests - cererile APROBATE ale angajatului (cu coloana "deduction")
 * @param {array} recoveries - rândurile din overtime_recoveries ale angajatului
 * @param {Date} asOf - data de referință (implicit azi)
 */
export function calculateBalance(employee, approvedRequests, recoveries, asOf = new Date(), contract = null) {
  // Recuperările sunt la PERSOANĂ (hr_profil_angajat); zilele pe ani sunt la
  // CONTRACT. Fără contract specificat se folosește cel principal.
  const personal = getHrProfil({ hr_profil_angajat: employee?.hr_profil_angajat })
  const principal = getContractPrincipal(employee)
  const c = contract || principal || {}
  const principalId = principal?.id
  const profil = { ...personal, ...c }
  const currentYear = asOf.getFullYear()
  const yearY = currentYear
  const yearY1 = currentYear - 1
  const yearY2 = currentYear - 2

  const y2Expired = asOf > june30(currentYear)

  const openingRecoveries = Number(personal.sold_recuperari) || 0
  const totalRecoveriesEarned = openingRecoveries + recoveries.reduce((s, r) => s + Number(r.days || 0), 0)
  const usedRecoveries = approvedRequests.reduce((s, r) => s + Number((r.deduction && r.deduction.recoveries) || 0), 0)

  const usedY2 = usedForYear(approvedRequests, yearY2, c.id, principalId)
  const usedY1 = usedForYear(approvedRequests, yearY1, c.id, principalId)
  const usedY = usedForYear(approvedRequests, yearY, c.id, principalId)

  const allocY2 = Number(profil.sold_an_minus_2) || 0
  const allocY1 = Number(profil.sold_an_minus_1) || 0
  const allocY = Number(profil.sold_an_curent) || 0

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

/**
 * Soldul FIECĂRUI contract al angajatului (cel principal primul).
 * Recuperările sunt la persoană, deci au aceeași valoare în fiecare element.
 */
export function calculateBalances(employee, approvedRequests, recoveries, asOf = new Date()) {
  const contracte = getContracte(employee)
  if (contracte.length === 0) {
    return [{ contract: null, ...calculateBalance(employee, approvedRequests, recoveries, asOf) }]
  }
  return contracte.map((contract) => ({
    contract,
    ...calculateBalance(employee, approvedRequests, recoveries, asOf, contract),
  }))
}

/**
 * Construiește "deduction" pentru o cerere care se aprobă, după regula:
 *  - recuperările (la persoană) se scad O SINGURĂ DATĂ, mai întâi;
 *  - restul zilelor se scad din FIECARE contract în vigoare în perioada
 *    concediului (din zilele lui: anul -2, apoi -1, apoi curent).
 * otherApproved = cererile aprobate ale angajatului, fără aceasta.
 */
export function buildDeduction(request, employee, otherApproved, recoveries, asOf = new Date()) {
  const zile = Number(request.working_days) || 0
  const contracte = getContracte(employee)
  let active = contracte.filter((c) => contractActivInPerioada(c, request.start_date, request.end_date))
  if (active.length === 0) {
    const principal = getContractPrincipal(employee)
    active = principal ? [principal] : []
  }

  const baza = calculateBalance(employee, otherApproved, recoveries, asOf, active[0] || null)
  const recuperariFolosite = round1(Math.min(Math.max(0, baza.recoveries), zile))
  const ramase = round1(zile - recuperariFolosite)

  if (active.length === 0) {
    // angajat fără niciun contract înregistrat: păstrăm formatul vechi
    return { recoveries: recuperariFolosite, [String(baza.year)]: ramase }
  }

  const contracteDeducere = {}
  for (const c of active) {
    const sold = calculateBalance(employee, otherApproved, recoveries, asOf, c)
    const split = computeDefaultSplit(ramase, { recoveries: 0, y2: sold.y2, y1: sold.y1, y: sold.y })
    contracteDeducere[c.id] = {
      [String(sold.yearY2)]: split.y2 || 0,
      [String(sold.yearY1)]: split.y1 || 0,
      [String(sold.year)]: split.y || 0,
    }
  }
  return { recoveries: recuperariFolosite, contracte: contracteDeducere }
}

/** Zilele scăzute dintr-un contract, pe ani — pentru afișare/editare. */
export function aniDinDeduction(deduction, contractId, principalId) {
  return aniScazutiDinContract(deduction, contractId, principalId)
}

function round1(n) {
  return Math.round(n * 10) / 10
}

export function formatDate(d) {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export const STATUS_LABELS_EMPLOYEE = {
  submitted: 'Trimisă',
  pending: 'În așteptare',
  approved: 'Aprobată',
  rejected: 'Respinsă',
}

export const STATUS_LABELS_ADMIN = {
  submitted: 'Solicitată',
  pending: 'În așteptare',
  approved: 'Aprobată',
  rejected: 'Respinsă',
}

export const STATUS_STYLES = {
  submitted: 'bg-sky-100 text-sky-800 border-sky-200',
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  rejected: 'bg-rose-100 text-rose-800 border-rose-200',
}

// Documentul .docx devine disponibil pentru descărcare din momentul în care
// cererea a trecut de stadiul "Solicitată/Trimisă" (adică Admin a mutat-o
// manual în "În așteptare"), și rămâne disponibil și după "Aprobată".
export const DOCX_AVAILABLE_STATUSES = ['pending', 'approved']
