import { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { usePostevConfig } from '../lib/usePostevConfig'
import { formatData } from '../lib/luni'
import { IMPLICARI } from '../lib/postev'
import {
  pregatesteRaport, campuriStatistici, filtreaza, pePeLuni, sumeazaPe, topLocalitati, toateLocalitatile,
} from '../lib/statistici'
import { exportaExcel } from '../lib/exportExcel'
import { inputCls, labelCls, btnPrimary, btnGhost, cardCls } from '../lib/ui'

const fmt = (n) => Number(n).toLocaleString('ro-RO')
const MAX_RANDURI = 200

export default function Dashboard() {
  const cfg = usePostevConfig()
  const [date, setDate] = useState(null)
  const [error, setError] = useState('')
  const [f, setF] = useState({ an: '', oras: '', tip: '', calitate: '' })
  const [metrica, setMetrica] = useState('spectatori')

  useEffect(() => {
    supabase.rpc('rap_dashboard_postev').then(({ data, error: err }) => {
      if (err) setError('Nu am putut încărca datele dashboardului.')
      setDate(data || [])
    })
  }, [])

  const rapoarte = useMemo(() => (date && !cfg.loading ? date.map((r) => pregatesteRaport(r, cfg)) : []), [date, cfg])
  const ani = useMemo(() => [...new Set(rapoarte.map((r) => r.an))].sort((a, b) => b - a), [rapoarte])

  // la prima încărcare alegem anul cel mai recent
  useEffect(() => {
    if (ani.length && !f.an) setF((x) => ({ ...x, an: ani[0] }))
  }, [ani]) // eslint-disable-line react-hooks/exhaustive-deps

  const stat = useMemo(() => campuriStatistici(cfg), [cfg])
  const orase = useMemo(() => toateLocalitatile(rapoarte), [rapoarte])
  const selectie = useMemo(() => filtreaza(rapoarte, f), [rapoarte, f])

  if (cfg.loading || date === null) return <p className="text-sm text-slate-500">Se încarcă…</p>
  if (error) return <p className="text-sm text-rose-600">{error}</p>

  const metricaCurenta = metrica === 'evenimente' ? { cod: 'evenimente', eticheta: 'Evenimente' } : stat.find((c) => c.cod === metrica) || stat[0]
  const cheieMetrica = metricaCurenta?.cod || 'evenimente'

  const kpis = [
    { label: 'Rapoarte aprobate', value: fmt(selectie.length) },
    { label: 'Evenimente', value: fmt(selectie.reduce((s, r) => s + r.evFiltrate, 0)) },
    ...stat.map((c) => ({ label: c.eticheta, value: fmt(selectie.reduce((s, r) => s + (r.metrici[c.cod] || 0), 0)) })),
  ]

  const luni = pePeLuni(selectie, cheieMetrica)
  const pelocalitati = topLocalitati(selectie, f.oras).slice(0, 8)
  const peTip = sumeazaPe(selectie, (r) => r.tipuri.map((c) => cfg.tipuri.find((t) => t.cod === c)?.nume || c), cheieMetrica)
  const peCalitate = IMPLICARI.map((c) => ({
    label: c,
    v: selectie.filter((r) => r.implicare === c).reduce((s, r) => s + r.evFiltrate, 0),
  }))
  const peResponsabil = sumeazaPe(selectie, (r) => r.responsabil, 'evenimente').slice(0, 8)
  const peEchipa = sumeazaPe(selectie, (r) => [...new Set((r.echipa || []).map((p) => p.nume))], 'evenimente').slice(0, 10)

  const setFiltru = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const reseteaza = () => setF({ an: ani[0] || '', oras: '', tip: '', calitate: '' })
  const sorted = [...selectie].sort((a, b) => b.data_inceput.localeCompare(a.data_inceput))
  const numeTip = (cod) => cfg.tipuri.find((t) => t.cod === cod)?.nume || cod

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">Rapoarte · Post-eveniment</p>
          <h2 className="font-display text-2xl font-bold text-slate-800">Statistici evenimente</h2>
          <p className="mt-1 text-xs text-slate-500">Doar rapoartele aprobate. Un eveniment cu mai multe tipuri se numără la fiecare tip.</p>
        </div>
        <button
          onClick={() => exportaExcel({ rapoarte: sorted, cfg, filtre: f, kpis })}
          disabled={selectie.length === 0}
          className={btnPrimary}
        >
          <Download size={15} /> Exportă în Excel
        </button>
      </div>

      <div className={`${cardCls} space-y-3`}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className={labelCls}>Perioadă (an)</label>
            <select className={inputCls} value={f.an} onChange={(e) => setFiltru('an', e.target.value)}>
              <option value="">Toți anii</option>
              {ani.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Oraș</label>
            <select className={inputCls} value={f.oras} onChange={(e) => setFiltru('oras', e.target.value)}>
              <option value="">Toate orașele</option>
              {orase.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Tip eveniment</label>
            <select className={inputCls} value={f.tip} onChange={(e) => setFiltru('tip', e.target.value)}>
              <option value="">Toate tipurile</option>
              {cfg.tipuri.map((t) => <option key={t.cod} value={t.cod}>{t.nume}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Calitatea CNCM-MC</label>
            <select className={inputCls} value={f.calitate} onChange={(e) => setFiltru('calitate', e.target.value)}>
              <option value="">Toate</option>
              {IMPLICARI.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={reseteaza} className={btnGhost}>Resetează filtrele</button>
          </div>
        </div>
        <p className="text-sm text-slate-500">
          {selectie.length === 1 ? '1 raport în selecție' : `${selectie.length} rapoarte în selecție`}
          {f.oras ? ` · la filtrul pe oraș, „Evenimente" numără doar evenimentele din ${f.oras}; celelalte cifre sunt ale întregului raport.` : ''}
        </p>
      </div>

      {rapoarte.length === 0 ? (
        <p className={`${cardCls} text-sm text-slate-500`}>Nu există încă rapoarte aprobate.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {kpis.map((k) => (
              <div key={k.label} className={`${cardCls} !p-4`}>
                <p className="text-xs font-semibold text-slate-500">{k.label}</p>
                <p className="font-display text-3xl font-bold leading-tight text-slate-800">{k.value}</p>
              </div>
            ))}
          </div>

          <div className={`${cardCls} space-y-3`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-lg font-semibold text-slate-800">{metricaCurenta?.eticheta || 'Evenimente'} pe luni</h3>
                <p className="text-xs text-slate-500">După luna de început a evenimentului, cu filtrele de mai sus aplicate</p>
              </div>
              <div className="w-56">
                <label className={labelCls}>Indicator (pe luni și pe tip)</label>
                <select className={inputCls} value={cheieMetrica} onChange={(e) => setMetrica(e.target.value)}>
                  <option value="evenimente">Evenimente</option>
                  {stat.map((c) => <option key={c.cod} value={c.cod}>{c.eticheta}</option>)}
                </select>
              </div>
            </div>
            <Coloane date={luni} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Panou titlu="Top localități" sub="Număr de evenimente"><Bare date={pelocalitati} /></Panou>
            <Panou titlu="Pe tip de eveniment" sub={metricaCurenta?.eticheta}><Bare date={peTip} /></Panou>
            <Panou titlu="Pe calitatea CNCM-MC" sub="Număr de evenimente"><Bare date={peCalitate} /></Panou>
            <Panou titlu="Responsabili de eveniment" sub="Evenimente conduse"><Bare date={peResponsabil} /></Panou>
            <Panou titlu="Echipa de organizare" sub="La câte evenimente a participat fiecare"><Bare date={peEchipa} /></Panou>
          </div>

          <div className={`${cardCls} space-y-3`}>
            <div>
              <h3 className="font-display text-lg font-semibold text-slate-800">Rapoartele din selecție</h3>
              <p className="text-xs text-slate-500">Un rând pe eveniment. Exportul în Excel conține aceleași rânduri{sorted.length > MAX_RANDURI ? `; aici se afișează primele ${MAX_RANDURI}` : ''}.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs text-slate-500">
                  <tr>
                    <th className="px-2 py-2">Eveniment</th>
                    <th className="px-2 py-2">Tip</th>
                    <th className="px-2 py-2">Localități</th>
                    <th className="px-2 py-2">Perioadă</th>
                    <th className="px-2 py-2">Calitate</th>
                    {stat.slice(0, 3).map((c) => <th key={c.cod} className="px-2 py-2 text-right">{c.eticheta.replace(/^Numărul (de |dirijorilor de |corurilor |copiilor )?/i, '')}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {sorted.slice(0, MAX_RANDURI).map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="px-2 py-2 font-medium text-slate-800">{r.denumire_oficiala}</td>
                      <td className="px-2 py-2">{r.tipuri.map(numeTip).join(', ')}</td>
                      <td className="px-2 py-2">{r.localitati.map((l) => `${l.localitate} × ${l.nr}`).join(', ')}</td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        {formatData(r.data_inceput)}{r.data_sfarsit !== r.data_inceput ? ` – ${formatData(r.data_sfarsit)}` : ''}
                      </td>
                      <td className="px-2 py-2">{r.implicare}</td>
                      {stat.slice(0, 3).map((c) => (
                        <td key={c.cod} className="px-2 py-2 text-right">{r.metrici[c.cod] === undefined ? '—' : fmt(r.metrici[c.cod])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {selectie.length === 0 && <p className="p-4 text-center text-sm text-slate-500">Niciun raport nu corespunde filtrelor alese.</p>}
          </div>
        </>
      )}
    </div>
  )
}

function Panou({ titlu, sub, children }) {
  return (
    <div className={`${cardCls} space-y-3`}>
      <div>
        <h3 className="font-display text-base font-semibold text-slate-800">{titlu}</h3>
        {sub && <p className="text-xs text-slate-500">{sub}</p>}
      </div>
      {children}
    </div>
  )
}

// bare orizontale: eticheta și valoarea sunt text, bara e doar proporția
function Bare({ date }) {
  const max = Math.max(1, ...date.map((d) => d.v))
  if (date.length === 0) return <p className="text-sm text-slate-400">Fără date.</p>
  return (
    <div className="space-y-2.5">
      {date.map((d) => (
        <div key={d.label} title={`${d.label}: ${fmt(d.v)}`}>
          <div className="flex justify-between gap-2 text-sm">
            <span className="min-w-0 truncate font-medium text-slate-700">{d.label}</span>
            <span className="text-slate-500">{fmt(d.v)}</span>
          </div>
          <div className="mt-1 h-2.5 rounded-full bg-slate-100">
            <div className="h-2.5 rounded-full bg-accent" style={{ width: `${d.v === 0 ? 0 : Math.max(3, Math.round((d.v / max) * 100))}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function Coloane({ date }) {
  const max = Math.max(1, ...date.map((d) => d.v))
  return (
    <div className="overflow-x-auto">
      <div className="flex h-52 min-w-[640px] items-end gap-2.5 pt-2">
        {date.map((d) => (
          <div key={d.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5" title={`${d.luna}: ${fmt(d.v)}`}>
            <span className="text-xs font-semibold text-slate-700">{d.v === 0 ? '' : fmt(d.v)}</span>
            <div
              className="w-full max-w-[44px] rounded-t-md bg-accent"
              style={{ height: d.v === 0 ? 0 : Math.max(4, Math.round((d.v / max) * 140)) }}
            />
            <span className="text-xs font-semibold text-slate-500">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
