import { describe, expect, it } from 'vitest'
import { FURNITURE, footprint, HIRE_SPOTS, ROOM, SEAT_FURNITURE, SPOTS, type Placement, type SpotId } from '../scene/layout'
import { HOME_CAPACITY } from '../team'

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

describe('hire seats', () => {
  const allFurniture = (): Placement[] => [...FURNITURE, ...SEAT_FURNITURE.flat()]
  const floorItems = () => allFurniture().filter(p => p.model !== 'rugRectangle' && p.position[1] === 0)

  it('has a seat (spots + furniture) for every slot the Home holds', () => {
    expect(HIRE_SPOTS).toHaveLength(HOME_CAPACITY)
    expect(SEAT_FURNITURE).toHaveLength(HOME_CAPACITY)
  })

  it('keeps seat furniture inside the room and clear of the base furniture and each other', () => {
    const base = FURNITURE.filter(p => p.model !== 'rugRectangle' && p.position[1] === 0)
    const overlaps = (a: ReturnType<typeof footprint>, b: ReturnType<typeof footprint>) =>
      a.x0 < b.x1 - 0.01 && b.x0 < a.x1 - 0.01 && a.z0 < b.z1 - 0.01 && b.z0 < a.z1 - 0.01
    SEAT_FURNITURE.forEach((seat, i) => {
      for (const p of seat) {
        const f = footprint(p)
        expect(f.x0 >= -0.01 && f.x1 <= ROOM.width + 0.01, `seat ${i} ${p.model} x ${JSON.stringify(f)}`).toBe(true)
        expect(f.z0 >= -ROOM.depth - 0.01 && f.z1 <= 0.01, `seat ${i} ${p.model} z ${JSON.stringify(f)}`).toBe(true)
        if (p.position[1] !== 0 || p.model === 'rugRectangle') continue
        for (const b of base) expect(overlaps(f, footprint(b)), `seat ${i} ${p.model} vs ${b.model}`).toBe(false)
        SEAT_FURNITURE.forEach((other, j) => {
          if (j === i) return
          for (const o of other.filter(q => q.position[1] === 0)) expect(overlaps(f, footprint(o)), `seat ${i} ${p.model} vs seat ${j} ${o.model}`).toBe(false)
        })
      }
    })
  })

  it('puts each hire on its own seat furniture', () => {
    HIRE_SPOTS.forEach((spots, i) => {
      const seat = SEAT_FURNITURE[i].find(p => p.model === spots.seat.seat)
      expect(seat, `seat ${i}`).toBeDefined()
      const [x, , z] = spots.seat.position
      expect(inside(x, z, footprint(seat!)), `seat ${i} on ${spots.seat.seat}`).toBe(true)
    })
  })

  it('keeps hire pace spots inside the room and out of all furniture', () => {
    HIRE_SPOTS.forEach((spots, i) => {
      for (const id of ['paceA', 'paceB'] as const) {
        const [x, , z] = spots[id].position
        expect(x > 0 && x < ROOM.width && z < 0 && z > -ROOM.depth, `seat ${i} ${id}`).toBe(true)
        for (const p of floorItems()) expect(inside(x, z, footprint(p)), `seat ${i} ${id} in ${p.model}`).toBe(false)
      }
    })
  })

  it('keeps the founder standing spots out of the seat furniture', () => {
    for (const id of ['bookshelf', 'paceA', 'paceB'] as SpotId[]) {
      const [x, , z] = SPOTS[id].position
      for (const p of SEAT_FURNITURE.flat().filter(q => q.position[1] === 0)) {
        expect(inside(x, z, footprint(p)), `${id} in ${p.model}`).toBe(false)
      }
    }
  })
})

describe('footprint', () => {
  it('honours a non-corner pivot via origin', () => {
    // tableCoffee: local x ∈ [−0.461, 0.2], z ∈ [−0.3, 0.1]
    expect(footprint({ model: 'tableCoffee', position: [2, 0, -1], rotationY: 0, size: [0.661, 0.4], origin: [-0.461, 0.1] }))
      .toEqual({ x0: expect.closeTo(1.539), x1: expect.closeTo(2.2), z0: expect.closeTo(-1.3), z1: expect.closeTo(-0.9) })
  })

  it('extends +x/−z from the pivot and swaps axes when rotated 90°', () => {
    expect(footprint({ model: 'desk', position: [1, 0, -1], rotationY: 0, size: [0.7, 0.5] }))
      .toEqual({ x0: 1, x1: 1.7, z0: -1.5, z1: -1 })
    const r = footprint({ model: 'desk', position: [1, 0, -1], rotationY: 90, size: [0.7, 0.5] })
    expect(r.x1 - r.x0).toBeCloseTo(0.5)
    expect(r.z1 - r.z0).toBeCloseTo(0.7)
  })
})
