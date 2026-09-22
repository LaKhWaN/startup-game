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

/**
 * Asks the server to run the model. The API key stays server-side — see
 * server/rateIdea.ts (dev) and api/rate-idea.js (production).
 *
 * Returns the model's raw text, or null if the route is unconfigured or failed,
 * in which case the caller uses its local fallback.
 */
async function askModel(op: 'validate' | 'roadmap', idea: string, score = 5): Promise<string | null> {
  try {
    const res = await withTimeout(fetch('/api/rate-idea', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op, idea, score }),
    }), 15_000)

    if (res.status === 503) {
      console.warn('[gemini] /api/rate-idea has no GEMINI_API_KEY configured — using fallback')
      return null
    }
    if (!res.ok) {
      console.warn(`[gemini] /api/rate-idea returned ${res.status} — using fallback`)
      return null
    }

    const body = await res.json() as { text?: unknown }
    return typeof body.text === 'string' ? body.text.trim() : null
  } catch (e) {
    console.warn('[gemini] /api/rate-idea request failed — using fallback', e)
    return null
  }
}

const VALID_IMPACTS: FeatureImpact[] = ['users', 'churn', 'mrr', 'upsell', 'activation', 'reach', 'enterprise', 'integration']

export async function validateIdea(idea: string): Promise<IdeaValidation> {
  const ck = cacheKey('validate', idea)
  const cached = readCache<IdeaValidation>(ck)
  if (cached) {
    console.log('[gemini] validateIdea: cache hit')
    return { ...cached, idea }
  }


  try {
    console.log('[gemini] validateIdea: calling /api/rate-idea...')
    const text = await askModel('validate', idea)
    if (!text) return fallbackValidation(idea)
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


  try {
    console.log('[gemini] generateRoadmap: calling /api/rate-idea...')
    const text = await askModel('roadmap', idea, score)
    if (!text) return fallbackRoadmap()
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
