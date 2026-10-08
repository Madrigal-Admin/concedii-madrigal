import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

// Corp "placeholder" comun — dovedește că citirea din Supabase (tabel +
// RLS) funcționează de la cap la coadă, fără să construim încă interfața
// finală a secțiunii respective (vine la etapa ei, din ordinea stabilită).
//
// table: numele tabelului de verificat
// etapa: textul care spune la ce etapă vine conținutul real
export default function PlaceholderContinut({ table, etapa }) {
  const [numarRanduri, setNumarRanduri] = useState(null)
  const [eroare, setEroare] = useState('')

  useEffect(() => {
    let activ = true
    supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .then(({ count, error }) => {
        if (!activ) return
        if (error) {
          setEroare(error.message)
        } else {
          setNumarRanduri(count ?? 0)
        }
      })
    return () => {
      activ = false
    }
  }, [table])

  return (
    <div className="text-sm text-slate-500 space-y-3">
      <p>
        Conținutul acestei secțiuni se completează la <strong>{etapa}</strong>.
      </p>
      {eroare ? (
        <p className="text-rose-600">Eroare la citirea datelor: {eroare}</p>
      ) : (
        <p className="text-slate-400">
          (Verificare tehnică: {numarRanduri === null ? '...' : numarRanduri} înregistrări
          găsite în baza de date pentru această secțiune.)
        </p>
      )}
    </div>
  )
}
