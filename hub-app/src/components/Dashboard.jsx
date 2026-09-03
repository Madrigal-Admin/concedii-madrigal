import SiteHeader from './SiteHeader'
import SiteFooter from './SiteFooter'

// Lista de tool-uri, static — adaugi un tool nou aici, când e gata.
// tool trebuie să corespundă cu valoarea din coloana "tool" din acces_tooluri.
const TOOLS = [
  {
    tool: 'hr',
    name: 'HR — Concedii',
    description: 'Cereri de concediu, adeverințe, solduri.',
    href: '/HR/',
  },
  {
    tool: 'invitatii',
    name: 'Invitații & RSVP',
    description: 'Gestionare invitații, confirmări și check-in.',
    href: '/invitatii/',
  },
]

export default function Dashboard({ angajat, accesTooluri, isHubAdmin, onOpenAdmin, onSignOut }) {
  const accesSet = new Set(accesTooluri.map((a) => a.tool))

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <SiteHeader
        title="Hub Madrigal"
        subtitle={`Bun venit, ${angajat.nume_complet}`}
        right={
          <button
            onClick={onSignOut}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Deconectare
          </button>
        }
      />

      <main className="flex-1 max-w-5xl mx-auto px-6 py-10 w-full">
        <h2 className="text-sm font-medium text-slate-500 mb-4">Tool-urile tale</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isHubAdmin && (
            <button
              onClick={onOpenAdmin}
              className="text-left bg-white rounded-xl shadow-sm p-5 border border-accent/20 hover:shadow-md transition"
            >
              <p className="font-medium text-slate-800">Administrare Hub</p>
              <p className="text-sm text-slate-500 mt-1">
                Angajați, acces la tool-uri, departamente și funcții.
              </p>
            </button>
          )}

          {TOOLS.map((t) => {
            const hasAccess = accesSet.has(t.tool)
            return hasAccess ? (
              <a
                key={t.tool}
                href={t.href}
                className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition"
              >
                <p className="font-medium text-slate-800">{t.name}</p>
                <p className="text-sm text-slate-500 mt-1">{t.description}</p>
              </a>
            ) : (
              <div
                key={t.tool}
                className="bg-slate-100 rounded-xl p-5 opacity-60 cursor-not-allowed"
                title="Nu ai acces la acest tool"
              >
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">🔒</span>
                  <p className="font-medium text-slate-500">{t.name}</p>
                </div>
                <p className="text-sm text-slate-400 mt-1">
                  Nu ai acces. Contactează adminul dacă ai nevoie.
                </p>
              </div>
            )
          })}
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
