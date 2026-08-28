import { useEffect, useMemo, useState } from 'react'
import { Download, Printer, ListChecks } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '../../supabaseClient'
import { formatDate, STATUS_LABELS_ADMIN, LEAVE_TYPES } from '../../lib/leaveCalculations'
import EmployeeMultiSelect from './EmployeeMultiSelect'

export default function ReportSection() {
  const [employees, setEmployees] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set()) // gol = toți angajații
  const [leaveType, setLeaveType] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [{ data: emps }, { data: reqs }] = await Promise.all([
      supabase
        .from('employees')
        .select('*, department:departments(name), position:positions(name)')
        .order('full_name'),
      supabase.from('leave_requests').select('*').order('start_date', { ascending: false }),
    ])
    setEmployees(emps || [])
    setRequests(reqs || [])
    setLoading(false)
  }

  function toggleEmployee(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelectedIds((prev) => (prev.size === employees.length ? new Set() : new Set(employees.map((e) => e.id))))
  }

  const employeeMap = useMemo(() => {
    const m = new Map()
    employees.forEach((e) => m.set(e.id, e))
    return m
  }, [employees])

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (selectedIds.size > 0 && !selectedIds.has(r.employee_id)) return false
      if (startDate && r.end_date < startDate) return false
      if (endDate && r.start_date > endDate) return false
      if (leaveType && r.leave_type !== leaveType) return false
      return true
    })
  }, [requests, selectedIds, startDate, endDate, leaveType])

  function rowsForExport() {
    return filtered.map((r) => {
      const emp = employeeMap.get(r.employee_id)
      return {
        Angajat: r.employee_name,
        Departament: emp?.department?.name || '',
        Funcție: emp?.position?.name || '',
        'Tip concediu': r.leave_type,
        'Data început': formatDate(r.start_date),
        'Data sfârșit': formatDate(r.end_date),
        'Zile lucrătoare': r.working_days,
        Status: STATUS_LABELS_ADMIN[r.status] || r.status,
      }
    })
  }

  function handleExportExcel() {
    const rows = rowsForExport()
    const worksheet = XLSX.utils.json_to_sheet(rows)
    worksheet['!cols'] = [
      { wch: 22 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
    ]
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Raport concedii')
    const today = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(workbook, `raport-concedii-${today}.xlsx`)
  }

  function handlePrint() {
    const rows = rowsForExport()
    const periodLabel =
      startDate || endDate
        ? `Perioadă: ${startDate ? formatDate(startDate) : '…'} → ${endDate ? formatDate(endDate) : '…'}`
        : 'Toate perioadele'

    const tableRows = rows
      .map(
        (r) => `
        <tr>
          <td>${r['Angajat']}</td>
          <td>${r['Departament']}</td>
          <td>${r['Funcție']}</td>
          <td>${r['Tip concediu']}</td>
          <td>${r['Data început']}</td>
          <td>${r['Data sfârșit']}</td>
          <td>${r['Zile lucrătoare']}</td>
          <td>${r['Status']}</td>
        </tr>`
      )
      .join('')

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Raport concedii</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #1c2230; }
            h1 { font-size: 18px; margin-bottom: 4px; }
            p.meta { color: #64748b; font-size: 12px; margin-top: 0; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
            th { background: #f1f5f9; }
          </style>
        </head>
        <body>
          <h1>Raport concedii — Concedii Madrigal</h1>
          <p class="meta">${periodLabel} · generat la ${formatDate(new Date())} · ${rows.length} înregistrări</p>
          <table>
            <thead>
              <tr>
                <th>Angajat</th><th>Departament</th><th>Funcție</th><th>Tip</th>
                <th>Început</th><th>Sfârșit</th><th>Zile</th><th>Status</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>`

    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (!printWindow) return
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  if (loading) return <p className="text-sm text-slate-500">Se încarcă…</p>

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <ListChecks size={18} className="text-brand-600" />
        <h3 className="font-display text-lg font-semibold text-ink">Raport pe perioadă și angajați</h3>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">De la data</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Până la data</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Angajați</label>
            <EmployeeMultiSelect
              employees={employees}
              selectedIds={selectedIds}
              onToggle={toggleEmployee}
              onToggleAll={toggleAll}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Tip concediu</label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
            >
              <option value="">Toate tipurile</option>
              {LEAVE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-500">{filtered.length} cereri găsite</p>
          <div className="flex gap-2">
            <button
              onClick={handleExportExcel}
              disabled={filtered.length === 0}
              className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 focus-ring"
            >
              <Download size={14} /> Export Excel
            </button>
            <button
              onClick={handlePrint}
              disabled={filtered.length === 0}
              className="flex items-center gap-1.5 rounded-full bg-slate-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 focus-ring"
            >
              <Printer size={14} /> Printează
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Angajat</th>
                <th className="px-3 py-2">Departament</th>
                <th className="px-3 py-2">Tip</th>
                <th className="px-3 py-2">Perioadă</th>
                <th className="px-3 py-2 text-right">Zile</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const emp = employeeMap.get(r.employee_id)
                return (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2 font-medium text-ink">{r.employee_name}</td>
                    <td className="px-3 py-2 text-slate-500">{emp?.department?.name || '—'}</td>
                    <td className="px-3 py-2 text-slate-500">{r.leave_type}</td>
                    <td className="px-3 py-2 text-slate-500">
                      {formatDate(r.start_date)} → {formatDate(r.end_date)}
                    </td>
                    <td className="px-3 py-2 text-right">{r.working_days}</td>
                    <td className="px-3 py-2 text-slate-500">{STATUS_LABELS_ADMIN[r.status]}</td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-400">
                    Nicio cerere nu se potrivește cu filtrele alese.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
