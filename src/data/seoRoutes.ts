import { BLOG_POSTS } from './blogPosts'
import { CHANGELOG } from './changelog'
import { IDEA_RATER_FAQ } from './ideaRaterFaq'
import { SITE_URL, SITE_NAME, OG_IMAGE } from '../config/site'

export interface RouteSeoMetadata {
  path: string
  title: string
  description: string
  canonical?: string
  ogType?: 'website' | 'article'
  ogImage?: string
  ogImageAlt?: string
  publishedAt?: string
  updatedAt?: string
  noIndex?: boolean
  schema?: object
  priority?: string
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  lastmod?: string
  outputFile?: string
  keywords?: string
}

export function getSeoRoutes(baseUrl = SITE_URL): RouteSeoMetadata[] {
  const origin = baseUrl.replace(/\/+$/, '')
  const today = new Date().toISOString().split('T')[0]
  const latestChangelogDate = CHANGELOG[0]?.date ?? today
  const defaultImage = `${origin}/og-default.png`

  const blogRoutes: RouteSeoMetadata[] = BLOG_POSTS.map(post => ({
    path: `/blog/${post.slug}`,
    title: `${post.title} — failunicorn Blog`,
    description: post.description,
    canonical: `${origin}/blog/${post.slug}`,
    ogType: 'article',
    ogImage: defaultImage,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    priority: '0.8',
    changefreq: 'monthly',
    lastmod: post.updatedAt ?? post.publishedAt,
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      description: post.description,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt ?? post.publishedAt,
      author: { '@type': 'Organization', name: 'failunicorn' },
      publisher: {
        '@type': 'Organization',
        name: 'failunicorn',
        url: origin,
      },
      url: `${origin}/blog/${post.slug}`,
    },
  }))

  const routes: RouteSeoMetadata[] = [
    {
      path: '/',
      title: 'failunicorn — Free Startup Simulator Game (Browser, No Signup)',
      description: 'failunicorn is a free browser startup simulation game. Pitch your idea, hire a team, manage burn rate, and survive crises. No signup needed. Can you reach $10K MRR?',
      keywords: 'startup simulator, startup simulation game, startup game, failunicorn, browser game, startup founder game, burn rate game, SaaS simulator, free startup game, business simulator',
      canonical: origin,
      ogType: 'website',
      ogImage: defaultImage,
      ogImageAlt: 'failunicorn startup simulator game — manage your team, MRR, and runway',
      priority: '1.0',
      changefreq: 'weekly',
      lastmod: today,
      schema: {
        '@context': 'https://schema.org',
        '@type': 'VideoGame',
        name: 'failunicorn',
        alternateName: ['startup simulator', 'startup simulation game', 'startup game'],
        description: 'A free browser startup simulator. Pitch your startup idea, hire your team, ship features, manage burn rate, and survive investor meetings and market crises. No signup needed.',
        genre: ['Strategy', 'Simulation', 'Business', 'Management'],
        gamePlatform: 'Browser',
        operatingSystem: 'Any',
        applicationCategory: 'Game',
        inLanguage: 'en',
        isAccessibleForFree: true,
        url: origin,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        publisher: { '@type': 'Organization', name: SITE_NAME, url: origin },
      },
    },
    {
      path: '/blog',
      title: 'Startup Simulator Blog — Strategy Guides & Founder Tips | failunicorn',
      description: 'Startup strategy guides, simulation game tips, burn rate explainers, and founder education from the team behind failunicorn.',
      keywords: 'startup strategy, startup tips, burn rate, founder education, startup simulation, startup game guide',
      canonical: `${origin}/blog`,
      ogType: 'website',
      ogImage: defaultImage,
      priority: '0.9',
      changefreq: 'weekly',
      lastmod: today,
      schema: {
        '@context': 'https://schema.org',
        '@type': 'Blog',
        name: 'failunicorn Blog',
        description: 'Startup strategy guides, simulation tips, and founder education.',
        url: `${origin}/blog`,
        publisher: { '@type': 'Organization', name: SITE_NAME, url: origin },
      },
    },
    ...blogRoutes,
    {
      path: '/changelog',
      title: 'Changelog — failunicorn',
      description: 'See what\'s new in failunicorn — new features, improvements, and fixes to the startup simulation game.',
      canonical: `${origin}/changelog`,
      ogType: 'website',
      ogImage: defaultImage,
      priority: '0.7',
      changefreq: 'weekly',
      lastmod: latestChangelogDate,
      schema: {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'failunicorn',
        applicationCategory: 'Game',
        operatingSystem: 'Any',
        url: origin,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      },
    },
    {
      path: '/leaderboard',
      title: 'Global Leaderboard — failunicorn',
      description: 'See the top startup founders on failunicorn — ranked by valuation. Can your startup make the list?',
      canonical: `${origin}/leaderboard`,
      ogType: 'website',
      ogImage: defaultImage,
      priority: '0.7',
      changefreq: 'daily',
      lastmod: today,
    },
    {
      path: '/tools/startup-idea-rater',
      title: 'Free Startup Idea Rater — failunicorn',
      description: 'Paste your startup idea and get an AI score (1-10) with strengths, risks, and difficulty rating. Free, instant, no signup needed.',
      canonical: `${origin}/tools/startup-idea-rater`,
      ogType: 'website',
      ogImage: defaultImage,
      priority: '0.9',
      changefreq: 'monthly',
      lastmod: today,
      schema: {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: IDEA_RATER_FAQ.map(item => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      },
    },
    {
      path: '/404',
      title: 'Page Not Found — failunicorn',
      description: 'This page doesn\'t exist.',
      noIndex: true,
      outputFile: '404.html',
    },
  ]

  return routes
}
