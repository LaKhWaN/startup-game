import { describe, expect, it } from 'vitest'
import { CRUNCH_PREMIUM, CRUNCH_SPEED, infraServicesCost, toggleTool } from '../engine/infra'
import { peopleHour } from '../engine/people'
import { migrateV2Slice, createV2Slice } from '../state'
import { stepV2 } from '../v2Tick'
import { EMAILS_DAYS, RESEARCH_DAYS, SALES_DAYS, GAME_HOUR_MS } from '../founder'
import { makeState, member, withChapter, withTeam } from './fixtures'

describe('pacing', () => {
  it('a game hour lasts 1.5 real seconds at 1× and tasks are short', () => {
    expect(GAME_HOUR_MS).toBe(1500)
    expect([RESEARCH_DAYS, EMAILS_DAYS, SALES_DAYS]).toEqual([1.5, 1, 1])
  })
})

describe('crunch mode', () => {
  const team = () => withTeam(withChapter(makeState({ cash: 1e6 }), { beat: 5, complete: true }), member({ id: 'b', role: 'marketing', assignment: 'emails', task: { type: 'emails', progress: 0 }, stress: 10 }))

  it('costs 50% of payroll on top', () => {
    const s = toggleTool(withTeam(makeState(), member({ salary: 1000 }), member({ id: 'm2', salary: 600 })), 'crunch')
    expect(CRUNCH_PREMIUM).toBe(0.5)
    expect(infraServicesCost(s)).toBe(800)
  })

  it('makes hires 50% faster', () => {
    const normal = stepV2(team(), () => 0.99).v2.team.b.task!.progress
    const crunch = stepV2(toggleTool(team(), 'crunch'), () => 0.99).v2.team.b.task!.progress
    expect(crunch).toBeCloseTo(normal * CRUNCH_SPEED)
  })

  it('doubles busy stress', () => {
    const s = team()
    const calm = peopleHour(s).v2.team.b.stress!
    const crunch = peopleHour(s, true).v2.team.b.stress!
    expect(crunch - 10).toBeCloseTo((calm - 10) * 2)
  })

  it('old saves with Night shift get Crunch mode', () => {
    const v = migrateV2Slice({ ...createV2Slice(), infra: { hosting: 1, wifi: 'home', tools: ['nightShift', 'helpdesk', 'junk'] } })!
    expect(v.infra.tools).toEqual(['crunch', 'helpdesk'])
  })
})
