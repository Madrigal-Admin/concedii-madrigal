import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const EMPTY_FORM = { titlu: '', descriere: '', link: '', ordine: 0 }

// Administrarea "Linkuri utile" din Ghidul angajatului — grupuri
// WhatsApp și alte link-uri utile: titlu, descriere scurtă, link.
export default function AdminGhidLinkuri() {
  const [linkuri, setLinkuri] = useState([])
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
      .from('ghid_linkuri_utile')
      .select('*')
      .order('ordine', { ascending: true })
    setLinkuri(data || [])
    setLoading(false)
  }

  function startEdit(l) {
    setEditingId(l.id)
    setForm({
      titlu: l.titlu || '',
      descriere: l.descriere || '',
      link: l.link || '',
      ordine: l.ordine ?? 0,
    })
    setError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError('')
  }

  async function handleDelete(l) {
    const confirmat = confirm(`Ștergi link-ul "${l.titlu}"?`)
    if (!confirmat) return

    const { error } = await supabase.from('ghid_linkuri_utile').delete().eq('id', l.id)
    if (error) {
      setError('Nu am putut șterge: ' + error.message)
      return
    }
    loadAll()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const titlu = form.titlu.trim()
    const link = form.link.trim()
    if (!titlu || !link) {
      setError('Titlul și link-ul sunt obligatorii.')
      return
    }

    setSaving(true)

    const payload = {
      titlu,
      descriere: form.descriere.trim() || null,
      link,
      ordine: Number(form.ordine) || 0,
      updated_at: new Date().toISOString(),
    }

    const { error: saveError } = editingId
      ? await supabase.from('ghid_linkuri_utile').update(payload).eq('id', editingId)
      : await supabase.from('ghid_linkuri_utile').insert(payload)

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
      <h2 className="text-lg font-semibold text-slate-800 mb-1">Ghidul angajatului — Linkuri utile</h2>
      <p className="text-sm text-slate-500 mb-6">
        Grupuri WhatsApp și alte link-uri utile pentru colegi.
      </p>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-sm p-5 mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        <div>
          <label className="block text-sm text-slate-600 mb-1">Titlu</label>
          <input
            required
            value={form.titlu}
            onChange={(e) => setForm({ ...form, titlu: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-600 mb-1">Link</label>
          <input
            required
            value={form.link}
            onChange={(e) => setForm({ ...form, link: e.target.value })}
            placeholder="https://chat.whatsapp.com/..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm text-slate-600 mb-1">Descriere (opțional)</label>
          <input
            value={form.descriere}
            onChange={(e) => setForm({ ...form, descriere: e.target.value })}
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
        </div>

        {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}

        <div className="sm:col-span-2 flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-accent hover:bg-accent-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition disabled:opacity-50"
          >
            {saving ? 'Se salvează...' : editingId ? 'Salvează modificările' : 'Adaugă link'}
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
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Titlu</th>
                <th className="px-4 py-3 font-medium">Link</th>
                <th className="px-4 py-3 font-medium">Ordine</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {linkuri.map((l) => (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-800">{l.titlu}</td>
                  <td className="px-4 py-3 text-slate-500 truncate max-w-[220px]">{l.link}</td>
                  <td className="px-4 py-3 text-slate-500">{l.ordine}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => startEdit(l)} className="text-accent text-sm hover:underline mr-3">
                      Editează
                    </button>
                    <button onClick={() => handleDelete(l)} className="text-rose-500 text-sm hover:underline">
                      Șterge
                    </button>
                  </td>
                </tr>
              ))}
              {linkuri.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    Niciun link adăugat încă.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
