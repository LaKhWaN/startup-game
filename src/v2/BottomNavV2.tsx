import './ui/BottomNav.css'

export type V2Panel = 'founder' | 'team' | 'shop' | 'map' | 'metrics'

const TABS: { id: V2Panel; label: string; icon: string }[] = [
  { id: 'founder', label: 'Founder', icon: '🧑‍💻' },
  { id: 'team', label: 'Team', icon: '👥' },
  { id: 'shop', label: 'Shop', icon: '🛒' },
  { id: 'map', label: 'Map', icon: '🗺️' },
  { id: 'metrics', label: 'Metrics', icon: '📊' },
]

interface Props {
  active: V2Panel | null
  metricsUnlocked: boolean
  teamUnlocked: boolean
  mapUnlocked: boolean
  onTabClick: (panel: V2Panel) => void
}

export function BottomNavV2({ active, metricsUnlocked, teamUnlocked, mapUnlocked, onTabClick }: Props) {
  const unlocked: Record<V2Panel, boolean> = { founder: true, team: teamUnlocked, shop: teamUnlocked, map: mapUnlocked, metrics: metricsUnlocked }
  const tabs = TABS.filter(t => unlocked[t.id])
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
