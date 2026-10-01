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

console.log(`Wrote ${FURNITURE.length} furniture models + ${CHARACTERS.length} characters to ${OUT}`)
