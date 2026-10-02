import { dismissCoachCard, useV2 } from './actions'
import { CHAPTER2_GOAL_MRR, currentCard } from './chapter'
import { nextLocation } from './locations'
import './v2.css'

/** Chapter banner + the current coach card, floating in the room's top-left corner. */
export function CoachOverlay() {
  const v2 = useV2(s => s.v2)
  const state = useV2(s => s)
  const card = currentCard(state)
  const next = nextLocation({ v2 })

  let banner: JSX.Element | null = null
  if (v2.chapter.complete && !v2.chapter2.complete) {
    banner = <><strong>Chapter 2: build a team.</strong> Hire interns from Team and grow to ${CHAPTER2_GOAL_MRR.toLocaleString()} MRR.</>
  } else if (v2.chapter2.complete && !v2.chapter3.complete) {
    banner = <><strong>Chapter 3: a bigger space.</strong> Move up from the Map and grow to $5,000 MRR.</>
  } else if (v2.chapter3.complete && next) {
    banner = v2.unlockedLocations.includes(next.id)
      ? <><strong>{next.icon} {next.name} is unlocked:</strong> move from the Map.</>
      : <><strong>Climb the ladder:</strong> next stop {next.icon} {next.name} at ${next.unlockMrr.toLocaleString()} MRR.</>
  } else if (v2.chapter3.complete) {
    banner = <><strong>🏙️ You made it:</strong> your own building.</>
  }

  if (!banner && !card) return null
  return (
    <div className="v2-coach-overlay">
      {banner && <div className="v2-banner">{banner}</div>}
      {card && (
        <div className="v2-coach">
          <div className="v2-coach-title">{card.title}</div>
          <p className="v2-coach-body">{card.body}</p>
          <button className="v2-btn v2-btn-ghost" onClick={() => dismissCoachCard(card.id)}>Got it</button>
        </div>
      )}
    </div>
  )
}
