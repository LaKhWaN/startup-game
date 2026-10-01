import type { GameV2 } from './types'
import { slowAppChurn } from './infra'

export interface ChurnBreakdown {
  /** The idea tier's floor. */
  floor: number
  /** Tech debt → bugs. */
  bugs: number
  /** Unanswered support tickets. */
  support: number
  /** Not enough product yet. */
  thin: number
  /** Hosting above 90% load. */
  slow: number
  /** Recent events, fading (negative after good news). */
  shock: number
  /** Retention features (lasting). */
  relief: number
  total: number
}

/** Monthly churn %, from how healthy the product is (spec §4). */
export function churnBreakdown(s: Pick<GameV2, 'difficultyModifier' | 'techDebt' | 'productProgress' | 'customers' | 'churnShock' | 'v2'> & { churnRelief?: number }): ChurnBreakdown {
  const floor = s.difficultyModifier?.churnFloor ?? 5
  const bugs = (s.techDebt / 100) * 6
  // A floor of 20 customers so a single ticket doesn't spike a tiny company's churn.
  const support = Math.min(8, ((s.v2.tickets ?? 0) / Math.max(20, s.customers)) * 40)
  const thin = s.productProgress < 30 ? ((30 - s.productProgress) / 30) * 4 : 0
  const shock = s.churnShock ?? 0
  const slow = slowAppChurn(s)
  const relief = Math.max(0, s.churnRelief ?? 0)
  // Good news and retention features can cancel the extras, never go below the idea's floor.
  return { floor, bugs, support, thin, slow, shock, relief, total: Math.max(floor, floor + bugs + support + thin + slow + shock - relief) }
}

export const SHOCK_FADE_PER_DAY = 0.15
/** Most churn that retention features can take off in total. */
export const MAX_CHURN_RELIEF = 6

/** Shocks fade toward zero from either side. */
export function fadeShock(shock: number): number {
  return shock > 0 ? Math.max(0, shock - SHOCK_FADE_PER_DAY) : Math.min(0, shock + SHOCK_FADE_PER_DAY)
}
