import { useEffect, useState } from 'react'
import { Pencil, Trash2, Plus, Save, X as XIcon, Upload, Settings } from 'lucide-react'
import { supabase } from '../supabaseClient'
import ImportExcelModal from './ImportExcelModal'
import ListEditorModal from './ListEditorModal'

const EMPTY_FORM = { gestiune_id: '', cod_inventar: '', denumire: '', cantitate: '', um: 'BUC' }

export default function CatalogTab() {
  const [obiecte, setObiecte] = useState([])
  const [gestiuni, setGestiuni] = useState([])
  const [loading, setLoading] = useState(true)
  const [cautare, setCautare] = useState('')
  const [filtruGestiune, setFiltruGestiune] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [gestiuneNoua, setGestiuneNoua] = useState('')
  const [showManageGestiuni, setShowManageGestiuni] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [{ data: obi }, { data: gest }] = await Promise.all([
      supabase.from('stoc_obiecte').select('*, gestiune:stoc_gestiuni(name)').order('denumire'),
      supabase.from('stoc_gestiuni').select('*').order('name'),
    ])
    setObiecte(obi || [])
    setGestiuni(gest || [])
    setLoading(false)
  }

  function startEdit(o) {
    setEditingId(o.id)
    setForm({
      gestiune_id: o.gestiune_id || '',
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

  async function adaugaGestiune() {
    if (!gestiuneNoua.trim()) return
    const { data, error } = await supabase.from('stoc_gestiuni').insert({ name: gestiuneNoua.trim().toUpperCase() }).select().single()
    if (!error && data) {
      setGestiuni((g) => [...g, data].sort((a, b) => a.name.localeCompare(b.name)))
      setForm((f) => ({ ...f, gestiune_id: data.id }))
      setGestiuneNoua('')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    if (!form.gestiune_id) {
      setSaving(false)
      setError('Alege o gestiune.')
      return
    }

    const payload = {
      gestiune_id: form.gestiune_id,
      cod_inventar: form.cod_inventar.trim() || null,
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
    const matchGestiune = !filtruGestiune || o.gestiune_id === filtruGestiune
    return matchQ && matchGestiune
  })

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Catalog stocuri</h2>
        <button
          onClick={() => setShowImport(true)}
          className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
        >
          <Upload size={13} /> Importă din Excel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mb-6 grid grid-cols-1 gap-4 rounded-xl bg-white p-5 shadow-sm sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-slate-600">Gestiune</label>
          <select
            value={form.gestiune_id}
            onChange={(e) => setForm({ ...form, gestiune_id: e.target.value })}
            className="mb-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">— Alege —</option>
            {gestiuni.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <div className="flex gap-1.5">
            <input
              value={gestiuneNoua}
              onChange={(e) => setGestiuneNoua(e.target.value)}
              placeholder="Gestiune nouă..."
              className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-xs"
            />
            <button type="button" onClick={adaugaGestiune} className="rounded-lg bg-slate-100 px-2 text-xs text-slate-600 hover:bg-slate-200">
              <Plus size={12} className="inline" />
            </button>
            <button
              type="button"
              onClick={() => setShowManageGestiuni(true)}
              title="Gestionează lista (adaugă/șterge)"
              className="rounded-lg bg-slate-100 px-2 text-xs text-slate-600 hover:bg-slate-200"
            >
              <Settings size={12} className="inline" />
            </button>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-600">Cod inventar</label>
          <input
            value={form.cod_inventar}
            onChange={(e) => setForm({ ...form, cod_inventar: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
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
          {gestiuni.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
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
                  <td className="px-4 py-3 text-slate-500">{o.gestiune?.name || '—'}</td>
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
      {showImport && (
        <ImportExcelModal
          onClose={() => setShowImport(false)}
          onImported={() => {
            setShowImport(false)
            load()
          }}
        />
      )}
      {showManageGestiuni && (
        <ListEditorModal
          title="Gestiuni"
          table="stoc_gestiuni"
          items={gestiuni}
          onClose={() => setShowManageGestiuni(false)}
          onChanged={load}
        />
      )}
    </div>
  )
}
