import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { getProject } from '../db/projects'
import { getReport } from '../db/reports'
import { listPositionsForReport } from '../db/positions'
import { listPhotosForPosition } from '../db/photos'
import type { PositionWithPhotos } from '../lib/pdfExport'
import { buildReportPdf } from '../lib/pdfExport'
import { reportFileBaseName } from '../lib/fileNaming'
import { useObjectUrls } from '../lib/useObjectUrls'
import PageHeader from '../components/PageHeader'
import { buttonPrimary, buttonSecondary, cardClass } from '../lib/ui'

function germanDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('de-DE')
}

async function loadPositionsWithPhotos(reportId: string): Promise<PositionWithPhotos[]> {
  const positions = await listPositionsForReport(reportId)
  return Promise.all(
    positions.map(async (position) => ({ ...position, photos: await listPhotosForPosition(position.id) })),
  )
}

export default function ReportPreviewPage() {
  const { projectId, reportId } = useParams<{ projectId: string; reportId: string }>()
  const navigate = useNavigate()
  const project = useLiveQuery(() => (projectId ? getProject(projectId) : undefined), [projectId])
  const report = useLiveQuery(() => (reportId ? getReport(reportId) : undefined), [reportId])
  const positions = useLiveQuery(() => (reportId ? loadPositionsWithPhotos(reportId) : []), [reportId])
  const [exporting, setExporting] = useState(false)

  const allPhotos = useMemo(() => positions?.flatMap((p) => p.photos) ?? [], [positions])
  const photoUrls = useObjectUrls(allPhotos, (p) => p.blob)

  async function handleExport() {
    if (!project || !report || !positions) return
    setExporting(true)
    try {
      const bytes = await buildReportPdf(project, report, positions)
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' })
      const filename = `${reportFileBaseName(project, report)}.pdf`
      const file = new File([blob], filename, { type: 'application/pdf' })

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: filename })
          return
        } catch {
          // Nutzer hat Teilen abgebrochen oder Share nicht verfügbar - Fallback auf Download
        }
      }

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  if (!projectId || !reportId) return null
  if (!project || !report || !positions) return <p className="p-4 text-gray-500">Lade Vorschau…</p>

  const companiesText = report.presentCompanies.length
    ? report.presentCompanies.map((c) => (c.trade ? `${c.name} (${c.trade})` : c.name)).join(', ')
    : '–'

  return (
    <div className="min-h-screen pb-28">
      <PageHeader
        title="Vorschau"
        subtitle={`Bericht Nr. ${String(report.reportNumber).padStart(2, '0')}`}
        onBack={() => navigate(`/projects/${projectId}/reports/${reportId}`)}
      />
      <main className="mx-auto max-w-2xl p-4">
        <div className={`${cardClass} p-6`}>
          <div className="mb-4 flex items-start justify-between">
            <h1 className="text-xl font-bold text-gray-900">
              Bautenstandsbericht Nr. {String(report.reportNumber).padStart(2, '0')}
            </h1>
          </div>

          <p className="font-semibold text-gray-900">Bauvorhaben: {project.name}</p>
          {project.address && <p className="text-gray-700">{project.address}</p>}
          <p className="mt-2 text-sm text-gray-700">
            Bautenstandsbericht aufgestellt von: {report.author || '–'}, {germanDate(report.date)}
          </p>
          {project.distributionList.length > 0 && (
            <p className="mt-1 text-xs italic text-gray-500">
              Verteiler: {project.distributionList.map((e) => `${e.name} (${e.role})`).join(', ')}
            </p>
          )}

          <h2 className="mb-2 mt-6 font-semibold text-gray-900">Allgemeine Informationen</h2>
          <table className="w-full border-collapse text-sm">
            <tbody>
              <tr className="border border-gray-300">
                <td className="w-40 border border-gray-300 bg-gray-50 p-2 font-medium">Datum / Dauer der Begehung</td>
                <td className="border border-gray-300 p-2">
                  {germanDate(report.date)}
                  {report.inspectionInfo ? ` · ${report.inspectionInfo}` : ''}
                </td>
              </tr>
              <tr className="border border-gray-300">
                <td className="border border-gray-300 bg-gray-50 p-2 font-medium">Anwesende Firmen</td>
                <td className="border border-gray-300 p-2">{companiesText}</td>
              </tr>
            </tbody>
          </table>

          <h2 className="mb-2 mt-6 font-semibold text-gray-900">SOLL-Stand Baustelle gemäß Bauzeitenplan</h2>
          {report.targetStatusDate && (
            <p className="text-sm font-medium text-gray-800">Stichtag: {germanDate(report.targetStatusDate)}</p>
          )}
          <p className="whitespace-pre-wrap text-sm text-gray-700">{report.targetStatusText || '–'}</p>

          <h2 className="mb-2 mt-6 font-semibold text-gray-900">IST-Stand Baustelle gemäß Baustellenbegehung</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="border border-gray-300 p-2">Lfd. Nr.</th>
                <th className="border border-gray-300 p-2">Bildnachweis</th>
                <th className="border border-gray-300 p-2">Anmerkungen</th>
              </tr>
            </thead>
            <tbody>
              {positions.length === 0 && (
                <tr>
                  <td colSpan={3} className="border border-gray-300 p-2 italic text-gray-500">
                    Keine Positionen erfasst.
                  </td>
                </tr>
              )}
              {positions.map((position, index) => (
                <tr key={position.id} className="align-top">
                  <td className="border border-gray-300 p-2 font-medium">{String(index + 1).padStart(2, '0')}</td>
                  <td className="border border-gray-300 p-2">
                    <div className="flex flex-wrap gap-1">
                      {position.photos.map((photo) => (
                        <img
                          key={photo.id}
                          src={photoUrls[photo.id]}
                          alt=""
                          className="h-16 w-20 rounded object-cover"
                        />
                      ))}
                      {position.photos.length === 0 && <span className="text-gray-400">–</span>}
                    </div>
                  </td>
                  <td className="border border-gray-300 whitespace-pre-wrap p-2">{position.note || '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 className="mb-2 mt-6 font-semibold text-gray-900">Besondere Vorkommnisse, etc.</h2>
          <p className="whitespace-pre-wrap text-sm text-gray-700">{report.specialNotes || '–'}</p>
        </div>
      </main>

      <div className="safe-bottom fixed bottom-0 left-0 right-0 flex gap-3 border-t border-gray-200 bg-white p-3">
        <button
          type="button"
          className={`${buttonSecondary} flex-1`}
          onClick={() => navigate(`/projects/${projectId}/reports/${reportId}`)}
        >
          Zurück zum Bericht
        </button>
        <button type="button" className={`${buttonPrimary} flex-1`} disabled={exporting} onClick={handleExport}>
          {exporting ? 'Erzeuge PDF…' : 'Als PDF exportieren'}
        </button>
      </div>
    </div>
  )
}
