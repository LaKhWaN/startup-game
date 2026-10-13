import { monthlyBurn } from './engine/money'
import type { V2GameState } from './state'

/** A few plain-language lines on why the company died. */
export function postMortemInsights(s: V2GameState): string[] {
  const out: string[] = []
  const burn = monthlyBurn(s)
  const team = Object.keys(s.v2.team).length
  if (s.mrr === 0) out.push('You never made a sale. Leads only pay once someone calls them.')
  else if (s.mrr < burn) out.push(`Revenue ($${s.mrr.toLocaleString()}/mo) never covered the burn ($${burn.toLocaleString()}/mo).`)
  if (team > 0 && s.mrr < burn * 0.5) out.push(`${team} hire${team > 1 ? 's' : ''} cost more than the business could carry yet.`)
  if (s.churnRate > 15) out.push(`Churn ran at ${s.churnRate.toFixed(1)}%/mo: customers left as fast as they came.`)
  if (s.techDebt > 60) out.push('Tech debt piled up and slowed everything down.')
  if (s.infraCostMonthly > s.mrr && s.infraCostMonthly > 0) out.push('Rent was higher than revenue. The move came too early.')
  if (out.length === 0) out.push('Cash ran out before growth could catch up.')
  return out
}
