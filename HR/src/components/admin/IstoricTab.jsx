import { useEffect, useMemo, useState } from 'react'
import { Search, Plus, Pencil, Trash2, Users, Check, X as XIcon, ClipboardList } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { formatDate } from '../../lib/leaveCalculations'
import { ultima, scadenta, statusScadenta, normText, parseNota, formatNota, eticheta, CALIFICATIVE } from '../../lib/istoricHr'

const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-ring'
const btnPrimary = 'flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 focus-ring disabled:opacity-50'
const btnGhost = 'flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 focus-ring'

function Pastila({ st }) {
  if (!st) return <span className="text-xs text-slate-400">—</span>
  const cls = st.tip === 'ok' ? 'bg-emerald-50 text-emerald-700' : st.tip === 'curand' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
  const txt = st.tip === 'depasit' ? `depășit ${Math.abs(st.zile)} zile` : st.tip === 'curand' ? `în ${st.zile} zile` : 'la zi'
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{txt}</span>
}

// Câmp generic (select / număr) după definiția din config.campuri
function Camp({ def, value, onChange }) {
  if (def.type === 'select') {
    return (
      <select className={inputCls} value={value || ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">— Alege —</option>
        {def.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    )
  }
  return <input className={inputCls} value={value ?? ''} placeholder={def.placeholder || ''} onChange={(e) => onChange(e.target.value)} />
}

export default function IstoricTab({ config }) {
  const { titlu, tabel, campData, campuri, rezumat, cuRezultate } = config
  const [angajati, setAngajati] = useState([])
  const [randuri, setRanduri] = useState([])
  const [loading, setLoading] = useState(true)
  const [cauta, setCauta] = useState('')
  const [dept, setDept] = useState('')
  const [selId, setSelId] = useState(null)
  const [form, setForm] = useState({ data: '' })
  const [editId, setEditId] = useState(null)
  const [draft, setDraft] = useState({})
  const [bulk, setBulk] = useState(false)
  const [vedere, setVedere] = useState('lista') // 'lista' | 'rezultate'
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: a }, { data: r }] = await Promise.all([
      supabase.from('angajati').select('id, nume_complet, department:departments(name)').eq('activ', true).order('nume_complet'),
      supabase.from(tabel).select('*'),
    ])
    setAngajati(a || [])
    setRanduri(r || [])
    setLoading(false)
  }

  const departamente = useMemo(() => [...new Set(angajati.map((a) => a.department?.name).filter(Boolean))].sort(), [angajati])
  const randuriDe = (id) => randuri.filter((r) => r.angajat_id === id).sort((a, b) => b[campData].localeCompare(a[campData]))

  const vizibili = useMemo(() => {
    const q = normText(cauta.trim())
    return angajati.filter((a) => (!q || normText(a.nume_complet).includes(q)) && (!dept || a.department?.name === dept))
  }, [angajati, cauta, dept])

  function ok(m) { setMsg(m); setError('') }
  function ko(m) { setError(m); setMsg('') }

  function valideaza(vals) {
    if (!vals.data) return 'Alege data.'
    for (const c of campuri) {
      if (c.key === 'nota') {
        const n = parseNota(vals.nota)
        if (Number.isNaN(n)) return 'Nota trebuie să fie între 1 și 5 (ex. 4,6).'
      }
    }
    return ''
  }
  function payloadDin(vals) {
    const p = { [campData]: vals.data }
    for (const c of campuri) {
      p[c.key] = c.key === 'nota' ? parseNota(vals.nota) : vals[c.key] || null
    }
    return p
  }

  async function adauga(e) {
    e.preventDefault()
    const v = valideaza(form)
    if (v) return ko(v)
    if (randuriDe(selId).some((r) => r[campData] === form.data)) return ko('Există deja o înregistrare cu această dată.')
    setBusy(true)
    const { error: err } = await supabase.from(tabel).insert({ angajat_id: selId, ...payloadDin(form) })
    setBusy(false)
    if (err) return ko('Nu am putut salva.')
    setForm({ data: '' })
    ok('Înregistrare adăugată.')
    load()
  }

  function incepeEditarea(r) {
    setEditId(r.id)
    const d = { data: r[campData] }
    for (const c of campuri) d[c.key] = c.key === 'nota' ? formatNota(r.nota) : r[c.key] || ''
    setDraft(d)
    setError('')
  }

  async function salveazaEditarea(r) {
    const v = valideaza(draft)
    if (v) return ko(v)
    if (draft.data !== r[campData] && randuriDe(r.angajat_id).some((x) => x[campData] === draft.data)) {
      return ko('Există deja o înregistrare cu această dată.')
    }
    setBusy(true)
    const { error: err } = await supabase.from(tabel).update(payloadDin(draft)).eq('id', r.id)
    setBusy(false)
    if (err) return ko('Nu am putut salva modificarea.')
    setEditId(null)
    ok('Modificare salvată.')
    load()
  }

  async function sterge(r) {
    if (!confirm(`Ștergi înregistrarea din ${formatDate(r[campData])}?`)) return
    const { error: err } = await supabase.from(tabel).delete().eq('id', r.id)
    if (err) return ko('Nu am putut șterge.')
    ok('Înregistrare ștearsă.')
    load()
  }

  if (loading) return <p className="text-sm text-slate-500">Se încarcă…</p>

  const selectat = angajati.find((a) => a.id === selId)

  if (bulk) {
    return (
      <BulkForm
        config={config}
        angajati={angajati}
        departamente={departamente}
        randuri={randuri}
        onClose={() => setBulk(false)}
        onDone={(m, dataNoua) => { setBulk(false); ok(m); load(); if (dataNoua && cuRezultate) setVedere('rezultate') }}
      />
    )
  }

  if (vedere === 'rezultate') {
    return <Rezultate config={config} angajati={angajati} randuri={randuri} onClose={() => { setVedere('lista'); load() }} />
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-ink">{titlu}</h2>
        <div className="flex flex-wrap gap-2">
          {cuRezultate && (
            <button onClick={() => setVedere('rezultate')} className={btnGhost}>
              <ClipboardList size={13} /> Completează rezultate
            </button>
          )}
          <button onClick={() => { setBulk(true); setMsg(''); setError('') }} className={btnPrimary}>
            <Users size={14} /> Adaugă pentru mai mulți
          </button>
        </div>
      </div>

      {msg && <p className="mb-3 text-sm text-emerald-700">{msg}</p>}
      {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={cauta} onChange={(e) => setCauta(e.target.value)} placeholder="Caută după nume…" className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus-ring" />
            </div>
            <select value={dept} onChange={(e) => setDept(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-ring">
              <option value="">Toate departamentele</option>
              {departamente.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {vizibili.length === 0 && <p className="p-4 text-sm text-slate-500">Niciun angajat găsit.</p>}
            {vizibili.map((a) => {
              const ult = ultima(randuriDe(a.id), campData)
              const st = ult ? statusScadenta(scadenta(ult[campData])) : null
              return (
                <button
                  key={a.id}
                  onClick={() => { setSelId(a.id); setEditId(null); setForm({ data: '' }); setMsg(''); setError('') }}
                  className={`flex w-full items-center justify-between gap-3 border-t border-slate-100 px-4 py-2.5 text-left first:border-t-0 hover:bg-slate-50 ${selId === a.id ? 'bg-brand-50' : ''}`}
                >
                  <span>
                    <span className="block text-sm font-medium text-slate-800">{a.nume_complet}</span>
                    <span className="block text-xs text-slate-500">
                      {ult ? `Ultimul: ${formatDate(ult[campData])}${rezumat(ult) ? ` · ${rezumat(ult)}` : ''}` : 'fără înregistrare'}
                    </span>
                  </span>
                  <Pastila st={st} />
                </button>
              )
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 self-start">
          {!selectat ? (
            <p className="text-sm text-slate-500">Alege un angajat din listă ca să vezi și să editezi istoricul.</p>
          ) : (
            <>
              <p className="mb-2 font-display text-sm font-semibold text-ink">{selectat.nume_complet} — istoric</p>
              {randuriDe(selectat.id).length === 0 && <p className="mb-2 text-xs text-slate-400">Nicio înregistrare.</p>}
              <div className="mb-3">
                {randuriDe(selectat.id).map((r) => (
                  <div key={r.id} className="border-t border-slate-100 py-2 first:border-t-0">
                    {editId === r.id ? (
                      <div className="space-y-2">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <input type="date" className={inputCls} value={draft.data} onChange={(e) => setDraft({ ...draft, data: e.target.value })} />
                          {campuri.map((c) => (
                            <Camp key={c.key} def={c} value={draft[c.key]} onChange={(v) => setDraft({ ...draft, [c.key]: v })} />
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button disabled={busy} onClick={() => salveazaEditarea(r)} className={btnPrimary}><Check size={13} /> Salvează</button>
                          <button onClick={() => setEditId(null)} className={btnGhost}><XIcon size={13} /> Anulează</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-slate-700">
                          {formatDate(r[campData])}
                          {rezumat(r) && <span className="text-slate-500"> · {rezumat(r)}</span>}
                        </span>
                        <span className="flex gap-1">
                          <button onClick={() => incepeEditarea(r)} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 focus-ring" title="Editează"><Pencil size={13} /></button>
                          <button onClick={() => sterge(r)} className="rounded-full p-1.5 text-rose-500 hover:bg-rose-50 focus-ring" title="Șterge"><Trash2 size={13} /></button>
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <form onSubmit={adauga} className="space-y-2 border-t border-slate-200 pt-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">{config.etichetaData}</label>
                    <input type="date" className={inputCls} value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
                  </div>
                  {campuri.map((c) => (
                    <div key={c.key}>
                      <label className="mb-1 block text-xs font-medium text-slate-600">{c.label}</label>
                      <Camp def={c} value={form[c.key]} onChange={(v) => setForm({ ...form, [c.key]: v })} />
                    </div>
                  ))}
                </div>
                <button type="submit" disabled={busy} className={btnPrimary}><Plus size={14} /> Adaugă</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Adăugare pentru mai mulți angajați odată
// ---------------------------------------------------------------------------
function BulkForm({ config, angajati, departamente, randuri, onClose, onDone }) {
  const { campData, campuri, titlu } = config
  const campuriBulk = campuri.filter((c) => c.bulk)
  const [data, setData] = useState('')
  const [extra, setExtra] = useState({})
  const [cauta, setCauta] = useState('')
  const [dept, setDept] = useState('')
  const [alesi, setAlesi] = useState(new Set())
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const vizibili = useMemo(() => {
    const q = normText(cauta.trim())
    return angajati.filter((a) => (!q || normText(a.nume_complet).includes(q)) && (!dept || a.department?.name === dept))
  }, [angajati, cauta, dept])

  const existenti = useMemo(
    () => new Set(randuri.filter((r) => r[campData] === data).map((r) => r.angajat_id)),
    [randuri, data, campData]
  )
  const deAdaugat = [...alesi].filter((id) => !existenti.has(id))
  const sarite = [...alesi].filter((id) => existenti.has(id))

  const toggle = (id) => setAlesi((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toateVizibile = vizibili.length > 0 && vizibili.every((a) => alesi.has(a.id))
  const toggleToate = () => setAlesi((s) => {
    const n = new Set(s)
    if (toateVizibile) vizibili.forEach((a) => n.delete(a.id))
    else vizibili.forEach((a) => n.add(a.id))
    return n
  })

  async function confirma() {
    setError('')
    if (!data) return setError('Alege data.')
    for (const c of campuriBulk) if (c.required && !extra[c.key]) return setError(`Alege: ${c.label}.`)
    if (deAdaugat.length === 0) return setError('Nu ai ales niciun angajat de adăugat.')
    setBusy(true)
    const rows = deAdaugat.map((id) => {
      const r = { angajat_id: id, [campData]: data }
      for (const c of campuriBulk) r[c.key] = extra[c.key] || null
      return r
    })
    const { error: err } = await supabase.from(config.tabel).insert(rows)
    setBusy(false)
    if (err) return setError('Nu am putut salva. Nu s-a adăugat nimic.')
    onDone(`Am adăugat ${rows.length} înregistrări${sarite.length ? ` (${sarite.length} sărite — aveau deja această dată)` : ''}.`, data)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-ink">{titlu} — adaugă pentru mai mulți angajați</h2>
        <button onClick={onClose} className={btnGhost}><XIcon size={13} /> Înapoi</button>
      </div>
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">{config.etichetaData} *</label>
          <input type="date" className={inputCls} value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        {campuriBulk.map((c) => (
          <div key={c.key}>
            <label className="mb-1 block text-xs font-medium text-slate-600">{c.label}{c.required ? ' *' : ''}</label>
            <Camp def={c} value={extra[c.key]} onChange={(v) => setExtra({ ...extra, [c.key]: v })} />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={cauta} onChange={(e) => setCauta(e.target.value)} placeholder="Caută după nume…" className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus-ring" />
          </div>
          <select value={dept} onChange={(e) => setDept(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-ring">
            <option value="">Toate departamentele</option>
            {departamente.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <button onClick={toggleToate} className={btnGhost}>{toateVizibile ? 'Deselectează lista' : 'Selectează toți din listă'}</button>
        </div>
        <div className="max-h-80 overflow-y-auto rounded-lg border border-slate-100">
          {vizibili.map((a) => (
            <label key={a.id} className="flex cursor-pointer items-center gap-3 border-t border-slate-100 px-3 py-2 text-sm first:border-t-0 hover:bg-slate-50">
              <input type="checkbox" checked={alesi.has(a.id)} onChange={() => toggle(a.id)} />
              <span className="flex-1 text-slate-800">{a.nume_complet}</span>
              <span className="text-xs text-slate-400">{a.department?.name || ''}</span>
              {data && existenti.has(a.id) && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">deja înregistrat</span>}
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
        Se adaugă <strong>{deAdaugat.length}</strong> înregistrări{data ? ` cu data ${formatDate(data)}` : ''}
        {sarite.length > 0 && <> · <span className="text-amber-700">{sarite.length} sărite (au deja această dată)</span></>}.
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={confirma} disabled={busy} className={btnPrimary}><Check size={14} /> Confirmă</button>
        <button onClick={onClose} className={btnGhost}>Anulează</button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Completarea rezultatelor (calificativ + notă) pentru o dată de evaluare
// ---------------------------------------------------------------------------
function Rezultate({ config, angajati, randuri, onClose }) {
  const { campData, tabel } = config
  const date = useMemo(() => [...new Set(randuri.map((r) => r[campData]))].sort().reverse(), [randuri, campData])
  const [data, setData] = useState(date[0] || '')
  const [vals, setVals] = useState({})
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const rows = useMemo(
    () => randuri.filter((r) => r[campData] === data)
      .map((r) => ({ r, nume: angajati.find((a) => a.id === r.angajat_id)?.nume_complet || '—' }))
      .sort((a, b) => a.nume.localeCompare(b.nume, 'ro')),
    [randuri, data, angajati, campData]
  )
  useEffect(() => {
    const v = {}
    rows.forEach(({ r }) => { v[r.id] = { calificativ: r.calificativ || '', nota: formatNota(r.nota) } })
    setVals(v)
  }, [data]) // eslint-disable-line

  async function salveaza() {
    setError(''); setMsg('')
    const schimbari = []
    for (const { r, nume } of rows) {
      const v = vals[r.id]
      if (!v) continue
      const nota = parseNota(v.nota)
      if (Number.isNaN(nota)) return setError(`Nota lui ${nume} trebuie să fie între 1 și 5 (ex. 4,6).`)
      if ((v.calificativ || null) !== (r.calificativ || null) || nota !== (r.nota === null || r.nota === undefined ? null : Number(r.nota))) {
        schimbari.push({ id: r.id, calificativ: v.calificativ || null, nota })
      }
    }
    if (schimbari.length === 0) return setMsg('Nimic de salvat.')
    setBusy(true)
    const rez = await Promise.all(schimbari.map((s) => supabase.from(tabel).update({ calificativ: s.calificativ, nota: s.nota }).eq('id', s.id)))
    setBusy(false)
    if (rez.some((x) => x.error)) return setError('Unele rânduri nu s-au salvat. Încearcă din nou.')
    setMsg(`Am salvat ${schimbari.length} evaluări.`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-ink">Evaluări — completează rezultatele</h2>
        <button onClick={onClose} className={btnGhost}><XIcon size={13} /> Înapoi</button>
      </div>
      {date.length === 0 ? (
        <p className="text-sm text-slate-500">Nu există evaluări înregistrate.</p>
      ) : (
        <>
          <div className="max-w-xs">
            <label className="mb-1 block text-xs font-medium text-slate-600">Data evaluării</label>
            <select className={inputCls} value={data} onChange={(e) => setData(e.target.value)}>
              {date.map((d) => <option key={d} value={d}>{formatDate(d)}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr><th className="px-4 py-2 font-medium">Angajat</th><th className="px-4 py-2 font-medium">Calificativ</th><th className="px-4 py-2 font-medium">Nota (1–5)</th></tr>
              </thead>
              <tbody>
                {rows.map(({ r, nume }) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium text-slate-800">{nume}</td>
                    <td className="px-4 py-2">
                      <select className={inputCls} value={vals[r.id]?.calificativ || ''} onChange={(e) => setVals({ ...vals, [r.id]: { ...vals[r.id], calificativ: e.target.value } })}>
                        <option value="">—</option>
                        {CALIFICATIVE.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input className={`${inputCls} max-w-[110px]`} value={vals[r.id]?.nota ?? ''} placeholder="ex. 4,6" onChange={(e) => setVals({ ...vals, [r.id]: { ...vals[r.id], nota: e.target.value } })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {msg && <p className="text-sm text-emerald-700">{msg}</p>}
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button onClick={salveaza} disabled={busy} className={btnPrimary}><Check size={14} /> Salvează toate</button>
        </>
      )}
    </div>
  )
}
