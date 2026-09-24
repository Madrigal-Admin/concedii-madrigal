import { useState } from 'react'
import { Trash2, Plus, X as XIcon } from 'lucide-react'
import { supabase } from '../supabaseClient'

/**
 * Modal generic pentru gestionarea unei liste simple (id, name) —
 * Gestiuni, Categorii mentenanță, Locații mentenanță.
 */
export default function ListEditorModal({ title, table, items, onClose, onChanged }) {
  const [numeNou, setNumeNou] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleAdd(e) {
    e.preventDefault()
    const nume = numeNou.trim()
    if (!nume) return
    setSaving(true)
    setError('')
    const { error } = await supabase.from(table).insert({ name: nume })
    setSaving(false)
    if (error) {
      setError('Nu am putut adăuga (poate există deja).')
      return
    }
    setNumeNou('')
    onChanged()
  }

  async function handleDelete(id) {
    setError('')
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) {
      setError('Nu poate fi șters — e folosit deja de cel puțin un articol.')
      return
    }
    onChanged()
  }

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">Gestionează: {title}</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100">
            <XIcon size={16} />
          </button>
        </div>

        <form onSubmit={handleAdd} className="mb-4 flex gap-2">
          <input
            value={numeNou}
            onChange={(e) => setNumeNou(e.target.value)}
            placeholder={`${title} nou...`}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            <Plus size={14} />
          </button>
        </form>

        {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}

        <ul className="max-h-80 space-y-1 overflow-y-auto">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
              {item.name}
              <button onClick={() => handleDelete(item.id)} className="text-slate-400 hover:text-rose-600">
                <Trash2 size={14} />
              </button>
            </li>
          ))}
          {items.length === 0 && <li className="px-3 py-2 text-sm text-slate-400">Lista e goală.</li>}
        </ul>
      </div>
    </div>
  )
}
