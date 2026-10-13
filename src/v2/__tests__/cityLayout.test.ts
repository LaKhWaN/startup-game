import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LOCATIONS } from '../locations'
import { CITY, CITY_MODELS, cityModelUrl, LOTS, lotFootprint, ROAD_Z } from '../scene/cityLayout'

describe('city layout', () => {
  it('has one lot per location, in ladder order along the road', () => {
    expect(Object.keys(LOTS).sort()).toEqual(LOCATIONS.map(l => l.id).sort())
    const xs = LOCATIONS.map(l => LOTS[l.id].position[0])
    expect([...xs].sort((a, b) => a - b)).toEqual(xs)
  })

  it('keeps lots on the ground, off the road and apart', () => {
    const fps = LOCATIONS.map(l => lotFootprint(l.id))
    fps.forEach((f, i) => {
      expect(f.x0 >= CITY.x0 && f.x1 <= CITY.x1 && f.z0 >= CITY.z0 && f.z1 <= CITY.z1, LOCATIONS[i].id).toBe(true)
      expect(f.z1 < ROAD_Z - 0.5 || f.z0 > ROAD_Z + 0.5, `${LOCATIONS[i].id} on road`).toBe(true)
      for (let j = i + 1; j < fps.length; j++) {
        const g = fps[j]
        expect(f.x1 <= g.x0 || g.x1 <= f.x0 || f.z1 <= g.z0 || g.z1 <= f.z0, `${LOCATIONS[i].id} vs ${LOCATIONS[j].id}`).toBe(true)
      }
    })
  })

  it('ships every city model and each kit colormap', () => {
    for (const m of CITY_MODELS) {
      expect(existsSync(join(process.cwd(), 'public', cityModelUrl(m))), m).toBe(true)
      expect(existsSync(join(process.cwd(), 'public', 'assets', 'v2', 'city', m.split('/')[0], 'Textures', 'colormap.png'))).toBe(true)
    }
  })
})

describe('cityFrame', () => {
  it('shows the whole street on wide canvases', async () => {
    const { cityFrame } = await import('../scene/cityLayout')
    const f = cityFrame({ width: 1200, height: 800 }, 0)
    expect(f.centerX).toBeCloseTo((CITY.x0 + CITY.x1) / 2)
  })
  it('zooms in on the focused lot on phones, clamped to the street', async () => {
    const { cityFrame } = await import('../scene/cityLayout')
    const wide = cityFrame({ width: 1200, height: 800 }, 0)
    const narrow = cityFrame({ width: 375, height: 700 }, LOTS.villa.position[0])
    expect(narrow.centerX).toBeCloseTo(LOTS.villa.position[0])
    expect(narrow.zoom / 375).toBeGreaterThan(wide.zoom / 1200 * 2)
    expect(cityFrame({ width: 375, height: 700 }, -100).centerX).toBeGreaterThan(CITY.x0)
  })
})
