import { afterEach, describe, expect, it, vi } from 'vitest'
import { totalDays } from '../engine/clock'
import { applyEventChoice } from '../engine/events'
import { monthlyBurn as getMonthlyBurn } from '../engine/money'
import { claimFamilyMoney, onMoved } from '../chapter'
import { startTask } from '../founder'
import { canMove, LOCATIONS, locationIndex, moveTo } from '../locations'
import type { FounderTaskType, V2GameState } from '../state'
import { canHire, canPromote, generateCandidates, hireIntern, isFullTimeUnlocked, promoteMember, setAssignment, teamCapacity } from '../team'
import { stepV2 } from '../v2Tick'
import { makeState } from './fixtures'

/** mulberry32: small seeded PRNG so the run is repeatable. */
function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A sensible, not optimal, player. `careful` also answers support and pays down debt. */
function play(s: V2GameState, rng: () => number, careful = false): V2GameState {
  if (s.pendingEvent) s = applyEventChoice(s, 0)
  const { chapter } = s.v2
  if (chapter.beat === 5 && chapter.familyMoney && !chapter.familyMoney.claimed) s = claimFamilyMoney(s)

  // Sleep when tired at night instead of grinding (a tired founder works at half speed).
  const hour = s.gameTime.totalHours % 24
  const resting = (hour >= 22 || hour < 7) && (s.v2.founder.energy ?? 100) < 70
  if (!s.v2.founder.task && !resting) {
    const proposed = s.features.find(f => f.status === 'proposed')
    // Keep the funnel moving (emails → sales); build and research in between.
    const order: [FounderTaskType, string | undefined][] = [
      ...(careful && s.v2.tickets >= Math.max(5, s.customers * 0.05) ? [['support', undefined] as [FounderTaskType, undefined]] : []),
      ...(careful && s.techDebt > 45 ? [['refactor', undefined] as [FounderTaskType, undefined]] : []),
      ...(s.v2.leads >= 6 ? [['sales', undefined] as [FounderTaskType, undefined]] : []),
      ...(s.v2.leads < 6 ? [['emails', undefined] as [FounderTaskType, undefined]] : []),
      ...(proposed ? [['develop', proposed.id] as [FounderTaskType, string]] : []),
      ['research', undefined], ['emails', undefined],
    ]
    for (const [type, id] of order) {
      const r = startTask(s, type, id)
      if (r.ok) { s = r.state; break }
    }
  }

  if (!chapter.complete) return s

  // A careful player keeps one hire on support once the team has three people.
  if (careful) {
    const team = Object.values(s.v2.team)
    if (team.length >= 3 && !team.some(m => m.assignment === 'support')) s = setAssignment(s, team[team.length - 1].id, 'support')
  }

  // Promote anyone ready, then move up when it's safely affordable.
  for (const id of Object.keys(s.v2.team)) if (canPromote(s, id) === 'ok' && s.mrr > getMonthlyBurn(s)) s = promoteMember(s, id)
  const next = LOCATIONS[locationIndex(s.v2.location) + 1]
  if (next && canMove(s, next.id) === 'ok' && s.cash >= next.moveIn + 4 * (getMonthlyBurn(s) - s.infraCostMonthly + next.rent)) {
    s = onMoved(moveTo(s, next.id))
  }

  // Hire while the runway after the hire stays ≥ 4 months.
  if (s.v2.candidates.length === 0) s = { ...s, v2: { ...s.v2, candidates: generateCandidates(rng, { fullTime: isFullTimeUnlocked(s) }) } }
  for (const c of [...s.v2.candidates].sort((a, b) => (b.tier === 'fulltime' ? 1 : 0) - (a.tier === 'fulltime' ? 1 : 0))) {
    if (Object.keys(s.v2.team).length >= teamCapacity(s)) break
    const netBurnAfter = getMonthlyBurn(s) + c.salary - s.mrr
    if (canHire(s, c.id) === 'ok' && (netBurnAfter <= 0 || s.cash / netBurnAfter >= 4)) s = hireIntern(s, c.id)
  }
  return s
}

afterEach(() => vi.restoreAllMocks())

describe('balance simulation', () => {
  for (const seed of [1, 2, 3]) {
    it(`seed ${seed}: a sensible player reaches Co-working within two years without going broke`, () => {
      const rng = seeded(seed)
      vi.spyOn(Math, 'random').mockImplementation(rng)
      let s = makeState()
      const reached: Record<string, number> = {}
      for (let h = 0; h < 730 * 24 && s.phase === 'playing'; h++) {
        if (h % 6 === 0) s = play(s, rng)
        else if (s.pendingEvent) s = applyEventChoice(s, 0)
        s = stepV2(s, rng)
        if (!(s.v2.location in reached)) reached[s.v2.location] = totalDays(s.gameTime)
        if (process.env.SIM_TRACE && seed === 1 && h % (24 * 25) === 0) console.log(`d${totalDays(s.gameTime)} mrr ${s.mrr} cust ${s.customers} cash ${Math.round(s.cash)} burn ${getMonthlyBurn(s)} churn ${s.churnRate.toFixed(1)} tickets ${s.v2.tickets} debt ${Math.round(s.techDebt)} team ${Object.keys(s.v2.team).length} fE ${Math.round(s.v2.founder.energy ?? 100)} beat ${s.v2.chapter.beat}/${s.v2.chapter.complete} leads ${s.v2.leads}`)
        if (process.env.SIM_DEBUG && h % (24 * 15) === 0) console.log(`d${totalDays(s.gameTime)} h${s.gameTime.totalHours} mrr ${s.mrr} cust ${s.customers} cash ${Math.round(s.cash)} leads ${s.v2.leads} beat ${s.v2.chapter.beat} task ${s.v2.founder.task?.type} team ${Object.keys(s.v2.team).length} loc ${s.v2.location} :: ${s.storyLog[0]?.lines[0]}`)
        if (reached.coworking !== undefined) break
      }
      if (process.env.SIM_DEBUG) console.log(`seed ${seed}:`, JSON.stringify(reached), `day ${totalDays(s.gameTime)}`, `mrr $${s.mrr}`, `cash $${Math.round(s.cash)}`, `team ${Object.keys(s.v2.team).length}`, s.phase)
      expect(s.phase).toBe('playing')
      expect(reached.coworking).toBeDefined()
      expect(reached.coworking).toBeLessThanOrEqual(730)
      // …but not trivially: each rung takes real growth, not one windfall.
      expect(reached.biggerHome).toBeGreaterThanOrEqual(30)
      expect(reached.coworking - reached.biggerHome).toBeGreaterThanOrEqual(30)
      expect(Object.values(s.v2.team).some(m => m.tier === 'fulltime')).toBe(true)
    }, 60_000)
  }

  it('answering support and paying down debt keeps more customers than neglecting them', () => {
    const runFor = (careful: boolean) => {
      const rng = seeded(11)
      vi.spyOn(Math, 'random').mockImplementation(rng)
      let s = makeState()
      for (let h = 0; h < 300 * 24 && s.phase === 'playing'; h++) {
        if (h % 6 === 0) s = play(s, rng, careful)
        else if (s.pendingEvent) s = applyEventChoice(s, 0)
        s = stepV2(s, rng)
      }
      vi.restoreAllMocks()
      return s
    }
    const neglect = runFor(false)
    const careful = runFor(true)
    if (process.env.SIM_DEBUG) console.log('neglect', neglect.customers, Math.round(neglect.churnRate), neglect.v2.tickets, '| careful', careful.customers, Math.round(careful.churnRate), careful.v2.tickets)
    expect(careful.churnRate).toBeLessThan(neglect.churnRate)
    expect(careful.customers).toBeGreaterThan(neglect.customers)
  }, 60_000)
})
