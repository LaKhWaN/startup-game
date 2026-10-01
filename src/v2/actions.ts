import { playSfx } from '../audio/sfx'
import { createDefaultState } from '../engine/gameEngine'
import { useGameStore, type GameSpeed } from '../store/gameStore'
import type { OnboardingConfig } from '../types'
import { claimFamilyMoney as claimFamilyMoneyPure, dismissCard, onMoved, reshowCurrentCard } from './chapter'
import { startTask, type StartTaskError } from './founder'
import { loadGameV2, type SlotId } from './saveV2'
import { canMove, moveTo, type MoveCheck } from './locations'
import { createV2State, isV2Game, type Assignment, type FounderTaskType, type LocationId, type V2GameState, type V2Slice } from './state'
import {
  canHire, canPromote, fireMember, generateCandidates, hireIntern, isFullTimeUnlocked, promoteMember, setAssignment,
  type HireCheck, type PromoteCheck,
} from './team'
import { stepV2 } from './v2Tick'

type LegacyStore = ReturnType<typeof useGameStore.getState>
export type V2Store = LegacyStore & { v2: V2Slice }

/**
 * Selector hook over the shared store. The selector MUST return a stored
 * reference or a primitive. Never build arrays or objects inside it
 * (Zustand v5 would re-render forever).
 */
export function useV2<T>(selector: (s: V2Store) => T): T {
  return useGameStore(s => selector(s as V2Store))
}

export function getV2State(): V2Store {
  return useGameStore.getState() as V2Store
}

function setV2State(next: Partial<V2Store> | V2GameState): void {
  useGameStore.setState(next as Partial<LegacyStore>)
}

function syncAnalytics(state: V2GameState): void {
  void import('../analytics/persistDayAnalytics')
    .then(({ persistDayAnalytics }) => persistDayAnalytics(state))
    .catch(err => { console.error('[analytics] v2 sync failed', err) })
}

/** Called on /new mount and unmount so a game never leaks between routes. */
export function resetStoreForV2(): void {
  setV2State({ ...createDefaultState(), gameSpeed: 1, v2: undefined } as unknown as Partial<V2Store>)
}

export function stepGame(): void {
  useGameStore.setState(s => stepV2(s as V2Store))
}

export function newGameV2(config: OnboardingConfig): void {
  const next = { ...createV2State(config), gameSpeed: 1 as GameSpeed }
  playSfx('whoosh', 0.45)
  setV2State(next)
  syncAnalytics(next)
}

export function loadV2(slot: SlotId): boolean {
  const saved = loadGameV2(slot)
  if (!saved) return false
  playSfx('whoosh', 0.45)
  const next = { ...saved, gameSpeed: 1 as GameSpeed }
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

let speedBeforeModal: GameSpeed | null = null

export function pauseForModal(): void {
  const s = getV2State()
  if (speedBeforeModal === null) speedBeforeModal = s.gameSpeed === 0 ? 1 : s.gameSpeed
  setV2State({ gameSpeed: 0 })
}

export function claimFamilyMoney(): void {
  const next = claimFamilyMoneyPure(getV2State())
  playSfx('cashCredit', 0.7)
  setV2State({ ...next, gameSpeed: speedBeforeModal ?? 1 })
  speedBeforeModal = null
}

/**
 * Legacy PostMortem's "Play Again" calls the legacy quickRestart, which
 * builds a legacy-rules game. Inside /new, turn that into a v2 game.
 */
export function upgradeLegacyRestart(): void {
  const s = getV2State()
  if (s.phase !== 'playing' || isV2Game(s)) return
  if (s.lastConfig) newGameV2(s.lastConfig)
  else resetStoreForV2()
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
