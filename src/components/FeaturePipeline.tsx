import { useGameStore } from '../store/gameStore'
import type { Feature } from '../types'
import './FeaturePipeline.css'

const VALUE_COLOR: Record<string, string> = {
  high:   'var(--accent)',
  medium: 'var(--warn)',
  low:    'var(--muted)',
}

const VALUE_LABEL: Record<string, string> = {
  high:   'HIGH',
  medium: 'MED',
  low:    'LOW',
}

function FeatureCard({ feature }: { feature: Feature }) {
  const employees    = useGameStore(s => s.employees)
  const assignFeature = useGameStore(s => s.assignFeature)

  const idleDevs = employees.filter(e => e.role === 'developer' && e.status === 'idle')
  const assignedDev = feature.assignedToDevId
    ? employees.find(e => e.id === feature.assignedToDevId)
    : null

  function handleAssign() {
    if (idleDevs.length === 0) return
    assignFeature(feature.id, idleDevs[0].id)
  }

  return (
    <div className={`feature-card feature-card--${feature.status}`}>
      <div className="fc-top">
        <span className="fc-value" style={{ color: VALUE_COLOR[feature.value] }}>
          {VALUE_LABEL[feature.value]}
        </span>
        <span className="fc-title">{feature.title}</span>
      </div>
      <p className="fc-desc">{feature.description}</p>

      {feature.status === 'proposed' && (
        <div className="fc-footer">
          <span className="fc-days">~{feature.baseDays}d to build</span>
          {idleDevs.length > 0 ? (
            <button className="btn-assign" onClick={handleAssign}>
              Assign to {idleDevs[0].name.split(' ')[0]} →
            </button>
          ) : (
            <span className="fc-no-dev">No idle developer</span>
          )}
        </div>
      )}

      {feature.status === 'in_development' && (
        <div className="fc-build">
          <div className="fc-build-label">
            <span>{assignedDev?.name ?? 'Developer'}</span>
            <span>{Math.floor(feature.buildProgress * 100)}%</span>
          </div>
          <div className="fc-progress-track">
            <div
              className="fc-progress-fill"
              style={{ width: `${feature.buildProgress * 100}%` }}
            />
          </div>
        </div>
      )}

      {feature.status === 'completed' && (
        <div className="fc-shipped">Shipped · Day {feature.completedAtDay}</div>
      )}
    </div>
  )
}

export function FeaturePipeline() {
  const features = useGameStore(s => s.features)

  const proposed    = features.filter(f => f.status === 'proposed')
  const inDev       = features.filter(f => f.status === 'in_development')
  const completed   = features.filter(f => f.status === 'completed').slice(-5).reverse()

  return (
    <div className="feature-pipeline">
      <div className="fp-header">
        <span className="fp-title">Feature Pipeline</span>
        <span className="fp-hint">PM discovers → you assign → dev builds</span>
      </div>

      <div className="fp-columns">
        <div className="fp-col">
          <div className="fp-col-header">
            <span>Proposed</span>
            <span className="fp-col-count">{proposed.length}</span>
          </div>
          {proposed.length === 0 ? (
            <div className="fp-empty">Waiting for a PM to discover features…</div>
          ) : (
            proposed.map(f => <FeatureCard key={f.id} feature={f} />)
          )}
          {proposed.length >= 5 && (
            <div className="fp-backlog-hint">PM paused — assign features to unblock</div>
          )}
        </div>

        <div className="fp-col">
          <div className="fp-col-header">
            <span>In Progress</span>
            <span className="fp-col-count">{inDev.length}</span>
          </div>
          {inDev.length === 0 ? (
            <div className="fp-empty">Nothing in progress.</div>
          ) : (
            inDev.map(f => <FeatureCard key={f.id} feature={f} />)
          )}
        </div>

        <div className="fp-col">
          <div className="fp-col-header">
            <span>Shipped</span>
            <span className="fp-col-count">{completed.length}</span>
          </div>
          {completed.length === 0 ? (
            <div className="fp-empty">Nothing shipped yet.</div>
          ) : (
            completed.map(f => <FeatureCard key={f.id} feature={f} />)
          )}
        </div>
      </div>
    </div>
  )
}
