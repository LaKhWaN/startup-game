import { useEffect, useState } from 'react'
import { EventCard } from '../components/EventCard'
import { FeatureResultToasts } from '../components/FeatureResultToast'
import { MilestoneToastQueue } from '../components/MilestoneToast'
import { RightPanel } from '../components/RightPanel'
import { RunwayBanner } from '../components/RunwayBanner'
import { getV2State, reshowCoachCard, stepGame, useV2 } from './actions'
import { BottomNavV2, type V2Panel } from './BottomNavV2'
import { isMetricsUnlocked } from './chapter'
import { FamilyMoneyModal } from './FamilyMoneyModal'
import { FounderPanel } from './FounderPanel'
import { RoomView } from './RoomView'
import { useBackgroundMusic, useTypingLoop } from './audio'
import { Founder, LaptopGlow } from './scene/Founder'
import { founderPose } from './scene/founderPose'
import { saveGameV2 } from './saveV2'
import { isV2Game } from './state'
import { TopBarV2 } from './TopBarV2'
import '../App.css'

const AUTOSAVE_MS = 30_000

export function GameScreenV2() {
  const phase = useV2(s => s.phase)
  const gameSpeed = useV2(s => s.gameSpeed)
  const v2 = useV2(s => s.v2)
  const pendingMilestoneToasts = useV2(s => s.pendingMilestoneToasts)
  const dismissMilestoneToast = useV2(s => s.dismissMilestoneToast)
  const [panel, setPanel] = useState<V2Panel>('founder')

  useBackgroundMusic()
  useTypingLoop(founderPose(v2.founder.task).typing && phase === 'playing' && gameSpeed > 0)

  const metricsUnlocked = isMetricsUnlocked({ v2 })
  const { chapter } = v2
  const showFamilyMoney = chapter.beat === 5 && !!chapter.familyMoney && !chapter.familyMoney.claimed

  useEffect(() => {
    if (phase !== 'playing' || gameSpeed === 0) return
    const id = setInterval(stepGame, Math.floor(1000 / gameSpeed))
    return () => clearInterval(id)
  }, [phase, gameSpeed])

  useEffect(() => {
    if (phase !== 'playing') return
    const id = setInterval(() => {
      const s = getV2State()
      if (s.phase === 'playing' && isV2Game(s)) saveGameV2(1, s)
    }, AUTOSAVE_MS)
    return () => clearInterval(id)
  }, [phase])

  return (
    <div className="game-root">
      <TopBarV2 onShowTutorial={reshowCoachCard} />
      <div className="game-topbar-spacer" />
      <RunwayBanner />
      <div className="game-main">
        <div className="game-canvas-area">
          <RoomView><Founder /><LaptopGlow /></RoomView>
          <BottomNavV2 active={panel} metricsUnlocked={metricsUnlocked} onTabClick={setPanel} />
        </div>
        {panel === 'metrics' && metricsUnlocked ? <RightPanel activePanel="metrics" /> : <FounderPanel />}
      </div>
      <FeatureResultToasts />
      <MilestoneToastQueue toasts={pendingMilestoneToasts} onDismiss={dismissMilestoneToast} />
      {chapter.complete && <EventCard />}
      {showFamilyMoney && <FamilyMoneyModal />}
    </div>
  )
}
