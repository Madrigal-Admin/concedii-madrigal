import { LogOut } from 'lucide-react'

export default function Navbar({ view, setView, role, hasEmployeeAccess, displayName, roleLabel, onLogout }) {
  const isAdmin = role === 'full_admin' || role === 'limited_admin'
  const homeView = isAdmin ? 'admin' : 'employee'

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <button onClick={() => setView(homeView)} className="site-header__brand text-left focus-ring rounded">
          <img src="/assets/logo-madrigal.png" alt="Madrigal" className="site-header__logo" />
          <div className="site-header__text">
            <h1>Concedii &amp; Adeverințe</h1>
            <p>Resurse Umane — Corul Madrigal</p>
          </div>
        </button>

        <nav className="flex flex-wrap items-center gap-2 text-sm">
          {hasEmployeeAccess && (
            <>
              <button
                onClick={() => setView('leave')}
                className={`rounded-full px-3 py-1.5 font-medium focus-ring transition ${
                  view === 'leave' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Cerere concediu
              </button>

              <button
                onClick={() => setView('certificate')}
                className={`rounded-full px-3 py-1.5 font-medium focus-ring transition ${
                  view === 'certificate' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Cerere adeverințe
              </button>

              <button
                onClick={() => setView('employee')}
                className={`rounded-full px-3 py-1.5 font-medium focus-ring transition ${
                  view === 'employee' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Panoul meu
              </button>
            </>
          )}

          {isAdmin && (
            <button
              onClick={() => setView('admin')}
              className={`rounded-full px-3 py-1.5 font-medium focus-ring transition ${
                view === 'admin' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Panou Admin
            </button>
          )}

          {displayName && (
            <span className="hidden max-w-[220px] truncate rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 sm:inline-block">
              {displayName}
              {roleLabel ? ` · ${roleLabel}` : ''}
            </span>
          )}

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium text-slate-500 hover:bg-slate-100 focus-ring"
            title="Deconectare"
          >
            <LogOut size={15} />
          </button>
        </nav>
      </div>
    </header>
  )
}
