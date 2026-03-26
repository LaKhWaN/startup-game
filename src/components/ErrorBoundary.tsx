import React from 'react'

interface Props { children: React.ReactNode }
interface State { error: Error | null }

function ErrorScreen({ error }: { error: Error }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', padding: '2rem', background: 'var(--bg, #f7f8fa)', fontFamily: 'Roboto, sans-serif',
    }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💥</div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text, #111827)', marginBottom: '0.5rem' }}>
        Something crashed
      </h2>
      <p style={{ color: 'var(--muted, #6b7280)', fontSize: '0.9rem', marginBottom: '1.5rem', textAlign: 'center' }}>
        Don't worry — your autosave is safe. Reload to get back to the grind.
      </p>
      {import.meta.env.DEV && (
        <pre style={{
          background: 'var(--surface2, #f0f2f5)', border: '1px solid var(--border, #e2e5ec)',
          borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.75rem',
          fontFamily: 'Roboto Mono, monospace', color: 'var(--red, #ef4444)',
          maxWidth: '560px', width: '100%', whiteSpace: 'pre-wrap', marginBottom: '1.5rem',
        }}>
          {error.message}
        </pre>
      )}
      <button
        onClick={() => window.location.reload()}
        style={{
          padding: '0.6rem 1.5rem', background: 'var(--accent, #0ea5e9)', color: '#fff',
          border: 'none', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 700,
          cursor: 'pointer', fontFamily: 'Roboto, sans-serif',
        }}
      >
        Reload Game
      </button>
    </div>
  )
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) return <ErrorScreen error={this.state.error} />
    return this.props.children
  }
}
