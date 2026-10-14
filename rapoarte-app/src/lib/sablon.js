import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'

// Markerii de bază din șablonul Word (fiecare apare o singură dată).
export const MARKERI_DE_BAZA = [
  'LUNA', 'AN', 'luna2', 'sex_T', 'nume', 'tip', 'departament', 'NrContract', 'activitati', 'dataT',
]

export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

// Citește toate markerii {cod} din corpul, antetul și subsolul documentului.
export function citesteMarkeri(arrayBuffer) {
  const zip = new PizZip(arrayBuffer)
  // dacă șablonul are o greșeală de scriere a acoladelor, aruncă o eroare clară
  new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })

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

// Compară markerii din fișier cu cei așteptați.
export function verificaMarkeri(markeriGasiti, markeriAsteptati) {
  return {
    necunoscuti: markeriGasiti.filter((m) => !markeriAsteptati.includes(m)),
    lipsa: markeriAsteptati.filter((m) => !markeriGasiti.includes(m)),
  }
}
