import { describe, expect, it } from 'vitest'
import { formatProfit, profitMonthly } from '../finance'
import { makeState, member, withTeam } from './fixtures'

describe('profit', () => {
  it('is MRR minus monthly burn (infra + salaries)', () => {
    const s = withTeam(makeState({ mrr: 1500, infraCostMonthly: 300 }), member({ id: 'a', salary: 800 }))
    expect(profitMonthly(s)).toBe(400)
  })

  it('formats with a sign and /mo', () => {
    expect(formatProfit(400)).toBe('+$400/mo')
    expect(formatProfit(-1250)).toBe('−$1,250/mo')
    expect(formatProfit(0)).toBe('$0/mo')
  })
})
