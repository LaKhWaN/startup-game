import { BoxGeometry, Color, Group, Mesh, MeshStandardMaterial, type Object3D } from "three"
import { describe, expect, it } from 'vitest'
import { tintedScene } from '../scene/tint'

function model() {
  const g = new Group()
  g.add(new Mesh(new BoxGeometry(), new MeshStandardMaterial({ color: new Color(1, 1, 1) })))
  return g
}

const matOf = (g: Object3D) => (g.children[0] as Mesh).material as MeshStandardMaterial

describe('tintedScene', () => {
  it('returns the original for no tint / white', () => {
    const g = model()
    expect(tintedScene(g, 'x', undefined)).toBe(g)
    expect(tintedScene(g, 'x', '#ffffff')).toBe(g)
  })

  it('tints a copy and never touches the shared material', () => {
    const g = model()
    const t = tintedScene(g, 'floorA', '#808080')
    expect(t).not.toBe(g)
    expect(matOf(g).color.getHexString()).toBe('ffffff')
    expect(matOf(t).color.r).toBeLessThan(1)
    expect((t.children[0] as Mesh).geometry).toBe((g.children[0] as Mesh).geometry)
  })

  it('caches one tinted copy per model + tint', () => {
    const g = model()
    expect(tintedScene(g, 'floorB', '#cccccc')).toBe(tintedScene(g, 'floorB', '#cccccc'))
    expect(tintedScene(g, 'floorB', '#cccccc')).not.toBe(tintedScene(g, 'floorB', '#aaaaaa'))
  })
})
