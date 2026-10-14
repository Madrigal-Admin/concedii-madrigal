// Meniul se adaptează pe rol. Grupurile apar doar dacă are cel puțin o secțiune permisă.
export const SECTIUNI = [
  { grup: 'Rapoarte de activitate', key: 'mele', label: 'Rapoartele mele', roles: ['angajat', 'admin_activitate', 'admin_general'] },
  { grup: 'Rapoarte de activitate', key: 'verificare', label: 'De verificat', roles: ['admin_activitate', 'admin_general'] },
  { grup: 'Rapoarte de activitate', key: 'nedepuse', label: 'Cine nu a depus', roles: ['admin_activitate', 'admin_general'] },
  { grup: 'Rapoarte de activitate', key: 'persoane', label: 'Persoane și contracte', roles: ['admin_activitate', 'admin_general'] },
  { grup: 'Rapoarte post-eveniment', key: 'postev', label: 'Rapoarte post-eveniment', roles: ['angajat', 'admin_postev', 'admin_general'] },
  { grup: 'Rapoarte post-eveniment', key: 'dashboard', label: 'Dashboard', roles: ['admin_postev', 'vizualizare', 'admin_general'] },
  { grup: 'Administrare', key: 'structura', label: 'Structura rapoartelor', roles: ['admin_general'] },
]

export function sectiuniPermise(rol) {
  return SECTIUNI.filter((s) => s.roles.includes(rol))
}

export default function Sidebar({ view, onSelect, role }) {
  const sectiuni = sectiuniPermise(role)
  const grupuri = [...new Set(sectiuni.map((s) => s.grup))]

  return (
    <aside className="md:w-60 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex-shrink-0">
      <nav className="flex md:flex-col overflow-x-auto p-2 gap-1">
        {grupuri.map((g) => (
          <div key={g} className="flex md:flex-col gap-1">
            <p className="hidden md:block px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {g}
            </p>
            {sectiuni
              .filter((s) => s.grup === g)
              .map((s) => (
                <button
                  key={s.key}
                  onClick={() => onSelect(s.key)}
                  className={`text-left text-sm px-3 py-2 rounded-lg transition whitespace-nowrap ${
                    view === s.key ? 'bg-accent/10 text-accent font-medium' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {s.label}
                </button>
              ))}
          </div>
        ))}
      </nav>
    </aside>
  )
}
