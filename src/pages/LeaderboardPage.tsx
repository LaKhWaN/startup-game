import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BlogLayout } from '../components/BlogLayout'
import { SEOHead } from '../components/SEOHead'
import { url as absUrl } from '../config/site'

interface LeaderboardEntry {
  rank: number
  startupName: string
  idea: string
  difficultyTier: string
  phase: string
  lastRecordedDay: number
  mrr: number
  valuation: number
}

const TIER_COLORS: Record<string, string> = {
  promising: 'var(--success)',
  competitive: 'var(--info)',
  risky: 'var(--warning)',
  brutal: 'var(--error)',
}

const PHASE_LABELS: Record<string, { label: string; color: string }> = {
  sold: { label: 'Sold', color: 'var(--success)' },
  lost: { label: 'Failed', color: 'var(--error)' },
  playing: { label: 'Active', color: 'var(--info)' },
}

function formatMRR(mrr: number) {
  if (mrr >= 1000) return `$${(mrr / 1000).toFixed(1)}k`
  return `$${mrr}`
}

function formatValuation(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`
  return `$${v}`
}

const API_URL = import.meta.env.VITE_ANALYTICS_API_URL
  ? `${import.meta.env.VITE_ANALYTICS_API_URL}/leaderboard`
  : '/api/leaderboard'

export function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchParams] = useSearchParams()
  const highlight = searchParams.get('highlight')

  useEffect(() => {
    fetch(API_URL)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => {
        setEntries(data.entries ?? [])
        setLoading(false)
      })
      .catch(() => {
        setError('Could not load leaderboard. Try again later.')
        setLoading(false)
      })
  }, [])

  function handleShare(entry: LeaderboardEntry) {
    const text = `${entry.startupName} ranked #${entry.rank} on the failunicorn global leaderboard — ${formatValuation(entry.valuation)} valuation in ${entry.lastRecordedDay} days.`
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(absUrl(`/leaderboard?highlight=${encodeURIComponent(entry.startupName)}`))}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <BlogLayout wide>
      <SEOHead
        title="Global Leaderboard — failunicorn"
        description="See the top startup founders on failunicorn — ranked by valuation. Can your startup make the list?"
        canonical={absUrl('/leaderboard')}
      />

      <div style={{ marginBottom: 32, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--brand-primary)', marginBottom: 8 }}>
            Global Leaderboard
          </h1>
          <p style={{ fontSize: 15, color: 'var(--muted)' }}>
            Top startup founders ranked by final valuation. Updated live.
          </p>
        </div>
        <a
          href="/?play"
          style={{
            padding: '9px 20px',
            borderRadius: 8,
            background: 'var(--brand-primary)',
            color: 'var(--brand-bg)',
            fontWeight: 600,
            fontSize: 14,
            textDecoration: 'none',
            flexShrink: 0,
            alignSelf: 'center',
          }}
        >
          Play to rank →
        </a>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
          Loading leaderboard...
        </div>
      )}

      {error && (
        <div style={{
          padding: '16px 20px',
          borderRadius: 8,
          background: 'rgba(158,42,43,0.08)',
          borderLeft: '3px solid var(--error)',
          color: 'var(--error)',
          fontSize: 14,
        }}>
          {error}
        </div>
      )}

      {!loading && !error && entries.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
          <p style={{ marginBottom: 16 }}>No entries yet. Be the first to make the leaderboard!</p>
          <a
            href="/?play"
            style={{
              padding: '10px 24px',
              borderRadius: 8,
              background: 'var(--brand-primary)',
              color: 'var(--brand-bg)',
              fontWeight: 600,
              fontSize: 14,
              textDecoration: 'none',
            }}
          >
            Start Playing →
          </a>
        </div>
      )}

      {entries.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                {['#', 'Startup', 'Difficulty', 'Outcome', 'Days', 'MRR', 'Valuation', ''].map(h => (
                  <th key={h} style={{
                    padding: '10px 14px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => {
                const isHighlighted = highlight && entry.startupName === highlight
                const phaseInfo = PHASE_LABELS[entry.phase] ?? { label: entry.phase, color: 'var(--muted)' }
                return (
                  <tr
                    key={entry.rank}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      background: isHighlighted ? 'rgba(var(--accent-rgb), 0.12)' : 'transparent',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => {
                      if (!isHighlighted) (e.currentTarget as HTMLElement).style.background = 'var(--surface)'
                    }}
                    onMouseLeave={e => {
                      if (!isHighlighted) (e.currentTarget as HTMLElement).style.background = 'transparent'
                    }}
                  >
                    <td style={{ padding: '12px 14px', fontWeight: entry.rank <= 3 ? 800 : 400, color: entry.rank <= 3 ? 'var(--brand-primary)' : 'var(--muted)' }}>
                      {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : entry.rank}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{entry.startupName}</div>
                      {entry.idea && (
                        <div style={{ fontSize: 12, color: 'var(--muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {entry.idea}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 4,
                        color: TIER_COLORS[entry.difficultyTier] ?? 'var(--muted)',
                        background: `${TIER_COLORS[entry.difficultyTier] ?? 'var(--muted)'}18`,
                        textTransform: 'capitalize',
                      }}>
                        {entry.difficultyTier}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: phaseInfo.color }}>
                        {phaseInfo.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'Roboto Mono, monospace', color: 'var(--text)' }}>
                      Day {entry.lastRecordedDay}
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'Roboto Mono, monospace', color: 'var(--text)' }}>
                      {formatMRR(entry.mrr)}/mo
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'Roboto Mono, monospace', fontWeight: 600, color: 'var(--brand-primary)' }}>
                      {formatValuation(entry.valuation)}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <button
                        onClick={() => handleShare(entry)}
                        title="Share this result"
                        style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          border: '1px solid var(--border)',
                          background: 'transparent',
                          fontSize: 12,
                          cursor: 'pointer',
                          color: 'var(--muted)',
                        }}
                      >
                        Share
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </BlogLayout>
  )
}
