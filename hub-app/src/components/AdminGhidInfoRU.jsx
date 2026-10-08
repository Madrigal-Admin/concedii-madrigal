import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const EMPTY_FORM = {
  text: '',
  buton_text: '',
  buton_link: '',
  ordine: 0,
}

// Administrarea "Informații Resurse Umane" din Ghidul angajatului —
// blocuri de text simplu, fiecare cu un buton opțional spre o pagină din
// Hub (ex: /HR/). Niciun fișier de încărcat — doar text.
export default function AdminGhidInfoRU() {
  const [blocuri, setBlocuri] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    const { data } = await supabase
      .from('ghid_info_resurse_umane')
      .select('*')
      .order('ordine', { ascending: true })
    setBlocuri(data || [])
    setLoading(false)
  }

  function startEdit(bloc) {
    setEditingId(bloc.id)
    setForm({
      text: bloc.text || '',
      buton_text: bloc.buton_text || '',
      buton_link: bloc.buton_link || '',
      ordine: bloc.ordine ?? 0,
    })
    setError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError('')
  }

  async function handleDelete(bloc) {
    const confirmat = confirm('Ștergi definitiv acest bloc de text?')
    if (!confirmat) return

    const { error } = await supabase.from('ghid_info_resurse_umane').delete().eq('id', bloc.id)
    if (error) {
      setError('Nu am putut șterge: ' + error.message)
      return
    }
    loadAll()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const text = form.text.trim()
    if (!text) {
      setError('Textul e obligatoriu.')
      return
    }

    const butonText = form.buton_text.trim()
    const butonLink = form.buton_link.trim()
    if ((butonText && !butonLink) || (!butonText && butonLink)) {
      setError('Pentru buton, completează și textul, și link-ul (sau lasă-le pe amândouă goale).')
      return
    }

    setSaving(true)

    const payload = {
      text,
      buton_text: butonText || null,
      buton_link: butonLink || null,
      ordine: Number(form.ordine) || 0,
      updated_at: new Date().toISOString(),
    }

    const { error: saveError } = editingId
      ? await supabase.from('ghid_info_resurse_umane').update(payload).eq('id', editingId)
      : await supabase.from('ghid_info_resurse_umane').insert(payload)

    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }

    cancelEdit()
    loadAll()
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-800 mb-1">
        Ghidul angajatului — Informații Resurse Umane
      </h2>
      <p className="text-sm text-slate-500 mb-6">
        Text explicativ (ex: cum obții o adeverință prin Hub), nu fișiere de descărcat.
        Fiecare bloc poate avea, opțional, un buton care trimite către o pagină din Hub.
      </p>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-sm p-5 mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        <div className="sm:col-span-2">
          <label className="block text-sm text-slate-600 mb-1">Text</label>
          <textarea
            required
            rows={3}
            value={form.text}
            onChange={(e) => setForm({ ...form, text: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-600 mb-1">Text buton (opțional)</label>
          <input
            value={form.buton_text}
            onChange={(e) => setForm({ ...form, buton_text: e.target.value })}
            placeholder='ex: "Mergi la Resurse Umane"'
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-600 mb-1">Link buton (opțional)</label>
          <input
            value={form.buton_link}
            onChange={(e) => setForm({ ...form, buton_link: e.target.value })}
            placeholder="ex: /HR/"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-600 mb-1">Ordine afișare</label>
          <input
            type="number"
            value={form.ordine}
            onChange={(e) => setForm({ ...form, ordine: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <p className="text-xs text-slate-400 mt-1">Numerele mici apar primele.</p>
        </div>

        {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}

        <div className="sm:col-span-2 flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-accent hover:bg-accent-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition disabled:opacity-50"
          >
            {saving ? 'Se salvează...' : editingId ? 'Salvează modificările' : 'Adaugă bloc'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="text-sm text-slate-500 px-4 py-2 rounded-lg hover:bg-slate-100"
            >
              Anulează
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p className="text-sm text-slate-500">Se încarcă...</p>
      ) : (
        <div className="space-y-3">
          {blocuri.map((bloc) => (
            <div key={bloc.id} className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-sm text-slate-700">{bloc.text}</p>
              {bloc.buton_text && (
                <p className="text-xs text-slate-400 mt-2">
                  Buton: "{bloc.buton_text}" → {bloc.buton_link}
                </p>
              )}
              <div className="mt-3 flex gap-3">
                <button
                  onClick={() => startEdit(bloc)}
                  className="text-accent text-sm hover:underline"
                >
                  Editează
                </button>
                <button
                  onClick={() => handleDelete(bloc)}
                  className="text-rose-500 text-sm hover:underline"
                >
                  Șterge
                </button>
              </div>
            </div>
          ))}
          {blocuri.length === 0 && (
            <p className="text-sm text-slate-400">Niciun bloc de text adăugat încă.</p>
          )}
        </div>
      )}
    </div>
  )
}
