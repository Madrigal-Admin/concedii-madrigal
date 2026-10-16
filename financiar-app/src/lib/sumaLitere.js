// Suma în litere, în română: "trei sute zece lei și cinci bani".

const UNITATI = ['zero', 'unu', 'doi', 'trei', 'patru', 'cinci', 'șase', 'șapte', 'opt', 'nouă',
  'zece', 'unsprezece', 'doisprezece', 'treisprezece', 'paisprezece', 'cincisprezece',
  'șaisprezece', 'șaptesprezece', 'optsprezece', 'nouăsprezece']
const ZECI = ['', '', 'douăzeci', 'treizeci', 'patruzeci', 'cincizeci', 'șaizeci', 'șaptezeci', 'optzeci', 'nouăzeci']

// gen: 'm' (lei, bani: unu, doi) | 'f' (mii: una, două) | 'n' (milioane: unu, două)
function pana19(n, gen) {
  if (gen === 'f') {
    if (n === 1) return 'una'
    if (n === 2) return 'două'
    if (n === 12) return 'douăsprezece'
  }
  if (gen === 'n') {
    if (n === 2) return 'două'
    if (n === 12) return 'douăsprezece'
  }
  return UNITATI[n]
}

// 1..999
function subMie(n, gen) {
  const parts = []
  const sute = Math.floor(n / 100)
  const rest = n % 100
  if (sute === 1) parts.push('o sută')
  else if (sute === 2) parts.push('două sute')
  else if (sute > 2) parts.push(`${UNITATI[sute]} sute`)
  if (rest > 0) {
    if (rest < 20) parts.push(pana19(rest, gen))
    else {
      const z = Math.floor(rest / 10)
      const u = rest % 10
      parts.push(u === 0 ? ZECI[z] : `${ZECI[z]} și ${pana19(u, gen)}`)
    }
  }
  return parts.join(' ')
}

// "de" apare când ultimele două cifre sunt 00 sau >= 20
const cuDe = (n) => {
  const r = n % 100
  return r === 0 || r >= 20
}

function grup(n, singular, plural, gen) {
  if (n === 1) return `${gen === 'f' ? 'o' : 'un'} ${singular}`
  return `${subMie(n, gen)}${cuDe(n) ? ' de' : ''} ${plural}`
}

export function numarInLitere(n, substantiv) {
  // substantiv: { singular, plural } pentru ultimul grup (lei / bani)
  if (!Number.isInteger(n) || n < 0 || n >= 1e12) throw new Error('Număr în afara limitelor.')
  if (n === 0) return `zero ${substantiv.plural}`
  const miliarde = Math.floor(n / 1e9)
  const milioane = Math.floor(n / 1e6) % 1000
  const mii = Math.floor(n / 1000) % 1000
  const unitati = n % 1000
  const parts = []
  if (miliarde) parts.push(grup(miliarde, 'miliard', 'miliarde', 'n'))
  if (milioane) parts.push(grup(milioane, 'milion', 'milioane', 'n'))
  if (mii) parts.push(grup(mii, 'mie', 'mii', 'f'))
  if (unitati) {
    parts.push(
      unitati === 1
        ? `un ${substantiv.singular}`
        : `${subMie(unitati, 'm')}${cuDe(unitati) ? ' de' : ''} ${substantiv.plural}`
    )
  } else {
    // ultimul grup a fost mii/milioane: substantivul vine după, cu "de"
    parts.push(`de ${substantiv.plural}`)
  }
  return parts.join(' ')
}

// 39174434 (bani) -> "trei sute nouăzeci și una de mii ... lei și treizeci și patru de bani"
export function sumaInLitere(baniTotal) {
  const n = Math.round(Number(baniTotal))
  if (!Number.isFinite(n) || n < 0) throw new Error('Sumă invalidă.')
  const lei = Math.floor(n / 100)
  const bani = n % 100
  const parteLei = numarInLitere(lei, { singular: 'leu', plural: 'lei' })
  if (bani === 0) return parteLei
  return `${parteLei} și ${numarInLitere(bani, { singular: 'ban', plural: 'bani' })}`
}
