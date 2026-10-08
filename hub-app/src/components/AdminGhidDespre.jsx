import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const EMPTY_FORM = { tip: 'paragraf', continut: '', descriere_imagine: '', ordine: 0 }

// Administrarea "Despre Madrigal" — blocuri în ordine: paragrafe de text
// sau imagini (încărcate în bucket-ul ghid-foto). Fără cod, totul din
// formular.
export default function AdminGhidDespre() {
  const [blocuri, setBlocuri] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [fisierImagine, setFisierImagine] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [previzualizari, setPrevizualizari] = useState({}) // id -> signed url, pentru listă

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    const { data } = await supabase
      .from('ghid_despre_blocuri')
      .select('*')
      .order('ordine', { ascending: true })
    const lista = data || []
    setBlocuri(lista)
    setLoading(false)

    const imagini = lista.filter((b) => b.tip === 'imagine' && b.imagine_url)
    const semnate = await Promise.all(
      imagini.map((b) => supabase.storage.from('ghid-foto').createSignedUrl(b.imagine_url, 300))
    )
    const map = {}
    imagini.forEach((b, i) => {
      map[b.id] = semnate[i]?.data?.signedUrl || null
    })
    setPrevizualizari(map)
  }

  function startEdit(b) {
    setEditingId(b.id)
    setForm({
      tip: b.tip,
      continut: b.continut || '',
      descriere_imagine: b.descriere_imagine || '',
      ordine: b.ordine ?? 0,
    })
    setFisierImagine(null)
    setError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFisierImagine(null)
    setError('')
  }

  async function handleDelete(b) {
    if (!confirm('Ștergi definitiv acest bloc?')) return

    if (b.tip === 'imagine' && b.imagine_url) {
      await supabase.storage.from('ghid-foto').remove([b.imagine_url])
    }

    const { error } = await supabase.from('ghid_despre_blocuri').delete().eq('id', b.id)
    if (error) {
      setError('Nu am putut șterge: ' + error.message)
      return
    }
    loadAll()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (form.tip === 'paragraf' && !form.continut.trim()) {
      setError('Textul paragrafului e obligatoriu.')
      return
    }
    if (form.tip === 'imagine' && !editingId && !fisierImagine) {
      setError('Alege o imagine de încărcat.')
      return
    }

    setSaving(true)

    const payload = {
      tip: form.tip,
      ordine: Number(form.ordine) || 0,
      updated_at: new Date().toISOString(),
    }

    if (form.tip === 'paragraf') {
      payload.continut = form.continut.trim()
      payload.imagine_url = null
      payload.descriere_imagine = null
    } else {
      payload.continut = null
      payload.descriere_imagine = form.descriere_imagine.trim() || null

      if (fisierImagine) {
        const caleStorage = `${Date.now()}-${fisierImagine.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`
        const { error: uploadError } = await supabase.storage
          .from('ghid-foto')
          .upload(caleStorage, fisierImagine, { upsert: false })

        if (uploadError) {
          setSaving(false)
          setError('Nu am putut încărca imaginea: ' + uploadError.message)
          return
        }
        payload.imagine_url = caleStorage
      }
    }

    const { error: saveError } = editingId
      ? await supabase.from('ghid_despre_blocuri').update(payload).eq('id', editingId)
      : await supabase.from('ghid_despre_blocuri').insert(payload)

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
      <h2 className="text-lg font-semibold text-slate-800 mb-1">Ghidul angajatului — Despre Madrigal</h2>
      <p className="text-sm text-slate-500 mb-6">
        Blocuri afișate în ordine: paragrafe de text sau imagini (istorie, misiune, valori...).
      </p>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-sm p-5 mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        <div>
          <label className="block text-sm text-slate-600 mb-1">Tip bloc</label>
          <select
            value={form.tip}
            onChange={(e) => setForm({ ...form, tip: e.target.value })}
            disabled={!!editingId}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent bg-white disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="paragraf">Paragraf de text</option>
            <option value="imagine">Imagine</option>
          </select>
          {editingId && (
            <p className="text-xs text-slate-400 mt-1">
              Tipul nu se poate schimba — șterge și adaugă un bloc nou dacă ai nevoie de alt tip.
            </p>
          )}
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

        {form.tip === 'paragraf' ? (
          <div className="sm:col-span-2">
            <label className="block text-sm text-slate-600 mb-1">Text</label>
            <textarea
              rows={4}
              value={form.continut}
              onChange={(e) => setForm({ ...form, continut: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm text-slate-600 mb-1">
                {editingId ? 'Înlocuiește imaginea (opțional)' : 'Imagine'}
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFisierImagine(e.target.files?.[0] || null)}
                className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Legendă (opțional)</label>
              <input
                value={form.descriere_imagine}
                onChange={(e) => setForm({ ...form, descriere_imagine: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </>
        )}

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
          {blocuri.map((b) => (
            <div key={b.id} className="bg-white rounded-xl shadow-sm p-4 flex gap-4 items-start">
              {b.tip === 'imagine' ? (
                previzualizari[b.id] ? (
                  <img
                    src={previzualizari[b.id]}
                    alt=""
                    className="w-20 h-20 object-cover rounded-lg flex-shrink-0 border border-slate-200"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-slate-100 flex-shrink-0" />
                )
              ) : null}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400 mb-1">
                  {b.tip === 'imagine' ? 'Imagine' : 'Paragraf'} · ordine {b.ordine}
                </p>
                {b.tip === 'paragraf' ? (
                  <p className="text-sm text-slate-700 line-clamp-3">{b.continut}</p>
                ) : (
                  <p className="text-sm text-slate-500">{b.descriere_imagine || '(fără legendă)'}</p>
                )}
                <div className="mt-2 flex gap-3">
                  <button onClick={() => startEdit(b)} className="text-accent text-sm hover:underline">
                    Editează
                  </button>
                  <button onClick={() => handleDelete(b)} className="text-rose-500 text-sm hover:underline">
                    Șterge
                  </button>
                </div>
              </div>
            </div>
          ))}
          {blocuri.length === 0 && <p className="text-sm text-slate-400">Niciun bloc adăugat încă.</p>}
        </div>
      )}
    </div>
  )
}
