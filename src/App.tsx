import { useState, useEffect, useCallback } from 'react'
import { useGameStore } from './store/gameStore'
import { LandingPage } from './LandingPage'
import { Onboarding }  from './components/Onboarding'
import { PostMortem } from './components/PostMortem'
import { OfficeCanvas } from './office/OfficeCanvas'
import { TopBar }     from './components/TopBar'
import { BottomNav }  from './components/BottomNav'
import { RightPanel } from './components/RightPanel'
import { EventCard }  from './components/EventCard'
import { TutorialModal } from './components/TutorialModal'
import { MilestoneToastQueue } from './components/MilestoneToast'
import { RunwayBanner } from './components/RunwayBanner'
import { CampaignResultToasts } from './components/CampaignResultToast'
import { FeatureResultToasts } from './components/FeatureResultToast'
import { InvestorCheckin } from './components/InvestorCheckin'
import { saveGame } from './save/saveManager'
import type { NavPanel } from './components/BottomNav'
import './App.css'

function isLandingRoute(): boolean {
  const params = new URLSearchParams(window.location.search)
  return !params.has('play')
}

const TUTORIAL_KEY = 'startup-game-tutorial-completed'

function GameScreen() {
  const tick                   = useGameStore(s => s.tick)
  const phase                  = useGameStore(s => s.phase)
  const gameSpeed              = useGameStore(s => s.gameSpeed)
  const setSpeed               = useGameStore(s => s.setSpeed)
  const pendingMilestoneToasts = useGameStore(s => s.pendingMilestoneToasts)
  const dismissMilestoneToast  = useGameStore(s => s.dismissMilestoneToast)

  const [activePanel, setActivePanel]     = useState<NavPanel>('team')
  const [showTutorial, setShowTutorial]   = useState(false)
  const [sceneReady, setSceneReady]       = useState(false)
  const [fadeOut, setFadeOut]             = useState(false)

  // Show tutorial only on first visit (not if already completed)
  useEffect(() => {
    if (phase === 'playing' && sceneReady && !localStorage.getItem(TUTORIAL_KEY)) {
      setShowTutorial(true)
      setSpeed(0)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, sceneReady])

  function handleTutorialClose() {
    localStorage.setItem(TUTORIAL_KEY, '1')
    setShowTutorial(false)
    setSpeed(1)
  }

  function handleShowTutorial() {
    setShowTutorial(true)
    setSpeed(0)
  }

  function handleSceneReady() {
    setFadeOut(true)
    setTimeout(() => setSceneReady(true), 500)
  }

  useEffect(() => {
    if (phase !== 'playing' || gameSpeed === 0) return
    const ms = Math.floor(1000 / gameSpeed)
    const id = setInterval(tick, ms)
    return () => clearInterval(id)
  }, [phase, tick, gameSpeed])

  const autoSave = useCallback(() => {
    const state = useGameStore.getState()
    if (state.phase === 'playing') {
      saveGame(1, state)
    }
  }, [])

  useEffect(() => {
    if (phase !== 'playing') return
    const id = setInterval(autoSave, 30_000)
    return () => clearInterval(id)
  }, [phase, autoSave])

  function handleTabClick(tab: NavPanel) {
    setActivePanel(tab)
  }

  return (
    <div className="game-root">
      <TopBar onShowTutorial={handleShowTutorial} />
      <div className="game-topbar-spacer" />
      <RunwayBanner />
      <div className="game-main">
        <div className="game-canvas-area">
          <OfficeCanvas onReady={handleSceneReady} />
          <BottomNav active={activePanel} onTabClick={handleTabClick} />
        </div>
        <RightPanel activePanel={activePanel} />
      </div>
      <EventCard />
      <CampaignResultToasts />
      <FeatureResultToasts />
      {showTutorial && <TutorialModal onClose={handleTutorialClose} />}
      <MilestoneToastQueue toasts={pendingMilestoneToasts} onDismiss={dismissMilestoneToast} />

      {!sceneReady && (
        <div className={`game-loader${fadeOut ? ' game-loader--fade' : ''}`}>
          <div className="gl-content">
            <div className="gl-dots">
              <span /><span /><span />
            </div>
            <p className="gl-text">Loading office...</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const phase = useGameStore(s => s.phase)
  const [showLanding, setShowLanding] = useState(isLandingRoute)

  if (showLanding) return <LandingPage onPlay={() => setShowLanding(false)} />
  if (phase === 'setup')                   return <Onboarding />
  if (phase === 'sold' || phase === 'lost') return <><PostMortem /><InvestorCheckin /></>
  return <><GameScreen /><InvestorCheckin /></>
}
