import { describe, expect, it } from 'vitest'
import {
  claimFamilyMoney, currentCoachCard, dismissCard, FAMILY_GIVERS, isMetricsUnlocked,
  isTaskUnlocked, onTaskCompleted, reshowCurrentCard, rollFamilyMoney,
  checkChapter2Complete, currentChapter2Card, isTeamUnlocked, onTeamProgress,
} from '../chapter'
import { makeState, seq, withChapter, withV2 } from './fixtures'

describe('isTaskUnlocked', () => {
  it('unlocks one task per beat, in order', () => {
    const at = (beat: 0 | 1 | 2 | 3) => withChapter(makeState(), { beat })
    expect(['research', 'develop', 'emails', 'sales'].map(t => isTaskUnlocked(at(0), t as never))).toEqual([true, false, false, false])
    expect(isTaskUnlocked(at(1), 'develop')).toBe(true)
    expect(isTaskUnlocked(at(1), 'emails')).toBe(false)
    expect(isTaskUnlocked(at(2), 'emails')).toBe(true)
    expect(isTaskUnlocked(at(2), 'sales')).toBe(false)
    expect(isTaskUnlocked(at(3), 'sales')).toBe(true)
  })

  it('unlocks everything once the chapter is complete', () => {
    const s = withChapter(makeState(), { beat: 5, complete: true })
    expect(isTaskUnlocked(s, 'sales')).toBe(true)
  })
})

describe('isMetricsUnlocked', () => {
  it('opens at beat 4 or on completion', () => {
    expect(isMetricsUnlocked(withChapter(makeState(), { beat: 3 }))).toBe(false)
    expect(isMetricsUnlocked(withChapter(makeState(), { beat: 4 }))).toBe(true)
    expect(isMetricsUnlocked(withChapter(makeState(), { beat: 5 }))).toBe(true)
  })
})

describe('onTaskCompleted', () => {
  const rng = seq(0, 0)

  it('advances one beat when the expected task completes', () => {
    let s = makeState()
    s = onTaskCompleted(s, 'research', rng); expect(s.v2.chapter.beat).toBe(1)
    s = onTaskCompleted(s, 'develop', rng);  expect(s.v2.chapter.beat).toBe(2)
    s = onTaskCompleted(s, 'emails', rng);   expect(s.v2.chapter.beat).toBe(3)
  })

  it('does not advance on the wrong task', () => {
    const s = onTaskCompleted(withChapter(makeState(), { beat: 1 }), 'research', rng)
    expect(s.v2.chapter.beat).toBe(1)
  })

  it('does not advance past beat 3 until a sale actually happened', () => {
    const s = onTaskCompleted(withChapter(makeState(), { beat: 3 }), 'sales', rng)
    expect(s.v2.chapter.beat).toBe(3)
    expect(s.v2.chapter.familyMoney).toBeUndefined()
  })

  it('goes through beat 4 to beat 5 on the first sale and rolls family money', () => {
    const before = withV2(withChapter(makeState(), { beat: 3 }), { firstSaleDone: true })
    const s = onTaskCompleted(before, 'sales', seq(0, 0))
    expect(s.v2.chapter.beat).toBe(5)
    expect(s.v2.chapter.familyMoney).toEqual({ giver: FAMILY_GIVERS[0], amount: 800, claimed: false })
  })

  it('is a no-op once the chapter is complete', () => {
    const s = withChapter(makeState(), { beat: 5, complete: true })
    expect(onTaskCompleted(s, 'research', rng)).toBe(s)
  })
})

describe('rollFamilyMoney', () => {
  it('stays within $800-$1,500 and picks a giver from the pool', () => {
    expect(rollFamilyMoney(seq(0, 0))).toEqual({ giver: FAMILY_GIVERS[0], amount: 800, claimed: false })
    const high = rollFamilyMoney(seq(0.99, 0.9999))
    expect(high.giver).toBe(FAMILY_GIVERS[FAMILY_GIVERS.length - 1])
    expect(high.amount).toBe(1500)
  })
})

describe('claimFamilyMoney', () => {
  const ready = withChapter(makeState(), { beat: 5, familyMoney: { giver: 'Your cousin', amount: 1000, claimed: false } })

  it('adds the cash once and completes the chapter', () => {
    const s = claimFamilyMoney(ready)
    expect(s.cash).toBe(ready.cash + 1000)
    expect(s.v2.chapter.complete).toBe(true)
    expect(s.v2.chapter.familyMoney?.claimed).toBe(true)
    expect(claimFamilyMoney(s).cash).toBe(s.cash)
  })

  it('does nothing before beat 5', () => {
    const early = withChapter(makeState(), { beat: 4 })
    expect(claimFamilyMoney(early)).toBe(early)
  })
})

describe('coach cards', () => {
  it('shows the card for the current beat until dismissed', () => {
    const s = makeState()
    expect(currentCoachCard(s)?.id).toBe('beat-0')
    const dismissed = dismissCard(s, 'beat-0')
    expect(currentCoachCard(dismissed)).toBeNull()
    expect(dismissCard(dismissed, 'beat-0').v2.chapter.seenCards).toEqual(['beat-0'])
  })

  it('shows the first-customer card at beat 5', () => {
    expect(currentCoachCard(withChapter(makeState(), { beat: 5 }))?.id).toBe('beat-4')
  })

  it('reshowCurrentCard brings the current card back', () => {
    const s = dismissCard(makeState(), 'beat-0')
    expect(currentCoachCard(reshowCurrentCard(s))?.id).toBe('beat-0')
  })
})

describe('Chapter 2', () => {
  const done1 = () => withChapter(makeState(), { beat: 5, complete: true })
  const ch2 = (s: ReturnType<typeof makeState>, patch: Partial<ReturnType<typeof makeState>['v2']['chapter2']>) =>
    withV2(s, { chapter2: { ...s.v2.chapter2, ...patch } })

  it('unlocks the team only after Chapter 1', () => {
    expect(isTeamUnlocked(makeState())).toBe(false)
    expect(isTeamUnlocked(done1())).toBe(true)
  })

  it('shows no Chapter 2 card before Chapter 1 is done, then the hire card', () => {
    expect(currentChapter2Card(makeState())).toBeNull()
    expect(currentChapter2Card(done1())?.id).toBe('c2-0')
    expect(currentChapter2Card(ch2(done1(), { beat: 1 }))?.id).toBe('c2-1')
  })

  it('advances to beat 2 when a hire completes a task, and flags the first mistake', () => {
    const s = ch2(done1(), { beat: 1 })
    const a = onTeamProgress(s, { completedBy: ['h1'], mistakes: [] })
    expect(a.v2.chapter2.beat).toBe(2)
    const b = onTeamProgress(a, { completedBy: ['h1'], mistakes: ['h1'] })
    expect(b.v2.chapter2.firstMistake).toBe(true)
    expect(currentChapter2Card(b)?.id).toBe('c2-mistake')
    expect(currentChapter2Card(dismissCard(b, 'c2-mistake'))?.id).toBe('c2-2')
  })

  it('does not jump from beat 0 to 2 without a hire', () => {
    expect(onTeamProgress(done1(), { completedBy: ['h1'], mistakes: [] }).v2.chapter2.beat).toBe(0)
  })

  it('completes at $1,500 MRR, only after Chapter 1', () => {
    expect(checkChapter2Complete({ ...makeState(), mrr: 5000 }).v2.chapter2.complete).toBe(false)
    expect(checkChapter2Complete({ ...done1(), mrr: 1499 }).v2.chapter2.complete).toBe(false)
    const s = checkChapter2Complete({ ...done1(), mrr: 1500 })
    expect(s.v2.chapter2.complete).toBe(true)
    expect(currentChapter2Card(s)?.id).toBe('c2-done')
  })
})
