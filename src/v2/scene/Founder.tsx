import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { useV2 } from '../actions'
import { CHARACTER_URL } from './assets'
import { Character } from './Character'
import { founderPose } from './founderPose'
import { SPOTS } from './layout'

export function Founder() {
  const task = useV2(s => s.v2.founder.task)
  return (
    <Character
      url={CHARACTER_URL}
      spots={SPOTS}
      pose={founderPose(task)}
      startSpot="bed"
      progress={task ? task.progress : null}
    />
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
