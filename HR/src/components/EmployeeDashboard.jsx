import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import {
  calculateBalance,
  formatDate,
  STATUS_LABELS_EMPLOYEE,
  STATUS_STYLES,
  CERTIFICATE_STATUS_LABELS,
  CERTIFICATE_STATUS_STYLES,
} from '../lib/leaveCalculations'

export default function EmployeeDashboard({ employee }) {
  const [requests, setRequests] = useState([])
  const [certificateRequests, setCertificateRequests] = useState([])
  const [recoveries, setRecoveries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (employee?.id) loadData()
  }, [employee])

  async function loadData() {
    setLoading(true)
    const [{ data: reqs }, { data: certReqs }, { data: recs }] = await Promise.all([
      supabase
        .from('leave_requests')
        .select('*')
        .eq('angajat_id', employee.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('certificate_requests')
        .select('*')
        .eq('angajat_id', employee.id)
        .order('created_at', { ascending: false }),
      supabase.from('overtime_recoveries').select('*').eq('angajat_id', employee.id),
    ])
    setRequests(reqs || [])
    setCertificateRequests(certReqs || [])
    setRecoveries(recs || [])
    setLoading(false)
  }

  if (loading) return <p className="text-sm text-slate-500">Se încarcă…</p>

  const approved = requests.filter((r) => r.status === 'approved')
  const balance = calculateBalance(employee, approved, recoveries)

  const cards = [
    { label: 'Recuperări', value: balance.recoveries, sub: 'ore suplimentare' },
    {
      label: `${balance.yearY2}`,
      value: balance.y2,
      sub: balance.y2Expired ? 'expirate la 30 iunie' : 'expiră 30 iunie',
    },
    { label: `${balance.yearY1}`, value: balance.y1, sub: 'reportate anul trecut' },
    { label: `${balance.year} (curent)`, value: balance.y, sub: 'alocarea anului curent' },
  ]

  const combinedRequests = [
    ...requests.map((r) => ({ ...r, kind: 'leave' })),
    ...certificateRequests.map((r) => ({ ...r, kind: 'certificate' })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-semibold text-ink">
        Bună, {employee.nume_complet.split(' ')[0]}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {employee.department?.name} {employee.position?.name ? `· ${employee.position.name}` : ''}
      </p>

      <div className="mt-6 rounded-2xl border border-brand-200 bg-brand-50 p-5">
        <p className="text-sm font-medium text-brand-800">Sold total disponibil</p>
        <p className={`font-display text-4xl font-semibold ${balance.total < 0 ? 'text-rose-600' : 'text-brand-900'}`}>
          {balance.total} zile
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{c.label}</p>
            <p className={`font-display text-2xl font-semibold ${c.value < 0 ? 'text-rose-600' : 'text-ink'}`}>
              {c.value}
            </p>
            <p className="text-xs text-slate-400">{c.sub}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-8 font-display text-lg font-semibold text-ink">Cererile mele</h2>
      <div className="mt-3 space-y-2">
        {combinedRequests.length === 0 && (
          <p className="text-sm text-slate-500">Nu ai trimis nicio cerere încă.</p>
        )}
        {combinedRequests.map((r) => (
          <div
            key={`${r.kind}-${r.id}`}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4"
          >
            {r.kind === 'leave' ? (
              <div>
                <p className="text-sm font-medium text-ink">
                  {r.leave_type} — {formatDate(r.start_date)} → {formatDate(r.end_date)}
                </p>
                <p className="text-xs text-slate-400">{r.working_days} zile · trimisă {formatDate(r.created_at)}</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-ink">{r.certificate_type}</p>
                <p className="text-xs text-slate-400">{r.delivery_method} · trimisă {formatDate(r.created_at)}</p>
              </div>
            )}
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                r.kind === 'leave' ? STATUS_STYLES[r.status] : CERTIFICATE_STATUS_STYLES[r.status]
              }`}
            >
              {r.kind === 'leave' ? STATUS_LABELS_EMPLOYEE[r.status] : CERTIFICATE_STATUS_LABELS[r.status]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
