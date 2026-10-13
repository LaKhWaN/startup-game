import { writeFileSync } from 'fs'
import { resolve } from 'path'

const { getSeoRoutes } = await import('../src/data/seoRoutes.ts')

// Keep in step with src/config/site.ts. This runs under tsx in Node, so it reads
// process.env rather than import.meta.env.
const BASE_URL = (process.env.VITE_SITE_URL || 'https://failunicorn.vercel.app').replace(/\/+$/, '')

const allRoutes = getSeoRoutes(BASE_URL).filter(r => !r.noIndex)

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allRoutes.map(r => `  <url>
    <loc>${BASE_URL}${r.path}</loc>
    <lastmod>${r.lastmod}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`).join('\n')}
</urlset>
`

const outputPath = resolve(process.cwd(), 'public/sitemap.xml')
writeFileSync(outputPath, xml, 'utf-8')
console.log(`Sitemap written to ${outputPath} (${allRoutes.length} URLs)`)

const robots = `User-agent: *
Allow: /
Disallow: /admin

Sitemap: ${BASE_URL}/sitemap.xml
`

const robotsPath = resolve(process.cwd(), 'public/robots.txt')
writeFileSync(robotsPath, robots, 'utf-8')
console.log(`robots.txt written to ${robotsPath}`)
