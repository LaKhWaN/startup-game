import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { useV2 } from '../actions'
import { CHARACTER_URL } from './assets'
import { Character } from './Character'
import { founderPose } from './founderPose'
import { useRoom } from './RoomContext'

export function Founder() {
  const task = useV2(s => s.v2.founder.task)
  const room = useRoom()
  return (
    <Character
      url={CHARACTER_URL}
      spots={room.spots}
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
  const room = useRoom()
  return <pointLight ref={light} position={room.laptopGlow} intensity={0.25} distance={1.4} decay={2} color="#bfe0ff" />
}
