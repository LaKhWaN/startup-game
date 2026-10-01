import { ContactShadows, useGLTF } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useEffect, useMemo, type ReactNode } from 'react'
import { ACESFilmicToneMapping, Object3D } from 'three'
import { useV2 } from '../actions'
import { PRELOAD_URLS } from './assets'
import { Room } from './Room'
import { RoomContext } from './RoomContext'
import { roomFor, type RoomLayout } from './rooms'

PRELOAD_URLS.forEach(url => useGLTF.preload(url))

// Isometric direction: 45° around, ≈33° down.
const CAMERA_DIR: [number, number, number] = [1, 0.9, 1]
const CAMERA_DISTANCE = 40
/** World units a 4×4 room needs horizontally / vertically on screen, with margin; scales with w + d. */
const VIEW_SPAN_X = 6.6
const VIEW_SPAN_Y = 5.0

const centerOf = (room: RoomLayout): [number, number, number] => [room.width / 2, 0.45, -room.depth / 2]

function CameraRig({ room }: { room: RoomLayout }) {
  const { camera, size } = useThree()
  useEffect(() => {
    const CENTER = centerOf(room)
    const k = (room.width + room.depth) / 8
    const len = Math.hypot(...CAMERA_DIR)
    camera.position.set(
      CENTER[0] + (CAMERA_DIR[0] / len) * CAMERA_DISTANCE,
      CENTER[1] + (CAMERA_DIR[1] / len) * CAMERA_DISTANCE,
      CENTER[2] + (CAMERA_DIR[2] / len) * CAMERA_DISTANCE,
    )
    camera.lookAt(...CENTER)
    camera.zoom = Math.min(size.width / (VIEW_SPAN_X * k), size.height / (VIEW_SPAN_Y * k))
    camera.updateProjectionMatrix()
  }, [camera, size, room])
  return null
}

function Lights({ room }: { room: RoomLayout }) {
  // The bedroom was lit with the sun aimed at the origin; keep that direction and slide it with the room.
  const [cx, , cz] = centerOf(room)
  const aim: [number, number, number] = [cx - 2, 0, cz + 2]
  const target = useMemo(() => new Object3D(), [])
  const reach = Math.max(5, Math.max(room.width, room.depth) * 1.2)
  return (
    <>
      <primitive object={target} position={aim} />
      <hemisphereLight args={['#ffe9cc', '#4a3a2c', 0.9]} />
      {/* Warm evening light coming in through the back-wall window */}
      <directionalLight
        target={target}
        position={[aim[0] + 1.5, 5, aim[2] - 7]}
        intensity={2.2}
        color="#ffd9a8"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-reach}
        shadow-camera-right={reach}
        shadow-camera-top={reach}
        shadow-camera-bottom={-reach}
        shadow-bias={-0.0005}
      />
      {/* Soft front fill so the cut-away side isn't black */}
      <directionalLight position={[8, 6, 6]} intensity={0.55} color="#ffe2c2" />
      {/* Floor lamp by the founder's desk */}
      {room.lamp && <pointLight position={room.lamp} intensity={3} distance={3.5} decay={2} color="#ffb46b" />}
    </>
  )
}

export default function HomeScene({ children }: { children?: ReactNode }) {
  const location = useV2(s => s.v2.location)
  const room = roomFor(location)
  return (
    <div className="v2-scene">
      <Canvas
        orthographic
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, preserveDrawingBuffer: import.meta.env.DEV }}
        onCreated={({ gl }) => { gl.toneMapping = ACESFilmicToneMapping }}
      >
        <color attach="background" args={['#2b2119']} />
        <RoomContext.Provider value={room}>
          {/* Remount everything on a move so characters start at their new seats. */}
          <group key={location}>
            <CameraRig room={room} />
            <Lights room={room} />
            <Room />
            <ContactShadows
              position={[room.width / 2, 0.006, -room.depth / 2]}
              scale={Math.max(room.width, room.depth) + 0.5}
              blur={2.4}
              opacity={0.45}
              far={1.5}
            />
            {children}
          </group>
        </RoomContext.Provider>
      </Canvas>
    </div>
  )
}
