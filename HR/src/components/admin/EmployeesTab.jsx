import { useEffect, useState } from 'react'
import { Pencil, Save, X as XIcon, Plus, Trash2, ArrowRight } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { getHrProfil } from '../../lib/leaveCalculations'
import { calculateVechime } from '../../lib/vechimeCalculations'

const CURRENT_YEAR = new Date().getFullYear()

const emptyVechime = { angajator: '', data_inceput: '', data_sfarsit: '', durata_luni: '' }

// Câmpurile pe care adminul le poate selecta la un "Act adițional" — practic
// toată fișa HR editabilă, exact cum a fost cerut ("din fișa completă").
const CAMPURI_MODIFICABILE = [
  { key: 'tip_contract', label: 'Tip contract', type: 'select', options: [
    { value: 'determinat', label: 'Determinat' },
    { value: 'nedeterminat', label: 'Nedeterminat' },
  ] },
  { key: 'data_final_contract', label: 'Data final contract', type: 'date' },
  { key: 'grad', label: 'Grad', type: 'text' },
  { key: 'atributie_id', label: 'Atribuție', type: 'attributie' },
  { key: 'norma_ore', label: 'Normă de lucru', type: 'select', options: [2, 4, 6, 8].map((v) => ({ value: String(v), label: `${v}h` })) },
  { key: 'interval_ora_inceput', label: 'Ora început', type: 'time' },
  { key: 'interval_ora_sfarsit', label: 'Ora sfârșit', type: 'time' },
  { key: 'are_fisa_postului', label: 'Fișa postului', type: 'boolean' },
  { key: 'functie_de_baza', label: 'Funcția de bază', type: 'boolean' },
  { key: 'adresa', label: 'Adresă', type: 'text' },
  { key: 'telefon', label: 'Telefon', type: 'text' },
  { key: 'cnp', label: 'CNP', type: 'text' },
  { key: 'iban', label: 'IBAN', type: 'text' },
  { key: 'act_serie', label: 'Act identitate — Serie', type: 'text' },
  { key: 'act_numar', label: 'Act identitate — Număr', type: 'text' },
  { key: 'act_eliberat_de', label: 'Act identitate — Eliberat de', type: 'text' },
  { key: 'act_data_eliberare', label: 'Act identitate — Data eliberării', type: 'date' },
  { key: 'act_data_expirare', label: 'Act identitate — Data expirării', type: 'date' },
  { key: 'medicina_muncii_data', label: 'Medicina muncii — dată', type: 'date' },
  { key: 'evaluare_data', label: 'Evaluare — dată', type: 'date' },
  { key: 'observatii', label: 'Observații', type: 'text' },
]

function labelPentruCamp(key) {
  return CAMPURI_MODIFICABILE.find((c) => c.key === key)?.label || key
}

function formatValoare(key, value, attributions) {
  if (value === null || value === undefined || value === '') return '—'
  const camp = CAMPURI_MODIFICABILE.find((c) => c.key === key)
  if (camp?.type === 'boolean') return value === true || value === 'da' ? 'Da' : 'Nu'
  if (camp?.type === 'select') return camp.options.find((o) => o.value === String(value))?.label || value
  if (camp?.type === 'attributie') return attributions?.find((a) => a.id === value)?.name || value
  return String(value)
}

export default function EmployeesTab() {
  const [angajati, setAngajati] = useState([])
  const [attributions, setAttributions] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [rollingOver, setRollingOver] = useState(false)
  const [rolloverError, setRolloverError] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [{ data }, { data: attrData }] = await Promise.all([
      supabase
        .from('angajati')
        .select(
          '*, department:departments(name), position:positions(name), hr_profil_angajat(*, attribution:attributions(name)), hr_vechime_anterioara(*)'
        )
        .eq('activ', true)
        .order('nume_complet'),
      supabase.from('attributions').select('*').order('name'),
    ])
    setAngajati(data || [])
    setAttributions(attrData || [])
    setLoading(false)
  }

  async function handleRollover() {
    if (
      !confirm(
        `Avansezi soldurile TUTUROR angajaților la anul ${CURRENT_YEAR}? Recuperările nu sunt afectate — doar cele 3 categorii de solduri pe ani.`
      )
    )
      return
    setRollingOver(true)
    setRolloverError('')
    const { error } = await supabase.rpc('rollover_hr_profil_angajat')
    setRollingOver(false)
    if (error) {
      setRolloverError('Nu am putut avansa anul. Încearcă din nou.')
      return
    }
    load()
  }

  const employeesNeedingRollover = angajati.filter((a) => {
    const profil = getHrProfil(a)
    return profil.an_referinta != null && profil.an_referinta < CURRENT_YEAR
  })

  const editingAngajat = angajati.find((a) => a.id === editingId) || null

  return (
    <div>
      <p className="mb-4 text-sm text-slate-500">
        Lista angajaților activi vine din Hub — adăugarea, editarea sau ștergerea unui angajat se
        face acolo. Aici poți doar introduce datele specifice de HR pentru fiecare.
      </p>

      {employeesNeedingRollover.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            Soldurile pe ani ale {employeesNeedingRollover.length}{' '}
            {employeesNeedingRollover.length === 1 ? 'angajat' : 'angajați'} sunt din anul trecut.
          </p>
          <button
            onClick={handleRollover}
            disabled={rollingOver}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50 focus-ring"
          >
            <ArrowRight size={14} /> {rollingOver ? 'Se avansează…' : `Trece la anul ${CURRENT_YEAR}`}
          </button>
          {rolloverError && <p className="w-full text-xs text-rose-600">{rolloverError}</p>}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Se încarcă…</p>
      ) : (
        <div className="max-h-[520px] space-y-2 overflow-y-auto">
          {angajati.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3"
            >
              <div>
                <p className="text-sm font-medium text-ink">{a.nume_complet}</p>
                <p className="text-xs text-slate-500">
                  {a.department?.name || '—'} {a.position?.name ? `· ${a.position.name}` : ''}
                  {a.email ? ` · ${a.email}` : ''}
                </p>
              </div>
              <button
                onClick={() => setEditingId(a.id)}
                className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 focus-ring"
              >
                <Pencil size={13} /> Editează / Introdu date HR
              </button>
            </div>
          ))}
          {angajati.length === 0 && <p className="text-sm text-slate-400">Niciun angajat activ găsit.</p>}
        </div>
      )}

      {editingAngajat && (
        <HrProfileEditor
          angajat={editingAngajat}
          attributions={attributions}
          onClose={() => setEditingId(null)}
          onSaved={() => {
            setEditingId(null)
            load()
          }}
        />
      )}
    </div>
  )
}

const EMPTY_PROFIL = {
  numar_contract: '',
  data_inceput_contract: '',
  zile_concediu_baza_an: 21,
  sold_recuperari: 0,
  sold_an_minus_2: 0,
  sold_an_minus_1: 0,
  sold_an_curent: 0,
  tip_contract: '',
  data_final_contract: '',
  grad: '',
  atributie_id: '',
  norma_ore: '',
  interval_ora_inceput: '',
  interval_ora_sfarsit: '',
  adresa: '',
  cnp: '',
  act_serie: '',
  act_numar: '',
  act_eliberat_de: '',
  act_data_eliberare: '',
  act_data_expirare: '',
  telefon: '',
  are_fisa_postului: '',
  functie_de_baza: '',
  iban: '',
  observatii: '',
  medicina_muncii_data: '',
  evaluare_data: '',
}

const TABS = [
  { key: 'contract', label: 'Contract & Program' },
  { key: 'personal', label: 'Date personale & Acte' },
  { key: 'solduri', label: 'Solduri & Vechime' },
  { key: 'istoric', label: 'Acte adiționale' },
]

function boolToForm(v) {
  if (v === true) return 'da'
  if (v === false) return 'nu'
  return ''
}
function formToBool(v) {
  if (v === 'da') return true
  if (v === 'nu') return false
  return null
}

function HrProfileEditor({ angajat, attributions, onClose, onSaved }) {
  const existingProfil = Array.isArray(angajat.hr_profil_angajat)
    ? angajat.hr_profil_angajat[0]
    : angajat.hr_profil_angajat

  const [tab, setTab] = useState('contract')

  const [form, setForm] = useState({
    ...EMPTY_PROFIL,
    ...Object.fromEntries(
      Object.entries(existingProfil || {}).map(([k, v]) => [
        k,
        ['are_fisa_postului', 'functie_de_baza'].includes(k) ? boolToForm(v) : v ?? '',
      ])
    ),
  })
  const [vechime, setVechime] = useState(angajat.hr_vechime_anterioara || [])
  const [newVechime, setNewVechime] = useState(emptyVechime)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const vechimeCalc = calculateVechime(angajat, [])

  function upd(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')

    if (form.tip_contract === 'determinat' && !form.data_final_contract) {
      setError('Contractul determinat are nevoie de o dată de final.')
      setTab('contract')
      return
    }
    if (form.observatii && form.observatii.length > 200) {
      setError('Observațiile pot avea maximum 200 de caractere.')
      setTab('personal')
      return
    }

    setSaving(true)

    const { error: profilError } = await supabase.from('hr_profil_angajat').upsert({
      angajat_id: angajat.id,
      numar_contract: form.numar_contract.trim() || null,
      data_inceput_contract: form.data_inceput_contract || null,
      zile_concediu_baza_an: Number(form.zile_concediu_baza_an) || 0,
      sold_recuperari: Number(form.sold_recuperari) || 0,
      sold_an_minus_2: Number(form.sold_an_minus_2) || 0,
      sold_an_minus_1: Number(form.sold_an_minus_1) || 0,
      sold_an_curent: Number(form.sold_an_curent) || 0,
      an_referinta: CURRENT_YEAR,
      tip_contract: form.tip_contract || null,
      data_final_contract: form.tip_contract === 'determinat' ? form.data_final_contract || null : null,
      grad: form.grad.trim() || null,
      atributie_id: form.atributie_id || null,
      norma_ore: form.norma_ore ? Number(form.norma_ore) : null,
      interval_ora_inceput: form.interval_ora_inceput || null,
      interval_ora_sfarsit: form.interval_ora_sfarsit || null,
      adresa: form.adresa.trim() || null,
      cnp: form.cnp.trim() || null,
      act_serie: form.act_serie.trim() || null,
      act_numar: form.act_numar.trim() || null,
      act_eliberat_de: form.act_eliberat_de.trim() || null,
      act_data_eliberare: form.act_data_eliberare || null,
      act_data_expirare: form.act_data_expirare || null,
      telefon: form.telefon.trim() || null,
      are_fisa_postului: formToBool(form.are_fisa_postului),
      functie_de_baza: formToBool(form.functie_de_baza),
      iban: form.iban.trim() || null,
      observatii: form.observatii.trim() || null,
      medicina_muncii_data: form.medicina_muncii_data || null,
      evaluare_data: form.evaluare_data || null,
    })

    setSaving(false)
    if (profilError) {
      setError('Nu am putut salva profilul HR.')
      return
    }
    onSaved()
  }

  async function addVechime(e) {
    e.preventDefault()
    if (!newVechime.angajator.trim()) return
    const { data, error } = await supabase
      .from('hr_vechime_anterioara')
      .insert({
        angajat_id: angajat.id,
        angajator: newVechime.angajator.trim(),
        data_inceput: newVechime.data_inceput || null,
        data_sfarsit: newVechime.data_sfarsit || null,
        durata_luni: newVechime.durata_luni ? Number(newVechime.durata_luni) : null,
      })
      .select()
      .single()
    if (!error && data) {
      setVechime((v) => [...v, data])
      setNewVechime(emptyVechime)
    }
  }

  async function removeVechime(id) {
    await supabase.from('hr_vechime_anterioara').delete().eq('id', id)
    setVechime((v) => v.filter((row) => row.id !== id))
  }

  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-6 pb-4">
          <h3 className="font-display text-lg font-semibold text-ink">Date HR — {angajat.nume_complet}</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 focus-ring">
            <XIcon size={16} />
          </button>
        </div>

        <div className="flex flex-wrap gap-1 border-b border-slate-100 px-6">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-3 py-3 text-sm font-medium border-b-2 -mb-px transition ${
                tab === t.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-6">
          <form onSubmit={handleSave} className="space-y-4">
            {tab === 'contract' && (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Tip contract</label>
                    <select
                      value={form.tip_contract}
                      onChange={(e) => upd('tip_contract', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-ring"
                    >
                      <option value="">— Alege —</option>
                      <option value="determinat">Determinat</option>
                      <option value="nedeterminat">Nedeterminat</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Data început contract</label>
                    <input
                      type="date"
                      value={form.data_inceput_contract || ''}
                      onChange={(e) => upd('data_inceput_contract', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
                    />
                  </div>
                  {form.tip_contract === 'determinat' && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        Data final contract <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={form.data_final_contract || ''}
                        onChange={(e) => upd('data_final_contract', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
                      />
                    </div>
                  )}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Numărul contractului</label>
                    <input
                      value={form.numar_contract}
                      onChange={(e) => upd('numar_contract', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  Vechime calculată curent: <strong>{vechimeCalc.total.years} ani, {vechimeCalc.total.months} luni</strong>
                  {' · '}Gradație: <strong>Gradația {vechimeCalc.gradatie}</strong>{' '}
                  <span className="text-slate-400">(calculată automat, vezi Centralizator Vechime pentru detalii)</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Grad</label>
                    <input
                      value={form.grad}
                      onChange={(e) => upd('grad', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Atribuție</label>
                    <select
                      value={form.atributie_id}
                      onChange={(e) => upd('atributie_id', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-ring"
                    >
                      <option value="">— Alege —</option>
                      {attributions.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Normă de lucru</label>
                    <select
                      value={form.norma_ore}
                      onChange={(e) => upd('norma_ore', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-ring"
                    >
                      <option value="">— Alege —</option>
                      {[2, 4, 6, 8].map((h) => (
                        <option key={h} value={h}>{h}h</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Ora început</label>
                      <input
                        type="time"
                        value={form.interval_ora_inceput}
                        onChange={(e) => upd('interval_ora_inceput', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Ora sfârșit</label>
                      <input
                        type="time"
                        value={form.interval_ora_sfarsit}
                        onChange={(e) => upd('interval_ora_sfarsit', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Fișa postului</label>
                    <select
                      value={form.are_fisa_postului}
                      onChange={(e) => upd('are_fisa_postului', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-ring"
                    >
                      <option value="">— Alege —</option>
                      <option value="da">Da</option>
                      <option value="nu">Nu</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Funcția de bază</label>
                    <select
                      value={form.functie_de_baza}
                      onChange={(e) => upd('functie_de_baza', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-ring"
                    >
                      <option value="">— Alege —</option>
                      <option value="da">Da</option>
                      <option value="nu">Nu</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {tab === 'personal' && (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-600">Adresă</label>
                    <input
                      value={form.adresa}
                      onChange={(e) => upd('adresa', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Telefon</label>
                    <input
                      value={form.telefon}
                      onChange={(e) => upd('telefon', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">CNP</label>
                    <input
                      value={form.cnp}
                      onChange={(e) => upd('cnp', e.target.value)}
                      maxLength={13}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-600">IBAN</label>
                    <input
                      value={form.iban}
                      onChange={(e) => upd('iban', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="mb-2 text-xs font-semibold text-slate-600">Act de identitate</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <input
                      placeholder="Serie"
                      value={form.act_serie}
                      onChange={(e) => upd('act_serie', e.target.value)}
                      className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus-ring"
                    />
                    <input
                      placeholder="Număr"
                      value={form.act_numar}
                      onChange={(e) => upd('act_numar', e.target.value)}
                      className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus-ring"
                    />
                    <input
                      placeholder="Eliberat de"
                      value={form.act_eliberat_de}
                      onChange={(e) => upd('act_eliberat_de', e.target.value)}
                      className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus-ring"
                    />
                    <div>
                      <label className="mb-1 block text-[11px] text-slate-500">La data de</label>
                      <input
                        type="date"
                        value={form.act_data_eliberare}
                        onChange={(e) => upd('act_data_eliberare', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus-ring"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-slate-500">Data expirării</label>
                      <input
                        type="date"
                        value={form.act_data_expirare}
                        onChange={(e) => upd('act_data_expirare', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus-ring"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Medicina muncii — ultima dată</label>
                    <input
                      type="date"
                      value={form.medicina_muncii_data}
                      onChange={(e) => upd('medicina_muncii_data', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Evaluare — ultima dată</label>
                    <input
                      type="date"
                      value={form.evaluare_data}
                      onChange={(e) => upd('evaluare_data', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Observații <span className="text-slate-400">({form.observatii.length}/200)</span>
                  </label>
                  <textarea
                    value={form.observatii}
                    onChange={(e) => upd('observatii', e.target.value.slice(0, 200))}
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
                  />
                </div>
              </div>
            )}

            {tab === 'solduri' && (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Zile de bază / an</label>
                  <input
                    type="number"
                    step="0.5"
                    value={form.zile_concediu_baza_an}
                    onChange={(e) => upd('zile_concediu_baza_an', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
                  />
                </div>

                <div className="rounded-xl border border-brand-200 bg-brand-50 p-3">
                  <p className="text-xs font-semibold text-brand-800">Solduri (situația actuală)</p>
                  <p className="mt-0.5 text-xs text-brand-700">
                    Aceste solduri avansează automat la anul nou (verificat zilnic, în fundal).
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Recuperări</label>
                      <input
                        type="number"
                        step="0.5"
                        value={form.sold_recuperari}
                        onChange={(e) => upd('sold_recuperari', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        Anul {CURRENT_YEAR - 2} <span className="text-slate-400">(expiră 30 iun. {CURRENT_YEAR})</span>
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={form.sold_an_minus_2}
                        onChange={(e) => upd('sold_an_minus_2', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Anul {CURRENT_YEAR - 1}</label>
                      <input
                        type="number"
                        step="0.5"
                        value={form.sold_an_minus_1}
                        onChange={(e) => upd('sold_an_minus_1', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        Anul {CURRENT_YEAR} <span className="text-slate-400">(curent)</span>
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={form.sold_an_curent}
                        onChange={(e) => upd('sold_an_curent', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold text-slate-600">Vechime anterioară</p>
                  <div className="space-y-1.5">
                    {vechime.map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5 text-xs"
                      >
                        <span>
                          {v.angajator}
                          {v.data_inceput ? ` · ${v.data_inceput}` : ''}
                          {v.data_sfarsit ? ` → ${v.data_sfarsit}` : ''}
                          {v.durata_luni ? ` · ${v.durata_luni} luni` : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeVechime(v.id)}
                          className="rounded-full p-1 text-rose-500 hover:bg-rose-50 focus-ring"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    {vechime.length === 0 && (
                      <p className="text-xs text-slate-400">Nicio vechime anterioară adăugată.</p>
                    )}
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    <input
                      placeholder="Angajator"
                      value={newVechime.angajator}
                      onChange={(e) => setNewVechime({ ...newVechime, angajator: e.target.value })}
                      className="col-span-2 rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus-ring sm:col-span-1"
                    />
                    <input
                      type="date"
                      value={newVechime.data_inceput}
                      onChange={(e) => setNewVechime({ ...newVechime, data_inceput: e.target.value })}
                      className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus-ring"
                    />
                    <input
                      type="date"
                      value={newVechime.data_sfarsit}
                      onChange={(e) => setNewVechime({ ...newVechime, data_sfarsit: e.target.value })}
                      className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus-ring"
                    />
                    <input
                      type="number"
                      placeholder="Luni"
                      value={newVechime.durata_luni}
                      onChange={(e) => setNewVechime({ ...newVechime, durata_luni: e.target.value })}
                      className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus-ring"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addVechime}
                    className="mt-2 flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 focus-ring"
                  >
                    <Plus size={13} /> Adaugă vechime
                  </button>
                </div>
              </div>
            )}

            {error && <p className="text-xs text-rose-600">{error}</p>}

            {tab !== 'istoric' && (
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 focus-ring"
                >
                  <Save size={14} /> {saving ? 'Se salvează…' : 'Salvează'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex items-center gap-1.5 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 focus-ring"
                >
                  <XIcon size={14} /> Închide
                </button>
              </div>
            )}
          </form>

          {tab === 'istoric' && (
            <ActeAditionale
              angajat={angajat}
              profil={form}
              attributions={attributions}
              onApplied={(updates) => {
                setForm((f) => ({ ...f, ...updates }))
                onSaved()
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function ActeAditionale({ angajat, profil, attributions, onApplied }) {
  const [istoric, setIstoric] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [data, setData] = useState(new Date().toISOString().slice(0, 10))
  const [selectate, setSelectate] = useState({})
  const [valoriNoi, setValoriNoi] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('hr_acte_aditionale')
      .select('*')
      .eq('angajat_id', angajat.id)
      .order('data', { ascending: false })
    setIstoric(data || [])
    setLoading(false)
  }

  function toggleCamp(key) {
    setSelectate((s) => ({ ...s, [key]: !s[key] }))
    if (!valoriNoi[key]) {
      setValoriNoi((v) => ({ ...v, [key]: profil[key] ?? '' }))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const campuriAlese = Object.keys(selectate).filter((k) => selectate[k])
    if (campuriAlese.length === 0) {
      setError('Bifează cel puțin un câmp de modificat.')
      return
    }

    setSaving(true)

    const modificari = {}
    const updatePayload = { angajat_id: angajat.id }
    for (const key of campuriAlese) {
      const camp = CAMPURI_MODIFICABILE.find((c) => c.key === key)
      let valoareNoua = valoriNoi[key]
      if (camp.type === 'boolean') valoareNoua = valoareNoua === 'da'
      if (camp.type === 'select' && ['norma_ore'].includes(key)) valoareNoua = Number(valoareNoua)

      modificari[key] = { de_la: profil[key] ?? null, la: valoareNoua }
      updatePayload[key] = valoareNoua === '' ? null : valoareNoua
    }

    const { error: err1 } = await supabase.from('hr_acte_aditionale').insert({
      angajat_id: angajat.id,
      data,
      modificari,
    })
    const { error: err2 } = await supabase.from('hr_profil_angajat').update(updatePayload).eq('angajat_id', angajat.id)

    setSaving(false)
    if (err1 || err2) {
      setError('Nu am putut salva actul adițional.')
      return
    }

    // reflectăm imediat noile valori în formularul principal
    const formUpdates = {}
    for (const key of campuriAlese) {
      const camp = CAMPURI_MODIFICABILE.find((c) => c.key === key)
      formUpdates[key] = camp.type === 'boolean' ? (valoriNoi[key] === 'da' ? 'da' : 'nu') : valoriNoi[key]
    }

    setSelectate({})
    setValoriNoi({})
    setShowForm(false)
    onApplied(formUpdates)
    load()
  }

  return (
    <div className="mt-2">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-600">Istoric acte adiționale</p>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 focus-ring"
        >
          <Plus size={13} /> {showForm ? 'Anulează' : 'Act adițional nou'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 space-y-3 rounded-xl border border-slate-200 p-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Data actului</label>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
            />
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-slate-600">Ce se modifică?</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              {CAMPURI_MODIFICABILE.map((c) => (
                <label key={c.key} className="flex items-center gap-1.5 text-xs text-slate-700">
                  <input type="checkbox" checked={!!selectate[c.key]} onChange={() => toggleCamp(c.key)} />
                  {c.label}
                </label>
              ))}
            </div>
          </div>

          {Object.keys(selectate).some((k) => selectate[k]) && (
            <div className="space-y-2 rounded-lg bg-slate-50 p-2.5">
              {CAMPURI_MODIFICABILE.filter((c) => selectate[c.key]).map((c) => (
                <div key={c.key}>
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">
                    {c.label} <span className="text-slate-400">(actual: {formatValoare(c.key, profil[c.key], attributions)})</span>
                  </label>
                  {c.type === 'select' && (
                    <select
                      value={valoriNoi[c.key] ?? ''}
                      onChange={(e) => setValoriNoi((v) => ({ ...v, [c.key]: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs focus-ring"
                    >
                      <option value="">— Alege —</option>
                      {c.options.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  )}
                  {c.type === 'attributie' && (
                    <select
                      value={valoriNoi[c.key] ?? ''}
                      onChange={(e) => setValoriNoi((v) => ({ ...v, [c.key]: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs focus-ring"
                    >
                      <option value="">— Alege —</option>
                      {attributions.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  )}
                  {c.type === 'boolean' && (
                    <select
                      value={valoriNoi[c.key] === true || valoriNoi[c.key] === 'da' ? 'da' : valoriNoi[c.key] === false || valoriNoi[c.key] === 'nu' ? 'nu' : ''}
                      onChange={(e) => setValoriNoi((v) => ({ ...v, [c.key]: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs focus-ring"
                    >
                      <option value="">— Alege —</option>
                      <option value="da">Da</option>
                      <option value="nu">Nu</option>
                    </select>
                  )}
                  {(c.type === 'date' || c.type === 'time') && (
                    <input
                      type={c.type}
                      value={valoriNoi[c.key] ?? ''}
                      onChange={(e) => setValoriNoi((v) => ({ ...v, [c.key]: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus-ring"
                    />
                  )}
                  {c.type === 'text' && (
                    <input
                      value={valoriNoi[c.key] ?? ''}
                      onChange={(e) => setValoriNoi((v) => ({ ...v, [c.key]: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus-ring"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {error && <p className="text-xs text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50 focus-ring"
          >
            <Save size={13} /> {saving ? 'Se salvează…' : 'Salvează actul adițional'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-xs text-slate-400">Se încarcă…</p>
      ) : istoric.length === 0 ? (
        <p className="text-xs text-slate-400">Niciun act adițional înregistrat încă.</p>
      ) : (
        <div className="space-y-2">
          {istoric.map((act) => (
            <div key={act.id} className="rounded-lg border border-slate-100 p-2.5 text-xs">
              <p className="mb-1 font-medium text-slate-700">{act.data}</p>
              {Object.entries(act.modificari).map(([key, { de_la, la }]) => (
                <p key={key} className="text-slate-500">
                  {labelPentruCamp(key)}: {formatValoare(key, de_la, attributions)} → <strong className="text-slate-700">{formatValoare(key, la, attributions)}</strong>
                </p>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
