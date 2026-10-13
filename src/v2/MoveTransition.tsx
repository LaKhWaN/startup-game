import { useEffect, useRef, useState } from 'react'
import { useV2 } from './actions'
import { locationDef } from './locations'
import { shouldShowMove } from './scene/reactions'
import type { LocationId } from './state'

const SHOW_MS = 1200

/** A short fade over the room whenever the company moves (spec §9.1). */
export function MoveTransition() {
  const location = useV2(s => s.v2.location)
  const prev = useRef<LocationId | null>(null)
  const [showing, setShowing] = useState<LocationId | null>(null)

  useEffect(() => {
    const show = shouldShowMove(prev.current, location)
    prev.current = location
    if (!show) return
    setShowing(location)
    const t = setTimeout(() => setShowing(null), SHOW_MS)
    return () => clearTimeout(t)
  }, [location])

  if (!showing) return null
  const def = locationDef(showing)
  return (
    <div className="v2-move" role="status">
      <div className="v2-move-card">
        <span className="v2-move-icon" aria-hidden="true">{def.icon}</span>
        Moving to {def.name}…
      </div>
    </div>
  )
}
