import { useEffect, useState } from 'react'
import { LogOut, RefreshCw } from 'lucide-react'
import { supabase } from '../supabaseClient'
import SiteHeader from './SiteHeader'
import SiteFooter from './SiteFooter'

const STATUS_LABELS = {
  deschis: { label: 'Deschis', className: 'bg-slate-100 text-slate-600' },
  'in organizare': { label: 'În organizare', className: 'bg-amber-50 text-amber-700' },
  finalizat: { label: 'Finalizat', className: 'bg-emerald-50 text-emerald-700' },
}

function formatData(dataStr) {
  if (!dataStr) return '—'
  return new Date(dataStr).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function CalendarView({ angajat, isHubAdmin, session, onBack, onSignOut }) {
  const [evenimente, setEvenimente] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')

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

  const azi = new Date().toISOString().slice(0, 10)
  const viitoare = evenimente.filter((e) => e.data && e.data >= azi)
  const incheiate = evenimente.filter((e) => !e.data || e.data < azi).reverse()

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <SiteHeader
        title="Hub Madrigal"
        subtitle="Calendar evenimente"
        right={
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="text-sm bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium px-3 py-1.5 rounded-lg transition whitespace-nowrap"
            >
              ← Înapoi la tablou
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

      <main className="flex-1 max-w-5xl mx-auto px-6 py-10 w-full">
        {isHubAdmin && (
          <div className="mb-6 flex flex-wrap items-center gap-3 bg-white rounded-xl shadow-sm p-4">
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
          <>
            <Sectiune
              titlu="Evenimente viitoare"
              evenimente={viitoare}
              isHubAdmin={isHubAdmin}
              onToggleFlag={toggleFlag}
              gol="Niciun eveniment viitor sincronizat încă."
            />
            <Sectiune
              titlu="Evenimente încheiate"
              evenimente={incheiate}
              isHubAdmin={isHubAdmin}
              onToggleFlag={toggleFlag}
              gol="Niciun eveniment încheiat."
            />
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}

function Sectiune({ titlu, evenimente, isHubAdmin, onToggleFlag, gol }) {
  return (
    <div className="mb-8">
      <h2 className="text-sm font-medium text-slate-500 mb-3">{titlu}</h2>
      {evenimente.length === 0 ? (
        <p className="text-sm text-slate-400">{gol}</p>
      ) : (
        <div className="space-y-2">
          {evenimente.map((e) => {
            const status = STATUS_LABELS[e.status] || { label: e.status || '—', className: 'bg-slate-100 text-slate-600' }
            return (
              <div key={e.id} className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap items-center gap-3 justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-slate-800">{e.nume}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${status.className}`}>{status.label}</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {formatData(e.data)}
                    {e.locatie ? ` · ${e.locatie}` : ''}
                    {e.responsabil ? ` · ${e.responsabil}` : ''}
                  </p>
                </div>

                {isHubAdmin && (
                  <div className="flex items-center gap-4 text-xs text-slate-500 shrink-0">
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={e.necesita_rsvp}
                        onChange={(ev) => onToggleFlag(e.id, 'necesita_rsvp', ev.target.checked)}
                      />
                      RSVP
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={e.necesita_costume}
                        onChange={(ev) => onToggleFlag(e.id, 'necesita_costume', ev.target.checked)}
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
  )
}
