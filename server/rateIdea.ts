import { notifyQuotaExhausted, type NotifyEnv } from './notifyQuotaExhausted'

export type RateIdeaEnv = NotifyEnv & {
  GROQ_API_KEYS?: string
}

const GROQ_MODEL = 'openai/gpt-oss-120b'
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'
// The roadmap generation call (18 structured features) can take a while on a
// slow provider — kept generous even though Groq is typically much faster
// than the Gemini call this replaced.
const TIMEOUT_MS_VALIDATE = 12_000
const TIMEOUT_MS_ROADMAP  = 28_000
const MAX_EXCLUDE = 40

/** Existing epic titles the model must not repeat: short, plain, comma-joined. */
function excludeList(raw: unknown): string {
  if (!Array.isArray(raw)) return ''
  return raw.filter((t): t is string => typeof t === 'string').slice(0, MAX_EXCLUDE)
    .map(t => t.replace(/["\n\r`$\\]/g, '').trim().slice(0, 60)).filter(Boolean).map(t => `"${t}"`).join(', ')
}
const MAX_IDEA_LENGTH = 500

/**
 * The prompts live here, not in the browser.
 *
 * The client sends an operation name and an idea string; it cannot send a
 * prompt. Otherwise this route would be an open proxy to the model on the
 * project's billing account.
 */
function buildPrompt(op: 'validate' | 'roadmap' | 'epics', idea: string, score: number, round = 1, exclude = ''): string {
  if (op === 'epics') {
    return `You are planning the next big product roadmap for a startup in a business simulation game. The startup's idea is: "${idea}" (viability score: ${score}/10). This is roadmap number ${round}: the company already shipped its core product and is growing up.

Generate 8 BIG projects ("epics") this company would take on next. Each one takes a team of developers weeks or months. Later roadmaps are bigger and more ambitious than earlier ones.${exclude ? `\n\nDo NOT repeat or rename these existing projects: ${exclude}.` : ''}

Use a mix of these kinds:
- "segment": a version for a new customer segment
- "enterprise": enterprise plan / features big companies pay more for
- "platform": rebuilding foundations (scale, reliability, security)
- "integration": integrations, APIs, marketplace
- "international": launching in a new region
- "ai": an AI-powered capability

Return ONLY valid JSON (no markdown, no code fences) as an array:
[
  {
    "title": "<project name, 2-5 words>",
    "description": "<1 sentence, specific to ${idea}>",
    "baseDays": <number 15-40, bigger for harder projects>,
    "kind": "<segment|enterprise|platform|integration|international|ai>"
  }
]`
  }
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

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ])
}

/**
 * GROQ_API_KEYS is a bracketed, comma-separated list, e.g.
 * "[gsk_abc, gsk_def]" — lets multiple free-tier keys be rotated through
 * so one key's daily quota running out doesn't take the feature down.
 */
function parseApiKeys(raw: string | undefined): string[] {
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
async function callGroq(prompt: string, keys: string[], timeoutMs: number): Promise<string> {
  let lastError: unknown = new Error('No GROQ_API_KEYS configured')

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

      const data = await res.json() as { choices?: { message?: { content?: string } }[] }
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

/**
 * Returns the model's raw text. The client parses it, exactly as it did when it
 * called the model directly, so the parsing and fallback logic is unchanged.
 */
export async function rateIdea(
  rawJson: string,
  env: RateIdeaEnv,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const keys = parseApiKeys(env.GROQ_API_KEYS)
  // No key configured is a normal local setup, not an error — the client falls
  // back to its heuristic. Say so distinctly so it doesn't log a real failure.
  if (keys.length === 0) return { status: 503, body: { error: 'not_configured' } }

  let parsed: { op?: unknown; idea?: unknown; score?: unknown; round?: unknown; exclude?: unknown }
  try {
    parsed = JSON.parse(rawJson || '{}')
  } catch {
    return { status: 400, body: { error: 'Invalid JSON' } }
  }

  const op = parsed.op
  if (op !== 'validate' && op !== 'roadmap' && op !== 'epics') {
    return { status: 400, body: { error: 'op must be "validate", "roadmap" or "epics"' } }
  }

  const idea = typeof parsed.idea === 'string' ? parsed.idea.trim() : ''
  if (!idea) return { status: 400, body: { error: 'idea is required' } }
  if (idea.length > MAX_IDEA_LENGTH) {
    return { status: 400, body: { error: `idea must be ${MAX_IDEA_LENGTH} characters or fewer` } }
  }

  const rawScore = Number(parsed.score)
  const score = Number.isFinite(rawScore) ? Math.max(1, Math.min(10, Math.round(rawScore))) : 5

  try {
    const timeoutMs = op === 'validate' ? TIMEOUT_MS_VALIDATE : TIMEOUT_MS_ROADMAP
    const round = Math.max(1, Math.min(20, Math.round(Number(parsed.round)) || 1))
    const text = await callGroq(buildPrompt(op, idea, score, round, excludeList(parsed.exclude)), keys, timeoutMs)
    return { status: 200, body: { text } }
  } catch (e) {
    console.error('[rate-idea]', e)
    const message = e instanceof Error ? e.message : String(e)
    await notifyQuotaExhausted(env, message)
    return { status: 502, body: { error: 'Model request failed' } }
  }
}
