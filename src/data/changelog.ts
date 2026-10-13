export interface ChangelogEntry {
  version: string
  date: string
  title: string
  type: 'new' | 'improved' | 'fixed'
  items: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: 'v2.0',
    date: '2026-10-13',
    title: 'The Founder Journey: failunicorn, rebuilt',
    type: 'new',
    items: [
      'A brand-new game in a 3D office: you start alone in your bedroom with $500 and an old laptop, then research, build, send cold emails and close sales yourself before hiring anyone',
      'Hire interns and full-time developers, product managers, marketers, salespeople and support. Everyone has energy, stress, morale and experience, and ignored people quit (the game pauses to warn you first)',
      'Climb from your bedroom to a bigger home, a villa, a co-working space, a small office, a big office and finally your own building, each with its own layout, rent and move-in cost, on a 2.5D city map',
      'A founder Desktop with hosting, Wi-Fi, tools (including Crunch mode), Employees with yearly raises, paid AI-planned roadmaps of big projects that several developers build together, and Ads',
      'Idea scoring now rates six things (market, pain, competition, feasibility, specificity and business model) and uses the whole 1–10 range. "Uber for laundry" scores a 2; when the AI is unavailable you get a quick estimate instead of a flat 5',
      'The late game stays hard: competitors poach customers once you own the market, features have diminishing returns, cold emails fade, tech debt creeps up, and big teams cost management overhead',
      'Balanced with simulated players: careless founders go broke, careful ones build real companies, and better ideas earn more',
      'Shop perks and better computers, coach pop-ups for tips, notifications that close themselves, and an office that never closes',
    ],
  },
  {
    version: 'v1.4',
    date: '2026-09-29',
    title: 'Economy Rebalance & Smarter Idea Scoring',
    type: 'improved',
    items: [
      'Startups now start with a leaner budget and higher salaries, so cash management actually matters instead of every game snowballing into an easy win',
      'Seed and Series A funding offers now scale to your actual burn rate instead of always being a flat $200k/$500k windfall',
      'Acquisition offers to buy your startup now only show up once you have real traction, and even then only occasionally — no more getting "acquired" for cash on day one before you\'ve built anything',
      'Idea scoring now uses the full range instead of clustering almost everything into the same difficulty tier — Promising and Risky/Brutal startups should actually show up now',
      'Fixed the AI-generated roadmap silently falling back to a generic one on every game — it\'s now reliably tailored to the idea you typed in',
    ],
  },
  {
    version: 'v1.3',
    date: '2026-09-29',
    title: 'Player Feedback Round',
    type: 'improved',
    items: [
      'Fixed the feedback popup re-appearing every couple of minutes when dismissed with "Maybe later" — it now snoozes at most twice before backing off',
      'GTM campaigns can now be assigned to a specific idle salesperson or marketer when more than one is free, instead of always picking the first one',
      'Rebalanced churn: sales and marketing hires reduce churn meaningfully faster, and churn now drifts back down over time instead of staying elevated after a bad event',
      'Expanded the feature pool so Product Managers don\'t run out of ideas to propose in long games',
      'Added 9 new random events',
    ],
  },
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
