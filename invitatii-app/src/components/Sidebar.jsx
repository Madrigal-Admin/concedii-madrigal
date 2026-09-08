const SECTIONS = [
  { key: 'evenimente', label: 'Evenimente', roles: ['full', 'checkin'] },
  { key: 'persoane', label: 'Persoane', roles: ['full'] },
  { key: 'checkin', label: 'Check-in', roles: ['full', 'checkin'] },
  { key: 'aprobari', label: 'Aprobări', roles: ['full'] },
]

export default function Sidebar({ view, onSelect, role }) {
  const sections = SECTIONS.filter((s) => s.roles.includes(role))

  return (
    <aside className="md:w-56 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex-shrink-0">
      <nav className="flex md:flex-col overflow-x-auto p-2 gap-1">
        {sections.map((s) => (
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
      </nav>
    </aside>
  )
}
