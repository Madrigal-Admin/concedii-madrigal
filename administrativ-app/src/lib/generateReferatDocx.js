import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'

const TEMPLATE_URL = `${import.meta.env.BASE_URL}templates/referat-eliberare-template.docx`

function formatDate(dataStr) {
  if (!dataStr) return ''
  return new Date(dataStr).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/**
 * Generează documentul .docx "Referat eliberare din magazie", completat cu
 * detaliile cererii, și pornește descărcarea în browser.
 */
export async function downloadReferatDocx(cerere, linii) {
  const response = await fetch(TEMPLATE_URL)
  if (!response.ok) throw new Error('Nu am putut încărca template-ul .docx')
  const arrayBuffer = await response.arrayBuffer()

  const zip = new PizZip(arrayBuffer)
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })

  doc.render({
    nume: cerere.nume_angajat,
    departament: cerere.departament_angajat || '',
    motiv: cerere.motiv,
    linii: linii.map((l, i) => ({ nr: i + 1, obiect: l.denumire_obiect, cantitate: l.cantitate })),
  })

  const blob = doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })

  const safeName = (cerere.nume_angajat || 'angajat').replace(/[^\p{L}\p{N}]+/gu, '-')
  const filename = `referat-eliberare-${safeName}-${formatDate(cerere.created_at).replace(/\./g, '-')}.docx`

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
