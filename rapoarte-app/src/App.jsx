import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { supabase } from './supabaseClient'
import Navbar from './components/Navbar'
import Sidebar, { sectiuniPermise } from './components/Sidebar'
import ComingSoon from './components/ComingSoon'
import RapoarteleMele from './components/RapoarteleMele'
import Verificare from './components/Verificare'
import Nedepuse from './components/Nedepuse'
import PersoaneContracte from './components/PersoaneContracte'
import Structura from './components/Structura'
import PostevMele from './components/PostevMele'
import PostevAdmin from './components/PostevAdmin'
import { ROLE_LABELS } from './lib/roluri'

export default function App() {
  const [session, setSession] = useState(undefined)
  const [role, setRole] = useState(null) // null = încă se verifică, 'none' = fără acces
  const [angajat, setAngajat] = useState(null)
  const [view, setView] = useState('')
  const [checkingRole, setCheckingRole] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => listener.subscription.unsubscribe()
  }, [])

  // Rolul se recalculează doar când se schimbă utilizatorul (nu la fiecare
  // reînnoire de token), ca să nu se piardă datele nesalvate din formulare.
  const userId = session === undefined ? undefined : session?.user?.id ?? null

  useEffect(() => {
    if (userId === undefined) return
    if (!userId) {
      window.location.href = '/'
      return
    }
    resolveRole(session)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  async function resolveRole(s) {
    setCheckingRole(true)
    const { data: angajatRow } = await supabase
      .from('angajati')
      .select('*')
      .eq('user_id', s.user.id)
      .maybeSingle()
    setAngajat(angajatRow || null)

    const { data: rol } = await supabase.rpc('rap_rol')
    const r = rol || 'none'
    setRole(r)
    setView(sectiuniPermise(r)[0]?.key || '')
    setCheckingRole(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const displayName = angajat?.nume_complet || session?.user?.email || null

  if (!session || checkingRole || role === null) {
    return <p className="mx-auto max-w-5xl px-5 py-10 text-sm text-slate-500">Se încarcă…</p>
  }

  if (role === 'none') {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <Navbar displayName={displayName} roleLabel={null} onLogout={handleLogout} />
        <main className="flex flex-1 items-center justify-center px-4">
          <div className="mx-auto max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
            Contul tău nu are acces la tool-ul Rapoarte. Contactează un administrator din Hub, în secțiunea
            „Acces Tool-uri".
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar displayName={displayName} roleLabel={ROLE_LABELS[role]} onLogout={handleLogout} />

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <Sidebar view={view} onSelect={setView} role={role} />

        <main className="min-w-0 flex-1 p-6 md:p-8">
          <a
            href="/"
            className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 focus-ring"
          >
            <ArrowLeft size={15} />
            Înapoi la Hub
          </a>

          <div className="mx-auto max-w-5xl">
            {view === 'mele' && <RapoarteleMele angajat={angajat} role={role} />}
            {view === 'verificare' && <Verificare role={role} />}
            {view === 'nedepuse' && <Nedepuse />}
            {view === 'persoane' && <PersoaneContracte />}
            {view === 'structura' && <Structura />}
            {view === 'postev' && <PostevMele angajat={angajat} role={role} />}
            {view === 'postev-admin' && <PostevAdmin angajat={angajat} />}
            {view === 'dashboard' && (
              <ComingSoon titlu="Dashboard" text="Dashboardul rapoartelor post-eveniment urmează după formular." />
            )}
          </div>
        </main>
      </div>

      <footer className="site-footer">
        <p>
          Probleme sau întrebări? <a href="mailto:digitalizare@madrigal.ro">digitalizare@madrigal.ro</a>
        </p>
      </footer>
    </div>
  )
}
