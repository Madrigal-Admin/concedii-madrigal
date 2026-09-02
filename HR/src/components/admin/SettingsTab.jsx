import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { formatDate } from '../../lib/leaveCalculations'
import EmployeesTab from './EmployeesTab'

function ListManager({ title, table, hint }) {
  const [items, setItems] = useState([])
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from(table).select('*').order('name')
    setItems(data || [])
    setLoading(false)
  }

  async function handleAdd(e) {
    e.preventDefault()
    setError('')
    const name = newName.trim()
    if (!name) return
    const { error } = await supabase.from(table).insert({ name })
    if (error) {
      setError('Există deja o valoare cu acest nume.')
      return
    }
    setNewName('')
    load()
  }

  async function handleDelete(id) {
    if (
      !confirm(
        'Ștergi această valoare din listă? Angajații care o folosesc deja nu sunt afectați, dar nu va mai putea fi selectată pentru alții noi.'
      )
    )
      return
    await supabase.from(table).delete().eq('id', id)
    load()
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}

      <form onSubmit={handleAdd} className="mt-4 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Adaugă o valoare nouă…"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
        />
        <button
          type="submit"
          className="flex items-center gap-1.5 rounded-full bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-700 focus-ring"
        >
          <Plus size={14} />
        </button>
      </form>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}

      <div className="mt-4 max-h-[420px] space-y-1.5 overflow-y-auto">
        {loading && <p className="text-sm text-slate-500">Se încarcă…</p>}
        {!loading && items.length === 0 && (
          <p className="text-sm text-slate-400">Nicio valoare adăugată încă.</p>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5 text-sm"
          >
            <span className="text-ink">{item.name}</span>
            <button
              onClick={() => handleDelete(item.id)}
              className="rounded-full p-1.5 text-rose-500 hover:bg-rose-50 focus-ring"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SettingsTab({ currentEmployee }) {
  return (
    <div className="space-y-10">
      <section>
        <h3 className="mb-3 font-display text-lg font-semibold text-ink">Angajați</h3>
        <EmployeesTab />
      </section>

      <section>
        <h3 className="mb-1 font-display text-lg font-semibold text-ink">Zile libere legale</h3>
        <p className="mb-4 text-sm text-slate-500">
          Introdu-le manual, o dată pe an. Cele care cad în cursul săptămânii sunt excluse automat
          din calculul concediilor de odihnă (nu se scad din sold).
        </p>
        <LegalHolidaysManager />
      </section>

      <section>
        <h3 className="mb-1 font-display text-lg font-semibold text-ink">
          Liste prestabilite (departamente și funcții)
        </h3>
        <p className="mb-4 text-sm text-slate-500">
          Aceste liste alimentează dropdown-urile din formularul de angajați, ca toată lumea să
          scrie departamentele și funcțiile la fel.
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          <ListManager
            title="Departamente"
            table="departments"
            hint="ex: Soprane, Alte, Tenori, Bași, Administrativ"
          />
          <ListManager
            title="Funcții"
            table="positions"
            hint="ex: Corist, Dirijor, Corepetitor, Manager"
          />
        </div>
      </section>

      <section>
        <h3 className="mb-1 font-display text-lg font-semibold text-ink">Administratori</h3>
        <p className="mb-4 text-sm text-slate-500">
          Poți da sau retrage drepturi de administrare oricărui angajat care și-a creat deja cont
          de autentificare. <strong>HR Admin</strong> are acces complet, inclusiv la Setări.{' '}
          <strong>HR Operational</strong> poate gestiona cererile și recuperările, dar nu are
          acces la Setări.
        </p>
        <AdminRolesManager currentEmployee={currentEmployee} />
      </section>
    </div>
  )
}

function AdminRolesManager({ currentEmployee }) {
  const [employees, setEmployees] = useState([])
  const [adminRoles, setAdminRoles] = useState({}) // auth_user_id -> 'full' | 'limited'
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [{ data: emps }, { data: admins }] = await Promise.all([
      supabase
        .from('employees')
        .select('id, full_name, email, auth_user_id')
        .not('auth_user_id', 'is', null)
        .order('full_name'),
      supabase.from('admins').select('id, role'),
    ])
    setEmployees(emps || [])
    const map = {}
    ;(admins || []).forEach((a) => {
      map[a.id] = a.role
    })
    setAdminRoles(map)
    setLoading(false)
  }

  async function changeRole(emp, newRole) {
    if (
      currentEmployee?.id === emp.id &&
      newRole !== 'full' &&
      !confirm('Îți schimbi propriul rol și ai putea pierde accesul la Setări. Continui?')
    ) {
      return
    }

    setBusyId(emp.id)
    if (newRole === 'none') {
      await supabase.from('admins').delete().eq('id', emp.auth_user_id)
    } else {
      await supabase
        .from('admins')
        .upsert({ id: emp.auth_user_id, role: newRole }, { onConflict: 'id' })
    }
    await load()
    setBusyId(null)
  }

  if (loading) return <p className="text-sm text-slate-500">Se încarcă…</p>

  return (
    <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {employees.length === 0 && (
        <p className="p-5 text-sm text-slate-400">
          Niciun angajat nu și-a creat încă cont de autentificare — abia atunci poate fi promovat
          la rol de admin.
        </p>
      )}
      <div className="max-h-[420px] overflow-y-auto">
        {employees.map((emp) => {
          const role = adminRoles[emp.auth_user_id] || 'none'
          return (
            <div
              key={emp.id}
              className="flex items-center justify-between gap-3 border-b border-slate-100 p-3 text-sm last:border-0"
            >
              <div>
                <p className="font-medium text-ink">{emp.full_name}</p>
                <p className="text-xs text-slate-400">{emp.email}</p>
              </div>
              <select
                value={role}
                disabled={busyId === emp.id}
                onChange={(e) => changeRole(emp, e.target.value)}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus-ring disabled:opacity-50"
              >
                <option value="none">Angajat</option>
                <option value="limited">HR Operational</option>
                <option value="full">HR Admin</option>
              </select>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function LegalHolidaysManager() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [label, setLabel] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('legal_holidays').select('*').order('start_date')
    setItems(data || [])
    setLoading(false)
  }

  async function handleAdd(e) {
    e.preventDefault()
    setError('')
    if (!startDate) return setError('Completează cel puțin data de început.')
    const end = endDate || startDate
    if (new Date(end) < new Date(startDate)) return setError('Data de sfârșit e înainte de început.')

    const { error } = await supabase
      .from('legal_holidays')
      .insert({ start_date: startDate, end_date: end, label: label.trim() || null })
    if (error) {
      setError('Nu am putut salva.')
      return
    }
    setStartDate('')
    setEndDate('')
    setLabel('')
    load()
  }

  async function handleDelete(id) {
    if (!confirm('Ștergi această zi liberă?')) return
    await supabase.from('legal_holidays').delete().eq('id', id)
    load()
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
      <form onSubmit={handleAdd} className="h-fit space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
        <h4 className="text-sm font-semibold text-ink">Adaugă zi liberă / interval</h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">De la</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Până la <span className="text-slate-400">(opțional, pt. o singură zi)</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Denumire <span className="text-slate-400">(opțional)</span>
          </label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="ex: Ziua Națională"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
          />
        </div>
        {error && <p className="text-xs text-rose-600">{error}</p>}
        <button
          type="submit"
          className="flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 focus-ring"
        >
          <Plus size={14} /> Adaugă
        </button>
      </form>

      <div>
        {loading ? (
          <p className="text-sm text-slate-500">Se încarcă…</p>
        ) : (
          <div className="max-h-[420px] space-y-2 overflow-y-auto">
            {items.length === 0 && (
              <p className="text-sm text-slate-400">Nicio zi liberă legală adăugată încă.</p>
            )}
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-sm"
              >
                <div>
                  <p className="font-medium text-ink">
                    {item.start_date === item.end_date
                      ? formatDate(item.start_date)
                      : `${formatDate(item.start_date)} → ${formatDate(item.end_date)}`}
                  </p>
                  {item.label && <p className="text-xs text-slate-400">{item.label}</p>}
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="rounded-full p-2 text-rose-500 hover:bg-rose-50 focus-ring"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
