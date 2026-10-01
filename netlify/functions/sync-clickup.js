// netlify/functions/sync-clickup.js
//
// Sincronizează evenimentele din lista ClickUp "ORGANIZATOR EVENIMENTE"
// spre tabelul central `evenimente` din Supabase. Rulează la cerere
// (apelată de butonul "Sincronizează evenimente" din Hub, de un admin
// Hub sau admin Calendar). Pentru sincronizarea automată săptămânală,
// vezi sync-clickup-scheduled.js — folosesc aceeași logică, din
// _syncClickupCore.js.
//
// Variabile de mediu necesare (setate în Netlify, NICIODATĂ cu prefix
// VITE_ — altfel ar ajunge expuse în codul de browser):
//   CLICKUP_API_TOKEN
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   SUPABASE_ANON_KEY  (folosită doar ca să verificăm identitatea celui
//                       care apelează, nu pentru scriere)

import { syncClickup } from './_syncClickupCore.js'

function json(status, body) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

  const authHeader = event.headers.authorization || event.headers.Authorization
  const accessToken = authHeader?.replace('Bearer ', '')
  if (!accessToken) return json(401, { error: 'Lipsește tokenul de autentificare.' })

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  const ANON_KEY = process.env.SUPABASE_ANON_KEY
  const CLICKUP_TOKEN = process.env.CLICKUP_API_TOKEN

  if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY || !CLICKUP_TOKEN) {
    return json(500, { error: 'Variabile de mediu lipsă pe server.' })
  }

  // 1. Verificăm cine e utilizatorul, pe baza tokenului trimis de client
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${accessToken}` },
  })
  if (!userRes.ok) return json(401, { error: 'Sesiune invalidă.' })
  const user = await userRes.json()

  // 2. Verificăm că e admin Hub SAU admin Calendar (tool separat)
  const checkRes = await fetch(
    `${SUPABASE_URL}/rest/v1/angajati?user_id=eq.${user.id}&select=id,acces_tooluri(tool,rol)`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  )
  const [angajat] = await checkRes.json()
  const poateSincroniza = angajat?.acces_tooluri?.some(
    (a) => (a.tool === 'hub' && a.rol === 'admin') || (a.tool === 'calendar' && a.rol === 'admin')
  )
  if (!poateSincroniza) return json(403, { error: 'Nu ai drepturi de sincronizare a calendarului.' })

  // 3. Sincronizarea propriu-zisă
  const rezultat = await syncClickup({ SUPABASE_URL, SERVICE_KEY, CLICKUP_TOKEN })
  if (rezultat.error) return json(rezultat.status || 500, rezultat)

  return json(200, rezultat)
}
