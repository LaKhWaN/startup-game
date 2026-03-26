import { useEffect, useMemo, useState } from 'react'
import type { MetricsSnapshot } from '../types'
import {
  ANALYTICS_DB_STORAGE_KEY,
  getAnalyticsDatabaseBytesFromStorage,
  getDailyMetricsForGame,
  getGameSummaries,
  type GameSummary,
} from '../save/gameAnalytics'
import './AdminAnalytics.css'

const METRIC_LABELS: { key: keyof MetricsSnapshot; label: string; fmt: 'money' | 'plain' | 'pct' | 'arpu' | 'runway' }[] = [
  { key: 'day', label: 'Day', fmt: 'plain' },
  { key: 'mrr', label: 'MRR', fmt: 'money' },
  { key: 'customers', label: 'Customers', fmt: 'plain' },
  { key: 'churnRate', label: 'Churn / mo', fmt: 'pct' },
  { key: 'cash', label: 'Cash', fmt: 'money' },
  { key: 'burn', label: 'Burn / mo', fmt: 'money' },
  { key: 'runway', label: 'Runway', fmt: 'runway' },
  { key: 'arpu', label: 'ARPU', fmt: 'arpu' },
  { key: 'brand', label: 'Brand', fmt: 'plain' },
  { key: 'techDebt', label: 'Tech debt', fmt: 'plain' },
  { key: 'productProgress', label: 'Product', fmt: 'plain' },
  { key: 'teamSize', label: 'Team', fmt: 'plain' },
  { key: 'culture', label: 'Culture', fmt: 'plain' },
  { key: 'valuation', label: 'Valuation', fmt: 'money' },
]

function safeLocaleDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString()
}

function fmtMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}m`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`
  return `$${Math.round(n)}`
}

function fmtPlain(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return `${Math.round(n)}`
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`
}

function fmtArpu(n: number): string {
  return `$${Math.round(n)}`
}

function fmtRunway(n: number): string {
  if (n >= 999) return '∞'
  return `${Math.round(n)} mo`
}

function formatMetric(v: number, fmt: (typeof METRIC_LABELS)[number]['fmt']): string {
  switch (fmt) {
    case 'money': return fmtMoney(v)
    case 'pct': return fmtPct(v)
    case 'arpu': return fmtArpu(v)
    case 'runway': return fmtRunway(v)
    default: return fmtPlain(v)
  }
}

function shortId(id: string): string {
  if (id.length <= 14) return id
  return `${id.slice(0, 8)}…${id.slice(-4)}`
}

function normY(v: number, min: number, max: number, height: number, pad: number): number {
  const range = Math.max(1e-9, max - min)
  return height - pad - ((v - min) / range) * (height - pad * 2)
}

function polyForSeries(
  rows: MetricsSnapshot[],
  keyName: keyof MetricsSnapshot,
  width: number,
  height: number,
  pad: number,
): string {
  if (rows.length === 0) return ''
  const ys = rows.map(r => Number(r[keyName]))
  const min = Math.min(...ys)
  const max = Math.max(...ys)
  return rows
    .map((r, idx) => {
      const x = pad + (idx / Math.max(1, rows.length - 1)) * (width - pad * 2)
      const y = normY(Number(r[keyName]), min, max, height, pad)
      return `${x},${y}`
    })
    .join(' ')
}

function SessionHero({ selected }: { selected: GameSummary }) {
  const phaseClass =
    selected.phaseEnd === 'sold' ? 'admin-phase--sold'
      : selected.phaseEnd === 'lost' ? 'admin-phase--lost'
        : 'admin-phase--live'

  return (
    <div className="admin-session-hero">
      <div className="admin-session-hero__accent" aria-hidden />
      <div className="admin-session-hero__body">
        <div className="admin-session-hero__top">
          <h2 className="admin-session-title">{selected.startupName || 'Unnamed'}</h2>
          <span className={`admin-phase ${phaseClass}`}>{selected.phaseEnd.replace(/_/g, ' ')}</span>
        </div>
        <div className="admin-session-meta">
          <span className="admin-pill">{selected.difficultyTier}</span>
          <span className="admin-pill admin-pill--muted">Session {shortId(selected.id)}</span>
          <span className="admin-pill admin-pill--muted">{selected.daysRecorded} days in DB</span>
        </div>
        <div className="admin-session-dates">
          <span title="Derived from game progress">Started ~ {safeLocaleDate(selected.startedAt)}</span>
          {selected.endedAt && (
            <span>Ended {safeLocaleDate(selected.endedAt)}</span>
          )}
        </div>
      </div>
    </div>
  )
}

function LatestTape({ rows }: { rows: MetricsSnapshot[] }) {
  const chips = useMemo(() => {
    if (rows.length < 1) return []
    const first = rows[0]
    const last = rows[rows.length - 1]
    return METRIC_LABELS.filter(m => m.key !== 'day').map((m) => {
      const a = Number(first[m.key])
      const b = Number(last[m.key])
      const d = b - a
      return { ...m, last: b, delta: d }
    })
  }, [rows])

  if (chips.length === 0) return null

  return (
    <section className="admin-section admin-section--tape">
      <div className="admin-section-head">
        <h2>Latest snapshot</h2>
        <span className="admin-section-sub">End of day {rows[rows.length - 1].day} vs day {rows[0].day}</span>
      </div>
      <div className="admin-tape">
        {chips.map((c) => (
          <div key={String(c.key)} className="admin-tape-chip">
            <span className="admin-tape-chip__label">{c.label}</span>
            <span className="admin-tape-chip__val">{formatMetric(c.last, c.fmt)}</span>
            {rows.length > 1 && (
              <span className={`admin-tape-chip__delta ${c.delta === 0 ? '' : c.delta > 0 ? 'admin-tape-chip__delta--up' : 'admin-tape-chip__delta--down'}`}>
                {c.delta === 0 ? '—' : `${c.delta > 0 ? '+' : ''}${formatMetric(Math.abs(c.delta), c.fmt)}`}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function VitalsBars({ rows }: { rows: MetricsSnapshot[] }) {
  const last = rows[rows.length - 1]
  const defs = useMemo(() => [
    { key: 'brand' as const, label: 'Brand', color: 'var(--green)', max: 100 },
    { key: 'culture' as const, label: 'Culture', color: '#38bdf8', max: 100 },
    { key: 'productProgress' as const, label: 'Product maturity', color: '#c084fc', max: 100 },
    { key: 'techDebt' as const, label: 'Tech debt', color: 'var(--red)', max: 100, invert: true },
    { key: 'churnRate' as const, label: 'Churn', color: '#fb923c', max: Math.max(30, 1, ...rows.map(r => r.churnRate)) },
  ], [rows])

  if (!last) return null

  return (
    <section className="admin-section admin-section--vitals">
      <div className="admin-section-head">
        <h2>Company vitals</h2>
        <span className="admin-section-sub">Where you landed (day {last.day})</span>
      </div>
      <div className="admin-vitals-grid">
        {defs.map((d) => {
          const v = Number(last[d.key])
          const pct = Math.min(100, Math.max(0, (v / d.max) * 100))
          return (
            <div key={d.key} className="admin-vital">
              <div className="admin-vital__head">
                <span>{d.label}</span>
                <strong>{d.key === 'churnRate' ? fmtPct(v) : `${Math.round(v)}`}</strong>
              </div>
              <div className={`admin-vital__track ${d.invert ? 'admin-vital__track--invert' : ''}`}>
                <div
                  className="admin-vital__fill"
                  style={{ width: `${pct}%`, background: d.color }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/** Full-width chart: MRR, cash, customers (each scaled to its own min–max so all three stay visible). */
function OverviewThreeLineChart({ rows }: { rows: MetricsSnapshot[] }) {
  const W = 960
  const H = 300
  const pad = 28

  const { mrrPts, cashPts, custPts, endMrr, endCash, endCust } = useMemo(() => {
    if (rows.length === 0) {
      return { mrrPts: '', cashPts: '', custPts: '', endMrr: 0, endCash: 0, endCust: 0 }
    }
    const last = rows[rows.length - 1]
    return {
      mrrPts:  polyForSeries(rows, 'mrr', W, H, pad),
      cashPts: polyForSeries(rows, 'cash', W, H, pad),
      custPts: polyForSeries(rows, 'customers', W, H, pad),
      endMrr:  Number(last.mrr),
      endCash: Number(last.cash),
      endCust: Number(last.customers),
    }
  }, [rows])

  if (rows.length === 0) {
    return <div className="admin-empty-chart">No daily data yet</div>
  }

  return (
    <div className="admin-chart-wrap admin-chart-wrap--hero">
      <svg viewBox={`0 0 ${W} ${H}`} className="admin-chart admin-chart--hero" preserveAspectRatio="xMidYMid meet">
        <polyline points={mrrPts} fill="none" stroke="#34d399" strokeWidth={2.8} strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={cashPts} fill="none" stroke="#60a5fa" strokeWidth={2.8} strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={custPts} fill="none" stroke="#f59e0b" strokeWidth={2.8} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div className="admin-legend">
        <span className="admin-legend-item"><i className="admin-dot admin-dot--mrr" /> MRR (scaled) · end {fmtMoney(endMrr)}</span>
        <span className="admin-legend-item"><i className="admin-dot admin-dot--cash" /> Cash (scaled) · end {fmtMoney(endCash)}</span>
        <span className="admin-legend-item"><i className="admin-dot admin-dot--cust" /> Customers (scaled) · end {fmtPlain(endCust)}</span>
      </div>
      <p className="admin-chart-note">Each line uses its own vertical scale so you can see all three trends together.</p>
    </div>
  )
}

type SparkFmt = 'money' | 'plain'

function Sparkline({
  rows,
  keyName,
  color,
  fmt = 'money',
  compact = false,
}: {
  rows: MetricsSnapshot[]
  keyName: keyof MetricsSnapshot
  color: string
  fmt?: SparkFmt
  compact?: boolean
}) {
  const width = 860
  const height = compact ? 120 : 200
  const pad = compact ? 16 : 22

  const points = useMemo(() => {
    if (rows.length === 0) return ''
    const ys = rows.map(r => Number(r[keyName]))
    const min = Math.min(...ys)
    const max = Math.max(...ys)
    const range = Math.max(1, max - min)
    return rows
      .map((r, idx) => {
        const x = pad + (idx / Math.max(1, rows.length - 1)) * (width - pad * 2)
        const y = height - pad - ((Number(r[keyName]) - min) / range) * (height - pad * 2)
        return `${x},${y}`
      })
      .join(' ')
  }, [rows, keyName, height, pad])

  const fmtVal = fmt === 'money' ? fmtMoney : fmtPlain

  if (rows.length === 0) {
    return <div className="admin-empty-chart">No data</div>
  }

  const first = Number(rows[0][keyName])
  const last = Number(rows[rows.length - 1][keyName])
  const delta = last - first

  return (
    <div className={`admin-chart-wrap ${compact ? 'admin-chart-wrap--compact' : ''}`}>
      <svg viewBox={`0 0 ${width} ${height}`} className={`admin-chart ${compact ? 'admin-chart--compact' : 'admin-chart--half'}`}>
        <polyline points={points} fill="none" stroke={color} strokeWidth={compact ? 2 : 2.5} strokeLinejoin="round" />
      </svg>
      {!compact && (
        <div className="admin-chart-meta">
          <span>Start: {fmtVal(first)}</span>
          <span>End: {fmtVal(last)}</span>
          <span className={delta >= 0 ? 'admin-up' : 'admin-down'}>
            Δ {delta >= 0 ? '+' : ''}{fmtVal(delta)}
          </span>
        </div>
      )}
    </div>
  )
}

const SPARK_BENTO: { title: string; key: keyof MetricsSnapshot; color: string; fmt: SparkFmt }[] = [
  { title: 'Burn / mo', key: 'burn', color: '#f87171', fmt: 'money' },
  { title: 'ARPU', key: 'arpu', color: '#4ade80', fmt: 'money' },
  { title: 'Churn %', key: 'churnRate', color: '#fb923c', fmt: 'plain' },
  { title: 'Team size', key: 'teamSize', color: '#94a3b8', fmt: 'plain' },
  { title: 'Brand', key: 'brand', color: '#34d399', fmt: 'plain' },
  { title: 'Culture', key: 'culture', color: '#38bdf8', fmt: 'plain' },
  { title: 'Product %', key: 'productProgress', color: '#c084fc', fmt: 'plain' },
  { title: 'Tech debt', key: 'techDebt', color: '#f43f5e', fmt: 'plain' },
]

function SparkBento({ rows }: { rows: MetricsSnapshot[] }) {
  return (
    <section className="admin-section admin-section--bento">
      <div className="admin-section-head">
        <h2>Every metric over time</h2>
        <span className="admin-section-sub">Each tile is one field from your SQLite daily rows</span>
      </div>
      <div className="admin-spark-bento">
        {SPARK_BENTO.map((s) => (
          <div key={s.key} className="admin-spark-cell">
            <h3 className="admin-spark-cell__title">{s.title}</h3>
            <Sparkline rows={rows} keyName={s.key} color={s.color} fmt={s.fmt} compact />
          </div>
        ))}
      </div>
    </section>
  )
}

function DailyMetricsTable({ rows }: { rows: MetricsSnapshot[] }) {
  if (rows.length === 0) return null
  return (
    <div className="admin-table-scroll">
      <table className="admin-table">
        <thead>
          <tr>
            {METRIC_LABELS.map((m) => (
              <th key={String(m.key)}>{m.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.day}>
              {METRIC_LABELS.map((m) => (
                <td key={String(m.key)}>{formatMetric(Number(r[m.key]), m.fmt)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function AdminAnalytics() {
  const [games, setGames] = useState<GameSummary[]>([])
  const [selectedGameId, setSelectedGameId] = useState<string>('')
  const [rows, setRows] = useState<MetricsSnapshot[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        setLoadError(null)
        const all = await getGameSummaries()
        setGames(all)
        if (all.length > 0) setSelectedGameId(all[0].id)
      } catch (e) {
        console.error(e)
        setLoadError(e instanceof Error ? e.message : 'Failed to read analytics database')
        setGames([])
      }
    })()
  }, [])

  useEffect(() => {
    if (!selectedGameId) return
    void (async () => {
      try {
        const metrics = await getDailyMetricsForGame(selectedGameId)
        setRows(metrics)
      } catch (e) {
        console.error(e)
        setRows([])
      }
    })()
  }, [selectedGameId])

  function downloadSqliteFile() {
    const bytes = getAnalyticsDatabaseBytesFromStorage()
    if (!bytes || bytes.length === 0) {
      window.alert('No database found in localStorage.')
      return
    }
    const blob = new Blob([bytes], { type: 'application/x-sqlite3' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'startup-game-analytics.sqlite'
    a.click()
    URL.revokeObjectURL(url)
  }

  const selected = games.find(g => g.id === selectedGameId) ?? null

  return (
    <div className="admin-root">
      <header className="admin-header">
        <h1>Game Analytics</h1>
        <div className="admin-header-actions">
          <button type="button" className="admin-btn" onClick={downloadSqliteFile}>
            Download .sqlite
          </button>
          <a href="/" className="admin-back">Back to Game</a>
        </div>
      </header>

      <p className="admin-hint">
        Data lives in your browser as key <code>{ANALYTICS_DB_STORAGE_KEY}</code> (binary SQLite). Open <code>/admin</code> or <code>#/admin</code>.
      </p>

      {loadError && (
        <div className="admin-error" role="alert">
          {loadError}. Check the browser console. Try downloading the .sqlite file and opening it in DB Browser for SQLite.
        </div>
      )}

      <div className="admin-controls">
        <label htmlFor="game-select">Game</label>
        <select
          id="game-select"
          value={selectedGameId}
          onChange={(e) => setSelectedGameId(e.target.value)}
        >
          {games.map(g => (
            <option key={g.id} value={g.id}>
              {g.startupName} · Day {g.finalDay} · {g.phaseEnd} · {safeLocaleDate(g.startedAt)}
            </option>
          ))}
        </select>
      </div>

      {!loadError && !selected && games.length === 0 && (
        <div className="admin-empty">
          No rows in the <code>games</code> table yet. Play past day 1 (or start a new game) after this update — data is written after each in-game day from the simulation.
        </div>
      )}

      {selected && (
        <>
          <SessionHero selected={selected} />

          <div className="admin-summary admin-summary--db">
            <div><span>Outcome</span><strong>{selected.phaseEnd}</strong></div>
            <div><span>Final day (meta)</span><strong>{selected.finalDay}</strong></div>
            <div><span>Rows stored</span><strong>{selected.daysRecorded}</strong></div>
            <div><span>Final MRR</span><strong>{fmtMoney(selected.finalMrr)}</strong></div>
            <div><span>Customers</span><strong>{selected.finalCustomers}</strong></div>
            <div><span>Valuation</span><strong>{fmtMoney(selected.finalValuation)}</strong></div>
          </div>

          {rows.length > 0 && (
            <>
              <LatestTape rows={rows} />
              <VitalsBars rows={rows} />
            </>
          )}

          <section className="admin-section admin-section--hero">
            <h2>Overview · MRR, cash & customers</h2>
            <OverviewThreeLineChart rows={rows} />
          </section>

          <div className="admin-charts-row">
            <section className="admin-section admin-section--half">
              <h2>Runway (months)</h2>
              <Sparkline rows={rows} keyName="runway" color="#a78bfa" fmt="plain" />
            </section>
            <section className="admin-section admin-section--half">
              <h2>Valuation (est.)</h2>
              <Sparkline rows={rows} keyName="valuation" color="#f472b6" />
            </section>
          </div>

          {rows.length > 0 && <SparkBento rows={rows} />}

          {rows.length > 0 && (
            <section className="admin-section admin-section--table">
              <div className="admin-section-head">
                <h2>Day-by-day · full table</h2>
                <span className="admin-section-sub">Every column persisted in <code>game_daily_metrics</code></span>
              </div>
              <DailyMetricsTable rows={rows} />
            </section>
          )}
        </>
      )}
    </div>
  )
}
