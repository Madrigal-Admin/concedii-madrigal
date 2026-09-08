import { LogOut, ArrowLeft } from 'lucide-react'

export default function Navbar({ displayName, roleLabel, onLogout }) {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <div className="site-header__brand">
          <img src="/assets/logo-madrigal.png" alt="Madrigal" className="site-header__logo" />
          <div className="site-header__text">
            <h1>Invitații &amp; RSVP</h1>
            <p>Corul Madrigal</p>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-2 text-sm">
          <a
            href="/"
            className="flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 focus-ring transition"
          >
            <ArrowLeft size={15} />
            Hub
          </a>

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
