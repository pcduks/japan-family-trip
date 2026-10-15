import { useSyncExternalStore } from 'react'

export type Focus = { id: string; lat: number; lon: number; label: string } | null

let focus: Focus = null
const listeners = new Set<() => void>()

export function setFocus(next: Focus) {
  if (focus?.id === next?.id) return
  focus = next
  listeners.forEach((l) => l())
}

export function getFocus() {
  return focus
}

export function useFocus() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => focus,
    () => focus,
  )
}
