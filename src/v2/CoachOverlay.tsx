import { useEffect, useState } from 'react'
import { dismissCoachCard, useV2 } from './actions'
import { CHAPTER2_GOAL_MRR, currentCard } from './chapter'
import { nextLocation } from './locations'
import { usePauseWhile } from './pause'
import './v2.css'

/** How long the goal banner stays open before it folds into the 🎯 chip. */
export const BANNER_MS = 5000

function useGoalText(): { key: string; node: JSX.Element } | null {
  const v2 = useV2(s => s.v2)
  const next = nextLocation({ v2 })
  if (v2.chapter.complete && !v2.chapter2.complete) {
    return { key: 'c2', node: <><strong>Chapter 2: build a team.</strong> Hire interns from Team and grow to ${CHAPTER2_GOAL_MRR.toLocaleString()} MRR.</> }
  }
  if (v2.chapter2.complete && !v2.chapter3.complete) {
    return { key: 'c3', node: <><strong>Chapter 3: a bigger space.</strong> Move up from the Map and grow to $5,000 MRR.</> }
  }
  if (v2.chapter3.complete && next) {
    return v2.unlockedLocations.includes(next.id)
      ? { key: `open-${next.id}`, node: <><strong>{next.icon} {next.name} is unlocked:</strong> move from the Map.</> }
      : { key: `next-${next.id}`, node: <><strong>Climb the ladder:</strong> next stop {next.icon} {next.name} at ${next.unlockMrr.toLocaleString()} MRR.</> }
  }
  if (v2.chapter3.complete) return { key: 'top', node: <><strong>🏙️ You made it:</strong> your own building.</> }
  return null
}

/** The current goal: open for a few seconds whenever it changes, then a 🎯 chip that reopens it. */
export function GoalBanner() {
  const goal = useGoalText()
  const [open, setOpen] = useState(true)
  const key = goal?.key
  useEffect(() => {
    if (!key) return
    setOpen(true)
    const id = setTimeout(() => setOpen(false), BANNER_MS)
    return () => clearTimeout(id)
  }, [key])
  if (!goal) return null
  return (
    <div className="v2-coach-overlay">
      {open
        ? <div className="v2-banner" onClick={() => setOpen(false)}>{goal.node}</div>
        : <button className="v2-goal-chip" onClick={() => setOpen(true)} title="Show your current goal">🎯 Goal</button>}
    </div>
  )
}

/** Tutorial and "do this" cards: a centred pop-up that pauses the game until dismissed. */
export function CoachPopup() {
  const state = useV2(s => s)
  const card = currentCard(state)
  usePauseWhile(!!card, 'coach')
  if (!card) return null
  return (
    <div className="v2-coach-backdrop">
      <div className="v2-coach v2-coach--popup" role="dialog" aria-label={card.title}>
        <div className="v2-coach-title">{card.title}</div>
        <p className="v2-coach-body">{card.body}</p>
        <button className="v2-btn" onClick={() => dismissCoachCard(card.id)} autoFocus>Got it</button>
      </div>
    </div>
  )
}
