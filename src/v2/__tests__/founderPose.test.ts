import { describe, expect, it } from 'vitest'
import { CHARACTER_CLIPS } from '../scene/assets'
import { founderPose } from '../scene/founderPose'
import { SPOTS } from '../scene/layout'
import type { FounderTaskType } from '../state'

const task = (type: FounderTaskType) => ({ type, progress: 0.3 })

describe('founderPose', () => {
  it('maps every task and idle to a real spot and a real clip', () => {
    for (const t of [null, task('research'), task('develop'), task('emails'), task('sales')]) {
      const p = founderPose(t)
      expect(SPOTS[p.spot]).toBeDefined()
      expect(CHARACTER_CLIPS).toContain(p.clip)
    }
  })

  it('matches the spec table', () => {
    expect(founderPose(null)).toEqual({ spot: 'bed', clip: 'sit', typing: false, pace: false, icon: null })
    expect(founderPose(task('research'))).toEqual({ spot: 'bookshelf', clip: 'interact-right', typing: false, pace: false, icon: null })
    expect(founderPose(task('develop'))).toEqual({ spot: 'desk', clip: 'sit', typing: true, pace: false, icon: null })
    expect(founderPose(task('emails'))).toEqual({ spot: 'desk', clip: 'sit', typing: true, pace: false, icon: '✉️' })
    expect(founderPose(task('sales'))).toEqual({ spot: 'paceA', clip: 'walk', typing: false, pace: true, icon: '📞' })
  })
})
