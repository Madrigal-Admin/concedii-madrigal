import { CalendarDays, LogOut, UserRound } from 'lucide-react'

export default function Navbar({ view, setView, session, role, onLogout }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <button
          onClick={() => setView('public')}
          className="flex items-center gap-2 text-left focus-ring rounded"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <CalendarDays size={18} />
          </span>
          <span>
            <span className="block font-display text-lg font-semibold leading-tight text-ink">
              Concedii Madrigal
            </span>
            <span className="block text-xs text-slate-500">gestiune zile de concediu</span>
          </span>
        </button>

        <nav className="flex items-center gap-2 text-sm">
          <button
            onClick={() => setView('public')}
            className={`rounded-full px-3 py-1.5 font-medium focus-ring transition ${
              view === 'public'
                ? 'bg-brand-50 text-brand-700'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Cerere concediu
          </button>

          {!session && (
            <button
              onClick={() => setView('login')}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium focus-ring transition ${
                view === 'login' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <UserRound size={15} />
              Autentificare
            </button>
          )}

          {session && role === 'admin' && (
            <button
              onClick={() => setView('admin')}
              className={`rounded-full px-3 py-1.5 font-medium focus-ring transition ${
                view === 'admin' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Panou Admin
            </button>
          )}

          {session && role === 'employee' && (
            <button
              onClick={() => setView('employee')}
              className={`rounded-full px-3 py-1.5 font-medium focus-ring transition ${
                view === 'employee' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Panoul meu
            </button>
          )}

          {session && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium text-slate-500 hover:bg-slate-100 focus-ring"
              title="Deconectare"
            >
              <LogOut size={15} />
            </button>
          )}
        </nav>
      </div>
    </header>
  )
}
