import { useGameStore } from '../store/gameStore'
import { getCompanyValuation } from '../engine/gameEngine'
import './SellCompanyModal.css'

interface Props {
  onClose: () => void
}

export function SellCompanyModal({ onClose }: Props) {
  const state = useGameStore(s => s)
  const sellCompany = useGameStore(s => s.sellCompany)
  const { valuation, breakdown } = getCompanyValuation(state)

  function handleSell() {
    sellCompany()
  }

  return (
    <div className="scm-overlay" onClick={onClose}>
      <div className="scm-card" onClick={e => e.stopPropagation()}>
        <div className="scm-header">
          <span className="scm-title">Sell {state.startupName}?</span>
          <button className="scm-close" onClick={onClose}>×</button>
        </div>

        <div className="scm-valuation">
          <div className="scm-valuation-label">Estimated Valuation</div>
          <div className="scm-valuation-amount">${valuation.toLocaleString()}</div>
        </div>

        <div className="scm-breakdown">
          {breakdown.map((item, i) => (
            <div key={i} className="scm-row">
              <span className="scm-row-label">{item.label}</span>
              <span className="scm-row-value">{item.value}</span>
            </div>
          ))}
        </div>

        <div className="scm-actions">
          <button className="scm-btn scm-btn--sell" onClick={handleSell}>
            Sell for ${valuation.toLocaleString()}
          </button>
          <button className="scm-btn scm-btn--cancel" onClick={onClose}>
            Keep Building
          </button>
        </div>
      </div>
    </div>
  )
}
