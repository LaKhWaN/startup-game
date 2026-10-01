import { useV2 } from '../actions'
import { characterUrl } from './assets'
import { Character } from './Character'
import { hirePose } from './founderPose'
import { HIRE_SPOTS } from './layout'

/** One character per team member, at their seat. */
export function Hires() {
  const team = useV2(s => s.v2.team)
  return (
    <>
      {Object.values(team).map(m => {
        const spots = HIRE_SPOTS[m.seat]
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
