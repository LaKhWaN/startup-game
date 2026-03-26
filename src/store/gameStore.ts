import { create } from 'zustand'
import type { GameState, OnboardingConfig } from '../types'
import { playSfx } from '../audio/sfx'
import {
  createInitialState,
  createDefaultState,
  tick,
  applyEventChoice,
  hireEmployee,
  fireEmployee,
  assignFeatureToDev,
  launchCampaign,
  buyDesk,
  startRefactorSprint,
  getCompanyValuation,
  totalDays,
} from '../engine/gameEngine'
import { generateCandidatePool } from '../data/candidates'
import { loadGame, type SlotId } from '../save/saveManager'

export type GameSpeed = 0 | 1 | 2 | 3 | 5 | 10 | 50   // 0 = paused

interface GameStore extends GameState {
  gameSpeed: GameSpeed
  setSpeed: (speed: GameSpeed) => void

  startGame: (config: OnboardingConfig) => void
  restartGame: () => void
  quickRestart: () => void

  tick: () => void

  chooseEvent: (index: 0 | 1) => void

  hire: (candidateId: string) => void
  fire: (employeeId: string) => void
  refreshCandidates: () => void
  buyDesk: () => void

  assignFeature: (featureId: string, devId: string) => void
  startRefactor: (devId: string) => void

  launchCampaign: (templateId: string, employeeId: string) => void

  sellCompany: () => void

  loadSave: (slot: SlotId) => void

  dismissMilestoneToast: (triggeredAt: number) => void
  dismissCampaignResult: (completedAtDay: number) => void
  dismissFeatureResult: (completedAtDay: number) => void
}

export const useGameStore = create<GameStore>((set) => ({
  ...createDefaultState(),

  gameSpeed: 1,
  setSpeed: (speed) => { playSfx('click', 0.35); set({ gameSpeed: speed }) },

  startGame: (config: OnboardingConfig) =>
    set(() => {
      playSfx('whoosh', 0.45)
      const next = { ...createInitialState(config), gameSpeed: 1 as const }
      void import('../analytics/persistDayAnalytics')
        .then(({ persistDayAnalytics }) => persistDayAnalytics(next))
        .catch((err) => { console.error('[analytics] day-0 sync failed', err) })
      return next
    }),

  restartGame: () =>
    set(() => { playSfx('click', 0.45); return { ...createDefaultState(), gameSpeed: 1 } }),

  quickRestart: () =>
    set((s) => {
      playSfx('click', 0.45)
      const config = s.lastConfig
      if (!config) return { ...createDefaultState(), gameSpeed: 1 as const }
      return { ...createInitialState(config), gameSpeed: 1 as const, lastConfig: config }
    }),

  tick: () =>
    set((s) => tick(s)),

  chooseEvent: (index) =>
    set((s) => { playSfx('click', 0.55); return applyEventChoice(s, index) }),

  hire: (candidateId) =>
    set((s) => { playSfx('success1', 0.7); return hireEmployee(s, candidateId) }),

  fire: (employeeId) =>
    set((s) => { playSfx('fired', 0.75); return fireEmployee(s, employeeId) }),

  refreshCandidates: () =>
    set(() => { playSfx('click', 0.45); return { candidates: generateCandidatePool(6) } }),

  buyDesk: () =>
    set((s) => { playSfx('cashDebit', 0.6); return buyDesk(s) }),

  assignFeature: (featureId, devId) =>
    set((s) => { playSfx('whoosh', 0.55); return assignFeatureToDev(s, featureId, devId) }),

  startRefactor: (devId) =>
    set((s) => { playSfx('whoosh', 0.55); return startRefactorSprint(s, devId) }),

  launchCampaign: (templateId, employeeId) =>
    set((s) => { playSfx('whoosh', 0.6); return launchCampaign(s, templateId, employeeId) }),

  sellCompany: () =>
    set((s) => {
      if (s.phase !== 'playing') return s
      const { valuation } = getCompanyValuation(s)
      playSfx('success1', 0.8)
      const next = {
        ...s,
        phase: 'sold' as const,
        soldAt: { day: totalDays(s.gameTime), valuation },
      }
      queueMicrotask(() => {
        void import('../analytics/persistDayAnalytics')
          .then(({ persistDayAnalytics }) => persistDayAnalytics(next))
          .catch((err) => { console.error('[analytics] sell sync failed', err) })
      })
      return next
    }),

  loadSave: (slot) =>
    set(() => {
      const saved = loadGame(slot)
      if (!saved) return {}
      playSfx('whoosh', 0.45)
      const next = { ...saved, gameSpeed: 1 } as GameStore
      void import('../analytics/persistDayAnalytics')
        .then(({ persistDayAnalytics }) => persistDayAnalytics(next))
        .catch((err) => { console.error('[analytics] load sync failed', err) })
      return next as Partial<GameStore>
    }),

  dismissMilestoneToast: (triggeredAt) =>
    set((s) => ({
      pendingMilestoneToasts: s.pendingMilestoneToasts.filter(t => t.triggeredAt !== triggeredAt),
    })),

  dismissCampaignResult: (completedAtDay) =>
    set((s) => ({
      recentCampaignResults: s.recentCampaignResults.filter(r => r.completedAtDay !== completedAtDay),
    })),

  dismissFeatureResult: (completedAtDay) =>
    set((s) => ({
      recentFeatureResults: s.recentFeatureResults.filter(r => r.completedAtDay !== completedAtDay),
    })),
}))
