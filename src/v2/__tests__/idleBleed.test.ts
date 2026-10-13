import { describe, expect, it } from 'vitest'
import { processDay } from '../engine/day'
import { FOUNDER_LIVING, monthlyBurn } from '../engine/money'
import { currentTip } from '../tips'
import { makeState, withChapter, withV2 } from './fixtures'

const live = (over = {}) => withChapter(makeState(over), { beat: 5, complete: true })

describe('the founder has to live', () => {
  it('living costs start once the tutorial is done, and not before', () => {
    expect(monthlyBurn(makeState())).toBe(0)
    expect(monthlyBurn(live())).toBe(FOUNDER_LIVING)
    expect(FOUNDER_LIVING).toBeGreaterThanOrEqual(300)
  })

  it('a few customers no longer pay for doing nothing', () => {
    // 5 customers × $50 = $250/mo against the founder's living costs.
    const s = live({ customers: 5, mrr: 250, cash: 2000 })
    const after = processDay(s, 1, () => 0.99)
    expect(after.cash).toBeLessThan(s.cash)
  })

  it('enough customers still leave the founder ahead', () => {
    const s = live({ customers: 20, mrr: 1000, cash: 2000 })
    expect(processDay(s, 1, () => 0.99).cash).toBeGreaterThan(s.cash)
  })
})

describe('churn is visible when the company is small', () => {
  it('a lost customer shows up as a notice', () => {
    const s = live({ customers: 6, mrr: 300, cash: 5000, churnRate: 15 })
    const after = processDay(s, 1, () => 0) // rng 0: the churn roll always hits
    expect(after.customers).toBeLessThan(6)
    expect(after.storyLog[0].lines.join(' ')).toMatch(/^📉/)
  })

  it('big companies do not get a notice for every cancellation', () => {
    const s = live({ customers: 400, mrr: 20000, cash: 50000, churnRate: 10 })
    const after = processDay(s, 1, () => 0)
    expect(after.storyLog.some(e => e.lines.some(l => l.startsWith('📉')))).toBe(false)
  })

  it('the first cancellation brings a tip about keeping customers', () => {
    const quiet = withV2(live({ customers: 5 }), {})
    expect(currentTip(quiet)?.id).not.toBe('tip-churn')
    const lost = { ...live({ customers: 5 }), customersLostThisMonth: 1 }
    expect(currentTip(lost)?.id).toBe('tip-churn')
  })
})
