import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { PublicLayout } from './PublicLayout'

const FUNCTII = ['Corist', 'Organizare', 'Management']

export default function NominalizarePage() {
  const [evenimente, setEvenimente] = useState([])
  const [evenimentId, setEvenimentId] = useState('')
  const [nume, setNume] = useState('')
  const [functie, setFunctie] = useState('')
  const [invitati, setInvitati] = useState([''])
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.rpc('nominalizare_evenimente_disponibile').then(({ data }) => {
      setEvenimente(data || [])
      if (data?.length) setEvenimentId(data[0].id)
    })
  }, [])

  function updateInvitat(i, value) {
    setInvitati((prev) => prev.map((v, idx) => (idx === i ? value : v)))
  }

  function addInvitat() {
    setInvitati((prev) => [...prev, ''])
  }

  function removeInvitat(i) {
    setInvitati((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const listaCurata = invitati.map((v) => v.trim()).filter(Boolean)
    if (!evenimentId || !nume.trim() || !functie || listaCurata.length === 0) {
      setError('Completează toate câmpurile și cel puțin un invitat.')
      return
    }

    setSaving(true)
    const { error } = await supabase.rpc('nominalizare_creeaza', {
      p_eveniment_id: evenimentId,
      p_solicitant_nume: nume.trim(),
      p_solicitant_functie: functie,
      p_invitati: listaCurata,
    })
    setSaving(false)

    if (error) {
      setError('Nu am putut trimite cererea. Încearcă din nou.')
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <PublicLayout>
        <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
          <p className="text-sm text-slate-600">
            Cererea ta a fost trimisă. Un administrator o va aproba în curând.
          </p>
        </div>
      </PublicLayout>
    )
  }

  return (
    <PublicLayout>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold text-slate-800">Nominalizare invitați</h2>
        <p className="text-sm text-slate-500">
          Propune persoane pe care vrei să le inviți la un eveniment viitor al corului.
        </p>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Eveniment</label>
          <select
            value={evenimentId}
            onChange={(e) => setEvenimentId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {evenimente.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nume}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Numele tău</label>
          <input
            value={nume}
            onChange={(e) => setNume(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Rolul tău</label>
          <select
            value={functie}
            onChange={(e) => setFunctie(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">— Alege —</option>
            {FUNCTII.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Invitați (nume complet)</label>
          <div className="space-y-2">
            {invitati.map((v, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={v}
                  onChange={(e) => updateInvitat(i, e.target.value)}
                  placeholder="Nume Prenume"
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
                {invitati.length > 1 && (
                  <button type="button" onClick={() => removeInvitat(i)} className="text-slate-400 hover:text-rose-600">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addInvitat}
            className="mt-2 flex items-center gap-1 text-xs font-medium text-accent hover:underline"
          >
            <Plus size={13} /> Adaugă alt invitat
          </button>
        </div>

        {error && <p className="text-xs text-rose-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-full bg-accent hover:bg-accent-hover text-white text-sm font-semibold py-2.5 transition disabled:opacity-50"
        >
          {saving ? 'Se trimite...' : 'Trimite cererea'}
        </button>
      </form>
    </PublicLayout>
  )
}
