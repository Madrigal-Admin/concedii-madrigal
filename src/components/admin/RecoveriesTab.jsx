import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { formatDate } from '../../lib/leaveCalculations'

export default function RecoveriesTab() {
  const [employees, setEmployees] = useState([])
  const [recoveries, setRecoveries] = useState([])
  const [employeeId, setEmployeeId] = useState('')
  const [days, setDays] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const [{ data: emps }, { data: recs }] = await Promise.all([
      supabase.from('employees').select('id, full_name').order('full_name'),
      supabase
        .from('overtime_recoveries')
        .select('*, employees(full_name)')
        .order('created_at', { ascending: false }),
    ])
    setEmployees(emps || [])
    setRecoveries(recs || [])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!employeeId || !days) return setError('Alege angajatul și numărul de zile.')

    const { error } = await supabase.from('overtime_recoveries').insert({
      employee_id: employeeId,
      days: Number(days),
      note: note || null,
    })
    if (error) {
      setError('Nu am putut salva.')
      return
    }
    setEmployeeId('')
    setDays('')
    setNote('')
    load()
  }

  async function handleDelete(id) {
    if (!confirm('Ștergi această înregistrare?')) return
    await supabase.from('overtime_recoveries').delete().eq('id', id)
    load()
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
      <form onSubmit={handleSubmit} className="h-fit space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="font-display text-lg font-semibold text-ink">Adaugă recuperare</h3>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Angajat</label>
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
          >
            <option value="">Selectează…</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.full_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Zile (poate fi zecimal, ex. 0.5)
          </label>
          <input
            type="number"
            step="0.5"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Notă (opțional)</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
            placeholder="ex: repetiție weekend 14-15 martie"
          />
        </div>
        {error && <p className="text-xs text-rose-600">{error}</p>}
        <button
          type="submit"
          className="flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 focus-ring"
        >
          <Plus size={14} /> Adaugă
        </button>
      </form>

      <div>
        <h3 className="mb-3 font-display text-lg font-semibold text-ink">Istoric recuperări</h3>
        <div className="space-y-2">
          {recoveries.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-sm"
            >
              <div>
                <p className="font-medium text-ink">
                  {r.employees?.full_name || '—'} · {r.days} zile
                </p>
                <p className="text-xs text-slate-400">
                  {formatDate(r.created_at)} {r.note ? `· ${r.note}` : ''}
                </p>
              </div>
              <button
                onClick={() => handleDelete(r.id)}
                className="rounded-full p-2 text-rose-500 hover:bg-rose-50 focus-ring"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
