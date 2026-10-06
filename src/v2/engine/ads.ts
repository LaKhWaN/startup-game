import type { GameV2 } from './types'
import { marketCeiling } from './market'

/** Monthly ad budgets on offer (Desktop → Ads). */
export const AD_BUDGETS = [0, 2_000, 5_000, 10_000, 25_000, 50_000, 100_000] as const
/** Cost of one lead in an empty market; it climbs as you take market share. */
export const BASE_COST_PER_LEAD = 40

type S = Pick<GameV2, 'v2'>

export const adsBudget = (s: S) => s.v2.adsBudget ?? 0

export function setAdsBudget<T extends S>(s: T, budget: number): T {
  if (!(AD_BUDGETS as readonly number[]).includes(budget)) return s
  return { ...s, v2: { ...s.v2, adsBudget: budget } }
}

/** $ per lead: ×1 in an empty market, ×5 once you own it all. */
export function costPerLead(s: Pick<GameV2, 'difficultyModifier' | 'features' | 'brand' | 'customers'>): number {
  const share = Math.min(1, s.customers / Math.max(1, marketCeiling(s)))
  return Math.round(BASE_COST_PER_LEAD * (1 + 4 * share * share))
}

/** Expected leads a day from the ad budget. */
export function adLeadsPerDay(s: S & Pick<GameV2, 'difficultyModifier' | 'features' | 'brand' | 'customers'>): number {
  return adsBudget(s) / 30 / costPerLead(s)
}
