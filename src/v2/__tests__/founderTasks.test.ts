import { describe, expect, it } from 'vitest'
import { taskReason } from '../founderTasks'
import { makeState, withChapter, withFounder, withV2 } from './fixtures'

describe('taskReason', () => {
  it('explains locked tasks with the unlock hint', () => {
    expect(taskReason(makeState().v2, 'emails')).toMatch(/Unlocks after/)
    expect(taskReason(makeState().v2, 'research')).toBeNull()
  })

  it('blocks while the founder is busy', () => {
    const s = withFounder(makeState(), { task: { type: 'research', progress: 0.2 } })
    expect(taskReason(s.v2, 'research')).toBe('Finish your current task first')
  })

  it('needs leads to sell', () => {
    const s = withChapter(makeState(), { complete: true, beat: 5 })
    expect(taskReason(s.v2, 'sales')).toMatch(/No leads/)
    expect(taskReason(withV2(s, { leads: 3 }).v2, 'sales')).toBeNull()
  })
})
