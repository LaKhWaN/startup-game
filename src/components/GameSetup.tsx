import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { FEATURE_TEMPLATES } from '../data/featureTemplates'
import { scoreToDifficulty } from '../ai/gemini'
import type { OnboardingConfig } from '../types'
import './GameSetup.css'

/** @deprecated Use Onboarding component instead */
export function GameSetup() {
  const startGame = useGameStore(s => s.startGame)
  const [name, setName] = useState('')

  function handleStart() {
    const config: OnboardingConfig = {
      idea: 'Generic startup idea',
      ideaScore: 5,
      ideaFeedback: '',
      workspace: 'coworking',
      startupName: name.trim() || 'My Startup',
      aiRoadmap: FEATURE_TEMPLATES,
      difficulty: scoreToDifficulty(5),
    }
    startGame(config)
  }

  return (
    <div className="setup-screen">
      <div className="setup-card">
        <div className="setup-logo">[ STARTUP ]</div>
        <p className="setup-tagline">A high-realism founder simulation.</p>

        <div className="setup-name-row">
          <label className="setup-label">Name your startup</label>
          <input
            className="setup-input"
            type="text"
            placeholder="e.g. Acme Inc."
            value={name}
            maxLength={40}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleStart()}
            autoFocus
          />
        </div>

        <div className="setup-brief">
          <div className="brief-row"><span className="label">Starting cash</span><span className="value">$100,000</span></div>
          <div className="brief-row"><span className="label">Infra cost</span><span className="value">$500 / mo</span></div>
          <div className="brief-row"><span className="label">ARPU</span><span className="value">$50 / mo</span></div>
          <div className="brief-row"><span className="label">Speed</span><span className="value">1 sec = 1 hr</span></div>
          <div className="brief-row"><span className="label">Early goal</span><span className="value">$1,000 MRR</span></div>
          <div className="brief-row"><span className="label">Win condition</span><span className="value">$10,000 MRR</span></div>
        </div>

        <div className="setup-rules">
          <p>Hire a Product Manager to discover features to build.</p>
          <p>Hire a Developer to build them. No dev = no product.</p>
          <p>Hire Sales & Marketing to grow customers and reduce churn.</p>
          <p>Salaries are deducted monthly. Run out of cash = game over.</p>
        </div>

        <button className="btn-start" onClick={handleStart}>
          Found Company →
        </button>
      </div>
    </div>
  )
}
