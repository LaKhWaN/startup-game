import { describe, expect, it } from 'vitest'
import { clockLabel, isNight, isWorkHour, nextWorkStart, weekday } from '../engine/clock'
import { processDay } from '../engine/day'
import { applyEventChoice, eventView, pickEvent } from '../engine/events'
import { EVENTS } from '../engine/eventData'
import { monthlyBurn, runwayMonths } from '../engine/money'
import { makeState, seq, withV2 } from './fixtures'

const H = (day: number, hour: number) => day * 24 + hour
function seeded(seed: number) {
  let a = seed >>> 0
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

describe('clock', () => {
  it('opens 09–17 on weekdays only', () => {
    expect(isWorkHour(H(0, 9))).toBe(true)
    expect(isWorkHour(H(0, 16))).toBe(true)
    expect(isWorkHour(H(0, 17))).toBe(false)
    expect(isWorkHour(H(0, 8))).toBe(false)
    expect(weekday(H(5, 10))).toBe(5)
    expect(isWorkHour(H(5, 10))).toBe(false) // Saturday
  })
  it('finds the next opening across nights and weekends', () => {
    expect(nextWorkStart(H(0, 18))).toBe(H(1, 9))
    expect(nextWorkStart(H(4, 18))).toBe(H(7, 9)) // Friday evening → Monday
    expect(nextWorkStart(H(2, 11))).toBe(H(2, 11))
  })
  it('knows night and labels the clock', () => {
    expect(isNight(H(0, 22))).toBe(true)
    expect(isNight(H(0, 12))).toBe(false)
    expect(clockLabel(H(1, 9))).toBe('Tue 09:00')
  })
})

describe('money', () => {
  it('burn is rent plus team salaries; runway uses net burn', () => {
    const s = withV2(makeState({ infraCostMonthly: 300, cash: 3000, mrr: 0 }), {
      team: { a: { salary: 700 } as never, b: { salary: 1000 } as never },
    })
    expect(monthlyBurn(s)).toBe(2000)
    expect(runwayMonths(s)).toBe(1)
    expect(runwayMonths({ ...s, mrr: 5000 })).toBe(999)
  })
})

describe('processDay', () => {
  it('churns small customer bases too (no rounding to zero)', () => {
    let s = makeState({ customers: 50, churnRate: 12, cash: 100_000 })
    let lost = 0
    const rng = seeded(7)
    for (let d = 1; d <= 30; d++) { const n = processDay(s, d, rng); lost += s.customers - n.customers; s = { ...n, churnRate: 12, pendingEvent: null } }
    expect(lost).toBeGreaterThan(2)
    expect(lost).toBeLessThan(15)
  })
  it('accrues revenue minus burn daily and snapshots', () => {
    const s = processDay(makeState({ customers: 10, arpu: 50, cash: 1000, infraCostMonthly: 300, churnRate: 0 }), 1, () => 0.99)
    expect(s.mrr).toBe(500)
    expect(s.cash).toBeCloseTo(1000 + (500 - 300) / 30)
    expect(s.metricsHistory[s.metricsHistory.length - 1].day).toBe(1)
  })
  it('ends the game when cash goes below zero', () => {
    const s = processDay(makeState({ cash: 5, infraCostMonthly: 3000, customers: 0 }), 1, () => 0.99)
    expect(s.phase).toBe('lost')
  })
})

describe('events', () => {
  it('picks unused events and applies choices with team-backed employees', () => {
    const quit = EVENTS.find(e => e.id === 'key-employee-quit')!
    let s = withV2(makeState({ pendingEvent: quit }), {
      team: { d: { id: 'd', name: 'Dee', gender: 'female', role: 'developer', tier: 'intern', skills: { research: 1, build: 4, outreach: 1, sales: 1 }, assignment: 'develop', task: null, mistakes: 0, seat: 0, characterModel: 'character-male-b', salary: 700 } },
    })
    expect(eventView(s).employees[0]).toMatchObject({ id: 'd', role: 'developer', level: 4 })
    s = applyEventChoice(s, 1) // let them go
    expect(s.v2.team.d).toBeUndefined()
    expect(s.pendingEvent).toBeNull()
    expect(s.storyLog[0].lines.join(' ')).toMatch(/Dee left/)
    expect(pickEvent(makeState(), seq(0.5))).not.toBeNull()
  })
})
