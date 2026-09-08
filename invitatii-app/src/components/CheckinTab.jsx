import { useEffect, useMemo, useState } from 'react'
import { Check, Undo2 } from 'lucide-react'
import { supabase } from '../supabaseClient'

function formatData(dataStr) {
  if (!dataStr) return '—'
  return new Date(dataStr).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function CheckinTab() {
  const [evenimente, setEvenimente] = useState([])
  const [evenimentId, setEvenimentId] = useState('')
  const [invitatii, setInvitatii] = useState([])
  const [cautare, setCautare] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    loadEvenimente()
  }, [])

  useEffect(() => {
    if (evenimentId) loadInvitatii(evenimentId)
  }, [evenimentId])

  async function loadEvenimente() {
    const { data } = await supabase
      .from('evenimente')
      .select('id, nume, data')
      .eq('necesita_rsvp', true)
      .order('data', { ascending: false })

    const lista = data || []
    setEvenimente(lista)

    // Alegem implicit cel mai apropiat eveniment de azi (viitor sau azi),
    // altfel cel mai recent încheiat.
    const azi = new Date().toISOString().slice(0, 10)
    const viitor = [...lista].reverse().find((e) => e.data >= azi)
    setEvenimentId(viitor?.id || lista[0]?.id || '')
    setLoading(false)
  }

  async function loadInvitatii(id) {
    setLoading(true)
    const { data } = await supabase
      .from('invitatii')
      .select('*, persoane(nume, prenume, email, categorie)')
      .eq('eveniment_id', id)
    setInvitatii(data || [])
    setLoading(false)
  }

  async function toggleCheckin(inv) {
    setBusyId(inv.id)
    const nouaValoare = !inv.prezent
    await supabase
      .from('invitatii')
      .update({ prezent: nouaValoare, data_checkin: nouaValoare ? new Date().toISOString() : null })
      .eq('id', inv.id)

    setInvitatii((prev) =>
      prev.map((i) => (i.id === inv.id ? { ...i, prezent: nouaValoare, data_checkin: nouaValoare ? new Date().toISOString() : null } : i))
    )
    setBusyId(null)
  }

  const filtrate = useMemo(() => {
    const q = cautare.toLowerCase()
    return invitatii.filter((i) => {
      if (!q) return true
      const numeComplet = i.persoane
        ? `${i.persoane.prenume} ${i.persoane.nume}`
        : i.nume_complet_invitat || ''
      return numeComplet.toLowerCase().includes(q) || i.persoane?.email?.toLowerCase().includes(q)
    })
  }, [invitatii, cautare])

  const prezenti = invitatii.filter((i) => i.prezent).length

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Eveniment</label>
          <select
            value={evenimentId}
            onChange={(e) => setEvenimentId(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {evenimente.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nume} — {formatData(e.data)}
              </option>
            ))}
          </select>
        </div>

        {evenimentId && (
          <div className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
            {prezenti} / {invitatii.length} prezenți
          </div>
        )}
      </div>

      {evenimentId && (
        <input
          value={cautare}
          onChange={(e) => setCautare(e.target.value)}
          placeholder="Caută invitat, după nume sau email..."
          className="mb-4 w-full sm:w-96 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Se încarcă...</p>
      ) : !evenimentId ? (
        <p className="text-sm text-slate-400">Niciun eveniment cu RSVP activ.</p>
      ) : (
        <div className="space-y-1.5">
          {filtrate.map((inv) => {
            const nume = inv.persoane ? `${inv.persoane.prenume} ${inv.persoane.nume}` : inv.nume_complet_invitat
            return (
              <div
                key={inv.id}
                className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${
                  inv.prezent ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-800">{nume || 'Fără nume'}</p>
                  <p className="text-xs text-slate-500">
                    {inv.persoane?.categorie || '—'}
                    {inv.status_rsvp === 'confirmat' && ' · RSVP confirmat'}
                    {inv.status_rsvp === 'refuzat' && ' · RSVP refuzat'}
                  </p>
                </div>
                <button
                  onClick={() => toggleCheckin(inv)}
                  disabled={busyId === inv.id}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                    inv.prezent
                      ? 'bg-white text-slate-500 border border-slate-300 hover:bg-slate-50'
                      : 'bg-accent text-white hover:bg-accent-hover'
                  }`}
                >
                  {inv.prezent ? (
                    <>
                      <Undo2 size={13} /> Anulează
                    </>
                  ) : (
                    <>
                      <Check size={13} /> Check-in
                    </>
                  )}
                </button>
              </div>
            )
          })}
          {filtrate.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-400">Niciun invitat găsit.</p>
          )}
        </div>
      )}
    </div>
  )
}
