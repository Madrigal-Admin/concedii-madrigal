import { useEffect, useMemo, useState } from 'react'
import { Check, X, Eye, RotateCcw, Pencil } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { LUNI } from '../lib/luni'
import { STARI } from '../lib/roluri'
import { inputCls, labelCls, btnGhost, btnPrimary, btnDanger } from '../lib/ui'
import RaportCard from './RaportCard'
import RaportForm from './RaportForm'

const LIMITA = 300

export default function Verificare() {
  const [loading, setLoading] = useState(true)
  const [rapoarte, setRapoarte] = useState([])
  const [campuri, setCampuri] = useState([])
  const [filtruStare, setFiltruStare] = useState('')
  const [filtruAn, setFiltruAn] = useState('')
  const [filtruLuna, setFiltruLuna] = useState('')
  const [cauta, setCauta] = useState('')
  const [motivPentru, setMotivPentru] = useState(null) // { id, tip: 'respins' | 'redeschis' }
  const [motiv, setMotiv] = useState('')
  const [editat, setEditat] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [{ data: r }, { data: f }] = await Promise.all([
      supabase
        .from('rap_activitate')
        .select('*, contract:rap_contracte(*, persoana:rap_persoane(*))')
        .order('an', { ascending: false })
        .order('luna', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(LIMITA),
      supabase.from('rap_campuri').select('*').eq('modul', 'activitate').eq('activ', true).order('ordine'),
    ])
    setRapoarte(r || [])
    setCampuri(f || [])
    setLoading(false)
  }

  async function schimbaStarea(id, stare, motivText) {
    setError('')
    const { error: err } = await supabase
      .from('rap_activitate')
      .update({ stare, motiv_stare: motivText ?? null })
      .eq('id', id)
    if (err) {
      setError(err.message || 'Nu am putut schimba starea.')
      return
    }
    setMotivPentru(null)
    setMotiv('')
    load()
  }

  const ani = useMemo(() => [...new Set(rapoarte.map((r) => r.an))].sort((a, b) => b - a), [rapoarte])

  const filtrate = rapoarte.filter((r) => {
    if (filtruStare && r.stare !== filtruStare) return false
    if (filtruAn && String(r.an) !== filtruAn) return false
    if (filtruLuna && String(r.luna) !== filtruLuna) return false
    if (cauta && !(r.contract?.persoana?.nume || '').toLowerCase().includes(cauta.toLowerCase())) return false
    return true
  })

  if (editat) {
    return (
      <RaportForm
        contracte={[editat.contract]}
        campuri={campuri}
        raport={editat}
        onCancel={() => setEditat(null)}
        onSaved={() => {
          setEditat(null)
          load()
        }}
      />
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg font-semibold text-slate-800">Rapoarte de activitate de verificat</h2>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-4">
        <div>
          <label className={labelCls}>Stare</label>
          <select className={inputCls} value={filtruStare} onChange={(e) => setFiltruStare(e.target.value)}>
            <option value="">Toate</option>
            {Object.entries(STARI).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
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
          <label className={labelCls}>Caută după nume</label>
          <input className={inputCls} value={cauta} onChange={(e) => setCauta(e.target.value)} />
        </div>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Se încarcă…</p>}
      {!loading && filtrate.length === 0 && <p className="text-sm text-slate-500">Niciun raport pentru filtrele alese.</p>}
      {rapoarte.length >= LIMITA && (
        <p className="text-xs text-slate-400">Se afișează ultimele {LIMITA} rapoarte; folosește filtrele pentru a le restrânge.</p>
      )}

      {filtrate.map((r) => (
        <div key={r.id} className="space-y-2">
          <RaportCard
            raport={r}
            contract={r.contract}
            persoana={r.contract?.persoana}
            campuri={campuri}
            aratAutor
            aratIntarziere
            actiuni={
              <>
                {r.stare === 'trimis' && (
                  <button onClick={() => schimbaStarea(r.id, 'in_verificare')} className={btnGhost}>
                    <Eye size={14} /> Preia în verificare
                  </button>
                )}
                {(r.stare === 'trimis' || r.stare === 'in_verificare') && (
                  <>
                    <button onClick={() => schimbaStarea(r.id, 'aprobat')} className={btnPrimary}>
                      <Check size={14} /> Aprobă
                    </button>
                    <button onClick={() => { setMotivPentru({ id: r.id, tip: 'respins' }); setMotiv('') }} className={btnDanger}>
                      <X size={14} /> Respinge
                    </button>
                  </>
                )}
                {r.stare === 'aprobat' && (
                  <button onClick={() => { setMotivPentru({ id: r.id, tip: 'redeschis' }); setMotiv('') }} className={btnGhost}>
                    <RotateCcw size={14} /> Redeschide
                  </button>
                )}
                {r.stare !== 'aprobat' && (
                  <button onClick={() => setEditat(r)} className={btnGhost}>
                    <Pencil size={14} /> Editează
                  </button>
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
                <button
                  disabled={!motiv.trim()}
                  onClick={() => schimbaStarea(r.id, motivPentru.tip === 'respins' ? 'respins' : 'in_verificare', motiv.trim())}
                  className={btnPrimary}
                >
                  Confirmă
                </button>
                <button onClick={() => setMotivPentru(null)} className={btnGhost}>Anulează</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
