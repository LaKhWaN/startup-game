import { Clone, useGLTF } from '@react-three/drei'
import { useMemo } from 'react'
import { Matrix4, type BufferGeometry, type Material, type Mesh } from 'three'
import { floorInstances } from './floor'
import { occupiedSeatMask, seatTaken } from './seats'
import { useV2 } from '../actions'
import { tintedScene } from './tint'
import { furnitureUrl } from './assets'
import type { Placement } from './layout'
import { useRoom } from './RoomContext'

function Piece({ p, tint }: { p: Placement; tint?: string }) {
  const { scene } = useGLTF(furnitureUrl(p.model))
  const object = useMemo(() => tintedScene(scene, p.model, tint), [scene, p.model, tint])
  return (
    <Clone
      object={object}
      position={p.position}
      rotation={[0, (p.rotationY * Math.PI) / 180, 0]}
      scale={p.scale ?? 1}
      castShadow
      receiveShadow
    />
  )
}

/** All floor tiles share one model: draw each of its meshes once, instanced per tile. */
function InstancedFloor({ tiles, tint }: { tiles: Placement[]; tint?: string }) {
  const { scene } = useGLTF(furnitureUrl('floorFull'))
  const parts = useMemo(() => {
    const src = tintedScene(scene, 'floorFull', tint)
    src.updateMatrixWorld(true)
    const out: { geometry: BufferGeometry; material: Material | Material[]; matrix: Matrix4 }[] = []
    src.traverse(o => {
      const m = o as Mesh
      if (m.isMesh) out.push({ geometry: m.geometry, material: m.material, matrix: m.matrixWorld.clone() })
    })
    return out
  }, [scene, tint])
  const positions = useMemo(() => floorInstances(tiles), [tiles])
  return (
    <>
      {parts.map((part, i) => (
        <instancedMesh
          key={i}
          args={[part.geometry, part.material, positions.length]}
          receiveShadow
          ref={mesh => {
            if (!mesh) return
            const m = new Matrix4()
            positions.forEach((pos, j) => mesh.setMatrixAt(j, m.makeTranslation(pos[0], pos[1], pos[2]).multiply(part.matrix)))
            mesh.instanceMatrix.needsUpdate = true
            mesh.computeBoundingSphere()
          }}
        />
      ))}
    </>
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
  // A primitive: Room re-renders when seats change, not every hour a hire works.
  const seats = useV2(s => occupiedSeatMask(s.v2.team))
  return (
    <group>
      <InstancedFloor tiles={room.floor} tint={room.theme.floorTint} />
      {room.walls.map((p, i) => <Piece key={`w${i}`} p={p} tint={room.theme.wallTint} />)}
      {room.furniture.map((p, i) => <Piece key={`${p.model}-${i}`} p={p} />)}
      {room.seats.map((seat, i) => (room.showEmptySeats || seatTaken(seats, i)) && seat.furniture.map((p, j) => <Piece key={`seat${i}-${j}`} p={p} />))}
      {room.pictureFrame && <PictureFrame />}
    </group>
  )
}
