import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const EMPTY_FORM = { nume: '', rol: '', ordine: 0 }

// Administrarea listei "Echipa" din Ghidul angajatului — o listă scurtă,
// manuală (nume + rol), NU legată de tabelul angajați. O actualizezi de
// aici ori de câte ori se schimbă cine ocupă un rol.
export default function AdminGhidEchipa() {
  const [persoane, setPersoane] = useState([])
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
      .from('ghid_echipa_persoane')
      .select('*')
      .order('ordine', { ascending: true })
    setPersoane(data || [])
    setLoading(false)
  }

  function startEdit(p) {
    setEditingId(p.id)
    setForm({ nume: p.nume || '', rol: p.rol || '', ordine: p.ordine ?? 0 })
    setError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError('')
  }

  async function handleDelete(p) {
    const confirmat = confirm(`Ștergi "${p.nume}" din listă?`)
    if (!confirmat) return

    const { error } = await supabase.from('ghid_echipa_persoane').delete().eq('id', p.id)
    if (error) {
      setError('Nu am putut șterge: ' + error.message)
      return
    }
    loadAll()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const nume = form.nume.trim()
    const rol = form.rol.trim()
    if (!nume || !rol) {
      setError('Numele și rolul sunt obligatorii.')
      return
    }

    setSaving(true)

    const payload = {
      nume,
      rol,
      ordine: Number(form.ordine) || 0,
      updated_at: new Date().toISOString(),
    }

    const { error: saveError } = editingId
      ? await supabase.from('ghid_echipa_persoane').update(payload).eq('id', editingId)
      : await supabase.from('ghid_echipa_persoane').insert(payload)

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
      <h2 className="text-lg font-semibold text-slate-800 mb-1">Ghidul angajatului — Echipa</h2>
      <p className="text-sm text-slate-500 mb-6">
        Listă scurtă, manuală (ex: Manager, Secretariat, Resurse Umane) — nu e legată de lista
        de angajați, o actualizezi direct de aici.
      </p>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-sm p-5 mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <div>
          <label className="block text-sm text-slate-600 mb-1">Nume</label>
          <input
            required
            value={form.nume}
            onChange={(e) => setForm({ ...form, nume: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-600 mb-1">Rol</label>
          <input
            required
            value={form.rol}
            onChange={(e) => setForm({ ...form, rol: e.target.value })}
            placeholder="ex: Manager, Secretariat..."
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

        {error && <p className="sm:col-span-3 text-sm text-red-600">{error}</p>}

        <div className="sm:col-span-3 flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-accent hover:bg-accent-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition disabled:opacity-50"
          >
            {saving ? 'Se salvează...' : editingId ? 'Salvează modificările' : 'Adaugă persoană'}
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
          <table className="w-full text-sm min-w-[480px]">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Nume</th>
                <th className="px-4 py-3 font-medium">Rol</th>
                <th className="px-4 py-3 font-medium">Ordine</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {persoane.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-800">{p.nume}</td>
                  <td className="px-4 py-3 text-slate-500">{p.rol}</td>
                  <td className="px-4 py-3 text-slate-500">{p.ordine}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => startEdit(p)} className="text-accent text-sm hover:underline mr-3">
                      Editează
                    </button>
                    <button onClick={() => handleDelete(p)} className="text-rose-500 text-sm hover:underline">
                      Șterge
                    </button>
                  </td>
                </tr>
              ))}
              {persoane.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    Nicio persoană adăugată încă.
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
