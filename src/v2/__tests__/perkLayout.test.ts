import { describe, expect, it } from 'vitest'
import { LOCATIONS } from '../locations'
import { footprint, type Placement } from '../scene/layout'
import { perkPlacements } from '../scene/perks'
import { roomFor } from '../scene/rooms'
import { PERKS, PERK_SLOTS } from '../shop'

const overlaps = (a: ReturnType<typeof footprint>, b: ReturnType<typeof footprint>) =>
  a.x0 < b.x1 - 0.01 && b.x0 < a.x1 - 0.01 && a.z0 < b.z1 - 0.01 && b.z0 < a.z1 - 0.01
const onFloor = (p: Placement) => p.position[1] === 0 && !p.model.startsWith('rug')
const inside = (x: number, z: number, f: ReturnType<typeof footprint>) => x > f.x0 && x < f.x1 && z > f.z0 && z < f.z1

describe('perk spots', () => {
  for (const loc of LOCATIONS) {
    it(`${loc.id}: one spot per slot; every perk fits every spot without hitting anything`, () => {
      const r = roomFor(loc.id)
      expect(r.perkSpots).toHaveLength(PERK_SLOTS[loc.id])
      const base = [...r.furniture, ...r.seats.flatMap(s => s.furniture)].filter(onFloor)
      const standing = [...Object.values(r.spots).filter(s => !s.seat), ...r.seats.flatMap(s => [s.spots.paceA, s.spots.paceB]), r.door]
      r.perkSpots.forEach((spot, i) => {
        for (const perk of PERKS) {
          for (const p of perkPlacements(perk.id, spot).filter(onFloor)) {
            const f = footprint(p)
            expect(f.x0 >= -0.01 && f.x1 <= r.width + 0.01 && f.z0 >= -r.depth - 0.01 && f.z1 <= 0.01, `${perk.id}@${i} ${JSON.stringify(f)}`).toBe(true)
            for (const b of base) expect(overlaps(f, footprint(b)), `${perk.id}@${i} vs ${b.model}`).toBe(false)
            for (const st of standing) expect(inside(st.position[0], st.position[2], f), `${perk.id}@${i} covers a spot`).toBe(false)
            r.perkSpots.forEach((other, j) => {
              if (j === i) return
              for (const q of PERKS.flatMap(pk => perkPlacements(pk.id, other)).filter(onFloor)) {
                expect(overlaps(f, footprint(q)), `${perk.id}@${i} vs spot ${j}`).toBe(false)
              }
            })
          }
        }
      })
    })
  }
})
