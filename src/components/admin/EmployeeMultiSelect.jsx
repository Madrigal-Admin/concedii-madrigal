import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'

export default function EmployeeMultiSelect({ employees, selectedIds, onToggle, onToggleAll }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return employees
    return employees.filter((e) => e.full_name.toLowerCase().includes(q))
  }, [employees, search])

  const label =
    selectedIds.size === 0
      ? 'Toți angajații'
      : selectedIds.size === 1
      ? employees.find((e) => selectedIds.has(e.id))?.full_name || '1 angajat'
      : `${selectedIds.size} angajați selectați`

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-lg border border-slate-300 px-3 py-2 text-sm text-ink focus-ring"
      >
        <span>{label}</span>
        <ChevronDown size={15} className={`text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-20 mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          <div className="relative mb-2">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Caută angajat…"
              className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-2 text-sm focus-ring"
              autoFocus
            />
          </div>

          <button
            type="button"
            onClick={onToggleAll}
            className="mb-1.5 w-full rounded-lg px-2 py-1 text-left text-xs font-medium text-brand-600 hover:bg-brand-50 focus-ring"
          >
            {selectedIds.size === employees.length ? 'Deselectează tot' : 'Selectează tot'}
          </button>

          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="px-2 py-3 text-center text-xs text-slate-400">Niciun angajat găsit.</p>
            )}
            {filtered.map((emp) => (
              <label
                key={emp.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(emp.id)}
                  onChange={() => onToggle(emp.id)}
                  className="rounded"
                />
                {emp.full_name}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
