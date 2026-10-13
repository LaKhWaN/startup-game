import { useEffect } from 'react'

interface SEOHeadProps {
  title: string
  description: string
  canonical?: string
  ogType?: 'website' | 'article'
  ogImage?: string
  ogImageAlt?: string
  publishedAt?: string
  updatedAt?: string
  noIndex?: boolean
  schema?: object
  keywords?: string
  author?: string
}

import { SITE_URL, OG_IMAGE } from '../config/site'

const BASE_URL = SITE_URL
const DEFAULT_IMAGE = OG_IMAGE

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
  ogImageAlt,
  publishedAt,
  updatedAt,
  noIndex = false,
  schema,
  keywords,
  author,
}: SEOHeadProps) {
  useEffect(() => {
    const prevTitle = document.title
    document.title = title

    const elements: Element[] = []

    elements.push(setMeta('description', description, 'name'))
    if (keywords) elements.push(setMeta('keywords', keywords, 'name'))
    if (author) elements.push(setMeta('author', author, 'name'))
    elements.push(setMeta('og:title', title))
    elements.push(setMeta('og:description', description))
    elements.push(setMeta('og:type', ogType))
    elements.push(setMeta('og:image', ogImage))
    elements.push(setMeta('og:image:width', '1200'))
    elements.push(setMeta('og:image:height', '630'))
    if (ogImageAlt) elements.push(setMeta('og:image:alt', ogImageAlt))
    elements.push(setMeta('og:locale', 'en_US'))
    elements.push(setMeta('og:url', canonical ?? BASE_URL))
    elements.push(setMeta('og:site_name', 'failunicorn'))
    elements.push(setMeta('twitter:card', 'summary_large_image', 'name'))
    elements.push(setMeta('twitter:site', '@failunicorn', 'name'))
    elements.push(setMeta('twitter:title', title, 'name'))
    elements.push(setMeta('twitter:description', description, 'name'))
    elements.push(setMeta('twitter:image', ogImage, 'name'))
    if (ogImageAlt) elements.push(setMeta('twitter:image:alt', ogImageAlt, 'name'))

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

    let schemaEl = document.getElementById('seo-schema') as HTMLScriptElement | null
    if (schema) {
      if (!schemaEl) {
        schemaEl = document.createElement('script')
        schemaEl.type = 'application/ld+json'
        schemaEl.id = 'seo-schema'
        document.head.appendChild(schemaEl)
      }
      schemaEl.text = JSON.stringify(schema)
    } else if (schemaEl) {
      schemaEl.remove()
      schemaEl = null
    }

    return () => {
      document.title = prevTitle
      if (schemaEl) schemaEl.remove()
    }
  }, [title, description, canonical, ogType, ogImage, ogImageAlt, publishedAt, updatedAt, noIndex, schema, keywords, author])

  return null
}
