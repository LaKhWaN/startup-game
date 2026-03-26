import { useGameStore } from '../store/gameStore'
import { ROLE_LABELS, ROLE_STATS } from '../data/candidates'
import { HOURS_PER_DAY, DAYS_PER_MONTH, totalDays } from '../engine/gameEngine'
import type { Employee } from '../types'
import './EmployeePanel.css'

const ROLE_ICONS: Record<string, string> = {
  developer:       'DEV',
  product_manager: 'PM',
  sales:           'SALE',
  marketing:       'MKT',
}

function ProgressRing({ pct, size = 36 }: { pct: number; size?: number }) {
  const r = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct)
  return (
    <svg width={size} height={size} className="progress-ring">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={3} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="var(--accent)" strokeWidth={3}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  )
}

function EmployeeCard({ employee }: { employee: Employee }) {
  const fire       = useGameStore(s => s.fire)
  const features   = useGameStore(s => s.features)
  const gameTime   = useGameStore(s => s.gameTime)
  const statKeys   = ROLE_STATS[employee.role]

  const activeCampaigns = useGameStore(s => s.activeCampaigns)

  const currentFeature  = employee.currentFeatureId
    ? features.find(f => f.id === employee.currentFeatureId)
    : null

  const currentCampaign = employee.currentCampaignId
    ? activeCampaigns.find(c => c.id === employee.currentCampaignId)
    : null

  const daysSinceHired = totalDays(gameTime) - employee.hiredAtDay

  // PM: show idea progress
  const pmEta = employee.role === 'product_manager'
    ? (() => {
        const speed = employee.stats.speed ?? 5
        const interval = Math.max(1, 10 / speed)
        const remaining = (1 - employee.ideaProgress) * interval
        return remaining < 1 ? 'soon' : `~${Math.ceil(remaining)}d`
      })()
    : null

  return (
    <div className={`employee-card employee-card--${employee.role}`}>
      <div className="ec-header">
        <div className="ec-role-badge">{ROLE_ICONS[employee.role]}</div>
        <div className="ec-info">
          <span className="ec-name">{employee.name}</span>
          <span className="ec-sub">{ROLE_LABELS[employee.role]} · {daysSinceHired}d ago</span>
        </div>
        <div className="ec-right">
          <span className={`ec-status ${employee.status === 'busy' ? 'ec-status--busy' : 'ec-status--idle'}`}>
            {employee.status}
          </span>
          <button className="btn-fire" onClick={() => fire(employee.id)} title="Let go">
            ✕
          </button>
        </div>
      </div>

      {/* Developer: show current feature build progress */}
      {employee.role === 'developer' && currentFeature && (
        <div className="ec-task">
          <div className="ec-task-label">
            <span>Building: {currentFeature.title}</span>
            <span className="ec-task-pct">{Math.floor(currentFeature.buildProgress * 100)}%</span>
          </div>
          <div className="ec-progress-track">
            <div
              className="ec-progress-fill"
              style={{ width: `${currentFeature.buildProgress * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Sales/Marketing: show campaign progress */}
      {currentCampaign && (
        <div className="ec-task">
          <div className="ec-task-label">
            <span>Running: {currentCampaign.name}</span>
            <span className="ec-task-pct">{Math.floor(currentCampaign.progress * 100)}%</span>
          </div>
          <div className="ec-progress-track">
            <div
              className="ec-progress-fill"
              style={{ width: `${currentCampaign.progress * 100}%`, background: 'var(--warn)' }}
            />
          </div>
        </div>
      )}

      {/* PM: show next idea countdown */}
      {employee.role === 'product_manager' && (
        <div className="ec-task">
          <span className="ec-task-label">
            Next idea: {pmEta}
            <span style={{ marginLeft: '0.5rem' }}>
              <ProgressRing pct={employee.ideaProgress} size={18} />
            </span>
          </span>
        </div>
      )}

      {/* Stats */}
      <div className="ec-stats">
        {statKeys.map(key => (
          <div key={key} className="ec-stat">
            <span className="ec-stat-key">{key.slice(0, 4)}</span>
            <span className="ec-stat-val">{employee.stats[key]}</span>
          </div>
        ))}
      </div>

      <div className="ec-salary">${employee.salary.toLocaleString()}/mo</div>
    </div>
  )
}

export function EmployeePanel() {
  const employees = useGameStore(s => s.employees)

  if (employees.length === 0) {
    return (
      <div className="employee-panel">
        <div className="ep-header">
          <span className="ep-title">Team</span>
          <span className="ep-count">0 employees</span>
        </div>
        <div className="ep-empty">
          No one hired yet. Hire from the candidates panel.
        </div>
      </div>
    )
  }

  return (
    <div className="employee-panel">
      <div className="ep-header">
        <span className="ep-title">Team</span>
        <span className="ep-count">{employees.length} employee{employees.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="ep-list">
        {employees.map(e => (
          <EmployeeCard key={e.id} employee={e} />
        ))}
      </div>
    </div>
  )
}
