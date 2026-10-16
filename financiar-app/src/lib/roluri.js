export const ROLE_LABELS = {
  admin_general: 'Admin general',
  admin_financiar: 'Admin Financiar',
  angajat: 'Angajat',
}

export const esteAdmin = (rol) => rol === 'admin_general' || rol === 'admin_financiar'

export const STARI_REFERAT = {
  ciorna: { label: 'Ciornă', clasa: 'bg-slate-100 text-slate-600' },
  trimis: { label: 'Trimis la aprobare', clasa: 'bg-sky-50 text-sky-700' },
  aprobat: { label: 'Aprobat', clasa: 'bg-emerald-50 text-emerald-700' },
  respins: { label: 'Respins', clasa: 'bg-rose-50 text-rose-700' },
  anulat: { label: 'Anulat', clasa: 'bg-slate-100 text-slate-400 line-through' },
}

export const STARI_DECONT = {
  ciorna: { label: 'Ciornă', clasa: 'bg-slate-100 text-slate-600' },
  depus: { label: 'Depus', clasa: 'bg-sky-50 text-sky-700' },
  verificat: { label: 'Verificat', clasa: 'bg-emerald-50 text-emerald-700' },
  anulat: { label: 'Anulat', clasa: 'bg-slate-100 text-slate-400 line-through' },
}
