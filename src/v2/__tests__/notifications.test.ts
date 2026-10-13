import { describe, expect, it } from 'vitest'
import { isNotable, newLines } from '../NotificationToasts'

describe('notification toasts', () => {
  it('only toast lines that start with an emoji', () => {
    expect(isNotable('👋 Sam left the company.')).toBe(true)
    expect(isNotable('💸 Ana got a 5% raise.')).toBe(true)
    expect(isNotable('You sent a round of cold emails. 9 new leads.')).toBe(false)
  })

  it('returns lines added since the last seen entry, oldest first', () => {
    const a = { day: 1, lines: ['a1'] }
    const b = { day: 2, lines: ['b1', 'b2'] }
    const c = { day: 2, lines: ['c1'] }
    expect(newLines([c, b, a], a)).toEqual(['b1', 'b2', 'c1'])
    expect(newLines([c, b, a], c)).toEqual([])
  })

  it('a loaded save (last seen entry gone) toasts nothing', () => {
    expect(newLines([{ day: 9, lines: ['x'] }], { day: 1, lines: ['a1'] })).toEqual([])
  })
})
