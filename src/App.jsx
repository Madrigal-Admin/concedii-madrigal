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
  const [role, setRole] = useState(null) // 'full_admin' | 'limited_admin' | 'employee' | 'unknown' | null
  const [employee, setEmployee] = useState(null)
  const [view, setView] = useState('login')
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
      setView('login')
    }
  }, [session])

  async function resolveRole(session) {
    setCheckingRole(true)
    const uid = session.user.id
    const email = session.user.email

    // Caută întâi angajatul cu acest email — indiferent dacă e și admin —
    // ca să-i putem lega contul (necesar pentru promovarea la rol de admin).
    const { data: empRow } = await supabase
      .from('employees')
      .select('*, department:departments(name), position:positions(name)')
      .eq('email', email)
      .maybeSingle()

    if (empRow && empRow.auth_user_id !== uid) {
      supabase.from('employees').update({ auth_user_id: uid }).eq('id', empRow.id) // fire-and-forget
    }

    const { data: adminRow } = await supabase.from('admins').select('role').eq('id', uid).maybeSingle()
    if (adminRow) {
      setRole(adminRow.role === 'limited' ? 'limited_admin' : 'full_admin')
      setEmployee(empRow || null)
      setView('admin')
      setCheckingRole(false)
      return
    }

    if (empRow) {
      setRole('employee')
      setEmployee(empRow)
      setView('employee')
    } else {
      setRole('unknown')
      setView('login')
    }
    setCheckingRole(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setView('login')
  }

  const isAdmin = role === 'full_admin' || role === 'limited_admin'
  // Un admin care e și angajat (fișă în tabelul employees) trebuie să poată
  // depune propriile cereri, ca oricare alt angajat.
  const hasEmployeeAccess = role === 'employee' || (isAdmin && !!employee)
  const roleLabel =
    role === 'full_admin' ? 'HR Admin' : role === 'limited_admin' ? 'HR Operational' : role === 'employee' ? 'Angajat' : null
  const displayName = employee?.full_name || session?.user?.email || null

  return (
    <div className="min-h-screen">
      <Navbar
        view={view}
        setView={setView}
        session={session}
        role={role}
        hasEmployeeAccess={hasEmployeeAccess}
        displayName={displayName}
        roleLabel={roleLabel}
        onLogout={handleLogout}
      />

      <main className="mx-auto max-w-5xl px-5 py-10">
        {!session && <Login />}

        {session && checkingRole && <p className="text-sm text-slate-500">Se verifică contul…</p>}

        {session && !checkingRole && role === 'unknown' && (
          <div className="mx-auto max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
            Contul tău este autentificat, dar nu este asociat niciunui angajat sau administrator.
            Cere HR-ului să te adauge în lista de angajați cu același email.
          </div>
        )}

        {session && hasEmployeeAccess && view === 'leave' && employee && (
          <PublicRequestForm employee={employee} />
        )}
        {session && hasEmployeeAccess && view === 'certificate' && employee && (
          <CertificateRequestForm employee={employee} />
        )}

        {session && isAdmin && view === 'admin' && <AdminDashboard role={role} currentEmployee={employee} />}
        {session && hasEmployeeAccess && view === 'employee' && employee && (
          <EmployeeDashboard employee={employee} />
        )}
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        Madrigal - Documente Resurse Umane
      </footer>
    </div>
  )
}
