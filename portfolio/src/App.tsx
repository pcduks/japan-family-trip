import { useEffect, useState } from 'react'
import Nav from './components/Nav'
import Hero from './components/Hero'
import About from './components/About'
import Legs from './components/Legs'
import Builds from './components/Builds'
import Toolkit from './components/Toolkit'
import Elsewhere from './components/Elsewhere'
import Help from './components/Help'
import GlobeStage from './scene/GlobeStage'
import { useReducedMotion, useStaticPreference, useWebGL } from './lib/hooks'

export default function App() {
  const reduced = useReducedMotion()
  const webgl = useWebGL()
  const [staticPref, setStaticPref] = useStaticPreference()
  const [help, setHelp] = useState(false)

  const canGoLive = !reduced && webgl !== false
  const live = canGoLive && !staticPref && webgl === true

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '?') setHelp((h) => !h)
      if (e.key === 'Escape') setHelp(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <GlobeStage live={live} />
      <Nav onHelp={() => setHelp(true)} />
      <main className={live ? 'page page--live' : 'page page--static'}>
        <Hero animate={!reduced} />
        <About />
        <Legs />
        <Builds />
        <Toolkit />
        <Elsewhere />
      </main>
      <Help open={help} onClose={() => setHelp(false)} staticMode={!live} setStaticMode={(v) => setStaticPref(v)} canGoLive={canGoLive} />
    </>
  )
}
