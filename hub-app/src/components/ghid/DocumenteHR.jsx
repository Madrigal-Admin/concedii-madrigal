import { useEffect, useMemo, useState } from 'react'
import { Search, Download, FileText } from 'lucide-react'
import { supabase } from '../../supabaseClient'

function formateazaData(iso) {
  if (!iso) return null
  try {
    return new Intl.DateTimeFormat('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' }).format(
      new Date(iso)
    )
  } catch {
    return null
  }
}

// Tab-ul public "Documente Resurse Umane" — listă căutabilă, fiecare
// document cu titlu, descriere, data ultimei actualizări și buton de
// descărcare. Conținutul e gestionat din Admin Hub, nu de aici.
export default function DocumenteHR() {
  const [documente, setDocumente] = useState([])
  const [loading, setLoading] = useState(true)
  const [eroare, setEroare] = useState('')
  const [cautare, setCautare] = useState('')
  const [descarcare, setDescarcare] = useState(null) // id-ul documentului în curs de descărcare

  useEffect(() => {
    let activ = true
    async function incarca() {
      setLoading(true)
      const { data, error } = await supabase
        .from('ghid_documente')
        .select('*')
        .order('ordine', { ascending: true })
        .order('titlu', { ascending: true })

      if (!activ) return
      if (error) {
        setEroare(error.message)
      } else {
        setDocumente(data || [])
      }
      setLoading(false)
    }
    incarca()
    return () => {
      activ = false
    }
  }, [])

  const documenteFiltrate = useMemo(() => {
    const q = cautare.trim().toLowerCase()
    if (!q) return documente
    return documente.filter(
      (d) =>
        d.titlu.toLowerCase().includes(q) || (d.descriere || '').toLowerCase().includes(q)
    )
  }, [documente, cautare])

  async function handleDescarcare(doc) {
    setEroare('')
    setDescarcare(doc.id)

    const { data, error } = await supabase.storage
      .from('ghid-documente')
      .createSignedUrl(doc.fisier_url, 60)

    setDescarcare(null)

    if (error || !data?.signedUrl) {
      setEroare('Nu am putut genera link-ul de descărcare. Încearcă din nou.')
      return
    }

    window.open(data.signedUrl, '_blank', 'noopener')
  }

  return (
    <div>
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={cautare}
          onChange={(e) => setCautare(e.target.value)}
          placeholder="Caută un document..."
          className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      {loading && <p className="text-sm text-slate-400">Se încarcă...</p>}

      {!loading && eroare && <p className="text-sm text-rose-600 mb-3">{eroare}</p>}

      {!loading && documenteFiltrate.length === 0 && (
        <p className="text-sm text-slate-400">
          {cautare ? `Niciun document pentru "${cautare}".` : 'Niciun document disponibil momentan.'}
        </p>
      )}

      <ul className="space-y-2">
        {documenteFiltrate.map((doc) => {
          const dataActualizare = formateazaData(doc.updated_at)
          return (
            <li
              key={doc.id}
              className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-lg p-4"
            >
              <FileText size={18} className="text-slate-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">{doc.titlu}</p>
                {doc.descriere && (
                  <p className="text-sm text-slate-500 mt-0.5">{doc.descriere}</p>
                )}
                {dataActualizare && (
                  <p className="text-xs text-slate-400 mt-1.5">Actualizat la {dataActualizare}</p>
                )}
              </div>
              <button
                onClick={() => handleDescarcare(doc)}
                disabled={descarcare === doc.id}
                className="flex items-center gap-1.5 flex-shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-ring transition disabled:opacity-50"
              >
                <Download size={14} />
                {descarcare === doc.id ? 'Se pregătește...' : 'Descarcă'}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
