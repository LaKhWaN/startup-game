import { describe, expect, it } from 'vitest'
import {
  CHAPTER3_GOAL_MRR, checkChapter3Complete, currentCard, dismissCard, isMapUnlocked, onMoved, reshowCurrentCard,
} from '../chapter'
import type { V2GameState } from '../state'
import { v2Tick } from '../v2Tick'
import { makeState, seq, withChapter, withV2 } from './fixtures'

const CH1 = ['beat-0', 'beat-1', 'beat-2', 'beat-3', 'beat-4']
const CH2 = ['c2-0', 'c2-1', 'c2-2', 'c2-done']

function afterChapter2(extraSeen: string[] = CH2): V2GameState {
  const s = withChapter(makeState({ cash: 10_000, mrr: 1200 }), { beat: 5, complete: true, seenCards: [...CH1, ...extraSeen] })
  return withV2(s, { chapter2: { beat: 2, complete: true, firstMistake: false } })
}

describe('Chapter 3', () => {
  it('unlocks the Map once Chapter 2 is done', () => {
    expect(isMapUnlocked(makeState())).toBe(false)
    expect(isMapUnlocked(afterChapter2())).toBe(true)
  })

  it('shows c2-done first, then c3-0', () => {
    expect(currentCard(afterChapter2(['c2-0', 'c2-1', 'c2-2']))?.id).toBe('c2-done')
    expect(currentCard(afterChapter2())?.id).toBe('c3-0')
  })

  it('moves to beat 1 on the first move, with its card', () => {
    const s = onMoved(dismissCard(afterChapter2(), 'c3-0'))
    expect(s.v2.chapter3.beat).toBe(1)
    expect(currentCard(s)?.id).toBe('c3-1')
    expect(onMoved(s)).toBe(s)
  })

  it(`completes at $${CHAPTER3_GOAL_MRR} MRR, only after Chapter 2`, () => {
    expect(checkChapter3Complete({ ...afterChapter2(), mrr: 4999 }).v2.chapter3.complete).toBe(false)
    const done = checkChapter3Complete({ ...afterChapter2(), mrr: 5000 })
    expect(done.v2.chapter3.complete).toBe(true)
    expect(currentCard(dismissCard(done, 'c3-0'))?.id).toBe('c3-done')
    const early = withV2(makeState({ mrr: 6000 }), { chapter2: { beat: 2, complete: false, firstMistake: false } })
    expect(checkChapter3Complete(early).v2.chapter3.complete).toBe(false)
  })

  it('re-shows the current Chapter 3 card', () => {
    const s = dismissCard(onMoved(dismissCard(afterChapter2(), 'c3-0')), 'c3-1')
    expect(currentCard({ v2: s.v2 })).toBeNull() // chapter cards only (tips need full state)
    expect(currentCard(reshowCurrentCard(s))?.id).toBe('c3-1')
  })
})

describe('v2Tick (Phase 4)', () => {
  it('unlocks locations from MRR and completes Chapter 3 in the tick', () => {
    const s = v2Tick({ ...afterChapter2(), mrr: 8200 }, 1, seq(0.5))
    expect(s.v2.unlockedLocations).toEqual(['home', 'biggerHome', 'villa', 'coworking'])
    expect(s.v2.chapter3.complete).toBe(true)
  })
})
