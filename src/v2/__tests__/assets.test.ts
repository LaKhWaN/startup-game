import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CHARACTER_CLIPS, CHARACTER_URL, FURNITURE_MODELS, furnitureUrl, PRELOAD_URLS } from '../scene/assets'

const PUBLIC = join(process.cwd(), 'public')
const onDisk = (url: string) => existsSync(join(PUBLIC, url))

describe('asset manifest', () => {
  it('every furniture model exists under public/', () => {
    for (const m of FURNITURE_MODELS) expect(onDisk(furnitureUrl(m)), furnitureUrl(m)).toBe(true)
  })

  it('the character GLB exists with its colormap texture beside it', () => {
    expect(onDisk(CHARACTER_URL)).toBe(true)
    expect(onDisk(join(dirname(CHARACTER_URL), 'Textures', 'colormap.png'))).toBe(true)
  })

  it('ships the Kenney license', () => {
    expect(onDisk('/assets/v2/LICENSE-kenney.txt')).toBe(true)
  })

  it('lists the clips the scene relies on', () => {
    for (const c of ['idle', 'walk', 'sit', 'interact-right', 'emote-yes']) expect(CHARACTER_CLIPS).toContain(c)
  })

  it('preloads every model', () => {
    expect(PRELOAD_URLS).toContain(CHARACTER_URL)
    expect(PRELOAD_URLS).toHaveLength(FURNITURE_MODELS.length + 1)
  })
})
