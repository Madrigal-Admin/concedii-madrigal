// Sumele se păstrează ca numere întregi în BANI (23,00 lei = 2300).

// "1.234,56" / "1234,56" / "1234.56" / "1234" -> 123456 ; text invalid -> NaN
export function parseBani(text) {
  if (typeof text === 'number') return Math.round(text)
  let s = String(text ?? '').replace(/\s/g, '').replace(/lei/gi, '')
  if (s === '') return NaN
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else if ((s.match(/\./g) || []).length === 1 && /\.\d{1,2}$/.test(s)) {
    // punct zecimal: 12.5 sau 12.50
  } else {
    s = s.replace(/\./g, '')
  }
  if (!/^-?\d+(\.\d+)?$/.test(s)) return NaN
  const [intreg, zec = ''] = s.split('.')
  if (zec.length > 2) return NaN
  const semn = intreg.startsWith('-') ? -1 : 1
  return semn * (Math.abs(Number(intreg)) * 100 + Number((zec + '00').slice(0, 2)))
}

// 123456 -> "1.234,56"
export function formatBani(bani) {
  if (bani === null || bani === undefined || Number.isNaN(bani)) return ''
  const n = Math.round(Number(bani))
  const semn = n < 0 ? '-' : ''
  const abs = Math.abs(n)
  const intreg = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const zec = String(abs % 100).padStart(2, '0')
  return `${semn}${intreg},${zec}`
}

// Pentru câmpuri de editare: 2300 -> "23,00"
export const baniInText = (bani) => (bani === null || bani === undefined ? '' : formatBani(bani))

// Cantități: "3000", "2,5" -> număr (până la 3 zecimale)
export function parseCantitate(text) {
  const s = String(text ?? '').trim().replace(/\s/g, '').replace(',', '.')
  if (s === '' || !/^\d+(\.\d{1,3})?$/.test(s)) return NaN
  return Number(s)
}

export function formatCantitate(n) {
  if (n === null || n === undefined) return ''
  const v = Number(n)
  if (Number.isInteger(v)) return String(v)
  return String(v).replace('.', ',')
}

// valoare linie = cantitate × preț unitar, rotunjit la ban (ca în baza de date)
export const valoareLinie = (cantitate, pretBani) => Math.round(Number(cantitate) * Number(pretBani))
