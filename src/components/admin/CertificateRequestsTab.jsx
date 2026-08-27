import { useEffect, useState } from 'react'
import { Check, Undo2 } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { formatDate, CERTIFICATE_STATUS_LABELS, CERTIFICATE_STATUS_STYLES } from '../../lib/leaveCalculations'

export default function CertificateRequestsTab() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('certificate_requests')
      .select('*')
      .order('created_at', { ascending: false })
    setRequests(data || [])
    setLoading(false)
  }

  async function updateStatus(id, status) {
    setBusyId(id)
    await supabase
      .from('certificate_requests')
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('id', id)
    await load()
    setBusyId(null)
  }

  if (loading) return <p className="text-sm text-slate-500">Se încarcă…</p>

  const pending = requests.filter((r) => r.status === 'pending')
  const issued = requests.filter((r) => r.status === 'issued')

  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-3 font-display text-lg font-semibold text-ink">
          În așteptare ({pending.length})
        </h3>
        {pending.length === 0 && <p className="text-sm text-slate-500">Nimic în așteptare momentan.</p>}
        <div className="space-y-2">
          {pending.map((r) => (
            <RequestRow key={r.id} r={r}>
              <button
                disabled={busyId === r.id}
                onClick={() => updateStatus(r.id, 'issued')}
                className="flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 focus-ring"
              >
                <Check size={13} /> Marchează eliberată
              </button>
            </RequestRow>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-3 font-display text-lg font-semibold text-ink">Eliberate ({issued.length})</h3>
        <div className="space-y-2">
          {issued.map((r) => (
            <RequestRow key={r.id} r={r}>
              <button
                disabled={busyId === r.id}
                onClick={() => updateStatus(r.id, 'pending')}
                className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-50 focus-ring"
              >
                <Undo2 size={13} /> Revino la În așteptare
              </button>
            </RequestRow>
          ))}
        </div>
      </section>
    </div>
  )
}

function RequestRow({ r, children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <p className="text-sm font-medium text-ink">{r.employee_name}</p>
        <p className="text-xs text-slate-500">
          {r.certificate_type} · {r.delivery_method}
        </p>
        <p className="mt-0.5 text-xs text-slate-400">Cerere trimisă pe {formatDate(r.created_at)}</p>
        {r.purpose && <p className="mt-1 text-xs italic text-slate-400">Necesar la: {r.purpose}</p>}
        {r.employee_note && <p className="mt-0.5 text-xs italic text-slate-400">„{r.employee_note}”</p>}
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-medium ${CERTIFICATE_STATUS_STYLES[r.status]}`}
        >
          {CERTIFICATE_STATUS_LABELS[r.status]}
        </span>
        {children}
      </div>
    </div>
  )
}
