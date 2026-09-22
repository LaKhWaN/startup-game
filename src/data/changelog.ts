export interface ChangelogEntry {
  version: string
  date: string
  title: string
  type: 'new' | 'improved' | 'fixed'
  items: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: 'v1.2',
    date: '2026-03-20',
    title: 'Vercel Analytics + Performance',
    type: 'improved',
    items: [
      'Added Vercel Analytics for privacy-friendly usage tracking',
      'Improved game loader animation — smoother fade-out when office scene is ready',
      'Reduced initial bundle size by lazy-loading Phaser scene assets',
    ],
  },
  {
    version: 'v1.1',
    date: '2026-03-10',
    title: 'Speed Controls & Save Slots',
    type: 'new',
    items: [
      'Added 2×, 3×, and 5× game speed controls in the top bar',
      'Introduced 3-slot save system with auto-save every 30 seconds to slot 1',
      'Local leaderboard now stores top 10 runs per device',
      'PostMortem screen shows full financial breakdown and survival stats',
    ],
  },
  {
    version: 'v1.0',
    date: '2026-02-15',
    title: 'Initial Launch',
    type: 'new',
    items: [
      'Core game loop: hire, build features, run campaigns, survive crises',
      'AI-powered idea scoring via Google Gemini — your idea\'s score determines difficulty tier',
      'Four difficulty tiers: Promising, Competitive, Risky, Brutal',
      'Six workspace options across three environments (Home, Coworking, Office)',
      'Phaser-powered 2D office scene with animated employees',
      'Tutorial with spotlight walkthrough of all major UI elements',
      'Investor check-in feedback modal at Day 30 and game over',
      'MongoDB analytics for game session tracking',
    ],
  },
]
