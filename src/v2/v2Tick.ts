import { HOURS_PER_DAY, DAYS_PER_MONTH } from './engine/clock'
import { processDay, processMonth } from './engine/day'
import { checkChapter2Complete, checkChapter3Complete, onTaskCompleted, onTeamProgress } from './chapter'
import { filterPendingEvent } from './eventsV2'
import { updateUnlocks } from './locations'
import { advanceFounder } from './founder'
import type { Rng, V2GameState } from './state'
import { advanceTeam } from './team'

/**
 * The v2 layer for one step: events gating, founder, team, chapters, unlocks.
 * `hours` = game hours that just passed (0 when paused).
 */
export function v2Tick(state: V2GameState, hours: number, rng: Rng = Math.random): V2GameState {
  if (state.phase !== 'playing') return state

  let s = state
  // Events are sized for a company with staff. Keep them off through the
  // tutorial chapters and while the founder is still solo.
  const eventsAllowed = s.v2.chapter.complete && s.v2.chapter2.complete && Object.keys(s.v2.team).length > 0
  if (!eventsAllowed && s.pendingEvent) s = { ...s, pendingEvent: null }
  // Thin, gate and scale whatever the legacy tick picked (spec §8.5).
  s = filterPendingEvent(s, rng)
  if (s.pendingEvent) return s

  const { state: advanced, completed } = advanceFounder(s, hours, rng)
  s = completed ? onTaskCompleted(advanced, completed, rng) : advanced

  const team = advanceTeam(s, hours, rng)
  s = onTeamProgress(team.state, team)
  s = checkChapter2Complete(s)
  s = updateUnlocks(s)
  return checkChapter3Complete(s)
}

/** One game hour: clock, daily/monthly company processing, then the v2 layer. Preserves extra store keys. */
export function stepV2<T extends V2GameState>(state: T, rng: Rng = Math.random): T {
  if (state.phase !== 'playing') return state
  // A pending event pauses time (after the v2 layer has had its say on it).
  if (state.pendingEvent) return v2Tick(state, 0, rng) as T
  const prev = state.gameTime.totalHours
  const now = prev + 1
  let s: T = { ...state, gameTime: { totalHours: now } }
  const day = Math.floor(now / HOURS_PER_DAY)
  if (day > Math.floor(prev / HOURS_PER_DAY)) s = processDay(s, day, rng)
  const month = Math.floor(day / DAYS_PER_MONTH)
  if (month > Math.floor(Math.floor(prev / HOURS_PER_DAY) / DAYS_PER_MONTH)) s = processMonth(s, month)
  if (s.phase !== 'playing') return s
  return v2Tick(s, 1, rng) as T
}
