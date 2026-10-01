import { Color, type Material, type Mesh, type Object3D } from 'three'

const cache = new Map<string, Object3D>()

function tintMaterial(m: Material, color: Color): Material {
  const copy = m.clone() as Material & { color?: Color }
  copy.color?.multiply(color)
  return copy
}

/**
 * A copy of a loaded model with its material colours multiplied by `tint`.
 * Materials are cloned (the GLTF cache's are shared by every room); geometry is
 * shared. One copy per model + tint, so drei <Clone> can reuse it for every tile.
 */
export function tintedScene(scene: Object3D, key: string, tint: string | undefined): Object3D {
  if (!tint || tint.toLowerCase() === '#ffffff') return scene
  const id = `${key}|${tint}`
  const hit = cache.get(id)
  if (hit) return hit
  const color = new Color(tint)
  const copy = scene.clone(true)
  copy.traverse(o => {
    const mesh = o as Mesh
    if (!mesh.isMesh) return
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(m => tintMaterial(m, color)) : tintMaterial(mesh.material, color)
  })
  cache.set(id, copy)
  return copy
}
