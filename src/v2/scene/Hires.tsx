import { useEffect, useRef, useState } from 'react'
import { useV2 } from '../actions'
import type { TeamMember } from '../state'
import { characterUrl } from './assets'
import { Character } from './Character'
import { hirePose } from './founderPose'
import { MISTAKE_FLASH_MS, reactionIcon } from './reactions'
import { useRoom } from './RoomContext'
import type { HireSpots } from './layout'

function Hire({ m, spots }: { m: TeamMember; spots: HireSpots }) {
  const pose = hirePose(m.task)
  // Grimace for a moment whenever their mistake count goes up.
  const seen = useRef(m.mistakes)
  const [mistakeAt, setMistakeAt] = useState<number | null>(null)
  useEffect(() => {
    if (m.mistakes <= seen.current) { seen.current = m.mistakes; return }
    seen.current = m.mistakes
    setMistakeAt(Date.now())
    const t = setTimeout(() => setMistakeAt(null), MISTAKE_FLASH_MS)
    return () => clearTimeout(t)
  }, [m.mistakes])
  const icon = reactionIcon({ idle: !m.task, taskIcon: pose.icon, mistakeAt, now: Date.now() })
  return (
    <Character
      url={characterUrl(m.characterModel)}
      spots={spots}
      pose={{ ...pose, icon }}
      startSpot="seat"
      progress={m.task ? m.task.progress : null}
    />
  )
}

/** One character per team member, at their seat. */
export function Hires() {
  const team = useV2(s => s.v2.team)
  const room = useRoom()
  return (
    <>
      {Object.values(team).map(m => {
        const spots = room.seats[m.seat]?.spots
        return spots ? <Hire key={m.id} m={m} spots={spots} /> : null
      })}
    </>
  )
}
