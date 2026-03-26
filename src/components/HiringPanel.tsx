import { useGameStore } from '../store/gameStore'
import { ROLE_LABELS, ROLE_STATS } from '../data/candidates'
import type { Candidate } from '../types'
import './HiringPanel.css'

const ROLE_ICONS: Record<string, string> = {
  developer:       'DEV',
  product_manager: 'PM',
  sales:           'SALE',
  marketing:       'MKT',
}

function StatBar({ value }: { value: number }) {
  return (
    <div className="stat-bar">
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} className={`stat-pip ${i < value ? 'stat-pip--on' : ''}`} />
      ))}
    </div>
  )
}

function CandidateCard({ candidate }: { candidate: Candidate }) {
  const hire     = useGameStore(s => s.hire)
  const employees = useGameStore(s => s.employees)
  const statKeys  = ROLE_STATS[candidate.role]

  const alreadyHired = employees.some(e => e.id === candidate.id)
  const avg = statKeys.reduce((sum: number, k: string) => sum + (candidate.stats[k] ?? 0), 0) / Math.max(1, statKeys.length)
  const level = Math.max(0, Math.min(5, Math.round((avg / 10) * 5)))
  const levelPct = Math.max(0, Math.min(100, (avg / 10) * 100))

  return (
    <div className={`candidate-card candidate-card--${candidate.role}`}>
      <div className="cc-header">
        <div className="cc-role-badge">{ROLE_ICONS[candidate.role]}</div>
        <div className="cc-info">
          <span className="cc-name">{candidate.name}</span>
          <span className="cc-role">{ROLE_LABELS[candidate.role]}</span>
        </div>
        <span className="cc-salary">${candidate.salary.toLocaleString()}/mo</span>
      </div>

      <div className="cc-overall">
        <div className="cc-overall-top">
          <span className="cc-overall-title">Overall</span>
          <span className="cc-overall-level">Level {level}/5</span>
        </div>
        <div className="cc-overall-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(levelPct)}>
          <div className="cc-overall-fill" style={{ width: `${levelPct}%` }} />
        </div>
      </div>

      <div className="cc-stats-grid">
        {statKeys.map((key) => (
          <div key={key} className="cc-stat-cell">
            <span className="cc-stat-label">{key}</span>
            <span className="cc-stat-val">{candidate.stats[key]}</span>
          </div>
        ))}
      </div>

      <button
        className="btn-hire"
        onClick={() => hire(candidate.id)}
        disabled={alreadyHired}
      >
        {alreadyHired ? 'Hired' : `Hire ${candidate.name.split(' ')[0]} →`}
      </button>
    </div>
  )
}

export function HiringPanel() {
  const candidates       = useGameStore(s => s.candidates)
  const refreshCandidates = useGameStore(s => s.refreshCandidates)

  return (
    <div className="hiring-panel">
      <div className="hp-header">
        <span className="hp-title">Candidates</span>
        <button className="btn-refresh" onClick={refreshCandidates}>
          Refresh ↺
        </button>
      </div>

      <div className="hp-list">
        {candidates.map(c => (
          <CandidateCard key={c.id} candidate={c} />
        ))}
      </div>
    </div>
  )
}
