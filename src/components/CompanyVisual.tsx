import { useGameStore } from '../store/gameStore'
import { dayOfMonth, monthOfYear, yearNumber } from '../engine/gameEngine'
import './CompanyVisual.css'

function getStage(customers: number) {
  if (customers >= 50)  return 'coworking'
  if (customers >= 10)  return 'cafe'
  return 'bedroom'
}

const STAGES = {
  bedroom: {
    label: 'Working from Bedroom',
    scene: (
      <svg viewBox="0 0 200 120" className="company-svg">
        {/* Room */}
        <rect x="0" y="0" width="200" height="120" fill="#f8f4ec" />
        {/* Back wall */}
        <rect x="10" y="10" width="180" height="80" fill="#fffdf5" rx="3" stroke="#e4d9c8" strokeWidth="1" />
        {/* Window */}
        <rect x="130" y="18" width="45" height="32" fill="#fef9e7" rx="2" stroke="#f5e6b8" strokeWidth="1" />
        <line x1="152" y1="18" x2="152" y2="50" stroke="#f5e6b8" strokeWidth="1" />
        <line x1="130" y1="34" x2="175" y2="34" stroke="#f5e6b8" strokeWidth="1" />
        {/* Sun outside */}
        <circle cx="158" cy="26" r="5" fill="#fbbf24" opacity="0.9" />
        {/* Bed */}
        <rect x="20" y="65" width="85" height="10" fill="#e6d9c4" rx="2" />
        <rect x="22" y="60" width="30" height="10" fill="#ddd6fe" rx="2" />
        <rect x="20" y="75" width="85" height="18" fill="#e6d9c4" />
        {/* Laptop on desk */}
        <rect x="55" y="48" width="55" height="20" fill="#d4c9b4" rx="2" />
        <rect x="57" y="50" width="51" height="16" fill="#fdf8ee" rx="1" />
        {/* Screen content */}
        <rect x="60" y="53" width="18" height="2" fill="#0ea5e9" opacity="0.7" rx="1" />
        <rect x="60" y="57" width="28" height="1" fill="#a09070" opacity="0.5" rx="1" />
        <rect x="60" y="60" width="22" height="1" fill="#a09070" opacity="0.5" rx="1" />
        {/* Keyboard */}
        <rect x="60" y="69" width="22" height="4" fill="#d4c9b4" rx="1" />
        {/* Plant */}
        <rect x="163" y="80" width="5" height="12" fill="#92400e" rx="1" />
        <ellipse cx="165" cy="77" rx="9" ry="7" fill="#4ade80" opacity="0.8" />
        <ellipse cx="160" cy="81" rx="5" ry="4" fill="#22c55e" opacity="0.7" />
        {/* Floor */}
        <rect x="0" y="95" width="200" height="25" fill="#f2ece0" />
        <line x1="0" y1="95" x2="200" y2="95" stroke="#e4d9c8" strokeWidth="1" />
      </svg>
    ),
  },
  cafe: {
    label: 'Working from Coffee Shop',
    scene: (
      <svg viewBox="0 0 200 120" className="company-svg">
        {/* Background */}
        <rect x="0" y="0" width="200" height="120" fill="#fdf5e4" />
        {/* Back wall warm tint */}
        <rect x="0" y="0" width="200" height="70" fill="#fef3c7" opacity="0.5" />
        {/* Counter */}
        <rect x="0" y="5" width="45" height="55" fill="#d97706" rx="2" opacity="0.18" />
        <rect x="155" y="5" width="45" height="55" fill="#d97706" rx="2" opacity="0.18" />
        {/* Menu board */}
        <rect x="75" y="5" width="50" height="30" fill="#3c2a10" rx="2" opacity="0.85" />
        <rect x="80" y="10" width="25" height="1.5" fill="#fde68a" rx="1" />
        <rect x="80" y="14" width="18" height="1" fill="#fde68a" opacity="0.6" rx="1" />
        <rect x="80" y="17" width="22" height="1" fill="#fde68a" opacity="0.6" rx="1" />
        {/* Floor */}
        <rect x="0" y="95" width="200" height="25" fill="#f2e8d0" />
        <line x1="0" y1="95" x2="200" y2="95" stroke="#e4d9c8" strokeWidth="1" />
        {/* Table 1 */}
        <ellipse cx="72" cy="78" rx="26" ry="7" fill="#d4b896" />
        <rect x="69" y="78" width="6" height="20" fill="#b8946a" />
        {/* Laptop on table 1 */}
        <rect x="52" y="64" width="32" height="15" fill="#c8b89a" rx="2" />
        <rect x="54" y="66" width="28" height="11" fill="#fdf8ee" rx="1" />
        <rect x="57" y="69" width="10" height="1.5" fill="#0ea5e9" opacity="0.7" rx="1" />
        <rect x="57" y="72" width="16" height="1" fill="#a09070" opacity="0.5" rx="1" />
        {/* Coffee cup */}
        <rect x="92" y="67" width="11" height="13" fill="#f5ede0" rx="1" stroke="#c8a87a" strokeWidth="0.5" />
        <ellipse cx="97" cy="67" rx="5.5" ry="2" fill="#b8784a" />
        <path d="M103,72 Q108,72 108,76 Q108,80 103,80" fill="none" stroke="#c8a87a" strokeWidth="1" />
        {/* Table 2 */}
        <ellipse cx="138" cy="78" rx="26" ry="7" fill="#d4b896" />
        <rect x="135" y="78" width="6" height="20" fill="#b8946a" />
        {/* Second laptop */}
        <rect x="118" y="62" width="32" height="16" fill="#c8b89a" rx="2" />
        <rect x="120" y="64" width="28" height="12" fill="#fdf8ee" rx="1" />
        <rect x="123" y="68" width="12" height="1.5" fill="#f97316" opacity="0.7" rx="1" />
        <rect x="123" y="72" width="18" height="1" fill="#a09070" opacity="0.5" rx="1" />
      </svg>
    ),
  },
  coworking: {
    label: 'Co-working Space',
    scene: (
      <svg viewBox="0 0 200 120" className="company-svg">
        {/* Background */}
        <rect x="0" y="0" width="200" height="120" fill="#f8f4ec" />
        {/* Ceiling */}
        <rect x="0" y="0" width="200" height="12" fill="#e8dfc8" />
        {/* Windows top */}
        <rect x="8" y="2" width="58" height="30" fill="#fef9e7" rx="2" stroke="#f5e6b8" strokeWidth="1" />
        <rect x="134" y="2" width="58" height="30" fill="#fef9e7" rx="2" stroke="#f5e6b8" strokeWidth="1" />
        <line x1="37" y1="2" x2="37" y2="32" stroke="#f5e6b8" strokeWidth="1" />
        <line x1="163" y1="2" x2="163" y2="32" stroke="#f5e6b8" strokeWidth="1" />
        <line x1="8" y1="17" x2="66" y2="17" stroke="#f5e6b8" strokeWidth="1" />
        <line x1="134" y1="17" x2="192" y2="17" stroke="#f5e6b8" strokeWidth="1" />
        {/* Long desk */}
        <rect x="15" y="52" width="170" height="8" fill="#d4c4a8" rx="2" />
        <rect x="18" y="60" width="4" height="32" fill="#c0b090" />
        <rect x="178" y="60" width="4" height="32" fill="#c0b090" />
        {/* Workstations */}
        {[22, 58, 94, 130].map((x, i) => (
          <g key={i}>
            <rect x={x} y="38" width="30" height="15" fill="#c8b89a" rx="2" />
            <rect x={x+2} y="40" width="26" height="11" fill="#fdf8ee" rx="1" />
            <rect x={x+5} y="43" width={i % 2 === 0 ? 10 : 14} height="1.5" fill={i % 2 === 0 ? '#0ea5e9' : '#10b981'} opacity="0.7" rx="1" />
            <rect x={x+5} y="47" width="16" height="1" fill="#a09070" opacity="0.4" rx="1" />
            <rect x={x+11} y="53" width="8" height="4" fill="#d4c4a8" rx="1" />
          </g>
        ))}
        {/* People (silhouettes) */}
        {[30, 66, 102, 138].map((x, i) => (
          <g key={i}>
            <ellipse cx={x+6} cy="70" rx="6" ry="6" fill={['#bfdbfe','#ddd6fe','#bbf7d0','#fed7aa'][i]} />
            <rect x={x+2} y="76" width="8" height="10" fill={['#bfdbfe','#ddd6fe','#bbf7d0','#fed7aa'][i]} rx="2" opacity="0.7" />
          </g>
        ))}
        {/* Plant in corner */}
        <rect x="183" y="82" width="5" height="15" fill="#92400e" rx="1" />
        <ellipse cx="185" cy="79" rx="8" ry="6" fill="#4ade80" opacity="0.8" />
        {/* Floor */}
        <rect x="0" y="98" width="200" height="22" fill="#f2ece0" />
        <line x1="0" y1="98" x2="200" y2="98" stroke="#e4d9c8" strokeWidth="1" />
      </svg>
    ),
  },
}

export function CompanyVisual() {
  const customers = useGameStore(s => s.customers)
  const gameTime  = useGameStore(s => s.gameTime)
  const name      = useGameStore(s => s.startupName)

  const stage = getStage(customers)
  const { label, scene } = STAGES[stage]

  const dom = dayOfMonth(gameTime)
  const moy = monthOfYear(gameTime)
  const yr  = yearNumber(gameTime)

  return (
    <div className="company-visual">
      <div className="cv-header">
        <span className="cv-name">{name}</span>
        <span className="cv-date">Month {moy}, Day {dom}, Year {yr}</span>
      </div>
      <div className="cv-scene">{scene}</div>
      <div className="cv-label">{label}</div>
    </div>
  )
}
