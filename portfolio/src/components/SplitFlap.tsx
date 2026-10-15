import { useEffect, useRef, useState } from 'react'

const CHARS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·-'

/**
 * A split-flap display row. Each cell flips through the alphabet until it lands on its target
 * character, with a small stagger from left to right, like the departures boards that still
 * clatter in a few airports.
 */
export default function SplitFlap({ text, width = 26, animate = true }: { text: string; width?: number; animate?: boolean }) {
  const target = text.toUpperCase().padEnd(width).slice(0, width)
  const [cells, setCells] = useState<string[]>(() => target.split(''))
  const current = useRef<string[]>(target.split(''))
  const timer = useRef<number | null>(null)

  useEffect(() => {
    if (!animate) {
      current.current = target.split('')
      setCells(current.current)
      return
    }
    const goal = target.split('')
    const started = performance.now()
    const tick = () => {
      const now = performance.now()
      let done = true
      const next = current.current.map((ch, i) => {
        const delay = i * 28
        if (now - started < delay) {
          done = false
          return ch
        }
        if (ch === goal[i]) return ch
        done = false
        const from = CHARS.indexOf(ch) === -1 ? 0 : CHARS.indexOf(ch)
        const want = CHARS.indexOf(goal[i])
        if (want === -1) return goal[i]
        return CHARS[(from + 1) % CHARS.length]
      })
      current.current = next
      setCells(next)
      if (!done) timer.current = window.setTimeout(tick, 34)
    }
    tick()
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [target, animate])

  return (
    <div className="flap" role="text" aria-label={text}>
      {cells.map((c, i) => (
        <span key={i} className={`flap__cell ${c !== target[i] ? 'is-flipping' : ''}`} aria-hidden="true">
          {c}
        </span>
      ))}
    </div>
  )
}
