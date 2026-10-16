import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { STARI_DECONT, esteAdmin } from '../lib/roluri'
import { formatBani } from '../lib/bani'
import { formatData } from '../lib/luni'
import { inputCls, btnPrimary, cardCls } from '../lib/ui'
import { StareBadge, Titlu } from './comun'
import DecontForm from './DecontForm'
import DecontDetaliu from './DecontDetaliu'

export default function DeconturiLista({ role, angajat, comune, go, params }) {
  const [mode, setMode] = useState(() => {
    if (params?.referatNou) return { m: 'nou', referatId: params.referatNou }
    if (params?.deschide) return { m: 'detaliu', id: params.deschide }
    return { m: 'lista' }
  })
  const admin = esteAdmin(role)

  if (mode.m === 'nou' || mode.m === 'edit') {
    return (
      <DecontForm
        role={role}
        angajat={angajat}
        comune={comune}
        decontId={mode.m === 'edit' ? mode.id : undefined}
        referatId={mode.referatId}
        onSaved={(id) => setMode({ m: 'detaliu', id })}
        onCancel={() => setMode(mode.m === 'edit' ? { m: 'detaliu', id: mode.id } : { m: 'lista' })}
      />
    )
  }
  if (mode.m === 'detaliu') {
    return (
      <DecontDetaliu
        id={mode.id}
        role={role}
        onBack={() => setMode({ m: 'lista' })}
        onEdit={() => setMode({ m: 'edit', id: mode.id })}
        onDeschideReferat={(rid) => go('referate', { deschide: rid })}
      />
    )
  }
  return <Lista admin={admin} onNou={() => setMode({ m: 'nou' })} onDeschide={(id) => setMode({ m: 'detaliu', id })} />
}

function Lista({ admin, onNou, onDeschide }) {
  const [rows, setRows] = useState(null)
  const [stare, setStare] = useState('')
  const [cauta, setCauta] = useState('')

  useEffect(() => {
    supabase
      .from('fin_deconturi')
      .select('*, fin_deconturi_linii(suma_bani), fin_referate(cod)')
      .order('created_at', { ascending: false })
      .limit(1000)
      .then(({ data }) => setRows(data || []))
  }, [])

  const vizibile = (rows || []).filter((r) => {
    if (stare && r.stare !== stare) return false
    if (cauta) {
      const q = cauta.toLowerCase()
      if (![r.cod, r.autor_nume, r.fin_referate?.cod, r.nr_inregistrare].some((t) => (t || '').toLowerCase().includes(q))) return false
    }
    return true
  })

  return (
    <div className="space-y-4">
      <Titlu actiuni={<button onClick={onNou} className={btnPrimary}><Plus size={14} /> Decont nou</button>}>
        {admin ? 'Deconturi de cheltuieli' : 'Deconturile mele'}
      </Titlu>
      <div className={`${cardCls} grid gap-3 sm:grid-cols-3`}>
        <input className={inputCls} placeholder="Caută (cod, autor, referat)…" value={cauta} onChange={(e) => setCauta(e.target.value)} />
        <select className={inputCls} value={stare} onChange={(e) => setStare(e.target.value)}>
          <option value="">Toate stările</option>
          {Object.entries(STARI_DECONT).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>
      {rows === null && <p className="text-sm text-slate-500">Se încarcă…</p>}
      {rows && vizibile.length === 0 && <p className="text-sm text-slate-500">Niciun decont găsit.</p>}
      <div className="space-y-2">
        {vizibile.map((r) => {
          const total = (r.fin_deconturi_linii || []).reduce((s, l) => s + Number(l.suma_bani), 0)
          return (
            <button key={r.id} onClick={() => onDeschide(r.id)} className={`${cardCls} w-full text-left transition hover:shadow-md`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-800">{r.cod} · pentru {r.fin_referate?.cod}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {admin ? `${r.autor_nume} · ` : ''}{formatData(r.perioada_de_la)} – {formatData(r.perioada_pana)}
                    {r.nr_inregistrare ? ` · înreg. ${r.nr_inregistrare}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <StareBadge stare={r.stare} mapa={STARI_DECONT} />
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
