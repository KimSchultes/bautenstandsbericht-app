import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  getProject,
  updateProject,
  setProjectLogo,
  upsertDistributionEntry,
  removeDistributionEntry,
  upsertDefaultCompany,
  removeDefaultCompany,
} from '../db/projects'
import { compressImage } from '../lib/imageCompression'
import PageHeader from '../components/PageHeader'
import EntryListEditor from '../components/EntryListEditor'
import { inputClass, labelClass, buttonSecondary } from '../lib/ui'

export default function ProjectSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const project = useLiveQuery(() => (projectId ? getProject(projectId) : undefined), [projectId])

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    if (project) {
      setName(project.name)
      setAddress(project.address)
    }
  }, [project?.id])

  useEffect(() => {
    if (project?.logoBlob) {
      const url = URL.createObjectURL(project.logoBlob)
      setLogoUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    setLogoUrl(null)
  }, [project?.logoBlob])

  if (!projectId) return null
  if (!project) return <p className="p-4 text-gray-500">Lade…</p>

  async function handleSaveHeader() {
    if (!projectId) return
    await updateProject(projectId, { name: name.trim(), address: address.trim() })
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !projectId) return
    const compressed = await compressImage(file)
    await setProjectLogo(projectId, compressed)
  }

  return (
    <div className="min-h-screen pb-16">
      <PageHeader title="Projekteinstellungen" subtitle={project.name} onBack={() => navigate(`/projects/${projectId}`)} />
      <main className="mx-auto flex max-w-2xl flex-col gap-8 p-4">
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-gray-900">Stammdaten</h2>
          <div>
            <label className={labelClass}>Projektname</label>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} onBlur={handleSaveHeader} />
          </div>
          <div>
            <label className={labelClass}>Adresse</label>
            <input
              className={inputClass}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onBlur={handleSaveHeader}
            />
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-gray-900">Firmenlogo / Briefkopf (optional)</h2>
          {logoUrl && <img src={logoUrl} alt="Logo" className="h-20 w-auto rounded border border-gray-200 object-contain" />}
          <label className={`${buttonSecondary} inline-flex w-fit cursor-pointer items-center`}>
            Logo auswählen
            <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
          </label>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-gray-900">Standard-Verteiler</h2>
          <p className="text-sm text-gray-500">Empfänger, die als Vorschlag in neuen Berichten erscheinen.</p>
          <EntryListEditor
            entries={project.distributionList.map((e) => ({ id: e.id, name: e.name, secondary: e.role }))}
            primaryLabel="Name"
            secondaryLabel="Rolle"
            primaryPlaceholder="z.B. Kary Architekten"
            secondaryPlaceholder="z.B. Architekt"
            onAdd={(name, role) => upsertDistributionEntry(projectId, { name, role })}
            onRemove={(id) => removeDistributionEntry(projectId, id)}
          />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-gray-900">Standard-Firmenliste</h2>
          <p className="text-sm text-gray-500">Häufig anwesende Firmen, als Vorschlag bei neuen Berichten.</p>
          <EntryListEditor
            entries={project.defaultCompanies.map((e) => ({ id: e.id, name: e.name, secondary: e.trade }))}
            primaryLabel="Firma"
            secondaryLabel="Gewerk"
            primaryPlaceholder="z.B. Mustermann Bau GmbH"
            secondaryPlaceholder="z.B. Rohbau"
            onAdd={(name, trade) => upsertDefaultCompany(projectId, { name, trade })}
            onRemove={(id) => removeDefaultCompany(projectId, id)}
          />
        </section>
      </main>
    </div>
  )
}
