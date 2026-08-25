import { useState } from 'react'
import { LogIn, UserPlus, AlertCircle } from 'lucide-react'
import { supabase } from '../supabaseClient'

export default function Login() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function handleSignIn(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError('Email sau parolă greșită.')
  }

  async function handleSignUp(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)

    // Contul de angajat poate fi creat DOAR dacă emailul există deja
    // în lista de angajați introdusă de Admin.
    const { data: match } = await supabase
      .from('employees')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle()

    if (!match) {
      setLoading(false)
      setError(
        'Acest email nu este în lista de angajați. Cere adminului să te adauge întâi, apoi revino aici.'
      )
      return
    }

    const { error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setInfo('Cont creat! Dacă ți se cere confirmare prin email, verifică-ți inboxul, apoi conectează-te.')
    setMode('signin')
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="font-display text-2xl font-semibold text-ink">Autentificare</h1>
      <p className="mt-1 text-sm text-slate-500">
        Pentru Admin sau pentru angajați care vor să își vadă soldul personal.
      </p>

      <div className="mt-6 flex rounded-full bg-slate-100 p-1 text-sm">
        <button
          onClick={() => {
            setMode('signin')
            setError('')
            setInfo('')
          }}
          className={`flex-1 rounded-full py-1.5 font-medium transition ${
            mode === 'signin' ? 'bg-white shadow-sm text-ink' : 'text-slate-500'
          }`}
        >
          Am cont
        </button>
        <button
          onClick={() => {
            setMode('signup')
            setError('')
            setInfo('')
          }}
          className={`flex-1 rounded-full py-1.5 font-medium transition ${
            mode === 'signup' ? 'bg-white shadow-sm text-ink' : 'text-slate-500'
          }`}
        >
          Sunt angajat, vreau cont
        </button>
      </div>

      <form
        onSubmit={mode === 'signin' ? handleSignIn : handleSignUp}
        className="mt-5 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Parolă</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
          />
        </div>

        {error && (
          <p className="flex items-start gap-1.5 text-sm text-rose-600">
            <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
          </p>
        )}
        {info && <p className="text-sm text-emerald-600">{info}</p>}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60 focus-ring"
        >
          {mode === 'signin' ? <LogIn size={15} /> : <UserPlus size={15} />}
          {loading ? 'Se procesează…' : mode === 'signin' ? 'Conectare' : 'Creează cont'}
        </button>
      </form>
    </div>
  )
}
