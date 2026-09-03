import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

// Rolurile posibile per tool. '' înseamnă "fără acces".
const TOOLS = [
  { key: 'hub', label: 'Hub', roles: ['admin'] },
  { key: 'hr', label: 'HR', roles: ['angajat', 'operational', 'full'] },
  { key: 'invitatii', label: 'Invitații', roles: ['angajat'] },
]

const ROLE_LABELS = {
  admin: 'Admin',
  angajat: 'Angajat',
  operational: 'Operațional',
  full: 'Admin complet',
}

export default function AdminAccesTooluri() {
  const [angajati, setAngajati] = useState([])
  const [accesMap, setAccesMap] = useState({}) // { angajat_id: { tool: rol } }
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState(null) // "angajatId-tool", cât timp salvează

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    const [angajatiRes, accesRes] = await Promise.all([
      supabase.from('angajati').select('id, nume_complet, email').order('nume_complet'),
      supabase.from('acces_tooluri').select('angajat_id, tool, rol'),
    ])

    const map = {}
    for (const row of accesRes.data || []) {
      if (!map[row.angajat_id]) map[row.angajat_id] = {}
      map[row.angajat_id][row.tool] = row.rol
    }

    setAngajati(angajatiRes.data || [])
    setAccesMap(map)
    setLoading(false)
  }

  async function handleChange(angajatId, tool, newRol) {
    const key = `${angajatId}-${tool}`
    setSavingKey(key)

    if (newRol === '') {
      await supabase
        .from('acces_tooluri')
        .delete()
        .eq('angajat_id', angajatId)
        .eq('tool', tool)
    } else {
      await supabase
        .from('acces_tooluri')
        .upsert(
          { angajat_id: angajatId, tool, rol: newRol },
          { onConflict: 'angajat_id,tool' }
        )
    }

    setAccesMap((prev) => {
      const next = { ...prev, [angajatId]: { ...prev[angajatId] } }
      if (newRol === '') {
        delete next[angajatId][tool]
      } else {
        next[angajatId][tool] = newRol
      }
      return next
    })

    setSavingKey(null)
  }

  if (loading) return <p className="text-sm text-slate-500">Se încarcă...</p>

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-800 mb-2">Acces Tool-uri</h2>
      <p className="text-sm text-slate-500 mb-6">
        Alege ce rol are fiecare angajat pentru fiecare tool. „Fără acces" elimină intrarea.
      </p>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[520px]">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Angajat</th>
              {TOOLS.map((t) => (
                <th key={t.key} className="px-4 py-3 font-medium">
                  {t.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {angajati.map((a) => (
              <tr key={a.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <p className="text-slate-800">{a.nume_complet}</p>
                  <p className="text-xs text-slate-400">{a.email}</p>
                </td>
                {TOOLS.map((t) => {
                  const key = `${a.id}-${t.key}`
                  const current = accesMap[a.id]?.[t.key] || ''
                  return (
                    <td key={t.key} className="px-4 py-3">
                      <select
                        value={current}
                        disabled={savingKey === key}
                        onChange={(e) => handleChange(a.id, t.key, e.target.value)}
                        className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
                      >
                        <option value="">Fără acces</option>
                        {t.roles.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
