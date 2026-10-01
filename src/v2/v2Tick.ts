import { DAYS_PER_MONTH, HOURS_PER_DAY, hourOfDay, isWeekend, isWorkHour } from './engine/clock'
import { founderAwake, founderHour, peopleDay, peopleHour } from './engine/people'
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
export function v2Tick(state: V2GameState, hours: number, rng: Rng = Math.random, teamHours: number = hours): V2GameState {
  if (state.phase !== 'playing') return state

  let s = state
  // Events are sized for a company with staff. Keep them off through the
  // tutorial chapters and while the founder is still solo.
  const eventsAllowed = s.v2.chapter.complete && s.v2.chapter2.complete && Object.keys(s.v2.team).length > 0
  // Incidents come from the player's own tech debt, so they're never suppressed.
  if (!eventsAllowed && s.pendingEvent && s.pendingEvent.id !== 'incident' && s.pendingEvent.id !== 'outage') s = { ...s, pendingEvent: null }
  // Thin, gate and scale whatever the legacy tick picked (spec §8.5).
  s = filterPendingEvent(s, rng)
  if (s.pendingEvent) return s

  // The founder only works while awake (sleeps 23–07 unless working late).
  const founderHours = founderAwake(s.v2.founder, hourOfDay(s.gameTime.totalHours - 1 + 24)) ? hours : 0
  const { state: advanced, completed } = advanceFounder(s, founderHours, rng)
  s = completed ? onTaskCompleted(advanced, completed, rng) : advanced

  // Hires only work office hours (teamHours = 0 outside them); the founder works any time.
  const team = advanceTeam(s, teamHours, rng)
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
  // People: hires tire/learn during work hours; the founder tires working and recovers sleeping.
  s = founderHour(peopleHour(s, isWorkHour(prev)), hourOfDay(prev))
  if (day > Math.floor(prev / HOURS_PER_DAY)) s = peopleDay(processDay(s, day, rng), day, isWeekend(now))
  const month = Math.floor(day / DAYS_PER_MONTH)
  if (month > Math.floor(Math.floor(prev / HOURS_PER_DAY) / DAYS_PER_MONTH)) s = processMonth(s, month)
  if (s.phase !== 'playing') return s
  return v2Tick(s, 1, rng, isWorkHour(prev) ? 1 : 0) as T
}

/**
 * Fast-forward to 09:00 on the next work day, stopping early for an event, game
 * over, or `stopWhen` (another popup). `onDay` runs after every day boundary
 * crossed (analytics sends one snapshot per day).
 */
export function skipToMorning<T extends V2GameState>(
  state: T,
  rng: Rng = Math.random,
  stopWhen?: (s: T) => boolean,
  onDay?: (s: T) => void,
): T {
  if (state.pendingEvent || stopWhen?.(state)) return state
  let s = state
  for (let i = 0; i < 24 * 4 && s.phase === 'playing' && !isWorkHour(s.gameTime.totalHours); i++) {
    const day = Math.floor(s.gameTime.totalHours / HOURS_PER_DAY)
    s = stepV2(s, rng)
    if (Math.floor(s.gameTime.totalHours / HOURS_PER_DAY) > day) onDay?.(s)
    if (s.pendingEvent || stopWhen?.(s)) break
  }
  return s
}
