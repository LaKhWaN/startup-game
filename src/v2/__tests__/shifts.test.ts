import { describe, expect, it } from 'vitest'
import { HOURS_PER_DAY } from '../engine/clock'
import { infraServicesCost, NIGHT_SHIFT_PREMIUM, officeOpen, toggleTool } from '../engine/infra'
import { peopleHour } from '../engine/people'
import { shouldAutoSkip } from '../v2Tick'
import { EMAILS_DAYS, RESEARCH_DAYS, SALES_DAYS, GAME_HOUR_MS } from '../founder'
import { makeState, member, withTeam, withV2 } from './fixtures'

const H = (day: number, hour: number) => day * HOURS_PER_DAY + hour

describe('pacing', () => {
  it('a game hour lasts 1.5 real seconds at 1× and tasks are shorter', () => {
    expect(GAME_HOUR_MS).toBe(1500)
    expect([RESEARCH_DAYS, EMAILS_DAYS, SALES_DAYS]).toEqual([1.5, 1, 1])
  })
})

describe('night shift', () => {
  it('keeps the office open 09:00–23:00 on weekdays', () => {
    const s = toggleTool(makeState(), 'nightShift')
    expect(officeOpen(makeState(), H(0, 18))).toBe(false)
    expect(officeOpen(s, H(0, 18))).toBe(true)
    expect(officeOpen(s, H(0, 22))).toBe(true)
    expect(officeOpen(s, H(0, 23))).toBe(false)
    expect(officeOpen(s, H(5, 18))).toBe(false) // Saturday
  })

  it('costs 50% of payroll on top', () => {
    const s = toggleTool(withTeam(makeState(), member({ salary: 1000 }), member({ id: 'm2', salary: 600 })), 'nightShift')
    expect(NIGHT_SHIFT_PREMIUM).toBe(0.5)
    expect(infraServicesCost(s)).toBe(800)
  })

  it('night hours are twice as stressful', () => {
    const s = withTeam(makeState(), member({ id: 'b', task: { type: 'emails', progress: 0 }, stress: 10 }))
    const day = peopleHour(s, true, false).v2.team.b.stress!
    const night = peopleHour(s, true, true).v2.team.b.stress!
    expect(night - 10).toBeCloseTo((day - 10) * 2)
  })
})

describe('auto skip to morning', () => {
  const closed = withV2({ ...makeState(), gameTime: { totalHours: H(0, 20) } }, { autoSkipNights: true })
  it('skips when on, the office is closed, nothing is pending and the founder is not working late', () => {
    expect(shouldAutoSkip(closed, false)).toBe(true)
    expect(shouldAutoSkip(withV2(closed, { autoSkipNights: false }), false)).toBe(false)
    expect(shouldAutoSkip(closed, true)).toBe(false) // a popup holds the game
    expect(shouldAutoSkip({ ...closed, gameTime: { totalHours: H(0, 10) } }, false)).toBe(false)
    expect(shouldAutoSkip(withV2(closed, { founder: { ...closed.v2.founder, workLate: true } }), false)).toBe(false)
  })
})
