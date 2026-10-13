import { describe, expect, it } from 'vitest'
import { founderStatusText, statusText } from '../scene/hoverText'
import type { TeamMember } from '../state'

const m = (over: Partial<TeamMember> = {}): TeamMember => ({
  id: 'h', name: 'Sam', gender: 'male', role: 'sales', tier: 'intern', skills: { research: 1, build: 1, outreach: 1, sales: 3 },
  assignment: 'sales', task: null, mistakes: 0, seat: 0, characterModel: 'character-male-b', salary: 700, ...over,
})

describe('statusText', () => {
  it('says what they are doing, with progress', () => {
    expect(statusText(m({ task: { type: 'sales', progress: 0.42 } }))).toBe('📞 On sales calls · 42%')
    expect(statusText(m({ assignment: 'develop', task: { type: 'develop', featureId: 'f', progress: 0.1 } }), 'Payments')).toBe('🛠️ Building Payments · 10%')
  })

  it('says why they are waiting', () => {
    expect(statusText(m())).toBe('⏳ Waiting for leads to call')
    expect(statusText(m({ assignment: 'idle' }))).toBe('💤 Idle')
  })

  it('covers the founder', () => {
    expect(founderStatusText(null)).toBe('💤 Taking a breather')
    expect(founderStatusText({ type: 'emails', progress: 0.5 })).toBe('✉️ Sending emails · 50%')
  })
})
