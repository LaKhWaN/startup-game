import { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { getPostMortem, totalDays, getMonthlyBurn, getCompanyValuation } from '../engine/gameEngine'
import { getLeaderboard, addLeaderboardEntry } from '../save/leaderboard'
import { persistDayAnalytics } from '../analytics/persistDayAnalytics'
import type { LeaderboardEntry } from '../types'
import './PostMortem.css'

export function PostMortem() {
  const state        = useGameStore(s => s)
  const restartGame  = useGameStore(s => s.restartGame)
  const quickRestart = useGameStore(s => s.quickRestart)
  const insights    = getPostMortem(state)
  const isSold      = state.phase === 'sold'
  const day         = totalDays(state.gameTime)
  const burn        = getMonthlyBurn(state)
  const { valuation } = getCompanyValuation(state)

  const saleValuation = state.soldAt?.valuation ?? valuation
  const displayValuation = isSold ? saleValuation : 0

  const [board, setBoard] = useState<LeaderboardEntry[]>([])
  const [currentRank, setCurrentRank] = useState(-1)

  useEffect(() => {
    const entry: LeaderboardEntry = {
      startupName:  state.startupName || 'Unnamed',
      valuation:    displayValuation,
      daysSurvived: day,
      mrr:          Math.floor(state.mrr),
      customers:    state.customers,
      outcome:      isSold ? 'sold' : 'lost',
      playedAt:     Date.now(),
    }
    const updated = addLeaderboardEntry(entry)
    setBoard(updated)
    const rank = updated.findIndex(e => e.playedAt === entry.playedAt)
    setCurrentRank(rank)

    void persistDayAnalytics(state).catch((e) => console.error('[analytics] postmortem sync', e))

    // Trigger investor check-in feedback if not done yet
    setTimeout(() => {
      window.dispatchEvent(new Event('investor-checkin-open'))
    }, 2000)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="postmortem-screen">
      <div className="pm-card">
        <div className={`pm-header ${isSold ? 'pm-header--win' : 'pm-header--loss'}`}>
          <div className="pm-status">{isSold ? 'COMPANY SOLD' : 'GAME OVER'}</div>
          <div className="pm-day">Day {day}</div>
        </div>

        <div className="pm-summary">
          {isSold
            ? <p><strong>{state.startupName}</strong> sold for <strong>${displayValuation.toLocaleString()}</strong></p>
            : <p>{state.cash <= 0 ? 'Cash hit $0. The company shut down.' : 'The company couldn\'t sustain growth.'}</p>
          }
        </div>

        <div className="pm-stats">
          <div className="pm-stat"><span className="pm-sl">MRR</span><span className="pm-sv">${Math.floor(state.mrr).toLocaleString()}</span></div>
          <div className="pm-stat"><span className="pm-sl">Users</span><span className="pm-sv">{state.customers}</span></div>
          <div className="pm-stat"><span className="pm-sl">Team</span><span className="pm-sv">{state.employees.length}</span></div>
          <div className="pm-stat"><span className="pm-sl">Burn/mo</span><span className="pm-sv">${burn.toLocaleString()}</span></div>
          <div className="pm-stat"><span className="pm-sl">Features</span><span className="pm-sv">{state.features.filter(f => f.status === 'completed').length}</span></div>
          <div className="pm-stat"><span className="pm-sl">Valuation</span><span className="pm-sv">${displayValuation.toLocaleString()}</span></div>
        </div>

        {!isSold && (
          <div className="pm-analysis">
            <div className="pm-analysis-title">What went wrong</div>
            {insights.map((line, i) => (
              <div key={i} className="pm-insight">
                <span className="pm-bullet">—</span>
                <span>{line}</span>
              </div>
            ))}
          </div>
        )}

        {board.length > 0 && (
          <div className="pm-leaderboard">
            <div className="pm-lb-title">Leaderboard</div>
            <div className="pm-lb-table">
              <div className="pm-lb-header">
                <span className="pm-lb-rank">#</span>
                <span className="pm-lb-name">Startup</span>
                <span className="pm-lb-val">Valuation</span>
                <span className="pm-lb-out">Result</span>
              </div>
              {board.slice(0, 10).map((entry, i) => (
                <div key={i} className={`pm-lb-row ${i === currentRank ? 'pm-lb-row--current' : ''}`}>
                  <span className="pm-lb-rank">{i + 1}</span>
                  <span className="pm-lb-name">{entry.startupName}</span>
                  <span className="pm-lb-val">${entry.valuation.toLocaleString()}</span>
                  <span className={`pm-lb-out ${entry.outcome === 'sold' ? 'pm-lb-sold' : 'pm-lb-lost'}`}>
                    {entry.outcome === 'sold' ? '🏆 Sold' : '💀 Lost'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {state.decisionHistory.length > 0 && (
          <div className="pm-decisions">
            <div className="pm-decisions-title">Key decisions</div>
            {state.decisionHistory.slice(0, 5).map((d, i) => (
              <div key={i} className="pm-decision">
                <span className="pm-d-day">D{d.day}</span>
                <span className="pm-d-event">{d.eventTitle}</span>
                <span className="pm-d-choice">→ {d.choiceLabel}</span>
              </div>
            ))}
          </div>
        )}

        {/* Social sharing */}
        <ShareResult
          startupName={state.startupName}
          isSold={isSold}
          day={day}
          mrr={Math.floor(state.mrr)}
          valuation={displayValuation}
        />

        <div className="pm-actions">
          {state.lastConfig && (
            <button className="btn-quick-restart" onClick={quickRestart}>↺ Play Again (same idea)</button>
          )}
          <button className="btn-restart" onClick={restartGame}>New Game →</button>
        </div>
      </div>
    </div>
  )
}

function ShareResult({
  startupName,
  isSold,
  day,
  mrr,
  valuation,
}: {
  startupName: string
  isSold: boolean
  day: number
  mrr: number
  valuation: number
}) {
  const [copied, setCopied] = useState(false)

  const shareText = isSold
    ? `I sold ${startupName} for $${valuation.toLocaleString()} on Day ${day} 🏆 #failunicorn`
    : `${startupName} burned out on Day ${day} with $${mrr.toLocaleString()}/mo MRR 💀 Can you survive longer? #failunicorn`

  function handleShareX() {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent('https://failunicorn.com')}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  function handleCopy() {
    navigator.clipboard.writeText(shareText + '\nhttps://failunicorn.com')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="pm-share">
      <div className="pm-share-label">Share your result</div>
      <div className="pm-share-buttons">
        <button className="pm-share-btn" onClick={handleShareX}>Share on X</button>
        <button className="pm-share-btn" onClick={handleCopy}>{copied ? 'Copied!' : 'Copy'}</button>
      </div>
    </div>
  )
}
