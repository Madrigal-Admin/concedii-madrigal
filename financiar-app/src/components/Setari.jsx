import { useState } from 'react'
import { Plus } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { inputCls, labelCls, btnPrimary, btnGhost } from '../lib/ui'
import { Card, Titlu } from './comun'
import { eroareBaza } from '../lib/util'

export default function Setari({ comune, reload }) {
  const [tab, setTab] = useState('um')
  return (
    <div className="space-y-4">
      <Titlu>Setări</Titlu>
      <div className="flex gap-1 border-b border-slate-200">
        {[['um', 'Unități de măsură'], ['surse', 'Surse de finanțare'], ['semnatari', 'Semnatari Avizat / Aprobat']].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              tab === k ? 'border-accent text-accent' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {l}
          </button>
        ))}
      </div>
      {tab === 'um' && (
        <ListaSimpla
          tabel="fin_um"
          randuri={comune.um}
          reload={reload}
          ajutor="Unitățile alese la liniile din referat (buc, litri, nr. de zile…). Una dezactivată nu mai apare la alegere, dar rămâne în documentele vechi."
        />
      )}
      {tab === 'surse' && (
        <ListaSimpla
          tabel="fin_surse"
          randuri={comune.surse}
          reload={reload}
          ajutor="Textul de aici apare exact așa în referat: „Fondurile aferente achiziției – venituri proprii, bugetul statului”."
        />
      )}
      {tab === 'semnatari' && <Semnatari setari={comune.setari} reload={reload} />}
    </div>
  )
}

function ListaSimpla({ tabel, randuri, reload, ajutor }) {
  const [nou, setNou] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function adauga(e) {
    e.preventDefault()
    if (!nou.trim()) return
    setBusy(true)
    setError('')
    const ordine = (randuri.reduce((m, r) => Math.max(m, r.ordine || 0), 0)) + 1
    const { error: err } = await supabase.from(tabel).insert({ denumire: nou.trim(), ordine })
    setBusy(false)
    if (err) return setError(err.code === '23505' ? 'Există deja o înregistrare cu acest nume.' : eroareBaza(err))
    setNou('')
    reload()
  }

  async function comuta(r) {
    await supabase.from(tabel).update({ activ: !r.activ }).eq('id', r.id)
    reload()
  }

  async function redenumeste(r) {
    const nume = window.prompt('Denumire nouă:', r.denumire)
    if (!nume || !nume.trim() || nume.trim() === r.denumire) return
    const { error: err } = await supabase.from(tabel).update({ denumire: nume.trim() }).eq('id', r.id)
    if (err) setError(err.code === '23505' ? 'Există deja o înregistrare cu acest nume.' : eroareBaza(err))
    else reload()
  }

  return (
    <Card className="space-y-3">
      <p className="text-xs text-slate-500">{ajutor}</p>
      <form onSubmit={adauga} className="flex gap-2">
        <input className={`${inputCls} max-w-xs`} placeholder="Adaugă…" value={nou} onChange={(e) => setNou(e.target.value)} />
        <button disabled={busy || !nou.trim()} className={btnPrimary}><Plus size={14} /> Adaugă</button>
      </form>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <ul className="divide-y divide-slate-100">
        {randuri.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-2 py-2 text-sm">
            <span className={r.activ ? 'text-slate-800' : 'text-slate-400 line-through'}>{r.denumire}</span>
            <span className="flex gap-2">
              <button onClick={() => redenumeste(r)} className={btnGhost}>Redenumește</button>
              <button onClick={() => comuta(r)} className={btnGhost}>{r.activ ? 'Dezactivează' : 'Activează'}</button>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function Semnatari({ setari, reload }) {
  const [f, setF] = useState({
    avizat_functie: setari?.avizat_functie || '',
    avizat_nume: setari?.avizat_nume || '',
    aprobat_functie: setari?.aprobat_functie || '',
    aprobat_nume: setari?.aprobat_nume || '',
  })
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))

  async function salveaza(e) {
    e.preventDefault()
    setMsg('')
    setError('')
    const { error: err } = await supabase.from('fin_setari').upsert({ id: 1, ...f })
    if (err) return setError(eroareBaza(err))
    setMsg('Salvat. Referatele deja aprobate păstrează semnatarii de la momentul aprobării.')
    reload()
  }

  return (
    <Card>
      <form onSubmit={salveaza} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className={labelCls}>Avizat – funcția</label><input className={inputCls} value={f.avizat_functie} onChange={set('avizat_functie')} /></div>
          <div><label className={labelCls}>Avizat – numele</label><input className={inputCls} value={f.avizat_nume} onChange={set('avizat_nume')} /></div>
          <div><label className={labelCls}>Aprobat – funcția</label><input className={inputCls} value={f.aprobat_functie} onChange={set('aprobat_functie')} /></div>
          <div><label className={labelCls}>Aprobat – numele</label><input className={inputCls} value={f.aprobat_nume} onChange={set('aprobat_nume')} /></div>
        </div>
        <p className="text-xs text-slate-500">
          Apar în colțul de sus al referatului. Un referat își păstrează semnatarii din momentul aprobării; ciornele și cele trimise folosesc semnatarii de aici.
        </p>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        {msg && <p className="text-sm text-emerald-700">{msg}</p>}
        <button className={btnPrimary}>Salvează</button>
      </form>
    </Card>
  )
}
