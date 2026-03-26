import type { GameState, Employee, Feature, GameEvent, GameTime, ActiveCampaign, CampaignResult, FeatureResult, MetricsSnapshot, OnboardingConfig, MilestoneToastEntry } from '../types'
import { EVENTS } from '../data/events'
import { FEATURE_TEMPLATES } from '../data/featureTemplates'
import type { FeatureTemplate } from '../data/featureTemplates'
import { CAMPAIGN_TEMPLATES } from '../data/campaigns'
import { generateCandidatePool } from '../data/candidates'
import { scoreToDifficulty } from '../ai/gemini'
import { MILESTONES } from '../data/milestones'

// ─── Time helpers ────────────────────────────────────────────────────────────

export const HOURS_PER_DAY   = 24
export const DAYS_PER_MONTH  = 30
export const MONTHS_PER_YEAR = 12

export function totalDays(t: GameTime)   { return Math.floor(t.totalHours / HOURS_PER_DAY) }
export function totalMonths(t: GameTime) { return Math.floor(t.totalHours / (HOURS_PER_DAY * DAYS_PER_MONTH)) }
export function dayOfMonth(t: GameTime)  { return (totalDays(t) % DAYS_PER_MONTH) + 1 }
export function monthOfYear(t: GameTime) { return (totalMonths(t) % MONTHS_PER_YEAR) + 1 }
export function yearNumber(t: GameTime)  { return Math.floor(totalMonths(t) / MONTHS_PER_YEAR) + 1 }

// ─── Initial state ───────────────────────────────────────────────────────────

const WORKSPACE_CONFIG = {
  home:      { cash: 120_000, desks: 2, infra: 200,   brand: 10, culture: 60 },
  coworking: { cash: 100_000, desks: 4, infra: 1_000, brand: 10, culture: 60 },
  office:    { cash: 80_000,  desks: 6, infra: 2_500, brand: 20, culture: 70 },
} as const

export function createInitialState(config: OnboardingConfig): GameState {
  const ws = WORKSPACE_CONFIG[config.workspace]
  const diff = config.difficulty
  const initialSnapshot: MetricsSnapshot = {
    day: 0,
    mrr: 0,
    customers: 0,
    churnRate: Math.max(diff.churnFloor, 12),
    cash: ws.cash,
    burn: ws.infra,
    runway: ws.infra <= 0 ? 999 : Math.floor(ws.cash / ws.infra),
    arpu: 50,
    brand: ws.brand,
    techDebt: 0,
    productProgress: 5,
    teamSize: 0,
    culture: ws.culture,
    valuation: ws.cash,
  }

  return {
    phase: 'playing',
    startupName: config.startupName,
    gameTime: { totalHours: 0 },

    cash: ws.cash,
    mrr: 0,
    arpu: 50,
    infraCostMonthly: ws.infra,

    customers: 0,
    churnRate: Math.max(diff.churnFloor, 12),
    customersLostLastMonth: 0,

    productProgress: 5,

    employees: [],
    candidates: generateCandidatePool(6),
    deskCount: ws.desks,

    culture:          ws.culture,
    techDebt:         0,
    brand:            ws.brand,
    equity:           100,
    investorInterest: 0,
    refactorDevId:    undefined,
    refactorProgress: 0,

    features: [],
    featureRoadmap: config.aiRoadmap,
    featureRoadmapIndex: 0,

    activeCampaigns: [],
    completedCampaignIds: [],
    recentCampaignResults: [],
    recentFeatureResults: [],

    pendingEvent: null,
    usedEventIds: [],
    lastEventDay: 0,

    storyLog: [{ day: 0, lines: [
      `${config.startupName} is founded. You have $${ws.cash.toLocaleString()} and a blank slate.`,
      `Idea: "${config.idea.slice(0, 80)}${config.idea.length > 80 ? '...' : ''}"`,
      `Difficulty: ${diff.tier.charAt(0).toUpperCase() + diff.tier.slice(1)}. Build, grow, and sell your company for the highest valuation.`,
    ] }],
    decisionHistory: [],
    metricsHistory: [initialSnapshot],
    fullMetricsHistory: [initialSnapshot],

    gameId: `game-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,

    earlyGoalReached: false,

    completedMilestoneIds: [],
    pendingMilestoneToasts: [],

    idea: config.idea,
    ideaScore: config.ideaScore,
    workspace: config.workspace,
    difficultyModifier: diff,
    lastConfig: config,
  }
}

/** Creates a default initial state for store init (before onboarding completes) */
export function createDefaultState(): GameState {
  const defaultConfig: OnboardingConfig = {
    idea: '', ideaScore: 5, ideaFeedback: '', workspace: 'coworking',
    startupName: '', aiRoadmap: FEATURE_TEMPLATES, difficulty: scoreToDifficulty(5),
  }
  return { ...createInitialState(defaultConfig), phase: 'setup' as const }
}

// ─── Main tick (called every real second = 1 game hour) ──────────────────────

export function tick(state: GameState): GameState {
  if (state.phase !== 'playing') return state
  // Pause time while an event is waiting to be resolved
  if (state.pendingEvent) return state

  const prevHours = state.gameTime.totalHours
  const newHours  = prevHours + 1
  const newTime: GameTime = { totalHours: newHours }

  const prevDay   = Math.floor(prevHours / HOURS_PER_DAY)
  const newDay    = Math.floor(newHours  / HOURS_PER_DAY)
  const prevMonth = Math.floor(prevHours / (HOURS_PER_DAY * DAYS_PER_MONTH))
  const newMonth  = Math.floor(newHours  / (HOURS_PER_DAY * DAYS_PER_MONTH))

  let s: GameState = { ...state, gameTime: newTime }

  if (newDay > prevDay) {
    s = processDayTick(s, newDay)
  }

  if (newMonth > prevMonth) {
    s = processMonthTick(s, newMonth)
  }

  return s
}

// ─── Daily tick ──────────────────────────────────────────────────────────────

function processDayTick(state: GameState, day: number): GameState {
  let s = { ...state }
  const storyLines: string[] = []

  let employees = [...s.employees]
  let features  = [...s.features]

  // ── Product Managers: discover features ────────────────────────────────────
  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i]
    if (emp.role !== 'product_manager') continue

    const speed         = emp.stats.speed ?? 5
    const ideaInterval  = Math.max(1, 8 / speed)            // days per idea
    const proposedCount = features.filter(f => f.status === 'proposed').length
    if (proposedCount >= 5) {
      employees[i] = { ...emp }  // backlog full — PM waits
      continue
    }
    const newProgress   = emp.ideaProgress + (1 / ideaInterval)

    if (newProgress >= 1) {
      const pick = pickNextFeatureFromRoadmap({ ...s, features })
      if (pick) {
        const { template, newIndex } = pick
        s = { ...s, featureRoadmapIndex: newIndex }

        const communication = emp.stats.communication ?? 5
        const variance  = 1 + ((Math.random() - 0.5) * (1 - communication / 10))
        const baseDays  = Math.max(1, Math.round(template.baseDays * variance))

        const newFeature: Feature = {
          id:               `feat-${Date.now()}-${i}`,
          title:            template.title,
          description:      template.description,
          baseDays,
          value:            template.value,
          impacts:          template.impacts,
          effects:          template.effects,
          tradeoffHint:     template.tradeoffHint,
          discoveredByPMId: emp.id,
          status:           'proposed',
          buildProgress:    0,
          discoveredAtDay:  day,
        }
        features = [...features, newFeature]
        storyLines.push(`${emp.name} (PM) proposed a new feature: "${template.title}"`)
      }
      employees[i] = { ...emp, ideaProgress: 0 }
    } else {
      employees[i] = { ...emp, ideaProgress: newProgress }
    }
  }

  // ── Developers: build assigned features or refactor ────────────────────────
  let techDebt = s.techDebt
  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i]
    if (emp.role !== 'developer' || emp.status !== 'busy') continue

    // Refactor sprint
    if (emp.isRefactoring) {
      const newRefactorProgress = s.refactorProgress + (1 / 14)
      if (newRefactorProgress >= 1) {
        techDebt = Math.max(0, techDebt - 35)
        employees[i] = { ...emp, status: 'idle', isRefactoring: false }
        s = { ...s, refactorDevId: undefined, refactorProgress: 0 }
        storyLines.push(`${emp.name} finished refactoring. Tech debt reduced significantly.`)
      } else {
        s = { ...s, refactorProgress: newRefactorProgress }
        employees[i] = { ...emp }
      }
      continue
    }

    if (!emp.currentFeatureId) continue
    const featureIdx = features.findIndex(f => f.id === emp.currentFeatureId)
    if (featureIdx === -1) continue

    const feat  = features[featureIdx]
    const speed = emp.stats.speed ?? 5

    // Morale and tech debt affect build speed
    const moraleFactor = emp.morale >= 80 ? 1.1 : emp.morale >= 50 ? 1.0 : emp.morale >= 30 ? 0.85 : 0.7
    const debtFactor   = techDebt >= 80 ? 0.6 : techDebt >= 50 ? 0.8 : 1.0

    const actualDays    = feat.baseDays / (speed / 5)
    const dailyProgress = (1 / actualDays) * moraleFactor * debtFactor
    const newProgress   = feat.buildProgress + dailyProgress

    if (newProgress >= 1) {
      features[featureIdx] = { ...feat, status: 'completed', buildProgress: 1, completedAtDay: day }
      employees[i] = { ...emp, status: 'idle', currentFeatureId: undefined, ideaProgress: 0,
        morale: Math.min(100, emp.morale + 12) }

      const diffMult = s.difficultyModifier?.featureImpactMultiplier ?? 1.0
      const impact = featureImpact(feat, emp, diffMult, s.customers)
      const churnFloor = s.difficultyModifier?.churnFloor ?? 3
      const baseDebtGain = (feat.value === 'high' ? 3 : feat.value === 'medium' ? 2 : 1)
        + Math.max(0, (10 - speed) * 0.4)
        + (emp.stress > 70 ? 2 : 0)
      techDebt = Math.min(100, Math.max(0, techDebt + baseDebtGain + impact.techDebtChange))

      s = {
        ...s,
        customers:       Math.max(0, s.customers + impact.customerGain),
        productProgress: Math.min(100, s.productProgress + impact.progressGain),
        churnRate:       Math.max(churnFloor, s.churnRate - impact.churnDrop),
        brand:           Math.max(0, Math.min(100, s.brand + impact.brandChange)),
        cash:            s.cash + impact.cashBonus,
        arpu:            Math.max(10, s.arpu + impact.arpuChange),
      }
      // All team gets a small morale boost from shipped feature
      for (let j = 0; j < employees.length; j++) {
        if (j !== i) employees[j] = { ...employees[j], morale: Math.min(100, employees[j].morale + 3) }
      }
      const featResult: FeatureResult = {
        featureTitle:   feat.title,
        value:          feat.value,
        devName:        emp.name,
        customerGain:   impact.customerGain,
        arpuChange:     impact.arpuChange,
        churnDrop:      impact.churnDrop,
        brandChange:    impact.brandChange,
        techDebtChange: impact.techDebtChange,
        cashBonus:      impact.cashBonus,
        completedAtDay: day,
      }
      s = {
        ...s,
        recentFeatureResults: [featResult, ...s.recentFeatureResults].slice(0, 3),
      }

      const parts = [`${emp.name} shipped "${feat.title}"!`]
      if (impact.customerGain > 0) parts.push(`+${impact.customerGain} users`)
      else if (impact.customerGain < 0) parts.push(`${impact.customerGain} users`)
      if (impact.arpuChange > 0) parts.push(`+$${impact.arpuChange} ARPU`)
      else if (impact.arpuChange < 0) parts.push(`-$${Math.abs(impact.arpuChange)} ARPU`)
      if (impact.churnDrop > 0) parts.push(`-${impact.churnDrop.toFixed(1)}% churn`)
      storyLines.push(parts.join(' '))
    } else {
      features[featureIdx] = { ...feat, buildProgress: newProgress }
      employees[i] = { ...emp }
    }
  }

  // ── Sales: close deals ─────────────────────────────────────────────────────
  const custMult = s.difficultyModifier?.customerMultiplier ?? 1.0
  const churnFloorGlobal = s.difficultyModifier?.churnFloor ?? 3
  const satFactor = marketSaturationFactor(s.customers)
  let newCustomers = s.customers
  for (const emp of employees) {
    if (emp.role !== 'sales') continue
    const persuasion = emp.stats.persuasion ?? 5
    const network    = emp.stats.network ?? 5
    const chance = ((persuasion + network) / 20) * 0.03 * custMult * satFactor
    if (Math.random() < chance) {
      newCustomers += 1
      storyLines.push(`${emp.name} (Sales) closed a new customer.`)
    }
    const persistence = emp.stats.persistence ?? 5
    s = { ...s, churnRate: Math.max(churnFloorGlobal, s.churnRate - persistence / 3000) }
  }

  // ── Marketing: grow organic + reduce churn ─────────────────────────────────
  for (const emp of employees) {
    if (emp.role !== 'marketing') continue
    const consistency = emp.stats.consistency ?? 5
    const reach       = emp.stats.reach ?? 5
    const analytics   = emp.stats.analytics ?? 5

    s = { ...s, churnRate: Math.max(churnFloorGlobal, s.churnRate - (consistency + analytics) / 6000) }

    const organicChance = (reach / 1000) * custMult * satFactor
    if (Math.random() < organicChance) {
      newCustomers += 1
    }
  }

  // ── Active campaigns: advance progress + complete ─────────────────────────
  let activeCampaigns  = [...s.activeCampaigns]
  let completedCampaignIds = [...s.completedCampaignIds]

  for (let i = activeCampaigns.length - 1; i >= 0; i--) {
    const camp = activeCampaigns[i]
    const newProgress = camp.progress + (1 / camp.durationDays)

    if (newProgress >= 1) {
      const emp = employees.find(e => e.id === camp.assignedEmployeeId)
      const quality = emp ? campaignQuality(emp, camp.templateId) : 0.5
      const spread  = camp.expectedMax - camp.expectedMin
      const campEff = s.difficultyModifier?.campaignEffectiveness ?? 1.0
      const luck   = 0.2 + Math.random() * 1.1
      const campSat = marketSaturationFactor(newCustomers)
      const gained = Math.round(
        (camp.expectedMin + spread * quality * luck) * campEff * campSat
      )

      newCustomers = Math.max(0, newCustomers + gained)

      const campResult: CampaignResult = {
        name:           camp.name,
        gained,
        expectedMin:    camp.expectedMin,
        expectedMax:    camp.expectedMax,
        completedAtDay: day,
      }
      s = {
        ...s,
        recentCampaignResults: [campResult, ...s.recentCampaignResults].slice(0, 3),
      }

      if (camp.churnEffect) {
        s = { ...s, churnRate: Math.max(churnFloorGlobal, Math.min(60, s.churnRate + camp.churnEffect)) }
      }

      storyLines.push(
        `"${camp.name}" campaign finished. +${gained} customers.${camp.churnEffect ? ` Churn ${camp.churnEffect > 0 ? '+' : ''}${camp.churnEffect}%.` : ''}`
      )

      // Free the employee
      employees = employees.map(e =>
        e.id === camp.assignedEmployeeId
          ? { ...e, status: 'idle' as const, currentCampaignId: undefined }
          : e
      )

      completedCampaignIds = [...completedCampaignIds, camp.templateId]
      activeCampaigns.splice(i, 1)
    } else {
      activeCampaigns[i] = { ...camp, progress: newProgress }
    }
  }

  // ── Employee morale / stress / XP ─────────────────────────────────────────
  const runway = getRunwayMonths({ ...s, employees })
  let totalMorale = 0

  for (let i = 0; i < employees.length; i++) {
    let { morale, stress, xp, level } = employees[i]
    const busy = employees[i].status === 'busy'

    // Stress
    let stressDelta = busy ? 1.5 : -0.8
    if (runway < 3)    stressDelta += 2
    if (s.cash < 10000) stressDelta += 3
    stress = Math.max(0, Math.min(100, stress + stressDelta))

    // Morale
    let moraleDelta = -0.15
    if (stress > 90) moraleDelta -= 2
    else if (stress > 70) moraleDelta -= 1.2
    if (morale > 75 && stress < 40) moraleDelta += 0.3
    morale = Math.max(0, Math.min(100, morale + moraleDelta))

    // XP
    xp += busy ? 8 : 2
    const newLevel = xpToLevel(xp)
    if (newLevel > level) {
      // Level up: boost primary stat
      const statKeys = Object.keys(employees[i].stats)
      const topStat  = statKeys.reduce((a, b) => employees[i].stats[a] > employees[i].stats[b] ? a : b)
      const newStats = { ...employees[i].stats, [topStat]: Math.min(10, employees[i].stats[topStat] + 1) }
      storyLines.push(`${employees[i].name} reached level ${newLevel}! ${topStat} improved.`)
      employees[i] = { ...employees[i], morale, stress, xp, level: newLevel, stats: newStats }
    } else {
      employees[i] = { ...employees[i], morale, stress, xp, level }
    }

    // Tech debt grows slowly from stressed devs
    if (employees[i].role === 'developer' && stress > 70) {
      techDebt = Math.min(100, techDebt + 0.12)
    }

    totalMorale += morale
  }

  // ── Culture ────────────────────────────────────────────────────────────────
  let culture = s.culture
  if (employees.length > 0) {
    const avgMorale = totalMorale / employees.length
    // Culture slowly converges toward team morale average
    culture = Math.max(0, Math.min(100, culture * 0.97 + avgMorale * 0.03))
  }

  // ── Brand ──────────────────────────────────────────────────────────────────
  let brand = s.brand
  // Active campaigns slowly grow brand
  brand += activeCampaigns.length * 0.05
  // Natural slow decay — brand needs effort to maintain
  brand = Math.max(0, Math.min(100, brand - 0.01))

  // ── Investor interest ──────────────────────────────────────────────────────
  const investorRate = s.difficultyModifier?.investorInterestRate ?? 1.0
  const mrr = s.customers * s.arpu
  let investorInterest = s.investorInterest
  if (mrr > 5000)  investorInterest += 0.4 * investorRate
  else if (mrr > 1000) investorInterest += 0.2 * investorRate
  if (brand > 60)  investorInterest += 0.15 * investorRate
  if (culture > 65) investorInterest += 0.1 * investorRate
  investorInterest = Math.max(0, Math.min(100, investorInterest - 0.05))

  // Trigger seed event when interest crosses 70
  let pendingEventPre = s.pendingEvent
  if (!pendingEventPre && investorInterest >= 70 && !s.usedEventIds.includes('investor-seed')) {
    const seedEvent = EVENTS.find(e => e.id === 'investor-seed')
    if (seedEvent) pendingEventPre = seedEvent
  }
  // Trigger Series A when interest crosses 85 (post-seed)
  if (!pendingEventPre && investorInterest >= 85 && s.usedEventIds.includes('investor-seed') && !s.usedEventIds.includes('investor-series-a')) {
    const seriesAEvent = EVENTS.find(e => e.id === 'investor-series-a')
    if (seriesAEvent) pendingEventPre = seriesAEvent
  }

  // ── Daily churn ────────────────────────────────────────────────────────────
  s = { ...s, churnRate: Math.max(churnFloorGlobal, s.churnRate) }
  const dailyChurnRate = s.churnRate / 100 / DAYS_PER_MONTH
  const churned        = Math.floor(newCustomers * dailyChurnRate)
  newCustomers = Math.max(0, newCustomers - churned)

  const customersLostLastMonth = s.customersLostLastMonth + churned

  // ── Daily revenue & burn ───────────────────────────────────────────────────
  const newMrr      = newCustomers * s.arpu
  const monthlyBurn = s.infraCostMonthly + employees.reduce((sum, e) => sum + e.salary, 0)
  const dailyNet    = (newMrr - monthlyBurn) / DAYS_PER_MONTH
  const newCash     = s.cash + dailyNet

  // ── Events ────────────────────────────────────────────────────────────────
  let pendingEvent = pendingEventPre   // may already be set by investor trigger
  const daysSinceLast = day - s.lastEventDay
  if (!pendingEvent && daysSinceLast >= 5 && Math.random() < 0.55) {
    pendingEvent = pickEvent(s.usedEventIds, s.difficultyModifier?.eventWeighting)
  }

  // ── Goals ──────────────────────────────────────────────────────────────────
  const earlyGoalReached = s.earlyGoalReached || newMrr >= 1000

  if (!s.earlyGoalReached && earlyGoalReached) {
    storyLines.push('Milestone: $1,000 MRR reached. First real traction.')
  }

  // ── Story log ──────────────────────────────────────────────────────────────
  let storyLog = s.storyLog
  if (storyLines.length > 0) {
    storyLog = [{ day, lines: storyLines }, ...storyLog].slice(0, 20)
  }

  // ── Phase checks ───────────────────────────────────────────────────────────
  let phase = s.phase
  if (newCash <= 0 && phase === 'playing') phase = 'lost'

  // ── Metrics snapshot (every day, keep last 90 for UI + full history for analytics)
  const snapBurn    = s.infraCostMonthly + employees.reduce((sum, e) => sum + e.salary, 0)
  const snapNetBurn = snapBurn - newMrr
  const snapRunway  = snapNetBurn <= 0 ? 999 : Math.min(999, Math.floor(newCash / snapNetBurn))
  const arrForSnap  = newMrr * 12
  let snapMultiple  = 3.0
  snapMultiple += brand / 100
  snapMultiple += (s.productProgress / 100) * 0.5
  snapMultiple -= (techDebt / 100) * 1.5
  if (employees.length === 0) snapMultiple -= 1
  snapMultiple = Math.max(1, snapMultiple)
  const snapValuation = Math.round(arrForSnap * snapMultiple + newCash)

  const snapshot: MetricsSnapshot = {
    day,
    mrr:             newMrr,
    customers:       newCustomers,
    churnRate:       s.churnRate,
    cash:            newCash,
    burn:            snapBurn,
    runway:          snapRunway,
    arpu:            s.arpu,
    brand,
    techDebt,
    productProgress: s.productProgress,
    teamSize:        employees.length,
    culture,
    valuation:       snapValuation,
  }
  const metricsHistory = [...(s.metricsHistory ?? []), snapshot].slice(-90)
  const fullMetricsHistory = [...(s.fullMetricsHistory ?? []), snapshot]

  const nextState: GameState = {
    ...s,
    employees,
    features,
    activeCampaigns,
    completedCampaignIds,
    recentCampaignResults: s.recentCampaignResults,
    recentFeatureResults:  s.recentFeatureResults,
    customers:         newCustomers,
    customersLostLastMonth,
    mrr:               newMrr,
    cash:              newCash,
    techDebt,
    culture,
    brand,
    investorInterest,
    pendingEvent,
    lastEventDay:      pendingEvent && !s.pendingEvent ? day : s.lastEventDay,
    storyLog,
    metricsHistory,
    fullMetricsHistory,
    earlyGoalReached,
    phase,
  }

  const afterMilestones = checkMilestones(nextState)
  void import('../analytics/persistDayAnalytics')
    .then(({ persistDayAnalytics }) => persistDayAnalytics(afterMilestones))
    .catch((err) => { console.error('[analytics] persist failed', err) })
  return afterMilestones
}

// ─── Monthly tick ────────────────────────────────────────────────────────────

function processMonthTick(state: GameState, month: number): GameState {
  const totalSalaries = state.employees.reduce((sum, e) => sum + e.salary, 0)
  const totalBurn     = totalSalaries + state.infraCostMonthly
  const netMonthly    = state.mrr - totalBurn

  // Cash is already updated daily — this tick is just for the story log summary
  const lines: string[] = [
    `Month ${month}: MRR $${state.mrr.toLocaleString()} · Burn $${totalBurn.toLocaleString()} · Net ${netMonthly >= 0 ? '+' : ''}$${netMonthly.toLocaleString()}/mo`,
  ]
  const tags: string[] = ['']

  const lost = state.customersLostLastMonth
  if (lost > 0) {
    lines.push(`📉 Lost ${lost} customer${lost !== 1 ? 's' : ''} to churn this month`)
    tags.push('churn')
  }

  return {
    ...state,
    customersLostLastMonth: 0,
    storyLog: [{ day: totalDays(state.gameTime), lines, tags }, ...state.storyLog].slice(0, 20),
  }
}

// ─── Event resolution ────────────────────────────────────────────────────────

export function applyEventChoice(state: GameState, choiceIndex: 0 | 1): GameState {
  const event = state.pendingEvent
  if (!event) return state

  const choice     = event.choices[choiceIndex]
  const patch      = choice.effect(state)
  const day        = totalDays(state.gameTime)

  const record = {
    day,
    eventTitle:  event.title,
    choiceLabel: choice.label,
    consequence: choice.consequence,
  }

  const updatedLog = state.storyLog.map((entry, i) =>
    i === 0 ? { ...entry, lines: [...entry.lines, choice.consequence] } : entry
  )

  let phase = state.phase
  if ((patch as Partial<GameState>).phase) {
    phase = (patch as Partial<GameState>).phase!
  }

  const merged: GameState = {
    ...state,
    ...patch,
    phase,
    pendingEvent:      null,
    lastEventDay:      day,
    usedEventIds:      [...state.usedEventIds, event.id].slice(-10),
    storyLog:          updatedLog,
    decisionHistory:   [record, ...state.decisionHistory],
  }

  if (merged.cash <= 0 && merged.phase === 'playing') merged.phase = 'lost'

  if (merged.soldAt && merged.soldAt.day < 0) {
    merged.soldAt = { ...merged.soldAt, day }
  }

  return merged
}

// ─── Hire / Fire ─────────────────────────────────────────────────────────────

export const MAX_DESKS = 6
export const DESK_PRICE = 1500

const XP_THRESHOLDS = [0, 150, 400, 800, 1500, 2500]
export function xpToLevel(xp: number): number {
  let level = 1
  for (let i = 1; i < XP_THRESHOLDS.length; i++) {
    if (xp >= XP_THRESHOLDS[i]) level = i + 1
    else break
  }
  return level
}
export function xpForNextLevel(level: number): number {
  return XP_THRESHOLDS[Math.min(level, XP_THRESHOLDS.length - 1)] ?? Infinity
}

export function buyDesk(state: GameState): GameState {
  if (state.deskCount >= MAX_DESKS) return state
  if (state.cash < DESK_PRICE) return state
  return { ...state, cash: state.cash - DESK_PRICE, deskCount: state.deskCount + 1 }
}

export function hireEmployee(state: GameState, candidateId: string): GameState {
  const candidate = state.candidates.find(c => c.id === candidateId)
  if (!candidate) return state
  // No desk = no hire
  if (state.employees.length >= state.deskCount) return state

  const employee = {
    id:            candidate.id,
    name:          candidate.name,
    role:          candidate.role,
    stats:         { ...candidate.stats },
    salary:        candidate.salary,
    status:        'idle' as const,
    gender:        candidate.gender,
    ideaProgress:  candidate.role === 'product_manager' ? 0.8 : 0,
    hiredAtDay:    totalDays(state.gameTime),
    morale:        72,
    stress:        15,
    xp:            0,
    level:         1,
  }

  const day = totalDays(state.gameTime)

  return {
    ...state,
    employees:  [...state.employees, employee],
    candidates: state.candidates.filter(c => c.id !== candidateId),
    storyLog:   [{ day, lines: [`${candidate.name} joined as ${candidate.role.replace('_', ' ')}.`] }, ...state.storyLog].slice(0, 20),
  }
}

export function fireEmployee(state: GameState, employeeId: string): GameState {
  const emp = state.employees.find(e => e.id === employeeId)
  if (!emp) return state

  // Free up any feature they were building
  let features = state.features
  if (emp.currentFeatureId) {
    features = features.map(f =>
      f.id === emp.currentFeatureId
        ? { ...f, status: 'proposed' as const, assignedToDevId: undefined, buildProgress: 0 }
        : f
    )
  }

  // Cancel any active campaign they were running
  const activeCampaigns = state.activeCampaigns.filter(
    c => c.assignedEmployeeId !== emp.id
  )

  const day = totalDays(state.gameTime)

  // Firing hurts remaining team morale and culture
  const updatedEmployees = state.employees
    .filter(e => e.id !== employeeId)
    .map(e => ({ ...e, morale: Math.max(0, e.morale - 6), stress: Math.min(100, e.stress + 5) }))

  const newCulture = Math.max(0, state.culture - 8)

  return {
    ...state,
    employees: updatedEmployees,
    features,
    activeCampaigns,
    culture: newCulture,
    storyLog: [{ day, lines: [`${emp.name} was let go.`] }, ...state.storyLog].slice(0, 20),
  }
}

// ─── Refactor sprint ─────────────────────────────────────────────────────────

export function startRefactorSprint(state: GameState, devId: string): GameState {
  const dev = state.employees.find(e => e.id === devId)
  if (!dev || dev.role !== 'developer' || dev.status !== 'idle') return state
  if (state.refactorDevId) return state  // already one in progress
  return {
    ...state,
    refactorDevId:    devId,
    refactorProgress: 0,
    employees: state.employees.map(e =>
      e.id === devId ? { ...e, status: 'busy' as const, isRefactoring: true } : e
    ),
  }
}

// ─── Assign feature to developer ─────────────────────────────────────────────

export function assignFeatureToDev(state: GameState, featureId: string, devId: string): GameState {
  const dev     = state.employees.find(e => e.id === devId)
  const feature = state.features.find(f => f.id === featureId)
  if (!dev || dev.status !== 'idle' || !feature || feature.status !== 'proposed') return state

  return {
    ...state,
    employees: state.employees.map(e =>
      e.id === devId
        ? { ...e, status: 'busy' as const, currentFeatureId: featureId }
        : e
    ),
    features: state.features.map(f =>
      f.id === featureId
        ? { ...f, status: 'in_development' as const, assignedToDevId: devId, buildProgress: 0 }
        : f
    ),
  }
}

// ─── Launch campaign ─────────────────────────────────────────────────────────

export function launchCampaign(state: GameState, templateId: string, employeeId: string): GameState {
  const template = CAMPAIGN_TEMPLATES.find(t => t.id === templateId)
  const emp      = state.employees.find(e => e.id === employeeId)

  if (!template || !emp || emp.status !== 'idle') return state
  if (state.cash < template.cost) return state
  if (template.oneTimeOnly && state.completedCampaignIds.includes(templateId)) return state

  const quality = campaignQuality(emp, templateId)
  const spread  = template.baseCustomerGain[1] - template.baseCustomerGain[0]

  const campaign: ActiveCampaign = {
    id:                   `camp-${Date.now()}`,
    templateId,
    name:                 template.name,
    type:                 template.type,
    assignedEmployeeId:   emp.id,
    employeeName:         emp.name,
    startDay:             totalDays(state.gameTime),
    durationDays:         template.durationDays,
    progress:             0,
    expectedMin:          Math.round(template.baseCustomerGain[0] + spread * quality * 0.6),
    expectedMax:          Math.round(template.baseCustomerGain[0] + spread * quality * 1.2),
    churnEffect:          template.churnEffect,
  }

  return {
    ...state,
    cash:            state.cash - template.cost,
    activeCampaigns: [...state.activeCampaigns, campaign],
    employees: state.employees.map(e =>
      e.id === employeeId
        ? { ...e, status: 'busy' as const, currentCampaignId: campaign.id }
        : e
    ),
  }
}

// ─── Market saturation S-curve ───────────────────────────────────────────────

export function marketSaturationFactor(customers: number): number {
  if (customers <= 20)  return 0.5
  if (customers <= 80)  return 0.5 + (customers - 20) / 60 * 0.8
  if (customers <= 300) return 1.3
  if (customers <= 800) return 1.3 - (customers - 300) / 500 * 0.7
  return Math.max(0.25, 0.6 - (customers - 800) / 2000 * 0.35)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function campaignQuality(emp: Employee, templateId: string): number {
  const template = CAMPAIGN_TEMPLATES.find(t => t.id === templateId)
  if (!template) return 0.5
  const vals = template.statKeys.map(k => emp.stats[k] ?? 5)
  const avg  = vals.reduce((a, b) => a + b, 0) / vals.length
  return avg / 10   // 0–1
}

function featureImpact(feat: Feature, dev: Employee, diffMult: number, currentCustomers: number) {
  const accuracy = dev.stats.accuracy ?? 5
  const qualityMult = 0.6 + (accuracy / 10) * 0.6
  const satFact = marketSaturationFactor(currentCustomers)
  const effects = feat.effects ?? {}

  const rawCustomers = effects.customers ?? 0
  const customerGain = Math.round(
    (rawCustomers > 0 ? rawCustomers * satFact : rawCustomers) * qualityMult * diffMult
  )

  return {
    customerGain,
    arpuChange:     Math.round((effects.arpu ?? 0) * qualityMult),
    churnDrop:      -((effects.churnRate ?? 0) * diffMult),
    cashBonus:      Math.round((effects.cashBonus ?? 0) * diffMult),
    brandChange:    effects.brand ?? 0,
    techDebtChange: effects.techDebt ?? 0,
    progressGain:   Math.round((feat.value === 'high' ? 6 : feat.value === 'medium' ? 3 : 1) * diffMult),
  }
}

// ─── Public impact estimators (used by UI) ───────────────────────────────────

import type { FeatureEffects } from '../types'

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

/** Estimate feature impact for UI display given effects and a quality multiplier */
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
  const customers = Math.round(
    (rawCustomers > 0 ? rawCustomers * satFact : rawCustomers) * qualityMult * diffMult
  )
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

function pickNextFeatureFromRoadmap(state: GameState): { template: FeatureTemplate; newIndex: number } | null {
  const roadmap = state.featureRoadmap
  let idx = state.featureRoadmapIndex
  const usedTitles = new Set(state.features.map(f => f.title))

  while (idx < roadmap.length) {
    if (!usedTitles.has(roadmap[idx].title)) {
      return { template: roadmap[idx], newIndex: idx + 1 }
    }
    idx++
  }

  const fallback = FEATURE_TEMPLATES.filter(t => !usedTitles.has(t.title))
  if (fallback.length === 0) return null
  return { template: fallback[Math.floor(Math.random() * fallback.length)], newIndex: idx }
}

function pickEvent(usedIds: string[], eventWeighting?: { crisisWeight: number; opportunityWeight: number }): GameEvent | null {
  let available = EVENTS.filter(e => !usedIds.includes(e.id))
  // Recycle when pool is exhausted — keep last 5 used as buffer to avoid immediate repeats
  if (available.length === 0) {
    const buffer = usedIds.slice(-5)
    available = EVENTS.filter(e => !buffer.includes(e.id))
  }
  if (available.length === 0) available = [...EVENTS] // total fallback


  if (eventWeighting) {
    const cw = eventWeighting.crisisWeight
    const ow = eventWeighting.opportunityWeight
    const mw = Math.max(0, 1 - cw - ow)

    const roll = Math.random()
    let targetCategory: 'crisis' | 'opportunity' | 'market'
    if (roll < cw) targetCategory = 'crisis'
    else if (roll < cw + ow) targetCategory = 'opportunity'
    else targetCategory = 'market'

    const catEvents = available.filter(e => e.category === targetCategory)
    if (catEvents.length > 0) {
      return catEvents[Math.floor(Math.random() * catEvents.length)]
    }
    // Fallback: if no events of that category remain, pick from any
    void mw
  }

  return available[Math.floor(Math.random() * available.length)]
}

// ─── Metrics helpers ─────────────────────────────────────────────────────────

export function getMonthlyBurn(state: GameState): number {
  return state.infraCostMonthly + state.employees.reduce((s, e) => s + e.salary, 0)
}

export function getRunwayMonths(state: GameState): number {
  const burn = getMonthlyBurn(state)
  const monthlyRevenue = state.mrr
  const netBurn = burn - monthlyRevenue
  if (netBurn <= 0) return 999
  return Math.floor(state.cash / netBurn)
}

export function getPostMortem(state: GameState): string[] {
  const insights: string[] = []

  if (state.cash <= 0) {
    insights.push('Runway ran out before revenue could cover the burn rate.')
  }
  if (state.customers < 5 && totalDays(state.gameTime) > 60) {
    insights.push('Very few customers after 60 days. Likely not enough focus on sales or marketing hires.')
  }
  if (state.churnRate > 20) {
    insights.push('Churn was consistently high. Features shipped vs. retention investment balance was off.')
  }
  if (state.employees.length === 0) {
    insights.push('No employees were hired. The founder alone cannot scale.')
  }
  if (!state.features.some(f => f.status === 'completed')) {
    insights.push('No features shipped. A developer is needed to build what the PM proposes.')
  }
  if (state.features.filter(f => f.status === 'proposed').length > 5) {
    insights.push('Feature backlog piled up. Too many ideas, not enough builders.')
  }

  const highValueHire = state.employees.find(e => e.role === 'developer')
  if (!highValueHire && totalDays(state.gameTime) > 30) {
    insights.push('No developer was ever hired. Features can only ship with a developer on the team.')
  }

  if (insights.length === 0) {
    insights.push('Timing or market conditions may have worked against you. Try a different hiring strategy.')
  }

  return insights
}

// ─── Company valuation ───────────────────────────────────────────────────────

export interface ValuationBreakdown {
  valuation: number
  arr: number
  revenueMultiple: number
  breakdown: { label: string; value: string }[]
}

export function getCompanyValuation(state: GameState): ValuationBreakdown {
  const arr = state.mrr * 12

  let multiple = 3.0

  const history = state.metricsHistory
  if (history.length > 0) {
    const latestDay = history[history.length - 1].day
    const thirtyDaysAgo = history.find(s => s.day <= latestDay - 30)
    if (thirtyDaysAgo && thirtyDaysAgo.mrr > 0) {
      const growthRate = (state.mrr - thirtyDaysAgo.mrr) / thirtyDaysAgo.mrr
      multiple += Math.min(4, Math.max(0, growthRate * 8))
    }
  }

  const brandBonus = state.brand / 100
  multiple += brandBonus

  const productBonus = (state.productProgress / 100) * 0.5
  multiple += productBonus

  const debtPenalty = (state.techDebt / 100) * 1.5
  multiple -= debtPenalty

  if (state.employees.length === 0) multiple -= 1

  multiple = Math.max(1, multiple)

  const valuation = Math.round(arr * multiple + state.cash)

  return {
    valuation,
    arr,
    revenueMultiple: Math.round(multiple * 10) / 10,
    breakdown: [
      { label: 'ARR', value: `$${arr.toLocaleString()}` },
      { label: 'Base multiple', value: '3.0x' },
      { label: 'Growth bonus', value: `+${Math.round((multiple - 3 + debtPenalty - brandBonus - productBonus + (state.employees.length === 0 ? 1 : 0)) * 10) / 10}x` },
      { label: 'Brand', value: `+${Math.round(brandBonus * 10) / 10}x` },
      { label: 'Product', value: `+${Math.round(productBonus * 10) / 10}x` },
      { label: 'Tech debt', value: `-${Math.round(debtPenalty * 10) / 10}x` },
      { label: 'Final multiple', value: `${Math.round(multiple * 10) / 10}x` },
      { label: 'Cash', value: `+$${Math.round(state.cash).toLocaleString()}` },
    ],
  }
}

// ─── Milestone checking ───────────────────────────────────────────────────────

function checkMilestones(s: GameState): GameState {
  const newlyCompleted: MilestoneToastEntry[] = []

  for (const m of MILESTONES) {
    if (s.completedMilestoneIds.includes(m.id)) continue
    if (m.condition(s)) {
      newlyCompleted.push({
        id:          m.id,
        title:       m.title,
        description: m.description,
        icon:        m.icon,
        triggeredAt: Date.now(),
      })
    }
  }

  if (newlyCompleted.length === 0) return s

  return {
    ...s,
    completedMilestoneIds:  [...s.completedMilestoneIds,  ...newlyCompleted.map(t => t.id)],
    pendingMilestoneToasts: [...s.pendingMilestoneToasts, ...newlyCompleted],
  }
}
