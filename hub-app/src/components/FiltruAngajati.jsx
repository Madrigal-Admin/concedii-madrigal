import { Search } from 'lucide-react'

export const FILTRU_GOL = { q: '', departament: '', functie: '' }

const norm = (t) =>
  (t || '')
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

// Caută după nume (și email), fără să conteze diacriticele; apoi filtrează
// după departament / funcție.
export function potrivesteFiltru(a, f) {
  if (f.departament && a.departament_id !== f.departament) return false
  if (f.functie && a.functie_id !== f.functie) return false
  if (f.q) {
    const q = norm(f.q.trim())
    if (!norm(a.nume_complet).includes(q) && !norm(a.email).includes(q)) return false
  }
  return true
}

export default function FiltruAngajati({ value, onChange, departments, positions, total, afisati }) {
  const set = (k, v) => onChange({ ...value, [k]: v })
  const activ = value.q || value.departament || value.functie
  const cls =
    'rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent'
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <div className="relative min-w-[220px] flex-1">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={value.q}
          onChange={(e) => set('q', e.target.value)}
          placeholder="Caută după nume…"
          className={`${cls} w-full pl-9`}
        />
      </div>
      <select value={value.departament} onChange={(e) => set('departament', e.target.value)} className={cls}>
        <option value="">Toate departamentele</option>
        {departments.map((d) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>
      <select value={value.functie} onChange={(e) => set('functie', e.target.value)} className={cls}>
        <option value="">Toate funcțiile</option>
        {positions.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      {activ && (
        <button onClick={() => onChange(FILTRU_GOL)} className="text-sm text-slate-500 underline hover:text-slate-700">
          Șterge filtrele
        </button>
      )}
      <span className="text-xs text-slate-400">
        {afisati} din {total}
      </span>
    </div>
  )
}
