import type { ContentBlock } from '../data/blogPosts'

interface BlockRendererProps {
  block: ContentBlock
}

export function BlockRenderer({ block }: BlockRendererProps) {
  switch (block.type) {
    case 'h2':
      return (
        <h2 style={{
          fontSize: 22,
          fontWeight: 700,
          color: 'var(--brand-primary)',
          marginTop: 36,
          marginBottom: 12,
          lineHeight: 1.3,
        }}>
          {block.text}
        </h2>
      )
    case 'h3':
      return (
        <h3 style={{
          fontSize: 17,
          fontWeight: 700,
          color: 'var(--brand-primary)',
          marginTop: 24,
          marginBottom: 8,
        }}>
          {block.text}
        </h3>
      )
    case 'p':
      return (
        <p style={{
          fontSize: 16,
          lineHeight: 1.75,
          color: 'var(--text)',
          marginTop: 16,
        }}>
          {block.text}
        </p>
      )
    case 'ul':
      return (
        <ul style={{
          marginTop: 16,
          paddingLeft: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}>
          {block.items.map((item, i) => (
            <li key={i} style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--text)' }}>
              {item}
            </li>
          ))}
        </ul>
      )
    case 'ol':
      return (
        <ol style={{
          marginTop: 16,
          paddingLeft: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}>
          {block.items.map((item, i) => (
            <li key={i} style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--text)' }}>
              {item}
            </li>
          ))}
        </ol>
      )
    case 'callout': {
      const variantStyles = {
        tip: { border: 'var(--success)', bg: 'rgba(96,108,56,0.08)', icon: '💡' },
        warning: { border: 'var(--warning)', bg: 'rgba(188,108,37,0.08)', icon: '⚠️' },
        info: { border: 'var(--info)', bg: 'rgba(69,123,157,0.08)', icon: 'ℹ️' },
      }
      const v = variantStyles[block.variant ?? 'info']
      return (
        <div style={{
          marginTop: 20,
          padding: '14px 18px',
          borderRadius: 8,
          borderLeft: `3px solid ${v.border}`,
          background: v.bg,
          fontSize: 15,
          lineHeight: 1.7,
          color: 'var(--text)',
        }}>
          <span style={{ marginRight: 8 }}>{v.icon}</span>
          {block.text}
        </div>
      )
    }
    case 'divider':
      return (
        <hr style={{
          border: 'none',
          borderTop: '1px solid var(--border)',
          marginTop: 36,
          marginBottom: 4,
        }} />
      )
    default:
      return null
  }
}
