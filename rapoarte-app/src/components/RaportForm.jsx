import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { etichetaPerioada } from '../lib/luni'
import { inputCls, labelCls, btnPrimary, btnGhost } from '../lib/ui'
import CampuriExtra, { valideazaExtra } from './CampuriExtra'

const eticheteContract = (c) => c.obiect + (c.numar_contract ? ` · nr. ${c.numar_contract}` : '')

/**
 * Formular de raport de activitate.
 * - raport nul  => raport nou (alegi contractul și perioada)
 * - raport dat  => corectare (contractul și perioada nu se mai schimbă)
 */
export default function RaportForm({ contracte, campuri, raport, onSaved, onCancel }) {
  const editare = !!raport
  const [contractId, setContractId] = useState(
    raport?.contract_id || (contracte.length === 1 ? contracte[0].id : '')
  )
  const [perioade, setPerioade] = useState([])
  const [perioada, setPerioada] = useState('')
  const [activitati, setActivitati] = useState(raport?.activitati || '')
  const [extra, setExtra] = useState(raport?.extra || {})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (editare || !contractId) {
      setPerioade([])
      return
    }
    supabase.rpc('rap_perioade_disponibile', { p_contract: contractId }).then(({ data }) => {
      setPerioade(data || [])
      setPerioada('')
    })
  }, [contractId, editare])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!editare && !contractId) return setError('Alege contractul.')
    if (!editare && !perioada) return setError('Alege perioada.')
    if (!activitati.trim()) return setError('Descrie activitățile desfășurate.')
    const err = valideazaExtra(campuri, extra)
    if (err) return setError(err)

    setSaving(true)
    let res
    if (editare) {
      res = await supabase.from('rap_activitate').update({ activitati: activitati.trim(), extra }).eq('id', raport.id)
    } else {
      const [an, luna] = perioada.split('-').map(Number)
      res = await supabase
        .from('rap_activitate')
        .insert({ contract_id: contractId, an, luna, activitati: activitati.trim(), extra })
    }
    setSaving(false)
    if (res.error) {
      setError(
        res.error.code === '23505'
          ? 'Există deja un raport pentru această lună și acest contract.'
          : res.error.message || 'Nu am putut salva raportul.'
      )
      return
    }
    onSaved()
  }

  const contractAles = contracte.find((c) => c.id === contractId)

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-display text-base font-semibold text-slate-800">
        {editare ? 'Corectează raportul' : 'Raport nou de activitate'}
      </h3>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Contract <span className="text-rose-500">*</span></label>
          {contracte.length === 1 || editare ? (
            <input className={inputCls} disabled value={contractAles ? eticheteContract(contractAles) : ''} />
          ) : (
            <select className={inputCls} value={contractId} onChange={(e) => setContractId(e.target.value)}>
              <option value="">— Alege —</option>
              {contracte.map((c) => (
                <option key={c.id} value={c.id}>{eticheteContract(c)}</option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className={labelCls}>Perioada <span className="text-rose-500">*</span></label>
          {editare ? (
            <input className={inputCls} disabled value={etichetaPerioada(raport.luna, raport.an)} />
          ) : (
            <select
              className={inputCls}
              value={perioada}
              onChange={(e) => setPerioada(e.target.value)}
              disabled={!contractId}
            >
              <option value="">{contractId ? '— Alege luna —' : 'Alege întâi contractul'}</option>
              {perioade.map((p) => (
                <option key={`${p.an}-${p.luna}`} value={`${p.an}-${p.luna}`}>
                  {etichetaPerioada(p.luna, p.an)}
                </option>
              ))}
            </select>
          )}
          {!editare && contractId && perioade.length === 0 && (
            <p className="mt-1 text-xs text-slate-400">Nu ai nicio lună încheiată fără raport pentru acest contract.</p>
          )}
        </div>
      </div>

      <div>
        <label className={labelCls}>Activități desfășurate <span className="text-rose-500">*</span></label>
        <textarea
          rows={10}
          className={inputCls}
          value={activitati}
          onChange={(e) => setActivitati(e.target.value)}
        />
        <p className="mt-1 text-xs text-slate-400">Rândurile noi se păstrează în documentul Word.</p>
      </div>

      <CampuriExtra campuri={campuri} valori={extra} onChange={(cod, v) => setExtra((x) => ({ ...x, [cod]: v }))} />

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={saving} className={btnPrimary}>
          <Save size={14} /> {saving ? 'Se salvează…' : editare ? 'Salvează și retrimite' : 'Trimite raportul'}
        </button>
        <button type="button" onClick={onCancel} className={btnGhost}>Anulează</button>
      </div>
    </form>
  )
}
