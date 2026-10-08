import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

// Tab-ul public "Despre Madrigal" — paragrafe și imagini, în ordine,
// scroll simplu. Imaginile vin din bucket-ul privat "ghid-foto", de
// aceea generăm câte un URL semnat pentru fiecare.
export default function DespreMadrigal() {
  const [blocuri, setBlocuri] = useState([])
  const [loading, setLoading] = useState(true)
  const [eroare, setEroare] = useState('')

  useEffect(() => {
    let activ = true

    async function incarca() {
      const { data, error } = await supabase
        .from('ghid_despre_blocuri')
        .select('*')
        .order('ordine', { ascending: true })

      if (!activ) return

      if (error) {
        setEroare(error.message)
        setLoading(false)
        return
      }

      const blocuriCuImagini = await Promise.all(
        (data || []).map(async (b) => {
          if (b.tip === 'imagine' && b.imagine_url) {
            const { data: semnat } = await supabase.storage
              .from('ghid-foto')
              .createSignedUrl(b.imagine_url, 300)
            return { ...b, imagine_semnata: semnat?.signedUrl || null }
          }
          return b
        })
      )

      if (!activ) return
      setBlocuri(blocuriCuImagini)
      setLoading(false)
    }

    incarca()
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
    <div className="space-y-4 max-w-2xl mx-auto">
      {blocuri.map((b) =>
        b.tip === 'imagine' ? (
          b.imagine_semnata && (
            <figure key={b.id}>
              <img
                src={b.imagine_semnata}
                alt={b.descriere_imagine || ''}
                className="w-full rounded-lg border border-slate-200"
              />
              {b.descriere_imagine && (
                <figcaption className="text-xs text-slate-400 mt-1.5 text-center">
                  {b.descriere_imagine}
                </figcaption>
              )}
            </figure>
          )
        ) : (
          <p key={b.id} className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
            {b.continut}
          </p>
        )
      )}
    </div>
  )
}
