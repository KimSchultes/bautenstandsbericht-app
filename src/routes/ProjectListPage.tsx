import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { listProjects, createProject, deleteProject } from '../db/projects'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import { buttonPrimary, buttonSecondary, inputClass, labelClass, cardClass, iconButton } from '../lib/ui'
import { exportBackup, importBackup } from '../db/backup'

export default function ProjectListPage() {
  const navigate = useNavigate()
  const projects = useLiveQuery(listProjects, [])
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleCreate() {
    if (!name.trim()) return
    setBusy(true)
    try {
      const project = await createProject({ name: name.trim(), address: address.trim() })
      setShowCreate(false)
      setName('')
      setAddress('')
      navigate(`/projects/${project.id}`)
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id: string, projectName: string) {
    if (!confirm(`Projekt "${projectName}" inkl. aller Berichte und Fotos unwiderruflich löschen?`)) return
    await deleteProject(id)
  }

  async function handleBackupExport() {
    const blob = await exportBackup()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${new Date().toISOString().slice(0, 10)} Bautenstandsbericht-Sicherung.zip`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleBackupImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (
      !confirm(
        'Achtung: Beim Wiederherstellen werden ALLE aktuell auf diesem Gerät gespeicherten Projekte und Berichte durch den Inhalt der Sicherungsdatei ersetzt. Fortfahren?',
      )
    )
      return
    await importBackup(file)
  }

  return (
    <div className="min-h-screen pb-24">
      <PageHeader title="Projekte" />
      <main className="mx-auto max-w-2xl p-4">
        {projects === undefined && <p className="text-gray-500">Lade Projekte…</p>}
        {projects && projects.length === 0 && (
          <p className="mt-8 text-center text-gray-500">
            Noch keine Projekte angelegt. Tippe auf „+ Neues Projekt“, um zu starten.
          </p>
        )}
        <ul className="flex flex-col gap-3">
          {projects?.map((project) => (
            <li key={project.id} className={`${cardClass} flex items-center justify-between p-4`}>
              <Link to={`/projects/${project.id}`} className="min-w-0 flex-1">
                <p className="truncate font-semibold text-gray-900">{project.name}</p>
                <p className="truncate text-sm text-gray-500">{project.address || 'Keine Adresse hinterlegt'}</p>
              </Link>
              <div className="flex shrink-0 items-center gap-1">
                <Link to={`/projects/${project.id}/settings`} aria-label="Projekteinstellungen" className={iconButton}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009.6 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 8.6a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                  </svg>
                </Link>
                <button
                  type="button"
                  aria-label="Projekt löschen"
                  onClick={() => handleDelete(project.id, project.name)}
                  className={iconButton}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-col gap-3 border-t border-gray-200 pt-6">
          <p className="text-sm font-medium text-gray-500">Datensicherung</p>
          <div className="flex gap-3">
            <button type="button" onClick={handleBackupExport} className={`${buttonSecondary} flex-1`}>
              Alles sichern (.zip)
            </button>
            <label className={`${buttonSecondary} flex flex-1 cursor-pointer items-center justify-center`}>
              Wiederherstellen
              <input type="file" accept=".zip" className="hidden" onChange={handleBackupImport} />
            </label>
          </div>
        </div>
      </main>

      <button
        type="button"
        onClick={() => setShowCreate(true)}
        className={`${buttonPrimary} safe-bottom fixed bottom-6 left-1/2 -translate-x-1/2 shadow-lg`}
      >
        + Neues Projekt
      </button>

      {showCreate && (
        <Modal title="Neues Projekt" onClose={() => setShowCreate(false)}>
          <div className="flex flex-col gap-3">
            <div>
              <label className={labelClass}>Projektname</label>
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z.B. Neubau Wohnhaus Musterstraße"
                autoFocus
              />
            </div>
            <div>
              <label className={labelClass}>Adresse</label>
              <input
                className={inputClass}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Straße, PLZ Ort"
              />
            </div>
            <div className="mt-2 flex gap-3">
              <button type="button" className={`${buttonSecondary} flex-1`} onClick={() => setShowCreate(false)}>
                Abbrechen
              </button>
              <button
                type="button"
                className={`${buttonPrimary} flex-1`}
                disabled={!name.trim() || busy}
                onClick={handleCreate}
              >
                Anlegen
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
