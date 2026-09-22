import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { loadEnv } from 'vite'
import { ingestGameDay } from '../../server/ingestGameDay'
import { ingestFeedback } from '../../server/ingestFeedback'
import { getLeaderboard } from '../../server/getLeaderboard'
import { rateIdea } from '../../server/rateIdea'

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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
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
          pathname === '/api/rate-idea'
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
          GEMINI_API_KEY: loaded.GEMINI_API_KEY ?? process.env.GEMINI_API_KEY,
          MONGODB_URI: loaded.MONGODB_URI ?? process.env.MONGODB_URI,
          MONGODB_DB_NAME: loaded.MONGODB_DB_NAME ?? process.env.MONGODB_DB_NAME,
          ANALYTICS_INGEST_SECRET: loaded.ANALYTICS_INGEST_SECRET ?? process.env.ANALYTICS_INGEST_SECRET,
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
