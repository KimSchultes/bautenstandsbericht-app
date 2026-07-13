import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { getProject } from '../db/projects'
import { getReport, updateReport } from '../db/reports'
import { listPositionsForReport, addPosition, reorderPositions } from '../db/positions'
import type { ReportCompany, ReportStatus } from '../db/types'
import PageHeader from '../components/PageHeader'
import CompanyPicker from '../components/CompanyPicker'
import PositionCard from '../components/PositionCard'
import { useDebouncedCallback } from '../lib/useDebouncedCallback'
import { inputClass, textareaClass, labelClass, buttonPrimary, buttonSecondary } from '../lib/ui'

export default function ReportEditorPage() {
  const { projectId, reportId } = useParams<{ projectId: string; reportId: string }>()
  const navigate = useNavigate()
  const project = useLiveQuery(() => (projectId ? getProject(projectId) : undefined), [projectId])
  const report = useLiveQuery(() => (reportId ? getReport(reportId) : undefined), [reportId])
  const positions = useLiveQuery(() => (reportId ? listPositionsForReport(reportId) : []), [reportId])

  const hydratedRef = useRef<string | null>(null)
  const [date, setDate] = useState('')
  const [inspectionInfo, setInspectionInfo] = useState('')
  const [author, setAuthor] = useState('')
  const [targetStatusText, setTargetStatusText] = useState('')
  const [targetStatusDate, setTargetStatusDate] = useState('')
  const [specialNotes, setSpecialNotes] = useState('')

  useEffect(() => {
    if (report && hydratedRef.current !== report.id) {
      hydratedRef.current = report.id
      setDate(report.date)
      setInspectionInfo(report.inspectionInfo)
      setAuthor(report.author)
      setTargetStatusText(report.targetStatusText)
      setTargetStatusDate(report.targetStatusDate ?? '')
      setSpecialNotes(report.specialNotes)
    }
  }, [report])

  const debouncedSaveText = useDebouncedCallback((field: string, value: string) => {
    if (!reportId) return
    updateReport(reportId, { [field]: value } as any)
  }, 600)

  function field(name: string, value: string, setValue: (v: string) => void) {
    return {
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setValue(e.target.value)
        debouncedSaveText(name, e.target.value)
      },
    }
  }

  async function handleImmediateSave(changes: Record<string, unknown>) {
    if (!reportId) return
    await updateReport(reportId, changes)
  }

  async function handleAddPosition() {
    if (!reportId) return
    await addPosition(reportId)
  }

  async function handleMove(index: number, direction: -1 | 1) {
    if (!positions) return
    const target = index + direction
    if (target < 0 || target >= positions.length) return
    const ids = positions.map((p) => p.id)
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    await reorderPositions(ids)
  }

  if (!projectId || !reportId) return null
  if (!report || !project) return <p className="p-4 text-gray-500">Lade…</p>

  return (
    <div className="min-h-screen pb-32">
      <PageHeader
        title={`Bericht Nr. ${String(report.reportNumber).padStart(2, '0')}`}
        subtitle={project.name}
        onBack={() => navigate(`/projects/${projectId}`)}
      />
      <main className="mx-auto flex max-w-2xl flex-col gap-8 p-4">
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-gray-900">Allgemeine Informationen</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Datum der Begehung</label>
              <input type="date" className={inputClass} {...field('date', date, setDate)} />
            </div>
            <div>
              <label className={labelClass}>Ersteller</label>
              <input className={inputClass} placeholder="Name" {...field('author', author, setAuthor)} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Uhrzeit / Dauer der Baustellenbegehung</label>
            <input
              className={inputClass}
              placeholder="z.B. 09:00 – 10:30 Uhr"
              {...field('inspectionInfo', inspectionInfo, setInspectionInfo)}
            />
          </div>
          <div>
            <label className={labelClass}>Anwesende Firmen</label>
            <CompanyPicker
              projectCompanies={project.defaultCompanies}
              selected={report.presentCompanies}
              onChange={(companies: ReportCompany[]) => handleImmediateSave({ presentCompanies: companies })}
            />
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-gray-900">SOLL-Stand gemäß Bauzeitenplan</h2>
          <div>
            <label className={labelClass}>Stichtag</label>
            <input
              type="date"
              className={`${inputClass} max-w-xs`}
              {...field('targetStatusDate', targetStatusDate, setTargetStatusDate)}
            />
          </div>
          <textarea
            className={textareaClass}
            rows={3}
            placeholder="Beschreibung des SOLL-Standes…"
            {...field('targetStatusText', targetStatusText, setTargetStatusText)}
          />
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">IST-Stand gemäß Baustellenbegehung</h2>
          </div>
          <div className="flex flex-col gap-4">
            {positions?.map((position, index) => (
              <PositionCard
                key={position.id}
                position={position}
                index={index}
                count={positions.length}
                onMoveUp={() => handleMove(index, -1)}
                onMoveDown={() => handleMove(index, 1)}
              />
            ))}
          </div>
          <button type="button" onClick={handleAddPosition} className={`${buttonSecondary} w-fit`}>
            + Position hinzufügen
          </button>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-gray-900">Besondere Vorkommnisse, etc.</h2>
          <textarea
            className={textareaClass}
            rows={3}
            placeholder="Sonstige Anmerkungen…"
            {...field('specialNotes', specialNotes, setSpecialNotes)}
          />
        </section>
      </main>

      <div className="safe-bottom fixed bottom-0 left-0 right-0 flex gap-3 border-t border-gray-200 bg-white p-3">
        <select
          className={`${inputClass} w-auto`}
          value={report.status}
          onChange={(e) => handleImmediateSave({ status: e.target.value as ReportStatus })}
        >
          <option value="draft">Entwurf</option>
          <option value="final">Fertiggestellt</option>
        </select>
        <button
          type="button"
          className={`${buttonPrimary} flex-1`}
          onClick={() => navigate(`/projects/${projectId}/reports/${reportId}/preview`)}
        >
          Vorschau &amp; Export
        </button>
      </div>
    </div>
  )
}
