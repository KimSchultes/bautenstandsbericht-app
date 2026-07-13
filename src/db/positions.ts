import { db } from './schema'
import type { Position } from './types'

export async function listPositionsForReport(reportId: string): Promise<Position[]> {
  const all = await db.positions.where('reportId').equals(reportId).toArray()
  return all.sort((a, b) => a.order - b.order)
}

export async function addPosition(reportId: string, note = ''): Promise<Position> {
  const existing = await listPositionsForReport(reportId)
  const position: Position = {
    id: crypto.randomUUID(),
    reportId,
    order: existing.length,
    note,
  }
  await db.positions.add(position)
  return position
}

export async function updatePositionNote(id: string, note: string): Promise<void> {
  await db.positions.update(id, { note })
}

export async function deletePosition(id: string): Promise<void> {
  await db.transaction('rw', db.positions, db.photos, async () => {
    const position = await db.positions.get(id)
    if (!position) return
    await db.photos.where('positionId').equals(id).delete()
    await db.positions.delete(id)
    const remaining = await listPositionsForReport(position.reportId)
    await Promise.all(remaining.map((p, idx) => db.positions.update(p.id, { order: idx })))
  })
}

/** Übernimmt eine neue Reihenfolge (z.B. nach Drag&Drop oder Pfeiltasten-Umsortierung). */
export async function reorderPositions(orderedIds: string[]): Promise<void> {
  await db.transaction('rw', db.positions, async () => {
    await Promise.all(orderedIds.map((id, idx) => db.positions.update(id, { order: idx })))
  })
}
