import { useEffect, useMemo, useState } from 'react'
import { Pencil, Save, X as XIcon, Send, Upload, Copy, Calendar, MapPin } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { CATEGORII } from './PersoaneTab'

const STATUS_TAG = {
  azi: { label: 'AZI', className: 'bg-accent text-white' },
  viitor: { label: 'Viitor', className: 'bg-accent/10 text-accent' },
  incheiat: { label: 'Încheiat', className: 'bg-slate-100 text-slate-500' },
}

function formatData(dataStr) {
  if (!dataStr) return '—'
  return new Date(dataStr).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function EvenimenteTab({ role }) {
  const [evenimente, setEvenimente] = useState([])
  const [stats, setStats] = useState({})
  const [cautare, setCautare] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [sendingId, setSendingId] = useState(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [{ data }, { data: invitatiiRows }] = await Promise.all([
      supabase
        .from('evenimente')
        .select('*, invitatii_profil_eveniment(*)')
        .eq('necesita_rsvp', true)
        .order('data', { ascending: true }),
      supabase.from('invitatii').select('eveniment_id, status_rsvp, prezent'),
    ])

    const s = {}
    for (const r of invitatiiRows || []) {
      if (!s[r.eveniment_id]) {
        s[r.eveniment_id] = { total: 0, confirmate: 0, refuzate: 0, in_asteptare: 0, prezenti: 0 }
      }
      s[r.eveniment_id].total += 1
      if (r.status_rsvp === 'confirmat') s[r.eveniment_id].confirmate += 1
      else if (r.status_rsvp === 'refuzat') s[r.eveniment_id].refuzate += 1
      else s[r.eveniment_id].in_asteptare += 1
      if (r.prezent) s[r.eveniment_id].prezenti += 1
    }

    setEvenimente(data || [])
    setStats(s)
    setLoading(false)
  }

  const azi = new Date().toISOString().slice(0, 10)

  const filtrate = useMemo(() => {
    const q = cautare.toLowerCase()
    if (!q) return evenimente
    return evenimente.filter(
      (e) => e.nume?.toLowerCase().includes(q) || e.locatie?.toLowerCase().includes(q)
    )
  }, [evenimente, cautare])

  const viitoare = filtrate.filter((e) => e.data && e.data >= azi)
  const incheiate = filtrate.filter((e) => !e.data || e.data < azi).reverse()

  const editingEveniment = evenimente.find((e) => e.id === editingId) || null

  if (loading) return <p className="text-sm text-slate-500">Se încarcă...</p>

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <input
          value={cautare}
          onChange={(e) => setCautare(e.target.value)}
          placeholder="Caută după numele evenimentului sau locație..."
          className="w-full sm:w-96 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      <p className="mb-4 text-xs text-slate-400">
        Evenimentele vin din calendarul central al Hub-ului — cele marcate „necesită RSVP". Dacă lipsește
        unul, verifică bifa din Hub → Calendar.
      </p>

      <Sectiune
        titlu="Evenimente viitoare"
        evenimente={viitoare}
        role={role}
        onEdit={setEditingId}
        onSend={setSendingId}
        stats={stats}
        azi={azi}
        gol="Niciun eveniment viitor cu RSVP activ."
      />
      <Sectiune
        titlu="Evenimente încheiate"
        evenimente={incheiate}
        role={role}
        onEdit={setEditingId}
        onSend={setSendingId}
        stats={stats}
        azi={azi}
        gol="Niciun eveniment încheiat."
      />

      {editingEveniment && (
        <EditorConținut
          eveniment={editingEveniment}
          onClose={() => setEditingId(null)}
          onSaved={() => {
            setEditingId(null)
            load()
          }}
        />
      )}

      {sendingId && (
        <TrimiteInvitatiiModal
          eveniment={evenimente.find((e) => e.id === sendingId)}
          onClose={() => setSendingId(null)}
          onDone={() => {
            setSendingId(null)
            load()
          }}
        />
      )}
    </div>
  )
}

function Sectiune({ titlu, evenimente, role, onEdit, onSend, stats, azi, gol }) {
  return (
    <div className="mb-8">
      <h2 className="mb-3 text-sm font-medium text-slate-500">{titlu}</h2>
      {evenimente.length === 0 ? (
        <p className="text-sm text-slate-400">{gol}</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {evenimente.map((e) => {
            const profil = Array.isArray(e.invitatii_profil_eveniment)
              ? e.invitatii_profil_eveniment[0]
              : e.invitatii_profil_eveniment
            const s = stats[e.id] || { confirmate: 0, refuzate: 0, in_asteptare: 0, prezenti: 0 }

            const tagKey = !e.data || e.data < azi ? 'incheiat' : e.data === azi ? 'azi' : 'viitor'
            const tag = STATUS_TAG[tagKey]

            return (
              <div key={e.id} className="flex flex-col rounded-2xl bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <p className="font-display text-lg font-semibold leading-snug text-slate-800">{e.nume}</p>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tag.className}`}>
                    {tag.label}
                  </span>
                </div>

                <div className="mb-4 space-y-1.5 text-sm text-slate-500">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400" />
                    {formatData(e.data)}
                  </div>
                  {e.locatie && (
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-slate-400" />
                      {e.locatie}
                    </div>
                  )}
                </div>

                <div className="mb-4 grid grid-cols-4 gap-1 border-y border-slate-100 py-3 text-center">
                  <Stat valoare={s.confirmate} eticheta="conf." culoare="text-green-600" />
                  <Stat valoare={s.refuzate} eticheta="ref." culoare="text-rose-500" />
                  <Stat valoare={s.in_asteptare} eticheta="aștept." culoare="text-amber-500" />
                  <Stat valoare={s.prezenti} eticheta="prez." culoare="text-slate-700" />
                </div>

                {!profil?.subiect_email && (
                  <p className="mb-2 text-xs text-amber-600">Fără conținut de email încă</p>
                )}

                {role === 'full' && (
                  <div className="mt-auto flex gap-2 pt-1">
                    <button
                      onClick={() => onEdit(e.id)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 focus-ring"
                    >
                      <Pencil size={13} /> Conținut email
                    </button>
                    <button
                      onClick={() => onSend(e.id)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-accent/10 px-3 py-2 text-xs font-medium text-accent hover:bg-accent/20 focus-ring"
                    >
                      <Send size={13} /> Trimite invitații
                    </button>
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

function Stat({ valoare, eticheta, culoare }) {
  return (
    <div>
      <p className={`font-display text-xl font-bold ${culoare}`}>{valoare}</p>
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{eticheta}</p>
    </div>
  )
}

function TrimiteInvitatiiModal({ eveniment, onClose, onDone }) {
  const [selectate, setSelectate] = useState([])
  const [numarPotential, setNumarPotential] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [rezultat, setRezultat] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    numarare()
  }, [selectate])

  async function numarare() {
    if (selectate.length === 0) {
      setNumarPotential(0)
      return
    }
    const { count } = await supabase
      .from('persoane')
      .select('id', { count: 'exact', head: true })
      .in('categorie', selectate)
      .eq('abonat_invitatii', true)
    setNumarPotential(count || 0)
  }

  function toggleCategorie(c) {
    setSelectate((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))
  }

  async function handleGenereaza() {
    setGenerating(true)
    setError('')

    const { data: persoane, error: errPersoane } = await supabase
      .from('persoane')
      .select('id, nume, prenume, email')
      .in('categorie', selectate)
      .eq('abonat_invitatii', true)

    if (errPersoane) {
      setGenerating(false)
      setError('Nu am putut citi lista de persoane.')
      return
    }

    const { data: existente } = await supabase
      .from('invitatii')
      .select('persoana_id')
      .eq('eveniment_id', eveniment.id)

    const dejaInvitati = new Set((existente || []).map((r) => r.persoana_id))
    const deInvitat = persoane.filter((p) => !dejaInvitati.has(p.id))

    if (deInvitat.length === 0) {
      setGenerating(false)
      setRezultat({ create: 0, deja: persoane.length, linkuri: [] })
      return
    }

    const payload = deInvitat.map((p) => ({
      eveniment_id: eveniment.id,
      persoana_id: p.id,
      sursa: 'trimitere',
    }))

    const { data: create, error: errInsert } = await supabase.from('invitatii').insert(payload).select('token, persoana_id')
    setGenerating(false)

    if (errInsert) {
      setError('Nu am putut genera invitațiile.')
      return
    }

    const linkuri = create.map((row) => {
      const p = deInvitat.find((x) => x.id === row.persoana_id)
      return `${p.prenume} ${p.nume} <${p.email}> — ${window.location.origin}/invitatii/?rsvp=${row.token}`
    })

    setRezultat({ create: deInvitat.length, deja: persoane.length - deInvitat.length, linkuri })
  }

  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">Trimite invitații — {eveniment.nume}</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100">
            <XIcon size={16} />
          </button>
        </div>

        <p className="mb-3 text-xs text-slate-500">
          Alege ce categorii de persoane vrei să inviți. Se generează câte o invitație (cu link unic de RSVP)
          pentru fiecare persoană abonată din categoriile alese — cei deja invitați la acest eveniment nu se
          dublează.
        </p>

        <div className="mb-4 space-y-1.5">
          {CATEGORII.map((c) => (
            <label key={c} className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={selectate.includes(c)} onChange={() => toggleCategorie(c)} />
              {c}
            </label>
          ))}
        </div>

        {numarPotential != null && (
          <p className="mb-4 text-sm text-slate-600">
            <strong>{numarPotential}</strong> persoane abonate în categoriile alese.
          </p>
        )}

        {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}

        {rezultat ? (
          <>
            <p className="mb-3 text-sm text-green-700">
              {rezultat.create} invitații noi generate
              {rezultat.deja > 0 ? ` (${rezultat.deja} erau deja invitați, nu s-au dublat)` : ''}.
            </p>
            {rezultat.linkuri.length > 0 && (
              <div className="mb-4">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-600">Linkuri de RSVP (de trimis manual)</p>
                  <button
                    onClick={() => navigator.clipboard.writeText(rezultat.linkuri.join('\n'))}
                    className="flex items-center gap-1 text-xs text-accent hover:underline"
                  >
                    <Copy size={12} /> Copiază tot
                  </button>
                </div>
                <textarea
                  readOnly
                  value={rezultat.linkuri.join('\n')}
                  rows={5}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
                />
              </div>
            )}
          </>
        ) : (
          <button
            onClick={handleGenereaza}
            disabled={selectate.length === 0 || generating}
            className="flex items-center gap-1.5 rounded-full bg-accent hover:bg-accent-hover text-white text-sm font-medium px-4 py-2 transition disabled:opacity-50"
          >
            <Send size={14} /> {generating ? 'Se generează...' : 'Generează invitațiile'}
          </button>
        )}

        <button onClick={rezultat ? onDone : onClose} className="mt-3 block text-sm text-slate-500 hover:underline">
          {rezultat ? 'Închide' : 'Anulează'}
        </button>
      </div>
    </div>
  )
}

function EditorConținut({ eveniment, onClose, onSaved }) {
  const existing = Array.isArray(eveniment.invitatii_profil_eveniment)
    ? eveniment.invitatii_profil_eveniment[0]
    : eveniment.invitatii_profil_eveniment

  const [subiect, setSubiect] = useState(existing?.subiect_email || '')
  const [mesaj, setMesaj] = useState(existing?.mesaj_intro || '')
  const [afisUrl, setAfisUrl] = useState(existing?.afis_url || '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')

    const ext = file.name.split('.').pop()
    const path = `${eveniment.id}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('afise')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setUploading(false)
      setError('Nu am putut încărca afișul.')
      return
    }

    const { data } = supabase.storage.from('afise').getPublicUrl(path)
    setAfisUrl(`${data.publicUrl}?v=${Date.now()}`) // cache-bust, ca să vezi imediat afișul nou
    setUploading(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { error } = await supabase.from('invitatii_profil_eveniment').upsert({
      eveniment_id: eveniment.id,
      subiect_email: subiect.trim() || null,
      mesaj_intro: mesaj.trim() || null,
      afis_url: afisUrl.split('?')[0] || null, // salvăm fără parametrul de cache-bust
    })

    setSaving(false)
    if (error) {
      setError('Nu am putut salva conținutul.')
      return
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">Conținut email — {eveniment.nume}</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 focus-ring">
            <XIcon size={16} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Subiect email</label>
            <input
              value={subiect}
              onChange={(e) => setSubiect(e.target.value)}
              placeholder="Ex: Invitație la concertul de Crăciun"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Mesaj introductiv <span className="text-slate-400">(poți folosi {'{{nume}}'})</span>
            </label>
            <textarea
              value={mesaj}
              onChange={(e) => setMesaj(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Afiș</label>
            {afisUrl && (
              <img src={afisUrl} alt="Afiș" className="mb-2 max-h-40 rounded-lg border border-slate-200" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleUpload}
              disabled={uploading}
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2"
            />
            {uploading && <p className="mt-1 text-xs text-slate-400">Se încarcă...</p>}
          </div>

          {error && <p className="text-xs text-rose-600">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 rounded-full bg-accent hover:bg-accent-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition disabled:opacity-50"
            >
              <Save size={14} /> {saving ? 'Se salvează...' : 'Salvează'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 focus-ring"
            >
              <XIcon size={14} /> Închide
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
