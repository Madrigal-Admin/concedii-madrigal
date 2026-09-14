// Calculul vechimii, conform algoritmului legal descris:
// - pentru fiecare perioadă (angajator anterior sau Corul Madrigal), se
//   scade data de început din data de sfârșit, cu împrumut: luna = 30 zile
//   standard, anul = 12 luni.
// - rezultatele tuturor perioadelor se însumează (ani + luni + zile).
// - din total se scad zilele de concediu fără plată (suspendări), tot cu
//   împrumut, în sens invers.

function pad(n) {
  return String(n).padStart(2, '0')
}

/** A - B, cu împrumut (lună=30 zile, an=12 luni). A trebuie să fie după B. */
function diffYMD(startStr, endStr) {
  const start = new Date(startStr)
  const end = new Date(endStr)

  let years = end.getFullYear() - start.getFullYear()
  let months = end.getMonth() - start.getMonth()
  let days = end.getDate() - start.getDate()

  if (days < 0) {
    months -= 1
    days += 30
  }
  if (months < 0) {
    years -= 1
    months += 12
  }
  if (years < 0) years = months = days = 0 // sfârșit înainte de început — ignorăm, nu blocăm

  return { years, months, days }
}

function addYMD(a, b) {
  let days = a.days + b.days
  let months = a.months + b.months
  let years = a.years + b.years

  if (days >= 30) {
    months += Math.floor(days / 30)
    days %= 30
  }
  if (months >= 12) {
    years += Math.floor(months / 12)
    months %= 12
  }
  return { years, months, days }
}

/** Scade un număr de zile calendaristice dintr-un total {years, months, days}. */
function subtractDaysFromYMD(total, daysToSubtract) {
  let { years, months, days } = total
  days -= daysToSubtract

  while (days < 0) {
    months -= 1
    days += 30
  }
  while (months < 0) {
    years -= 1
    months += 12
  }
  if (years < 0) years = months = days = 0

  return { years, months, days }
}

function calendarDaysInclusive(startStr, endStr) {
  const start = new Date(startStr)
  const end = new Date(endStr)
  const ms = end - start
  return Math.round(ms / 86400000) + 1
}

export function formatYMD({ years, months, days }) {
  return `${years} ${years === 1 ? 'an' : 'ani'}, ${months} ${months === 1 ? 'lună' : 'luni'}, ${days} ${
    days === 1 ? 'zi' : 'zile'
  }`
}

function ymdToNominalDays({ years, months, days }) {
  return years * 360 + months * 30 + days
}

/** Data nașterii, dedusă din CNP-ul românesc (cifra 1 = secol/sex, apoi AALLZZ). */
export function parseCnpBirthDate(cnp) {
  if (!cnp || cnp.length < 7) return null
  const s = parseInt(cnp[0], 10)
  const yy = parseInt(cnp.slice(1, 3), 10)
  const mm = parseInt(cnp.slice(3, 5), 10)
  const dd = parseInt(cnp.slice(5, 7), 10)

  let secol
  if (s === 1 || s === 2) secol = 1900
  else if (s === 3 || s === 4) secol = 1800
  else if (s === 5 || s === 6) secol = 2000
  else return null

  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null

  const an = secol + yy
  return `${an}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
}

/** Data la care angajatul urmează să treacă la următoarea gradație (sau
 * null dacă e deja la Gradația 5, maximă). Aproximativ (luni = 30 zile). */
export function dataUrmatoareiGradatii(angajat, leaveRequestsFaraPlata) {
  const rezultat = calculateVechime(angajat, leaveRequestsFaraPlata)
  const curentNominal = ymdToNominalDays(rezultat.total)
  const praguri = [3, 5, 10, 15, 20]
  const urmatorulPrag = praguri.find((p) => p * 360 > curentNominal)
  if (!urmatorulPrag) return null

  const necesar = urmatorulPrag * 360 - curentNominal
  const aniNecesari = Math.floor(necesar / 360)
  const luniNecesare = Math.floor((necesar % 360) / 30)
  const zileNecesare = necesar % 30

  const dataTinta = new Date()
  dataTinta.setFullYear(dataTinta.getFullYear() + aniNecesari)
  dataTinta.setMonth(dataTinta.getMonth() + luniNecesare)
  dataTinta.setDate(dataTinta.getDate() + zileNecesare)

  const gradatieNoua = { 3: 1, 5: 2, 10: 3, 15: 4, 20: 5 }[urmatorulPrag]
  return { data: dataTinta.toISOString().slice(0, 10), gradatieNoua }
}

export function gradatieDupaAni(ani) {
  if (ani >= 20) return 5
  if (ani >= 15) return 4
  if (ani >= 10) return 3
  if (ani >= 5) return 2
  if (ani >= 3) return 1
  return 0
}

/**
 * Calculează vechimea completă a unui angajat.
 * angajat = rând din `angajati`, cu hr_profil_angajat(*) și
 * hr_vechime_anterioara(*) incluse (join).
 * leaveRequestsFaraPlata = cererile de tip "Fără Plată", aprobate, ale
 * acestui angajat (start_date, end_date).
 */
export function calculateVechime(angajat, leaveRequestsFaraPlata) {
  const surse = []
  let totalCalendaristic = { years: 0, months: 0, days: 0 }

  for (const v of angajat.hr_vechime_anterioara || []) {
    let ymd = null
    let metoda = ''

    if (v.data_inceput && v.data_sfarsit) {
      ymd = diffYMD(v.data_inceput, v.data_sfarsit)
      metoda = `${v.data_inceput} → ${v.data_sfarsit}`
    } else if (v.durata_luni) {
      const luni = Number(v.durata_luni)
      ymd = { years: Math.floor(luni / 12), months: luni % 12, days: 0 }
      metoda = `${luni} luni (introdus manual, fără date exacte)`
    }

    if (ymd) {
      surse.push({ tip: 'anterior', label: v.angajator, metoda, ymd })
      totalCalendaristic = addYMD(totalCalendaristic, ymd)
    }
  }

  const profil = Array.isArray(angajat.hr_profil_angajat)
    ? angajat.hr_profil_angajat[0]
    : angajat.hr_profil_angajat

  if (profil?.data_inceput_contract) {
    const azi = new Date().toISOString().slice(0, 10)
    // Dacă contractul (determinat) s-a încheiat deja, vechimea la Madrigal
    // se oprește acolo, nu continuă "până azi".
    const final =
      profil.data_final_contract && profil.data_final_contract < azi ? profil.data_final_contract : azi
    const ymd = diffYMD(profil.data_inceput_contract, final)
    surse.push({
      tip: 'institutie',
      label: 'Corul Madrigal',
      metoda: `${profil.data_inceput_contract} → ${final === azi ? `azi (${azi})` : final}`,
      ymd,
    })
    totalCalendaristic = addYMD(totalCalendaristic, ymd)
  }

  const zileFaraPlata = (leaveRequestsFaraPlata || []).reduce(
    (sum, r) => sum + calendarDaysInclusive(r.start_date, r.end_date),
    0
  )

  const total = zileFaraPlata > 0 ? subtractDaysFromYMD(totalCalendaristic, zileFaraPlata) : totalCalendaristic

  return {
    surse,
    totalCalendaristic,
    zileFaraPlata,
    total,
    gradatie: gradatieDupaAni(total.years),
  }
}
