import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { analyticsApiPlugin } from './vite/plugins/analyticsApi'

const DEFAULT_SITE_URL = 'https://failunicorn.vercel.app'

/**
 * index.html is static, so the canonical/OG tags can't import src/config/site.ts.
 * Substitute the origin here instead, with the same default, so there is still
 * only one place to change when the domain moves.
 */
function siteUrlHtmlPlugin(siteUrl: string): Plugin {
  return {
    name: 'site-url-html',
    transformIndexHtml(html) {
      return html.split('__SITE_URL__').join(siteUrl)
    },
  }
}

export default defineConfig(() => {
  const siteUrl = (process.env.VITE_SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, '')
  return {
    plugins: [react(), analyticsApiPlugin(), siteUrlHtmlPlugin(siteUrl)],
  }
})
