import IstoricTab from './IstoricTab'
import { CALIFICATIVE, eticheta, formatNota } from '../../lib/istoricHr'

const CONFIG = {
  titlu: 'Evaluări',
  tabel: 'hr_evaluari',
  campData: 'data_evaluare',
  etichetaData: 'Data evaluării',
  campuri: [
    { key: 'calificativ', label: 'Calificativ', type: 'select', options: CALIFICATIVE },
    { key: 'nota', label: 'Nota (1–5, ex. 4,6)', type: 'number', placeholder: '4,6' },
  ],
  rezumat: (r) => [eticheta(CALIFICATIVE, r.calificativ), formatNota(r.nota)].filter(Boolean).join(' · '),
  cuRezultate: true,
}

export default function EvaluariTab() {
  return <IstoricTab config={CONFIG} />
}
