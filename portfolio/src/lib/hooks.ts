import { useEffect, useState, useSyncExternalStore } from 'react'

function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', cb)
      return () => mq.removeEventListener('change', cb)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

export const useReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)')
export const useCoarsePointer = () => useMediaQuery('(pointer: coarse)')

export function useWebGL() {
  const [ok, setOk] = useState<boolean | null>(null)
  useEffect(() => {
    try {
      const c = document.createElement('canvas')
      const gl = c.getContext('webgl2') ?? c.getContext('webgl')
      setOk(!!gl)
    } catch {
      setOk(false)
    }
  }, [])
  return ok
}

const STATIC_KEY = 'flightlog:static'

export function useStaticPreference(): [boolean, (v: boolean) => void] {
  const [value, setValue] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STATIC_KEY) === '1'
    } catch {
      return false
    }
  })
  const set = (v: boolean) => {
    setValue(v)
    try {
      localStorage.setItem(STATIC_KEY, v ? '1' : '0')
    } catch {
      /* private mode, ignore */
    }
  }
  return [value, set]
}

export function useScrolled(threshold = 24) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])
  return scrolled
}
