import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import EmployeesTab from './EmployeesTab'

function ListManager({ title, table, hint }) {
  const [items, setItems] = useState([])
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from(table).select('*').order('name')
    setItems(data || [])
    setLoading(false)
  }

  async function handleAdd(e) {
    e.preventDefault()
    setError('')
    const name = newName.trim()
    if (!name) return
    const { error } = await supabase.from(table).insert({ name })
    if (error) {
      setError('Există deja o valoare cu acest nume.')
      return
    }
    setNewName('')
    load()
  }

  async function handleDelete(id) {
    if (
      !confirm(
        'Ștergi această valoare din listă? Angajații care o folosesc deja nu sunt afectați, dar nu va mai putea fi selectată pentru alții noi.'
      )
    )
      return
    await supabase.from(table).delete().eq('id', id)
    load()
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}

      <form onSubmit={handleAdd} className="mt-4 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Adaugă o valoare nouă…"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
        />
        <button
          type="submit"
          className="flex items-center gap-1.5 rounded-full bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-700 focus-ring"
        >
          <Plus size={14} />
        </button>
      </form>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}

      <div className="mt-4 space-y-1.5">
        {loading && <p className="text-sm text-slate-500">Se încarcă…</p>}
        {!loading && items.length === 0 && (
          <p className="text-sm text-slate-400">Nicio valoare adăugată încă.</p>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5 text-sm"
          >
            <span className="text-ink">{item.name}</span>
            <button
              onClick={() => handleDelete(item.id)}
              className="rounded-full p-1.5 text-rose-500 hover:bg-rose-50 focus-ring"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SettingsTab() {
  return (
    <div className="space-y-10">
      <section>
        <h3 className="mb-3 font-display text-lg font-semibold text-ink">Angajați</h3>
        <EmployeesTab />
      </section>

      <section>
        <h3 className="mb-1 font-display text-lg font-semibold text-ink">
          Liste prestabilite (departamente și funcții)
        </h3>
        <p className="mb-4 text-sm text-slate-500">
          Aceste liste alimentează dropdown-urile din formularul de angajați, ca toată lumea să
          scrie departamentele și funcțiile la fel.
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          <ListManager
            title="Departamente"
            table="departments"
            hint="ex: Soprane, Alte, Tenori, Bași, Administrativ"
          />
          <ListManager
            title="Funcții"
            table="positions"
            hint="ex: Corist, Dirijor, Corepetitor, Manager"
          />
        </div>
      </section>
    </div>
  )
}
