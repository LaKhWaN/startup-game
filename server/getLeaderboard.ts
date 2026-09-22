import { MongoClient } from 'mongodb'

const COL_SESSIONS = 'game_sessions'

let clientPromise: Promise<MongoClient> | null = null
function getClient(uri: string): Promise<MongoClient> {
  if (!clientPromise) clientPromise = new MongoClient(uri).connect()
  return clientPromise
}

export type LeaderboardEnv = {
  MONGODB_URI?: string
  MONGODB_DB_NAME?: string
}

export interface LeaderboardEntry {
  rank: number
  startupName: string
  idea: string
  difficultyTier: string
  phase: string
  lastRecordedDay: number
  mrr: number
  valuation: number
}

export async function getLeaderboard(
  env: LeaderboardEnv,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const uri = env.MONGODB_URI
  const dbName = env.MONGODB_DB_NAME || 'startup-game'

  if (!uri) {
    return { status: 503, body: { error: 'MONGODB_URI is not configured' } }
  }

  try {
    const client = await getClient(uri)
    const db = client.db(dbName)

    // Get top 100 sessions by valuation (sold first, then survived longest)
    const sessions = await db
      .collection(COL_SESSIONS)
      .find(
        { phase: { $in: ['sold', 'lost', 'playing'] } },
        {
          projection: {
            _id: 0,
            sessionId: 1,
            startupName: 1,
            idea: 1,
            difficultyTier: 1,
            phase: 1,
            lastRecordedDay: 1,
          },
        },
      )
      .sort({ lastRecordedDay: -1 })
      .limit(100)
      .toArray()

    // Fetch final-day snapshot for MRR + valuation per session
    const results: LeaderboardEntry[] = []
    for (const session of sessions) {
      // Look up the snapshot for the last recorded day to get MRR/valuation
      const snap = await db.collection('game_day_snapshots').findOne(
        { sessionId: session.sessionId, day: session.lastRecordedDay },
        { projection: { _id: 0, mrr: 1, valuation: 1 } },
      )
      results.push({
        rank: 0,
        startupName: String(session.startupName ?? 'Unnamed'),
        idea: String(session.idea ?? ''),
        difficultyTier: String(session.difficultyTier ?? 'unknown'),
        phase: String(session.phase ?? 'unknown'),
        lastRecordedDay: Number(session.lastRecordedDay ?? 0),
        mrr: Number(snap?.mrr ?? 0),
        valuation: Number(snap?.valuation ?? 0),
      })
    }

    // Sort by valuation desc, assign rank
    results.sort((a, b) => b.valuation - a.valuation || b.mrr - a.mrr)
    results.forEach((r, i) => { r.rank = i + 1 })

    return { status: 200, body: { entries: results } }
  } catch (e) {
    console.error('[get-leaderboard]', e)
    return { status: 500, body: { error: 'Database error' } }
  }
}
