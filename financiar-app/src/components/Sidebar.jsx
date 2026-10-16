export const SECTIUNI = [
  { grup: 'Documente', key: 'referate', label: 'Referate de necesitate', roles: ['angajat', 'admin_financiar', 'admin_general'] },
  { grup: 'Documente', key: 'deconturi', label: 'Deconturi de cheltuieli', roles: ['angajat', 'admin_financiar', 'admin_general'] },
  { grup: 'Administrare', key: 'liste', label: 'Liste prestabilite (prețuri)', roles: ['admin_financiar', 'admin_general'] },
  { grup: 'Administrare', key: 'setari', label: 'Setări', roles: ['admin_financiar', 'admin_general'] },
  { grup: 'Administrare', key: 'sabloane', label: 'Șabloane Word', roles: ['admin_financiar', 'admin_general'] },
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
            <p className="hidden md:block px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{g}</p>
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
