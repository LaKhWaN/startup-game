import { GoogleGenerativeAI } from '@google/generative-ai'

const MODEL = 'gemini-2.5-flash'
const TIMEOUT_MS = 12_000
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

Be realistic but fair. Most decent ideas should score 4-7. Only truly exceptional ideas get 8+. Only terrible ideas get 1-2.`
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

  const key = process.env.GEMINI_API_KEY
  // Not configured is a normal state, not a failure — the client falls back.
  if (!key) return json(res, 503, { error: 'not_configured' })

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
    const model = new GoogleGenerativeAI(key).getGenerativeModel({ model: MODEL })
    const result = await withTimeout(model.generateContent(buildPrompt(op, idea, score)), TIMEOUT_MS)
    return json(res, 200, { text: result.response.text().trim() })
  } catch (e) {
    console.error('[rate-idea]', e)
    return json(res, 502, { error: 'Model request failed' })
  }
}
