#!/usr/bin/env node
// Re-fetches the Kenney CC0 packs and extracts only what /new uses into
// public/assets/v2/. The results are committed; run this only to refresh them.
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHARS_ZIP = 'https://kenney.nl/media/pages/assets/mini-characters/bfc7e272b4-1774770718/kenney_mini-characters.zip'
const FURN_ZIP = 'https://kenney.nl/media/pages/assets/furniture-kit/440e0608a4-1677580847/kenney_furniture-kit.zip'

const FURNITURE = [
  'floorFull', 'wall', 'wallWindow', 'desk', 'chairDesk', 'laptop', 'bedSingle', 'sideTable',
  'lampSquareTable', 'bookcaseOpen', 'books', 'pottedPlant', 'plantSmall1', 'lampRoundFloor', 'rugRectangle',
  'loungeChair', 'tableCoffee',
  // Phase 5 amenities
  'loungeSofa', 'loungeDesignSofa', 'loungeSofaCorner', 'tableCoffeeGlass', 'televisionModern', 'cabinetTelevision',
  'rugRound', 'rugRounded', 'plantSmall2', 'kitchenBar', 'kitchenCoffeeMachine', 'stoolBar',
  'kitchenFridge', 'coatRackStanding', 'bookcaseClosed', 'kitchenCabinet', 'trashcan', 'speaker',
]
// Founder + the intern looks (src/v2/team.ts INTERN_MODELS)
const CHARACTERS = [
  'character-male-a', 'character-male-b', 'character-male-c', 'character-male-d', 'character-male-e', 'character-male-f',
  'character-female-a', 'character-female-b', 'character-female-c', 'character-female-d', 'character-female-e', 'character-female-f',
]

// City map (Phase 7): Kenney City Kit Suburban / Commercial / Roads, CC0. Each kit has its own colormap.
const CITY_KITS = {
  suburban: {
    zip: 'https://kenney.nl/media/pages/assets/city-kit-suburban/2c871b7af2-1745479373/kenney_city-kit-suburban_20.zip',
    models: ['building-type-h', 'building-type-a', 'building-type-m', 'tree-large', 'tree-small'],
  },
  commercial: {
    zip: 'https://kenney.nl/media/pages/assets/city-kit-commercial/a742d900eb-1753115042/kenney_city-kit-commercial_2.1.zip',
    models: ['building-e', 'building-a', 'building-skyscraper-a', 'building-skyscraper-c'],
  },
  roads: {
    zip: 'https://kenney.nl/media/pages/assets/city-kit-roads/74288c9459-1787042796/kenney_city-kit-roads.zip',
    models: ['road-straight', 'light-square'],
  },
}

const OUT = join(process.cwd(), 'public', 'assets', 'v2')
const work = mkdtempSync(join(tmpdir(), 'kenney-'))

async function download(url, file) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`)
  writeFileSync(file, Buffer.from(await res.arrayBuffer()))
}

await download(CHARS_ZIP, join(work, 'chars.zip'))
await download(FURN_ZIP, join(work, 'furn.zip'))
execFileSync('unzip', ['-oq', join(work, 'chars.zip'), '-d', join(work, 'chars')])
execFileSync('unzip', ['-oq', join(work, 'furn.zip'), '-d', join(work, 'furn')])

mkdirSync(join(OUT, 'furniture'), { recursive: true })
mkdirSync(join(OUT, 'characters', 'Textures'), { recursive: true })

for (const name of FURNITURE) {
  copyFileSync(join(work, 'furn', 'Models', 'GLTF format', `${name}.glb`), join(OUT, 'furniture', `${name}.glb`))
}
const charDir = join(work, 'chars', 'Models', 'GLB format')
mkdirSync(join(OUT, 'portraits'), { recursive: true })
for (const name of CHARACTERS) {
  copyFileSync(join(charDir, `${name}.glb`), join(OUT, 'characters', `${name}.glb`))
  copyFileSync(join(work, 'chars', 'Previews', `${name}.png`), join(OUT, 'portraits', `${name}.png`))
}
copyFileSync(join(charDir, 'Textures', 'colormap.png'), join(OUT, 'characters', 'Textures', 'colormap.png'))
copyFileSync(join(work, 'furn', 'License.txt'), join(OUT, 'LICENSE-kenney.txt'))

for (const [kit, { zip, models }] of Object.entries(CITY_KITS)) {
  await download(zip, join(work, `${kit}.zip`))
  execFileSync('unzip', ['-oq', join(work, `${kit}.zip`), '-d', join(work, kit)])
  const src = join(work, kit, 'Models', 'GLB format')
  const dst = join(OUT, 'city', kit)
  mkdirSync(join(dst, 'Textures'), { recursive: true })
  for (const m of models) copyFileSync(join(src, `${m}.glb`), join(dst, `${m}.glb`))
  copyFileSync(join(src, 'Textures', 'colormap.png'), join(dst, 'Textures', 'colormap.png'))
}

console.log(`Wrote ${FURNITURE.length} furniture models + ${CHARACTERS.length} characters to ${OUT}`)
