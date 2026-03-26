import type { Db } from 'mongodb'
import { MongoClient } from 'mongodb'

const COL_SESSIONS = 'game_sessions'
const COL_DAYS = 'game_day_snapshots'

interface SessionPayload {
  startupName?: string
  idea?: string
  difficultyTier?: string
  workspace?: string
  phase?: string
}

interface SnapshotPayload {
  day: number
  mrr: number
  customers: number
  churnRate: number
  cash: number
  burn: number
  runway: number
  arpu: number
  brand: number
  techDebt: number
  productProgress: number
  teamSize: number
  culture: number
  valuation: number
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

function validateSnapshot(s: unknown): SnapshotPayload | null {
  if (!s || typeof s !== 'object') return null
  const o = s as Record<string, unknown>
  const day = num(o.day, NaN)
  if (!Number.isInteger(day) || day < 0) return null
  return {
    day,
    mrr: num(o.mrr),
    customers: num(o.customers),
    churnRate: num(o.churnRate),
    cash: num(o.cash),
    burn: num(o.burn),
    runway: num(o.runway),
    arpu: num(o.arpu),
    brand: num(o.brand),
    techDebt: num(o.techDebt),
    productProgress: num(o.productProgress),
    teamSize: num(o.teamSize),
    culture: num(o.culture),
    valuation: num(o.valuation),
  }
}

let clientPromise: Promise<MongoClient> | null = null
function getClient(uri: string): Promise<MongoClient> {
  if (!clientPromise) clientPromise = new MongoClient(uri).connect()
  return clientPromise
}

let indexesEnsured = false
async function ensureIndexes(db: Db): Promise<void> {
  if (indexesEnsured) return
  await db.collection(COL_SESSIONS).createIndex({ sessionId: 1 }, { unique: true })
  await db.collection(COL_DAYS).createIndex({ sessionId: 1, day: 1 }, { unique: true })
  indexesEnsured = true
}

export type IngestEnv = {
  MONGODB_URI?: string
  MONGODB_DB_NAME?: string
  ANALYTICS_INGEST_SECRET?: string
}

/**
 * Shared Mongo ingest used by Vite dev middleware (`npm run dev`).
 */
export async function ingestGameDay(
  rawJson: string,
  env: IngestEnv,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const uri = env.MONGODB_URI
  const dbName = env.MONGODB_DB_NAME || 'startup-game'
  const serverSecret = env.ANALYTICS_INGEST_SECRET

  if (!uri) {
    return { status: 503, body: { error: 'MONGODB_URI is not configured' } }
  }

  let body: Record<string, unknown>
  try {
    body = JSON.parse(rawJson) as Record<string, unknown>
  } catch {
    return { status: 400, body: { error: 'Invalid JSON' } }
  }

  // Optional gate: set ANALYTICS_INGEST_SECRET on the server when you want a shared password.
  if (serverSecret && typeof serverSecret === 'string' && serverSecret.length > 0) {
    if (body.ingestSecret !== serverSecret) {
      return { status: 401, body: { error: 'Unauthorized' } }
    }
  }

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : ''
  if (!sessionId) {
    return { status: 400, body: { error: 'sessionId required' } }
  }

  const session = (typeof body.session === 'object' && body.session !== null ? body.session : {}) as SessionPayload
  const snapshot = validateSnapshot(body.snapshot)

  if (!snapshot) {
    return { status: 400, body: { error: 'snapshot required (one row per in-game day)' } }
  }

  try {
    const client = await getClient(uri)
    const db = client.db(dbName)
    await ensureIndexes(db)
    const now = new Date()

    await db.collection(COL_SESSIONS).updateOne(
      { sessionId },
      {
        $set: {
          sessionId,
          startupName: String(session.startupName ?? 'Unnamed'),
          idea: String(session.idea ?? ''),
          difficultyTier: String(session.difficultyTier ?? 'unknown'),
          workspace: String(session.workspace ?? ''),
          phase: String(session.phase ?? 'playing'),
          updatedAt: now,
          lastRecordedDay: snapshot.day,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    )

    await db.collection(COL_DAYS).updateOne(
      { sessionId, day: snapshot.day },
      {
        $set: {
          sessionId,
          gameDay: snapshot.day,
          ...snapshot,
          ingestedAt: now,
        },
      },
      { upsert: true },
    )

    return { status: 200, body: { ok: true, sessionId, day: snapshot.day } }
  } catch (e) {
    console.error('[ingest-game-day]', e)
    return { status: 500, body: { error: 'Database error' } }
  }
}
