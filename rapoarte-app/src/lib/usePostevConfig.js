import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

// Încarcă o singură dată configurarea modulului post-eveniment.
export function usePostevConfig() {
  const [cfg, setCfg] = useState({ loading: true, tipuri: [], campuri: [], matrice: [], angajati: [] })

  useEffect(() => {
    let activ = true
    Promise.all([
      supabase.from('rap_tipuri').select('*').order('ordine'),
      supabase.from('rap_postev_campuri').select('*').order('ordine'),
      supabase.from('rap_postev_campuri_tipuri').select('*'),
      supabase.from('angajati').select('id, nume_complet, activ').order('nume_complet'),
    ]).then(([t, c, m, a]) => {
      if (!activ) return
      setCfg({
        loading: false,
        tipuri: t.data || [],
        campuri: c.data || [],
        matrice: m.data || [],
        angajati: a.data || [],
      })
    })
    return () => {
      activ = false
    }
  }, [])

  return cfg
}
