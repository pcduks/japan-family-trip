import { useEffect, useState } from 'react'
import { profile, asset } from '../lib/content'
import SplitFlap from './SplitFlap'

export default function Hero({ animate }: { animate: boolean }) {
  const lines = profile.boardLines
  const [line, setLine] = useState(0)
  useEffect(() => {
    if (!animate) return
    const id = window.setInterval(() => setLine((l) => (l + 1) % lines.length), 4200)
    return () => window.clearInterval(id)
  }, [animate, lines.length])

  return (
    <section className="hero" id="top">
      <div className="hero__inner">
        <p className="eyebrow">
          <span className="eyebrow__dot" /> Flight log · {profile.location.city} · {new Date().getFullYear()}
        </p>
        <h1 className="hero__name">
          Pedro <em>Parra</em>
        </h1>
        <p className="hero__role">{profile.role}</p>
        <p className="hero__tagline">{profile.tagline}</p>
        <div className="hero__actions">
          <a className="btn btn--primary" href="#log">
            Read the log <span aria-hidden="true">↓</span>
          </a>
          {__CV_AVAILABLE__ && (
            <a className="btn" href={asset(profile.cv.file)} download>
              {profile.cv.label}
            </a>
          )}
        </div>
        <div className="board" aria-live="polite">
          <div className="board__header">
            <span>Departures</span>
            <span className="board__clock">
              <Clock />
            </span>
          </div>
          <SplitFlap text={lines[line]} width={22} animate={animate} />
          <div className="board__hint">
            <kbd>↑</kbd>
            <kbd>↓</kbd> move between legs · drag the globe · <kbd>?</kbd> help
          </div>
        </div>
      </div>
    </section>
  )
}

function Clock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])
  const sg = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Singapore', hour: '2-digit', minute: '2-digit' })
  return <>{sg} SGT</>
}
