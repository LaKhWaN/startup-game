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
