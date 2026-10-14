import { campuriVizibile, totalEvenimente } from './postev'
import { LUNI } from './luni'

const esteIntregPozitiv = (v) => /^\d+$/.test(String(v).trim()) && Number(v) >= 1

// Pregătește un raport aprobat pentru statistici: doar câmpurile VIZIBILE la
// tipurile și calitatea lui intră în calcul (valorile ascunse nu se numără).
export function pregatesteRaport(r, cfg) {
  const vizibile = campuriVizibile(cfg.campuri, cfg.matrice, r.tipuri || [], r.implicare)
  const metrici = {}
  for (const c of vizibile) {
    if (c.tip !== 'numar' || !c.in_statistici) continue
    if (c.mod === 'B' && !r.bife?.[c.cod]) continue
    const v = r.valori?.[c.cod]
    if (esteIntregPozitiv(v)) metrici[c.cod] = Number(v)
  }
  return {
    ...r,
    an: r.data_inceput.slice(0, 4),
    luna: Number(r.data_inceput.slice(5, 7)),
    metrici,
    totalEv: totalEvenimente(r.localitati),
  }
}

// Câmpurile numerice care intră în statistici (apar automat și cele adăugate de Admin general)
export const campuriStatistici = (cfg) =>
  cfg.campuri.filter((c) => c.activ && c.tip === 'numar' && c.in_statistici).sort((a, b) => a.ordine - b.ordine)

export function filtreaza(rapoarte, f) {
  return rapoarte
    .filter((r) => (!f.an || r.an === f.an) && (!f.tip || r.tipuri.includes(f.tip)) && (!f.calitate || r.implicare === f.calitate) &&
      (!f.oras || r.localitati.some((l) => l.localitate === f.oras)))
    .map((r) => ({
      ...r,
      // cu filtru de oraș, evenimentele se numără doar în orașul ales
      evFiltrate: f.oras ? r.localitati.filter((l) => l.localitate === f.oras).reduce((s, l) => s + Number(l.nr), 0) : r.totalEv,
    }))
}

export const valoareMetrica = (r, metrica) => (metrica === 'evenimente' ? r.evFiltrate : r.metrici[metrica] || 0)

export function sumeazaPe(rapoarte, cheieFn, metrica) {
  const map = new Map()
  for (const r of rapoarte) {
    for (const k of [].concat(cheieFn(r))) {
      map.set(k, (map.get(k) || 0) + valoareMetrica(r, metrica))
    }
  }
  return [...map.entries()].map(([label, v]) => ({ label, v })).sort((a, b) => b.v - a.v)
}

export function pePeLuni(rapoarte, metrica) {
  const v = Array(12).fill(0)
  for (const r of rapoarte) v[r.luna - 1] += valoareMetrica(r, metrica)
  return v.map((x, i) => ({ label: LUNI[i].slice(0, 3), luna: LUNI[i], v: x }))
}

export function topLocalitati(rapoarte, oras) {
  const map = new Map()
  for (const r of rapoarte)
    for (const l of r.localitati) {
      if (oras && l.localitate !== oras) continue
      map.set(l.localitate, (map.get(l.localitate) || 0) + Number(l.nr))
    }
  return [...map.entries()].map(([label, v]) => ({ label, v })).sort((a, b) => b.v - a.v)
}

export const toateLocalitatile = (rapoarte) =>
  [...new Set(rapoarte.flatMap((r) => r.localitati.map((l) => l.localitate)))].sort((a, b) => a.localeCompare(b, 'ro'))
