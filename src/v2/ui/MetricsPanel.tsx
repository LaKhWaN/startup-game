import { useV2 } from '../actions'
import { churnBreakdown } from '../engine/churn'
import { marketCeiling } from '../engine/market'
import { monthlyBurn, runwayMonths, valuation, variableCosts } from '../engine/money'
import { formatProfit } from '../finance'
import '../v2.css'

type Tone = 'good' | 'warn' | 'bad' | 'plain'

function Kpi({ icon, label, value, tone = 'plain' }: { icon: string; label: string; value: string; tone?: Tone }) {
  return (
    <div className={`v2-kpi v2-kpi--${tone}`}>
      <span className="v2-kpi-label">{icon} {label}</span>
      <span className="v2-kpi-value">{value}</span>
    </div>
  )
}

function Bar({ label, value, max = 100, tone = 'plain', right }: { label: string; value: number; max?: number; tone?: Tone; right: string }) {
  return (
    <div className="v2-mbar">
      <div className="v2-mbar-head"><span>{label}</span><strong>{right}</strong></div>
      <div className={`v2-mbar-track v2-mbar-track--${tone}`}><div style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }} /></div>
    </div>
  )
}

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`

/** Metrics sheet: headline numbers, market, why customers leave, company health. */
export function MetricsPanel() {
  const state = useV2(s => s)
  const burn = monthlyBurn(state)
  const runway = runwayMonths(state)
  const profit = state.mrr - burn
  const shipped = state.features.filter(f => f.status === 'completed').length
  const team = Object.keys(state.v2.team).length
  const cap = marketCeiling(state)
  const churn = churnBreakdown(state)
  const extras = [
    { icon: '🐛', label: 'Bugs (tech debt)', v: churn.bugs },
    { icon: '🎧', label: `Support backlog (${state.v2.tickets})`, v: churn.support },
    { icon: '📦', label: 'Thin product', v: churn.thin },
    { icon: '🐢', label: 'Slow app', v: churn.slow },
    { icon: '⚡', label: 'Recent events', v: churn.shock },
    { icon: '🔁', label: 'Retention features', v: -churn.relief },
  ]

  return (
    <div className="v2-metrics">
      <div className="v2-kpi-grid">
        <Kpi icon="💹" label="MRR" value={usd(state.mrr)} tone={state.mrr > 0 ? 'good' : 'warn'} />
        <Kpi icon="💰" label="Profit" value={formatProfit(profit)} tone={profit >= 0 ? 'good' : 'bad'} />
        <Kpi icon="🏦" label="Cash" value={usd(state.cash)} tone={runway < 3 ? 'bad' : runway < 6 ? 'warn' : 'good'} />
        <Kpi icon="⏳" label="Runway" value={runway >= 999 ? '∞' : `${runway} mo`} tone={runway < 3 ? 'bad' : runway < 6 ? 'warn' : 'good'} />
        <Kpi icon="🔥" label="Burn" value={`${usd(burn)}/mo`} />
        <Kpi icon="👥" label="Customers" value={state.customers.toLocaleString()} />
        <Kpi icon="📉" label="Churn" value={`${churn.total.toFixed(1)}%/mo`} tone={churn.total > 15 ? 'bad' : churn.total > 9 ? 'warn' : 'good'} />
        <Kpi icon="🧑‍💼" label="Team" value={String(team)} />
        <Kpi icon="🚀" label="Shipped" value={String(shipped)} />
        <Kpi icon="🏷️" label="Valuation" value={usd(valuation(state))} />
      </div>

      <section className="v2-mcard">
        <h3 className="v2-mcard-title">🌍 Market</h3>
        <Bar label="Customers you've won of what your idea can reach" value={state.customers} max={cap} right={`${state.customers.toLocaleString()} / ${cap.toLocaleString()}`} tone="plain" />
        <p className="v2-mcard-note">Grows with every shipped feature and with brand.</p>
      </section>

      <section className="v2-mcard">
        <h3 className="v2-mcard-title">🚪 Why customers leave <span className="v2-mcard-sub">{churn.total.toFixed(1)}% a month</span></h3>
        <div className="v2-churn-rows">
          <div className="v2-churn-row"><span>🧱 Your idea's baseline</span><strong>{churn.floor.toFixed(1)}%</strong></div>
          {extras.filter(e => Math.abs(e.v) >= 0.05).map(e => (
            <div key={e.label} className={`v2-churn-row${e.v < 0 ? ' v2-churn-row--good' : ''}`}>
              <span>{e.icon} {e.label}</span><strong>{e.v > 0 ? '+' : '−'}{Math.abs(e.v).toFixed(1)}%</strong>
            </div>
          ))}
          {extras.every(e => Math.abs(e.v) < 0.05) && <div className="v2-mcard-note">Nothing extra: your product is healthy.</div>}
        </div>
        <p className="v2-mcard-note">Variable costs: {usd(variableCosts(state))}/mo (3% payment fees + $1 per customer for tools).</p>
      </section>

      <section className="v2-mcard">
        <h3 className="v2-mcard-title">❤️ Company health</h3>
        <Bar label="Brand" value={state.brand} right={String(Math.round(state.brand))} tone={state.brand < 20 ? 'warn' : 'good'} />
        <Bar label="Product" value={state.productProgress} right={`${Math.round(state.productProgress)}%`} tone="good" />
        <Bar label="Tech debt" value={state.techDebt} right={String(Math.round(state.techDebt))} tone={state.techDebt > 60 ? 'bad' : state.techDebt > 30 ? 'warn' : 'good'} />
        <Bar label="Investor interest (seed at 70, Series A at 85)" value={state.investorInterest} right={String(Math.round(state.investorInterest))} />
        <p className="v2-mcard-note">Equity left: {state.equity}%</p>
      </section>
    </div>
  )
}
