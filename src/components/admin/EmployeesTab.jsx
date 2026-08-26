import { useEffect, useState } from 'react'
import { Plus, Trash2, Pencil, Save, X as XIcon } from 'lucide-react'
import { supabase } from '../../supabaseClient'

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_Y2 = CURRENT_YEAR - 2
const YEAR_Y1 = CURRENT_YEAR - 1
const YEAR_Y = CURRENT_YEAR

const empty = {
  full_name: '',
  email: '',
  department_id: '',
  position_id: '',
  base_annual_days: 21,
  opening_recoveries: 0,
  alloc_y2: 0,
  alloc_y1: 0,
  alloc_y: 0,
}

export default function EmployeesTab() {
  const [employees, setEmployees] = useState([])
  const [departments, setDepartments] = useState([])
  const [positions, setPositions] = useState([])
  const [allocationsByEmployee, setAllocationsByEmployee] = useState({})
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(empty)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [{ data: emps }, { data: depts }, { data: pos }, { data: allocations }] = await Promise.all([
      supabase
        .from('employees')
        .select('*, department:departments(id, name), position:positions(id, name)')
        .order('full_name'),
      supabase.from('departments').select('*').order('name'),
      supabase.from('positions').select('*').order('name'),
      supabase.from('year_allocations').select('*'),
    ])
    setEmployees(emps || [])
    setDepartments(depts || [])
    setPositions(pos || [])

    const map = {}
    ;(allocations || []).forEach((a) => {
      if (!map[a.employee_id]) map[a.employee_id] = {}
      map[a.employee_id][a.year] = a.days
    })
    setAllocationsByEmployee(map)
    setLoading(false)
  }

  function startEdit(emp) {
    setEditingId(emp.id)
    const allocs = allocationsByEmployee[emp.id] || {}
    setForm({
      full_name: emp.full_name,
      email: emp.email || '',
      department_id: emp.department_id || '',
      position_id: emp.position_id || '',
      base_annual_days: emp.base_annual_days,
      opening_recoveries: emp.opening_recoveries || 0,
      alloc_y2: allocs[YEAR_Y2] ?? 0,
      alloc_y1: allocs[YEAR_Y1] ?? 0,
      alloc_y: allocs[YEAR_Y] ?? 0,
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(empty)
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.full_name.trim()) return setError('Numele este obligatoriu.')

    const payload = {
      full_name: form.full_name.trim(),
      email: form.email.trim().toLowerCase() || null,
      department_id: form.department_id || null,
      position_id: form.position_id || null,
      base_annual_days: Number(form.base_annual_days) || 0,
      opening_recoveries: Number(form.opening_recoveries) || 0,
    }

    let employeeId = editingId

    if (editingId) {
      const { error } = await supabase.from('employees').update(payload).eq('id', editingId)
      if (error) {
        setError('Nu am putut salva. Verifică dacă emailul e deja folosit.')
        return
      }
    } else {
      const { data, error } = await supabase.from('employees').insert(payload).select('id').single()
      if (error) {
        setError('Nu am putut salva. Verifică dacă emailul e deja folosit.')
        return
      }
      employeeId = data.id
    }

    // scrie alocările pe cei 3 ani urmăriți acum (an real, nu relativ)
    await Promise.all(
      [
        [YEAR_Y2, form.alloc_y2],
        [YEAR_Y1, form.alloc_y1],
        [YEAR_Y, form.alloc_y],
      ].map(([year, days]) =>
        supabase
          .from('year_allocations')
          .upsert(
            { employee_id: employeeId, year, days: Number(days) || 0 },
            { onConflict: 'employee_id,year' }
          )
      )
    )

    cancelEdit()
    load()
  }

  async function handleDelete(id) {
    if (!confirm('Ștergi acest angajat? Cererile lui existente rămân în istoric.')) return
    await supabase.from('employees').delete().eq('id', id)
    load()
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
      <form onSubmit={handleSubmit} className="h-fit space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="font-display text-lg font-semibold text-ink">
          {editingId ? 'Editează angajat' : 'Adaugă angajat nou'}
        </h3>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Nume complet</label>
          <input
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Email <span className="text-slate-400">(pentru cont, opțional)</span>
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Departament</label>
          <select
            value={form.department_id}
            onChange={(e) => setForm({ ...form, department_id: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
          >
            <option value="">Fără departament</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          {departments.length === 0 && (
            <p className="mt-1 text-xs text-amber-600">
              Nu ai niciun departament definit — adaugă din secțiunea de mai jos.
            </p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Funcție</label>
          <select
            value={form.position_id}
            onChange={(e) => setForm({ ...form, position_id: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
          >
            <option value="">Fără funcție</option>
            {positions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {positions.length === 0 && (
            <p className="mt-1 text-xs text-amber-600">
              Nu ai nicio funcție definită — adaugă din secțiunea de mai jos.
            </p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Zile de bază / an</label>
          <input
            type="number"
            step="0.5"
            value={form.base_annual_days}
            onChange={(e) => setForm({ ...form, base_annual_days: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
          />
          <p className="mt-1 text-xs text-slate-400">
            Alocarea implicită folosită automat pentru un an care nu are încă un număr explicit
            mai jos — de-asta un an nou (1 ianuarie) capătă automat această alocare, fără nicio
            intervenție din partea ta.
          </p>
        </div>

        <div className="rounded-xl border border-brand-200 bg-brand-50 p-3">
          <p className="text-xs font-semibold text-brand-800">Sold pe fiecare an (situația actuală)</p>
          <p className="mt-0.5 text-xs text-brand-700">
            Completează cu numerele exacte din Excel-ul actual, pentru fiecare an în parte.
            Aplicația scade automat din ele pe măsură ce aprobi cereri noi.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Recuperări</label>
              <input
                type="number"
                step="0.5"
                value={form.opening_recoveries}
                onChange={(e) => setForm({ ...form, opening_recoveries: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Anul {YEAR_Y2} <span className="text-slate-400">(expiră 30 iun. {CURRENT_YEAR})</span>
              </label>
              <input
                type="number"
                step="0.5"
                value={form.alloc_y2}
                onChange={(e) => setForm({ ...form, alloc_y2: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Anul {YEAR_Y1}</label>
              <input
                type="number"
                step="0.5"
                value={form.alloc_y1}
                onChange={(e) => setForm({ ...form, alloc_y1: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Anul {YEAR_Y} <span className="text-slate-400">(curent)</span>
              </label>
              <input
                type="number"
                step="0.5"
                value={form.alloc_y}
                onChange={(e) => setForm({ ...form, alloc_y: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
              />
            </div>
          </div>
        </div>
        {error && <p className="text-xs text-rose-600">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 focus-ring"
          >
            {editingId ? <Save size={14} /> : <Plus size={14} />}
            {editingId ? 'Salvează' : 'Adaugă'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="flex items-center gap-1.5 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 focus-ring"
            >
              <XIcon size={14} /> Anulează
            </button>
          )}
        </div>
      </form>

      <div>
        <h3 className="mb-3 font-display text-lg font-semibold text-ink">
          Angajați ({employees.length})
        </h3>
        {loading ? (
          <p className="text-sm text-slate-500">Se încarcă…</p>
        ) : (
          <div className="space-y-2">
            {employees.map((emp) => (
              <div
                key={emp.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{emp.full_name}</p>
                  <p className="text-xs text-slate-500">
                    {emp.department?.name || '—'} {emp.position?.name ? `· ${emp.position.name}` : ''} ·{' '}
                    {emp.base_annual_days} zile/an {emp.email ? `· ${emp.email}` : ''}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => startEdit(emp)}
                    className="rounded-full p-2 text-slate-500 hover:bg-slate-100 focus-ring"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(emp.id)}
                    className="rounded-full p-2 text-rose-500 hover:bg-rose-50 focus-ring"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
