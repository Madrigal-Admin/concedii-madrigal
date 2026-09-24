import { useEffect, useState } from 'react'
import { Bell, Pencil, Trash2, Plus, Save, X as XIcon, Settings } from 'lucide-react'
import { supabase } from '../supabaseClient'
import ListEditorModal from './ListEditorModal'

const EMPTY_FORM = { categorie_id: '', locatie_id: '', denumire: '', data_ultima_verificare: '', data_urmatoarea_verificare: '' }
const AZI = new Date().toISOString().slice(0, 10)

function inFereastra(dataStr, days = 30) {
  if (!dataStr) return false
  const azi0 = new Date(AZI)
  const limita = new Date(azi0)
  limita.setDate(limita.getDate() + days)
  const d = new Date(dataStr)
  return d >= azi0 && d <= limita
}

function formatData(dataStr) {
  if (!dataStr) return '—'
  return new Date(dataStr).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function MentenantaTab() {
  const [registru, setRegistru] = useState([])
  const [categorii, setCategorii] = useState([])
  const [locatii, setLocatii] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [categorieNoua, setCategorieNoua] = useState('')
  const [locatieNoua, setLocatieNoua] = useState('')
  const [showManageCategorii, setShowManageCategorii] = useState(false)
  const [showManageLocatii, setShowManageLocatii] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [{ data: reg }, { data: cat }, { data: loc }] = await Promise.all([
      supabase.from('registru_mentenanta').select('*, categorie:registru_mentenanta_categorii(name), locatie:registru_mentenanta_locatii(name)').order('data_urmatoarea_verificare'),
      supabase.from('registru_mentenanta_categorii').select('*').order('name'),
      supabase.from('registru_mentenanta_locatii').select('*').order('name'),
    ])
    setRegistru(reg || [])
    setCategorii(cat || [])
    setLocatii(loc || [])
    setLoading(false)
  }

  function startEdit(r) {
    setEditingId(r.id)
    setForm({
      categorie_id: r.categorie_id || '',
      locatie_id: r.locatie_id || '',
      denumire: r.denumire,
      data_ultima_verificare: r.data_ultima_verificare || '',
      data_urmatoarea_verificare: r.data_urmatoarea_verificare || '',
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)

    const payload = {
      categorie_id: form.categorie_id || null,
      locatie_id: form.locatie_id || null,
      denumire: form.denumire.trim(),
      data_ultima_verificare: form.data_ultima_verificare || null,
      data_urmatoarea_verificare: form.data_urmatoarea_verificare || null,
    }

    if (editingId) await supabase.from('registru_mentenanta').update(payload).eq('id', editingId)
    else await supabase.from('registru_mentenanta').insert(payload)

    setSaving(false)
    cancelEdit()
    load()
  }

  async function handleDelete(id) {
    if (!confirm('Ștergi definitiv acest element din registru?')) return
    await supabase.from('registru_mentenanta').delete().eq('id', id)
    load()
  }

  async function adaugaCategorie() {
    if (!categorieNoua.trim()) return
    const { data } = await supabase.from('registru_mentenanta_categorii').insert({ name: categorieNoua.trim() }).select().single()
    if (data) {
      setCategorii((c) => [...c, data])
      setForm((f) => ({ ...f, categorie_id: data.id }))
      setCategorieNoua('')
    }
  }

  async function adaugaLocatie() {
    if (!locatieNoua.trim()) return
    const { data } = await supabase.from('registru_mentenanta_locatii').insert({ name: locatieNoua.trim() }).select().single()
    if (data) {
      setLocatii((l) => [...l, data])
      setForm((f) => ({ ...f, locatie_id: data.id }))
      setLocatieNoua('')
    }
  }

  const remindere = registru.filter((r) => inFereastra(r.data_urmatoarea_verificare))

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-slate-800">Registru mentenanță</h2>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-center gap-2">
          <Bell size={16} className="text-accent" />
          <p className="text-sm font-semibold text-slate-800">Necesită atenție — următoarele 30 de zile</p>
        </div>
        {remindere.length === 0 ? (
          <p className="text-xs text-slate-400">Nimic de verificat în următoarele 30 de zile.</p>
        ) : (
          <div className="space-y-1.5">
            {remindere.map((r) => (
              <div key={r.id} className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs">
                <span className="text-amber-600">{formatData(r.data_urmatoarea_verificare)}</span>
                <span className="font-medium text-slate-700">{r.denumire}</span>
                <span className="text-slate-500">— {r.categorie?.name || '—'} · {r.locatie?.name || '—'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mb-6 grid grid-cols-1 gap-4 rounded-xl bg-white p-5 shadow-sm sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-slate-600">Categorie</label>
          <select
            value={form.categorie_id}
            onChange={(e) => setForm({ ...form, categorie_id: e.target.value })}
            className="mb-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">— Alege —</option>
            {categorii.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <div className="flex gap-1.5">
            <input
              value={categorieNoua}
              onChange={(e) => setCategorieNoua(e.target.value)}
              placeholder="Categorie nouă..."
              className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-xs"
            />
            <button type="button" onClick={adaugaCategorie} className="rounded-lg bg-slate-100 px-2 text-xs text-slate-600 hover:bg-slate-200">
              <Plus size={12} className="inline" />
            </button>
            <button
              type="button"
              onClick={() => setShowManageCategorii(true)}
              title="Gestionează lista"
              className="rounded-lg bg-slate-100 px-2 text-xs text-slate-600 hover:bg-slate-200"
            >
              <Settings size={12} className="inline" />
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-600">Locație</label>
          <select
            value={form.locatie_id}
            onChange={(e) => setForm({ ...form, locatie_id: e.target.value })}
            className="mb-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">— Alege —</option>
            {locatii.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          <div className="flex gap-1.5">
            <input
              value={locatieNoua}
              onChange={(e) => setLocatieNoua(e.target.value)}
              placeholder="Locație nouă..."
              className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-xs"
            />
            <button type="button" onClick={adaugaLocatie} className="rounded-lg bg-slate-100 px-2 text-xs text-slate-600 hover:bg-slate-200">
              <Plus size={12} className="inline" />
            </button>
            <button
              type="button"
              onClick={() => setShowManageLocatii(true)}
              title="Gestionează lista"
              className="rounded-lg bg-slate-100 px-2 text-xs text-slate-600 hover:bg-slate-200"
            >
              <Settings size={12} className="inline" />
            </button>
          </div>
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
          <label className="mb-1 block text-sm text-slate-600">Data ultimei verificări</label>
          <input
            type="date"
            value={form.data_ultima_verificare}
            onChange={(e) => setForm({ ...form, data_ultima_verificare: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-600">Data următoarei verificări</label>
          <input
            type="date"
            value={form.data_urmatoarea_verificare}
            onChange={(e) => setForm({ ...form, data_urmatoarea_verificare: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div className="flex gap-2 sm:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {editingId ? <Save size={14} /> : <Plus size={14} />}
            {saving ? 'Se salvează...' : editingId ? 'Salvează modificările' : 'Adaugă în registru'}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit} className="rounded-lg px-4 py-2 text-sm text-slate-500 hover:bg-slate-100">
              Anulează
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p className="text-sm text-slate-500">Se încarcă...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Denumire</th>
                <th className="px-4 py-3 font-medium">Categorie</th>
                <th className="px-4 py-3 font-medium">Locație</th>
                <th className="px-4 py-3 font-medium">Ultima verificare</th>
                <th className="px-4 py-3 font-medium">Următoarea verificare</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {registru.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-800">{r.denumire}</td>
                  <td className="px-4 py-3 text-slate-500">{r.categorie?.name || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{r.locatie?.name || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{formatData(r.data_ultima_verificare)}</td>
                  <td className={`px-4 py-3 ${inFereastra(r.data_urmatoarea_verificare) ? 'font-medium text-amber-700' : 'text-slate-500'}`}>
                    {formatData(r.data_urmatoarea_verificare)}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => startEdit(r)} className="mr-3 text-accent hover:underline">
                      <Pencil size={13} className="inline" />
                    </button>
                    <button onClick={() => handleDelete(r.id)} className="text-rose-500 hover:underline">
                      <Trash2 size={13} className="inline" />
                    </button>
                  </td>
                </tr>
              ))}
              {registru.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-400">Niciun element în registru.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showManageCategorii && (
        <ListEditorModal
          title="Categorii"
          table="registru_mentenanta_categorii"
          items={categorii}
          onClose={() => setShowManageCategorii(false)}
          onChanged={load}
        />
      )}
      {showManageLocatii && (
        <ListEditorModal
          title="Locații"
          table="registru_mentenanta_locatii"
          items={locatii}
          onClose={() => setShowManageLocatii(false)}
          onChanged={load}
        />
      )}
    </div>
  )
}
