import { useEffect, useState } from 'react'
import { Pencil, Trash2, Plus, Save, X as XIcon } from 'lucide-react'
import { supabase } from '../supabaseClient'

const GESTIUNI = ['OBIECTE DE INVENTAR IN MAGAZIE', 'DECORURI', 'MARFURI']
const GESTIUNE_LABEL = {
  'OBIECTE DE INVENTAR IN MAGAZIE': 'Obiecte de inventar',
  DECORURI: 'Decoruri',
  MARFURI: 'Mărfuri',
}

const EMPTY_FORM = { gestiune: 'OBIECTE DE INVENTAR IN MAGAZIE', cod_inventar: '', denumire: '', cantitate: '', um: 'BUC' }

export default function CatalogTab() {
  const [obiecte, setObiecte] = useState([])
  const [loading, setLoading] = useState(true)
  const [cautare, setCautare] = useState('')
  const [filtruGestiune, setFiltruGestiune] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('stoc_obiecte').select('*').order('denumire')
    setObiecte(data || [])
    setLoading(false)
  }

  function startEdit(o) {
    setEditingId(o.id)
    setForm({
      gestiune: o.gestiune,
      cod_inventar: o.cod_inventar || '',
      denumire: o.denumire,
      cantitate: o.cantitate,
      um: o.um,
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      gestiune: form.gestiune,
      cod_inventar: form.gestiune === 'MARFURI' ? null : form.cod_inventar.trim() || null,
      denumire: form.denumire.trim(),
      cantitate: Number(form.cantitate) || 0,
      um: form.um.trim() || 'BUC',
      updated_at: new Date().toISOString(),
    }

    const { error } = editingId
      ? await supabase.from('stoc_obiecte').update(payload).eq('id', editingId)
      : await supabase.from('stoc_obiecte').insert(payload)

    setSaving(false)
    if (error) {
      setError('Nu am putut salva articolul.')
      return
    }
    cancelEdit()
    load()
  }

  async function handleDelete(id) {
    if (!confirm('Ștergi definitiv acest articol din catalog?')) return
    await supabase.from('stoc_obiecte').delete().eq('id', id)
    load()
  }

  const filtrate = obiecte.filter((o) => {
    const q = cautare.toLowerCase()
    const matchQ = !q || o.denumire.toLowerCase().includes(q) || o.cod_inventar?.toLowerCase().includes(q)
    const matchGestiune = !filtruGestiune || o.gestiune === filtruGestiune
    return matchQ && matchGestiune
  })

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-slate-800">Catalog stocuri</h2>

      <form onSubmit={handleSubmit} className="mb-6 grid grid-cols-1 gap-4 rounded-xl bg-white p-5 shadow-sm sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-slate-600">Gestiune</label>
          <select
            value={form.gestiune}
            onChange={(e) => setForm({ ...form, gestiune: e.target.value })}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {GESTIUNI.map((g) => (
              <option key={g} value={g}>{GESTIUNE_LABEL[g]}</option>
            ))}
          </select>
        </div>
        {form.gestiune !== 'MARFURI' && (
          <div>
            <label className="mb-1 block text-sm text-slate-600">Cod inventar</label>
            <input
              value={form.cod_inventar}
              onChange={(e) => setForm({ ...form, cod_inventar: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        )}
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm text-slate-600">Denumire</label>
          <input
            required
            value={form.denumire}
            onChange={(e) => setForm({ ...form, denumire: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-600">Cantitate</label>
          <input
            type="number"
            step="0.01"
            required
            value={form.cantitate}
            onChange={(e) => setForm({ ...form, cantitate: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-600">UM</label>
          <input
            value={form.um}
            onChange={(e) => setForm({ ...form, um: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}

        <div className="flex gap-2 sm:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover disabled:opacity-50"
          >
            {editingId ? <Save size={14} /> : <Plus size={14} />}
            {saving ? 'Se salvează...' : editingId ? 'Salvează modificările' : 'Adaugă articol'}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit} className="rounded-lg px-4 py-2 text-sm text-slate-500 hover:bg-slate-100">
              Anulează
            </button>
          )}
        </div>
      </form>

      <div className="mb-3 flex flex-wrap gap-3">
        <input
          value={cautare}
          onChange={(e) => setCautare(e.target.value)}
          placeholder="Caută după denumire sau cod..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent sm:w-80"
        />
        <select
          value={filtruGestiune}
          onChange={(e) => setFiltruGestiune(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="">Toate gestiunile</option>
          {GESTIUNI.map((g) => (
            <option key={g} value={g}>{GESTIUNE_LABEL[g]}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Se încarcă...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Denumire</th>
                <th className="px-4 py-3 font-medium">Gestiune</th>
                <th className="px-4 py-3 font-medium">Cod</th>
                <th className="px-4 py-3 font-medium">Cantitate</th>
                <th className="px-4 py-3 font-medium">UM</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtrate.map((o) => (
                <tr key={o.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-800">{o.denumire}</td>
                  <td className="px-4 py-3 text-slate-500">{GESTIUNE_LABEL[o.gestiune]}</td>
                  <td className="px-4 py-3 text-slate-500">{o.cod_inventar || '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{o.cantitate}</td>
                  <td className="px-4 py-3 text-slate-500">{o.um}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => startEdit(o)} className="mr-3 text-accent hover:underline">
                      <Pencil size={13} className="inline" />
                    </button>
                    <button onClick={() => handleDelete(o.id)} className="text-rose-500 hover:underline">
                      <Trash2 size={13} className="inline" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtrate.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-400">Niciun articol găsit.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
