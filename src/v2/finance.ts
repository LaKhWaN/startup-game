import { getMonthlyBurn } from '../engine/gameEngine'
import type { GameState } from '../types'

/** Monthly profit: MRR minus burn (rent/infra + salaries). Negative = losing money. */
export function profitMonthly(state: GameState): number {
  return state.mrr - getMonthlyBurn(state)
}

export function formatProfit(n: number): string {
  const abs = `$${Math.round(Math.abs(n)).toLocaleString('en-US')}/mo`
  return n > 0 ? `+${abs}` : n < 0 ? `−${abs}` : abs
}
