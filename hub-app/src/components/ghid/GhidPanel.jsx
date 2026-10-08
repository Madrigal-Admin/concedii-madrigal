import { useState } from 'react'
import { Search, ChevronRight } from 'lucide-react'
import { CATEGORII_GHID } from './categorii'
import { deschideGhid } from './GhidRouter'

// Panoul "Ghidul angajatului" — strict SECUNDAR față de tool-urile din
// Dashboard: fundal gri-albăstrui, cele 4 categorii în casete compacte
// pe un rând (fără descrieri pe casetă), plus o căutare. Apare DOAR pe
// homepage, doar pentru angajații autentificați (Dashboard-ul deja
// garantează asta).
export default function GhidPanel() {
  const [cautare, setCautare] = useState('')

  const cautareNormalizata = cautare.trim().toLowerCase()
  const categoriiFiltrate = cautareNormalizata
    ? CATEGORII_GHID.filter((c) => c.label.toLowerCase().includes(cautareNormalizata))
    : CATEGORII_GHID

  return (
    <section className="mt-8 rounded-xl bg-slate-100/80 border border-slate-200 p-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-700">Ghidul angajatului</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Informații despre Madrigal, la care revii când ai nevoie.
          </p>
        </div>

        <div className="relative sm:w-64 flex-shrink-0">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={cautare}
            onChange={(e) => setCautare(e.target.value)}
            placeholder="Caută în ghid"
            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {categoriiFiltrate.map((c) => {
          const Icon = c.icon
          return (
            <button
              key={c.key}
              onClick={() => deschideGhid(c.key)}
              className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-lg px-4 py-3 text-left hover:shadow-sm hover:border-accent/30 transition focus-ring"
            >
              <Icon size={16} className="text-slate-400 flex-shrink-0" />
              <span className="flex-1 text-sm font-medium text-slate-700">{c.label}</span>
              <ChevronRight size={16} className="text-slate-400 flex-shrink-0" />
            </button>
          )
        })}
      </div>

      {categoriiFiltrate.length === 0 && (
        <p className="text-sm text-slate-400 mt-3">Niciun rezultat pentru "{cautare}".</p>
      )}
    </section>
  )
}
