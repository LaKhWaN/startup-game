import { Clone, useGLTF } from '@react-three/drei'
import { useV2 } from '../actions'
import { furnitureUrl } from './assets'
import { FLOOR, FURNITURE, SEAT_FURNITURE, WALLS, type Placement } from './layout'

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
  const team = useV2(s => s.v2.team)
  const taken = new Set(Object.values(team).map(m => m.seat))
  return (
    <group>
      {FLOOR.map((p, i) => <Piece key={`f${i}`} p={p} />)}
      {WALLS.map((p, i) => <Piece key={`w${i}`} p={p} />)}
      {FURNITURE.map((p, i) => <Piece key={`${p.model}-${i}`} p={p} />)}
      {SEAT_FURNITURE.map((seat, i) => taken.has(i) && seat.map((p, j) => <Piece key={`seat${i}-${j}`} p={p} />))}
      <PictureFrame />
    </group>
  )
}
