import { useState } from 'react'
import { supabase } from '../supabaseClient'
import SiteHeader from './SiteHeader'
import SiteFooter from './SiteFooter'

export default function Auth() {
  const [tab, setTab] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setLoading(false)
    if (error) setError('Email sau parolă greșită.')
  }

  async function handleSignup(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)

    const cleanEmail = email.trim()

    // 1. Verificăm dacă emailul există în angajati (adăugat de admin)
    const { data: angajat, error: lookupError } = await supabase
      .from('angajati')
      .select('id, user_id')
      .eq('email', cleanEmail)
      .maybeSingle()

    if (lookupError || !angajat) {
      setLoading(false)
      setError(
        'Acest email nu a fost găsit în lista de angajați. Contactează adminul.'
      )
      return
    }

    if (angajat.user_id) {
      setLoading(false)
      setError('Există deja un cont pentru acest email. Folosește "Am cont".')
      return
    }

    // 2. Creăm contul de autentificare
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
    })

    if (signUpError) {
      setLoading(false)
      setError(signUpError.message)
      return
    }

    // 3. Legăm contul nou de rândul din angajati
    if (signUpData?.user) {
      await supabase
        .from('angajati')
        .update({ user_id: signUpData.user.id })
        .eq('email', cleanEmail)
    }

    setLoading(false)
    setInfo('Cont creat cu succes! Te poți autentifica acum.')
    setTab('login')
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <SiteHeader
        title="Hub Madrigal"
        subtitle="Autentificare pentru toate tool-urile Madrigal"
      />

      <div className="flex-1 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => {
                setTab('login')
                setError('')
                setInfo('')
              }}
              className={`flex-1 text-sm py-1.5 rounded-md transition ${
                tab === 'login'
                  ? 'bg-white shadow-sm text-slate-800'
                  : 'text-slate-500'
              }`}
            >
              Am cont
            </button>
            <button
              onClick={() => {
                setTab('signup')
                setError('')
                setInfo('')
              }}
              className={`flex-1 text-sm py-1.5 rounded-md transition ${
                tab === 'signup'
                  ? 'bg-white shadow-sm text-slate-800'
                  : 'text-slate-500'
              }`}
            >
              Sunt angajat, vreau cont
            </button>
          </div>

          <form onSubmit={tab === 'login' ? handleLogin : handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Parolă</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {info && <p className="text-sm text-green-600">{info}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-hover text-white text-sm font-medium py-2.5 rounded-lg transition disabled:opacity-50"
            >
              {loading
                ? 'Se procesează...'
                : tab === 'login'
                ? 'Conectare'
                : 'Creează cont'}
            </button>
          </form>
        </div>
      </div>
      </div>

      <SiteFooter />
    </div>
  )
}
