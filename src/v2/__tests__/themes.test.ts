import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LOCATIONS } from '../locations'
import { FURNITURE_MODELS, furnitureUrl } from '../scene/assets'
import { footprint } from '../scene/layout'
import { roomFor } from '../scene/rooms'
import { AMENITY_STRIP, THEMES } from '../scene/themes'

describe('location themes', () => {
  it('every location has a theme, and the room carries it', () => {
    for (const l of LOCATIONS) {
      expect(THEMES[l.id], l.id).toBeDefined()
      expect(roomFor(l.id).theme).toBe(THEMES[l.id])
    }
  })

  it('leaves the bedroom as modelled', () => {
    expect(THEMES.home).toMatchObject({ floorTint: '#ffffff', wallTint: '#ffffff', background: '#2b2119' })
    expect(roomFor('home').amenityStrip).toBeUndefined()
    expect(roomFor('home').showEmptySeats).toBe(false)
    expect(roomFor('coworking').showEmptySeats).toBe(true)
  })

  for (const l of LOCATIONS.slice(1)) {
    it(`${l.id}: amenities sit inside the strip, inside the room, using shipped models`, () => {
      const r = roomFor(l.id)
      expect(r.amenityStrip, l.id).toBeDefined()
      const { x0, x1 } = r.amenityStrip!
      expect(x1 - x0).toBeCloseTo(AMENITY_STRIP)
      expect(x1).toBeLessThanOrEqual(r.width)
      const amenities = THEMES[l.id].amenities(x0, -r.depth)
      expect(amenities.length).toBeGreaterThan(3)
      for (const p of amenities) {
        expect(FURNITURE_MODELS).toContain(p.model)
        expect(existsSync(join(process.cwd(), 'public', furnitureUrl(p.model))), p.model).toBe(true)
        expect(r.furniture).toContainEqual(p)
        const f = footprint(p)
        expect(f.x0 >= x0 - 0.01 && f.x1 <= x1 + 0.01, `${p.model} ${JSON.stringify(f)}`).toBe(true)
        expect(f.z0 >= -r.depth - 0.01 && f.z1 <= 0.01, `${p.model} z ${JSON.stringify(f)}`).toBe(true)
      }
    })
  }
})
