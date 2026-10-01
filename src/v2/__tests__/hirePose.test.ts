import { describe, expect, it } from 'vitest'
import { hirePose } from '../scene/founderPose'
import type { FounderTask } from '../state'

const task = (type: FounderTask['type']): FounderTask => ({ type, progress: 0.3 })

describe('hirePose', () => {
  it('sits idle at the seat with no task', () => {
    expect(hirePose(null)).toMatchObject({ spot: 'seat', clip: 'sit', typing: false, pace: false })
  })

  it('types at the seat for desk work, with an icon per task', () => {
    expect(hirePose(task('develop'))).toMatchObject({ spot: 'seat', typing: true, icon: null })
    expect(hirePose(task('research'))).toMatchObject({ spot: 'seat', typing: true, icon: '🔍' })
    expect(hirePose(task('emails'))).toMatchObject({ spot: 'seat', typing: true, icon: '✉️' })
  })

  it('paces on its own pace spots while selling', () => {
    expect(hirePose(task('sales'))).toMatchObject({ spot: 'paceA', clip: 'walk', pace: true, icon: '📞' })
  })
})
