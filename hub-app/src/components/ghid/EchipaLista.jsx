import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

function initiale(nume) {
  return nume
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

// Tab-ul "Echipa" — listă simplă, întreținută manual din Admin Hub (nume +
// rol), NU legată de tabelul angajați. Fără căutare sau filtre — e o
// listă scurtă de persoane utile, nu un director complet.
export default function EchipaLista() {
  const [persoane, setPersoane] = useState([])
  const [loading, setLoading] = useState(true)
  const [eroare, setEroare] = useState('')

  useEffect(() => {
    let activ = true
    supabase
      .from('ghid_echipa_persoane')
      .select('*')
      .order('ordine', { ascending: true })
      .then(({ data, error }) => {
        if (!activ) return
        if (error) {
          setEroare(error.message)
        } else {
          setPersoane(data || [])
        }
        setLoading(false)
      })
    return () => {
      activ = false
    }
  }, [])

  if (loading) return <p className="text-sm text-slate-400">Se încarcă...</p>
  if (eroare) return <p className="text-sm text-rose-600">Eroare: {eroare}</p>
  if (persoane.length === 0) {
    return <p className="text-sm text-slate-400">Lista se completează în curând.</p>
  }

  return (
    <ul className="space-y-2">
      {persoane.map((p) => (
        <li
          key={p.id}
          className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3"
        >
          <span className="w-10 h-10 flex-shrink-0 rounded-full bg-accent/10 text-accent flex items-center justify-center text-sm font-semibold">
            {initiale(p.nume)}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{p.nume}</p>
            <p className="text-sm text-slate-500 truncate">{p.rol}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
