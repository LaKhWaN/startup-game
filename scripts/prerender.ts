import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'

const { getSeoRoutes } = await import('../src/data/seoRoutes.ts')

// Keep in step with src/config/site.ts and vite.config.ts
const BASE_URL = (process.env.VITE_SITE_URL || 'https://failunicorn.vercel.app').replace(/\/+$/, '')

const distDir = resolve(process.cwd(), 'dist')
const templatePath = resolve(distDir, 'index.html')

if (!existsSync(templatePath)) {
  console.error(`Error: Built index.html not found at ${templatePath}. Run 'vite build' first.`)
  process.exit(1)
}

const templateHtml = readFileSync(templatePath, 'utf-8')

const START_MARKER = '<!-- START_PAGE_METADATA -->'
const END_MARKER = '<!-- END_PAGE_METADATA -->'

if (!templateHtml.includes(START_MARKER) || !templateHtml.includes(END_MARKER)) {
  console.error(`Error: template does not contain required SEO markers: ${START_MARKER} and ${END_MARKER}`)
  process.exit(1)
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function serializeSchema(schema: object): string {
  return JSON.stringify(schema).replace(/</g, '\\u003c')
}

const routes = getSeoRoutes(BASE_URL)
console.log(`Prerendering ${routes.length} routes...`)

const markerRegex = new RegExp(`${START_MARKER}[\\s\\S]*?${END_MARKER}`)

for (const route of routes) {
  const lines: string[] = []

  lines.push(`    <title>${escapeHtml(route.title)}</title>`)
  lines.push(`    <meta name="description" content="${escapeHtml(route.description)}" />`)

  if (route.canonical) {
    lines.push(`    <link rel="canonical" href="${escapeHtml(route.canonical)}" />`)
  }

  lines.push(`    <meta property="og:title" content="${escapeHtml(route.title)}" />`)
  lines.push(`    <meta property="og:description" content="${escapeHtml(route.description)}" />`)
  lines.push(`    <meta property="og:image" content="${escapeHtml(route.ogImage || `${BASE_URL}/og-default.png`)}" />`)
  lines.push(`    <meta property="og:type" content="${escapeHtml(route.ogType || 'website')}" />`)
  lines.push(`    <meta property="og:url" content="${escapeHtml(route.canonical || `${BASE_URL}${route.path}`)}" />`)
  lines.push(`    <meta property="og:site_name" content="failunicorn" />`)
  lines.push(`    <meta name="twitter:card" content="summary_large_image" />`)
  lines.push(`    <meta name="twitter:title" content="${escapeHtml(route.title)}" />`)
  lines.push(`    <meta name="twitter:description" content="${escapeHtml(route.description)}" />`)
  lines.push(`    <meta name="twitter:image" content="${escapeHtml(route.ogImage || `${BASE_URL}/og-default.png`)}" />`)

  if (route.publishedAt) {
    lines.push(`    <meta property="article:published_time" content="${escapeHtml(route.publishedAt)}" />`)
  }
  if (route.updatedAt) {
    lines.push(`    <meta property="article:modified_time" content="${escapeHtml(route.updatedAt)}" />`)
  }
  if (route.noIndex) {
    lines.push(`    <meta name="robots" content="noindex, nofollow" />`)
  }
  if (route.schema) {
    lines.push(`    <script id="seo-schema" type="application/ld+json">${serializeSchema(route.schema)}</script>`)
  }

  const replacement = `${START_MARKER}\n${lines.join('\n')}\n    ${END_MARKER}`
  const pageHtml = templateHtml.replace(markerRegex, replacement)

  // Write out target files
  const targetFiles: string[] = []

  if (route.outputFile) {
    targetFiles.push(resolve(distDir, route.outputFile))
  } else if (route.path === '/') {
    targetFiles.push(resolve(distDir, 'index.html'))
  } else {
    // Both dist/<route>/index.html and dist/<route>.html
    targetFiles.push(resolve(distDir, `.${route.path}/index.html`))
    targetFiles.push(resolve(distDir, `.${route.path}.html`))
  }

  for (const filePath of targetFiles) {
    mkdirSync(dirname(filePath), { recursive: true })
    writeFileSync(filePath, pageHtml, 'utf-8')
    console.log(`  ✓ Written: ${filePath.replace(distDir, 'dist')}`)
  }
}

console.log('Build-time prerendering complete.')
