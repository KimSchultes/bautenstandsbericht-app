import JSZip from 'jszip'
import { db } from './schema'
import type { Project, Report, Position, Photo } from './types'

interface BackupManifest {
  version: 1
  exportedAt: string
  projects: (Omit<Project, 'logoBlob'> & { logoFile?: string })[]
  reports: Report[]
  positions: Position[]
  photos: (Omit<Photo, 'blob'> & { file: string })[]
}

/** Exportiert alle Projekte, Berichte, Positionen und Fotos als eine ZIP-Datei (Gesamtsicherung). */
export async function exportBackup(): Promise<Blob> {
  const zip = new JSZip()
  const [projects, reports, positions, photos] = await Promise.all([
    db.projects.toArray(),
    db.reports.toArray(),
    db.positions.toArray(),
    db.photos.toArray(),
  ])

  const manifest: BackupManifest = {
    version: 1,
    exportedAt: new Date().toISOString(),
    projects: [],
    reports,
    positions,
    photos: [],
  }

  for (const project of projects) {
    const { logoBlob, ...rest } = project
    if (logoBlob) {
      const file = `logos/${project.id}.jpg`
      zip.file(file, logoBlob)
      manifest.projects.push({ ...rest, logoFile: file })
    } else {
      manifest.projects.push(rest)
    }
  }

  for (const photo of photos) {
    const { blob, ...rest } = photo
    const file = `photos/${photo.id}.jpg`
    zip.file(file, blob)
    manifest.photos.push({ ...rest, file })
  }

  zip.file('manifest.json', JSON.stringify(manifest, null, 2))
  return zip.generateAsync({ type: 'blob' })
}

/**
 * Stellt einen Gesamt-Export wieder her. Ersetzt alle aktuell lokal gespeicherten Daten
 * (z.B. bei Gerätewechsel) - der Aufrufer sollte den Nutzer vorher explizit bestätigen lassen.
 */
export async function importBackup(file: Blob): Promise<void> {
  const zip = await JSZip.loadAsync(file)
  const manifestEntry = zip.file('manifest.json')
  if (!manifestEntry) throw new Error('Ungültige Sicherungsdatei: manifest.json fehlt')
  const manifest: BackupManifest = JSON.parse(await manifestEntry.async('string'))

  const projects: Project[] = []
  for (const p of manifest.projects) {
    const { logoFile, ...rest } = p
    let logoBlob: Blob | undefined
    if (logoFile) {
      const entry = zip.file(logoFile)
      if (entry) logoBlob = await entry.async('blob')
    }
    projects.push({ ...rest, logoBlob })
  }

  const photos: Photo[] = []
  for (const p of manifest.photos) {
    const { file, ...rest } = p
    const entry = zip.file(file)
    const blob = entry ? await entry.async('blob') : new Blob()
    photos.push({ ...rest, blob })
  }

  await db.transaction('rw', db.projects, db.reports, db.positions, db.photos, async () => {
    await Promise.all([
      db.projects.clear(),
      db.reports.clear(),
      db.positions.clear(),
      db.photos.clear(),
    ])
    await db.projects.bulkAdd(projects)
    await db.reports.bulkAdd(manifest.reports)
    await db.positions.bulkAdd(manifest.positions)
    await db.photos.bulkAdd(photos)
  })
}
