import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { Plus, Pencil, Upload, Download, Tag } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { formatBani, parseBani, baniInText } from '../lib/bani'
import { formatData } from '../lib/luni'
import { azi, eroareBaza } from '../lib/util'
import { inputCls, labelCls, btnPrimary, btnGhost, cardCls } from '../lib/ui'
import { Titlu } from './comun'

const TIPURI = { servicii: 'Servicii', produse: 'Produse', ambele: 'Ambele' }
const MODURI = { fix: 'Fix', plafon: 'Plafon' }

const EMPTY = {
  denumire: '', um: '', pret: '', mod_pret: 'fix', tip: 'ambele',
  valabil_de_la: azi(), valabil_pana: '', activ: true,
}

function ziuaDinainte(data) {
  const d = new Date(`${data}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

export default function ListePrestabilite({ comune, reload }) {
  const [form, setForm] = useState(null) // { id?, pretNou?, ...EMPTY }
  const [filtruTip, setFiltruTip] = useState('')
  const [arataIstoric, setArataIstoric] = useState(false)
  const [cauta, setCauta] = useState('')
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [import_, setImport] = useState(null) // { randuri, erori }

  const astazi = azi()
  const vizibile = useMemo(
    () =>
      comune.liste.filter((l) => {
        if (filtruTip && l.tip !== filtruTip) return false
        if (cauta && !l.denumire.toLowerCase().includes(cauta.toLowerCase())) return false
        const curent = l.activ && l.valabil_de_la <= astazi && (!l.valabil_pana || l.valabil_pana >= astazi)
        return arataIstoric || curent || (l.activ && l.valabil_de_la > astazi)
      }),
    [comune.liste, filtruTip, arataIstoric, cauta, astazi]
  )

  function editeaza(l, pretNou = false) {
    setError('')
    setMsg('')
    setForm({
      id: pretNou ? undefined : l.id,
      veche: pretNou ? l : undefined,
      denumire: l.denumire,
      um: l.um,
      pret: baniInText(l.pret_bani),
      mod_pret: l.mod_pret,
      tip: l.tip,
      valabil_de_la: pretNou ? astazi : l.valabil_de_la,
      valabil_pana: pretNou ? '' : l.valabil_pana || '',
      activ: l.activ,
    })
  }

  async function salveaza(e) {
    e.preventDefault()
    setError('')
    setMsg('')
    const pret = parseBani(form.pret)
    if (!form.denumire.trim()) return setError('Scrie denumirea.')
    if (!form.um.trim()) return setError('Alege unitatea de măsură.')
    if (Number.isNaN(pret) || pret < 0) return setError('Prețul nu este valid (ex: 23,00).')
    if (!form.valabil_de_la) return setError('Alege data „valabil de la".')
    if (form.valabil_pana && form.valabil_pana < form.valabil_de_la) return setError('„Valabil până" nu poate fi înaintea lui „valabil de la".')

    const payload = {
      denumire: form.denumire.trim(),
      um: form.um.trim(),
      pret_bani: pret,
      mod_pret: form.mod_pret,
      tip: form.tip,
      valabil_de_la: form.valabil_de_la,
      valabil_pana: form.valabil_pana || null,
      activ: form.activ,
    }
    setBusy(true)
    let err = null
    if (form.id) {
      ;({ error: err } = await supabase.from('fin_liste').update(payload).eq('id', form.id))
    } else if (form.veche) {
      // preț nou: închidem versiunea veche în ziua dinainte, apoi adăugăm noua versiune
      const v = form.veche
      const pana = ziuaDinainte(form.valabil_de_la)
      const trebuieInchisa = !v.valabil_pana || v.valabil_pana > pana
      if (trebuieInchisa) {
        ;({ error: err } = await supabase.from('fin_liste').update({ valabil_pana: pana }).eq('id', v.id))
      }
      if (!err) {
        ;({ error: err } = await supabase.from('fin_liste').insert(payload))
        if (err && trebuieInchisa) await supabase.from('fin_liste').update({ valabil_pana: v.valabil_pana }).eq('id', v.id)
      }
    } else {
      ;({ error: err } = await supabase.from('fin_liste').insert(payload))
    }
    setBusy(false)
    if (err) return setError(eroareBaza(err))
    setForm(null)
    setMsg('Salvat.')
    reload()
  }

  /* ------------------------------ Import Excel ------------------------------ */
  const norm = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')

  function dataDinCelula(v) {
    if (v === undefined || v === null || v === '') return null
    if (v instanceof Date) {
      const d = new Date(v.getTime() + 12 * 3600 * 1000)
      return d.toISOString().slice(0, 10)
    }
    const s = String(v).trim()
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (m) return `${m[1]}-${m[2]}-${m[3]}`
    m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/)
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
    return undefined
  }

  async function alegeExcel(e) {
    setError('')
    setMsg('')
    setImport(null)
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })
      const randuri = []
      const erori = []
      rows.forEach((r, i) => {
        const o = {}
        for (const [k, v] of Object.entries(r)) o[norm(k)] = v
        const den = String(o.denumire ?? '').trim()
        if (!den) return
        const um = String(o.um ?? o.unitatedemasura ?? '').trim()
        const pret = parseBani(o.pret ?? o.pretfaratva ?? o.pretlei ?? '')
        const tip = norm(o.tip || 'ambele')
        const mod = norm(o.mod || 'fix')
        const de = dataDinCelula(o.valabildela) ?? azi()
        const pana = dataDinCelula(o.valabilpana)
        const linie = i + 2
        if (!um) return erori.push(`Rândul ${linie}: lipsește U.M.`)
        if (Number.isNaN(pret)) return erori.push(`Rândul ${linie}: prețul nu este valid.`)
        if (!['servicii', 'produse', 'ambele'].includes(tip)) return erori.push(`Rândul ${linie}: tip trebuie să fie servicii, produse sau ambele.`)
        if (!['fix', 'plafon'].includes(mod)) return erori.push(`Rândul ${linie}: mod trebuie să fie fix sau plafon.`)
        if (de === undefined || pana === undefined) return erori.push(`Rândul ${linie}: dată nerecunoscută (folosește zz.ll.aaaa).`)
        randuri.push({ denumire: den, um, pret_bani: pret, tip, mod_pret: mod, valabil_de_la: de, valabil_pana: pana, activ: true })
      })
      setImport({ randuri, erori })
    } catch {
      setError('Nu am putut citi fișierul Excel.')
    }
  }

  async function confirmaImport() {
    setBusy(true)
    setError('')
    const { error: err } = await supabase.from('fin_liste').insert(import_.randuri)
    setBusy(false)
    if (err) return setError(eroareBaza(err, 'Importul a eșuat. Nu s-a salvat nimic.'))
    setMsg(`${import_.randuri.length} elemente importate.`)
    setImport(null)
    reload()
  }

  function descarcaModel() {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Denumire', 'U.M.', 'Preț fără TVA', 'Tip', 'Mod', 'Valabil de la', 'Valabil până'],
      ['Indemnizație de deplasare', 'nr. de zile', '23,00', 'servicii', 'fix', '01.01.2026', ''],
      ['Indemnizație de cazare', 'nr. de nopți', '265,00', 'servicii', 'fix', '01.01.2026', ''],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Lista')
    XLSX.writeFile(wb, 'model-lista-prestabilita.xlsx')
  }

  return (
    <div className="space-y-4">
      <Titlu
        actiuni={
          <>
            <button onClick={() => { setForm({ ...EMPTY, valabil_de_la: azi() }); setError(''); setMsg('') }} className={btnPrimary}>
              <Plus size={14} /> Element nou
            </button>
            <label className={`${btnGhost} cursor-pointer`}>
              <Upload size={14} /> Import Excel
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={alegeExcel} />
            </label>
            <button onClick={descarcaModel} className={btnGhost}><Download size={14} /> Model Excel</button>
          </>
        }
      >
        Liste prestabilite (prețuri)
      </Titlu>
      <p className="text-sm text-slate-500">
        Prețurile din aceste liste sunt folosite la referate și deconturi. <strong>Fix</strong> = se folosește exact prețul;
        <strong> plafon</strong> = se poate pune mai puțin, nu mai mult (la depășire, salvarea e blocată). Toate sumele sunt fără TVA.
        Când prețul se schimbă prin lege, folosește „Preț nou" — documentele deja făcute își păstrează prețul vechi.
      </p>

      {import_ && (
        <div className={`${cardCls} space-y-2`}>
          <p className="text-sm font-medium text-slate-700">Import Excel: {import_.randuri.length} rânduri valide</p>
          {import_.erori.length > 0 && (
            <ul className="list-disc pl-5 text-sm text-amber-700">{import_.erori.map((e) => <li key={e}>{e}</li>)}</ul>
          )}
          {import_.randuri.length > 0 && (
            <ul className="max-h-48 overflow-auto text-xs text-slate-600">
              {import_.randuri.slice(0, 50).map((r, i) => (
                <li key={i}>{r.denumire} · {r.um} · {formatBani(r.pret_bani)} lei · {TIPURI[r.tip]} · {MODURI[r.mod_pret]}</li>
              ))}
            </ul>
          )}
          <p className="text-xs text-slate-500">Rândurile cu erori sunt ignorate. Dacă un rând se suprapune cu un preț existent, importul se oprește și nu salvează nimic.</p>
          <div className="flex gap-2">
            <button disabled={busy || import_.randuri.length === 0} onClick={confirmaImport} className={btnPrimary}>Importă {import_.randuri.length} elemente</button>
            <button onClick={() => setImport(null)} className={btnGhost}>Renunță</button>
          </div>
        </div>
      )}

      {form && (
        <form onSubmit={salveaza} className={`${cardCls} space-y-3`}>
          <h3 className="font-display text-base font-semibold text-slate-800">
            {form.veche ? `Preț nou pentru „${form.denumire}"` : form.id ? 'Modifică elementul' : 'Element nou'}
          </h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className={labelCls}>Denumire *</label>
              <input className={inputCls} value={form.denumire} disabled={!!form.veche} onChange={(e) => setForm({ ...form, denumire: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>U.M. *</label>
              <select className={inputCls} value={form.um} onChange={(e) => setForm({ ...form, um: e.target.value })}>
                <option value="">— Alege —</option>
                {comune.um.filter((u) => u.activ || u.denumire === form.um).map((u) => <option key={u.id} value={u.denumire}>{u.denumire}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Preț fără TVA (lei) *</label>
              <input className={inputCls} inputMode="decimal" placeholder="23,00" value={form.pret} onChange={(e) => setForm({ ...form, pret: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Preț</label>
              <select className={inputCls} value={form.mod_pret} onChange={(e) => setForm({ ...form, mod_pret: e.target.value })}>
                <option value="fix">Fix (exact acesta)</option>
                <option value="plafon">Plafon (cel mult acesta)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Folosit la</label>
              <select className={inputCls} value={form.tip} onChange={(e) => setForm({ ...form, tip: e.target.value })}>
                <option value="ambele">Servicii și produse</option>
                <option value="servicii">Doar servicii</option>
                <option value="produse">Doar produse</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Valabil de la *</label>
              <input type="date" className={inputCls} value={form.valabil_de_la} onChange={(e) => setForm({ ...form, valabil_de_la: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Valabil până (gol = nelimitat)</label>
              <input type="date" className={inputCls} value={form.valabil_pana} onChange={(e) => setForm({ ...form, valabil_pana: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 pt-6 text-sm text-slate-600">
              <input type="checkbox" checked={form.activ} onChange={(e) => setForm({ ...form, activ: e.target.checked })} /> Activ
            </label>
          </div>
          {form.veche && <p className="text-xs text-slate-500">La salvare, prețul vechi se închide automat în ziua dinainte de „valabil de la".</p>}
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex gap-2">
            <button disabled={busy} className={btnPrimary}>Salvează</button>
            <button type="button" onClick={() => setForm(null)} className={btnGhost}>Renunță</button>
          </div>
        </form>
      )}

      {!form && error && <p className="text-sm text-rose-600">{error}</p>}
      {msg && <p className="text-sm text-emerald-700">{msg}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <input className={`${inputCls} max-w-xs`} placeholder="Caută…" value={cauta} onChange={(e) => setCauta(e.target.value)} />
        <select className={`${inputCls} max-w-[200px]`} value={filtruTip} onChange={(e) => setFiltruTip(e.target.value)}>
          <option value="">Toate tipurile</option>
          <option value="servicii">Servicii</option>
          <option value="produse">Produse</option>
          <option value="ambele">Ambele</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={arataIstoric} onChange={(e) => setArataIstoric(e.target.checked)} /> Arată și versiunile vechi / inactive
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Denumire</th><th className="px-3 py-2">U.M.</th>
              <th className="px-3 py-2 text-right">Preț (lei)</th><th className="px-3 py-2">Preț</th>
              <th className="px-3 py-2">Tip</th><th className="px-3 py-2">Valabil</th><th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {vizibile.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-400">Niciun element.</td></tr>
            )}
            {vizibile.map((l) => {
              const curent = l.activ && l.valabil_de_la <= astazi && (!l.valabil_pana || l.valabil_pana >= astazi)
              return (
                <tr key={l.id} className={curent ? '' : 'text-slate-400'}>
                  <td className="px-3 py-2">{l.denumire}</td>
                  <td className="px-3 py-2">{l.um}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatBani(l.pret_bani)}</td>
                  <td className="px-3 py-2">{MODURI[l.mod_pret]}</td>
                  <td className="px-3 py-2">{TIPURI[l.tip]}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {formatData(l.valabil_de_la)} – {l.valabil_pana ? formatData(l.valabil_pana) : 'nelimitat'}
                    {!l.activ && ' (inactiv)'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-right">
                    <button onClick={() => editeaza(l)} className={btnGhost} title="Modifică"><Pencil size={13} /></button>{' '}
                    {curent && <button onClick={() => editeaza(l, true)} className={btnGhost}><Tag size={13} /> Preț nou</button>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
