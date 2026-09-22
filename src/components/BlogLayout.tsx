import type { ReactNode } from 'react'
import { SiteNav } from './SiteNav'
import { SiteFooter } from './SiteFooter'

interface BlogLayoutProps {
  children: ReactNode
  wide?: boolean
}

export function BlogLayout({ children, wide = false }: BlogLayoutProps) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <SiteNav />
      <div className="site-nav-spacer" />
      <main style={{
        flex: 1,
        maxWidth: wide ? 1100 : 720,
        width: '100%',
        margin: '0 auto',
        padding: '40px 24px 64px',
      }}>
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}
