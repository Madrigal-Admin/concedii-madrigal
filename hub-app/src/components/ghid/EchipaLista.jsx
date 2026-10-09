import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

function initiale(nume) {
  return nume
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

// Transformă lista plată (fiecare rând cu parinte_id) într-un arbore:
// [{ ...persoana, copii: [...] }]. Rădăcinile sunt persoanele fără
// superior (sau al căror superior nu mai există în listă).
function construiesteArbore(persoane) {
  const dupaId = new Map(persoane.map((p) => [p.id, { ...p, copii: [] }]))
  const radacini = []

  for (const p of dupaId.values()) {
    if (p.parinte_id && dupaId.has(p.parinte_id)) {
      dupaId.get(p.parinte_id).copii.push(p)
    } else {
      radacini.push(p)
    }
  }

  return radacini
}

function Cutie({ persoana }) {
  return (
    <div className="inline-flex items-center gap-2.5 bg-white border border-slate-200 rounded-xl shadow-sm px-4 py-2.5 max-w-[240px]">
      <span className="w-8 h-8 flex-shrink-0 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-semibold">
        {initiale(persoana.nume)}
      </span>
      <div className="text-left">
        <p className="text-sm font-medium text-slate-800 leading-tight">{persoana.nume}</p>
        <p className="text-xs text-slate-500 leading-tight">{persoana.rol}</p>
      </div>
    </div>
  )
}

// Desktop/tabletă — cutii conectate prin linii, de la stânga la dreapta (vezi .org-lr în index.css).
function NodDesktop({ persoana }) {
  return (
    <li>
      <Cutie persoana={persoana} />
      {persoana.copii.length > 0 && (
        <ul>
          {persoana.copii.map((copil) => (
            <NodDesktop key={copil.id} persoana={copil} />
          ))}
        </ul>
      )}
    </li>
  )
}

// Mobil — liniile orizontale nu mai încap, deci devine o listă ierarhică
// simplă, cu indentare pe nivel (cum era cerut în specificație).
function NodMobil({ persoana, nivel }) {
  return (
    <div>
      <div style={{ paddingLeft: nivel * 20 }} className="py-1.5">
        <Cutie persoana={persoana} />
      </div>
      {persoana.copii.map((copil) => (
        <NodMobil key={copil.id} persoana={copil} nivel={nivel + 1} />
      ))}
    </div>
  )
}

// Tab-ul "Echipa" — organigramă simplă, întreținută manual din Admin Hub
// (nume + rol + superior), NU legată de tabelul angajați.
export default function EchipaLista() {
  const [arbore, setArbore] = useState([])
  const [loading, setLoading] = useState(true)
  const [eroare, setEroare] = useState('')

  useEffect(() => {
    let activ = true
    supabase
      .from('ghid_echipa_persoane')
      .select('*')
      .order('ordine', { ascending: true })
      .then(({ data, error }) => {
        if (!activ) return
        if (error) {
          setEroare(error.message)
        } else {
          setArbore(construiesteArbore(data || []))
        }
        setLoading(false)
      })
    return () => {
      activ = false
    }
  }, [])

  if (loading) return <p className="text-sm text-slate-400">Se încarcă...</p>
  if (eroare) return <p className="text-sm text-rose-600">Eroare: {eroare}</p>
  if (arbore.length === 0) {
    return <p className="text-sm text-slate-400">Organigrama se completează în curând.</p>
  }

  return (
    <div>
      {/* Desktop/tabletă — organigramă stânga → dreapta */}
      <div className="hidden sm:block overflow-x-auto">
        <ul className="org-lr">
          {arbore.map((radacina) => (
            <NodDesktop key={radacina.id} persoana={radacina} />
          ))}
        </ul>
      </div>

      {/* Mobil — listă ierarhică indentată */}
      <div className="sm:hidden space-y-1">
        {arbore.map((radacina) => (
          <NodMobil key={radacina.id} persoana={radacina} nivel={0} />
        ))}
      </div>
    </div>
  )
}
