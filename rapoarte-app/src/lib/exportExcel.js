import * as XLSX from 'xlsx'
import { formatData } from './luni'
import { campuriStatistici } from './statistici'

// Exportă în Excel exact rapoartele din selecția curentă (un rând pe eveniment),
// plus o foaie cu localitățile și una cu rezumatul și filtrele aplicate.
export function exportaExcel({ rapoarte, cfg, filtre, kpis }) {
  const stat = campuriStatistici(cfg)
  const numeTip = (cod) => cfg.tipuri.find((t) => t.cod === cod)?.nume || cod

  const antet = [
    'Eveniment', 'Tip', 'Data început', 'Data sfârșit', 'Luna', 'An', 'Localități',
    'Număr evenimente', 'Locația', 'Responsabil', 'Echipa de organizare', 'Calitatea CNCM-MC',
    ...stat.map((c) => c.eticheta),
  ]
  const randuri = rapoarte.map((r) => [
    r.denumire_oficiala,
    r.tipuri.map(numeTip).join(', '),
    formatData(r.data_inceput),
    formatData(r.data_sfarsit),
    r.luna,
    Number(r.an),
    r.localitati.map((l) => `${l.localitate} × ${l.nr}`).join('; '),
    r.evFiltrate,
    r.locatie,
    r.responsabil,
    (r.echipa || []).map((p) => p.nume).join(', '),
    r.implicare,
    ...stat.map((c) => (r.metrici[c.cod] === undefined ? '' : r.metrici[c.cod])),
  ])
  const foaieRapoarte = XLSX.utils.aoa_to_sheet([antet, ...randuri])
  foaieRapoarte['!cols'] = antet.map((h, i) => ({ wch: i === 0 ? 40 : i === 6 || i === 10 ? 36 : Math.max(12, h.length + 2) }))

  const loc = [['Eveniment', 'Data început', 'Localitate', 'Număr evenimente']]
  for (const r of rapoarte)
    for (const l of r.localitati) {
      if (filtre.oras && l.localitate !== filtre.oras) continue
      loc.push([r.denumire_oficiala, formatData(r.data_inceput), l.localitate, Number(l.nr)])
    }
  const foaieLoc = XLSX.utils.aoa_to_sheet(loc)
  foaieLoc['!cols'] = [{ wch: 40 }, { wch: 14 }, { wch: 24 }, { wch: 18 }]

  const rez = [
    ['Rapoarte post-eveniment — doar rapoarte aprobate'],
    ['Exportat la', formatData(new Date().toISOString())],
    ['An', filtre.an || 'toți'],
    ['Oraș', filtre.oras || 'toate'],
    ['Tip eveniment', filtre.tip ? numeTip(filtre.tip) : 'toate'],
    ['Calitatea CNCM-MC', filtre.calitate || 'toate'],
    [],
    ['Indicator', 'Valoare'],
    ...kpis.map((k) => [k.label, k.value]),
  ]
  const foaieRez = XLSX.utils.aoa_to_sheet(rez)
  foaieRez['!cols'] = [{ wch: 34 }, { wch: 18 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, foaieRapoarte, 'Rapoarte')
  XLSX.utils.book_append_sheet(wb, foaieLoc, 'Localități')
  XLSX.utils.book_append_sheet(wb, foaieRez, 'Rezumat')
  XLSX.writeFile(wb, `rapoarte-post-eveniment-${filtre.an || 'toti-anii'}.xlsx`)
}
