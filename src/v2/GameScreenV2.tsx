import { useEffect } from 'react'
import { EventCard } from '../components/EventCard'
import { FeatureResultToasts } from '../components/FeatureResultToast'
import { MilestoneToastQueue } from '../components/MilestoneToast'
import { RightPanel } from '../components/RightPanel'
import { RunwayBanner } from '../components/RunwayBanner'
import { getV2State, reshowCoachCard, stepGame, useV2 } from './actions'
import { BottomNavV2, type V2Panel } from './BottomNavV2'
import { isMapUnlocked, isMetricsUnlocked, isTeamUnlocked } from './chapter'
import { MoveTransition } from './MoveTransition'
import { TeamPanel } from './TeamPanel'
import { FamilyMoneyModal } from './FamilyMoneyModal'
import { FounderPanel } from './FounderPanel'
import { CoachOverlay } from './CoachOverlay'
import { FounderBar } from './FounderBar'
import { PersonCard } from './PersonCard'
import { StatsRail } from './StatsRail'
import { Modal } from './Modal'
import { closeModal, openModal, showCity, showOffice, useUi, type Modal as ModalState } from './ui'
import { CityOverlay } from './CityOverlay'
import { RoomView } from './RoomView'
import { useBackgroundMusic, useTypingLoop } from './audio'
import { Founder, LaptopGlow } from './scene/Founder'
import { Hires } from './scene/Hires'
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
  const modal = useUi(s => s.modal)
  const view = useUi(s => s.view)
  const onTab = (p: V2Panel) => {
    if (p === 'map') { if (view === 'city') showOffice(); else showCity(); return }
    openModal({ kind: p } as ModalState)
  }
  const active: V2Panel | null = view === 'city' ? 'map' : modal && modal.kind !== 'person' ? modal.kind : null

  useBackgroundMusic()
  useTypingLoop(founderPose(v2.founder.task).typing && phase === 'playing' && gameSpeed > 0)

  const metricsUnlocked = isMetricsUnlocked({ v2 })
  const teamUnlocked = isTeamUnlocked({ v2 })
  const mapUnlocked = isMapUnlocked({ v2 })
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
    <div className="game-root v2-game">
      <TopBarV2 onShowTutorial={reshowCoachCard} />
      <div className="game-topbar-spacer" />
      <RunwayBanner />
      <div className="game-main">
        <div className="game-canvas-area">
          <RoomView>
            <Founder onSelect={() => openModal({ kind: 'founder' })} />
            <Hires onSelect={id => openModal({ kind: 'person', id })} />
            <LaptopGlow />
          </RoomView>
          {view === 'office' && <CoachOverlay />}
          {view === 'office' && <FounderBar />}
          <CityOverlay />
          <MoveTransition />
          <BottomNavV2 active={active} metricsUnlocked={metricsUnlocked} teamUnlocked={teamUnlocked} mapUnlocked={mapUnlocked} onTabClick={onTab} />
        </div>
        <StatsRail />
      </div>
      <ScreenModal modal={modal} />
      <FeatureResultToasts />
      <MilestoneToastQueue toasts={pendingMilestoneToasts} onDismiss={dismissMilestoneToast} />
      {chapter.complete && v2.chapter2.complete && <EventCard />}
      {showFamilyMoney && <FamilyMoneyModal />}
    </div>
  )
}

/** Whatever modal the UI store says is open. */
function ScreenModal({ modal }: { modal: ModalState | null }) {
  const team = useV2(s => s.v2.team)
  if (!modal) return null
  switch (modal.kind) {
    case 'founder': return <Modal title="Founder" onClose={closeModal}><FounderPanel /></Modal>
    case 'team': return <Modal title="Team" onClose={closeModal}><TeamPanel /></Modal>
    case 'metrics': return <Modal title="Metrics" onClose={closeModal} wide><RightPanel activePanel="metrics" /></Modal>
    case 'person': {
      const m = team[modal.id]
      // They left (fired, quit): nothing to show.
      if (!m) return null
      return <Modal title="Team member" onClose={closeModal} wide><PersonCard m={m} /></Modal>
    }
  }
}
