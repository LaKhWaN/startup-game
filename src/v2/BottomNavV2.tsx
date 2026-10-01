import '../components/BottomNav.css'

export type V2Panel = 'founder' | 'team' | 'metrics'

const TABS: { id: V2Panel; label: string; icon: string }[] = [
  { id: 'founder', label: 'Founder', icon: '🧑‍💻' },
  { id: 'team', label: 'Team', icon: '👥' },
  { id: 'metrics', label: 'Metrics', icon: '📊' },
]

interface Props {
  active: V2Panel
  metricsUnlocked: boolean
  teamUnlocked: boolean
  onTabClick: (panel: V2Panel) => void
}

export function BottomNavV2({ active, metricsUnlocked, teamUnlocked, onTabClick }: Props) {
  const tabs = TABS.filter(t => (t.id !== 'metrics' || metricsUnlocked) && (t.id !== 'team' || teamUnlocked))
  return (
    <nav className="bottom-nav">
      {tabs.map(tab => (
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
