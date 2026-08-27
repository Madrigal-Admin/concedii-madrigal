import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Navbar from './components/Navbar'
import PublicRequestForm from './components/PublicRequestForm'
import CertificateRequestForm from './components/CertificateRequestForm'
import Login from './components/Login'
import AdminDashboard from './components/AdminDashboard'
import EmployeeDashboard from './components/EmployeeDashboard'

export default function App() {
  const [session, setSession] = useState(null)
  const [role, setRole] = useState(null) // 'admin' | 'employee' | null
  const [employee, setEmployee] = useState(null)
  const [view, setView] = useState('public')
  const [checkingRole, setCheckingRole] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) {
      resolveRole(session)
    } else {
      setRole(null)
      setEmployee(null)
      setView('public')
    }
  }, [session])

  async function resolveRole(session) {
    setCheckingRole(true)
    const uid = session.user.id
    const email = session.user.email

    const { data: adminRow } = await supabase.from('admins').select('id').eq('id', uid).maybeSingle()
    if (adminRow) {
      setRole('admin')
      setView('admin')
      setCheckingRole(false)
      return
    }

    const { data: empRow } = await supabase
      .from('employees')
      .select('*, department:departments(name), position:positions(name)')
      .eq('email', email)
      .maybeSingle()

    if (empRow) {
      setRole('employee')
      setEmployee(empRow)
      setView('employee')
    } else {
      setRole('unknown')
      setView('public')
    }
    setCheckingRole(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setView('public')
  }

  const displayName = role === 'employee' ? employee?.full_name : role === 'admin' ? session?.user?.email : null

  return (
    <div className="min-h-screen">
      <Navbar
        view={view}
        setView={setView}
        session={session}
        role={role}
        displayName={displayName}
        onLogout={handleLogout}
      />

      <main className="mx-auto max-w-5xl px-5 py-10">
        {view === 'public' && <PublicRequestForm />}
        {view === 'certificate' && <CertificateRequestForm />}
        {view === 'login' && !session && <Login />}

        {view === 'login' && session && checkingRole && (
          <p className="text-sm text-slate-500">Se verifică contul…</p>
        )}

        {session && role === 'unknown' && (
          <div className="mx-auto max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
            Contul tău este autentificat, dar nu este asociat niciunui angajat sau administrator.
            Cere HR-ului să te adauge în lista de angajați cu același email.
          </div>
        )}

        {view === 'admin' && role === 'admin' && <AdminDashboard />}
        {view === 'employee' && role === 'employee' && employee && (
          <EmployeeDashboard employee={employee} />
        )}
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        Madrigal - Documente Resurse Umane
      </footer>
    </div>
  )
}
