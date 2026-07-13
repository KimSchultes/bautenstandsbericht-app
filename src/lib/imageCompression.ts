const MAX_WIDTH = 1600
const JPEG_QUALITY = 0.7

/** Verkleinert und komprimiert ein Bild client-seitig vor dem Speichern in IndexedDB. */
export async function compressImage(file: File | Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_WIDTH / bitmap.width)
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return file instanceof Blob ? file : new Blob([file])
  }
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
  )
  return blob ?? file
}
