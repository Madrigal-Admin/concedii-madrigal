import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { formatDate } from '../../lib/leaveCalculations'

export default function ApprovalsTab() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('leave_requests')
      .select('*')
      .order('created_at', { ascending: false })
    setRequests(data || [])
    setLoading(false)
  }

  async function updateStatus(id, status) {
    setBusyId(id)
    await supabase.from('leave_requests').update({ status, reviewed_at: new Date().toISOString() }).eq('id', id)
    await load()
    setBusyId(null)
  }

  if (loading) return <p className="text-sm text-slate-500">Se încarcă…</p>

  const pending = requests.filter((r) => r.status === 'pending')
  const rest = requests.filter((r) => r.status !== 'pending')

  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-3 font-display text-lg font-semibold text-ink">
          În așteptare ({pending.length})
        </h3>
        {pending.length === 0 && <p className="text-sm text-slate-500">Nimic de aprobat momentan.</p>}
        <div className="space-y-2">
          {pending.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"
            >
              <div>
                <p className="text-sm font-medium text-ink">{r.employee_name}</p>
                <p className="text-xs text-slate-500">
                  {r.leave_type} · {formatDate(r.start_date)} → {formatDate(r.end_date)} ·{' '}
                  {r.working_days} zile
                </p>
                {r.reason && <p className="mt-1 text-xs italic text-slate-400">„{r.reason}”</p>}
              </div>
              <div className="flex gap-2">
                <button
                  disabled={busyId === r.id}
                  onClick={() => updateStatus(r.id, 'approved')}
                  className="flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 focus-ring"
                >
                  <Check size={13} /> Aprobă
                </button>
                <button
                  disabled={busyId === r.id}
                  onClick={() => updateStatus(r.id, 'rejected')}
                  className="flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-200 disabled:opacity-50 focus-ring"
                >
                  <X size={13} /> Respinge
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-3 font-display text-lg font-semibold text-ink">Istoric</h3>
        <div className="space-y-2">
          {rest.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-sm"
            >
              <span>
                {r.employee_name} — {r.leave_type} · {formatDate(r.start_date)} → {formatDate(r.end_date)}
              </span>
              <span
                className={
                  r.status === 'approved'
                    ? 'font-medium text-emerald-700'
                    : 'font-medium text-rose-600'
                }
              >
                {r.status === 'approved' ? 'Aprobat' : 'Respins'}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
