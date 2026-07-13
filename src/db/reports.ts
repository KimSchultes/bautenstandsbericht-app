import { db } from './schema'
import type { Report, ReportCompany } from './types'
import { nextReportNumber } from './projects'

function now() {
  return new Date().toISOString()
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export async function listReportsForProject(projectId: string): Promise<Report[]> {
  const all = await db.reports.where('projectId').equals(projectId).toArray()
  return all.sort((a, b) => b.reportNumber - a.reportNumber)
}

export async function getReport(id: string): Promise<Report | undefined> {
  return db.reports.get(id)
}

export async function createReport(
  projectId: string,
  input?: Partial<Pick<Report, 'author' | 'presentCompanies'>>,
): Promise<Report> {
  const reportNumber = await nextReportNumber(projectId)
  const nowIso = now()
  const report: Report = {
    id: crypto.randomUUID(),
    projectId,
    reportNumber,
    date: todayIso(),
    inspectionInfo: '',
    author: input?.author ?? '',
    presentCompanies: input?.presentCompanies ?? [],
    targetStatusText: '',
    targetStatusDate: undefined,
    specialNotes: '',
    status: 'draft',
    createdAt: nowIso,
    updatedAt: nowIso,
  }
  await db.reports.add(report)
  return report
}

export async function updateReport(id: string, changes: Partial<Omit<Report, 'id' | 'projectId'>>): Promise<void> {
  await db.reports.update(id, { ...changes, updatedAt: now() })
}

export async function deleteReport(id: string): Promise<void> {
  await db.transaction('rw', db.reports, db.positions, db.photos, async () => {
    const positions = await db.positions.where('reportId').equals(id).toArray()
    for (const position of positions) {
      await db.photos.where('positionId').equals(position.id).delete()
    }
    await db.positions.where('reportId').equals(id).delete()
    await db.reports.delete(id)
  })
}

export function setPresentCompanies(id: string, companies: ReportCompany[]): Promise<void> {
  return updateReport(id, { presentCompanies: companies })
}
