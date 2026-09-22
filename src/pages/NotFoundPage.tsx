import { Link } from 'react-router-dom'
import { SiteNav } from '../components/SiteNav'
import { SiteFooter } from '../components/SiteFooter'
import { SEOHead } from '../components/SEOHead'

export function NotFoundPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <SEOHead
        title="Page Not Found — failunicorn"
        description="This page doesn't exist."
        noIndex
      />
      <SiteNav />
      <div className="site-nav-spacer" />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ textAlign: 'center', maxWidth: 440 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>💀</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--brand-primary)', marginBottom: 10 }}>
            404 — Not Found
          </h1>
          <p style={{ fontSize: 16, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 28 }}>
            This page doesn't exist. Maybe your startup pivoted away from it.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href="/?play"
              style={{
                padding: '10px 22px',
                borderRadius: 8,
                background: 'var(--brand-primary)',
                color: 'var(--brand-bg)',
                fontWeight: 600,
                fontSize: 14,
                textDecoration: 'none',
              }}
            >
              Play the game →
            </a>
            <Link
              to="/blog"
              style={{
                padding: '10px 22px',
                borderRadius: 8,
                border: '1.5px solid var(--border)',
                color: 'var(--text)',
                fontWeight: 600,
                fontSize: 14,
                textDecoration: 'none',
              }}
            >
              Read the blog
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
