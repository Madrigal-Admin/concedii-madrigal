import { useEffect, useState } from 'react'
import { Check, X, Pencil, Save, X as XIcon } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import {
  formatDate,
  calculateBalance,
  computeDefaultSplit,
  TYPES_THAT_DEDUCT_BALANCE,
} from '../../lib/leaveCalculations'

export default function ApprovalsTab() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ recoveries: 0, y2: 0, y1: 0, y: 0 })
  const [editError, setEditError] = useState('')

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

  async function approve(request) {
    setBusyId(request.id)

    let split = { recoveries: 0, y2: 0, y1: 0, y: 0 }

    if (TYPES_THAT_DEDUCT_BALANCE.includes(request.leave_type)) {
      const [{ data: employee }, { data: otherApproved }, { data: recoveries }] = await Promise.all([
        supabase.from('employees').select('*').eq('id', request.employee_id).maybeSingle(),
        supabase
          .from('leave_requests')
          .select('*')
          .eq('employee_id', request.employee_id)
          .eq('status', 'approved')
          .neq('id', request.id),
        supabase.from('overtime_recoveries').select('*').eq('employee_id', request.employee_id),
      ])

      if (employee) {
        const pools = calculateBalance(employee, otherApproved || [], recoveries || [])
        split = computeDefaultSplit(request.working_days, pools)
      }
    }

    await supabase
      .from('leave_requests')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        deducted_recoveries: split.recoveries,
        deducted_y2: split.y2,
        deducted_y1: split.y1,
        deducted_y: split.y,
      })
      .eq('id', request.id)

    await load()
    setBusyId(null)
  }

  async function reject(id) {
    setBusyId(id)
    await supabase
      .from('leave_requests')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
      .eq('id', id)
    await load()
    setBusyId(null)
  }

  function startEdit(r) {
    setEditingId(r.id)
    setEditError('')
    setEditForm({
      recoveries: r.deducted_recoveries || 0,
      y2: r.deducted_y2 || 0,
      y1: r.deducted_y1 || 0,
      y: r.deducted_y || 0,
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditError('')
  }

  async function saveEdit(r) {
    const sum =
      Number(editForm.recoveries || 0) +
      Number(editForm.y2 || 0) +
      Number(editForm.y1 || 0) +
      Number(editForm.y || 0)

    if (Math.abs(sum - Number(r.working_days)) > 0.01) {
      setEditError(`Suma trebuie să fie exact ${r.working_days} zile (acum: ${sum}).`)
      return
    }

    setBusyId(r.id)
    await supabase
      .from('leave_requests')
      .update({
        deducted_recoveries: Number(editForm.recoveries) || 0,
        deducted_y2: Number(editForm.y2) || 0,
        deducted_y1: Number(editForm.y1) || 0,
        deducted_y: Number(editForm.y) || 0,
      })
      .eq('id', r.id)
    await load()
    setBusyId(null)
    setEditingId(null)
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
                  onClick={() => approve(r)}
                  className="flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 focus-ring"
                >
                  <Check size={13} /> Aprobă
                </button>
                <button
                  disabled={busyId === r.id}
                  onClick={() => reject(r.id)}
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
          {rest.map((r) => {
            const isApproved = r.status === 'approved'
            const isEditing = editingId === r.id
            return (
              <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <span className="font-medium text-ink">{r.employee_name}</span> — {r.leave_type} ·{' '}
                    {formatDate(r.start_date)} → {formatDate(r.end_date)} · {r.working_days} zile
                  </span>
                  <span
                    className={
                      isApproved ? 'font-medium text-emerald-700' : 'font-medium text-rose-600'
                    }
                  >
                    {isApproved ? 'Aprobat' : 'Respins'}
                  </span>
                </div>

                {isApproved && !isEditing && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      Recuperări: {r.deducted_recoveries || 0}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      Acum 2 ani: {r.deducted_y2 || 0}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      Anul trecut: {r.deducted_y1 || 0}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      Anul curent: {r.deducted_y || 0}
                    </span>
                    <button
                      onClick={() => startEdit(r)}
                      className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-brand-600 hover:bg-brand-50 focus-ring"
                    >
                      <Pencil size={12} /> Editează distribuția
                    </button>
                  </div>
                )}

                {isApproved && isEditing && (
                  <div className="mt-3 rounded-lg border border-brand-200 bg-brand-50 p-3">
                    <p className="mb-2 text-xs text-brand-800">
                      Suma celor 4 câmpuri trebuie să fie exact {r.working_days} zile.
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {[
                        ['recoveries', 'Recuperări'],
                        ['y2', 'Acum 2 ani'],
                        ['y1', 'Anul trecut'],
                        ['y', 'Anul curent'],
                      ].map(([key, label]) => (
                        <div key={key}>
                          <label className="mb-1 block text-[11px] font-medium text-slate-600">
                            {label}
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            value={editForm[key]}
                            onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus-ring"
                          />
                        </div>
                      ))}
                    </div>
                    {editError && <p className="mt-2 text-xs text-rose-600">{editError}</p>}
                    <div className="mt-3 flex gap-2">
                      <button
                        disabled={busyId === r.id}
                        onClick={() => saveEdit(r)}
                        className="flex items-center gap-1 rounded-full bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50 focus-ring"
                      >
                        <Save size={12} /> Salvează
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 focus-ring"
                      >
                        <XIcon size={12} /> Anulează
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
