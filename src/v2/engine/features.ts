import type { FeatureEffects } from '../../types'

/** S-curve: early features find few users, mid-size products the most, big products fewer. */
export function marketSaturationFactor(customers: number): number {
  if (customers <= 20) return 0.5
  if (customers <= 80) return 0.5 + (customers - 20) / 60 * 0.8
  if (customers <= 300) return 1.3
  if (customers <= 800) return 1.3 - (customers - 300) / 500 * 0.7
  return Math.max(0.25, 0.6 - (customers - 800) / 2000 * 0.35)
}

export interface FeatureEstimate {
  customers: number
  arpu: number
  churnDrop: number
  cashBonus: number
  brand: number
  techDebt: number
  mrrDelta: number
  productGain: number
}

/** Ported from the legacy engine: what shipping a feature does. */
export function estimateFeatureEffects(
  effects: FeatureEffects | undefined,
  value: 'low' | 'medium' | 'high',
  accuracy: number,
  currentArpu: number,
  currentCustomers: number,
  diffMult: number,
): FeatureEstimate {
  const eff = effects ?? {}
  const qualityMult = 0.6 + (accuracy / 10) * 0.6
  const satFact = marketSaturationFactor(currentCustomers)
  const rawCustomers = eff.customers ?? 0
  const customers = Math.round((rawCustomers > 0 ? rawCustomers * satFact : rawCustomers) * qualityMult * diffMult)
  const arpuChange = Math.round((eff.arpu ?? 0) * qualityMult)
  const newArpu = Math.max(10, currentArpu + arpuChange)
  const mrrDelta = (currentCustomers + customers) * newArpu - currentCustomers * currentArpu
  return {
    customers,
    arpu: arpuChange,
    churnDrop: -((eff.churnRate ?? 0) * diffMult),
    cashBonus: Math.round((eff.cashBonus ?? 0) * diffMult),
    brand: eff.brand ?? 0,
    techDebt: eff.techDebt ?? 0,
    mrrDelta: Math.round(mrrDelta),
    productGain: Math.round((value === 'high' ? 6 : value === 'medium' ? 3 : 1) * diffMult),
  }
}
