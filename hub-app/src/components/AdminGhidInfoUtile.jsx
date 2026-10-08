import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const EMPTY_FORM = {
  subiect: '',
  intrebare: '',
  raspuns: '',
  buton_text: '',
  buton_link: '',
  ordine: 0,
}

// Administrarea "Informații utile" — întrebări grupate pe subiect. IMPORTANT:
// pune ordinea astfel încât întrebările din același subiect să fie
// consecutive (ex: toate cele de "Concedii" cu ordine 10-19, toate cele
// de "Acces clădire" cu 20-29) — altfel gruparea vizuală iese amestecată.
export default function AdminGhidInfoUtile() {
  const [intrebari, setIntrebari] = useState([])
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
      .from('ghid_intrebari')
      .select('*')
      .order('ordine', { ascending: true })
    setIntrebari(data || [])
    setLoading(false)
  }

  function startEdit(q) {
    setEditingId(q.id)
    setForm({
      subiect: q.subiect || '',
      intrebare: q.intrebare || '',
      raspuns: q.raspuns || '',
      buton_text: q.buton_text || '',
      buton_link: q.buton_link || '',
      ordine: q.ordine ?? 0,
    })
    setError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError('')
  }

  async function handleDelete(q) {
    if (!confirm(`Ștergi întrebarea "${q.intrebare}"?`)) return

    const { error } = await supabase.from('ghid_intrebari').delete().eq('id', q.id)
    if (error) {
      setError('Nu am putut șterge: ' + error.message)
      return
    }
    loadAll()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const subiect = form.subiect.trim()
    const intrebare = form.intrebare.trim()
    const raspuns = form.raspuns.trim()
    if (!subiect || !intrebare || !raspuns) {
      setError('Subiectul, întrebarea și răspunsul sunt obligatorii.')
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
      subiect,
      intrebare,
      raspuns,
      buton_text: butonText || null,
      buton_link: butonLink || null,
      ordine: Number(form.ordine) || 0,
      updated_at: new Date().toISOString(),
    }

    const { error: saveError } = editingId
      ? await supabase.from('ghid_intrebari').update(payload).eq('id', editingId)
      : await supabase.from('ghid_intrebari').insert(payload)

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
      <h2 className="text-lg font-semibold text-slate-800 mb-1">Ghidul angajatului — Informații utile</h2>
      <p className="text-sm text-slate-500 mb-6">
        Întrebări grupate pe subiect. Pune "ordine" astfel încât întrebările din același subiect
        să fie consecutive, ca să apară grupate corect.
      </p>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-sm p-5 mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        <div>
          <label className="block text-sm text-slate-600 mb-1">Subiect</label>
          <input
            required
            value={form.subiect}
            onChange={(e) => setForm({ ...form, subiect: e.target.value })}
            placeholder="ex: Concedii"
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

        <div className="sm:col-span-2">
          <label className="block text-sm text-slate-600 mb-1">Întrebare</label>
          <input
            required
            value={form.intrebare}
            onChange={(e) => setForm({ ...form, intrebare: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm text-slate-600 mb-1">Răspuns</label>
          <textarea
            required
            rows={3}
            value={form.raspuns}
            onChange={(e) => setForm({ ...form, raspuns: e.target.value })}
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

        {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}

        <div className="sm:col-span-2 flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-accent hover:bg-accent-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition disabled:opacity-50"
          >
            {saving ? 'Se salvează...' : editingId ? 'Salvează modificările' : 'Adaugă întrebare'}
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
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Subiect</th>
                <th className="px-4 py-3 font-medium">Întrebare</th>
                <th className="px-4 py-3 font-medium">Ordine</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {intrebari.map((q) => (
                <tr key={q.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-500">{q.subiect}</td>
                  <td className="px-4 py-3 text-slate-800">{q.intrebare}</td>
                  <td className="px-4 py-3 text-slate-500">{q.ordine}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => startEdit(q)} className="text-accent text-sm hover:underline mr-3">
                      Editează
                    </button>
                    <button onClick={() => handleDelete(q)} className="text-rose-500 text-sm hover:underline">
                      Șterge
                    </button>
                  </td>
                </tr>
              ))}
              {intrebari.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    Nicio întrebare adăugată încă.
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
