import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import RichTextContent from './RichTextContent'

// Tab-ul public "Despre Madrigal" — un singur text formatat (vine din
// tabela ghid_despre, un singur rând), gestionat din Admin Hub cu un
// editor de text cu formatare (vezi AdminGhidDespre.jsx).
export default function DespreMadrigal() {
  const [continut, setContinut] = useState('')
  const [loading, setLoading] = useState(true)
  const [eroare, setEroare] = useState('')

  useEffect(() => {
    let activ = true

    supabase
      .from('ghid_despre')
      .select('continut_html')
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!activ) return
        if (error) {
          setEroare(error.message)
        } else {
          setContinut(data?.continut_html || '')
        }
        setLoading(false)
      })

    return () => {
      activ = false
    }
  }, [])

  if (loading) return <p className="text-sm text-slate-400">Se încarcă...</p>
  if (eroare) return <p className="text-sm text-rose-600">Eroare: {eroare}</p>
  if (!continut) {
    return <p className="text-sm text-slate-400">Conținutul se completează în curând.</p>
  }

  return (
    <div className="max-w-2xl mx-auto">
      <RichTextContent html={continut} />
    </div>
  )
}
