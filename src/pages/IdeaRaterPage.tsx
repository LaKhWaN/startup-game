import { useState } from 'react'
import { BlogLayout } from '../components/BlogLayout'
import { SEOHead } from '../components/SEOHead'
import { validateIdea, scoreToDifficulty, tierLabel, tierColor } from '../ai/gemini'
import type { IdeaValidation } from '../ai/gemini'

const FAQ = [
  {
    q: 'How is the score calculated?',
    a: 'We use Google Gemini AI to evaluate your idea on market viability, competition, and execution difficulty. Scores range from 1 (very hard to execute) to 10 (strong market fit). Most realistic ideas land between 4 and 7.',
  },
  {
    q: 'What does the score mean for the game?',
    a: 'In failunicorn, your score determines your difficulty tier: Promising (8-10) gets a customer bonus and lower churn; Brutal (0-3) starts with higher churn and skeptical investors. The simulation mirrors real market dynamics.',
  },
  {
    q: 'Is my idea stored or shared?',
    a: 'No. Your idea is sent to the Gemini API for analysis and the result is cached locally in your browser for 7 days. We don\'t store your idea on our servers.',
  },
  {
    q: 'What makes a high-scoring startup idea?',
    a: 'Ideas that score highly tend to have a clear target customer, an obvious pain point, low dependency on behavioral change, and a defensible distribution channel. B2B SaaS ideas often score higher than consumer apps because the revenue model is clearer.',
  },
  {
    q: 'Can I use this for my real startup?',
    a: 'It\'s a fun directional signal, not a market research report. Use it to stress-test your assumptions or gut-check an idea, then validate with real customers.',
  },
]

function ScoreGauge({ score }: { score: number }) {
  const pct = ((score - 1) / 9) * 100
  const diff = scoreToDifficulty(score)
  const color = tierColor(diff.tier)

  return (
    <div style={{ textAlign: 'center', padding: '24px 0' }}>
      <div style={{ fontSize: 64, fontWeight: 800, color, lineHeight: 1 }}>
        {score}
        <span style={{ fontSize: 24, color: 'var(--muted)', fontWeight: 400 }}>/10</span>
      </div>
      <div style={{
        margin: '12px auto',
        width: '100%',
        maxWidth: 280,
        height: 8,
        borderRadius: 4,
        background: 'var(--border)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: color,
          borderRadius: 4,
          transition: 'width 0.6s ease',
        }} />
      </div>
      <div style={{
        display: 'inline-block',
        padding: '4px 14px',
        borderRadius: 20,
        fontSize: 13,
        fontWeight: 700,
        color,
        background: `${color}18`,
        letterSpacing: '0.3px',
      }}>
        {tierLabel(diff.tier)} difficulty
      </div>
    </div>
  )
}

export function IdeaRaterPage() {
  const [idea, setIdea] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<IdeaValidation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!idea.trim() || loading) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const validation = await validateIdea(idea.trim())
      setResult(validation)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function buildShareText() {
    if (!result) return ''
    return `My startup idea "${result.idea.slice(0, 60)}${result.idea.length > 60 ? '...' : ''}" scored ${result.score}/10 on failunicorn's idea rater. Can yours beat it?`
  }

  function handleShare() {
    const text = buildShareText()
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent('https://failunicorn.com/tools/startup-idea-rater')}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  function handleCopy() {
    navigator.clipboard.writeText(buildShareText() + '\nhttps://failunicorn.com/tools/startup-idea-rater')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }

  return (
    <BlogLayout>
      <SEOHead
        title="Free Startup Idea Rater — failunicorn"
        description="Paste your startup idea and get an AI score (1-10) with strengths, risks, and difficulty rating. Free, instant, no signup needed."
        canonical="https://failunicorn.com/tools/startup-idea-rater"
        schema={faqSchema}
      />

      {/* Header */}
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          padding: '3px 10px',
          borderRadius: 20,
          background: 'var(--surface2)',
          color: 'var(--muted)',
          letterSpacing: '1px',
          textTransform: 'uppercase',
          display: 'inline-block',
          marginBottom: 14,
        }}>
          Free Tool
        </span>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--brand-primary)', marginBottom: 10, lineHeight: 1.25 }}>
          Startup Idea Rater
        </h1>
        <p style={{ fontSize: 16, color: 'var(--muted)', maxWidth: 480, margin: '0 auto' }}>
          Describe your startup idea. Get an AI score from 1–10 with strengths, risks, and a difficulty rating for the simulation.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ marginBottom: 32 }}>
        <textarea
          value={idea}
          onChange={e => setIdea(e.target.value)}
          placeholder="E.g. A SaaS tool that helps remote teams run better async standups without endless Slack threads..."
          rows={4}
          style={{
            width: '100%',
            padding: '14px 16px',
            borderRadius: 10,
            border: '1.5px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text)',
            fontSize: 15,
            lineHeight: 1.6,
            resize: 'vertical',
            fontFamily: 'inherit',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => (e.target.style.borderColor = 'var(--brand-primary)')}
          onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          maxLength={500}
          disabled={loading}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{idea.length}/500</span>
          <button
            type="submit"
            disabled={!idea.trim() || loading}
            style={{
              padding: '10px 24px',
              borderRadius: 8,
              background: idea.trim() && !loading ? 'var(--brand-primary)' : 'var(--border)',
              color: idea.trim() && !loading ? 'var(--brand-bg)' : 'var(--muted)',
              fontWeight: 600,
              fontSize: 14,
              border: 'none',
              cursor: idea.trim() && !loading ? 'pointer' : 'default',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {loading ? 'Analyzing...' : 'Rate My Idea →'}
          </button>
        </div>
      </form>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 15 }}>
          <div style={{ marginBottom: 10, fontSize: 24 }}>🤔</div>
          Asking the AI to roast your idea...
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          padding: '14px 18px',
          borderRadius: 8,
          background: 'rgba(158,42,43,0.08)',
          borderLeft: '3px solid var(--error)',
          color: 'var(--error)',
          fontSize: 14,
          marginBottom: 24,
        }}>
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: '28px 28px',
          marginBottom: 32,
          boxShadow: '0 2px 12px rgba(var(--text-rgb), 0.06)',
        }}>
          <ScoreGauge score={result.score} />

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '20px 0' }} />

          <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--text)', marginBottom: 20 }}>
            {result.feedback}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                Strengths
              </div>
              <ul style={{ paddingLeft: 18, margin: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {result.strengths.map((s, i) => (
                  <li key={i} style={{ fontSize: 14, color: 'var(--text)' }}>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--error)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                Risks
              </div>
              <ul style={{ paddingLeft: 18, margin: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {result.risks.map((r, i) => (
                  <li key={i} style={{ fontSize: 14, color: 'var(--text)' }}>{r}</li>
                ))}
              </ul>
            </div>
          </div>

          {result.suggestion && (
            <div style={{
              padding: '12px 16px',
              borderRadius: 8,
              background: 'var(--surface2)',
              fontSize: 14,
              color: 'var(--text)',
              lineHeight: 1.6,
              marginBottom: 20,
            }}>
              <strong style={{ color: 'var(--brand-primary)' }}>Suggestion: </strong>
              {result.suggestion}
            </div>
          )}

          {/* Share + CTA */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleShare}
                style={{
                  padding: '8px 16px',
                  borderRadius: 7,
                  border: '1.5px solid var(--border)',
                  background: 'transparent',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text)',
                  cursor: 'pointer',
                }}
              >
                Share on X
              </button>
              <button
                onClick={handleCopy}
                style={{
                  padding: '8px 16px',
                  borderRadius: 7,
                  border: '1.5px solid var(--border)',
                  background: 'transparent',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text)',
                  cursor: 'pointer',
                }}
              >
                {copied ? 'Copied!' : 'Copy result'}
              </button>
            </div>
            <a
              href="/?play"
              style={{
                padding: '8px 18px',
                borderRadius: 7,
                background: 'var(--brand-primary)',
                color: 'var(--brand-bg)',
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Test it in the simulation →
            </a>
          </div>
        </div>
      )}

      {/* FAQ */}
      <section style={{ marginTop: 56 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--brand-primary)', marginBottom: 24 }}>
          Frequently Asked Questions
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {FAQ.map((item, i) => (
            <div key={i} style={{
              padding: '18px 20px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--brand-primary)', marginBottom: 8 }}>
                {item.q}
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.7 }}>
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      <style>{`
        @media (max-width: 500px) {
          .idea-rater-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </BlogLayout>
  )
}
