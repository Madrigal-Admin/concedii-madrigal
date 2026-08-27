import { useEffect, useState } from 'react'
import { Send, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { CERTIFICATE_TYPES, DELIVERY_METHODS } from '../lib/leaveCalculations'

export default function CertificateRequestForm() {
  const [employees, setEmployees] = useState([])
  const [employeeId, setEmployeeId] = useState('')
  const [certificateType, setCertificateType] = useState(CERTIFICATE_TYPES[0])
  const [purpose, setPurpose] = useState('')
  const [deliveryMethod, setDeliveryMethod] = useState(DELIVERY_METHODS[0])
  const [note, setNote] = useState('')
  const [status, setStatus] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    loadEmployees()
  }, [])

  async function loadEmployees() {
    const { data, error } = await supabase
      .from('employees')
      .select('id, full_name, department:departments(name)')
      .order('full_name')
    if (!error) setEmployees(data || [])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErrorMsg('')

    if (!employeeId) return setErrorMsg('Te rugăm să îți selectezi numele din listă.')

    setStatus('sending')
    const employee = employees.find((e) => e.id === employeeId)

    const { error } = await supabase.from('certificate_requests').insert({
      employee_id: employeeId,
      employee_name: employee?.full_name || '',
      certificate_type: certificateType,
      purpose: purpose || null,
      delivery_method: deliveryMethod,
      employee_note: note || null,
      status: 'pending',
    })

    if (error) {
      setStatus('error')
      setErrorMsg('Nu am putut trimite cererea. Încearcă din nou în câteva minute.')
      return
    }

    setStatus('success')
    setEmployeeId('')
    setCertificateType(CERTIFICATE_TYPES[0])
    setPurpose('')
    setDeliveryMethod(DELIVERY_METHODS[0])
    setNote('')
  }

  if (status === 'success') {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <CheckCircle2 className="mx-auto mb-3 text-emerald-600" size={40} />
        <h2 className="font-display text-xl font-semibold text-emerald-900">Cerere trimisă</h2>
        <p className="mt-2 text-sm text-emerald-800">
          Cererea ta de adeverință a fost înregistrată. Vei fi anunțat/ă când documentul e gata.
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
      <h1 className="font-display text-2xl font-semibold text-ink">Cerere adeverințe</h1>
      <p className="mt-1 text-sm text-slate-500">
        Fără cont necesar — selectează-ți numele și completează detaliile de mai jos.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Numele tău</label>
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
          >
            <option value="">Selectează din listă…</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.full_name} {emp.department?.name ? `— ${emp.department.name}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Tip adeverință</label>
          <select
            value={certificateType}
            onChange={(e) => setCertificateType(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
          >
            {CERTIFICATE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Îmi este necesar la:</label>
          <input
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="ex: bancă, autoritatea locală, etc."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Doresc să intru în posesia documentului:
          </label>
          <select
            value={deliveryMethod}
            onChange={(e) => setDeliveryMethod(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
          >
            {DELIVERY_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Observații angajat <span className="font-normal text-slate-400">(opțional)</span>
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
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
