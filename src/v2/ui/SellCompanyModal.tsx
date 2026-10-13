import { sellCompany, useV2 } from '../actions'
import { valuation } from '../engine/money'
import './SellCompanyModal.css'

interface Props {
  onClose: () => void
}

export function SellCompanyModal({ onClose }: Props) {
  const state = useV2(s => s)
  const total = valuation(state)
  const arr = Math.round(state.mrr * 12)
  const breakdown = [
    { label: 'ARR (MRR × 12)', value: `$${arr.toLocaleString()}` },
    { label: 'Brand', value: `${Math.round(state.brand)}/100` },
    { label: 'Product', value: `${Math.round(state.productProgress)}%` },
    { label: 'Tech debt', value: `${Math.round(state.techDebt)}/100` },
    { label: 'Cash', value: `$${Math.round(state.cash).toLocaleString()}` },
  ]
  return (
    <div className="scm-overlay" onClick={onClose}>
      <div className="scm-card" onClick={e => e.stopPropagation()}>
        <div className="scm-header">
          <span className="scm-title">Sell {state.startupName}?</span>
          <button className="scm-close" onClick={onClose}>×</button>
        </div>
        <div className="scm-valuation">
          <div className="scm-valuation-label">Estimated Valuation</div>
          <div className="scm-valuation-amount">${total.toLocaleString()}</div>
        </div>
        <div className="scm-breakdown">
          {breakdown.map(item => (
            <div key={item.label} className="scm-row">
              <span className="scm-row-label">{item.label}</span>
              <span className="scm-row-value">{item.value}</span>
            </div>
          ))}
        </div>
        <div className="scm-actions">
          <button className="scm-btn scm-btn--sell" onClick={sellCompany}>Sell for ${total.toLocaleString()}</button>
          <button className="scm-btn scm-btn--cancel" onClick={onClose}>Keep Building</button>
        </div>
      </div>
    </div>
  )
}
