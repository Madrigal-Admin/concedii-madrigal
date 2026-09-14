import { useEffect, useMemo, useState } from 'react'
import { Bell, Cake, TrendingUp, IdCard, FileWarning, Columns3, Printer, Download, Save, X as XIcon } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { calculateBalance } from '../../lib/leaveCalculations'
import { calculateVechime, parseCnpBirthDate, dataUrmatoareiGradatii } from '../../lib/vechimeCalculations'

function profilOf(emp) {
  return Array.isArray(emp.hr_profil_angajat) ? emp.hr_profil_angajat[0] : emp.hr_profil_angajat
}
const DA_NU = (v) => (v === true ? 'Da' : v === false ? 'Nu' : '—')
const AZI = new Date().toISOString().slice(0, 10)

const COLOANE = [
  { key: 'nume', grup: 'Identitate & Organizare', label: 'Nume', get: ({ emp }) => emp.nume_complet, sort: ({ emp }) => emp.nume_complet || '' },
  { key: 'email', grup: 'Identitate & Organizare', label: 'Email', get: ({ emp }) => emp.email || '—', sort: ({ emp }) => emp.email || '' },
  { key: 'departament', grup: 'Identitate & Organizare', label: 'Departament', get: ({ emp }) => emp.department?.name || '—', sort: ({ emp }) => emp.department?.name || '' },
  { key: 'functie', grup: 'Identitate & Organizare', label: 'Funcție', get: ({ emp }) => emp.position?.name || '—', sort: ({ emp }) => emp.position?.name || '' },
  { key: 'atributie', grup: 'Identitate & Organizare', label: 'Atribuție', get: ({ emp }) => profilOf(emp)?.attribution?.name || '—', sort: ({ emp }) => profilOf(emp)?.attribution?.name || '' },
  { key: 'grad', grup: 'Identitate & Organizare', label: 'Grad', get: ({ emp }) => profilOf(emp)?.grad || '—', sort: ({ emp }) => profilOf(emp)?.grad || '' },

  { key: 'tip_contract', grup: 'Contract & Program', label: 'Tip contract', get: ({ emp }) => (profilOf(emp)?.tip_contract === 'determinat' ? 'Determinat' : profilOf(emp)?.tip_contract === 'nedeterminat' ? 'Nedeterminat' : '—'), sort: ({ emp }) => profilOf(emp)?.tip_contract || '' },
  { key: 'numar_contract', grup: 'Contract & Program', label: 'Număr contract', get: ({ emp }) => profilOf(emp)?.numar_contract || '—', sort: ({ emp }) => profilOf(emp)?.numar_contract || '' },
  { key: 'data_inceput_contract', grup: 'Contract & Program', label: 'Data început contract', get: ({ emp }) => profilOf(emp)?.data_inceput_contract || '—', sort: ({ emp }) => profilOf(emp)?.data_inceput_contract || '' },
  { key: 'data_final_contract', grup: 'Contract & Program', label: 'Data final contract', get: ({ emp }) => profilOf(emp)?.data_final_contract || '—', sort: ({ emp }) => profilOf(emp)?.data_final_contract || '' },
  { key: 'norma_ore', grup: 'Contract & Program', label: 'Normă (ore)', get: ({ emp }) => (profilOf(emp)?.norma_ore ? `${profilOf(emp).norma_ore}h` : '—'), sort: ({ emp }) => profilOf(emp)?.norma_ore || 0 },
  { key: 'interval_orar', grup: 'Contract & Program', label: 'Interval orar', get: ({ emp }) => { const p = profilOf(emp); return p?.interval_ora_inceput && p?.interval_ora_sfarsit ? `${p.interval_ora_inceput}–${p.interval_ora_sfarsit}` : '—' }, sort: ({ emp }) => profilOf(emp)?.interval_ora_inceput || '' },
  { key: 'fisa_postului', grup: 'Contract & Program', label: 'Fișa postului', get: ({ emp }) => DA_NU(profilOf(emp)?.are_fisa_postului), sort: ({ emp }) => (profilOf(emp)?.are_fisa_postului ? 1 : 0) },
  { key: 'functie_de_baza', grup: 'Contract & Program', label: 'Funcția de bază', get: ({ emp }) => DA_NU(profilOf(emp)?.functie_de_baza), sort: ({ emp }) => (profilOf(emp)?.functie_de_baza ? 1 : 0) },

  { key: 'vechime', grup: 'Vechime & Solduri', label: 'Vechime', get: ({ vechime }) => `${vechime.total.years} ani, ${vechime.total.months} luni`, sort: ({ vechime }) => vechime.total.years * 365 + vechime.total.months * 30 + vechime.total.days },
  { key: 'gradatie', grup: 'Vechime & Solduri', label: 'Gradație', get: ({ vechime }) => `Gradația ${vechime.gradatie}`, sort: ({ vechime }) => vechime.gradatie },
  { key: 'sold_recuperari', grup: 'Vechime & Solduri', label: 'Recuperări', get: ({ balance }) => balance.recoveries, sort: ({ balance }) => balance.recoveries },
  { key: 'sold_y2', grup: 'Vechime & Solduri', label: 'Sold an -2', get: ({ balance }) => balance.y2, sort: ({ balance }) => balance.y2 },
  { key: 'sold_y1', grup: 'Vechime & Solduri', label: 'Sold an -1', get: ({ balance }) => balance.y1, sort: ({ balance }) => balance.y1 },
  { key: 'sold_y', grup: 'Vechime & Solduri', label: 'Sold an curent', get: ({ balance }) => balance.y, sort: ({ balance }) => balance.y },
  { key: 'sold_total', grup: 'Vechime & Solduri', label: 'Total sold', get: ({ balance }) => balance.total, sort: ({ balance }) => balance.total },
  { key: 'zile_folosite', grup: 'Vechime & Solduri', label: 'Zile folosite', get: ({ balance }) => balance.totalUsed, sort: ({ balance }) => balance.totalUsed },

  { key: 'adresa', grup: 'Date personale & Acte', label: 'Adresă', get: ({ emp }) => profilOf(emp)?.adresa || '—', sort: ({ emp }) => profilOf(emp)?.adresa || '' },
  { key: 'telefon', grup: 'Date personale & Acte', label: 'Telefon', get: ({ emp }) => profilOf(emp)?.telefon || '—', sort: ({ emp }) => profilOf(emp)?.telefon || '' },
  { key: 'cnp', grup: 'Date personale & Acte', label: 'CNP', get: ({ emp }) => profilOf(emp)?.cnp || '—', sort: ({ emp }) => profilOf(emp)?.cnp || '' },
  { key: 'iban', grup: 'Date personale & Acte', label: 'IBAN', get: ({ emp }) => profilOf(emp)?.iban || '—', sort: ({ emp }) => profilOf(emp)?.iban || '' },
  { key: 'act_identitate', grup: 'Date personale & Acte', label: 'Act identitate (serie/nr)', get: ({ emp }) => { const p = profilOf(emp); return p?.act_serie || p?.act_numar ? `${p?.act_serie || ''} ${p?.act_numar || ''}`.trim() : '—' }, sort: ({ emp }) => profilOf(emp)?.act_numar || '' },
  { key: 'act_data_expirare', grup: 'Date personale & Acte', label: 'Act — data expirării', get: ({ emp }) => profilOf(emp)?.act_data_expirare || '—', sort: ({ emp }) => profilOf(emp)?.act_data_expirare || '' },
  { key: 'medicina_muncii', grup: 'Date personale & Acte', label: 'Medicina muncii', get: ({ emp }) => profilOf(emp)?.medicina_muncii_data || '—', sort: ({ emp }) => profilOf(emp)?.medicina_muncii_data || '' },
  { key: 'evaluare', grup: 'Date personale & Acte', label: 'Evaluare', get: ({ emp }) => profilOf(emp)?.evaluare_data || '—', sort: ({ emp }) => profilOf(emp)?.evaluare_data || '' },
  { key: 'observatii', grup: 'Date personale & Acte', label: 'Observații', get: ({ emp }) => profilOf(emp)?.observatii || '—', sort: ({ emp }) => profilOf(emp)?.observatii || '' },
]

const DEFAULT_COLOANE = ['nume', 'departament', 'functie', 'vechime', 'gradatie', 'sold_total']

function inFereastra(dataStr, days = 30) {
  if (!dataStr) return false
  const azi0 = new Date(AZI)
  const limita = new Date(azi0)
  limita.setDate(limita.getDate() + days)
  const d = new Date(dataStr)
  return d >= azi0 && d <= limita
}

function urmatoareaAniversare(dataStr) {
  if (!dataStr) return null
  const d = new Date(dataStr)
  const azi0 = new Date(AZI)
  let candidate = new Date(azi0.getFullYear(), d.getMonth(), d.getDate())
  if (candidate < azi0) candidate = new Date(azi0.getFullYear() + 1, d.getMonth(), d.getDate())
  return candidate.toISOString().slice(0, 10)
}

const REMINDER_ICON = {
  aniversare: TrendingUp,
  nastere: Cake,
  gradatie: TrendingUp,
  buletin: IdCard,
  contract: FileWarning,
}

function calculeazaRemindere(rows) {
  const remindere = []

  for (const { emp, vechime, faraPlata } of rows) {
    const profil = profilOf(emp)

    if (profil?.data_inceput_contract) {
      const data = urmatoareaAniversare(profil.data_inceput_contract)
      if (inFereastra(data)) {
        const ani = new Date(data).getFullYear() - new Date(profil.data_inceput_contract).getFullYear()
        remindere.push({ tip: 'aniversare', angajat: emp.nume_complet, data, detaliu: `${ani} ani la Madrigal` })
      }
    }

    const nastere = parseCnpBirthDate(profil?.cnp)
    if (nastere) {
      const data = urmatoareaAniversare(nastere)
      if (inFereastra(data)) {
        remindere.push({ tip: 'nastere', angajat: emp.nume_complet, data, detaliu: 'Zi de naștere' })
      }
    }

    const urmatoareaGradatie = dataUrmatoareiGradatii(emp, faraPlata)
    if (urmatoareaGradatie && inFereastra(urmatoareaGradatie.data)) {
      remindere.push({
        tip: 'gradatie',
        angajat: emp.nume_complet,
        data: urmatoareaGradatie.data,
        detaliu: `Trece la Gradația ${urmatoareaGradatie.gradatieNoua}`,
      })
    }

    if (inFereastra(profil?.act_data_expirare)) {
      remindere.push({ tip: 'buletin', angajat: emp.nume_complet, data: profil.act_data_expirare, detaliu: 'Actul de identitate expiră' })
    }

    if (profil?.tip_contract === 'determinat' && inFereastra(profil?.data_final_contract)) {
      remindere.push({ tip: 'contract', angajat: emp.nume_complet, data: profil.data_final_contract, detaliu: 'Contractul expiră' })
    }
  }

  return remindere.sort((a, b) => a.data.localeCompare(b.data))
}

export default function OverviewTab() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [coloaneVizibile, setColoaneVizibile] = useState(DEFAULT_COLOANE)
  const [showColumnPicker, setShowColumnPicker] = useState(false)
  const [sortare, setSortare] = useState({ key: 'nume', dir: 'asc' })
  const [vederi, setVederi] = useState([])
  const [numeVedereNoua, setNumeVedereNoua] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [{ data: employees }, { data: requests }, { data: recoveries }, { data: vederiSalvate }] = await Promise.all([
      supabase
        .from('angajati')
        .select('*, department:departments(name), position:positions(name), hr_profil_angajat(*, attribution:attributions(name)), hr_vechime_anterioara(*)')
        .eq('activ', true)
        .order('nume_complet'),
      supabase.from('leave_requests').select('*').eq('status', 'approved'),
      supabase.from('overtime_recoveries').select('*'),
      supabase.from('hr_overview_views').select('*').order('created_at'),
    ])

    const computed = (employees || []).map((emp) => {
      const empRequests = (requests || []).filter((r) => r.angajat_id === emp.id)
      const empRecoveries = (recoveries || []).filter((r) => r.angajat_id === emp.id)
      const balance = calculateBalance(emp, empRequests, empRecoveries)
      const faraPlata = empRequests.filter((r) => r.leave_type === 'Fără Plată')
      const vechime = calculateVechime(emp, faraPlata)
      return { emp, balance, vechime, faraPlata }
    })
    setRows(computed)
    setVederi(vederiSalvate || [])
    setLoading(false)
  }

  const remindere = useMemo(() => calculeazaRemindere(rows), [rows])

  const rowsSortate = useMemo(() => {
    const col = COLOANE.find((c) => c.key === sortare.key)
    if (!col) return rows
    const copy = [...rows]
    copy.sort((a, b) => {
      const va = col.sort(a)
      const vb = col.sort(b)
      if (va < vb) return sortare.dir === 'asc' ? -1 : 1
      if (va > vb) return sortare.dir === 'asc' ? 1 : -1
      return 0
    })
    return copy
  }, [rows, sortare])

  function toggleSort(key) {
    setSortare((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
  }

  function toggleColoana(key) {
    setColoaneVizibile((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  function aplicaVedere(v) {
    setColoaneVizibile(v.coloane)
    setShowColumnPicker(false)
  }

  async function salveazaVedere() {
    if (!numeVedereNoua.trim()) return
    const { data, error } = await supabase
      .from('hr_overview_views')
      .insert({ nume: numeVedereNoua.trim(), coloane: coloaneVizibile })
      .select()
      .single()
    if (!error && data) {
      setVederi((v) => [...v, data])
      setNumeVedereNoua('')
    }
  }

  async function stergeVedere(id) {
    await supabase.from('hr_overview_views').delete().eq('id', id)
    setVederi((v) => v.filter((x) => x.id !== id))
  }

  function exportCsv() {
    const coloane = COLOANE.filter((c) => coloaneVizibile.includes(c.key))
    const header = coloane.map((c) => c.label).join(',')
    const linii = rowsSortate.map((row) => coloane.map((c) => `"${String(c.get(row)).replace(/"/g, '""')}"`).join(','))
    const csv = [header, ...linii].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `privire-generala-${AZI}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const coloaneAfisate = COLOANE.filter((c) => coloaneVizibile.includes(c.key))
  const grupuri = [...new Set(COLOANE.map((c) => c.grup))]

  if (loading) return <p className="text-sm text-slate-500">Se încarcă…</p>

  return (
    <div>
      <style>{`@media print { .site-header, .site-footer, aside, .no-print { display: none !important; } }`}</style>

      <div className="no-print mb-6 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-center gap-2">
          <Bell size={16} className="text-brand-600" />
          <p className="font-display text-sm font-semibold text-ink">Remindere — următoarele 30 de zile</p>
        </div>
        {remindere.length === 0 ? (
          <p className="text-xs text-slate-400">Niciun eveniment în următoarele 30 de zile.</p>
        ) : (
          <div className="space-y-1.5">
            {remindere.map((r, i) => {
              const Icon = REMINDER_ICON[r.tip] || Bell
              return (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                  <Icon size={13} className="shrink-0 text-slate-400" />
                  <span className="text-slate-400">{r.data}</span>
                  <span className="font-medium text-slate-700">{r.angajat}</span>
                  <span className="text-slate-500">— {r.detaliu}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="no-print mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setShowColumnPicker((s) => !s)}
          className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
        >
          <Columns3 size={13} /> Coloane afișate
        </button>
        {vederi.map((v) => (
          <button
            key={v.id}
            onClick={() => aplicaVedere(v)}
            className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            {v.nume}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <button onClick={exportCsv} className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200">
            <Download size={13} /> Export CSV
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200">
            <Printer size={13} /> Printează
          </button>
        </div>
      </div>

      {showColumnPicker && (
        <div className="no-print mb-4 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">Alege coloanele</p>
            <button onClick={() => setShowColumnPicker(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
              <XIcon size={15} />
            </button>
          </div>

          {grupuri.map((grup) => (
            <div key={grup} className="mb-3">
              <p className="mb-1 text-xs font-semibold text-slate-500">{grup}</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3">
                {COLOANE.filter((c) => c.grup === grup).map((c) => (
                  <label key={c.key} className="flex items-center gap-1.5 text-xs text-slate-700">
                    <input type="checkbox" checked={coloaneVizibile.includes(c.key)} onChange={() => toggleColoana(c.key)} />
                    {c.label}
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
            <input
              value={numeVedereNoua}
              onChange={(e) => setNumeVedereNoua(e.target.value)}
              placeholder="Nume vedere (ex: Vedere Contracte)"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus-ring"
            />
            <button onClick={salveazaVedere} className="flex items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">
              <Save size={12} /> Salvează vederea
            </button>
          </div>
          {vederi.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {vederi.map((v) => (
                <span key={v.id} className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600">
                  {v.nume}
                  <button onClick={() => stergeVedere(v.id)} className="text-slate-400 hover:text-rose-600">
                    <XIcon size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto overflow-y-auto rounded-2xl border border-slate-200 bg-white max-h-[700px]">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              {coloaneAfisate.map((c) => (
                <th key={c.key} className="cursor-pointer select-none px-4 py-3 hover:text-slate-700" onClick={() => toggleSort(c.key)}>
                  {c.label} {sortare.key === c.key && (sortare.dir === 'asc' ? '↑' : '↓')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowsSortate.map((row) => (
              <tr key={row.emp.id} className="border-b border-slate-100 last:border-0">
                {coloaneAfisate.map((c) => (
                  <td key={c.key} className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {c.get(row)}
                  </td>
                ))}
              </tr>
            ))}
            {rowsSortate.length === 0 && (
              <tr>
                <td colSpan={coloaneAfisate.length} className="px-4 py-6 text-center text-sm text-slate-400">
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
