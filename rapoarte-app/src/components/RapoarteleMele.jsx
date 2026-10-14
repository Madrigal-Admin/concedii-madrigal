import { useEffect, useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { btnPrimary, btnGhost } from '../lib/ui'
import RaportForm from './RaportForm'
import RaportCard from './RaportCard'

export default function RapoarteleMele({ angajat }) {
  const [loading, setLoading] = useState(true)
  const [persoana, setPersoana] = useState(null)
  const [contracte, setContracte] = useState([])
  const [rapoarte, setRapoarte] = useState([])
  const [campuri, setCampuri] = useState([])
  const [formular, setFormular] = useState(null) // null | 'nou' | raport

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [angajat?.id])

  async function load() {
    setLoading(true)
    if (!angajat) {
      setLoading(false)
      return
    }
    const { data: p } = await supabase.from('rap_persoane').select('*').eq('angajat_id', angajat.id).maybeSingle()
    setPersoana(p || null)
    if (p) {
      const [{ data: c }, { data: f }] = await Promise.all([
        supabase.from('rap_contracte').select('*').eq('persoana_id', p.id).eq('activ', true).order('valabil_de_la'),
        supabase.from('rap_campuri').select('*').eq('modul', 'activitate').eq('activ', true).order('ordine'),
      ])
      setContracte(c || [])
      setCampuri(f || [])
      const ids = (c || []).map((x) => x.id)
      if (ids.length) {
        const { data: r } = await supabase
          .from('rap_activitate')
          .select('*')
          .in('contract_id', ids)
          .order('an', { ascending: false })
          .order('luna', { ascending: false })
        setRapoarte(r || [])
      } else setRapoarte([])
    }
    setLoading(false)
  }

  if (loading) return <p className="text-sm text-slate-500">Se încarcă…</p>

  if (!persoana || contracte.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
        Nu ai încă un contract înregistrat în Rapoarte. Cere administratorului Rapoartelor de activitate să-l
        adauge, apoi vei putea depune rapoartele lunare.
      </div>
    )
  }

  if (formular) {
    return (
      <RaportForm
        contracte={contracte}
        campuri={campuri}
        raport={formular === 'nou' ? null : formular}
        onCancel={() => setFormular(null)}
        onSaved={() => {
          setFormular(null)
          load()
        }}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-slate-800">Rapoartele mele de activitate</h2>
        <button onClick={() => setFormular('nou')} className={btnPrimary}>
          <Plus size={14} /> Raport nou
        </button>
      </div>

      {rapoarte.length === 0 && <p className="text-sm text-slate-500">Nu ai depus încă niciun raport.</p>}

      {rapoarte.map((r) => {
        const contract = contracte.find((c) => c.id === r.contract_id)
        const poateEdita = r.stare === 'trimis' || r.stare === 'respins'
        return (
          <RaportCard
            key={r.id}
            raport={r}
            contract={contract}
            persoana={persoana}
            campuri={campuri}
            actiuni={
              poateEdita && (
                <button onClick={() => setFormular(r)} className={btnGhost}>
                  <Pencil size={14} /> {r.stare === 'respins' ? 'Corectează și retrimite' : 'Editează'}
                </button>
              )
            }
          />
        )
      })}
    </div>
  )
}
