type CanvasLike = { getContext(kind: string): unknown }

export function hasWebGL(create: () => CanvasLike = () => document.createElement('canvas')): boolean {
  try {
    const canvas = create()
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}
