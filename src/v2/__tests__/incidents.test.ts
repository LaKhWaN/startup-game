import { describe, expect, it } from 'vitest'
import { processDay } from '../engine/day'
import { applyEventChoice } from '../engine/events'
import { eventById } from '../engine/eventData'
import { INCIDENT, incidentChance } from '../engine/incidents'
import { v2Tick } from '../v2Tick'
import { makeState } from './fixtures'

describe('incidents', () => {
  it('are likelier as tech debt climbs past 40', () => {
    expect(incidentChance(40)).toBe(0)
    expect(incidentChance(100)).toBeCloseTo(0.1)
  })

  it('hit customers and flood support when they happen, then ask what to do', () => {
    const s = processDay(makeState({ cash: 1e6, customers: 200, techDebt: 100, lastEventDay: 1 }), 2, () => 0) // 0 → incident fires
    expect(s.pendingEvent?.id).toBe(INCIDENT.id)
    expect(s.customers).toBeLessThan(200 - 3)
    expect(s.v2.tickets).toBeGreaterThanOrEqual(20)
  })

  it('happen even during the tutorial chapters (never gated or thinned)', () => {
    const s = v2Tick(makeState({ pendingEvent: INCIDENT }), 1, () => 0.99)
    expect(s.pendingEvent?.id).toBe(INCIDENT.id)
  })

  it('"All hands" pays down debt; "Ride it out" leaves a churn shock', () => {
    const s = makeState({ techDebt: 60, pendingEvent: INCIDENT, churnShock: 0 })
    expect(applyEventChoice(s, 0).techDebt).toBe(52)
    expect(applyEventChoice(s, 1).churnShock).toBeCloseTo(3)
  })

  it('survive a save (looked up by id)', () => {
    expect(eventById(INCIDENT.id)?.id).toBe(INCIDENT.id)
  })
})
