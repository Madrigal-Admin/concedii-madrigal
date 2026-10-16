import { supabase } from '../supabaseClient'
import { dateReferat, dateDecont, randeazaDocx, descarcaBlob } from './documente'

async function citesteSablon(modul, sablonId) {
  let q = supabase.from('fin_sabloane').select('*').eq('modul', modul)
  q = sablonId ? q.eq('id', sablonId) : q.eq('activ', true)
  const { data, error } = await q.limit(1)
  if (error) throw new Error('Nu am putut citi șablonul Word.')
  if (!data?.[0]) {
    throw new Error('Nu există niciun șablon Word încărcat. Cere Adminului Financiar să-l încarce (Administrare → Șabloane Word).')
  }
  return data[0]
}

async function citesteSex(angajatId) {
  const { data, error } = await supabase.rpc('fin_sex_angajat', { p_angajat: angajatId })
  if (error) throw new Error('Nu am putut citi sexul autorului.')
  return data // M / F / null (dacă lipsește, în document apare „a/ul”)
}

const sigur = (t) => (t || 'document').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '')

export async function descarcaReferatWord(referat, linii, setari) {
  const [sablon, sex] = await Promise.all([citesteSablon('referat', referat.sablon_id), citesteSex(referat.autor_angajat_id)])
  // aprobat: semnatarii reținuți la aprobare; altfel cei din Setări
  const semnatari = referat.semnatari || setari
  const date = dateReferat({ referat, linii, semnatari, sex })
  const blob = randeazaDocx(sablon.continut_base64, date)
  descarcaBlob(blob, `${referat.cod}-referat-${sigur(referat.autor_nume)}.docx`)
}

export async function descarcaDecontWord(decont, linii) {
  const [sablon, sex] = await Promise.all([citesteSablon('decont', null), citesteSex(decont.autor_angajat_id)])
  const date = dateDecont({ decont, linii, sex })
  const blob = randeazaDocx(sablon.continut_base64, date)
  descarcaBlob(blob, `${decont.cod}-decont-${sigur(decont.autor_nume)}.docx`)
}
