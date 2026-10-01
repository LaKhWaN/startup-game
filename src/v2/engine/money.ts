import type { GameV2 } from './types'
import { infraServicesCost } from './infra'

export const PAYMENT_FEE = 0.03
export const TOOLS_PER_CUSTOMER = 1

type BurnInput = Pick<GameV2, 'infraCostMonthly' | 'v2'> & { mrr?: number; customers?: number }

/** Costs that grow with the business: payment fees on revenue + tools per customer (spec §4). */
export function variableCosts(state: BurnInput): number {
  return Math.round((state.mrr ?? 0) * PAYMENT_FEE + (state.customers ?? 0) * TOOLS_PER_CUSTOMER)
}

/** Rent/infra + every hire's salary + variable costs, per month. */
export function monthlyBurn(state: BurnInput): number {
  return state.infraCostMonthly + Object.values(state.v2.team).reduce((sum, m) => sum + m.salary, 0) + variableCosts(state) + infraServicesCost(state)
}

/** Months of cash left at the current net burn; 999 when profitable. */
export function runwayMonths(state: BurnInput & Pick<GameV2, 'cash' | 'mrr'>): number {
  const net = monthlyBurn(state) - state.mrr
  return net <= 0 ? 999 : Math.floor(state.cash / net)
}

/** ARR × multiple + cash. The multiple rewards brand/product, punishes tech debt. */
export function valuation(state: Pick<GameV2, 'mrr' | 'cash' | 'brand' | 'productProgress' | 'techDebt' | 'v2'>): number {
  let multiple = 3 + state.brand / 100 + (state.productProgress / 100) * 0.5 - (state.techDebt / 100) * 1.5
  if (Object.keys(state.v2.team).length === 0) multiple -= 1
  return Math.round(state.mrr * 12 * Math.max(1, multiple) + state.cash)
}
