import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import { formatDate } from './leaveCalculations'

const TEMPLATE_URL = '/templates/cerere-concediu-template.docx'

// Tipurile de concediu acoperite de acest template (Medical se justifică prin
// certificat medical, nu prin acest formular, deci nu are echivalent aici).
const TYPE_TO_CHECKBOX_FIELD = {
  Odihnă: 'tipCO',
  'Fără Plată': 'tipCP',
  'Evenimente Speciale': 'tipCL',
}

export function templateSupportsType(leaveType) {
  return Object.prototype.hasOwnProperty.call(TYPE_TO_CHECKBOX_FIELD, leaveType)
}

/**
 * Generează documentul .docx "Cerere de concediu" completat cu detaliile
 * cererii date, și pornește descărcarea lui în browser.
 */
export async function downloadFilledLeaveRequestDocx(request, employee) {
  const response = await fetch(TEMPLATE_URL)
  if (!response.ok) throw new Error('Nu am putut încărca template-ul .docx')
  const arrayBuffer = await response.arrayBuffer()

  const zip = new PizZip(arrayBuffer)
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })

  const checkboxData = { tipCO: '', tipCP: '', tipCL: '' }
  const field = TYPE_TO_CHECKBOX_FIELD[request.leave_type]
  if (field) checkboxData[field] = 'X'

  doc.render({
    dataT: formatDate(request.created_at),
    nume: request.employee_name,
    departament: employee?.department?.name || '',
    functie: employee?.position?.name || '',
    dataI: formatDate(request.start_date),
    dataS: formatDate(request.end_date),
    zile: request.working_days,
    ...checkboxData,
  })

  const blob = doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })

  const safeName = (request.employee_name || 'angajat').replace(/[^\p{L}\p{N}]+/gu, '-')
  const filename = `cerere-concediu-${safeName}-${request.start_date}.docx`

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
