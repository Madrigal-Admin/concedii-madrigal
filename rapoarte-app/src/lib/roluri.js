export const ROLE_LABELS = {
  admin_general: 'Admin general',
  admin_activitate: 'Admin Rapoarte de activitate',
  admin_postev: 'Admin Rapoarte post-eveniment',
  angajat: 'Angajat',
  vizualizare: 'Vizualizare dashboard',
}

export const STARI = {
  trimis: { label: 'Trimis', clasa: 'bg-sky-50 text-sky-700' },
  in_verificare: { label: 'În verificare', clasa: 'bg-amber-50 text-amber-700' },
  aprobat: { label: 'Aprobat', clasa: 'bg-emerald-50 text-emerald-700' },
  respins: { label: 'Respins', clasa: 'bg-rose-50 text-rose-700' },
}

export const esteAdminActivitate = (rol) => rol === 'admin_general' || rol === 'admin_activitate'
export const esteAdminGeneral = (rol) => rol === 'admin_general'
