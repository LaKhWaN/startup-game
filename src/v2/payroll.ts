import type { TeamMember, V2GameState } from './state'

/** Yearly raise steps the founder can pick in Employees. */
export const RAISE_OPTIONS = [0, 3, 5, 8, 10, 15] as const
export const DEFAULT_RAISE = 5
/** What people expect each year; less hurts morale, more lifts it. */
export const EXPECTED_RAISE = 8
/** A work anniversary comes every 360 game days. */
export const REVIEW_DAYS = 360

export function raisePct(s: Pick<V2GameState, 'v2'>): number {
  return s.v2.raisePct ?? DEFAULT_RAISE
}

export function setRaisePct<T extends Pick<V2GameState, 'v2'>>(s: T, pct: number): T {
  if (!(RAISE_OPTIONS as readonly number[]).includes(pct)) return s
  return { ...s, v2: { ...s.v2, raisePct: pct } }
}

/** Morale points from the last raise: ±2 per point away from the 8% people expect, clamped to ±16. */
export function payMoodFor(pct: number): number {
  return Math.max(-16, Math.min(16, (pct - EXPECTED_RAISE) * 2))
}

export function isReviewDay(m: Pick<TeamMember, 'hiredAtDay'>, day: number): boolean {
  const since = day - (m.hiredAtDay ?? 0)
  return since > 0 && since % REVIEW_DAYS === 0
}

export function nextReviewDay(m: Pick<TeamMember, 'hiredAtDay'>, day: number): number {
  const hired = m.hiredAtDay ?? 0
  return hired + (Math.floor(Math.max(0, day - hired) / REVIEW_DAYS) + 1) * REVIEW_DAYS
}

/** The yearly review: salary up by the policy, pay mood set from how it compares to expectations. */
export function applyReview(m: TeamMember, pct: number): TeamMember {
  return { ...m, salary: Math.round(m.salary * (1 + pct / 100)), payMood: payMoodFor(pct) }
}
