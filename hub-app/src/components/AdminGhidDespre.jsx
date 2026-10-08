import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import RichTextEditor from './ghid/RichTextEditor'

// Administrarea "Despre Madrigal" — UN SINGUR editor de text formatat
// (nu mai sunt blocuri separate de paragraf/imagine). Textul se salvează
// ca HTML într-un singur rând al tabelei ghid_despre. Imaginile se
// introduc direct din editor (buton de imagine în bara de formatare).
export default function AdminGhidDespre() {
  const [rowId, setRowId] = useState(null)
  const [continut, setContinut] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [salvatCuSucces, setSalvatCuSucces] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data, error: loadError } = await supabase
      .from('ghid_despre')
      .select('id, continut_html')
      .limit(1)
      .maybeSingle()

    if (loadError) {
      setError(loadError.message)
      setLoading(false)
      return
    }

    if (data) {
      setRowId(data.id)
      setContinut(data.continut_html || '')
    }
    setLoading(false)
  }

  async function handleSave() {
    setError('')
    setSalvatCuSucces(false)
    setSaving(true)

    const payload = { continut_html: continut, updated_at: new Date().toISOString() }

    const { data, error: saveError } = rowId
      ? await supabase.from('ghid_despre').update(payload).eq('id', rowId).select('id').maybeSingle()
      : await supabase.from('ghid_despre').insert(payload).select('id').maybeSingle()

    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }

    if (!rowId && data) setRowId(data.id)
    setSalvatCuSucces(true)
    setTimeout(() => setSalvatCuSucces(false), 2500)
  }

  if (loading) return <p className="text-sm text-slate-500">Se încarcă...</p>

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-800 mb-1">Ghidul angajatului — Despre Madrigal</h2>
      <p className="text-sm text-slate-500 mb-6">
        Un singur text, cu formatare (mărime, bold, italic, culoare, centrare). Poți insera și
        imagini din bara de sus (iconița de imagine).
      </p>

      <div className="bg-white rounded-xl shadow-sm p-5">
        <RichTextEditor
          value={continut}
          onChange={setContinut}
          placeholder="Scrie aici despre Madrigal — istorie, misiune, valori..."
        />

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        {salvatCuSucces && <p className="text-sm text-emerald-600 mt-3">Salvat.</p>}

        <div className="mt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-accent hover:bg-accent-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition disabled:opacity-50"
          >
            {saving ? 'Se salvează...' : 'Salvează'}
          </button>
        </div>
      </div>
    </div>
  )
}
