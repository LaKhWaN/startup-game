import { useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import type { CampaignResult } from '../types'
import './CampaignResultToast.css'

function gradeResult(r: CampaignResult): { tone: 'great' | 'ok' | 'poor'; label: string } {
  const greatThreshold = r.expectedMax * 0.85
  const okThreshold    = r.expectedMin * 0.5

  if (r.gained >= greatThreshold) return { tone: 'great', label: 'Great result!' }
  if (r.gained >= okThreshold)    return { tone: 'ok',    label: 'Mediocre result' }
  return { tone: 'poor', label: 'Campaign flopped' }
}

function Toast({ result, onDismiss }: { result: CampaignResult; onDismiss: () => void }) {
  const { tone, label } = gradeResult(result)

  useEffect(() => {
    const id = setTimeout(onDismiss, 4000)
    return () => clearTimeout(id)
  }, [onDismiss])

  return (
    <div className={`crt-toast crt-toast--${tone}`} onClick={onDismiss}>
      <div className="crt-icon">
        {tone === 'great' ? '🎉' : tone === 'ok' ? '😐' : '💥'}
      </div>
      <div className="crt-body">
        <div className="crt-name">{result.name}</div>
        <div className="crt-label">{label}</div>
        <div className="crt-stats">
          <span className={`crt-gained crt-gained--${tone}`}>+{result.gained} users</span>
          <span className="crt-expected">
            (expected {result.expectedMin}–{result.expectedMax})
          </span>
        </div>
      </div>
    </div>
  )
}

export function CampaignResultToasts() {
  const results = useGameStore(s => s.recentCampaignResults)
  const dismiss = useGameStore(s => s.dismissCampaignResult)

  if (results.length === 0) return null

  const latest = results[0]

  return (
    <div className="crt-container">
      <Toast
        key={latest.completedAtDay}
        result={latest}
        onDismiss={() => dismiss(latest.completedAtDay)}
      />
    </div>
  )
}
