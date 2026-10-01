import { describe, expect, it } from 'vitest'
import { EVENTS } from '../../data/events'
import { claimFamilyMoney } from '../chapter'
import { startTask } from '../founder'
import type { FounderTaskType, Rng, V2GameState } from '../state'
import { v2Tick } from '../v2Tick'
import { generateInternCandidates, hireIntern } from '../team'
import { createInitialState } from '../../engine/gameEngine'
import { makeConfig, makeState, seq, withChapter } from './fixtures'

function start(s: V2GameState, type: FounderTaskType, featureId?: string): V2GameState {
  const r = startTask(s, type, featureId)
  if (!r.ok) throw new Error(`startTask ${type}: ${r.reason}`)
  return r.state
}

function runTask(s: V2GameState, rng: Rng): V2GameState {
  let state = s
  for (let i = 0; i < 10_000 && state.v2.founder.task; i++) state = v2Tick(state, 1, rng)
  return state
}

describe('v2Tick', () => {
  it('clears legacy events during Chapter 1', () => {
    const s = makeState({ pendingEvent: EVENTS[0] })
    expect(v2Tick(s, 1).pendingEvent).toBeNull()
  })

  it('keeps clearing $100k-scale legacy events while the founder is still solo after Chapter 1', () => {
    const s = withChapter(makeState({ pendingEvent: EVENTS[0] }), { beat: 5, complete: true })
    expect(s.employees).toHaveLength(0)
    expect(v2Tick(s, 1).pendingEvent).toBeNull()
  })

  it('keeps events once both chapters are done and there is a team, and pauses the founder while one is pending', () => {
    const hire = createInitialState(makeConfig()).candidates[0]
    const employee = { ...hire, status: 'idle' as const, ideaProgress: 0, hiredAtDay: 0, morale: 70, stress: 10, xp: 0, level: 1 }
    const base = withChapter(makeState({ employees: [employee] }), { beat: 5, complete: true })
    const s = start({ ...base, v2: { ...base.v2, chapter2: { beat: 2, complete: true, firstMistake: false } } }, 'research')
    const pending = { ...s, pendingEvent: EVENTS[0] }
    const next = v2Tick(pending, 1, () => 0) // 0 → always kept (Phase 4 thinning)
    expect(next.pendingEvent?.id).toBe(EVENTS[0].id)
    expect(next.v2.founder.task?.progress).toBe(0)
  })

  it('does nothing when the game is over', () => {
    const lost = makeState({ phase: 'lost' })
    expect(v2Tick(lost, 1)).toBe(lost)
  })

  it('does not advance the founder when no game time passed', () => {
    const s = start(makeState(), 'research')
    expect(v2Tick(s, 0).v2.founder.task?.progress).toBe(0)
  })

  it('moves the chapter forward when a task completes', () => {
    const done = runTask(start(makeState(), 'research'), seq(0))
    expect(done.v2.chapter.beat).toBe(1)
  })

  it('plays the whole chapter end to end', () => {
    const rng = seq(0.99) // worst-case rolls: only the first-sale guarantee converts
    let s = runTask(start(makeState(), 'research'), rng)
    expect(s.v2.chapter.beat).toBe(1)

    const firstIdea = s.features.find(f => f.status === 'proposed')!
    s = runTask(start(s, 'develop', firstIdea.id), rng)
    expect(s.v2.chapter.beat).toBe(2)

    s = runTask(start(s, 'emails'), rng)
    expect(s.v2.chapter.beat).toBe(3)
    expect(s.v2.leads).toBeGreaterThan(0)

    s = runTask(start(s, 'sales'), rng)
    expect(s.customers).toBe(1)
    expect(s.v2.chapter.beat).toBe(5)
    expect(s.v2.chapter.familyMoney?.claimed).toBe(false)

    const cashBefore = s.cash
    s = claimFamilyMoney(s)
    expect(s.v2.chapter.complete).toBe(true)
    expect(s.cash - cashBefore).toBeGreaterThanOrEqual(800)
    expect(s.cash - cashBefore).toBeLessThanOrEqual(1500)
  })
})

describe('v2Tick with a team', () => {
  it('keeps clearing events during Chapter 2 even with interns hired', () => {
    const base = withChapter(makeState({ pendingEvent: EVENTS[0] }), { beat: 5, complete: true })
    const s = { ...base, employees: [{ ...createInitialState(makeConfig()).candidates[0], status: 'idle' as const, ideaProgress: 0, hiredAtDay: 0, morale: 70, stress: 10, xp: 0, level: 1 }] }
    expect(v2Tick(s, 1).pendingEvent).toBeNull()
  })

  it('an intern on emails grows leads with the founder idle, and advances Chapter 2', () => {
    let s = withChapter(makeState({ cash: 3000 }), { beat: 5, complete: true })
    s = { ...s, v2: { ...s.v2, chapter2: { beat: 0, complete: false, firstMistake: false }, candidates: generateInternCandidates(seq(0.6), 1).map(c => ({ ...c, role: 'marketing' as const, skills: { research: 1, build: 1, outreach: 3, sales: 1 } })) } }
    s = hireIntern(s, s.v2.candidates[0].id)
    expect(s.v2.chapter2.beat).toBe(1)
    for (let h = 0; h < 70; h++) s = v2Tick(s, 1, seq(0.99))
    expect(s.v2.leads).toBeGreaterThan(0)
    expect(s.v2.founder.task).toBeNull()
    expect(s.v2.chapter2.beat).toBe(2)
    expect(s.employees[0]).toMatchObject({ role: 'developer', morale: 72, stress: 15 })
  })
})
