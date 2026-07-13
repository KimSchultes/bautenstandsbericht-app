import { useState } from 'react'
import type { CompanyEntry, ReportCompany } from '../db/types'
import { inputClass, buttonSecondary } from '../lib/ui'

interface CompanyPickerProps {
  projectCompanies: CompanyEntry[]
  selected: ReportCompany[]
  onChange: (companies: ReportCompany[]) => void
}

function sameCompany(a: ReportCompany, b: ReportCompany) {
  return a.name === b.name && a.trade === b.trade
}

export default function CompanyPicker({ projectCompanies, selected, onChange }: CompanyPickerProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [trade, setTrade] = useState('')

  const chips: ReportCompany[] = [
    ...projectCompanies.map((c) => ({ name: c.name, trade: c.trade })),
    ...selected.filter((s) => !projectCompanies.some((c) => c.name === s.name && c.trade === s.trade)),
  ]

  function toggle(company: ReportCompany) {
    const isSelected = selected.some((s) => sameCompany(s, company))
    if (isSelected) {
      onChange(selected.filter((s) => !sameCompany(s, company)))
    } else {
      onChange([...selected, company])
    }
  }

  function handleAdd() {
    if (!name.trim()) return
    const company = { name: name.trim(), trade: trade.trim() }
    onChange([...selected, company])
    setName('')
    setTrade('')
    setShowAdd(false)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => {
          const active = selected.some((s) => sameCompany(s, c))
          return (
            <button
              key={`${c.name}-${c.trade}`}
              type="button"
              onClick={() => toggle(c)}
              className={`min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'border-brand bg-brand text-white'
                  : 'border-gray-300 bg-white text-gray-700 active:bg-gray-100'
              }`}
            >
              {c.name}
              {c.trade && <span className="opacity-80"> · {c.trade}</span>}
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="min-h-11 rounded-full border border-dashed border-gray-400 px-4 py-2 text-sm font-medium text-gray-600 active:bg-gray-100"
        >
          + Firma
        </button>
      </div>
      {showAdd && (
        <div className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 sm:flex-row">
          <input className={inputClass} placeholder="Firma" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <input className={inputClass} placeholder="Gewerk" value={trade} onChange={(e) => setTrade(e.target.value)} />
          <button type="button" className={`${buttonSecondary} whitespace-nowrap`} onClick={handleAdd}>
            Hinzufügen
          </button>
        </div>
      )}
    </div>
  )
}
