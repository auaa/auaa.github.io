import { useEffect, useRef } from 'react'

export function useDebouncedCallback(fn: () => void, delayMs: number, deps: unknown[]) {
  const fnRef = useRef(fn)
  fnRef.current = fn
  const timer = useRef<number | null>(null)

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => fnRef.current(), delayMs)
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, deps)
}
