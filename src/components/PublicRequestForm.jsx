import { useEffect, useState } from 'react'
import { Send, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { countLeaveDays, PUBLIC_LEAVE_TYPES } from '../lib/leaveCalculations'

export default function PublicRequestForm({ employee }) {
  const [legalHolidays, setLegalHolidays] = useState([])
  const [leaveType, setLeaveType] = useState(PUBLIC_LEAVE_TYPES[0])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [status, setStatus] = useState(null) // null | 'sending' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    loadLegalHolidays()
  }, [])

  async function loadLegalHolidays() {
    const { data, error } = await supabase.from('legal_holidays').select('*')
    if (!error) setLegalHolidays(data || [])
  }

  const leaveDays = countLeaveDays(leaveType, startDate, endDate, legalHolidays)

  async function handleSubmit(e) {
    e.preventDefault()
    setErrorMsg('')

    if (!startDate || !endDate) return setErrorMsg('Completează data de început și de sfârșit.')
    if (new Date(endDate) < new Date(startDate))
      return setErrorMsg('Data de sfârșit nu poate fi înainte de data de început.')
    if (leaveDays === 0) return setErrorMsg('Perioada selectată nu conține nicio zi de concediu.')

    setStatus('sending')

    const { error } = await supabase.from('leave_requests').insert({
      employee_id: employee.id,
      employee_name: employee.full_name,
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      working_days: leaveDays,
      reason: reason || null,
      status: 'submitted',
    })

    if (error) {
      setStatus('error')
      setErrorMsg('Nu am putut trimite cererea. Încearcă din nou în câteva minute.')
      return
    }

    setStatus('success')
    setStartDate('')
    setEndDate('')
    setReason('')
  }

  if (status === 'success') {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <CheckCircle2 className="mx-auto mb-3 text-emerald-600" size={40} />
        <h2 className="font-display text-xl font-semibold text-emerald-900">Cerere trimisă</h2>
        <p className="mt-2 text-sm text-emerald-800">
          Cererea ta a fost înregistrată cu statusul „Trimisă”. Vei fi anunțat/ă când este
          aprobată.
        </p>
        <button
          onClick={() => setStatus(null)}
          className="mt-5 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus-ring"
        >
          Trimite o altă cerere
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-display text-2xl font-semibold text-ink">Cerere de concediu</h1>
      <p className="mt-1 text-sm text-slate-500">
        Trimiți cererea în numele tău, {employee.full_name.split(' ')[0]}.
      </p>
      <p className="mt-1 text-xs text-slate-400">
        Pentru concediu medical, te rugăm să contactezi direct HR.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Tip concediu</label>
          <select
            value={leaveType}
            onChange={(e) => setLeaveType(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
          >
            {PUBLIC_LEAVE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Data început</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Data sfârșit</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
            />
          </div>
        </div>

        {startDate && endDate && (
          <p className="text-sm text-slate-600">
            Zile de concediu calculate: <span className="font-semibold text-ink">{leaveDays}</span>
          </p>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Motiv <span className="font-normal text-slate-400">(opțional)</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
          />
        </div>

        {errorMsg && (
          <p className="flex items-start gap-1.5 text-sm text-rose-600">
            <AlertCircle size={16} className="mt-0.5 shrink-0" /> {errorMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={status === 'sending'}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60 focus-ring"
        >
          <Send size={15} />
          {status === 'sending' ? 'Se trimite…' : 'Trimite cererea'}
        </button>
      </form>
    </div>
  )
}
