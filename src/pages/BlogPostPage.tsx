import { useParams, Link } from 'react-router-dom'
import { BlogLayout } from '../components/BlogLayout'
import { SEOHead } from '../components/SEOHead'
import { BlockRenderer } from '../components/BlockRenderer'
import { BLOG_POSTS } from '../data/blogPosts'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>()
  const post = BLOG_POSTS.find(p => p.slug === slug)

  if (!post) {
    return (
      <BlogLayout>
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <h1 style={{ fontSize: 28, color: 'var(--brand-primary)', marginBottom: 12 }}>Post not found</h1>
          <p style={{ color: 'var(--muted)', marginBottom: 24 }}>This article doesn't exist or may have moved.</p>
          <Link to="/blog" style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>← Back to Blog</Link>
        </div>
      </BlogLayout>
    )
  }

  const schema = {
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
      url: 'https://failunicorn.com',
    },
    url: `https://failunicorn.com/blog/${post.slug}`,
  }

  return (
    <BlogLayout>
      <SEOHead
        title={`${post.title} — failunicorn Blog`}
        description={post.description}
        canonical={`https://failunicorn.com/blog/${post.slug}`}
        ogType="article"
        publishedAt={post.publishedAt}
        updatedAt={post.updatedAt}
        schema={schema}
      />

      {/* Back link */}
      <Link to="/blog" style={{
        fontSize: 13,
        color: 'var(--muted)',
        textDecoration: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        marginBottom: 32,
      }}>
        ← Blog
      </Link>

      {/* Header */}
      <header style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
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

        <h1 style={{
          fontSize: 30,
          fontWeight: 800,
          color: 'var(--brand-primary)',
          lineHeight: 1.3,
          marginBottom: 16,
        }}>
          {post.title}
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: 'var(--muted)' }}>
          <span>By {post.author}</span>
          <span>·</span>
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
          {post.updatedAt && (
            <>
              <span>·</span>
              <span>Updated {formatDate(post.updatedAt)}</span>
            </>
          )}
        </div>
      </header>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', marginBottom: 32 }} />

      {/* Body */}
      <div>
        {post.blocks.map((block, i) => (
          <BlockRenderer key={i} block={block} />
        ))}
      </div>

      {/* CTA */}
      <div style={{
        marginTop: 56,
        padding: 28,
        background: 'var(--surface2)',
        borderRadius: 12,
        textAlign: 'center',
      }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--brand-primary)', marginBottom: 8 }}>
          Ready to put this into practice?
        </p>
        <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 20 }}>
          Build your startup in the browser. Free, no signup, runs in under a minute.
        </p>
        <a
          href="/?play"
          style={{
            display: 'inline-block',
            padding: '10px 24px',
            borderRadius: 8,
            background: 'var(--brand-primary)',
            color: 'var(--brand-bg)',
            fontWeight: 600,
            fontSize: 14,
            textDecoration: 'none',
          }}
        >
          Start Playing →
        </a>
      </div>
    </BlogLayout>
  )
}
