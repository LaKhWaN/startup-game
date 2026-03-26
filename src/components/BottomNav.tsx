import './BottomNav.css'

export type NavPanel = 'product' | 'team' | 'hire' | 'shop' | 'gtm' | 'metrics' | 'goals'

const TABS: { id: NavPanel; label: string; icon: string }[] = [
  { id: 'product', label: 'Product', icon: '🧩' },
  { id: 'team',    label: 'Team',    icon: '👥' },
  { id: 'hire',    label: 'Hire',    icon: '🧑‍💼' },
  { id: 'shop',    label: 'Shop',    icon: '🛒' },
  { id: 'gtm',     label: 'GTM',     icon: '📣' },
  { id: 'metrics', label: 'Metrics', icon: '📊' },
  { id: 'goals',   label: 'Goals',   icon: '🏆' },
]

interface Props {
  active: NavPanel | null
  onTabClick: (tab: NavPanel) => void
}

export function BottomNav({ active, onTabClick }: Props) {
  return (
    <nav className="bottom-nav">
      {TABS.map(tab => (
        <button
          key={tab.id}
          data-panel={tab.id}
          className={`bn-tab ${active === tab.id ? 'bn-tab--active' : ''}`}
          onClick={() => onTabClick(tab.id)}
        >
          <span className="bn-icon" aria-hidden="true">{tab.icon}</span>
          <span className="bn-label">{tab.label}</span>
          {active === tab.id && <span className="bn-indicator" />}
        </button>
      ))}
    </nav>
  )
}
