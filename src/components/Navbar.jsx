import { LogOut, UserRound } from 'lucide-react'

export default function Navbar({ view, setView, session, role, displayName, onLogout }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-y-2 px-5 py-4">
        <button
          onClick={() => setView('public')}
          className="flex items-center gap-2 text-left focus-ring rounded"
        >
          <img src="/logo.png" alt="Madrigal" className="h-10 w-auto" />
        </button>

        <nav className="flex flex-wrap items-center gap-2 text-sm">
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

          <button
            onClick={() => setView('certificate')}
            className={`rounded-full px-3 py-1.5 font-medium focus-ring transition ${
              view === 'certificate'
                ? 'bg-brand-50 text-brand-700'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Cerere adeverințe
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

          {session && displayName && (
            <span className="hidden max-w-[160px] truncate rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 sm:inline-block">
              {displayName}
            </span>
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
