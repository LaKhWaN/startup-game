import { describe, expect, it } from 'vitest'
import { MISTAKE_FLASH_MS, reactionIcon, shouldShowMove } from '../scene/reactions'

describe('reactionIcon', () => {
  it('flashes 😬 for a while after a mistake, over any task icon', () => {
    expect(reactionIcon({ idle: false, taskIcon: '✉️', mistakeAt: 1000, now: 1000 + MISTAKE_FLASH_MS - 1 })).toBe('😬')
    expect(reactionIcon({ idle: false, taskIcon: '✉️', mistakeAt: 1000, now: 1000 + MISTAKE_FLASH_MS })).toBe('✉️')
  })

  it('shows 💤 when idle, otherwise the task icon', () => {
    expect(reactionIcon({ idle: true, taskIcon: null, mistakeAt: null, now: 0 })).toBe('💤')
    expect(reactionIcon({ idle: false, taskIcon: null, mistakeAt: null, now: 0 })).toBe('⏳') // waiting for work
    expect(reactionIcon({ idle: false, taskIcon: '📞', mistakeAt: null, now: 0 })).toBe('📞')
  })
})

describe('shouldShowMove', () => {
  it('shows only when the location changes after mount', () => {
    expect(shouldShowMove(null, 'villa')).toBe(false) // first mount / loaded save
    expect(shouldShowMove('villa', 'villa')).toBe(false)
    expect(shouldShowMove('home', 'biggerHome')).toBe(true)
  })
})

describe('hire looks', () => {
  it('uses every Kenney mini except the founder', async () => {
    const { INTERN_MODELS } = await import('../team')
    expect(INTERN_MODELS.male).toEqual(['character-male-b', 'character-male-c', 'character-male-d', 'character-male-e', 'character-male-f'])
    expect(INTERN_MODELS.female).toHaveLength(6)
    expect([...INTERN_MODELS.male, ...INTERN_MODELS.female]).not.toContain('character-male-a')
  })
})
