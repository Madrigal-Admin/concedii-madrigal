import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'

// Markerii așteptați în fiecare șablon (cei din bucle apar o dată în rând).
export const MARKERI = {
  referat: [
    'TIP_ACHIZITIE', 'avizat_functie', 'avizat_nume', 'aprobat_functie', 'aprobat_nume',
    'sex_T', 'nume', 'functie', 'necesitate',
    'poz', 'denumire', 'um', 'cantitate', 'pret_unitar', 'valoare', 'caracteristici',
    'mentiune', 'motiv', 'valoare_estimata', 'surse_finantare', 'data_intocmire',
  ],
  decont: [
    'sex_T', 'NUME_MARE', 'FUNCTIE_MARE', 'perioada', 'linie_plecare', 'linie_sosire',
    'avans', 'avans_parcurs', 'total_primit', 'total_cheltuit', 'diferenta_primit',
    'diferenta_restituit', 'obiective_delegatie',
    'nr', 'fel_act', 'nr_data_act', 'suma', 'suma_litere',
  ],
}

export const TITLURI = { referat: 'Referat de necesitate', decont: 'Decont de cheltuieli' }

export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

// Citește toate markerii {cod} din corp, antet și subsol.
export function citesteMarkeri(arrayBuffer) {
  const zip = new PizZip(arrayBuffer)
  new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true }) // aruncă eroare clară dacă acoladele sunt greșite
  const gasiti = new Map()
  for (const nume of Object.keys(zip.files)) {
    if (!/^word\/(document|header\d*|footer\d*)\.xml$/.test(nume)) continue
    const xml = zip.file(nume).asText()
    const text = xml.replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, '')
    for (const m of text.matchAll(/\{([A-Za-z0-9_]+)\}/g)) {
      gasiti.set(m[1], (gasiti.get(m[1]) || 0) + 1)
    }
  }
  return [...gasiti.keys()]
}

export function verificaMarkeri(markeriGasiti, markeriAsteptati) {
  return {
    necunoscuti: markeriGasiti.filter((m) => !markeriAsteptati.includes(m)),
    lipsa: markeriAsteptati.filter((m) => !markeriGasiti.includes(m)),
  }
}
