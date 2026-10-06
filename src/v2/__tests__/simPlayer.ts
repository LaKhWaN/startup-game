/** A sensible, scripted player shared by the balance tests and the sim probe. */
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
import { AD_BUDGETS, costPerLead, setAdsBudget } from '../engine/ads'
import { applyRoadmap, canPlanRoadmap, fallbackEpics, roadmapCost } from '../epics'
import { pickResearchTemplates } from '../founder'
import { MAIN_TASK } from '../work'
import { createV2State } from '../state'
import { stepV2 } from '../v2Tick'
import { makeConfig } from './fixtures'

/** mulberry32: small seeded PRNG so the run is repeatable. */
export function seeded(seed: number): () => number {
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
export const resting = new Set<string>()
/** Off = a player who hires and runs the business but never rests people, buys perks or talks leavers round. */
export const care = { people: true, ads: true }

/** The extra care a sensible manager takes: people, shop, infra (spec §5–§7). */
function manage(s: V2GameState): V2GameState {
  const burn = getMonthlyBurn(s)
  const spare = (price: number, months: number) => s.cash >= price + months * Math.max(burn - s.mrr, burn * 0.5)
  // Upgrade hosting before it overloads.
  const nextTier = s.v2.infra.hosting + 1
  if (hostingLoad(s) > 0.75 && nextTier <= 5 && canMigrate(s, nextTier) === 'ok') s = startMigration(s, nextTier, totalDays(s.gameTime))
  // Rest people before they burn out; talk leavers into staying.
  for (const m of care.people ? Object.values(s.v2.team) : []) {
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
  for (const id of care.people ? PERK_ORDER : []) if (canBuyPerk(s, id) === 'ok' && spare(perkDef(id).price, 3)) s = buyPerk(s, id)
  const desks: Desk[] = ['founder', ...Object.values(s.v2.team).map(m => m.seat)]
  for (const d of desks) { const n = nextSetup(s, d); if (n && n.tier <= 3 && canUpgradeSetup(s, d) === 'ok' && spare(n.price, 4)) s = upgradeSetup(s, d) }
  // Infra: fiber once there's a team, tools when they pay off.
  if (s.v2.infra.wifi === 'home' && Object.keys(s.v2.team).length >= 3 && spare(250, 6)) s = setWifi(s, 'fiber')
  if (!s.v2.infra.tools.includes('helpdesk') && s.customers > 150 && spare(400, 6)) s = toggleTool(s, 'helpdesk')
  if (!s.v2.infra.tools.includes('monitoring') && s.techDebt > 40 && spare(600, 6)) s = toggleTool(s, 'monitoring')
  // Out of ideas: plan the next roadmap when it's affordable with 3 months of cushion.
  if (canPlanRoadmap(s) === 'ok' && pickResearchTemplates(s, () => 0, 1).templates.length === 0 && spare(roadmapCost(s), 3)) s = applyRoadmap(s, fallbackEpics((s.v2.roadmapRound ?? 0) + 1))
  // Ads once emails dry up: the biggest budget under 10% of MRR whose leads still pay back within ~4 months.
  if (care.ads && s.customers > 500) {
    const perCustomer = costPerLead(s) / 0.35
    const fit = [...AD_BUDGETS].reverse().find(b => b <= s.mrr * 0.1 && perCustomer <= s.arpu * 4) ?? 0
    if (fit !== (s.v2.adsBudget ?? 0)) s = setAdsBudget(s, fit)
  }
  return s
}

/** A sensible, not optimal, player. `careful` also answers support, pays down debt and manages people/shop/infra. */
export function play(s: V2GameState, rng: () => number, careful = false): V2GameState {
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

