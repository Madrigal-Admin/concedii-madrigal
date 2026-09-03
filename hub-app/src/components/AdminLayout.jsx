import { useState } from 'react'
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

export default function AdminLayout({ onBackToDashboard }) {
  const [active, setActive] = useState('angajati')

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <SiteHeader
        title="Hub Madrigal"
        subtitle="Administrare"
        right={
          <button
            onClick={onBackToDashboard}
            className="text-sm bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium px-3 py-1.5 rounded-lg transition whitespace-nowrap"
          >
            ← Înapoi la tablou
          </button>
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
          {active === 'angajati' && <AdminAngajati />}
          {active === 'acces' && <AdminAccesTooluri />}
          {active === 'departamente' && <AdminDepartamenteFunctii />}
        </main>
      </div>

      <SiteFooter />
    </div>
  )
}
