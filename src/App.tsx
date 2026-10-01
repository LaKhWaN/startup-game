import { lazy, Suspense, useState } from 'react'
import { LandingPage } from './LandingPage'

/* The game (three.js, R3F) loads only once the player hits Play. */
const Game = lazy(() => import('./v2/AppV2'))

/** `/`: the landing page, then the game. `/?play` skips straight to the game. */
export default function App() {
  const [showLanding, setShowLanding] = useState(() => !new URLSearchParams(window.location.search).has('play'))
  if (showLanding) return <LandingPage onPlay={() => setShowLanding(false)} />
  return <Suspense fallback={null}><Game /></Suspense>
}
