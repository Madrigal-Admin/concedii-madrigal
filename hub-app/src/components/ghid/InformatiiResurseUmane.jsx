import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { supabase } from '../../supabaseClient'

// Tab-ul public "Informații Resurse Umane" — NU e o listă de fișiere de
// descărcat. E un text explicativ (eventual în pași), care arată cum
// obții efectiv documentele de la Resurse Umane prin Hub — cu un buton
// opțional spre pagina relevantă. Conținutul e gestionat din Admin Hub.
export default function InformatiiResurseUmane() {
  const [blocuri, setBlocuri] = useState([])
  const [loading, setLoading] = useState(true)
  const [eroare, setEroare] = useState('')

  useEffect(() => {
    let activ = true
    supabase
      .from('ghid_info_resurse_umane')
      .select('*')
      .order('ordine', { ascending: true })
      .then(({ data, error }) => {
        if (!activ) return
        if (error) {
          setEroare(error.message)
        } else {
          setBlocuri(data || [])
        }
        setLoading(false)
      })
    return () => {
      activ = false
    }
  }, [])

  if (loading) return <p className="text-sm text-slate-400">Se încarcă...</p>
  if (eroare) return <p className="text-sm text-rose-600">Eroare: {eroare}</p>

  if (blocuri.length === 0) {
    return <p className="text-sm text-slate-400">Conținutul se completează în curând.</p>
  }

  return (
    <div className="space-y-4">
      {blocuri.map((bloc) => (
        <div key={bloc.id} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <p className="text-sm text-slate-700 leading-relaxed">{bloc.text}</p>
          {bloc.buton_text && bloc.buton_link && (
            <a
              href={bloc.buton_link}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
            >
              {bloc.buton_text}
              <ArrowRight size={14} />
            </a>
          )}
        </div>
      ))}
    </div>
  )
}
