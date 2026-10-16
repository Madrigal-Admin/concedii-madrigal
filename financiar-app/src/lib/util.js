export function azi() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Un element din listele prestabilite este folosibil la o dată dată și pentru un tip de achiziție
export function listaValida(el, data, tip) {
  if (!el.activ) return false
  if (el.valabil_de_la > data) return false
  if (el.valabil_pana && el.valabil_pana < data) return false
  if (tip && el.tip !== 'ambele' && el.tip !== tip) return false
  return true
}

export function eroareBaza(err, implicit = 'A apărut o eroare. Încearcă din nou.') {
  if (!err) return ''
  const m = String(err.message || '')
  // mesajele scrise de noi în baza de date sunt în română și se afișează ca atare
  if (/[ăâîșț]/i.test(m) || /^(Adaugă|Completează|Alege|Respingerea|Decontul|Referatul|Liniile|Borderoul|Schimbarea|Prețul|Există|Fără|Documentele)/.test(m)) return m
  if (err.code === '42501' || /row-level security/i.test(m)) return 'Nu ai dreptul să faci această acțiune.'
  return implicit
}
