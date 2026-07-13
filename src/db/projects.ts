import { db } from './schema'
import type { Project, DistributionEntry, CompanyEntry } from './types'

function now() {
  return new Date().toISOString()
}

export async function listProjects(): Promise<Project[]> {
  const all = await db.projects.toArray()
  return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function getProject(id: string): Promise<Project | undefined> {
  return db.projects.get(id)
}

export async function createProject(input: { name: string; address: string }): Promise<Project> {
  const project: Project = {
    id: crypto.randomUUID(),
    name: input.name,
    address: input.address,
    distributionList: [],
    defaultCompanies: [],
    reportCounter: 0,
    createdAt: now(),
    updatedAt: now(),
  }
  await db.projects.add(project)
  return project
}

export async function updateProject(id: string, changes: Partial<Omit<Project, 'id'>>): Promise<void> {
  await db.projects.update(id, { ...changes, updatedAt: now() })
}

export async function deleteProject(id: string): Promise<void> {
  await db.transaction('rw', db.projects, db.reports, db.positions, db.photos, async () => {
    const reports = await db.reports.where('projectId').equals(id).toArray()
    for (const report of reports) {
      const positions = await db.positions.where('reportId').equals(report.id).toArray()
      for (const position of positions) {
        await db.photos.where('positionId').equals(position.id).delete()
      }
      await db.positions.where('reportId').equals(report.id).delete()
    }
    await db.reports.where('projectId').equals(id).delete()
    await db.projects.delete(id)
  })
}

export async function setProjectLogo(id: string, blob: Blob | undefined): Promise<void> {
  await db.projects.update(id, { logoBlob: blob, updatedAt: now() })
}

export async function upsertDistributionEntry(
  projectId: string,
  entry: Partial<DistributionEntry> & { name: string; role: string },
): Promise<void> {
  const project = await db.projects.get(projectId)
  if (!project) return
  const list = [...project.distributionList]
  const idx = entry.id ? list.findIndex((e) => e.id === entry.id) : -1
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...entry }
  } else {
    list.push({ id: crypto.randomUUID(), name: entry.name, role: entry.role })
  }
  await updateProject(projectId, { distributionList: list })
}

export async function removeDistributionEntry(projectId: string, entryId: string): Promise<void> {
  const project = await db.projects.get(projectId)
  if (!project) return
  await updateProject(projectId, {
    distributionList: project.distributionList.filter((e) => e.id !== entryId),
  })
}

export async function upsertDefaultCompany(
  projectId: string,
  entry: Partial<CompanyEntry> & { name: string; trade: string },
): Promise<void> {
  const project = await db.projects.get(projectId)
  if (!project) return
  const list = [...project.defaultCompanies]
  const idx = entry.id ? list.findIndex((e) => e.id === entry.id) : -1
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...entry }
  } else {
    list.push({ id: crypto.randomUUID(), name: entry.name, trade: entry.trade })
  }
  await updateProject(projectId, { defaultCompanies: list })
}

export async function removeDefaultCompany(projectId: string, entryId: string): Promise<void> {
  const project = await db.projects.get(projectId)
  if (!project) return
  await updateProject(projectId, {
    defaultCompanies: project.defaultCompanies.filter((e) => e.id !== entryId),
  })
}

/** Reserviert die nächste fortlaufende Berichtsnummer für ein Projekt (atomar). */
export async function nextReportNumber(projectId: string): Promise<number> {
  return db.transaction('rw', db.projects, async () => {
    const project = await db.projects.get(projectId)
    if (!project) throw new Error('Projekt nicht gefunden')
    const next = project.reportCounter + 1
    await db.projects.update(projectId, { reportCounter: next, updatedAt: now() })
    return next
  })
}
