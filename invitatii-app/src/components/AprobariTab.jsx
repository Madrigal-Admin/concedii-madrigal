import { useEffect, useState } from 'react'
import { Check, ExternalLink } from 'lucide-react'
import { supabase } from '../supabaseClient'

function formatDataOra(dataStr) {
  if (!dataStr) return '—'
  return new Date(dataStr).toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AprobariTab() {
  const [cereri, setCereri] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

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

  function previzualizeaza() {
    window.open(`${window.location.origin}/invitatii/?nominalizare=1`, '_blank')
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-xl text-sm text-slate-500">
          Cereri primite prin formularul public de nominalizare invitați (Corist / Organizare /
          Management). Doar după aprobare, persoanele apar în lista de check-in a evenimentului ales —
          nu ajung niciodată în lista recurentă din tab-ul Persoane.
        </p>
        <button
          onClick={previzualizeaza}
          className="flex items-center gap-1.5 rounded-full bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600"
        >
          <ExternalLink size={13} /> Previzualizează pagina publică
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Se încarcă...</p>
      ) : cereri.length === 0 ? (
        <p className="text-sm text-slate-400">Nicio cerere primită încă.</p>
      ) : (
        <div className="space-y-3">
          {cereri.map((c) => {
            const aprobata = c.status === 'aprobata'
            return (
              <div key={c.id} className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-semibold text-slate-800">{c.evenimente?.nume}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Solicitat de <strong className="text-slate-700">{c.solicitant_nume}</strong>{' '}
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        {c.solicitant_functie}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">Trimisă pe {formatDataOra(c.data_cerere)}</p>
                  </div>

                  {aprobata ? (
                    <span className="shrink-0 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                      Aprobată
                    </span>
                  ) : (
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                        În așteptare
                      </span>
                      <button
                        onClick={() => aproba(c)}
                        disabled={busyId === c.id}
                        className="flex items-center gap-1.5 rounded-full bg-accent hover:bg-accent-hover text-white text-xs font-semibold px-3 py-1.5 transition disabled:opacity-50"
                      >
                        <Check size={13} /> {busyId === c.id ? 'Se aprobă...' : 'Aprobă'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-slate-400">({c.invitati.length}) invitați:</span>
                  {c.invitati.map((nume, i) => (
                    <span key={i} className="rounded-full bg-slate-50 border border-slate-200 px-2.5 py-1 text-xs text-slate-600">
                      {nume}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
