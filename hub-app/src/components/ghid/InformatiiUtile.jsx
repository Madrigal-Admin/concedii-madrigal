import { useEffect, useState } from 'react'
import { ChevronDown, ArrowRight } from 'lucide-react'
import { supabase } from '../../supabaseClient'

// Grupează lista plată (deja ordonată) în secțiuni consecutive cu
// același subiect — rândurile cu același subiect trebuie puse alături
// în Admin Hub (prin câmpul "ordine"), ca gruparea să iasă corect.
function grupeazaPeSubiect(intrebari) {
  const grupuri = []
  for (const q of intrebari) {
    const ultimul = grupuri[grupuri.length - 1]
    if (ultimul && ultimul.subiect === q.subiect) {
      ultimul.intrebari.push(q)
    } else {
      grupuri.push({ subiect: q.subiect, intrebari: [q] })
    }
  }
  return grupuri
}

// Tab "Informații utile" — întrebări grupate pe subiect, acordeon: click
// pe întrebare arată răspunsul, cu buton opțional spre un tool din Hub.
export default function InformatiiUtile() {
  const [grupuri, setGrupuri] = useState([])
  const [loading, setLoading] = useState(true)
  const [eroare, setEroare] = useState('')
  const [deschise, setDeschise] = useState(new Set())

  useEffect(() => {
    let activ = true
    supabase
      .from('ghid_intrebari')
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
  }, [])

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
            {grup.intrebari.map((q) => {
              const deschis = deschise.has(q.id)
              return (
                <div key={q.id} className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggle(q.id)}
                    aria-expanded={deschis}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                  >
                    <span className="text-sm font-medium text-slate-800">{q.intrebare}</span>
                    <ChevronDown
                      size={16}
                      className={`text-slate-400 flex-shrink-0 transition-transform ${deschis ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {deschis && (
                    <div className="px-4 pb-4">
                      <p className="text-sm text-slate-600 leading-relaxed">{q.raspuns}</p>
                      {q.buton_text && q.buton_link && (
                        <a
                          href={q.buton_link}
                          className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                        >
                          {q.buton_text}
                          <ArrowRight size={14} />
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
