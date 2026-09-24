import { useEffect, useState } from 'react'
import { Check, X as XIcon, Download } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { downloadReferatDocx } from '../lib/generateReferatDocx'

const STATUS_BADGE = {
  in_asteptare: { label: 'În așteptare', className: 'bg-amber-50 text-amber-700' },
  aprobata: { label: 'Aprobată', className: 'bg-green-50 text-green-700' },
  respinsa: { label: 'Respinsă', className: 'bg-rose-50 text-rose-600' },
}

function formatData(dataStr) {
  return new Date(dataStr).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function CereriAdminTab() {
  const [cereri, setCereri] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [erori, setErori] = useState({})

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('cereri_eliberare')
      .select('*, cereri_eliberare_linii(*)')
      .order('created_at', { ascending: false })
    setCereri(data || [])
    setLoading(false)
  }

  async function handleAproba(cerere) {
    setBusyId(cerere.id)
    setErori((e) => ({ ...e, [cerere.id]: '' }))

    const { error } = await supabase.rpc('aproba_cerere_eliberare', { p_cerere_id: cerere.id })

    setBusyId(null)
    if (error) {
      setErori((e) => ({ ...e, [cerere.id]: error.message.replace('P0001: ', '') }))
      return
    }
    load()
  }

  async function handleRespinge(cerere) {
    if (!confirm('Respingi această cerere?')) return
    setBusyId(cerere.id)
    await supabase.from('cereri_eliberare').update({ status: 'respinsa', procesata_la: new Date().toISOString() }).eq('id', cerere.id)
    setBusyId(null)
    load()
  }

  const inAsteptare = cereri.filter((c) => c.status === 'in_asteptare')
  const procesate = cereri.filter((c) => c.status !== 'in_asteptare')

  if (loading) return <p className="text-sm text-slate-500">Se încarcă…</p>

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-slate-800">Cereri de aprobat</h2>

      <p className="mb-2 text-sm font-medium text-slate-500">În așteptare ({inAsteptare.length})</p>
      {inAsteptare.length === 0 ? (
        <p className="mb-6 text-sm text-slate-400">Nicio cerere în așteptare.</p>
      ) : (
        <div className="mb-8 space-y-2">
          {inAsteptare.map((c) => (
            <div key={c.id} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-800">{c.nume_angajat}</p>
                  <p className="text-xs text-slate-400">{c.departament_angajat} · {formatData(c.created_at)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAproba(c)}
                    disabled={busyId === c.id}
                    className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
                  >
                    <Check size={13} /> Aprobă
                  </button>
                  <button
                    onClick={() => handleRespinge(c)}
                    disabled={busyId === c.id}
                    className="flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 disabled:opacity-50"
                  >
                    <XIcon size={13} /> Respinge
                  </button>
                </div>
              </div>
              <p className="mb-1 text-sm text-slate-600">{c.motiv}</p>
              <ul className="text-sm text-slate-700">
                {c.cereri_eliberare_linii.map((l) => (
                  <li key={l.id}>• {l.denumire_obiect} — {l.cantitate}</li>
                ))}
              </ul>
              {erori[c.id] && <p className="mt-2 text-xs text-rose-600">{erori[c.id]}</p>}
            </div>
          ))}
        </div>
      )}

      <p className="mb-2 text-sm font-medium text-slate-500">Istoric ({procesate.length})</p>
      <div className="space-y-2">
        {procesate.map((c) => {
          const badge = STATUS_BADGE[c.status]
          return (
            <div key={c.id} className="rounded-xl bg-white p-4 opacity-80 shadow-sm">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-slate-700">{c.nume_angajat}</p>
                  <p className="text-xs text-slate-400">{c.departament_angajat} · {formatData(c.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badge.className}`}>{badge.label}</span>
                  {c.status === 'aprobata' && (
                    <button
                      onClick={() => downloadReferatDocx(c, c.cereri_eliberare_linii)}
                      className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
                    >
                      <Download size={12} /> Document
                    </button>
                  )}
                </div>
              </div>
              <ul className="text-xs text-slate-500">
                {c.cereri_eliberare_linii.map((l) => (
                  <li key={l.id}>• {l.denumire_obiect} — {l.cantitate}</li>
                ))}
              </ul>
            </div>
          )
        })}
        {procesate.length === 0 && <p className="text-sm text-slate-400">Nicio cerere procesată încă.</p>}
      </div>
    </div>
  )
}
