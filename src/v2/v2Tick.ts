import { tick } from '../engine/gameEngine'
import { checkChapter2Complete, checkChapter3Complete, onTaskCompleted, onTeamProgress } from './chapter'
import { filterPendingEvent } from './eventsV2'
import { updateUnlocks } from './locations'
import { advanceFounder } from './founder'
import type { Rng, V2GameState } from './state'
import { advanceTeam, syncPayroll } from './team'

/**
 * The v2 layer that runs after the legacy tick.
 * `hours` = game hours the legacy tick actually advanced (0 when it was paused).
 */
export function v2Tick(state: V2GameState, hours: number, rng: Rng = Math.random): V2GameState {
  if (state.phase !== 'playing') return state

  let s = state
  // Legacy events are sized for a funded company with staff. Keep them off
  // through the tutorial chapters and while the founder is still solo.
  // The legacy tick pauses on pendingEvent, so clear it here.
  const eventsAllowed = s.v2.chapter.complete && s.v2.chapter2.complete && s.employees.length > 0
  if (!eventsAllowed && s.pendingEvent) s = { ...s, pendingEvent: null }
  // Thin, gate and scale whatever the legacy tick picked (spec §8.5).
  s = filterPendingEvent(s, rng)
  if (s.pendingEvent) return syncPayroll(s)

  // Drop anyone a legacy event removed before they get another hour of work.
  s = syncPayroll(s)
  const { state: advanced, completed } = advanceFounder(s, hours, rng)
  s = completed ? onTaskCompleted(advanced, completed, rng) : advanced

  const team = advanceTeam(s, hours, rng)
  s = onTeamProgress(team.state, team)
  s = syncPayroll(s)
  s = checkChapter2Complete(s)
  s = updateUnlocks(s)
  return checkChapter3Complete(s)
}

/** One game hour: legacy simulation first, then the v2 layer. Preserves extra store keys. */
export function stepV2<T extends V2GameState>(state: T, rng: Rng = Math.random): T {
  const ticked = tick(state) as T
  const hours = ticked.gameTime.totalHours - state.gameTime.totalHours
  return v2Tick(ticked, hours, rng) as T
}
