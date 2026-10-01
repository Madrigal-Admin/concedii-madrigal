// netlify/functions/debug-implicare.js
//
// TEMPORARĂ — doar pentru diagnostic. Arată configurația reală a
// câmpului "Implicare" din ClickUp (toate opțiunile posibile, cu ID-urile
// lor exacte), ca să reparăm maparea din sync-clickup. Se poate șterge
// după ce problema e rezolvată.

const CLICKUP_LIST_ID = '901218690319'
const FIELD_IMPLICARE = 'fa796353-2d09-40b4-a6aa-ff8774363f32'

function json(status, body) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
}

export async function handler(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization
  const accessToken = authHeader?.replace('Bearer ', '')
  if (!accessToken) return json(401, { error: 'Lipsește tokenul.' })

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  const ANON_KEY = process.env.SUPABASE_ANON_KEY
  const CLICKUP_TOKEN = process.env.CLICKUP_API_TOKEN

  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${accessToken}` },
  })
  if (!userRes.ok) return json(401, { error: 'Sesiune invalidă.' })
  const user = await userRes.json()

  const checkRes = await fetch(
    `${SUPABASE_URL}/rest/v1/angajati?user_id=eq.${user.id}&select=id,acces_tooluri(tool,rol)`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  )
  const [angajat] = await checkRes.json()
  const poate = angajat?.acces_tooluri?.some(
    (a) => (a.tool === 'hub' && a.rol === 'admin') || (a.tool === 'calendar' && a.rol === 'admin')
  )
  if (!poate) return json(403, { error: 'Fără drepturi.' })

  const listRes = await fetch(`https://api.clickup.com/api/v2/list/${CLICKUP_LIST_ID}/task?include_closed=true`, {
    headers: { Authorization: CLICKUP_TOKEN },
  })
  const { tasks } = await listRes.json()

  // Luăm configurația câmpului Implicare chiar de pe listă (definiția,
  // cu toate opțiunile posibile)
  const taskCuCampuri = await fetch(`https://api.clickup.com/api/v2/task/${tasks[0].id}`, {
    headers: { Authorization: CLICKUP_TOKEN },
  }).then((r) => r.json())

  const campImplicare = taskCuCampuri.custom_fields?.find((f) => f.id === FIELD_IMPLICARE)

  // Și valoarea curentă (brută) pentru primele 5 task-uri, ca să vedem
  // ID-ul exact folosit în practică
  const exemple = []
  for (const t of tasks.slice(0, 5)) {
    const detail = await fetch(`https://api.clickup.com/api/v2/task/${t.id}`, {
      headers: { Authorization: CLICKUP_TOKEN },
    }).then((r) => r.json())
    const valoare = detail.custom_fields?.find((f) => f.id === FIELD_IMPLICARE)?.value
    exemple.push({ task: t.name, valoare_bruta: valoare })
  }

  return json(200, {
    nume_camp: campImplicare?.name,
    tip_camp: campImplicare?.type,
    optiuni_posibile: campImplicare?.type_config?.options?.map((o) => ({ id: o.id, nume: o.name })),
    exemple_valori_reale: exemple,
  })
}
