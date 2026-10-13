import { describe, expect, it } from 'vitest'
import { MAX_TRIP_SECONDS, stepToward, tripSpeed, WALK_SPEED, yawTowards } from '../scene/motion'

describe('tripSpeed', () => {
  it('walks at 1.2 u/s for short trips', () => {
    expect(tripSpeed(1)).toBe(WALK_SPEED)
  })
  it('speeds up so no trip takes longer than 2 seconds', () => {
    expect(tripSpeed(6)).toBeCloseTo(6 / MAX_TRIP_SECONDS)
  })
})

describe('stepToward', () => {
  it('moves by speed*dt toward the target', () => {
    const r = stepToward([0, 0], [3, 4], 1, 1)
    expect(r.pos[0]).toBeCloseTo(0.6)
    expect(r.pos[1]).toBeCloseTo(0.8)
    expect(r.arrived).toBe(false)
  })
  it('lands exactly on the target without overshooting', () => {
    expect(stepToward([0, 0], [0.5, 0], 1.2, 1)).toEqual({ pos: [0.5, 0], arrived: true })
  })
  it('does not move when dt is 0 (paused render frames stay still)', () => {
    expect(stepToward([1, 1], [2, 2], 1.2, 0)).toEqual({ pos: [1, 1], arrived: false })
  })
  it('reports arrival when already there', () => {
    expect(stepToward([1, 1], [1, 1], 1.2, 0.016).arrived).toBe(true)
  })
})

describe('yawTowards', () => {
  it('faces +z at yaw 0 and +x at yaw π/2', () => {
    expect(yawTowards([0, 0], [0, 1])).toBeCloseTo(0)
    expect(yawTowards([0, 0], [1, 0])).toBeCloseTo(Math.PI / 2)
  })
})
