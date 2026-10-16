import { useCallback, useEffect, useState } from 'react'
import { Pencil, Send, FileDown, Check, Ban, Undo2 } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { STARI_DECONT, esteAdmin } from '../lib/roluri'
import { formatBani } from '../lib/bani'
import { formatData } from '../lib/luni'
import { totaluriDecont, sexT } from '../lib/documente'
import { sumaInLitere } from '../lib/sumaLitere'
import { eroareBaza } from '../lib/util'
import { descarcaDecontWord } from '../lib/generareWord'
import { inputCls, labelCls, btnPrimary, btnGhost, btnDanger } from '../lib/ui'
import { StareBadge, Istoric, CasetaMotiv, Card, Titlu } from './comun'

export default function DecontDetaliu({ id, role, onBack, onEdit, onDeschideReferat }) {
  const admin = esteAdmin(role)
  const [d, setD] = useState(null)
  const [linii, setLinii] = useState([])
  const [ref, setRef] = useState(null)
  const [motivPentru, setMotivPentru] = useState(null)
  const [nrInreg, setNrInreg] = useState('')
  const [dataInreg, setDataInreg] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [reloadIstoric, setReloadIstoric] = useState(0)

  const load = useCallback(async () => {
    const [{ data: dec }, { data: l }] = await Promise.all([
      supabase.from('fin_deconturi').select('*').eq('id', id).single(),
      supabase.from('fin_deconturi_linii').select('*').eq('decont_id', id).order('nr'),
    ])
    setD(dec)
    setLinii(l || [])
    setNrInreg(dec?.nr_inregistrare || '')
    setDataInreg(dec?.data_inregistrare || '')
    if (dec) {
      const { data: r } = await supabase
        .from('fin_referate')
        .select('id, cod, fin_referate_linii(valoare_bani)')
        .eq('id', dec.referat_id)
        .maybeSingle()
      setRef(r)
    }
    setReloadIstoric((x) => x + 1)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function schimbaStarea(stare, motiv) {
    setBusy(true)
    setError('')
    setMsg('')
    const { error: err } = await supabase.from('fin_deconturi').update({ stare, motiv_stare: motiv ?? null }).eq('id', id)
    setBusy(false)
    if (err) return setError(eroareBaza(err))
    setMotivPentru(null)
    load()
  }

  async function salveazaInregistrare() {
    setBusy(true)
    setError('')
    const { error: err } = await supabase
      .from('fin_deconturi')
      .update({ nr_inregistrare: nrInreg.trim() || null, data_inregistrare: dataInreg || null })
      .eq('id', id)
    setBusy(false)
    if (err) return setError(eroareBaza(err))
    setMsg('Salvat.')
    load()
  }

  async function descarca() {
    setBusy(true)
    setError('')
    try {
      await descarcaDecontWord(d, linii)
    } catch (e) {
      setError(e.message || 'Nu am putut genera documentul.')
    }
    setBusy(false)
  }

  if (!d) return <p className="text-sm text-slate-500">Se încarcă…</p>

  const t = totaluriDecont(d, linii)
  const estimat = ref ? ref.fin_referate_linii.reduce((s, l) => s + Number(l.valoare_bani), 0) : 0
  const editabil = d.stare === 'ciorna' || d.stare === 'depus'

  return (
    <div className="space-y-4">
      <Titlu actiuni={<button onClick={onBack} className={btnGhost}>Înapoi la listă</button>}>
        {d.cod} · Decont de cheltuieli
      </Titlu>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-slate-600">
            <p><strong>{d.autor_nume}</strong>{d.autor_functie ? ` · ${d.autor_functie}` : ''}</p>
            <p className="text-xs text-slate-400">
              Perioada {formatData(d.perioada_de_la)} – {formatData(d.perioada_pana)}
              {d.deplasare && d.plecare_data ? ` · plecare ${formatData(d.plecare_data)} ${(d.plecare_ora || '').slice(0, 5)}` : ''}
              {d.deplasare && d.sosire_data ? ` · sosire ${formatData(d.sosire_data)} ${(d.sosire_ora || '').slice(0, 5)}` : ''}
            </p>
            {ref && (
              <p className="text-xs text-slate-400">
                Referat: <button className="text-accent hover:underline" onClick={() => onDeschideReferat(ref.id)}>{ref.cod}</button> · estimat {formatBani(estimat)} lei
              </p>
            )}
          </div>
          <StareBadge stare={d.stare} mapa={STARI_DECONT} />
        </div>

        {d.stare === 'depus' && (
          <p className="rounded-lg bg-sky-50 p-3 text-xs text-sky-700">
            Dacă modifici decontul acum, tipărește-l din nou și înlocuiește varianta depusă.
          </p>
        )}
        {d.motiv_stare && d.stare === 'depus' && (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800"><strong>Redeschis:</strong> {d.motiv_stare}</p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr><th className="px-2 py-1.5">Nr.</th><th className="px-2 py-1.5">Felul actului și emitentul</th><th className="px-2 py-1.5">Nr. și data actului</th><th className="px-2 py-1.5 text-right">Suma (lei)</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {linii.map((l, i) => (
                <tr key={l.id}>
                  <td className="px-2 py-1.5">{i + 1}</td><td className="px-2 py-1.5">{l.denumire}</td>
                  <td className="px-2 py-1.5">{l.tip === 'lista' ? '' : l.nr_data_act}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{formatBani(l.suma_bani)}</td>
                </tr>
              ))}
              {linii.length === 0 && <tr><td colSpan={4} className="px-2 py-4 text-center text-slate-400">Borderou gol.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <p>Avans primit: <strong className="tabular-nums">{formatBani(d.avans_bani)} lei</strong></p>
          <p>Avans primit în timpul perioadei: <strong className="tabular-nums">{formatBani(d.avans_parcurs_bani)} lei</strong></p>
          <p>Total primit: <strong className="tabular-nums">{formatBani(t.primit)} lei</strong></p>
          <p>Total cheltuit: <strong className="tabular-nums">{formatBani(t.cheltuit)} lei</strong></p>
          <p>Diferență de primit: <strong className="tabular-nums">{t.dePrimit > 0 ? `${formatBani(t.dePrimit)} lei` : '—'}</strong></p>
          <p>Diferență de restituit: <strong className="tabular-nums">{t.deRestituit > 0 ? `${formatBani(t.deRestituit)} lei` : '—'}</strong></p>
        </div>
        <p className="text-sm text-slate-600"><strong>Suma în litere:</strong> {sumaInLitere(t.cheltuit)}</p>
        {d.obiective_delegatie && <p className="text-sm text-slate-600"><strong>Obiectivul delegației:</strong> {d.obiective_delegatie}</p>}

        {error && <p className="text-sm text-rose-600">{error}</p>}
        {msg && <p className="text-sm text-emerald-700">{msg}</p>}

        {motivPentru && (
          <CasetaMotiv
            titlu={motivPentru === 'redeschis' ? 'Redeschide decontul' : 'Anulează decontul'}
            eticheta="Motiv *"
            busy={busy}
            onConfirma={(m) => schimbaStarea(motivPentru === 'redeschis' ? 'depus' : 'anulat', m)}
            onRenunta={() => setMotivPentru(null)}
          />
        )}

        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          <button onClick={descarca} disabled={busy} className={btnPrimary}><FileDown size={14} /> Descarcă Word</button>
          {editabil && <button onClick={onEdit} className={btnGhost}><Pencil size={14} /> Modifică</button>}
          {d.stare === 'ciorna' && <button disabled={busy} onClick={() => schimbaStarea('depus')} className={btnGhost}><Send size={14} /> Marchează „Depus"</button>}
          {d.stare === 'depus' && <button disabled={busy} onClick={() => schimbaStarea('ciorna')} className={btnGhost}><Undo2 size={14} /> Revino la ciornă</button>}
          {admin && d.stare === 'depus' && <button disabled={busy} onClick={() => schimbaStarea('verificat')} className={btnPrimary}><Check size={14} /> Marchează verificat</button>}
          {admin && d.stare === 'verificat' && <button disabled={busy} onClick={() => setMotivPentru('redeschis')} className={btnGhost}><Undo2 size={14} /> Redeschide</button>}
          {(d.stare === 'ciorna' || d.stare === 'depus') && (
            <button disabled={busy} onClick={() => (d.stare === 'depus' ? setMotivPentru('anulat') : schimbaStarea('anulat'))} className={btnDanger}>
              <Ban size={14} /> Anulează
            </button>
          )}
        </div>
      </Card>

      {admin && d.stare !== 'anulat' && (
        <Card className="space-y-3">
          <p className="text-sm font-medium text-slate-700">Evidență (doar Admin Financiar)</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div><label className={labelCls}>Nr. înregistrare</label><input className={inputCls} value={nrInreg} onChange={(e) => setNrInreg(e.target.value)} /></div>
            <div><label className={labelCls}>Data înregistrării</label><input type="date" className={inputCls} value={dataInreg} onChange={(e) => setDataInreg(e.target.value)} /></div>
            <div className="flex items-end"><button disabled={busy} onClick={salveazaInregistrare} className={btnGhost}>Salvează</button></div>
          </div>
          <p className="text-xs text-slate-400">Doar pentru evidență; nu se tipărește în document.</p>
        </Card>
      )}

      <Istoric docTip="decont" docId={id} reload={reloadIstoric} />
    </div>
  )
}
