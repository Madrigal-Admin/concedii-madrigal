import { useEffect, useMemo, useState } from 'react'
import { LogOut, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
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

function formatData(dataStr) {
  if (!dataStr) return '—'
  return new Date(dataStr).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })
}

function ymd(date) {
  return date.toISOString().slice(0, 10)
}

export default function CalendarView({ angajat, isHubAdmin, session, onBack, onSignOut }) {
  const [evenimente, setEvenimente] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')
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
    const { data } = await supabase.from('evenimente').select('*').order('data', { ascending: true })
    setEvenimente(data || [])
    setLoading(false)
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
        setSyncMessage(`${result.sincronizate} evenimente sincronizate.`)
        load()
      }
    } catch {
      setSyncMessage('Nu am putut contacta funcția de sincronizare.')
    }
    setSyncing(false)
  }

  async function toggleFlag(id, field, value) {
    setEvenimente((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)))
    await supabase.from('evenimente').update({ [field]: value }).eq('id', id)
  }

  const evenimenteByDate = useMemo(() => {
    const map = {}
    for (const e of evenimente) {
      if (!e.data) continue
      if (!map[e.data]) map[e.data] = []
      map[e.data].push(e)
    }
    return map
  }, [evenimente])

  // Grila lunii curente — inclusiv "padding" cu zile din lunile vecine,
  // ca să înceapă mereu luni și să se termine duminică.
  const zileGrila = useMemo(() => {
    const primaZi = new Date(lunaCurenta.getFullYear(), lunaCurenta.getMonth(), 1)
    const ultimaZi = new Date(lunaCurenta.getFullYear(), lunaCurenta.getMonth() + 1, 0)

    const offsetStart = (primaZi.getDay() + 6) % 7 // luni=0
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
    // implicit: toate evenimentele din luna afișată, sortate cronologic
    const prefix = `${lunaCurenta.getFullYear()}-${String(lunaCurenta.getMonth() + 1).padStart(2, '0')}`
    return evenimente.filter((e) => e.data?.startsWith(prefix))
  }, [ziuaSelectata, evenimenteByDate, evenimente, lunaCurenta])

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
            <button
              onClick={onBack}
              className="text-sm bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium px-3 py-1.5 rounded-lg transition whitespace-nowrap"
            >
              ← Înapoi la Hub
            </button>
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
        {isHubAdmin && (
          <div className="mb-5 flex flex-wrap items-center gap-3 bg-white rounded-xl shadow-sm p-4">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition disabled:opacity-50"
            >
              <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Se sincronizează...' : 'Sincronizează evenimente'}
            </button>
            {syncMessage && <p className="text-sm text-slate-500">{syncMessage}</p>}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-400">Se încarcă...</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
            {/* Grila lunară */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="mb-4 flex items-center justify-between">
                <button
                  onClick={() => schimbaLuna(-1)}
                  className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100"
                >
                  <ChevronLeft size={18} />
                </button>
                <p className="font-display text-base font-semibold text-slate-800">
                  {LUNI[lunaCurenta.getMonth()]} {lunaCurenta.getFullYear()}
                </p>
                <button
                  onClick={() => schimbaLuna(1)}
                  className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100"
                >
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
                  const areEvenimente = !!evenimenteByDate[dataStr]
                  const esteAzi = dataStr === azi
                  const esteSelectata = dataStr === ziuaSelectata

                  return (
                    <button
                      key={dataStr}
                      onClick={() => setZiuaSelectata(esteSelectata ? null : dataStr)}
                      className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition ${
                        !inLuna ? 'text-slate-300' : 'text-slate-700'
                      } ${esteSelectata ? 'bg-accent text-white' : esteAzi ? 'bg-accent/10 text-accent font-semibold' : 'hover:bg-slate-50'}`}
                    >
                      {zi.getDate()}
                      {areEvenimente && (
                        <span
                          className={`mt-0.5 h-1.5 w-1.5 rounded-full ${
                            esteSelectata ? 'bg-white' : 'bg-accent'
                          }`}
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Lista de evenimente */}
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

                        {isHubAdmin && (
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

      <SiteFooter />
    </div>
  )
}
