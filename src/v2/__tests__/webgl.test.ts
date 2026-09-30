import { describe, expect, it } from 'vitest'
import { hasWebGL } from '../scene/webgl'

describe('hasWebGL', () => {
  it('is true when a webgl2 or webgl context is available', () => {
    expect(hasWebGL(() => ({ getContext: (k: string) => (k === 'webgl2' ? {} : null) }))).toBe(true)
    expect(hasWebGL(() => ({ getContext: (k: string) => (k === 'webgl' ? {} : null) }))).toBe(true)
  })
  it('is false when no context can be created', () => {
    expect(hasWebGL(() => ({ getContext: () => null }))).toBe(false)
  })
  it('is false when creating the canvas throws', () => {
    expect(hasWebGL(() => { throw new Error('no DOM') })).toBe(false)
  })
})
