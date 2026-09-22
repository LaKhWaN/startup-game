import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import './SiteNav.css'

export const SITE_LINKS = [
  { label: 'Blog',        to: '/blog' },
  { label: 'Changelog',   to: '/changelog' },
  { label: 'Leaderboard', to: '/leaderboard' },
  { label: 'Idea Rater',  to: '/tools/startup-idea-rater' },
]

interface SiteNavProps {
  /** Landing page passes a callback so Play stays in-SPA; other pages navigate to /?play. */
  onPlay?: () => void
  /** Transparent until the page scrolls — for pages with a full-bleed hero. */
  ghostUntilScroll?: boolean
}

export function SiteNav({ onPlay, ghostUntilScroll = false }: SiteNavProps) {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (!ghostUntilScroll) return
    function onScroll() { setScrolled(window.scrollY > 12) }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [ghostUntilScroll])

  const ghost = ghostUntilScroll && !scrolled

  return (
    <nav className={`site-nav${ghost ? ' site-nav--ghost' : ''}`}>
      <div className="site-nav-inner">
        <Link to="/" className="site-logo">
          <span className="site-logo-name">fail<span className="site-logo-accent">unicorn</span></span>
        </Link>

        <div className="site-nav-links">
          {SITE_LINKS.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`site-nav-link${location.pathname === link.to ? ' site-nav-link--active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="site-nav-right">
          <span className="site-nav-hint">Free · No signup</span>
          <PlayButton onPlay={onPlay} />

          <button
            className="site-nav-hamburger"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(o => !o)}
          >
            <svg width="22" height="22" viewBox="0 0 20 20" fill="currentColor">
              {menuOpen
                ? <path fillRule="evenodd" clipRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
                : <path fillRule="evenodd" clipRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
              }
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="site-nav-mobile">
          {SITE_LINKS.map(link => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className={`site-nav-link${location.pathname === link.to ? ' site-nav-link--active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  )
}

function PlayButton({ onPlay, label = 'Play Now →' }: { onPlay?: () => void; label?: string }) {
  if (onPlay) {
    return <button className="site-nav-cta" onClick={onPlay}>{label}</button>
  }
  return <a className="site-nav-cta" href="/?play">{label}</a>
}

export { PlayButton }
