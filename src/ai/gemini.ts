import { GoogleGenerativeAI } from '@google/generative-ai'
import type { FeatureImpact } from '../types'
import type { FeatureTemplate } from '../data/featureTemplates'
import { FEATURE_TEMPLATES } from '../data/featureTemplates'

export interface IdeaValidation {
  idea: string
  score: number
  feedback: string
  strengths: string[]
  risks: string[]
  suggestion?: string
}

export interface DifficultyModifier {
  tier: 'promising' | 'competitive' | 'risky' | 'brutal'
  customerMultiplier: number
  churnFloor: number
  featureImpactMultiplier: number
  campaignEffectiveness: number
  investorInterestRate: number
  eventWeighting: { crisisWeight: number; opportunityWeight: number }
}

const DIFFICULTY_TABLE: Record<DifficultyModifier['tier'], Omit<DifficultyModifier, 'tier'>> = {
  promising:   { customerMultiplier: 1.1,  churnFloor: 3,  featureImpactMultiplier: 1.2,  campaignEffectiveness: 1.08, investorInterestRate: 1.3, eventWeighting: { crisisWeight: 0.2, opportunityWeight: 0.5 } },
  competitive: { customerMultiplier: 1.0,  churnFloor: 5,  featureImpactMultiplier: 1.0,  campaignEffectiveness: 1.0,  investorInterestRate: 1.0, eventWeighting: { crisisWeight: 0.33, opportunityWeight: 0.33 } },
  risky:       { customerMultiplier: 0.7,  churnFloor: 8,  featureImpactMultiplier: 0.75, campaignEffectiveness: 0.7,  investorInterestRate: 0.6, eventWeighting: { crisisWeight: 0.5, opportunityWeight: 0.25 } },
  brutal:      { customerMultiplier: 0.4,  churnFloor: 12, featureImpactMultiplier: 0.5,  campaignEffectiveness: 0.45, investorInterestRate: 0.3, eventWeighting: { crisisWeight: 0.6, opportunityWeight: 0.2 } },
}

export function scoreToDifficulty(score: number): DifficultyModifier {
  const tier: DifficultyModifier['tier'] =
    score >= 8 ? 'promising' :
    score >= 5 ? 'competitive' :
    score >= 3 ? 'risky' :
    'brutal'
  return { tier, ...DIFFICULTY_TABLE[tier] }
}

export function tierLabel(tier: DifficultyModifier['tier']): string {
  return { promising: 'Promising', competitive: 'Competitive', risky: 'Risky', brutal: 'Brutal' }[tier]
}

export function tierColor(tier: DifficultyModifier['tier']): string {
  return { promising: 'var(--success)', competitive: 'var(--info)', risky: 'var(--warning)', brutal: 'var(--error)' }[tier]
}

// ─── Timeout helper ──────────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), ms)
    ),
  ])
}

// ─── Response Cache ──────────────────────────────────────────────────────────

const CACHE_PREFIX = 'startup-ai-cache-'
const CACHE_VERSION = 'v1'

function cacheKey(namespace: string, input: string): string {
  const normalized = input.trim().toLowerCase().replace(/\s+/g, ' ')
  return `${CACHE_PREFIX}${CACHE_VERSION}-${namespace}-${normalized}`
}

function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const envelope = JSON.parse(raw) as { ts: number; data: T }
    const ageMs = Date.now() - envelope.ts
    if (ageMs > 7 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(key)
      return null
    }
    return envelope.data
  } catch {
    return null
  }
}

function writeCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }))
  } catch { /* quota exceeded — ignore */ }
}

// ─── Model ───────────────────────────────────────────────────────────────────

function getModel() {
  const key = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
  if (!key) {
    console.warn('[gemini] No VITE_GEMINI_API_KEY found — using fallback. Restart dev server if you just added .env')
    return null
  }
  const genAI = new GoogleGenerativeAI(key)
  return genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
}

const VALID_IMPACTS: FeatureImpact[] = ['users', 'churn', 'mrr', 'upsell', 'activation', 'reach', 'enterprise', 'integration']

export async function validateIdea(idea: string): Promise<IdeaValidation> {
  const ck = cacheKey('validate', idea)
  const cached = readCache<IdeaValidation>(ck)
  if (cached) {
    console.log('[gemini] validateIdea: cache hit')
    return { ...cached, idea }
  }

  const model = getModel()
  if (!model) return fallbackValidation(idea)

  const prompt = `You are evaluating a startup idea for a business simulation game. Analyze the following startup idea and return ONLY valid JSON (no markdown, no code fences).

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

  try {
    console.log('[gemini] validateIdea: calling API...')
    const result = await withTimeout(model.generateContent(prompt), 12_000)
    const text = result.response.text().trim()
    console.log('[gemini] validateIdea raw response:', text.slice(0, 200))
    const json = JSON.parse(text.replace(/^```json?\s*/i, '').replace(/```\s*$/, ''))
    const score = Math.max(1, Math.min(10, Math.round(json.score ?? 5)))
    const validation: IdeaValidation = {
      idea,
      score,
      feedback: String(json.feedback ?? 'Interesting concept with potential.'),
      strengths: Array.isArray(json.strengths) ? json.strengths.map(String).slice(0, 3) : ['Novel concept'],
      risks: Array.isArray(json.risks) ? json.risks.map(String).slice(0, 3) : ['Market uncertainty'],
      suggestion: json.suggestion ? String(json.suggestion) : undefined,
    }
    writeCache(ck, validation)
    return validation
  } catch (err) {
    console.error('[gemini] validateIdea failed:', err)
    return fallbackValidation(idea)
  }
}

function fallbackValidation(idea: string): IdeaValidation {
  return {
    idea,
    score: 5,
    feedback: 'Solid concept with room to grow. The market has potential but execution will be key.',
    strengths: ['Clear problem statement', 'Addressable market exists'],
    risks: ['Competitive landscape', 'Customer acquisition cost'],
    suggestion: 'Consider focusing on a specific niche to start.',
  }
}

export async function generateRoadmap(idea: string, score: number): Promise<FeatureTemplate[]> {
  const ck = cacheKey('roadmap', `${idea}::${score}`)
  const cached = readCache<FeatureTemplate[]>(ck)
  if (cached) {
    console.log('[gemini] generateRoadmap: cache hit')
    return cached
  }

  const model = getModel()
  if (!model) return fallbackRoadmap()

  const prompt = `You are generating a product roadmap for a startup simulation game. The user's startup idea is: "${idea}" (viability score: ${score}/10).

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

  try {
    console.log('[gemini] generateRoadmap: calling API...')
    const result = await withTimeout(model.generateContent(prompt), 12_000)
    const text = result.response.text().trim()
    console.log('[gemini] generateRoadmap raw response:', text.slice(0, 300))
    const json = JSON.parse(text.replace(/^```json?\s*/i, '').replace(/```\s*$/, ''))
    if (!Array.isArray(json) || json.length < 5) return fallbackRoadmap()

    const roadmap = json.slice(0, 20).map((item: Record<string, unknown>) => ({
      title: String(item.title ?? 'Feature'),
      description: String(item.description ?? ''),
      baseDays: Math.max(2, Math.min(15, Number(item.baseDays) || 7)),
      value: (['low', 'medium', 'high'].includes(String(item.value)) ? String(item.value) : 'medium') as 'low' | 'medium' | 'high',
      impacts: (Array.isArray(item.impacts)
        ? item.impacts.filter((i: unknown): i is FeatureImpact => VALID_IMPACTS.includes(i as FeatureImpact))
        : ['churn']) as FeatureImpact[],
      phase: (['foundation', 'launch', 'growth', 'scale'].includes(String(item.phase)) ? String(item.phase) : 'launch') as 'foundation' | 'launch' | 'growth' | 'scale',
    }))
    writeCache(ck, roadmap)
    return roadmap
  } catch (err) {
    console.error('[gemini] generateRoadmap failed:', err)
    return fallbackRoadmap()
  }
}

function fallbackRoadmap(): FeatureTemplate[] {
  return FEATURE_TEMPLATES.map((t, i) => ({
    ...t,
    phase: (i < 6 ? 'foundation' : i < 12 ? 'launch' : i < 18 ? 'growth' : 'scale') as 'foundation' | 'launch' | 'growth' | 'scale',
  }))
}
