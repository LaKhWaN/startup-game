import { spawn, type ChildProcess } from 'child_process'

const PORT = 4173
const BASE = `http://localhost:${PORT}`

console.log('Testing HTTP preview server for raw HTML responses...\n')

async function waitForServer(proc: ChildProcess, maxAttempts = 30): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${BASE}/`)
      if (res.ok) return
    } catch {
      await new Promise(r => setTimeout(r, 500))
    }
  }
  throw new Error('Preview server did not start in time')
}

async function run() {
  const isWindows = process.platform === 'win32'
  const cmd = isWindows ? 'npx.cmd' : 'npx'
  const preview = spawn(cmd, ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    stdio: 'pipe',
    shell: true,
  })

  preview.stderr?.on('data', data => console.error(`[preview stderr]: ${data}`))

  try {
    await waitForServer(preview)
    console.log('Preview server started at', BASE)

    const testRoutes = [
      {
        path: '/',
        expectedTitle: 'failunicorn — Build a Startup. Survive.',
        expectedOgType: 'website',
      },
      {
        path: '/blog',
        expectedTitle: 'Blog — failunicorn',
        expectedOgType: 'website',
      },
      {
        path: '/blog/how-to-survive-as-a-startup-founder',
        expectedTitle: 'How to Survive as a Startup Founder',
        expectedOgType: 'article',
      },
      {
        path: '/blog/startup-burn-rate-explained',
        expectedTitle: 'Startup Burn Rate Explained',
        expectedOgType: 'article',
      },
      {
        path: '/blog/best-startup-simulation-games',
        expectedTitle: 'The Best Startup Simulation Games',
        expectedOgType: 'article',
      },
      {
        path: '/changelog',
        expectedTitle: 'Changelog — failunicorn',
        expectedOgType: 'website',
      },
      {
        path: '/leaderboard',
        expectedTitle: 'Global Leaderboard — failunicorn',
        expectedOgType: 'website',
      },
      {
        path: '/tools/startup-idea-rater',
        expectedTitle: 'Free Startup Idea Rater — failunicorn',
        expectedOgType: 'website',
      },
    ]

    let failed = 0

    for (const t of testRoutes) {
      const res = await fetch(`${BASE}${t.path}`)
      const html = await res.text()

      const titleMatch = html.match(/<title>([^<]*)<\/title>/)?.[1] || ''
      const ogTypeMatch = html.match(/<meta property="og:type" content="([^"]*)"\s*\/>/)?.[1] || ''

      const titleOk = titleMatch.includes(t.expectedTitle)
      const ogTypeOk = ogTypeMatch === t.expectedOgType

      if (res.status === 200 && titleOk && ogTypeOk) {
        console.log(`  ✓ GET ${t.path} -> 200 OK | Title: "${titleMatch.slice(0, 45)}..." | og:type: ${ogTypeMatch}`)
      } else {
        console.error(`  ✗ GET ${t.path} FAILED | Status: ${res.status} | Title: "${titleMatch}" (expected "${t.expectedTitle}") | og:type: "${ogTypeMatch}" (expected "${t.expectedOgType}")`)
        failed++
      }
    }

    if (failed > 0) {
      throw new Error(`${failed} HTTP preview test(s) failed`)
    }

    console.log('\nAll HTTP preview raw-HTML checks passed successfully!')
  } finally {
    if (preview.pid) {
      if (isWindows) {
        spawn('taskkill', ['/F', '/T', '/PID', String(preview.pid)])
      } else {
        preview.kill('SIGTERM')
      }
    }
  }
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
