import type { GameV2 } from './types'

/** Rent/infra plus every hire's salary, per month. */
export function monthlyBurn(state: Pick<GameV2, 'infraCostMonthly' | 'v2'>): number {
  return state.infraCostMonthly + Object.values(state.v2.team).reduce((sum, m) => sum + m.salary, 0)
}

/** Months of cash left at the current net burn; 999 when profitable. */
export function runwayMonths(state: Pick<GameV2, 'infraCostMonthly' | 'v2' | 'cash' | 'mrr'>): number {
  const net = monthlyBurn(state) - state.mrr
  return net <= 0 ? 999 : Math.floor(state.cash / net)
}

/** ARR × multiple + cash. The multiple rewards brand/product, punishes tech debt. */
export function valuation(state: Pick<GameV2, 'mrr' | 'cash' | 'brand' | 'productProgress' | 'techDebt' | 'v2'>): number {
  let multiple = 3 + state.brand / 100 + (state.productProgress / 100) * 0.5 - (state.techDebt / 100) * 1.5
  if (Object.keys(state.v2.team).length === 0) multiple -= 1
  return Math.round(state.mrr * 12 * Math.max(1, multiple) + state.cash)
}
