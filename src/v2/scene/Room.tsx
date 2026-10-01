import { Clone, useGLTF } from '@react-three/drei'
import { useV2 } from '../actions'
import { furnitureUrl } from './assets'
import type { Placement } from './layout'
import { useRoom } from './RoomContext'

function Piece({ p }: { p: Placement }) {
  const { scene } = useGLTF(furnitureUrl(p.model))
  return (
    <Clone
      object={scene}
      position={p.position}
      rotation={[0, (p.rotationY * Math.PI) / 180, 0]}
      scale={p.scale ?? 1}
      castShadow
      receiveShadow
    />
  )
}

/** A simple framed picture on the left wall; the kit has no posters. */
function PictureFrame() {
  return (
    <group position={[0.03, 0.75, -2.6]} rotation={[0, Math.PI / 2, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.46, 0.34, 0.03]} />
        <meshStandardMaterial color="#6b4a2f" />
      </mesh>
      <mesh position={[0, 0, 0.017]}>
        <planeGeometry args={[0.38, 0.26]} />
        <meshStandardMaterial color="#e9b872" />
      </mesh>
    </group>
  )
}

export function Room() {
  const room = useRoom()
  const team = useV2(s => s.v2.team)
  const taken = new Set(Object.values(team).map(m => m.seat))
  return (
    <group>
      {room.floor.map((p, i) => <Piece key={`f${i}`} p={p} />)}
      {room.walls.map((p, i) => <Piece key={`w${i}`} p={p} />)}
      {room.furniture.map((p, i) => <Piece key={`${p.model}-${i}`} p={p} />)}
      {room.seats.map((seat, i) => taken.has(i) && seat.furniture.map((p, j) => <Piece key={`seat${i}-${j}`} p={p} />))}
      {room.pictureFrame && <PictureFrame />}
    </group>
  )
}
