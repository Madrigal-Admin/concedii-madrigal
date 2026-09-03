import { useEffect, useState } from 'react'
import { Pencil, Save, X as XIcon, Plus, Trash2, ArrowRight } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { getHrProfil } from '../../lib/leaveCalculations'

const CURRENT_YEAR = new Date().getFullYear()

const emptyVechime = { angajator: '', data_inceput: '', data_sfarsit: '', durata_luni: '' }

export default function EmployeesTab() {
  const [angajati, setAngajati] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [rollingOver, setRollingOver] = useState(false)
  const [rolloverError, setRolloverError] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('angajati')
      .select(
        '*, department:departments(name), position:positions(name), hr_profil_angajat(*), hr_vechime_anterioara(*)'
      )
      .eq('activ', true)
      .order('nume_complet')
    setAngajati(data || [])
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
        face acolo. Aici poți doar introduce datele specifice de HR (contract, solduri, vechime
        anterioară) pentru fiecare.
      </p>

      {employeesNeedingRollover.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            Soldurile pe ani ale {employeesNeedingRollover.length}{' '}
            {employeesNeedingRollover.length === 1 ? 'angajat' : 'angajați'} sunt din anul trecut.
            Avansează-le la {CURRENT_YEAR}: fiecare pierde soldul cel mai vechi (deja expirat),
            reportează restul cu un an, iar anul curent pornește de la zilele de bază.
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

function HrProfileEditor({ angajat, onClose, onSaved }) {
  const existingProfil = Array.isArray(angajat.hr_profil_angajat)
    ? angajat.hr_profil_angajat[0]
    : angajat.hr_profil_angajat

  const [form, setForm] = useState({
    numar_contract: existingProfil?.numar_contract || '',
    data_inceput_contract: existingProfil?.data_inceput_contract || '',
    zile_concediu_baza_an: existingProfil?.zile_concediu_baza_an ?? 21,
    sold_recuperari: existingProfil?.sold_recuperari ?? 0,
    sold_an_minus_2: existingProfil?.sold_an_minus_2 ?? 0,
    sold_an_minus_1: existingProfil?.sold_an_minus_1 ?? 0,
    sold_an_curent: existingProfil?.sold_an_curent ?? 0,
  })
  const [vechime, setVechime] = useState(angajat.hr_vechime_anterioara || [])
  const [newVechime, setNewVechime] = useState(emptyVechime)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave(e) {
    e.preventDefault()
    setError('')
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
      // Editare manuală = soldurile sunt "la zi" pentru anul curent, ca să
      // nu fie suprascrise de avansarea automată la anul nou.
      an_referinta: CURRENT_YEAR,
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
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-ink">Date HR — {angajat.nume_complet}</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 focus-ring">
            <XIcon size={16} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Număr contract</label>
              <input
                value={form.numar_contract}
                onChange={(e) => setForm({ ...form, numar_contract: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Data început contract</label>
              <input
                type="date"
                value={form.data_inceput_contract || ''}
                onChange={(e) => setForm({ ...form, data_inceput_contract: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Zile de bază / an</label>
            <input
              type="number"
              step="0.5"
              value={form.zile_concediu_baza_an}
              onChange={(e) => setForm({ ...form, zile_concediu_baza_an: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
            />
          </div>

          <div className="rounded-xl border border-brand-200 bg-brand-50 p-3">
            <p className="text-xs font-semibold text-brand-800">Solduri (situația actuală)</p>
            <p className="mt-0.5 text-xs text-brand-700">
              Aceste solduri NU avansează automat la 1 ianuarie și NU expiră automat la 30 iunie —
              trebuie actualizate manual, o dată pe an.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Recuperări</label>
                <input
                  type="number"
                  step="0.5"
                  value={form.sold_recuperari}
                  onChange={(e) => setForm({ ...form, sold_recuperari: e.target.value })}
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
                  onChange={(e) => setForm({ ...form, sold_an_minus_2: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Anul {CURRENT_YEAR - 1}</label>
                <input
                  type="number"
                  step="0.5"
                  value={form.sold_an_minus_1}
                  onChange={(e) => setForm({ ...form, sold_an_minus_1: e.target.value })}
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
                  onChange={(e) => setForm({ ...form, sold_an_curent: e.target.value })}
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

          {error && <p className="text-xs text-rose-600">{error}</p>}

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
        </form>
      </div>
    </div>
  )
}
