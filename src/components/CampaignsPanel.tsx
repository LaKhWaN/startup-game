import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { CAMPAIGN_TEMPLATES } from '../data/campaigns'
import type { CampaignTemplate, ActiveCampaign } from '../types'
import './CampaignsPanel.css'

type Tab = 'marketing' | 'sales'

function daysLeft(camp: ActiveCampaign): number {
  return Math.ceil((1 - camp.progress) * camp.durationDays)
}

function ActiveCampaignCard({ camp }: { camp: ActiveCampaign }) {
  const pct = Math.floor(camp.progress * 100)
  return (
    <div className={`active-camp active-camp--${camp.type}`}>
      <div className="ac-top">
        <span className="ac-name">{camp.name}</span>
        <span className="ac-eta">{daysLeft(camp)}d left</span>
      </div>
      <div className="ac-by">{camp.employeeName}</div>
      <div className="ac-progress-track">
        <div className="ac-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="ac-footer">
        <span className="ac-pct">{pct}%</span>
        <span className="ac-expected">
          +{camp.expectedMin}–{camp.expectedMax} users
          {camp.churnEffect
            ? ` · churn ${camp.churnEffect > 0 ? '+' : ''}${camp.churnEffect}%`
            : ''}
        </span>
      </div>
    </div>
  )
}

function CampaignCard({ template }: { template: CampaignTemplate }) {
  const employees          = useGameStore(s => s.employees)
  const cash               = useGameStore(s => s.cash)
  const activeCampaigns    = useGameStore(s => s.activeCampaigns)
  const completedIds       = useGameStore(s => s.completedCampaignIds)
  const doLaunch           = useGameStore(s => s.launchCampaign)

  const [selected, setSelected] = useState<string>('')

  const idleWorkers = employees.filter(
    e => e.role === template.requires && e.status === 'idle'
  )
  const isAlreadyRunning = activeCampaigns.some(c => c.templateId === template.id)
  const isOneTimeDone    = template.oneTimeOnly && completedIds.includes(template.id)
  const cantAfford       = cash < template.cost
  const noWorker         = idleWorkers.length === 0

  const disabled = isAlreadyRunning || isOneTimeDone || cantAfford || noWorker

  function handleLaunch() {
    const empId = selected || (idleWorkers[0]?.id ?? '')
    if (!empId) return
    doLaunch(template.id, empId)
    setSelected('')
  }

  let disabledReason = ''
  if (isOneTimeDone)    disabledReason = 'Already done'
  else if (isAlreadyRunning) disabledReason = 'Running'
  else if (cantAfford)  disabledReason = `Need $${template.cost.toLocaleString()}`
  else if (noWorker)    disabledReason = `No idle ${template.requires.replace('_', ' ')}`

  return (
    <div className={`camp-card camp-card--${template.type} ${disabled ? 'camp-card--disabled' : ''}`}>
      <div className="cc2-top">
        <span className="cc2-name">{template.name}</span>
        {template.oneTimeOnly && <span className="cc2-badge">ONE-TIME</span>}
      </div>

      <p className="cc2-desc">{template.description}</p>

      <div className="cc2-meta">
        <span className="cc2-cost">{template.cost === 0 ? 'Free' : `$${template.cost.toLocaleString()}`}</span>
        <span className="cc2-dot">·</span>
        <span className="cc2-dur">{template.durationDays}d</span>
        <span className="cc2-dot">·</span>
        <span className="cc2-gain">+{template.baseCustomerGain[0]}–{template.baseCustomerGain[1]} users</span>
        {template.churnEffect && (
          <>
            <span className="cc2-dot">·</span>
            <span className={`cc2-churn ${template.churnEffect > 0 ? 'cc2-churn--up' : 'cc2-churn--down'}`}>
              churn {template.churnEffect > 0 ? '+' : ''}{template.churnEffect}%
            </span>
          </>
        )}
      </div>

      {template.churnEffect != null && template.churnEffect > 0 && (
        <div className="cc2-risk-warning">
          ⚠️ Raises churn by {template.churnEffect}% — retention impact
        </div>
      )}

      <div className="cc2-actions">
        {idleWorkers.length > 1 && !disabled && (
          <select
            className="cc2-select"
            value={selected}
            onChange={e => setSelected(e.target.value)}
          >
            <option value="">Auto-assign</option>
            {idleWorkers.map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        )}

        {disabled ? (
          <span className="cc2-reason">{disabledReason}</span>
        ) : (
          <button className="btn-launch" onClick={handleLaunch}>
            Launch{idleWorkers[0] ? ` with ${idleWorkers[0].name.split(' ')[0]}` : ''} →
          </button>
        )}
      </div>
    </div>
  )
}

export function CampaignsPanel() {
  const [tab, setTab] = useState<Tab>('marketing')
  const activeCampaigns = useGameStore(s => s.activeCampaigns)

  const templates = CAMPAIGN_TEMPLATES.filter(t => t.type === tab)
  const running   = activeCampaigns.filter(c => c.type === tab)

  return (
    <div className="campaigns-panel">
      <div className="cp-header">
        <span className="cp-title">Campaigns</span>
        <div className="cp-tabs">
          <button
            className={`cp-tab ${tab === 'marketing' ? 'cp-tab--active' : ''}`}
            onClick={() => setTab('marketing')}
          >
            Marketing
          </button>
          <button
            className={`cp-tab ${tab === 'sales' ? 'cp-tab--active' : ''}`}
            onClick={() => setTab('sales')}
          >
            Sales
          </button>
        </div>
      </div>

      {running.length > 0 && (
        <div className="cp-running">
          <div className="cp-section-label">Running</div>
          {running.map(c => <ActiveCampaignCard key={c.id} camp={c} />)}
        </div>
      )}

      <div className="cp-available">
        {running.length > 0 && <div className="cp-section-label">Available</div>}
        <div className="cp-grid">
          {templates.map(t => <CampaignCard key={t.id} template={t} />)}
        </div>
      </div>
    </div>
  )
}
