import { useState } from 'react'
import ApprovalsTab from './admin/ApprovalsTab'
import EmployeesTab from './admin/EmployeesTab'
import RecoveriesTab from './admin/RecoveriesTab'
import OverviewTab from './admin/OverviewTab'
import SettingsTab from './admin/SettingsTab'

const TABS = [
  { key: 'approvals', label: 'Aprobări' },
  { key: 'employees', label: 'Angajați' },
  { key: 'recoveries', label: 'Recuperări' },
  { key: 'overview', label: 'Privire generală' },
  { key: 'settings', label: 'Setări' },
]

export default function AdminDashboard() {
  const [tab, setTab] = useState('approvals')

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-2xl font-semibold text-ink">Panou Admin</h1>

      <div className="mt-5 flex flex-wrap gap-1.5 border-b border-slate-200 pb-3">
        {TABS.map((t) => (
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
        {tab === 'employees' && <EmployeesTab />}
        {tab === 'recoveries' && <RecoveriesTab />}
        {tab === 'overview' && <OverviewTab />}
        {tab === 'settings' && <SettingsTab />}
      </div>
    </div>
  )
}
