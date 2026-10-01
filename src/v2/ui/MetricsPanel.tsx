import { useV2 } from '../actions'
import { monthlyBurn, runwayMonths, valuation } from '../engine/money'
import './RightPanel.css'

type CellColor = 'cyan' | 'purple' | 'green' | 'yellow' | 'orange' | 'red'

function MetCell({ label, value, color }: { label: string; value: string; color: CellColor }) {
  return (
    <div className={`rpm-cell rpm-cell--${color}`}>
      <span className="rpm-cell-label">{label}</span>
      <span className={`rpm-cell-value rpm-${color}`}>{value}</span>
    </div>
  )
}

function CompanyBar({ label, value, color, warnBelow, warnAbove }: { label: string; value: number; color: string; warnBelow?: number; warnAbove?: number }) {
  const isWarn = (warnBelow !== undefined && value < warnBelow) || (warnAbove !== undefined && value > warnAbove)
  const isDanger = (warnBelow !== undefined && value < warnBelow * 0.5) || (warnAbove !== undefined && value > warnAbove * 1.3)
  const barColor = isDanger ? 'var(--red)' : isWarn ? 'var(--yellow)' : color
  return (
    <div className="rpm-company-bar">
      <div className="rpm-cb-header">
        <span className="rpm-cb-label">{label}</span>
        <span className="rpm-cb-val" style={{ color: barColor }}>{Math.round(value)}</span>
      </div>
      <div className="rpm-cb-track">
        <div className="rpm-cb-fill" style={{ width: `${value}%`, background: barColor }} />
      </div>
    </div>
  )
}

/** v2 metrics: the numbers and company health bars (ported from the legacy metrics tab). */
export function MetricsPanel() {
  const state = useV2(s => s)
  const burn = monthlyBurn(state)
  const runway = runwayMonths(state)
  const shipped = state.features.filter(f => f.status === 'completed').length
  const netFlow = state.mrr - burn
  const team = Object.keys(state.v2.team).length
  const cashColor: CellColor = runway < 3 ? 'red' : runway < 6 ? 'yellow' : 'green'
  const churnColor: CellColor = state.churnRate > 25 ? 'red' : state.churnRate > 12 ? 'yellow' : 'green'
  const mrrColor: CellColor = state.mrr === 0 ? 'yellow' : netFlow > 0 ? 'green' : 'cyan'
  return (
    <div className="rp-content">
      <div className="rpm-grid">
        <MetCell label="MRR" value={`$${state.mrr.toLocaleString()}`} color={mrrColor} />
        <MetCell label="Users" value={state.customers.toLocaleString()} color="purple" />
        <MetCell label="Churn" value={`${state.churnRate.toFixed(1)}%`} color={churnColor} />
        <MetCell label="Cash" value={`$${Math.floor(state.cash).toLocaleString()}`} color={cashColor} />
        <MetCell label="Burn/mo" value={`$${burn.toLocaleString()}`} color="orange" />
        <MetCell label="Runway" value={runway >= 999 ? '∞' : `${runway} mo`} color={cashColor} />
        <MetCell label="Team" value={String(team)} color="purple" />
        <MetCell label="Shipped" value={String(shipped)} color="cyan" />
        <MetCell label="Valuation" value={`$${valuation(state).toLocaleString()}`} color="green" />
        <MetCell label="Equity" value={`${state.equity}%`} color="green" />
      </div>
      <section className="rp-section" style={{ marginTop: '1.2rem' }}>
        <div className="rp-section-label">Company Health</div>
        <CompanyBar label="Brand" value={state.brand} color="var(--accent)" warnBelow={20} />
        <CompanyBar label="Product" value={state.productProgress} color="var(--accent)" />
        <CompanyBar label="Tech Debt" value={state.techDebt} color="var(--green)" warnAbove={60} />
        <div className="rpm-investor-row">
          <span className="rpm-investor-label">Investor Interest</span>
          <div className="rpm-investor-track">
            <div className="rpm-investor-fill" style={{ width: `${state.investorInterest}%` }} />
            <div className="rpm-investor-thresh" style={{ left: '70%' }} title="Seed trigger" />
            <div className="rpm-investor-thresh" style={{ left: '85%' }} title="Series A trigger" />
          </div>
          <span className="rpm-investor-val">{Math.round(state.investorInterest)}</span>
        </div>
      </section>
    </div>
  )
}
