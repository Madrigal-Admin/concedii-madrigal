import { useEffect, useState } from 'react'
import { ExternalLink, Link2 } from 'lucide-react'
import { supabase } from '../../supabaseClient'

// Tab-ul "Linkuri utile" — grupuri WhatsApp și alte link-uri, titlu +
// descriere scurtă + link. Gestionat din Admin Hub.
export default function LinkuriUtile() {
  const [linkuri, setLinkuri] = useState([])
  const [loading, setLoading] = useState(true)
  const [eroare, setEroare] = useState('')

  useEffect(() => {
    let activ = true
    supabase
      .from('ghid_linkuri_utile')
      .select('*')
      .order('ordine', { ascending: true })
      .then(({ data, error }) => {
        if (!activ) return
        if (error) {
          setEroare(error.message)
        } else {
          setLinkuri(data || [])
        }
        setLoading(false)
      })
    return () => {
      activ = false
    }
  }, [])

  if (loading) return <p className="text-sm text-slate-400">Se încarcă...</p>
  if (eroare) return <p className="text-sm text-rose-600">Eroare: {eroare}</p>
  if (linkuri.length === 0) {
    return <p className="text-sm text-slate-400">Lista se completează în curând.</p>
  }

  return (
    <ul className="space-y-2">
      {linkuri.map((l) => (
        <li key={l.id}>
          <a
            href={l.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-lg p-4 hover:border-accent/30 hover:bg-white transition"
          >
            <Link2 size={18} className="text-slate-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800">{l.titlu}</p>
              {l.descriere && <p className="text-sm text-slate-500 mt-0.5">{l.descriere}</p>}
            </div>
            <ExternalLink size={15} className="text-slate-400 flex-shrink-0 mt-0.5" />
          </a>
        </li>
      ))}
    </ul>
  )
}
