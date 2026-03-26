import { useGameStore } from '../store/gameStore'
import { MILESTONES } from '../data/milestones'
import type { MilestoneCategory } from '../types'
import './MilestonesPanel.css'

const CATEGORY_LABELS: Record<MilestoneCategory, string> = {
  revenue: 'Revenue',
  users:   'Users',
  product: 'Product',
  team:    'Team',
}

const CATEGORY_ORDER: MilestoneCategory[] = ['revenue', 'users', 'product', 'team']

export function MilestonesPanel() {
  const completedIds = useGameStore(s => s.completedMilestoneIds)

  const total     = MILESTONES.length
  const completed = completedIds.length

  return (
    <div className="rp-content">
      <div className="ms-header">
        <span className="ms-header-title">Goals & Milestones</span>
        <span className="ms-header-count">{completed} / {total}</span>
      </div>

      <div className="ms-progress-bar">
        <div className="ms-progress-fill" style={{ width: `${(completed / total) * 100}%` }} />
      </div>

      {CATEGORY_ORDER.map(cat => {
        const group = MILESTONES.filter(m => m.category === cat)
        const firstIncompleteIdx = group.findIndex(m => !completedIds.includes(m.id))

        return (
          <section key={cat} className="rp-section">
            <div className="rp-section-label">{CATEGORY_LABELS[cat]}</div>
            {group.map((m, i) => {
              const done = completedIds.includes(m.id)
              const isNext = !done && i === firstIncompleteIdx

              let rowClass = 'ms-row'
              if (done) rowClass += ' ms-row--done'
              else if (isNext) rowClass += ' ms-row--next'
              else rowClass += ' ms-row--locked'

              return (
                <div key={m.id} className={rowClass}>
                  <span className="ms-icon">{done ? '✓' : m.icon}</span>
                  <div className="ms-info">
                    <span className="ms-name">{m.title}</span>
                    <span className="ms-desc">{m.description}</span>
                  </div>
                  {isNext && <span className="ms-next-badge">Next</span>}
                </div>
              )
            })}
          </section>
        )
      })}
    </div>
  )
}
