import { inputCls, labelCls } from '../lib/ui'

// Afișează câmpurile adăugate de Admin general (tipurile motorului de formulare).
export default function CampuriExtra({ campuri, valori, onChange }) {
  return campuri.map((c) => {
    const v = valori[c.cod] ?? ''
    return (
      <div key={c.id}>
        <label className={labelCls}>
          {c.eticheta} {c.obligatoriu && <span className="text-rose-500">*</span>}
        </label>
        {c.tip === 'text' && <input className={inputCls} value={v} onChange={(e) => onChange(c.cod, e.target.value)} />}
        {c.tip === 'text_lung' && (
          <textarea rows={4} className={inputCls} value={v} onChange={(e) => onChange(c.cod, e.target.value)} />
        )}
        {c.tip === 'numar' && (
          <input type="number" min="0" step="any" className={inputCls} value={v} onChange={(e) => onChange(c.cod, e.target.value)} />
        )}
        {c.tip === 'data' && (
          <input type="date" className={inputCls} value={v} onChange={(e) => onChange(c.cod, e.target.value)} />
        )}
        {c.tip === 'da_nu' && (
          <select className={inputCls} value={v} onChange={(e) => onChange(c.cod, e.target.value)}>
            <option value="">— Alege —</option>
            <option value="da">Da</option>
            <option value="nu">Nu</option>
          </select>
        )}
        {c.tip === 'alegere' && (
          <select className={inputCls} value={v} onChange={(e) => onChange(c.cod, e.target.value)}>
            <option value="">— Alege —</option>
            {(c.optiuni || []).map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        )}
        {c.ajutor && <p className="mt-1 text-xs text-slate-400">{c.ajutor}</p>}
      </div>
    )
  })
}

export function valideazaExtra(campuri, valori) {
  for (const c of campuri) {
    if (c.obligatoriu && (valori[c.cod] === undefined || valori[c.cod] === null || String(valori[c.cod]).trim() === '')) {
      return `Câmpul „${c.eticheta}" este obligatoriu.`
    }
  }
  return ''
}
