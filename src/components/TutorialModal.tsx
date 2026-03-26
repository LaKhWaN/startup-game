import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import './TutorialModal.css'

// ─── Step definitions ─────────────────────────────────────────────────────────

interface TutorialStep {
  targetSelector?: string   // if absent → centered overlay modal
  title: string
  body: React.ReactNode
}

const STEPS: TutorialStep[] = [
  {
    title: 'Welcome to Startup Life',
    body: (
      <>
        <p>You're the founder. Build a product people love, hire a team, get users, and reach <strong>$10,000 MRR</strong> before the cash runs out.</p>
        <p>Let me show you around — it only takes a minute.</p>
      </>
    ),
  },
  {
    targetSelector: '.top-bar',
    title: 'Your Command Center',
    body: (
      <>
        <p>These five numbers tell the whole story at a glance:</p>
        <div className="tm-list">
          <div className="tm-list-item"><span className="tm-list-dot tm-dot-green" /><strong>MRR</strong> — monthly revenue (goal: $10k)</div>
          <div className="tm-list-item"><span className="tm-list-dot tm-dot-purple" /><strong>Users</strong> — paying customers</div>
          <div className="tm-list-item"><span className="tm-list-dot tm-dot-blue" /><strong>Cash</strong> — money left in the bank</div>
          <div className="tm-list-item"><span className="tm-list-dot tm-dot-orange" /><strong>Burn</strong> — what you spend per month</div>
          <div className="tm-list-item"><span className="tm-list-dot tm-dot-red" /><strong>Churn</strong> — % of customers you lose monthly</div>
        </div>
        <p>Watch <strong>Cash</strong> most carefully. When it hits zero, it's over.</p>
      </>
    ),
  },
  {
    targetSelector: '.game-canvas-area',
    title: 'Your Startup Office',
    body: (
      <>
        <p>This is your company, visualized. As you hire people and ship features, the office comes alive.</p>
        <p>Watch employees appear at their desks and see the activity pulse as the company grows.</p>
      </>
    ),
  },
  {
    targetSelector: '[data-panel="hire"]',
    title: 'Build Your Team',
    body: (
      <>
        <p>You can't do it alone. <strong>Start here.</strong></p>
        <div className="tm-list">
          <div className="tm-list-item"><span className="tm-list-dot tm-dot-blue" /><strong>Developer</strong> — builds the features</div>
          <div className="tm-list-item"><span className="tm-list-dot tm-dot-purple" /><strong>PM</strong> — discovers feature ideas over time</div>
          <div className="tm-list-item"><span className="tm-list-dot tm-dot-green" /><strong>Marketing</strong> — runs growth campaigns</div>
          <div className="tm-list-item"><span className="tm-list-dot tm-dot-orange" /><strong>Sales</strong> — closes individual deals</div>
        </div>
        <p>Hire a Developer and PM first. They unlock everything else.</p>
      </>
    ),
  },
  {
    targetSelector: '[data-panel="product"]',
    title: 'Ship Features',
    body: (
      <>
        <p>Every feature you ship attracts users and reduces churn. The flow is simple:</p>
        <div className="tm-flow">
          <span className="tm-flow-step">💡 PM discovers</span>
          <span className="tm-flow-arrow">→</span>
          <span className="tm-flow-step">🔨 Dev builds</span>
          <span className="tm-flow-arrow">→</span>
          <span className="tm-flow-step">👤 Users gained</span>
        </div>
        <p>High-value features (CORE) bring the most users. Low-value (INFRA) keep the product stable.</p>
      </>
    ),
  },
  {
    targetSelector: '[data-panel="gtm"]',
    title: 'Go-To-Market',
    body: (
      <>
        <p><strong>GTM</strong> is how you actively get customers. Without it, you're just waiting.</p>
        <p>Assign your Marketing or Sales employee to a campaign. They'll run it over several days and bring in a batch of new users when done.</p>
        <p>Run campaigns constantly — don't let your team sit idle.</p>
      </>
    ),
  },
  {
    targetSelector: '[data-panel="goals"]',
    title: 'Track Your Milestones',
    body: (
      <>
        <p>18 milestones across 4 categories — Team, Product, Users, and Revenue.</p>
        <p>Each one you complete proves real progress. The final milestone, <strong>$10k MRR</strong>, is the win condition.</p>
        <p>Check here whenever you need direction on what to focus on next.</p>
      </>
    ),
  },
  {
    title: "You're Ready",
    body: (
      <>
        <p>You've seen the core loop. <strong>Hire → Build → Market → Grow.</strong></p>
        <p>Keep an eye on your runway, ship features fast, and don't let churn eat your growth.</p>
        <div className="tm-win-pill">🏆 Goal: $10,000 MRR</div>
      </>
    ),
  },
]

// ─── Spotlight geometry ───────────────────────────────────────────────────────

const PAD = 10  // padding around the highlighted element

interface SpotRect { x: number; y: number; w: number; h: number }

function measureTarget(selector: string): SpotRect | null {
  const el = document.querySelector(selector)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 }
}

type TooltipSide = 'top' | 'bottom' | 'left' | 'right'

interface TooltipPlacement {
  top: number
  left: number
  side: TooltipSide
}

const TOOLTIP_W = 320
const TOOLTIP_H = 340   // generous estimate so above-placement never overlaps target
const TOOLTIP_GAP = 28  // gap between spotlight edge and tooltip

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }

function computeTooltipPlacement(spot: SpotRect): TooltipPlacement {
  const cx = spot.x
  const cy = spot.y
  const cw = spot.w
  const ch = spot.h

  const spaceAbove = cy
  const spaceBelow = window.innerHeight - cy - ch
  const spaceLeft  = cx
  const spaceRight = window.innerWidth  - cx - cw

  const centX = clamp(cx + cw / 2 - TOOLTIP_W / 2, 16, window.innerWidth  - TOOLTIP_W - 16)
  const centY = clamp(cy + ch / 2 - TOOLTIP_H / 2, 16, window.innerHeight - TOOLTIP_H - 16)

  if (spaceBelow >= TOOLTIP_H + TOOLTIP_GAP && spaceBelow >= spaceAbove) {
    return { top: cy + ch + TOOLTIP_GAP, left: centX, side: 'top' }
  }
  if (spaceAbove >= TOOLTIP_H + TOOLTIP_GAP) {
    return { top: cy - TOOLTIP_GAP - TOOLTIP_H, left: centX, side: 'bottom' }
  }
  if (spaceRight >= TOOLTIP_W + TOOLTIP_GAP && spaceRight >= spaceLeft) {
    return { top: centY, left: cx + cw + TOOLTIP_GAP, side: 'left' }
  }
  return { top: centY, left: clamp(cx - TOOLTIP_GAP - TOOLTIP_W, 16, cx - TOOLTIP_W - 8), side: 'right' }
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  onClose: () => void
}

export function TutorialModal({ onClose }: Props) {
  const [step, setStep]           = useState(0)
  const [spotRect, setSpotRect]   = useState<SpotRect | null>(null)
  const [contentKey, setContentKey] = useState(0)   // bump to re-animate tooltip

  const total   = STEPS.length
  const current = STEPS[step]
  const isFirst = step === 0
  const isLast  = step === total - 1

  // Measure target element on step change
  const measure = useCallback(() => {
    const sel = STEPS[step].targetSelector
    if (!sel) {
      setSpotRect(null)
      return
    }
    const rect = measureTarget(sel)
    setSpotRect(rect)
  }, [step])

  useEffect(() => {
    // Small delay so the DOM settles after any panel switches
    const id = setTimeout(measure, 30)
    window.addEventListener('resize', measure)
    return () => {
      clearTimeout(id)
      window.removeEventListener('resize', measure)
    }
  }, [measure])

  function goTo(nextStep: number) {
    setStep(nextStep)
    setContentKey(k => k + 1)
  }

  // Tooltip placement
  const placement = spotRect ? computeTooltipPlacement(spotRect) : null

  // Arrow position offset relative to tooltip edge pointing toward element
  const arrowOffset = placement && spotRect
    ? clamp(
        spotRect.x + spotRect.w / 2 - placement.left,
        20, TOOLTIP_W - 20
      )
    : TOOLTIP_W / 2

  return createPortal(
    <div className="tm-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>

      {/* Spotlight hole — box-shadow covers the rest of the screen */}
      {spotRect && (
        <div
          className="tm-spotlight"
          style={{
            left:   spotRect.x,
            top:    spotRect.y,
            width:  spotRect.w,
            height: spotRect.h,
          }}
        />
      )}

      {/* Spotlight tooltip — positioned near target */}
      {spotRect && placement ? (
        <div
          key={contentKey}
          className={`tm-tooltip tm-tooltip--${placement.side}`}
          style={{
            top:   placement.top,
            left:  placement.left,
            width: TOOLTIP_W,
            '--arrow-offset': `${arrowOffset}px`,
          } as React.CSSProperties}
        >
          <div className="tm-tt-step">{step + 1} / {total}</div>
          <div className="tm-tt-title">{current.title}</div>
          <div className="tm-tt-body">{current.body}</div>
          <div className="tm-tt-footer">
            {!isFirst && (
              <button className="tm-btn tm-btn--back" onClick={() => goTo(step - 1)}>← Back</button>
            )}
            <div style={{ flex: 1 }} />
            {isLast ? (
              <button className="tm-btn tm-btn--primary" onClick={onClose}>Let's Go! 🚀</button>
            ) : (
              <button className="tm-btn tm-btn--primary" onClick={() => goTo(step + 1)}>Next →</button>
            )}
          </div>
        </div>
      ) : !spotRect ? (
        /* Centered modal for steps without a target */
        <div key={contentKey} className="tm-modal">
          <div className="tm-modal-header">
            <span className="tm-modal-step">{step + 1} / {total}</span>
            <button className="tm-skip" onClick={onClose}>Skip</button>
          </div>

          <div className="tm-dots">
            {STEPS.map((_, i) => (
              <button
                key={i}
                className={`tm-dot ${i === step ? 'tm-dot--active' : i < step ? 'tm-dot--done' : ''}`}
                onClick={() => goTo(i)}
                aria-label={`Step ${i + 1}`}
              />
            ))}
          </div>

          <div className="tm-modal-icon">{step === 0 ? '🚀' : '🏆'}</div>
          <div className="tm-modal-title">{current.title}</div>
          <div className="tm-modal-body">{current.body}</div>

          <div className="tm-modal-footer">
            {!isFirst && (
              <button className="tm-btn tm-btn--back" onClick={() => goTo(step - 1)}>← Back</button>
            )}
            <div style={{ flex: 1 }} />
            {isLast ? (
              <button className="tm-btn tm-btn--primary" onClick={onClose}>Let's Go! 🚀</button>
            ) : (
              <button className="tm-btn tm-btn--primary" onClick={() => goTo(step + 1)}>Next →</button>
            )}
          </div>
        </div>
      ) : null}

      {/* Step dots + skip for spotlight steps */}
      {spotRect && (
        <div className="tm-hud">
          <div className="tm-dots tm-dots--hud">
            {STEPS.map((_, i) => (
              <button
                key={i}
                className={`tm-dot ${i === step ? 'tm-dot--active' : i < step ? 'tm-dot--done' : ''}`}
                onClick={() => goTo(i)}
                aria-label={`Step ${i + 1}`}
              />
            ))}
          </div>
          <button className="tm-skip" onClick={onClose}>Skip tour</button>
        </div>
      )}
    </div>,
    document.body
  )
}
