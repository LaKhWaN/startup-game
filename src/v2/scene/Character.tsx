import { Html, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimationMixer, LoopOnce, type AnimationAction, type Group, type Object3D, type SkinnedMesh } from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import type { CharacterClip } from './assets'
import type { FounderPose } from './founderPose'
import type { Spot } from './layout'
import { applyTypingMotion, frameIntent } from './animation'
import { stepFor, tripSpeed, yawTowards } from './motion'

const CHARACTER_SCALE = 0.85
const FADE = 0.25
/** Kenney minis face +z natively; motion/layout yaws assume 0 faces +z. */
const MODEL_YAW_OFFSET = 0

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

type PaceSpots = 'paceA' | 'paceB'

export interface CharacterProps<S extends string> {
  url: string
  /** Every spot this character can stand or sit at; must include paceA/paceB for pacing. */
  spots: Record<S | PaceSpots, Spot>
  pose: FounderPose<S | PaceSpots>
  /** Where the character appears on mount. */
  startSpot: S
  /** Task progress 0..1 for the floor ring, or null when there's no task. */
  progress: number | null
  /** Clicking the character (e.g. opens their panel). */
  onSelect?: () => void
}

/**
 * One animated Kenney mini character. Each instance clones the GLB's skinned
 * scene, so the founder and several hires can share a model.
 */
export function Character<S extends string>({ url, spots, pose, startSpot, progress, onSelect }: CharacterProps<S>) {
  const gltf = useGLTF(url)
  const reduced = useMemo(prefersReducedMotion, [])
  const step = useMemo(() => stepFor(reduced), [reduced])
  const scene = useMemo(() => cloneSkinned(gltf.scene), [gltf.scene])
  const root = useRef<Group>(null)
  const mixer = useMemo(() => new AnimationMixer(scene), [scene])
  const actions = useMemo(() => {
    const map = new Map<CharacterClip, AnimationAction>()
    for (const clip of gltf.animations) map.set(clip.name as CharacterClip, mixer.clipAction(clip))
    return map
  }, [gltf.animations, mixer])
  const bones = useMemo(() => ({
    head: scene.getObjectByName('head') as Object3D | undefined,
    armL: scene.getObjectByName('arm-left') as Object3D | undefined,
    armR: scene.getObjectByName('arm-right') as Object3D | undefined,
  }), [scene])

  useEffect(() => {
    scene.traverse(o => { o.castShadow = true })
    return () => {
      mixer.stopAllAction()
      mixer.uncacheRoot(scene)
      // Each clone owns its skeleton (and its bone texture); geometry/materials stay shared.
      scene.traverse(o => { (o as SkinnedMesh).skeleton?.dispose() })
    }
  }, [scene, mixer])

  // Rest rotations for the procedural typing, taken from the 'sit' pose once.
  const rest = useMemo(() => {
    const sit = actions.get('sit')
    const r = { head: 0, armL: 0, armR: 0 }
    if (!sit) return r
    const probe = new AnimationMixer(scene)
    probe.clipAction(sit.getClip()).play()
    probe.update(0)
    r.head = bones.head?.rotation.x ?? 0
    r.armL = bones.armL?.rotation.x ?? 0
    r.armR = bones.armR?.rotation.x ?? 0
    probe.stopAllAction()
    probe.uncacheRoot(scene)
    return r
  }, [actions, bones, scene])

  // Walking state lives in refs: it's per-frame, not React state.
  const start = spots[startSpot].position
  const pos = useRef<[number, number]>([start[0], start[2]])
  const target = useRef<S | PaceSpots>(startSpot)
  const walking = useRef(false)
  const current = useRef<AnimationAction | null>(null)
  const [emoting, setEmoting] = useState(false)
  const hasTask = progress !== null
  const hadTask = useRef(hasTask)

  // When a task ends, play a quick nod before settling.
  useEffect(() => {
    if (hadTask.current && !hasTask) {
      setEmoting(true)
      const t = setTimeout(() => setEmoting(false), 1000)
      hadTask.current = hasTask
      return () => clearTimeout(t)
    }
    hadTask.current = hasTask
  }, [hasTask])

  // Retarget on pose change (task switch mid-walk just retargets).
  useEffect(() => {
    target.current = pose.spot
    walking.current = true
  }, [pose.spot])

  function play(name: CharacterClip, once = false) {
    const next = actions.get(name)
    if (!next || next === current.current) return
    next.reset()
    if (once) { next.setLoop(LoopOnce, 1); next.clampWhenFinished = true }
    next.fadeIn(FADE).play()
    current.current?.fadeOut(FADE)
    current.current = next
  }

  useFrame((state, delta) => {
    const g = root.current
    if (!g) return
    const dt = Math.min(delta, 0.1)
    const spot = spots[target.current]
    const goal: [number, number] = [spot.position[0], spot.position[2]]

    const intent = frameIntent({ emoting, walking: walking.current, pace: pose.pace, poseClip: pose.clip, reduced })

    if (walking.current && intent.move) {
      const dist = Math.hypot(goal[0] - pos.current[0], goal[1] - pos.current[1])
      const next = step(pos.current, goal, tripSpeed(dist), dt)
      if (!next.arrived) g.rotation.y = yawTowards(pos.current, goal) + MODEL_YAW_OFFSET
      pos.current = next.pos
      if (next.arrived) {
        walking.current = false
        // Pacing: bounce between the two pace spots.
        if (pose.pace && !reduced) {
          target.current = target.current === 'paceA' ? 'paceB' : 'paceA'
          walking.current = true
        }
      }
    }

    const settled = !walking.current
    const y = settled ? spot.position[1] : 0
    g.position.set(pos.current[0], y, pos.current[1])
    if (settled && (!pose.pace || reduced)) g.rotation.y = spot.yaw + MODEL_YAW_OFFSET

    play(intent.clip, intent.once)

    mixer.update(dt)

    // Procedural motion on top of the clip (the clip rewrites bones each frame).
    const t = state.clock.elapsedTime
    if (reduced) {
      // No procedural typing or breathing.
    } else if (settled && pose.typing) {
      applyTypingMotion(bones, rest, t)
    } else if (settled && !hasTask) {
      g.position.y = y + Math.sin(t * 1.6) * 0.006 // breathing
    }
  })

  return (
    <group
      ref={root}
      scale={CHARACTER_SCALE}
      onClick={onSelect ? e => { e.stopPropagation(); onSelect() } : undefined}
      onPointerOver={onSelect ? e => { e.stopPropagation(); document.body.style.cursor = 'pointer' } : undefined}
      onPointerOut={onSelect ? () => { document.body.style.cursor = '' } : undefined}
    >
      <primitive object={scene} />
      {progress !== null && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[0.28, 0.32, 48, 1, 0, Math.max(0.001, progress * Math.PI * 2)]} />
          <meshBasicMaterial color="#e9b872" transparent opacity={0.85} />
        </mesh>
      )}
      {pose.icon && (
        <Html position={[0, 0.95, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div className="v2-scene-icon">{pose.icon}</div>
        </Html>
      )}
    </group>
  )
}
