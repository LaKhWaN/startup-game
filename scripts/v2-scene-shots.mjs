#!/usr/bin/env node
// Usage: node scripts/v2-scene-shots.mjs [baseUrl] [outDir] [scene,…]
// Needs `npm run dev` and the generated scenes (SIM_SCENES=1 npx vitest run src/v2/__tests__/scenes.test.ts).
// Opens each /?scene=<name>, lets the room settle, and saves crisp 2× PNGs for sharing.
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const base = process.argv[2] ?? 'http://localhost:5173'
const out = process.argv[3] ?? 'image/scenes'
const only = process.argv[4]?.split(',')
mkdirSync(out, { recursive: true })

/** [file name, scene, what to open after loading] */
const SHOTS = [
  ['01-bedroom', 'bedroom', null],
  ['02-first-hires', 'first-hires', null],
  ['03-villa', 'villa', null],
  ['04-coworking', 'coworking', null],
  ['05-small-office', 'small-office', null],
  ['06-event', 'event', null],
  ['07-building', 'building', null],
  ['08-people-alert', 'people-alert', null],
  ['09-team', 'building', 'Team'],
  ['10-metrics', 'building', 'Metrics'],
  ['11-desktop', 'building', 'Desktop>Roadmap'],
  ['12-city', 'building', 'Map'],
].filter(([, scene]) => !only || only.includes(scene))

const browser = await chromium.launch({ args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu'] })
for (const [file, scene, open] of SHOTS) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 })
  await page.goto(`${base}/?scene=${scene}`)
  await page.waitForSelector('canvas', { timeout: 90_000 })
  await page.waitForTimeout(scene === 'bedroom' ? 6000 : 12000) // models load, characters walk to their seats
  // "Tab>App": open a bottom tab, then an app inside it (Desktop dock).
  for (const [i, label] of (open ? open.split('>') : []).entries()) {
    await page.getByRole('button', { name: new RegExp(label, 'i') }).last().click()
    await page.waitForTimeout(label === 'Map' ? 5000 : i === 0 ? 1500 : 1000)
  }
  await page.screenshot({ path: join(out, `${file}.png`) })
  console.log('saved', file)
  await page.close()
}
await browser.close()
