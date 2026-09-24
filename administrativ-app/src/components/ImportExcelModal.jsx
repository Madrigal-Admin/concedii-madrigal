import { useState } from 'react'
import * as XLSX from 'xlsx'
import { X as XIcon, Upload } from 'lucide-react'
import { supabase } from '../supabaseClient'

const GESTIUNI_VALIDE = ['OBIECTE DE INVENTAR IN MAGAZIE', 'DECORURI', 'MARFURI']

function gasesteColoana(headerRow, cautari) {
  for (let i = 0; i < headerRow.length; i++) {
    const celula = String(headerRow[i] || '').toLowerCase().trim()
    if (cautari.some((c) => celula.includes(c))) return i
  }
  return -1
}

function gasesteColoanaExacta(headerRow, valori) {
  for (let i = 0; i < headerRow.length; i++) {
    const celula = String(headerRow[i] || '').toLowerCase().trim()
    if (valori.includes(celula)) return i
  }
  return -1
}

function parseazaFisier(rows) {
  // Găsim rândul de antet — cel care conține "denumire"
  const headerIdx = rows.findIndex((r) =>
    r.some((celula) => String(celula || '').toLowerCase().trim() === 'denumire')
  )
  if (headerIdx === -1) {
    throw new Error('Nu am găsit rândul de antet (coloana "Denumire"). Verifică structura fișierului.')
  }

  const header = rows[headerIdx]
  const idxDenumire = gasesteColoana(header, ['denumire'])
  const idxCod = gasesteColoana(header, ['cod', 'inventar'])
  const idxCantitate = gasesteColoana(header, ['cantitate'])
  const idxUm = gasesteColoanaExacta(header, ['um', 'u.m.', 'u.m'])
  const idxGestiune = gasesteColoana(header, ['gestiune'])

  if (idxDenumire === -1 || idxCantitate === -1 || idxGestiune === -1) {
    throw new Error('Lipsesc coloane obligatorii (Denumire, Cantitate sau Gestiune).')
  }

  const linii = []
  let ignorate = 0

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i]
    const denumire = String(r[idxDenumire] || '').trim()
    if (!denumire) continue

    const gestiune = String(r[idxGestiune] || '').toUpperCase().trim()
    if (!GESTIUNI_VALIDE.includes(gestiune)) {
      ignorate++
      continue
    }

    linii.push({
      denumire,
      cod_inventar: idxCod !== -1 ? String(r[idxCod] || '').trim() || null : null,
      cantitate: Number(r[idxCantitate]) || 0,
      um: idxUm !== -1 ? String(r[idxUm] || '').trim() || 'BUC' : 'BUC',
      gestiune,
    })
  }

  return { linii, ignorate }
}

export default function ImportExcelModal({ onClose, onImported }) {
  const [fileName, setFileName] = useState('')
  const [linii, setLinii] = useState(null)
  const [ignorate, setIgnorate] = useState(0)
  const [conflicte, setConflicte] = useState([])
  const [noi, setNoi] = useState([])
  const [strategie, setStrategie] = useState('adauga')
  const [parseError, setParseError] = useState('')
  const [importing, setImporting] = useState(false)
  const [rezultat, setRezultat] = useState(null)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setParseError('')
    setRezultat(null)

    try {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 })

      const { linii: liniiParse, ignorate: nrIgnorate } = parseazaFisier(rows)
      setIgnorate(nrIgnorate)

      // verificăm ce există deja în catalog, ca să separăm noi / conflicte
      const { data: existente } = await supabase.from('stoc_obiecte').select('*')

      const cu = []
      const nou = []
      for (const linie of liniiParse) {
        const match = (existente || []).find((e) => {
          if (linie.cod_inventar && e.cod_inventar) {
            return e.gestiune === linie.gestiune && e.cod_inventar === linie.cod_inventar
          }
          return e.gestiune === linie.gestiune && e.denumire.toLowerCase() === linie.denumire.toLowerCase()
        })
        if (match) cu.push({ linie, existent: match })
        else nou.push(linie)
      }

      setLinii(liniiParse)
      setConflicte(cu)
      setNoi(nou)
    } catch (err) {
      setParseError(err.message || 'Nu am putut citi fișierul.')
      setLinii(null)
    }
  }

  async function handleImport() {
    setImporting(true)

    if (noi.length > 0) {
      await supabase.from('stoc_obiecte').insert(noi)
    }

    for (const { linie, existent } of conflicte) {
      if (strategie === 'adauga') {
        await supabase
          .from('stoc_obiecte')
          .update({ cantitate: Number(existent.cantitate) + linie.cantitate, updated_at: new Date().toISOString() })
          .eq('id', existent.id)
      } else {
        await supabase
          .from('stoc_obiecte')
          .update({
            denumire: linie.denumire,
            cod_inventar: linie.cod_inventar,
            cantitate: linie.cantitate,
            um: linie.um,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existent.id)
      }
    }

    setImporting(false)
    setRezultat({ noi: noi.length, conflicte: conflicte.length })
    onImported()
  }

  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">Importă din Excel</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100">
            <XIcon size={16} />
          </button>
        </div>

        <p className="mb-3 text-xs text-slate-500">
          Fișier .xlsx cu coloanele Denumire, Cantitate, UM, Gestiune (și opțional Cod produs/Număr
          inventar). Funcționează cu exporturile reale de stocuri, ca structură.
        </p>

        <input
          type="file"
          accept=".xlsx"
          onChange={handleFile}
          className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        {parseError && <p className="mb-3 text-sm text-rose-600">{parseError}</p>}

        {linii && !rezultat && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              <strong>{fileName}</strong> — {linii.length} articole citite
              {ignorate > 0 ? `, ${ignorate} ignorate (gestiune necunoscută)` : ''}.
            </p>
            <p className="text-sm text-slate-600">
              <strong className="text-green-700">{noi.length}</strong> articole noi ·{' '}
              <strong className="text-amber-700">{conflicte.length}</strong> deja există în catalog
            </p>

            {conflicte.length > 0 && (
              <div className="rounded-lg bg-amber-50 p-3">
                <p className="mb-2 text-xs font-medium text-amber-800">
                  Ce facem cu cele {conflicte.length} articole deja existente?
                </p>
                <label className="mb-1 flex items-center gap-2 text-sm text-slate-700">
                  <input type="radio" checked={strategie === 'adauga'} onChange={() => setStrategie('adauga')} />
                  Adaugă cantitatea la stocul existent
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="radio" checked={strategie === 'suprascrie'} onChange={() => setStrategie('suprascrie')} />
                  Suprascrie complet linia (denumire, cod, cantitate, UM)
                </label>
              </div>
            )}

            <button
              onClick={handleImport}
              disabled={importing}
              className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover disabled:opacity-50"
            >
              <Upload size={14} /> {importing ? 'Se importă...' : `Importă ${linii.length} articole`}
            </button>
          </div>
        )}

        {rezultat && (
          <div className="space-y-3">
            <p className="text-sm text-green-700">
              Import finalizat: {rezultat.noi} articole noi adăugate, {rezultat.conflicte} actualizate.
            </p>
            <button onClick={onClose} className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-600 hover:bg-slate-200">
              Închide
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
