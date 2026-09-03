import { useState } from 'react'
import ApprovalsTab from './admin/ApprovalsTab'
import CertificateRequestsTab from './admin/CertificateRequestsTab'
import RecoveriesTab from './admin/RecoveriesTab'
import OverviewTab from './admin/OverviewTab'
import ReportsTab from './admin/ReportsTab'
import SettingsTab from './admin/SettingsTab'

const ALL_TABS = [
  { key: 'approvals', label: 'Aprobări concedii' },
  { key: 'certificates', label: 'Cereri adeverințe' },
  { key: 'recoveries', label: 'Recuperări' },
  { key: 'overview', label: 'Privire generală' },
  { key: 'reports', label: 'Rapoarte' },
  { key: 'settings', label: 'Setări', fullAdminOnly: true },
]

export default function AdminDashboard({ role }) {
  const [tab, setTab] = useState('approvals')
  const isFullAdmin = role === 'full_admin'
  const tabs = ALL_TABS.filter((t) => !t.fullAdminOnly || isFullAdmin)

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-2xl font-semibold text-ink">Panou Admin</h1>

      <div className="mt-5 flex flex-wrap gap-1.5 border-b border-slate-200 pb-3">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition focus-ring ${
              tab === t.key ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'approvals' && <ApprovalsTab />}
        {tab === 'certificates' && <CertificateRequestsTab />}
        {tab === 'recoveries' && <RecoveriesTab />}
        {tab === 'overview' && <OverviewTab />}
        {tab === 'reports' && <ReportsTab />}
        {tab === 'settings' && isFullAdmin && <SettingsTab />}
      </div>
    </div>
  )
}
