import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Download, ChevronDown, Search } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '../../supabaseClient'
import { formatDate, calculateBalance } from '../../lib/leaveCalculations'

export default function RecoveriesTab() {
  const [employees, setEmployees] = useState([])
  const [recoveryEntries, setRecoveryEntries] = useState([])
  const [approvedRequests, setApprovedRequests] = useState([])
  const [yearAllocations, setYearAllocations] = useState([])
  const [employeeId, setEmployeeId] = useState('')
  const [days, setDays] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [showLog, setShowLog] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [{ data: emps }, { data: recs }, { data: requests }, { data: allocations }] = await Promise.all([
      supabase
        .from('employees')
        .select('*, department:departments(name), position:positions(name)')
        .order('full_name'),
      supabase.from('overtime_recoveries').select('*, employees(full_name)').order('created_at', { ascending: false }),
      supabase.from('leave_requests').select('*').eq('status', 'approved'),
      supabase.from('year_allocations').select('*'),
    ])
    setEmployees(emps || [])
    setRecoveryEntries(recs || [])
    setApprovedRequests(requests || [])
    setYearAllocations(allocations || [])
    setLoading(false)
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

  const situation = useMemo(() => {
    return employees
      .map((emp) => {
        const empRequests = approvedRequests.filter((r) => r.employee_id === emp.id)
        const empRecoveries = recoveryEntries.filter((r) => r.employee_id === emp.id)
        const empAllocations = yearAllocations.filter((a) => a.employee_id === emp.id)
        const balance = calculateBalance(emp, empRequests, empRecoveries, empAllocations)
        return { emp, recoveries: balance.recoveries }
      })
      .filter(({ emp }) => emp.full_name.toLowerCase().includes(search.trim().toLowerCase()))
  }, [employees, approvedRequests, recoveryEntries, yearAllocations, search])

  function handleExportExcel() {
    const rows = situation.map(({ emp, recoveries }) => ({
      Angajat: emp.full_name,
      Departament: emp.department?.name || '',
      Funcție: emp.position?.name || '',
      Recuperări: recoveries,
    }))
    const worksheet = XLSX.utils.json_to_sheet(rows)
    worksheet['!cols'] = [{ wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 12 }]
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Recuperări')
    const today = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(workbook, `recuperari-${today}.xlsx`)
  }

  return (
    <div>
      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-2xl space-y-3 rounded-2xl border border-slate-200 bg-white p-5"
      >
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

      <div className="mx-auto mt-6 max-w-2xl">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-lg font-semibold text-ink">Situația recuperărilor</h3>
          <button
            onClick={handleExportExcel}
            disabled={situation.length === 0}
            className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 focus-ring"
          >
            <Download size={14} /> Export Excel
          </button>
        </div>

        <div className="relative mb-3">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Caută după nume…"
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus-ring"
          />
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Se încarcă…</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5">Angajat</th>
                  <th className="px-4 py-2.5">Departament</th>
                  <th className="px-4 py-2.5">Funcție</th>
                  <th className="px-4 py-2.5 text-right">Recuperări</th>
                </tr>
              </thead>
              <tbody>
                {situation.map(({ emp, recoveries }) => (
                  <tr key={emp.id} className="border-b border-slate-100 last:border-0">
                    <td className="whitespace-nowrap px-4 py-2.5 font-medium text-ink">{emp.full_name}</td>
                    <td className="px-4 py-2.5 text-slate-500">{emp.department?.name || '—'}</td>
                    <td className="px-4 py-2.5 text-slate-500">{emp.position?.name || '—'}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">{recoveries}</td>
                  </tr>
                ))}
                {situation.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-400">
                      Niciun angajat găsit.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <button
          onClick={() => setShowLog((s) => !s)}
          className="mt-4 flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 focus-ring"
        >
          <ChevronDown size={14} className={`transition ${showLog ? 'rotate-180' : ''}`} />
          {showLog ? 'Ascunde istoricul detaliat' : 'Arată istoricul detaliat (pentru corecturi)'}
        </button>

        {showLog && (
          <div className="mt-2 space-y-2">
            {recoveryEntries.map((r) => (
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
        )}
      </div>
    </div>
  )
}
