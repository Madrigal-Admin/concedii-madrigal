import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import AdminLayout from './components/AdminLayout'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = încă neverificat
  const [angajat, setAngajat] = useState(null)
  const [accesTooluri, setAccesTooluri] = useState([])
  const [view, setView] = useState('dashboard') // 'dashboard' | 'admin'
  const [loadingProfil, setLoadingProfil] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) {
      setAngajat(null)
      setAccesTooluri([])
      setLoadingProfil(false)
      return
    }

    async function loadProfil() {
      setLoadingProfil(true)
      const { data: angajatData } = await supabase
        .from('angajati')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle()

      setAngajat(angajatData)

      if (angajatData) {
        const { data: accesData } = await supabase
          .from('acces_tooluri')
          .select('tool, rol')
          .eq('angajat_id', angajatData.id)
        setAccesTooluri(accesData || [])
      }

      setLoadingProfil(false)
    }

    loadProfil()
  }, [session])

  async function handleSignOut() {
    await supabase.auth.signOut()
    setView('dashboard')
  }

  // Încă verificăm dacă există o sesiune salvată
  if (session === undefined || loadingProfil) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-400 text-sm">Se încarcă...</p>
      </div>
    )
  }

  if (!session) {
    return <Auth />
  }

  if (!angajat) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center max-w-sm">
          <p className="text-slate-800 font-medium mb-2">Cont neconfigurat</p>
          <p className="text-sm text-slate-500 mb-4">
            Contul tău e autentificat, dar nu e legat de niciun rând din lista de angajați.
            Contactează adminul.
          </p>
          <button
            onClick={handleSignOut}
            className="text-sm text-accent hover:underline"
          >
            Deconectare
          </button>
        </div>
      </div>
    )
  }

  const isHubAdmin = accesTooluri.some((a) => a.tool === 'hub' && a.rol === 'admin')

  if (view === 'admin' && isHubAdmin) {
    return <AdminLayout onBackToDashboard={() => setView('dashboard')} />
  }

  return (
    <Dashboard
      angajat={angajat}
      accesTooluri={accesTooluri}
      isHubAdmin={isHubAdmin}
      onOpenAdmin={() => setView('admin')}
      onSignOut={handleSignOut}
    />
  )
}
