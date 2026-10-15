import { useEffect, useMemo, useState } from 'react'
import { Send, CheckCircle2 } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { etichetaPerioada } from '../lib/luni'
import { inputCls, labelCls, btnPrimary } from '../lib/ui'
import CampuriExtra, { valideazaExtra } from './CampuriExtra'

const MESAJE = {
  raspuns_gresit: 'Răspunsul la întrebarea de verificare nu este corect.',
  prea_multe: 'Prea multe încercări. Te rugăm să revii mai târziu.',
  contract_invalid: 'Contractul ales nu este disponibil.',
  activitati_lipsa: 'Descrie activitățile desfășurate.',
  prea_lung: 'Textul este prea lung.',
  respins: 'Nu am putut trimite raportul.',
}

function mesajEroare(err) {
  const t = err?.message || ''
  if (err?.code === '23505') return 'Există deja un raport pentru această lună și acest contract.'
  if (t.includes('camp_obligatoriu')) return `Câmpul „${t.split(':')[1]?.trim()}" este obligatoriu.`
  for (const [k, v] of Object.entries(MESAJE)) if (t.includes(k)) return v
  if (t.includes('luni încheiate') || t.includes('valabilitate') || t.includes('Contractul')) return t
  return 'Nu am putut trimite raportul. Încearcă din nou.'
}

// Pagina publică (fără cont) pentru colaboratorii externi.
export default function ExternPage() {
  const [lista, setLista] = useState([])
  const [campuri, setCampuri] = useState([])
  const [loading, setLoading] = useState(true)
  const [persoanaId, setPersoanaId] = useState('')
  const [contractId, setContractId] = useState('')
  const [perioade, setPerioade] = useState([])
  const [perioada, setPerioada] = useState('')
  const [activitati, setActivitati] = useState('')
  const [extra, setExtra] = useState({})
  const [raspuns, setRaspuns] = useState('')
  const [capcana, setCapcana] = useState('')
  const [a, setA] = useState(() => 1 + Math.floor(Math.random() * 9))
  const [b, setB] = useState(() => 1 + Math.floor(Math.random() * 9))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [gata, setGata] = useState(false)

  useEffect(() => {
    Promise.all([supabase.rpc('rap_extern_lista'), supabase.rpc('rap_extern_campuri')]).then(([l, c]) => {
      setLista(l.data || [])
      setCampuri(c.data || [])
      setLoading(false)
    })
  }, [])

  const persoane = useMemo(() => {
    const m = new Map()
    for (const r of lista) if (!m.has(r.persoana_id)) m.set(r.persoana_id, r.nume)
    return [...m.entries()].map(([id, nume]) => ({ id, nume }))
  }, [lista])

  const contractePersoana = lista.filter((r) => r.persoana_id === persoanaId)

  useEffect(() => {
    setContractId(contractePersoana.length === 1 ? contractePersoana[0].contract_id : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persoanaId])

  useEffect(() => {
    setPerioada('')
    if (!contractId) return setPerioade([])
    supabase.rpc('rap_extern_perioade', { p_contract: contractId }).then(({ data }) => setPerioade(data || []))
  }, [contractId])

  function intrebareNoua() {
    setA(1 + Math.floor(Math.random() * 9))
    setB(1 + Math.floor(Math.random() * 9))
    setRaspuns('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!persoanaId) return setError('Alege numele tău.')
    if (!contractId) return setError('Alege contractul.')
    if (!perioada) return setError('Alege luna.')
    if (!activitati.trim()) return setError('Descrie activitățile desfășurate.')
    const err = valideazaExtra(campuri, extra)
    if (err) return setError(err)
    if (raspuns === '') return setError('Răspunde la întrebarea de verificare.')

    setSaving(true)
    const [an, luna] = perioada.split('-').map(Number)
    const { error: e2 } = await supabase.rpc('rap_extern_depune', {
      p_contract: contractId,
      p_an: an,
      p_luna: luna,
      p_activitati: activitati.trim(),
      p_extra: extra,
      p_a: a,
      p_b: b,
      p_raspuns: Number(raspuns),
      p_capcana: capcana,
    })
    setSaving(false)
    if (e2) {
      setError(mesajEroare(e2))
      if ((e2.message || '').includes('raspuns_gresit')) intrebareNoua()
      return
    }
    setGata(true)
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-5 py-4">
        <p className="font-display text-base font-semibold text-slate-800">Madrigal · Raport de activitate</p>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        {loading ? (
          <p className="text-sm text-slate-500">Se încarcă…</p>
        ) : gata ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
            <CheckCircle2 className="mx-auto mb-2 text-emerald-600" size={32} />
            <p className="font-medium text-emerald-800">Raportul a fost trimis.</p>
            <p className="mt-1 text-sm text-emerald-700">Mulțumim! Va fi verificat de echipa Madrigal.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h1 className="font-display text-lg font-semibold text-slate-800">Raport de activitate – colaborator extern</h1>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Numele tău <span className="text-rose-500">*</span></label>
                <select className={inputCls} value={persoanaId} onChange={(e) => setPersoanaId(e.target.value)}>
                  <option value="">— Alege —</option>
                  {persoane.map((p) => <option key={p.id} value={p.id}>{p.nume}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Contract <span className="text-rose-500">*</span></label>
                <select className={inputCls} value={contractId} onChange={(e) => setContractId(e.target.value)} disabled={!persoanaId}>
                  <option value="">{persoanaId ? '— Alege —' : 'Alege întâi numele'}</option>
                  {contractePersoana.map((c) => (
                    <option key={c.contract_id} value={c.contract_id}>
                      {c.obiect}{c.numar_contract ? ` · nr. ${c.numar_contract}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls}>Luna raportată <span className="text-rose-500">*</span></label>
              <select className={inputCls} value={perioada} onChange={(e) => setPerioada(e.target.value)} disabled={!contractId}>
                <option value="">{contractId ? '— Alege luna —' : 'Alege întâi contractul'}</option>
                {perioade.map((p) => (
                  <option key={`${p.an}-${p.luna}`} value={`${p.an}-${p.luna}`}>{etichetaPerioada(p.luna, p.an)}</option>
                ))}
              </select>
              {contractId && perioade.length === 0 && (
                <p className="mt-1 text-xs text-slate-400">Nu ai nicio lună încheiată fără raport pentru acest contract.</p>
              )}
            </div>

            <div>
              <label className={labelCls}>Activități desfășurate <span className="text-rose-500">*</span></label>
              <textarea rows={10} className={inputCls} value={activitati} onChange={(e) => setActivitati(e.target.value)} />
            </div>

            <CampuriExtra campuri={campuri} valori={extra} onChange={(cod, v) => setExtra((x) => ({ ...x, [cod]: v }))} />

            {/* câmp-capcană: ascuns oamenilor, completat de roboți */}
            <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', height: 0, overflow: 'hidden' }}>
              <label>Nu completa acest câmp</label>
              <input tabIndex={-1} autoComplete="off" value={capcana} onChange={(e) => setCapcana(e.target.value)} />
            </div>

            <div className="max-w-[200px]">
              <label className={labelCls}>Verificare: cât face {a} + {b}? <span className="text-rose-500">*</span></label>
              <input type="number" inputMode="numeric" className={inputCls} value={raspuns} onChange={(e) => setRaspuns(e.target.value)} />
            </div>

            {error && <p className="text-sm text-rose-600">{error}</p>}

            <button type="submit" disabled={saving} className={btnPrimary}>
              <Send size={14} /> {saving ? 'Se trimite…' : 'Trimite raportul'}
            </button>
          </form>
        )}
      </main>
    </div>
  )
}
