import { afterEach, describe, expect, it, vi } from 'vitest'
import { getAnonId } from '../../analytics/anonId'

afterEach(() => vi.unstubAllGlobals())

describe('anonymous id', () => {
  it('is created once, then reused', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) })
    const first = getAnonId()
    expect(first).toMatch(/^[\w-]{8,64}$/)
    expect(getAnonId()).toBe(first)
  })

  it('is skipped when storage is blocked', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked') }, setItem: () => {} })
    expect(getAnonId()).toBeUndefined()
  })
})
