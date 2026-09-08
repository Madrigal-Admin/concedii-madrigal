import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { PublicLayout } from './PublicLayout'

export default function DezabonarePage({ token }) {
  const [status, setStatus] = useState('idle') // 'idle' | 'saving' | 'done' | 'error'

  async function handleDezabonare() {
    setStatus('saving')
    const { error } = await supabase.rpc('rsvp_dezabonare', { p_token: token })
    setStatus(error ? 'error' : 'done')
  }

  return (
    <PublicLayout>
      <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
        {status === 'done' ? (
          <p className="text-sm text-slate-600">
            Te-ai dezabonat cu succes. Nu vei mai primi invitații viitoare din partea Corului Madrigal.
          </p>
        ) : (
          <>
            <h2 className="font-display text-lg font-semibold text-slate-800">Dezabonare</h2>
            <p className="mt-2 text-sm text-slate-500">
              Confirmi că nu mai vrei să primești invitații la evenimentele viitoare ale Corului Madrigal?
            </p>
            <button
              onClick={handleDezabonare}
              disabled={status === 'saving'}
              className="mt-5 rounded-full bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-900 transition disabled:opacity-50"
            >
              {status === 'saving' ? 'Se procesează...' : 'Confirmă dezabonarea'}
            </button>
            {status === 'error' && (
              <p className="mt-3 text-xs text-rose-600">A apărut o eroare. Încearcă din nou.</p>
            )}
          </>
        )}
      </div>
    </PublicLayout>
  )
}
