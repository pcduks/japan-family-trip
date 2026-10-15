import { Suspense, lazy, useEffect, useState } from 'react'
import { asset } from '../lib/content'
import { useFocus } from '../lib/focus'

const Globe = lazy(() => import('./Globe'))

/**
 * The fixed backdrop behind the page. Either the live three.js globe or, for devices and
 * people that prefer it, a still illustration with the same palette.
 */
export default function GlobeStage({ live }: { live: boolean }) {
  const focus = useFocus()
  const [hidden, setHidden] = useState(false)

  // Stop rendering while the tab is in the background.
  useEffect(() => {
    const onVis = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  return (
    <div className={`stage ${focus ? 'stage--focused' : ''}`} aria-hidden="true">
      {live ? (
        <Suspense fallback={<div className="stage__loading" />}>
          <Globe paused={hidden} />
        </Suspense>
      ) : (
        <img className="stage__still" src={asset('illustrations/flight-log-hero.webp')} alt="" />
      )}
      <div className="stage__vignette" />
    </div>
  )
}
