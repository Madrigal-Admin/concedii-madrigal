import { useEffect, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { supabase } from '../supabaseClient'

export default function AprobariTab() {
  const [cereri, setCereri] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [copiat, setCopiat] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('cereri_invitati')
      .select('*, evenimente(nume)')
      .order('data_cerere', { ascending: false })
    setCereri(data || [])
    setLoading(false)
  }

  async function aproba(cerere) {
    setBusyId(cerere.id)

    const payload = cerere.invitati.map((nume) => ({
      eveniment_id: cerere.eveniment_id,
      nume_complet_invitat: nume,
      sursa: 'nominalizare',
      cerere_id: cerere.id,
    }))

    await supabase.from('invitatii').insert(payload)
    await supabase.from('cereri_invitati').update({ status: 'aprobata' }).eq('id', cerere.id)

    setBusyId(null)
    load()
  }

  function copiazaLinkNominalizare() {
    const link = `${window.location.origin}/invitatii/?nominalizare=1`
    navigator.clipboard.writeText(link)
    setCopiat(true)
    setTimeout(() => setCopiat(false), 2000)
  }

  const inAsteptare = cereri.filter((c) => c.status === 'in_asteptare')
  const aprobate = cereri.filter((c) => c.status === 'aprobata')

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-600">
          Link-ul de nominalizare, de trimis staff-ului (Coriști/Organizare/Management):
        </p>
        <button
          onClick={copiazaLinkNominalizare}
          className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
        >
          <Copy size={13} /> {copiat ? 'Copiat!' : 'Copiază link-ul'}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Se încarcă...</p>
      ) : (
        <>
          <h2 className="mb-3 text-sm font-medium text-slate-500">În așteptare</h2>
          {inAsteptare.length === 0 && <p className="mb-6 text-sm text-slate-400">Nicio cerere în așteptare.</p>}
          <div className="mb-8 space-y-2">
            {inAsteptare.map((c) => (
              <div key={c.id} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-800">
                      {c.solicitant_nume} <span className="text-slate-400">({c.solicitant_functie})</span>
                    </p>
                    <p className="text-sm text-slate-500">
                      pentru <strong>{c.evenimente?.nume}</strong>
                    </p>
                    <p className="mt-1 text-sm text-slate-600">{c.invitati.join(', ')}</p>
                  </div>
                  <button
                    onClick={() => aproba(c)}
                    disabled={busyId === c.id}
                    className="flex items-center gap-1.5 rounded-full bg-accent hover:bg-accent-hover text-white text-xs font-medium px-3 py-1.5 transition disabled:opacity-50"
                  >
                    <Check size={13} /> {busyId === c.id ? 'Se aprobă...' : 'Aprobă'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <h2 className="mb-3 text-sm font-medium text-slate-500">Aprobate</h2>
          {aprobate.length === 0 && <p className="text-sm text-slate-400">Nicio cerere aprobată încă.</p>}
          <div className="space-y-2">
            {aprobate.map((c) => (
              <div key={c.id} className="rounded-xl bg-white p-4 shadow-sm opacity-70">
                <p className="font-medium text-slate-800">
                  {c.solicitant_nume} <span className="text-slate-400">({c.solicitant_functie})</span>
                </p>
                <p className="text-sm text-slate-500">
                  pentru <strong>{c.evenimente?.nume}</strong> — {c.invitati.join(', ')}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
