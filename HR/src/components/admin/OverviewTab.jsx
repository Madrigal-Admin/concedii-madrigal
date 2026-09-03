import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { calculateBalance } from '../../lib/leaveCalculations'

export default function OverviewTab() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [years, setYears] = useState({ y2: '', y1: '', y: '' })

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [{ data: employees }, { data: requests }, { data: recoveries }] = await Promise.all([
      supabase
        .from('angajati')
        .select('*, department:departments(name), position:positions(name), hr_profil_angajat(*)')
        .order('nume_complet'),
      supabase.from('leave_requests').select('*').eq('status', 'approved'),
      supabase.from('overtime_recoveries').select('*'),
    ])

    const computed = (employees || []).map((emp) => {
      const empRequests = (requests || []).filter((r) => r.angajat_id === emp.id)
      const empRecoveries = (recoveries || []).filter((r) => r.angajat_id === emp.id)
      const balance = calculateBalance(emp, empRequests, empRecoveries)
      return { emp, balance }
    })
    setRows(computed)
    if (computed.length > 0) {
      const b = computed[0].balance
      setYears({ y2: b.yearY2, y1: b.yearY1, y: b.year })
    } else {
      const now = new Date()
      setYears({ y2: now.getFullYear() - 2, y1: now.getFullYear() - 1, y: now.getFullYear() })
    }
    setLoading(false)
  }

  if (loading) return <p className="text-sm text-slate-500">Se încarcă…</p>

  return (
    <div className="overflow-x-auto overflow-y-auto rounded-2xl border border-slate-200 bg-white max-h-[700px]">
      <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Angajat</th>
              <th className="px-4 py-3">Departament</th>
              <th className="px-4 py-3">Funcție</th>
              <th className="px-4 py-3 text-right">Recuperări</th>
              <th className="px-4 py-3 text-right">{years.y2} (expiră 30 iun.)</th>
              <th className="px-4 py-3 text-right">{years.y1}</th>
              <th className="px-4 py-3 text-right">{years.y} (curent)</th>
              <th className="px-4 py-3 text-right">Total sold</th>
              <th className="px-4 py-3 text-right">Zile folosite</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ emp, balance }) => (
              <tr key={emp.id} className="border-b border-slate-100 last:border-0">
                <td className="whitespace-nowrap px-4 py-3 font-medium text-ink">{emp.nume_complet}</td>
                <td className="px-4 py-3 text-slate-500">{emp.department?.name || '—'}</td>
                <td className="px-4 py-3 text-slate-500">{emp.position?.name || '—'}</td>
                <td className="px-4 py-3 text-right">{balance.recoveries}</td>
                <td
                  className={`px-4 py-3 text-right ${
                    balance.y2Expired ? 'text-slate-400 line-through' : ''
                  }`}
                >
                  {balance.y2}
                </td>
                <td className="px-4 py-3 text-right">{balance.y1}</td>
                <td className="px-4 py-3 text-right">{balance.y}</td>
                <td
                  className={`px-4 py-3 text-right font-semibold ${
                    balance.total < 0 ? 'text-rose-600' : 'text-ink'
                  }`}
                >
                  {balance.total}
                </td>
                <td className="px-4 py-3 text-right text-slate-500">{balance.totalUsed}</td>
              </tr>
            ))}
          </tbody>
      </table>
    </div>
  )
}
