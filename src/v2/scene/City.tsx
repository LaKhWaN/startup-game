import { Clone, Html, useGLTF } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { useV2 } from '../actions'
import { LOCATIONS } from '../locations'
import type { LocationId } from '../state'
import { selectLot, useUi } from '../ui'
import { fitZoom } from './camera'
import { CITY, CITY_MODELS, cityModelUrl, LOTS, ROAD_TILES, ROAD_Z, STREET_LIGHTS, TREES, type CityModel } from './cityLayout'
import { tintedScene } from './tint'

CITY_MODELS.forEach(m => useGLTF.preload(cityModelUrl(m)))

const CENTER: [number, number, number] = [(CITY.x0 + CITY.x1) / 2, 0.6, (CITY.z0 + CITY.z1) / 2]
const CITY_W = CITY.x1 - CITY.x0
const CITY_D = CITY.z1 - CITY.z0

function CityCamera() {
  const { camera, size } = useThree()
  useEffect(() => {
    const dir = [1, 0.9, 1]
    const len = Math.hypot(...dir)
    camera.position.set(CENTER[0] + (dir[0] / len) * 40, CENTER[1] + (dir[1] / len) * 40, CENTER[2] + (dir[2] / len) * 40)
    camera.lookAt(...CENTER)
    camera.zoom = fitZoom(size, CITY_W, CITY_D) * 1.15
    camera.updateProjectionMatrix()
  }, [camera, size])
  return null
}

function Model({ model, position, rotationY = 0, tint }: { model: CityModel; position: [number, number, number]; rotationY?: number; tint?: string }) {
  const { scene } = useGLTF(cityModelUrl(model))
  const object = useMemo(() => tintedScene(scene, `city:${model}`, tint), [scene, model, tint])
  return <Clone object={object} position={position} rotation={[0, rotationY, 0]} castShadow receiveShadow />
}

function LotView({ id }: { id: LocationId }) {
  const v2 = useV2(s => s.v2)
  const selected = useUi(s => s.citySelection)
  const lot = LOTS[id]
  const def = LOCATIONS.find(l => l.id === id)!
  const here = v2.location === id
  const locked = !v2.unlockedLocations.includes(id)
  const [x, , z] = lot.position
  return (
    <group
      onClick={e => { e.stopPropagation(); selectLot(id) }}
      onPointerOver={e => { e.stopPropagation(); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { document.body.style.cursor = '' }}
    >
      <Model model={lot.model} position={lot.position} tint={locked ? '#8f8f8f' : undefined} />
      {(here || selected === id) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.012, z]}>
          <ringGeometry args={[Math.max(...lot.size) * 0.62, Math.max(...lot.size) * 0.7, 48]} />
          <meshBasicMaterial color={here ? '#e9b872' : '#7cc4ff'} transparent opacity={0.9} />
        </mesh>
      )}
      <Html position={[x, 0.15, z + lot.size[1] / 2 + 0.25]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <div className={`v2-lot-label${locked ? ' v2-lot-label--locked' : ''}${here ? ' v2-lot-label--here' : ''}`}>
          {here ? '📍' : locked ? '🔒' : def.icon} {def.name}
          {locked && <span className="v2-lot-sub">Reach ${def.unlockMrr.toLocaleString()} MRR</span>}
        </div>
      </Html>
    </group>
  )
}

/** The 2.5D city: one building per location along the main road (spec §11.5). */
export function City() {
  useEffect(() => () => { document.body.style.cursor = '' }, [])
  return (
    <group>
      <CityCamera />
      <hemisphereLight args={['#f4f7ff', '#4a5a3a', 1.0]} />
      <directionalLight position={[CENTER[0] - 4, 10, CENTER[2] + 8]} intensity={2.2} color="#fff3dc" castShadow
        shadow-mapSize={[2048, 2048]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[CENTER[0], -0.01, CENTER[2]]} receiveShadow onClick={() => selectLot(null)}>
        <planeGeometry args={[CITY_W, CITY_D]} />
        <meshStandardMaterial color="#8fbf6a" />
      </mesh>
      {ROAD_TILES.map(x => <Model key={`r${x}`} model="roads/road-straight" position={[x, 0, ROAD_Z]} rotationY={Math.PI / 2} />)}
      {TREES.map((t, i) => <Model key={`t${i}`} model={t.model} position={t.position} />)}
      {STREET_LIGHTS.map((p, i) => <Model key={`l${i}`} model="roads/light-square" position={p} />)}
      {LOCATIONS.map(l => <LotView key={l.id} id={l.id} />)}
    </group>
  )
}
