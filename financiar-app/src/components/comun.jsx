import { useEffect, useState } from 'react'
import { History } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { formatDataOra } from '../lib/luni'
import { btnGhost, btnPrimary, inputCls, labelCls } from '../lib/ui'

export function StareBadge({ stare, mapa }) {
  const s = mapa[stare] || { label: stare, clasa: 'bg-slate-100 text-slate-600' }
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.clasa}`}>{s.label}</span>
}

// Istoric nemodificabil al unui document
export function Istoric({ docTip, docId, reload }) {
  const [rows, setRows] = useState(null)
  const [deschis, setDeschis] = useState(false)

  useEffect(() => {
    if (!deschis) return
    supabase
      .from('fin_istoric')
      .select('*')
      .eq('doc_tip', docTip)
      .eq('doc_id', docId)
      .order('la', { ascending: true })
      .then(({ data }) => setRows(data || []))
  }, [deschis, docTip, docId, reload])

  return (
    <div>
      <button onClick={() => setDeschis((d) => !d)} className={btnGhost}>
        <History size={14} /> {deschis ? 'Ascunde istoricul' : 'Istoric'}
      </button>
      {deschis && (
        <ul className="mt-2 space-y-1 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          {rows === null && <li>Se încarcă…</li>}
          {rows?.map((r) => (
            <li key={r.id}>
              <span className="text-slate-400">{formatDataOra(r.la)}</span> · <strong>{r.actiune}</strong>
              {r.nume_utilizator ? ` · ${r.nume_utilizator}` : ''}
              {r.motiv ? <em className="text-slate-500"> — „{r.motiv}"</em> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Casetă pentru acțiuni care cer un motiv (respingere, anulare etc.)
export function CasetaMotiv({ titlu, eticheta = 'Motiv', onConfirma, onRenunta, busy }) {
  const [motiv, setMotiv] = useState('')
  return (
    <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
      <p className="text-sm font-medium text-amber-800">{titlu}</p>
      <label className={labelCls}>{eticheta}</label>
      <textarea rows={2} className={inputCls} value={motiv} onChange={(e) => setMotiv(e.target.value)} />
      <div className="flex gap-2">
        <button disabled={!motiv.trim() || busy} onClick={() => onConfirma(motiv.trim())} className={btnPrimary}>
          Confirmă
        </button>
        <button onClick={onRenunta} className={btnGhost}>Renunță</button>
      </div>
    </div>
  )
}

export function Card({ children, className = '' }) {
  return <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>{children}</div>
}

export function Titlu({ children, actiuni }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-display text-lg font-semibold text-slate-800">{children}</h2>
      {actiuni && <div className="flex flex-wrap gap-2">{actiuni}</div>}
    </div>
  )
}
