import { Link } from 'react-router-dom'
import { SITE_LINKS, PlayButton } from './SiteNav'
import './SiteNav.css'

interface SiteFooterProps {
  /** Landing page passes a callback so Play stays in-SPA; other pages navigate to /?play. */
  onPlay?: () => void
}

export function SiteFooter({ onPlay }: SiteFooterProps) {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <Link to="/" className="site-logo">
          <span className="site-logo-name">fail<span className="site-logo-accent">unicorn</span></span>
        </Link>

        <div className="site-footer-links">
          {SITE_LINKS.map(link => (
            <Link key={link.to} to={link.to} className="site-footer-link">{link.label}</Link>
          ))}
          <PlayButton onPlay={onPlay} />
        </div>

        <p className="site-footer-note">Most startups fail. Might as well make it fun.</p>
      </div>
    </footer>
  )
}
