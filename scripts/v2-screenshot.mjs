#!/usr/bin/env node
// Usage: node scripts/v2-screenshot.mjs [baseUrl] [outDir]
// Needs `npm run dev` running. Drives /new via window.__v2 (dev-only hooks),
// saves PNGs, and exits non-zero if the canvas area renders blank.
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright'

const base = process.argv[2] ?? 'http://localhost:5173'
const out = process.argv[3] ?? join(tmpdir(), 'v2-shots')
mkdirSync(out, { recursive: true })

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const errors = []

async function shoot(viewport, tag) {
  const page = await browser.newPage({ viewport })
  page.on('console', m => { if (m.type() === 'error') errors.push(`[${tag}] ${m.text()}`) })
  page.on('pageerror', e => errors.push(`[${tag}] ${e.message}`))
  await page.goto(`${base}/new`)
  await page.waitForFunction(() => 'window' in globalThis && window.__v2)
  await page.evaluate(() => window.__v2.quickStart())
  await page.waitForTimeout(3000)
  await page.screenshot({ path: join(out, `${tag}-1-idle.png`) })

  await page.evaluate(() => { window.__v2.startFounderTask('research'); window.__v2.fastForward(12) })
  await page.waitForTimeout(2500)
  await page.screenshot({ path: join(out, `${tag}-2-research.png`) })

  await page.evaluate(() => {
    window.__v2.fastForward(72)
    const f = window.__v2.getV2State().features.find(x => x.status === 'proposed')
    if (f) window.__v2.startFounderTask('develop', f.id)
    window.__v2.fastForward(6)
  })
  await page.waitForTimeout(2500)
  await page.screenshot({ path: join(out, `${tag}-3-develop.png`) })

  // Phase 3: two interns in the room, and the Team tab.
  await page.evaluate(() => {
    window.__v2.skipChapter1()
    window.__v2.hireFirst()
    window.__v2.hireFirst()
    window.__v2.fastForward(6)
  })
  await page.getByRole('button', { name: /team/i }).first().click().catch(() => errors.push(`[${tag}] no Team tab`))
  await page.waitForTimeout(3000)
  await page.screenshot({ path: join(out, `${tag}-4-team.png`) })

  await page.evaluate(() => {
    const ids = Object.keys(window.__v2.getV2State().v2.team)
    if (ids[0]) window.__v2.assignTeamMember(ids[0], 'sales')
    window.__v2.fastForward(2)
  })
  await page.waitForTimeout(2500)
  await page.screenshot({ path: join(out, `${tag}-5-team-sales.png`) })

  // Phase 4: move to the Villa, fill it, and open the Map.
  const villa = await page.evaluate(() => {
    window.__v2.skipToChapter3()
    const moved = window.__v2.moveToLocation('villa')
    const hired = window.__v2.hireMany(4)
    window.__v2.fastForward(3)
    return { moved, hired, location: window.__v2.getV2State().v2.location }
  })
  if (villa.moved !== 'ok' || villa.location !== 'villa') errors.push(`[${tag}] move failed: ${JSON.stringify(villa)}`)
  await page.getByRole('button', { name: /team/i }).first().click().catch(() => {})
  await page.waitForTimeout(3500)
  await page.screenshot({ path: join(out, `${tag}-6-villa.png`) })
  await page.getByRole('button', { name: /map/i }).first().click().catch(() => errors.push(`[${tag}] no Map tab`))
  await page.waitForTimeout(1000)
  await page.screenshot({ path: join(out, `${tag}-7-map.png`) })

  // Blank check: sample the canvas-area pixels from a real screenshot of that element.
  const area = page.locator('.game-canvas-area')
  const png = await area.screenshot()
  const distinct = await page.evaluate(async (b64) => {
    const img = new Image()
    img.src = `data:image/png;base64,${b64}`
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.width; c.height = img.height
    const ctx = c.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const { data } = ctx.getImageData(0, 0, c.width, c.height)
    const seen = new Set()
    for (let i = 0; i < data.length; i += 4 * 97) seen.add(`${data[i] >> 4},${data[i + 1] >> 4},${data[i + 2] >> 4}`)
    return seen.size
  }, png.toString('base64'))
  await page.close()
  return distinct
}

const desktop = await shoot({ width: 1440, height: 900 }, 'desktop')
const mobile = await shoot({ width: 820, height: 1180 }, 'portrait')
await browser.close()

console.log(`screenshots → ${out}`)
console.log(`distinct colors: desktop=${desktop} portrait=${mobile}`)
if (errors.length) console.log(`console errors:\n${errors.join('\n')}`)
if (desktop < 12 || mobile < 12) { console.error('Canvas area looks blank.'); process.exit(1) }
