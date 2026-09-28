import { useEffect, useState, type FormEvent } from 'react'
import './AdminDashboard.css'

const TOKEN_KEY = 'startup-game-admin-token'

const API_BASE = import.meta.env.VITE_ANALYTICS_API_URL || '/api'

interface DashboardData {
  sessions: {
    total: number
    phaseSplit: Record<string, number>
    tierSplit: Record<string, number>
    avgDayReached: number
  }
  trends: { date: string; started: number; cumulative: number }[]
  financials: {
    avgFinalMrr: number
    avgFinalCash: number
    avgFinalChurnRate: number
    winRate: number
    finishedCount: number
    exitDayBuckets: Record<string, number>
  }
  feedback: {
    sessionId: string
    mood: number | null
    challenges: string[]
    wishlist: string
    gameContext: { day: number; mrr: number; customers: number }
    submittedAt: string
  }[]
}

const PHASE_COLORS: Record<string, string> = {
  sold: 'var(--success)',
  lost: 'var(--error)',
  playing: 'var(--info)',
  setup: 'var(--muted)',
}

const MOOD_LABELS: Record<number, string> = { 1: '😞', 2: '😕', 3: '😐', 4: '🙂', 5: '😄' }

function fmtMoney(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return `$${Math.round(n)}`
}

function fmtPct(n: number): string {
  return `${(n * 100).toFixed(0)}%`
}

function AdminLogin({ onSuccess }: { onSuccess: (token: string) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Login failed')
        setLoading(false)
        return
      }
      sessionStorage.setItem(TOKEN_KEY, data.token)
      onSuccess(data.token)
    } catch {
      setError('Could not reach server')
      setLoading(false)
    }
  }

  return (
    <div className="admin-login-wrap">
      <form className="admin-login-card" onSubmit={handleSubmit}>
        <h1>Admin Login</h1>
        <div className="admin-field">
          <label htmlFor="admin-username">Username</label>
          <input id="admin-username" type="text" value={username} onChange={e => setUsername(e.target.value)} autoFocus autoComplete="username" />
        </div>
        <div className="admin-field">
          <label htmlFor="admin-password">Password</label>
          <input id="admin-password" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
        </div>
        {error && <div className="admin-error" style={{ marginBottom: 14 }}>{error}</div>}
        <button className="admin-login-btn" type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}

function SplitBars({ data, colors }: { data: Record<string, number>; colors?: Record<string, string> }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0) || 1
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1])
  if (entries.length === 0) return <div className="admin-empty">No data yet</div>
  return (
    <div>
      {entries.map(([key, count]) => (
        <div className="admin-bar-row" key={key}>
          <div className="bar-label">{key}</div>
          <div className="admin-bar-track">
            <div
              className="admin-bar-fill"
              style={{ width: `${(count / total) * 100}%`, background: colors?.[key] ?? 'var(--brand-primary)' }}
            />
          </div>
          <div className="admin-bar-count">{count}</div>
        </div>
      ))}
    </div>
  )
}

function TrendsChart({ trends }: { trends: DashboardData['trends'] }) {
  if (trends.length === 0) return <div className="admin-empty">No sessions in the last 30 days</div>

  const W = 720
  const H = 160
  const maxCum = Math.max(...trends.map(t => t.cumulative), 1)
  const step = trends.length > 1 ? W / (trends.length - 1) : 0
  const points = trends.map((t, i) => `${i * step},${H - (t.cumulative / maxCum) * (H - 20)}`).join(' ')
  const maxDaily = Math.max(...trends.map(t => t.started), 1)
  const barW = Math.max((W / trends.length) * 0.6, 2)

  return (
    <svg viewBox={`0 0 ${W} ${H + 24}`} style={{ width: '100%', height: 'auto' }} preserveAspectRatio="xMidYMid meet">
      {trends.map((t, i) => {
        const h = (t.started / maxDaily) * (H - 20)
        return (
          <rect
            key={t.date}
            x={i * step - barW / 2}
            y={H - h}
            width={barW}
            height={h}
            fill="var(--accent)"
            opacity={0.5}
          />
        )
      })}
      <polyline points={points} fill="none" stroke="var(--brand-primary)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      <text x={0} y={H + 18} fontSize={10} fill="var(--muted)">{trends[0]?.date}</text>
      <text x={W} y={H + 18} fontSize={10} fill="var(--muted)" textAnchor="end">{trends[trends.length - 1]?.date}</text>
    </svg>
  )
}

function FeedbackList({ feedback }: { feedback: DashboardData['feedback'] }) {
  if (feedback.length === 0) return <div className="admin-empty">No feedback submitted yet</div>
  return (
    <div>
      {feedback.map((f, i) => (
        <div className="admin-feedback-card" key={`${f.sessionId}-${i}`}>
          <div className="admin-feedback-meta">
            {f.mood != null && <span>{MOOD_LABELS[f.mood] ?? f.mood}</span>}
            <span>Day {f.gameContext?.day ?? '—'}</span>
            <span>{fmtMoney(f.gameContext?.mrr ?? 0)} MRR</span>
            <span>{f.gameContext?.customers ?? 0} customers</span>
            <span>{new Date(f.submittedAt).toLocaleDateString()}</span>
          </div>
          {f.wishlist && <div className="admin-feedback-wishlist">{f.wishlist}</div>}
          {f.challenges?.length > 0 && (
            <div className="admin-feedback-tags">
              {f.challenges.map(c => <span className="admin-feedback-tag" key={c}>{c}</span>)}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function DashboardBody({ data, onLogout }: { data: DashboardData; onLogout: () => void }) {
  return (
    <div className="admin-dash">
      <div className="admin-topbar">
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--brand-primary)' }}>Game Analytics</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>failunicorn admin</div>
        </div>
        <button className="admin-logout-btn" onClick={onLogout}>Log out</button>
      </div>

      <div className="admin-body">
        <div className="admin-grid">
          <div className="admin-stat-card">
            <div className="label">Total sessions</div>
            <div className="value">{data.sessions.total}</div>
          </div>
          <div className="admin-stat-card">
            <div className="label">Avg day reached</div>
            <div className="value">{data.sessions.avgDayReached.toFixed(0)}</div>
          </div>
          <div className="admin-stat-card">
            <div className="label">Win rate</div>
            <div className="value">{fmtPct(data.financials.winRate)}</div>
            <div className="sub">{data.financials.finishedCount} finished games</div>
          </div>
          <div className="admin-stat-card">
            <div className="label">Avg final MRR</div>
            <div className="value">{fmtMoney(data.financials.avgFinalMrr)}</div>
          </div>
          <div className="admin-stat-card">
            <div className="label">Avg final cash</div>
            <div className="value">{fmtMoney(data.financials.avgFinalCash)}</div>
          </div>
          <div className="admin-stat-card">
            <div className="label">Avg final churn</div>
            <div className="value">{data.financials.avgFinalChurnRate.toFixed(1)}%</div>
          </div>
        </div>

        <div className="admin-section">
          <h2>Sessions started — last 30 days</h2>
          <div className="admin-panel">
            <TrendsChart trends={data.trends} />
          </div>
        </div>

        <div className="admin-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 28 }}>
          <div className="admin-section" style={{ marginBottom: 0 }}>
            <h2>Outcome breakdown</h2>
            <div className="admin-panel">
              <SplitBars data={data.sessions.phaseSplit} colors={PHASE_COLORS} />
            </div>
          </div>
          <div className="admin-section" style={{ marginBottom: 0 }}>
            <h2>Difficulty tier</h2>
            <div className="admin-panel">
              <SplitBars data={data.sessions.tierSplit} />
            </div>
          </div>
        </div>

        <div className="admin-section">
          <h2>Exit day distribution (finished games)</h2>
          <div className="admin-panel">
            <SplitBars data={data.financials.exitDayBuckets} />
          </div>
        </div>

        <div className="admin-section">
          <h2>Player feedback ({data.feedback.length})</h2>
          <FeedbackList feedback={data.feedback} />
        </div>
      </div>
    </div>
  )
}

export function AdminDashboard() {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(TOKEN_KEY))
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    fetch(`${API_BASE}/admin-dashboard`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async res => {
        if (res.status === 401) {
          sessionStorage.removeItem(TOKEN_KEY)
          setToken(null)
          throw new Error('Session expired, please log in again')
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((d: DashboardData) => {
        setData(d)
        setLoading(false)
      })
      .catch((e: Error) => {
        setError(e.message)
        setLoading(false)
      })
  }, [token])

  function handleLogout() {
    sessionStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setData(null)
  }

  if (!token) return <AdminLogin onSuccess={setToken} />

  if (loading || !data) {
    return (
      <div className="admin-dash" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {error ? <div className="admin-error">{error}</div> : <div style={{ color: 'var(--muted)' }}>Loading dashboard…</div>}
      </div>
    )
  }

  return <DashboardBody data={data} onLogout={handleLogout} />
}
