import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { calculateVechime, formatYMD } from '../../lib/vechimeCalculations'

export default function VechimeTab() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)

    const [{ data: angajati }, { data: suspendari }] = await Promise.all([
      supabase
        .from('angajati')
        .select('*, hr_profil_angajat(*), hr_vechime_anterioara(*)')
        .eq('activ', true)
        .order('nume_complet'),
      supabase
        .from('leave_requests')
        .select('angajat_id, start_date, end_date')
        .eq('leave_type', 'Fără Plată')
        .eq('status', 'approved'),
    ])

    const suspendariPerAngajat = {}
    for (const s of suspendari || []) {
      if (!suspendariPerAngajat[s.angajat_id]) suspendariPerAngajat[s.angajat_id] = []
      suspendariPerAngajat[s.angajat_id].push(s)
    }

    const computed = (angajati || []).map((a) => ({
      angajat: a,
      rezultat: calculateVechime(a, suspendariPerAngajat[a.id] || []),
    }))

    setRows(computed)
    setLoading(false)
  }

  if (loading) return <p className="text-sm text-slate-500">Se încarcă…</p>

  return (
    <div>
      <p className="mb-4 text-sm text-slate-500">
        Vechime totală = suma perioadelor anterioare + vechimea la Corul Madrigal, din care se scad
        zilele de concediu fără plată aprobate. Click pe un rând pentru detaliile de calcul.
      </p>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium"></th>
              <th className="px-4 py-3 font-medium">Angajat</th>
              <th className="px-4 py-3 font-medium">Vechime totală</th>
              <th className="px-4 py-3 font-medium">Gradație</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ angajat, rezultat }) => {
              const isOpen = expandedId === angajat.id
              return (
                <>
                  <tr
                    key={angajat.id}
                    onClick={() => setExpandedId(isOpen ? null : angajat.id)}
                    className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 text-slate-400">
                      {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </td>
                    <td className="px-4 py-3 font-medium text-ink">{angajat.nume_complet}</td>
                    <td className="px-4 py-3 text-slate-700">{formatYMD(rezultat.total)}</td>
                    <td className="px-4 py-3">
                      {rezultat.gradatie ? (
                        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                          Gradația {rezultat.gradatie}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Fără gradație (sub 3 ani)</span>
                      )}
                    </td>
                  </tr>

                  {isOpen && (
                    <tr key={`${angajat.id}-detail`} className="border-t border-slate-100 bg-slate-50/60">
                      <td colSpan={4} className="px-4 py-4">
                        <VechimeDetail rezultat={rezultat} />
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-400">
                  Niciun angajat activ găsit.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function VechimeDetail({ rezultat }) {
  const { surse, totalCalendaristic, zileFaraPlata, total } = rezultat

  return (
    <div className="space-y-3 text-xs">
      <div>
        <p className="mb-1.5 font-semibold text-slate-600">Surse de vechime</p>
        {surse.length === 0 && <p className="text-slate-400">Nicio sursă de vechime introdusă încă.</p>}
        <div className="space-y-1">
          {surse.map((s, i) => (
            <div
              key={i}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
            >
              <div>
                <span className="font-medium text-ink">{s.label}</span>
                <span className="ml-2 text-slate-400">{s.metoda}</span>
              </div>
              <span className="font-medium text-slate-700">{formatYMD(s.ymd)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-white px-3 py-2">
        <span>
          <span className="text-slate-500">Total calendaristic (surse însumate): </span>
          <span className="font-medium text-ink">{formatYMD(totalCalendaristic)}</span>
        </span>
        <span>
          <span className="text-slate-500">Zile concediu fără plată scăzute: </span>
          <span className="font-medium text-ink">{zileFaraPlata} zile</span>
        </span>
        <span>
          <span className="text-slate-500">Vechime finală: </span>
          <span className="font-semibold text-brand-700">{formatYMD(total)}</span>
        </span>
      </div>
    </div>
  )
}
