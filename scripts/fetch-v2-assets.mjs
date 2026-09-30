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
  'floorFull', 'wall', 'wallWindow', 'desk', 'chairDesk', 'laptop', 'bedSingle', 'pillow', 'sideTable',
  'lampSquareTable', 'bookcaseOpen', 'books', 'pottedPlant', 'plantSmall1', 'lampRoundFloor', 'rugRectangle',
]
const CHARACTER = 'character-male-a'

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
copyFileSync(join(charDir, `${CHARACTER}.glb`), join(OUT, 'characters', `${CHARACTER}.glb`))
copyFileSync(join(charDir, 'Textures', 'colormap.png'), join(OUT, 'characters', 'Textures', 'colormap.png'))
copyFileSync(join(work, 'furn', 'License.txt'), join(OUT, 'LICENSE-kenney.txt'))

console.log(`Wrote ${FURNITURE.length} furniture models + ${CHARACTER} to ${OUT}`)
