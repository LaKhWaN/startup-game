import { playSfx } from '../audio/sfx'
import type { OnboardingConfig } from '../types'
import { syncAnalytics } from './analytics'
import { claimFamilyMoney as claimFamilyMoneyPure, dismissCard, onMoved, reshowCurrentCard } from './chapter'
import { applyEventChoice } from './engine/events'
import type { EventPatch } from './engine/eventData'
import { totalDays } from './engine/clock'
import { valuation } from './engine/money'
import { startTask, type StartTaskError } from './founder'
import { loadGameV2, type SlotId } from './saveV2'
import { canMove, moveTo, type MoveCheck } from './locations'
import { createSetupState, createV2State, type Assignment, type FounderTaskType, type LocationId, type Tier, type V2GameState } from './state'
import { gameStore, type GameSpeed, type V2Store } from './store'
import {
  canHire, canPromote, convinceToStay, fireMember, generateCandidates, hireIntern, isFullTimeUnlocked, promoteMember, refreshTier, setAssignment,
  type HireCheck, type PromoteCheck,
} from './team'
import { stepV2 } from './v2Tick'
import { resetUi, uiStore } from './ui'
import { canMigrate, setWifi, startMigration, toggleTool, type MigrateCheck, type ToolId, type WifiPlan } from './engine/infra'
import { setRaisePct } from './payroll'
import { applyRoadmap, canPlanRoadmap, EPIC_KIND_IDS, fallbackEpics, roadmapRound, type EpicSpec, type PlanCheck } from './epics'
import { setAdsBudget } from './engine/ads'
import { resolveAlert, type AlertChoice } from './peopleAlerts'
import { buyPerk, canBuyPerk, canUpgradeSetup, upgradeSetup, type Desk, type PerkCheck, type PerkId, type SetupCheck } from './shop'

export type { V2Store } from './store'

/**
 * Selector hook over the v2 store. The selector MUST return a stored
 * reference or a primitive. Never build arrays or objects inside it
 * (Zustand v5 would re-render forever).
 */
export function useV2<T>(selector: (s: V2Store) => T): T {
  return gameStore(selector)
}

export function getV2State(): V2Store {
  return gameStore.getState()
}

function setV2State(next: Partial<V2Store> | V2GameState): void {
  gameStore.setState(next as Partial<V2Store>)
}

/** Back to the onboarding screen with a clean store. */
export function resetStore(): void {
  gameStore.setState({ ...createSetupState(), gameSpeed: 1 }, true)
  resetUi()
}

export function stepGame(): void {
  const before = gameStore.getState()
  const next = stepV2(before)
  gameStore.setState(next)
  if (totalDays(next.gameTime) > totalDays(before.gameTime)) syncAnalytics(next)
}

export function newGameV2(config: OnboardingConfig): void {
  const next = { ...createV2State(config), gameSpeed: 1 as GameSpeed }
  resetUi()
  playSfx('whoosh', 0.45)
  setV2State(next)
  syncAnalytics(next)
}

export function loadV2(slot: SlotId): boolean {
  const saved = loadGameV2(slot)
  if (!saved) return false
  playSfx('whoosh', 0.45)
  const next = { ...saved, gameSpeed: 1 as GameSpeed }
  resetUi()
  setV2State(next)
  syncAnalytics(next)
  return true
}

export function startFounderTask(type: FounderTaskType, featureId?: string): StartTaskError | null {
  const result = startTask(getV2State(), type, featureId)
  if (!result.ok) return result.reason
  playSfx('click', 0.45)
  setV2State(result.state)
  return null
}

export function dismissCoachCard(id: string): void {
  setV2State(dismissCard(getV2State(), id))
}

export function reshowCoachCard(): void {
  setV2State(reshowCurrentCard(getV2State()))
}

export function claimFamilyMoney(): void {
  const next = claimFamilyMoneyPure(getV2State())
  playSfx('cashCredit', 0.7)
  setV2State(next)
}


export function answerPeopleAlert(choice: AlertChoice): void {
  setV2State(resolveAlert(getV2State(), choice))
}

export function convinceTeamMemberToStay(id: string): void {
  playSfx('success1', 0.6)
  setV2State(convinceToStay(getV2State(), id))
}

// ── Infra ────────────────────────────────────────────────────────────────────

export function migrateHosting(tier: number): MigrateCheck {
  const s = getV2State()
  const check = canMigrate(s, tier)
  if (check !== 'ok') return check
  playSfx('click', 0.5)
  setV2State(startMigration(s, tier, totalDays(s.gameTime)))
  return 'ok'
}

export function chooseWifi(plan: WifiPlan): void {
  setV2State(setWifi(getV2State(), plan))
}

export function toggleInfraTool(id: ToolId): void {
  setV2State(toggleTool(getV2State(), id))
}

/** Paid: ask the AI for the next roadmap of big projects (built-in list if it's unavailable). */
export async function planNextRoadmap(): Promise<PlanCheck | 'failed'> {
  const s = getV2State()
  const check = canPlanRoadmap(s)
  if (check !== 'ok') return check
  uiStore.setState({ planningRoadmap: true })
  try {
    const { generateEpics } = await import('../ai/gemini')
    const exclude = s.features.filter(f => f.epic).map(f => f.title)
    const ideas = await generateEpics(s.idea, s.ideaScore, roadmapRound(s) + 1, exclude)
    const kinds = new Set<string>(EPIC_KIND_IDS)
    const specs: EpicSpec[] = (ideas ?? []).filter(i => kinds.has(i.kind)).map(i => ({ ...i, kind: i.kind as EpicSpec['kind'] }))
    const now = getV2State()
    const next = applyRoadmap(now, specs.length >= 3 ? specs : fallbackEpics(roadmapRound(now) + 1))
    if (next === now) return canPlanRoadmap(now)
    setV2State(next)
    playSfx('success1', 0.6)
    return 'ok'
  } catch (err) {
    console.error('[roadmap] planning failed', err)
    return 'failed'
  } finally {
    uiStore.setState({ planningRoadmap: false })
  }
}

export function setAdBudget(budget: number): void {
  setV2State(setAdsBudget(getV2State(), budget))
}

export function setRaise(pct: number): void {
  setV2State(setRaisePct(getV2State(), pct))
}

// ── Shop ────────────────────────────────────────────────────────────────────

export function buyShopPerk(id: PerkId): PerkCheck {
  const s = getV2State()
  const check = canBuyPerk(s, id)
  if (check !== 'ok') return check
  playSfx('cashCredit', 0.5)
  setV2State(buyPerk(s, id))
  return 'ok'
}

export function upgradeDesk(desk: Desk): SetupCheck {
  const s = getV2State()
  const check = canUpgradeSetup(s, desk)
  if (check !== 'ok') return check
  playSfx('success1', 0.5)
  setV2State(upgradeSetup(s, desk))
  return 'ok'
}

export function setSpeed(speed: GameSpeed): void {
  setV2State({ gameSpeed: speed })
}

// ── Events, selling, restarting ─────────────────────────────────────────────

export function chooseEvent(index: 0 | 1, patch?: EventPatch): void {
  setV2State(applyEventChoice(getV2State(), index, patch))
}

/** Sell at the current valuation; ends the game. */
export function sellCompany(): void {
  const s = getV2State()
  setV2State({ phase: 'sold', soldAt: { day: totalDays(s.gameTime), valuation: valuation(s) } })
  syncAnalytics({ ...s, phase: 'sold' })
}

export function dismissFeatureResult(completedAtDay: number): void {
  const s = getV2State()
  setV2State({ recentFeatureResults: s.recentFeatureResults.filter(r => r.completedAtDay !== completedAtDay) })
}

/** "Play again" with the same idea. */
export function quickRestart(): void {
  const config = getV2State().lastConfig
  if (config) newGameV2(config)
  else resetStore()
}

// ── Team ────────────────────────────────────────────────────────────────────

export function refreshCandidates(rng: () => number = Math.random): void {
  const s = getV2State()
  setV2State({ v2: { ...s.v2, candidates: generateCandidates(rng, { fullTime: isFullTimeUnlocked(s) }) } })
}

/** Refresh just the intern list or just the full-time list. */
export function refreshCandidateTier(tier: Tier, rng: () => number = Math.random): void {
  setV2State(refreshTier(getV2State(), tier, rng))
}

export function ensureCandidates(): void {
  if (getV2State().v2.candidates.length === 0) refreshCandidates()
}

export function hireCandidate(id: string): HireCheck {
  const s = getV2State()
  const check = canHire(s, id)
  if (check !== 'ok') return check
  playSfx('success1', 0.6)
  setV2State(hireIntern(s, id))
  return 'ok'
}

export function fireTeamMember(id: string): void {
  playSfx('fired', 0.6)
  setV2State(fireMember(getV2State(), id))
}

export function assignTeamMember(id: string, assignment: Assignment): void {
  playSfx('click', 0.4)
  setV2State(setAssignment(getV2State(), id, assignment))
}

export function promoteTeamMember(id: string): PromoteCheck {
  const s = getV2State()
  const check = canPromote(s, id)
  if (check !== 'ok') return check
  playSfx('success1', 0.6)
  setV2State(promoteMember(s, id))
  return 'ok'
}

// ── Map ─────────────────────────────────────────────────────────────────────

export function moveToLocation(id: LocationId): MoveCheck {
  const s = getV2State()
  const check = canMove(s, id)
  if (check !== 'ok') return check
  playSfx('whoosh', 0.5)
  const moved = onMoved(moveTo(s, id))
  setV2State(moved)
  // Moving into full-time territory opens a fresh hiring pool.
  if (isFullTimeUnlocked(moved) && !moved.v2.candidates.some(c => c.tier === 'fulltime')) refreshCandidates()
  return 'ok'
}
