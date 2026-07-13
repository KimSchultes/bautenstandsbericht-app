import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Position } from '../db/types'
import { listPhotosForPosition, addPhoto, deletePhoto } from '../db/photos'
import { updatePositionNote, deletePosition } from '../db/positions'
import { compressImage } from '../lib/imageCompression'
import { useDebouncedCallback } from '../lib/useDebouncedCallback'
import { useObjectUrls } from '../lib/useObjectUrls'
import { textareaClass, iconButton } from '../lib/ui'

interface PositionCardProps {
  position: Position
  index: number
  count: number
  onMoveUp: () => void
  onMoveDown: () => void
}

export default function PositionCard({ position, index, count, onMoveUp, onMoveDown }: PositionCardProps) {
  const photos = useLiveQuery(() => listPhotosForPosition(position.id), [position.id])
  const [note, setNote] = useState(position.note)
  const [uploading, setUploading] = useState(false)
  const photoUrls = useObjectUrls(photos, (p) => p.blob)

  const debouncedSave = useDebouncedCallback((value: string) => {
    updatePositionNote(position.id, value)
  }, 600)

  function handleNoteChange(value: string) {
    setNote(value)
    debouncedSave(value)
  }

  async function handleFiles(files: File[]) {
    if (files.length === 0) return
    setUploading(true)
    try {
      for (const file of files) {
        const compressed = await compressImage(file)
        await addPhoto(position.id, compressed)
      }
    } finally {
      setUploading(false)
    }
  }

  async function handleDeletePosition() {
    if (!confirm(`Position ${index + 1} inkl. aller Fotos löschen?`)) return
    await deletePosition(position.id)
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-full bg-brand/10 px-3 py-1 text-sm font-semibold text-brand">
          Position {String(index + 1).padStart(2, '0')}
        </span>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Nach oben" disabled={index === 0} onClick={onMoveUp} className={iconButton}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Nach unten"
            disabled={index === count - 1}
            onClick={onMoveDown}
            className={iconButton}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M19 12l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button type="button" aria-label="Position löschen" onClick={handleDeletePosition} className={iconButton}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {photos?.map((photo) => (
          <div key={photo.id} className="group relative h-28 w-28 overflow-hidden rounded-lg border border-gray-200">
            {photoUrls[photo.id] && (
              <img src={photoUrls[photo.id]} alt="" className="h-full w-full object-cover" />
            )}
            <button
              type="button"
              aria-label="Foto löschen"
              onClick={() => deletePhoto(photo.id)}
              className="absolute right-0.5 top-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}
        {uploading && (
          <div className="flex h-28 w-28 items-center justify-center rounded-lg border border-dashed border-gray-300 text-xs text-gray-400">
            Lädt…
          </div>
        )}
      </div>

      <div className="mb-3 flex gap-2">
        <label className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 active:bg-gray-100">
          📷 Foto aufnehmen
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? [])
              e.target.value = ''
              handleFiles(files)
            }}
          />
        </label>
        <label className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 active:bg-gray-100">
          🖼️ Aus Galerie
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? [])
              e.target.value = ''
              handleFiles(files)
            }}
          />
        </label>
      </div>

      <textarea
        className={textareaClass}
        rows={3}
        placeholder="Anmerkung zu dieser Position…"
        value={note}
        onChange={(e) => handleNoteChange(e.target.value)}
      />
    </div>
  )
}
