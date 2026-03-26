import { useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import type { FeatureResult } from '../types'
import './FeatureResultToast.css'

const VALUE_ICON: Record<string, string> = { high: '🚀', medium: '⚡', low: '🔧' }
const VALUE_LABEL: Record<string, string> = { high: 'Core', medium: 'Growth', low: 'Infra' }

function ImpactChip({ text, positive }: { text: string; positive: boolean }) {
  return (
    <span className={`frt-chip ${positive ? 'frt-chip--pos' : 'frt-chip--neg'}`}>
      {text}
    </span>
  )
}

function Toast({ result, onDismiss }: { result: FeatureResult; onDismiss: () => void }) {
  useEffect(() => {
    const id = setTimeout(onDismiss, 5000)
    return () => clearTimeout(id)
  }, [onDismiss])

  const chips: { text: string; positive: boolean }[] = []

  if (result.customerGain !== 0) {
    chips.push({
      text: `${result.customerGain > 0 ? '+' : ''}${result.customerGain} users`,
      positive: result.customerGain > 0,
    })
  }
  if (result.arpuChange !== 0) {
    chips.push({
      text: `${result.arpuChange > 0 ? '+' : ''}$${result.arpuChange} ARPU`,
      positive: result.arpuChange > 0,
    })
  }
  if (result.churnDrop !== 0) {
    chips.push({
      text: `-${result.churnDrop.toFixed(1)}% churn`,
      positive: result.churnDrop > 0,
    })
  }
  if (result.brandChange !== 0) {
    chips.push({
      text: `${result.brandChange > 0 ? '+' : ''}${result.brandChange} brand`,
      positive: result.brandChange > 0,
    })
  }
  if (result.techDebtChange !== 0) {
    chips.push({
      text: `${result.techDebtChange > 0 ? '+' : ''}${result.techDebtChange} debt`,
      positive: result.techDebtChange < 0,
    })
  }
  if (result.cashBonus > 0) {
    chips.push({ text: `+$${result.cashBonus}`, positive: true })
  }

  const hasPositive = chips.some(c => c.positive)
  const hasNegative = chips.some(c => !c.positive)
  const tone = hasNegative && !hasPositive ? 'negative' : hasNegative ? 'mixed' : 'positive'

  return (
    <div className={`frt-toast frt-toast--${tone}`} onClick={onDismiss}>
      <div className="frt-icon">{VALUE_ICON[result.value] ?? '⚡'}</div>
      <div className="frt-body">
        <div className="frt-header">
          <span className="frt-title">{result.featureTitle}</span>
          <span className="frt-badge">{VALUE_LABEL[result.value]}</span>
        </div>
        <div className="frt-dev">Shipped by {result.devName}</div>
        <div className="frt-chips">
          {chips.map((c, i) => (
            <ImpactChip key={i} text={c.text} positive={c.positive} />
          ))}
          {chips.length === 0 && (
            <span className="frt-chip frt-chip--neutral">No direct impact</span>
          )}
        </div>
      </div>
    </div>
  )
}

export function FeatureResultToasts() {
  const results = useGameStore(s => s.recentFeatureResults)
  const dismiss = useGameStore(s => s.dismissFeatureResult)

  if (results.length === 0) return null

  const latest = results[0]

  return (
    <div className="frt-container">
      <Toast
        key={latest.completedAtDay}
        result={latest}
        onDismiss={() => dismiss(latest.completedAtDay)}
      />
    </div>
  )
}
