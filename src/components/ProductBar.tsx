import { useGameStore } from '../store/gameStore'
import './ProductBar.css'

const MILESTONES = [25, 50, 75, 100]

export function ProductBar() {
  const progress        = useGameStore(s => s.productProgress)
  const featuresShipped = useGameStore(s => s.features.filter(f => f.status === 'completed').length)

  return (
    <div className="product-bar">
      <div className="pb-header">
        <span className="pb-title">Product Progress</span>
        <span className="pb-shipped">{featuresShipped} feature{featuresShipped !== 1 ? 's' : ''} shipped</span>
      </div>

      <div className="pb-track">
        <div className="pb-fill" style={{ width: `${progress}%` }} />
        {MILESTONES.map(m => (
          <div
            key={m}
            className={`pb-milestone ${progress >= m ? 'pb-milestone--hit' : ''}`}
            style={{ left: `${m}%` }}
            title={`${m}% milestone`}
          />
        ))}
      </div>

      <div className="pb-labels">
        <span className="pb-pct">{Math.floor(progress)}%</span>
        {MILESTONES.map(m => (
          <span
            key={m}
            className={`pb-ms-label ${progress >= m ? 'pb-ms-label--hit' : ''}`}
            style={{ left: `${m}%` }}
          >
            {m}
          </span>
        ))}
      </div>
    </div>
  )
}
