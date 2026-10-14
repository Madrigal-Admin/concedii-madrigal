import { useState } from 'react'
import { History } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { formatData, formatDataOra } from '../lib/luni'
import { btnGhost } from '../lib/ui'
import { campuriVizibile, valoriVizibile, totalEvenimente } from '../lib/postev'
import { StareBadge } from './RaportCard'

export default function PostevCard({ raport, cfg, actiuni, aratAutor }) {
  const [istoric, setIstoric] = useState(null)
  const [deschis, setDeschis] = useState(false)

  async function toggleIstoric() {
    if (!deschis && istoric === null) {
      const { data } = await supabase.from('rap_postev_istoric').select('*').eq('raport_id', raport.id).order('la')
      setIstoric(data || [])
    }
    setDeschis((d) => !d)
  }

  const vizibile = campuriVizibile(cfg.campuri, cfg.matrice, raport.tipuri || [], raport.implicare)
  const valori = valoriVizibile(raport, vizibile)
  const arataContacte = vizibile.some((c) => c.tip === 'contacte') && (raport.contacte || []).length > 0
  const numeTipuri = (raport.tipuri || []).map((c) => cfg.tipuri.find((t) => t.cod === c)?.nume || c)
  const responsabil = cfg.angajati.find((a) => a.id === raport.responsabil_angajat_id)?.nume_complet

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-slate-800">{raport.denumire_oficiala}</p>
          <p className="text-xs text-slate-500">
            {formatData(raport.data_inceput)}
            {raport.data_sfarsit !== raport.data_inceput ? ` – ${formatData(raport.data_sfarsit)}` : ''} · {numeTipuri.join(', ')}
            {raport.eveniment_manual ? ' · introdus manual (nu e în calendar)' : ''}
          </p>
        </div>
        <StareBadge stare={raport.stare} />
      </div>

      <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <Rand k="Responsabil" v={responsabil} />
        <Rand k="Calitatea CNCM-MC" v={raport.implicare} />
        <Rand k="Locația" v={raport.locatie} />
        <Rand
          k={`Localități (total ${totalEvenimente(raport.localitati)} evenimente)`}
          v={(raport.localitati || []).map((l) => `${l.localitate} × ${l.nr}`).join(', ')}
        />
        <Rand k="Echipa de organizare" v={(raport.echipa || []).map((p) => p.nume + (p.tip === 'extern' ? ' (extern)' : '')).join(', ')} />
        {valori.map(({ camp, valoare }) => (
          <Rand
            key={camp.cod}
            k={camp.eticheta}
            v={camp.tip === 'link' ? <a className="text-accent underline" href={valoare} target="_blank" rel="noreferrer">{valoare}</a> : String(valoare)}
          />
        ))}
      </dl>

      {arataContacte && (
        <div className="mt-3 text-sm">
          <p className="text-slate-500">Contacte organizator:</p>
          <ul className="mt-1 space-y-0.5 text-slate-700">
            {raport.contacte.map((c, i) => (
              <li key={i}>{[c.institutie, c.persoana, c.telefon, c.email].filter(Boolean).join(' · ')}</li>
            ))}
          </ul>
        </div>
      )}

      {raport.stare === 'respins' && raport.motiv_stare && (
        <p className="mt-3 rounded-lg bg-rose-50 p-2.5 text-sm text-rose-700"><strong>Motiv respingere:</strong> {raport.motiv_stare}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {actiuni}
        <button onClick={toggleIstoric} className={btnGhost}><History size={14} /> Istoric</button>
      </div>

      {deschis && (
        <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
          {(istoric || []).map((h) => (
            <li key={h.id}>
              {formatDataOra(h.la)} · <strong className="text-slate-700">{h.actiune}</strong>
              {h.nume_utilizator ? ` · ${h.nume_utilizator}` : ''}{h.motiv ? ` · motiv: ${h.motiv}` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Rand({ k, v }) {
  if (!v) return null
  return (
    <div>
      <dt className="inline text-slate-500">{k}: </dt>
      <dd className="inline text-slate-700">{v}</dd>
    </div>
  )
}
