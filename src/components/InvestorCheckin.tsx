import { useState, useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import { totalDays } from '../engine/gameEngine'
import { ingestFeedbackRemote } from '../analytics/mongoIngest'
import './InvestorCheckin.css'

const STORAGE_KEY = 'investor-checkin-done'

const MOODS = [
  { emoji: '😫', label: 'Brutal' },
  { emoji: '😕', label: 'Rough' },
  { emoji: '😐', label: 'Okay' },
  { emoji: '🙂', label: 'Good' },
  { emoji: '🤩', label: 'Love it' },
]

const CHALLENGES = [
  'Running out of cash',
  'Hiring the right people',
  'Getting users',
  'Managing churn',
  'Random events',
  'Understanding the game',
]

type Step = 'invite' | 'q1' | 'q2' | 'q3' | 'done'

interface FeedbackData {
  mood: number | null
  challenges: string[]
  wishlist: string
  day: number
  mrr: number
  customers: number
}

export function InvestorCheckin() {
  const gameTime  = useGameStore(s => s.gameTime)
  const mrr       = useGameStore(s => s.mrr)
  const customers = useGameStore(s => s.customers)
  const day       = totalDays(gameTime)

  const [step, setStep]       = useState<Step | null>(null)
  const [visible, setVisible] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackData>({
    mood: null, challenges: [], wishlist: '', day, mrr, customers,
  })

  // Trigger at Day 30, only once ever
  useEffect(() => {
    if (day >= 30 && !localStorage.getItem(STORAGE_KEY)) {
      // Small delay so it doesn't pop the instant day 30 ticks
      const t = setTimeout(() => {
        setStep('invite')
        setVisible(true)
      }, 1200)
      return () => clearTimeout(t)
    }
  }, [day])

  // Manual trigger — always opens (used by test button + PostMortem)
  useEffect(() => {
    function handleManual() {
      setStep('invite')
      setVisible(true)
    }
    window.addEventListener('investor-checkin-open', handleManual)
    return () => window.removeEventListener('investor-checkin-open', handleManual)
  }, [])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  function later() {
    setVisible(false)
    // Re-show once after a short delay (don't mark as done)
    setTimeout(() => setVisible(true), 120_000)
  }

  function toggleChallenge(c: string) {
    setFeedback(f => ({
      ...f,
      challenges: f.challenges.includes(c)
        ? f.challenges.filter(x => x !== c)
        : [...f.challenges, c],
    }))
  }

  async function submit() {
    const gameId = useGameStore.getState().gameId ?? 'anonymous'

    ingestFeedbackRemote({
      sessionId: gameId,
      mood:       feedback.mood,
      challenges: feedback.challenges,
      wishlist:   feedback.wishlist,
      day,
      mrr,
      customers,
    }).catch(e => console.warn('[feedback]', e))

    localStorage.setItem(STORAGE_KEY, '1')
    setStep('done')
  }

  if (!visible || !step) return null

  return (
    <div className="ic-wrap">
      {/* ── Invite card ──────────────────────────────────────────── */}
      {step === 'invite' && (
        <div className="ic-invite" onClick={e => e.stopPropagation()}>
          <div className="ic-invite-avatar">👩‍💼</div>
          <div className="ic-invite-body">
            <div className="ic-invite-name">Sarah Chen <span className="ic-invite-role">· Seed Investor</span></div>
            <div className="ic-invite-msg">Quick 2-min check-in on how the game is going. Mind if I ask a few questions?</div>
            <div className="ic-invite-actions">
              <button className="ic-btn-accept" onClick={() => setStep('q1')}>Sure, let's chat</button>
              <button className="ic-btn-later" onClick={later}>Maybe later</button>
            </div>
          </div>
          <button className="ic-close" onClick={dismiss} aria-label="Dismiss">✕</button>
        </div>
      )}

      {/* ── Q1: Mood ─────────────────────────────────────────────── */}
      {step === 'q1' && (
        <div className="ic-modal" onClick={e => e.stopPropagation()}>
          <div className="ic-modal-head">
            <span className="ic-step-label">1 of 3</span>
            <button className="ic-close" onClick={dismiss}>✕</button>
          </div>
          <div className="ic-avatar-row">
            <span className="ic-modal-avatar">👩‍💼</span>
            <div className="ic-bubble">How's the game feeling overall?</div>
          </div>
          <div className="ic-mood-row">
            {MOODS.map((m, i) => (
              <button
                key={i}
                className={`ic-mood-btn ${feedback.mood === i ? 'ic-mood-btn--on' : ''}`}
                onClick={() => setFeedback(f => ({ ...f, mood: i }))}
              >
                <span className="ic-mood-emoji">{m.emoji}</span>
                <span className="ic-mood-label">{m.label}</span>
              </button>
            ))}
          </div>
          <button
            className="ic-next-btn"
            disabled={feedback.mood === null}
            onClick={() => setStep('q2')}
          >
            Next →
          </button>
        </div>
      )}

      {/* ── Q2: Challenges ───────────────────────────────────────── */}
      {step === 'q2' && (
        <div className="ic-modal" onClick={e => e.stopPropagation()}>
          <div className="ic-modal-head">
            <span className="ic-step-label">2 of 3</span>
            <button className="ic-close" onClick={dismiss}>✕</button>
          </div>
          <div className="ic-avatar-row">
            <span className="ic-modal-avatar">👩‍💼</span>
            <div className="ic-bubble">What's giving you the most trouble? Pick all that apply.</div>
          </div>
          <div className="ic-chips">
            {CHALLENGES.map(c => (
              <button
                key={c}
                className={`ic-chip ${feedback.challenges.includes(c) ? 'ic-chip--on' : ''}`}
                onClick={() => toggleChallenge(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <button className="ic-next-btn" onClick={() => setStep('q3')}>
            Next →
          </button>
        </div>
      )}

      {/* ── Q3: Wishlist ─────────────────────────────────────────── */}
      {step === 'q3' && (
        <div className="ic-modal" onClick={e => e.stopPropagation()}>
          <div className="ic-modal-head">
            <span className="ic-step-label">3 of 3</span>
            <button className="ic-close" onClick={dismiss}>✕</button>
          </div>
          <div className="ic-avatar-row">
            <span className="ic-modal-avatar">👩‍💼</span>
            <div className="ic-bubble">Last one — what's one thing you wish the game had?</div>
          </div>
          <textarea
            className="ic-textarea"
            placeholder="More events, better hiring UI, multiplayer..."
            value={feedback.wishlist}
            onChange={e => setFeedback(f => ({ ...f, wishlist: e.target.value }))}
            maxLength={280}
            rows={3}
          />
          <button className="ic-next-btn ic-next-btn--submit" onClick={submit}>
            Send feedback 🚀
          </button>
        </div>
      )}

      {/* ── Done ─────────────────────────────────────────────────── */}
      {step === 'done' && (
        <div className="ic-modal ic-modal--done" onClick={e => e.stopPropagation()}>
          <div className="ic-done-emoji">🙏</div>
          <div className="ic-done-title">Thanks for the update!</div>
          <div className="ic-done-sub">This genuinely helps us make the game better. Now go get those users.</div>
          <button className="ic-next-btn" onClick={() => setVisible(false)}>Back to the grind</button>
        </div>
      )}
    </div>
  )
}
