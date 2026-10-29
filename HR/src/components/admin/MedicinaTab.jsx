import IstoricTab from './IstoricTab'
import { TIP_CONTROL, eticheta } from '../../lib/istoricHr'

const CONFIG = {
  titlu: 'Medicina muncii',
  tabel: 'hr_medicina_muncii',
  campData: 'data_control',
  etichetaData: 'Data controlului',
  campuri: [{ key: 'tip_control', label: 'Tip control', type: 'select', options: TIP_CONTROL, bulk: true, required: true }],
  rezumat: (r) => eticheta(TIP_CONTROL, r.tip_control).toLowerCase(),
  cuRezultate: false,
}

export default function MedicinaTab() {
  return <IstoricTab config={CONFIG} />
}
