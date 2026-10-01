import { useV2 } from '../actions'
import { characterUrl } from './assets'
import { Character } from './Character'
import { hirePose } from './founderPose'
import { useRoom } from './RoomContext'

/** One character per team member, at their seat. */
export function Hires() {
  const team = useV2(s => s.v2.team)
  const room = useRoom()
  return (
    <>
      {Object.values(team).map(m => {
        const spots = room.seats[m.seat]?.spots
        if (!spots) return null
        return (
          <Character
            key={m.id}
            url={characterUrl(m.characterModel)}
            spots={spots}
            pose={hirePose(m.task)}
            startSpot="seat"
            progress={m.task ? m.task.progress : null}
          />
        )
      })}
    </>
  )
}
