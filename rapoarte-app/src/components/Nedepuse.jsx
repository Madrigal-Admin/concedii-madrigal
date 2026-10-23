import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { LUNI } from '../lib/luni'
import { inputCls, labelCls } from '../lib/ui'

export default function Nedepuse() {
  const acum = new Date()
  const prev = new Date(acum.getFullYear(), acum.getMonth() - 1, 1)
  const [an, setAn] = useState(prev.getFullYear())
  const [luna, setLuna] = useState(prev.getMonth() + 1)
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    supabase.rpc('rap_nedepuse', { p_an: an, p_luna: luna }).then(({ data }) => {
      setLista(data || [])
      setLoading(false)
    })
  }, [an, luna])

  const ani = []
  for (let a = acum.getFullYear(); a >= acum.getFullYear() - 3; a--) ani.push(a)

  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg font-semibold text-slate-800">Cine nu a depus</h2>

      <div className="grid max-w-md gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Luna</label>
          <select className={inputCls} value={luna} onChange={(e) => setLuna(Number(e.target.value))}>
            {LUNI.map((l, i) => <option key={l} value={i + 1}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>An</label>
          <select className={inputCls} value={an} onChange={(e) => setAn(Number(e.target.value))}>
            {ani.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Se încarcă…</p>
      ) : lista.length === 0 ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          Toate contractele active în această lună au raport depus.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Nume</th>
                <th className="px-4 py-2">Calitate</th>
                <th className="px-4 py-2">Departament</th>
                <th className="px-4 py-2">Obiect contract</th>
                <th className="px-4 py-2">Nr. contract</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((r) => (
                <tr key={r.contract_id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium text-slate-800">{r.nume}</td>
                  <td className="px-4 py-2">{r.calitate === 'cedent' ? 'Cedent' : r.calitate === 'prestator' ? 'Prestator' : <span className="text-amber-600">necompletată</span>}</td>
                  <td className="px-4 py-2">{r.departament || '—'}</td>
                  <td className="px-4 py-2">{r.obiect}</td>
                  <td className="px-4 py-2">{r.numar_contract}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">{lista.length} contracte fără raport.</p>
        </div>
      )}
    </div>
  )
}
