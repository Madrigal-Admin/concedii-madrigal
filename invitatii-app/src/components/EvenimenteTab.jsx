import { useEffect, useState } from 'react'
import { Pencil, Save, X as XIcon } from 'lucide-react'
import { supabase } from '../supabaseClient'

function formatData(dataStr) {
  if (!dataStr) return '—'
  return new Date(dataStr).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function EvenimenteTab({ role }) {
  const [evenimente, setEvenimente] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('evenimente')
      .select('*, invitatii_profil_eveniment(*)')
      .eq('necesita_rsvp', true)
      .order('data', { ascending: true })
    setEvenimente(data || [])
    setLoading(false)
  }

  const azi = new Date().toISOString().slice(0, 10)
  const viitoare = evenimente.filter((e) => e.data && e.data >= azi)
  const incheiate = evenimente.filter((e) => !e.data || e.data < azi).reverse()

  const editingEveniment = evenimente.find((e) => e.id === editingId) || null

  if (loading) return <p className="text-sm text-slate-500">Se încarcă...</p>

  return (
    <div>
      <p className="mb-4 text-sm text-slate-500">
        Evenimentele de aici vin din calendarul central al Hub-ului — cele marcate „necesită RSVP".
        Dacă lipsește un eveniment, verifică bifa din Hub → Calendar.
      </p>

      <Sectiune titlu="Evenimente viitoare" evenimente={viitoare} role={role} onEdit={setEditingId} gol="Niciun eveniment viitor cu RSVP activ." />
      <Sectiune titlu="Evenimente încheiate" evenimente={incheiate} role={role} onEdit={setEditingId} gol="Niciun eveniment încheiat." />

      {editingEveniment && (
        <EditorConținut
          eveniment={editingEveniment}
          onClose={() => setEditingId(null)}
          onSaved={() => {
            setEditingId(null)
            load()
          }}
        />
      )}
    </div>
  )
}

function Sectiune({ titlu, evenimente, role, onEdit, gol }) {
  return (
    <div className="mb-8">
      <h2 className="text-sm font-medium text-slate-500 mb-3">{titlu}</h2>
      {evenimente.length === 0 ? (
        <p className="text-sm text-slate-400">{gol}</p>
      ) : (
        <div className="space-y-2">
          {evenimente.map((e) => {
            const profil = Array.isArray(e.invitatii_profil_eveniment)
              ? e.invitatii_profil_eveniment[0]
              : e.invitatii_profil_eveniment
            return (
              <div key={e.id} className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap items-center gap-3 justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800">{e.nume}</p>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {formatData(e.data)}
                    {e.locatie ? ` · ${e.locatie}` : ''}
                  </p>
                  {!profil?.subiect_email && (
                    <p className="text-xs text-amber-600 mt-1">Fără conținut de email încă</p>
                  )}
                </div>
                {role === 'full' && (
                  <button
                    onClick={() => onEdit(e.id)}
                    className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 focus-ring"
                  >
                    <Pencil size={13} /> Conținut email
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function EditorConținut({ eveniment, onClose, onSaved }) {
  const existing = Array.isArray(eveniment.invitatii_profil_eveniment)
    ? eveniment.invitatii_profil_eveniment[0]
    : eveniment.invitatii_profil_eveniment

  const [subiect, setSubiect] = useState(existing?.subiect_email || '')
  const [mesaj, setMesaj] = useState(existing?.mesaj_intro || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { error } = await supabase.from('invitatii_profil_eveniment').upsert({
      eveniment_id: eveniment.id,
      subiect_email: subiect.trim() || null,
      mesaj_intro: mesaj.trim() || null,
    })

    setSaving(false)
    if (error) {
      setError('Nu am putut salva conținutul.')
      return
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">Conținut email — {eveniment.nume}</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 focus-ring">
            <XIcon size={16} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Subiect email</label>
            <input
              value={subiect}
              onChange={(e) => setSubiect(e.target.value)}
              placeholder="Ex: Invitație la concertul de Crăciun"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Mesaj introductiv <span className="text-slate-400">(poți folosi {'{{nume}}'})</span>
            </label>
            <textarea
              value={mesaj}
              onChange={(e) => setMesaj(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <p className="text-xs text-slate-400">
            Afișul (poster) se adaugă într-o etapă viitoare, când conectăm încărcarea de imagini.
          </p>

          {error && <p className="text-xs text-rose-600">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 rounded-full bg-accent hover:bg-accent-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition disabled:opacity-50"
            >
              <Save size={14} /> {saving ? 'Se salvează...' : 'Salvează'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 focus-ring"
            >
              <XIcon size={14} /> Închide
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
