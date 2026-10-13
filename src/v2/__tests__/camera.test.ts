import { describe, expect, it } from 'vitest'
import { fitZoom, iconScale } from '../scene/camera'

describe('fitZoom', () => {
  it('fits a 4×4 room like the bedroom always has', () => {
    expect(fitZoom({ width: 660, height: 1000 }, 4, 4)).toBeCloseTo(100)
    expect(fitZoom({ width: 2000, height: 500 }, 4, 4)).toBeCloseTo(100)
  })
  it('zooms out for bigger rooms', () => {
    expect(fitZoom({ width: 660, height: 1000 }, 8, 8)).toBeCloseTo(50)
  })
})

describe('iconScale', () => {
  it('is 1 at bedroom zoom and above, shrinking with zoom to a floor', () => {
    expect(iconScale(160)).toBe(1)
    expect(iconScale(78)).toBeCloseTo(0.5)
    expect(iconScale(10)).toBe(0.45)
  })
})
