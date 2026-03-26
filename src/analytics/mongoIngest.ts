import type { GameState } from '../types'

function apiUrl(): string {
  const u = import.meta.env.VITE_ANALYTICS_API_URL
  if (typeof u === 'string' && u.trim().length > 0) return u.trim()
  return '/api/ingest-game-day'
}

function ingestSecret(): string {
  const s = import.meta.env.VITE_ANALYTICS_INGEST_SECRET
  return typeof s === 'string' ? s : ''
}

/** In dev, POST to local Vite `/api` middleware (needs `MONGODB_URI` in `.env`). Disable with `VITE_DISABLE_REMOTE_ANALYTICS=true`. */
export function isRemoteAnalyticsConfigured(): boolean {
  if (import.meta.env.VITE_DISABLE_REMOTE_ANALYTICS === 'true') return false
  if (import.meta.env.DEV) return true
  return ingestSecret().length > 0
}

/** POST end-of-day metrics + session header to MongoDB via serverless API. Fire-and-forget from gameplay. */
export async function ingestGameDayRemote(state: GameState): Promise<void> {
  if (!isRemoteAnalyticsConfigured()) return

  const hist = state.fullMetricsHistory ?? []
  const snap = hist.length > 0 ? hist[hist.length - 1] : undefined
  if (!snap) return

  const secret = ingestSecret()
  const body: Record<string, unknown> = {
    sessionId: state.gameId,
    snapshot: {
      day: snap.day,
      mrr: snap.mrr,
      customers: snap.customers,
      churnRate: snap.churnRate,
      cash: snap.cash,
      burn: snap.burn,
      runway: snap.runway,
      arpu: snap.arpu,
      brand: snap.brand,
      techDebt: snap.techDebt,
      productProgress: snap.productProgress,
      teamSize: snap.teamSize,
      culture: snap.culture,
      valuation: snap.valuation,
    },
    session: {
      startupName: state.startupName,
      idea: state.idea ?? '',
      difficultyTier: state.difficultyModifier?.tier ?? 'unknown',
      workspace: state.workspace ?? '',
      phase: state.phase,
    },
  }
  if (secret.length > 0) body.ingestSecret = secret

  const res = await fetch(apiUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive: true,
  })

  if (!res.ok) {
    const t = await res.text()
    throw new Error(`Remote analytics ${res.status}: ${t}`)
  }
}

/** POST player feedback to MongoDB. Fire-and-forget. */
export async function ingestFeedbackRemote(payload: {
  sessionId: string
  mood: number | null
  challenges: string[]
  wishlist: string
  day: number
  mrr: number
  customers: number
}): Promise<void> {
  if (!isRemoteAnalyticsConfigured()) return

  const secret = ingestSecret()
  const body: Record<string, unknown> = { ...payload }
  if (secret.length > 0) body.ingestSecret = secret

  const url = (import.meta.env.VITE_ANALYTICS_API_URL as string | undefined)
    ? (import.meta.env.VITE_ANALYTICS_API_URL as string).replace('ingest-game-day', 'ingest-feedback')
    : '/api/ingest-feedback'

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive: true,
  })

  if (!res.ok) {
    const t = await res.text()
    throw new Error(`Feedback ingest ${res.status}: ${t}`)
  }
}
