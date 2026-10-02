import { describe, expect, it } from 'vitest'
import { BUSY_STRESS_PER_HOUR, LOW_MORALE, LOW_MORALE_DAYS, MORALE_BASE, peopleDay, peopleHour } from '../engine/people'
import { DEFAULT_RAISE, EXPECTED_RAISE, nextReviewDay, payMoodFor, raisePct, REVIEW_DAYS, setRaisePct } from '../payroll'
import { FULLTIME_MIN_SALARY, generateCandidates, promoteMember } from '../team'
import { LOCATIONS } from '../locations'
import { makeState, member, withTeam, withV2 } from './fixtures'

describe('annual raises', () => {
  it('defaults to 5% and only takes the offered steps', () => {
    const s = makeState()
    expect(raisePct(s)).toBe(DEFAULT_RAISE)
    expect(raisePct(setRaisePct(s, 10))).toBe(10)
    expect(raisePct(setRaisePct(s, 7))).toBe(DEFAULT_RAISE)
  })

  it('pay mood: below the 8% the team expects hurts, above it helps', () => {
    expect(payMoodFor(EXPECTED_RAISE)).toBe(0)
    expect(payMoodFor(0)).toBeLessThan(-10)
    expect(payMoodFor(15)).toBeGreaterThan(10)
  })

  it('a work anniversary raises salary by the policy and sets pay mood', () => {
    const s = withV2(withTeam(makeState(), member({ salary: 1000, hiredAtDay: 0 })), { raisePct: 10 })
    const after = peopleDay(s, REVIEW_DAYS, false)
    expect(after.v2.team.m1.salary).toBe(1100)
    expect(after.v2.team.m1.payMood).toBe(payMoodFor(10))
    // Not on other days.
    expect(peopleDay(s, REVIEW_DAYS - 1, false).v2.team.m1.salary).toBe(1000)
  })

  it('next review is the coming anniversary', () => {
    expect(nextReviewDay(member({ hiredAtDay: 10 }), 50)).toBe(10 + REVIEW_DAYS)
    expect(nextReviewDay(member({ hiredAtDay: 10 }), 10 + REVIEW_DAYS + 1)).toBe(10 + 2 * REVIEW_DAYS)
  })
})

describe('stress and morale bite', () => {
  it('busy hours build stress faster', () => {
    const s = withTeam(makeState(), member({ stress: 10, task: { type: 'emails', progress: 0 } }))
    expect(peopleHour(s, true).v2.team.m1.stress).toBeCloseTo(10 + BUSY_STRESS_PER_HOUR)
    expect(BUSY_STRESS_PER_HOUR).toBeGreaterThanOrEqual(0.8)
  })

  it('morale drifts to base + perks + pay − stress/2', () => {
    const s = withTeam(makeState(), member({ morale: MORALE_BASE, stress: 60 }))
    const after = peopleDay(s, 1, false)
    expect(after.v2.team.m1.morale).toBeLessThan(MORALE_BASE)
  })

  it(`morale under ${LOW_MORALE} for ${LOW_MORALE_DAYS} work days means notice`, () => {
    let s = withTeam(makeState(), member({ morale: 10, stress: 80 }))
    for (let d = 1; d <= LOW_MORALE_DAYS; d++) s = peopleDay(s, d, false)
    expect(s.v2.team.m1.leavingOn).toBeDefined()
    expect(s.storyLog[0].lines.join(' ')).toMatch(/unhappy/i)
  })

  it('when someone leaves, the rest lose morale', () => {
    const s = withTeam(makeState(), member({ leavingOn: 3 }), member({ id: 'm2', seat: 1, morale: 70, stress: 10 }))
    const after = peopleDay(s, 3, false)
    expect(after.v2.team.m1).toBeUndefined()
    const alone = peopleDay(withTeam(makeState(), member({ id: 'm2', seat: 1, morale: 70, stress: 10 })), 3, false)
    expect(after.v2.team.m2.morale!).toBeLessThan(alone.v2.team.m2.morale! - 4)
  })
})

describe('pricier full-time hires, rent and unlocks', () => {
  it('full-time candidates cost $3,500–5,100', () => {
    expect(FULLTIME_MIN_SALARY).toBe(3500)
    const pool = generateCandidates(() => 0.99, { fullTime: true }).filter(c => c.tier === 'fulltime')
    for (const c of pool) expect(c.salary).toBeGreaterThanOrEqual(3500)
    expect(Math.max(...pool.map(c => c.salary))).toBe(5100)
  })

  it('promotion pays at least the full-time minimum', () => {
    const s = withTeam(makeState(), member({ salary: 900, skills: { research: 1, build: 6, outreach: 1, sales: 1 } }))
    const promoted = promoteMember({ ...s, v2: { ...s.v2, location: 'coworking' } }, 'm1')
    if (promoted.v2.team.m1.tier === 'fulltime') expect(promoted.v2.team.m1.salary).toBe(3500)
  })

  it('every building costs more and unlocks later than before', () => {
    const rent = Object.fromEntries(LOCATIONS.map(l => [l.id, l.rent]))
    expect(rent).toMatchObject({ biggerHome: 500, villa: 1500, coworking: 3500, smallOffice: 8000, bigOffice: 16000, building: 32000 })
    const unlock = Object.fromEntries(LOCATIONS.map(l => [l.id, l.unlockMrr]))
    expect(unlock).toMatchObject({ biggerHome: 1500, villa: 4000, coworking: 8000, smallOffice: 18000, bigOffice: 40000, building: 90000 })
  })
})
