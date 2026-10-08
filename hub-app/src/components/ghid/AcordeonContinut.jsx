import { useEffect, useState } from 'react'
import { ChevronDown, ExternalLink, FileDown } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import RichTextContent from './RichTextContent'

// Grupează lista plată (deja ordonată) în secțiuni consecutive cu
// același subiect — rândurile cu același subiect trebuie puse alături
// în Admin Hub (prin câmpul "ordine"), ca gruparea să iasă corect.
function grupeazaPeSubiect(intrari) {
  const grupuri = []
  for (const item of intrari) {
    const ultimul = grupuri[grupuri.length - 1]
    if (ultimul && ultimul.subiect === item.subiect) {
      ultimul.intrari.push(item)
    } else {
      grupuri.push({ subiect: item.subiect, intrari: [item] })
    }
  }
  return grupuri
}

// Componentă publică generică, în stil acordeon, pentru secțiunile cu
// aceeași structură: Subiect / Titlu / Text formatat + opțional link
// sau fișier de descărcat. Folosită atât pentru "Informații utile"
// (tabel ghid_intrebari) cât și pentru "Ghid Resurse Umane" (tabel
// ghid_info_resurse_umane) — vezi GhidRouter.jsx.
export default function AcordeonContinut({ tabel }) {
  const [grupuri, setGrupuri] = useState([])
  const [loading, setLoading] = useState(true)
  const [eroare, setEroare] = useState('')
  const [deschise, setDeschise] = useState(new Set())

  useEffect(() => {
    let activ = true
    supabase
      .from(tabel)
      .select('*')
      .order('ordine', { ascending: true })
      .then(({ data, error }) => {
        if (!activ) return
        if (error) {
          setEroare(error.message)
        } else {
          setGrupuri(grupeazaPeSubiect(data || []))
        }
        setLoading(false)
      })
    return () => {
      activ = false
    }
  }, [tabel])

  function toggle(id) {
    setDeschise((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (loading) return <p className="text-sm text-slate-400">Se încarcă...</p>
  if (eroare) return <p className="text-sm text-rose-600">Eroare: {eroare}</p>
  if (grupuri.length === 0) {
    return <p className="text-sm text-slate-400">Conținutul se completează în curând.</p>
  }

  return (
    <div className="space-y-6">
      {grupuri.map((grup) => (
        <div key={grup.subiect}>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
            {grup.subiect}
          </h3>
          <div className="space-y-2">
            {grup.intrari.map((item) => {
              const deschis = deschise.has(item.id)
              const fisierUrl = item.fisier_url
                ? supabase.storage.from('ghid-foto').getPublicUrl(item.fisier_url).data.publicUrl
                : null

              return (
                <div key={item.id} className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggle(item.id)}
                    aria-expanded={deschis}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                  >
                    <span className="text-sm font-medium text-slate-800">{item.titlu}</span>
                    <ChevronDown
                      size={16}
                      className={`text-slate-400 flex-shrink-0 transition-transform ${deschis ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {deschis && (
                    <div className="px-4 pb-4">
                      <RichTextContent html={item.continut_html} />

                      {item.link && (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                        >
                          Deschide link
                          <ExternalLink size={14} />
                        </a>
                      )}

                      {fisierUrl && (
                        <a
                          href={fisierUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                        >
                          Descarcă fișierul{item.fisier_nume ? `: ${item.fisier_nume}` : ''}
                          <FileDown size={14} />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
