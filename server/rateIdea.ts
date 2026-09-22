import { GoogleGenerativeAI } from '@google/generative-ai'

export type RateIdeaEnv = {
  GEMINI_API_KEY?: string
}

const MODEL = 'gemini-2.5-flash'
const TIMEOUT_MS = 12_000
const MAX_IDEA_LENGTH = 500

/**
 * The prompts live here, not in the browser.
 *
 * The client sends an operation name and an idea string; it cannot send a
 * prompt. Otherwise this route would be an open proxy to the model on the
 * project's billing account.
 */
function buildPrompt(op: 'validate' | 'roadmap', idea: string, score: number): string {
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

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ])
}

/**
 * Returns the model's raw text. The client parses it, exactly as it did when it
 * called the model directly, so the parsing and fallback logic is unchanged.
 */
export async function rateIdea(
  rawJson: string,
  env: RateIdeaEnv,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const key = env.GEMINI_API_KEY
  // No key configured is a normal local setup, not an error — the client falls
  // back to its heuristic. Say so distinctly so it doesn't log a real failure.
  if (!key) return { status: 503, body: { error: 'not_configured' } }

  let parsed: { op?: unknown; idea?: unknown; score?: unknown }
  try {
    parsed = JSON.parse(rawJson || '{}')
  } catch {
    return { status: 400, body: { error: 'Invalid JSON' } }
  }

  const op = parsed.op
  if (op !== 'validate' && op !== 'roadmap') {
    return { status: 400, body: { error: 'op must be "validate" or "roadmap"' } }
  }

  const idea = typeof parsed.idea === 'string' ? parsed.idea.trim() : ''
  if (!idea) return { status: 400, body: { error: 'idea is required' } }
  if (idea.length > MAX_IDEA_LENGTH) {
    return { status: 400, body: { error: `idea must be ${MAX_IDEA_LENGTH} characters or fewer` } }
  }

  const rawScore = Number(parsed.score)
  const score = Number.isFinite(rawScore) ? Math.max(1, Math.min(10, Math.round(rawScore))) : 5

  try {
    const model = new GoogleGenerativeAI(key).getGenerativeModel({ model: MODEL })
    const result = await withTimeout(model.generateContent(buildPrompt(op, idea, score)), TIMEOUT_MS)
    return { status: 200, body: { text: result.response.text().trim() } }
  } catch (e) {
    console.error('[rate-idea]', e)
    return { status: 502, body: { error: 'Model request failed' } }
  }
}
