export default function Sidebar({ view, onSelect }) {
  const isOnEmployeeSide = view === 'employee' || view === 'leave' || view === 'certificate'

  return (
    <aside className="md:w-56 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex-shrink-0">
      <nav className="flex md:flex-col overflow-x-auto p-2 gap-1">
        <button
          onClick={() => onSelect('employee')}
          className={`text-left text-sm px-3 py-2 rounded-lg transition whitespace-nowrap ${
            isOnEmployeeSide
              ? 'bg-brand-50 text-brand-700 font-medium'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Panoul meu
        </button>
        <button
          onClick={() => onSelect('admin')}
          className={`text-left text-sm px-3 py-2 rounded-lg transition whitespace-nowrap ${
            view === 'admin' ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Panou Admin
        </button>
      </nav>
    </aside>
  )
}
