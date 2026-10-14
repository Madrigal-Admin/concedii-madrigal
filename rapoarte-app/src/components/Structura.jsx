import { useEffect, useState } from 'react'
import { Upload, Plus, Download, Pencil } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { formatDataOra } from '../lib/luni'
import { MARKERI_DE_BAZA, arrayBufferToBase64, citesteMarkeri, verificaMarkeri } from '../lib/sablon'
import { inputCls, labelCls, btnPrimary, btnGhost, cardCls } from '../lib/ui'
import StructuraPostev from './StructuraPostev'

const TIPURI = [
  { v: 'text', l: 'Text scurt' },
  { v: 'text_lung', l: 'Text lung' },
  { v: 'numar', l: 'Număr' },
  { v: 'data', l: 'Dată' },
  { v: 'da_nu', l: 'Da / Nu' },
  { v: 'alegere', l: 'Alegere din listă' },
]

const MAX_MB = 5

export default function Structura() {
  const [tab, setTab] = useState('activitate')
  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg font-semibold text-slate-800">Structura rapoartelor</h2>
      <div className="flex gap-1 border-b border-slate-200">
        {[['activitate', 'Editare șablon Raport de activitate'], ['postev', 'Editare șablon Raport post-eveniment']].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              tab === k ? 'border-accent text-accent' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {l}
          </button>
        ))}
      </div>
      {tab === 'activitate' && (
        <div className="space-y-8">
          <section className="space-y-3">
            <h3 className="font-display text-base font-semibold text-slate-800">1. Șablon Word</h3>
            <Sablon />
          </section>
          <section className="space-y-3 border-t border-slate-200 pt-6">
            <h3 className="font-display text-base font-semibold text-slate-800">2. Câmpuri suplimentare</h3>
            <Campuri />
          </section>
        </div>
      )}
      {tab === 'postev' && <StructuraPostev />}
    </div>
  )
}

/* ------------------------------ Șablon Word ------------------------------ */
function Sablon() {
  const [versiuni, setVersiuni] = useState([])
  const [campuri, setCampuri] = useState([])
  const [loading, setLoading] = useState(true)
  const [incarcat, setIncarcat] = useState(null) // { nume, buffer, necunoscuti, lipsa }
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [{ data: v }, { data: c }] = await Promise.all([
      supabase.from('rap_sabloane').select('id, versiune, nume_fisier, activ, created_at, markeri').eq('modul', 'activitate').order('versiune', { ascending: false }),
      supabase.from('rap_campuri').select('*').eq('modul', 'activitate').eq('activ', true),
    ])
    setVersiuni(v || [])
    setCampuri(c || [])
    setLoading(false)
  }

  const markeriAsteptati = [...MARKERI_DE_BAZA, ...campuri.map((c) => c.marker).filter(Boolean)]

  async function alegeFisier(e) {
    setError('')
    setMsg('')
    setIncarcat(null)
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.docx')) return setError('Alege un fișier Word (.docx).')
    if (file.size > MAX_MB * 1024 * 1024) return setError(`Fișierul depășește ${MAX_MB} MB.`)
    try {
      const buffer = await file.arrayBuffer()
      const gasiti = citesteMarkeri(buffer)
      setIncarcat({ nume: file.name, buffer, gasiti, ...verificaMarkeri(gasiti, markeriAsteptati) })
    } catch {
      setError('Nu pot citi șablonul. Verifică dacă acoladele { } sunt în perechi și markerii nu conțin spații.')
    }
  }

  async function salveaza() {
    setBusy(true)
    setError('')
    const urmatoarea = (versiuni[0]?.versiune || 0) + 1
    await supabase.from('rap_sabloane').update({ activ: false }).eq('modul', 'activitate').eq('activ', true)
    const { error: err } = await supabase.from('rap_sabloane').insert({
      modul: 'activitate',
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
    await supabase.from('rap_sabloane').update({ activ: false }).eq('modul', 'activitate').eq('activ', true)
    await supabase.from('rap_sabloane').update({ activ: true }).eq('id', id)
    setBusy(false)
    load()
  }

  async function descarca(v) {
    const { data } = await supabase.from('rap_sabloane').select('continut_base64, nume_fisier').eq('id', v.id).single()
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
        <p className="mt-1 text-xs text-slate-500">
          Scrie-i în Word între acolade, exact așa (literele mari/mici contează):
        </p>
        <p className="mt-2 flex flex-wrap gap-1.5">
          {markeriAsteptati.map((m) => (
            <code key={m} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">{`{${m}}`}</code>
          ))}
        </p>
      </div>

      <div className={cardCls}>
        <label className={`${btnPrimary} cursor-pointer`}>
          <Upload size={14} /> Încarcă un șablon nou (.docx)
          <input type="file" accept=".docx" className="hidden" onChange={alegeFisier} />
        </label>
        <p className="mt-2 text-xs text-slate-400">
          Versiunile vechi se păstrează; rapoartele deja aprobate se descarcă tot cu șablonul din momentul aprobării.
        </p>

        {incarcat && (
          <div className="mt-4 space-y-2 rounded-lg bg-slate-50 p-3 text-sm">
            <p className="font-medium text-slate-700">{incarcat.nume}</p>
            {incarcat.necunoscuti.length === 0 && incarcat.lipsa.length === 0 ? (
              <p className="text-emerald-700">Toți markerii sunt în regulă.</p>
            ) : (
              <>
                {incarcat.necunoscuti.length > 0 && (
                  <p className="text-amber-700">
                    Markeri necunoscuți (nu vor fi înlocuiți): {incarcat.necunoscuti.map((m) => `{${m}}`).join(', ')}
                  </p>
                )}
                {incarcat.lipsa.length > 0 && (
                  <p className="text-amber-700">
                    Markeri care lipsesc din șablon: {incarcat.lipsa.map((m) => `{${m}}`).join(', ')}
                  </p>
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
        {versiuni.length === 0 && <p className="text-sm text-slate-500">Nu există încă niciun șablon.</p>}
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

/* ---------------------------- Câmpuri suplimentare ----------------------------- */
const EMPTY = { cod: '', eticheta: '', tip: 'text', optiuni: '', obligatoriu: false, marker: '', ajutor: '', activ: true }

function Campuri() {
  const [campuri, setCampuri] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null) // null | { id?, ...EMPTY }
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('rap_campuri').select('*').eq('modul', 'activitate').order('ordine').order('created_at')
    setCampuri(data || [])
    setLoading(false)
  }

  function editeaza(c) {
    setError('')
    setForm({ ...EMPTY, ...c, marker: c.marker || '', ajutor: c.ajutor || '', optiuni: (c.optiuni || []).join('\n') })
  }

  async function salveaza(e) {
    e.preventDefault()
    setError('')
    if (!form.eticheta.trim()) return setError('Scrie numele câmpului.')
    if (form.marker && !/^[A-Za-z0-9_]+$/.test(form.marker)) {
      return setError('Markerul poate conține doar litere, cifre și „_" (fără spații).')
    }
    const optiuni = form.tip === 'alegere' ? form.optiuni.split('\n').map((s) => s.trim()).filter(Boolean) : []
    if (form.tip === 'alegere' && optiuni.length < 2) return setError('Adaugă cel puțin două opțiuni (una pe linie).')

    const cod = form.id
      ? form.cod
      : form.eticheta.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') + '_' + Math.random().toString(36).slice(2, 5)

    const payload = {
      modul: 'activitate',
      cod,
      eticheta: form.eticheta.trim(),
      tip: form.tip,
      optiuni,
      obligatoriu: form.obligatoriu,
      marker: form.marker.trim() || null,
      ajutor: form.ajutor.trim() || null,
      activ: form.activ,
    }
    setBusy(true)
    const { error: err } = form.id
      ? await supabase.from('rap_campuri').update(payload).eq('id', form.id)
      : await supabase.from('rap_campuri').insert({ ...payload, ordine: campuri.length })
    setBusy(false)
    if (err) return setError('Nu am putut salva câmpul.')
    setForm(null)
    load()
  }

  async function muta(c, directie) {
    const idx = campuri.findIndex((x) => x.id === c.id)
    const alt = campuri[idx + directie]
    if (!alt) return
    await Promise.all([
      supabase.from('rap_campuri').update({ ordine: idx + directie }).eq('id', c.id),
      supabase.from('rap_campuri').update({ ordine: idx }).eq('id', alt.id),
    ])
    load()
  }

  if (loading) return <p className="text-sm text-slate-500">Se încarcă…</p>

  if (form) {
    return (
      <form onSubmit={salveaza} className={`${cardCls} space-y-3`}>
        <h3 className="font-display text-base font-semibold text-slate-800">{form.id ? 'Modifică câmpul' : 'Câmp nou'}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Nume câmp *</label>
            <input className={inputCls} value={form.eticheta} onChange={(e) => setForm({ ...form, eticheta: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Tip</label>
            <select className={inputCls} value={form.tip} onChange={(e) => setForm({ ...form, tip: e.target.value })}>
              {TIPURI.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Marker în șablonul Word (opțional, fără acolade)</label>
            <input className={inputCls} value={form.marker} onChange={(e) => setForm({ ...form, marker: e.target.value })} placeholder="ex. proiect" />
          </div>
          <div>
            <label className={labelCls}>Text de ajutor (opțional)</label>
            <input className={inputCls} value={form.ajutor} onChange={(e) => setForm({ ...form, ajutor: e.target.value })} />
          </div>
        </div>
        {form.tip === 'alegere' && (
          <div>
            <label className={labelCls}>Opțiuni (una pe linie)</label>
            <textarea rows={4} className={inputCls} value={form.optiuni} onChange={(e) => setForm({ ...form, optiuni: e.target.value })} />
          </div>
        )}
        <div className="flex flex-wrap gap-4 text-sm text-slate-600">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.obligatoriu} onChange={(e) => setForm({ ...form, obligatoriu: e.target.checked })} />
            Obligatoriu
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.activ} onChange={(e) => setForm({ ...form, activ: e.target.checked })} />
            Activ (apare în formular)
          </label>
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={busy} className={btnPrimary}>Salvează</button>
          <button type="button" onClick={() => setForm(null)} className={btnGhost}>Anulează</button>
        </div>
      </form>
    )
  }

  return (
    <div className="space-y-3">
      <div className={cardCls}>
        <p className="text-sm font-medium text-slate-700">Câmpuri fixe (nu se pot schimba)</p>
        <p className="mt-1 text-xs text-slate-500">
          Contract, perioadă (lună și an) și activități desfășurate. Autorul, data completării, starea și marcajul
          „cu întârziere" sunt completate automat.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">Câmpuri adăugate de tine</p>
        <button onClick={() => { setError(''); setForm({ ...EMPTY }) }} className={btnPrimary}>
          <Plus size={14} /> Câmp nou
        </button>
      </div>

      {campuri.length === 0 && <p className="text-sm text-slate-500">Nu ai adăugat niciun câmp suplimentar.</p>}
      <ul className="space-y-1.5">
        {campuri.map((c, i) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            <span className={c.activ ? 'text-slate-700' : 'text-slate-400'}>
              <strong>{c.eticheta}</strong> · {TIPURI.find((t) => t.v === c.tip)?.l}
              {c.obligatoriu ? ' · obligatoriu' : ''}
              {c.marker ? ` · {${c.marker}}` : ''}
              {!c.activ ? ' · inactiv' : ''}
            </span>
            <span className="flex gap-1">
              <button onClick={() => muta(c, -1)} disabled={i === 0} className={btnGhost} title="Mai sus">↑</button>
              <button onClick={() => muta(c, 1)} disabled={i === campuri.length - 1} className={btnGhost} title="Mai jos">↓</button>
              <button onClick={() => editeaza(c)} className={btnGhost}><Pencil size={13} /> Modifică</button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
