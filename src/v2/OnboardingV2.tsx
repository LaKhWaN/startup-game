import { useEffect, useState } from 'react'
import { generateRoadmap, scoreToDifficulty, tierColor, tierLabel, validateIdea } from '../ai/gemini'
import type { IdeaValidation } from '../ai/gemini'
import type { FeatureTemplate } from '../data/featureTemplates'
import type { OnboardingConfig } from '../types'
import { loadV2, newGameV2 } from './actions'
import { deleteSaveV2, listSavesV2, type SaveMetaV2, type SlotId } from './saveV2'
import './ui/Onboarding.css'

type Step = 'idea' | 'assessment' | 'name'

const SLOT_LABELS: Record<SlotId, string> = { 1: 'Auto-save', 2: 'Save 2', 3: 'Save 3' }

function pct(mult: number): string {
  const diff = Math.round((mult - 1) * 100)
  return diff > 0 ? `+${diff}% easier` : diff < 0 ? `${diff}% harder` : 'Standard'
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  } catch { return iso }
}

export function OnboardingV2() {
  const [saves, setSaves] = useState<(SaveMetaV2 | null)[]>([null, null, null])
  const [step, setStep] = useState<Step>('idea')
  const [idea, setIdea] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [validation, setValidation] = useState<IdeaValidation | null>(null)
  const [startupName, setStartupName] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => { setSaves(listSavesV2()) }, [])

  const hasSaves = saves.some(s => s !== null)

  function handleLoad(slot: SlotId) {
    setLoadError(null)
    if (!loadV2(slot)) setLoadError("That save couldn't be loaded. It may be from an older version.")
  }

  function handleDelete(slot: SlotId) {
    deleteSaveV2(slot)
    setSaves(listSavesV2())
  }

  async function handleValidate() {
    if (!idea.trim() || loading) return
    setLoading(true)
    setLoadingMsg('Analyzing your idea...')
    try {
      const result = await validateIdea(idea.trim())
      setValidation(result)
      setStep('assessment')
    } finally {
      setLoading(false)
    }
  }

  async function handleLaunch() {
    if (loading || !validation) return
    setLoading(true)
    setLoadingMsg('Mapping out what to build...')
    try {
      const roadmap: FeatureTemplate[] = await generateRoadmap(validation.idea, validation.score)
      const difficulty = scoreToDifficulty(validation.score)
      const rawName = startupName.trim() || 'My Startup'
      const sanitized = rawName.replace(/[^\w\s\-.&']/g, '').trim()
      const finalName = sanitized.length > 0 ? sanitized.slice(0, 40) : 'My Startup'
      const config: OnboardingConfig = {
        idea: validation.idea,
        ideaScore: validation.score,
        ideaFeedback: validation.feedback,
        workspace: 'home',
        startupName: finalName,
        aiRoadmap: roadmap,
        difficulty,
      }
      newGameV2(config)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="ob-screen">
        <div className="ob-card ob-loading-card">
          <div className="ob-spinner" />
          <p className="ob-loading-text">{loadingMsg}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="ob-screen">
      {step === 'idea' && hasSaves && (
        <div className="ob-saves-section">
          <h3 className="ob-saves-title">Continue Playing</h3>
          {loadError && <p className="ob-hint" role="alert">{loadError}</p>}
          <div className="ob-saves-grid">
            {saves.map((meta, i) => {
              const slot = (i + 1) as SlotId
              if (!meta) return null
              return (
                <div key={slot} className="ob-save-card">
                  <div className="ob-save-slot-label">{SLOT_LABELS[slot]}</div>
                  <div className="ob-save-name">{meta.startupName}</div>
                  <div className="ob-save-idea">{meta.idea.length > 60 ? meta.idea.slice(0, 60) + '…' : meta.idea}</div>
                  <div className="ob-save-stats">
                    <span>Day {meta.day}</span>
                    <span>${meta.mrr.toLocaleString()} MRR</span>
                    <span>{meta.chapterComplete ? 'Chapter 1 ✓' : 'Chapter 1'}</span>
                  </div>
                  <div className="ob-save-date">{formatDate(meta.savedAt)}</div>
                  <div className="ob-save-actions">
                    <button className="ob-btn ob-btn-primary ob-btn-sm" onClick={() => handleLoad(slot)}>Load</button>
                    <button className="ob-btn ob-btn-danger ob-btn-sm" onClick={() => handleDelete(slot)}>Delete</button>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="ob-saves-divider">
            <span>or start a new game</span>
          </div>
        </div>
      )}

      {step === 'idea' && (
        <div className="ob-card">
          <div className="ob-logo">🚀 STARTUP</div>
          <p className="ob-tagline">Start with nothing but an idea.</p>

          <div className="ob-step-label">Step 1 of 3</div>
          <h2 className="ob-heading">What's your big idea?</h2>
          <p className="ob-hint">Describe the startup you want to build. You'll start alone at home and build it step by step.</p>

          <textarea
            className="ob-textarea"
            placeholder="e.g. An AI-powered tool that helps freelancers auto-generate invoices from time tracking data..."
            value={idea}
            onChange={e => setIdea(e.target.value)}
            rows={4}
            maxLength={500}
            autoFocus
          />
          <div className="ob-char-count">{idea.length}/500</div>

          <button className="ob-btn ob-btn-primary" onClick={handleValidate} disabled={idea.trim().length < 10}>
            Validate My Idea →
          </button>
        </div>
      )}

      {step === 'assessment' && validation && (() => {
        const diff = scoreToDifficulty(validation.score)
        return (
          <div className="ob-card ob-card-wide">
            <div className="ob-step-label">Step 2 of 3</div>
            <h2 className="ob-heading">AI Assessment</h2>

            <div className="ob-idea-echo">"{validation.idea}"</div>

            <div className="ob-score-section">
              <div className="ob-score-bar-wrap">
                <div className="ob-score-bar" style={{ width: `${validation.score * 10}%`, background: tierColor(diff.tier) }} />
              </div>
              <div className="ob-score-row">
                <span className="ob-score-num" style={{ color: tierColor(diff.tier) }}>{validation.score}/10</span>
                <span className="ob-difficulty-badge" style={{ background: tierColor(diff.tier) }}>{tierLabel(diff.tier)}</span>
              </div>
            </div>

            <p className="ob-feedback">{validation.feedback}</p>

            <div className="ob-two-col">
              <div className="ob-col">
                <h4 className="ob-col-title ob-col-title--green">Strengths</h4>
                <ul className="ob-list">{validation.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
              <div className="ob-col">
                <h4 className="ob-col-title ob-col-title--red">Risks</h4>
                <ul className="ob-list">{validation.risks.map((r, i) => <li key={i}>{r}</li>)}</ul>
              </div>
            </div>

            {validation.suggestion && (
              <div className="ob-suggestion"><strong>Suggestion:</strong> {validation.suggestion}</div>
            )}

            <div className="ob-difficulty-detail">
              <h4>Difficulty Effects</h4>
              <div className="ob-diff-grid">
                <span>Feature impact on users</span><span>{pct(diff.featureImpactMultiplier)}</span>
                <span>Minimum churn rate</span><span>{diff.churnFloor}%/mo</span>
                <span>Investor interest</span><span>{pct(diff.investorInterestRate)}</span>
              </div>
            </div>

            <div className="ob-actions">
              <button className="ob-btn ob-btn-secondary" onClick={() => setStep('idea')}>← Tweak My Idea</button>
              <button className="ob-btn ob-btn-primary" onClick={() => setStep('name')}>Continue →</button>
            </div>
          </div>
        )
      })()}

      {step === 'name' && (
        <div className="ob-card">
          <div className="ob-step-label">Step 3 of 3</div>
          <h2 className="ob-heading">Name Your Startup</h2>
          <p className="ob-hint">What will you call it?</p>

          <input
            className="ob-input"
            type="text"
            placeholder="e.g. Acme Inc."
            value={startupName}
            maxLength={40}
            onChange={e => setStartupName(e.target.value.replace(/[^\w\s\-.&']/g, ''))}
            onKeyDown={e => e.key === 'Enter' && handleLaunch()}
            autoFocus
          />

          <div className="ob-summary">
            <div className="ob-summary-row"><span>Idea</span><span className="ob-summary-val">{validation?.idea.slice(0, 50)}...</span></div>
            <div className="ob-summary-row"><span>Difficulty</span><span className="ob-summary-val">{validation ? tierLabel(scoreToDifficulty(validation.score).tier) : '—'}</span></div>
            <div className="ob-summary-row"><span>Starting point</span><span className="ob-summary-val">🏠 Home · $500 savings</span></div>
          </div>

          <div className="ob-actions">
            <button className="ob-btn ob-btn-secondary" onClick={() => setStep('assessment')}>← Back</button>
            <button className="ob-btn ob-btn-primary" onClick={handleLaunch}>Start at Home →</button>
          </div>
        </div>
      )}
    </div>
  )
}
