import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import ApprovalsTab from './admin/ApprovalsTab'
import CertificateRequestsTab from './admin/CertificateRequestsTab'
import RecoveriesTab from './admin/RecoveriesTab'
import OverviewTab from './admin/OverviewTab'
import ReportsTab from './admin/ReportsTab'
import SettingsTab from './admin/SettingsTab'
import VechimeTab from './admin/VechimeTab'
import MedicinaTab from './admin/MedicinaTab'
import EvaluariTab from './admin/EvaluariTab'

// Un tab simplu sau un grup (meniu care se deschide) cu mai multe taburi.
const MENIU = [
  { key: 'overview', label: 'Privire generală' },
  {
    grup: 'cereri',
    label: 'Cereri',
    items: [
      { key: 'approvals', label: 'Aprobări concedii' },
      { key: 'certificates', label: 'Cereri de adeverințe' },
      { key: 'reports', label: 'Rapoarte cereri concediu' },
    ],
  },
  { key: 'recoveries', label: 'Gestiune Recuperări' },
  { key: 'vechime', label: 'Centralizator Vechime', fullAdminOnly: true },
  { key: 'medicina', label: 'Medicina Muncii', fullAdminOnly: true },
  { key: 'evaluari', label: 'Evaluări', fullAdminOnly: true },
  { key: 'settings', label: 'Date Angajați', fullAdminOnly: true },
]

const pill = (activ) =>
  `rounded-full px-3.5 py-1.5 text-sm font-medium transition focus-ring ${
    activ ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
  }`

export default function AdminDashboard({ role }) {
  const [tab, setTab] = useState('overview')
  const [grupDeschis, setGrupDeschis] = useState(null)
  const zona = useRef(null)
  const isFullAdmin = role === 'full_admin'
  const meniu = MENIU.filter((t) => !t.fullAdminOnly || isFullAdmin)

  // închide meniul când dai click în altă parte
  useEffect(() => {
    const inchide = (e) => {
      if (zona.current && !zona.current.contains(e.target)) setGrupDeschis(null)
    }
    document.addEventListener('mousedown', inchide)
    return () => document.removeEventListener('mousedown', inchide)
  }, [])

  function alege(key) {
    setTab(key)
    setGrupDeschis(null)
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Panou Admin</h1>

      <div ref={zona} className="mt-5 flex flex-wrap gap-1.5 border-b border-slate-200 pb-3">
        {meniu.map((m) => {
          if (!m.grup) {
            return (
              <button key={m.key} onClick={() => alege(m.key)} className={pill(tab === m.key)}>
                {m.label}
              </button>
            )
          }
          const subActiv = m.items.find((i) => i.key === tab)
          return (
            <div key={m.grup} className="relative">
              <button
                onClick={() => setGrupDeschis((g) => (g === m.grup ? null : m.grup))}
                className={`${pill(!!subActiv)} inline-flex items-center gap-1.5`}
                aria-expanded={grupDeschis === m.grup}
              >
                {subActiv ? subActiv.label : m.label}
                <ChevronDown size={14} />
              </button>
              {grupDeschis === m.grup && (
                <div className="absolute left-0 top-full z-20 mt-1 min-w-[220px] rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                  {m.items.map((i) => (
                    <button
                      key={i.key}
                      onClick={() => alege(i.key)}
                      className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                        tab === i.key ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {i.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-6">
        {tab === 'overview' && <OverviewTab onNavigate={alege} />}
        {tab === 'approvals' && <ApprovalsTab />}
        {tab === 'certificates' && <CertificateRequestsTab />}
        {tab === 'recoveries' && <RecoveriesTab />}
        {tab === 'reports' && <ReportsTab />}
        {tab === 'vechime' && isFullAdmin && <VechimeTab />}
        {tab === 'medicina' && isFullAdmin && <MedicinaTab />}
        {tab === 'evaluari' && isFullAdmin && <EvaluariTab />}
        {tab === 'settings' && isFullAdmin && <SettingsTab />}
      </div>
    </div>
  )
}
