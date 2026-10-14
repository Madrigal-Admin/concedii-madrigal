import { useEffect, useState } from 'react'
import { Check, X, Eye, RotateCcw, Pencil } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { STARI } from '../lib/roluri'
import { LUNI } from '../lib/luni'
import { inputCls, labelCls, btnGhost, btnPrimary, btnDanger } from '../lib/ui'
import { usePostevConfig } from '../lib/usePostevConfig'
import PostevCard from './PostevCard'
import PostevForm from './PostevForm'

const LIMITA = 300

export default function PostevAdmin({ angajat }) {
  const cfg = usePostevConfig()
  const [rapoarte, setRapoarte] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtruStare, setFiltruStare] = useState('')
  const [filtruAn, setFiltruAn] = useState('')
  const [filtruLuna, setFiltruLuna] = useState('')
  const [filtruTip, setFiltruTip] = useState('')
  const [cauta, setCauta] = useState('')
  const [motivPentru, setMotivPentru] = useState(null)
  const [motiv, setMotiv] = useState('')
  const [editat, setEditat] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('rap_postev').select('*').order('data_inceput', { ascending: false }).limit(LIMITA)
    setRapoarte(data || [])
    setLoading(false)
  }

  async function schimbaStarea(id, stare, motivText) {
    setError('')
    const { error: err } = await supabase.from('rap_postev').update({ stare, motiv_stare: motivText ?? null }).eq('id', id)
    if (err) return setError(err.message || 'Nu am putut schimba starea.')
    setMotivPentru(null)
    setMotiv('')
    load()
  }

  if (cfg.loading || loading) return <p className="text-sm text-slate-500">Se încarcă…</p>

  if (editat) {
    return (
      <PostevForm
        key={editat.id}
        raport={editat}
        eveniment={null}
        cfg={cfg}
        angajatCurent={angajat}
        onCancel={() => setEditat(null)}
        onSaved={() => { setEditat(null); load() }}
      />
    )
  }

  const ani = [...new Set(rapoarte.map((r) => Number(r.data_inceput.slice(0, 4))))].sort((a, b) => b - a)
  const filtrate = rapoarte.filter((r) => {
    if (filtruStare && r.stare !== filtruStare) return false
    if (filtruAn && r.data_inceput.slice(0, 4) !== filtruAn) return false
    if (filtruLuna && Number(r.data_inceput.slice(5, 7)) !== Number(filtruLuna)) return false
    if (filtruTip && !(r.tipuri || []).includes(filtruTip)) return false
    if (cauta && !(r.denumire_oficiala || '').toLowerCase().includes(cauta.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg font-semibold text-slate-800">Rapoarte post-eveniment de verificat</h2>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-5">
        <div>
          <label className={labelCls}>Stare</label>
          <select className={inputCls} value={filtruStare} onChange={(e) => setFiltruStare(e.target.value)}>
            <option value="">Toate</option>
            {Object.entries(STARI).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Tip</label>
          <select className={inputCls} value={filtruTip} onChange={(e) => setFiltruTip(e.target.value)}>
            <option value="">Toate</option>
            {cfg.tipuri.map((t) => <option key={t.cod} value={t.cod}>{t.nume}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>An</label>
          <select className={inputCls} value={filtruAn} onChange={(e) => setFiltruAn(e.target.value)}>
            <option value="">Toți</option>
            {ani.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Luna</label>
          <select className={inputCls} value={filtruLuna} onChange={(e) => setFiltruLuna(e.target.value)}>
            <option value="">Toate</option>
            {LUNI.map((l, i) => <option key={l} value={i + 1}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Caută</label>
          <input className={inputCls} value={cauta} onChange={(e) => setCauta(e.target.value)} />
        </div>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {filtrate.length === 0 && <p className="text-sm text-slate-500">Niciun raport pentru filtrele alese.</p>}
      {rapoarte.length >= LIMITA && <p className="text-xs text-slate-400">Se afișează ultimele {LIMITA} rapoarte; folosește filtrele.</p>}

      {filtrate.map((r) => (
        <div key={r.id} className="space-y-2">
          <PostevCard
            raport={r}
            cfg={cfg}
            actiuni={
              <>
                {r.stare === 'trimis' && (
                  <button onClick={() => schimbaStarea(r.id, 'in_verificare')} className={btnGhost}><Eye size={14} /> Preia în verificare</button>
                )}
                {(r.stare === 'trimis' || r.stare === 'in_verificare') && (
                  <>
                    <button onClick={() => schimbaStarea(r.id, 'aprobat')} className={btnPrimary}><Check size={14} /> Aprobă</button>
                    <button onClick={() => { setMotivPentru({ id: r.id, tip: 'respins' }); setMotiv('') }} className={btnDanger}><X size={14} /> Respinge</button>
                  </>
                )}
                {r.stare === 'aprobat' && (
                  <button onClick={() => { setMotivPentru({ id: r.id, tip: 'redeschis' }); setMotiv('') }} className={btnGhost}>
                    <RotateCcw size={14} /> Redeschide
                  </button>
                )}
                {r.stare !== 'aprobat' && (
                  <button onClick={() => setEditat(r)} className={btnGhost}><Pencil size={14} /> Editează</button>
                )}
              </>
            }
          />
          {motivPentru?.id === r.id && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <label className={labelCls}>
                {motivPentru.tip === 'respins' ? 'Motivul respingerii' : 'Motivul redeschiderii (raportul iese din statistici și revine „În verificare")'}
              </label>
              <textarea rows={3} className={inputCls} value={motiv} onChange={(e) => setMotiv(e.target.value)} />
              <div className="mt-2 flex gap-2">
                <button disabled={!motiv.trim()} onClick={() => schimbaStarea(r.id, motivPentru.tip === 'respins' ? 'respins' : 'in_verificare', motiv.trim())} className={btnPrimary}>Confirmă</button>
                <button onClick={() => setMotivPentru(null)} className={btnGhost}>Anulează</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
