import { describe, expect, it } from 'vitest'
import { EVENTS } from '../../data/events'
import { claimFamilyMoney } from '../chapter'
import { startTask } from '../founder'
import type { FounderTaskType, Rng, V2GameState } from '../state'
import { v2Tick } from '../v2Tick'
import { makeState, seq, withChapter } from './fixtures'

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

  it('keeps events after Chapter 1 and pauses the founder while one is pending', () => {
    const s = start(withChapter(makeState(), { beat: 5, complete: true }), 'research')
    const pending = { ...s, pendingEvent: EVENTS[0] }
    const next = v2Tick(pending, 1)
    expect(next.pendingEvent).toBe(EVENTS[0])
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
