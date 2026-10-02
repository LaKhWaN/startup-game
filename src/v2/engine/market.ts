import type { DifficultyModifier } from '../../types'
import type { GameV2 } from './types'

type Tier = DifficultyModifier['tier']

/** Customers an idea can ever win, before features and brand grow it (spec §4). */
export const TIER_MARKET: Record<Tier, number> = { promising: 2000, competitive: 1200, risky: 700, brutal: 350 }

const SALES_BASE: Record<Tier, number> = { promising: 0.3, competitive: 0.25, risky: 0.2, brutal: 0.15 }

const tierOf = (s: Pick<GameV2, 'difficultyModifier'>): Tier => s.difficultyModifier?.tier ?? 'competitive'

/** Market ceiling: tier base × (1 + 5% per shipped feature) × (1 + brand/400). */
export function marketCeiling(s: Pick<GameV2, 'difficultyModifier' | 'features' | 'brand'>): number {
  const shipped = s.features.filter(f => f.status === 'completed').length
  return Math.round(TIER_MARKET[tierOf(s)] * (1 + 0.05 * shipped) * (1 + s.brand / 400))
}

/** Share of the market still out there to email: 1 when empty, never below 5%. */
export function leadSaturation(s: Pick<GameV2, 'difficultyModifier' | 'features' | 'brand' | 'customers' | 'v2'>): number {
  const taken = (s.customers + s.v2.leads) / marketCeiling(s)
  return Math.max(0.05, Math.min(1, 1 - taken))
}

/** Sales conversion before skill: better ideas are easier to sell. */
export function salesBase(tier: Tier): number {
  return SALES_BASE[tier]
}

export function salesBaseOf(s: Pick<GameV2, 'difficultyModifier'>): number {
  return SALES_BASE[tierOf(s)]
}

/** Late adopters are harder to sell: conversion × (1 − 0.5 × market share). */
export function shareFactor(s: Pick<GameV2, 'difficultyModifier' | 'features' | 'brand' | 'customers'>): number {
  return 1 - 0.5 * Math.min(1, s.customers / Math.max(1, marketCeiling(s)))
}

/** Customers you can still win. */
export function marketRoom(s: Pick<GameV2, 'difficultyModifier' | 'features' | 'brand' | 'customers'>): number {
  return Math.max(0, marketCeiling(s) - s.customers)
}

/** Bad reviews from an unanswered support queue scare buyers: conversion × (1 − backlog/customers × 0.5), floor 0.5. */
export function reputationFactor(s: Pick<GameV2, 'customers' | 'v2'>): number {
  const backlog = (s.v2.tickets ?? 0) / Math.max(20, s.customers)
  return Math.max(0.5, 1 - backlog * 0.5)
}
