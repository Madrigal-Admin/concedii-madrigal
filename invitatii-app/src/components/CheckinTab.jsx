import { useEffect, useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { supabase } from '../supabaseClient'

const RSVP_BADGE = {
  confirmat: { label: 'Confirmat', className: 'bg-green-50 text-green-700' },
  refuzat: { label: 'Refuzat', className: 'bg-rose-50 text-rose-600' },
  in_asteptare: { label: 'În așteptare', className: 'bg-amber-50 text-amber-700' },
}

function formatData(dataStr) {
  if (!dataStr) return '—'
  return new Date(dataStr).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function CheckinTab() {
  const [evenimente, setEvenimente] = useState([])
  const [evenimentId, setEvenimentId] = useState('')
  const [invitatii, setInvitatii] = useState([])
  const [cautare, setCautare] = useState('')
  const [sortare, setSortare] = useState('nume')
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
      prev.map((i) => (i.id === inv.id ? { ...i, prezent: nouaValoare } : i))
    )
    setBusyId(null)
  }

  const filtrate = useMemo(() => {
    const q = cautare.toLowerCase()
    let lista = invitatii.filter((i) => {
      if (!q) return true
      const numeComplet = i.persoane ? `${i.persoane.prenume} ${i.persoane.nume}` : i.nume_complet_invitat || ''
      return numeComplet.toLowerCase().includes(q) || i.persoane?.email?.toLowerCase().includes(q)
    })

    lista = [...lista].sort((a, b) => {
      if (sortare === 'categorie') {
        return (a.persoane?.categorie || '').localeCompare(b.persoane?.categorie || '')
      }
      const numeA = a.persoane ? `${a.persoane.prenume} ${a.persoane.nume}` : a.nume_complet_invitat || ''
      const numeB = b.persoane ? `${b.persoane.prenume} ${b.persoane.nume}` : b.nume_complet_invitat || ''
      return numeA.localeCompare(numeB)
    })

    return lista
  }, [invitatii, cautare, sortare])

  const prezenti = invitatii.filter((i) => i.prezent).length
  const confirmati = invitatii.filter((i) => i.status_rsvp === 'confirmat').length
  const inAsteptare = invitatii.filter((i) => i.status_rsvp === 'in_asteptare').length
  const refuzati = invitatii.filter((i) => i.status_rsvp === 'refuzat').length

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
          <>
            <input
              value={cautare}
              onChange={(e) => setCautare(e.target.value)}
              placeholder="Caută persoană..."
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Sortează după</label>
              <select
                value={sortare}
                onChange={(e) => setSortare(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="nume">Nume</option>
                <option value="categorie">Categorie</option>
              </select>
            </div>
          </>
        )}
      </div>

      {evenimentId && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-accent p-5 text-white">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/70">Prezenți la intrare</p>
            <p className="font-display text-3xl font-bold">
              {prezenti} <span className="text-lg font-normal text-white/70">/ {invitatii.length} invitați</span>
            </p>
          </div>
          <div className="text-sm text-white/90">
            <p>{confirmati} confirmați</p>
            <p>{inAsteptare} în așteptare</p>
            <p>{refuzati} refuzați</p>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Se încarcă...</p>
      ) : !evenimentId ? (
        <p className="text-sm text-slate-400">Niciun eveniment cu RSVP activ.</p>
      ) : (
        <div className="space-y-1.5">
          {filtrate.map((inv) => {
            const nume = inv.persoane ? `${inv.persoane.prenume} ${inv.persoane.nume}` : inv.nume_complet_invitat
            const badge = RSVP_BADGE[inv.status_rsvp] || RSVP_BADGE.in_asteptare
            return (
              <div key={inv.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800">{nume || 'Fără nume'}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {inv.persoane?.categorie && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        {inv.persoane.categorie}
                      </span>
                    )}
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.className}`}>{badge.label}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-slate-400">{inv.prezent ? 'Prezent' : 'Neprezentat'}</span>
                  <button
                    onClick={() => toggleCheckin(inv)}
                    disabled={busyId === inv.id}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition disabled:opacity-50 ${
                      inv.prezent
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-slate-300 text-transparent hover:border-accent'
                    }`}
                  >
                    <Check size={16} />
                  </button>
                </div>
              </div>
            )
          })}
          {filtrate.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Niciun invitat găsit.</p>}
        </div>
      )}
    </div>
  )
}
