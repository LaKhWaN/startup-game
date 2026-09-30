import { describe, expect, it } from 'vitest'
import { FURNITURE, footprint, ROOM, SPOTS, type SpotId } from '../scene/layout'

const inside = (x: number, z: number, f: { x0: number; x1: number; z0: number; z1: number }) =>
  x > f.x0 && x < f.x1 && z > f.z0 && z < f.z1

describe('room layout', () => {
  it('keeps every spot inside the room', () => {
    for (const [id, s] of Object.entries(SPOTS)) {
      const [x, , z] = s.position
      expect(x > 0 && x < ROOM.width, `${id} x`).toBe(true)
      expect(z < 0 && z > -ROOM.depth, `${id} z`).toBe(true)
    }
  })

  it('keeps all furniture inside the room', () => {
    for (const p of FURNITURE) {
      const f = footprint(p)
      expect(f.x0 >= -0.01 && f.x1 <= ROOM.width + 0.01, `${p.model} x ${JSON.stringify(f)}`).toBe(true)
      expect(f.z0 >= -ROOM.depth - 0.01 && f.z1 <= 0.01, `${p.model} z ${JSON.stringify(f)}`).toBe(true)
    }
  })

  it('never puts a standing spot inside furniture', () => {
    const standing: SpotId[] = ['bookshelf', 'paceA', 'paceB']
    const floorItems = FURNITURE.filter(p => p.model !== 'rugRectangle' && p.position[1] === 0)
    for (const id of standing) {
      const [x, , z] = SPOTS[id].position
      for (const p of floorItems) expect(inside(x, z, footprint(p)), `${id} in ${p.model}`).toBe(false)
    }
  })

  it('puts seated spots on their seat', () => {
    for (const id of ['bed', 'desk'] as SpotId[]) {
      const spot = SPOTS[id]
      const seat = FURNITURE.find(p => p.model === spot.seat)
      expect(seat, id).toBeDefined()
      const [x, , z] = spot.position
      expect(inside(x, z, footprint(seat!)), `${id} on ${spot.seat}`).toBe(true)
    }
  })
})

describe('footprint', () => {
  it('extends +x/−z from the pivot and swaps axes when rotated 90°', () => {
    expect(footprint({ model: 'desk', position: [1, 0, -1], rotationY: 0, size: [0.7, 0.5] }))
      .toEqual({ x0: 1, x1: 1.7, z0: -1.5, z1: -1 })
    const r = footprint({ model: 'desk', position: [1, 0, -1], rotationY: 90, size: [0.7, 0.5] })
    expect(r.x1 - r.x0).toBeCloseTo(0.5)
    expect(r.z1 - r.z0).toBeCloseTo(0.7)
  })
})
