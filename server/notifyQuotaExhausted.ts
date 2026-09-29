import { MongoClient } from 'mongodb'

const COL = 'system_alerts'
const ALERT_ID = 'groq-keys-exhausted'
const COOLDOWN_MS = 6 * 60 * 60 * 1000 // don't spam — at most one email per 6h
const RESEND_ENDPOINT = 'https://api.resend.com/emails'
const NOTIFY_TIMEOUT_MS = 5_000

export type NotifyEnv = {
  MONGODB_URI?: string
  MONGODB_DB_NAME?: string
  RESEND_API_KEY?: string
  ALERT_EMAIL?: string
}

let clientPromise: Promise<MongoClient> | null = null
function getClient(uri: string): Promise<MongoClient> {
  if (!clientPromise) clientPromise = new MongoClient(uri).connect()
  return clientPromise
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ])
}

/**
 * Fires an email alert the first time all GROQ_API_KEYS fail in a rolling
 * 6h window, then stays quiet until the window passes — so a sustained
 * outage sends one email, not one per failed request. Never throws; a
 * failure here should never affect the caller's own error response.
 */
export async function notifyQuotaExhausted(env: NotifyEnv, lastErrorMessage: string): Promise<void> {
  try {
    if (!env.MONGODB_URI || !env.RESEND_API_KEY || !env.ALERT_EMAIL) return

    const client = await withTimeout(getClient(env.MONGODB_URI), NOTIFY_TIMEOUT_MS)
    const db = client.db(env.MONGODB_DB_NAME || 'startup-game')
    const col = db.collection(COL)

    const existing = await col.findOne({ _id: ALERT_ID } as never)
    const lastSentAt = existing?.lastSentAt ? new Date(existing.lastSentAt).getTime() : 0
    if (Date.now() - lastSentAt < COOLDOWN_MS) return // already alerted recently

    await col.updateOne(
      { _id: ALERT_ID } as never,
      { $set: { lastSentAt: new Date() } },
      { upsert: true },
    )

    await withTimeout(fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'startup-game alerts <onboarding@resend.dev>',
        to: [env.ALERT_EMAIL],
        subject: '⚠️ startup-game: all GROQ_API_KEYS are failing',
        text: `Every key in GROQ_API_KEYS just failed on the same request — idea rating and roadmap generation are falling back to the static defaults for every player right now.\n\nLast error: ${lastErrorMessage}\n\nAdd another key to GROQ_API_KEYS, or check quota at console.groq.com.\n\n(You won't get another one of these for at least 6 hours, even if it's still failing.)`,
      }),
    }), NOTIFY_TIMEOUT_MS)
  } catch {
    // Alerting is best-effort — never let it break the actual request.
  }
}
