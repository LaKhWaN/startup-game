import { useEffect } from 'react'

interface SEOHeadProps {
  title: string
  description: string
  canonical?: string
  ogType?: 'website' | 'article'
  ogImage?: string
  publishedAt?: string
  updatedAt?: string
  noIndex?: boolean
  schema?: object
}

const BASE_URL = 'https://failunicorn.com'
const DEFAULT_IMAGE = `${BASE_URL}/og-default.png`

function setMeta(property: string, content: string, attr: 'name' | 'property' = 'property') {
  let el = document.querySelector(`meta[${attr}="${property}"]`) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, property)
    document.head.appendChild(el)
  }
  el.content = content
  return el
}

function setLink(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null
  if (!el) {
    el = document.createElement('link')
    el.rel = rel
    document.head.appendChild(el)
  }
  el.href = href
  return el
}

export function SEOHead({
  title,
  description,
  canonical,
  ogType = 'website',
  ogImage = DEFAULT_IMAGE,
  publishedAt,
  updatedAt,
  noIndex = false,
  schema,
}: SEOHeadProps) {
  useEffect(() => {
    const prevTitle = document.title
    document.title = title

    const elements: Element[] = []

    elements.push(setMeta('description', description, 'name'))
    elements.push(setMeta('og:title', title))
    elements.push(setMeta('og:description', description))
    elements.push(setMeta('og:type', ogType))
    elements.push(setMeta('og:image', ogImage))
    elements.push(setMeta('og:url', canonical ?? BASE_URL))
    elements.push(setMeta('og:site_name', 'failunicorn'))
    elements.push(setMeta('twitter:card', 'summary_large_image', 'name'))
    elements.push(setMeta('twitter:title', title, 'name'))
    elements.push(setMeta('twitter:description', description, 'name'))
    elements.push(setMeta('twitter:image', ogImage, 'name'))

    if (publishedAt) {
      elements.push(setMeta('article:published_time', publishedAt))
    }
    if (updatedAt) {
      elements.push(setMeta('article:modified_time', updatedAt))
    }

    if (noIndex) {
      elements.push(setMeta('robots', 'noindex, nofollow', 'name'))
    }

    if (canonical) {
      elements.push(setLink('canonical', canonical))
    }

    let schemaEl: HTMLScriptElement | null = null
    if (schema) {
      schemaEl = document.createElement('script')
      schemaEl.type = 'application/ld+json'
      schemaEl.id = 'seo-schema'
      schemaEl.text = JSON.stringify(schema)
      document.head.appendChild(schemaEl)
    }

    return () => {
      document.title = prevTitle
      if (schemaEl) schemaEl.remove()
    }
  }, [title, description, canonical, ogType, ogImage, publishedAt, updatedAt, noIndex, schema])

  return null
}
