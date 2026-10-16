import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { STARI_REFERAT, esteAdmin } from '../lib/roluri'
import { formatBani } from '../lib/bani'
import { formatData } from '../lib/luni'
import { inputCls, btnPrimary, cardCls } from '../lib/ui'
import { StareBadge, Titlu } from './comun'
import ReferatForm from './ReferatForm'
import ReferatDetaliu from './ReferatDetaliu'

export default function ReferateLista({ role, angajat, comune, go, params }) {
  const [mode, setMode] = useState(() =>
    params?.deschide ? { m: 'detaliu', id: params.deschide } : { m: 'lista' }
  )
  const admin = esteAdmin(role)

  if (mode.m === 'nou') {
    return (
      <ReferatForm
        role={role}
        angajat={angajat}
        comune={comune}
        onSaved={(id) => setMode({ m: 'detaliu', id })}
        onCancel={() => setMode({ m: 'lista' })}
      />
    )
  }
  if (mode.m === 'edit') {
    return (
      <ReferatForm
        role={role}
        angajat={angajat}
        comune={comune}
        referatId={mode.id}
        onSaved={(id) => setMode({ m: 'detaliu', id })}
        onCancel={() => setMode({ m: 'detaliu', id: mode.id })}
      />
    )
  }
  if (mode.m === 'detaliu') {
    return (
      <ReferatDetaliu
        id={mode.id}
        role={role}
        comune={comune}
        onBack={() => setMode({ m: 'lista' })}
        onEdit={() => setMode({ m: 'edit', id: mode.id })}
        onCreeazaDecont={() => go('deconturi', { referatNou: mode.id })}
        onDeschideDecont={(did) => go('deconturi', { deschide: did })}
      />
    )
  }
  return <Lista admin={admin} onNou={() => setMode({ m: 'nou' })} onDeschide={(id) => setMode({ m: 'detaliu', id })} />
}

function Lista({ admin, onNou, onDeschide }) {
  const [rows, setRows] = useState(null)
  const [stare, setStare] = useState('')
  const [tip, setTip] = useState('')
  const [cauta, setCauta] = useState('')
  const [an, setAn] = useState('')

  useEffect(() => {
    supabase
      .from('fin_referate')
      .select('*, fin_referate_linii(valoare_bani)')
      .order('created_at', { ascending: false })
      .limit(1000)
      .then(({ data }) => setRows(data || []))
  }, [])

  const ani = useMemo(() => [...new Set((rows || []).map((r) => r.data_intocmirii?.slice(0, 4)))].sort().reverse(), [rows])

  const vizibile = (rows || []).filter((r) => {
    if (stare && r.stare !== stare) return false
    if (tip && r.tip !== tip) return false
    if (an && !r.data_intocmirii?.startsWith(an)) return false
    if (cauta) {
      const q = cauta.toLowerCase()
      if (![r.cod, r.autor_nume, r.motiv, r.nr_inregistrare].some((t) => (t || '').toLowerCase().includes(q))) return false
    }
    return true
  })

  return (
    <div className="space-y-4">
      <Titlu actiuni={<button onClick={onNou} className={btnPrimary}><Plus size={14} /> Referat nou</button>}>
        {admin ? 'Referate de necesitate' : 'Referatele mele'}
      </Titlu>

      <div className={`${cardCls} grid gap-3 sm:grid-cols-4`}>
        <input className={inputCls} placeholder={admin ? 'Caută (cod, autor, motiv)…' : 'Caută…'} value={cauta} onChange={(e) => setCauta(e.target.value)} />
        <select className={inputCls} value={stare} onChange={(e) => setStare(e.target.value)}>
          <option value="">Toate stările</option>
          {Object.entries(STARI_REFERAT).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className={inputCls} value={tip} onChange={(e) => setTip(e.target.value)}>
          <option value="">Servicii și produse</option>
          <option value="servicii">Servicii</option>
          <option value="produse">Produse</option>
        </select>
        <select className={inputCls} value={an} onChange={(e) => setAn(e.target.value)}>
          <option value="">Toți anii</option>
          {ani.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {rows === null && <p className="text-sm text-slate-500">Se încarcă…</p>}
      {rows && vizibile.length === 0 && <p className="text-sm text-slate-500">Niciun referat găsit.</p>}

      <div className="space-y-2">
        {vizibile.map((r) => {
          const total = (r.fin_referate_linii || []).reduce((s, l) => s + Number(l.valoare_bani), 0)
          return (
            <button key={r.id} onClick={() => onDeschide(r.id)} className={`${cardCls} w-full text-left transition hover:shadow-md`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800">
                    {r.cod} · {r.tip === 'servicii' ? 'Servicii' : 'Produse'}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-slate-500">{r.motiv || '(fără motiv completat)'}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {admin ? `${r.autor_nume} · ` : ''}{formatData(r.data_intocmirii)}
                    {r.nr_inregistrare ? ` · înreg. ${r.nr_inregistrare}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <StareBadge stare={r.stare} mapa={STARI_REFERAT} />
                  <p className="mt-1 text-sm font-semibold tabular-nums text-slate-700">{formatBani(total)} lei</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
