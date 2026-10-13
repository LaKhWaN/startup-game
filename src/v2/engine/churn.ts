import type { GameV2 } from './types'
import { totalDays } from './clock'
import { slowAppChurn } from './infra'
import { marketCeiling } from './market'

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
  /** Competitors poach customers once you hold a big share of the market. */
  competition: number
  /** No feature shipped for weeks. */
  stale: number
  /** Recent events, fading (negative after good news). */
  shock: number
  /** Retention features (lasting), as applied: never more than half the extras. */
  relief: number
  /** Customers won in the last month churn twice as fast. */
  fresh: number
  total: number
}

type ChurnInput = Pick<GameV2, 'difficultyModifier' | 'techDebt' | 'productProgress' | 'customers' | 'churnShock' | 'v2' | 'features' | 'brand' | 'gameTime'> & { churnRelief?: number }

/** Share of the market above which competitors start poaching, and the churn at full share. */
export const COMPETITION_START = 0.4
export const COMPETITION_MAX = 8

/** +0% at 40% market share, rising to +8% at full share. */
export function competitionChurn(s: Pick<GameV2, 'difficultyModifier' | 'features' | 'brand' | 'customers'>): number {
  const share = Math.min(1, s.customers / Math.max(1, marketCeiling(s)))
  return share <= COMPETITION_START ? 0 : ((share - COMPETITION_START) / (1 - COMPETITION_START)) * COMPETITION_MAX
}

export const STALE_AFTER_DAYS = 30
export const STALE_PER_WEEK = 0.5
export const STALE_MAX = 3

/** After the first chapter: +0.5% per week past 30 days without shipping, at most +3%. */
export function staleChurn(s: Pick<GameV2, 'features' | 'gameTime' | 'v2'>): number {
  if (!s.v2.chapter.complete) return 0
  const lastShip = s.features.reduce((d, f) => (f.status === 'completed' ? Math.max(d, f.completedAtDay ?? 0) : d), 0)
  const idle = totalDays(s.gameTime) - lastShip - STALE_AFTER_DAYS
  return idle <= 0 ? 0 : Math.min(STALE_MAX, (idle / 7) * STALE_PER_WEEK)
}

/** Monthly churn %, from how healthy the product is (spec §4). */
export function churnBreakdown(s: ChurnInput): ChurnBreakdown {
  const floor = s.difficultyModifier?.churnFloor ?? 5
  const bugs = (s.techDebt / 100) * 6
  // A floor of 20 customers so a single ticket doesn't spike a tiny company's churn.
  const support = Math.min(8, ((s.v2.tickets ?? 0) / Math.max(20, s.customers)) * 40)
  const thin = s.productProgress < 30 ? ((30 - s.productProgress) / 30) * 4 : 0
  const shock = s.churnShock ?? 0
  const slow = slowAppChurn(s)
  const competition = competitionChurn(s)
  const stale = staleChurn(s)
  const extras = bugs + support + thin + slow + competition + stale + shock
  // Retention features soften the problems, never hide more than half of them.
  const relief = Math.min(Math.max(0, s.churnRelief ?? 0), Math.max(0, extras) * 0.5)
  const base = Math.max(floor, floor + extras - relief)
  const freshShare = s.customers > 0 ? Math.min(1, (s.v2.freshCustomers ?? 0) / s.customers) : 0
  const fresh = base * freshShare
  return { floor, bugs, support, thin, slow, competition, stale, shock, relief, fresh, total: base + fresh }
}

export const SHOCK_FADE_PER_DAY = 0.15
/** Most churn that retention features can take off in total. */
export const MAX_CHURN_RELIEF = 6

/** Shocks fade toward zero from either side. */
export function fadeShock(shock: number): number {
  return shock > 0 ? Math.max(0, shock - SHOCK_FADE_PER_DAY) : Math.min(0, shock + SHOCK_FADE_PER_DAY)
}
