import { useEffect, useState } from 'react'
import Papa from 'papaparse'
import { Pencil, Trash2, Save, X as XIcon, Upload, Plus } from 'lucide-react'
import { supabase } from '../supabaseClient'

export const CATEGORII = ['Autoritate Publică', 'Sponsor', 'Colaborator', 'Presă', 'Prieteni/Familie']

const EMPTY_FORM = {
  nume: '',
  prenume: '',
  email: '',
  institutie: '',
  functie: '',
  categorie: '',
  abonat_invitatii: true,
}

export default function PersoaneTab() {
  const [persoane, setPersoane] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [cautare, setCautare] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('persoane').select('*').order('nume')
    setPersoane(data || [])
    setLoading(false)
  }

  function startEdit(p) {
    setEditingId(p.id)
    setForm({
      nume: p.nume || '',
      prenume: p.prenume || '',
      email: p.email || '',
      institutie: p.institutie || '',
      functie: p.functie || '',
      categorie: p.categorie || '',
      abonat_invitatii: p.abonat_invitatii,
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
      nume: form.nume.trim(),
      prenume: form.prenume.trim(),
      email: form.email.trim(),
      institutie: form.institutie.trim() || null,
      functie: form.functie.trim() || null,
      categorie: form.categorie.trim() || null,
      abonat_invitatii: form.abonat_invitatii,
    }

    const { error } = editingId
      ? await supabase.from('persoane').update(payload).eq('id', editingId)
      : await supabase.from('persoane').insert(payload)

    setSaving(false)
    if (error) {
      setError(error.message.includes('duplicate') ? 'Există deja o persoană cu acest email.' : error.message)
      return
    }
    cancelEdit()
    load()
  }

  async function handleDelete(id) {
    if (!confirm('Ștergi această persoană? Istoricul ei de invitații/check-in rămâne neatins.')) return
    await supabase.from('persoane').delete().eq('id', id)
    load()
  }

  const filtrate = persoane.filter((p) => {
    const q = cautare.toLowerCase()
    return (
      !q ||
      p.nume?.toLowerCase().includes(q) ||
      p.prenume?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.institutie?.toLowerCase().includes(q) ||
      p.categorie?.toLowerCase().includes(q)
    )
  })

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-800">Persoane</h2>
        <button
          onClick={() => setShowImport(true)}
          className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
        >
          <Upload size={13} /> Importă CSV
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-sm p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4"
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
          <label className="block text-sm text-slate-600 mb-1">Prenume</label>
          <input
            required
            value={form.prenume}
            onChange={(e) => setForm({ ...form, prenume: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">Email</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">Categorie</label>
          <select
            value={form.categorie}
            onChange={(e) => setForm({ ...form, categorie: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent bg-white"
          >
            <option value="">— Alege categorie —</option>
            {CATEGORII.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">Instituție</label>
          <input
            value={form.institutie}
            onChange={(e) => setForm({ ...form, institutie: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">Funcție</label>
          <input
            value={form.functie}
            onChange={(e) => setForm({ ...form, functie: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={form.abonat_invitatii}
            onChange={(e) => setForm({ ...form, abonat_invitatii: e.target.checked })}
          />
          Abonat la invitații (conform GDPR)
        </label>

        {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}

        <div className="sm:col-span-2 flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition disabled:opacity-50"
          >
            {editingId ? <Save size={14} /> : <Plus size={14} />}
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

      <input
        value={cautare}
        onChange={(e) => setCautare(e.target.value)}
        placeholder="Caută după nume, email, instituție..."
        className="w-full sm:w-80 mb-3 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
      />

      {loading ? (
        <p className="text-sm text-slate-500">Se încarcă...</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Nume</th>
                <th className="px-4 py-3 font-medium">Instituție</th>
                <th className="px-4 py-3 font-medium">Funcție</th>
                <th className="px-4 py-3 font-medium">Categorie</th>
                <th className="px-4 py-3 font-medium">Abonat</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtrate.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <p className="text-slate-800">{p.prenume} {p.nume}</p>
                    <p className="text-xs text-slate-400">{p.email}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{p.institutie || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{p.functie || '—'}</td>
                  <td className="px-4 py-3">
                    {p.categorie ? (
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {p.categorie}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {p.abonat_invitatii ? (
                      <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Da</span>
                    ) : (
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Nu</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => startEdit(p)} className="text-accent text-sm hover:underline mr-3">
                      <Pencil size={13} className="inline" />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="text-rose-500 text-sm hover:underline">
                      <Trash2 size={13} className="inline" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtrate.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-400">
                    Nicio persoană găsită.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showImport && <ImportCsvModal onClose={() => setShowImport(false)} onImported={load} />}
    </div>
  )
}

const CSV_COLOANE = ['nume', 'prenume', 'email', 'institutie', 'functie', 'categorie']

function ImportCsvModal({ onClose, onImported }) {
  const [rows, setRows] = useState([])
  const [fileName, setFileName] = useState('')
  const [parseError, setParseError] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setParseError('')
    setResult(null)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (res) => {
        const lipsa = CSV_COLOANE.filter((c) => c !== 'institutie' && c !== 'functie' && c !== 'categorie').filter(
          (c) => !res.meta.fields?.includes(c)
        )
        if (lipsa.length > 0) {
          setParseError(`Lipsesc coloanele obligatorii: ${lipsa.join(', ')}`)
          setRows([])
          return
        }
        setRows(res.data.filter((r) => r.email?.trim()))
      },
    })
  }

  async function handleImport() {
    setImporting(true)
    const payload = rows.map((r) => ({
      nume: r.nume?.trim(),
      prenume: r.prenume?.trim(),
      email: r.email?.trim(),
      institutie: r.institutie?.trim() || null,
      functie: r.functie?.trim() || null,
      categorie: r.categorie?.trim() || null,
      abonat_invitatii: true,
    }))

    const { error } = await supabase.from('persoane').upsert(payload, { onConflict: 'email' })
    setImporting(false)

    if (error) {
      setParseError(error.message)
      return
    }
    setResult(payload.length)
    onImported()
  }

  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">Importă persoane din CSV</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100">
            <XIcon size={16} />
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-3">
          Coloane necesare: <code>nume, prenume, email</code> (obligatorii), plus opțional{' '}
          <code>institutie, functie, categorie</code>. Persoanele cu email deja existent se actualizează, nu se
          duplică.
        </p>

        <input
          type="file"
          accept=".csv"
          onChange={handleFile}
          className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 mb-3"
        />

        {parseError && <p className="text-sm text-rose-600 mb-3">{parseError}</p>}

        {rows.length > 0 && !result && (
          <p className="text-sm text-slate-600 mb-3">
            <strong>{fileName}</strong> — {rows.length} rânduri detectate, gata de import.
          </p>
        )}

        {result != null && <p className="text-sm text-green-700 mb-3">{result} persoane importate cu succes.</p>}

        <div className="flex gap-2">
          <button
            onClick={handleImport}
            disabled={rows.length === 0 || importing || result != null}
            className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition disabled:opacity-50"
          >
            {importing ? 'Se importă...' : `Importă ${rows.length > 0 ? rows.length : ''} persoane`}
          </button>
          <button onClick={onClose} className="text-sm text-slate-500 px-4 py-2 rounded-lg hover:bg-slate-100">
            {result != null ? 'Închide' : 'Anulează'}
          </button>
        </div>
      </div>
    </div>
  )
}
