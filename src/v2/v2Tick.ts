import { tick } from '../engine/gameEngine'
import { onTaskCompleted } from './chapter'
import { advanceFounder } from './founder'
import type { Rng, V2GameState } from './state'

/**
 * The v2 layer that runs after the legacy tick.
 * `hours` = game hours the legacy tick actually advanced (0 when it was paused).
 */
export function v2Tick(state: V2GameState, hours: number, rng: Rng = Math.random): V2GameState {
  if (state.phase !== 'playing') return state

  let s = state
  // No crises during the tutorial. The legacy tick pauses on pendingEvent, so clear it here.
  if (!s.v2.chapter.complete && s.pendingEvent) s = { ...s, pendingEvent: null }
  if (s.pendingEvent) return s

  const { state: advanced, completed } = advanceFounder(s, hours, rng)
  return completed ? onTaskCompleted(advanced, completed, rng) : advanced
}

/** One game hour: legacy simulation first, then the v2 layer. Preserves extra store keys. */
export function stepV2<T extends V2GameState>(state: T, rng: Rng = Math.random): T {
  const ticked = tick(state) as T
  const hours = ticked.gameTime.totalHours - state.gameTime.totalHours
  return v2Tick(ticked, hours, rng) as T
}
