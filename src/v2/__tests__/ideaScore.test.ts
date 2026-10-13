import { describe, expect, it } from 'vitest'
import { localIdeaScore } from '../../ai/gemini'
import { scoreFromBreakdown } from '../../../server/rateIdea'

describe('idea scores use the whole range', () => {
  it('the server turns the six-part breakdown into a spread-out score', () => {
    expect(scoreFromBreakdown({ market: 9, pain: 9, competition: 6, feasibility: 6, specificity: 9, model: 9 })).toBe(10)
    expect(scoreFromBreakdown({ market: 7, pain: 7, competition: 5, feasibility: 7, specificity: 8, model: 8 })).toBe(8)
    expect(scoreFromBreakdown({ market: 5, pain: 6, competition: 6, feasibility: 9, specificity: 8, model: 7 })).toBe(7)
    expect(scoreFromBreakdown({ market: 7, pain: 4, competition: 2, feasibility: 9, specificity: 5, model: 5 })).toBe(4)
    expect(scoreFromBreakdown({ market: 1, pain: 0, competition: 1, feasibility: 1, specificity: 0, model: 1 })).toBe(1)
    expect(scoreFromBreakdown({ market: 'x' })).toBeNull()
  })

  it('the offline estimate is never a flat 5', () => {
    expect(localIdeaScore('An app')).toBe(1)
    expect(localIdeaScore('Uber for laundry')).toBe(1)
    expect(localIdeaScore('Payroll and compliance software for remote-first companies hiring contractors in 150 countries')).toBeGreaterThanOrEqual(6)
    expect(localIdeaScore('A fitness app with workout plans and progress tracking')).toBeLessThanOrEqual(4)
  })
})
