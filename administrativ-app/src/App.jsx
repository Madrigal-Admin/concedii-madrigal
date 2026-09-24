import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { supabase } from './supabaseClient'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import CatalogTab from './components/CatalogTab'
import CereriTab from './components/CereriTab'
import CereriAdminTab from './components/CereriAdminTab'
import MentenantaTab from './components/MentenantaTab'

const ROLE_LABELS = { full: 'Admin', angajat: 'Angajat' }

export default function App() {
  const [session, setSession] = useState(undefined)
  const [role, setRole] = useState(null)
  const [angajat, setAngajat] = useState(null)
  const [view, setView] = useState('')
  const [checkingRole, setCheckingRole] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session === undefined) return
    if (!session) {
      window.location.href = '/'
      return
    }
    resolveRole(session)
  }, [session])

  async function resolveRole(session) {
    setCheckingRole(true)
    const { data: angajatRow } = await supabase
      .from('angajati')
      .select('*, department:departments(name)')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (!angajatRow) {
      setRole('unknown')
      setCheckingRole(false)
      return
    }

    const { data: accesRow } = await supabase
      .from('acces_tooluri')
      .select('rol')
      .eq('angajat_id', angajatRow.id)
      .eq('tool', 'administrativ')
      .maybeSingle()

    const rol = accesRow?.rol || 'unknown'
    setAngajat(angajatRow)
    setRole(rol)
    setView(rol === 'full' ? 'catalog' : 'cereri')
    setCheckingRole(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const displayName = angajat?.nume_complet || session?.user?.email || null

  if (!session || checkingRole) {
    return <p className="mx-auto max-w-5xl px-5 py-10 text-sm text-slate-500">Se încarcă…</p>
  }

  if (role === 'unknown') {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <Navbar displayName={displayName} roleLabel={null} onLogout={handleLogout} />
        <main className="flex flex-1 items-center justify-center px-4">
          <div className="mx-auto max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
            Contul tău nu are acces la tool-ul Administrativ. Contactează un administrator din Hub, în
            secțiunea „Acces Tool-uri".
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
            {view === 'catalog' && role === 'full' && <CatalogTab />}
            {view === 'cereri-admin' && role === 'full' && <CereriAdminTab />}
            {view === 'mentenanta' && role === 'full' && <MentenantaTab />}
            {view === 'cereri' && <CereriTab angajat={angajat} />}
          </div>
        </main>
      </div>

      <footer className="site-footer">
        <p>
          Probleme sau întrebări?{' '}
          <a href="mailto:digitalizare@madrigal.ro">digitalizare@madrigal.ro</a>
        </p>
      </footer>
    </div>
  )
}
