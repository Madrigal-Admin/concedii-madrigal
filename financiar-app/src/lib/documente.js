// Construiește datele pentru șabloanele Word (funcții pure, fără baza de date).
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import { formatBani, formatCantitate } from './bani'
import { sumaInLitere } from './sumaLitere'

const PUNCTE = '.....................'

export function dataRo(valoare) {
  if (!valoare) return ''
  const m = String(valoare).match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}.${m[2]}.${m[1]}` : ''
}

const ora = (t) => (t ? String(t).slice(0, 5) : '')

export function sexT(sex) {
  if (sex === 'M') return 'ul'
  if (sex === 'F') return 'a'
  return 'a/ul'
}

export function valoareEstimata(linii) {
  return linii.reduce((s, l) => s + Number(l.valoare_bani || 0), 0)
}

// ---------------------------------- REFERAT ----------------------------------
export function dateReferat({ referat, linii, semnatari, sex }) {
  const servicii = referat.tip === 'servicii'
  const mai = linii.length > 1
  const necesitate = servicii
    ? (mai ? 'următoarelor servicii' : 'următorului serviciu')
    : (mai ? 'următoarelor produse' : 'următorului produs')
  const mentiune = servicii
    ? (mai ? 'aceste servicii sunt necesare' : 'acest serviciu este necesar')
    : (mai ? 'aceste produse ne sunt necesare' : 'acest produs ne este necesar')
  const motiv = String(referat.motiv || '').trim().replace(/[.\s]+$/, '')
  const ordonate = [...linii].sort((a, b) => a.poz - b.poz)

  return {
    TIP_ACHIZITIE: servicii ? 'SERVICII' : 'PRODUSE',
    avizat_functie: semnatari?.avizat_functie || '',
    avizat_nume: semnatari?.avizat_nume || '',
    aprobat_functie: semnatari?.aprobat_functie || '',
    aprobat_nume: semnatari?.aprobat_nume || '',
    sex_T: sexT(sex),
    nume: referat.autor_nume || '',
    functie: referat.autor_functie || '',
    necesitate,
    linii: ordonate.map((l, i) => ({
      poz: String(i + 1),
      denumire: l.denumire,
      um: l.um,
      cantitate: formatCantitate(l.cantitate),
      pret_unitar: formatBani(l.pret_bani),
      valoare: formatBani(l.valoare_bani),
      caracteristici: l.caracteristici || '',
    })),
    mentiune,
    motiv,
    valoare_estimata: formatBani(valoareEstimata(linii)),
    surse_finantare: (referat.surse || []).map((s) => s.denumire).join(', '),
    data_intocmire: dataRo(referat.data_intocmirii),
  }
}

// ---------------------------------- DECONT ----------------------------------
export function totaluriDecont(decont, linii) {
  const primit = Number(decont.avans_bani || 0) + Number(decont.avans_parcurs_bani || 0)
  const cheltuit = linii.reduce((s, l) => s + Number(l.suma_bani || 0), 0)
  return {
    primit,
    cheltuit,
    dePrimit: cheltuit > primit ? cheltuit - primit : 0,
    deRestituit: cheltuit < primit ? primit - cheltuit : 0,
  }
}

export function dateDecont({ decont, linii, sex }) {
  const t = totaluriDecont(decont, linii)
  const plecare = decont.deplasare && decont.plecare_data
    ? `Data şi ora plecării ${dataRo(decont.plecare_data)}/${ora(decont.plecare_ora)}` : ''
  const sosire = decont.deplasare && decont.sosire_data
    ? `Data şi ora sosirii ${dataRo(decont.sosire_data)}/${ora(decont.sosire_ora)}` : ''
  const ordonate = [...linii].sort((a, b) => a.nr - b.nr)

  return {
    sex_T: sexT(sex),
    NUME_MARE: (decont.autor_nume || '').toLocaleUpperCase('ro'),
    FUNCTIE_MARE: (decont.autor_functie || '').toLocaleUpperCase('ro'),
    perioada: `${dataRo(decont.perioada_de_la)} – ${dataRo(decont.perioada_pana)}`,
    linie_plecare: plecare,
    linie_sosire: sosire,
    avans: formatBani(decont.avans_bani || 0),
    avans_parcurs: formatBani(decont.avans_parcurs_bani || 0),
    total_primit: formatBani(t.primit),
    total_cheltuit: formatBani(t.cheltuit),
    diferenta_primit: t.dePrimit > 0 ? formatBani(t.dePrimit) : PUNCTE,
    diferenta_restituit: t.deRestituit > 0 ? formatBani(t.deRestituit) : PUNCTE,
    obiective_delegatie: decont.obiective_delegatie || '',
    linii_borderou: ordonate.map((l, i) => ({
      nr: String(i + 1),
      fel_act: l.denumire,
      nr_data_act: l.tip === 'lista' ? '' : l.nr_data_act || '',
      suma: formatBani(l.suma_bani),
    })),
    suma_litere: sumaInLitere(t.cheltuit),
  }
}

// ---------------------------------- Randare ----------------------------------
export function randeazaDocx(continutBase64, date) {
  const zip = new PizZip(continutBase64, { base64: true })
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, nullGetter: () => '' })
  doc.render(date)
  return doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
}

export function descarcaBlob(blob, numeFisier) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = numeFisier
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
