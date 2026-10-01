import { afterEach, describe, expect, it, vi } from 'vitest'
import { totalDays } from '../engine/clock'
import { applyEventChoice } from '../engine/events'
import { canMigrate, hostingLoad, startMigration } from '../engine/infra'
import { monthlyBurn as getMonthlyBurn } from '../engine/money'
import { claimFamilyMoney, onMoved } from '../chapter'
import { startTask } from '../founder'
import { canMove, LOCATIONS, locationIndex, moveTo } from '../locations'
import type { FounderTaskType, V2GameState } from '../state'
import { canHire, canPromote, convinceToStay, generateCandidates, hireIntern, isFullTimeUnlocked, promoteMember, setAssignment, teamCapacity } from '../team'
import { buyPerk, canBuyPerk, canUpgradeSetup, nextSetup, perkDef, upgradeSetup, type Desk, type PerkId } from '../shop'
import { setWifi, toggleTool } from '../engine/infra'
import { MAIN_TASK } from '../work'
import { createV2State } from '../state'
import { stepV2 } from '../v2Tick'
import { makeConfig } from './fixtures'

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

const PERK_ORDER: PerkId[] = ['coffee', 'plants', 'decor', 'sofa', 'tableTennis', 'games']
const resting = new Set<string>()

/** The extra care a sensible manager takes: people, shop, infra (spec §5–§7). */
function manage(s: V2GameState): V2GameState {
  const burn = getMonthlyBurn(s)
  const spare = (price: number, months: number) => s.cash >= price + months * Math.max(burn - s.mrr, burn * 0.5)
  // Upgrade hosting before it overloads.
  const nextTier = s.v2.infra.hosting + 1
  if (hostingLoad(s) > 0.75 && nextTier <= 5 && canMigrate(s, nextTier) === 'ok') s = startMigration(s, nextTier, totalDays(s.gameTime))
  // Rest people before they burn out; talk leavers into staying.
  for (const m of Object.values(s.v2.team)) {
    if (m.leavingOn !== undefined && !m.convinced) s = convinceToStay(s, m.id)
    if ((m.stress ?? 0) > 70 && !resting.has(m.id)) { resting.add(m.id); s = setAssignment(s, m.id, 'idle') }
    else if (resting.has(m.id) && (m.stress ?? 0) < 35) { resting.delete(m.id); s = setAssignment(s, m.id, MAIN_TASK[m.role]) }
  }
  // One hire on support per 250 customers.
  const team = Object.values(s.v2.team).filter(m => !resting.has(m.id))
  const onSupport = team.filter(m => m.assignment === 'support').length
  const want = Math.min(team.length - 1, Math.ceil(s.customers / 250))
  if (onSupport < want) { const m = team.find(x => x.assignment !== 'support' && x.role !== 'sales'); if (m) s = setAssignment(s, m.id, 'support') }
  // Shop: perks, then computers (founder first).
  for (const id of PERK_ORDER) if (canBuyPerk(s, id) === 'ok' && spare(perkDef(id).price, 3)) s = buyPerk(s, id)
  const desks: Desk[] = ['founder', ...Object.values(s.v2.team).map(m => m.seat)]
  for (const d of desks) { const n = nextSetup(s, d); if (n && n.tier <= 3 && canUpgradeSetup(s, d) === 'ok' && spare(n.price, 4)) s = upgradeSetup(s, d) }
  // Infra: fiber once there's a team, tools when they pay off.
  if (s.v2.infra.wifi === 'home' && Object.keys(s.v2.team).length >= 3 && spare(80, 6)) s = setWifi(s, 'fiber')
  if (!s.v2.infra.tools.includes('helpdesk') && s.customers > 150 && spare(100, 6)) s = toggleTool(s, 'helpdesk')
  if (!s.v2.infra.tools.includes('monitoring') && s.techDebt > 40 && spare(150, 6)) s = toggleTool(s, 'monitoring')
  return s
}

/** A sensible, not optimal, player. `careful` also answers support, pays down debt and manages people/shop/infra. */
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


  if (careful) s = manage(s)

  // Promote anyone ready, then move up when it's safely affordable.
  for (const id of Object.keys(s.v2.team)) if (canPromote(s, id) === 'ok' && s.mrr > getMonthlyBurn(s)) s = promoteMember(s, id)
  const next = LOCATIONS[locationIndex(s.v2.location) + 1]
  if (next && canMove(s, next.id) === 'ok' && s.cash >= next.moveIn + 2 * (getMonthlyBurn(s) - s.infraCostMonthly + next.rent)) {
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
    it(`seed ${seed}: a sensible manager reaches Co-working within two years without going broke`, () => {
      const rng = seeded(seed)
      vi.spyOn(Math, 'random').mockImplementation(rng)
      resting.clear()
      let s = createV2State(makeConfig()) // real start: XP laptops, free hosting
      const reached: Record<string, number> = {}
      for (let h = 0; h < 730 * 24 && s.phase === 'playing'; h++) {
        if (h % 6 === 0) s = play(s, rng, true)
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
      // The manager really used the shop and infra (guards against them silently breaking).
      expect(s.v2.perks.length).toBeGreaterThan(0)
      expect(s.v2.setups.founder).toBeGreaterThanOrEqual(2)
      expect(s.v2.infra.hosting).toBeGreaterThanOrEqual(3)
      expect(reached.coworking).toBeLessThanOrEqual(730)
      // …but not trivially: each rung takes real growth, not one windfall.
      expect(reached.biggerHome).toBeGreaterThanOrEqual(30)
      expect(reached.coworking - reached.biggerHome).toBeGreaterThanOrEqual(30)
      expect(Object.values(s.v2.team).some(m => m.tier === 'fulltime')).toBe(true)
    }, 60_000)
  }

  it('managing support, debt, people, shop and infra beats neglecting them', () => {
    const runFor = (careful: boolean) => {
      const rng = seeded(11)
      vi.spyOn(Math, 'random').mockImplementation(rng)
      resting.clear()
      let s = createV2State(makeConfig())
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
    expect(careful.phase).toBe('playing')
    expect(careful.customers).toBeGreaterThan(neglect.customers)
    expect(careful.v2.tickets).toBeLessThan(neglect.v2.tickets)
    // Neglect never upgrades hosting, so it's stuck under the free tier's 20-customer cap with outages.
    expect(neglect.v2.infra.hosting).toBe(1)
  }, 60_000)
})
