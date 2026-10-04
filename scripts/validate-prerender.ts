import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const { getSeoRoutes } = await import('../src/data/seoRoutes.ts')

const BASE_URL = (process.env.VITE_SITE_URL || 'https://failunicorn.vercel.app').replace(/\/+$/, '')
const distDir = resolve(process.cwd(), 'dist')

console.log('Running prerender validation suite...\n')

let passCount = 0
let failCount = 0

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`)
    passCount++
  } else {
    console.error(`  ✗ FAIL: ${message}`)
    failCount++
  }
}

const routes = getSeoRoutes(BASE_URL)

for (const route of routes) {
  console.log(`Testing route: ${route.path}`)

  const targetFile = route.outputFile
    ? resolve(distDir, route.outputFile)
    : route.path === '/'
      ? resolve(distDir, 'index.html')
      : resolve(distDir, `.${route.path}/index.html`)

  assert(existsSync(targetFile), `Output file exists: ${targetFile.replace(distDir, 'dist')}`)
  if (!existsSync(targetFile)) continue

  const html = readFileSync(targetFile, 'utf-8')

  // 1. Title tag checks
  const titleMatches = html.match(/<title>([^<]*)<\/title>/g) || []
  assert(titleMatches.length === 1, `Exactly one <title> tag found (found ${titleMatches.length})`)

  // Check title content
  const titleContentMatch = html.match(/<title>([^<]*)<\/title>/)
  const actualTitle = titleContentMatch ? titleContentMatch[1] : ''
  assert(
    actualTitle.includes(route.title.replace(/&/g, '&amp;').replace(/'/g, '&#39;')),
    `Title matches expected route title: "${route.title}"`
  )

  // 2. Meta description checks
  const descMatches = html.match(/<meta\s+name="description"\s+content="([^"]*)"/g) || []
  assert(descMatches.length === 1, `Exactly one meta description found (found ${descMatches.length})`)

  // 3. Open Graph tag checks
  const ogTitleMatches = html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/g) || []
  assert(ogTitleMatches.length === 1, `Exactly one og:title found (found ${ogTitleMatches.length})`)

  const ogDescMatches = html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/g) || []
  assert(ogDescMatches.length === 1, `Exactly one og:description found (found ${ogDescMatches.length})`)

  const ogUrlMatches = html.match(/<meta\s+property="og:url"\s+content="([^"]*)"/g) || []
  assert(ogUrlMatches.length === 1, `Exactly one og:url found (found ${ogUrlMatches.length})`)

  const ogImageMatches = html.match(/<meta\s+property="og:image"\s+content="([^"]*)"/g) || []
  assert(ogImageMatches.length === 1, `Exactly one og:image found (found ${ogImageMatches.length})`)

  // Check absolute URLs
  const ogUrlContent = html.match(/<meta\s+property="og:url"\s+content="([^"]*)"/)?.[1] || ''
  assert(
    ogUrlContent.startsWith('http://') || ogUrlContent.startsWith('https://'),
    `og:url is absolute URL: ${ogUrlContent}`
  )

  const ogImageContent = html.match(/<meta\s+property="og:image"\s+content="([^"]*)"/)?.[1] || ''
  assert(
    ogImageContent.startsWith('http://') || ogImageContent.startsWith('https://'),
    `og:image is absolute URL: ${ogImageContent}`
  )

  // 4. Twitter tags
  const twTitleMatches = html.match(/<meta\s+name="twitter:title"\s+content="([^"]*)"/g) || []
  assert(twTitleMatches.length === 1, `Exactly one twitter:title found (found ${twTitleMatches.length})`)

  const twDescMatches = html.match(/<meta\s+name="twitter:description"\s+content="([^"]*)"/g) || []
  assert(twDescMatches.length === 1, `Exactly one twitter:description found (found ${twDescMatches.length})`)

  const twCardMatches = html.match(/<meta\s+name="twitter:card"\s+content="summary_large_image"/g) || []
  assert(twCardMatches.length === 1, `twitter:card summary_large_image found`)

  // 5. Canonical check
  if (route.canonical) {
    const canonicalMatches = html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/g) || []
    assert(canonicalMatches.length === 1, `Exactly one canonical link found (found ${canonicalMatches.length})`)
    const canonicalHref = html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/)?.[1] || ''
    assert(canonicalHref === route.canonical, `Canonical href matches expected: ${route.canonical}`)
  }

  // 6. Check that homepage tags are NOT leaked onto non-homepage routes
  if (route.path !== '/') {
    assert(
      !actualTitle.includes("failunicorn — Build a Startup. Survive.") || route.path === '/404',
      `Non-home page does not retain default homepage title`
    )
  }

  // 7. JSON-LD schema validity
  if (route.schema) {
    const schemaScriptMatch = html.match(/<script\s+id="seo-schema"\s+type="application\/ld\+json">([\s\S]*?)<\/script>/)
    assert(!!schemaScriptMatch, `JSON-LD schema script is present`)
    if (schemaScriptMatch) {
      try {
        const parsed = JSON.parse(schemaScriptMatch[1])
        assert(parsed['@context'] === 'https://schema.org', `JSON-LD context is valid`)
        assert(parsed['@type'] === (route.schema as any)['@type'], `JSON-LD @type matches: ${(route.schema as any)['@type']}`)
      } catch (e) {
        assert(false, `JSON-LD failed to parse: ${(e as Error).message}`)
      }
    }
  }

  // 8. Robots noindex for 404
  if (route.noIndex) {
    assert(html.includes('<meta name="robots" content="noindex, nofollow" />'), `Robots noindex tag is present`)
  }

  // 9. Built asset script and stylesheet references exist
  const scriptMatch = html.match(/<script\s+type="module"\s+crossorigin\s+src="\/assets\/([^"]+)"/)
  assert(!!scriptMatch, `Root asset script module reference is preserved`)
  if (scriptMatch) {
    const assetFile = resolve(distDir, 'assets', scriptMatch[1])
    assert(existsSync(assetFile), `Referenced JS asset file exists on disk: assets/${scriptMatch[1]}`)
  }

  const cssMatch = html.match(/<link\s+rel="stylesheet"\s+crossorigin\s+href="\/assets\/([^"]+)"/)
  assert(!!cssMatch, `Root asset CSS reference is preserved`)
  if (cssMatch) {
    const cssFile = resolve(distDir, 'assets', cssMatch[1])
    assert(existsSync(cssFile), `Referenced CSS asset file exists on disk: assets/${cssMatch[1]}`)
  }

  // 10. Clean-URL alias existence for non-root routes
  if (route.path !== '/' && !route.outputFile) {
    const cleanUrlFile = resolve(distDir, `.${route.path}.html`)
    assert(existsSync(cleanUrlFile), `Clean URL static file exists: ${cleanUrlFile.replace(distDir, 'dist')}`)
  }

  console.log('')
}

// 11. Verify Sitemap and robots
console.log('Testing Sitemap and Robots generation:')
const sitemapPath = resolve(distDir, '../public/sitemap.xml')
assert(existsSync(sitemapPath), `sitemap.xml exists in public/`)
if (existsSync(sitemapPath)) {
  const sitemapXml = readFileSync(sitemapPath, 'utf-8')
  for (const route of routes) {
    if (route.noIndex) {
      assert(!sitemapXml.includes(`<loc>${BASE_URL}${route.path}</loc>`), `noIndex route ${route.path} excluded from sitemap`)
    } else {
      assert(sitemapXml.includes(`<loc>${BASE_URL}${route.path}</loc>`), `route ${route.path} present in sitemap`)
    }
  }
}

const robotsPath = resolve(distDir, '../public/robots.txt')
assert(existsSync(robotsPath), `robots.txt exists in public/`)
if (existsSync(robotsPath)) {
  const robotsTxt = readFileSync(robotsPath, 'utf-8')
  assert(robotsTxt.includes('Disallow: /admin'), `robots.txt disallows /admin`)
  assert(robotsTxt.includes(`Sitemap: ${BASE_URL}/sitemap.xml`), `robots.txt contains sitemap URL`)
}

console.log(`\nPrerender validation results: ${passCount} passed, ${failCount} failed.`)

if (failCount > 0) {
  process.exit(1)
}
