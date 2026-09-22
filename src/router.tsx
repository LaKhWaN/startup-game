import { lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import { createBrowserRouter } from 'react-router-dom'

/* The game pulls in Phaser + three.js + sql.js, and the admin view pulls in the
   analytics stack. Keep both out of the marketing/SEO pages' initial payload. */
const App            = lazy(() => import('./App'))
const AdminAnalytics = lazy(() => import('./components/AdminAnalytics').then(m => ({ default: m.AdminAnalytics })))
const BlogListPage   = lazy(() => import('./pages/BlogListPage').then(m => ({ default: m.BlogListPage })))
const BlogPostPage   = lazy(() => import('./pages/BlogPostPage').then(m => ({ default: m.BlogPostPage })))
const ChangelogPage  = lazy(() => import('./pages/ChangelogPage').then(m => ({ default: m.ChangelogPage })))
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage').then(m => ({ default: m.LeaderboardPage })))
const IdeaRaterPage  = lazy(() => import('./pages/IdeaRaterPage').then(m => ({ default: m.IdeaRaterPage })))
const NotFoundPage   = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })))

function RouteFallback() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      color: 'var(--muted)',
      fontSize: 14,
    }}>
      Loading…
    </div>
  )
}

function route(element: ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>
}

export const router = createBrowserRouter([
  { path: '/admin', element: route(<AdminAnalytics />) },
  { path: '/blog', element: route(<BlogListPage />) },
  { path: '/blog/:slug', element: route(<BlogPostPage />) },
  { path: '/changelog', element: route(<ChangelogPage />) },
  { path: '/leaderboard', element: route(<LeaderboardPage />) },
  { path: '/tools/startup-idea-rater', element: route(<IdeaRaterPage />) },
  { path: '/', element: route(<App />) },
  { path: '*', element: route(<NotFoundPage />) },
])
