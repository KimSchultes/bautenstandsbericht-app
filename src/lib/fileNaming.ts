import type { Project, Report } from '../db/types'

function sanitize(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '-').trim()
}

export function reportFileBaseName(project: Project, report: Report): string {
  const num = String(report.reportNumber).padStart(2, '0')
  return sanitize(`${report.date} Bautenstandsbericht Nr. ${num} – ${project.name}`)
}
