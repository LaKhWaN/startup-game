import { useGameStore } from '../store/gameStore'
import { getRunwayMonths, getCompanyValuation } from '../engine/gameEngine'
import './EarlyGoal.css'

export function EarlyGoal() {
  const mrr              = useGameStore(s => s.mrr)
  const earlyGoalReached = useGameStore(s => s.earlyGoalReached)
  const state            = useGameStore(s => s)
  const runway           = getRunwayMonths(state)
  const { valuation }    = getCompanyValuation(state)

  if (earlyGoalReached) {
    return (
      <div className="early-goal early-goal--progress">
        <div className="eg-top">
          <span className="eg-label">Company Valuation</span>
          <span className="eg-mrr">${valuation.toLocaleString()}</span>
        </div>
        <div className="eg-sub">Sell anytime via the 💰 button. Build more to increase your valuation.</div>
      </div>
    )
  }

  const pct = Math.min(100, (mrr / 1000) * 100)

  return (
    <div className={`early-goal ${runway < 2 ? 'early-goal--danger' : ''}`}>
      <div className="eg-top">
        <span className="eg-label">First milestone: reach $1,000 MRR</span>
        <span className="eg-mrr">${Math.floor(mrr).toLocaleString()} / $1,000</span>
      </div>
      <div className="eg-track"><div className="eg-fill" style={{ width: `${pct}%` }} /></div>
      {runway < 3 && runway >= 0 && (
        <span className="eg-warning">{runway === 0 ? 'Out of runway.' : `${runway} month${runway !== 1 ? 's' : ''} of runway left.`}</span>
      )}
    </div>
  )
}
