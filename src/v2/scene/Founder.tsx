import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { useV2 } from '../actions'
import { CHARACTER_URL } from './assets'
import { Character } from './Character'
import { founderPose } from './founderPose'
import { useRoom } from './RoomContext'
import { isNight } from '../engine/clock'
import { founderStatusText } from './hoverText'

export function Founder({ onSelect }: { onSelect?: () => void }) {
  const task = useV2(s => s.v2.founder.task)
  const features = useV2(s => s.features)
  const room = useRoom()
  const featureTitle = task?.type === 'develop' ? features.find(f => f.id === task.featureId)?.title : undefined
  return (
    <Character
      url={CHARACTER_URL}
      spots={room.spots}
      pose={founderPose(task)}
      startSpot="bed"
      progress={task ? task.progress : null}
      onSelect={onSelect}
      hoverCard={{ title: 'You', subtitle: 'Founder', status: founderStatusText(task, featureTitle) }}
    />
  )
}

useGLTF.preload(CHARACTER_URL)

/** Laptop screen light that brightens while the founder types (spec §6.3). */
export function LaptopGlow() {
  const task = useV2(s => s.v2.founder.task)
  const typing = founderPose(task).typing
  const night = useV2(s => isNight(s.gameTime.totalHours))
  const light = useRef<import('three').PointLight>(null)
  useFrame((_, delta) => {
    if (!light.current) return
    // Screens glow brighter in the dark.
    const goal = typing ? (night ? 2.6 : 1.6) : night ? 0.7 : 0.25
    light.current.intensity += (goal - light.current.intensity) * Math.min(1, delta * 4)
  })
  const room = useRoom()
  return <pointLight ref={light} position={room.laptopGlow} intensity={0.25} distance={1.4} decay={2} color="#bfe0ff" />
}
