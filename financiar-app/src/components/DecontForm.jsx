import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, ArrowUp, ArrowDown, Save, Send } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { parseBani, parseCantitate, formatBani, baniInText, formatCantitate, valoareLinie } from '../lib/bani'
import { totaluriDecont } from '../lib/documente'
import { azi, listaValida, eroareBaza } from '../lib/util'
import { inputCls, labelCls, btnPrimary, btnGhost, cardCls } from '../lib/ui'
import { Titlu } from './comun'

let cheie = 0

export default function DecontForm({ role, comune, decontId, referatId: referatInitial, onSaved, onCancel }) {
  const editare = !!decontId
  const [loading, setLoading] = useState(true)
  const [referate, setReferate] = useState([])
  const [referatId, setReferatId] = useState(referatInitial || '')
  const [decont, setDecont] = useState(null)
  const [f, setF] = useState({
    de_la: '', pana: '', deplasare: false,
    plecare_data: '', plecare_ora: '', sosire_data: '', sosire_ora: '',
    avans: '0,00', avans_parcurs: '0,00', obiective: '',
  })
  const [linii, setLinii] = useState([])
  const [vechiIds, setVechiIds] = useState([])
  const [alegeLista, setAlegeLista] = useState('')
  const [cheltuitAlte, setCheltuitAlte] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))

  useEffect(() => {
    async function load() {
      const { data: refs } = await supabase
        .from('fin_referate')
        .select('id, cod, tip, autor_nume, motiv, fin_referate_linii(valoare_bani)')
        .eq('stare', 'aprobat')
        .order('created_at', { ascending: false })
      setReferate(refs || [])
      if (editare) {
        const [{ data: d }, { data: l }] = await Promise.all([
          supabase.from('fin_deconturi').select('*').eq('id', decontId).single(),
          supabase.from('fin_deconturi_linii').select('*').eq('decont_id', decontId).order('nr'),
        ])
        if (d) {
          setDecont(d)
          setReferatId(d.referat_id)
          setF({
            de_la: d.perioada_de_la, pana: d.perioada_pana, deplasare: d.deplasare,
            plecare_data: d.plecare_data || '', plecare_ora: (d.plecare_ora || '').slice(0, 5),
            sosire_data: d.sosire_data || '', sosire_ora: (d.sosire_ora || '').slice(0, 5),
            avans: baniInText(d.avans_bani), avans_parcurs: baniInText(d.avans_parcurs_bani), obiective: d.obiective_delegatie || '',
          })
        }
        setVechiIds((l || []).map((x) => x.id))
        setLinii(
          (l || []).map((x) => {
            const el = comune.liste.find((e) => e.id === x.lista_id)
            return {
              key: ++cheie, tip: x.tip, lista_id: x.lista_id, mod_pret: el?.mod_pret || null,
              plafon: el?.mod_pret === 'plafon' ? el.pret_bani : null, fix: el?.mod_pret === 'fix' ? el.pret_bani : null,
              denumire: x.denumire, nr_data_act: x.nr_data_act || '',
              cantitate: x.cantitate === null ? '' : formatCantitate(x.cantitate),
              pret: x.pret_bani === null ? '' : baniInText(x.pret_bani), suma: baniInText(x.suma_bani),
            }
          })
        )
      }
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decontId])

  const referat = referate.find((r) => r.id === referatId)
  const estimat = referat ? referat.fin_referate_linii.reduce((s, l) => s + Number(l.valoare_bani), 0) : 0

  // cât s-a cheltuit deja în ALTE deconturi active ale aceluiași referat
  useEffect(() => {
    if (!referatId) return setCheltuitAlte(0)
    supabase.rpc('fin_referat_cheltuit', { p_referat: referatId }).then(async ({ data }) => {
      let total = Number(data || 0)
      if (editare && decont && decont.stare !== 'anulat') {
        const { data: l } = await supabase.from('fin_deconturi_linii').select('suma_bani').eq('decont_id', decontId)
        total -= (l || []).reduce((s, x) => s + Number(x.suma_bani), 0)
      }
      setCheltuitAlte(total)
    })
  }, [referatId, editare, decont, decontId])

  const elemente = useMemo(() => comune.liste.filter((e) => listaValida(e, azi(), null)), [comune.liste])

  const upd = (key, camp, val) => setLinii((ls) => ls.map((l) => (l.key === key ? { ...l, [camp]: val } : l)))
  const sterge = (key) => setLinii((ls) => ls.filter((l) => l.key !== key))
  const muta = (i, d) =>
    setLinii((ls) => {
      const j = i + d
      if (j < 0 || j >= ls.length) return ls
      const c = [...ls]
      ;[c[i], c[j]] = [c[j], c[i]]
      return c
    })

  function adaugaDinLista() {
    const el = comune.liste.find((e) => e.id === alegeLista)
    if (!el) return
    setLinii((ls) => [
      ...ls,
      {
        key: ++cheie, tip: 'lista', lista_id: el.id, mod_pret: el.mod_pret,
        plafon: el.mod_pret === 'plafon' ? el.pret_bani : null, fix: el.mod_pret === 'fix' ? el.pret_bani : null,
        denumire: `Cheltuieli listă ${el.denumire.charAt(0).toLowerCase()}${el.denumire.slice(1)}`,
        nr_data_act: '', cantitate: '', pret: baniInText(el.pret_bani), suma: '',
      },
    ])
    setAlegeLista('')
  }
  const adaugaAct = () =>
    setLinii((ls) => [...ls, { key: ++cheie, tip: 'act', lista_id: null, mod_pret: null, denumire: '', nr_data_act: '', cantitate: '', pret: '', suma: '' }])

  // suma fiecărei linii (în bani) pentru calcule și afișare
  const sume = linii.map((l) => {
    if (l.tip === 'lista') {
      const c = parseCantitate(l.cantitate)
      const p = parseBani(l.pret)
      return Number.isNaN(c) || Number.isNaN(p) ? 0 : valoareLinie(c, p)
    }
    const s = parseBani(l.suma)
    return Number.isNaN(s) ? 0 : s
  })

  const avansB = parseBani(f.avans)
  const avansPB = parseBani(f.avans_parcurs)
  const t = totaluriDecont(
    { avans_bani: Number.isNaN(avansB) ? 0 : avansB, avans_parcurs_bani: Number.isNaN(avansPB) ? 0 : avansPB },
    sume.map((s) => ({ suma_bani: s }))
  )
  const depasire = referat && cheltuitAlte + t.cheltuit > estimat

  function valideaza() {
    if (!referatId) return 'Alege referatul.'
    if (!f.de_la || !f.pana) return 'Completează perioada cheltuielilor.'
    if (f.pana < f.de_la) return 'Perioada nu este validă („până" înaintea lui „de la").'
    if (Number.isNaN(avansB) || avansB < 0) return 'Avansul primit nu este valid (ex: 0,00).'
    if (Number.isNaN(avansPB) || avansPB < 0) return 'Avansul primit în timpul perioadei nu este valid.'
    for (let i = 0; i < linii.length; i++) {
      const l = linii[i]
      const nr = `Borderou, linia ${i + 1}`
      if (!l.denumire.trim()) return `${nr}: scrie ${l.tip === 'act' ? 'felul actului și emitentul' : 'denumirea'}.`
      if (l.tip === 'act') {
        if (!l.nr_data_act.trim()) return `${nr}: completează numărul și data actului.`
        const s = parseBani(l.suma)
        if (Number.isNaN(s) || s < 0) return `${nr}: suma nu este validă.`
      } else {
        const c = parseCantitate(l.cantitate)
        if (Number.isNaN(c) || c <= 0) return `${nr}: cantitatea nu este validă.`
        const p = parseBani(l.pret)
        if (Number.isNaN(p) || p < 0) return `${nr}: prețul nu este valid.`
        if (l.mod_pret === 'fix' && p !== l.fix) return `${nr}: prețul din listă este fix (${formatBani(l.fix)} lei).`
        if (l.mod_pret === 'plafon' && p > l.plafon) return `${nr}: prețul depășește plafonul de ${formatBani(l.plafon)} lei.`
      }
    }
    return ''
  }

  async function salveaza(depune) {
    setError('')
    const v = valideaza()
    if (v) return setError(v)
    if (depune && linii.length === 0) return setError('Adaugă cel puțin o linie în borderou.')
    setBusy(true)
    const payload = {
      perioada_de_la: f.de_la, perioada_pana: f.pana, deplasare: f.deplasare,
      plecare_data: f.deplasare && f.plecare_data ? f.plecare_data : null,
      plecare_ora: f.deplasare && f.plecare_data && f.plecare_ora ? f.plecare_ora : null,
      sosire_data: f.deplasare && f.sosire_data ? f.sosire_data : null,
      sosire_ora: f.deplasare && f.sosire_data && f.sosire_ora ? f.sosire_ora : null,
      avans_bani: avansB, avans_parcurs_bani: avansPB, obiective_delegatie: f.obiective.trim() || null,
    }
    let id = decontId
    let err = null
    if (editare) {
      ;({ error: err } = await supabase.from('fin_deconturi').update(payload).eq('id', id))
    } else {
      const { data, error: e } = await supabase.from('fin_deconturi').insert({ referat_id: referatId, ...payload }).select('id').single()
      err = e
      id = data?.id
    }
    if (err) {
      setBusy(false)
      return setError(eroareBaza(err))
    }
    if (linii.length > 0) {
      const rows = linii.map((l, i) => ({
        decont_id: id, nr: i + 1, tip: l.tip, lista_id: l.tip === 'lista' ? l.lista_id : null,
        denumire: l.denumire.trim(), nr_data_act: l.tip === 'act' ? l.nr_data_act.trim() : null,
        cantitate: l.tip === 'lista' ? parseCantitate(l.cantitate) : null,
        pret_bani: l.tip === 'lista' ? parseBani(l.pret) : null,
        suma_bani: sume[i],
      }))
      const { error: e } = await supabase.from('fin_deconturi_linii').insert(rows)
      if (e) {
        setBusy(false)
        return setError(eroareBaza(e))
      }
    }
    if (vechiIds.length > 0) {
      const { error: e } = await supabase.from('fin_deconturi_linii').delete().in('id', vechiIds)
      if (e) {
        setBusy(false)
        return setError(eroareBaza(e))
      }
    }
    if (depune) {
      const { error: e } = await supabase.from('fin_deconturi').update({ stare: 'depus' }).eq('id', id)
      if (e) {
        setBusy(false)
        setError(eroareBaza(e))
        return onSaved(id)
      }
    }
    setBusy(false)
    onSaved(id)
  }

  if (loading) return <p className="text-sm text-slate-500">Se încarcă…</p>

  return (
    <div className="space-y-4">
      <Titlu actiuni={<button onClick={onCancel} className={btnGhost}>Renunță</button>}>
        {editare ? `Modifică ${decont?.cod || 'decontul'}` : 'Decont de cheltuieli nou'}
      </Titlu>

      <div className={`${cardCls} space-y-3`}>
        <div>
          <label className={labelCls}>Referatul aprobat *</label>
          <select className={inputCls} value={referatId} disabled={editare || !!referatInitial} onChange={(e) => setReferatId(e.target.value)}>
            <option value="">— Alege referatul —</option>
            {referate.map((r) => <option key={r.id} value={r.id}>{r.cod} · {r.autor_nume} · {(r.motiv || '').slice(0, 70)}</option>)}
          </select>
          {referate.length === 0 && <p className="mt-1 text-xs text-amber-700">Nu există referate aprobate. Decontul se poate crea doar pentru un referat aprobat.</p>}
        </div>
        {referat && (
          <p className="text-xs text-slate-500">
            Estimat în referat: <strong>{formatBani(estimat)} lei</strong>
            {cheltuitAlte > 0 && <> · cheltuit în alte deconturi: <strong>{formatBani(cheltuitAlte)} lei</strong></>}
            {' '}· autor decont: <strong>{referat.autor_nume}</strong> (preluat din referat)
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-4">
          <div><label className={labelCls}>Perioada: de la *</label><input type="date" className={inputCls} value={f.de_la} onChange={(e) => set('de_la', e.target.value)} /></div>
          <div><label className={labelCls}>până la *</label><input type="date" className={inputCls} value={f.pana} onChange={(e) => set('pana', e.target.value)} /></div>
          <label className="flex items-center gap-2 pt-6 text-sm text-slate-700">
            <input type="checkbox" checked={f.deplasare} onChange={(e) => set('deplasare', e.target.checked)} /> Cu deplasare
          </label>
        </div>
        {f.deplasare && (
          <div className="grid gap-3 sm:grid-cols-4">
            <div><label className={labelCls}>Data plecării</label><input type="date" className={inputCls} value={f.plecare_data} onChange={(e) => set('plecare_data', e.target.value)} /></div>
            <div><label className={labelCls}>Ora plecării</label><input type="time" className={inputCls} value={f.plecare_ora} onChange={(e) => set('plecare_ora', e.target.value)} /></div>
            <div><label className={labelCls}>Data sosirii</label><input type="date" className={inputCls} value={f.sosire_data} onChange={(e) => set('sosire_data', e.target.value)} /></div>
            <div><label className={labelCls}>Ora sosirii</label><input type="time" className={inputCls} value={f.sosire_ora} onChange={(e) => set('sosire_ora', e.target.value)} /></div>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <div><label className={labelCls}>Avans primit (lei) *</label><input className={inputCls} inputMode="decimal" value={f.avans} onChange={(e) => set('avans', e.target.value)} /></div>
          <div><label className={labelCls}>Avans primit în timpul perioadei (lei) *</label><input className={inputCls} inputMode="decimal" value={f.avans_parcurs} onChange={(e) => set('avans_parcurs', e.target.value)} /></div>
        </div>
      </div>

      <div className={`${cardCls} space-y-3`}>
        <p className="text-sm font-medium text-slate-700">Borderoul actelor justificative (sume fără TVA)</p>
        {linii.map((l, i) => (
          <div key={l.key} className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Nr. {i + 1} · {l.tip === 'lista' ? 'din listă prestabilită' : 'act justificativ'}
                {l.mod_pret === 'plafon' && ` · plafon ${formatBani(l.plafon)} lei`}
                {l.mod_pret === 'fix' && ' · preț fix'}
              </span>
              <span className="flex gap-1">
                <button type="button" onClick={() => muta(i, -1)} className={btnGhost}><ArrowUp size={13} /></button>
                <button type="button" onClick={() => muta(i, 1)} className={btnGhost}><ArrowDown size={13} /></button>
                <button type="button" onClick={() => sterge(l.key)} className={btnGhost}><Trash2 size={13} /></button>
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-12">
              <div className={l.tip === 'lista' ? 'sm:col-span-6' : 'sm:col-span-5'}>
                <label className={labelCls}>{l.tip === 'lista' ? 'Denumire (poți modifica textul) *' : 'Felul actului și emitentul *'}</label>
                <input className={inputCls} value={l.denumire} onChange={(e) => upd(l.key, 'denumire', e.target.value)} placeholder={l.tip === 'act' ? 'ex: BF OMV PETROM MARKETING SRL' : ''} />
              </div>
              {l.tip === 'act' ? (
                <>
                  <div className="sm:col-span-4">
                    <label className={labelCls}>Nr. și data actului *</label>
                    <input className={inputCls} value={l.nr_data_act} onChange={(e) => upd(l.key, 'nr_data_act', e.target.value)} placeholder="102 / 04.08.2026" />
                  </div>
                  <div className="sm:col-span-3">
                    <label className={labelCls}>Suma (lei) *</label>
                    <input className={inputCls} inputMode="decimal" value={l.suma} onChange={(e) => upd(l.key, 'suma', e.target.value)} />
                  </div>
                </>
              ) : (
                <>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Cantitate *</label>
                    <input className={inputCls} inputMode="decimal" value={l.cantitate} onChange={(e) => upd(l.key, 'cantitate', e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Preț unitar (lei)</label>
                    <input className={inputCls} inputMode="decimal" value={l.pret} disabled={l.mod_pret === 'fix'} onChange={(e) => upd(l.key, 'pret', e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Suma (lei)</label>
                    <p className="py-2 text-sm font-semibold tabular-nums text-slate-700">{formatBani(sume[i])}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={adaugaAct} className={btnGhost}><Plus size={14} /> Act justificativ</button>
          <span className="text-xs text-slate-400">sau din listă:</span>
          <select className={`${inputCls} max-w-xs`} value={alegeLista} onChange={(e) => setAlegeLista(e.target.value)}>
            <option value="">— alege din lista prestabilită —</option>
            {elemente.map((e) => <option key={e.id} value={e.id}>{e.denumire} · {formatBani(e.pret_bani)} lei / {e.um}</option>)}
          </select>
          <button type="button" disabled={!alegeLista} onClick={adaugaDinLista} className={btnGhost}>Adaugă</button>
        </div>
      </div>

      <div className={`${cardCls} space-y-2`}>
        <div className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <p>Total primit: <strong className="tabular-nums">{formatBani(t.primit)} lei</strong></p>
          <p>Total cheltuit (borderou): <strong className="tabular-nums">{formatBani(t.cheltuit)} lei</strong></p>
          <p>Diferență de primit: <strong className="tabular-nums">{t.dePrimit > 0 ? `${formatBani(t.dePrimit)} lei` : '—'}</strong></p>
          <p>Diferență de restituit: <strong className="tabular-nums">{t.deRestituit > 0 ? `${formatBani(t.deRestituit)} lei` : '—'}</strong></p>
        </div>
        {depasire && (
          <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-800">
            Atenție: cheltuielile ({formatBani(cheltuitAlte + t.cheltuit)} lei, împreună cu celelalte deconturi) depășesc valoarea estimată din referat ({formatBani(estimat)} lei). Poți salva, dar Adminul Financiar va vedea semnalul.
          </p>
        )}
        <div>
          <label className={labelCls}>Obiectivul delegației (opțional – gol = se completează de mână)</label>
          <input className={inputCls} value={f.obiective} onChange={(e) => set('obiective', e.target.value)} placeholder="ex: Au fost îndeplinite toate obiectivele prevăzute." />
        </div>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button disabled={busy} onClick={() => salveaza(false)} className={btnPrimary}><Save size={14} /> {busy ? 'Se salvează…' : 'Salvează'}</button>
        {(!decont || decont.stare === 'ciorna') && (
          <button disabled={busy} onClick={() => salveaza(true)} className={btnGhost}><Send size={14} /> Salvează și marchează „Depus"</button>
        )}
      </div>
    </div>
  )
}
