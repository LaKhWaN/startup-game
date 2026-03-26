import { useState, useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import type { GameState } from '../types'
import './EventCard.css'

const CATEGORY_LABEL: Record<string, string> = {
  crisis:      '⚠ Crisis',
  opportunity: '★ Opportunity',
  market:      '~ Market Shift',
}

type DiffItem = {
  key: string
  display: string
  positive: boolean
}

type Outcome = {
  tone: 'good' | 'bad' | 'neutral'
  consequence: string
  diffs: DiffItem[]
}

function computeDiffs(before: GameState, patch: Partial<GameState>): DiffItem[] {
  const diffs: DiffItem[] = []

  if (patch.cash !== undefined) {
    const d = patch.cash - before.cash
    if (Math.abs(d) > 0.5)
      diffs.push({ key: 'Cash', display: `${d > 0 ? '+' : ''}$${Math.abs(Math.round(d)).toLocaleString()}`, positive: d > 0 })
  }
  if (patch.customers !== undefined) {
    const d = patch.customers - before.customers
    if (d !== 0)
      diffs.push({ key: 'Users', display: `${d > 0 ? '+' : ''}${d} users`, positive: d > 0 })
  }
  if (patch.churnRate !== undefined) {
    const d = patch.churnRate - before.churnRate
    if (Math.abs(d) > 0.1)
      diffs.push({ key: 'Churn', display: `${d > 0 ? '+' : ''}${d.toFixed(1)}% churn`, positive: d < 0 })
  }
  if (patch.productProgress !== undefined) {
    const d = patch.productProgress - before.productProgress
    if (Math.abs(d) > 0.1)
      diffs.push({ key: 'Product', display: `${d > 0 ? '+' : ''}${d.toFixed(0)}% product`, positive: d > 0 })
  }
  if (patch.mrr !== undefined) {
    const d = patch.mrr - before.mrr
    if (Math.abs(d) > 0.5)
      diffs.push({ key: 'MRR', display: `${d > 0 ? '+' : ''}$${Math.abs(Math.round(d))}/mo`, positive: d > 0 })
  }
  if (patch.brand !== undefined) {
    const d = patch.brand - before.brand
    if (Math.abs(d) > 0.5)
      diffs.push({ key: 'Brand', display: `${d > 0 ? '+' : ''}${d.toFixed(0)} brand`, positive: d > 0 })
  }
  if (patch.techDebt !== undefined) {
    const d = patch.techDebt - before.techDebt
    if (Math.abs(d) > 0.5)
      diffs.push({ key: 'Debt', display: `${d > 0 ? '+' : ''}${d.toFixed(0)} tech debt`, positive: d < 0 })
  }
  if (patch.infraCostMonthly !== undefined) {
    const d = patch.infraCostMonthly - before.infraCostMonthly
    if (Math.abs(d) > 0.5)
      diffs.push({ key: 'Infra', display: `${d > 0 ? '+' : ''}$${Math.abs(Math.round(d))}/mo infra`, positive: d < 0 })
  }
  if (patch.equity !== undefined) {
    const d = patch.equity - before.equity
    if (Math.abs(d) > 0.1)
      diffs.push({ key: 'Equity', display: `${d.toFixed(0)}% equity`, positive: false })
  }
  if (patch.employees !== undefined && before.employees !== undefined) {
    const beforeCount = before.employees.length
    const afterCount  = patch.employees.length
    if (afterCount < beforeCount)
      diffs.push({ key: 'Team', display: `-${beforeCount - afterCount} employee`, positive: false })
  }

  return diffs
}

export function EventCard() {
  const pendingEvent = useGameStore(s => s.pendingEvent)
  const chooseEvent  = useGameStore(s => s.chooseEvent)
  const state        = useGameStore(s => s)

  const [outcome, setOutcome] = useState<Outcome | null>(null)

  // Auto-dismiss outcome after 4s
  useEffect(() => {
    if (!outcome) return
    const id = setTimeout(() => setOutcome(null), 4000)
    return () => clearTimeout(id)
  }, [outcome])

  function handleChoice(index: 0 | 1) {
    if (!pendingEvent) return
    const choice = pendingEvent.choices[index]
    const patch  = choice.effect(state)
    const diffs  = computeDiffs(state, patch)

    const positives = diffs.filter(d => d.positive).length
    const negatives = diffs.filter(d => !d.positive).length
    const tone: Outcome['tone'] =
      diffs.length === 0 ? 'neutral' :
      negatives > positives ? 'bad' :
      positives > negatives ? 'good' : 'neutral'

    setOutcome({ tone, consequence: choice.consequence, diffs })
    chooseEvent(index)
  }

  // Show outcome result popup
  if (outcome) {
    return (
      <div className="event-overlay" onClick={() => setOutcome(null)}>
        <div
          className={`outcome-popup outcome-popup--${outcome.tone}`}
          onClick={e => e.stopPropagation()}
        >
          <div className="op-icon">
            {outcome.tone === 'good' ? '✓' : outcome.tone === 'bad' ? '✗' : '~'}
          </div>
          <p className="op-consequence">{outcome.consequence}</p>
          {outcome.diffs.length > 0 && (
            <div className="op-diffs">
              {outcome.diffs.map((d, i) => (
                <span key={i} className={`op-diff ${d.positive ? 'op-diff--pos' : 'op-diff--neg'}`}>
                  {d.display}
                </span>
              ))}
            </div>
          )}
          <span className="op-dismiss">click to dismiss</span>
        </div>
      </div>
    )
  }

  if (!pendingEvent) return null

  return (
    <div className="event-overlay">
      <div className={`event-modal event-modal--${pendingEvent.category}`}>
        <div className="em-header">
          <span className="em-tag">{CATEGORY_LABEL[pendingEvent.category]}</span>
        </div>
        <h3 className="em-title">{pendingEvent.title}</h3>
        <p className="em-description">{pendingEvent.description}</p>
        <div className="em-choices">
          {pendingEvent.choices.map((choice, i) => (
            <button
              key={i}
              className="em-choice-btn"
              onClick={() => handleChoice(i as 0 | 1)}
            >
              {choice.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
