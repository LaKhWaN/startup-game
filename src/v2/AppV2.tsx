import { useEffect, useState } from 'react'
import { resetStore, useV2 } from './actions'
import { GameScreenV2 } from './GameScreenV2'
import { OnboardingV2 } from './OnboardingV2'
import { installDevHooks } from './devHooks'
import { InvestorCheckin } from './ui/InvestorCheckin'
import { PostMortem } from './ui/PostMortem'

export default function AppV2() {
  const [ready, setReady] = useState(false)
  const phase = useV2(s => s.phase)
  const chapterComplete = useV2(s => s.v2.chapter.complete)

  useEffect(() => {
    if (import.meta.env.DEV) installDevHooks()
    resetStore()
    setReady(true)
  }, [])

  if (!ready) return null
  if (phase === 'setup') return <OnboardingV2 />
  if (phase === 'sold' || phase === 'lost') return <><PostMortem />{chapterComplete && <InvestorCheckin />}</>
  return <><GameScreenV2 />{chapterComplete && <InvestorCheckin />}</>
}
