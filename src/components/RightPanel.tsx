import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { CAMPAIGN_TEMPLATES } from '../data/campaigns'
import { getMonthlyBurn, getRunwayMonths, estimateFeatureEffects, DESK_PRICE, MAX_DESKS, xpForNextLevel } from '../engine/gameEngine'
import { MilestonesPanel } from './MilestonesPanel'
import type { NavPanel } from './BottomNav'
import './RightPanel.css'

// ─── Product Panel ───────────────────────────────────────────────────────────

const VALUE_TAG: Record<string, string>  = { high: 'CORE', medium: 'GROWTH', low: 'INFRA' }
const VALUE_COLOR: Record<string, string> = {
  high:   'var(--accent)',
  medium: 'var(--warn)',
  low:    'var(--muted)',
}

const IMPACT_META: Record<string, { label: string; color: string; bg: string }> = {
  users:       { label: 'Users ↑',      color: 'var(--purple)', bg: 'rgba(139,92,246,0.1)'   },
  churn:       { label: 'Churn ↓',      color: 'var(--green)',  bg: 'rgba(16,185,129,0.1)'   },
  mrr:         { label: 'MRR ↑',        color: 'var(--green)',  bg: 'rgba(16,185,129,0.1)'   },
  upsell:      { label: 'Upsell',       color: 'var(--orange)', bg: 'rgba(249,115,22,0.1)'   },
  activation:  { label: 'Activation',   color: 'var(--yellow)', bg: 'rgba(245,158,11,0.1)'   },
  reach:       { label: 'Reach ↑',      color: 'var(--purple)', bg: 'rgba(139,92,246,0.1)'   },
  enterprise:  { label: 'Enterprise',   color: 'var(--muted)',  bg: 'rgba(107,114,128,0.1)'  },
  integration: { label: 'Integrations', color: 'var(--accent)', bg: 'rgba(14,165,233,0.1)'   },
}

function EffectsDisplay({ effects, tradeoffHint }: { effects?: import('../types').FeatureEffects; tradeoffHint?: string }) {
  const eff = effects ?? {}
  const parts: { text: string; color: string }[] = []
  if (eff.customers && eff.customers > 0) parts.push({ text: `+${eff.customers} users`, color: 'var(--green)' })
  if (eff.customers && eff.customers < 0) parts.push({ text: `${eff.customers} users`, color: 'var(--red)' })
  if (eff.arpu && eff.arpu > 0) parts.push({ text: `+$${eff.arpu} ARPU`, color: 'var(--green)' })
  if (eff.arpu && eff.arpu < 0) parts.push({ text: `-$${Math.abs(eff.arpu)} ARPU`, color: 'var(--red)' })
  if (eff.churnRate && eff.churnRate < 0) parts.push({ text: `${eff.churnRate}% churn`, color: 'var(--green)' })
  if (eff.churnRate && eff.churnRate > 0) parts.push({ text: `+${eff.churnRate}% churn`, color: 'var(--red)' })
  if (eff.brand && eff.brand > 0) parts.push({ text: `+${eff.brand} brand`, color: 'var(--purple)' })
  if (eff.techDebt && eff.techDebt > 0) parts.push({ text: `+${eff.techDebt} debt`, color: 'var(--orange)' })
  if (eff.techDebt && eff.techDebt < 0) parts.push({ text: `${eff.techDebt} debt`, color: 'var(--green)' })
  if (eff.cashBonus && eff.cashBonus > 0) parts.push({ text: `+$${eff.cashBonus}`, color: 'var(--green)' })

  return (
    <div className="rfc-effects">
      <div className="rfc-effects-row">
        {parts.map((p, i) => (
          <span key={i} className="rfc-effect-chip" style={{ color: p.color }}>{p.text}</span>
        ))}
      </div>
      {tradeoffHint && <div className="rfc-tradeoff">{tradeoffHint}</div>}
    </div>
  )
}

function ProductPanel() {
  const features      = useGameStore(s => s.features)
  const employees     = useGameStore(s => s.employees)
  const techDebt      = useGameStore(s => s.techDebt)
  const refactorDevId = useGameStore(s => s.refactorDevId)
  const refactorProg  = useGameStore(s => s.refactorProgress)
  const assignFeature = useGameStore(s => s.assignFeature)
  const startRefactor = useGameStore(s => s.startRefactor)

  const proposed = features.filter(f => f.status === 'proposed')
  const inDev    = features.filter(f => f.status === 'in_development')
  const shipped  = features.filter(f => f.status === 'completed')
  const idleDevs = employees.filter(e => e.role === 'developer' && e.status === 'idle')

  return (
    <div className="rp-content">
      <div className="rp-stats-row">
        <div className="rp-stat">
          <span className="rp-stat-val">{proposed.length}</span>
          <span className="rp-stat-lbl">proposed</span>
        </div>
        <div className="rp-stat">
          <span className="rp-stat-val">{inDev.length}</span>
          <span className="rp-stat-lbl">in dev</span>
        </div>
        <div className="rp-stat">
          <span className="rp-stat-val">{shipped.length}</span>
          <span className="rp-stat-lbl">shipped</span>
        </div>
      </div>

      {inDev.length > 0 && (
        <section className="rp-section">
          <div className="rp-section-label">In Progress</div>
          {inDev.map(f => {
            const dev = employees.find(e => e.currentFeatureId === f.id)
            return (
              <div key={f.id} className={`rp-feature-card rp-feature-card--active rfc-value--${f.value}`}>
                <div className="rfc-top">
                  <span className="rfc-name">{f.title}</span>
                  <span className="rfc-tag" style={{ color: VALUE_COLOR[f.value] }}>
                    {VALUE_TAG[f.value]}
                  </span>
                </div>
                {dev && <div className="rfc-sub">Built by {dev.name.split(' ')[0]}</div>}

                <EffectsDisplay effects={f.effects} tradeoffHint={f.tradeoffHint} />

                <div className="rfc-impacts">
                  {f.impacts.map(imp => {
                    const m = IMPACT_META[imp]
                    return (
                      <span key={imp} className="rfc-impact-tag" style={{ color: m.color, background: m.bg }}>
                        {m.label}
                      </span>
                    )
                  })}
                </div>
                <div className="rfc-bar-track">
                  <div className="rfc-bar-fill" style={{ width: `${f.buildProgress * 100}%` }} />
                </div>
                <div className="rfc-pct">{Math.floor(f.buildProgress * 100)}%</div>
              </div>
            )
          })}
        </section>
      )}

      {proposed.length > 0 && (
        <section className="rp-section">
          <div className="rp-section-label">Backlog</div>
          {proposed.map(f => {
            return (
              <div key={f.id} className={`rp-feature-card rfc-value--${f.value}`}>
                <div className="rfc-top">
                  <span className="rfc-name">{f.title}</span>
                  <span className="rfc-tag" style={{ color: VALUE_COLOR[f.value] }}>
                    {VALUE_TAG[f.value]}
                  </span>
                </div>
                <div className="rfc-desc">{f.description}</div>

                <EffectsDisplay effects={f.effects} tradeoffHint={f.tradeoffHint} />

                <div className="rfc-impacts">
                  {f.impacts.map(imp => {
                    const m = IMPACT_META[imp]
                    return (
                      <span key={imp} className="rfc-impact-tag" style={{ color: m.color, background: m.bg }}>
                        {m.label}
                      </span>
                    )
                  })}
                </div>
                <div className="rfc-footer">
                  <span className="rfc-days">~{f.baseDays}d to build</span>
                  <div className="rfc-actions">
                    {idleDevs.length === 0 ? (
                      <span className="rfc-no-dev">No idle developer</span>
                    ) : (
                      <button
                        className="rfc-assign-btn"
                        onClick={() => assignFeature(f.id, idleDevs[0].id)}
                      >
                        Build with {idleDevs[0].name.split(' ')[0]} →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </section>
      )}

      {/* Tech Debt */}
      {techDebt > 10 && (
        <section className="rp-section">
          <div className="rp-section-label">Tech Debt</div>
          <div className={`rp-debt-card ${techDebt > 80 ? 'rp-debt-card--danger' : techDebt > 50 ? 'rp-debt-card--warn' : ''}`}>
            <div className="rdc-header">
              <span className="rdc-label">
                {techDebt > 80 ? 'Critical — features are very slow' : techDebt > 50 ? 'High — features are slowing down' : 'Manageable'}
              </span>
              <span className="rdc-val">{Math.round(techDebt)}/100</span>
            </div>
            <div className="rdc-track">
              <div className="rdc-fill" style={{ width: `${techDebt}%`,
                background: techDebt > 80 ? 'var(--red)' : techDebt > 50 ? 'var(--orange)' : 'var(--yellow)' }} />
            </div>
            {refactorDevId ? (
              <div className="rdc-refactor-progress">
                <span>Refactoring... {Math.round(refactorProg * 100)}%</span>
                <div className="rdc-track" style={{ marginTop: '0.3rem' }}>
                  <div className="rdc-fill" style={{ width: `${refactorProg * 100}%`, background: 'var(--green)' }} />
                </div>
              </div>
            ) : idleDevs.length > 0 ? (
              <button className="rdc-refactor-btn"
                onClick={() => startRefactor(idleDevs[0].id)}>
                Refactor Sprint · {idleDevs[0].name.split(' ')[0]} · 14d → -35 debt
              </button>
            ) : (
              <span className="rdc-no-dev">Need an idle developer to refactor</span>
            )}
          </div>
        </section>
      )}

      {proposed.length === 0 && inDev.length === 0 && (
        <div className="rp-empty">
          {employees.some(e => e.role === 'product_manager')
            ? 'PM is researching features...'
            : 'Hire a Product Manager to discover features'}
        </div>
      )}
    </div>
  )
}

// ─── Team Panel ──────────────────────────────────────────────────────────────

const ROLE_ABBR: Record<string, string> = {
  developer:       'DEV',
  product_manager: 'PM',
  sales:           'SALE',
  marketing:       'MKT',
}

const ROLE_LABEL: Record<string, string> = {
  developer:       'Developer',
  product_manager: 'Product Manager',
  sales:           'Sales',
  marketing:       'Marketing',
}

const ROLE_COLOR: Record<string, string> = {
  developer:       'var(--accent)',
  product_manager: 'var(--purple)',
  sales:           'var(--orange)',
  marketing:       'var(--green)',
}

const STAT_LABEL: Record<string, string> = {
  accuracy:   'Accuracy',
  speed:      'Speed',
  creativity: 'Creativity',
  charisma:   'Charisma',
  analytics:  'Analytics',
  hustle:     'Hustle',
}

function TeamPanel() {
  const employees   = useGameStore(s => s.employees)
  const deskCount   = useGameStore(s => s.deskCount)
  const features    = useGameStore(s => s.features)
  const campaigns   = useGameStore(s => s.activeCampaigns)
  const fire        = useGameStore(s => s.fire)

  const monthlyCost = employees.reduce((sum, e) => sum + e.salary, 0)

  function getActivity(e: (typeof employees)[0]): { text: string; progress: number | null } {
    if (e.status === 'idle') return { text: 'Idle — waiting for work', progress: null }
    if (e.role === 'developer' && e.isRefactoring) {
      return { text: 'Refactoring codebase', progress: null }
    }
    if (e.role === 'developer' && e.currentFeatureId) {
      const f = features.find(f => f.id === e.currentFeatureId)
      return f
        ? { text: `Building: ${f.title}`, progress: Math.round(f.buildProgress * 100) }
        : { text: 'Coding...', progress: null }
    }
    if (e.currentCampaignId) {
      const c = campaigns.find(c => c.id === e.currentCampaignId)
      return c
        ? { text: `Running: ${c.name}`, progress: Math.round(c.progress * 100) }
        : { text: 'On campaign', progress: null }
    }
    if (e.role === 'product_manager') return { text: 'Researching features', progress: Math.round((e.ideaProgress ?? 0) * 100) }
    return { text: 'Working...', progress: null }
  }

  if (employees.length === 0) {
    return (
      <div className="rp-content">
        <div className="rp-empty">No team yet. Go to Hire to bring someone on.</div>
      </div>
    )
  }

  return (
    <div className="rp-content">
      <div className="rp-stats-row">
        <div className="rp-stat">
          <span className="rp-stat-val">{employees.length}</span>
          <span className="rp-stat-lbl">people</span>
        </div>
        <div className="rp-stat">
          <span className="rp-stat-val">{deskCount}</span>
          <span className="rp-stat-lbl">desks</span>
        </div>
        <div className="rp-stat">
          <span className="rp-stat-val" style={{ color: 'var(--orange)' }}>
            ${monthlyCost.toLocaleString()}
          </span>
          <span className="rp-stat-lbl">burn/mo</span>
        </div>
      </div>

      <section className="rp-section">
        {employees.map(e => {
          const activity = getActivity(e)
          const isBusy   = e.status === 'busy'
          const emoji    = e.gender === 'female' ? '👩' : '👨'
          const morale   = e.morale ?? 70
          const stress   = e.stress ?? 15
          const level    = e.level ?? 1
          const xp       = e.xp ?? 0
          const xpNext   = xpForNextLevel(level)
          const xpPct    = Math.min(100, (xp / xpNext) * 100)

          return (
            <div
              key={e.id}
              className="rp-team-card"
              style={{ ['--rtc-accent' as any]: ROLE_COLOR[e.role] }}
            >
              <div className="rtc-header">
                <span className="rtc-avatar-emoji">{emoji}</span>
                <div className="rtc-identity">
                  <span className="rtc-name">{e.name}</span>
                  <span className="rtc-role" style={{ color: ROLE_COLOR[e.role] }}>
                    {ROLE_LABEL[e.role]}
                  </span>
                </div>
                <div className="rtc-right">
                  <span className="rtc-salary">${e.salary.toLocaleString()}/mo</span>
                  <button className="rp-fire-btn" onClick={() => fire(e.id)} title="Let go">✕</button>
                </div>
              </div>

              <div className={`rtc-activity ${isBusy ? 'rtc-activity--busy' : 'rtc-activity--idle'}`}>
                <span className={`rtc-status-dot ${isBusy ? 'rtc-status-dot--busy' : ''}`} />
                <span className="rtc-activity-text">{activity.text}</span>
                {activity.progress !== null && (
                  <span className="rtc-activity-pct">{activity.progress}%</span>
                )}
              </div>
              {activity.progress !== null && (
                <div className="rtc-activity-bar">
                  <div className="rtc-activity-bar-fill" style={{ width: `${activity.progress}%` }} />
                </div>
              )}

              <div className="rtc-gauges">
                <div className="rtc-gauge">
                  <div className="rtc-gauge-header">
                    <span className="rtc-gauge-icon">😊</span>
                    <span className="rtc-gauge-label">Morale</span>
                    <span className="rtc-gauge-val" style={{
                      color: morale < 30 ? 'var(--red)' : morale < 55 ? 'var(--yellow)' : 'var(--green)'
                    }}>{Math.round(morale)}</span>
                  </div>
                  <div className="rtc-gauge-track">
                    <div className="rtc-gauge-fill rtc-gauge-fill--morale" style={{ width: `${morale}%` }} />
                  </div>
                </div>
                <div className="rtc-gauge">
                  <div className="rtc-gauge-header">
                    <span className="rtc-gauge-icon">😰</span>
                    <span className="rtc-gauge-label">Stress</span>
                    <span className="rtc-gauge-val" style={{
                      color: stress > 80 ? 'var(--red)' : stress > 60 ? 'var(--orange)' : 'var(--muted)'
                    }}>{Math.round(stress)}</span>
                  </div>
                  <div className="rtc-gauge-track">
                    <div className="rtc-gauge-fill rtc-gauge-fill--stress" style={{
                      width: `${stress}%`,
                      background: stress > 80 ? 'var(--red)' : stress > 60 ? 'var(--orange)' : 'var(--yellow)'
                    }} />
                  </div>
                </div>
                <div className="rtc-gauge">
                  <div className="rtc-gauge-header">
                    <span className="rtc-gauge-icon">⭐</span>
                    <span className="rtc-gauge-label">Level {level}</span>
                    <span className="rtc-gauge-val" style={{ color: 'var(--purple)' }}>{xp} xp</span>
                  </div>
                  <div className="rtc-gauge-track">
                    <div className="rtc-gauge-fill rtc-gauge-fill--xp" style={{ width: `${xpPct}%` }} />
                  </div>
                </div>
              </div>

              <div className="rtc-stats-grid">
                {Object.entries(e.stats).map(([k, v]) => (
                  <div key={k} className="rtc-stat-cell">
                    <span className="rtc-stat-key">{(STAT_LABEL[k] ?? k).toUpperCase()}</span>
                    <span className="rtc-stat-val-num">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </section>
    </div>
  )
}

// ─── Hire Panel ──────────────────────────────────────────────────────────────

function HirePanel() {
  const employees  = useGameStore(s => s.employees)
  const deskCount  = useGameStore(s => s.deskCount)
  const candidates = useGameStore(s => s.candidates)
  const hire       = useGameStore(s => s.hire)
  const refresh    = useGameStore(s => s.refreshCandidates)

  const atCapacity = employees.length >= deskCount

  return (
    <div className="rp-content">

      <div className="rp-desk-bar">
        <div className="rp-desk-info">
          <span className="rp-desk-label">Office capacity</span>
          <span className="rp-desk-count">{employees.length} / {deskCount} desks</span>
        </div>
        <div className="rp-desk-track">
          {Array.from({ length: deskCount }, (_, i) => (
            <div key={i} className={`rp-desk-slot ${i < employees.length ? 'rp-desk-slot--filled' : ''}`} />
          ))}
          {Array.from({ length: MAX_DESKS - deskCount }, (_, i) => (
            <div key={`empty-${i}`} className="rp-desk-slot rp-desk-slot--locked" />
          ))}
        </div>
      </div>

      {atCapacity && (
        <div className="rp-capacity-warn">
          Office is full — buy a desk in the Shop to hire more.
        </div>
      )}

      <section className="rp-section">
        <div className="rp-section-header">
          <span className="rp-section-label">Candidates</span>
          <button className="rp-refresh-btn" onClick={refresh}>↺ Refresh</button>
        </div>
        {candidates.map(c => (
          <div
            key={c.id}
            className="rp-candidate-card"
            style={{ ['--rcc-accent' as any]: ROLE_COLOR[c.role] }}
          >
            <div className="rcc-top">
              <span className="rcc-avatar-emoji">{c.gender === 'female' ? '👩' : '👨'}</span>
              <div className="rcc-identity">
                <span className="rcc-name">{c.name}</span>
                <span className="rcc-role-tag" style={{ color: ROLE_COLOR[c.role] }}>
                  {ROLE_LABEL[c.role]}
                </span>
              </div>
              <span className="rcc-salary">${c.salary.toLocaleString()}/mo</span>
            </div>
            <div className="rcc-bio">{c.bio}</div>
            {(() => {
              const values = Object.values(c.stats)
              const avg = values.reduce((sum, v) => sum + v, 0) / Math.max(1, values.length)
              const level = Math.max(0, Math.min(5, Math.round((avg / 10) * 5)))
              const pct = Math.max(0, Math.min(100, (avg / 10) * 100))
              return (
                <>
                  <div className="rcc-overall">
                    <div className="rcc-overall-top">
                      <span className="rcc-overall-title">Overall</span>
                      <span className="rcc-overall-level">Level {level}/5</span>
                    </div>
                    <div
                      className="rcc-overall-bar"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(pct)}
                    >
                      <div className="rcc-overall-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  <div className="rcc-stats-grid">
                    {Object.entries(c.stats).map(([k, v]) => (
                      <div key={k} className="rcc-stat-cell">
                        <span className="rcc-stat-key">{(STAT_LABEL[k] ?? k).toUpperCase()}</span>
                        <span className="rcc-stat-val">{v}</span>
                      </div>
                    ))}
                  </div>
                </>
              )
            })()}
            <button
              className="rp-hire-btn"
              onClick={() => hire(c.id)}
              disabled={atCapacity}
              title={atCapacity ? 'No desk available' : undefined}
            >
              {atCapacity ? 'No desk available' : `Hire ${c.name.split(' ')[0]} →`}
            </button>
          </div>
        ))}
      </section>
    </div>
  )
}

// ─── Shop Panel ─────────────────────────────────────────────────────────────

function ShopPanel() {
  const cash       = useGameStore(s => s.cash)
  const deskCount  = useGameStore(s => s.deskCount)
  const employees  = useGameStore(s => s.employees)
  const buyDeskFn  = useGameStore(s => s.buyDesk)

  const canBuyDesk = deskCount < MAX_DESKS && cash >= DESK_PRICE
  const maxedDesks = deskCount >= MAX_DESKS

  return (
    <div className="rp-content">
      <div className="rp-stats-row">
        <div className="rp-stat">
          <span className="rp-stat-val" style={{ color: 'var(--green)' }}>
            ${Math.floor(cash).toLocaleString()}
          </span>
          <span className="rp-stat-lbl">cash</span>
        </div>
      </div>

      <section className="rp-section">
        <div className="rp-section-label">Office</div>

        <div className="rp-shop-card">
          <div className="rp-shop-header">
            <span className="rp-shop-icon">🪑</span>
            <div className="rp-shop-info">
              <span className="rp-shop-name">Desk</span>
              <span className="rp-shop-desc">Add a workspace for one more employee</span>
            </div>
            <span className="rp-shop-price">${DESK_PRICE.toLocaleString()}</span>
          </div>

          <div className="rp-desk-bar" style={{ marginTop: '0.6rem' }}>
            <div className="rp-desk-info">
              <span className="rp-desk-label">Current capacity</span>
              <span className="rp-desk-count">{employees.length} / {deskCount} desks</span>
            </div>
            <div className="rp-desk-track">
              {Array.from({ length: deskCount }, (_, i) => (
                <div key={i} className={`rp-desk-slot ${i < employees.length ? 'rp-desk-slot--filled' : ''}`} />
              ))}
              {Array.from({ length: MAX_DESKS - deskCount }, (_, i) => (
                <div key={`empty-${i}`} className="rp-desk-slot rp-desk-slot--locked" />
              ))}
            </div>
          </div>

          {maxedDesks ? (
            <span className="rp-desk-maxed">Max capacity reached</span>
          ) : (
            <button
              className={`rp-buy-desk-btn ${!canBuyDesk ? 'rp-buy-desk-btn--off' : ''}`}
              onClick={buyDeskFn}
              disabled={!canBuyDesk}
              title={cash < DESK_PRICE ? `Need $${DESK_PRICE.toLocaleString()}` : 'Add a desk'}
            >
              + Buy Desk · ${DESK_PRICE.toLocaleString()}
            </button>
          )}
        </div>
      </section>

      <section className="rp-section">
        <div className="rp-section-label">Coming Soon</div>
        <div className="rp-shop-coming">
          <div className="rp-shop-coming-item">
            <span>☕</span><span>Coffee Machine — boost morale</span>
          </div>
          <div className="rp-shop-coming-item">
            <span>🎮</span><span>Gaming Area — reduce stress</span>
          </div>
          <div className="rp-shop-coming-item">
            <span>📋</span><span>Whiteboard — speed up PM research</span>
          </div>
          <div className="rp-shop-coming-item">
            <span>🏢</span><span>Office Upgrade — unlock more desks</span>
          </div>
        </div>
      </section>
    </div>
  )
}

// ─── GTM Panel ───────────────────────────────────────────────────────────────

function GTMPanel() {
  const [tab, setTab] = useState<'marketing' | 'sales'>('marketing')

  const employees      = useGameStore(s => s.employees)
  const cash           = useGameStore(s => s.cash)
  const activeCampaigns = useGameStore(s => s.activeCampaigns)
  const completedIds   = useGameStore(s => s.completedCampaignIds)
  const launchCampaign = useGameStore(s => s.launchCampaign)

  const templates = CAMPAIGN_TEMPLATES.filter(t => t.type === tab)
  const running   = activeCampaigns.filter(c => c.type === tab)

  return (
    <div className="rp-content">
      <div className="rp-tab-row">
        <button
          className={`rp-tab ${tab === 'marketing' ? 'rp-tab--active' : ''}`}
          onClick={() => setTab('marketing')}
        >Marketing</button>
        <button
          className={`rp-tab ${tab === 'sales' ? 'rp-tab--active' : ''}`}
          onClick={() => setTab('sales')}
        >Sales</button>
      </div>

      {running.length > 0 && (
        <section className="rp-section">
          <div className="rp-section-label">Running</div>
          {running.map(camp => (
            <div key={camp.id} className="rp-camp-running">
              <div className="rcr-top">
                <span className="rcr-name">{camp.name}</span>
                <span className="rcr-eta">{Math.ceil((1 - camp.progress) * camp.durationDays)}d left</span>
              </div>
              <div className="rcr-by">{camp.employeeName}</div>
              <div className="rcr-bar"><div className="rcr-fill" style={{ width: `${camp.progress * 100}%` }} /></div>
              <div className="rcr-foot">
                <span className="rcr-pct">{Math.floor(camp.progress * 100)}%</span>
                <span className="rcr-exp">+{camp.expectedMin}–{camp.expectedMax} users</span>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="rp-section">
        <div className="rp-section-label">Available</div>
        {templates.map(t => {
          const idleWorkers  = employees.filter(e => e.role === t.requires && e.status === 'idle')
          const isRunning    = activeCampaigns.some(c => c.templateId === t.id)
          const isDone       = t.oneTimeOnly && completedIds.includes(t.id)
          const cantAfford   = cash < t.cost
          const noWorker     = idleWorkers.length === 0
          const disabled     = isRunning || isDone || cantAfford || noWorker

          let reason = ''
          if (isDone)      reason = 'Already done'
          else if (isRunning)  reason = 'Running'
          else if (cantAfford) reason = `Need $${t.cost.toLocaleString()}`
          else if (noWorker)   reason = `No idle ${t.requires.replace('_', ' ')}`

          const empId = idleWorkers[0]?.id ?? ''

          return (
            <div key={t.id} className={`rp-camp-card ${disabled ? 'rp-camp-card--off' : ''}`}>
              <div className="rcc-top">
                <span className="rcc-name">{t.name}</span>
                {t.oneTimeOnly && <span className="rcc-once">1×</span>}
              </div>
              <div className="rcc-meta">
                <span className="rcc-cost">{t.cost === 0 ? 'Free' : `$${t.cost.toLocaleString()}`}</span>
                <span className="rcc-dot">·</span>
                <span className="rcc-dur">{t.durationDays}d</span>
                <span className="rcc-dot">·</span>
                <span className="rcc-gain">+{t.baseCustomerGain[0]}–{t.baseCustomerGain[1]} users</span>
                {t.churnEffect && (
                  <>
                    <span className="rcc-dot">·</span>
                    <span className={t.churnEffect > 0 ? 'rcc-churn-up' : 'rcc-churn-down'}>
                      churn {t.churnEffect > 0 ? '+' : ''}{t.churnEffect}%
                    </span>
                  </>
                )}
              </div>
              {disabled ? (
                <span className="rcc-reason">{reason}</span>
              ) : (
                <button
                  className="rcc-launch-btn"
                  onClick={() => launchCampaign(t.id, empId)}
                >
                  Launch{idleWorkers[0] ? ` · ${idleWorkers[0].name.split(' ')[0]}` : ''} →
                </button>
              )}
            </div>
          )
        })}
      </section>
    </div>
  )
}

// ─── Metrics Panel ───────────────────────────────────────────────────────────

type CellColor = 'cyan' | 'purple' | 'green' | 'yellow' | 'orange' | 'red'

function MetCell({ label, value, color }: { label: string; value: string; color: CellColor }) {
  return (
    <div className={`rpm-cell rpm-cell--${color}`}>
      <span className="rpm-cell-label">{label}</span>
      <span className={`rpm-cell-value rpm-${color}`}>{value}</span>
    </div>
  )
}

function CompanyBar({ label, value, color, warnBelow, warnAbove }: {
  label: string; value: number; color: string; warnBelow?: number; warnAbove?: number
}) {
  const isWarn = (warnBelow !== undefined && value < warnBelow) || (warnAbove !== undefined && value > warnAbove)
  const isDanger = (warnBelow !== undefined && value < warnBelow * 0.5) || (warnAbove !== undefined && value > warnAbove * 1.3)
  const barColor = isDanger ? 'var(--red)' : isWarn ? 'var(--yellow)' : color
  return (
    <div className="rpm-company-bar">
      <div className="rpm-cb-header">
        <span className="rpm-cb-label">{label}</span>
        <span className="rpm-cb-val" style={{ color: barColor }}>{Math.round(value)}</span>
      </div>
      <div className="rpm-cb-track">
        <div className="rpm-cb-fill" style={{ width: `${value}%`, background: barColor }} />
      </div>
    </div>
  )
}

function MetricsPanel() {
  const state   = useGameStore(s => s)
  const burn    = getMonthlyBurn(state)
  const runway  = getRunwayMonths(state)
  const shipped = state.features.filter(f => f.status === 'completed').length
  const netFlow = state.mrr - burn

  const cashColor: CellColor =
    state.cash < 20_000 ? 'red' : state.cash < 50_000 ? 'yellow' : 'green'
  const churnColor: CellColor =
    state.churnRate > 25 ? 'red' : state.churnRate > 12 ? 'yellow' : 'green'
  const runwayColor: CellColor =
    runway < 3 ? 'red' : runway < 6 ? 'yellow' : 'green'
  const mrrColor: CellColor =
    state.mrr === 0 ? 'yellow' : netFlow > 0 ? 'green' : 'cyan'

  return (
    <div className="rp-content">
      <div className="rpm-grid">
        <MetCell label="MRR"      value={`$${state.mrr.toLocaleString()}`}               color={mrrColor} />
        <MetCell label="Users"    value={state.customers.toLocaleString()}                color="purple" />
        <MetCell label="Churn"    value={`${state.churnRate.toFixed(1)}%`}               color={churnColor} />
        <MetCell label="Cash"     value={`$${Math.floor(state.cash).toLocaleString()}`}  color={cashColor} />
        <MetCell label="Burn/mo"  value={`$${burn.toLocaleString()}`}                    color="orange" />
        <MetCell label="Runway"   value={runway >= 999 ? '∞' : `${runway} mo`}          color={runwayColor} />
        <MetCell label="Team"     value={state.employees.length.toString()}               color="purple" />
        <MetCell label="Shipped"  value={shipped.toString()}                              color="cyan" />
        <MetCell label="Product"  value={`${Math.floor(state.productProgress)}%`}        color="cyan" />
        <MetCell label="Equity"   value={`${state.equity}%`}                             color="green" />
      </div>

      <section className="rp-section" style={{ marginTop: '1.2rem' }}>
        <div className="rp-section-label">Company Health</div>
        <CompanyBar label="Culture"   value={state.culture}   color="var(--purple)" warnBelow={35} />
        <CompanyBar label="Brand"     value={state.brand}     color="var(--accent)"  warnBelow={20} />
        <CompanyBar label="Tech Debt" value={state.techDebt}  color="var(--green)"   warnAbove={60} />
        <div className="rpm-investor-row">
          <span className="rpm-investor-label">Investor Interest</span>
          <div className="rpm-investor-track">
            <div className="rpm-investor-fill" style={{ width: `${state.investorInterest}%` }} />
            <div className="rpm-investor-thresh" style={{ left: '70%' }} title="Seed trigger" />
            <div className="rpm-investor-thresh" style={{ left: '85%' }} title="Series A trigger" />
          </div>
          <span className="rpm-investor-val">{Math.round(state.investorInterest)}</span>
        </div>
      </section>

      <section className="rp-section">
        <div className="rp-section-label">Goals</div>
        <div className={`rpm-goal ${state.earlyGoalReached ? 'rpm-goal--done' : ''}`}>
          <span>{state.earlyGoalReached ? '✓' : '○'} $1,000 MRR</span>
          <span className="rpm-goal-pct">{Math.min(100, Math.floor((state.mrr / 1000) * 100))}%</span>
        </div>
        <div className={`rpm-goal ${state.mrr >= 10000 ? 'rpm-goal--done' : ''}`}>
          <span>{state.mrr >= 10000 ? '✓' : '○'} $10,000 MRR</span>
          <span className="rpm-goal-pct">{Math.min(100, Math.floor((state.mrr / 10000) * 100))}%</span>
        </div>
      </section>
    </div>
  )
}

// ─── Main RightPanel ─────────────────────────────────────────────────────────

interface Props {
  activePanel: NavPanel
}

const PANEL_TITLE: Record<NavPanel, string> = {
  product: 'Product',
  team:    'Team',
  hire:    'Hire',
  shop:    'Shop',
  gtm:     'Campaigns',
  metrics: 'Metrics',
  goals:   'Goals',
}

export function RightPanel({ activePanel }: Props) {
  const pendingEvent = useGameStore(s => s.pendingEvent)
  const refactorDevId = useGameStore(s => s.refactorDevId)
  const refactorProgress = useGameStore(s => s.refactorProgress)
  const employees = useGameStore(s => s.employees)
  const features = useGameStore(s => s.features)
  const activeCampaigns = useGameStore(s => s.activeCampaigns)

  type TaskTone = 'warn' | 'accent' | 'neutral'
  type TaskItem = { title: string; subtitle: string; pct: number | null; meta: string; tone: TaskTone }

  const tasks: TaskItem[] = []

  if (pendingEvent) {
    tasks.push({
      title: 'Event decision needed',
      subtitle: pendingEvent.title,
      pct: null,
      meta: 'Paused until choice',
      tone: 'warn',
    })
  }

  if (refactorDevId) {
    const dev = employees.find(e => e.id === refactorDevId)
    tasks.push({
      title: 'Refactor sprint',
      subtitle: dev ? `${dev.name.split(' ')[0]} is refactoring` : 'Refactoring in progress',
      pct: Math.max(0, Math.min(100, Math.round((refactorProgress ?? 0) * 100))),
      meta: 'Reducing tech debt',
      tone: 'accent',
    })
  }

  for (const f of features) {
    if (f.status !== 'in_development') continue
    const dev = employees.find(e => e.currentFeatureId === f.id)
    tasks.push({
      title: 'Building feature',
      subtitle: dev ? `${dev.name.split(' ')[0]}: ${f.title}` : f.title,
      pct: Math.max(0, Math.min(100, Math.round((f.buildProgress ?? 0) * 100))),
      meta: 'Product progress',
      tone: 'accent',
    })
    break
  }

  if (activeCampaigns.length > 0) {
    const running = activeCampaigns[0]
    tasks.push({
      title: 'Running campaign',
      subtitle: `${running.employeeName.split(' ')[0]}: ${running.name}`,
      pct: Math.max(0, Math.min(100, Math.round((running.progress ?? 0) * 100))),
      meta: 'Growth in progress',
      tone: 'accent',
    })
  }

  if (tasks.length === 0) {
    const idle = employees.filter(e => e.status === 'idle').length
    const busy = employees.length - idle
    tasks.push({
      title: 'No major task right now',
      subtitle: employees.length === 0 ? 'Hire your first employee' : `${busy} busy · ${idle} idle`,
      pct: null,
      meta: employees.length === 0 ? 'Open Hire to get started' : 'Assign work from Product or Campaigns',
      tone: 'neutral',
    })
  }

  return (
    <aside className="right-panel right-panel--open">
      <div className="rp-header">
        <span className="rp-title">{PANEL_TITLE[activePanel]}</span>
      </div>
      <div className="rp-body">
        <div className="rp-scroll">
          {activePanel === 'product'  && <ProductPanel />}
          {activePanel === 'team'     && <TeamPanel />}
          {activePanel === 'hire'     && <HirePanel />}
          {activePanel === 'shop'     && <ShopPanel />}
          {activePanel === 'gtm'      && <GTMPanel />}
          {activePanel === 'metrics'  && <MetricsPanel />}
          {activePanel === 'goals'    && <MilestonesPanel />}
        </div>

      </div>
    </aside>
  )
}
