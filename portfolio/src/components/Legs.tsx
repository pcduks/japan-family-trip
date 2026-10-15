import { useCallback, useEffect, useRef } from 'react'
import { profile, type Leg } from '../lib/content'
import { setFocus, useFocus } from '../lib/focus'

export default function Legs() {
  const legs = profile.legs
  const refs = useRef<Map<string, HTMLElement>>(new Map())
  const focus = useFocus()

  // The leg nearest the middle of the viewport steers the globe.
  useEffect(() => {
    const els = [...refs.current.values()]
    if (!els.length) return
    const ratios = new Map<string, number>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) ratios.set((e.target as HTMLElement).dataset.leg!, e.isIntersecting ? e.intersectionRatio : 0)
        let best: string | null = null
        let bestRatio = 0
        for (const [id, r] of ratios) {
          if (r > bestRatio) {
            best = id
            bestRatio = r
          }
        }
        if (best) {
          const leg = legs.find((l) => l.id === best)!
          setFocus({ id: leg.id, lat: leg.lat, lon: leg.lon, label: leg.city })
        } else if (bestRatio === 0) {
          setFocus(null)
        }
      },
      { rootMargin: '-35% 0px -35% 0px', threshold: [0, 0.2, 0.4, 0.6, 0.8, 1] },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [legs])

  const jump = useCallback(
    (dir: 1 | -1) => {
      const ids = legs.map((l) => l.id)
      const i = focus ? ids.indexOf(focus.id) : -1
      const next = Math.min(ids.length - 1, Math.max(0, i + dir))
      refs.current.get(ids[next])?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    },
    [focus, legs],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault()
        jump(1)
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault()
        jump(-1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [jump])

  return (
    <section className="section legs" id="log">
      <div className="section__head">
        <span className="section__num">02</span>
        <h2>The log</h2>
        <p className="section__sub">Every leg so far, newest first. The globe follows along.</p>
      </div>
      <ol className="legs__list">
        {legs.map((leg, i) => (
          <li key={leg.id}>
            <BoardingPass
              leg={leg}
              index={legs.length - i}
              active={focus?.id === leg.id}
              refCb={(el) => {
                if (el) refs.current.set(leg.id, el)
                else refs.current.delete(leg.id)
              }}
            />
          </li>
        ))}
      </ol>
    </section>
  )
}

function BoardingPass({ leg, index, active, refCb }: { leg: Leg; index: number; active: boolean; refCb: (el: HTMLElement | null) => void }) {
  return (
    <article ref={refCb} data-leg={leg.id} className={`pass ${active ? 'pass--active' : ''}`}>
      <div className="pass__stub">
        <span className="pass__label">Leg</span>
        <span className="pass__big">{String(index).padStart(2, '0')}</span>
        <span className="pass__label">Gate</span>
        <span className="pass__mono">{leg.gate}</span>
        <span className="pass__label">Dates</span>
        <span className="pass__mono">
          {leg.from}
          <br />
          {leg.to}
        </span>
      </div>
      <div className="pass__body">
        <header>
          <p className="pass__company">{leg.company}</p>
          <h3>{leg.title}</h3>
          <p className="pass__city">
            <span aria-hidden="true">✈</span> {leg.city}
          </p>
        </header>
        <p className="pass__summary">{leg.summary}</p>
        {leg.highlights.length > 0 && (
          <ul className="pass__highlights">
            {leg.highlights.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        )}
        <ul className="chips" aria-label="Themes">
          {leg.tags.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
    </article>
  )
}
