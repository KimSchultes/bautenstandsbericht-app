import { useEffect, useRef, useState } from 'react'

/** Erzeugt und pflegt Object-URLs für eine Liste von Blob-tragenden Items (z.B. Fotos), räumt beim Unmount auf. */
export function useObjectUrls<T extends { id: string }>(
  items: T[] | undefined,
  getBlob: (item: T) => Blob,
): Record<string, string> {
  const mapRef = useRef<Map<string, string>>(new Map())
  const [urls, setUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!items) return
    const currentIds = new Set(items.map((i) => i.id))
    for (const [id, url] of mapRef.current) {
      if (!currentIds.has(id)) {
        URL.revokeObjectURL(url)
        mapRef.current.delete(id)
      }
    }
    for (const item of items) {
      if (!mapRef.current.has(item.id)) {
        mapRef.current.set(item.id, URL.createObjectURL(getBlob(item)))
      }
    }
    setUrls(Object.fromEntries(mapRef.current))
  }, [items])

  useEffect(() => {
    return () => {
      for (const url of mapRef.current.values()) URL.revokeObjectURL(url)
    }
  }, [])

  return urls
}
