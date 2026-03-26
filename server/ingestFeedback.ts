import { MongoClient } from 'mongodb'
import type { IngestEnv } from './ingestGameDay'

const COL = 'game_feedback'

let clientPromise: Promise<MongoClient> | null = null
function getClient(uri: string): Promise<MongoClient> {
  if (!clientPromise) clientPromise = new MongoClient(uri).connect()
  return clientPromise
}

let indexEnsured = false
async function ensureIndex(db: ReturnType<MongoClient['db']>): Promise<void> {
  if (indexEnsured) return
  await db.collection(COL).createIndex({ sessionId: 1, submittedAt: 1 })
  indexEnsured = true
}

export async function ingestFeedback(
  rawJson: string,
  env: IngestEnv,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const uri    = env.MONGODB_URI
  const dbName = env.MONGODB_DB_NAME || 'startup-game'

  if (!uri) return { status: 503, body: { error: 'MONGODB_URI not configured' } }

  let body: Record<string, unknown>
  try {
    body = JSON.parse(rawJson) as Record<string, unknown>
  } catch {
    return { status: 400, body: { error: 'Invalid JSON' } }
  }

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : 'anonymous'
  const mood        = typeof body.mood      === 'number' ? body.mood      : null
  const challenges  = Array.isArray(body.challenges)    ? body.challenges : []
  const wishlist    = typeof body.wishlist  === 'string' ? body.wishlist.trim().slice(0, 500) : ''
  const day         = typeof body.day       === 'number' ? body.day       : 0
  const mrr         = typeof body.mrr       === 'number' ? body.mrr       : 0
  const customers   = typeof body.customers === 'number' ? body.customers : 0

  try {
    const client = await getClient(uri)
    const db     = client.db(dbName)
    await ensureIndex(db)

    await db.collection(COL).insertOne({
      sessionId,
      mood,
      challenges,
      wishlist,
      gameContext: { day, mrr, customers },
      submittedAt: new Date(),
    })

    return { status: 200, body: { ok: true } }
  } catch (e) {
    console.error('[ingest-feedback]', e)
    return { status: 500, body: { error: 'Database error' } }
  }
}
