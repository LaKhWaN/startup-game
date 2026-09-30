import { useEffect, useState } from 'react'
import { InvestorCheckin } from '../components/InvestorCheckin'
import { PostMortem } from '../components/PostMortem'
import { resetStoreForV2, upgradeLegacyRestart, useV2 } from './actions'
import { GameScreenV2 } from './GameScreenV2'
import { OnboardingV2 } from './OnboardingV2'
import { isV2Game } from './state'
import { installDevHooks } from './devHooks'

export default function AppV2() {
  const [ready, setReady] = useState(false)
  const phase = useV2(s => s.phase)
  const isV2 = useV2(s => isV2Game(s))
  const chapterComplete = useV2(s => s.v2?.chapter.complete ?? false)

  // Start clean and leave clean, so a game never leaks between / and /new.
  useEffect(() => {
    if (import.meta.env.DEV) installDevHooks()
    resetStoreForV2()
    setReady(true)
    return () => resetStoreForV2()
  }, [])

  // Legacy PostMortem "Play Again" builds a legacy-rules game; turn it into a v2 one.
  useEffect(() => {
    if (ready && phase === 'playing' && !isV2) upgradeLegacyRestart()
  }, [ready, phase, isV2])

  if (!ready) return null
  if (phase === 'setup') return <OnboardingV2 />
  if (phase === 'sold' || phase === 'lost') return <><PostMortem />{chapterComplete && <InvestorCheckin />}</>
  if (!isV2) return null
  return <><GameScreenV2 />{chapterComplete && <InvestorCheckin />}</>
}
