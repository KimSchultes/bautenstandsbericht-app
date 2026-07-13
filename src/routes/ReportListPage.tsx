import { useNavigate, useParams, Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { getProject } from '../db/projects'
import { listReportsForProject, createReport, deleteReport } from '../db/reports'
import PageHeader from '../components/PageHeader'
import { buttonPrimary, cardClass, iconButton } from '../lib/ui'

export default function ReportListPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const project = useLiveQuery(() => (projectId ? getProject(projectId) : undefined), [projectId])
  const reports = useLiveQuery(() => (projectId ? listReportsForProject(projectId) : []), [projectId])

  if (!projectId) return null

  async function handleCreate() {
    if (!projectId || !project) return
    const report = await createReport(projectId, {
      presentCompanies: project.defaultCompanies.map((c) => ({ name: c.name, trade: c.trade })),
    })
    navigate(`/projects/${projectId}/reports/${report.id}`)
  }

  async function handleDelete(id: string, reportNumber: number) {
    if (!confirm(`Bautenstandsbericht Nr. ${reportNumber} unwiderruflich löschen?`)) return
    await deleteReport(id)
  }

  return (
    <div className="min-h-screen pb-28">
      <PageHeader
        title="Berichte"
        subtitle={project?.name}
        onBack={() => navigate('/')}
        actions={
          <Link to={`/projects/${projectId}/settings`} aria-label="Projekteinstellungen" className="min-h-11 min-w-11 flex items-center justify-center rounded-lg active:bg-white/20">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009.6 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 8.6a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </Link>
        }
      />
      <main className="mx-auto max-w-2xl p-4">
        {reports === undefined && <p className="text-gray-500">Lade Berichte…</p>}
        {reports && reports.length === 0 && (
          <p className="mt-8 text-center text-gray-500">Noch keine Berichte. Tippe auf „+ Neuer Bericht“.</p>
        )}
        <ul className="flex flex-col gap-3">
          {reports?.map((report) => (
            <li key={report.id} className={`${cardClass} flex items-center justify-between p-4`}>
              <Link to={`/projects/${projectId}/reports/${report.id}`} className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900">
                  Bericht Nr. {String(report.reportNumber).padStart(2, '0')}
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(report.date).toLocaleDateString('de-DE')} ·{' '}
                  <span className={report.status === 'final' ? 'text-green-700' : 'text-amber-600'}>
                    {report.status === 'final' ? 'Fertiggestellt' : 'Entwurf'}
                  </span>
                </p>
              </Link>
              <button
                type="button"
                aria-label="Bericht löschen"
                onClick={() => handleDelete(report.id, report.reportNumber)}
                className={iconButton}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" strokeLinecap="round" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      </main>

      <button
        type="button"
        onClick={handleCreate}
        className={`${buttonPrimary} safe-bottom fixed bottom-6 left-1/2 -translate-x-1/2 shadow-lg`}
      >
        + Neuer Bericht
      </button>
    </div>
  )
}
