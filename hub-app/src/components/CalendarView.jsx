import { useEffect, useMemo, useState } from 'react'
import { LogOut, RefreshCw, ChevronLeft, ChevronRight, ArrowLeft, Settings, X as XIcon } from 'lucide-react'
import { supabase } from '../supabaseClient'
import SiteHeader from './SiteHeader'
import SiteFooter from './SiteFooter'

const STATUS_LABELS = {
  deschis: { label: 'Deschis', className: 'bg-slate-100 text-slate-600' },
  'in organizare': { label: 'În organizare', className: 'bg-amber-50 text-amber-700' },
  finalizat: { label: 'Finalizat', className: 'bg-emerald-50 text-emerald-700' },
}

const ZILE_SAPT = ['Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm', 'Dum']
const LUNI = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie',
]
const CULORI_PRESTABILITE = ['#7F77DD', '#1D9E75', '#D85A30', '#D4537E', '#378ADD', '#BA7517', '#639922', '#5F5E5A']

function formatData(dataStr) {
  if (!dataStr) return '—'
  return new Date(dataStr).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })
}

function ymd(date) {
  return date.toISOString().slice(0, 10)
}

function initialeTag(tag) {
  const cuvinte = tag.trim().split(/\s+/)
  if (cuvinte.length === 1) return cuvinte[0].slice(0, 3).toUpperCase()
  return cuvinte.slice(0, 2).map((c) => c[0]).join('').toUpperCase()
}

export default function CalendarView({ angajat, canManageCalendar, session, onBack, onSignOut }) {
  const [evenimente, setEvenimente] = useState([])
  const [tagCulori, setTagCulori] = useState({}) // { tag: '#hex' }
  const [tagFilter, setTagFilter] = useState(null) // null = toate active; altfel Set<string>
  const [showTagManager, setShowTagManager] = useState(false)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')
  const [debugResult, setDebugResult] = useState(null)
  const [lunaCurenta, setLunaCurenta] = useState(() => {
    const azi = new Date()
    return new Date(azi.getFullYear(), azi.getMonth(), 1)
  })
  const [ziuaSelectata, setZiuaSelectata] = useState(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [{ data: ev }, { data: culori }] = await Promise.all([
      supabase.from('evenimente').select('*').order('data', { ascending: true }),
      supabase.from('evenimente_tag_culori').select('*'),
    ])
    setEvenimente(ev || [])
    setTagCulori(Object.fromEntries((culori || []).map((c) => [c.tag, c.culoare])))
    setLoading(false)
  }

  const toateTagurile = useMemo(() => {
    const set = new Set()
    for (const e of evenimente) for (const t of e.tags || []) set.add(t)
    return [...set].sort()
  }, [evenimente])

  const tagActive = tagFilter === null ? new Set(toateTagurile) : tagFilter

  function toggleTagFilter(tag) {
    setTagFilter((prev) => {
      const curent = prev === null ? new Set(toateTagurile) : new Set(prev)
      if (curent.has(tag)) curent.delete(tag)
      else curent.add(tag)
      return curent
    })
  }

  async function handleSync() {
    setSyncing(true)
    setSyncMessage('')
    try {
      const res = await fetch('/.netlify/functions/sync-clickup', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const result = await res.json()
      if (!res.ok) {
        setSyncMessage(result.error || 'Sincronizarea a eșuat.')
      } else {
        setSyncMessage(
          `${result.sincronizate} evenimente sincronizate.` +
            (result.orfaneSterse > 0 ? ` ${result.orfaneSterse} orfane (șterse din ClickUp) au fost curățate.` : '')
        )
        load()
      }
    } catch {
      setSyncMessage('Nu am putut contacta funcția de sincronizare.')
    }
    setSyncing(false)
  }

  async function handleDebugImplicare() {
    const res = await fetch('/.netlify/functions/debug-implicare', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    setDebugResult(await res.json())
  }

  async function toggleFlag(id, field, value) {
    setEvenimente((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)))
    await supabase.from('evenimente').update({ [field]: value }).eq('id', id)
  }

  // Evenimentele fără taguri rămân mereu vizibile — filtrul se aplică
  // doar celor cu cel puțin un tag.
  const evenimenteVizibile = useMemo(
    () => evenimente.filter((e) => !e.tags?.length || e.tags.some((t) => tagActive.has(t))),
    [evenimente, tagActive]
  )

  const evenimenteByDate = useMemo(() => {
    const map = {}
    for (const e of evenimenteVizibile) {
      if (!e.data) continue
      if (!map[e.data]) map[e.data] = []
      map[e.data].push(e)
    }
    return map
  }, [evenimenteVizibile])

  const zileGrila = useMemo(() => {
    const primaZi = new Date(lunaCurenta.getFullYear(), lunaCurenta.getMonth(), 1)
    const ultimaZi = new Date(lunaCurenta.getFullYear(), lunaCurenta.getMonth() + 1, 0)

    const offsetStart = (primaZi.getDay() + 6) % 7
    const start = new Date(primaZi)
    start.setDate(start.getDate() - offsetStart)

    const offsetEnd = (7 - ((ultimaZi.getDay() + 6) % 7) - 1) % 7
    const end = new Date(ultimaZi)
    end.setDate(end.getDate() + offsetEnd)

    const zile = []
    const cursor = new Date(start)
    while (cursor <= end) {
      zile.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    return zile
  }, [lunaCurenta])

  const azi = ymd(new Date())

  const evenimenteAfisate = useMemo(() => {
    if (ziuaSelectata) return evenimenteByDate[ziuaSelectata] || []
    const prefix = `${lunaCurenta.getFullYear()}-${String(lunaCurenta.getMonth() + 1).padStart(2, '0')}`
    return evenimenteVizibile.filter((e) => e.data?.startsWith(prefix))
  }, [ziuaSelectata, evenimenteByDate, evenimenteVizibile, lunaCurenta])

  function schimbaLuna(delta) {
    setLunaCurenta((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
    setZiuaSelectata(null)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <SiteHeader
        title="Calendar Evenimente"
        right={
          <div className="flex items-center gap-2">
            <span className="hidden max-w-[220px] truncate rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 sm:inline-block">
              {angajat.nume_complet}
            </span>
            <button
              onClick={onSignOut}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium text-slate-500 hover:bg-slate-100 focus-ring transition"
              title="Deconectare"
            >
              <LogOut size={15} />
            </button>
          </div>
        }
      />

      <main className="flex-1 max-w-6xl mx-auto px-6 py-8 w-full">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault()
            onBack()
          }}
          className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 focus-ring transition"
        >
          <ArrowLeft size={15} />
          Înapoi la Hub
        </a>

        {canManageCalendar && (
          <div className="mb-5 flex flex-wrap items-center gap-3 bg-white rounded-xl shadow-sm p-4">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition disabled:opacity-50"
            >
              <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Se sincronizează...' : 'Sincronizează evenimente'}
            </button>
            <p className="text-xs text-slate-400">Automat, în fiecare luni.</p>
            {syncMessage && <p className="text-sm text-slate-500">{syncMessage}</p>}
            <button
              onClick={handleDebugImplicare}
              className="ml-auto rounded-full bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-200"
            >
              (temp) Diagnostic Implicare
            </button>
          </div>
        )}

        {debugResult && (
          <pre className="mb-5 overflow-x-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-100">
            {JSON.stringify(debugResult, null, 2)}
          </pre>
        )}

        {toateTagurile.length > 0 && (
          <div className="mb-5 flex flex-wrap items-center gap-2 bg-white rounded-xl shadow-sm p-3">
            <span className="text-xs font-medium text-slate-500 mr-1">Taguri:</span>
            {toateTagurile.map((tag) => {
              const activ = tagActive.has(tag)
              const culoare = tagCulori[tag] || '#94a3b8'
              return (
                <button
                  key={tag}
                  onClick={() => toggleTagFilter(tag)}
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition"
                  style={{
                    backgroundColor: activ ? `${culoare}22` : '#f1f5f9',
                    color: activ ? culoare : '#94a3b8',
                  }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: activ ? culoare : '#cbd5e1' }} />
                  {tag}
                </button>
              )
            })}
            {canManageCalendar && (
              <button
                onClick={() => setShowTagManager(true)}
                title="Gestionează culorile tagurilor"
                className="ml-auto rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200"
              >
                <Settings size={13} />
              </button>
            )}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-400">Se încarcă...</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="mb-4 flex items-center justify-between">
                <button onClick={() => schimbaLuna(-1)} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100">
                  <ChevronLeft size={18} />
                </button>
                <p className="font-display text-base font-semibold text-slate-800">
                  {LUNI[lunaCurenta.getMonth()]} {lunaCurenta.getFullYear()}
                </p>
                <button onClick={() => schimbaLuna(1)} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100">
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-1 text-center text-[11px] font-medium uppercase text-slate-400">
                {ZILE_SAPT.map((z) => (
                  <div key={z}>{z}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {zileGrila.map((zi) => {
                  const dataStr = ymd(zi)
                  const inLuna = zi.getMonth() === lunaCurenta.getMonth()
                  const evZi = evenimenteByDate[dataStr] || []
                  const esteAzi = dataStr === azi
                  const esteSelectata = dataStr === ziuaSelectata

                  const tagurileZilei = [...new Set(evZi.flatMap((e) => (e.tags?.length ? e.tags : ['__fără_tag__'])))]

                  return (
                    <button
                      key={dataStr}
                      onClick={() => setZiuaSelectata(esteSelectata ? null : dataStr)}
                      className={`aspect-square rounded-lg flex flex-col items-center justify-start pt-1.5 text-sm transition ${
                        !inLuna ? 'text-slate-300' : 'text-slate-700'
                      } ${esteSelectata ? 'bg-accent text-white' : esteAzi ? 'bg-accent/10 text-accent font-semibold' : 'hover:bg-slate-50'}`}
                    >
                      {zi.getDate()}
                      {tagurileZilei.length > 0 && (
                        <div className="mt-1 flex flex-col items-center gap-0.5 w-full px-1">
                          {tagurileZilei.slice(0, 2).map((tag) =>
                            tag === '__fără_tag__' ? (
                              <span key={tag} className={`h-1.5 w-1.5 rounded-full ${esteSelectata ? 'bg-white' : 'bg-slate-400'}`} />
                            ) : (
                              <span
                                key={tag}
                                className="w-full truncate rounded text-[9px] font-semibold leading-tight px-0.5"
                                style={{
                                  backgroundColor: esteSelectata ? 'rgba(255,255,255,0.25)' : `${tagCulori[tag] || '#94a3b8'}22`,
                                  color: esteSelectata ? '#fff' : tagCulori[tag] || '#64748b',
                                }}
                              >
                                {initialeTag(tag)}
                              </span>
                            )
                          )}
                          {tagurileZilei.length > 2 && (
                            <span className={`text-[9px] ${esteSelectata ? 'text-white/80' : 'text-slate-400'}`}>
                              +{tagurileZilei.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-display text-sm font-semibold text-slate-800">
                  {ziuaSelectata ? formatData(ziuaSelectata) : `Evenimentele lunii ${LUNI[lunaCurenta.getMonth()].toLowerCase()}`}
                </p>
                {ziuaSelectata && (
                  <button onClick={() => setZiuaSelectata(null)} className="text-xs text-accent hover:underline">
                    Vezi toată luna
                  </button>
                )}
              </div>

              {evenimenteAfisate.length === 0 ? (
                <p className="text-sm text-slate-400">Niciun eveniment.</p>
              ) : (
                <div className="space-y-2">
                  {evenimenteAfisate.map((e) => {
                    const status = STATUS_LABELS[e.status] || { label: e.status || '—', className: 'bg-slate-100 text-slate-600' }
                    return (
                      <div key={e.id} className="rounded-xl border border-slate-100 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{e.nume}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {formatData(e.data)}
                              {e.locatie ? ` · ${e.locatie}` : ''}
                            </p>
                          </div>
                          <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full ${status.className}`}>{status.label}</span>
                        </div>

                        {(e.tags?.length > 0 || e.implicare) && (
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {e.tags?.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                                style={{ backgroundColor: `${tagCulori[tag] || '#94a3b8'}22`, color: tagCulori[tag] || '#64748b' }}
                              >
                                {tag}
                              </span>
                            ))}
                            {e.implicare && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                                {e.implicare}
                              </span>
                            )}
                          </div>
                        )}

                        {canManageCalendar && (
                          <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                            <label className="flex items-center gap-1.5">
                              <input
                                type="checkbox"
                                checked={e.necesita_rsvp}
                                onChange={(ev) => toggleFlag(e.id, 'necesita_rsvp', ev.target.checked)}
                              />
                              RSVP
                            </label>
                            <label className="flex items-center gap-1.5">
                              <input
                                type="checkbox"
                                checked={e.necesita_costume}
                                onChange={(ev) => toggleFlag(e.id, 'necesita_costume', ev.target.checked)}
                              />
                              Costume
                            </label>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {showTagManager && (
        <TagColorManager
          taguri={toateTagurile}
          culori={tagCulori}
          onClose={() => setShowTagManager(false)}
          onChanged={load}
        />
      )}

      <SiteFooter />
    </div>
  )
}

function TagColorManager({ taguri, culori, onClose, onChanged }) {
  async function schimbaCuloare(tag, culoare) {
    await supabase.from('evenimente_tag_culori').upsert({ tag, culoare })
    onChanged()
  }

  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">Culori taguri</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100">
            <XIcon size={16} />
          </button>
        </div>
        <div className="space-y-3">
          {taguri.map((tag) => (
            <div key={tag} className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-700">{tag}</span>
              <div className="flex items-center gap-1.5">
                {CULORI_PRESTABILITE.map((c) => (
                  <button
                    key={c}
                    onClick={() => schimbaCuloare(tag, c)}
                    className="h-5 w-5 rounded-full ring-offset-1"
                    style={{ backgroundColor: c, boxShadow: culori[tag] === c ? `0 0 0 2px white, 0 0 0 3.5px ${c}` : 'none' }}
                  />
                ))}
              </div>
            </div>
          ))}
          {taguri.length === 0 && <p className="text-sm text-slate-400">Niciun tag sincronizat încă.</p>}
        </div>
      </div>
    </div>
  )
}
