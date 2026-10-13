/**
 * Three scripted players for balance runs (SIM_PERSONAS=1 npx vitest run src/v2/__tests__/personas.test.ts):
 * - easy: doesn't think about money. Hires anyone, moves and buys as soon as it can, ignores people.
 * - medium: keeps a sensible pipeline (dev, PM, marketing, sales, support) and stays profitable,
 *   but skips perks, computers, Wi-Fi, tools and people care.
 * - hard: medium plus everything else: perks, computers, Wi-Fi, tools, resting people, answering alerts.
 */
import { AD_BUDGETS, costPerLead, setAdsBudget } from '../engine/ads'
import { totalDays } from '../engine/clock'
import { applyEventChoice } from '../engine/events'
import { canMigrate, hostingLoad, setWifi, startMigration, toggleTool, type WifiPlan } from '../engine/infra'
import { monthlyBurn, valuation } from '../engine/money'
import { claimFamilyMoney, onMoved } from '../chapter'
import { applyRoadmap, canPlanRoadmap, fallbackEpics, roadmapCost } from '../epics'
import { pickResearchTemplates, startTask } from '../founder'
import { canMove, LOCATIONS, locationIndex, moveTo } from '../locations'
import { currentAlert, resolveAlert, type AlertChoice } from '../peopleAlerts'
import { buyPerk, canBuyPerk, canUpgradeSetup, nextSetup, PERKS, upgradeSetup, type Desk, type PerkId } from '../shop'
import type { FounderTaskType, Rng, TeamRole, V2GameState } from '../state'
import { canHire, canPromote, convinceToStay, fireMember, generateCandidates, hireIntern, isFullTimeUnlocked, promoteMember, refreshTier, setAssignment, teamCapacity } from '../team'
import { MAIN_TASK } from '../work'

export type Persona = 'easy' | 'medium' | 'hard'

export interface RunLog {
  quits: number
  fired: number
  maxTeam: number
  peakMrr: number
  brokeDay?: number
}

const net = (s: V2GameState) => s.mrr - monthlyBurn(s)
/** Months of cash at the current net burn (∞ when profitable). */
const runway = (s: V2GameState, extraBurn = 0) => {
  const n = monthlyBurn(s) + extraBurn - s.mrr
  return n <= 0 ? Infinity : s.cash / n
}

// ── Founder ─────────────────────────────────────────────────────────────────

function founder(s: V2GameState, p: Persona): V2GameState {
  if (s.v2.founder.task) return s
  const proposed = s.features.find(f => f.status === 'proposed' && !f.epic)
  const care = p !== 'easy'
  const order: [FounderTaskType, string | undefined][] = [
    ...(care && s.v2.tickets >= Math.max(5, s.customers * 0.05) ? [['support', undefined] as [FounderTaskType, undefined]] : []),
    ...(p === 'hard' && s.techDebt > 45 ? [['refactor', undefined] as [FounderTaskType, undefined]] : []),
    ...(s.v2.leads >= 6 ? [['sales', undefined] as [FounderTaskType, undefined]] : [['emails', undefined] as [FounderTaskType, undefined]]),
    ...(proposed ? [['develop', proposed.id] as [FounderTaskType, string]] : []),
    ['research', undefined], ['emails', undefined],
  ]
  for (const [type, id] of order) {
    const r = startTask(s, type, id)
    if (r.ok) return r.state
  }
  return s
}

// ── Events and people alerts ────────────────────────────────────────────────

/** The choice that doesn't end the game. */
function declineIndex(s: V2GameState): 0 | 1 {
  const a = applyEventChoice(s, 0)
  return a.phase === 'sold' ? 1 : 0
}

function answerEvent(s: V2GameState, p: Persona, rng: Rng): V2GameState {
  if (!s.pendingEvent) return s
  // Every player turns down acquisition offers so each run lasts the full two years.
  if (s.pendingEvent.id.startsWith('acquisition')) return applyEventChoice(s, declineIndex(s))
  if (p === 'easy') return applyEventChoice(s, rng() < 0.5 ? 0 : 1)
  if (p === 'medium') return applyEventChoice(s, 0)
  // Hard: look ahead at both and keep the better company.
  // …but never at the cost of the runway: under 3 months of costs in the bank is a disaster.
  const score = (x: V2GameState) => valuation(x) + x.customers * x.arpu * 6 - (x.churnShock ?? 0) * x.mrr
    - (x.cash < 3 * monthlyBurn(x) ? 1e9 : 0)
  const a = applyEventChoice(s, 0), b = applyEventChoice(s, 1)
  return score(a as V2GameState) >= score(b as V2GameState) ? a : b
}

function answerAlerts(s: V2GameState, p: Persona): V2GameState {
  for (let a = currentAlert(s), i = 0; a && i < 20; a = currentAlert(s), i++) {
    let choice: AlertChoice
    if (p !== 'hard') choice = a.kind === 'notice' ? 'letGo' : a.kind === 'atRisk' ? 'ignore' : 'keep'
    else choice = a.kind === 'notice' ? 'convince' : a.kind === 'atRisk' ? (a.reason === 'stress' ? 'timeOff' : 'raise') : 'topUp'
    s = resolveAlert(s, choice)
  }
  return s
}

// ── Team ────────────────────────────────────────────────────────────────────

/** The pipeline a thinking player wants: devs and PMs make product, marketing feeds sales, support keeps churn down. */
function wantedRole(s: V2GameState): TeamRole {
  const team = Object.values(s.v2.team)
  const count = (r: TeamRole) => team.filter(m => m.role === r).length
  const ideasLeft = pickResearchTemplates(s, () => 0, 1).templates.length > 0
  const epicsOpen = s.features.some(f => f.epic && f.status !== 'completed')
  const want: Record<TeamRole, number> = {
    sales: 1 + Math.floor(team.length * 0.3),
    marketing: 1 + Math.floor(team.length * 0.25),
    developer: 1 + Math.floor(team.length * (epicsOpen ? 0.3 : 0.15)),
    product_manager: ideasLeft ? 1 + Math.floor(team.length * 0.1) : 0,
    support: Math.ceil(s.customers / 400),
  }
  return (Object.keys(want) as TeamRole[]).map(r => ({ r, gap: want[r] - count(r) })).sort((x, y) => y.gap - x.gap)[0].r
}

function hire(s: V2GameState, p: Persona, rng: Rng): V2GameState {
  if (s.v2.candidates.length === 0) s = { ...s, v2: { ...s.v2, candidates: generateCandidates(rng, { fullTime: isFullTimeUnlocked(s) }) } }
  if (p === 'easy') {
    // Anyone, as long as there's a seat and the first month's pay.
    for (const c of [...s.v2.candidates]) if (canHire(s, c.id) === 'ok') s = hireIntern(s, c.id)
    if (s.v2.candidates.length === 0) s = { ...s, v2: { ...s.v2, candidates: generateCandidates(rng, { fullTime: isFullTimeUnlocked(s) }) } }
    return s
  }
  // Medium/hard: the role the pipeline needs, only while runway after the hire stays ≥ 4 months (or profitable).
  for (let tries = 0; tries < 6 && Object.keys(s.v2.team).length < teamCapacity(s); tries++) {
    const role = wantedRole(s)
    const pool = s.v2.candidates.filter(c => c.role === role).sort((a, b) => (b.tier === 'fulltime' ? 1 : 0) - (a.tier === 'fulltime' ? 1 : 0))
    const c = pool.find(x => canHire(s, x.id) === 'ok' && runway(s, x.salary) >= 4)
    if (c) { s = hireIntern(s, c.id); continue }
    if (pool.length === 0) { s = refreshTier(refreshTier(s, 'intern', rng), 'fulltime', rng); continue }
    break
  }
  return s
}

/** Medium/hard keep the team pointed at work that exists. */
function assign(s: V2GameState, p: Persona, log: RunLog): V2GameState {
  if (p === 'easy') return s
  const ideasLeft = pickResearchTemplates(s, () => 0, 1).templates.length > 0
  for (const m of Object.values(s.v2.team)) {
    if (p === 'hard' && m.assignment === 'idle') continue // resting
    let want = MAIN_TASK[m.role]
    if (m.role === 'product_manager' && !ideasLeft) want = 'emails'
    if (m.role === 'developer' && !s.features.some(f => f.status !== 'completed') && s.techDebt > 10) want = 'refactor'
    if (m.assignment !== want) s = setAssignment(s, m.id, want)
  }
  // One developer on refactor when debt is high.
  if (s.techDebt > 50) {
    const dev = Object.values(s.v2.team).find(m => m.role === 'developer' && m.assignment === 'develop')
    if (dev) s = setAssignment(s, dev.id, 'refactor')
  }
  // Losing money with < 2 months left: let the newest hire go.
  if (runway(s) < 2 && net(s) < 0 && Object.keys(s.v2.team).length > 1) {
    const newest = Object.values(s.v2.team).sort((a, b) => (b.hiredAtDay ?? 0) - (a.hiredAtDay ?? 0))[0]
    s = fireMember(s, newest.id)
    log.fired++
  }
  return s
}

const resting = new Map<string, boolean>()

function care(s: V2GameState): V2GameState {
  for (const m of Object.values(s.v2.team)) {
    if (m.leavingOn !== undefined && !m.convinced) s = convinceToStay(s, m.id)
    if ((m.stress ?? 0) > 65 && !resting.get(m.id)) { resting.set(m.id, true); s = setAssignment(s, m.id, 'idle') }
    else if (resting.get(m.id) && (m.stress ?? 0) < 30) { resting.delete(m.id); s = setAssignment(s, m.id, MAIN_TASK[m.role]) }
    // Promote only when the raise to full-time pay is still affordable.
    if (canPromote(s, m.id) === 'ok' && net(s) - Math.max(0, 3500 - m.salary) > 0) s = promoteMember(s, m.id)
  }
  return s
}

// ── Money decisions ─────────────────────────────────────────────────────────

const PERK_ORDER: PerkId[] = ['coffee', 'plants', 'decor', 'sofa', 'tableTennis', 'games']

function spend(s: V2GameState, p: Persona, rng: Rng): V2GameState {
  const spare = (price: number, months: number) => s.cash >= price + months * Math.max(monthlyBurn(s) - s.mrr, monthlyBurn(s) * 0.3)
  // Hosting: easy waits for outages, medium near full, hard ahead of time.
  const threshold = p === 'easy' ? 1.0 : p === 'medium' ? 0.9 : 0.75
  const nextTier = s.v2.infra.hosting + 1
  if (hostingLoad(s) > threshold && nextTier <= 5 && canMigrate(s, nextTier) === 'ok') s = startMigration(s, nextTier, totalDays(s.gameTime))

  if (p === 'easy') {
    // Impulse buys whenever there's cash for it.
    const perk = PERKS[Math.floor(rng() * PERKS.length)]
    if (canBuyPerk(s, perk.id) === 'ok' && s.cash > perk.price * 2) s = buyPerk(s, perk.id)
    const desks: Desk[] = ['founder', ...Object.values(s.v2.team).map(m => m.seat)]
    const d = desks[Math.floor(rng() * desks.length)]
    const n = nextSetup(s, d)
    if (n && canUpgradeSetup(s, d) === 'ok' && s.cash > n.price * 2) s = upgradeSetup(s, d)
    if (s.v2.infra.wifi !== 'business' && s.cash > 5000) s = setWifi(s, 'business')
    for (const t of ['helpdesk', 'monitoring', 'ci'] as const) if (!s.v2.infra.tools.includes(t) && s.cash > 10_000) s = toggleTool(s, t)
    if ((s.v2.adsBudget ?? 0) === 0 && s.cash > 40_000) s = setAdsBudget(s, 10_000)
    if (canPlanRoadmap(s) === 'ok') s = applyRoadmap(s, fallbackEpics((s.v2.roadmapRound ?? 0) + 1))
    return s
  }

  // Medium + hard: roadmap when out of ideas, ads once emails fade, both only if they leave a cushion.
  const cushion = p === 'hard' ? 3 : 2
  if (canPlanRoadmap(s) === 'ok' && pickResearchTemplates(s, () => 0, 1).templates.length === 0 && spare(roadmapCost(s), cushion)) {
    s = applyRoadmap(s, fallbackEpics((s.v2.roadmapRound ?? 0) + 1))
  }
  if (s.customers > 400) {
    const perCustomer = costPerLead(s) / 0.35
    const fit = [...AD_BUDGETS].reverse().find(b => b <= Math.max(0, net(s)) * (p === 'hard' ? 0.6 : 0.4) && perCustomer <= s.arpu * 4) ?? 0
    if (fit !== (s.v2.adsBudget ?? 0)) s = setAdsBudget(s, fit)
  } else if (s.v2.adsBudget) s = setAdsBudget(s, 0)
  if (p === 'medium') return s

  for (const id of PERK_ORDER) if (canBuyPerk(s, id) === 'ok' && spare(PERKS.find(x => x.id === id)!.price, 3)) s = buyPerk(s, id)
  const desks: Desk[] = ['founder', ...Object.values(s.v2.team).map(m => m.seat)]
  for (const d of desks) { const n = nextSetup(s, d); if (n && canUpgradeSetup(s, d) === 'ok' && spare(n.price, 4)) s = upgradeSetup(s, d) }
  const team = Object.keys(s.v2.team).length
  const wifi: WifiPlan = team >= 8 ? 'business' : team >= 3 ? 'fiber' : 'home'
  if (wifi !== s.v2.infra.wifi && wifi !== 'home' && spare(wifi === 'business' ? 800 : 250, 6)) s = setWifi(s, wifi)
  if (!s.v2.infra.tools.includes('helpdesk') && s.customers > 200 && spare(400, 6)) s = toggleTool(s, 'helpdesk')
  if (!s.v2.infra.tools.includes('monitoring') && s.techDebt > 35 && spare(600, 6)) s = toggleTool(s, 'monitoring')
  if (!s.v2.infra.tools.includes('ci') && Object.values(s.v2.team).filter(m => m.role === 'developer').length >= 3 && spare(800, 6)) s = toggleTool(s, 'ci')
  return s
}

function move(s: V2GameState, p: Persona): V2GameState {
  const next = LOCATIONS[locationIndex(s.v2.location) + 1]
  if (!next || canMove(s, next.id) !== 'ok') return s
  if (p === 'easy') return onMoved(moveTo(s, next.id))
  const full = Object.keys(s.v2.team).length >= teamCapacity(s) - (p === 'hard' ? 1 : 0)
  const months = p === 'hard' ? 3 : 2
  const monthCost = monthlyBurn(s) - s.infraCostMonthly + next.rent
  if (full && s.cash >= next.moveIn + months * Math.max(monthCost - s.mrr, monthCost * 0.3)) return onMoved(moveTo(s, next.id))
  return s
}

/** One decision point (every 6 game hours). */
export function act(s: V2GameState, p: Persona, rng: Rng, log: RunLog): V2GameState {
  s = answerEvent(s, p, rng)
  const ch = s.v2.chapter
  if (ch.beat === 5 && ch.familyMoney && !ch.familyMoney.claimed) s = claimFamilyMoney(s)
  s = answerAlerts(s, p)
  const hour = s.gameTime.totalHours % 24
  if (!(hour >= 23 || hour < 7)) s = founder(s, p)
  if (!ch.complete) return s
  if (p === 'hard') s = care(s)
  s = spend(s, p, rng)
  s = move(s, p)
  s = hire(s, p, rng)
  s = assign(s, p, log)
  return s
}

export function resetPersonaMemory(): void { resting.clear() }
