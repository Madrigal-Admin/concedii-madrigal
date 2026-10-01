// netlify/functions/sync-clickup-scheduled.js
//
// Sincronizare automată, săptămânală (vezi programarea în netlify.toml).
// Fără utilizator autentificat în spate — verificăm doar că invocarea
// chiar vine de la programatorul Netlify, nu de la cineva care a ghicit
// adresa funcției.

import { syncClickup } from './_syncClickupCore.js'

function json(status, body) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
}

export async function handler(event) {
  const esteProgramata = event.headers['x-netlify-event'] === 'schedule'
  if (!esteProgramata) return json(403, { error: 'Această funcție rulează doar automat, programat.' })

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  const CLICKUP_TOKEN = process.env.CLICKUP_API_TOKEN

  if (!SUPABASE_URL || !SERVICE_KEY || !CLICKUP_TOKEN) {
    return json(500, { error: 'Variabile de mediu lipsă pe server.' })
  }

  const rezultat = await syncClickup({ SUPABASE_URL, SERVICE_KEY, CLICKUP_TOKEN })
  if (rezultat.error) return json(rezultat.status || 500, rezultat)

  return json(200, rezultat)
}
