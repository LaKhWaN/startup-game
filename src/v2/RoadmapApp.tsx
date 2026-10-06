import { useState } from 'react'
import { planNextRoadmap, useV2 } from './actions'
import { canPlanRoadmap, EPIC_KINDS, EPIC_MAX_BUILDERS, roadmapCost, roadmapRound } from './epics'
import { pickResearchTemplates } from './founder'
import type { V2GameState } from './state'
import { useUi } from './ui'

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`

/** Desktop → Roadmap: regular ideas left, the big projects (epics) and the paid "plan next roadmap". */
export function RoadmapApp() {
  const state = useV2(s => s) as V2GameState
  const planning = useUi(s => !!s.planningRoadmap)
  const [error, setError] = useState<string | null>(null)
  const ideasLeft = pickResearchTemplates(state, () => 0, 999).templates.length
  const epics = state.features.filter(f => f.epic)
  const check = canPlanRoadmap(state)
  const cost = roadmapCost(state)
  const round = roadmapRound(state) + 1
  const why: Record<Exclude<typeof check, 'ok'>, string> = {
    locked: 'Opens at the Co-working space',
    busy: 'Finish the current big projects first',
    cash: `Need ${fmt(cost)}`,
  }

  async function plan() {
    setError(null)
    const r = await planNextRoadmap()
    if (r === 'failed') setError('Planning failed. Try again.')
  }

  return (
    <>
      <div className="v2-desk-gauge">
        <span><strong>Regular ideas left for research:</strong> {ideasLeft}{ideasLeft === 0 ? ' · your team has run out of ideas' : ''}</span>
        <span className="v2-muted">Big projects take weeks, up to {EPIC_MAX_BUILDERS} developers build each one together, and they grow the business past what regular features can.</span>
        <div className="v2-desk-row">
          <div><strong>🗺️ Plan roadmap {round}</strong><div className="v2-muted">8 big projects for {state.startupName} · {fmt(cost)} (75% of MRR, more each round)</div></div>
          <button className="v2-btn" disabled={check !== 'ok' || planning} onClick={plan} title={check === 'ok' ? undefined : why[check]}>
            {planning ? 'Planning…' : check === 'ok' ? `Plan (${fmt(cost)})` : why[check]}
          </button>
        </div>
        {error && <span className="v2-emp-alert">{error}</span>}
      </div>
      {epics.length === 0 && <div className="v2-muted">No big projects yet.</div>}
      {epics.map(f => {
        const kind = EPIC_KINDS[f.epic!.kind]
        const builders = f.status === 'in_development' ? 1 + (f.epic!.helpers ?? []).length : 0
        return (
          <div key={f.id} className={`v2-desk-row${f.status === 'completed' ? ' v2-desk-row--on' : ''}`}>
            <div className="v2-emp-who">
              <strong>{kind.icon} {f.title}</strong>
              <div className="v2-muted">{kind.label} · ~{f.baseDays} dev-days · {kind.blurb}</div>
              {f.status === 'in_development' && (
                <div className="v2-progress v2-emp-bar"><div className="v2-progress-fill" style={{ width: `${Math.round(f.buildProgress * 100)}%` }} /></div>
              )}
            </div>
            <span className="v2-shop-tag">
              {f.status === 'completed' ? '✅ Shipped' : f.status === 'in_development' ? `🛠️ ${Math.round(f.buildProgress * 100)}% · ${builders} dev${builders === 1 ? '' : 's'}` : 'Waiting for a developer'}
            </span>
          </div>
        )
      })}
    </>
  )
}
