import { useGameStore } from '../store/gameStore'
import { getMonthlyBurn, getRunwayMonths, dayOfMonth, monthOfYear, yearNumber } from '../engine/gameEngine'
import './MetricsBar.css'

export function MetricsBar() {
  const state       = useGameStore(s => s)
  const burn        = getMonthlyBurn(state)
  const runway      = getRunwayMonths(state)
  const dom         = dayOfMonth(state.gameTime)
  const moy         = monthOfYear(state.gameTime)
  const yr          = yearNumber(state.gameTime)

  const runwayClass = runway < 2 ? 'mv danger' : runway < 4 ? 'mv warn' : 'mv'

  return (
    <div className="metrics-bar">
      <div className="m-time">
        <span className="m-time-val">M{moy} · D{dom} · Y{yr}</span>
        {state.pendingEvent && <span className="m-paused">⏸ EVENT</span>}
      </div>

      <div className="m-divider" />

      <div className="metric">
        <span className="ml">Cash</span>
        <span className="mv">${Math.max(0, Math.floor(state.cash)).toLocaleString()}</span>
      </div>

      <div className="m-divider" />

      <div className="metric">
        <span className="ml">Burn</span>
        <span className="mv warn">${burn.toLocaleString()}/mo</span>
      </div>

      <div className="m-divider" />

      <div className="metric">
        <span className="ml">Runway</span>
        <span className={runwayClass}>
          {runway >= 999 ? '∞' : `${runway}mo`}
        </span>
      </div>

      <div className="m-divider" />

      <div className="metric">
        <span className="ml">MRR</span>
        <span className="mv accent">${Math.floor(state.mrr).toLocaleString()}</span>
      </div>

      <div className="m-divider" />

      <div className="metric">
        <span className="ml">Users</span>
        <span className="mv">{state.customers}</span>
      </div>

      <div className="m-divider" />

      <div className="metric">
        <span className="ml">Churn</span>
        <span className={state.churnRate > 20 ? 'mv danger' : state.churnRate > 12 ? 'mv warn' : 'mv'}>
          {state.churnRate.toFixed(1)}%
        </span>
      </div>
    </div>
  )
}
