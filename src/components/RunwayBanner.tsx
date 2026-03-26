import { useState, useEffect, useRef } from 'react'
import { useGameStore } from '../store/gameStore'
import { getRunwayMonths } from '../engine/gameEngine'
import './RunwayBanner.css'

const LS_KEY = 'startup-runway-dismissed'

export function RunwayBanner() {
  const state   = useGameStore(s => s)
  const runway  = getRunwayMonths(state)

  const [dismissed, setDismissed] = useState<number | null>(() => {
    const stored = sessionStorage.getItem(LS_KEY)
    return stored ? Number(stored) : null
  })

  const prevRunway = useRef(runway)

  useEffect(() => {
    if (runway < prevRunway.current && runway <= 3) {
      setDismissed(null)
      sessionStorage.removeItem(LS_KEY)
    }
    prevRunway.current = runway
  }, [runway])

  if (runway > 3) return null
  if (dismissed !== null && dismissed <= runway) return null

  function handleDismiss() {
    setDismissed(runway)
    sessionStorage.setItem(LS_KEY, String(runway))
  }

  let level: 'warn' | 'danger' | 'critical'
  let icon: string
  let message: string

  if (runway >= 3) {
    level = 'warn'
    icon = '⚠️'
    message = '3 months of runway left'
  } else if (runway >= 2) {
    level = 'danger'
    icon = '🔥'
    message = '2 months of runway left. Pick up the pace.'
  } else {
    level = 'critical'
    icon = '💀'
    message = '1 month of runway. Emergency mode.'
  }

  return (
    <div className={`runway-banner rb-${level}`}>
      <span className="rb-text">{icon} {message}</span>
      <button className="rb-dismiss" onClick={handleDismiss} title="Dismiss">×</button>
    </div>
  )
}
