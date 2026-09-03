import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function AdminDepartamenteFunctii() {
  const [departments, setDepartments] = useState([])
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    const [deptRes, posRes] = await Promise.all([
      supabase.from('departments').select('*').order('name'),
      supabase.from('positions').select('*').order('name'),
    ])
    setDepartments(deptRes.data || [])
    setPositions(posRes.data || [])
    setLoading(false)
  }

  if (loading) return <p className="text-sm text-slate-500">Se încarcă...</p>

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-800 mb-6">
        Departamente &amp; Funcții
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <ListEditor
          title="Departamente"
          table="departments"
          items={departments}
          onChange={loadAll}
        />
        <ListEditor
          title="Funcții"
          table="positions"
          items={positions}
          onChange={loadAll}
        />
      </div>
    </div>
  )
}

function ListEditor({ title, table, items, onChange }) {
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd(e) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return

    setSaving(true)
    setError('')
    const { error } = await supabase.from(table).insert({ name })
    setSaving(false)

    if (error) {
      setError(error.message)
      return
    }

    setNewName('')
    onChange()
  }

  async function handleDelete(id) {
    setError('')
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) {
      setError('Nu poate fi șters — e folosit deja de cel puțin un angajat.')
      return
    }
    onChange()
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <p className="font-medium text-slate-800 mb-4">{title}</p>

      <form onSubmit={handleAdd} className="flex gap-2 mb-4">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={`${title} nou...`}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <button
          type="submit"
          disabled={saving}
          className="bg-accent hover:bg-accent-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition disabled:opacity-50"
        >
          Adaugă
        </button>
      </form>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <ul className="space-y-1">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between text-sm text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-50"
          >
            {item.name}
            <button
              onClick={() => handleDelete(item.id)}
              className="text-slate-400 hover:text-red-600 text-xs"
            >
              Șterge
            </button>
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-sm text-slate-400 px-3 py-2">Lista e goală.</li>
        )}
      </ul>
    </div>
  )
}
