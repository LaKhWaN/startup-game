import type { GameV2 } from './types'

export interface ChurnBreakdown {
  /** The idea tier's floor. */
  floor: number
  /** Tech debt → bugs. */
  bugs: number
  /** Unanswered support tickets. */
  support: number
  /** Not enough product yet. */
  thin: number
  /** Recent events, fading. */
  shock: number
  total: number
}

/** Monthly churn %, from how healthy the product is (spec §4). */
export function churnBreakdown(s: Pick<GameV2, 'difficultyModifier' | 'techDebt' | 'productProgress' | 'customers' | 'churnShock' | 'v2'>): ChurnBreakdown {
  const floor = s.difficultyModifier?.churnFloor ?? 5
  const bugs = (s.techDebt / 100) * 6
  const support = Math.min(8, ((s.v2.tickets ?? 0) / Math.max(1, s.customers)) * 40)
  const thin = s.productProgress < 30 ? ((30 - s.productProgress) / 30) * 4 : 0
  const shock = Math.max(0, s.churnShock ?? 0)
  return { floor, bugs, support, thin, shock, total: floor + bugs + support + thin + shock }
}

export const SHOCK_FADE_PER_DAY = 0.15
