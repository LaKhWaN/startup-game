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
import { createSetupState, createV2State, type Assignment, type FounderTaskType, type LocationId, type V2GameState } from './state'
import { gameStore, type GameSpeed, type V2Store } from './store'
import {
  canHire, canPromote, convinceToStay, fireMember, generateCandidates, hireIntern, isFullTimeUnlocked, promoteMember, setAssignment,
  type HireCheck, type PromoteCheck,
} from './team'
import { skipToMorning, stepV2 } from './v2Tick'
import { resetUi } from './ui'
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

/** ⏭ Skip to morning: run the closed hours until the office opens (stops on an event). */
export function skipNight(): void {
  const familyMoneyUp = (s: V2GameState) => s.v2.chapter.beat === 5 && !!s.v2.chapter.familyMoney && !s.v2.chapter.familyMoney.claimed
  const next = skipToMorning(getV2State(), Math.random, familyMoneyUp, syncAnalytics)
  setV2State(next)
}

export function toggleWorkLate(): void {
  const s = getV2State()
  setV2State({ v2: { ...s.v2, founder: { ...s.v2.founder, workLate: !s.v2.founder.workLate } } })
}

export function convinceTeamMemberToStay(id: string): void {
  playSfx('success1', 0.6)
  setV2State(convinceToStay(getV2State(), id))
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
