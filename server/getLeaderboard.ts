import { MongoClient, type Document } from 'mongodb'

const COL_SESSIONS = 'game_sessions'
const COL_DAYS = 'game_day_snapshots'

let clientPromise: Promise<MongoClient> | null = null
function getClient(uri: string): Promise<MongoClient> {
  if (!clientPromise) clientPromise = new MongoClient(uri).connect()
  return clientPromise
}

/**
 * Sessions to rank, newest-first by days played (top 100), each with its final-day
 * snapshot attached as `snap` (0 or 1 items). Replaces one findOne per session (#5).
 * Keep in step with api/leaderboard.js.
 */
export function leaderboardPipeline(): Document[] {
  return [
    { $match: { phase: { $in: ['sold', 'lost', 'playing'] } } },
    { $sort: { lastRecordedDay: -1 } },
    { $limit: 100 },
    {
      $lookup: {
        from: COL_DAYS,
        localField: 'sessionId',
        foreignField: 'sessionId',
        let: { day: '$lastRecordedDay' },
        pipeline: [
          { $match: { $expr: { $eq: ['$day', '$$day'] } } },
          { $limit: 1 },
          { $project: { _id: 0, mrr: 1, valuation: 1 } },
        ],
        as: 'snap',
      },
    },
    {
      $project: {
        _id: 0,
        startupName: 1,
        idea: 1,
        difficultyTier: 1,
        phase: 1,
        lastRecordedDay: 1,
        snap: 1,
      },
    },
  ]
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

    // The 100 most recent sessions (by days played), each joined to its final-day
    // snapshot for MRR + valuation, in one round trip.
    const sessions = await db
      .collection(COL_SESSIONS)
      .aggregate(leaderboardPipeline())
      .toArray()

    const results: LeaderboardEntry[] = sessions.map(session => {
      const snap = session.snap?.[0]
      return {
        rank: 0,
        startupName: String(session.startupName ?? 'Unnamed'),
        idea: String(session.idea ?? ''),
        difficultyTier: String(session.difficultyTier ?? 'unknown'),
        phase: String(session.phase ?? 'unknown'),
        lastRecordedDay: Number(session.lastRecordedDay ?? 0),
        mrr: Number(snap?.mrr ?? 0),
        valuation: Number(snap?.valuation ?? 0),
      }
    })

    // Sort by valuation desc, assign rank
    results.sort((a, b) => b.valuation - a.valuation || b.mrr - a.mrr)
    results.forEach((r, i) => { r.rank = i + 1 })

    return { status: 200, body: { entries: results } }
  } catch (e) {
    console.error('[get-leaderboard]', e)
    return { status: 500, body: { error: 'Database error' } }
  }
}
