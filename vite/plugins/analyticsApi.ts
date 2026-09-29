import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { loadEnv } from 'vite'
import { ingestGameDay } from '../../server/ingestGameDay'
import { ingestFeedback } from '../../server/ingestFeedback'
import { getLeaderboard } from '../../server/getLeaderboard'
import { rateIdea } from '../../server/rateIdea'
import { adminLogin } from '../../server/adminAuth'
import { adminDashboard } from '../../server/adminDashboard'

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => { chunks.push(c) })
    req.on('end', () => { resolve(Buffer.concat(chunks).toString('utf8')) })
    req.on('error', reject)
  })
}

function setCors(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

export function analyticsApiPlugin(): Plugin {
  return {
    name: 'analytics-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = req.url?.split('?')[0] ?? ''
        const isKnownRoute =
          pathname === '/api/ingest-game-day' ||
          pathname === '/api/ingest-feedback' ||
          pathname === '/api/leaderboard' ||
          pathname === '/api/rate-idea' ||
          pathname === '/api/admin-login' ||
          pathname === '/api/admin-dashboard'
        if (!isKnownRoute) {
          next()
          return
        }

        const nodeRes = res as ServerResponse
        setCors(nodeRes)

        if (req.method === 'OPTIONS') {
          nodeRes.statusCode = 204
          nodeRes.end()
          return
        }

        const mode = server.config.mode
        const loaded = loadEnv(mode, process.cwd(), '')
        const env = {
          GROQ_API_KEYS: loaded.GROQ_API_KEYS ?? process.env.GROQ_API_KEYS,
          RESEND_API_KEY: loaded.RESEND_API_KEY ?? process.env.RESEND_API_KEY,
          ALERT_EMAIL: loaded.ALERT_EMAIL ?? process.env.ALERT_EMAIL,
          MONGODB_URI: loaded.MONGODB_URI ?? process.env.MONGODB_URI,
          MONGODB_DB_NAME: loaded.MONGODB_DB_NAME ?? process.env.MONGODB_DB_NAME,
          ANALYTICS_INGEST_SECRET: loaded.ANALYTICS_INGEST_SECRET ?? process.env.ANALYTICS_INGEST_SECRET,
          ADMIN_USERNAME: loaded.ADMIN_USERNAME ?? process.env.ADMIN_USERNAME,
          ADMIN_PASSWORD: loaded.ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD,
          ADMIN_SECRET: loaded.ADMIN_SECRET ?? process.env.ADMIN_SECRET,
        }

        try {
          if (pathname === '/api/leaderboard') {
            if (req.method !== 'GET') {
              nodeRes.statusCode = 405
              nodeRes.setHeader('Content-Type', 'application/json')
              nodeRes.end(JSON.stringify({ error: 'Method not allowed' }))
              return
            }
            const { status, body } = await getLeaderboard(env)
            nodeRes.statusCode = status
            nodeRes.setHeader('Content-Type', 'application/json')
            nodeRes.end(JSON.stringify(body))
            return
          }

          if (pathname === '/api/admin-dashboard') {
            if (req.method !== 'GET') {
              nodeRes.statusCode = 405
              nodeRes.setHeader('Content-Type', 'application/json')
              nodeRes.end(JSON.stringify({ error: 'Method not allowed' }))
              return
            }
            const { status, body } = await adminDashboard(req.headers.authorization, env)
            nodeRes.statusCode = status
            nodeRes.setHeader('Content-Type', 'application/json')
            nodeRes.end(JSON.stringify(body))
            return
          }

          if (pathname === '/api/admin-login') {
            const raw = await readBody(req as IncomingMessage)
            const { status, body } = await adminLogin(raw, env)
            nodeRes.statusCode = status
            nodeRes.setHeader('Content-Type', 'application/json')
            nodeRes.end(JSON.stringify(body))
            return
          }

          if (req.method !== 'POST') {
            nodeRes.statusCode = 405
            nodeRes.setHeader('Content-Type', 'application/json')
            nodeRes.end(JSON.stringify({ error: 'Method not allowed' }))
            return
          }

          const raw = await readBody(req as IncomingMessage)

          if (pathname === '/api/rate-idea') {
            const { status, body } = await rateIdea(raw, env)
            nodeRes.statusCode = status
            nodeRes.setHeader('Content-Type', 'application/json')
            nodeRes.end(JSON.stringify(body))
            return
          }

          const handler = pathname === '/api/ingest-feedback' ? ingestFeedback : ingestGameDay
          const { status, body } = await handler(raw, env)
          nodeRes.statusCode = status
          nodeRes.setHeader('Content-Type', 'application/json')
          nodeRes.end(JSON.stringify(body))
        } catch (e) {
          console.error('[analytics-api]', e)
          nodeRes.statusCode = 500
          nodeRes.setHeader('Content-Type', 'application/json')
          nodeRes.end(JSON.stringify({ error: 'Server error' }))
        }
      })
    },
  }
}
