import { describe, expect, it } from 'vitest'
import { LOCATIONS } from '../locations'
import { FLOOR, FURNITURE, footprint, HIRE_SPOTS, SEAT_FURNITURE, SPOTS, WALLS, type Placement } from '../scene/layout'
import { roomFor } from '../scene/rooms'

const inside = (x: number, z: number, f: ReturnType<typeof footprint>) => x > f.x0 && x < f.x1 && z > f.z0 && z < f.z1
const overlaps = (a: ReturnType<typeof footprint>, b: ReturnType<typeof footprint>) =>
  a.x0 < b.x1 - 0.01 && b.x0 < a.x1 - 0.01 && a.z0 < b.z1 - 0.01 && b.z0 < a.z1 - 0.01
const onFloor = (p: Placement) => p.position[1] === 0 && p.model !== 'rugRectangle'

describe('roomFor', () => {
  it('home is the handcrafted bedroom', () => {
    const r = roomFor('home')
    expect(r).toMatchObject({ width: 4, depth: 4, floor: FLOOR, walls: WALLS, furniture: FURNITURE, spots: SPOTS })
    expect(r.seats.map(s => s.furniture)).toEqual(SEAT_FURNITURE)
    expect(r.seats.map(s => s.spots)).toEqual(HIRE_SPOTS)
  })

  for (const loc of LOCATIONS) {
    describe(loc.id, () => {
      const r = roomFor(loc.id)
      const all = [...r.furniture, ...r.seats.flatMap(s => s.furniture)]

      it(`has one seat per hire (${loc.capacity})`, () => {
        expect(r.seats).toHaveLength(loc.capacity)
      })

      it('keeps all furniture inside the room', () => {
        for (const p of all) {
          const f = footprint(p)
          expect(f.x0 >= -0.01 && f.x1 <= r.width + 0.01 && f.z0 >= -r.depth - 0.01 && f.z1 <= 0.01, `${p.model} ${JSON.stringify(f)}`).toBe(true)
        }
      })

      it('has a floor tile for every square', () => {
        expect(r.floor).toHaveLength(r.width * r.depth)
      })

      it('never overlaps floor furniture', () => {
        const items = all.filter(onFloor).map(p => ({ p, f: footprint(p) }))
        for (let i = 0; i < items.length; i++) {
          for (let j = i + 1; j < items.length; j++) {
            expect(overlaps(items[i].f, items[j].f), `${items[i].p.model}@${items[i].p.position} vs ${items[j].p.model}@${items[j].p.position}`).toBe(false)
          }
        }
      })

      it('seats every sitter on its seat furniture', () => {
        const seated = [
          ...Object.values(r.spots).filter(s => s.seat).map(s => ({ s, pool: r.furniture })),
          ...r.seats.map(seat => ({ s: seat.spots.seat, pool: seat.furniture })),
        ]
        for (const { s, pool } of seated) {
          const on = pool.filter(p => p.model === s.seat).some(p => inside(s.position[0], s.position[2], footprint(p)))
          expect(on, `${s.seat} at ${s.position}`).toBe(true)
        }
      })

      it('has a door spot inside the room, clear of furniture', () => {
        const [x, , z] = r.door.position
        expect(x > 0 && x < r.width && z < 0 && z > -r.depth).toBe(true)
        for (const p of all.filter(onFloor)) expect(inside(x, z, footprint(p)), `door in ${p.model}`).toBe(false)
      })

      it('keeps standing and pace spots inside the room and out of furniture', () => {
        const standing = [
          ...Object.values(r.spots).filter(s => !s.seat),
          ...r.seats.flatMap(seat => [seat.spots.paceA, seat.spots.paceB]),
        ]
        for (const s of standing) {
          const [x, , z] = s.position
          expect(x > 0 && x < r.width && z < 0 && z > -r.depth, `${s.position}`).toBe(true)
          for (const p of all.filter(onFloor)) expect(inside(x, z, footprint(p)), `${s.position} in ${p.model}`).toBe(false)
        }
      })
    })
  }
})
