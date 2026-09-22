/**
 * Canonical public origin for this deployment.
 *
 * Used for canonical URLs, OG/Twitter tags, JSON-LD, the sitemap, robots.txt and
 * share links. Override per environment with VITE_SITE_URL — set it in Vercel if
 * you attach a custom domain, and everything below follows.
 *
 * No trailing slash.
 */
export const SITE_URL: string = (
  import.meta.env.VITE_SITE_URL as string | undefined
)?.replace(/\/+$/, '') || 'https://failunicorn.vercel.app'

/** Absolute URL for a site-relative path. `url('/blog')` → `https://…/blog` */
export function url(path = '/'): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

/** Default social card. */
export const OG_IMAGE: string = url('/og-default.png')

export const SITE_NAME = 'failunicorn'
