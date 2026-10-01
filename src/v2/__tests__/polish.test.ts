import { describe, expect, it } from 'vitest'
import { armedNow, CONFIRM_MS } from '../confirm'
import { floorInstances } from '../scene/floor'
import { occupiedSeatMask, seatTaken } from '../scene/seats'
import { roomFor } from '../scene/rooms'
import { stepFor } from '../scene/motion'

describe('occupiedSeatMask', () => {
  it('packs taken seats into a number so selectors stay primitive', () => {
    const team = { a: { seat: 0 }, b: { seat: 3 } }
    const mask = occupiedSeatMask(team)
    expect(seatTaken(mask, 0)).toBe(true)
    expect(seatTaken(mask, 1)).toBe(false)
    expect(seatTaken(mask, 3)).toBe(true)
  })

  it('works past 31 seats (the Building has 50)', () => {
    const mask = occupiedSeatMask({ a: { seat: 49 } })
    expect(seatTaken(mask, 49)).toBe(true)
    expect(seatTaken(mask, 17)).toBe(false)
  })
})

describe('floorInstances', () => {
  it('has one transform per floor tile, at the tile positions', () => {
    const room = roomFor('villa')
    const inst = floorInstances(room.floor)
    expect(inst).toHaveLength(room.floor.length)
    expect(inst[0]).toEqual(room.floor[0].position)
  })
})

describe('stepFor (reduced motion)', () => {
  it('snaps straight to the goal when motion is reduced', () => {
    const step = stepFor(true)
    expect(step([0, 0], [3, -2], 1.2, 0.016)).toEqual({ pos: [3, -2], arrived: true })
  })
  it('walks normally otherwise', () => {
    expect(stepFor(false)([0, 0], [3, 0], 1, 0.5)).toEqual({ pos: [0.5, 0], arrived: false })
  })
})

describe('two-click confirm', () => {
  it('is armed only for the same id within the window', () => {
    expect(armedNow({ id: 'a', at: 1000 }, 'a', 1000 + CONFIRM_MS - 1)).toBe(true)
    expect(armedNow({ id: 'a', at: 1000 }, 'a', 1000 + CONFIRM_MS)).toBe(false)
    expect(armedNow({ id: 'a', at: 1000 }, 'b', 1001)).toBe(false)
    expect(armedNow(null, 'a', 0)).toBe(false)
  })
})
