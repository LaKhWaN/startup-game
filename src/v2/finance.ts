import { monthlyBurn } from './engine/money'
import type { V2GameState } from './state'

/** Monthly profit: MRR minus burn (rent/infra + salaries). Negative = losing money. */
export function profitMonthly(state: Pick<V2GameState, 'mrr' | 'infraCostMonthly' | 'v2'>): number {
  return state.mrr - monthlyBurn(state)
}

export function formatProfit(n: number): string {
  const abs = `$${Math.round(Math.abs(n)).toLocaleString('en-US')}/mo`
  return n > 0 ? `+${abs}` : n < 0 ? `−${abs}` : abs
}
