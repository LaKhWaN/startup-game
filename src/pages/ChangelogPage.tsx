import { BlogLayout } from '../components/BlogLayout'
import { SEOHead } from '../components/SEOHead'
import { CHANGELOG } from '../data/changelog'

const TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  new:      { label: 'NEW',      color: 'var(--success)', bg: 'rgba(96,108,56,0.1)' },
  improved: { label: 'IMPROVED', color: 'var(--info)',    bg: 'rgba(69,123,157,0.1)' },
  fixed:    { label: 'FIXED',    color: 'var(--warning)', bg: 'rgba(188,108,37,0.1)' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function ChangelogPage() {
  return (
    <BlogLayout>
      <SEOHead
        title="Changelog — failunicorn"
        description="See what's new in failunicorn — new features, improvements, and fixes to the startup simulation game."
        canonical="https://failunicorn.com/changelog"
        schema={{
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'failunicorn',
          applicationCategory: 'Game',
          operatingSystem: 'Any',
          url: 'https://failunicorn.com',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        }}
      />

      <div style={{ marginBottom: 40, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--brand-primary)', marginBottom: 8 }}>
            Changelog
          </h1>
          <p style={{ fontSize: 16, color: 'var(--muted)' }}>
            What's new in failunicorn.
          </p>
        </div>
        <a
          href="/?play"
          style={{
            padding: '9px 20px',
            borderRadius: 8,
            background: 'var(--brand-primary)',
            color: 'var(--brand-bg)',
            fontWeight: 600,
            fontSize: 14,
            textDecoration: 'none',
            flexShrink: 0,
            alignSelf: 'center',
          }}
        >
          Play the latest →
        </a>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {CHANGELOG.map((entry, i) => (
          <div
            key={entry.version}
            style={{
              display: 'grid',
              gridTemplateColumns: '140px 1fr',
              gap: '0 32px',
              paddingBottom: 40,
              position: 'relative',
            }}
          >
            {/* Timeline line */}
            {i < CHANGELOG.length - 1 && (
              <div style={{
                position: 'absolute',
                left: 140 + 32 / 2 - 1,
                top: 10,
                bottom: 0,
                width: 1,
                background: 'var(--border)',
                zIndex: 0,
              }} />
            )}

            {/* Left: date + version */}
            <div style={{ paddingTop: 2, textAlign: 'right', paddingRight: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
                {formatDate(entry.date)}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--brand-secondary)', fontFamily: 'Roboto Mono, monospace' }}>
                {entry.version}
              </div>
            </div>

            {/* Right: content */}
            <div style={{ paddingLeft: 16, borderLeft: '2px solid var(--border)', position: 'relative' }}>
              {/* dot */}
              <div style={{
                position: 'absolute',
                left: -5,
                top: 7,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--brand-primary)',
                border: '2px solid var(--bg)',
              }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 4,
                  color: TYPE_LABELS[entry.type].color,
                  background: TYPE_LABELS[entry.type].bg,
                  letterSpacing: '0.5px',
                }}>
                  {TYPE_LABELS[entry.type].label}
                </span>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--brand-primary)' }}>
                  {entry.title}
                </h2>
              </div>

              <ul style={{ paddingLeft: 20, margin: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {entry.items.map((item, j) => (
                  <li key={j} style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile responsive */}
      <style>{`
        @media (max-width: 520px) {
          .changelog-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </BlogLayout>
  )
}
