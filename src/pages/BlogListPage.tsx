import { Link } from 'react-router-dom'
import { BlogLayout } from '../components/BlogLayout'
import { SEOHead } from '../components/SEOHead'
import { BLOG_POSTS } from '../data/blogPosts'
import { SITE_URL, SITE_NAME, url } from '../config/site'

const sorted = [...BLOG_POSTS].sort(
  (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
)

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function BlogListPage() {
  return (
    <BlogLayout wide>
      <SEOHead
        title="Blog — failunicorn"
        description="Startup strategy guides, simulation game tips, and founder education from the team behind failunicorn."
        canonical={url('/blog')}
        schema={{
          '@context': 'https://schema.org',
          '@type': 'Blog',
          name: 'failunicorn Blog',
          description: 'Startup strategy guides, simulation tips, and founder education.',
          url: url('/blog'),
          publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
        }}
      />

      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--brand-primary)', marginBottom: 8 }}>
          Blog
        </h1>
        <p style={{ fontSize: 16, color: 'var(--muted)' }}>
          Startup strategy, simulation game tips, and founder education.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 24,
      }}>
        {sorted.map(post => (
          <Link
            key={post.slug}
            to={`/blog/${post.slug}`}
            style={{ textDecoration: 'none' }}
          >
            <article style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 24,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              transition: 'box-shadow 0.15s, transform 0.15s',
              cursor: 'pointer',
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(var(--text-rgb), 0.1)'
                ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = 'none'
                ;(e.currentTarget as HTMLElement).style.transform = 'none'
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {post.tags.map(tag => (
                  <span key={tag} style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 20,
                    background: 'var(--surface2)',
                    color: 'var(--muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    {tag}
                  </span>
                ))}
              </div>

              <h2 style={{
                fontSize: 17,
                fontWeight: 700,
                color: 'var(--brand-primary)',
                lineHeight: 1.4,
                flex: 1,
              }}>
                {post.title}
              </h2>

              <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>
                {post.description}
              </p>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 4,
              }}>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {formatDate(post.publishedAt)}
                </span>
                <span style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--brand-primary)',
                }}>
                  Read →
                </span>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </BlogLayout>
  )
}
