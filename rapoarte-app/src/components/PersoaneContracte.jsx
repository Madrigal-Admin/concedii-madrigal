import { useEffect, useState } from 'react'
import { Plus, UserPlus, Users, Pencil } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { formatData } from '../lib/luni'
import { inputCls, labelCls, btnPrimary, btnGhost, cardCls } from '../lib/ui'

const EMPTY_CONTRACT = {
  numar_contract: '', tip: 'CIM', departament: '', obiect: '',
  valabil_de_la: '', valabil_pana: '', hr_contract_id: null, activ: true,
}

export default function PersoaneContracte() {
  const [loading, setLoading] = useState(true)
  const [persoane, setPersoane] = useState([])
  const [contracte, setContracte] = useState([])
  const [angajati, setAngajati] = useState([])
  const [cauta, setCauta] = useState('')
  const [adauga, setAdauga] = useState(null) // 'angajat' | 'extern'
  const [angajatAles, setAngajatAles] = useState('')
  const [extern, setExtern] = useState({ nume: '', email: '', sex: '' })
  const [contractEditat, setContractEditat] = useState(null) // { persoana, form, id? }
  const [hrContracte, setHrContracte] = useState([])
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [{ data: p }, { data: c }, { data: a }] = await Promise.all([
      supabase.from('rap_persoane').select('*').order('nume'),
      supabase.from('rap_contracte').select('*').order('valabil_de_la', { ascending: false }),
      supabase.from('angajati').select('id, nume_complet, email, activ').eq('activ', true).order('nume_complet'),
    ])
    setPersoane(p || [])
    setContracte(c || [])
    setAngajati(a || [])
    setLoading(false)
  }

  const angajatiLibere = angajati.filter((a) => !persoane.some((p) => p.angajat_id === a.id))

  async function adaugaAngajat() {
    if (!angajatAles) return
    const a = angajati.find((x) => x.id === angajatAles)
    setBusy(true)
    const { error: err } = await supabase
      .from('rap_persoane')
      .insert({ tip: 'angajat', angajat_id: a.id, nume: a.nume_complet, email: a.email })
    setBusy(false)
    if (err) return setError('Nu am putut adăuga persoana.')
    setAdauga(null)
    setAngajatAles('')
    load()
  }

  async function importaToti() {
    if (angajatiLibere.length === 0) return setMsg('Toți angajații activi sunt deja adăugați.')
    setBusy(true)
    const { error: err } = await supabase.from('rap_persoane').insert(
      angajatiLibere.map((a) => ({ tip: 'angajat', angajat_id: a.id, nume: a.nume_complet, email: a.email }))
    )
    setBusy(false)
    if (err) return setError('Nu am putut importa angajații.')
    setMsg(`Am adăugat ${angajatiLibere.length} angajați.`)
    load()
  }

  async function adaugaExtern(e) {
    e.preventDefault()
    setError('')
    if (!extern.nume.trim() || !extern.sex) return setError('Completează numele și sexul.')
    setBusy(true)
    const { error: err } = await supabase.from('rap_persoane').insert({
      tip: 'extern', nume: extern.nume.trim(), email: extern.email.trim() || null, sex: extern.sex,
    })
    setBusy(false)
    if (err) return setError('Nu am putut adăuga colaboratorul.')
    setExtern({ nume: '', email: '', sex: '' })
    setAdauga(null)
    load()
  }

  async function comutaActivPersoana(p) {
    await supabase.from('rap_persoane').update({ activ: !p.activ }).eq('id', p.id)
    load()
  }

  async function deschideContract(persoana, contract) {
    setError('')
    setMsg('')
    setHrContracte([])
    setContractEditat({
      persoana,
      id: contract?.id || null,
      form: contract
        ? { ...EMPTY_CONTRACT, ...contract, departament: contract.departament || '', valabil_pana: contract.valabil_pana || '' }
        : { ...EMPTY_CONTRACT, tip: persoana.tip === 'angajat' ? 'CIM' : 'colaborare' },
    })
    if (persoana.tip === 'angajat') {
      const { data } = await supabase.rpc('rap_contracte_hr', { p_angajat: persoana.angajat_id })
      setHrContracte(data || [])
    }
  }

  function precompleteazaDinHr(id) {
    const h = hrContracte.find((x) => x.hr_contract_id === id)
    if (!h) return
    setContractEditat((s) => ({
      ...s,
      form: {
        ...s.form,
        hr_contract_id: h.hr_contract_id,
        numar_contract: h.numar_contract || s.form.numar_contract,
        departament: h.departament || s.form.departament,
        obiect: s.form.obiect || h.atributie || '',
        valabil_de_la: h.data_inceput || s.form.valabil_de_la,
        valabil_pana: h.data_final || '',
        tip: 'CIM',
      },
    }))
  }

  const setF = (k, v) => setContractEditat((s) => ({ ...s, form: { ...s.form, [k]: v } }))

  async function salveazaContract(e) {
    e.preventDefault()
    setError('')
    const f = contractEditat.form
    if (!f.numar_contract.trim() || !f.obiect.trim() || !f.valabil_de_la) {
      return setError('Completează numărul contractului, obiectul și data de început.')
    }
    if (f.valabil_pana && f.valabil_pana < f.valabil_de_la) {
      return setError('Data de final nu poate fi înaintea celei de început.')
    }
    const payload = {
      numar_contract: f.numar_contract.trim(),
      tip: f.tip,
      departament: f.departament.trim() || null,
      obiect: f.obiect.trim(),
      valabil_de_la: f.valabil_de_la,
      valabil_pana: f.valabil_pana || null,
      hr_contract_id: f.hr_contract_id || null,
      activ: f.activ,
    }
    setBusy(true)
    const { error: err } = contractEditat.id
      ? await supabase.from('rap_contracte').update(payload).eq('id', contractEditat.id)
      : await supabase.from('rap_contracte').insert({ ...payload, persoana_id: contractEditat.persoana.id })
    setBusy(false)
    if (err) return setError('Nu am putut salva contractul.')
    setContractEditat(null)
    load()
  }

  if (loading) return <p className="text-sm text-slate-500">Se încarcă…</p>

  if (contractEditat) {
    const f = contractEditat.form
    return (
      <form onSubmit={salveazaContract} className={`${cardCls} space-y-4`}>
        <h3 className="font-display text-base font-semibold text-slate-800">
          {contractEditat.id ? 'Modifică contractul' : 'Contract nou'} — {contractEditat.persoana.nume}
        </h3>

        {hrContracte.length > 0 && !contractEditat.id && (
          <div>
            <label className={labelCls}>Preia din Resurse Umane (opțional)</label>
            <select className={inputCls} defaultValue="" onChange={(e) => precompleteazaDinHr(e.target.value)}>
              <option value="">— Alege un contract din HR —</option>
              {hrContracte.map((h) => (
                <option key={h.hr_contract_id} value={h.hr_contract_id}>
                  {h.numar_contract || 'fără număr'} · {h.atributie || 'fără atribuție'}
                  {h.este_principal ? ' (principal)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Număr contract *</label>
            <input className={inputCls} value={f.numar_contract} onChange={(e) => setF('numar_contract', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Tip *</label>
            <select className={inputCls} value={f.tip} onChange={(e) => setF('tip', e.target.value)}>
              <option value="CIM">CIM (angajat)</option>
              <option value="colaborare">Colaborare</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Obiect (etichetă scurtă, ex. „Comunicare") *</label>
            <input className={inputCls} value={f.obiect} onChange={(e) => setF('obiect', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Departament</label>
            <input className={inputCls} value={f.departament} onChange={(e) => setF('departament', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Valabil de la *</label>
            <input type="date" className={inputCls} value={f.valabil_de_la} onChange={(e) => setF('valabil_de_la', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Valabil până la (gol = fără final)</label>
            <input type="date" className={inputCls} value={f.valabil_pana} onChange={(e) => setF('valabil_pana', e.target.value)} />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={f.activ} onChange={(e) => setF('activ', e.target.checked)} />
          Contract activ (cele inactive nu mai apar la „Cine nu a depus" și nu permit rapoarte noi)
        </label>

        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={busy} className={btnPrimary}>Salvează</button>
          <button type="button" onClick={() => setContractEditat(null)} className={btnGhost}>Anulează</button>
        </div>
      </form>
    )
  }

  const vizibile = persoane.filter((p) => !cauta || p.nume.toLowerCase().includes(cauta.toLowerCase()))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-slate-800">Persoane și contracte</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setAdauga(adauga === 'angajat' ? null : 'angajat')} className={btnGhost}>
            <UserPlus size={14} /> Angajat din Hub
          </button>
          <button onClick={importaToti} disabled={busy} className={btnGhost}>
            <Users size={14} /> Importă toți angajații activi
          </button>
          <button onClick={() => setAdauga(adauga === 'extern' ? null : 'extern')} className={btnGhost}>
            <Plus size={14} /> Colaborator extern
          </button>
        </div>
      </div>

      {msg && <p className="text-sm text-emerald-700">{msg}</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}

      {adauga === 'angajat' && (
        <div className={`${cardCls} flex flex-wrap items-end gap-2`}>
          <div className="min-w-[240px] flex-1">
            <label className={labelCls}>Angajat</label>
            <select className={inputCls} value={angajatAles} onChange={(e) => setAngajatAles(e.target.value)}>
              <option value="">— Alege —</option>
              {angajatiLibere.map((a) => <option key={a.id} value={a.id}>{a.nume_complet}</option>)}
            </select>
          </div>
          <button onClick={adaugaAngajat} disabled={!angajatAles || busy} className={btnPrimary}>Adaugă</button>
        </div>
      )}

      {adauga === 'extern' && (
        <form onSubmit={adaugaExtern} className={`${cardCls} grid gap-3 sm:grid-cols-4`}>
          <div className="sm:col-span-2">
            <label className={labelCls}>Nume complet *</label>
            <input className={inputCls} value={extern.nume} onChange={(e) => setExtern({ ...extern, nume: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" className={inputCls} value={extern.email} onChange={(e) => setExtern({ ...extern, email: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Sex *</label>
            <select className={inputCls} value={extern.sex} onChange={(e) => setExtern({ ...extern, sex: e.target.value })}>
              <option value="">— Alege —</option>
              <option value="F">Feminin</option>
              <option value="M">Masculin</option>
            </select>
          </div>
          <div className="sm:col-span-4">
            <button type="submit" disabled={busy} className={btnPrimary}>Adaugă colaboratorul</button>
          </div>
        </form>
      )}

      <input className={`${inputCls} max-w-sm`} placeholder="Caută după nume…" value={cauta} onChange={(e) => setCauta(e.target.value)} />

      {vizibile.length === 0 && <p className="text-sm text-slate-500">Nicio persoană adăugată încă.</p>}

      {vizibile.map((p) => {
        const ale = contracte.filter((c) => c.persoana_id === p.id)
        return (
          <div key={p.id} className={cardCls}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className={`font-medium ${p.activ ? 'text-slate-800' : 'text-slate-400'}`}>
                  {p.nume}{' '}
                  <span className="text-xs font-normal text-slate-400">
                    {p.tip === 'angajat' ? 'angajat' : `colaborator extern${p.sex ? ` · ${p.sex === 'F' ? 'F' : 'M'}` : ''}`}
                    {!p.activ ? ' · inactiv' : ''}
                  </span>
                </p>
                {p.email && <p className="text-xs text-slate-400">{p.email}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => deschideContract(p, null)} className={btnGhost}>
                  <Plus size={14} /> Contract
                </button>
                <button onClick={() => comutaActivPersoana(p)} className={btnGhost}>
                  {p.activ ? 'Dezactivează' : 'Activează'}
                </button>
              </div>
            </div>

            {ale.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {ale.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <span className={c.activ ? 'text-slate-700' : 'text-slate-400'}>
                      <strong>{c.obiect}</strong> · nr. {c.numar_contract} · {c.tip === 'CIM' ? 'CIM' : 'colaborare'}
                      {c.departament ? ` · ${c.departament}` : ''} · {formatData(c.valabil_de_la)} →{' '}
                      {c.valabil_pana ? formatData(c.valabil_pana) : 'fără final'}
                      {!c.activ ? ' · inactiv' : ''}
                    </span>
                    <button onClick={() => deschideContract(p, c)} className="rounded-full p-1.5 text-slate-500 hover:bg-white focus-ring" title="Modifică">
                      <Pencil size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}
