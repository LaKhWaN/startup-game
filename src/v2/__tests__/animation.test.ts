import { describe, expect, it } from 'vitest'
import { applyTypingMotion, frameIntent } from '../scene/animation'

describe('applyTypingMotion', () => {
  it('keeps the head near its rest pose even when no clip rewrites it (sit has no head track)', () => {
    const head = { rotation: { x: 0.2 } }
    const rest = { head: 0.2, armL: 0, armR: 0 }
    for (let f = 0; f < 600; f++) applyTypingMotion({ head }, rest, f / 60) // 10 s at 60 fps
    expect(Math.abs(head.rotation.x - 0.2)).toBeLessThan(0.1)
  })

  it('offsets arms around their rest rotation', () => {
    const armL = { rotation: { x: 1 } }
    for (let f = 0; f < 600; f++) applyTypingMotion({ armL }, { head: 0, armL: 1, armR: 0 }, f / 60)
    expect(Math.abs(armL.rotation.x - 1)).toBeLessThanOrEqual(0.12 + 1e-9)
  })
})

describe('frameIntent', () => {
  it('holds position while the task-complete nod plays, then walks', () => {
    expect(frameIntent({ emoting: true, walking: true, pace: false, poseClip: 'sit' }))
      .toEqual({ move: false, clip: 'emote-yes', once: true })
    expect(frameIntent({ emoting: false, walking: true, pace: false, poseClip: 'sit' }))
      .toEqual({ move: true, clip: 'walk', once: false })
  })

  it('plays the pose clip once settled, and walks while pacing', () => {
    expect(frameIntent({ emoting: false, walking: false, pace: false, poseClip: 'interact-right' }))
      .toEqual({ move: true, clip: 'interact-right', once: false })
    expect(frameIntent({ emoting: false, walking: false, pace: true, poseClip: 'walk' }).clip).toBe('walk')
  })
})
