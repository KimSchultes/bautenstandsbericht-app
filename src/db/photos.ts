import { db } from './schema'
import type { Photo } from './types'

export async function listPhotosForPosition(positionId: string): Promise<Photo[]> {
  const all = await db.photos.where('positionId').equals(positionId).toArray()
  return all.sort((a, b) => a.order - b.order)
}

export async function addPhoto(positionId: string, blob: Blob): Promise<Photo> {
  const existing = await listPhotosForPosition(positionId)
  const photo: Photo = {
    id: crypto.randomUUID(),
    positionId,
    order: existing.length,
    blob,
    createdAt: new Date().toISOString(),
  }
  await db.photos.add(photo)
  return photo
}

export async function deletePhoto(id: string): Promise<void> {
  await db.transaction('rw', db.photos, async () => {
    const photo = await db.photos.get(id)
    if (!photo) return
    await db.photos.delete(id)
    const remaining = await listPhotosForPosition(photo.positionId)
    await Promise.all(remaining.map((p, idx) => db.photos.update(p.id, { order: idx })))
  })
}
