import { useProgress } from '@react-three/drei'
import { useV2 } from './actions'
import type { FounderTaskType } from './state'
import './v2.css'

const STATUS: Record<FounderTaskType, string> = {
  research: 'Researching your market…',
  develop: 'Building…', // replaced with the feature title below
  emails: 'Writing cold emails…',
  sales: 'On sales calls…',
}

const R = 34
const CIRC = 2 * Math.PI * R

/** Phase 1 stand-in for the 2.5D room. Phase 2 replaces it with the R3F canvas. */
export function PlaceholderRoom() {
  const task = useV2(s => s.v2.founder.task)
  const features = useV2(s => s.features)
  const startupName = useV2(s => s.startupName)

  let status = 'Taking a breather'
  if (task) {
    const title = task.type === 'develop' ? features.find(f => f.id === task.featureId)?.title : undefined
    status = task.type === 'develop' ? `Building ${title ?? 'a feature'}…` : STATUS[task.type]
  }
  const pct = task ? task.progress : 0
  const { active, progress } = useProgress()

  return (
    <div className="v2-room">
      <div className="v2-room-card">
        <div className="v2-room-label">🏠 Home</div>
        {active && <div className="v2-room-loading">Setting up your room… {Math.round(progress)}%</div>}
        <div className="v2-room-avatar-wrap">
          <svg className="v2-ring" viewBox="0 0 80 80" width="80" height="80" aria-hidden="true">
            <circle cx="40" cy="40" r={R} className="v2-ring-track" />
            <circle
              cx="40" cy="40" r={R}
              className="v2-ring-fill"
              strokeDasharray={CIRC}
              strokeDashoffset={CIRC * (1 - pct)}
              transform="rotate(-90 40 40)"
            />
          </svg>
          <div className="v2-room-avatar" aria-hidden="true">🧑‍💻</div>
        </div>
        <div className="v2-room-status" role="status">{status}</div>
        <div className="v2-room-sub">{startupName}</div>
      </div>
    </div>
  )
}
