const GROQ_MODEL = 'openai/gpt-oss-120b'
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'
// The roadmap generation call (18 structured features) can take a while on a
// slow provider — kept generous even though Groq is typically much faster
// than the Gemini call this replaced.
const TIMEOUT_MS_VALIDATE = 12_000
const TIMEOUT_MS_ROADMAP  = 28_000
const MAX_IDEA_LENGTH = 500

// Best-effort per-IP limiting. Serverless instances aren't shared, so this
// throttles a single hot instance rather than the route globally — enough to
// blunt casual abuse of an unauthenticated endpoint, not a real rate limiter.
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 10
const hits = new Map()

function rateLimited(ip) {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter(t => now - t < WINDOW_MS)
  recent.push(now)
  hits.set(ip, recent)
  if (hits.size > 500) {
    for (const [k, v] of hits) if (!v.some(t => now - t < WINDOW_MS)) hits.delete(k)
  }
  return recent.length > MAX_PER_WINDOW
}

// Prompts live server-side so the client can't turn this into an open proxy to
// the model on our billing account. Keep in step with server/rateIdea.ts.
function buildPrompt(op, idea, score) {
  if (op === 'validate') {
    return `You are evaluating a startup idea for a business simulation game. Analyze the following startup idea and return ONLY valid JSON (no markdown, no code fences).

Startup idea: "${idea}"

Return this exact JSON structure:
{
  "score": <number 1-10, where 10 is an excellent idea with strong market fit>,
  "feedback": "<2-3 sentence assessment of the idea>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "risks": ["<risk 1>", "<risk 2>"],
  "suggestion": "<optional one-sentence suggestion to improve the idea, or null>"
}

Score honestly using the FULL 1-10 range based on real signals: market size and demand, differentiation from existing solutions, feasibility for a small team, and timing. Do not default to the middle of the range — most quickly-typed, generic, or underdeveloped ideas genuinely belong in the 3-6 band, and you should score them there rather than rounding up to be encouraging.
- 9-10: Exceptional — large market, clear differentiation, highly feasible, strong timing
- 7-8: Strong — solid fit and feasibility, but with a real gap or unproven edge
- 5-6: Average — workable, but generic, crowded, or with a real execution/differentiation problem
- 3-4: Weak — a real structural issue: tiny market, brutal competition, unclear demand, or very hard to build
- 1-2: Poor — no real market, fundamentally broken concept, or not a coherent business idea

Vague one-line ideas ("an app for X", "uber for Y" with no specifics) should usually land 3-5, not 6-7 — lack of specificity is itself a weakness, not neutral.`
  }

  return `You are generating a product roadmap for a startup simulation game. The user's startup idea is: "${idea}" (viability score: ${score}/10).

Generate a realistic, ORDERED list of 18 features/tasks this startup would build, from earliest to latest. Follow a real startup lifecycle:
- First 4-5: Foundation (landing page, auth, core MVP functionality)
- Next 4-5: Launch (payments, onboarding, analytics)
- Next 4-5: Growth (marketing features, integrations, team tools)
- Last 3-4: Scale (enterprise features, advanced capabilities, compliance)

Each feature must be relevant to the startup idea "${idea}".

Return ONLY valid JSON (no markdown, no code fences) as an array:
[
  {
    "title": "<feature name>",
    "description": "<1 sentence description specific to this startup>",
    "baseDays": <number 2-15>,
    "value": "<low|medium|high>",
    "impacts": [<1-3 items from: "users","churn","mrr","upsell","activation","reach","enterprise","integration">],
    "phase": "<foundation|launch|growth|scale>"
  }
]

Make titles concise (2-4 words). Make descriptions specific to "${idea}", not generic.`
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ])
}

/**
 * GROQ_API_KEYS is a bracketed, comma-separated list, e.g.
 * "[gsk_abc, gsk_def]" — lets multiple free-tier keys be rotated through
 * so one key's daily quota running out doesn't take the feature down.
 */
function parseApiKeys(raw) {
  if (!raw) return []
  return raw
    .trim()
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .split(',')
    .map(k => k.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean)
}

/**
 * Tries each key in order, moving to the next on a quota/auth/server error.
 * Throws only once every key has failed.
 */
async function callGroq(prompt, keys, timeoutMs) {
  let lastError = new Error('No GROQ_API_KEYS configured')

  for (const key of keys) {
    try {
      const res = await withTimeout(fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.9,
        }),
      }), timeoutMs)

      if (!res.ok) {
        lastError = new Error(`Groq key failed with ${res.status}`)
        continue // rate-limited, unauthorized, or server error — try the next key
      }

      const data = await res.json()
      const text = data.choices?.[0]?.message?.content
      if (!text) {
        lastError = new Error('Empty response from Groq')
        continue
      }
      return text.trim()
    } catch (e) {
      lastError = e
      // network error or timeout on this key — try the next one
    }
  }

  throw lastError
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function json(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return }
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })

  const keys = parseApiKeys(process.env.GROQ_API_KEYS)
  // Not configured is a normal state, not a failure — the client falls back.
  if (keys.length === 0) return json(res, 503, { error: 'not_configured' })

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown'
  if (rateLimited(ip)) return json(res, 429, { error: 'Too many requests' })

  let parsed
  try {
    parsed = JSON.parse((await readBody(req)) || '{}')
  } catch {
    return json(res, 400, { error: 'Invalid JSON' })
  }

  const op = parsed.op
  if (op !== 'validate' && op !== 'roadmap') {
    return json(res, 400, { error: 'op must be "validate" or "roadmap"' })
  }

  const idea = typeof parsed.idea === 'string' ? parsed.idea.trim() : ''
  if (!idea) return json(res, 400, { error: 'idea is required' })
  if (idea.length > MAX_IDEA_LENGTH) {
    return json(res, 400, { error: `idea must be ${MAX_IDEA_LENGTH} characters or fewer` })
  }

  const rawScore = Number(parsed.score)
  const score = Number.isFinite(rawScore) ? Math.max(1, Math.min(10, Math.round(rawScore))) : 5

  try {
    const timeoutMs = op === 'roadmap' ? TIMEOUT_MS_ROADMAP : TIMEOUT_MS_VALIDATE
    const text = await callGroq(buildPrompt(op, idea, score), keys, timeoutMs)
    return json(res, 200, { text })
  } catch (e) {
    console.error('[rate-idea]', e)
    return json(res, 502, { error: 'Model request failed' })
  }
}
