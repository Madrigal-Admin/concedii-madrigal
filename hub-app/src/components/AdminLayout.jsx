import { useState } from 'react'
import { LogOut, ArrowLeft } from 'lucide-react'
import AdminAngajati from './AdminAngajati'
import AdminAccesTooluri from './AdminAccesTooluri'
import AdminDepartamenteFunctii from './AdminDepartamenteFunctii'
import SiteHeader from './SiteHeader'
import SiteFooter from './SiteFooter'

const SECTIONS = [
  { key: 'angajati', label: 'Angajați' },
  { key: 'acces', label: 'Acces Tool-uri' },
  { key: 'departamente', label: 'Departamente & Funcții' },
]

export default function AdminLayout({ angajat, onBackToDashboard, onSignOut }) {
  const [active, setActive] = useState('angajati')

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <SiteHeader
        title="Administrare Hub"
        right={
          <div className="flex items-center gap-2">
            {angajat && (
              <span className="hidden max-w-[220px] truncate rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 sm:inline-block">
                {angajat.nume_complet}
              </span>
            )}
            <button
              onClick={onSignOut}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium text-slate-500 hover:bg-slate-100 focus-ring transition"
              title="Deconectare"
            >
              <LogOut size={15} />
            </button>
          </div>
        }
      />

      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        <aside className="md:w-56 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex-shrink-0">
          <nav className="flex md:flex-col overflow-x-auto p-2 gap-1">
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                onClick={() => setActive(s.key)}
                className={`text-left text-sm px-3 py-2 rounded-lg transition whitespace-nowrap ${
                  active === s.key
                    ? 'bg-accent/10 text-accent font-medium'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {s.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-6 md:p-8 min-w-0">
          <button
            onClick={onBackToDashboard}
            className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 focus-ring transition"
          >
            <ArrowLeft size={15} />
            Înapoi la Hub
          </button>
          {active === 'angajati' && <AdminAngajati />}
          {active === 'acces' && <AdminAccesTooluri />}
          {active === 'departamente' && <AdminDepartamenteFunctii />}
        </main>
      </div>

      <SiteFooter />
    </div>
  )
}
