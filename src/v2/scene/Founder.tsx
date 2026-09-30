import { Html, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimationMixer, LoopOnce, type AnimationAction, type Group, type Object3D } from 'three'
import { useV2 } from '../actions'
import { CHARACTER_URL, type CharacterClip } from './assets'
import { founderPose } from './founderPose'
import { SPOTS, type SpotId } from './layout'
import { stepToward, tripSpeed, yawTowards } from './motion'

const CHARACTER_SCALE = 0.85
const FADE = 0.25
/** Kenney minis face −z; motion/layout yaws assume 0 faces +z. */
const MODEL_YAW_OFFSET = 0

export function Founder() {
  const task = useV2(s => s.v2.founder.task)
  const pose = founderPose(task)

  const gltf = useGLTF(CHARACTER_URL)
  const root = useRef<Group>(null)
  const mixer = useMemo(() => new AnimationMixer(gltf.scene), [gltf.scene])
  const actions = useMemo(() => {
    const map = new Map<CharacterClip, AnimationAction>()
    for (const clip of gltf.animations) map.set(clip.name as CharacterClip, mixer.clipAction(clip))
    return map
  }, [gltf.animations, mixer])
  const bones = useMemo(() => ({
    head: gltf.scene.getObjectByName('head') as Object3D | undefined,
    armL: gltf.scene.getObjectByName('arm-left') as Object3D | undefined,
    armR: gltf.scene.getObjectByName('arm-right') as Object3D | undefined,
  }), [gltf.scene])

  useEffect(() => {
    gltf.scene.traverse(o => { o.castShadow = true })
  }, [gltf.scene])

  // Walking state lives in refs: it's per-frame, not React state.
  const pos = useRef<[number, number]>([SPOTS.bed.position[0], SPOTS.bed.position[2]])
  const target = useRef<SpotId>('bed')
  const walking = useRef(false)
  const current = useRef<AnimationAction | null>(null)
  const [emoting, setEmoting] = useState(false)
  const prevTask = useRef(task)

  // When a task ends, play a quick nod before settling.
  useEffect(() => {
    if (prevTask.current && !task) {
      setEmoting(true)
      const t = setTimeout(() => setEmoting(false), 1000)
      prevTask.current = task
      return () => clearTimeout(t)
    }
    prevTask.current = task
  }, [task])

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
    const spot = SPOTS[target.current]
    const goal: [number, number] = [spot.position[0], spot.position[2]]

    if (walking.current) {
      const dist = Math.hypot(goal[0] - pos.current[0], goal[1] - pos.current[1])
      const step = stepToward(pos.current, goal, tripSpeed(dist), dt)
      if (!step.arrived) g.rotation.y = yawTowards(pos.current, goal) + MODEL_YAW_OFFSET
      pos.current = step.pos
      if (step.arrived) {
        walking.current = false
        // Pacing: bounce between the two window-side spots.
        if (pose.pace) {
          target.current = target.current === 'paceA' ? 'paceB' : 'paceA'
          walking.current = true
        }
      }
    }

    const settled = !walking.current
    const y = settled ? spot.position[1] : 0
    g.position.set(pos.current[0], y, pos.current[1])
    if (settled && !pose.pace) g.rotation.y = spot.yaw + MODEL_YAW_OFFSET

    if (emoting) play('emote-yes', true)
    else if (!settled || pose.pace) play('walk')
    else play(pose.clip)

    mixer.update(dt)

    // Procedural motion on top of the clip (the clip rewrites bones each frame).
    const t = state.clock.elapsedTime
    if (settled && pose.typing) {
      if (bones.armL) bones.armL.rotation.x += Math.sin(t * 14) * 0.12
      if (bones.armR) bones.armR.rotation.x += Math.sin(t * 14 + Math.PI) * 0.12
      if (bones.head) bones.head.rotation.x += 0.05 + Math.sin(t * 2.5) * 0.03
    } else if (settled && !task) {
      g.position.y = y + Math.sin(t * 1.6) * 0.006 // breathing
    }
  })

  const progress = task?.progress ?? 0

  return (
    <group ref={root} scale={CHARACTER_SCALE}>
      <primitive object={gltf.scene} />
      {task && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[0.28, 0.32, 48, 1, 0, Math.max(0.001, progress * Math.PI * 2)]} />
          <meshBasicMaterial color="#e9b872" transparent opacity={0.85} />
        </mesh>
      )}
      {pose.icon && (
        <Html position={[0, 0.95, 0]} center style={{ pointerEvents: 'none' }}>
          <div className="v2-scene-icon">{pose.icon}</div>
        </Html>
      )}
    </group>
  )
}

useGLTF.preload(CHARACTER_URL)

/** Laptop screen light that brightens while the founder types (spec §6.3). */
export function LaptopGlow() {
  const task = useV2(s => s.v2.founder.task)
  const typing = founderPose(task).typing
  const light = useRef<import('three').PointLight>(null)
  useFrame((_, delta) => {
    if (!light.current) return
    const goal = typing ? 1.6 : 0.25
    light.current.intensity += (goal - light.current.intensity) * Math.min(1, delta * 4)
  })
  return <pointLight ref={light} position={[1.47, 0.52, -3.55]} intensity={0.25} distance={1.4} decay={2} color="#bfe0ff" />
}
