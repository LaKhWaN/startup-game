import { writeFileSync } from 'fs'
import { resolve } from 'path'

// Import data directly (tsx handles TypeScript)
const { BLOG_POSTS } = await import('../src/data/blogPosts.ts')
const { CHANGELOG } = await import('../src/data/changelog.ts')

// Keep in step with src/config/site.ts. This runs under tsx in Node, so it reads
// process.env rather than import.meta.env.
const BASE_URL = (process.env.VITE_SITE_URL || 'https://failunicorn.vercel.app').replace(/\/+$/, '')
const today = new Date().toISOString().split('T')[0]

const staticRoutes = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/blog', priority: '0.9', changefreq: 'weekly' },
  { path: '/changelog', priority: '0.7', changefreq: 'weekly' },
  { path: '/leaderboard', priority: '0.7', changefreq: 'daily' },
  { path: '/tools/startup-idea-rater', priority: '0.9', changefreq: 'monthly' },
]

const blogRoutes = BLOG_POSTS.map(post => ({
  path: `/blog/${post.slug}`,
  lastmod: post.updatedAt ?? post.publishedAt,
  priority: '0.8',
  changefreq: 'monthly',
}))

// Get latest changelog date
const latestChangelog = CHANGELOG[0]?.date ?? today

const allRoutes = [
  ...staticRoutes.map(r => ({ ...r, lastmod: today })),
  ...blogRoutes,
  { path: '/changelog', priority: '0.7', changefreq: 'weekly', lastmod: latestChangelog },
]

// Deduplicate (static /changelog will be overridden by the one with changelog date)
const seen = new Set<string>()
const deduped = allRoutes.filter(r => {
  if (seen.has(r.path)) return false
  seen.add(r.path)
  return true
})

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${deduped.map(r => `  <url>
    <loc>${BASE_URL}${r.path}</loc>
    <lastmod>${r.lastmod}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`).join('\n')}
</urlset>
`

const outputPath = resolve(process.cwd(), 'public/sitemap.xml')
writeFileSync(outputPath, xml, 'utf-8')
console.log(`Sitemap written to ${outputPath} (${deduped.length} URLs)`)

const robots = `User-agent: *
Allow: /
Disallow: /admin

Sitemap: ${BASE_URL}/sitemap.xml
`

const robotsPath = resolve(process.cwd(), 'public/robots.txt')
writeFileSync(robotsPath, robots, 'utf-8')
console.log(`robots.txt written to ${robotsPath}`)
