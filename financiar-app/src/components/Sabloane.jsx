import { useEffect, useState } from 'react'
import { Upload, Download } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { formatDataOra } from '../lib/luni'
import { MARKERI, TITLURI, arrayBufferToBase64, citesteMarkeri, verificaMarkeri } from '../lib/sablon'
import { btnPrimary, btnGhost, cardCls } from '../lib/ui'
import { Titlu } from './comun'

export default function Sabloane() {
  const [modul, setModul] = useState('referat')
  return (
    <div className="space-y-4">
      <Titlu>Șabloane Word</Titlu>
      <div className="flex gap-1 border-b border-slate-200">
        {['referat', 'decont'].map((m) => (
          <button
            key={m}
            onClick={() => setModul(m)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              modul === m ? 'border-accent text-accent' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {TITLURI[m]}
          </button>
        ))}
      </div>
      <Sablon key={modul} modul={modul} />
    </div>
  )
}

const MAX_MB = 5

function Sablon({ modul }) {
  const [versiuni, setVersiuni] = useState([])
  const [loading, setLoading] = useState(true)
  const [incarcat, setIncarcat] = useState(null)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('fin_sabloane')
      .select('id, versiune, nume_fisier, activ, created_at')
      .eq('modul', modul)
      .order('versiune', { ascending: false })
    setVersiuni(data || [])
    setLoading(false)
  }

  async function proceseaza(buffer, nume) {
    try {
      const gasiti = citesteMarkeri(buffer)
      setIncarcat({ nume, buffer, gasiti, ...verificaMarkeri(gasiti, MARKERI[modul]) })
    } catch {
      setError('Nu pot citi șablonul. Verifică dacă acoladele { } sunt în perechi și markerii nu conțin spații.')
    }
  }

  async function alegeFisier(e) {
    setError('')
    setMsg('')
    setIncarcat(null)
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.docx')) return setError('Alege un fișier Word (.docx).')
    if (file.size > MAX_MB * 1024 * 1024) return setError(`Fișierul depășește ${MAX_MB} MB.`)
    proceseaza(await file.arrayBuffer(), file.name)
  }

  async function folosesteInitial() {
    setError('')
    setMsg('')
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}sabloane/${modul}.docx`)
      if (!res.ok) throw new Error()
      proceseaza(await res.arrayBuffer(), `${modul}-initial.docx`)
    } catch {
      setError('Nu am putut încărca șablonul inițial.')
    }
  }

  async function salveaza() {
    setBusy(true)
    setError('')
    const urmatoarea = (versiuni[0]?.versiune || 0) + 1
    await supabase.from('fin_sabloane').update({ activ: false }).eq('modul', modul).eq('activ', true)
    const { error: err } = await supabase.from('fin_sabloane').insert({
      modul,
      versiune: urmatoarea,
      nume_fisier: incarcat.nume,
      continut_base64: arrayBufferToBase64(incarcat.buffer),
      markeri: incarcat.gasiti,
      activ: true,
    })
    setBusy(false)
    if (err) {
      setError('Nu am putut salva șablonul.')
      load()
      return
    }
    setIncarcat(null)
    setMsg(`Șablonul a fost salvat ca versiunea ${urmatoarea} și este cel activ.`)
    load()
  }

  async function activeaza(id) {
    setBusy(true)
    await supabase.from('fin_sabloane').update({ activ: false }).eq('modul', modul).eq('activ', true)
    await supabase.from('fin_sabloane').update({ activ: true }).eq('id', id)
    setBusy(false)
    load()
  }

  async function descarca(v) {
    const { data } = await supabase.from('fin_sabloane').select('continut_base64, nume_fisier').eq('id', v.id).single()
    if (!data) return
    const bytes = Uint8Array.from(atob(data.continut_base64), (c) => c.charCodeAt(0))
    const url = URL.createObjectURL(new Blob([bytes]))
    const a = document.createElement('a')
    a.href = url
    a.download = data.nume_fisier
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <p className="text-sm text-slate-500">Se încarcă…</p>

  return (
    <div className="space-y-4">
      <div className={cardCls}>
        <p className="text-sm font-medium text-slate-700">Markeri recunoscuți în șablon</p>
        <p className="mt-1 text-xs text-slate-500">Scrie-i în Word între acolade, exact așa (literele mari/mici contează):</p>
        <p className="mt-2 flex flex-wrap gap-1.5">
          {MARKERI[modul].map((m) => (
            <code key={m} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">{`{${m}}`}</code>
          ))}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Tabelul se repetă cu {modul === 'referat' ? '{#linii} … {/linii}' : '{#linii_borderou} … {/linii_borderou}'} pe rândul de date.
        </p>
      </div>

      <div className={cardCls}>
        <div className="flex flex-wrap gap-2">
          <label className={`${btnPrimary} cursor-pointer`}>
            <Upload size={14} /> Încarcă un șablon nou (.docx)
            <input type="file" accept=".docx" className="hidden" onChange={alegeFisier} />
          </label>
          {versiuni.length === 0 && (
            <button onClick={folosesteInitial} className={btnGhost}>Folosește șablonul inițial livrat cu aplicația</button>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Versiunile vechi se păstrează; documentele deja aprobate se descarcă tot cu șablonul din momentul aprobării.
        </p>

        {incarcat && (
          <div className="mt-4 space-y-2 rounded-lg bg-slate-50 p-3 text-sm">
            <p className="font-medium text-slate-700">{incarcat.nume}</p>
            {incarcat.necunoscuti.length === 0 && incarcat.lipsa.length === 0 ? (
              <p className="text-emerald-700">Toți markerii sunt în regulă.</p>
            ) : (
              <>
                {incarcat.necunoscuti.length > 0 && (
                  <p className="text-amber-700">Markeri necunoscuți (nu vor fi înlocuiți): {incarcat.necunoscuti.map((m) => `{${m}}`).join(', ')}</p>
                )}
                {incarcat.lipsa.length > 0 && (
                  <p className="text-amber-700">Markeri care lipsesc din șablon: {incarcat.lipsa.map((m) => `{${m}}`).join(', ')}</p>
                )}
              </>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={salveaza} disabled={busy} className={btnPrimary}>Salvează ca versiune activă</button>
              <button onClick={() => setIncarcat(null)} className={btnGhost}>Renunță</button>
            </div>
          </div>
        )}
        {msg && <p className="mt-3 text-sm text-emerald-700">{msg}</p>}
        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      </div>

      <div className={cardCls}>
        <p className="mb-2 text-sm font-medium text-slate-700">Versiuni</p>
        {versiuni.length === 0 && <p className="text-sm text-slate-500">Nu există încă niciun șablon pentru acest document.</p>}
        <ul className="space-y-1.5">
          {versiuni.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <span>
                <strong>v{v.versiune}</strong> · {v.nume_fisier} · {formatDataOra(v.created_at)}
                {v.activ && <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">activ</span>}
              </span>
              <span className="flex gap-2">
                <button onClick={() => descarca(v)} className={btnGhost}><Download size={13} /> Descarcă</button>
                {!v.activ && <button onClick={() => activeaza(v.id)} disabled={busy} className={btnGhost}>Activează</button>}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
