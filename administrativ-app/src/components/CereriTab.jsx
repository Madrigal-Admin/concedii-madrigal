import { useEffect, useState } from 'react'
import { Plus, Trash2, Send, Download } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { downloadReferatDocx } from '../lib/generateReferatDocx'

const STATUS_BADGE = {
  in_asteptare: { label: 'În așteptare', className: 'bg-amber-50 text-amber-700' },
  aprobata: { label: 'Aprobată', className: 'bg-green-50 text-green-700' },
  respinsa: { label: 'Respinsă', className: 'bg-rose-50 text-rose-600' },
}

function formatData(dataStr) {
  return new Date(dataStr).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function CereriTab({ angajat }) {
  const [cereri, setCereri] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('cereri_eliberare')
      .select('*, cereri_eliberare_linii(*)')
      .eq('angajat_id', angajat.id)
      .order('created_at', { ascending: false })
    setCereri(data || [])
    setLoading(false)
  }

  async function handleDownload(cerere) {
    await downloadReferatDocx(cerere, cerere.cereri_eliberare_linii)
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Cererile mele</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover"
        >
          <Plus size={13} /> Cerere nouă
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Se încarcă…</p>
      ) : cereri.length === 0 ? (
        <p className="text-sm text-slate-400">Nicio cerere depusă încă.</p>
      ) : (
        <div className="space-y-2">
          {cereri.map((c) => {
            const badge = STATUS_BADGE[c.status]
            return (
              <div key={c.id} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-xs text-slate-400">{formatData(c.created_at)}</p>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badge.className}`}>{badge.label}</span>
                </div>
                <p className="mb-2 text-sm text-slate-600">{c.motiv}</p>
                <ul className="mb-2 space-y-0.5 text-sm text-slate-700">
                  {c.cereri_eliberare_linii.map((l) => (
                    <li key={l.id}>• {l.denumire_obiect} — {l.cantitate}</li>
                  ))}
                </ul>
                {c.status === 'aprobata' && (
                  <button
                    onClick={() => handleDownload(c)}
                    className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
                  >
                    <Download size={13} /> Descarcă documentul
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <CerereForm
          angajat={angajat}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false)
            load()
          }}
        />
      )}
    </div>
  )
}

function CerereForm({ angajat, onClose, onSaved }) {
  const [catalog, setCatalog] = useState([])
  const [cautare, setCautare] = useState('')
  const [linii, setLinii] = useState([])
  const [motiv, setMotiv] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('stoc_obiecte').select('*').order('denumire').then(({ data }) => setCatalog(data || []))
  }, [])

  const sugestii = cautare.length < 2 ? [] : catalog.filter((o) => o.denumire.toLowerCase().includes(cautare.toLowerCase())).slice(0, 8)

  function adaugaLinie(obiect) {
    if (linii.some((l) => l.obiect_id === obiect.id)) return
    setLinii((prev) => [...prev, { obiect_id: obiect.id, denumire_obiect: obiect.denumire, cantitate: 1, max: obiect.cantitate }])
    setCautare('')
  }

  function actualizeazaCantitate(obiectId, valoare) {
    setLinii((prev) => prev.map((l) => (l.obiect_id === obiectId ? { ...l, cantitate: valoare } : l)))
  }

  function eliminaLinie(obiectId) {
    setLinii((prev) => prev.filter((l) => l.obiect_id !== obiectId))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (linii.length === 0) {
      setError('Adaugă cel puțin un obiect.')
      return
    }
    if (linii.some((l) => !l.cantitate || Number(l.cantitate) <= 0)) {
      setError('Toate cantitățile trebuie să fie numere pozitive.')
      return
    }

    setSaving(true)

    const { data: cerere, error: errCerere } = await supabase
      .from('cereri_eliberare')
      .insert({
        angajat_id: angajat.id,
        motiv: motiv.trim(),
        nume_angajat: angajat.nume_complet,
        departament_angajat: angajat.department?.name || null,
      })
      .select()
      .single()

    if (errCerere) {
      setSaving(false)
      setError('Nu am putut crea cererea.')
      return
    }

    const payload = linii.map((l) => ({
      cerere_id: cerere.id,
      obiect_id: l.obiect_id,
      denumire_obiect: l.denumire_obiect,
      cantitate: Number(l.cantitate),
    }))
    const { error: errLinii } = await supabase.from('cereri_eliberare_linii').insert(payload)

    setSaving(false)
    if (errLinii) {
      setError('Cererea a fost creată, dar liniile nu s-au salvat complet. Contactează adminul.')
      return
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="mb-1 text-lg font-semibold text-slate-800">Cerere eliberare din magazie</h3>
        <p className="mb-4 text-xs text-slate-400">
          {angajat.nume_complet} · {angajat.department?.name || '—'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Adaugă obiect</label>
            <input
              value={cautare}
              onChange={(e) => setCautare(e.target.value)}
              placeholder="Caută în catalog..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
            {sugestii.length > 0 && (
              <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-slate-200">
                {sugestii.map((o) => (
                  <button
                    type="button"
                    key={o.id}
                    onClick={() => adaugaLinie(o)}
                    className="block w-full border-b border-slate-50 px-3 py-2 text-left text-sm hover:bg-slate-50 last:border-b-0"
                  >
                    {o.denumire} <span className="text-xs text-slate-400">(stoc: {o.cantitate} {o.um})</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {linii.length > 0 && (
            <div className="space-y-1.5">
              {linii.map((l) => (
                <div key={l.obiect_id} className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm">
                  <span className="flex-1 truncate">{l.denumire_obiect}</span>
                  <input
                    type="number"
                    min="1"
                    value={l.cantitate}
                    onChange={(e) => actualizeazaCantitate(l.obiect_id, e.target.value)}
                    className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-xs"
                  />
                  <button type="button" onClick={() => eliminaLinie(l.obiect_id)} className="text-slate-300 hover:text-rose-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Motiv <span className="text-slate-400">({motiv.length}/200)</span>
            </label>
            <textarea
              required
              value={motiv}
              onChange={(e) => setMotiv(e.target.value.slice(0, 200))}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {error && <p className="text-xs text-rose-600">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
            >
              <Send size={14} /> {saving ? 'Se trimite...' : 'Trimite cererea'}
            </button>
            <button type="button" onClick={onClose} className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-600 hover:bg-slate-200">
              Anulează
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
