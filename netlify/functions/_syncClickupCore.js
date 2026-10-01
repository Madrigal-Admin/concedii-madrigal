// netlify/functions/_syncClickupCore.js
//
// Logica propriu-zisă de sincronizare ClickUp → Supabase. Nu e o funcție
// invocabilă direct (numele începe cu "_", Netlify o ignoră ca endpoint) —
// e importată atât de sync-clickup.js (buton manual), cât și de
// sync-clickup-scheduled.js (automat, săptămânal).

const CLICKUP_LIST_ID = '901218690319' // ORGANIZATOR EVENIMENTE
const FIELD_LOCATIE = 'b5ce3fa6-b991-40e7-a232-c908a0f2edca'
const FIELD_BILETE = '430b6d22-0775-4ec2-b60a-4ba4b2877e51'
const FIELD_IMPLICARE = 'fa796353-2d09-40b4-a6aa-ff8774363f32'
const FIELD_ORGANIZATOR = '788d75b8-9e47-46d9-93fc-08fc37ed1fb2'

// Pentru câmpuri ClickUp de tip "drop_down", API-ul NU trimite ID-ul
// opțiunii ca valoare — trimite poziția ei (0, 1, 2...) în lista de
// opțiuni a câmpului. Citim deci opțiunile chiar din răspunsul task-ului
// (type_config.options), nu dintr-un tabel fix de ID-uri — robust și la
// o eventuală reordonare a opțiunilor în ClickUp, pe viitor.
function valoareDropdown(detail, fieldId) {
  const camp = detail.custom_fields?.find((f) => f.id === fieldId)
  if (!camp || camp.value === null || camp.value === undefined) return null
  return camp.type_config?.options?.[camp.value]?.name ?? null
}

// Culori implicite, atribuite automat (în ordine) unui tag nou, întâlnit
// prima dată la sincronizare. Admin poate schimba oricând, manual.
const CULORI_IMPLICITE = ['#7F77DD', '#1D9E75', '#D85A30', '#D4537E', '#378ADD', '#BA7517']

async function inLoturi(items, marimeLot, fn) {
  const rezultate = []
  for (let i = 0; i < items.length; i += marimeLot) {
    const lot = items.slice(i, i + marimeLot)
    rezultate.push(...(await Promise.all(lot.map(fn))))
  }
  return rezultate
}

export async function syncClickup({ SUPABASE_URL, SERVICE_KEY, CLICKUP_TOKEN }) {
  // 1. Lista de task-uri din ClickUp
  const listRes = await fetch(
    `https://api.clickup.com/api/v2/list/${CLICKUP_LIST_ID}/task?include_closed=true`,
    { headers: { Authorization: CLICKUP_TOKEN } }
  )
  if (!listRes.ok) return { error: 'Nu am putut citi lista din ClickUp.', status: 502 }
  const { tasks } = await listRes.json()

  // 2. Detaliile complete ale fiecărui task (inclusiv custom fields), în
  // loturi paralele de 10 — nu secvențial, ca să nu depășim limita de
  // timp a funcției.
  const evenimenteRezultate = await inLoturi(tasks, 10, async (task) => {
    const detailRes = await fetch(`https://api.clickup.com/api/v2/task/${task.id}`, {
      headers: { Authorization: CLICKUP_TOKEN },
    })
    if (!detailRes.ok) return null
    const detail = await detailRes.json()

    const fieldValue = (fieldId) => detail.custom_fields?.find((f) => f.id === fieldId)?.value

    const bileteNume = valoareDropdown(detail, FIELD_BILETE)

    return {
      clickup_task_id: task.id,
      nume: task.name,
      data: task.due_date ? new Date(Number(task.due_date)).toISOString().slice(0, 10) : null,
      status: task.status?.status || task.status,
      locatie: fieldValue(FIELD_LOCATIE) || null,
      responsabil: fieldValue(FIELD_ORGANIZATOR) || task.assignees?.[0]?.username || null,
      bilete: bileteNume == null ? null : /^da|yes/i.test(bileteNume),
      implicare: valoareDropdown(detail, FIELD_IMPLICARE),
      tags: (task.tags || []).map((t) => t.name),
      ultima_sincronizare: new Date().toISOString(),
    }
  })
  const evenimente = evenimenteRezultate.filter(Boolean)

  // 3. Taguri noi, neîntâlnite până acum — li se atribuie o culoare
  // implicită automat
  const toateTagurile = [...new Set(evenimente.flatMap((e) => e.tags))]
  if (toateTagurile.length > 0) {
    const existingRes = await fetch(`${SUPABASE_URL}/rest/v1/evenimente_tag_culori?select=tag`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    })
    const existente = new Set((existingRes.ok ? await existingRes.json() : []).map((r) => r.tag))
    const taguriNoi = toateTagurile.filter((t) => !existente.has(t))
    if (taguriNoi.length > 0) {
      await fetch(`${SUPABASE_URL}/rest/v1/evenimente_tag_culori`, {
        method: 'POST',
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=ignore-duplicates,return=minimal',
        },
        body: JSON.stringify(
          taguriNoi.map((tag, i) => ({ tag, culoare: CULORI_IMPLICITE[(existente.size + i) % CULORI_IMPLICITE.length] }))
        ),
      })
    }
  }

  // 4. Upsert în Supabase — NU trimitem necesita_rsvp/necesita_costume,
  // ca să nu suprascriem flag-urile setate manual de admin.
  const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/evenimente?on_conflict=clickup_task_id`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(evenimente),
  })
  if (!upsertRes.ok) {
    const errText = await upsertRes.text()
    return { error: 'Nu am putut scrie în Supabase.', detaliu: errText, status: 502 }
  }

  // 5. Curățăm evenimentele "orfane" (task dispărut din ClickUp), dar
  // niciodată dacă au invitații legate — păstrăm istoricul RSVP.
  let orfaneSterse = 0
  const idCurente = evenimente.map((e) => e.clickup_task_id)
  if (idCurente.length > 0) {
    const listaId = idCurente.map((id) => `"${id}"`).join(',')
    const orphanRes = await fetch(
      `${SUPABASE_URL}/rest/v1/evenimente?clickup_task_id=not.is.null&clickup_task_id=not.in.(${listaId})&select=id,nume,clickup_task_id`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    )
    if (orphanRes.ok) {
      const orfane = await orphanRes.json()
      for (const orfan of orfane) {
        const invRes = await fetch(
          `${SUPABASE_URL}/rest/v1/invitatii?eveniment_id=eq.${orfan.id}&select=id&limit=1`,
          { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
        )
        const invitatiiLegate = invRes.ok ? await invRes.json() : []
        if (invitatiiLegate.length === 0) {
          await fetch(`${SUPABASE_URL}/rest/v1/evenimente?id=eq.${orfan.id}`, {
            method: 'DELETE',
            headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
          })
          orfaneSterse++
        }
      }
    }
  }

  return { ok: true, sincronizate: evenimente.length, orfaneSterse }
}
