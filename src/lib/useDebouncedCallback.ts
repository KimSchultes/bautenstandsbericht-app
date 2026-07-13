import { useCallback, useEffect, useRef } from 'react'

/** Ruft `fn` erst auf, wenn `delay` ms lang keine weitere Änderung mehr kam (z.B. für Autosave beim Tippen). */
export function useDebouncedCallback<Args extends unknown[]>(fn: (...args: Args) => void, delay = 600) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return useCallback(
    (...args: Args) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => fnRef.current(...args), delay)
    },
    [delay],
  )
}
