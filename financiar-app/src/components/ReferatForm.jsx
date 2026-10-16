import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, ArrowUp, ArrowDown, Save, Send } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { esteAdmin } from '../lib/roluri'
import { parseBani, parseCantitate, formatBani, baniInText, formatCantitate, valoareLinie } from '../lib/bani'
import { azi, listaValida, eroareBaza } from '../lib/util'
import { inputCls, labelCls, btnPrimary, btnGhost, cardCls } from '../lib/ui'
import { Titlu } from './comun'

let cheie = 0
const linieGoala = () => ({
  key: ++cheie, lista_id: null, mod_pret: null, plafon: null,
  denumire: '', um: '', cantitate: '', pret: '', caracteristici: '',
})

export default function ReferatForm({ role, angajat, comune, referatId, onSaved, onCancel }) {
  const admin = esteAdmin(role)
  const editare = !!referatId
  const [loading, setLoading] = useState(editare)
  const [referat, setReferat] = useState(null)
  const [tip, setTip] = useState('servicii')
  const [autorId, setAutorId] = useState(angajat?.id || '')
  const [angajati, setAngajati] = useState([])
  const [motiv, setMotiv] = useState('')
  const [surseIds, setSurseIds] = useState([])
  const [linii, setLinii] = useState([])
  const [vechiIds, setVechiIds] = useState([])
  const [alegeLista, setAlegeLista] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const dataRef = referat?.data_intocmirii || azi()

  useEffect(() => {
    if (admin) {
      supabase.from('angajati').select('id, nume_complet').eq('activ', true).order('nume_complet')
        .then(({ data }) => setAngajati(data || []))
    }
  }, [admin])

  useEffect(() => {
    if (!editare) return
    async function load() {
      const [{ data: r }, { data: l }] = await Promise.all([
        supabase.from('fin_referate').select('*').eq('id', referatId).single(),
        supabase.from('fin_referate_linii').select('*').eq('referat_id', referatId).order('poz'),
      ])
      if (r) {
        setReferat(r)
        setTip(r.tip)
        setAutorId(r.autor_angajat_id)
        setMotiv(r.motiv || '')
        setSurseIds((r.surse || []).map((s) => s.id))
      }
      setVechiIds((l || []).map((x) => x.id))
      setLinii(
        (l || []).map((x) => {
          const el = comune.liste.find((e) => e.id === x.lista_id)
          return {
            key: ++cheie, lista_id: x.lista_id, mod_pret: el?.mod_pret || null, plafon: el && el.mod_pret === 'plafon' ? el.pret_bani : null,
            fix: el && el.mod_pret === 'fix' ? el.pret_bani : null,
            denumire: x.denumire, um: x.um, cantitate: formatCantitate(x.cantitate), pret: baniInText(x.pret_bani),
            caracteristici: x.caracteristici || '',
          }
        })
      )
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referatId])

  const elementeDisponibile = useMemo(
    () => comune.liste.filter((e) => listaValida(e, dataRef, tip)),
    [comune.liste, dataRef, tip]
  )

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
        key: ++cheie, lista_id: el.id, mod_pret: el.mod_pret,
        plafon: el.mod_pret === 'plafon' ? el.pret_bani : null,
        fix: el.mod_pret === 'fix' ? el.pret_bani : null,
        denumire: el.denumire, um: el.um, cantitate: '', pret: baniInText(el.pret_bani), caracteristici: '',
      },
    ])
    setAlegeLista('')
  }

  const valori = linii.map((l) => {
    const c = parseCantitate(l.cantitate)
    const p = parseBani(l.pret)
    return Number.isNaN(c) || Number.isNaN(p) ? 0 : valoareLinie(c, p)
  })
  const total = valori.reduce((s, v) => s + v, 0)

  function valideaza() {
    for (let i = 0; i < linii.length; i++) {
      const l = linii[i]
      const nr = `Linia ${i + 1}`
      if (!l.denumire.trim()) return `${nr}: scrie denumirea.`
      if (!l.um) return `${nr}: alege unitatea de măsură.`
      const c = parseCantitate(l.cantitate)
      if (Number.isNaN(c) || c <= 0) return `${nr}: cantitatea nu este validă.`
      const p = parseBani(l.pret)
      if (Number.isNaN(p) || p < 0) return `${nr}: prețul nu este valid (ex: 23,00).`
      if (l.mod_pret === 'fix' && p !== l.fix) return `${nr}: prețul din listă este fix (${formatBani(l.fix)} lei).`
      if (l.mod_pret === 'plafon' && p > l.plafon) return `${nr}: prețul depășește plafonul de ${formatBani(l.plafon)} lei.`
    }
    return ''
  }

  async function salveaza(trimite) {
    setError('')
    const v = valideaza()
    if (v) return setError(v)
    if (trimite) {
      if (linii.length === 0) return setError('Adaugă cel puțin o linie.')
      if (!motiv.trim()) return setError('Completează motivul.')
      if (surseIds.length === 0) return setError('Alege cel puțin o sursă de finanțare.')
    }
    setBusy(true)
    const surse = comune.surse.filter((s) => surseIds.includes(s.id)).map((s) => ({ id: s.id, denumire: s.denumire }))
    let id = referatId
    let err = null

    if (editare) {
      ;({ error: err } = await supabase.from('fin_referate').update({ tip, motiv: motiv.trim(), surse }).eq('id', id))
    } else {
      const { data, error: e } = await supabase
        .from('fin_referate')
        .insert({ tip, autor_angajat_id: admin ? autorId : angajat.id, motiv: motiv.trim(), surse })
        .select('id')
        .single()
      err = e
      id = data?.id
    }
    if (err) {
      setBusy(false)
      return setError(eroareBaza(err))
    }

    // liniile noi se adaugă întâi (o singură operație), apoi se șterg cele vechi
    if (linii.length > 0) {
      const payload = linii.map((l, i) => ({
        referat_id: id, poz: i + 1, lista_id: l.lista_id,
        denumire: l.denumire.trim(), um: l.um,
        cantitate: parseCantitate(l.cantitate), pret_bani: parseBani(l.pret),
        caracteristici: l.caracteristici.trim() || null,
      }))
      const { error: e } = await supabase.from('fin_referate_linii').insert(payload)
      if (e) {
        setBusy(false)
        return setError(eroareBaza(e))
      }
    }
    if (vechiIds.length > 0) {
      const { error: e } = await supabase.from('fin_referate_linii').delete().in('id', vechiIds)
      if (e) {
        setBusy(false)
        return setError(eroareBaza(e))
      }
    }

    if (trimite) {
      const { error: e } = await supabase.from('fin_referate').update({ stare: 'trimis' }).eq('id', id)
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

  const suntSingular = linii.length <= 1
  return (
    <div className="space-y-4">
      <Titlu actiuni={<button onClick={onCancel} className={btnGhost}>Renunță</button>}>
        {editare ? `Modifică ${referat?.cod || 'referatul'}` : 'Referat de necesitate nou'}
      </Titlu>

      <div className={`${cardCls} space-y-4`}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Achiziție de *</label>
            <div className="flex gap-4 pt-1.5 text-sm">
              {[['servicii', 'Servicii'], ['produse', 'Produse']].map(([v, l]) => (
                <label key={v} className="flex items-center gap-1.5">
                  <input type="radio" name="tip" checked={tip === v} onChange={() => setTip(v)} /> {l}
                </label>
              ))}
            </div>
          </div>
          {admin && !editare && (
            <div>
              <label className={labelCls}>Autor (în numele cui se face)</label>
              <select className={inputCls} value={autorId} onChange={(e) => setAutorId(e.target.value)}>
                {angajati.map((a) => <option key={a.id} value={a.id}>{a.nume_complet}</option>)}
              </select>
            </div>
          )}
        </div>
        <p className="text-xs text-slate-400">
          Autorul, funcția și data întocmirii se completează automat. Numărul și data de înregistrare se scriu de mână pe documentul tipărit.
        </p>
      </div>

      <div className={`${cardCls} space-y-3`}>
        <p className="text-sm font-medium text-slate-700">Linii ({tip === 'servicii' ? 'servicii' : 'produse'})</p>

        {linii.map((l, i) => (
          <div key={l.key} className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Poz. {i + 1} {l.lista_id ? '· din listă' : '· manual'}
                {l.mod_pret === 'plafon' && ` · plafon ${formatBani(l.plafon)} lei`}
                {l.mod_pret === 'fix' && ` · preț fix`}
              </span>
              <span className="flex gap-1">
                <button type="button" onClick={() => muta(i, -1)} className={btnGhost} title="Mai sus"><ArrowUp size={13} /></button>
                <button type="button" onClick={() => muta(i, 1)} className={btnGhost} title="Mai jos"><ArrowDown size={13} /></button>
                <button type="button" onClick={() => sterge(l.key)} className={btnGhost} title="Șterge linia"><Trash2 size={13} /></button>
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-12">
              <div className="sm:col-span-6">
                <label className={labelCls}>Denumire *</label>
                <input className={inputCls} value={l.denumire} onChange={(e) => upd(l.key, 'denumire', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>U.M. *</label>
                <select className={inputCls} value={l.um} disabled={!!l.lista_id} onChange={(e) => upd(l.key, 'um', e.target.value)}>
                  <option value="">—</option>
                  {[...comune.um.filter((u) => u.activ).map((u) => u.denumire), ...(l.um && !comune.um.some((u) => u.activ && u.denumire === l.um) ? [l.um] : [])].map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Cantitate *</label>
                <input className={inputCls} inputMode="decimal" value={l.cantitate} onChange={(e) => upd(l.key, 'cantitate', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Preț unitar (lei) *</label>
                <input className={inputCls} inputMode="decimal" value={l.pret} disabled={l.mod_pret === 'fix'} onChange={(e) => upd(l.key, 'pret', e.target.value)} />
              </div>
              <div className="sm:col-span-10">
                <label className={labelCls}>Caracteristici</label>
                <input className={inputCls} value={l.caracteristici} onChange={(e) => upd(l.key, 'caracteristici', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Valoare (lei)</label>
                <p className="py-2 text-sm font-semibold tabular-nums text-slate-700">{formatBani(valori[i])}</p>
              </div>
            </div>
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setLinii((ls) => [...ls, linieGoala()])} className={btnGhost}><Plus size={14} /> Linie manuală</button>
          <span className="text-xs text-slate-400">sau din listă:</span>
          <select className={`${inputCls} max-w-xs`} value={alegeLista} onChange={(e) => setAlegeLista(e.target.value)}>
            <option value="">— alege din lista prestabilită —</option>
            {elementeDisponibile.map((e) => (
              <option key={e.id} value={e.id}>{e.denumire} · {formatBani(e.pret_bani)} lei / {e.um}{e.mod_pret === 'plafon' ? ' (plafon)' : ''}</option>
            ))}
          </select>
          <button type="button" disabled={!alegeLista} onClick={adaugaDinLista} className={btnGhost}>Adaugă</button>
        </div>
        <p className="text-right text-sm text-slate-600">
          Valoarea estimată (fără TVA): <strong className="tabular-nums">{formatBani(total)} lei</strong>
        </p>
      </div>

      <div className={`${cardCls} space-y-3`}>
        <div>
          <label className={labelCls}>Motivul pentru care {suntSingular ? (tip === 'servicii' ? 'acest serviciu este necesar' : 'acest produs ne este necesar') : (tip === 'servicii' ? 'aceste servicii sunt necesare' : 'aceste produse ne sunt necesare')} *</label>
          <textarea rows={3} className={inputCls} value={motiv} onChange={(e) => setMotiv(e.target.value)} placeholder="ex: organizarea și buna desfășurare a evenimentelor din cadrul SEAS 2026" />
          <p className="mt-1 text-xs text-slate-400">În document apare: „Menționez că … pentru {motiv || '…'}." (punctul final se pune automat)</p>
        </div>
        <div>
          <label className={labelCls}>Sursa fondurilor *</label>
          <div className="flex flex-wrap gap-4 pt-1 text-sm">
            {comune.surse.filter((s) => s.activ || surseIds.includes(s.id)).map((s) => (
              <label key={s.id} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={surseIds.includes(s.id)}
                  onChange={(e) => setSurseIds((ids) => (e.target.checked ? [...ids, s.id] : ids.filter((x) => x !== s.id)))}
                />
                {s.denumire}
              </label>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button disabled={busy} onClick={() => salveaza(false)} className={btnPrimary}><Save size={14} /> {busy ? 'Se salvează…' : 'Salvează'}</button>
        {(!referat || referat.stare === 'ciorna') && (
          <button disabled={busy} onClick={() => salveaza(true)} className={btnGhost}><Send size={14} /> Salvează și trimite la aprobare</button>
        )}
      </div>
    </div>
  )
}
