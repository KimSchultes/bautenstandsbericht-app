import { useState } from 'react'
import { buttonSecondary, inputClass, iconButton } from '../lib/ui'

interface Entry {
  id: string
  name: string
  secondary: string
}

interface EntryListEditorProps {
  entries: Entry[]
  primaryLabel: string
  secondaryLabel: string
  primaryPlaceholder?: string
  secondaryPlaceholder?: string
  onAdd: (name: string, secondary: string) => void
  onRemove: (id: string) => void
}

export default function EntryListEditor({
  entries,
  primaryLabel,
  secondaryLabel,
  primaryPlaceholder,
  secondaryPlaceholder,
  onAdd,
  onRemove,
}: EntryListEditorProps) {
  const [name, setName] = useState('')
  const [secondary, setSecondary] = useState('')

  function handleAdd() {
    if (!name.trim()) return
    onAdd(name.trim(), secondary.trim())
    setName('')
    setSecondary('')
  }

  return (
    <div className="flex flex-col gap-2">
      {entries.length === 0 && <p className="text-sm text-gray-500">Noch keine Einträge.</p>}
      <ul className="flex flex-col gap-2">
        {entries.map((entry) => (
          <li key={entry.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate font-medium text-gray-900">{entry.name}</p>
              {entry.secondary && <p className="truncate text-sm text-gray-500">{entry.secondary}</p>}
            </div>
            <button type="button" aria-label="Entfernen" onClick={() => onRemove(entry.id)} className={iconButton}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={primaryPlaceholder ?? primaryLabel}
        />
        <input
          className={inputClass}
          value={secondary}
          onChange={(e) => setSecondary(e.target.value)}
          placeholder={secondaryPlaceholder ?? secondaryLabel}
        />
        <button type="button" className={`${buttonSecondary} whitespace-nowrap`} onClick={handleAdd} disabled={!name.trim()}>
          + Hinzufügen
        </button>
      </div>
    </div>
  )
}
