import { useEffect } from 'react'
import { gameStore, type GameSpeed } from './store'
import { uiStore } from './ui'

/** Speed to restore when the last game-raised popup closes. */
let saved: GameSpeed | null = null

/** A game-raised popup opened: pause (remembering the speed) until every popup is released. */
export function holdPause(id: string): void {
  const holds = uiStore.getState().pauseHolds
  if (holds.includes(id)) return
  if (holds.length === 0) {
    const speed = gameStore.getState().gameSpeed
    saved = speed === 0 ? 1 : speed
    gameStore.setState({ gameSpeed: 0 })
  }
  uiStore.setState({ pauseHolds: [...holds, id] })
}

export function releasePause(id: string): void {
  const holds = uiStore.getState().pauseHolds
  if (!holds.includes(id)) return
  const rest = holds.filter(h => h !== id)
  uiStore.setState({ pauseHolds: rest })
  if (rest.length === 0) {
    gameStore.setState({ gameSpeed: saved ?? 1 })
    saved = null
  }
}

/** Pause the game while `active` (event card, family money, check-in…). */
export function usePauseWhile(active: boolean, id: string): void {
  useEffect(() => {
    if (!active) return
    holdPause(id)
    return () => releasePause(id)
  }, [active, id])
}
