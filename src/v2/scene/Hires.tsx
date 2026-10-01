import { useEffect, useMemo, useRef, useState } from 'react'
import { useV2 } from '../actions'
import type { TeamMember } from '../state'
import { characterUrl } from './assets'
import { Character } from './Character'
import { hirePose } from './founderPose'
import { MISTAKE_FLASH_MS, reactionIcon } from './reactions'
import { useRoom } from './RoomContext'
import { statusText } from './hoverText'
import { ROLE_INFO } from '../MemberCard'
import type { HireSpots, Spot } from './layout'
import { isWorkHour } from '../engine/clock'

const GOING_HOME = { spot: 'door' as const, clip: 'walk' as const, typing: false, pace: false, icon: null }

function Hire({ m, spots, door, offHours, onSelect, featureTitle }: {
  m: TeamMember; spots: HireSpots; door: Spot; offHours: boolean; onSelect?: (id: string) => void; featureTitle?: string
}) {
  const pose = offHours ? GOING_HOME : hirePose(m.task)
  const allSpots = useMemo(() => ({ ...spots, door }), [spots, door])
  // Mounted after hours (load, back from the city): start at the door, out of sight.
  const [startSpot] = useState<'seat' | 'door'>(offHours ? 'door' : 'seat')
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
  const icon = reactionIcon({ idle: m.assignment === 'idle', taskIcon: pose.icon, mistakeAt, now: Date.now(), stress: m.stress, energy: m.energy })
  return (
    <Character
      url={characterUrl(m.characterModel)}
      spots={allSpots}
      pose={{ ...pose, icon: offHours ? null : icon }}
      startSpot={startSpot}
      hideAt="door"
      progress={m.task ? m.task.progress : null}
      onSelect={onSelect ? () => onSelect(m.id) : undefined}
      hoverCard={{
        title: m.name,
        subtitle: `${ROLE_INFO[m.role].label} · ${m.tier === 'fulltime' ? 'Full-time' : 'Intern'} · ⚡${Math.round(m.energy ?? 100)} 😰${Math.round(m.stress ?? 10)}${m.leavingOn !== undefined ? ' · leaving' : ''}`,
        status: statusText(m, featureTitle),
      }}
    />
  )
}

/** One character per team member, at their seat. */
export function Hires({ onSelect }: { onSelect?: (id: string) => void }) {
  const team = useV2(s => s.v2.team)
  const features = useV2(s => s.features)
  const offHours = useV2(s => !isWorkHour(s.gameTime.totalHours))
  const room = useRoom()
  return (
    <>
      {Object.values(team).map(m => {
        const spots = room.seats[m.seat]?.spots
        const featureTitle = m.task?.type === 'develop' ? features.find(f => f.id === m.task?.featureId)?.title : undefined
        return spots ? <Hire key={m.id} m={m} spots={spots} door={room.door} offHours={offHours} onSelect={onSelect} featureTitle={featureTitle} /> : null
      })}
    </>
  )
}
