import type { GameV2 } from './types'
import { infraServicesCost } from './infra'

export const PAYMENT_FEE = 0.03
export const TOOLS_PER_CUSTOMER = 4

type BurnInput = Pick<GameV2, 'infraCostMonthly' | 'v2'> & { mrr?: number; customers?: number }

/** Costs that grow with the business: payment fees on revenue + tools per customer (spec §4). */
export function variableCosts(state: BurnInput): number {
  return Math.round((state.mrr ?? 0) * PAYMENT_FEE + (state.customers ?? 0) * TOOLS_PER_CUSTOMER)
}

/** Management and HR per person: free up to 15 people, $600 each from the 16th, $1,200 each from the 31st. */
export function overheadCost(teamSize: number): number {
  return Math.max(0, Math.min(teamSize, 30) - 15) * 600 + Math.max(0, teamSize - 30) * 1200
}

/** Rent/infra + every hire's salary + variable costs + management overhead, per month. */
export function monthlyBurn(state: BurnInput): number {
  const team = Object.values(state.v2.team)
  return state.infraCostMonthly + team.reduce((sum, m) => sum + m.salary, 0) + variableCosts(state) + infraServicesCost(state) + overheadCost(team.length)
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
