import { ContactShadows, PerformanceMonitor, useGLTF } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ACESFilmicToneMapping, Object3D } from 'three'
import { useV2 } from '../actions'
import { PRELOAD_URLS } from './assets'
import { qualityHandlers } from './quality'
import { fitZoom } from './camera'
import { Room } from './Room'
import { City } from './City'
import { useUi } from '../ui'
import { isNight } from '../engine/clock'
import { RoomContext } from './RoomContext'
import { roomFor, type RoomLayout } from './rooms'

PRELOAD_URLS.forEach(url => useGLTF.preload(url))

// Isometric direction: 45° around, ≈33° down.
const CAMERA_DIR: [number, number, number] = [1, 0.9, 1]
const CAMERA_DISTANCE = 40

const centerOf = (room: RoomLayout): [number, number, number] => [room.width / 2, 0.45, -room.depth / 2]

function CameraRig({ room }: { room: RoomLayout }) {
  const { camera, size } = useThree()
  useEffect(() => {
    const CENTER = centerOf(room)
    const len = Math.hypot(...CAMERA_DIR)
    camera.position.set(
      CENTER[0] + (CAMERA_DIR[0] / len) * CAMERA_DISTANCE,
      CENTER[1] + (CAMERA_DIR[1] / len) * CAMERA_DISTANCE,
      CENTER[2] + (CAMERA_DIR[2] / len) * CAMERA_DISTANCE,
    )
    camera.lookAt(...CENTER)
    camera.zoom = fitZoom(size, room.width, room.depth)
    camera.updateProjectionMatrix()
  }, [camera, size, room])
  return null
}

/** Night: moonlight through the window, lamps do the work (spec §3.2). */
const NIGHT = { hemi: 0.3, sun: 0.18, sunColor: '#9fb4ff', fill: 0.15, lamp: 5.5 }

function Lights({ room, night }: { room: RoomLayout; night: boolean }) {
  // The bedroom was lit with the sun aimed at the origin; keep that direction and slide it with the room.
  const [cx, , cz] = centerOf(room)
  const aim: [number, number, number] = [cx - 2, 0, cz + 2]
  const target = useMemo(() => new Object3D(), [])
  const reach = Math.max(5, Math.max(room.width, room.depth) * 1.2)
  return (
    <>
      <primitive object={target} position={aim} />
      <hemisphereLight args={[night ? '#55638a' : room.theme.hemi.sky, room.theme.hemi.ground, room.theme.hemi.intensity * (night ? NIGHT.hemi : 1)]} />
      {/* Warm evening light coming in through the back-wall window */}
      <directionalLight
        target={target}
        position={[aim[0] + 1.5, 5, aim[2] - 7]}
        intensity={room.theme.sun.intensity * (night ? NIGHT.sun : 1)}
        color={night ? NIGHT.sunColor : room.theme.sun.color}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-reach}
        shadow-camera-right={reach}
        shadow-camera-top={reach}
        shadow-camera-bottom={-reach}
        shadow-bias={-0.0005}
      />
      {/* Soft front fill so the cut-away side isn't black */}
      <directionalLight position={[aim[0] + 8, 6, aim[2] + 6]} intensity={room.theme.fill.intensity * (night ? NIGHT.fill : 1)} color={room.theme.fill.color} />
      {/* Floor lamp by the founder's desk */}
      {room.lamp && <pointLight position={room.lamp} intensity={night ? NIGHT.lamp : 3} distance={night ? 5 : 3.5} decay={2} color="#ffb46b" />}
      {/* Ceiling glow at night so the room isn't a black box */}
      {night && <pointLight position={[room.width / 2, 2.2, -room.depth / 2]} intensity={2.2} distance={Math.max(room.width, room.depth) * 1.4} decay={1.6} color="#ffd29a" />}
    </>
  )
}

export default function HomeScene({ children }: { children?: ReactNode }) {
  const location = useV2(s => s.v2.location)
  const view = useUi(s => s.view)
  const night = useV2(s => isNight(s.gameTime.totalHours))
  const room = roomFor(location)
  // Adaptive quality: on a sustained FPS drop, render at 1× DPR. Shadows stay on: toggling
  // them live leaves already-compiled materials without their shadow maps (they vanish).
  const [low, setLow] = useState(false)
  return (
    <div className="v2-scene">
      <Canvas
        orthographic
        shadows
        dpr={low ? 1 : [1, 2]}
        gl={{ antialias: true, preserveDrawingBuffer: import.meta.env.DEV }}
        onCreated={({ gl }) => { gl.toneMapping = ACESFilmicToneMapping }}
      >
        <PerformanceMonitor {...qualityHandlers(setLow)} />
        <color attach="background" args={[view === 'city' ? (night ? '#1c2440' : '#cfe6f5') : night ? '#120f14' : room.theme.background]} />
        <RoomContext.Provider value={room}>
          {/* Remount everything on a move so characters start at their new seats. */}
          {view === 'city' ? <City key="city" /> : (
          <group key={location}>
            <CameraRig room={room} />
            <Lights room={room} night={night} />
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
          )}
        </RoomContext.Provider>
      </Canvas>
    </div>
  )
}
