import { describe, expect, it } from 'vitest'
import { EVENTS } from '../engine/eventData'
import type { EventDef as GameEvent } from '../engine/eventData'
import { eventView } from '../engine/events'
import {
  costFactor, EVENT_KEEP_CHANCE, EVENT_MIN_STAGE, EXEMPT_EVENTS, filterPendingEvent, isScaled, scaleEvent, scaleText,
} from '../eventsV2'
import type { LocationId, V2GameState } from '../state'
import { makeState, member, seq, withTeam, withV2 } from './fixtures'

const ev = (id: string) => EVENTS.find(e => e.id === id)!
const at = (location: LocationId, over: Partial<V2GameState> = {}) => withV2(makeState({ cash: 20_000, ...over }), { location })

const fake = (effect: GameEvent['choices'][0]['effect']): GameEvent => ({
  id: 'fake', category: 'crisis', title: 'Fake', description: 'Costs $1,200 now and $450/mo.',
  choices: [
    { label: 'Pay ($1,200)', consequence: 'You paid $1,200.', effect },
    { label: 'Ignore', consequence: 'Nothing.', effect: () => ({}) },
  ],
})

describe('costFactor', () => {
  it('is burn / $10k, clamped to [0.2, 1]', () => {
    expect(costFactor(makeState({ infraCostMonthly: 0 }))).toBe(0.2)
    expect(costFactor(makeState({ infraCostMonthly: 5000 }))).toBe(0.5)
    expect(costFactor(makeState({ infraCostMonthly: 50_000 }))).toBe(1)
  })
})

describe('scaleText', () => {
  it('rewrites dollar amounts by the factor, rounded to $50 (min $50)', () => {
    expect(scaleText('$1,200 due now, +$450/mo', 0.5)).toBe('$600 due now, +$250/mo')
    expect(scaleText('only $100', 0.2)).toBe('only $50')
    expect(scaleText('no money here', 0.5)).toBe('no money here')
  })
})

describe('scaleEvent', () => {
  it('scales cash costs and infra increases, rounded to $50', () => {
    const s = makeState({ cash: 10_000, infraCostMonthly: 100 })
    const e = scaleEvent(fake(st => ({ cash: st.cash - 1200, infraCostMonthly: st.infraCostMonthly + 450 })), 0.5)
    const out = e.choices[0].effect(eventView(s))
    expect(out.cash).toBe(10_000 - 600)
    expect(out.infraCostMonthly).toBe(100 + 250)
    expect(e.description).toBe('Costs $600 now and $250/mo.')
    expect(e.choices[0].label).toBe('Pay ($600)')
    expect(isScaled(e)).toBe(true)
  })

  it('never scales gains', () => {
    const s = makeState({ cash: 1000 })
    const e = scaleEvent(fake(st => ({ cash: st.cash + 4000 })), 0.2)
    expect(e.choices[0].effect(eventView(s)).cash).toBe(5000)
  })

  it('scales salary raises an event gives the team', () => {
    const s = withTeam(makeState(), member({ id: 'x', salary: 800 }))
    const e = scaleEvent(fake(st => ({ employees: st.employees.map(x => ({ ...x, salary: x.salary + 1200 })) })), 0.25)
    expect(e.choices[0].effect(eventView(s)).employees![0].salary).toBe(800 + 300)
  })

  it('leaves effects without money untouched', () => {
    const s = makeState()
    const e = scaleEvent(ev('critical-bug'), 0.2)
    expect(Object.keys(e.choices[0].effect(eventView(s))).length).toBeGreaterThan(0)
  })
})

describe('filterPendingEvent', () => {
  it('passes the state through with no event', () => {
    const s = at('home')
    expect(filterPendingEvent(s, seq(0))).toBe(s)
  })

  it('drops events gated above the current stage', () => {
    expect(EVENT_MIN_STAGE['enterprise-intro']).toBe(3)
    const s = at('villa', { pendingEvent: ev('enterprise-intro') })
    expect(filterPendingEvent(s, seq(0)).pendingEvent).toBeNull()
  })

  it('thins events out early: keep with the stage keep-chance', () => {
    expect(EVENT_KEEP_CHANCE).toEqual([0.35, 0.5, 0.65, 0.8, 1, 1, 1])
    const s = at('home', { pendingEvent: ev('aws-spike') })
    expect(filterPendingEvent(s, seq(0.4)).pendingEvent).toBeNull()
    expect(filterPendingEvent(s, seq(0.3)).pendingEvent?.id).toBe('aws-spike')
  })

  it('scales a kept event once', () => {
    const s = at('home', { pendingEvent: ev('aws-spike'), infraCostMonthly: 0 })
    const once = filterPendingEvent(s, seq(0.1))
    expect(isScaled(once.pendingEvent!)).toBe(true)
    expect(once.pendingEvent!.description).toMatch(/\$250 due now/) // 1,200 × 0.2 = 240 → 250
    expect(filterPendingEvent(once, seq(0.99))).toBe(once)
  })

  it('keeps payout events whole, and always', () => {
    for (const id of ['investor-seed', 'acquisition-premium', 'angel-meeting']) expect(EXEMPT_EVENTS.has(id)).toBe(true)
    const s = at('home', { pendingEvent: ev('acquisition-premium') })
    const out = filterPendingEvent(s, seq(0.99))
    expect(out.pendingEvent?.description).toBe(ev('acquisition-premium').description)
    expect(isScaled(out.pendingEvent!)).toBe(true)
  })
})

describe('v2Tick event handling', () => {
  it('scales an allowed event in the tick', async () => {
    const { v2Tick } = await import('../v2Tick')
    const { withChapter } = await import('./fixtures')
    let s = withChapter(withTeam(at('coworking', { pendingEvent: ev('aws-spike'), infraCostMonthly: 0 }), member({ id: 'e', salary: 1000 })), { complete: true, beat: 5 })
    s = withV2(s, { chapter2: { beat: 2, complete: true, firstMistake: false } })
    const out = v2Tick(s, 1, seq(0.1))
    expect(out.pendingEvent && isScaled(out.pendingEvent)).toBe(true)
  })
})
