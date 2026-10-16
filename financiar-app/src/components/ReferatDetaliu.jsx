import { useCallback, useEffect, useState } from 'react'
import { Pencil, Send, FileDown, Check, X, Ban, Undo2, FilePlus2, Paperclip, ExternalLink } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { STARI_REFERAT, STARI_DECONT, esteAdmin } from '../lib/roluri'
import { formatBani, formatCantitate } from '../lib/bani'
import { formatData } from '../lib/luni'
import { eroareBaza } from '../lib/util'
import { descarcaReferatWord } from '../lib/generareWord'
import { inputCls, labelCls, btnPrimary, btnGhost, btnDanger } from '../lib/ui'
import { StareBadge, Istoric, CasetaMotiv, Card, Titlu } from './comun'

export default function ReferatDetaliu({ id, role, comune, onBack, onEdit, onCreeazaDecont, onDeschideDecont }) {
  const admin = esteAdmin(role)
  const [r, setR] = useState(null)
  const [linii, setLinii] = useState([])
  const [deconturi, setDeconturi] = useState([])
  const [cheltuit, setCheltuit] = useState(0)
  const [motivPentru, setMotivPentru] = useState(null) // 'respins' | 'anulat'
  const [nrInreg, setNrInreg] = useState('')
  const [dataInreg, setDataInreg] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [reloadIstoric, setReloadIstoric] = useState(0)

  const load = useCallback(async () => {
    const [{ data: ref }, { data: l }, { data: d }] = await Promise.all([
      supabase.from('fin_referate').select('*').eq('id', id).single(),
      supabase.from('fin_referate_linii').select('*').eq('referat_id', id).order('poz'),
      supabase.from('fin_deconturi').select('*, fin_deconturi_linii(suma_bani)').eq('referat_id', id).order('created_at'),
    ])
    setR(ref)
    setLinii(l || [])
    setDeconturi(d || [])
    setNrInreg(ref?.nr_inregistrare || '')
    setDataInreg(ref?.data_inregistrare || '')
    setReloadIstoric((x) => x + 1)
    if (ref?.stare === 'aprobat') {
      const { data: c } = await supabase.rpc('fin_referat_cheltuit', { p_referat: id })
      setCheltuit(Number(c || 0))
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function schimbaStarea(stare, motiv) {
    setBusy(true)
    setError('')
    setMsg('')
    const { error: err } = await supabase.from('fin_referate').update({ stare, motiv_stare: motiv ?? null }).eq('id', id)
    setBusy(false)
    if (err) return setError(eroareBaza(err))
    setMotivPentru(null)
    load()
  }

  async function salveazaInregistrare() {
    setBusy(true)
    setError('')
    const { error: err } = await supabase
      .from('fin_referate')
      .update({ nr_inregistrare: nrInreg.trim() || null, data_inregistrare: dataInreg || null })
      .eq('id', id)
    setBusy(false)
    if (err) return setError(eroareBaza(err))
    setMsg('Salvat.')
    load()
  }

  async function incarcaScan(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 10 * 1024 * 1024) return setError('Fișierul depășește 10 MB.')
    setBusy(true)
    setError('')
    const sigur = file.name.replace(/[^A-Za-z0-9._-]+/g, '_')
    const path = `${id}/${Date.now()}-${sigur}`
    const { error: up } = await supabase.storage.from('financiar-scanuri').upload(path, file)
    if (up) {
      setBusy(false)
      return setError('Nu am putut încărca scanul.')
    }
    const { error: err } = await supabase.from('fin_referate').update({ scan_path: path }).eq('id', id)
    setBusy(false)
    if (err) return setError(eroareBaza(err))
    setMsg('Scanul a fost încărcat.')
    load()
  }

  async function deschideScan() {
    const { data, error: err } = await supabase.storage.from('financiar-scanuri').createSignedUrl(r.scan_path, 120)
    if (err || !data) return setError('Nu am putut deschide scanul.')
    window.open(data.signedUrl, '_blank')
  }

  async function descarca() {
    setBusy(true)
    setError('')
    try {
      await descarcaReferatWord(r, linii, comune.setari)
    } catch (e) {
      setError(e.message || 'Nu am putut genera documentul.')
    }
    setBusy(false)
  }

  if (!r) return <p className="text-sm text-slate-500">Se încarcă…</p>

  const total = linii.reduce((s, l) => s + Number(l.valoare_bani), 0)
  const editabil = r.stare === 'ciorna' || r.stare === 'trimis'
  const decontActive = deconturi.filter((d) => d.stare !== 'anulat')

  return (
    <div className="space-y-4">
      <Titlu actiuni={<button onClick={onBack} className={btnGhost}>Înapoi la listă</button>}>
        {r.cod} · Referat de necesitate – {r.tip === 'servicii' ? 'servicii' : 'produse'}
      </Titlu>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-slate-600">
            <p><strong>{r.autor_nume}</strong>{r.autor_functie ? ` · ${r.autor_functie}` : ''}</p>
            <p className="text-xs text-slate-400">Întocmit la {formatData(r.data_intocmirii)}</p>
          </div>
          <StareBadge stare={r.stare} mapa={STARI_REFERAT} />
        </div>

        {r.stare === 'respins' && r.motiv_stare && (
          <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700"><strong>Respins:</strong> {r.motiv_stare}</p>
        )}
        {r.stare === 'anulat' && r.motiv_stare && (
          <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-600"><strong>Anulat:</strong> {r.motiv_stare}</p>
        )}
        {r.stare === 'trimis' && (
          <p className="rounded-lg bg-sky-50 p-3 text-xs text-sky-700">
            Documentul tipărit circulă pe hârtie. Dacă modifici referatul acum, tipărește-l din nou și înlocuiește varianta de pe hârtie.
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-2 py-1.5">Poz.</th><th className="px-2 py-1.5">Denumire</th><th className="px-2 py-1.5">U.M.</th>
                <th className="px-2 py-1.5 text-right">Cant.</th><th className="px-2 py-1.5 text-right">Preț unitar</th>
                <th className="px-2 py-1.5 text-right">Valoare</th><th className="px-2 py-1.5">Caracteristici</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {linii.map((l, i) => (
                <tr key={l.id}>
                  <td className="px-2 py-1.5">{i + 1}</td><td className="px-2 py-1.5">{l.denumire}</td><td className="px-2 py-1.5">{l.um}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{formatCantitate(l.cantitate)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{formatBani(l.pret_bani)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{formatBani(l.valoare_bani)}</td>
                  <td className="px-2 py-1.5 text-slate-500">{l.caracteristici}</td>
                </tr>
              ))}
              {linii.length === 0 && <tr><td colSpan={7} className="px-2 py-4 text-center text-slate-400">Nicio linie.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="space-y-1 text-sm text-slate-700">
          <p><strong>Motiv:</strong> {r.motiv || '—'}</p>
          <p><strong>Valoarea estimată:</strong> {formatBani(total)} lei, fără TVA</p>
          <p><strong>Fonduri:</strong> {(r.surse || []).map((s) => s.denumire).join(', ') || '—'}</p>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}
        {msg && <p className="text-sm text-emerald-700">{msg}</p>}

        {motivPentru && (
          <CasetaMotiv
            titlu={motivPentru === 'respins' ? 'Respinge referatul' : 'Anulează referatul'}
            eticheta={motivPentru === 'respins' ? 'Motivul respingerii *' : 'Motivul anulării *'}
            busy={busy}
            onConfirma={(m) => schimbaStarea(motivPentru, m)}
            onRenunta={() => setMotivPentru(null)}
          />
        )}

        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          <button onClick={descarca} disabled={busy} className={btnPrimary}><FileDown size={14} /> Descarcă Word</button>
          {editabil && <button onClick={onEdit} className={btnGhost}><Pencil size={14} /> Modifică</button>}
          {r.stare === 'ciorna' && (
            <button disabled={busy} onClick={() => schimbaStarea('trimis')} className={btnGhost}><Send size={14} /> Trimite la aprobare</button>
          )}
          {r.stare === 'trimis' && (
            <button disabled={busy} onClick={() => schimbaStarea('ciorna')} className={btnGhost}><Undo2 size={14} /> Revino la ciornă</button>
          )}
          {r.stare === 'respins' && (
            <button disabled={busy} onClick={() => schimbaStarea('ciorna')} className={btnGhost}><Undo2 size={14} /> Redeschide pentru corectare</button>
          )}
          {admin && (r.stare === 'ciorna' || r.stare === 'trimis') && (
            <>
              <button disabled={busy} onClick={() => schimbaStarea('aprobat')} className={btnPrimary}><Check size={14} /> Marchează aprobat</button>
              <button disabled={busy} onClick={() => setMotivPentru('respins')} className={btnDanger}><X size={14} /> Respinge</button>
            </>
          )}
          {(r.stare === 'ciorna' || r.stare === 'trimis' || (admin && r.stare === 'aprobat')) && (
            <button
              disabled={busy}
              onClick={() => (r.stare === 'aprobat' ? setMotivPentru('anulat') : schimbaStarea('anulat'))}
              className={btnDanger}
            >
              <Ban size={14} /> Anulează
            </button>
          )}
          {r.stare === 'aprobat' && (
            <button onClick={onCreeazaDecont} className={btnPrimary}><FilePlus2 size={14} /> Creează decont</button>
          )}
        </div>
      </Card>

      {admin && r.stare !== 'anulat' && (
        <Card className="space-y-3">
          <p className="text-sm font-medium text-slate-700">Evidență (doar Admin Financiar)</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className={labelCls}>Nr. înregistrare</label>
              <input className={inputCls} value={nrInreg} onChange={(e) => setNrInreg(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Data înregistrării</label>
              <input type="date" className={inputCls} value={dataInreg} onChange={(e) => setDataInreg(e.target.value)} />
            </div>
            <div className="flex items-end">
              <button disabled={busy} onClick={salveazaInregistrare} className={btnGhost}>Salvează</button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className={`${btnGhost} cursor-pointer`}>
              <Paperclip size={14} /> {r.scan_path ? 'Înlocuiește scanul semnat' : 'Încarcă scanul semnat'}
              <input type="file" accept=".pdf,image/*" className="hidden" onChange={incarcaScan} />
            </label>
            {r.scan_path && <button onClick={deschideScan} className={btnGhost}><ExternalLink size={14} /> Deschide scanul</button>}
          </div>
          <p className="text-xs text-slate-400">Numărul de înregistrare și scanul sunt doar pentru evidență; nu se tipăresc în document.</p>
        </Card>
      )}
      {!admin && (r.nr_inregistrare || r.scan_path) && (
        <p className="text-xs text-slate-400">
          {r.nr_inregistrare ? `Înregistrat la nr. ${r.nr_inregistrare}${r.data_inregistrare ? ` / ${formatData(r.data_inregistrare)}` : ''}. ` : ''}
          {r.scan_path ? 'Scanul semnat este atașat.' : ''}
        </p>
      )}

      {r.stare === 'aprobat' && (
        <Card className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Deconturi</p>
          <p className="text-sm text-slate-600">
            Cheltuit în deconturile active: <strong className="tabular-nums">{formatBani(cheltuit)} lei</strong> din {formatBani(total)} lei estimați
            {cheltuit > total && <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">depășește referatul</span>}
          </p>
          {deconturi.length === 0 && <p className="text-sm text-slate-400">Niciun decont încă.</p>}
          <ul className="space-y-1">
            {deconturi.map((d) => (
              <li key={d.id}>
                <button onClick={() => onDeschideDecont(d.id)} className="flex w-full items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-left text-sm hover:bg-slate-100">
                  <span>{d.cod} · {formatData(d.perioada_de_la)} – {formatData(d.perioada_pana)}</span>
                  <span className="flex items-center gap-2">
                    <span className="tabular-nums">{formatBani((d.fin_deconturi_linii || []).reduce((s, l) => s + Number(l.suma_bani), 0))} lei</span>
                    <StareBadge stare={d.stare} mapa={STARI_DECONT} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {decontActive.length === 0 && deconturi.length > 0 && <p className="text-xs text-slate-400">Toate deconturile sunt anulate.</p>}
        </Card>
      )}

      <Istoric docTip="referat" docId={id} reload={reloadIstoric} />
    </div>
  )
}
