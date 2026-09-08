// netlify/functions/sync-clickup.js
//
// Sincronizează evenimentele din lista ClickUp "ORGANIZATOR EVENIMENTE"
// spre tabelul central `evenimente` din Supabase. Rulează doar la cerere
// (apelată de butonul "Sincronizează evenimente" din Hub, de un admin).
//
// Variabile de mediu necesare (setate în Netlify, NICIODATĂ cu prefix
// VITE_ — altfel ar ajunge expuse în codul de browser):
//   CLICKUP_API_TOKEN
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   SUPABASE_ANON_KEY  (folosită doar ca să verificăm identitatea celui
//                       care apelează, nu pentru scriere)

const CLICKUP_LIST_ID = '901218690319' // ORGANIZATOR EVENIMENTE
const FIELD_LOCATIE = 'b5ce3fa6-b991-40e7-a232-c908a0f2edca'
const FIELD_BILETE = '430b6d22-0775-4ec2-b60a-4ba4b2877e51'
const FIELD_IMPLICARE = 'fa796353-2d09-40b4-a6aa-ff8774363f32'
const FIELD_ORGANIZATOR = '788d75b8-9e47-46d9-93fc-08fc37ed1fb2'

const BILETE_OPTIONS = {
  'b9709b5d-cf47-4fbf-ade9-270244530711': true, // DA
  'e10e2a80-6e43-4e14-b7fe-ae111ce707cf': false, // NU
}
const IMPLICARE_OPTIONS = {
  '06def7e1-2b95-4f00-a7b7-07d6597c3146': 'Organizator',
  'a7a0b82c-e22e-4b9f-8e06-ab2fd4d70b8c': 'Partener',
  'c40c8713-86fc-4a9b-a30e-bac91ffd8a22': 'Invitat',
}

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

  // 2. Verificăm că e admin Hub (acces_tooluri, tool='hub', rol='admin')
  const checkRes = await fetch(
    `${SUPABASE_URL}/rest/v1/angajati?user_id=eq.${user.id}&select=id,acces_tooluri(tool,rol)`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  )
  const [angajat] = await checkRes.json()
  const isHubAdmin = angajat?.acces_tooluri?.some((a) => a.tool === 'hub' && a.rol === 'admin')
  if (!isHubAdmin) return json(403, { error: 'Doar adminii Hub pot sincroniza evenimentele.' })

  // 3. Luăm lista de task-uri din ClickUp
  const listRes = await fetch(
    `https://api.clickup.com/api/v2/list/${CLICKUP_LIST_ID}/task?include_closed=true`,
    { headers: { Authorization: CLICKUP_TOKEN } }
  )
  if (!listRes.ok) return json(502, { error: 'Nu am putut citi lista din ClickUp.' })
  const { tasks } = await listRes.json()

  // 4. Pentru fiecare task, luăm detaliile complete (inclusiv custom fields)
  const evenimente = []
  for (const task of tasks) {
    const detailRes = await fetch(`https://api.clickup.com/api/v2/task/${task.id}`, {
      headers: { Authorization: CLICKUP_TOKEN },
    })
    if (!detailRes.ok) continue
    const detail = await detailRes.json()

    const fieldValue = (fieldId) => detail.custom_fields?.find((f) => f.id === fieldId)?.value

    evenimente.push({
      clickup_task_id: task.id,
      nume: task.name,
      data: task.due_date ? new Date(Number(task.due_date)).toISOString().slice(0, 10) : null,
      status: task.status?.status || task.status,
      locatie: fieldValue(FIELD_LOCATIE) || null,
      responsabil: fieldValue(FIELD_ORGANIZATOR) || task.assignees?.[0]?.username || null,
      bilete: BILETE_OPTIONS[fieldValue(FIELD_BILETE)] ?? null,
      implicare: IMPLICARE_OPTIONS[fieldValue(FIELD_IMPLICARE)] || null,
      ultima_sincronizare: new Date().toISOString(),
    })
  }

  // 5. Upsert în Supabase — NU trimitem necesita_rsvp/necesita_costume,
  // ca să nu suprascriem flag-urile setate manual de admin.
  const upsertRes = await fetch(
    `${SUPABASE_URL}/rest/v1/evenimente?on_conflict=clickup_task_id`,
    {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(evenimente),
    }
  )

  if (!upsertRes.ok) {
    const errText = await upsertRes.text()
    return json(502, { error: 'Nu am putut scrie în Supabase.', detaliu: errText })
  }

  return json(200, { ok: true, sincronizate: evenimente.length })
}
