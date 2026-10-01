import { describe, expect, it } from 'vitest'
import type { InternCandidate, LocationId, V2GameState } from '../state'
import {
  advanceTeam, canHire, canPromote, generateCandidates, hireIntern, isFullTimeUnlocked, promoteMember,
} from '../team'
import { hireSpeed, mistakeChance, TIER_RULES } from '../work'
import { makeState, seq, withChapter, withV2 } from './fixtures'

const ready = (location: LocationId = 'villa') =>
  withV2(withChapter(makeState({ cash: 50_000 }), { beat: 5, complete: true }), {
    location, unlockedLocations: ['home', 'biggerHome', 'villa'],
  })

const cand = (over: Partial<InternCandidate> = {}): InternCandidate => ({
  id: 'c1', name: 'Ada', gender: 'female', role: 'developer', tier: 'intern',
  skills: { research: 1, build: 3, outreach: 1, sales: 1 }, salary: 700, bio: '', characterModel: 'character-female-b', ...over,
})
const hire = (s: V2GameState, c = cand()) => hireIntern(withV2(s, { candidates: [c] }), c.id)

describe('tier rules', () => {
  it('matches spec §8.3', () => {
    expect(TIER_RULES.intern).toEqual({ mainSpeed: 0.7, offSpeed: 0.35, skillMain: 3, skillOther: 1, gain: 0.25, cap: 6 })
    expect(TIER_RULES.fulltime).toEqual({ mainSpeed: 1, offSpeed: 0.5, skillMain: 5, skillOther: 2, gain: 0.2, cap: 9 })
  })

  it('full-time hires work at founder speed on their main task, half elsewhere', () => {
    expect(hireSpeed('developer', 'develop', 'fulltime')).toBe(1)
    expect(hireSpeed('developer', 'emails', 'fulltime')).toBe(0.5)
    expect(hireSpeed('developer', 'develop')).toBe(0.7) // intern default
  })

  it('full-time mistakes: 5% at main skill 5, −1% per point, floor 1%', () => {
    const skills = { research: 2, build: 5, outreach: 2, sales: 2 }
    expect(mistakeChance({ role: 'developer', skills, tier: 'fulltime' })).toBeCloseTo(0.05)
    expect(mistakeChance({ role: 'developer', skills: { ...skills, build: 7 }, tier: 'fulltime' })).toBeCloseTo(0.03)
    expect(mistakeChance({ role: 'developer', skills: { ...skills, build: 9 }, tier: 'fulltime' })).toBeCloseTo(0.01)
  })
})

describe('full-time unlock', () => {
  it('opens at the Villa or bigger, not before', () => {
    expect(isFullTimeUnlocked(ready('home'))).toBe(false)
    expect(isFullTimeUnlocked(ready('biggerHome'))).toBe(false)
    expect(isFullTimeUnlocked(ready('villa'))).toBe(true)
    expect(isFullTimeUnlocked(ready('building'))).toBe(true)
  })
})

describe('generateCandidates', () => {
  it('is 3 interns, plus 2 full-time when unlocked', () => {
    expect(generateCandidates(seq(0.3, 0.7), { fullTime: false }).map(c => c.tier)).toEqual(['intern', 'intern', 'intern'])
    const pool = generateCandidates(seq(0.3, 0.7), { fullTime: true })
    expect(pool.map(c => c.tier)).toEqual(['intern', 'intern', 'intern', 'fulltime', 'fulltime'])
  })

  it('gives full-time candidates main skill 5, others 2, salary $2,000–$3,000', () => {
    for (const r of [0, 0.5, 0.999]) {
      const ft = generateCandidates(seq(r), { fullTime: true }).filter(c => c.tier === 'fulltime')
      for (const c of ft) {
        expect(Object.values(c.skills).sort()).toEqual([2, 2, 2, 5])
        expect(c.salary).toBeGreaterThanOrEqual(2000)
        expect(c.salary).toBeLessThanOrEqual(3000)
        expect(c.salary % 250).toBe(0)
      }
    }
  })
})

describe('hiring full-time', () => {
  it('is blocked until unlocked', () => {
    const c = cand({ tier: 'fulltime', salary: 2500 })
    expect(canHire(withV2(ready('biggerHome'), { candidates: [c] }), c.id)).toBe('locked')
    expect(canHire(withV2(ready('villa'), { candidates: [c] }), c.id)).toBe('ok')
  })

  it('hires with the full-time tier and says so', () => {
    const s = hire(ready(), cand({ tier: 'fulltime', salary: 2500, skills: { research: 2, build: 5, outreach: 2, sales: 2 } }))
    expect(s.v2.team.c1.tier).toBe('fulltime')
    expect(s.storyLog[0].lines[0]).toMatch(/full-time/)
  })

  it('full-time skill grows +0.2 per task, capped at 9', () => {
    let s = hire(ready(), cand({ tier: 'fulltime', role: 'marketing', salary: 2500, skills: { research: 2, build: 2, outreach: 8.9, sales: 2 } }))
    for (let h = 0; h < 49; h++) s = advanceTeam(s, 1, seq(0.99)).state // emails: 2 days at speed 1
    expect(s.v2.team.c1.skills.outreach).toBe(9)
  })
})

describe('promotion', () => {
  const skilled = () => hire(ready(), cand({ skills: { research: 1, build: 5, outreach: 1, sales: 1 } }))

  it('needs main skill ≥ 5, an intern, and full-time unlocked', () => {
    expect(canPromote(hire(ready(), cand()), 'c1')).toBe('skill')
    expect(canPromote(withV2(skilled(), { location: 'biggerHome' }), 'c1')).toBe('locked')
    expect(canPromote(skilled(), 'nobody')).toBe('missing')
    expect(canPromote(skilled(), 'c1')).toBe('ok')
    expect(canPromote(promoteMember(skilled(), 'c1'), 'c1')).toBe('tier')
  })

  it('makes them full-time, keeps skills and task, raises salary to at least $2,000 in the payroll mirror', () => {
    let s = skilled()
    s = withV2(s, { team: { c1: { ...s.v2.team.c1, task: { type: 'emails', progress: 0.5 } } } })
    const after = promoteMember(s, 'c1')
    expect(after.v2.team.c1).toMatchObject({ tier: 'fulltime', salary: 2000, task: { type: 'emails', progress: 0.5 } })
    expect(after.v2.team.c1.skills.build).toBe(5)
    expect(after.employees.find(e => e.id === 'c1')!.salary).toBe(2000)
    expect(after.storyLog[0].lines[0]).toMatch(/promoted/i)
  })

  it('never lowers a salary already above $2,000', () => {
    let s = skilled()
    s = { ...s, employees: s.employees.map(e => ({ ...e, salary: 2600 })), v2: { ...s.v2, team: { c1: { ...s.v2.team.c1, salary: 2600 } } } }
    expect(promoteMember(s, 'c1').v2.team.c1.salary).toBe(2600)
  })
})

describe('person card data', () => {
  it('keeps the candidate one-liner on the hire', () => {
    const s = hire(ready(), cand({ bio: 'Ships on Fridays, apologises on Mondays.' }))
    expect(s.v2.team.c1.bio).toBe('Ships on Fridays, apologises on Mondays.')
  })
})
