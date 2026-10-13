import { describe, expect, it } from 'vitest'
import { armedNow, CONFIRM_MIN_MS } from '../confirm'
import { frameIntent } from '../scene/animation'
import { qualityHandlers } from '../scene/quality'

describe('adaptive quality', () => {
  it('has no fallback (drei counts every incline as a flip, so fallback would pin DPR to 1 on smooth machines)', () => {
    const calls: boolean[] = []
    const h = qualityHandlers(v => calls.push(v))
    expect('onFallback' in h).toBe(false)
    h.onDecline(); h.onIncline()
    expect(calls).toEqual([true, false])
  })
})

describe('frameIntent under reduced motion', () => {
  it('stands idle on a sales call instead of walking in place', () => {
    expect(frameIntent({ emoting: false, walking: false, pace: true, poseClip: 'walk', reduced: true })).toEqual({ move: true, clip: 'idle', once: false })
    expect(frameIntent({ emoting: false, walking: false, pace: true, poseClip: 'walk' }).clip).toBe('walk')
  })
})

describe('two-click confirm', () => {
  it('ignores a second click that is really a double-click', () => {
    expect(armedNow({ id: 'a', at: 1000 }, 'a', 1000 + CONFIRM_MIN_MS - 1)).toBe(false)
    expect(armedNow({ id: 'a', at: 1000 }, 'a', 1000 + CONFIRM_MIN_MS)).toBe(true)
  })
})
