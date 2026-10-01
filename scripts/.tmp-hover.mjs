import { chromium } from 'playwright'
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
const errs = []; p.on('pageerror', e => errs.push(e.message))
await p.goto('http://localhost:5173/new')
await p.waitForFunction(() => window.__v2)
await p.evaluate(() => { const v = window.__v2; v.quickStart(); v.startFounderTask('research'); v.fastForward(80); v.skipChapter1(); v.hireFirst(); v.hireFirst(); v.fastForward(4) })
await p.waitForTimeout(3500)
let found = null
outer: for (let y = 250; y < 700; y += 18) for (let x = 350; x < 1100; x += 18) {
  await p.mouse.move(x, y)
  await p.waitForTimeout(15)
  if (await p.locator('.v2-hover-card').count()) { found = [x, y]; break outer }
}
await p.waitForTimeout(300)
await p.screenshot({ path: process.argv[2] })
const text = found ? await p.locator('.v2-hover-card').first().innerText() : null
if (found) { await p.mouse.click(found[0], found[1]); await p.waitForTimeout(500) }
const dialog = await p.locator('[role=dialog]').count()
console.log(JSON.stringify({ found, text, dialogAfterClick: dialog, errs }))
await b.close()
